/**
 * R334 2-a — entrance/exit/layout presets for reanimated layout animations.
 *
 * Thin factories over reanimated's builders that bake in the ds motion
 * scale (durations/easing from ./presets) so screens never hand-roll a
 * timing again. Each call returns a FRESH builder (the reanimated builder
 * statics are immutable; instance methods mutate — never share instances).
 *
 * Reduced motion: reanimated builders default to ReduceMotion.System (they
 * self-skip when the OS setting is on), AND `useEntrance` gates the prop at
 * the React level with the app's own useReduceMotion — double coverage, so
 * an entering preset can never animate for a reduced-motion user.
 *
 * Emulators (2026-11-13, the android-smoke forensics): on the software-
 * rendered emulator profile, DELAYED entering animations strand their
 * content at opacity 0 — the first entrance fires, the staggered follow-
 * ups never start (measured twice live: the Welcome rendered its eyebrow
 * while the CTA stack stayed invisible for 30+s across 10 journeys). The
 * emulator gate (lib/emulatorGate) disables entrances on non-physical
 * devices — CI smoke proves the FUNCTIONAL journey; real devices keep the
 * full motion design (the render-net + unit belts cover the structure).
 *
 * RTL: SlideInFromStart reads the reading-start edge (right in RTL, left
 * otherwise) via I18nManager — direction never changes without a reload in
 * this app (see lib/rtl.ts), so module-lifetime reads are safe.
 */
import { I18nManager } from "react-native";
import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  type BaseAnimationBuilder,
} from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { isEmulatorEntranceDisabled } from "@/lib/emulatorGate";
import { durations, easings } from "./presets";

export interface EntranceOptions {
  /** override the preset duration (ms). */
  duration?: number;
  /** delay before the animation starts (ms) — the stagger building block. */
  delay?: number;
}

/** Fade in place — 200ms, the ds curve. For subtle content swaps. */
export function fadeIn({ duration, delay }: EntranceOptions = {}) {
  return FadeIn.duration(duration ?? durations.fast)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/** Fade + rise — the default content entrance (240ms rhythm). */
export function fadeInUp({ duration, delay }: EntranceOptions = {}) {
  return FadeInUp.duration(duration ?? durations.entrance)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/** Fade + drop — for content entering from above (sheets, headers). */
export function fadeInDown({ duration, delay }: EntranceOptions = {}) {
  return FadeInDown.duration(duration ?? durations.entrance)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/**
 * Slide in from the READING-START edge — right in RTL (Arabic), left in
 * LTR. The physical builders (SlideInLeft/Right) are direction-blind; this
 * factory is the RTL-aware wrapper screens should use for drawers, panels,
 * and list entrances that should feel like they come "from the beginning".
 */
export function slideInFromStart({ duration, delay }: EntranceOptions = {}) {
  const fromStartEdge = I18nManager.isRTL ? SlideInRight : SlideInLeft;
  return fromStartEdge.duration(duration ?? durations.entrance)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/** Mirror of slideInFromStart — from the reading-END edge (detail push-ins). */
export function slideInFromEnd({ duration, delay }: EntranceOptions = {}) {
  const fromEndEdge = I18nManager.isRTL ? SlideInLeft : SlideInRight;
  return fromEndEdge.duration(duration ?? durations.entrance)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/** Exit — always faster than the entrance (150ms), same curve. */
export function fadeOut({ duration, delay }: EntranceOptions = {}) {
  return FadeOut.duration(duration ?? durations.exit)
    .delay(delay ?? 0)
    .easing(easings.ds);
}

/** Layout transitions (reposition on data change) — 200ms linear-ish ds. */
export function dsLayout({ duration }: EntranceOptions = {}) {
  return LinearTransition.duration(duration ?? durations.fast).easing(easings.ds);
}

/* ─── stagger ──────────────────────────────────────────────────────────── */

export interface StaggerOptions extends EntranceOptions {
  /** delay before child 0 starts (default 0) — the parent's offset. */
  base?: number;
  /** per-child step (default 60ms — durations.staggerStep). */
  step?: number;
  /** which entrance the children use (default fadeUp). */
  preset?: "fade" | "fadeUp" | "fadeDown" | "slideStart";
}

/** The delay for child `index`: base + index × step. */
export function staggerDelay(index: number, { base = 0, step = durations.staggerStep }: StaggerOptions = {}): number {
  return base + index * step;
}

/**
 * Staggered-entrance builder for child `index` of a list — the canonical
 * parent + child delay pattern (the parent enters with the same `base`,
 * each child follows one `step` later). See useStaggerEntrance for the
 * map-safe hook form.
 */
export function enterStagger(index: number, { step, base, preset = "fadeUp", ...rest }: StaggerOptions = {}) {
  const delay = staggerDelay(index, { base, step });
  switch (preset) {
    case "fade":
      return fadeIn({ ...rest, delay });
    case "fadeDown":
      return fadeInDown({ ...rest, delay });
    case "slideStart":
      return slideInFromStart({ ...rest, delay });
    case "fadeUp":
    default:
      return fadeInUp({ ...rest, delay });
  }
}

/* ─── the reduced-motion gates ─────────────────────────────────────────── */

/**
 * Gate any entering/exiting/layout builder on the app's reduced-motion
 * setting: returns the built preset, or `undefined` (which reanimated
 * reads as "no animation") when the user asked for less motion.
 *
 *   <Animated.View entering={useEntrance(() => fadeInUp())}>…</Animated.View>
 *
 * One call per component — for children rendered in a map, use
 * useStaggerEntrance below (hooks can't live inside .map callbacks).
 */
export function useEntrance<T extends BaseAnimationBuilder>(build: () => T): T | undefined {
  return useReduceMotion() || isEmulatorEntranceDisabled() ? undefined : build();
}

/**
 * Map-safe stagger: one hook call in the parent returns a per-child
 * entering factory that already carries the reduced-motion gate —
 *
 *   const childEntering = useStaggerEntrance({ base: 80 });
 *   <Animated.View entering={useEntrance(() => fadeInUp({ delay: 80 }))}>
 *     {rows.map((row, i) => (
 *       <Animated.View key={row.id} entering={childEntering(i)}>…</Animated.View>
 *     ))}
 *   </Animated.View>
 */
export function useStaggerEntrance(options?: StaggerOptions): (index: number) => BaseAnimationBuilder | undefined {
  const reduced = useReduceMotion() || isEmulatorEntranceDisabled();
  return (index: number) => (reduced ? undefined : enterStagger(index, options));
}
