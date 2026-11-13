/**
 * Backend unit test — `cronAuthMiddleware` from
 * `backend/src/http/routes/jobs.routes.ts` (the scheduled-jobs route's
 * service-token gate — the milestones serviceAuthMiddleware contract,
 * plus the Bearer transport the platform cron uses).
 *
 * DB-free: the middleware is driven directly with fake req/next —
 * no server boot. Pins the fail-closed contract:
 *   - INTERNAL_SERVICE_TOKEN unset → EVERY request is rejected, even
 *     one carrying the would-be-correct token
 *   - missing / wrong tokens → 403 with a uniform message (no oracle)
 *   - the correct token passes via EITHER transport:
 *     `Authorization: Bearer <token>` (the cron shape) or
 *     `x-internal-service-token: <token>` (the operator shape)
 *   - `Authorization: Basic …` / non-Bearer schemes never authenticate
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// env is module-evaluated once; the factory gives the test a mutable
// object so each case controls INTERNAL_SERVICE_TOKEN without touching
// process.env (the milestones-service-auth precedent).
vi.mock('../../src/env.js', () => ({
  env: { INTERNAL_SERVICE_TOKEN: undefined as string | undefined },
}));

// The middleware path never touches the database or the scheduler —
// empty mocks keep the module graph hermetic.
vi.mock('../../src/db.js', () => ({
  prisma: {},
}));

import { env } from '../../src/env.js';
import { cronAuthMiddleware } from '../../src/http/routes/jobs.routes';
import { AppError } from '../../src/lib/errors';

const SERVICE_TOKEN = 'cron-service-token-32-chars-min';

const makeReq = (headers: Record<string, string | undefined>) => ({
  header: (name: string) => headers[name],
});

const next = vi.fn();

const expectForbidden = () => {
  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0]![0];
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).status).toBe(403);
  expect((err as AppError).code).toBe('FORBIDDEN');
};

const expectPassed = () => {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0]![0]).toBeUndefined();
};

beforeEach(() => {
  next.mockReset();
});

describe('cronAuthMiddleware (jobs/daily service-token gate)', () => {
  it('rejects every request when INTERNAL_SERVICE_TOKEN is unset (fail-closed)', () => {
    env.INTERNAL_SERVICE_TOKEN = undefined;
    cronAuthMiddleware(
      makeReq({ authorization: `Bearer ${SERVICE_TOKEN}` }),
      {},
      next,
    );
    expectForbidden();
  });

  it('rejects a request with no credentials at all', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(makeReq({}), {}, next);
    expectForbidden();
  });

  it('rejects a wrong Bearer token', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ authorization: 'Bearer not-the-token-at-all' }),
      {},
      next,
    );
    expectForbidden();
  });

  it('rejects a wrong x-internal-service-token header', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ 'x-internal-service-token': 'also-not-the-token' }),
      {},
      next,
    );
    expectForbidden();
  });

  it('rejects non-Bearer Authorization schemes', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ authorization: `Basic ${SERVICE_TOKEN}` }),
      {},
      next,
    );
    expectForbidden();
  });

  it('accepts the correct token via the Bearer transport (the cron shape)', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ authorization: `Bearer ${SERVICE_TOKEN}` }),
      {},
      next,
    );
    expectPassed();
  });

  it('accepts the correct token via the internal-header transport (the operator shape)', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ 'x-internal-service-token': SERVICE_TOKEN }),
      {},
      next,
    );
    expectPassed();
  });

  it('is length-independent (SHA-256 digests — attacker-controlled lengths never crash)', () => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    cronAuthMiddleware(
      makeReq({ authorization: `Bearer ${'x'.repeat(9999)}` }),
      {},
      next,
    );
    expectForbidden();
  });
});
