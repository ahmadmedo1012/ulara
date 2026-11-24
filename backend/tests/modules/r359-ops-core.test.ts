/**
 * r359 A4 — unit tests for the ops core:
 *  · notification preferences (defaults, per-type gating, bulk resolve)
 *  · push receipt settling (delivered / failed / DeviceNotRegistered prune)
 *  · stale device sweeper
 *  · email outbox (suppression, verification lifecycle, weekly digest)
 *  · Resend webhook signature verification (pure fn)
 *  · idempotency key normalization + hashing (pure fn)
 *
 * DB-free by design: every client is a hand-rolled structural mock (the
 * house pattern from scheduler/r355 suites).
 */
import { describe, expect, it, vi } from 'vitest';
import type { NotificationType } from '@prisma/client';

// Hoisted expo-server-sdk stub: push.ts imports it DYNAMICALLY at call
// time, so one hoisted mock with a switchable receipt map covers both
// receipt tests (no doMock ordering hazards).
const receiptTickets: Record<string, { status: string; message?: string; details?: { error?: string } }> = {};
// The outbox tests assert SEND OUTCOMES, not provider transports — mock
// sendMail to succeed and keep every template/renderer real.
vi.mock('../../src/lib/mail.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/mail.js')>();
  return { ...actual, sendMail: vi.fn(async () => true) };
});
vi.mock('expo-server-sdk', () => ({
  Expo: class {
    chunkPushNotificationReceiptIds(ids: string[]) { return [ids]; }
    async getPushNotificationReceiptsAsync(ids: string[]) {
      // Missing tickets stay UNSETTLED (no default) — the route keeps
      // them PENDING for the next run.
      return Object.fromEntries(ids.flatMap((id) => (id in receiptTickets ? [[id, receiptTickets[id]]] : [])));
    }
  },
}));

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  pushAllowedForType,
  resolvePreferences,
  type PreferenceClient,
} from '../../src/modules/notifications/preferences.js';
import { checkPendingReceipts, sweepStaleDevices } from '../../src/modules/notifications/push.js';
import {
  isSuppressed,
  consumeVerificationToken,
  issueVerificationEmail,
  runWeeklyDigest,
  hashVerificationToken,
  type VerificationClient,
} from '../../src/modules/email/outbox.js';
import { verifyResendSignature, classifyResendEvent } from '../../src/http/routes/webhooks.routes.js';
import { normalizeIdempotencyKey, hashIdempotencyKey, IDEMPOTENCY_KEY_MAX } from '../../src/http/middleware/idempotency.js';

// ── preferences ──────────────────────────────────────────────────────

describe('notification preferences (r359)', () => {
  it('defaults: every push category ON, digest OFF', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      pushUrgent: true,
      pushAcademic: true,
      pushSystem: true,
      pushSocial: true,
      emailDigest: false,
    });
  });

  it('pushAllowedForType maps each category to its flag', () => {
    const muted: typeof DEFAULT_NOTIFICATION_PREFERENCES = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      pushAcademic: false,
    };
    expect(pushAllowedForType(muted, 'ACADEMIC' as NotificationType)).toBe(false);
    expect(pushAllowedForType(muted, 'URGENT' as NotificationType)).toBe(true);
    expect(pushAllowedForType(muted, 'SYSTEM' as NotificationType)).toBe(true);
    expect(pushAllowedForType(muted, 'SOCIAL' as NotificationType)).toBe(true);
  });

  it('resolvePreferences fills defaults for users without a row (one query)', async () => {
    const findMany = vi.fn(async () => [
      {
        userId: 'u2',
        pushUrgent: true,
        pushAcademic: false,
        pushSystem: true,
        pushSocial: true,
        emailDigest: true,
      },
    ]);
    const client: PreferenceClient = { notificationPreference: { findMany } };
    const map = await resolvePreferences(client, ['u1', 'u2', 'u3']);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(map.get('u1')).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(map.get('u2')).toMatchObject({ pushAcademic: false, emailDigest: true });
    expect(map.get('u3')).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('resolvePreferences with an empty roster makes NO query', async () => {
    const findMany = vi.fn(async () => []);
    const client: PreferenceClient = { notificationPreference: { findMany } };
    const map = await resolvePreferences(client, []);
    expect(findMany).not.toHaveBeenCalled();
    expect(map.size).toBe(0);
  });
});

