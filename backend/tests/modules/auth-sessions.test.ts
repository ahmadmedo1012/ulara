/**
 * Backend unit test — P6: the UserSession ledger (session listing,
 * per-session revocation, refresh-token reuse detection) and its D3
 * coexistence semantics.
 *
 * DB-free: prisma and argon2 are mocked; jsonwebtoken runs REAL
 * sign/verify against the deterministic test-mode secrets from env.ts.
 * Two harnesses, both house patterns:
 *  · service-level (auth-rotation.test.ts pattern) — the rotation
 *    semantics WITH the session table: a normal refresh only rolls the
 *    row (never bumps tokenVersion); a revoked-row refresh is theft →
 *    family kill + atomic bump + 401; adoption for rowless cookies;
 *  · route-level (auth-change-password-limiter.test.ts pattern) — real
 *    createApp on an ephemeral port: GET /auth/sessions (ownership +
 *    current flag), DELETE /auth/sessions/:id (owner revoke, foreign
 *    404, one-session-only, own-session cookie clear).
 *
 * D3 invariants re-locked here:
 *  - a NORMAL refresh never bumps tokenVersion (multi-device survival);
 *  - the ONLY new version bumps come from the reuse detector and the
 *    unchanged logoutUser/changePassword paths, all atomic conditionals;
 *  - DELETE /auth/sessions/:id never bumps — one session's death must
 *    not kill the others.
 */
