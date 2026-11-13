/**
 * Backend HTTP test — r341 (INV-3 t07): GET /api/v1/health answers the
 * platform's response envelope, carries a contract-legal error code, and
 * sits behind a rate limiter scoped to the route.
 *
 * Harness: the REAL app (createApp, ephemeral port, prisma mocked — the
 * r326-client-errors-push pattern; AGENTS.md §5.2 DB-free rule). Three
 * pins, one per INV-3 defect:
 *
 *   (a) success → 200 with the standard `{ data: … }` envelope — the old
 *       BARE `{ok, dbLatencyMs, env, buildId}` was the only success on
 *       the service outside the envelope, forcing envelope-parsing
 *       clients to special-case health. The legacy TOP-LEVEL keys are
 *       pinned TOO: they are deliberate additive back-compat (documented
 *       in app.ts) — scripts/smoke-deploy.mjs checkHealth and the web
 *       AdminSettingsPage read them raw, and the additive-only contract
 *       snapshot (tests/contract/snapshot.json) records them.
 *   (b) DB failure → 503 with `error.code = DB_UNAVAILABLE` — now a
 *       member of the ErrorCode union (src/lib/errors.ts), so client
 *       error mappers parse it like every other code.
 *   (c) the scoped limiter → 30 req / 60 s / IP (the createRouteLimiter
 *       factory, src/http/middleware/rateLimit.ts): the 31st request
 *       from one IP answers 429 in the Arabic error envelope WITHOUT a
 *       31st DB ping (the SELECT 1 is the expensive action a flooder
 *       used to get for free), and the limit stays SCOPED — /api/v1/
 *       status (not this round's surface) still answers 200 once the
 *       health bucket is exhausted. The deploy-smoke workflow stays
 *       green by construction: it sends ONE health request.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    // /health's DB ping + /status's ping (the scoping pin) — both are
    // $queryRaw; every other model method is unreachable in this suite.
    $queryRaw: vi.fn(),
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

type Server = ReturnType<ReturnType<typeof createApp>['listen']>;

const boot = () => {
  const server = createApp().listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { server, baseUrl };
};

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

// ─── (a) success: the standard envelope + (b) failure: the union code ──
//
// One app for both: they consume 2 of the health limiter's 30-per-minute
// budget — far under the cap, so no cross-test interference.
describe('GET /api/v1/health — envelope + DB_UNAVAILABLE (r341 t07)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    ({ server, baseUrl } = boot());
  });

  afterAll(async () => {
    await close(server);
  });

  it('answers 200 with the standard { data } envelope (INV-3 defect 1)', async () => {
    vi.mocked(prisma.$queryRaw).mockReset().mockResolvedValue([] as never);
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data?: { ok?: unknown; dbLatencyMs?: unknown; env?: unknown; buildId?: unknown };
      ok?: unknown;
      dbLatencyMs?: unknown;
      env?: unknown;
      buildId?: unknown;
    };

    // The envelope: a `{ data: … }` key is present with the full payload.
    expect(body.data).toBeDefined();
    expect(body.data!.ok).toBe(true);
    expect(typeof body.data!.dbLatencyMs).toBe('number');
    expect(typeof body.data!.env).toBe('string');
    expect(typeof body.data!.buildId).toBe('string');
    // The mobile client's parseEnvelope (apps/mobile/src/api/client.ts)
    // unwraps by "data"-key PRESENCE — pin that the key resolves the
    // same payload, not a nested envelope.
    expect(body.data!.ok).toBe(body.ok);

    // Legacy back-compat (deliberate, documented in app.ts): the
    // top-level keys stay for scripts/smoke-deploy.mjs and the web
    // AdminSettingsPage, and the additive-only contract snapshot
    // records them — removing them here would fail tests/contract.
    expect(body.ok).toBe(true);
    expect(typeof body.dbLatencyMs).toBe('number');
    expect(typeof body.env).toBe('string');
    expect(typeof body.buildId).toBe('string');
    // The deploy-smoke workflow's literal contract on this body:
    // `curl -sf …/health | grep -q '"ok":true'`.
    expect(JSON.stringify(body)).toContain('"ok":true');
  });

  it('answers 503 with error.code DB_UNAVAILABLE when the DB ping fails', async () => {
    vi.mocked(prisma.$queryRaw).mockReset().mockRejectedValue(new Error('neon down') as never);
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: { latencyMs?: unknown } };
    };
    // The union code (lib/errors.ts) — no client special-cases health.
    expect(body.error?.code).toBe('DB_UNAVAILABLE');
    expect(body.error?.message).toBe('Database unavailable');
    expect(typeof body.error?.details?.latencyMs).toBe('number');
  });
});

// ─── (c) the scoped rate limiter — a FRESH app so the bucket starts at 0 ──
describe('GET /api/v1/health — the scoped 30/min/IP limiter (r341 t07)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    ({ server, baseUrl } = boot());
  });

  afterAll(async () => {
    await close(server);
  });

  it('answers 429 (Arabic envelope) on the 31st request — with NO 31st DB ping', async () => {
    const queryRaw = vi.mocked(prisma.$queryRaw);
    queryRaw.mockReset().mockResolvedValue([] as never);

    for (let i = 0; i < 30; i += 1) {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      expect(res.status, `request ${i + 1}/30 should pass`).toBe(200);
    }
    expect(queryRaw).toHaveBeenCalledTimes(30);

    const blocked = await fetch(`${baseUrl}/api/v1/health`);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('content-type')).toContain('application/json');
    // The flood shield actually shields: the limiter answered BEFORE the
    // handler, so the DB ping count stays at 30 — the expensive action
    // (the SELECT 1 that keeps a cold Neon awake) is the thing capped.
    expect(queryRaw).toHaveBeenCalledTimes(30);

    const body = (await blocked.json()) as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toBe('TOO_MANY_REQUESTS');
    // D17-3: user-facing copy is Arabic — never express-rate-limit's
    // plain-text English default (the r170c lesson, pinned here too).
    expect(body.error?.message).toMatch(/[\u0600-\u06FF]/);

    // draft-7 standardized headers ride the response (the factory sets
    // standardHeaders: 'draft-7') — probers can back off politely.
    const rateLimitHeader = blocked.headers.get('ratelimit') ?? blocked.headers.get('x-ratelimit');
    expect(rateLimitHeader ?? blocked.headers.get('ratelimit-policy')).not.toBeNull();
  });

  it('stays SCOPED to /health: /api/v1/status still answers once the health bucket is exhausted', async () => {
    // The health bucket for this IP is spent (30/30 above). /status is a
    // DIFFERENT surface (status.routes.ts, outside this round) — mounting
    // the limiter on the health ROUTE only must not tax it.
    vi.mocked(prisma.$queryRaw).mockReset().mockResolvedValue([] as never);
    const res = await fetch(`${baseUrl}/api/v1/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { ok?: unknown } };
    expect(body.data?.ok).toBe(true);
  });
});
