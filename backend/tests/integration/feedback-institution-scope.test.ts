/**
 * r352 backend hardening #3 (r342 t14) — the feedback inbox institution
 * scope, proven end-to-end:
 *
 *   POST /feedback stamps the submitter's DB-VERIFIED institution (a
 *   contextless token or an unverified inst claim files a platform-scope
 *   NULL row);
 *   GET  /feedback pins an institutional ADMIN/QUALITY to THEIR
 *   institution's rows (contextless 403) while the platform OWNER keeps
 *   the cross-tenant view;
 *   PATCH /feedback/:id refuses foreign rows with a closed 404.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll } from './helpers.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
beforeEach(async () => {
  await truncateAll(db());
});

const api = async (method: string, path: string, body: unknown, auth: Record<string, string>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

const NOTE = 'ملاحظة اختبار طويلة بما يكفي للقبول';

describe('r352 hardening #3 — the feedback institution scope', () => {
  beforeEach(async () => {
    const worlds: Record<'A' | 'B', any> = { A: {}, B: {} };
    for (const key of ['A', 'B'] as const) {
      const institution = await seedInstitution();
      const admin = await seedUser({ role: Role.ADMIN, firstName: `مدير صندوق${key}` });
      await seedMembership(admin.id, institution.id, Role.ADMIN);
      const student = await seedUser({ role: Role.STUDENT, firstName: `طالب صندوق${key}` });
      await seedMembership(student.id, institution.id, Role.STUDENT);
      // The student files from their institution context.
      const filed = await api('POST', '/api/v1/feedback', { kind: 'BUG', note: NOTE }, bearer(student.id, Role.STUDENT, institution.id));
      expect(filed.status).toBe(201);
      worlds[key] = { institution, admin, student, auth: bearer(admin.id, Role.ADMIN, institution.id) };
    }
    // A contextless student files a platform-scope row.
    const orphanStudent = await seedUser({ role: Role.STUDENT, firstName: 'طالب بلا سياق' });
    const filed = await api('POST', '/api/v1/feedback', { kind: 'IDEA', note: NOTE }, bearer(orphanStudent.id, Role.STUDENT, null));
    expect(filed.status).toBe(201);
    // The platform OWNER.
    const owner = await seedUser({ role: Role.OWNER });
    globalThis.__fb = { ...worlds, owner, orphanStudent, ownerAuth: bearer(owner.id, Role.OWNER, null) };
  });

  it('POST stamps the DB-verified institution; contextless stays NULL', async () => {
    const w = globalThis.__fb as any;
    const rows = await db().pilotFeedback.findMany();
    expect(rows).toHaveLength(3);
    const byInst = new Map(rows.map((r) => [r.institutionId, r.id]));
    expect(byInst.get(w.A.institution.id)).toBeTruthy();
    expect(byInst.get(w.B.institution.id)).toBeTruthy();
    expect(byInst.get(null)).toBeTruthy(); // the platform-scope row
  });

  it('an institutional inbox sees ONLY its own rows (never the other tenant, never NULL)', async () => {
    const w = globalThis.__fb as any;
    const resA = await api('GET', '/api/v1/feedback', undefined, w.A.auth);
    expect(resA.status).toBe(200);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].institutionId).toBe(w.A.institution.id);
    expect(resA.body.meta.total).toBe(1);
    const resB = await api('GET', '/api/v1/feedback', undefined, w.B.auth);
    expect(resB.status).toBe(200);
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0].institutionId).toBe(w.B.institution.id);
  });

  it('a contextless ADMIN inbox fails closed (INSTITUTION_CONTEXT_REQUIRED)', async () => {
    const w = globalThis.__fb as any;
    const res = await api('GET', '/api/v1/feedback', undefined, bearer(w.A.admin.id, Role.ADMIN, null));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('the platform OWNER keeps the cross-tenant view (all three rows)', async () => {
    const w = globalThis.__fb as any;
    const res = await api('GET', '/api/v1/feedback', undefined, w.ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(3);
  });

  it('PATCH refuses a foreign institution row with a closed 404; own row transitions', async () => {
    const w = globalThis.__fb as any;
    const bRow = (await db().pilotFeedback.findFirstOrThrow({
      where: { institutionId: w.B.institution.id },
    }));
    const foreign = await api('PATCH', `/api/v1/feedback/${bRow.id}`, { status: 'triage' }, w.A.auth);
    expect(foreign.status).toBe(404);
    // The B row was NOT mutated through the A admin.
    expect((await db().pilotFeedback.findUniqueOrThrow({ where: { id: bRow.id } })).status).toBe('open');

    const aRow = (await db().pilotFeedback.findFirstOrThrow({
      where: { institutionId: w.A.institution.id },
    }));
    const own = await api('PATCH', `/api/v1/feedback/${aRow.id}`, { status: 'triage' }, w.A.auth);
    expect(own.status).toBe(200);
    expect(own.body.data.status).toBe('triage');

    // An institutional admin cannot touch the platform-scope (NULL) row.
    const orphanRow = (await db().pilotFeedback.findFirstOrThrow({
      where: { institutionId: null },
    }));
    const platform = await api('PATCH', `/api/v1/feedback/${orphanRow.id}`, { status: 'triage' }, w.A.auth);
    expect(platform.status).toBe(404);
    // The OWNER can.
    const ownerPatch = await api('PATCH', `/api/v1/feedback/${orphanRow.id}`, { status: 'triage' }, w.ownerAuth);
    expect(ownerPatch.status).toBe(200);
  });
});
