/**
 * r359 A4 — the Resend webhook: bounce + complaint handling (the
 * deliverability half of the email contract).
 *
 *  POST /api/v1/webhooks/resend
 *
 *  · Signature: svix-style HMAC (headers `svix-id`, `svix-timestamp`,
 *    `svix-signature: v1,<base64>`), verified against
 *    RESEND_WEBHOOK_SECRET with a timing-safe compare over the RAW
 *    request body. Unset secret → 401 (fail closed: forging a bounce
 *    would silence a user's mail). Timestamps older than 5 minutes are
 *    rejected (replay window).
 *  · Events: `email.bounced` (hard bounce → User.emailBouncedAt, the
 *    outbox suppresses the address), `email.complaint` (→
 *    User.emailComplainedAt), `email.delivered` / `email.opened`
 *    (recorded as EmailEvent rows only).
 *  · Every event writes one EmailEvent row (email + type + raw payload)
 *    — the auditable deliverability trail; unknown types are recorded
 *    as-is and 200-ACKed (a webhook must not be a 500 source).
 *  · Unauthenticated in the session sense but rate-limited by the
 *    global API limiter + the HMAC gate.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { logger } from '../../logger.js';

const router = Router();

/** Replay window — Resend-signed requests arrive within seconds. */
const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

/** Timing-safe svix signature verification (pure, exported for tests). */
export function verifyResendSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
  rawBody: string,
): boolean {
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedContent).digest('base64');
  // The header may carry multiple schemes ("v1,a v1,b" on retry) — any
  // v1 match verifies.
  const candidates = svixSignatureHeader
    .split(' ')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1,'))
    .map((part) => part.slice(3));
  if (candidates.length === 0) return false;
  const expectedBuf = Buffer.from(expected);
  for (const candidate of candidates) {
    const candidateBuf = Buffer.from(candidate);
    if (candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

/** Map a Resend event type to our EmailEventType + suppression action. */
export function classifyResendEvent(type: string): {
  eventType: 'BOUNCE' | 'COMPLAINT' | 'DELIVERY' | 'OPEN';
  suppress: 'bounced' | 'complained' | null;
} | null {
  switch (type) {
    case 'email.bounced':
      return { eventType: 'BOUNCE', suppress: 'bounced' };
    case 'email.complaint':
      return { eventType: 'COMPLAINT', suppress: 'complained' };
    case 'email.delivered':
      return { eventType: 'DELIVERY', suppress: null };
    case 'email.opened':
      return { eventType: 'OPEN', suppress: null };
    default:
      return null;
  }
}

router.post('/resend', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    // ── fail-closed HMAC gate ──
    if (!env.RESEND_WEBHOOK_SECRET) {
      res.status(401).json({ error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'قناة أحداث البريد غير مهيأة على هذا الخادم' } });
      return;
    }
    const svixId = String(req.headers['svix-id'] ?? '');
    const svixTimestamp = String(req.headers['svix-timestamp'] ?? '');
    const svixSignature = String(req.headers['svix-signature'] ?? '');
    const rawBody = (req as { rawBody?: Buffer }).rawBody?.toString('utf-8') ?? '';
    if (!svixId || !svixTimestamp || !svixSignature || !rawBody) {
      res.status(401).json({ error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'توقيع الحدث ناقص' } });
      return;
    }
    const age = Math.abs(Date.now() - Number(svixTimestamp) * 1000);
    if (!Number.isFinite(age) || age > WEBHOOK_MAX_AGE_MS) {
      res.status(401).json({ error: { code: 'WEBHOOK_TIMESTAMP_STALE', message: 'طابع زمني خارج نافذة القبول' } });
      return;
    }
    if (!verifyResendSignature(env.RESEND_WEBHOOK_SECRET, svixId, svixTimestamp, svixSignature, rawBody)) {
      res.status(401).json({ error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'توقيع الحدث غير صالح' } });
      return;
    }

    // ── event handling (parse from the verified raw bytes) ──
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { email?: string; to?: string; message_id?: string } & Record<string, unknown>;
    };
    const email = event.data?.email ?? event.data?.to ?? '';
    const providerMessageId = event.data?.message_id ?? null;
    if (!email) {
      // Signed but malformed — ACK and record nothing (no address, no row).
      res.json({ data: { recorded: false } });
      return;
    }
    const classified = classifyResendEvent(String(event.type ?? ''));
    const eventType = classified?.eventType ?? null;
    try {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      await prisma.emailEvent.create({
        data: {
          userId: user?.id ?? null,
          email,
          type: eventType ?? 'OPEN', // unknown types recorded as OPEN with detail
          providerMessageId,
          detail: eventType ? null : `unhandled type: ${String(event.type)}`,
          raw: (event.data ?? {}) as object,
        },
      });
      if (classified?.suppress && user) {
        await prisma.user.update({
          where: { id: user.id },
          data: classified.suppress === 'bounced' ? { emailBouncedAt: new Date() } : { emailComplainedAt: new Date() },
        });
        logger.warn({ email, type: event.type }, 'webhook: email suppressed (bounce/complaint)');
      }
    } catch (err) {
      logger.error({ err, type: event.type }, 'webhook: event recording failed');
      // Recording failures must not make Resend retry-storm: ACK 200.
      // The next event for the same address re-records.
    }
    res.json({ data: { recorded: true } });
  })().catch(next);
});

export default router;
