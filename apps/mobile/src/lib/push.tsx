/**
 * push.tsx — R327 C3 → r359 A4 — the mobile push client.
 *
 * The contract (the M2.6 registration's client half):
 *  · permission is requested ONLY from a value-shown moment (onboarding
 *    priming, the alerts screen's «تفعيل الإشعارات» affordance / settings
 *    row) — never cold at first open;
 *  · once granted, the Expo token registers on POST /me/push-devices
 *    (re-registration is idempotent — the upsert re-owns the row);
 *  · token ROTATION re-registers (addPushTokenListener — a refreshed
 *    FCM/APNs token must never orphan the old row);
 *  · Android channels: «alerts» (high importance) — configured at boot;
 *  · a notification tap deep-links into the app (payload.data.link — the
 *    same in-app-path guard the inbox rows use);
 *  · foreground arrivals increment the badge; reading the inbox clears it;
 *    logout unregisters (a handed-over phone must not keep pushing).
 *
 * r359 A4 honesty rule: push needs an Expo push project id
 * (extra.pushProjectId). While it is the zero placeholder (no Expo
 * project registered yet — see app.config.ts) the client reports
 * «unavailable» instead of pretending: every surface degrades to the
 * REST inbox, which stays the surface of record.
 *
 * Everything is best-effort: a push failure NEVER touches the app's
 * core flows.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { get, post, del } from "@/api/client";
import { useSession } from "@/auth/session";
import { safeDeepLink } from "@/hooks/useNotifications";

/** The Android channels (id, importance, name) — ds: one honest bell. */
export const CHANNEL_ALERTS = "alerts";

let channelsReady = false;

/** The Expo push project seam (app.config.ts extra.pushProjectId).
 * Zero placeholder → push is honestly unavailable on this build. */
export function pushProjectId(): string | null {
  const id = Constants.expoConfig?.extra?.pushProjectId;
  if (typeof id !== "string" || !id || id === "00000000-0000-0000-0000-000000000000") {
    return null;
  }
  return id;
}

/** Configure Android channels + the foreground presentation. Idempotent. */
export function ensurePushRuntime(): void {
  if (channelsReady) return;
  channelsReady = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false, // urgent rows ring server-side only
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, {
      name: "الإشعارات",
      importance: AndroidImportance.HIGH,
      sound: "default",
      bypassDnd: false,
    }).catch(() => undefined);
  }
}

export type PushPermissionState = "granted" | "denied" | "undetermined" | "unavailable";

/** The CURRENT permission without prompting (for UI affordances). */
export async function currentPermission(): Promise<PushPermissionState> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return "granted";
    if (settings.canAskAgain === false) return "denied";
    return "undetermined";
  } catch {
    return "unavailable";
  }
}

/** Mint the Expo push token — null when push is unavailable on this build
 * (no project id) or on tokenless environments (emulators without play
 * services). Never throws. */
async function mintPushToken(): Promise<string | null> {
  const projectId = pushProjectId();
  if (!projectId) return null;
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token || token.length < 20) return null;
    return token;
  } catch {
    return null;
  }
}

async function registerToken(token: string): Promise<void> {
  await post("/me/push-devices", {
    expoToken: token,
    platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
    appVersion: Constants.expoConfig?.version ?? undefined,
  });
}

/**
 * The value-shown request flow (call from a user gesture ONLY):
 * ask → on grant, take the Expo token → register on /me/push-devices.
 * Returns the resulting permission state.
 */
export async function requestAndRegisterPush(): Promise<PushPermissionState> {
  ensurePushRuntime();
  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (!settings.granted) return settings.canAskAgain === false ? "denied" : "undetermined";

    const token = await mintPushToken();
    if (!token) return "granted"; // permission granted; push payload unavailable this build

    await registerToken(token);
    return "granted";
  } catch {
    // Never throw into a button press — the inbox still works.
    return currentPermission().catch(() => "unavailable" as PushPermissionState);
  }
}

/** Silent re-registration for an ALREADY-granted session (boot + login). */
async function registerIfGranted(): Promise<void> {
  try {
    if (!pushProjectId()) return; // nothing to mint without a project
    if ((await currentPermission()) !== "granted") return;
    const token = await mintPushToken();
    if (!token) return;
    await registerToken(token);
  } catch {
    /* best-effort */
  }
}

/** Best-effort unregister — call during logout (a handed-over phone). */
export async function unregisterPushDevices(): Promise<void> {
  try {
    const res = await get<{ id: string }[]>("/me/push-devices");
    const devices = Array.isArray(res) ? res : ((res as { data?: { id: string }[] })?.data ?? []);
    await Promise.allSettled(devices.map((d) => del(`/me/push-devices/${d.id}`)));
  } catch {
    /* best-effort */
  }
}

/* ── badge discipline (r359 A4) ─────────────────────────────────────── */

/** Foreground arrival → badge counts the unseen, not «1» forever. */
async function bumpBadge(): Promise<void> {
  try {
    const current = await Notifications.getBadgeCountAsync();
    await Notifications.setBadgeCountAsync(current + 1);
  } catch {
    /* best-effort */
  }
}

/** Clear the launcher badge — call when the inbox is fully read. */
export async function clearPushBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* best-effort */
  }
}

/**
 * PushRegistrar — mounts ONCE in the root layout:
 *  · boot: channels + foreground handler + tap → deep link + rotation
 *  · session: silent re-registration when permission already granted
 */
export function PushRegistrar(): null {
  const user = useSession((s) => s.user);
  const sessionEpoch = useSession((s) => s.sessionEpoch);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ensurePushRuntime();

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = safeDeepLink(response.notification.request.content.data?.link as string | null);
      if (link) {
        router.push(link as never);
      }
    });
    const foreSub = Notifications.addNotificationReceivedListener(() => {
      void bumpBadge();
    });
    // Token rotation (SDK 53+): a refreshed device token re-registers so
    // the old row never orphans into dead-token land.
    const rotateSub =
      typeof Notifications.addPushTokenListener === "function"
        ? Notifications.addPushTokenListener((token) => {
            if (typeof token?.data === "string" && token.data.length >= 20) {
              void registerToken(token.data).catch(() => undefined);
            }
          })
        : null;
    return () => {
      tapSub.remove();
      foreSub.remove();
      rotateSub?.remove();
    };
  }, []);

  const userId = user?.id;
  useEffect(() => {
    // registerIfGranted is module-level — the id IS the dependency that
    // matters (object identity would re-fire on every profile refetch).
    if (userId) void registerIfGranted();
  }, [userId, sessionEpoch]);

  return null;
}
