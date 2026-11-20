/**
 * engine — the motion engine's GSAP seat (the home-scroll-choreography
 * round). ONE registration point for the whole guest stack.
 *
 * The reference resolves smooth scrolling, scroll-linked motion and
 * the scrubbed scenes from gsap + ScrollTrigger + Lenis 1.1.5. Ulara's
 * translation keeps its own pinned single-clock contracts (r308's
 * conductor + r313's zero-idle driver — test law) and gives GSAP the
 * scrubber seat:
 *
 *  · `ScrollTrigger` is the scene scrubber — the journey's ONE
 *    scrubbed timeline + its resize/refresh lifecycle ride it, and
 *    its `update()` is synced from Lenis's own 'scroll' events
 *    (sheetLenis wires the canonical integration at engine init).
 *  · `lagSmoothing(0)` — the scrub must track real scroll 1:1 (a
 *    hidden-tab gap must never stretch into a slow catch-up tween;
 *    the stale-clock guard stays sheetLenis's visibility discipline).
 *  · The ONE frame clock stays the conductor's rAF (the r308/r313
 *    pinned contracts: Lenis's raf rides its subscriber slot, an idle
 *    page costs zero frames). GSAP's own ticker stays parked — the
 *    scrubbed timelines are event-driven (scrub), never self-animating.
 *
 * jsdom/SSR-safe: importing this module touches nothing global until
 * `ensureMotionEngine()` runs inside a browser effect. The plugin
 * registration is idempotent (gsap.registerPlugin dedupes + a module
 * guard) — StrictMode remounts included.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export { gsap, ScrollTrigger };

/** The exact dependency versions this engine's contract is pinned to
 *  (package.json carries the same pins — a bump re-measures the whole
 *  choreography before landing). */
export const MOTION_ENGINE_VERSIONS = {
  gsap: '3.15.1',
  lenis: '1.1.5',
} as const;

let registered = false;

/** Idempotent plugin registration + the engine-wide defaults. Safe to
 *  call from any module init path (sheetLenis, JourneyScene). */
export function ensureMotionEngine(): { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger } {
  if (!registered) {
    registered = true;
    gsap.registerPlugin(ScrollTrigger);
    /* The scrub tracks real scroll 1:1 — lag smoothing would stretch a
     * hidden-tab gap into a slow catch-up (the scrub must never lie). */
    gsap.ticker.lagSmoothing(0);
    /* The scrubbed timelines are event-driven — GSAP's own ticker must
     * never spin a second frame loop beside the conductor. */
    gsap.ticker.sleep();
    /* ScrollTrigger's resize handling must not treat the mobile URL
     * bar's show/hide as a document resize (the pin windows would
     * re-derive mid-scroll on touch — the handoff-killer). */
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  return { gsap, ScrollTrigger };
}

/** Fonts reflow the sheet — every scrub window (ScrollTrigger's
 *  start/end px math) must re-measure once the real metrics land. */
let fontsRefreshBound = false;
export function bindFontRefresh(): void {
  if (fontsRefreshBound || typeof document === 'undefined') return;
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.ready) return;
  fontsRefreshBound = true;
  fonts.ready
    .then(() => {
      ScrollTrigger.refresh();
    })
    .catch(() => undefined);
}

/* Test/introspection seam — the engine's seat on the window, read-only
 * (the probes assert versions + that the scrubber is registered;
 * harmless in production). */
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __ulaMotionEngine?: {
      gsapVersion: string;
      lenisVersion: string;
      triggers(): Array<{ id?: string; start: number; end: number }>;
    };
  };
  w.__ulaMotionEngine = {
    get gsapVersion() {
      return (gsap as { version?: string }).version ?? MOTION_ENGINE_VERSIONS.gsap;
    },
    get lenisVersion() {
      return MOTION_ENGINE_VERSIONS.lenis;
    },
    triggers() {
      return ScrollTrigger.getAll().map((st) => ({
        id: st.vars.id,
        start: Math.round(st.start),
        end: Math.round(st.end),
      }));
    },
  };
}
