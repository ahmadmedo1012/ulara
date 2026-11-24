/**
 * r359 A4 — the email OUTBOX: the transactional layer above lib/mail.ts
 * that owns user-level honesty:
 *
 *  · SUPPRESSION — a user whose address hard-bounced or filed a spam
 *    complaint (User.emailBouncedAt/emailComplainedAt, maintained by the
 *    Resend webhook) is skipped; the skip is recorded as an EmailEvent
 *    row (SEND_SKIPPED_SUPPRESSED) so operators can audit the silence.
 *  · EVENTS — every send attempt through this layer writes an EmailEvent
 *    (SEND_FAILED on refusal), so the deliverability story is queryable.
 *  · VERIFICATION — issueVerificationToken / consumeVerificationToken:
 *    single-use 48h tokens, stored sha256-hashed, newest-wins (a resend
 *    consumes the previous open token).
 *  · DIGEST — runWeeklyDigest: one bounded email per opted-in user
 *    (NotificationPreference.emailDigest), max 20 items, never throws.
 *
 * Everything here is best-effort at the CALLER boundary: sendMailForUser
 * returns false instead of throwing (mirrors lib/mail.ts), the digest
 * job logs and continues per user.
 */
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { mailConfig, sendMail, renderVerificationEmail, renderDigestEmail, type MailMessage } from '../../lib/mail.js';

// ── Suppression + events ────────────────────────────────────────────

/** Minimal structural slices — unit-testable without a database. */
export interface OutboxUser {
  id: string;
  email: string;
  emailBouncedAt: Date | null;
  emailComplainedAt: Date | null;
}

export function isSuppressed(user: Pick<OutboxUser, 'emailBouncedAt' | 'emailComplainedAt'>): boolean {
  return user.emailBouncedAt !== null || user.emailComplainedAt !== null;
}

export interface OutboxClient {
  emailEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Send one transactional email to a user with suppression + audit.
 * Returns 'sent' | 'skipped_suppressed' | 'failed' — never throws.
 */
export async function sendMailForUser(
  client: OutboxClient,
  user: OutboxUser,
  message: MailMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<'sent' | 'skipped_suppressed' | 'failed'> {
  if (isSuppressed(user)) {
    await client.emailEvent
      .create({
        data: {
          userId: user.id,
          email: user.email,
          type: 'SEND_SKIPPED_SUPPRESSED',
          detail: user.emailBouncedAt ? 'hard bounce on file' : 'complaint on file',
        },
      })
      .catch(() => undefined);
    logger.warn({ userId: user.id, subject: message.subject }, 'mail: suppressed address skipped');
    return 'skipped_suppressed';
  }
  const ok = await sendMail(mailConfig, message, fetchImpl);
  if (!ok) {
    await client.emailEvent
      .create({ data: { userId: user.id, email: user.email, type: 'SEND_FAILED', detail: message.subject } })
      .catch(() => undefined);
    return 'failed';
  }
  return 'sent';
}

// ── Email verification tokens ───────────────────────────────────────

export const VERIFICATION_TOKEN_HOURS = 48;

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function mintVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface VerificationClient {
  user: {
    findUnique(args: { where: { id: string }; select: { id: true; email: true; firstName: true; emailVerifiedAt: true; emailBouncedAt: true; emailComplainedAt: true } }): Promise<OutboxUser & { firstName: string; emailVerifiedAt: Date | null } | null>;
  };
  emailVerificationToken: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    findUnique(args: { where: { tokenHash: string } }): Promise<{ id: string; userId: string; expiresAt: Date; consumedAt: Date | null } | null>;
  };
  emailEvent: OutboxClient['emailEvent'];
}

/** Issue (or re-issue) a verification token for a user + send the mail.
 * Newest-wins: previous open tokens are consumed. Returns whether the
 * mail was actually sent (provider configured + not suppressed). */
export async function issueVerificationEmail(
  client: VerificationClient,
  userId: string,
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<'sent' | 'skipped_suppressed' | 'failed' | 'already_verified' | 'no_user'> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, emailVerifiedAt: true, emailBouncedAt: true, emailComplainedAt: true },
  });
  if (!user) return 'no_user';
  if (user.emailVerifiedAt) return 'already_verified';

  // Consume any previous open tokens (newest-wins).
  await client.emailVerificationToken.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = mintVerificationToken();
  await client.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashVerificationToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 3600_000),
    },
  });

  const verifyUrl = `${origin}/verify-email?token=${token}`;
  const message = { to: user.email, ...renderVerificationEmail(user.firstName, verifyUrl, VERIFICATION_TOKEN_HOURS) };
  return sendMailForUser(client, user, message, fetchImpl);
}

