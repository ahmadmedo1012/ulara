/**
 * R341 T03 — the connectivity-honesty net (colocated, the haptics.test.ts
 * pattern). Pins the two halves of the false-«لا يوجد اتصال» fix:
 *
 *   · nextConnState — the PURE debounce machine: a single transient
 *     unreachable probe reading must NOT flip the app offline; two
 *     consecutive readings confirm offline; recovery is immediate;
 *     null/unknown stays online-optimistic; isConnected === false is a
 *     hard offline.
 *
 *   · The wiring — the ONE NetInfo subscription feeding the store, the
 *     onlineManager bridge and the banner: no double subscriptions, the
 *     own-API probe config (NetInfo.configure at import), and the
 *     confirm-probe (NetInfo.refresh) that produces the debounce's
 *     second reading (the library only emits on state CHANGES).
 *
 * NOTE (React 19 + RNTL 14): every post-render state push runs through
 * `await act(async () => …)` — the module-scope NetInfo mock dispatches
 * synchronously into a still-open act scope otherwise.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Text } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import { API_BASE } from "@/api/client";
import {
  INITIAL_CONN_STATE,
  NetworkBanner,
  __networkInternals,
  nextConnState,
  useNetworkStatus,
  type ConnReading,
  type ConnState,
} from "./network";
import * as NetInfoModule from "@react-native-community/netinfo";

/* ── the controlled NetInfo mock (multiple listeners + configure) ────── */

type MockState = { isConnected: boolean | null; isInternetReachable: boolean | null; type: string };
type MockListener = (s: MockState) => void;

jest.mock("@react-native-community/netinfo", () => {
  const listeners = new Set<MockListener>();
  let current: MockState = { isConnected: true, isInternetReachable: true, type: "wifi" };
  return {
    __esModule: true,
    addEventListener: jest.fn((cb: MockListener) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    }),
    fetch: jest.fn(() => Promise.resolve(current)),
    // refresh() re-runs the reachability probe → emits a FRESH reading of
    // the current state to every listener (the machine's second sample).
    refresh: jest.fn(() => {
      listeners.forEach((l) => l(current));
      return Promise.resolve(current);
    }),
    configure: jest.fn(),
    __setState: (patch: Partial<MockState>) => {
      current = { ...current, ...patch };
      listeners.forEach((l) => l(current));
    },
  };
});

const NetInfoMock = NetInfoModule as unknown as {
  __setState: (patch: Partial<MockState>) => void;
};
const mockConfigure = NetInfoModule.configure as unknown as jest.Mock;
const mockRefresh = NetInfoModule.refresh as unknown as jest.Mock;
const mockAddEventListener = NetInfoModule.addEventListener as unknown as jest.Mock;

// configure() runs ONCE at ./network import — capture the exact config
// before any per-test mockClear can erase the call record.
const probeConfigAtImport = mockConfigure.mock.calls[0]?.[0] as
  | Record<string, unknown>
  | undefined;

/* ── reading/state builders ──────────────────────────────────────────── */

const reading = (patch: Partial<ConnReading>): ConnReading => ({
  isConnected: true,
  isInternetReachable: true,
  type: "wifi",
  ...patch,
});

const ONLINE: ConnState = { isOnline: true, isResolved: true, type: "wifi", unreachableStreak: 0 };
const OFFLINE: ConnState = { isOnline: false, isResolved: true, type: "wifi", unreachableStreak: 0 };

/** A probe rendering the hook's resolved state as text. */
function Probe() {
  const s = useNetworkStatus();
  return <Text>{`${s.isOnline}|${s.isResolved}|${s.type}`}</Text>;
}

beforeEach(() => {
  mockRefresh.mockClear();
  __networkInternals.reset();
  NetInfoMock.__setState({ isConnected: true, isInternetReachable: true, type: "wifi" });
});

/* ── 1. the pure state machine ───────────────────────────────────────── */

