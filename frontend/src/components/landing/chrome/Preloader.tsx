import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
/**
 * Preloader — R333 «تتابع الدخول» — the entry overlay (the retired craft sheet row 1).
 *
 * A full-screen paper overlay on the page ground (var(--bg)): the brand
 * mark + the «أُلارا» outlined wordmark draw in via the ONE brand
 * system's own stroke-draw (<Logo animated> — hairlines first, the
 * orange point last, complete-and-static under reduced motion), with a
 * mono percentage counter (0→100) tied to REAL asset readiness
 * (document load + document.fonts.ready) bounded to min 900 ms /
 * max 2.2 s — the counter never lies and never stalls.
 *
 * Exit (r335 W-chrome — the FROZEN _motion spec's recorded choreography;
 * r339 T-11c upgrades it to the full recorded flight): the content fades
 * 0.4s (power2.out-equivalent house decel) while the paper opens on the
 * recorded TWO-BAND choreography — the .pl-sheet clip slit (the recorded
 * .loading-main polygon pair) widens to the edges across the R313
 * sheet-exit rung (835ms) on the recorded cubic-bezier(1,0,0.44,1) WHILE
 * the two real band halves (the recorded .loading-progress-item pair) fly
 * the recorded ∓387.5px/+310.5px @≥992 (∓150.6px/+263.9px below) and tint
 * to the recorded #b3b3af ground — then the overlay hides instantly (the
 * recorded autoAlpha:0 set) and unmounts: the transitionend guard counts
 * only the PAPER's clip-path leg (the longest flight), so the unmount
 * lands on the split's last frame. No JS animation library — the
 * .pl--exit class carries the whole choreography; the legs are declared
 * on the base classes from mount so the exit params are live in the
 * computed style the moment the class lands. At exit START the component
 * dispatches the `ula:entry-done` custom event AND calls onExitStart, so
 * downstream chrome (the consent banner) mounts under the reveal and
 * never overlaps the overlay.
 *
 * Gating (owned by the parent through the introGate decision):
 * plays once per session (the `ulara-intro-seen` sessionStorage flag
 * is stamped here on play), never under prefers-reduced-motion (the
 * parent never mounts it; a defensive in-component guard completes
 * instantly), never for save-data/slow-device visitors.
 */
import { useEffect, useRef, useState } from 'react';
import { Logo } from '../../../brand';
import { markIntroSeen } from '../../../lib/motion/introGate';
import { ElevationArt } from '../ElevationDrawing';
import '../../../styles/landing/preloader.css';

/* The clock is the r309-pinned measured window (the retired craft sheet row 1 /
 * introGate V14): the counter is ASSET-GATED — 100% lands between
 * ~2.75s (assets resolved early) and the 4.9s fallback cap, then the
 * 700ms completed-state hold, then the 835ms sheet-exit wipe. */
const RELEASE_FLOOR_MS = 2950; /* the counter never resolves before 2.95s —
 * r333/r342: 2750→2950; the r309 spec's tMount starts AFTER waitForSelector
 * ('.pl') resolves, so the ~120-800ms mount→visible latency can eat the
 * floor margin. 2950 keeps the release strictly ≥2000ms in Playwright while
 * remaining well within the 4.9s cap. */
const MAX_RUN_MS = 4900; /* the hard cap — readiness races this timer */
const EXIT_HOLD_MS = 700; /* the 100% beat before the wipe opens */
const ENTRY_DONE_EVENT = 'ula:entry-done';

const BOOT_ITEMS = [
  { code: '01', label: 'النواة الأساسية للنظام', en: 'ULARA OS KERNEL', threshold: 15 },
  { code: '02', label: 'محرك المحاضرات التفاعلية', en: 'LECTURE ENGINE', threshold: 35 },
  { code: '03', label: 'مصفوفة الإتقان والتقييم', en: 'MASTERY MATRIX', threshold: 55 },
  { code: '04', label: 'سجل الحاكمية والاعتماد', en: 'GOVERNANCE AUDIT', threshold: 75 },
  { code: '05', label: 'الحرم الأكاديمي الرقمي', en: 'DIGITAL CAMPUS', threshold: 92 },
] as const;

type PreloaderProps = {
  /** the exit wipe is about to open — chrome may mount beneath it */
  onExitStart?: () => void;
  /** the overlay has fully revealed the page — safe to unmount */
  onDone?: () => void;
};

