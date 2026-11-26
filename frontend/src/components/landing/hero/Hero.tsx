import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { HERO_WORK_ITEMS } from '../../../data/landing-ledger';
import { ElevationArt, VB_MOBILE } from './ElevationArt';
import { RegCross } from '../../patterns/RegCross';
import { RulerStrip } from '../../patterns/RulerStrip';
import { finePointerSupported } from '../../../lib/motion/pointer';
import '../../../styles/landing/hero-mechanics.css';

/* r364 P1 art v2 — the ORIGINAL dense ink elevation (the reference's
 * hero grammar: ONE huge hand-inked brutalist elevation filling the
 * stage, trees both sides, ceremonial stairs, tiny figures) in
 * ULARA's university world. Desktop pads to the stage's 1440/700
 * lock on the art's own paper; mobile re-stages a portrait crop of
 * the entrance bay at the 390/560 lock (mission P5: phones are
 * composed, not scaled). The old thin-line elevation retires from
 * the stage seat (kept as the img-failure fallback below). */
import heroElevationDesktop from '../../../assets/art-v2/hero-elevation-flat.svg';
import heroElevationMobile from '../../../assets/art-v2/hero-elevation-flat-mb.svg';

/* The display title — TWO authored lines at the reference's h1 scale
 * (r359 D1: the fluid N/864·vw law — 46.7px @1440, 31.8px @390). Line one
 * is the frozen test contract (HERO_READY) — the pair reads as one
 * sentence seam-to-seam, lh = fs exactly. */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة إلى الإتقان'] as const;

/* r351 P1 kept: ONE lead sentence (≤18 words), one mask line. */
const LEAD_LINE = 'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات وبحوث — تجربة عربية واحدة.' as const;

/* the inspection stations — university concepts pinned on the elevation
 * (the reference's drag-to-reveal hotspots). Coordinates are in the
 * DESKTOP viewBox space (1580×768 — the padded art v2 canvas); the art
 * box maps them to % at render time so they ride ON the building
 * features: the curtain-wall glass upper field, the left stair run,
 * the right curtain wall, the right stair low wall. */
const STATIONS = [
  { id: 'C-01', label: 'مقرر تفاعلي', vx: 640, vy: 300, dir: 'up' },
  { id: 'E-02', label: 'اختبار موثّق', vx: 430, vy: 600, dir: 'down' },
  { id: 'R-03', label: 'بحث علمي', vx: 1040, vy: 280, dir: 'up' },
  { id: 'I-04', label: 'مؤسسة أكاديمية', vx: 1150, vy: 620, dir: 'down' },
] as const;

/* r360 F2 — the MOBILE station seats: A2's mobile elevation (the art key
 * that mounts on every phone) is its own tall doc (390×560, the campus
 * facade crop) — the desktop vx/vy fractions do not land on ITS
 * features. These seats are % of the mobile art box, pinned to the
 * builder's own geometry (shared/art/scenes/hero.ts): the left core
 * (x 62–122), the right core (x 268–328), the ground line y 430, the
 * wall x 24–62. */
const STATIONS_MOBILE: Record<string, { x: number; y: number }> = {
  /* NOTE: the x fractions are RTL-MIRRORED (the seats ride
   * inset-inline-start + translate −50%, which centers each station on
   * its anchor — in RTL the anchor sits (100−x)% from the LEFT). The
   * values seat on the art-v2 mobile crop's own geometry (the portrait
   * re-stage of the entrance bay: glass field upper 2/3, stairs lower
   * third), every marker's center ON a drawing feature while its
   * callout tag's arm stays inside the box at 360. */
  'C-01': { x: 50, y: 28 },   /* center on the upper glass field */
  'E-02': { x: 22, y: 82 },   /* center on the left stair run */
  'R-03': { x: 78, y: 40 },   /* center on the right glass field */
  /* r367: 85 → 80 — in RTL the physical `translate: -50%` shifts the
   * marker's box a further half-width past the mirrored anchor, so the
   * effective center rides (100−x)% − 44px; at 85 the marker's left
   * edge went negative at 360/375 (the CI e2e caught it). 80 seats on
   * the same mirrored stair wall with ≥10px margin at 360. */
  'I-04': { x: 80, y: 78 },   /* the right stair's low wall — the tag arm's floor */
};

