import { PREFERS_REDUCED_MOTION } from '../lib/motion-media';
/**
 * reveals — R333 (P-C) — the ONE scroll-reveal recipe for the landing's
 * second half, riding the HOUSE reveal contract (the retired craft sheet §2 themes
 * 6–7: a single reused grammar with hierarchy from SCALE, never from
 * recipe proliferation).
 *
 * ── The house contract (shared.css `.reveal-up` / `.reveal-d-N`) ─────
 *   `.reveal-up`          opacity 0 + translateY(14px)
 *   `.reveal-up.in-view`  opacity 1 + translateY(0)
 *   transition            800ms cubic-bezier(.25,.46,.45,.94)
 *                         ← r345 §B2: the landing reveal register re-seats
 *                         to the freshly measured canonical (0.8s
 *                         power2.out — the live tween census, 40/60);
 *                         same register .reveal-rise-h already carries.
 *                         Hover/press micro-motions keep the house rungs.
 *   `.reveal-d-1..5`      transition-delay 80/160/240/320/400ms
 *   `.reveal-card`        this sheet's card rung (below): scale
 *                         0.8→1 + fade on var(--motion-duration-card)
 *
 * Why classes, not a JS animation library: the motion-tokens gate
 * scans .ts too — raw durations/easings in TS are gate violations —
 * and the repo's canonical reveal grammar is CSS-class-driven
 * (hooks/useReveal.ts: the belt writes `.in-view`, CSS owns the
 * tween). This module is that same vocabulary, applied imperatively
 * to markup P-C could not wrap in RevealCssClass without touching
 * twin-locked JSX: ONE IntersectionObserver pair, classes only.
 *
 * ── Grammar (the measured staggers) ─────────────────────────────────
 *   lines  (display headings)   whole-block, .reveal-d-N = 80ms steps
 *   items  (list rows, lede…)   whole-block, 80ms steps within group
 *   cards  (drawn art panels)   .reveal-card scale 0.8→1 + fade
 *
 * ── ARABIC SHAPING SAFEGUARD (non-negotiable) ───────────────────────
 * Arabic is cursive: word/char splitting produces ISOLATED letter
 * forms, and even line-level splitting was measured live (r333
 * evidence) to corrupt the RTL CTA title (a trailing «؟» isolated on
 * its own line + an empty <em> shell). Every element animates as ONE
 * whole block (y/opacity/scale); words are never split into spans.
 * (The SplitText plugin was retired with this rewrite — its only
 * landing target was Arabic, so the ~9KB gz bought nothing.)
 *
 * ── Progressive enhancement + reduced motion ────────────────────────
 * Content ships VISIBLE: the `.reveal-up`/`.reveal-card` classes are
 * ADDED BY THIS MODULE (never authored in JSX/CSS), so a failed import
 * or JS death can never hide copy. Under prefers-reduced-motion
 * initReveals() bails entirely before adding anything (the reveals.css
 * belt enforces the same outcome defensively).
 *
 * ── Idempotency / lifecycle ─────────────────────────────────────────
 * window.__ulaReveals guards double init; destroy() disconnects the
 * observers, removes every class this module added and the armed root
 * class — safe for landing remounts (React 18 double-effect included).
 *
 * ── R339 T-11b1 — the fling/jump hardening (the deadlock fix) ──────
 * A one-shot IO alone permanently hides content on jumps — the same
 * blind spot hooks/useReveal.ts quantified live (28/39 stuck on an
 * instant jump): an element that hops from below the root to fully
 * ABOVE the viewport between observation frames never changes its
 * intersection state, so the IO delivers no isIntersecting entry and
 * the element stays armed `opacity: 0` forever (measured: 32 elements
 * on a plain top→bottom jump — the CTA title, the problem columns,
 * the chapters heading, every product row). Two seats close it:
 *   1. IO clause — a non-intersecting entry whose rect is fully above
 *      the viewport means the user flung past it → reveal (the belt's
 *      own clause (b), verbatim);
 *   2. settle belt — a scroll-quiet debounce (120ms, the R319 §E-13
 *      discipline) that reveals any pending element whose rect is
 *      fully above the viewport OR inside it (the -12/-15% rootMargin
 *      dead zone at the fold: a peeking element the shrunk root can
 *      never intersect). Deliberately NOT keyed on scrollend — layout
 *      clamping and engine-resync scrolls fire `scroll` with no
 *      scrollend (the useReveal T-11b1 trap); plain scroll-quiet is
 *      the only tail that always comes. A reveal must never hold
 *      content below its start.
 *
 * ── r363 — the late-mount seam (the lazy-chunk fix) ─────────────────
 * initReveals() runs ONCE at the landing's mount — but the landing's
 * second half (Vision, Roles, Chapters, Product and the FOOTER with
 * its skyline strip and giant wordmark) rides React.lazy boundaries
 * and mounts AFTER this pass. Those elements were never armed, never
 * observed: `.fo-fstrip` never received `.in-view`, and footer.css
 * keys the skyline's armed clip off the ROOT seam class
 * (`.js-reveal-armed .fo-strip-media`) — so the strip stood at
 * `inset(100% 0 0 0)` forever for JS-on visitors: the round's own
 * 1440 footer capture shows the band blank. The engine now keeps one
 * debounced MutationObserver: any element matching a family selector
 * that mounts later is armed on the spot — same classes, same IO
 * bucket, same pending pool — so a root-class-keyed CSS armed state is
 * now GUARANTEED its release, whenever its section happens to mount.
 */

