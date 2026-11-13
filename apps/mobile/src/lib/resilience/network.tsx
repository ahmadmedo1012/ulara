/**
 * resilience/network — R334 B8: the connectivity layer. R341 T03: the
 * connectivity-HONESTY layer (the owner's false «لا يوجد اتصال» complaint).
 *
 * The R334 design decided connectivity straight from raw NetInfo state:
 * ONE `isInternetReachable === false` reading → offline banner + paused
 * TanStack queries. Two problems on Libyan networks:
 *
 *   · NetInfo's DEFAULT reachability probe pings a Google generate_204
 *     endpoint — and, with the default `useNativeReachability`, Android
 *     additionally trusts the OS's own captive-portal verdict
 *     (NET_CAPABILITY_VALIDATED — also a Google endpoint). That probe can
 *     be blocked while ULARA's own API answers fine → the library reports
 *     `isInternetReachable === false` on a WORKING connection → the
 *     persistent false offline banner. The only honest question for this
 *     product is «can we reach OUR backend?» — so the probe now targets
 *     the public, rate-limit-free, unauthenticated `GET /status` route
 *     (backend status.routes.ts; answers HTTP 200 `{ data: { ok, … } }`).
 *
 *   · A single transient probe failure flipped the whole app offline.
 *     Now the offline transition is DEBOUNCED (see nextConnState).
 *
 * Halves:
 *
 *   · `nextConnState(prev, reading)` — the PURE state machine deciding
 *     connectivity honesty (unit-pinned in ./network.test.tsx). The
 *     NetInfo subscription feeds it; everyone else consumes its output.
 *
 *   · The ONE NetInfo subscription (module scope) + the debounced store.
 *     `useNetworkStatus()`, the onlineManager bridge and `NetworkBanner`
 *     all read the same line — no double subscriptions (R334 wired up to
 *     three parallel raw listeners: the hook, the bridge, the banner).
 *     A first transient unreachable reading schedules a confirming
 *     `NetInfo.refresh()`: the library only emits on state CHANGES, so a
 *     steady-dead internet produces exactly ONE unreachable event and
 *     the debounce's second reading must be asked for explicitly.
 *
 *   · `NetworkBanner` — the thin top banner the lead mounts once at the
 *     app root. While (confirmed) offline it reads «لا يوجد اتصال
 *     بالإنترنت — سيتم إعادة المحاولة تلقائيًا»; when the connection
 *     returns it flashes «عاد الاتصال» (mint) for ~2.4s then exits.
 *     Enter/exit is opacity + translateY only (the ds motion
 *     discipline — no layout animation); reduced-motion shows/hides
 *     statically. Safe-area aware (pads `insets.top`).
 *
 *   · `useOnlineManagerBridge()` — wires the same debounced line into
 *     TanStack Query's onlineManager (mounted by <NetworkBanner/>):
 *     queries PAUSE while offline instead of burning retries, and
 *     auto-resume on reconnect — exactly what the banner's «سيتم إعادة
 *     المحاولة تلقائيًا» promises.
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
import Wifi from "lucide-react-native/icons/wifi";
import { API_BASE } from "@/api/client";
import { useStatusTones } from "@/design/theme";
import { dsEase, sp } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "@/components/ui/text";

/* ── the own-API reachability probe (R341 T03) ───────────────────────── */

/**
 * Exact option names per the INSTALLED @react-native-community/netinfo
 * 12.0.1 types (`NetInfoConfiguration`): reachabilityUrl ·
 * reachabilityMethod · reachabilityTest · reachabilityRequestTimeout ·
 * reachabilityShortTimeout · useNativeReachability. (There is no
 * `reachabilityTimeout` in this version — the ~5s per-probe budget is
 * `reachabilityRequestTimeout`, default 15s.)
 *
 *   · `reachabilityUrl` — OUR status route. It answers HTTP 200 + JSON,
 *     NOT the 204 the library's DEFAULT reachabilityTest expects — hence
 *     the explicit 2xx test, without which every healthy response would
 *     count as unreachable.
 *   · `reachabilityMethod: "GET"` — the exact path the keep-warm cron
 *     and the «حالة المنصة» card already exercise.
 *   · `useNativeReachability: false` — do NOT trust the OS's own
 *     captive-portal verdict (Android NET_CAPABILITY_VALIDATED — a
 *     Google endpoint, precisely the blocked-probe class this fix
 *     retires). The library probe against OUR API is the one signal.
 */
