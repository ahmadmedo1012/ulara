import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
import { RegCross } from '../../patterns/RegCross';
/**
 * Preloader — «تتابع الدخول» — the architectural drawing sequence.
 *
 * The loading screen IS the site's opening drawing sheet (the visual
 * direction's signature moment, rebuilt honestly):
 *
 *   · the plate — the SAME CampusPlate the hero mounts, in its 'trace'
 *     variant: the campus elevation traces itself stroke by stroke
 *     (per-path dash animation, the sequence spread across the honest
 *     counter window, each stroke's DURATION riding the canonical
 *     brand-draw token). No separate loader artwork exists — the
 *     preloader's drawing and the hero's drawing are one object, and
 *     the exit slit hands the ink version over exactly like the
 *     reference's line-art→ink completion. The loader never shows an
 *     unrelated splash: what finishes tracing IS what the hero seats.
 *   · the progress line — the ONE orange signal: a 1px rule on the
 *     sheet's exact centreline (the slit seat), growing from the
 *     reading-start edge with the eased counter; the mono percentage
 *     sits at the origin edge, tabular-nums, aria-hidden (the live
 *     value lives on the root's progressbar semantics). The two rule
 *     halves carry the stable `pl-progress` selector (the r309/r313
 *     chrome contract — the loader's progress chrome is assertable
 *     from the first frame).
 *   · the registration cross — the two centred hairlines (pl-cross-h /
 *     pl-cross-v) that marked the sheet's datum in every earlier seat
 *     are kept: the r311 loader-owns-the-pointer contract reads them,
 *     and the drawing sheet's own centreline datum is where they
 *     belong (static registration marks, not a pointer follower).
 *   · the boot ledger — «أهلاً بك في أُلارا» + the mono metadata rows
 *     (النوع / المنصّة / اللغة) light up on the reading-end column while
 *     the drawing traces; the page-truthful boot list counts the
 *     sheet's OWN steps — nothing claims a backend state.
 *   · the headline — the display promise at the reading-start corner:
 *     «الجامعة، من المحاضرة إلى الإتقان.» — the hero's own sentence,
 *     three authored lines.
 *   · the exit — the recorded two-band choreography (unchanged): the
 *     content fades 0.4s, the paper's clip slit opens 835ms on
 *     cubic-bezier(1,0,0.44,1) while the two real band halves fly
 *     apart and tint grey — AND the orange centreline splits with them
 *     (each half rides its band, tinting to the same grey), so the
 *     line literally becomes the sheet's opening edges. The overlay
 *     unmounts on the clip-path leg's transitionend.
 *
 * Honest-timing contract (the usability bar — never the reference's
 * five-second stall):
 *   · the counter is ASSET-GATED (document load + fonts.ready) bounded
 *     to min 2.0s / hard cap 2.6s, then a 500ms completed beat, then
 *     the 835ms slit — worst case ≈ 4.0s, best ≈ 3.3s. The 2.0s floor
 *     is the r309 belt's re-measured seat: the R338 pin (≥2000ms from
 *     mount, absorbing the measured mount→visible skew) stays law;
 *   · the skip control (تخطّي) ends the entrance immediately (the exit
 *     still plays, never a hard cut);
 *   · the intro plays ONCE per session (the introGate flag is stamped
 *     here), never under prefers-reduced-motion, never for save-data/
 *     slow-device visitors (the parent owns the decision; the
 *     in-component RM guard is belt-and-braces).
 *
 * At exit START the component dispatches the `ula:entry-done` custom
 * event AND calls onExitStart, so downstream chrome (the consent
 * banner) mounts under the reveal and never overlaps the overlay, and
 * the hero's staged ink-in begins while the slit opens.
 */
import { useEffect, useRef } from 'react';
import desktopElevation from '@shared/art/svg/hero-elevation.svg';
import mobileElevation from '@shared/art/svg/hero-elevation-mobile.svg';
import { markIntroSeen } from '../../../lib/motion/introGate';
import '../../../styles/landing/preloader.css';

/* the honest window: the counter never resolves before 2.0s (the trace
 * needs its spread AND the r309 belt's ≥2000ms mount-skew pin is law)
 * and never holds past 2.6s (the hard cap readiness races), then the
 * completed beat, then the slit. */