/** Root seam class — added BEFORE any hiding class lands (the arm order). */
const ARMED_CLASS = 'js-reveal-armed';

/** Grammar targets — the landing's second half (P-C sheets). */
const LINES_SEL = '.fo-cta-title'; // display heading → whole-block rise
const ITEM_SEL =
  '.pm-col, .rl-row, .fo-cta-lede, .fo-cta-actions, .fo-cta-meta';
/* P-A2 R333 — the #product proof strip's panels joined the card rung:
   the .pr-shot figures get row 13's imgCardReveal (scale 0.8→1) on the
   same IO pair + RM bail as the drawn panels. */
const CARD_SEL = '.pm-artzone .pm-art, .fo-cta-sketch, .pr-shots .pr-shot'; // drawn panels + the product-proof shots
/* ── R339 T-11b — the footer's reference-register rise (work-list #1: the
   biggest single gap, 107 els × 2 props). The six structural blocks
   (column stacks, ink strip, © bar) ride `.reveal-rise-h` — shared.css's
   800ms/power2.out seat — with the module's 20ms stagger ladder written
   inline at intersect time. `.reveal-up` rides along for the instrument
   grammar + the house once:true contract; the rise seat wins the
   cascade (later in shared.css). The fold's LAST three blocks take the
   `--ty` variant (instant opacity — run.mjs's final snapshot lands
   mid-fade on their 800ms opacity otherwise; see shared.css). Targets
   deliberately avoid census-pinned transition seats (.fo-mark,
   .fo-col3, .fo-form, bgroup.2 keep their recorded transitions).
   r363 (R21) — `.fo-giant-banner`, the giant wordmark row, joins the
   family: it is the footer's last structural block and the ruling's
   "scroll reveal" reaches the wordmark like every sibling (the accent
   fill twin rides inside — one whole-block rise, no inner splits). ── */
const RISE_SEL = '.fo-c1-top, .fo-c2-top, .fo-c2-bottom, .fo-giant-banner';
const RISE_TY_SEL = '.fo-c1-sub, .fo-fstrip, .fo-footer-bottom';
/** the rise family's stagger step — the reference's recorded 20ms ladder. */
const RISE_STAGGER_MS = 20;

