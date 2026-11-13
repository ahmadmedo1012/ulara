/**
 * resilience/network — R334 B8: the connectivity layer. R341 T03: the
 * connectivity-HONESTY layer. R342 t08: the FOUR-DIMENSION honesty
 * split (the owner's «لا يوجد اتصال بالإنترنت» complaint, finished).
 *
 * R341 made the probe honest (our API, not Google's 204) and the
 * transition debounced (2 consecutive readings). But its single
 * `isOnline` boolean still CONFLATED four different questions, and the
 * banner claimed «لا يوجد اتصال بالإنترنت» whenever OUR probe failed —
 * which is not what the evidence proves:
 *
 *   1. DEVICE network interface — NetInfo `isConnected` (the hard OS
 *      signal: wifi/radio off). «لا يوجد اتصال بالشبكة».
 *   2. GENERAL internet — NOT measured (the third-party probe class is
 *      retired: in the Libyan context Google's 204 is itself often the
 *      blocked endpoint, so it can never prove «الإنترنت مقطوع»). A
 *      state here may only claim what a reading PROVES.
 *   3. ULARA API reachability — the own probe against `GET /ping`, the
 *      DB-FREE liveness route (r342 t08 — the R341 probe hit /status
 *      and cost a `SELECT 1` on every reachability check; a sleepy
 *      Neon read as «server down»). Debounced: 2 consecutive failures.
 *      «تعذّر الاتصال بخادم أُلارا حالياً».
 *   4. ULARA DATABASE health — orthogonal, from REAL API responses
 *      (503 / DB_UNAVAILABLE via `reportDbHealth()`, wired by the query
 *      cache's error/success hooks — never from the liveness probe).
 *      «الخدمة متاحة جزئياً، وبعض البيانات غير متوفرة».
 *
 * Halves:
 *
 *   · `nextConnState(prev, reading)` — the PURE NetInfo-driven machine
 *     (dimensions 1+3), unit-pinned below. `mergeDbHealth(state, ok)` —
 *     the PURE dimension-4 merge (db-degraded only ever shows while the
 *     API is PROVEN reachable; an unreachable server means we have NO
 *     db evidence — the unreachability wins).
 *
 *   · The ONE NetInfo subscription (module scope) + the store + the
 *     db-health line. `useNetworkStatus()`, the onlineManager bridge,
 *     `NetworkBanner` and the query-cache health wiring all read the
 *     same line — no double subscriptions.
 *
 *   · `useOnlineManagerBridge()` — R342: TanStack Query pauses ONLY on
 *     the DEVICE line now (dimension 1). A device with a live link and
 *     a dead ULARA server keeps its queries RUNNING — they fail with
 *     NETWORK errors and ride the client's bounded retry/backoff
 *     (queryClient.ts: 3 retries, exponential + jitter) instead of
 *     being silently frozen by a false global «offline».
 *
 *   · `NetworkBanner` — the honest per-dimension messaging: «لا يوجد
 *     اتصال بالشبكة» (device), «تعذّر الاتصال بخادم أُلارا حالياً»
 *     (server), «الخدمة متاحة جزئياً، وبعض البيانات غير متوفرة»
 *     (db), and the «عاد الاتصال بالخدمة» recovery flash. Enter/exit
 *     is opacity + translateY only; safe-area aware; reduced-motion
 *     static.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import {
  addEventListener as addNetInfoListener,
  configure as configureNetInfo,
  fetch as fetchNetInfoState,
  refresh as refreshNetInfo,
  type NetInfoConfiguration,
  type NetInfoState,
} from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WifiOff from "lucide-react-native/icons/wifi-off";
import CloudOff from "lucide-react-native/icons/cloud-off";
import Database from "lucide-react-native/icons/database";
import Wifi from "lucide-react-native/icons/wifi";
import { API_BASE } from "@/api/client";
import { useStatusTones } from "@/design/theme";
import { dsEase, sp } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "@/components/ui/text";

/* ── the own-API reachability probe (R341 T03 → R342 t08) ────────────── */