describe("nextConnState — the debounce machine", () => {
  it("(a) a single unreachable probe reading does NOT flip offline", () => {
    const after = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    expect(after.isOnline).toBe(true);
    expect(after.unreachableStreak).toBe(1);
  });

  it("(b) two consecutive unreachable readings DO flip offline", () => {
    const once = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const twice = nextConnState(once, reading({ isInternetReachable: false }));
    expect(twice.isOnline).toBe(false);
    expect(twice.unreachableStreak).toBe(2);
  });

  it("(c) recovery is immediate — one good reading after offline is online", () => {
    const offline = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const confirmed = nextConnState(offline, reading({ isInternetReachable: false }));
    expect(confirmed.isOnline).toBe(false);
    const recovered = nextConnState(confirmed, reading({ isInternetReachable: true }));
    expect(recovered.isOnline).toBe(true);
    expect(recovered.unreachableStreak).toBe(0);
  });

  it("(d) null/unknown stays online-optimistic", () => {
    // Cold start's first reading (probe still pending): online.
    const cold = nextConnState(INITIAL_CONN_STATE, reading({ isConnected: null, isInternetReachable: null, type: "unknown" }));
    expect(cold.isOnline).toBe(true);
    expect(cold.isResolved).toBe(true);
    // And a null never flips an online app offline.
    const still = nextConnState(ONLINE, reading({ isInternetReachable: null }));
    expect(still.isOnline).toBe(true);
  });

  it("(e) isConnected === false (hard offline) flips immediately", () => {
    const after = nextConnState(ONLINE, reading({ isConnected: false, isInternetReachable: false }));
    expect(after.isOnline).toBe(false);
    // …even while an offline confirmation was already pending.
    const pending = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const hard = nextConnState(pending, reading({ isConnected: false }));
    expect(hard.isOnline).toBe(false);
    expect(hard.unreachableStreak).toBe(0);
  });

  it("a good reading resets a pending streak (alternating blips never confirm offline)", () => {
    const blip = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const back = nextConnState(blip, reading({ isInternetReachable: true }));
    expect(back.isOnline).toBe(true);
    expect(back.unreachableStreak).toBe(0);
    const blipAgain = nextConnState(back, reading({ isInternetReachable: false }));
    expect(blipAgain.isOnline).toBe(true);
    expect(blipAgain.unreachableStreak).toBe(1);
  });

  it("a null (probe re-arm) preserves the pending streak — the confirm cycle must survive it", () => {
    // NetInfo re-arms the probe with isInternetReachable: null before every
    // fresh verdict; that re-arm must not erase the offline confirmation.
    const blip = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const rearm = nextConnState(blip, reading({ isInternetReachable: null }));
    expect(rearm.isOnline).toBe(true);
    expect(rearm.unreachableStreak).toBe(1);
    const confirmed = nextConnState(rearm, reading({ isInternetReachable: false }));
    expect(confirmed.isOnline).toBe(false);
  });

  it("a null while offline keeps offline honest (no premature «عاد الاتصال»)", () => {
    const offline = nextConnState(ONLINE, reading({ isConnected: false }));
    const pending = nextConnState(offline, reading({ isInternetReachable: null }));
    expect(pending.isOnline).toBe(false);
  });

  it("while offline, further unreachable readings stay offline (capped, stable)", () => {
    const offline = { ...OFFLINE, unreachableStreak: 2 };
    const again = nextConnState(offline, reading({ isInternetReachable: false }));
    expect(again.isOnline).toBe(false);
    expect(again).toBe(offline); // referential stability — no re-notify
  });

  it("is referentially stable for readings that change nothing", () => {
    expect(nextConnState(ONLINE, reading({}))).toBe(ONLINE);
    const blip = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    expect(nextConnState(blip, reading({ isInternetReachable: false }))).not.toBe(blip); // streak moved
  });
});

/* ── 2. the own-API probe configuration ──────────────────────────────── */