/* ── R339 T-11b1 — the intro band's own beat (work-list #3: intro 0/2,
   16×2 units). The census records the SAME rise shape at a different
   clock there — 600ms power2.out, 4ms stagger (roles intro-partner /
   intro / intro-partner-label) — so the band rides `.reveal-rise-h
   --beat` (shared.css's 600ms modifier) with the module's 4ms ladder
   on the same inline --rise-h-delay. The set: the ticker's label
   trio + both arrows, the crawl cells (the five documented
   universities + their seamless-loop twins), and the disclosure pair
   — LEAF level only (no parent+child seats: nested rises compound). */
const BEAT_SEL =
  '.st-plabel, .st-plabel-rule, .st-plabel-toprule, .st-parrow, .st-crawl-cell, .st-desc-text, .st-desc-rule';
/** the intro band's stagger step — the reference's recorded 4ms ladder. */
const BEAT_STAGGER_MS = 4;

/* ── R339 T-11b1 — the usecase rules (work-list #2: the width + scaleX
   groups). The reference records width 0→auto on the accordion rows' rule
   children (16 units) and a scaleX 0→1 draw on the frame pair (2
   units). Our counterparts ride roles.css keyframe seats — the -w
   widen on each row's bottom hairline, the -x draw on the section
   frame's top/bottom rules — armed here, `.in-view` is the single
   state write, once:true (same belt as everything above). */
const RULE_W_SEL = '.rl-row-rule-b';
const RULE_X_SEL = '.rl-rule-top, .rl-rule-bottom';

interface RevealsHandle {
  destroy(): void;
}

interface RevealsWindow extends Window {
  __ulaReveals?: RevealsHandle;
}

const OBSERVER_ROOT_MARGIN_LINES = '0px 0px -15% 0px'; // the 85% entry line
const OBSERVER_ROOT_MARGIN_ITEMS = '0px 0px -12% 0px'; // the 88% entry line

/* ── r363 — the family table ─────────────────────────────────────────
 * One declarative table drives BOTH passes (the mount-time sweep and
 * the late-mount rescan): selector, the hiding classes the family
 * arms (module-added only — the progressive-enhancement contract),
 * and the IO root-margin bucket (the house bucket rule). The two
 * keyed families keep their per-element class decision (the --ty
 * variant, the -w/-x pair). */
interface Family {
  sel: string;
  classes(el: Element): string[];
  margin: string;
}

const FAMILIES: Family[] = [
  /* Lines — display headings, whole blocks, 80ms steps. */
  { sel: LINES_SEL, classes: () => ['reveal-up'], margin: OBSERVER_ROOT_MARGIN_LINES },
  /* Items — rows and copy blocks (y-only + fade: no x — direction-safe
   * in RTL; groups enter as one beat with internal stagger). */
  { sel: ITEM_SEL, classes: () => ['reveal-up'], margin: OBSERVER_ROOT_MARGIN_ITEMS },
  /* Cards — the reference imgCardReveal: scale 0.8→1 + fade. Scale and
   * opacity only — direction-agnostic. */
  { sel: CARD_SEL, classes: () => ['reveal-card'], margin: OBSERVER_ROOT_MARGIN_LINES },
  /* T-11b — the footer rise: the structural blocks on the reference
   * register; the last three add `--ty` (instant opacity, rise-only). */
  {
    sel: `${RISE_SEL}, ${RISE_TY_SEL}`,
    classes: (el) => {
      const cls = ['reveal-up', 'reveal-rise-h'];
      if (RISE_TY_SEL.split(', ').some((s) => el.matches(s.trim()))) {
        cls.push('reveal-rise-h--ty');
      }
      return cls;
    },
    margin: OBSERVER_ROOT_MARGIN_ITEMS,
  },
  /* T-11b1 — the intro beat: the SAME rise seat at the band's own
   * clock (--beat modifier) + its own ladder step. */
  {
    sel: BEAT_SEL,
    classes: () => ['reveal-up', 'reveal-rise-h', 'reveal-rise-h--beat'],
    margin: OBSERVER_ROOT_MARGIN_ITEMS,
  },
  /* T-11b1 — the usecase rules: the rows' bottom hairlines WIDEN
   * (.rl-rule-w), the frame pair DRAWS (.rl-rule-x). Keyframe seats —
   * `.in-view` fires them; they ride the lines entry margin with the
   * headings. */
  {
    sel: `${RULE_W_SEL}, ${RULE_X_SEL}`,
    classes: (el) => [el.matches(RULE_X_SEL) ? 'rl-rule-x' : 'rl-rule-w'],
    margin: OBSERVER_ROOT_MARGIN_LINES,
  },
];