// ── push receipts ────────────────────────────────────────────────────

function receiptClient(pending: Array<{ id: string; ticketId: string | null; pushDeviceId: string }>) {
  const updates: unknown[] = [];
  const pruned: string[][] = [];
  return {
    client: {
      pushDeliveryReceipt: {
        findMany: vi.fn(async () => pending),
        updateMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => {
          updates.push(args.where.id.in);
          return { count: args.where.id.in.length };
        }),
      },
      pushDevice: {
        deleteMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => {
          pruned.push(args.where.id.in);
          return { count: args.where.id.in.length };
        }),
      },
    },
    updates,
    pruned,
  };
}

describe('checkPendingReceipts (r359)', () => {
  it('settles ok receipts to DELIVERED and error receipts to FAILED; unsettled stay PENDING', async () => {
    receiptTickets.t1 = { status: 'ok' };
    receiptTickets.t2 = { status: 'error', message: 'Provider error', details: {} };
    // t3 intentionally absent → not settled → stays PENDING.
    const { client, updates } = receiptClient([
      { id: 'r1', ticketId: 't1', pushDeviceId: 'd1' },
      { id: 'r2', ticketId: 't2', pushDeviceId: 'd2' },
      { id: 'r3', ticketId: 't3', pushDeviceId: 'd3' },
    ]);
    const out = await checkPendingReceipts(client, new Date());
    expect(out.checked).toBe(2);
    expect(out.delivered).toBe(1);
    expect(out.failed).toBe(1);
    expect(updates.flat()).toEqual(expect.arrayContaining(['r1', 'r2']));
    expect(out.prunedDevices).toBe(0);
    delete receiptTickets.t1;
    delete receiptTickets.t2;
  });

  it('prunes the device when the receipt says DeviceNotRegistered', async () => {
    receiptTickets.t1 = { status: 'error', details: { error: 'DeviceNotRegistered' } };
    const { client, pruned } = receiptClient([
      { id: 'r1', ticketId: 't1', pushDeviceId: 'dead-device' },
    ]);
    const out = await checkPendingReceipts(client, new Date());
    expect(out.prunedDevices).toBe(1);
    expect(pruned).toEqual([['dead-device']]);
    delete receiptTickets.t1;
  });
});

describe('sweepStaleDevices (r359)', () => {
  it('prunes devices by lastSeenAt and receipts by createdAt with the documented horizons', async () => {
    const calls: Array<{ deviceCutoff: Date; receiptCutoff: Date }> = [];
    const client = {
      pushDevice: {
        deleteMany: vi.fn(async (args: { where: { lastSeenAt: { lt: Date } } }) => {
          calls.push({ deviceCutoff: args.where.lastSeenAt.lt, receiptCutoff: new Date(0) });
          return { count: 3 };
        }),
      },
      pushDeliveryReceipt: {
        deleteMany: vi.fn(async (args: { where: { createdAt: { lt: Date } } }) => {
          calls[calls.length - 1]!.receiptCutoff = args.where.createdAt.lt;
          return { count: 12 };
        }),
      },
    };
    const now = new Date('2026-11-24T00:00:00Z');
    const out = await sweepStaleDevices(client, now);
    expect(out).toEqual({ devices: 3, receipts: 12 });
    // 180 days for devices, 30 days for receipts.
    expect(Math.round((now.getTime() - calls[0]!.deviceCutoff.getTime()) / 86400000)).toBe(180);
    expect(Math.round((now.getTime() - calls[0]!.receiptCutoff.getTime()) / 86400000)).toBe(30);
  });
});

// ── email outbox ─────────────────────────────────────────────────────

