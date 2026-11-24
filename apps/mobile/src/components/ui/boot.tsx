/**
 * boot.tsx — R327 B2 «منظّم المحمّلات» — the ONE loader system.
 *
 * Rules (enforced app-wide by LoadingScreen/InlineBusy routing here):
 *   · ONE loader vocabulary: the brand mark converging (ds rhythm) —
 *     no generic spinners anywhere in the app.
 *   · <Boot> is the boot/transition state: the mark at the SAME size and
 *     position as the native splash (120 · centred) so the splash → app
 *     handoff is a cross-fade with zero jump.
 *   · honest slow state: after 6s the label becomes «الخادم يستيقظ…»
 *     (the Render free tier sleeps; the user deserves the truth) with an
 *     optional retry.
 *   · respect prefers-reduced-motion: static mark, no animation.
 *   · <InlineBusy> — the small inline variant for buttons and rows; pair
 *     with useStableFlag(busy) for the ≥300ms anti-flicker hold.
 *
 * R327 C4: the animations ride React Native's built-in Animated (native
 * driver — UI thread, the same 60fps path) instead of react-native-
 * reanimated. These loops are plain transform/opacity cycles; the whole
 * reanimated+worklets runtime (~420kB of mapped JS ≈ 0.95MB of .hbc) was
 * riding the bundle for three pulse loops. Core Animated ships with RN —
 * zero marginal bytes.
 *
 * r351 N1 — the boot SEQUENCE (BootStrip): under the mark, a mono
 * measured strip — a 0→100 counter (900ms, the ds ease) + the mark's own
 * coordinate readout (X/Y in px — honest: the splash/app mark's real
 * geometry, never decoration). It rides ONLY the first cold boot of a
 * process (a module flag; warm remounts skip it), completes within the
 * 1.2s ceiling, and renders STATIC under reduced motion.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type EasingFunction,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MarkCornerstoneLayer, MarkVesselLayer } from "@/brand";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { dsEase } from "@/design/tokens.generated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "./text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "./pressables";

const EASE = Easing.bezier(dsEase[0], dsEase[1], dsEase[2], dsEase[3]);
const CYCLE = 520;

/* ── core-Animated helpers ──────────────────────────────────────────── */

/**
 * A value looping between two targets forever (paper rhythm). The loop
 * runs on the native driver — transform/opacity only, which is exactly
 * the loader vocabulary. Stops on unmount; returns the value so it can
 * seat in an Animated.View style.
 */
function usePulseLoop(
  from: number,
  to: number,
  duration: number,
  easing: EasingFunction,
  enabled: boolean,
): Animated.Value {
  // lazily-created, identity-stable — useState initializer instead of a
  // ref read during render (react-compiler clean). Never set → no re-renders.
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: true }),
        Animated.timing(v, { toValue: from, duration, easing, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, from, to, duration, easing, enabled]);
  return v;
}

/** One-time phase offset for staggered loops (starts after `delay` ms). */
function useDelayedPulseLoop(
  from: number,
  to: number,
  duration: number,
  easing: EasingFunction,
  delay: number,
  enabled: boolean,
): Animated.Value {
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    if (!enabled) return;
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: from, duration, easing, useNativeDriver: true }),
        ]),
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [v, from, to, duration, easing, delay, enabled]);
  return v;
}

/* ── BootMark — the vessel + the cornerstone, converging ────────────── */

/**
 * The canonical ULAra mark as a live loader — rendered through the brand
 * system's own MarkLayers exports (MarkVesselLayer + MarkCornerstoneLayer,
 * the same constants <Logo variant="mark"> renders and the native
 * splash/app icons are generated from; the logo-gate law: geometry lives
 * in the brand system, seats consume components): the ink vessel eases in
 * while the royal cornerstone counter-scales out and breathes —
 * «الإناء يمتلئ» — one loader vocabulary, one mark. `size` 120 = the
 * splash icon size → the IDENTICAL figure at the same seat, so the
 * splash → app handoff is a pure cross-fade (the hand-drawn two-squares
 * figure this replaces visibly MORPHED at the handoff — the same
 * competing-construction defect class retired from the web footer in
 * acef177).
 */
export function BootMark({ size = 120 }: { size?: number }) {
  const p = usePalette();
  const reduced = useReduceMotion();

  // counter-phase: the ink vessel eases in while the stone eases out
  const vesselScale = usePulseLoop(1, 0.88, CYCLE, EASE, !reduced);
  const stoneScale = usePulseLoop(1, 1.09, CYCLE, EASE, !reduced);
  const stoneOpacity = usePulseLoop(1, 0.35, CYCLE, EASE, !reduced);

  // both layers share the mark's own canvas — stacked, they compose the
  // exact figure <Logo variant="mark"> renders (same brand source).
  const seat = { position: "absolute" as const, width: size, height: size };

  /* the vessel — the brand system's own single-layer render (the same
     optical hairline and stroke math <Logo> rides, authored in-brand) */
  const vessel = <MarkVesselLayer size={size} color={p.text} />;

  /* the cornerstone — the brand system's own single-layer render (the
     solid royal 4×4 at the right stem's top) */
  const cornerstone = <MarkCornerstoneLayer size={size} color={p.accent} />;

  if (reduced) {
    return (
      <View style={{ width: size, height: size }}>
        <View style={seat}>{vessel}</View>
        <View style={seat}>{cornerstone}</View>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[seat, { transform: [{ scale: vesselScale }] }]}>
        {vessel}
      </Animated.View>
      <Animated.View
        style={[seat, { transform: [{ scale: stoneScale }] }, { opacity: stoneOpacity }]}
      >
        {cornerstone}
      </Animated.View>
    </View>
  );
}

