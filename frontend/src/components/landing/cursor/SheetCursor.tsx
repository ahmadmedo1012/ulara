import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
/**
 * SheetCursor — the landing's cursor follower — the reference's DOT
 * grammar (r363 P2 fidelity gate: the r308 square instrument retired;
 * identity-level gap closed).
 *
 * GROUND TRUTH — measured, committed extraction
 * (docs/redesign/r350/reference/refsite.css; anatomy in
 * docs/redesign/r350/reference/REFERENCE.md §6; verdict spec in
 * docs/redesign/r363/evidence/p2-sheets-critique.md §4):
 *
 *   .cursor{z-index:999;pointer-events:none;justify-content:flex-start;
 *           align-items:flex-start;display:flex;position:fixed;inset:0%}
 *   .cursor-main{justify-content:center;align-items:center;width:0;
 *                height:0;display:flex;position:relative}
 *   .cursor-inner{opacity:0;background-color:#dd6013;border-radius:50%;
 *                 flex:none;width:.6rem;height:.6rem;transition:all .4s;
 *                 position:absolute}
 *   …plus `.cursor{display:none}` inside the touch/mobile belt, and
 *   NOT ONE `cursor:none` in the whole extraction — the reference
 *   never hides the native pointer; the dot is pure decoration.
 *
 * The behavior model (REFERENCE.md §6): the head (`.cursor-main`) is a
 * 0×0 point, transform-driven, following with easing (shared-ticker
 * lerp — r345 §A4 measured the decay ratio ≈0.55/100ms → per-frame
 * lerp 0.10, kept verbatim); the inner dot sits at OPACITY 0 AT REST
 * and appears + grows on INTERACTIVE hover only. Over plain ground —
 * at rest AND in motion — the committed model keeps the dot hidden
 * (opacity 0 is its only declared state); nothing shows there except
 * the native pointer. The extraction records NO press state, NO drawn
 * trail and NO mix-blend for the dot — none is implemented.
 *
 * Deviations forced by house law (documented, not silent):
 *  · `transition: all .4s` → an explicit property list on the tokens
 *    (`scripts/check-motion-tokens.sh` bans `transition: all` and raw
 *    durations outside the token sheets). 400ms has no house rung —
 *    `--t-fast` (320ms) is the closest; the dot's reveal/grow rides it.
 *  · The hover-grow magnitude is JS-owned in the reference's
 *    obfuscated bundle and NOT extractable from the committed CSS;
 *    `scale: 2.4` (0.6rem → ≈1.44rem bloom) is the documented
 *    inference, riding the same tokenized transition.
 *  · Colour: the extraction's literal ground is #dd6013; the one-
 *    signal law maps it to `var(--accent)` (the orange→signal swap is
 *    the owner-ruled ADAPT — p2 critique §4 delta table).
 *  · Suppression: the reference marks zones `data-cursor="hidden"`
 *    (hero wrap, ruler strip, partner controls, loader inner); Ulara's
 *    unified vocabulary (R311 §1.5) is `data-cursor="none"` — same
 *    seat, house token. Inside a suppressed zone the dot never lights,
 *    even over interactives (the zone's own instrument owns the
 *    pointer). `[data-cursor="link"]` stays an opt-in interactive seat.
 *
 * House ownership laws kept intact (R311):
 *  · ONE pointer system per route — this component unmounts fully on
 *    every other route; the app-level layer (CursorManager) is
 *    suspended for the whole landing route (App.tsx → RoutedCursorManager).
 *  · Fine pointer + hover only, never touch (component gate + the CSS
 *    belt mirroring the reference's own `display:none` touch rule).
 *  · Never under prefers-reduced-motion — render nothing; the native
 *    pointer is the complete fallback.
 *  · Keyboard focus is unaffected: the layer is aria-hidden,
 *    pointer-events: none, and its only state driver is pointer hover.
 *  · Wake/sleep: the follow rides the ONE shared clock (sheetConductor)
 *    and unsubscribes ~8 frames after the pointer settles — an idle
 *    page costs zero animation frames.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeSheetFrame, wakeSheet, lerp } from '../../../lib/motion/sheetConductor';
/* R333 P-D — the instrument's dedicated sheet (no !important in it) */
import '../../../styles/landing/cursor.css';

/* Follow constants — the reference's measured glide (r345 §A4: the
 * dot's gap to the pointer decays ≈0.55 per 100ms → per-frame lerp
 * 0.10). The dot's own reveal/grow is CSS-side (cursor.css tokens);
 * the JS pipeline moves the HEAD only, exactly like the reference
 * (transform-driven cursor-main; transition-bearing cursor-inner). */
