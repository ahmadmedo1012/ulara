/**
 * r359 A4 — HTTP route tests (house pattern: real router on an in-process
 * express server; auth/institution middleware + prisma + storage mocked):
 *  · POST /webhooks/resend — HMAC gate (401s), bounce suppression path
 *  · GET/PUT /me/notification-preferences — defaults + upsert
 *  · GET /institutional/audit-logs — capability gate + the tenant fence
 *  · GET /users/export — CSV shape + admin institution scoping
 *  · POST /governance/documents/presign — the honest 503 on non-S3 drivers
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Server } from 'node:http';
import { Role } from '@prisma/client';
import { createHmac } from 'node:crypto';

// ── shared mock state ────────────────────────────────────────────────
let currentUser: { id: string; role: Role; institutionId: string | null } = {
  id: 'usr_admin',
  role: Role.ADMIN,
  institutionId: 'inst_demo',
};
let currentInstitution: { id: string; name: string } | null = { id: 'inst_demo', name: 'جامعة أُلارا' };
let capabilitiesGranted = new Set<string>(['AUDIT_BROWSE']);

vi.mock('../../src/http/middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { ...currentUser } as never;
    next();
  },
  optionalAuthMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { ...currentUser } as never;
    next();
  },
}));

vi.mock('../../src/http/middleware/institution.js', () => ({
  requireInstitution: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!currentInstitution) {
      // Match the real middleware's refusal shape.
      _res.status(403).json({ error: { code: 'INSTITUTION_CONTEXT_REQUIRED', message: 'حدّد المؤسسة أولًا' } });
      return;
    }
    req.institution = { ...currentInstitution } as never;
    next();
  },
}));

// prisma: a hand-rolled client with per-test mutable stores.
const state = {
  preferenceRow: null as Record<string, unknown> | null,
  auditRows: [] as Array<Record<string, unknown>>,
  auditCount: 0,
  userFindUnique: null as Record<string, unknown> | null,
  userUpdate: vi.fn(),
  emailEventCreate: vi.fn(),
  usersForExport: [] as Array<Record<string, unknown>>,
  governance: { faculty: null, memberships: [] as Array<Record<string, unknown>> },
};

vi.mock('../../src/db.js', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(async () => state.preferenceRow),
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => {
        // Mirrors the DB defaults (unsent booleans default true/false).
        state.preferenceRow = {
          id: 'pref_1',
          pushUrgent: true, pushAcademic: true, pushSystem: true, pushSocial: true, emailDigest: false,
          ...create,
        };
        return state.preferenceRow;
      }),
    },
    auditLog: {
      findMany: vi.fn(async () => state.auditRows),
      count: vi.fn(async () => state.auditCount),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(async () => state.userFindUnique),
      findMany: vi.fn(async () => state.usersForExport),
      update: vi.fn(async (args: unknown) => {
        state.userUpdate(args);
        return {};
      }),
    },
    emailEvent: { create: vi.fn(async (args: unknown) => state.emailEventCreate(args)) },
    emailVerificationToken: { create: vi.fn(), updateMany: vi.fn(async () => ({ count: 0 })), findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
  withRetry: vi.fn(),
}));

// permissions: assertCapabilityIn honored via the granted set; the rest real.
vi.mock('../../src/lib/permissions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/permissions.js')>();
  return {
    ...actual,
    assertCapabilityIn: vi.fn(async (_uid: string, _role: Role, _inst: string, ...caps: string[]) => {
      if (!caps.some((c) => capabilitiesGranted.has(c))) {
        const { AppError } = await import('../../src/lib/errors.js');
        throw AppError.forbidden('القدرة المطلوبة غير متاحة لحسابك');
      }
    }),
  };
});

// governance scope hooks used by the users router (ADMIN path).
vi.mock('../../src/lib/governance.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/governance.js')>();
  return {
    ...actual,
    getGovernanceScope: vi.fn(async () => null),
  };
});
vi.mock('../../src/lib/profile-scoping.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/profile-scoping.js')>();
  return {
    ...actual,
    resolveCallerInstitutionScope: vi.fn(async () => (currentInstitution ? currentInstitution.id : null)),
  };
});

// storage: the LOCAL driver shape (not S3) — the presign route must 503.
vi.mock('../../src/lib/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/storage.js')>();
  return {
    ...actual,
    getStorage: () => ({ put: vi.fn(), get: vi.fn(), getRange: vi.fn(), stat: vi.fn(async () => null) }),
  };
});

// env: pin the webhook secret for the HMAC tests.
vi.mock('../../src/env.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/env.js')>();
  return { ...actual, env: { ...actual.env, RESEND_WEBHOOK_SECRET: 'whsec_test_secret_0123456789' } };
});

describe('r359 A4 — routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    // raw body capture (mirrors app.ts)
    app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf); } }));
    const webhooks = (await import('../../src/http/routes/webhooks.routes.js')).default;
    const push = (await import('../../src/http/routes/push.routes.js')).default;
    const audit = (await import('../../src/http/routes/r352-audit.routes.js')).default;
    const users = (await import('../../src/http/routes/users.routes.js')).default;
    app.use('/api/v1/webhooks', webhooks);
    app.use('/api/v1', push);
    app.use('/api/v1/institutional', audit);
    app.use('/api/v1/users', users);
    app.use((err: { status?: number; statusCode?: number; message?: string; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({ error: { code: err.code ?? 'ERROR', message: err.message } });
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    currentUser = { id: 'usr_admin', role: Role.ADMIN, institutionId: 'inst_demo' };
    currentInstitution = { id: 'inst_demo', name: 'جامعة أُلارا' };
    capabilitiesGranted = new Set(['AUDIT_BROWSE']);
    state.preferenceRow = null;
    state.auditRows = [];
    state.auditCount = 0;
    vi.clearAllMocks();
  });

  // ── webhook ────────────────────────────────────────────────────────
  describe('POST /webhooks/resend', () => {
    const secret = 'whsec_test_secret_0123456789';
    function signedHeaders(body: string, key = secret) {
      const ts = String(Math.floor(Date.now() / 1000));
      const id = 'msg_test';
      const sig = `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`;
      return { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': sig };
    }

    it('401 without svix headers (fail closed)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/webhooks/resend`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'email.bounced', data: { email: 'a@x.ly' } }),
      });
      expect(res.status).toBe(401);
    });

    it('401 on a forged signature', async () => {
      const body = JSON.stringify({ type: 'email.bounced', data: { email: 'a@x.ly' } });
      const res = await fetch(`${baseUrl}/api/v1/webhooks/resend`, {
        method: 'POST',
        headers: signedHeaders(body, 'wrong-secret'),
        body,
      });
      expect(res.status).toBe(401);
    });

    it('a signed hard bounce records an EmailEvent AND stamps User.emailBouncedAt', async () => {
      state.userFindUnique = { id: 'u1' };
      const body = JSON.stringify({ type: 'email.bounced', data: { email: 'a@x.ly', message_id: 'm1' } });
      const res = await fetch(`${baseUrl}/api/v1/webhooks/resend`, { method: 'POST', headers: signedHeaders(body), body });
      expect(res.status).toBe(200);
      expect(state.emailEventCreate).toHaveBeenCalledTimes(1);
      const event = vi.mocked(state.emailEventCreate).mock.calls[0]![0] as { data: { type: string; userId: string; email: string } };
      expect(event.data.type).toBe('BOUNCE');
      expect(event.data.email).toBe('a@x.ly');
      const update = state.userUpdate.mock.calls[0]![0] as { data: { emailBouncedAt?: Date } };
      expect(update.data.emailBouncedAt).toBeInstanceOf(Date);
    });

    it('unknown event types are recorded + ACKed (never a 500 source)', async () => {
      state.userFindUnique = null;
      const body = JSON.stringify({ type: 'email.clicked', data: { email: 'b@x.ly' } });
      const res = await fetch(`${baseUrl}/api/v1/webhooks/resend`, { method: 'POST', headers: signedHeaders(body), body });
      expect(res.status).toBe(200);
      expect(state.emailEventCreate).toHaveBeenCalled();
    });
  });

  // ── notification preferences ───────────────────────────────────────
  describe('GET/PUT /me/notification-preferences', () => {
    it('GET returns the documented defaults when no row exists', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notification-preferences`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data).toMatchObject({
        pushUrgent: true,
        pushAcademic: true,
        pushSystem: true,
        pushSocial: true,
        emailDigest: false,
      });
    });

    it('PUT upserts and echoes the stored row (201-family envelope { data })', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notification-preferences`, {
        method: 'PUT',
        headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
        body: JSON.stringify({ emailDigest: true, pushSocial: false }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data).toMatchObject({ emailDigest: true, pushSocial: false, pushUrgent: true });
    });
  });

  // ── audit browse ───────────────────────────────────────────────────
  describe('GET /institutional/audit-logs', () => {
    it('ADMIN with AUDIT_BROWSE sees the institution trail ({ data, meta })', async () => {
      state.auditRows = [{ id: 'a1', action: 'council.document.create', institutionId: 'inst_demo' }];
      state.auditCount = 1;
      const res = await fetch(`${baseUrl}/api/v1/institutional/audit-logs?page=1&limit=20`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[]; meta: { total: number } };
      expect(body.data).toHaveLength(1);
      expect(body.meta.total).toBe(1);
    });

    it('without the capability the route refuses (403), rows never leave', async () => {
      capabilitiesGranted = new Set();
      const res = await fetch(`${baseUrl}/api/v1/institutional/audit-logs`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(403);
    });

    it('the tenant fence: no institution context → 403, not an unscoped read', async () => {
      currentInstitution = null;
      const res = await fetch(`${baseUrl}/api/v1/institutional/audit-logs`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    });
  });

  // ── users export ───────────────────────────────────────────────────
  describe('GET /users/export', () => {
    it('ADMIN exports CSV with BOM + header row + X-Export-Rows', async () => {
      state.usersForExport = [
        {
          id: 'u1', email: 'a@x.ly', role: 'STUDENT', firstName: 'أحمد', lastName: 'م',
          isActive: true, emailVerifiedAt: null, createdAt: new Date('2026-01-01T00:00:00Z'),
          memberships: [{ institutionId: 'inst_demo', role: 'STUDENT', isActive: true }],
          studentProfiles: [{ universityId: '12345' }],
        },
      ];
      const res = await fetch(`${baseUrl}/api/v1/users/export?format=csv`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      expect(res.headers.get('x-export-rows')).toBe('1');
      // The BOM lives in the raw BYTES (TextDecoder strips it) — the
      // whole point is Excel opening Arabic correctly.
      const buf = new Uint8Array(await res.arrayBuffer());
      expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf]);
      const text = new TextDecoder('utf-8').decode(buf.slice(3));
      expect(text).toContain('id,email,role,firstName,lastName,universityId,isActive,emailVerified,createdAt,memberships');
      expect(text).toContain('a@x.ly');
      expect(text).toContain('inst_demo:STUDENT');
    });

    it('json format returns the envelope { data, meta }', async () => {
      state.usersForExport = [];
      const res = await fetch(`${baseUrl}/api/v1/users/export?format=json`, {
        headers: { authorization: 'Bearer t' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[]; meta: { truncated: boolean } };
      expect(body.data).toEqual([]);
      expect(body.meta.truncated).toBe(false);
    });
  });

  // ── governance presign (honest refusal) ────────────────────────────
  describe('POST /governance/documents/presign', () => {
    it('non-S3 drivers answer the honest 503 (never a silent fallback)', async () => {
      // The councils router mounts its own auth+institution middleware —
      // our top-level mocks provide them.
      const app = express();
      app.use(express.json());
      const councils = (await import('../../src/http/routes/r352-councils.routes.js')).default;
      app.use('/governance', councils);
      app.use((err: { status?: number; statusCode?: number; message?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.status || err.statusCode || 500).json({ error: { message: err.message } });
      });
      const srv = await new Promise<import('node:http').Server>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
      const res = await fetch(`${url}/governance/documents/presign`, {
        method: 'POST',
        headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
        body: JSON.stringify({ filename: 'minutes.pdf', sizeBytes: 50 * 1024 * 1024 }),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toContain('S3');
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    });
  });
});
