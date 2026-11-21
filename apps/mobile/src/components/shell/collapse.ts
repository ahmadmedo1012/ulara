/**
 * r351 N2 — the collapsing-header geometry.
 *
 * ONE source for the large-title collapse numbers, shared by
 * LargeTitleScreen (the scroll frame) and AppTopBar (the bar's crossfade
 * seat). DATA ONLY — module-scope constants are safe to capture inside
 * reanimated worklets (the CountUp R336 rule: captured FUNCTIONS are
 * remote calls on the UI runtime and freeze the app; captured constants
 * are data and stay legal). The worklet bodies in both components do
 * plain Math.* arithmetic over these numbers — no captured functions,
 * no interpolate() (its jest mock is a NOOP, which would hollow the
 * rest-state pins).
 *
 * The collapse grammar (fractions of COLLAPSE.threshold):
 *   · the large title fades out over [0, titleFadeAt] and (full motion
 *     only) drifts up by `drift` px;
 *   · the bar's brand word fades out over seatOut and the collapsed
 *     title fades in over seatIn — one seat, an opacity crossfade
 *     (opacity-only = the reduced-motion degradation for free);
 *   · hairline rule under the bar stays (the drafting idiom).
 *
 * All values are px at scale 1.0 — visual rhythm, not layout contract.
 */
export const COLLAPSE = {
  /** px of scroll where the collapse completes. */
  threshold: 72,
  /** how far the large title may drift up while fading (full motion only). */
  drift: 24,
  /** the large title is fully faded at this fraction of the threshold. */
  titleFadeAt: 0.75,
  /** the brand word's fade-out window (fractions of the threshold). */
  seatOut: [0.4, 0.75] as const,
  /** the collapsed title's fade-in window (fractions of the threshold). */
  seatIn: [0.55, 0.95] as const,
} as const;

/** Collapse progress at a scroll offset — 0 (open) → 1 (collapsed).
 * Pure, JS-safe (tests pin the clamp behavior). */
export function collapseProgress(scrollY: number): number {
  if (scrollY <= 0) return 0;
  if (scrollY >= COLLAPSE.threshold) return 1;
  return scrollY / COLLAPSE.threshold;
}