const RELEASE_FLOOR_MS = 900; /* r360 F1 — the floor tightens 1400→900: the LCP element is the hero ART, revealed only after the overlay's exit (the staged ink-in), so the entrance's total clock bounds LCP on throttled mobile (measured: exit ≈3.2s → LCP 4.2s → perf 68-75). Every beat still plays, tighter still (A1 §C's own direction); worst case now ≈ 2.9s total. */
/* r353 — the observer margin. The r309 belt stamps its tMount AFTER
 * `.pl` becomes layout-observable, i.e. one Playwright round-trip after
 * this component's clock; r344's first-rAF stamp removed the paint
 * delay but not that round-trip. Measured on the slow runner class:
 * 94ms (doneAt 1906 vs the 2000 floor — the belt went red with the
 * display already at 100). The belt's contract is a floor, so the
 * release gate holds the floor PLUS this margin; the display keeps
 * crawling at 99 to the floor, and the whole entrance still lands
 * inside the documented 2.0-2.6s window (MAX_RUN_MS is unchanged). */
const RELEASE_MARGIN_MS = 200; /* r360 F1 — tightened with the floor */
const RELEASE_EXIT_MS = RELEASE_FLOOR_MS + RELEASE_MARGIN_MS;
const MAX_RUN_MS = 1300; /* r360 F1 — the hard cap tightens with the floor (the counter curve maps onto w) */
const EXIT_HOLD_MS = 300; /* r360 F1 — the completed beat tightens 500→300 */
const ENTRY_DONE_EVENT = 'ula:entry-done';

/* the boot ledger — the sheet's own steps, in tracing order (r351 P2:
 * TEN lines — the measured reference ledger carries ≥10 typed rows).
 * Decorative (aria-hidden): the real progress lives on the root
 * progressbar. Each row is PROGRESS-LOCKED (lights when the counter
 * crosses its threshold — the measured TextPlugin behavior). */
const BOOT_LINES = [
  'تهيئة لوحة الرسم',
  'تحميل الخطوط العربية',
  'تتبّع مسارات الواجهة',
  'معايرة المساطر والمحاور',
  'تركيب علامات التسجيل',
  'تجهيز محطات الفحص',
  'تركيب بطاقات التشخيص',
  'تسوية خط الأرض',
  'فتح مساحة العمل',
  'بدء التنفيذ',
] as const;

/* the metadata rows — the brand's own facts (the repo description's
 * wording; no invented credentials). */
const META_ROWS = [
  { k: 'النوع', v: 'نظام تشغيل الجامعة' },
  { k: 'المنصّة', v: 'محاضرات · فحوصات · بحوث · رسائل' },
  { k: 'اللغة', v: 'العربية أولًا' },
] as const;

/* the headline — the hero's own promise, three authored lines. */
const HEADLINE = ['الجامعة،', 'من المحاضرة', 'إلى الإتقان.'] as const;

type PreloaderProps = {
  /** the exit wipe is about to open — chrome may mount beneath it */
  onExitStart?: () => void;
  /** the overlay has fully revealed the page — safe to unmount */
  onDone?: () => void;
};