/* ── the deterministic entry handoff ────────────────────────────────── */

/** The session fields the handoff rule reads (AuthUser-shaped subset). */
export interface EntryUserLike {
  role: string;
  currentInstitution?: { id: string } | null;
  /** r359 A4 (M2): null/undefined = the first-run tour is still owed
   * (the user is routed through /onboarding before their role home).
   * Missing field (older cached sessions) = treated as COMPLETED —
   * fail-open: an existing user is never re-toured by a schema gap. */
  onboardingCompletedAt?: string | null;
}

/**
 * resolveEntryDestination — the ONE boot→destination rule, shared by
 * `/` (cold start with a cached session) and `/auth/login` (fresh
 * login). Deterministic, pure, no imports:
 *
 *   1. `?continue=` wins ONLY when the session can honor it — an
 *      institution context is active, or the user is the platform
 *      OWNER (no institution membership by design).
 *   2. r359 A4 (M2): a user whose tour is owed (onboardingCompletedAt
 *      explicitly null — missing = completed, see EntryUserLike) goes
 *      through /onboarding FIRST (the app intro precedes context
 *      selection — the tour needs no institution).
 *   3. Otherwise a non-OWNER/non-ADMIN role without an institution
 *      context hits the institution gate (/select-institution).
 *   4. Everyone else lands on their role home (unknown roles → student).
 *
 * The ADMIN exemption mirrors the login flow's original contract: an
 * ADMIN (إدارة المؤسسة) is provisioned institution-bound — when the
 * context is missing the role home renders and RoleGate re-gates to
 * /select-institution if active memberships exist, which is the same
 * destination without a dead-end when they don't.
 */
export function resolveEntryDestination(
  user: EntryUserLike,
  continueParam: string | null | undefined,
  roleHome: Record<string, string>,
): string {
  const cont = continueParam ? decodeURIComponent(continueParam) : null;
  if (cont && (user.currentInstitution || user.role === "OWNER")) return cont;
  // r359 A4: EXPLICIT null only (undefined = older cached session = done).
  if (user.onboardingCompletedAt === null) return "/onboarding";
  const needsInstitution =
    user.role !== "OWNER" && user.role !== "ADMIN" && !user.currentInstitution;
  if (needsInstitution) return "/select-institution";
  return roleHome[user.role] ?? "/student/dashboard";
}

/* ── r351 N1 — the boot sequence strip (cold boot only) ─────────────── */

/** One completed boot per process — warm remounts skip the strip. */
let hasBootedOnce = false;
/** Test seam: restore the cold-boot first-render state. */
export function __resetBootSequenceForTests(): void {
  hasBootedOnce = false;
}

/** The counter's full run (ms) — inside the 1.2s sequence ceiling. */
export const BOOT_COUNTER_MS = 900;

/**
 * BootStrip — the mono measured strip under the mark: a 0→100 counter
 * on the ds ease + the mark's own coordinate readout (`X:120 Y:120` —
 * the real splash-mark geometry, the survey-sheet flavor of the boot
 * moment) + the hairline ruler with its + marks (the ds register).
 * Static under reduced motion (the strip renders complete, no count);
 * flips hasBootedOnce when the run ends (or on unmount after start).
 */
/** r359 A4 (M1): the persisted repeat-launch stamp — the FULL 900ms
 * counter runs on the first launch EVER; every later launch (new
 * process included) gets the completed strip immediately (the mark
 * alone carries the moment — a returning user is never re-counted at).
 * Async read; the strip starts full-run and drops to static the moment
 * the stamp resolves — worst case (slow storage) the first repeat
 * launch plays the full count once more. */
const BOOT_SEEN_KEY = "ula-mobile-boot-seen";