/** The late-mount rescan's debounce — one sweep per quiet 60ms, no
 * matter how many chunks mount in a burst. */
const RESCAN_QUIET_MS = 60;

export function initReveals(): RevealsHandle {
  const noop: RevealsHandle = { destroy() {} };
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return noop;
  }
  const w = window as RevealsWindow;
  if (w.__ulaReveals) return w.__ulaReveals; // idempotent — never double-arm
  if (window.matchMedia(PREFERS_REDUCED_MOTION).matches) {
    return noop; // RM: bail entirely — content stays in final state
  }

  // The ARM SEAM comes first: root class, then hiding classes, then observers.
  document.documentElement.classList.add(ARMED_CLASS);

  const observers: IntersectionObserver[] = [];
  /** every class this module added — destroy() removes exactly these. */
  const touched: Array<{ el: Element; cls: string }> = [];
  /** everything this module has SEEN — the rescan admits only new nodes. */
  const seen = new WeakSet<Element>();
  /** every armed-but-unrevealed element, across both passes. */
  const pending: Element[] = [];

  const arm = (el: Element, cls: string) => {
    el.classList.add(cls);
    touched.push({ el, cls });
  };

  /** The reveal write: `.in-view` — the ONLY state change the grammar
   * needs; the transition lives in shared.css/reveals.css. The stagger
   * rides the house `.reveal-d-N` delay classes, assigned HERE (at
   * intersect time, within the entering batch — document order, capped
   * at d-5) so an element entering alone never waits on a group index.
   * T-11b — rise-family elements take the reference ladder instead
   * (inline `--rise-h-delay`, consumed by the rise seat's transition
   * shorthand; never the .reveal-d-N longhand, which would fight it);
   * T-11b1 — the intro beat rides its own 4ms step (not the footer's
   * 20ms) on the same custom property. */
  const revealBatch = (els: Element[]) => {
    els.forEach((el, i) => {
      if (el.classList.contains('reveal-rise-h')) {
        const stepMs = el.classList.contains('reveal-rise-h--beat')
          ? BEAT_STAGGER_MS
          : RISE_STAGGER_MS;
        (el as HTMLElement).style.setProperty(
          '--rise-h-delay',
          `${i * stepMs}ms`,
        );
      } else {
        const step = Math.min(i, 5);
        if (step > 0) arm(el, `reveal-d-${step}`);
      }
      el.classList.add('in-view');
    });
  };
  const reveal = (el: Element) => el.classList.add('in-view');

  /** Fling/scroll-restoration belt — anything already above the fold
   * line when we arm settles instantly (no entrance for passed content);
   * a reveal must never hold content below its start. */
  const isPassed = (el: Element) =>
    el.getBoundingClientRect().bottom <= 0 ||
    el.getBoundingClientRect().top < window.innerHeight * 0.12;

  /** ONE observer per root-margin bucket (the house bucket rule —
   * hooks/useReveal.ts): entries sharing a margin share one IO. The
   * late-mount rescan reuses the SAME buckets — no observer
   * proliferation when chunks trickle in. */
  const buckets = new Map<string, IntersectionObserver>();

  function observe(els: Element[], rootMargin: string) {
    if (!els.length) return;
    let io = buckets.get(rootMargin);
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          const batch = entries
            /* T-11b1 — the flung-past clause (the belt's (b), verbatim):
             * a non-intersecting entry fully above the viewport means the
             * user jumped past this element between observation frames;
             * one-shot semantics: passed ⇒ revealed. */
            .filter((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)
            .map((e) => e.target)
            .sort(byDocumentOrder);
          if (batch.length) {
            revealBatch(batch);
            batch.forEach((el) => {
              const i = pending.indexOf(el);
              if (i >= 0) pending.splice(i, 1);
            });
          }
          batch.forEach((el) => {
            const b = buckets.get(rootMargin);
            b?.unobserve(el); // once:true — never replays
          });
        },
        { rootMargin },
      );
      buckets.set(rootMargin, io);
      observers.push(io);
    }
    els.forEach((el) => io!.observe(el));
  }

  /* ── The admit pass — shared by mount-time and late-mount ──────────
   * For one family: take the not-yet-seen elements, mark them seen,
   * reveal whatever is already passed (no entrance for passed
   * content), arm + observe the rest, and join the pending pool. */
  function admit(family: Family) {
    const els = toArray(document, family.sel).filter((el) => !seen.has(el));
    if (!els.length) return;
    els.forEach((el) => seen.add(el));
    const passed = els.filter(isPassed);
    passed.forEach(reveal);
    const waiting = els.filter((el) => !isPassed(el));
    waiting.forEach((el) => {
      family.classes(el).forEach((cls) => arm(el, cls));
    });
    observe(waiting, family.margin);
    pending.push(...waiting);
  }

  /* ── Mount-time pass ─────────────────────────────────────────────── */
  FAMILIES.forEach(admit);

  /* ── T-11b1 — the pending pool + the settle belt ─────────────
   * Every armed-but-unrevealed element, rescued by scroll-quiet (see
   * the header block). The pool drains as the IO reveals (and grows
   * again when the rescan admits late mounts). */
  const SETTLE_QUIET_MS = 120;
  let settleTimer = 0;
  const settle = () => {
    settleTimer = 0;
    if (!pending.length) return;
    const vh = window.innerHeight;
    const rescued: Element[] = [];
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const r = pending[i]!.getBoundingClientRect();
      /* fully above the viewport (flung past) or inside it (the
       * rootMargin dead zone at the fold) — the same rule the belt's
       * reconcile holds: docTop - scrollY < vh. */
      if (r.bottom <= 0 || r.top < vh) {
        rescued.push(pending[i]!);
        pending.splice(i, 1);
      }
    }
    if (rescued.length) revealBatch(rescued.sort(byDocumentOrder));
  };
  const onScrollQuiet = () => {
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, SETTLE_QUIET_MS);
  };
  window.addEventListener('scroll', onScrollQuiet, { passive: true });

  /* ── r363 — the late-mount seam ────────────────────────────────────
   * The lazy chunks (Vision, Roles, Chapters, Product, the footer)
   * mount after this pass; a debounced MutationObserver re-admits
   * through the SAME table so their elements arm, observe, and reveal
   * exactly like mount-time ones. Debounced because a chunk mount
   * inserts many nodes at once — one sweep per quiet 60ms. */
  let rescanTimer = 0;
  const rescan = () => {
    rescanTimer = 0;
    FAMILIES.forEach(admit);
  };
  const scheduleRescan = () => {
    if (rescanTimer) return;
    rescanTimer = window.setTimeout(rescan, RESCAN_QUIET_MS);
  };
  const mo = new MutationObserver(scheduleRescan);
  mo.observe(document.body, { childList: true, subtree: true });

  function toArray(doc: Document, sel: string): HTMLElement[] {
    return Array.from(doc.querySelectorAll<HTMLElement>(sel));
  }

  /** document-order sort for batch staggers (RTL-safe: top before
   * bottom; horizontal order never matters — no x motion). */
  function byDocumentOrder(a: Element, b: Element): number {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  }

  const handle: RevealsHandle = {
    destroy() {
      observers.forEach((io) => io.disconnect());
      buckets.clear();
      mo.disconnect();
      if (rescanTimer) window.clearTimeout(rescanTimer);
      if (settleTimer) window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScrollQuiet);
      touched.forEach(({ el, cls }) => el.classList.remove(cls));
      document.documentElement.classList.remove(ARMED_CLASS);
      delete w.__ulaReveals;
    },
  };
  w.__ulaReveals = handle;
  return handle;
}
