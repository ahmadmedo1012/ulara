/**
 * Backend unit test — r363 P6: POST /auth/refresh limiter semantics —
 * the belt the audit flagged as unpinned.
 *
 * The property being pinned (the r362 classification's armor): a
 * LEGITIMATE client never hits 429 under normal resume patterns.
 * `authRateLimiter` counts only FAILED attempts
 * (`skipSuccessfulRequests: true`, middleware/rateLimit.ts), so:
 *
 *   1. a long streak of SUCCESSFUL refreshes (the resume pattern:
 *      one refresh per access-TTL, repeated) never 429s — the bucket
 *      never moves;
 *   2. a streak of FAILED refreshes (a replayed/garbage cookie) caps
 *      at the 10th failure and 429s the house envelope from the 11th;
 *   3. the cap is IP-scoped: a different egress IP (rightmost XFF
 *      entry under the app's trust-proxy=1 topology) is unaffected —
 *      recovery for an honest client is either the 15-minute window
 *      on its own bucket or simply not sharing a bucket with an
 *      attacker; a global cap would be the bug.
 *
 * Route-level harness (auth-change-password-limiter.test.ts pattern):
 * real createApp on an ephemeral port, db.js + password.js mocked,
 * jsonwebtoken REAL (test-mode secrets) — the full middleware stack
 * (authRateLimiter → route → service) runs exactly as in production.
 * NOTE: the limiter instances are module singletons, so every phase
 * rides the SAME process-wide bucket — the phases below are ordered
 * so that never matters (successes never count; the failure streak
 * starts from a zero counter by construction).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findMany: vi.fn(async () => []) },
    membership: { findMany: vi.fn(async () => []) },
    loginEvent: { create: vi.fn(async () => ({})) },
    // P6 — the refresh path consults the session ledger (row lookup +
    // roll/adopt bookkeeping) on every successful refresh.
    userSession: {
      findUnique: vi.fn(),
      create: vi.fn(async () => ({})),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signRefreshToken } from '../../src/lib/jwt.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const userFindUnique = vi.mocked(prisma.user.findUnique);
/** House typing pattern (auth-change-password-limiter.test.ts): the
 *  delegate's impl signature, so mock sites stay fully type-checked. */
type UserFindUniqueImpl = NonNullable<Parameters<typeof userFindUnique.mockImplementation>[0]>;

const makeUser = (id: string, tokenVersion = 0): User =>
  ({
    id,
    email: `${id}@zu.edu.ly`,
    passwordHash: 'stored-hash',
    role: 'STUDENT',
    firstName: 'مستخدم',
    lastName: 'اختبار',
    avatarColor: '#4F8EF7',
    avatarInitials: 'مع',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as User;

const refresh = async (cookie: string, xff?: string): Promise<Response> =>
  fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: `ulara_refresh=${cookie}`,
      ...(xff ? { 'X-Forwarded-For': xff } : {}),
    },
  });

describe('POST /auth/refresh — the limiter belt (r363 P6)', () => {
  it('a resume-pattern streak of SUCCESSFUL refreshes never 429s (skipSuccessfulRequests)', async () => {
    userFindUnique.mockImplementation(
      (async () => makeUser('user-1', 0)) as unknown as UserFindUniqueImpl,
    );
    // 12 refreshes back-to-back — far beyond any sane resume cadence
    // and twice the failure cap. Every one must be 2xx; the bucket
    // stays at zero because successes are skipped.
    for (let i = 0; i < 12; i += 1) {
      const res = await refresh(signRefreshToken('user-1', 0));
      expect(res.status, `successful refresh #${i + 1} must never 429`).not.toBe(429);
      expect(res.status).toBe(200);
    }
  });

  it('a FAILED-refresh streak caps at the 10th failure — the 11th 429s the house envelope', async () => {
    // The failure streak starts from a fresh counter (phase 1's
    // successes were skipped by construction — that IS the pin).
    for (let i = 1; i <= 10; i += 1) {
      const res = await refresh('garbage-not-a-jwt');
      expect(res.status, `failed refresh #${i} is still inside the cap`).toBe(401);
    }
    const capped = await refresh('garbage-not-a-jwt');
    expect(capped.status).toBe(429);
    const body = (await capped.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('TOO_MANY_REQUESTS');
    // and it stays capped inside the window
    expect((await refresh('garbage-not-a-jwt')).status).toBe(429);
  });

  it('the cap is IP-scoped — a different egress IP refreshes straight through', async () => {
    // The default bucket (127.0.0.1) is capped by phase 2. A distinct
    // rightmost-XFF entry (the trust-proxy=1 topology's key) is its own
    // bucket: the honest client on another egress is unaffected.
    userFindUnique.mockImplementation(
      (async () => makeUser('user-2', 0)) as unknown as UserFindUniqueImpl,
    );
    const res = await refresh(signRefreshToken('user-2', 0), '10.9.9.9');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { accessToken?: string } };
    expect(body.data?.accessToken).toBeTruthy();
  });
});