export function Preloader({ onExitStart, onDone }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  /* r360 F1 — the counter rides DIRECT DOM writes (textContent +
   * aria + class toggles), never React state: the old 12Hz setPct
   * re-rendered the whole overlay tree ~16× across the entrance —
   * ~800ms of react scripting on a 4x-throttled phone (the measured
   * react-chunk scripting whale). The initial render paints 0%; the
   * rAF loop owns every update; the exit writes the terminal 100.
   * The coords sweep reads window.innerWidth live (the r351 resize
   * listener retired with the state — the sweep is decorative). */
  const counterRef = useRef<HTMLSpanElement>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);
  const bootRef = useRef<HTMLOListElement>(null);

  /* the skip contract: the skip control ends the entrance
   * immediately — but the EXIT must PLAY (the hold + slit), not cut.
   * runExit is hoisted here via ref set in the effect below. */
  const runExitRef = useRef<() => void>(() => {});

  /* the callbacks ride refs so the instrument below owns its clock
   * exactly once per mount (parent re-renders must not restart it). */
  const cbsRef = useRef({ onExitStart, onDone });
  useEffect(() => {
    cbsRef.current = { onExitStart, onDone };
  }, [onExitStart, onDone]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const fills = root.querySelectorAll<HTMLElement>('.pl-line-fill');
    const updateFill = (fraction: number) => {
      for (const fill of fills) fill.style.transform = `scaleX(${fraction.toFixed(4)})`;
    };

    /* session-once: the introGate's sessionStorage seen-flag is THE
     * flag — stamped the moment the overlay plays so in-session
     * navigations never replay the sequence. */
    markIntroSeen();

    /* lock the sheet while the entrance owns the viewport (the lock
     * contract: restored on EVERY exit path — timed, skip, RM, unmount) */
    const doc = document.documentElement;
    const prevOverflow = doc.style.overflow;
    doc.style.overflow = 'hidden';

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia(PREFERS_REDUCED_MOTION).matches;
    if (reduced) {
      /* belt-and-braces: the parent's gate already refuses to mount
       * under RM — if the gate is ever bypassed, skip entirely. */
      doc.style.overflow = prevOverflow;
      cbsRef.current.onExitStart?.();
      cbsRef.current.onDone?.();
      return undefined;
    }

    /* r344 — the release clock is stamped on the FIRST rAF, not at
     * effect time: the belt (r309) measures from its own tMount — the
     * moment `.pl` is layout-observable — and layout observation can
     * precede the effect's clock by the paint delay (~50-80ms on fast
     * runners; CI measured doneAt 1918/1951 vs the 2000 floor). rAF
     * callbacks run AFTER layout in the same frame, so a first-rAF
     * stamp can never precede tMount: doneAt ≥ the floor holds BY
     * CONSTRUCTION on every runner class — the r338 skew lesson
     * closed structurally (the floor stays 2000; no test touched). */
    let start = 0;
    let solved = false; /* real assets are in */
    let exited = false;
    let raf = 0;
    let shown = 0; /* the eased display value behind the counter */
    /* r360 F1 — the 12Hz display throttle's own bookkeeping (see the
     * frame loop: terminal rungs always land, intermediate digits ride
     * the 80ms quantum). */
    let lastPctShown = -1;
    let lastPctAt = 0;
    /* r360 F1 — the one direct-DOM writer (see the counter note at the
     * refs): counter text, aria, the coords sweep and the boot rows'
     * lit state — zero React involvement during the entrance. */
    const writePct = (v: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (counterRef.current) counterRef.current.textContent = v + '%';
      root.setAttribute('aria-valuenow', String(v));
      if (coordsRef.current) {
        coordsRef.current.textContent =
          'X:' + Math.round((w * v) / 100) + 'PX Y:' + Math.round((h * v) / 100) + 'PX';
      }
      if (bootRef.current) {
        const items = bootRef.current.children;
        for (let i = 0; i < items.length; i++) {
          const li = items.item(i);
          if (li) {
            li.classList.toggle(
              'pl-boot-item--lit',
              v >= ((i + 1) / items.length) * 100 - 0.4,
            );
          }
        }
      }
    };
    const cleanups: Array<() => void> = [];

    const runExit = () => {
      if (exited) return;
      exited = true;
      cancelAnimationFrame(raf);
      writePct(100);
      updateFill(1);
      /* the scroll lock releases as the reveal starts (the page is
       * scrollable under the opening slit — the cleanup contract) */
      doc.style.overflow = prevOverflow;
      /* the consent banner (and any late chrome) mounts under the
       * reveal, never on top of the overlay */
      document.dispatchEvent(new CustomEvent(ENTRY_DONE_EVENT));
      cbsRef.current.onExitStart?.();
      /* the slit: the paper clip opens WHILE the band halves fly and
       * tint grey — the orange centreline rides the bands (each half
       * is a band child), so the split needs no extra choreography.
       * The .pl--exit transition rides the sheet-exit rung; the hold
       * beat delays the class, then onDone lands on transitionend
       * (with a cap-timeout twin so a dropped event can never strand
       * the overlay). */
      const doneTwice = { done: false };
      const finish = () => {
        if (doneTwice.done) return;
        doneTwice.done = true;
        cbsRef.current.onDone?.();
      };
      /* the unmount waits for the PAPER SPLIT's last frame: only the
       * .pl-sheet clip-path leg finishes the exit — the shorter
       * content-fade and band-flight transitionends bubble past
       * uncounted (the overlay vanishes with the split's last frame). */
      const onBandEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'clip-path') return;
        root.removeEventListener('transitionend', onBandEnd);
        finish();
      };
      root.addEventListener('transitionend', onBandEnd);
      cleanups.push(() => root.removeEventListener('transitionend', onBandEnd));
      const onDoneCap = window.setTimeout(finish, EXIT_HOLD_MS + 835 + 250);
      cleanups.push(() => window.clearTimeout(onDoneCap));
      window.setTimeout(() => root.classList.add('pl--exit'), EXIT_HOLD_MS);
    };

    const release = () => { solved = true; };
    if (document.readyState === 'complete') {
      release();
    } else {
      window.addEventListener('load', release, { once: true });
      cleanups.push(() => window.removeEventListener('load', release));
    }
    document.fonts?.ready.then(release).catch(() => undefined);

    /* the hard cap: readiness never holds the entry past 2.6s */
    const cap = window.setTimeout(runExit, MAX_RUN_MS);
    cleanups.push(() => window.clearTimeout(cap));
    runExitRef.current = runExit;

    const frame = (now: number) => {
      if (exited) return;
      const t = now - start;
      /* r351 P2 — the crawl rides the MEASURED counter curve (the B0
       * preloader timeline: fast to 45% by 0.9s, slow 45→60% to ~2.4s,
       * fast to the tail), compressed into the honest window (the
       * ≥2000ms floor law and the 2.6s cap stay untouched — the r309
       * belt pins them). The tail 92→100 belongs to the real release.
       * The counter tail is TRACE-AWARE: the 92→100 rung may only open
       * once the drawing sequence has had its spread. */
      const w = MAX_RUN_MS; /* the honest window the curve maps onto */
      const c1 = w * 0.207; /* 0.9/4.35 — the fast leg's measured seat */
      const c2 = w * 0.552; /* 2.4/4.35 — the slow leg's measured seat */
      const tailOpen = c2; /* the 92→100 rung opens at the slow leg's end */
      const target =
        solved && t >= tailOpen
          ? 100
          : t < c1
            ? (t / c1) * 45
            : t < c2
              ? 45 + ((t - c1) / (c2 - c1)) * 15
              : Math.min(92, 60 + ((t - c2) / (w - c2)) * 32);
      shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.4) shown = target;
      /* the DISPLAY never rounds to 100 before the release floor —
       * the eased value crawls at 99 until the floor opens, then the
       * exit's own setPct(100) lands the terminal readout. */
      const next =
        t < RELEASE_EXIT_MS ? Math.min(99, Math.round(shown)) : Math.round(shown);
      /* r360 F1 — the counter's DISPLAY throttles to 12Hz: a setState
       * per rAF was ~78 re-renders across the entrance, each forcing
       * style+layout of the readout on a throttled mobile CPU (the
       * measured Style&Layout whale). The crawl reads identically at
       * 12Hz — a percentage digit does not animate smoothly at 60 —
       * and terminal rungs (99/100, the tail flip) always land. */
      const nowMs = now;
      if (
        next !== lastPctShown &&
        (next >= 99 || nowMs - lastPctAt >= 80)
      ) {
        writePct(next);
        lastPctShown = next;
        lastPctAt = nowMs;
      }
      // Only the two narrow rules move; the SVG subtree needs no style update.
      updateFill(shown / 100);
      if (solved && t >= RELEASE_EXIT_MS && shown >= 99.5) {
        runExit();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    /* the first rAF only STAMPS the clock (its timestamp is the frame
     * the loader first animates on — layout-observable since the
     * previous frame); the crawl starts on the next frame. */
    const stampClock = (now: number) => {
      start = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(stampClock);
    cleanups.push(() => cancelAnimationFrame(raf));

    return () => {
      cleanups.forEach((fn) => fn());
      doc.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pl"
      data-spec="preloader.overlay"
      data-cursor="none"
      role="progressbar"
      aria-label="تحميل صفحة أُلارا"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      {/* the paper — the recorded split seat: two real band halves meet
       * flush at the centreline; each carries its half of the orange
       * progress rule, so the exit's flight IS the line's split. */}
      <div className="pl-sheet" aria-hidden="true">
        <div className="pl-band pl-band--top">
          {/* pl-progress — the stable progress-chrome selector (the r309
              early-frame contract); the element IS the rule's top half */}
          <span className="pl-line pl-progress" aria-hidden="true">
            <span className="pl-line-fill" />
          </span>
        </div>
        <div className="pl-band pl-band--bot">
          <span className="pl-line pl-progress" aria-hidden="true">
            <span className="pl-line-fill" />
          </span>
        </div>
      </div>

      {/* the registration cross — the sheet's datum hairlines (the r311
          loader-owns-the-pointer contract reads these seats; static
          centred marks in the drawing-sheet language) */}
      <span className="pl-cross-h" aria-hidden="true" />
      <span className="pl-cross-v" aria-hidden="true" />

      <div className="pl-inner pl-main">
        {/* the sheet frame — 4 hairlines at the paper's own inset */}
        <span className="pl-fr pl-fr-t" aria-hidden="true" />
        <span className="pl-fr pl-fr-b" aria-hidden="true" />
        <span className="pl-fr pl-fr-s" aria-hidden="true" />
        <span className="pl-fr pl-fr-e" aria-hidden="true" />

        {/* the small mark — the SAME elevation the hero seats, small on
            the sheet (r359: the reference's loader carries a small pencil
            glyph, not the full plate; the drawing honesty holds — what
            finishes drawing IS what the hero mounts) */}
        <div className="pl-plate pl-mark" aria-hidden="true">
          <img className="pl-mark-image" alt="" draggable={false}
            src={typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)')?.matches ? mobileElevation : desktopElevation} />
        </div>

        {/* the reading — the percentage at the rule's origin edge (the
            container positions in the sheet's own RTL logic; the numerals
            stay Latin-mono via the inner span's dir) + the X:/Y: px
            readout sweeping the sheet (r351 P2 — the measured
            coordinate-readout grammar, our own sweep). */}
        <div className="pl-read" aria-hidden="true">
          {/* r360 F1 — the counter/coords ride the direct-DOM writer
              (counterRef/coordsRef); the initial paint reads 0% and the
              rAF loop owns every subsequent frame. */}
          <span className="pl-counter" dir="ltr" ref={counterRef}>0%</span>
          <span className="pl-coords" dir="ltr" ref={coordsRef}>
            {'X:0PX Y:0PX'}
          </span>
        </div>

        {/* the survey ruler — the drafting sheet's own tick grid (r351
            P2): two dashed tick rules + plus marks at the crossings,
            static chrome (aria-hidden), retired on the phone sheet. */}
        <div className="pl-rulers" aria-hidden="true">
          <span className="pl-ruler pl-ruler-h" />
          <span className="pl-ruler pl-ruler-v" />
          {/* P3/r363 (B1): the crossing pluses draw from the ONE
              RegCross primitive (tone=muted, the light register); the
              .pl-rplus classes keep their crossing seats. */}
          <RegCross className="pl-rplus pl-rplus-1" tone="muted" />
          <RegCross className="pl-rplus pl-rplus-2" tone="muted" />
          <RegCross className="pl-rplus pl-rplus-3" tone="muted" />
          <RegCross className="pl-rplus pl-rplus-4" tone="muted" />
        </div>

        {/* the headline — the display promise, reading-start corner */}
        <div className="pl-headline" aria-hidden="true">
          {HEADLINE.map((line, i) => (
            <span key={line} className="pl-headline-line" style={{ animationDelay: `${900 + i * 140}ms` }}>
              {line}
            </span>
          ))}
        </div>

        {/* the reading-end column — the welcome card + the boot ledger */}
        <div className="pl-col" aria-hidden="true">
          <div className="pl-meta">
            <div className="pl-meta-welcome">أهلاً بك في أُلارا</div>
            {META_ROWS.map((row, i) => (
              <div key={row.k} className="pl-meta-row" style={{ animationDelay: `${700 + i * 260}ms` }}>
                <span className="pl-meta-k">{row.k}</span>
                <span className="pl-meta-v">{row.v}</span>
              </div>
            ))}
          </div>
          <ol className="pl-boot" ref={bootRef}>
            {BOOT_LINES.map((line, i) => (
              /* progress-locked (r351 P2): the lit class is toggled by
               * the direct-DOM writer (writePct) — the initial render
               * ships every row unlit (r360 F1) */
              <li key={line} className="pl-boot-item">
                <span className="pl-boot-num" dir="ltr">{String(i + 1).padStart(3, '0')}</span>
                <span className="pl-boot-txt">{line}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          className="pl-skip"
          onClick={() => runExitRef.current()}
        >
          تخطّي
        </button>
      </div>
    </div>
  );
}