/**
 * Exact option names per the INSTALLED @react-native-community/netinfo
 * 12.0.1 types (`NetInfoConfiguration`): reachabilityUrl ·
 * reachabilityMethod · reachabilityTest · reachabilityRequestTimeout ·
 * reachabilityShortTimeout · useNativeReachability. (There is no
 * `reachabilityTimeout` in this version — the ~5s per-probe budget is
 * `reachabilityRequestTimeout`, default 15s.)
 *
 *   · `reachabilityUrl` — OUR liveness route. R342 t08: `/ping`, the
 *     DB-free half of the status surface (backend status.routes.ts) —
 *     the R341 probe hit `/status` and performed a `SELECT 1` on every
 *     reachability check, which also meant a degraded DB could flip
 *     the probe. `/ping` answers from the process itself; 2xx proves
 *     exactly one thing: the ULARA API host is reachable.
 *   · `reachabilityMethod: "GET"` — same path shape the keep-warm cron
 *     and the «حالة المنصة» card already exercise.
 *   · `useNativeReachability: false` — do NOT trust the OS's own
 *     captive-portal verdict (Android NET_CAPABILITY_VALIDATED — a
 *     Google endpoint, precisely the blocked-probe class this fix
 *     retires). The library probe against OUR API is the one signal.
 */
const PROBE_CONFIG: Partial<NetInfoConfiguration> = {
  reachabilityUrl: `${API_BASE}/ping`,
  reachabilityMethod: "GET",
  reachabilityTest: async (response) => response.status >= 200 && response.status < 300,
  reachabilityRequestTimeout: 5 * 1000,
  reachabilityShortTimeout: 5 * 1000,
  useNativeReachability: false,
};

// configure() re-creates the library singleton ("calling this will stop
// all previously added listeners from being called again") — so it runs
// ONCE, at module import, BEFORE this module's own subscription can
// exist (this is the app's only NetInfo import). The global jest stub
// (src/test/setup.ts) predates this rewrite and exports no configure —
// the typeof guard keeps every render-net suite importing this module
// from crashing; on device the export always exists.
if (typeof configureNetInfo === "function") {
  configureNetInfo(PROBE_CONFIG);
}

/* ── the four-dimension state machine (R342 t08) ────────────────────── */

/** Consecutive unreachable-probe readings required to confirm the server line. */
const OFFLINE_AFTER_READINGS = 2;

/**
 * The honest phase — each name claims ONLY what its evidence proves:
 *
 *   · `internetUnknown` — no resolved reading yet (cold start).
 *   · `internetAvailable` — device link up + ULARA probe 2xx. (The
 *     practical «everything flows» state; the general-internet
 *     question is unprobed by design — see the module header.)
 *   · `deviceDisconnected` — the OS network interface is down (hard).
 *   · `ularaServerUnavailable` — device link up, probe failing twice
 *     (debounced). Claims NOTHING about the user's internet.
 *   · `databaseDegraded` — ULARA reachable, but real API responses
 *     carry DB_UNAVAILABLE (the query-cache error line). Queries keep
 *     running; only the honest messaging changes.
 */
export type ConnPhase =
  | "internetUnknown"
  | "internetAvailable"
  | "deviceDisconnected"
  | "ularaServerUnavailable"
  | "databaseDegraded";

export interface NetworkStatus {
  /** The honest classification — drives the banner text. */
  phase: ConnPhase;
  /**
   * The DEVICE line (dimension 1): true while the OS interface is up.
   * TanStack Query pauses ONLY on this line (R342 — a dead ULARA with
   * a live link keeps queries running).
   */
  isDeviceOnline: boolean;
  /**
   * The practical line: device up + ULARA probe OK (debounced). This
   * is what the offline answer-queue gates on — answers can only be
   * SENT when the server is actually reachable.
   */
  isOnline: boolean;
  /** True from first render until NetInfo answers the first time. */
  isResolved: boolean;
  /** NetInfo's interface name ("wifi" | "cellular" | …) once resolved. */
  type: string | null;
}

/** The honest subset of a NetInfoState the machine consumes. */
export interface ConnReading {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  /** NetInfo's interface name ("wifi" | "cellular" | …) — passthrough. */
  type: string;
}

/** The machine's state — NetworkStatus plus the debounce counter. */
export interface ConnState extends NetworkStatus {
  /**
   * Consecutive probe-unreachable readings while still online (the
   * transient-blip guard). Reset by any hard or good reading.
   */
  unreachableStreak: number;
}

