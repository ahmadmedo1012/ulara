/**
 * P6 — the UserSession ledger: session LISTING, PER-SESSION revocation
 * and refresh-token REUSE DETECTION (the documented auth.service.ts
 * deferral, closed without touching D3's semantics).
 *
 * How this coexists with D3 (rotation.ts — the BINDING policy):
 *
 *  · The refresh token stays a SLIDING session: a normal refresh never
 *    bumps User.tokenVersion. The session row is ROLLED IN PLACE — its
 *    refreshTokenHash moves to the newly minted token and
 *    lastUsedAt/ip/userAgent are stamped. Identity = the device
 *    lineage, so the list shows one row per logged-in device.
 *  · tokenVersionSnapshot pins the user's tokenVersion AT MINT TIME.
 *    D3's global revocation events (logout, password change/reset,
 *    role change, deactivation) bump the user-level counter exactly as
 *    before; every row whose snapshot no longer matches it is dead and
 *    the sessions list hides it — without those call sites needing to
 *    know this table exists.
 *  · Per-session revocation (DELETE /auth/sessions/:id) sets
 *    revokedAt ONLY. The refresh route checks the row BEFORE issuing:
 *    a revoked row never spawns tokens, so one device dies while the
 *    others keep sliding (no version bump — the D3 nuance documented
 *    at the route).
 *  · REUSE DETECTION: a refresh credential whose hash belongs to an
 *    already-REVOKED or already-REUSED row is a replayed dead token —
 *    treated as theft: reusedAt is stamped on the offending row, ALL
 *    of the user's rows are revoked and tokenVersion is bumped with
 *    the same atomic conditional as logoutUser (kills pre-table
 *    cookies too), then the request 401s.
 *
 * Tokens are NEVER stored — only their sha-256 hex digest (node:crypto
 * createHash — the repo convention, PasswordResetToken.tokenHash). All
 * BOOKKEEPING writes are best-effort (the writeLoginEvent precedent):
 * a telemetry/bookkeeping failure must never block authentication —
 * and every failure mode here self-heals, because the refresh path
 * adopts a cookie whose row is missing. The reuse response is the one
 * deliberately non-swallowed path: failing closed there is the point.
 */
import { createHash } from 'node:crypto';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { parseDurationMs } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../env.js';

/** Request fingerprint threaded from the route layer (LoginContext shape). */
interface SessionRequestContext {
  ip?: string;
  userAgent?: string;
}

/** Wire shape of one listed session (GET /auth/sessions). */
interface SessionListItem {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent: string | null;
  ip: string | null;
  /** True when this row belongs to the PRESENTED refresh credential. */
  current: boolean;
}

type RevokeSessionStatus = 'revoked' | 'already_revoked';

interface RevokeSessionResult {
  status: RevokeSessionStatus;
  /** The revoked row was the CALLER's own (its cookie is now dead). */
  current: boolean;
}

/** sha-256 hex of a refresh token — NEVER the token itself. */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/** Keep the fingerprint columns short (mission contract: short strings). */
const clip = (value: string | undefined, max: number): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};
const clipIp = (ip: string | undefined) => clip(ip, 64);
const clipUa = (userAgent: string | undefined) => clip(userAgent, 256);

/**
 * A refresh cookie older than the refresh TTL can no longer be valid —
 * its JWT is past exp and the cookie's maxAge died with it. Rows not
 * touched for this long are pruned opportunistically so the table (and
 * the user's session list) never accumulates zombies.
 */
const SESSION_TTL_MS = parseDurationMs(env.jwtRefreshTtl);

/**
 * Mint-time bookkeeping: create the row for a freshly issued refresh
 * token (login / register / select-institution without a presented
 * cookie). Best-effort — see the module doc.
 */
export const createSessionForToken = async (
  userId: string,
  tokenVersionSnapshot: number,
  refreshToken: string,
  ctx: SessionRequestContext = {},
): Promise<void> => {
  try {
    await prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        tokenVersionSnapshot,
        userAgent: clipUa(ctx.userAgent),
        ip: clipIp(ctx.ip),
      },
    });
    // Opportunistic prune of stale rows (cookie long expired). Never a
    // correctness input — a failure here only leaves rows behind.
    await prisma.userSession.deleteMany({
      where: { lastUsedAt: { lt: new Date(Date.now() - SESSION_TTL_MS) } },
    });
  } catch (err) {
    logger.warn({ err }, 'userSession bookkeeping failed (non-blocking)');
  }
};

/**
 * Refresh-time bookkeeping: roll the caller's row onto the newly
 * minted token (identity continuity — the list keeps ONE row for the
 * device), or ADOPT the lineage when no live row matches.
 *
 * Adoption happens for cookies minted before this table existed (the
 * deploy-day fleet), for a mint whose bookkeeping write failed, and
 * for a refresh response the client never received. It deliberately
 * does NOT happen when the presented hash belongs to a row that went
 * revoked between the route's theft check and this write: the CAS
 * `updateMany({ where: { ..., revokedAt: null } })` misses, the row
 * stays revoked, and the NEXT refresh of that cookie lands in the
 * reuse detector. A revoked row never spawns a live child.
 */
