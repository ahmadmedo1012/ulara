import { Fragment, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { HERO_WORK_ITEMS } from '../../../data/landing-ledger';
import { ElevationArt, VB_MOBILE } from './ElevationArt';
import '../../../styles/landing/hero-mechanics.css';

/* ── the A2 art contract (r359) ─────────────────────────────────────────
 * Web art lives in `components/illustrations/r359/<key>.tsx`. The hero
 * consumes keys `hero-elevation` / `hero-elevation-mobile` through a lazy
 * glob; when a key is absent (A2's branch not merged yet) the committed
 * fallback `ElevationArt` (A1's own slice) owns the seat — a plain
 * hairline frame never shows. Post-merge A2's key wins by precedence. */
const R359_ART = import.meta.glob('../../illustrations/r359/hero-elevation*.tsx') as Record<
  string,
  () => Promise<{ default: React.ComponentType<{ className?: string }> }>
>;
const HeroElevationArt = R359_ART['../../illustrations/r359/hero-elevation.tsx']
  ? lazy(R359_ART['../../illustrations/r359/hero-elevation.tsx'])
  : null;
const HeroElevationMobileArt = R359_ART['../../illustrations/r359/hero-elevation-mobile.tsx']
  ? lazy(R359_ART['../../illustrations/r359/hero-elevation-mobile.tsx'])
  : null;

/* The display title — TWO authored lines at the reference's h1 scale
 * (r359 D1: the fluid N/864·vw law — 46.7px @1440, 31.8px @390). Line one
 * is the frozen test contract (HERO_READY) — the pair reads as one
 * sentence seam-to-seam, lh = fs exactly. */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة إلى الإتقان'] as const;

/* r351 P1 kept: ONE lead sentence (≤18 words), one mask line. */
const LEAD_LINE = 'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات وبحوث — تجربة عربية واحدة.' as const;

/* the inspection stations — university concepts pinned on the elevation
 * (the reference's drag-to-reveal hotspots). Coordinates are in the
 * DESKTOP viewBox space (1440×620); the art box maps them to % at
 * render time so they ride ON the building features. */
const STATIONS = [
  { id: 'C-01', label: 'مقرر تفاعلي', vx: 640, vy: 330, dir: 'up' },
  { id: 'E-02', label: 'اختبار موثّق', vx: 980, vy: 500, dir: 'down' },
  { id: 'R-03', label: 'بحث علمي', vx: 1030, vy: 260, dir: 'up' },
  { id: 'I-04', label: 'مؤسسة أكاديمية', vx: 380, vy: 400, dir: 'down' },
] as const;

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

  /* reduced motion: the callouts render fully open (static sheet). */
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const openSet = reduced ? new Set(STATIONS.map((s) => s.id)) : open;

  /* mobile art key choice (≤767 → the mobile elevation). */
  const [mobile, setMobile] = useState(false);
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
    const sr = stage.getBoundingClientRect();
    stage.querySelectorAll<HTMLElement>('.hro-station.is-open .hi-tag').forEach((tag) => {
      tag.style.removeProperty('--tag-dx');
      const tr = tag.getBoundingClientRect();
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
  /* the active viewBox window — the fallback art's own crop (mobile seats
   * the building; A2's mobile key replaces the whole art when present). */
  const vb = mobile ? VB_MOBILE : '0 0 1440 620';
  const [vX, vY, vW, vH] = vb.split(' ').map(Number) as [number, number, number, number];
  const pct = (vx: number, vy: number) => ({
    x: ((vx - vX) / vW) * 100,
    y: ((vy - vY) / vH) * 100,
  });
  const Art = mobile ? (HeroElevationMobileArt ?? HeroElevationArt ?? ElevationArt)
    : (HeroElevationArt ?? ElevationArt);

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
            <Suspense fallback={<ElevationArt className="hro-elevation" viewBox={vb} />}>
              {Art === ElevationArt ? (
                <ElevationArt className="hro-elevation" viewBox={vb} />
              ) : (
                <Art className="hro-elevation" />
              )}
            </Suspense>
          </div>

          {/* the inspection stations — signal squares + callout tags, riding
              ON the drawing (% of the aspect-locked art box = the viewBox's
              own fractions). Keyboard: the buttons toggle their own callout;
              drag reveals them in sequence. `.hi-marker` keeps the e2e seat. */}
          <div className="hro-stations-layer">
            {STATIONS.map((s) => {
              const shown = openSet.has(s.id);
              const p = pct(s.vx, s.vy);
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

        {/* the ruler chrome — dashed tick strips on the stage's four
            inner edges (the reference's ruler layer). */}
        <div className="bp-rulers" aria-hidden="true">
          <span className="bp-ruler bp-ruler-t" />
          <span className="bp-ruler bp-ruler-b" />
          <span className="bp-ruler bp-ruler-s" />
          <span className="bp-ruler bp-ruler-e" />
        </div>

        {/* the ± registration marks at the stage's four corners */}
        <span data-spec-hover="11" className="bp-dmark bp-dmark-tl" aria-hidden="true" />
        <span data-spec-hover="12" className="bp-dmark bp-dmark-tr" aria-hidden="true" />
        <span data-spec-hover="13" className="bp-dmark bp-dmark-bl" aria-hidden="true" />
        <span data-spec-hover="14" className="bp-dmark bp-dmark-br" aria-hidden="true" />
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
      <span className="bp-plus bp-plus-tl" aria-hidden="true" />
      <span className="bp-plus bp-plus-tr" aria-hidden="true" />
      <span className="bp-plus bp-plus-bl" aria-hidden="true" />
      <span className="bp-plus bp-plus-br" aria-hidden="true" />
    </section>
  );
}
