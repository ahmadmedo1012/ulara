/**
 * Backend HTTP test — r342 t08: GET /api/v1/ping is the DB-FREE liveness
 * half of the status surface (status.routes.ts).
 *
 * Harness: the REAL app (createApp, ephemeral port, prisma mocked — the
 * health.test.ts pattern). Four pins:
 *
 *   (a) 200 + the standard `{ data: … }` envelope with ok/buildId/serverTime
 *       — the mobile NetInfo probe targets this route and only asks
 *       «does the API process answer?».
 *   (b) ZERO database work: prisma.$queryRaw is never called by /ping —
 *       a connectivity probe must not cost a DB round trip (the old
 *       probe ran `SELECT 1` on every reachability check via /status).
 *   (c) a COMPLETELY DEAD database cannot change the verdict: with
 *       $queryRaw rejecting, /ping still answers 200 (liveness ≠ health).
 *   (d) /ping and /status keep their DISTINCT jobs: /status still pings
 *       the DB (the health+metadata read) — the split is real, not
 *       decoration.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    // /status's ping — the distinct-job pin (d). /ping must never
    // touch it.
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

describe('GET /api/v1/ping — DB-free liveness (r342 t08)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    ({ server, baseUrl } = boot());
  });

  afterAll(async () => {
    await close(server);
  });

  it('(a) answers 200 with the standard { data } envelope', async () => {
    vi.mocked(prisma.$queryRaw).mockReset().mockResolvedValue([] as never);
    const res = await fetch(`${baseUrl}/api/v1/ping`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { ok?: unknown; buildId?: unknown; serverTime?: unknown } };
    expect(body).toHaveProperty('data');
    expect(body.data?.ok).toBe(true);
    expect(typeof body.data?.buildId).toBe('string');
    expect(typeof body.data?.serverTime).toBe('string');
    // no secrets: the payload carries exactly the three liveness fields
    expect(Object.keys(body.data ?? {}).sort()).toEqual(['buildId', 'ok', 'serverTime']);
  });

  it('(b) performs ZERO database work — prisma.$queryRaw never fires', async () => {
    vi.mocked(prisma.$queryRaw).mockClear();
    const res = await fetch(`${baseUrl}/api/v1/ping`);
    expect(res.status).toBe(200);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('(c) a dead database cannot change the verdict — /ping still 200', async () => {
    vi.mocked(prisma.$queryRaw).mockReset().mockRejectedValue(new Error('db gone') as never);
    const res = await fetch(`${baseUrl}/api/v1/ping`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { ok?: unknown } };
    expect(body.data?.ok).toBe(true);
    // restore for (d)
    vi.mocked(prisma.$queryRaw).mockReset().mockResolvedValue([] as never);
  });

  it('(d) /status keeps its DISTINCT job — it still pings the DB', async () => {
    vi.mocked(prisma.$queryRaw).mockClear();
    const res = await fetch(`${baseUrl}/api/v1/status`);
    expect(res.status).toBe(200);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { data?: { db?: { ok?: unknown; latencyMs?: unknown } } };
    expect(body.data?.db?.ok).toBe(true);
    expect(typeof body.data?.db?.latencyMs).toBe('number');
  });
});