/** Consume a verification token: single-use, expiry-checked, sets
 * User.emailVerifiedAt. Returns the outcome for the route's honest 200s. */
export async function consumeVerificationToken(
  client: VerificationClient & {
    user: {
      findUnique(args: object): Promise<OutboxUser & { firstName: string; emailVerifiedAt: Date | null } | null>;
      update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
    };
  },
  token: string,
  now: Date = new Date(),
): Promise<'verified' | 'already_verified' | 'invalid' | 'expired'> {
  if (!token || token.length < 20 || token.length > 200) return 'invalid';
  const row = await client.emailVerificationToken.findUnique({ where: { tokenHash: hashVerificationToken(token) } });
  if (!row) return 'invalid';
  if (row.consumedAt) {
    // A consumed token still maps to a user — report their true state.
    const user = await client.user.findUnique({ where: { id: row.userId } });
    return user?.emailVerifiedAt ? 'already_verified' : 'invalid';
  }
  if (row.expiresAt < now) return 'expired';
  await client.emailVerificationToken.updateMany({ where: { id: row.id }, data: { consumedAt: now } });
  await client.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
  return 'verified';
}

// ── The weekly digest ───────────────────────────────────────────────

export const DIGEST_MAX_ITEMS = 20;

export interface DigestClient {
  notificationPreference: {
    findMany(args: { where: { emailDigest: boolean }; select: { userId: true } }): Promise<Array<{ userId: string }>>;
  };
  user: {
    findMany(args: {
      where: { id: { in: string[] }; isActive: boolean };
      select: { id: true; email: true; firstName: true; emailBouncedAt: true; emailComplainedAt: true };
    }): Promise<Array<OutboxUser & { firstName: string }>>;
  };
  notification: {
    findMany(args: {
      where: { userId: string; readAt: null; createdAt: { gte: Date } };
      select: { title: true; body: true };
      take: number;
      orderBy: { createdAt: 'desc' };
    }): Promise<Array<{ title: string; body: string | null }>>;
  };
  emailEvent: OutboxClient['emailEvent'];
}

/** The weekly digest run (scheduler, Sunday 18:00 UTC). Bounded, never
 * throws; one email per opted-in ACTIVE user with unread items. */
export async function runWeeklyDigest(
  client: DigestClient,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ recipients: number; sent: number; skipped: number; failed: number }> {
  const out = { recipients: 0, sent: 0, skipped: 0, failed: 0 };
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const optedIn = await client.notificationPreference.findMany({
    where: { emailDigest: true },
    select: { userId: true },
  });
  if (optedIn.length === 0) return out;
  const users = await client.user.findMany({
    where: { id: { in: optedIn.map((o) => o.userId) }, isActive: true },
    select: { id: true, email: true, firstName: true, emailBouncedAt: true, emailComplainedAt: true },
  });
  for (const user of users) {
    try {
      const items = await client.notification.findMany({
        where: { userId: user.id, readAt: null, createdAt: { gte: weekAgo } },
        select: { title: true, body: true },
        take: DIGEST_MAX_ITEMS,
        orderBy: { createdAt: 'desc' },
      });
      if (items.length === 0) continue; // nothing to say — silence is correct
      out.recipients += 1;
      const weekLabel = `${weekAgo.getUTCFullYear()}/${weekAgo.getUTCMonth() + 1}/${weekAgo.getUTCDate()}`;
      const message = {
        to: user.email,
        ...renderDigestEmail(user.firstName, items, `${env.APP_ORIGIN}/notifications`, weekLabel),
      };
      const result = await sendMailForUser(client, user, message, fetchImpl);
      if (result === 'sent') out.sent += 1;
      else if (result === 'skipped_suppressed') out.skipped += 1;
      else out.failed += 1;
    } catch (err) {
      logger.warn({ err, userId: user.id }, 'digest: per-user failure (continuing)');
      out.failed += 1;
    }
  }
  return out;
}
