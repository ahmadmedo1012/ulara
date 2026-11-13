/**
 * R341 T03 → R342 t08 — the four-dimension connectivity net (colocated,
 * the haptics.test.ts pattern). Pins the honest state model:
 *
 *   · nextConnState — the PURE NetInfo-driven machine (dimensions 1+3):
 *     device-offline is hard/immediate; ULARA-probe failures need TWO
 *     consecutive readings; recovery is immediate; null/unknown is
 *     optimistic; a confirmed server failure NEVER claims the device is
 *     offline (and vice versa — a returned link with a pending probe
 *     claims internetUnknown, never a stale deviceDisconnected).
 *
 *   · mergeDbHealth — the PURE dimension-4 merge: DB-degraded only ever
 *     refines a PROVEN-reachable ULARA; isOnline survives it (queries
 *     keep running); a dead/unreachable server has NO db evidence.
 *
 *   · The wiring — the ONE NetInfo subscription feeding the store, the
 *     DEVICE-line onlineManager bridge (queries pause ONLY when the OS
 *     interface is down — never merely because ULARA is unreachable),
 *     the /ping probe config, the confirm-probe, and the db-health
 *     inlet (reportDbHealth) riding real API responses.
 *
 *   · NetworkBanner — the per-dimension Arabic copy: «لا يوجد اتصال
 *     بالشبكة» / «تعذّر الاتصال بخادم أُلارا حالياً» / «الخدمة متاحة
 *     جزئياً، وبعض البيانات غير متوفرة» / «عاد الاتصال بالخدمة» — and
 *     the regression pin: the banner NEVER says «لا يوجد اتصال
 *     بالإنترنت» (the owner's complaint — the evidence can never prove
 *     the general internet is down).
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
  mergeDbHealth,
  nextConnState,
  reportDbHealth,
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

const ONLINE: ConnState = {
  phase: "internetAvailable",
  isDeviceOnline: true,
  isOnline: true,
  isResolved: true,
  type: "wifi",
  unreachableStreak: 0,
};
const DEVICE_OFF: ConnState = {
  phase: "deviceDisconnected",
  isDeviceOnline: false,
  isOnline: false,
  isResolved: true,
  type: "wifi",
  unreachableStreak: 0,
};

/** A probe rendering the hook's resolved state as text. */
function Probe() {
  const s = useNetworkStatus();
  return <Text>{`${s.isOnline}|${s.isResolved}|${s.type}`}</Text>;
}

/** A probe rendering the phase (banner-copy driver) as text. */
function PhaseProbe() {
  const s = useNetworkStatus();
  return <Text>{s.phase}</Text>;
}

beforeEach(() => {
  mockRefresh.mockClear();
  __networkInternals.reset();
  NetInfoMock.__setState({ isConnected: true, isInternetReachable: true, type: "wifi" });
});

/* ── 1. the pure NetInfo-driven machine (dimensions 1 + 3) ─────────── */

