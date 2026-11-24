/**
 * r359 A4 — per-user notification category preferences.
 *
 * One row per user (NotificationPreference), booleans per
 * NotificationType group. The push fan-out consults these BEFORE
 * sending (a muted category must not buzz), the weekly email digest
 * reads the emailDigest flag, and GET/PUT /me/notification-preferences
 * is the user-facing surface.
 *
 * Missing row = the documented defaults (all push categories ON,
 * digest OFF) — fail-open to the pre-r359 behavior so existing users
 * notice nothing until they choose.
 */
import type { NotificationType } from '@prisma/client';
import { prisma } from '../../db.js';

export interface NotificationPreferences {
  pushUrgent: boolean;
  pushAcademic: boolean;
  pushSystem: boolean;
  pushSocial: boolean;
  emailDigest: boolean;
}

/** The documented defaults (no row = this). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushUrgent: true,
  pushAcademic: true,
  pushSystem: true,
  pushSocial: true,
  emailDigest: false,
};

/** Minimal structural Prisma slice — keeps this unit-testable. */
export interface PreferenceClient {
  notificationPreference: {
    findMany(args: {
      where: { userId: { in: string[] } };
      select: {
        userId: true;
        pushUrgent: true;
        pushAcademic: true;
        pushSystem: true;
        pushSocial: true;
        emailDigest: true;
      };
    }): Promise<Array<{ userId: string } & NotificationPreferences>>;
  };
}

/** Map a notification type to its preference flag (pure). */
export function pushAllowedForType(
  prefs: NotificationPreferences,
  type: NotificationType,
): boolean {
  switch (type) {
    case 'URGENT':
      return prefs.pushUrgent;
    case 'ACADEMIC':
      return prefs.pushAcademic;
    case 'SYSTEM':
      return prefs.pushSystem;
    case 'SOCIAL':
      return prefs.pushSocial;
    default:
      return true;
  }
}

/** Bulk-resolve effective preferences for a set of users (one query,
 * defaults for the missing rows). Pure with respect to its client. */
export async function resolvePreferences(
  client: PreferenceClient,
  userIds: string[],
): Promise<Map<string, NotificationPreferences>> {
  const map = new Map<string, NotificationPreferences>();
  if (userIds.length === 0) return map;
  const rows = await client.notificationPreference.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      pushUrgent: true,
      pushAcademic: true,
      pushSystem: true,
      pushSocial: true,
      emailDigest: true,
    },
  });
  for (const id of userIds) map.set(id, DEFAULT_NOTIFICATION_PREFERENCES);
  for (const row of rows) map.set(row.userId, {
    pushUrgent: row.pushUrgent,
    pushAcademic: row.pushAcademic,
    pushSystem: row.pushSystem,
    pushSocial: row.pushSocial,
    emailDigest: row.emailDigest,
  });
  return map;
}

/** The live-DB convenience wrapper used by routes + the digest job. */
export function resolveUserPreferences(userIds: string[]): Promise<Map<string, NotificationPreferences>> {
  return resolvePreferences(prisma, userIds);
}
