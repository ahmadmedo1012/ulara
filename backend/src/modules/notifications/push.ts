/**
 * R327 C3 → r359 A4 — the Expo push fan-out (server half), gated by
 * PUSH_ENABLED.
 *
 * Contract:
 *  - fanOutPush(userIds, payload, opts?) — BEST-EFFORT delivery to every
 *    registered device of the given users. It NEVER throws into a
 *    caller whose primary write already succeeded (the degraded-twin
 *    law from fire.ts); a failure logs a warning and returns.
 *  - Runs only AFTER the notification row is committed (callers hold
 *    the ids from the transaction, then push) — a rolled-back event
 *    must never produce a phantom bell.
 *  - r359 A4 — category preferences: users who muted the payload's
 *    category (NotificationPreference) are filtered out BEFORE the
 *    Expo call. The inbox row is untouched — a mute is a bell mute,
 *    not a record deletion.
 *  - r359 A4 — delivery receipts: every ticket becomes a PENDING
 *    PushDeliveryReceipt row (device + notification linked when the
 *    caller passes the id map). checkPendingReceipts() settles them
 *    against Expo's receipt API and prunes DeviceNotRegistered devices;
 *    sweepStaleDevices() removes devices nobody has seen for 180 days.
 *  - Dead tokens (DeviceNotRegistered) are ALSO pruned on sight — the
 *    device table stays honest without waiting for the sweeper.
 *  - With PUSH_ENABLED=false (the default) this is a no-op — the
 *    registration endpoints alone change nothing for the web client.
 */
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import type { NotificationType } from '@prisma/client';
import type { NotificationPayload } from './core.js';
import { resolvePreferences, pushAllowedForType } from './preferences.js';

/** Message shape for expo-server-sdk's classic push API. */
interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { link: string; type: string };
  sound: 'default' | null;
  channelId: string;
  badge: number;
}

export interface FanOutOptions {
  /** userId → notification row id (links receipts to the inbox row). */
  notificationIdByUser?: Record<string, string>;
}

export async function fanOutPush(
  userIds: string[],
  payload: NotificationPayload,
  opts: FanOutOptions = {},
): Promise<void> {
  if (!env.PUSH_ENABLED || userIds.length === 0) return;
  try {
    // r359 A4 — honor per-user category mutes BEFORE any Expo traffic.
    const prefs = await resolvePreferences(prisma, userIds);
    const pushable = userIds.filter((id) => {
      const p = prefs.get(id);
      return !p || pushAllowedForType(p, payload.type as NotificationType);
    });
    if (pushable.length === 0) return;

    const devices = await prisma.pushDevice.findMany({
      where: { userId: { in: pushable } },
      select: { id: true, userId: true, expoToken: true },
    });
    if (devices.length === 0) return;

    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    const messages: PushMessage[] = devices.map((d) => ({
      to: d.expoToken,
      // Urgent rows ring; the rest arrive silently as a badge — the
      // bell inbox stays the surface, the push is the tap on shoulder.
      title: payload.title,
      body: payload.body,
      data: { link: payload.link, type: payload.type },
      sound: payload.type === 'URGENT' ? 'default' : null,
      channelId: 'alerts',
      badge: 1,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const deadIds: string[] = [];
    for (const chunk of chunks) {
      // Type-narrow the chunk for the classic API (it accepts our shape).
      const tickets = await expo.sendPushNotificationsAsync(chunk as never);
      // r359 A4 — one PENDING receipt per ticket (evidence trail; the
      // receipt check settles them a few minutes later).
      const receiptRows = tickets.map((ticket, i) => {
        const token = (chunk[i] as { to?: string }).to;
        const device = devices.find((d) => d.expoToken === token);
        const notificationId = device ? opts.notificationIdByUser?.[device.userId] : undefined;
        const ticketId = ticket.status === 'ok' ? ticket.id : null;
        const errDetail =
          ticket.status === 'error'
            ? String((ticket as { message?: string }).message ?? ticket.status)
            : null;
        return {
          pushDeviceId: device?.id ?? 'unknown',
          notificationId: notificationId ?? null,
          ticketId,
          status: (ticket.status === 'error' ? 'ERROR' : 'PENDING') as 'ERROR' | 'PENDING',
          errorDetail: errDetail,
        };
      }).filter((r) => r.pushDeviceId !== 'unknown');
      if (receiptRows.length > 0) {
        await prisma.pushDeliveryReceipt.createMany({ data: receiptRows }).catch((e: unknown) => {
          logger.warn({ err: e }, 'push: receipt write failed (best-effort)');
        });
      }
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          const details = ticket.details as { error?: string } | undefined;
          if (details?.error === 'DeviceNotRegistered') {
            const token = (chunk[i] as { to?: string }).to;
            const row = devices.find((d) => d.expoToken === token);
            if (row) deadIds.push(row.id);
          } else {
            logger.warn({ ticket }, 'push: ticket error (best-effort, skipped)');
          }
        }
      });
    }
    if (deadIds.length > 0) {
      await prisma.pushDevice.deleteMany({ where: { id: { in: deadIds } } });
      logger.info({ pruned: deadIds.length }, 'push: pruned dead device tokens');
    }
  } catch (e) {
    logger.warn({ err: e, recipients: userIds.length, title: payload.title }, 'push: fan-out failed (best-effort)');
  }
}