describe("nextConnState — the debounced four-dimension machine", () => {
  it("(a) a single unreachable probe reading does NOT flip the server line", () => {
    const after = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    expect(after.isOnline).toBe(true);
    expect(after.phase).toBe("internetAvailable");
    expect(after.unreachableStreak).toBe(1);
  });

  it("(b) two consecutive unreachable readings confirm ularaServerUnavailable — and the DEVICE stays up", () => {
    const once = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const twice = nextConnState(once, reading({ isInternetReachable: false }));
    expect(twice.isOnline).toBe(false);
    expect(twice.phase).toBe("ularaServerUnavailable");
    // THE dimension split: a dead ULARA server is NOT a dead device —
    // the link is up, queries must keep running.
    expect(twice.isDeviceOnline).toBe(true);
    expect(twice.unreachableStreak).toBe(2);
  });

  it("(c) recovery is immediate — one good reading after server-unavailable is online", () => {
    const once = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const confirmed = nextConnState(once, reading({ isInternetReachable: false }));
    expect(confirmed.isOnline).toBe(false);
    const recovered = nextConnState(confirmed, reading({ isInternetReachable: true }));
    expect(recovered.isOnline).toBe(true);
    expect(recovered.phase).toBe("internetAvailable");
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

  it("(e) isConnected === false (hard device-offline) flips immediately — device AND server lines", () => {
    const after = nextConnState(ONLINE, reading({ isConnected: false, isInternetReachable: false }));
    expect(after.isOnline).toBe(false);
    expect(after.isDeviceOnline).toBe(false);
    expect(after.phase).toBe("deviceDisconnected");
    // …even while an offline confirmation was already pending.
    const pending = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const hard = nextConnState(pending, reading({ isConnected: false }));
    expect(hard.isOnline).toBe(false);
    expect(hard.phase).toBe("deviceDisconnected");
    expect(hard.unreachableStreak).toBe(0);
  });

  it("(e2) a returned link with a pending probe claims internetUnknown — never a stale deviceDisconnected", () => {
    // Device comes back, first probe fails (streak 1, not confirmed):
    // the phase must be the honest unknown, not the dead device claim.
    const back = nextConnState(DEVICE_OFF, reading({ isInternetReachable: false }));
    expect(back.isDeviceOnline).toBe(true);
    expect(back.phase).toBe("internetUnknown");
    expect(back.isOnline).toBe(false); // last confirmed line was down
    // The confirm then lands on the server dimension:
    const confirmed = nextConnState(back, reading({ isInternetReachable: false }));
    expect(confirmed.phase).toBe("ularaServerUnavailable");
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
    expect(confirmed.phase).toBe("ularaServerUnavailable");
  });

  it("a null while server-unavailable keeps the honest phase (no premature recovery)", () => {
    const offline = nextConnState(ONLINE, reading({ isConnected: false }));
    const pending = nextConnState(offline, reading({ isInternetReachable: null }));
    expect(pending.isOnline).toBe(false);
    expect(pending.phase).toBe("deviceDisconnected");
  });

  it("while server-unavailable, further failures stay put (capped, stable)", () => {
    const once = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    const confirmed = nextConnState(once, reading({ isInternetReachable: false }));
    const again = nextConnState(confirmed, reading({ isInternetReachable: false }));
    expect(again.isOnline).toBe(false);
    expect(again.phase).toBe("ularaServerUnavailable");
    expect(again).toBe(confirmed); // referential stability — no re-notify
  });

  it("is referentially stable for readings that change nothing", () => {
    expect(nextConnState(ONLINE, reading({}))).toBe(ONLINE);
    const blip = nextConnState(ONLINE, reading({ isInternetReachable: false }));
    expect(nextConnState(blip, reading({ isInternetReachable: false }))).not.toBe(blip); // streak moved
  });
});

/* ── 2. mergeDbHealth — the PURE dimension-4 merge ──────────────────── */

describe("mergeDbHealth — db-degraded only refines a PROVEN-reachable ULARA", () => {
  it("(a) db failure while reachable → databaseDegraded, isOnline SURVIVES (queries keep running)", () => {
    const degraded = mergeDbHealth(ONLINE, false);
    expect(degraded.phase).toBe("databaseDegraded");
    expect(degraded.isOnline).toBe(true); // the API host answers — sends work
    expect(degraded.isDeviceOnline).toBe(true);
  });

  it("(b) a successful response clears the degraded phase", () => {
    const degraded = mergeDbHealth(ONLINE, false);
    const healthy = mergeDbHealth(degraded, true);
    expect(healthy.phase).toBe("internetAvailable");
    expect(healthy).not.toBe(degraded);
  });

  it("(c) an UNREACHABLE server has NO db evidence — the merge is a no-op", () => {
    const unreachable = nextConnState(
      nextConnState(ONLINE, reading({ isInternetReachable: false })),
      reading({ isInternetReachable: false }),
    );
    expect(unreachable.phase).toBe("ularaServerUnavailable");
    expect(mergeDbHealth(unreachable, false)).toBe(unreachable); // referential no-op
    expect(mergeDbHealth(unreachable, true)).toBe(unreachable);
  });

  it("(d) a device-offline state has NO db evidence either", () => {
    expect(mergeDbHealth(DEVICE_OFF, false)).toBe(DEVICE_OFF);
  });

  it("(e) healthy + healthy is a referential no-op", () => {
    expect(mergeDbHealth(ONLINE, true)).toBe(ONLINE);
  });
});

/* ── 3. the own-API probe configuration ─────────────────────────────── */

describe("NetInfo.configure — the own-API liveness probe", () => {
  it("runs once at import and targets the DB-FREE /ping route (never Google's, never the DB-pinging /status)", () => {
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(probeConfigAtImport).toMatchObject({
      reachabilityUrl: `${API_BASE}/ping`,
      reachabilityMethod: "GET",
      reachabilityRequestTimeout: 5 * 1000,
      reachabilityShortTimeout: 5 * 1000,
      useNativeReachability: false,
    });
  });

  it("accepts the ping route's HTTP 200 (the library default tests for 204)", async () => {
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

/* ── 4. the wiring — ONE subscription, DEVICE-line onlineManager ────── */

describe("the store wiring", () => {
  it("keeps exactly ONE NetInfo subscription for hook + banner + bridge combined", async () => {
    await render(<Probe />);
    await render(<NetworkBanner />);
    // R334 wired one listener per consumer (the banner alone had two);
    // R341/R342 wire exactly one — module scope — for the whole app.
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it("resolves online via fetch — no false offline flash at cold start", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
  });

  it("goes device-offline immediately when the interface drops (isConnected false)", async () => {
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

  it("CONFIRMED ulara-unreachable: the server line drops but the DEVICE line — and the queries — DO NOT pause", async () => {
    // THE r342 semantics: TanStack Query pauses ONLY on the device line.
    // A dead ULARA on a live link keeps queries running (transport
    // errors ride the bounded retry/backoff instead).
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    setOnline.mockClear();
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("false|true|wifi")); // server line down…
    expect(__networkInternals.state().phase).toBe("ularaServerUnavailable");
    expect(__networkInternals.state().isDeviceOnline).toBe(true); // …device still up
    expect(setOnline).not.toHaveBeenCalledWith(false); // queries NOT paused
    setOnline.mockRestore();
  });

  it("device-offline pauses queries; the returning device resumes them (the ONE onlineManager line)", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    setOnline.mockClear();
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => getByText("false|true|wifi"));
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(false));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: true, isInternetReachable: true });
    });
    await waitFor(() => getByText("true|true|wifi"));
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(true));
    setOnline.mockRestore();
  });

  it("recovery from ulara-unreachable resumes the server line immediately (no device-line churn)", async () => {
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
    // (c) recovery: ONE good reading — immediate, no debounce.
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: true });
    });
    await waitFor(() => getByText("true|true|wifi"));
    // The device line never flipped → onlineManager was never touched
    // by the server outage or its recovery.
    expect(setOnline).not.toHaveBeenCalledWith(false);
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

