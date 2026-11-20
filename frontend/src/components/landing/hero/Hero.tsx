/**
 * Hero — the drawing-sheet recomposition (the visual art direction pass).
 *
 * The reference's hero anatomy, mirrored for RTL — ONE calm sheet:
 *
 *   .hro (full-bleed band, 100svh-class height)
 *   ├─ the art band — the CAMPUS PLATE centered on bare paper
 *   │  (CampusPlate 'ink': the SAME elevation the preloader traces,
 *   │  completing between the exit lines — the loader→hero handoff);
 *   │  the inspection instrument (HeroInspect) + the ruler chrome
 *   │  (dashed tick strips, corner plus marks) over the one frame;
 *   │  the deco cards reseat as sheet labels in the plate's whitespace.
 *   ├─ the content grid (title cell ‖ sub cell ‖ alt cell)
 *   └─ the work strip + the section frame (4 wiping edges + plus marks).
 *
 * RETIRED with this pass (R342-final integration: the dead files are
 * DELETED — git history is the rollback; the census contracts keep
 * their records in the round docs and the frozen captures):
 *   · the ~95-div survey grid (HeroGrid) — the live sheet reads as ONE
 *     calm drawing over paper, not a survey document;
 *   · the 103-node vector-chrome census layer (HeroChrome);
 *   · the quadrant graticule + the red measure rules (the plate carries
 *     its own dimension chain, alignment crosses and datum ticks —
 *     quieter, authored inside the artwork);
 *   · the HeroInkWindow/ElevationArt hero seat (the CampusPlate is the
 *     one drawing object now; ElevationArt stays module-internal to
 *     ElevationDrawing for the SheetLoader's entrance variant).
 *
 * Mechanics (the reveal grammar, exact reference values):
 *   · hairline wipes — the frame's 4 edges scaleX/scaleY 0→1,
 *     1.2s LINEAR, origin mirrored for RTL (top right — the reference's
 *     top-left in LTR);
 *   · title mask-lines — each display line rides its own
 *     overflow-hidden mask, translateY(103%)→0, 0.8s power2.out,
 *     0.02s stagger (y is direction-neutral — no RTL mirror);
 *   · plate/frame/deco fades — 1s power3.out; the ink itself DRAWS
 *     (the staged ink-in belt — the plate's data-ink layers);
 *   · block/work rise — y 3.2rem→0, 1s power3.out.
 *
 * The motion engine is CSS transitions + the landing's OWN gates —
 * the hero itself carries no GSAP (the whole stack's ONE gsap seat is
 * the journey's scrubbed scene, lib/motion/engine.ts, which keeps its
 * own ticker parked; the hero never touches it). The choreography
 * hangs on the `.landing.intro-draw → .landing.intro-done` flip
 * (R308's entrance gate: the loader plays once per session; on its
 * exit slit the hero timeline begins). The GSAP ease curves are
 * translated to cubic-bezier(·) equivalents (documented in
 * hero-mechanics.css). prefers-reduced-motion collapses the whole
 * timeline to the settled sheet (RM belt inside hero-mechanics.css);
 * the intro gate never plays under RM.
 *
 * Stable hooks kept for the platform's contracts (tests/scripts —
 * see tests/unit/landing-funnel.test.tsx, tests/e2e/r312-*):
 *   .fo-hero (section) · .fo-hero-title (the H1) ·
 *   .fo-hero-actions .fo-hero-cta (the ONE primary) ·
 *   .fo-hero-work (the strip). Everything else is namespaced hro-*.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { HERO_WORK_ITEMS } from '../../../data/landing-ledger';
import { CampusPlate } from './CampusPlate';
import { HeroInspect } from '../cursor/HeroInspect';
import { useIsNarrowLayout } from '../../../hooks/useIsNarrowLayout';
import '../../../styles/landing/hero-mechanics.css';
import { BRAND_LABEL, LOGIN, REGISTER, LECTURE_INTERACTIVE, MASTERY_MATRIX} from '../copy';

/* The display title — TWO authored lines (the frozen spec's own
 * h1 box is the 2-line seat at 1440/1920/1024: 772×93 · 1029×124 ·
 * 549×66 — lh = fs exactly, 2 lines). UNVOCALISED (zero tashkeel — the
 * display canon), no tracking; the second line carries the whole
 * «من المحاضرة إلى الإتقان» clause so the pair reads as one sentence
 * seam-to-seam at every belt. */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة إلى الإتقان'] as const;

/* The lead — the honest funnel copy, hand-split at the em-dash into
 * two mask lines (the reference splits its sub on word-wrap; the
 * sentence seam is the Arabic-stable split point). */