/** How long an unread receipt may stay PENDING before we stop retrying. */
export const RECEIPT_MAX_AGE_HOURS = 24;

/**
 * r359 A4 — settle PENDING receipts against Expo's receipt API.
 * Bounded (≤500 per run), never throws; DeviceNotRegistered receipts
 * prune their device. Returns counters for the log + tests.
 */
export async function checkPendingReceipts(
  client: {
    pushDeliveryReceipt: {
      findMany(args: {
        where: { status: 'PENDING'; createdAt: { gte: Date } };
        select: { id: true; ticketId: true; pushDeviceId: true };
        take: number;
      }): Promise<Array<{ id: string; ticketId: string | null; pushDeviceId: string }>>;
      updateMany(args: {
        where: { id: { in: string[] } };
        data: { status: 'SENT' | 'DELIVERED' | 'FAILED' | 'ERROR'; checkedAt: Date; errorDetail?: string };
      }): Promise<{ count: number }>;
    };
    pushDevice: {
      deleteMany(args: { where: { id: { in: string[] } } }): Promise<{ count: number }>;
    };
  },
  now: Date = new Date(),
): Promise<{ checked: number; delivered: number; sent: number; failed: number; prunedDevices: number }> {
  const floor = new Date(now.getTime() - RECEIPT_MAX_AGE_HOURS * 3600_000);
  const pending = await client.pushDeliveryReceipt.findMany({
    where: { status: 'PENDING' as const, createdAt: { gte: floor } },
    select: { id: true, ticketId: true, pushDeviceId: true },
    take: 500,
  });
  const out = { checked: 0, delivered: 0, sent: 0, failed: 0, prunedDevices: 0 };
  if (pending.length === 0) return out;

  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();
  const ids = pending.map((r) => r.ticketId).filter((t): t is string => Boolean(t));
  const receiptMap = new Map<string, { status: string; message?: string; details?: { error?: string } }>();
  for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, r] of Object.entries(receipts)) {
        receiptMap.set(id, r as { status: string; message?: string; details?: { error?: string } });
      }
    } catch (e) {
      logger.warn({ err: e }, 'push: receipt check chunk failed (best-effort)');
    }
  }

  const deliveredIds: string[] = [];
  const sentIds: string[] = [];
  const failedIds: string[] = [];
  const deadDevices: string[] = [];
  for (const row of pending) {
    if (!row.ticketId) continue;
    const r = receiptMap.get(row.ticketId);
    if (!r) continue; // not settled yet — stays PENDING for the next run
    out.checked += 1;
    if (r.status === 'ok') {
      out.delivered += 1;
      deliveredIds.push(row.id);
    } else if (r.status === 'error') {
      const err = r.details?.error ?? r.message ?? 'unknown';
      // DeviceNotRegistered → prune the device (belt with the on-sight path).
      if (err === 'DeviceNotRegistered') deadDevices.push(row.pushDeviceId);
      out.failed += 1;
      failedIds.push(row.id);
    } else {
      // Unknown status — treat as sent (Expo accepted it; no evidence of failure).
      out.sent += 1;
      sentIds.push(row.id);
    }
  }

  if (deliveredIds.length > 0) {
    await client.pushDeliveryReceipt.updateMany({
      where: { id: { in: deliveredIds } },
      data: { status: 'DELIVERED', checkedAt: now },
    });
  }
  if (sentIds.length > 0) {
    await client.pushDeliveryReceipt.updateMany({
      where: { id: { in: sentIds } },
      data: { status: 'SENT', checkedAt: now },
    });
  }
  if (failedIds.length > 0) {
    await client.pushDeliveryReceipt.updateMany({
      where: { id: { in: failedIds } },
      data: { status: 'FAILED', checkedAt: now, errorDetail: 'receipt error' },
    });
  }
  if (deadDevices.length > 0) {
    out.prunedDevices = (await client.pushDevice.deleteMany({ where: { id: { in: deadDevices } } })).count;
  }
  return out;
}

/** Devices nobody has re-seen for this long are pruned (dead weight). */
export const DEVICE_STALE_DAYS = 180;

/**
 * r359 A4 — the stale-device sweeper: PushDevice rows whose lastSeenAt
 * is older than DEVICE_STALE_DAYS are deleted (their tokens are almost
 * certainly dead; a returning device re-registers on boot anyway).
 * Also settles receipt retention (30 days). Bounded + never throws.
 */
export async function sweepStaleDevices(
  client: {
    pushDevice: {
      deleteMany(args: { where: { lastSeenAt: { lt: Date } } }): Promise<{ count: number }>;
    };
    pushDeliveryReceipt: {
      deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
    };
  },
  now: Date = new Date(),
): Promise<{ devices: number; receipts: number }> {
  const deviceCutoff = new Date(now.getTime() - DEVICE_STALE_DAYS * 24 * 3600_000);
  const receiptCutoff = new Date(now.getTime() - 30 * 24 * 3600_000);
  const devices = (await client.pushDevice.deleteMany({ where: { lastSeenAt: { lt: deviceCutoff } } })).count;
  const receipts = (await client.pushDeliveryReceipt.deleteMany({ where: { createdAt: { lt: receiptCutoff } } })).count;
  return { devices, receipts };
}