const PROBE_CONFIG: Partial<NetInfoConfiguration> = {
  reachabilityUrl: `${API_BASE}/status`,
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

/* ── the debounced connectivity state machine (R341 T03) ─────────────── */

/** Consecutive unreachable-probe readings required to confirm offline. */
const OFFLINE_AFTER_READINGS = 2;

export interface NetworkStatus {
  /** Honest connectivity: false only once connectivity is CONFIRMED lost. */
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
  isOnline: true,
  isResolved: false,
  type: null,
  unreachableStreak: 0,
};

function connEquals(a: ConnState, b: ConnState): boolean {
  return (
    a.isOnline === b.isOnline &&
    a.isResolved === b.isResolved &&
    a.type === b.type &&
    a.unreachableStreak === b.unreachableStreak
  );
}

/**
 * The PURE transition — the ONE place connectivity honesty is decided
 * (pinned in ./network.test.tsx; the NetInfo subscription feeds it, the
 * hook / bridge / banner all consume its output). Rules:
 *
 *   · `isConnected === false` → OFFLINE immediately — wifi/radio off is
 *     a hard OS signal, not a probe result (no debounce).
 *   · `isInternetReachable === true` → ONLINE immediately — the probe
 *     confirmed OUR API answers; recovery is never debounced.
 *   · `isInternetReachable === false` (link up) → the probe failed —
 *     offline only on the SECOND consecutive failure; one transient
 *     blip must never flip the app offline. While already offline,
 *     unreachable readings simply stay offline.
 *   · `isInternetReachable == null` → no verdict yet — keep the current
 *     online-ness (online-optimistic while online). The streak SURVIVES
 *     a null: NetInfo re-arms the probe with a null before every fresh
 *     verdict, and that re-arm must not erase an in-flight offline
 *     confirmation.
 *
 * Referentially stable: a reading that changes nothing returns `prev`.
 */
export function nextConnState(prev: ConnState, r: ConnReading): ConnState {
  let candidate: ConnState;
  if (r.isConnected === false) {
    // Hard offline. (If the installed NetInfo semantics ever make the
    // consecutive rule awkward here, it stays: this is the wifi-off /
    // radio-off case, not a probe result.)
    candidate = { isOnline: false, isResolved: true, type: r.type, unreachableStreak: 0 };
  } else if (r.isInternetReachable === false) {
    // Link up, probe failed. Cap the streak at the threshold so repeated
    // offline readings are no-ops (referential stability).
    const unreachableStreak = Math.min(prev.unreachableStreak + 1, OFFLINE_AFTER_READINGS);
    candidate = {
      isOnline: prev.isOnline && unreachableStreak < OFFLINE_AFTER_READINGS,
      isResolved: true,
      type: r.type,
      unreachableStreak,
    };
  } else if (r.isInternetReachable === true) {
    // Probe confirmed — online, immediately, streak reset.
    candidate = { isOnline: true, isResolved: true, type: r.type, unreachableStreak: 0 };
  } else {
    // No verdict yet (isInternetReachable == null): online-optimism when
    // online, honesty when already offline; streak preserved (see doc).
    candidate = { ...prev, isResolved: true, type: r.type };
  }
  return connEquals(prev, candidate) ? prev : candidate;
}

/* ── the ONE NetInfo subscription + debounced store (module scope) ───── */

/**
 * How long after a FIRST transient unreachable reading the confirming
 * second probe runs (`NetInfo.refresh()` — the library's re-run-the-
 * reachability-check API). The library only emits on state CHANGES: a
 * steady-dead internet yields exactly ONE unreachable event, so the
 * debounce's second reading must be explicitly asked for.
 */
const CONFIRM_PROBE_DELAY_MS = 2_000;

let connState: ConnState = INITIAL_CONN_STATE;
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

/** Every NetInfo reading flows through here — the store's ONE inlet. */
function pushReading(s: NetInfoState): void {
  const prev = connState;
  const next = nextConnState(prev, {
    isConnected: s.isConnected,
    isInternetReachable: s.isInternetReachable,
    type: s.type,
  });
  connState = next;
  if (next.isOnline !== prev.isOnline) {
    // The ONE onlineManager sync — queries pause/resume on the same
    // debounced line the banner and the hooks show.
    onlineManager.setOnline(next.isOnline);
  }
  if (next !== prev) {
    connListeners.forEach((listener) => listener(next));
  }
  // The transient-blip confirm: armed on the first unreachable reading
  // while still online; disarmed by any definitive verdict.
  if (next.isOnline && next.unreachableStreak >= 1) {
    scheduleConfirmProbe();
  } else {
    clearConfirmProbe();
  }
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
 * Subscribe to the ONE debounced connectivity line. Mirrors NetInfo's
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
 * The connectivity hook (same public shape as R334). Optimistic-online
 * until the first resolve (no false «أنت غير متصل» flash at cold start),
 * honest — and debounce-protected — after. Late mounters start from the
 * current store state, not from a second optimistic reset.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<ConnState>(connState);
  useEffect(() => subscribeConn(setStatus), []);
  return status;
}

/* ── onlineManager bridge (NetInfo → TanStack Query) ────────────────── */

/**
 * Wires the debounced connectivity line into TanStack Query's
 * onlineManager for as long as the caller is mounted: queries PAUSE
 * while offline instead of burning retries, and auto-resume on
 * reconnect. <NetworkBanner/> mounts this; the lead may also mount it
 * standalone at the root. Idempotent across remounts — every consumer
 * shares the ONE module-scope subscription (R334 kept a ref-counted
 * second listener here instead).
 */
export function useOnlineManagerBridge(): void {
  useEffect(() => {
    // onlineManager is not React state — a synchronous set on mount is
    // safe and keeps remounts honest even if the line flipped while no
    // bridge was mounted. The store itself syncs on every flip.
    onlineManager.setOnline(connState.isOnline);
    return subscribeConn((s) => onlineManager.setOnline(s.isOnline));
  }, []);
}

/* ── NetworkBanner ───────────────────────────────────────────────────── */

const EASE = Easing.bezier(dsEase[0], dsEase[1], dsEase[2], dsEase[3]);
const ENTER_MS = 220;
const EXIT_MS = 180;
/** How long «عاد الاتصال» stays up before exiting. */
const BACK_FLASH_MS = 2400;

type BannerPhase = "hidden" | "offline" | "back";

/**
 * The thin connectivity banner — mount ONCE at the app root (inside
 * SafeAreaProvider). Self-subscribing (to the ONE debounced store);
 * nothing to pass. Enter/exit is transform/opacity only; reduced-motion
 * shows/hides without animation.
 *
 * R334 A-cleanup — the phase/mount bookkeeping never sets state
 * synchronously inside effects (react-hooks/set-state-in-effect): every
 * visible transition derives from the subscription callback, and the
 * only timed state changes ride async callbacks (setTimeout / Animated
 * completion). R341 T03 — it now follows the DEBOUNCED line: a single
 * transient probe blip never shows the banner, and «عاد الاتصال» rides
 * the probe-confirmed recovery (the same moment queries resume).
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

  // Phase follows the resolved debounced line only (never the optimistic
  // pre-resolve default, never a transient blip): confirmed-offline →
  // banner; offline→online → «عاد الاتصال» flash then exit; anything
  // else → hidden.
  useEffect(() => {
    let was: boolean | null = null;
    const unsubscribe = subscribeConn((s) => {
      if (was === null) {
        // First observed state: no transition to celebrate — only go
        // offline-honest if actually (confirmed) offline.
        was = s.isOnline;
        setPhase(s.isOnline ? "hidden" : "offline");
        return;
      }
      if (s.isOnline === was) return;
      was = s.isOnline;
      setPhase(s.isOnline ? "back" : "offline");
    });
    return unsubscribe;
  }, []);

  // «عاد الاتصال» stays up for BACK_FLASH_MS, then hides and rides the
  // exit animation (both setStates live in the timer callback — async).
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

  const offline = phase === "offline";
  const tone = offline ? tones.yellow : tones.mint;
  const a11yLabel = offline ? "لا يوجد اتصال بالإنترنت" : "عاد الاتصال";
  const label = offline
    ? "لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا"
    : "عاد الاتصال";

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
        {offline ? <WifiOff size={14} color={tone.deep} /> : <Wifi size={14} color={tone.deep} />}
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
  /** The current debounced state (assertions / seeding). */
  state(): ConnState {
    return connState;
  },
  /** The confirm-probe delay (fake-timer tests advance by this). */
  confirmProbeDelayMs: CONFIRM_PROBE_DELAY_MS,
  /** Restore first-import state: optimistic store, emptied listeners,
   *  disarmed confirm probe. */
  reset(): void {
    clearConfirmProbe();
    connState = INITIAL_CONN_STATE;
    connListeners.clear();
  },
};