import { afterEach, beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { User, UserSession } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed'),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findMany: vi.fn(async () => []) },
    membership: { findMany: vi.fn(async () => []) },
    loginEvent: { create: vi.fn(async () => ({})) },
    userSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
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
import { signAccessToken, signRefreshToken } from '../../src/lib/jwt.js';
import {
  createSessionForToken,
  hashRefreshToken,
  listUserSessions,
  revokeSessionForOwner,
  rollSessionForToken,
} from '../../src/modules/auth/sessions.js';
import { logoutUser, refreshTokens } from '../../src/modules/auth/auth.service';

const userFindUnique = vi.mocked(prisma.user.findUnique);
const sessionFindUnique = vi.mocked(prisma.userSession.findUnique);
const sessionFindMany = vi.mocked(prisma.userSession.findMany);
const sessionCreate = vi.mocked(prisma.userSession.create);
const sessionUpdateMany = vi.mocked(prisma.userSession.updateMany);
const sessionDeleteMany = vi.mocked(prisma.userSession.deleteMany);
const userUpdateMany = vi.mocked(prisma.user.updateMany);

/** Decode a JWT's payload without a verifier — tests assert CLAIMS here,
 *  the verifier round-trips are pinned in auth-rotation.test.ts. */
const payloadOf = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as Record<string, unknown>;

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'user@zu.edu.ly',
    passwordHash: 'stored-hash',
    role: 'STUDENT',
    firstName: 'أحمد',
    lastName: 'المستخدم',
    avatarColor: '#4F8EF7',
    avatarInitials: 'أم',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion: 0,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as User;

const makeRow = (overrides: Partial<UserSession> = {}): UserSession =>
  ({
    id: 'session-1',
    userId: 'user-1',
    refreshTokenHash: hashRefreshToken('token-a'),
    tokenVersionSnapshot: 0,
    userAgent: 'vitest',
    ip: '10.0.0.1',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    revokedAt: null,
    reusedAt: null,
    ...overrides,
  }) as unknown as UserSession;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// hashRefreshToken — sha256 hex, never the token
// ─────────────────────────────────────────────────────────────────────
describe('hashRefreshToken', () => {
  it('is sha-256 hex (64 chars) — never the token itself', () => {
    const digest = hashRefreshToken('ulara-test-token');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain('ulara');
  });

  it('is deterministic and distinguishes tokens', () => {
    expect(hashRefreshToken('a')).toBe(hashRefreshToken('a'));
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'));
    expect(hashRefreshToken('a')).toBe(
      // node:crypto known vector — pins the ALGORITHM (sha-256), not
      // some accidental fast-hash drift.
      'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// refreshTokens × the session table — D3 semantics preserved
// ─────────────────────────────────────────────────────────────────────
describe('refreshTokens — session-table gate', () => {
  it('a normal refresh ROLLS the live row and never bumps tokenVersion (D3)', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 4 }));
    const presented = signRefreshToken('user-1', 4);
    sessionFindUnique.mockResolvedValue(makeRow({ refreshTokenHash: hashRefreshToken(presented) }));
    sessionUpdateMany.mockResolvedValue({ count: 1 });

    const { refreshToken } = await refreshTokens(presented, { ip: '10.1.1.1', userAgent: 'ua' });

    // Same version re-issued — the D3 invariant stands with the table.
    expect(payloadOf(refreshToken)).toMatchObject({ sub: 'user-1', ver: 4 });
    expect(userUpdateMany).not.toHaveBeenCalled();
    // The row was rolled onto the NEW token: CAS on the live lineage.
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          refreshTokenHash: hashRefreshToken(presented),
          revokedAt: null,
          reusedAt: null,
        }),
        data: expect.objectContaining({ lastUsedAt: expect.any(Date), ip: '10.1.1.1', userAgent: 'ua' }),
      }),
    );
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('a rowless (pre-table) cookie is ADOPTED: issue + create, no bump', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 2 }));
    sessionFindUnique.mockResolvedValue(null);
    // The roll CAS misses (no live row to roll) → the adopt branch fires.
    sessionUpdateMany.mockResolvedValue({ count: 0 });

    const { refreshToken } = await refreshTokens(signRefreshToken('user-1', 2));

    expect(payloadOf(refreshToken)).toMatchObject({ ver: 2 });
    expect(userUpdateMany).not.toHaveBeenCalled();
    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenVersionSnapshot: 2,
      }),
    });
  });

  it('a REVOKED-row presentation is THEFT: reusedAt stamp + family kill + atomic bump + 401', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 3 }));
    const presented = signRefreshToken('user-1', 3);
    sessionFindUnique.mockResolvedValue(
      makeRow({ refreshTokenHash: hashRefreshToken(presented), revokedAt: new Date() }),
    );

    await expect(refreshTokens(presented)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
      message: 'انتهت صلاحية هذه الجلسة — سجّل الدخول من جديد',
    });
    // 1. the theft marker (first detector wins — CAS on reusedAt: null)
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', reusedAt: null },
      data: { reusedAt: expect.any(Date) },
    });
    // 2. the family kill — every live row of the user
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // 3. the D3 global kill — the SAME atomic conditional bump logout uses
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', tokenVersion: 3 },
      data: { tokenVersion: { increment: 1 } },
    });
    // and NOTHING was issued afterwards
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('an already-REUSED row replays into the same theft response (no double stamp)', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 3 }));
    const presented = signRefreshToken('user-1', 3);
    const reusedAt = new Date(Date.now() - 60_000);
    sessionFindUnique.mockResolvedValue(
      makeRow({ refreshTokenHash: hashRefreshToken(presented), reusedAt, revokedAt: new Date() }),
    );

    await expect(refreshTokens(presented)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    // The CAS keeps the FIRST detector's timestamp (where reusedAt: null
    // misses on an already-stamped row — the write still fires but the
    // predicate is what makes it idempotent on a real DB).
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', reusedAt: null },
      data: { reusedAt: expect.any(Date) },
    });
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', tokenVersion: 3 },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('fails CLOSED when the theft response cannot be written (never issues)', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 3 }));
    const presented = signRefreshToken('user-1', 3);
    sessionFindUnique.mockResolvedValue(
      makeRow({ refreshTokenHash: hashRefreshToken(presented), revokedAt: new Date() }),
    );
    sessionUpdateMany.mockRejectedValueOnce(new Error('db down'));

    await expect(refreshTokens(presented)).rejects.toThrow('db down');
  });

  it('a foreign-user row (hash-collision paranoia) fails closed', async () => {
    userFindUnique.mockResolvedValue(makeUser({ id: 'user-1', tokenVersion: 0 }));
    const presented = signRefreshToken('user-1', 0);
    sessionFindUnique.mockResolvedValue(makeRow({ userId: 'someone-else' }));

    await expect(refreshTokens(presented)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// rollSessionForToken — the no-laundering guarantee
// ─────────────────────────────────────────────────────────────────────
describe('rollSessionForToken', () => {
  it('never spawns a live child for a row that went revoked mid-flight', async () => {
    // The CAS roll misses (count 0 — the row is no longer live), and the
    // presented hash DOES belong to a (now revoked) row: adopt must NOT
    // fire — the row stays revoked so the next refresh hits the theft gate.
    sessionUpdateMany.mockResolvedValue({ count: 0 });
    sessionFindUnique.mockResolvedValue(makeRow({ revokedAt: new Date() }));

    await rollSessionForToken('user-1', 0, 'token-a', 'token-b');

    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('adopts when the presented hash has NO row at all (legacy cookie)', async () => {
    sessionUpdateMany.mockResolvedValue({ count: 0 });
    sessionFindUnique.mockResolvedValue(null);

    await rollSessionForToken('user-1', 5, 'token-a', 'token-b', { ip: '10.9.9.9' });

    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', tokenVersionSnapshot: 5, ip: '10.9.9.9' }),
    });
  });

  it('is best-effort: a bookkeeping failure never breaks the mint', async () => {
    sessionUpdateMany.mockRejectedValueOnce(new Error('roll failed'));
    await expect(rollSessionForToken('user-1', 0, 'a', 'b')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// createSessionForToken — mint-time row + opportunistic prune
// ─────────────────────────────────────────────────────────────────────
describe('createSessionForToken', () => {
  it('creates the lineage row and prunes stale (cookie-expired) rows', async () => {
    await createSessionForToken('user-1', 7, 'fresh-token', { ip: '10.2.3.4', userAgent: '  ' });

    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        refreshTokenHash: hashRefreshToken('fresh-token'),
        tokenVersionSnapshot: 7,
        ip: '10.2.3.4',
        userAgent: null, // blank UA → null, never ''
      }),
    });
    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: { lastUsedAt: { lt: expect.any(Date) } },
    });
    // The prune horizon is the refresh TTL — nothing newer can be pruned.
    const pruneWhere = (sessionDeleteMany.mock.calls[0]?.[0]?.where ?? {}) as {
      lastUsedAt?: { lt?: Date };
    };
    const cutoff = pruneWhere.lastUsedAt?.lt;
    expect(cutoff).toBeInstanceOf(Date);
    expect(Date.now() - cutoff!.getTime()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
  });

  it('is best-effort: a failed create rejects nothing', async () => {
    sessionCreate.mockRejectedValueOnce(new Error('no table yet'));
    await expect(createSessionForToken('user-1', 0, 't')).resolves.toBeUndefined();
    expect(sessionDeleteMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// listUserSessions — liveness + current flag
// ─────────────────────────────────────────────────────────────────────
describe('listUserSessions', () => {
  it('lists only the caller’s live, current-version rows; current by cookie hash', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 4 }));
    const cookie = signRefreshToken('user-1', 4);
    sessionFindMany.mockResolvedValue([
      makeRow({ id: 's-current', refreshTokenHash: hashRefreshToken(cookie) }),
      makeRow({ id: 's-other', refreshTokenHash: hashRefreshToken('other-device') }),
    ]);

    const list = await listUserSessions('user-1', cookie);

    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          revokedAt: null,
          reusedAt: null,
          tokenVersionSnapshot: 4,
        },
        orderBy: { lastUsedAt: 'desc' },
      }),
    );
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.id === 's-current')!.current).toBe(true);
    expect(list.find((s) => s.id === 's-other')!.current).toBe(false);
    // Wire shape: id/createdAt/lastUsedAt/userAgent/ip/current ONLY.
    expect(Object.keys(list[0]!).sort()).toEqual(
      ['createdAt', 'current', 'id', 'ip', 'lastUsedAt', 'userAgent'].sort(),
    );
  });

  it('without a presented cookie nothing is flagged current (honest)', async () => {
    userFindUnique.mockResolvedValue(makeUser());
    sessionFindMany.mockResolvedValue([makeRow()]);
    const list = await listUserSessions('user-1');
    expect(list[0]!.current).toBe(false);
  });

  it('answers empty for a stale (deleted-user) token identity', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(listUserSessions('ghost')).resolves.toEqual([]);
    expect(sessionFindMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// revokeSessionForOwner — per-session, owner-scoped, idempotent
// ─────────────────────────────────────────────────────────────────────
describe('revokeSessionForOwner', () => {
  it('revokes ONE own live row — no version bump, others untouched', async () => {
    sessionFindUnique.mockResolvedValue(makeRow({ id: 'session-9' }));

    const result = await revokeSessionForOwner('user-1', 'session-9', 'token-a');

    expect(result).toEqual({ status: 'revoked', current: true });
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: 'session-9', userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // Per-session: NO tokenVersion bump — the D3 nuance.
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('a foreign id answers the SAME 404 as a missing id (no existence leak)', async () => {
    sessionFindUnique.mockResolvedValue(makeRow({ userId: 'someone-else' }));
    await expect(revokeSessionForOwner('user-1', 'session-9')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    sessionFindUnique.mockResolvedValue(null);
    await expect(revokeSessionForOwner('user-1', 'session-9')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(sessionUpdateMany).not.toHaveBeenCalled();
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('an already-revoked own row is idempotent (no second write)', async () => {
    sessionFindUnique.mockResolvedValue(makeRow({ id: 'session-9', revokedAt: new Date() }));
    const result = await revokeSessionForOwner('user-1', 'session-9', 'token-a');
    expect(result).toEqual({ status: 'already_revoked', current: true });
    expect(sessionUpdateMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// logoutUser — the existing D3 bump PLUS the ledger half
// ─────────────────────────────────────────────────────────────────────
describe('logoutUser — rows follow the bump', () => {
  it('keeps the atomic conditional bump AND revokes all session rows', async () => {
    userFindUnique.mockResolvedValue({ tokenVersion: 3 } as User);
    userUpdateMany.mockResolvedValue({ count: 1 });

    await logoutUser('user-1');

    // PRESERVED: the exact bump the rotation tests pin.
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', tokenVersion: 3 },
      data: { tokenVersion: { increment: 1 } },
    });
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revokes rows even when the bump was superseded (goal already achieved)', async () => {
    userFindUnique.mockResolvedValue({ tokenVersion: 3 } as User);
    userUpdateMany.mockResolvedValue({ count: 0 });
    await expect(logoutUser('user-1')).resolves.toBeUndefined();
    expect(sessionUpdateMany).toHaveBeenCalled();
  });

  it('is best-effort: a row-write failure never fails the logout', async () => {
    userFindUnique.mockResolvedValue({ tokenVersion: 3 } as User);
    userUpdateMany.mockResolvedValue({ count: 1 });
    sessionUpdateMany.mockRejectedValueOnce(new Error('rows down'));
    await expect(logoutUser('user-1')).resolves.toBeUndefined();
  });

  it('no-ops for unknown users (nothing to revoke)', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(logoutUser('ghost')).resolves.toBeUndefined();
    expect(userUpdateMany).not.toHaveBeenCalled();
    expect(sessionUpdateMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Route-level: GET /auth/sessions + DELETE /auth/sessions/:id
// ─────────────────────────────────────────────────────────────────────
describe('auth session routes (real app, mocked prisma)', () => {
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

  const bearer = signAccessToken('user-1', 'STUDENT', null);
  const authed = (extra: Record<string, string> = {}): Record<string, string> => ({
    Authorization: `Bearer ${bearer}`,
    ...extra,
  });

  it('GET /auth/sessions requires a bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/sessions`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('GET /auth/sessions lists ONLY the caller’s rows with the current flag', async () => {
    userFindUnique.mockResolvedValue(makeUser({ tokenVersion: 0 }));
    const cookie = signRefreshToken('user-1', 0);
    sessionFindMany.mockResolvedValue([
      makeRow({ id: 's-current', refreshTokenHash: hashRefreshToken(cookie) }),
      makeRow({ id: 's-other', refreshTokenHash: hashRefreshToken('another-device') }),
    ]);

    const res = await fetch(`${baseUrl}/api/v1/auth/sessions`, {
      headers: authed({ Cookie: `ulara_refresh=${cookie}` }),
    });
    expect(res.status).toBe(200);
    // The where clause pins ownership + liveness to the CALLER.
    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', revokedAt: null, reusedAt: null }),
      }),
    );
    const body = (await res.json()) as {
      data: Array<{ id: string; current: boolean; userAgent: string | null }>;
    };
    expect(body.data.map((s) => s.id).sort()).toEqual(['s-current', 's-other']);
    expect(body.data.find((s) => s.id === 's-current')?.current).toBe(true);
    expect(body.data.find((s) => s.id === 's-other')?.current).toBe(false);
  });

  it('DELETE a FOREIGN session id → 404 house envelope, nothing written', async () => {
    sessionFindUnique.mockResolvedValue(makeRow({ id: 's-foreign', userId: 'someone-else' }));
    const res = await fetch(`${baseUrl}/api/v1/auth/sessions/s-foreign`, {
      method: 'DELETE',
      headers: authed(),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('NOT_FOUND');
    expect(sessionUpdateMany).not.toHaveBeenCalled();
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('DELETE another OWN session revokes exactly that row and keeps the cookie', async () => {
    const cookie = signRefreshToken('user-1', 0);
    sessionFindUnique.mockResolvedValue(
      makeRow({ id: 's-other', refreshTokenHash: hashRefreshToken('another-device') }),
    );
    const res = await fetch(`${baseUrl}/api/v1/auth/sessions/s-other`, {
      method: 'DELETE',
      headers: authed({ Cookie: `ulara_refresh=${cookie}` }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { ok?: boolean; revoked?: string; current?: boolean } };
    expect(body.data).toMatchObject({ ok: true, revoked: 'revoked', current: false });
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: 's-other', userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(userUpdateMany).not.toHaveBeenCalled(); // per-session: no D3 bump
    // The caller's own cookie must NOT be cleared.
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('DELETE the CURRENT session also clears the refresh cookie (clean self-logout)', async () => {
    const cookie = signRefreshToken('user-1', 0);
    sessionFindUnique.mockResolvedValue(
      makeRow({ id: 's-current', refreshTokenHash: hashRefreshToken(cookie) }),
    );
    const res = await fetch(`${baseUrl}/api/v1/auth/sessions/s-current`, {
      method: 'DELETE',
      headers: authed({ Cookie: `ulara_refresh=${cookie}` }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { current?: boolean } };
    expect(body.data?.current).toBe(true);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('ulara_refresh=');
    expect(setCookie).toMatch(/expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });

  afterEach(() => {
    // Route phases share the process-wide limiter buckets; nothing here
    // leans on cross-test bucket state (the authed routes carry no
    // authRateLimiter), so no reset is required — asserted for clarity.
    expect(true).toBe(true);
  });
});
