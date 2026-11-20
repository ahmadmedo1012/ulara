/**
 * engineSync — the scrubber-sync seam (the entry-safe half of the
 * motion engine).
 *
 * The guest scroll engine (sheetLenis — imported eagerly by App.tsx
 * for every public route) must never pull gsap + ScrollTrigger into
 * the ENTRY chunk: the scrubber only exists on the landing, and the
 * landing is a lazy route. This module is the two-sided hook:
 *
 *  · the scroll engine calls `syncScrubber()` on every Lenis scroll
 *    event (the canonical Lenis↔ScrollTrigger integration point);
 *  · the landing's motion engine (lib/motion/engine.ts — the heavy
 *    half, which rides the LandingPage chunk) binds the real
 *    `ScrollTrigger.update` through `bindScrubSync()` when the
 *    journey mounts.
 *
 * Before the binding (other public routes, the pre-mount frame) the
 * sync is a no-op — the scrubber doesn't exist yet, exactly right.
 * No global state beyond the one function slot; nothing to clean up.
 */
export type ScrubSync = () => void;

let sync: ScrubSync | null = null;

/** Bind the real scrubber update (the landing's engine does this once
 *  per session — rebinding is idempotent by construction). */
export function bindScrubSync(fn: ScrubSync): void {
  sync = fn;
}

/** The scroll engine's per-event scrubber sync (no-op until bound). */
export function syncScrubber(): void {
  sync?.();
}