/** Online-optimistic, unresolved start — no false «أنت غير متصل» flash. */
export const INITIAL_CONN_STATE: ConnState = {
  phase: "internetUnknown",
  isDeviceOnline: true,
  isOnline: true,
  isResolved: false,
  type: null,
  unreachableStreak: 0,
};

function connEquals(a: ConnState, b: ConnState): boolean {
  return (
    a.phase === b.phase &&
    a.isDeviceOnline === b.isDeviceOnline &&
    a.isOnline === b.isOnline &&
    a.isResolved === b.isResolved &&
    a.type === b.type &&
    a.unreachableStreak === b.unreachableStreak
  );
}

/**
 * The PURE NetInfo-driven transition — dimensions 1 + 3 (the ONE
 * place the device/server lines are decided; pinned in
 * ./network.test.tsx; the NetInfo subscription feeds it, the hook /
 * bridge / banner all consume its output). Rules:
 *
 *   · `isConnected === false` → deviceDisconnected immediately —
 *     wifi/radio off is a hard OS signal, not a probe result (no
 *     debounce). isOnline false; the streak is meaningless here.
 *   · `isInternetReachable === true` → the probe reached OUR API:
 *     isOnline true immediately (recovery is never debounced). Phase
 *     internetAvailable — the db dimension is NOT this machine's
 *     business (mergeDbHealth owns it).
 *   · `isInternetReachable === false` (link up) → the probe failed —
 *     ularaServerUnavailable only on the SECOND consecutive failure;
 *     one transient blip must never claim the server is down. While
 *     already server-unavailable, further failures are no-ops
 *     (referential stability).
 *   · `isInternetReachable == null` → no verdict yet — keep the
 *     current online-ness (online-optimistic while online). The streak
 *     SURVIVES a null: NetInfo re-arms the probe with a null before
 *     every fresh verdict, and that re-arm must not erase an in-flight
 *     server-unavailable confirmation.
 *
 * Referentially stable: a reading that changes nothing returns `prev`.
 */
export function nextConnState(prev: ConnState, r: ConnReading): ConnState {
  let candidate: ConnState;
  if (r.isConnected === false) {
    // Hard device-offline. (If the installed NetInfo semantics ever
    // make the consecutive rule awkward here, it stays: this is the
    // wifi-off / radio-off case, not a probe result.)
    candidate = {
      phase: "deviceDisconnected",
      isDeviceOnline: false,
      isOnline: false,
      isResolved: true,
      type: r.type,
      unreachableStreak: 0,
    };
  } else if (r.isInternetReachable === false) {
    // Link up, probe failed. Cap the streak at the threshold so
    // repeated failures are no-ops (referential stability).
    const unreachableStreak = Math.min(prev.unreachableStreak + 1, OFFLINE_AFTER_READINGS);
    const confirmed = unreachableStreak >= OFFLINE_AFTER_READINGS;
    // Phase honesty: a failure while the PREVIOUS state was
    // device-offline means the link just returned — the server verdict
    // is still pending, so claim NOTHING (internetUnknown), never a
    // stale device-offline.
    const phase: ConnPhase = confirmed
      ? "ularaServerUnavailable"
      : prev.phase === "deviceDisconnected"
        ? "internetUnknown"
        : prev.phase;
    candidate = {
      phase,
      // The device line stays up — NetInfo's link state said so; the
      // failure belongs to OUR server (or the path to it), not the
      // radio.
      isDeviceOnline: true,
      isOnline: prev.isOnline && !confirmed,
      isResolved: true,
      type: r.type,
      unreachableStreak,
    };
  } else if (r.isInternetReachable === true) {
    // Probe confirmed — online, immediately, streak reset.
    candidate = {
      phase: "internetAvailable",
      isDeviceOnline: true,
      isOnline: true,
      isResolved: true,
      type: r.type,
      unreachableStreak: 0,
    };
  } else {
    // No verdict yet (isInternetReachable == null): online-optimism
    // when online, honesty when already down; streak preserved.
    candidate = { ...prev, isResolved: true, type: r.type };
  }
  return connEquals(prev, candidate) ? prev : candidate;
}