/* ── 5. reportDbHealth — the dimension-4 inlet (real API responses) ── */

describe("reportDbHealth — the db line rides real responses", () => {
  it("marks databaseDegraded while reachable — banner phase changes, queries keep running", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    const { getByText } = await render(<PhaseProbe />);
    await waitFor(() => getByText("internetAvailable"));
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("databaseDegraded"));
    expect(__networkInternals.state().isOnline).toBe(true); // sends still work
    expect(setOnline).not.toHaveBeenCalledWith(false); // queries NOT paused
    setOnline.mockRestore();
  });

  it("a successful response clears it — back to internetAvailable", async () => {
    const { getByText } = await render(<PhaseProbe />);
    await waitFor(() => getByText("internetAvailable"));
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("databaseDegraded"));
    await act(async () => {
      reportDbHealth(true);
    });
    await waitFor(() => getByText("internetAvailable"));
  });

  it("a GOOD probe reading does NOT clear a real db degradation (the probe cannot see the DB)", async () => {
    const { getByText } = await render(<PhaseProbe />);
    await waitFor(() => getByText("internetAvailable"));
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("databaseDegraded"));
    await act(async () => {
      // liveness keeps answering while the DB is down — the phase must
      // stay degraded (mergeDbHealth re-applies the stored flag).
      NetInfoMock.__setState({ isInternetReachable: true });
    });
    await waitFor(() => getByText("databaseDegraded"));
  });

  it("db-degraded survives a single probe BLIP (no false «server down» while the db heals)", async () => {
    const { getByText } = await render(<PhaseProbe />);
    await waitFor(() => getByText("internetAvailable"));
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("databaseDegraded"));
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("databaseDegraded"));
  });

  it("when the server goes fully unreachable, the server phase wins (no db claims without evidence)", async () => {
    const { getByText } = await render(<PhaseProbe />);
    await waitFor(() => getByText("internetAvailable"));
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("databaseDegraded"));
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("ularaServerUnavailable"));
    // …and recovery re-presents the still-degraded db honestly:
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: true });
    });
    await waitFor(() => getByText("databaseDegraded"));
  });
});

/* ── 6. the banner — the per-dimension honest copy ─────────────────── */

describe("NetworkBanner — the four honest messages", () => {
  it("a single transient probe blip never shows any banner", async () => {
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

  it("device-offline shows «لا يوجد اتصال بالشبكة» — the NETWORK message, not the internet claim", async () => {
    const { getByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false, isInternetReachable: false });
    });
    await waitFor(() => getByText("لا يوجد اتصال بالشبكة"));
  });

  it("CONFIRMED ulara-unreachable shows «تعذّر الاتصال بخادم أُلارا حالياً» — never «لا يوجد اتصال بالإنترنت»", async () => {
    const { getByText, queryByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("تعذّر الاتصال بخادم أُلارا حالياً"));
    // THE regression pin — the owner's complaint can never return:
    expect(queryByText(/لا يوجد اتصال بالإنترنت/)).toBeNull();
  });

  it("db-degraded shows «الخدمة متاحة جزئياً، وبعض البيانات غير متوفرة»", async () => {
    const { getByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    await act(async () => {
      reportDbHealth(false);
    });
    await waitFor(() => getByText("الخدمة متاحة جزئياً، وبعض البيانات غير متوفرة"));
  });

  it("recovery flashes «عاد الاتصال بالخدمة»", async () => {
    const { getByText } = await render(<NetworkBanner />);
    await act(async () => {
      /* bootstrap */
    });
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false, isInternetReachable: false });
    });
    await waitFor(() => getByText("لا يوجد اتصال بالشبكة"));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: true, isInternetReachable: true });
    });
    await waitFor(() => getByText("عاد الاتصال بالخدمة"));
  });
});