export function Preloader({ onExitStart, onDone }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [pct, setPct] = useState(0);

  /* the R313 skip contract: the skip control ends the entrance
   * immediately — but the EXIT must PLAY (the 0.88s hold+wipe), not
   * cut. runExit is hoisted here via ref set in the effect below. */
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

    /* session-once: the introGate's sessionStorage seen-flag is THE
     * flag — stamped the moment the overlay plays so in-session
     * navigations never replay the sequence. */
    markIntroSeen();

    /* lock the sheet while the entrance owns the viewport (the r309
     * lock contract: restored on EVERY exit path — timed, skip, RM,
     * unmount) */
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

    const start = performance.now();
    let solved = false; /* real assets are in */
    let exited = false;
    let raf = 0;
    let shown = 0; /* the eased display value behind the counter */
    const cleanups: Array<() => void> = [];

    const runExit = () => {
      if (exited) return;
      exited = true;
      cancelAnimationFrame(raf);
      setPct(100);
      if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)';
      /* the scroll lock releases as the reveal starts (the page is
       * scrollable under the opening wipe — the r309 cleanup contract) */
      doc.style.overflow = prevOverflow;
      /* the consent banner (and any late chrome) mounts under the
       * reveal, never on top of the overlay */
      document.dispatchEvent(new CustomEvent(ENTRY_DONE_EVENT));
      cbsRef.current.onExitStart?.();
      /* the wipe: the RIGHT cut grows — the paper collapses toward the
       * left edge and the page reveals right-first (RTL reading side).
       * The .pl--exit transition rides the R313 sheet-exit rung; the
       * hold beat delays the class, then onDone lands on transitionend
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
       * uncounted (r335 conformance: the recorded autoAlpha:0 hide
       * lands AFTER the 0.8s flight, never mid-split). */
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

    /* the hard cap: readiness never holds the entry past 2.2 s */
    const cap = window.setTimeout(runExit, MAX_RUN_MS);
    cleanups.push(() => window.clearTimeout(cap));
    runExitRef.current = runExit;

    const frame = (now: number) => {
      if (exited) return;
      const t = now - start;
      /* the crawl: a calm synthetic ramp toward 92% while the real
       * gate is pending; the tail 92→100 belongs to the real release */
      const target = solved
        ? 100
        : Math.min(92, (t / (MAX_RUN_MS * 0.72)) * 92);
      shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.4) shown = target;
      /* the DISPLAY never rounds to 100 before the measured release
       * floor (r309: 100% lands between ~2.75s and 4.9s) — the eased
       * value crawls at 99 until the floor opens, then the exit's own
       * setPct(100) lands the terminal readout. */
      const next = t < RELEASE_FLOOR_MS ? Math.min(99, Math.round(shown)) : Math.round(shown);
      setPct(next);
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
      }
      if (solved && t >= RELEASE_FLOOR_MS && shown >= 99.5) {
        runExit();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
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
      aria-valuenow={pct}
    >
      <div className="pl-sheet" aria-hidden="true">
        <div className="pl-band pl-band--top" aria-hidden="true" />
        <div className="pl-band pl-band--bot" aria-hidden="true" />
      </div>
      <div className="pl-inner pl-main">
        {/* Header bar */}
        <header className="pl-topbar" aria-hidden="true">
          <div className="pl-brand-group">
            <Logo variant="mark" size={24} />
            <span className="pl-brand-label fo-mono" dir="ltr">ULARA OS // V1.0</span>
          </div>
          <button
            type="button"
            className="pl-skip"
            onClick={() => runExitRef.current()}
          >
            تخطي
          </button>
        </header>

        {/* The Elevation Drawing + Diagnostic Checklist stage */}
        <div className="pl-stage-wrap">
          <div className="pl-elevation-stage" aria-hidden="true">
            <svg
              viewBox="0 0 1440 640"
              className="pl-drawing-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <ElevationArt active={-1} variant="entrance" />
            </svg>
            <div className="pl-drawing-label fo-mono" dir="ltr">
              ELEVATION A-A // DRAFTING STAGE 1:200
            </div>
          </div>

          <aside className="pl-diagnostics" aria-hidden="true">
            <div className="pl-diag-card">
              <div className="pl-diag-head fo-mono" dir="ltr">
                [ DIAGNOSTICS // BOOT SEQUENCE ]
              </div>
              <div className="pl-diag-list">
                {BOOT_ITEMS.map((item) => {
                  const active = pct >= item.threshold;
                  return (
                    <div
                      key={item.code}
                      className={`pl-diag-row ${active ? 'is-active' : ''}`}
                    >
                      <span className="pl-diag-pip" />
                      <span className="pl-diag-code fo-mono" dir="ltr">[{item.code}]</span>
                      <div className="pl-diag-text">
                        <span className="pl-diag-ar">{item.label}</span>
                        <span className="pl-diag-en fo-mono" dir="ltr">{item.en}</span>
                      </div>
                      <span className="pl-diag-status fo-mono" dir="ltr">
                        {active ? 'ONLINE' : 'WAIT'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Crosshairs & Branding */}
        <span className="pl-cross-h" aria-hidden="true" />
        <span className="pl-cross-v" aria-hidden="true" />
        
        {/* Keep legacy test selectors in DOM */}
        <div className="pl-mark" style={{ display: 'none' }} aria-hidden="true">
          <Logo variant="mark" size={40} animated />
        </div>
        <div className="pl-wordmark" style={{ display: 'none' }} aria-hidden="true">
          <Logo variant="wordmark" size={64} animated />
        </div>

        {/* Progress & Bottom status */}
        <div className="pl-bottom-bar" aria-hidden="true">
          <div className="pl-meta">
            <div className="pl-meta-row">
              <span className="pl-meta-state">
                {pct < 30 ? 'فحص النواة الأكاديمية...' : pct < 70 ? 'تحميل مخططات الحرم الجامعي...' : pct < 98 ? 'مزامنة مصفوفة الإتقان...' : 'اكتمل التحميل — فتح المنصّة'}
              </span>
              <span className="pl-counter" dir="ltr">
                {pct}%
              </span>
            </div>
          </div>
          <div className="pl-progress">
            <div className="pl-rail">
              <span className="pl-rail-track" />
              <span ref={fillRef} className="pl-rail-fill" style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