/**
 * The PURE dimension-4 merge — database health only ever refines a
 * PROVEN-reachable ULARA:
 *
 *   · `dbOk === true` on a degraded state → back to internetAvailable
 *     (a successful response IS the health signal).
 *   · `dbOk === false` on internetAvailable → databaseDegraded —
 *     isOnline STAYS true (the API host is reachable; queries keep
 *     running — only the honest messaging changes).
 *   · any other phase → `prev` untouched: a device-offline or
 *     server-unavailable app has NO database evidence, and the
 *     db-degraded message would be a lie («متاحة جزئياً» while the
 *     server is in fact unreachable).
 *
 * Referentially stable.
 */
export function mergeDbHealth(prev: ConnState, dbOk: boolean): ConnState {
  if (dbOk) {
    return prev.phase === "databaseDegraded" ? { ...prev, phase: "internetAvailable" } : prev;
  }
  return prev.phase === "internetAvailable" ? { ...prev, phase: "databaseDegraded" } : prev;
}

/* ── the ONE NetInfo subscription + db-health line (module scope) ──── */

/**
 * How long after a FIRST transient unreachable reading the confirming
 * second probe runs (`NetInfo.refresh()` — the library's re-run-the-
 * reachability-check API). The library only emits on state CHANGES: a
 * steady-dead internet yields exactly ONE unreachable event, so the
 * debounce's second reading must be explicitly asked for.
 */
const CONFIRM_PROBE_DELAY_MS = 2_000;

let connState: ConnState = INITIAL_CONN_STATE;
/** Dimension 4's storage — the db-degraded flag (reportDbHealth owns it). */
let dbDegraded = false;
const connListeners = new Set<(s: ConnState) => void>();
let netInfoWired = false;
let confirmProbeTimer: ReturnType<typeof setTimeout> | null = null;

function clearConfirmProbe(): void {
  if (confirmProbeTimer !== null) {
    clearTimeout(confirmProbeTimer);
    confirmProbeTimer = null;
  }
}

function scheduleConfirmProbe(): void {
  if (confirmProbeTimer !== null) return; // one in flight is enough
  confirmProbeTimer = setTimeout(() => {
    confirmProbeTimer = null;
    // refresh() forces a fresh reachability probe → a fresh NetInfo
    // event → the machine's second reading. (Only unavailable under the
    // jest stub — hence the guard.)
    if (typeof refreshNetInfo === "function") {
      refreshNetInfo().catch(() => undefined);
    }
  }, CONFIRM_PROBE_DELAY_MS);
}

function publish(next: ConnState): void {
  const prev = connState;
  connState = next;
  // The DEVICE line is the ONE onlineManager input (R342 t08): a
  // dead ULARA server with a live link keeps queries RUNNING — the
  // transport errors ride the retry/backoff instead of a false
  // global pause. Device offline still pauses everything (there is
  // no route to anywhere to retry).
  if (next.isDeviceOnline !== prev.isDeviceOnline) {
    onlineManager.setOnline(next.isDeviceOnline);
  }
  if (next !== prev) {
    connListeners.forEach((listener) => listener(next));
  }
}

/** Every NetInfo reading flows through here — the store's ONE inlet. */
function pushReading(s: NetInfoState): void {
  const next = mergeDbHealth(
    nextConnState(connState, {
      isConnected: s.isConnected,
      isInternetReachable: s.isInternetReachable,
      type: s.type,
    }),
    !dbDegraded,
  );
  publish(next);
  // The transient-blip confirm: armed on the first unreachable reading
  // while still online; disarmed by any definitive verdict.
  if (next.isOnline && next.unreachableStreak >= 1) {
    scheduleConfirmProbe();
  } else {
    clearConfirmProbe();
  }
}

/**
 * Dimension 4's ONE inlet — real API responses only (wired by
 * queryClient.ts: the query cache's DB_UNAVAILABLE errors and
 * successful reads). NEVER a probe: /ping cannot see the database.
 * Idempotent; referentially stable via publish().
 */
export function reportDbHealth(dbOk: boolean): void {
  publish(mergeDbHealth(connState, dbOk));
  dbDegraded = !dbOk;
}

function ensureNetInfoWired(): void {
  if (netInfoWired) return;
  netInfoWired = true;
  // App-lifetime by design: connectivity is global state — the single
  // listener (and the onlineManager sync) must outlive any one
  // consumer's mount cycle. NetInfo v6+: addEventListener returns the
  // unsubscribe and fires the listener with the current state soon
  // after subscribing; never unsubscribing means exactly one listener
  // for the whole app, however many consumers come and go.
  addNetInfoListener(pushReading);
  fetchNetInfoState()
    .then(pushReading)
    .catch(() => undefined);
}