describe("NetInfo.configure — the own-API reachability probe", () => {
  it("runs once at import and targets the app's own /status route (never Google's)", () => {
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(probeConfigAtImport).toMatchObject({
      reachabilityUrl: `${API_BASE}/status`,
      reachabilityMethod: "GET",
      reachabilityRequestTimeout: 5 * 1000,
      reachabilityShortTimeout: 5 * 1000,
      useNativeReachability: false,
    });
  });

  it("accepts the status route's HTTP 200 (the library default tests for 204)", async () => {
    const probeTest = probeConfigAtImport?.reachabilityTest as
      | ((r: { status: number }) => Promise<boolean>)
      | undefined;
    if (typeof probeTest !== "function") throw new Error("reachabilityTest missing from probe config");
    await expect(probeTest({ status: 200 })).resolves.toBe(true);
    await expect(probeTest({ status: 204 })).resolves.toBe(true);
    await expect(probeTest({ status: 503 })).resolves.toBe(false);
    await expect(probeTest({ status: 0 })).resolves.toBe(false);
  });
});

/* ── 3. the wiring — ONE subscription, debounced everywhere ──────────── */

describe("the store wiring", () => {
  it("keeps exactly ONE NetInfo subscription for hook + banner + bridge combined", async () => {
    await render(<Probe />);
    await render(<NetworkBanner />);
    // R334 wired one listener per consumer (the banner alone had two);
    // R341 wires exactly one — module scope — for the whole app.
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it("resolves online via fetch — no false offline flash at cold start", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
  });

  it("goes offline immediately when connectivity drops (isConnected false)", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => getByText("false|true|wifi"));
  });

  it("single unreachable probe reading: still online, queries NOT paused", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    expect(getByText("true|true|wifi")).toBeTruthy();
    expect(setOnline).not.toHaveBeenCalledWith(false);
    setOnline.mockRestore();
  });

  it("two consecutive unreachable readings: offline, queries paused, recovery immediate", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("false|true|wifi"));
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(false));
    // (c) recovery: ONE good reading — immediate, no debounce.
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: true });
    });
    await waitFor(() => getByText("true|true|wifi"));
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(true));
    setOnline.mockRestore();
  });

  it("schedules the confirming probe — the second reading comes from a separate event", async () => {
    jest.useFakeTimers();
    try {
      const { getByText } = await render(<Probe />);
      await act(async () => {
        /* let the bootstrap fetch + subscribe pushes land */
      });
      expect(getByText("true|true|wifi")).toBeTruthy();
      await act(async () => {
        NetInfoMock.__setState({ isInternetReachable: false });
      });
      expect(getByText("true|true|wifi")).toBeTruthy(); // (a) still online
      expect(mockRefresh).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(__networkInternals.confirmProbeDelayMs);
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(getByText("false|true|wifi")).toBeTruthy(); // (b) confirmed
    } finally {
      jest.useRealTimers();
    }
  });

  it("a good reading disarms the pending confirm probe", async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      await act(async () => {
        /* bootstrap */
      });
      await act(async () => {
        NetInfoMock.__setState({ isInternetReachable: false });
        NetInfoMock.__setState({ isInternetReachable: true }); // blip over
        jest.advanceTimersByTime(__networkInternals.confirmProbeDelayMs);
      });
      expect(mockRefresh).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

/* ── 4. the banner rides the same debounced line ─────────────────────── */

describe("NetworkBanner — debounced", () => {
  it("a single transient probe blip never shows the offline banner", async () => {
    const { toJSON, queryByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    expect(toJSON()).toBeNull(); // the owner's false-offline complaint — gone
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: true });
    });
    expect(queryByText(/عاد الاتصال/)).toBeNull(); // no false recovery flash either
  });

  it("two consecutive probe failures show the banner and pause queries", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    setOnline.mockClear();
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    expect(setOnline).not.toHaveBeenCalledWith(false);
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا"));
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(false));
    setOnline.mockRestore();
  });
});