const LERP_K = 0.10;
const IDLE_SLEEP_FRAMES = 8;
const IDLE_SETTLE_PX = 0.5; /* px — "the head has caught up" */
const IDLE_QUIET_MS = 120;

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, label, summary, [data-cursor="link"]';
const SUPPRESSED_SELECTOR = '[data-cursor="none"]';

export function SheetCursor() {
  const [live, setLive] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  /* ── Eligibility: fine pointer + hover, and never under reduced
   *     motion (the native cursor is the complete fallback). ─────── */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia(PREFERS_REDUCED_MOTION);
    const evaluate = () => setLive(fine.matches && !reduced.matches);
    evaluate();
    fine.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);
    return () => {
      fine.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  /* ── The instrument itself: runs only while eligible. ──────────── */
  useEffect(() => {
    if (!live) return undefined;
    const head = headRef.current;
    const dot = dotRef.current;
    if (!head || !dot) return undefined;

    /* mark the document so the zone seat rules (hero stage, loader)
     * apply only while the instrument is actually live. NOTE: the
     * native cursor is NEVER hidden — the extraction carries no
     * cursor:none anywhere; data-sheet-cursor gates no hiding. */
    document.documentElement.dataset.sheetCursor = 'live';

    /* ── pointer state (refs — zero React renders per event) ─────── */
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let hasMoved = false;
    let overInteractive = false;
    let suppressed = false;
    let dotVisible = false;
    let idleFrames = 0;
    let lastMoveAt = 0;
    let unsubFrame: (() => void) | null = null;

    /* the dot's only states: hidden (rest / plain ground / suppressed
     * zones) and lit+grown (interactive seats) — both are CSS
     * transitions on the element; JS only flips the attribute. */
    const setDotState = () => {
      const show = overInteractive && !suppressed && hasMoved;
      if (show !== dotVisible) {
        dotVisible = show;
        dot.dataset.on = show ? 'on' : 'off';
      }
    };

    /* ── the frame: ease the head toward the pointer, then sleep ─── */
    const frame = (now: number) => {
      pos.x = lerp(pos.x, target.x, LERP_K);
      pos.y = lerp(pos.y, target.y, LERP_K);
      head.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

      /* sleep when the pointer has settled — the system unsubscribes
       * itself and costs nothing until the next movement wakes it. */
      const settled = Math.hypot(target.x - pos.x, target.y - pos.y) < IDLE_SETTLE_PX;
      if (hasMoved && now - lastMoveAt > IDLE_QUIET_MS && settled) {
        idleFrames += 1;
        if (idleFrames >= IDLE_SLEEP_FRAMES && unsubFrame) {
          unsubFrame();
          unsubFrame = null;
        }
      } else {
        idleFrames = 0;
      }
    };

    const wake = () => {
      if (!unsubFrame) {
        unsubFrame = subscribeSheetFrame(frame);
      } else {
        wakeSheet();
      }
    };

    /* ── listeners ────────────────────────────────────────────────── */
    /* R311 §1.6 (initial pointer entry): the boundary events can fire
     * BEFORE the first pointermove (a pointer entering the viewport
     * straight onto a link), so the move handler owns the state as
     * well — every move re-derives interactive/suppressed from its
     * own target and re-evaluates. No press listeners: the extraction
     * records no press state for the dot. */
    const onPointerMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      lastMoveAt = performance.now();
      hasMoved = true;
      const el = e.target instanceof Element ? e.target : null;
      if (el && typeof el.closest === 'function') {
        overInteractive = !!el.closest(INTERACTIVE_SELECTOR);
        suppressed = !!el.closest(SUPPRESSED_SELECTOR);
      }
      setDotState();
      idleFrames = 0;
      wake();
    };

    const onPointerOver = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || typeof el.closest !== 'function') return;
      overInteractive = !!el.closest(INTERACTIVE_SELECTOR);
      suppressed = !!el.closest(SUPPRESSED_SELECTOR);
      setDotState();
    };

    const onVisibility = () => {
      if (document.hidden && unsubFrame) {
        unsubFrame();
        unsubFrame = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (unsubFrame) unsubFrame();
      delete document.documentElement.dataset.sheetCursor;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [live]);

  if (!live) return null;

  /* The reference's exact anatomy: fixed layer → 0×0 transform-driven
   * head → the round inner dot (cursor.css carries the committed
   * values). One element per seat — no second layer anywhere. */
  return (
    <div className="sc-cursor" aria-hidden="true">
      <div ref={headRef} className="sc-cursor-head">
        <div ref={dotRef} className="sc-cursor-dot" data-spec="cursor.dot" data-on="off" />
      </div>
    </div>
  );
}