const LEAD_LINES = [
  'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —',
  'تجربة عربية واحدة لخمسة أدوار وثلاث شرائح.',
] as const;

/* The deco cards — the reference's mono micro-copy cards over the
 * drawing (mono label + brand fade-loop square). OUR labels index the
 * honest capability ledger ([01] المحاضرات التفاعلية · [03] مصفوفة
 * الإتقان — same subjects as the work strip, never new claims). */
const DECO_CARDS = [
  { code: '01', text: LECTURE_INTERACTIVE, seat: '8' },
  { code: '03', text: MASTERY_MATRIX, seat: '9' },
] as const;

/* r338 T-13b — the hero's interaction-state seat ordinals: the reference
 * census recorded 21 interactive twins in div.home-hero-sub-wrap
 * (the frozen r335 reference captures: home-hero-wrap.<bp>.json `hovers`).
 * data-spec-hover=N binds each twin to its counterpart so
 * scripts/conformance/interact.mjs resolves every recorded delta;
 * the per-bp gating (a NOCHANGE record at a bp = no twin arm there)
 * and the hover/focus twins live in hero.css. Ordinals whose records
 * are NOCHANGE at every bp (10) carry no seat at all.
 *   0 login · 3 register · 1/2/5/7/4/6 the work strip · 8/9 the deco
 *   cards · 11–14 the ± registration marks (the graticule twins 15–20
 *   retire with the survey pass — their records resolve not-found). */
const WORK_SEAT_ORD = ['1', '2', '5', '7', '4', '6'] as const;
const DMARK_SEAT: Record<string, string> = { tl: '11', tr: '12', bl: '13', br: '14' };