describe('email outbox (r359)', () => {
  it('isSuppressed: bounce OR complaint parks the address', () => {
    expect(isSuppressed({ emailBouncedAt: null, emailComplainedAt: null })).toBe(false);
    expect(isSuppressed({ emailBouncedAt: new Date(), emailComplainedAt: null })).toBe(true);
    expect(isSuppressed({ emailBouncedAt: null, emailComplainedAt: new Date() })).toBe(true);
  });

  it('verification lifecycle: issue → consume → replay says already_verified', async () => {
    const tokens: Array<Record<string, unknown>> = [];
    const users = new Map<string, { id: string; email: string; firstName: string; emailVerifiedAt: Date | null; emailBouncedAt: Date | null; emailComplainedAt: Date | null }>([
      ['u1', { id: 'u1', email: 'a@x.ly', firstName: 'أحمد', emailVerifiedAt: null, emailBouncedAt: null, emailComplainedAt: null }],
    ]);
    const sent: unknown[] = [];
    const client: VerificationClient & Parameters<typeof consumeVerificationToken>[0] = {
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const u = users.get(where.id)!;
          if (data.emailVerifiedAt) u.emailVerifiedAt = data.emailVerifiedAt as Date;
          return u;
        }),
      },
      emailVerificationToken: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { tokens.push(data); return data; }),
        updateMany: vi.fn(async () => ({ count: 0 })),
        findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) =>
          tokens.find((t) => t.tokenHash === where.tokenHash) as never,
        ),
      },
      emailEvent: { create: vi.fn(async () => ({})) },
    };
    const fetchImpl = (vi.fn(async () => new Response('{}', { status: 200 })) as unknown) as typeof fetch;
    // Provider must be configured for a send — mailConfig reads env; the
    // outbox falls back to sendMail which returns false on provider=none,
    // but issueVerificationEmail still mints the token. Assert the mint.
    const issue = await issueVerificationEmail(client, 'u1', 'https://ulara.vercel.app', fetchImpl);
    expect(issue).toBe('sent'); // sendMail is mocked true — the outbox logic is under test
    expect(tokens).toHaveLength(1);
    // We cannot recover the raw token from the hash — consume via the
    // hash path needs the raw string; instead verify replay semantics on
    // a synthetic token we hash ourselves.
    const raw = 'x'.repeat(43); // base64url-shaped
    tokens.push({ userId: 'u1', tokenHash: hashVerificationToken(raw), expiresAt: new Date(Date.now() + 3600_000), consumedAt: null });
    // consume: invalid shape first
    expect(await consumeVerificationToken(client, 'short')).toBe('invalid');
    // consume: valid + fresh → verified
    expect(await consumeVerificationToken(client, raw)).toBe('verified');
    expect(users.get('u1')!.emailVerifiedAt).not.toBeNull();
    expect(sent).toHaveLength(0);
    // replay: the token row is consumed → already_verified (user IS verified)
    tokens[tokens.length - 1]!.consumedAt = new Date();
    expect(await consumeVerificationToken(client, raw)).toBe('already_verified');
  });

  it('consumeVerificationToken: expired tokens are refused honestly', async () => {
    const raw = 'y'.repeat(43);
    const client = {
      user: { findUnique: vi.fn(async () => null), update: vi.fn(async () => ({})) },
      emailVerificationToken: {
        create: vi.fn(),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => ({ id: 't1', userId: 'u1', expiresAt: new Date(Date.now() - 1000), consumedAt: null })),
      },
      emailEvent: { create: vi.fn() },
    };
    expect(await consumeVerificationToken(client, raw)).toBe('expired');
  });
});