export function BootStrip({ size = 120 }: { size?: number }) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const [pct, setPct] = useState(reduced ? 100 : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      hasBootedOnce = true;
      return;
    }
    // r359 A4 (M1): repeat launches (the persisted ula-mobile-boot-seen
    // stamp) skip the count — the strip completes instantly and the
    // mark alone carries the moment. The FIRST run is the one that
    // writes the stamp. Storage failure degrades to the full count.
    let skipCount = false;
    let stopAnim: (() => void) | null = null;
    void AsyncStorage.getItem(BOOT_SEEN_KEY)
      .then((seen) => {
        if (seen === "1") {
          skipCount = true;
          setPct(100);
          hasBootedOnce = true;
          stopAnim?.();
        } else {
          void AsyncStorage.setItem(BOOT_SEEN_KEY, "1").catch(() => undefined);
        }
      })
      .catch(() => undefined);

    if (skipCount) return;

    const v = new Animated.Value(0);
    // integer-step updates only (≤100 renders on the whole run, and the
    // strip is the only thing on screen at this moment).
    const sub = v.addListener(({ value }) => {
      setPct(Math.round(value));
    });
    const anim = Animated.timing(v, {
      toValue: 100,
      duration: BOOT_COUNTER_MS,
      easing: EASE,
      useNativeDriver: false, // listener-driven state — JS value
    });
    stopAnim = () => anim.stop();
    anim.start(({ finished }) => {
      if (finished) {
        doneRef.current = true;
        hasBootedOnce = true;
      }
    });
    return () => {
      v.removeListener(sub);
      anim.stop();
      // An unmount mid-count (the session resolved fast) still counts as
      // a completed boot: the user SAW the sequence start and end.
      hasBootedOnce = true;
    };
  }, [reduced]);

  return (
    <View style={{ alignItems: "center", gap: sp[6] }}>
      {/* the hairline ruler — the ds survey register, full width */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: sp[4],
          width: size * 1.6,
        }}
      >
        <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: p.rule }} />
        <T variant="monoSm" color="faint">+</T>
        <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: p.rule }} />
      </View>
      <T variant="monoSm" color="faint">
        {`X:${size} Y:${size} · ${pct}%`}
      </T>
    </View>
  );
}

/* ── Boot — the full-screen boot/transition state ───────────────────── */

const SLOW_AFTER_MS = 6000;

export function Boot({
  label = "جارٍ التحميل…",
  slowLabel = "الخادم يستيقظ… قد يستغرق لحظات ثم يبدأ العمل.",
  onRetry,
  size = 120,
}: {
  label?: string;
  slowLabel?: string | null;
  onRetry?: () => void;
  size?: number;
}) {
  const p = usePalette();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.bg,
        gap: sp[20],
        paddingHorizontal: sp[24],
      }}
    >
      <BootMark size={size} />
      {!hasBootedOnce ? <BootStrip size={size} /> : null}
      <View style={{ alignItems: "center", gap: sp[8], maxWidth: 320 }}>
        <T variant="sm" color="muted" align="center">
          {slow && slowLabel ? slowLabel : label}
        </T>
        {slow && onRetry ? (
          <Button label="إعادة المحاولة" kind="ghost" small onPress={onRetry} />
        ) : null}
      </View>
    </View>
  );
}

/* ── InlineBusy — the small inline variant (buttons, rows) ──────────── */

/** Three hairline squares stepping — the tiny sibling of BootMark. */
export function InlineBusy({ size = 14, color }: { size?: number; color?: string }) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const c = color ?? p.text;
  const gap = Math.max(3, Math.round(size / 3));

  const a = usePulseLoop(1, 0.25, 260, EASE, !reduced);
  const b = useDelayedPulseLoop(1, 0.25, 260, EASE, 170, !reduced);
  const c2 = useDelayedPulseLoop(1, 0.25, 260, EASE, 340, !reduced);

  if (reduced) {
    return (
      <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
        <View style={{ width: size, height: size, backgroundColor: c }} />
        <View style={{ width: size, height: size, backgroundColor: c }} />
        <View style={{ width: size, height: size, backgroundColor: c }} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: a }]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: b }]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: c2 }]} />
    </View>
  );
}

/* ── shared motion ──────────────────────────────────────────────────── */

/**
 * The drafting-table pulse for skeletons (paper rhythm, ~1.3s cycle).
 * Returns the opacity style seat for an Animated.View (static opacity
 * when reduced — the caller's plain View path renders instead).
 */
export function usePulseStyle(reduced: boolean): Animated.WithAnimatedValue<StyleProp<ViewStyle>> {
  const quad = Easing.inOut(Easing.quad);
  const v = usePulseLoop(0.85, 0.35, 640, quad, !reduced);
  return reduced ? {} : { opacity: v };
}

/** A busy flag that, once raised, holds ≥ `minMs` after it drops (anti-flicker). */
export function useStableFlag(flag: boolean, minMs = 300): boolean {
  const [holding, setHolding] = useState(false);
  const raisedAt = useRef<number | null>(null);
  useEffect(() => {
    if (flag) {
      raisedAt.current = Date.now();
      return;
    }
    if (raisedAt.current !== null) {
      const remaining = minMs - (Date.now() - raisedAt.current);
      if (remaining > 0) {
        setHolding(true);
        const t = setTimeout(() => {
          raisedAt.current = null;
          setHolding(false);
        }, remaining);
        return () => clearTimeout(t);
      }
      raisedAt.current = null;
    }
  }, [flag, minMs]);
  return flag || holding;
}