export function Hero() {
  /* r338 T-13b — the deco cards are ≥992 chrome (hero.css hides them
   * below that). Render-gate them on the same band (the shared
   * useIsNarrowLayout belt, viewport-live): a display:none node can't
   * hold programmatic focus, and the interact probe focus-walks the
   * census twins 8/9 at every recorded bp — an unmount at the phone
   * band keeps the keyboard-parity read honest (not-found → skipped)
   * without ever making the decorative cards tab stops. */
  const phoneBand = useIsNarrowLayout(991);

  return (
    <section className="fo-hero hro" aria-label={BRAND_LABEL}>
      {/* ══ [1] THE ART BAND — the drafting stage (the reference's
          home-hero-img layer stack, ONE physical frame for the ink,
          the inspection instrument and the drafting chrome). The plate
          sits CENTERED at its own composed width — the drawing reads as
          the sheet's centerpiece with paper breathing around it, never
          a full-bleed scan. ══ */}
      <div className="hro-art">
        <div className="bp-stage hro-stage" data-cursor="none">
          {/* the ink — the whole campus elevation on transparent
              paper (drawn in by the staged ink-in belt; the SAME
              plate the preloader traces, completing between the
              exit lines). */}
          <div className="hro-plate">
            <CampusPlate variant="ink" />
          </div>
          {/* the cursor instrument — crosshair guides + coordinate
              readout + the drag-to-inspect stations (fine pointers,
              ≥992 — the reference's interact-wrap, Ulara's own). */}
          <HeroInspect />
          {/* the ruler chrome — dashed tick strips on the frame's four
              inner edges (the reference's ruler layer, visible at rest;
              the quadrant graticule + red datum rules retire with the
              survey pass — the plate carries its own dimension chain). */}
          <div className="bp-rulers" aria-hidden="true">
            <span className="bp-ruler bp-ruler-t" />
            <span className="bp-ruler bp-ruler-b" />
            <span className="bp-ruler bp-ruler-s" />
            <span className="bp-ruler bp-ruler-e" />
          </div>

          {/* the ± registration marks — the dashed inner frame's corner
              chrome (R315 B1 · A.3); direct stage children so their
              seats track the frame's own inset. Hover-revealed with
              the frame they annotate (clean corners at rest). */}
          <span data-spec-hover={DMARK_SEAT.tl} className="bp-dmark bp-dmark-tl" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.tr} className="bp-dmark bp-dmark-tr" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.bl} className="bp-dmark bp-dmark-bl" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.br} className="bp-dmark bp-dmark-br" aria-hidden="true" />

          {/* the deco cards — mono micro-copy + the brand square's
              1.5s fade-loop pulse (decorative repetition of the
              ledger's own subjects — aria-hidden). ≥992 only. */}
          {!phoneBand && DECO_CARDS.map((d, i) => (
            /* r338 T-13b — tabIndex -1: the interact probe focus-walks
               the first ten census twins (the deco seats are 8/9), so
               the cards must hold programmatic focus for the keyboard
               parity read; -1 keeps them out of the tab order (they
               stay aria-hidden decorative chrome) */
            <div
              key={d.code}
              className={`hro-deco hro-deco-${i + 1}`}
              aria-hidden="true"
              tabIndex={-1}
              data-spec-hover={d.seat}
            >
              <span className="hro-deco-sq" />
              <span className="hro-deco-label fo-mono" dir="ltr">[{d.code}]</span>
              <div className="hro-deco-text">{d.text}</div>
            </div>
          ))}

        </div>
      </div>

      {/* ══ [2] THE CONTENT BAND — the measured closing collage of
          the fold — title cell (the 2-line H1, reading-start) ‖ sub cell
          (the lead paragraph + the register CTA under it) ‖ alt cell (the
          login secondary, accent ink); the work strip closes the band as
          an absolutely-seated row inside the sub/alt column's lower zone
          (the spec's own overlap — the h1's box-bottom is the fold's
          last line, the subjects run under the short columns). ══ */}
      <div className="hro-content">
        <div className="hro-title-cell">
          <h1 className="hro-title fo-hero-title">
            {TITLE_LINES.map((line, i) => (
              <Fragment key={line}>
                {/* the whitespace text node between mask lines is the
                    accessible-text seam: display:block masks render no
                    box for it (visually inert), but textContent keeps
                    the natural sentence spacing — screen readers and
                    text pins read «من المحاضرة إلى الإتقان», not glue */}
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </h1>
        </div>

        <div className="hro-sub-cell">
          {/* div, not p — the reference's lead is a measured div box (T-11c) */}
          <div className="hro-lead">
            {LEAD_LINES.map((line, i) => (
              <Fragment key={line}>
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </div>

          {/* the funnel contract (r164b → r188, kept byte-identical):
              ONE primary «أنشئ حسابك الجامعي» → /auth/register, styled as
              the reference's own hero CTA seat (a 600-weight text link
              with the arrow glyph — the editorial voice; the .btn mass
              era ends with the R342 seat). */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="hro-cta fo-hero-cta" data-spec-hover="3">
              {REGISTER}
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* the alt cell — the login secondary in its own measured column
            (the spec's a[2]: accent ink, the text row + the arrow glyph
            stacked — the tall link box at the fold's inline-end edge) */}
        <div className="hro-alt-cell">
          <Link to="/auth" className="hro-alt" data-spec-hover="0">
            {LOGIN}
            <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ══ [3] THE WORK STRIP — the six honest live-capability
          subjects (the reference's home-hero-work band): ONE static
          row ≥1200 (space-between, zero mask), a snap-scrolling strip
          below — riding the work-card rise (3.2rem · 1s p3.out). ══ */}
      <div className="hro-work fo-hero-work" aria-label="قدرات أُلارا العاملة اليوم">
        <div className="hro-work-track">
          {/* divs, not spans — the instrument asserts the reference's
              measured div boxes (T-11c) */}
          {HERO_WORK_ITEMS.map((cap, i) => (
            <div
              key={cap}
              className="hro-work-item"
              /* r338 T-13b — the census twin seat (the reference's strip items
                 carry hover twins at the recorded bps; tabIndex -1 keeps
                 the programmatic-focus parity path without turning the
                 labels into tab stops — the strip stays decorative) */
              tabIndex={-1}
              data-spec-hover={WORK_SEAT_ORD[i]}
            >
              <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
              {cap}
            </div>
          ))}
        </div>
      </div>

      {/* ══ [4] THE FRAME — the reference's bg-border frame (R332 W1):
          4 wiping edge strips (1.2s linear; origin mirrored for RTL)
          + 4 corner plus marks, seated on the SECTION — inset 1.2rem
          from the viewport edges over the full-bleed sheet, never
          hugging an inner window (the run-001 kill). ══ */}
      <span className="hro-edge hro-edge-t" aria-hidden="true" />
      <span className="hro-edge hro-edge-b" aria-hidden="true" />
      <span className="hro-edge hro-edge-s" aria-hidden="true" />
      <span className="hro-edge hro-edge-e" aria-hidden="true" />
      <span className="bp-plus bp-plus-tl" aria-hidden="true" />
      <span className="bp-plus bp-plus-tr" aria-hidden="true" />
      <span className="bp-plus bp-plus-bl" aria-hidden="true" />
      <span className="bp-plus bp-plus-br" aria-hidden="true" />

      {/* [5]/[6] RETIRED — the ~95-div survey grid and the 103-node
          vector-chrome census layer: the live sheet reads as ONE calm
          drawing over paper, not a survey document. The drafting
          furniture lives INSIDE the plate (dimension chain, alignment
          crosses, datum ticks) and the section carries only the frame
          (edges + plus corners) and the ruler ticks. The two census
          modules stay in the tree untouched for rollback. */}
    </section>
  );
}