export const rollSessionForToken = async (
  userId: string,
  tokenVersionSnapshot: number,
  presentedRefreshToken: string,
  newRefreshToken: string,
  ctx: SessionRequestContext = {},
): Promise<void> => {
  try {
    const rolled = await prisma.userSession.updateMany({
      where: {
        userId,
        refreshTokenHash: hashRefreshToken(presentedRefreshToken),
        revokedAt: null,
        reusedAt: null,
      },
      data: {
        refreshTokenHash: hashRefreshToken(newRefreshToken),
        lastUsedAt: new Date(),
        userAgent: clipUa(ctx.userAgent),
        ip: clipIp(ctx.ip),
      },
    });
    if (rolled.count === 0) {
      const existing = await prisma.userSession.findUnique({
        where: { refreshTokenHash: hashRefreshToken(presentedRefreshToken) },
        select: { id: true },
      });
      if (!existing) {
        await prisma.userSession.create({
          data: {
            userId,
            refreshTokenHash: hashRefreshToken(newRefreshToken),
            tokenVersionSnapshot,
            userAgent: clipUa(ctx.userAgent),
            ip: clipIp(ctx.ip),
          },
        });
      }
    }
  } catch (err) {
    logger.warn({ err }, 'userSession roll failed (non-blocking)');
  }
};

/**
 * The reuse-detector response — the one path that must NOT be
 * best-effort (failing closed is the point; errors propagate and the
 * refresh route answers 500 rather than ever issuing tokens).
 *
 * 1. Stamp reusedAt on the offending row — first detector wins (CAS on
 *    reusedAt: null), replays of an already-replayed token never
 *    double-stamp.
 * 2. Revoke ALL of the user's rows — the stolen family is dead.
 * 3. The D3 global kill: the SAME atomic conditional bump logoutUser
 *    uses (conditioned on the version the decision was based on;
 *    count === 0 = a concurrent writer already revoked everything).
 *    This also kills pre-table cookies the rows cannot see.
 */
export const handleRefreshTokenReuse = async (
  userId: string,
  offendingSessionId: string,
  tokenVersion: number,
): Promise<void> => {
  const now = new Date();
  await prisma.userSession.updateMany({
    where: { id: offendingSessionId, reusedAt: null },
    data: { reusedAt: now },
  });
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  await prisma.user.updateMany({
    where: { id: userId, tokenVersion },
    data: { tokenVersion: { increment: 1 } },
  });
  logger.warn({ userId, sessionId: offendingSessionId }, 'refresh-token reuse detected — all sessions revoked');
};

/**
 * GET /auth/sessions — the caller's LIVE sessions: not revoked, never
 * replayed, and minted at the user's CURRENT tokenVersion (rows the
 * D3 global events killed are hidden by the snapshot comparison —
 * those call sites never touch this table).
 *
 * `current` is matched by the presented refresh cookie's hash: the
 * access token carries no session identity (no jti — the JWT claims
 * are sub/role/inst/type), but every /api/v1/auth request rides the
 * cookie, whose hash IS the row's identity.
 */
export const listUserSessions = async (
  userId: string,
  presentedRefreshToken?: string,
): Promise<SessionListItem[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  if (!user) {
    // Stale token identity (user deleted) — nothing to list.
    return [];
  }
  const rows = await prisma.userSession.findMany({
    where: {
      userId,
      revokedAt: null,
      reusedAt: null,
      tokenVersionSnapshot: user.tokenVersion,
    },
    orderBy: { lastUsedAt: 'desc' },
  });
  const currentHash =
    presentedRefreshToken && presentedRefreshToken.length > 0
      ? hashRefreshToken(presentedRefreshToken)
      : null;
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    userAgent: row.userAgent,
    ip: row.ip,
    current: currentHash !== null && row.refreshTokenHash === currentHash,
  }));
};

/**
 * DELETE /auth/sessions/:id — revoke ONE session. Owner-checked with a
 * 404-shaped no-existence-leak (a foreign id and a missing id are the
 * same answer). The write is a CAS on revokedAt: null, so a concurrent
 * revoke (or the reuse family-kill) wins cleanly and the route stays
 * idempotent. Deliberately does NOT bump tokenVersion — see the route.
 */
export const revokeSessionForOwner = async (
  userId: string,
  sessionId: string,
  presentedRefreshToken?: string,
): Promise<RevokeSessionResult> => {
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
  // No existence leak: a foreign id answers exactly like a missing one
  // (the house 404 NOT_FOUND envelope).
  if (!row || row.userId !== userId) throw AppError.notFound('الجلسة غير موجودة');
  const currentHash =
    presentedRefreshToken && presentedRefreshToken.length > 0
      ? hashRefreshToken(presentedRefreshToken)
      : null;
  const current = currentHash !== null && row.refreshTokenHash === currentHash;
  if (row.revokedAt || row.reusedAt) {
    return { status: 'already_revoked', current };
  }
  await prisma.userSession.updateMany({
    where: { id: row.id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { status: 'revoked', current };
};

/**
 * Logout's row half: revoke ALL of the user's rows. Best-effort — the
 * D3 version bump in logoutUser is the authoritative kill; this keeps
 * the ledger truthful so a post-logout replay lands in the reuse
 * detector instead of silently succeeding.
 */
export const revokeAllSessions = async (userId: string): Promise<void> => {
  try {
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, 'userSession logout revoke failed (non-blocking)');
  }
};