/**
 * Subscribe to the ONE honest connectivity line. Mirrors NetInfo's
 * own subscription contract — the current state arrives soon after
 * subscribing, asynchronously (so no consumer ever sets React state
 * synchronously inside an effect body).
 */
function subscribeConn(listener: (s: ConnState) => void): () => void {
  connListeners.add(listener);
  ensureNetInfoWired();
  Promise.resolve().then(() => {
    if (connListeners.has(listener)) listener(connState);
  });
  return () => {
    connListeners.delete(listener);
  };
}

/* ── useNetworkStatus ───────────────────────────────────────────────── */

/**
 * The connectivity hook. Optimistic-online until the first resolve
 * (no false «أنت غير متصل» flash at cold start), honest — and
 * debounce-protected — after. Late mounters start from the current
 * store state, not from a second optimistic reset.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<ConnState>(connState);
  useEffect(() => subscribeConn(setStatus), []);
  return status;
}

/* ── onlineManager bridge (NetInfo → TanStack Query) ────────────────── */

/**
 * Wires the DEVICE line into TanStack Query's onlineManager for as
 * long as the caller is mounted: queries PAUSE only when the device's
 * network interface is down, and auto-resume when it returns. A dead
 * ULARA server on a live link does NOT pause queries (R342 t08 — the
 * transport errors surface honestly and ride the bounded retry).
 * <NetworkBanner/> mounts this; the lead may also mount it standalone
 * at the root. Idempotent across remounts — every consumer shares the
 * ONE module-scope subscription.
 */
export function useOnlineManagerBridge(): void {
  useEffect(() => {
    // onlineManager is not React state — a synchronous set on mount is
    // safe and keeps remounts honest even if the line flipped while no
    // bridge was mounted. The store itself syncs on every flip.
    onlineManager.setOnline(connState.isDeviceOnline);
    return subscribeConn((s) => onlineManager.setOnline(s.isDeviceOnline));
  }, []);
}

/* ── NetworkBanner ───────────────────────────────────────────────────── */

const EASE = Easing.bezier(dsEase[0], dsEase[1], dsEase[2], dsEase[3]);
const ENTER_MS = 220;
const EXIT_MS = 180;
/** How long «عاد الاتصال بالخدمة» stays up before exiting. */
const BACK_FLASH_MS = 2400;

type BannerPhase = "hidden" | "device-off" | "server-off" | "db-degraded" | "back";

/** The per-dimension honest copy (r342 t08 — the owner's strings). */
const BANNER_TEXT: Record<Exclude<BannerPhase, "hidden">, string> = {
  "device-off": "لا يوجد اتصال بالشبكة",
  "server-off": "تعذّر الاتصال بخادم أُلارا حالياً",
  "db-degraded": "الخدمة متاحة جزئياً، وبعض البيانات غير متوفرة",
  back: "عاد الاتصال بالخدمة",
};

function phaseToBanner(phase: ConnPhase): BannerPhase {
  switch (phase) {
    case "deviceDisconnected":
      return "device-off";
    case "ularaServerUnavailable":
      return "server-off";
    case "databaseDegraded":
      return "db-degraded";
    default:
      return "hidden";
  }
}

/**
 * The thin connectivity banner — mount ONCE at the app root (inside
 * SafeAreaProvider). Self-subscribing (to the ONE honest store);
 * nothing to pass. Enter/exit is transform/opacity only; reduced-motion
 * shows/hides without animation.
 *
 * R341 T03 — it follows the DEBOUNCED line (a single transient probe
 * blip never shows the banner). R342 t08 — the MESSAGE follows the
 * dimension: «لا يوجد اتصال بالشبكة» only when the OS interface is
 * actually down; «تعذّر الاتصال بخادم أُلارا حالياً» when OUR server
 * is the unreachable one (never a «لا يوجد اتصال بالإنترنت» claim the
 * evidence cannot support); «الخدمة متاحة جزئياً…» when the DB is the
 * degraded half; «عاد الاتصال بالخدمة» on recovery.
 */