export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  /* the reveal state: 0 = sealed · 1..N = stations revealed up to N ·
   * 'all' = the full sheet (drag reached the far end). A tap on a
   * station toggles just that one. */
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  /* drag-to-reveal — the reference's interaction: press on the drawing
   * and drag; the callout tags unseal one by one as the drag travels
   * (each 40px of travel unmasks the next station). Pointer-up keeps
   * whatever was unsealed. Keyboard: the station buttons toggle on
   * Enter/Space (focus-visible reveal). */
  const dragRef = useRef({ on: false, x: 0, unsealed: 0 });

  const revealNext = useCallback(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      for (const s of STATIONS) {
        if (!next.has(s.id)) {
          next.add(s.id);
          return next;
        }
      }
      return next;
    });
  }, []);

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { on: true, x: e.clientX, unsealed: 0 };
  };
  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.on) return;
    const dx = Math.abs(e.clientX - dragRef.current.x);
    const step = 40;
    const should = Math.min(STATIONS.length, Math.floor(dx / step));
    while (dragRef.current.unsealed < should) {
      dragRef.current.unsealed += 1;
      revealNext();
    }
  };
  const onStagePointerUp = () => {
    dragRef.current.on = false;
  };

  const toggleStation = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* r363 P3 — THE POINTER CROSSHAIR refs (reference parity item d):
   * the full-length hairline pair + the live X/Y readout. The moves
   * write transforms + textContent on THESE refs inside one rAF per
   * frame — React never re-renders per pointermove (the reveal state
   * above is untouched; the drag contract keeps its own handlers). */
  const xhairRef = useRef<HTMLDivElement>(null);
  const xhairVRef = useRef<HTMLSpanElement>(null);
  const xhairHRef = useRef<HTMLSpanElement>(null);
  const xhairXYRef = useRef<HTMLSpanElement>(null);

  /* reduced motion: the callouts render fully open (static sheet). */
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    /* r363 — the result guard: exotic embedders (and test doubles that
     * answer undefined) must never crash the mount; the callouts degrade
     * to the interactive sheet, never to a thrown TypeError. */
    const mq =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;
    if (!mq) return undefined;
    setReduced(mq.matches === true);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* the crosshair's own gates + engine — declared AFTER `reduced` (its
   * dep array reads the state) and keyed on it: when the RM query
   * flips at runtime the listeners re-bind and the instrument stays
   * off under the static-stage law. */
  useEffect(() => {
    const stage = stageRef.current;
    const layer = xhairRef.current;
    const vLine = xhairVRef.current;
    const hLine = xhairHRef.current;
    const readout = xhairXYRef.current;
    /* the gates: fine pointers only — touch/coarse never mounts the
     * instrument (CSS display:none carries the same belt) — and never
     * under prefers-reduced-motion (the static stage law). */
    if (!stage || !layer || !vLine || !hLine || !readout) return undefined;
    if (!finePointerSupported()) return undefined;
    if (reduced) return undefined;

    let raf = 0;
    let cx = 0; /* the pointer's viewport coords — applied once per frame */
    let cy = 0;

    const apply = () => {
      raf = 0;
      /* one layout read per frame (fresh through scroll/resize), then
       * the direct style writes — no per-move layout thrash. */
      const r = stage.getBoundingClientRect();
      const px = cx - r.left;
      const py = cy - r.top;
      if (px < 0 || py < 0 || px > r.width || py > r.height) return;
      /* the hairlines: full-length 1px bars crossing at the pointer */
      vLine.style.transform = `translate(${px}px, 0)`;
      hLine.style.transform = `translate(0, ${py}px)`;
      /* the readout rides ~14px off the intersection; near the far
       * edges it flips inside, then hard-clamps within the stage —
       * never clipped, no flip juggling at the near edges. */
      const OFF = 14;
      const w = readout.offsetWidth;
      const h = readout.offsetHeight;
      let tx = px + OFF;
      let ty = py + OFF;
      if (tx + w > r.width) tx = px - w - OFF;
      if (ty + h > r.height) ty = py - h - OFF;
      if (tx < 0) tx = 0;
      if (ty < 0) ty = 0;
      if (tx + w > r.width) tx = Math.max(0, r.width - w);
      if (ty + h > r.height) ty = Math.max(0, r.height - h);
      readout.style.transform = `translate(${tx}px, ${ty}px)`;
      /* the drafting voice — the preloader's X:/Y:PX grammar, padded
       * to the sheet's 4-digit station rung (fixed width: the flips
       * never change the box mid-move) */
      readout.textContent =
        `X:${String(Math.round(px)).padStart(4, '0')}PX ` +
        `Y:${String(Math.round(py)).padStart(4, '0')}PX`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    /* touch points on hybrid devices never steer the instrument */
    const isMouse = (e: PointerEvent) => e.pointerType !== 'touch';
    const onEnter = (e: PointerEvent) => {
      if (!isMouse(e)) return;
      layer.setAttribute('data-live', '1');
      cx = e.clientX;
      cy = e.clientY;
      schedule();
    };
    const onMove = (e: PointerEvent) => {
      if (!isMouse(e)) return;
      cx = e.clientX;
      cy = e.clientY;
      schedule();
    };
    const onLeave = () => {
      layer.removeAttribute('data-live');
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    stage.addEventListener('pointerenter', onEnter, { passive: true });
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      layer.removeAttribute('data-live');
    };
  }, [reduced]);
  const openSet = reduced ? new Set(STATIONS.map((s) => s.id)) : open;

  /* mobile art key choice (≤767 → the mobile elevation). */
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)')?.matches === true);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    setMobile(mq.matches);
    const on = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* r360 — the callout chips clamp INTO the stage: the centered anchor
   * can push edge stations' chips past the stage edge on narrow art
   * (measured: R-03's chip clipped ~22px at 390). A physical --tag-dx,
   * computed against the live stage rect, rides the tag's translate
   * (see .hi-tag in hero.css). Runs on every reveal change + resize. */
  const clampTags = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const tags = Array.from(stage.querySelectorAll<HTMLElement>('.hro-station.is-open .hi-tag'));
    if (!tags.length) return;
    for (const tag of tags) tag.style.removeProperty('--tag-dx');
    const sr = stage.getBoundingClientRect();
    const rects = tags.map((tag) => tag.getBoundingClientRect());
    rects.forEach((tr, index) => {
      const tag = tags[index]!;
      let dx = 0;
      if (tr.left < sr.left) dx = sr.left - tr.left + 0.5; /* +0.5: sub-pixel safety */
      else if (tr.right > sr.right) dx = sr.right - tr.right - 0.5;
      if (dx !== 0) tag.style.setProperty('--tag-dx', `${dx.toFixed(1)}px`);
    });
  }, []);
  useLayoutEffect(() => { clampTags(); }, [clampTags, openSet, mobile]);
  useEffect(() => {
    window.addEventListener('resize', clampTags);
    return () => window.removeEventListener('resize', clampTags);
  }, [clampTags]);
  /* the active viewBox window — art v2's own canvas (mobile seats the
   * entrance-bay crop; the fallback SVG keeps its own doc). */
  const vb = mobile ? VB_MOBILE : '0 0 1580 768';
  const [vX, vY, vW, vH] = vb.split(' ').map(Number) as [number, number, number, number];
  const pct = (vx: number, vy: number) => ({
    x: ((vx - vX) / vW) * 100,
    y: ((vy - vY) / vH) * 100,
  });
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const elevation = mobile ? heroElevationMobile : heroElevationDesktop;

  return (
    <section className="fo-hero hro" aria-label="أُلارا — من المحاضرة إلى الإتقان">

      {/* ══ [1] THE STAGE — the elevation owns the fold (r359 D4/D5):
          the drawing fills the art band edge-to-edge between the two
          dotted rules (7.5% / 83.5% of the fold, the reference's own
          seat), the inspection stations ride ON the drawing, the tick
          rulers + registration crosses frame the sheet. ══ */}
      <div
        className="hro-stage"
        data-cursor="none"
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        {/* the art — A2's key (lazy) or the committed fallback. The art
            box is ASPECT-LOCKED to the active viewBox (hero.css), so the
            drawing fills it with zero letterbox — the stations layer
            below tracks the drawing EXACTLY. */}
        <div className="hro-art">
          <div className="hro-ink" aria-hidden="true">
            {failedArt === elevation ? (
              /* the committed SVG fallback keeps its OWN doc's window —
               * it must never inherit art-v2's canvas mapping. */
              <ElevationArt className="hro-elevation" viewBox={mobile ? VB_MOBILE : '0 0 1440 620'} />
            ) : (
              /* r367 Lighthouse pass — this img IS the landing's LCP
               * (4.0s throttled mobile measured on production): it rides
               * eager + fetchpriority=high (never the lazy path) and
               * carries the active doc's intrinsic 390×560 / 1440×700
               * window so the decode seats without the unsized-image
               * penalty; the CSS aspect-lock keeps the final geometry. */
              <img className="hro-elevation" src={elevation} draggable={false} alt=""
                loading="eager" fetchPriority="high"
                width={mobile ? 390 : 1440} height={mobile ? 560 : 700}
                onError={() => setFailedArt(elevation)} />
            )}
          </div>

          {/* the inspection stations — signal squares + callout tags, riding
              ON the drawing (% of the aspect-locked art box = the viewBox's
              own fractions). Keyboard: the buttons toggle their own callout;
              drag reveals them in sequence. `.hi-marker` keeps the e2e seat. */}
          <div className="hro-stations-layer">
            {STATIONS.map((s) => {
              const shown = openSet.has(s.id);
              /* r360 F2 — the seat picks the mobile fractions when A2's
               * tall mobile doc owns the art box (hero.css ≤767: the box
               * is aspect-locked to the 390/560 doc). */
              const p = mobile
                ? (STATIONS_MOBILE[s.id] ?? { x: 50, y: 50 })
                : pct(s.vx, s.vy);
              return (
                <div key={s.id} className={`hro-station hro-st-${s.dir} ${shown ? 'is-open' : ''}`} style={{ insetInlineStart: `${p.x}%`, insetBlockStart: `${p.y}%` }}>
                  <button
                    type="button"
                    className="hi-marker"
                    data-marker={s.id}
                    aria-pressed={shown}
                    aria-label={`${s.label} — ${shown ? 'مفتوح' : 'مُغلق'} — اضغط للكشف`}
                    onClick={() => toggleStation(s.id)}
                    /* the focus-visible reveal law — KEYBOARD focus previews
                     * the callout (Tab/Shift+Tab); a pointer press must NOT
                     * pre-open here (r360 fix: pointer mousedown focuses the
                     * button too, so the focus-reveal + the click-toggle
                     * cancelled each other and a tap on a closed station
                     * appeared dead). :focus-visible is true only for
                     * keyboard focus in every supported engine. */
                    onFocus={(e) => {
                      if (e.currentTarget.matches(':focus-visible')) {
                        setOpen((prev) => new Set(prev).add(s.id));
                      }
                    }}
                    tabIndex={0}
                  >
                    <span className="hi-sq" aria-hidden="true" />
                  </button>
                  <span className="hi-tag" aria-hidden={!shown}>
                    <span className="hi-tag-idx fo-mono" dir="ltr">[{s.id}]</span>
                    <span className="hi-tag-txt">{s.label}</span>
                  </span>
                </div>
              );
            })}
            {/* the drag hint — mono, seals away once anything is open */}
            <span className={`hro-hint fo-mono ${openSet.size > 0 ? 'is-gone' : ''}`} aria-hidden="true">
              [اسحب على الرسم لكشف التفاصيل]
            </span>
          </div>
        </div>

        {/* the ruler chrome — tick strips on the stage's four inner
            edges (the reference's ruler layer). P3 kit: the ONE
            RulerStrip primitive draws; the .bp-ruler family classes
            stay as the SEATS ONLY (the stage's % insets + the stage's
            own hairline ink — hero.css). */}
        <div className="bp-rulers" aria-hidden="true">
          <RulerStrip className="bp-ruler bp-ruler-t" orientation="horizontal" />
          <RulerStrip className="bp-ruler bp-ruler-b" orientation="horizontal" />
          <RulerStrip className="bp-ruler bp-ruler-s" orientation="vertical" />
          <RulerStrip className="bp-ruler bp-ruler-e" orientation="vertical" />
        </div>

        {/* the ± registration marks at the stage's four corners —
            P3/r363 (B1): the ONE RegCross primitive; the .bp-dmark
            classes stay for the r306 seats (the stage's % insets). */}
        <RegCross data-spec-hover="11" className="bp-dmark bp-dmark-tl" />
        <RegCross data-spec-hover="12" className="bp-dmark bp-dmark-tr" />
        <RegCross data-spec-hover="13" className="bp-dmark bp-dmark-bl" />
        <RegCross data-spec-hover="14" className="bp-dmark bp-dmark-br" />

        {/* r363 P3 — THE POINTER CROSSHAIR (the reference's live
            drafting instrument): two full-length 1px hairlines crossing
            at the pointer + the X:/Y: mono readout riding ~14px off it.
            Visual only — pointer-events:none, aria-hidden; shown by the
            effect's data-live seat, hidden on touch + reduced motion
            (CSS gates below + the effect's own gates). */}
        <div className="hro-xhair" aria-hidden="true" ref={xhairRef}>
          <span className="hro-xhair-line hro-xhair-v" ref={xhairVRef} />
          <span className="hro-xhair-line hro-xhair-h" ref={xhairHRef} />
          <span className="hro-xhair-xy" dir="ltr" ref={xhairXYRef}>
            {'X:0000PX Y:0000PX'}
          </span>
        </div>
      </div>

      {/* ══ [2] THE BOTTOM BAND — the reference's composed fold footer
          (r359 D4, RTL mirror): the giant H1 leads from the reading
          start (right), the hairline divider, then the one-line lead +
          the discover/register cell at the far end. ══ */}
      <div className="hro-content">
        <div className="hro-title-cell">
          <h1 className="hro-title fo-hero-title">
            {TITLE_LINES.map((line, i) => (
              <Fragment key={line}>
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </h1>
        </div>

        <div className="hro-sub-cell" aria-hidden="false">
          <div className="hro-lead">
            <span className="hro-lmask">
              <span className="hro-line">{LEAD_LINE}</span>
            </span>
          </div>

          {/* the funnel contract (r164b → r188, kept byte-identical):
              ONE primary «أنشئ حسابك الجامعي» → /auth/register — the
              reference's DISCOVER-MORE cell seat: bordered cell, the
              label rolls one line up on hover/focus while the royal
              fill wipes from the reading-end edge. */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="hro-cta fo-hero-cta" data-spec-hover="3">
              <span className="hro-cta-fill" aria-hidden="true" />
              <span className="hro-cta-roll">
                <span className="hro-cta-top">أنشئ حسابك الجامعي</span>
                <span className="hro-cta-bot" aria-hidden="true">أنشئ حسابك الجامعي</span>
              </span>
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* ══ [3] THE WORK STRIP — the capabilities ticker (the reference's
          value marquee at the hero seam): one static row ≥1200, the
          snap-scrolling strip below. `.fo-hero-work` keeps the pinned
          funnel seat. ══ */}
      <div className="hro-work fo-hero-work">
        <div className="hro-work-track fo-hero-work" role="group" aria-label="قدرات أُلارا العاملة اليوم" tabIndex={0}>
          {HERO_WORK_ITEMS.map((cap, i) => (
            <div key={cap} className="hro-work-item" tabIndex={-1}>
              <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
              {cap}
            </div>
          ))}
        </div>
      </div>

      {/* ══ [4] THE FRAME — 4 hairline edges + corner plus marks on the
          section (the reference's page frame; inset from the viewport
          edges). ══ */}
      <span className="hro-edge hro-edge-t" aria-hidden="true" />
      <span className="hro-edge hro-edge-b" aria-hidden="true" />
      <span className="hro-edge hro-edge-s" aria-hidden="true" />
      <span className="hro-edge hro-edge-e" aria-hidden="true" />
      {/* the frame's inner corner pluses — P3/r363 (B1): the ONE
          RegCross primitive; the .bp-plus classes stay for the r306
          seats (the 2px inner insets). */}
      <RegCross className="bp-plus bp-plus-tl" />
      <RegCross className="bp-plus bp-plus-tr" />
      <RegCross className="bp-plus bp-plus-bl" />
      <RegCross className="bp-plus bp-plus-br" />
    </section>
  );
}
