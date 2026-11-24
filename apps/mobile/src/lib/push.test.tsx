/**
 * push.test.tsx — r359 A4 (M3): the push CLIENT contract, pinned.
 *
 * The full path (permission ask → Expo token → POST /me/push-devices →
 * rotation listener → tap deep link → badge discipline → logout
 * unregister) is exercised against the deterministic expo-notifications
 * stub from src/test/setup.ts with fetch mocked at the transport.
 */
import { render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { safeDeepLink } from "@/hooks/useNotifications";

// Settable expoConfig: the project-id seam reads extra.pushProjectId.
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra: {} as Record<string, unknown> } } }));

import {
  PushRegistrar,
  clearPushBadge,
  currentPermission,
  ensurePushRuntime,
  pushProjectId,
  requestAndRegisterPush,
  unregisterPushDevices,
} from "./push";

jest.mock("@/api/client", () => ({
  get: jest.fn(async (path: string) => {
    if (path === "/me/push-devices") return [{ id: "dev-1" }, { id: "dev-2" }];
    return [];
  }),
  post: jest.fn(async (path: string, body?: Record<string, unknown>) => ({ path, body })),
  del: jest.fn(async () => ({ ok: true })),
}));
jest.mock("@/auth/session", () => ({
  useSession: (sel: (s: { user: unknown; sessionEpoch: number }) => unknown) =>
    sel({ user: { id: "u-1", role: "STUDENT" }, sessionEpoch: 1 }),
}));

const grantedPerms = { granted: true, canAskAgain: true };

describe("push client (r359 A4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ensurePushRuntime is idempotent: ONE handler (channel on android only)", () => {
    // This test runs FIRST in the file (declaration order): the
    // module-level latch is fresh here — later tests call
    // ensurePushRuntime transitively through requestAndRegisterPush.
    ensurePushRuntime();
    ensurePushRuntime();
    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    if (Platform.OS === "android") {
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
    }
  });

  it("pushProjectId: the zero placeholder reports push unavailable", () => {
    // The default test runtime carries no projectId in extra — the seam
    // reads Constants.expoConfig?.extra?.pushProjectId.
    expect(pushProjectId()).toBeNull();
  });

  it("requestAndRegisterPush: granted permission with a zero project id → permission true, NO token mint, NO registration", async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(grantedPerms);
    const state = await requestAndRegisterPush();
    expect(state).toBe("granted");
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("requestAndRegisterPush: granted + REAL project id → token minted + POST /me/push-devices", async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(grantedPerms);
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[a]".padEnd(24, "x"),
    });
    const { post } = jest.requireMock("@/api/client");
    const Constants = require("expo-constants").default as { expoConfig: { extra: Record<string, unknown> } };
    // Supply a REAL project id through the seam (the file-level mock's
    // extra is settable and shared with the module under test).
    Constants.expoConfig.extra.pushProjectId = "11111111-1111-1111-1111-111111111111";
    try {
      const state = await requestAndRegisterPush();
      expect(state).toBe("granted");
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(
          "/me/push-devices",
          expect.objectContaining({ expoToken: expect.any(String), platform: expect.any(String) }),
        ),
      );
    } finally {
      delete Constants.expoConfig.extra.pushProjectId;
    }
  });

  it("denied permission (canAskAgain=false) reports denied", async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    expect(await requestAndRegisterPush()).toBe("denied");
  });

  it("clearPushBadge zeroes the launcher badge", async () => {
    await clearPushBadge();
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it("unregisterPushDevices deletes every listed device (logout contract)", async () => {
    const { del } = jest.requireMock("@/api/client");
    await unregisterPushDevices();
    expect(del).toHaveBeenCalledWith("/me/push-devices/dev-1");
    expect(del).toHaveBeenCalledWith("/me/push-devices/dev-2");
  });

  it("PushRegistrar mounts the tap + foreground + rotation listeners", async () => {
    (Notifications.addPushTokenListener as unknown as jest.Mock) = jest.fn().mockReturnValue({ remove: jest.fn() });
    render(<PushRegistrar />);
    await waitFor(() => {
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addPushTokenListener).toHaveBeenCalled();
    });
  });

  it("currentPermission reads without prompting", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(grantedPerms);
    expect(await currentPermission()).toBe("granted");
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("the tap deep link is guarded (safeDeepLink): only in-app paths route", () => {
    // The tap handler itself is wired inside PushRegistrar's effect; the
    // GUARD it uses is pinned here (the useNotifications contract).
    expect(safeDeepLink("/student/dashboard")).toBe("/student/dashboard");
    expect(safeDeepLink("//evil.com")).toBeNull();
    expect(safeDeepLink("https://evil.com")).toBeNull();
    expect(safeDeepLink(null)).toBeNull();
  });
});

