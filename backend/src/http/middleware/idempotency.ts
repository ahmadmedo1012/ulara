/**
 * r359 A4 — request-scoped idempotency for side-effectful POSTs.
 *
 * Contract:
 *  · A client MAY send `Idempotency-Key: <string ≤128 chars>` on the
 *    routes that mount this middleware (announcements, bulk-import
 *    commit, invites, governance document upload).
 *  · First request: executes normally; the response (status + JSON
 *    body) is persisted in IdempotencyRecord scoped to (userId, route,
 *    sha256(key)), expiring after 24h.
 *  · Replay (same key inside the window): the STORED response is
 *    returned verbatim with `Idempotency-Replayed: true` — the handler
 *    never runs twice. This is the network-retry contract every
 *    payment-grade API carries.
 *  · No header = no idempotency (the route behaves exactly as before).
 *  · Unauthenticated requests are passed through (the route's own auth
 *    middleware ordering decides; this middleware stores nothing for
 *    them — a 401 response is not worth replaying).
 *  · Storage failures degrade to pass-through (idempotency is a
 *    courtesy, not a gate that can take the route down).
 */
import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';

export const IDEMPOTENCY_RETENTION_HOURS = 24;
export const IDEMPOTENCY_KEY_MAX = 128;

/** Pure helpers (exported for tests). */
export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function normalizeIdempotencyKey(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const trimmed = header.trim();
  if (!trimmed || trimmed.length > IDEMPOTENCY_KEY_MAX) return null;
  return trimmed;
}

/** The route identity for scoping — method + the router's base path +
 * the route path (NOT the full URL with query — retries may differ in
 * irrelevant query noise… but a different QUERY may mean a different
 * request. We scope to the route template + key: the caller owns key
 * discipline, matching Stripe's model). */
function routeIdentity(req: Request): string {
  const route = req.route;
  const base = (req.baseUrl ?? '').replace(/\/+$/, '');
  const path = route?.path ?? req.path;
  return `${req.method} ${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function idempotencyMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = normalizeIdempotencyKey(req.headers['idempotency-key']);
    const userId = (req as { user?: { id?: string } }).user?.id;
    // No key, or no authenticated user (a 401/403 response is not worth
    // storing; retries are cheap and safe there).
    if (!key || !userId) {
      next();
      return;
    }
    const route = routeIdentity(req);
    const keyHash = hashIdempotencyKey(key);

    void (async () => {
      try {
        const existing = await prisma.idempotencyRecord.findUnique({
          where: { userId_route_keyHash: { userId, route, keyHash } },
        });
        if (existing && existing.expiresAt > new Date()) {
          res.setHeader('Idempotency-Replayed', 'true');
          res.status(existing.responseStatus).json(existing.responseBody);
          return;
        }
      } catch (err) {
        logger.warn({ err, route }, 'idempotency: lookup failed — passing through');
      }

      // Capture the response, then store it (only 2xx/4xx — a 5xx is
      // not an answer worth replaying; the client SHOULD retry).
      const originalJson = res.json.bind(res);
      res.json = (body: unknown): Response => {
        originalJson(body);
        if (res.statusCode >= 200 && res.statusCode < 500) {
          void prisma.idempotencyRecord
            .upsert({
              where: { userId_route_keyHash: { userId, route, keyHash } },
              create: {
                userId,
                route,
                keyHash,
                responseStatus: res.statusCode,
                responseBody: body as object,
                expiresAt: new Date(Date.now() + IDEMPOTENCY_RETENTION_HOURS * 3600_000),
              },
              update: {
                responseStatus: res.statusCode,
                responseBody: body as object,
                expiresAt: new Date(Date.now() + IDEMPOTENCY_RETENTION_HOURS * 3600_000),
              },
            })
            .catch((err: unknown) => {
              logger.warn({ err, route }, 'idempotency: store failed (best-effort)');
            });
        }
        return res;
      };
      next();
    })().catch(() => next());
  };
}