describe('weekly digest (r359)', () => {
  function digestClient(opts: { optedIn: string[]; unread: Record<string, Array<{ title: string; body: string | null }>> }) {
    return {
      notificationPreference: {
        findMany: vi.fn(async () => opts.optedIn.map((userId) => ({ userId }))),
      },
      user: {
        findMany: vi.fn(async () =>
          opts.optedIn.map((id) => ({
            id,
            email: `${id}@x.ly`,
            firstName: 'م',
            emailBouncedAt: null,
            emailComplainedAt: null,
          })),
        ),
      },
      notification: {
        findMany: vi.fn(async ({ where }: { where: { userId: string } }) => opts.unread[where.userId] ?? []),
      },
      emailEvent: { create: vi.fn(async () => ({})) },
    };
  }

  it('sends one mail per opted-in user WITH unread items; silent users are skipped', async () => {
    const client = digestClient({
      optedIn: ['u1', 'u2'],
      unread: { u1: [{ title: 'محاضرة جديدة', body: 'غدًا' }], u2: [] },
    });
    const fetches: unknown[] = [];
    const fetchImpl = (vi.fn(async () => {
      fetches.push(1);
      return new Response('{}', { status: 200 });
    }) as unknown) as typeof fetch;
    const out = await runWeeklyDigest(client, new Date(), fetchImpl);
    expect(out.recipients).toBe(1);
    expect(out.sent).toBe(1);
    expect(client.notification.findMany).toHaveBeenCalledTimes(2);
  });

  it('suppressed users are counted as skipped, never fetched to the provider', async () => {
    const client = digestClient({ optedIn: ['u1'], unread: { u1: [{ title: 't', body: null }] } });
    // Make the user suppressed.
    (client.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'u1', email: 'u1@x.ly', firstName: 'م', emailBouncedAt: new Date(), emailComplainedAt: null },
    ]);
    const fetchImpl = (vi.fn(async () => new Response('{}', { status: 200 }))) as unknown as typeof fetch;
    const out = await runWeeklyDigest(client, new Date(), fetchImpl);
    expect(out).toMatchObject({ recipients: 1, sent: 0, skipped: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// ── Resend webhook signature (pure) ─────────────────────────────────

describe('verifyResendSignature (r359)', () => {
  const secret = 'whsec_test_secret_0123456789';
  const raw = JSON.stringify({ type: 'email.bounced', data: { email: 'a@x.ly' } });
  const ts = '1795481000';
  const id = 'msg_123';

  function sign(svixId: string, svixTs: string, body: string, key: string): string {
    // node:crypto in-test mirror of the svix scheme.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    return `v1,${createHmac('sha256', key).update(`${svixId}.${svixTs}.${body}`).digest('base64')}`;
  }

  it('accepts a correctly signed payload', () => {
    expect(verifyResendSignature(secret, id, ts, sign(id, ts, raw, secret), raw)).toBe(true);
  });

  it('rejects a forged signature, a wrong secret, and tampered bytes', () => {
    expect(verifyResendSignature(secret, id, ts, sign(id, ts, raw, 'other'), raw)).toBe(false);
    expect(verifyResendSignature(secret, id, ts, sign(id, ts, raw, secret), raw + ' ')).toBe(false);
    expect(verifyResendSignature(secret, id, ts, 'v1,AAAA', raw)).toBe(false);
    expect(verifyResendSignature(secret, id, ts, 'weird-scheme', raw)).toBe(false);
  });
});

describe('classifyResendEvent (r359)', () => {
  it('maps bounce/complaint/delivery/open and passes unknown through as null', () => {
    expect(classifyResendEvent('email.bounced')).toEqual({ eventType: 'BOUNCE', suppress: 'bounced' });
    expect(classifyResendEvent('email.complaint')).toEqual({ eventType: 'COMPLAINT', suppress: 'complained' });
    expect(classifyResendEvent('email.delivered')).toEqual({ eventType: 'DELIVERY', suppress: null });
    expect(classifyResendEvent('email.opened')).toEqual({ eventType: 'OPEN', suppress: null });
    expect(classifyResendEvent('email.clicked')).toBeNull();
  });
});

// ── idempotency (pure) ───────────────────────────────────────────────

describe('idempotency key helpers (r359)', () => {
  it('normalizes: trims, rejects empty and >128 chars', () => {
    expect(normalizeIdempotencyKey('  abc  ')).toBe('abc');
    expect(normalizeIdempotencyKey('')).toBeNull();
    expect(normalizeIdempotencyKey('   ')).toBeNull();
    expect(normalizeIdempotencyKey('x'.repeat(IDEMPOTENCY_KEY_MAX + 1))).toBeNull();
    expect(normalizeIdempotencyKey('x'.repeat(IDEMPOTENCY_KEY_MAX))).toBe('x'.repeat(IDEMPOTENCY_KEY_MAX));
    expect(normalizeIdempotencyKey(undefined)).toBeNull();
    expect(normalizeIdempotencyKey(42)).toBeNull();
  });

  it('hashes deterministically (sha256 hex)', () => {
    expect(hashIdempotencyKey('k1')).toBe(hashIdempotencyKey('k1'));
    expect(hashIdempotencyKey('k1')).not.toBe(hashIdempotencyKey('k2'));
    expect(hashIdempotencyKey('k1')).toMatch(/^[0-9a-f]{64}$/);
  });
});