export function NetworkBanner() {
  useOnlineManagerBridge();
  const reduced = useReduceMotion();
  const tones = useStatusTones();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<BannerPhase>("hidden");
  // Stays mounted while the exit animation runs (the Animated completion
  // callback clears it) — the boot.tsx enter/exit pattern.
  const [exiting, setExiting] = useState(false);
  const [v] = useState(() => new Animated.Value(0));

  // Phase follows the resolved honest line only (never the optimistic
  // pre-resolve default, never a transient blip): a bad phase → its
  // banner; any-bad → good → the recovery flash then exit; bad→bad
  // swaps (device-off → server-off) re-word in place without a flash.
  useEffect(() => {
    let was: BannerPhase | null = null;
    const unsubscribe = subscribeConn((s) => {
      const nextBanner = s.isResolved ? phaseToBanner(s.phase) : "hidden";
      if (was === null) {
        // First observed state: no transition to celebrate — only go
        // bad-phase-honest if actually (resolved) bad.
        was = nextBanner;
        setPhase(nextBanner);
        return;
      }
      if (nextBanner === was) return;
      const recovered = nextBanner === "hidden" && was !== "hidden";
      was = nextBanner;
      setPhase(recovered ? "back" : nextBanner);
    });
    return unsubscribe;
  }, []);

  // «عاد الاتصال بالخدمة» stays up for BACK_FLASH_MS, then hides and
  // rides the exit animation (both setStates live in the timer
  // callback — async).
  useEffect(() => {
    if (phase !== "back") return;
    const t = setTimeout(() => {
      setPhase("hidden");
      setExiting(true);
    }, BACK_FLASH_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const show = phase !== "hidden";
  const mounted = show || exiting;

  // Enter/exit animation — opacity + translateY only. Mounting is
  // derived from `show` (immediate); the exit-unmount lands in the
  // Animated completion callback. Reduced motion collapses the exit to
  // a 0ms timing so the same async path hides it statically.
  useEffect(() => {
    if (show) {
      if (reduced) {
        v.setValue(1);
        return;
      }
      Animated.timing(v, { toValue: 1, duration: ENTER_MS, easing: EASE, useNativeDriver: true }).start();
      return;
    }
    if (!exiting) return;
    Animated.timing(v, {
      toValue: 0,
      duration: reduced ? 0 : EXIT_MS,
      easing: EASE,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setExiting(false);
    });
  }, [show, exiting, reduced, v]);

  if (!mounted) return null;

  const tone = phase === "back" ? tones.mint : tones.yellow;
  const label = BANNER_TEXT[phase as Exclude<BannerPhase, "hidden">];
  const a11yLabel = phase === "back" ? BANNER_TEXT.back : label;
  const Icon =
    phase === "device-off" ? WifiOff : phase === "server-off" ? CloudOff : phase === "db-degraded" ? Database : Wifi;

  const animated = reduced
    ? { opacity: 1, transform: [{ translateY: 0 }] }
    : {
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
        ],
      };

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11yLabel}
      style={[
        {
          paddingTop: insets.top,
          backgroundColor: tone.bg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tone.ink,
        },
        animated,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: sp[8],
          paddingVertical: 6,
          paddingHorizontal: sp[16],
          minHeight: 36,
        }}
      >
        <Icon size={14} color={tone.deep} />
        <T variant="sm" style={{ color: tone.deep }}>
          {label}
        </T>
      </View>
    </Animated.View>
  );
}

/**
 * Test-only seams (the __hapticsInternals pattern) — NOTHING here is
 * used by app code. The NetInfo wiring itself is app-lifetime by
 * design; tests keep the (mock) listener registered and drive readings
 * through it after reset().
 */
export const __networkInternals = {
  /** The current honest state (assertions / seeding). */
  state(): ConnState {
    return connState;
  },
  /** The confirm-probe delay (fake-timer tests advance by this). */
  confirmProbeDelayMs: CONFIRM_PROBE_DELAY_MS,
  /** Restore first-import state: optimistic store, emptied listeners,
   *  disarmed confirm probe, healthy db line. */
  reset(): void {
    clearConfirmProbe();
    connState = INITIAL_CONN_STATE;
    dbDegraded = false;
    connListeners.clear();
  },
};
