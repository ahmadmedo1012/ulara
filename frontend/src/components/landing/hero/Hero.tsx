/**
 * Hero — the signature moment (r351 P1: the reference anatomy, RTL).
 *
 * ONE calm sheet, THREE bands — the content leads:
 *
 *   .hro (full-bleed band, 100svh-class height)
 *   ├─ [1] the content band — AT THE TOP (the reference leads with the
 *   │      giant headline): the 2-line display H1 (masked line reveal)
 *   │      ‖ the ONE lead sentence (one mask line) ‖ the ONE primary
 *   │      CTA (the reference's label roll-swap + fill wipe).
 *   ├─ [2] the art band — the CAMPUS PLATE centered on bare paper
 *   │      (CampusPlate 'ink': the SAME elevation the preloader traces,
 *   │      completing between the exit lines — the loader→hero handoff);
 *   │      the inspection instrument (HeroInspect — crosshair guides +
 *   │      live X/Y readout + drag-to-inspect stations) + the ruler
 *   │      chrome over the one frame. The stage is DECLUTTERED (r351
 *   │      P1): the static zone-name leader labels and the corner
 *   │      coordinate readouts retire FROM THE HERO SEAT (they keep
 *   │      their seat on the journey plate — hero.css hides
 *   │      [data-frag='labels'] and .iso-coord inside .hro-stage), and
 *   │      the deco cards retire from the hero entirely.
 *   ├─ [3] the work strip (the six honest subjects — unchanged seat).
 *   └─ [4] the section frame (4 wiping edges + plus marks).
 *
 * The removed hero seats (r351 P1 — logged in GAP.md §3.1):
 *   · the login secondary (alt cell) — login lives in the masthead
 *     (desktop bar + mobile menu; the funnel unit tests pin those
 *     seats) — the hero carries ONE primary, like the reference;
 *   · the two deco cards — mono micro-copy repetition of the work
 *     strip's own subjects.
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
 *   · the CTA roll/wipe — label rolls one line up on hover/focus
 *     while the accent fill wipes from the reading-end edge.
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
import '../../../styles/landing/hero-mechanics.css';
import { BRAND_LABEL, REGISTER } from '../copy';

/* the hero's interaction-state seat ordinals (the r338 census register):
 * the work strip twins carry the recorded 1/2/5/7/4/6 seats — the
 * hover arms in hero.css bind those ordinals (a rename would silent-drop
 * the recorded deltas). */
const WORK_SEAT_ORD = ['1', '2', '5', '7', '4', '6'] as const;

/* The display title — TWO authored lines (the frozen spec's own
 * h1 box is the 2-line seat at 1440/1920/1024: 772×93 · 1029×124 ·
 * 549×66 — lh = fs exactly, 2 lines). UNVOCALISED (zero tashkeel — the
 * display canon), no tracking; the second line carries the whole
 * «من المحاضرة إلى الإتقان» clause so the pair reads as one sentence
 * seam-to-seam at every belt. r351 P1: the pair rides the hero's own
 * giant rung (--hro-d1, the section-scoped clamp in hero.css — the
 * reference's 7.2rem-class display scale, Arabic-floor leading). */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة إلى الإتقان'] as const;

/* r351 P1 — the lead is ONE sentence (≤18 words; the reference's
 * one-liner density): the funnel sentence, one mask line. */
const LEAD_LINE = 'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات وبحوث — تجربة عربية واحدة.' as const;

export function Hero() {
  return (
    <section className="fo-hero hro" aria-label={BRAND_LABEL}>

      {/* ══ [1] THE CONTENT BAND — the giant headline leads the fold
          (the reference's own order): title cell (the 2-line H1)
          ‖ the lead cell (ONE sentence + the register CTA under it).
          The login secondary retired to the masthead (it lives in the
          header pair + the mobile menu — the funnel seats the tests
          pin). ══ */}
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
          {/* ONE sentence (r351 P1) — the reference's one-liner lead,
              one mask line (div, not p — the reference's lead is a
              measured div box, T-11c) */}
          <div className="hro-lead">
            <span className="hro-lmask">
              <span className="hro-line">{LEAD_LINE}</span>
            </span>
          </div>

          {/* the funnel contract (r164b → r188, kept byte-identical):
              ONE primary «أنشئ حسابك الجامعي» → /auth/register — now
              styled as the reference's own btn-fill seat: the label
              rolls one line up on hover/focus while the accent fill
              wipes from the reading-end edge (the .hro-cta-fill/
              .hro-cta-roll pair; the bottom twin is aria-hidden — the
              accessible name stays the ONE real label). */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="hro-cta fo-hero-cta" data-spec-hover="3">
              <span className="hro-cta-fill" aria-hidden="true" />
              <span className="hro-cta-roll">
                <span className="hro-cta-top">{REGISTER}</span>
                <span className="hro-cta-bot" aria-hidden="true">{REGISTER}</span>
              </span>
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* ══ [2] THE ART BAND — the drafting stage (the reference's
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
              exit lines). r351 P1: the stage-level CSS hides the
              labels + coordinate fragments here — they belong to the
              journey plate; the hero stage is the ONE calm drawing. */}
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
          <span data-spec-hover="11" className="bp-dmark bp-dmark-tl" aria-hidden="true" />
          <span data-spec-hover="12" className="bp-dmark bp-dmark-tr" aria-hidden="true" />
          <span data-spec-hover="13" className="bp-dmark bp-dmark-bl" aria-hidden="true" />
          <span data-spec-hover="14" className="bp-dmark bp-dmark-br" aria-hidden="true" />
        </div>
      </div>

      {/* ══ [3] THE WORK STRIP — the six honest live-capability
          subjects (the reference's home-hero-work band): ONE static
          row ≥1200 (space-between, zero mask), a snap-scrolling strip
          below — riding the work-card rise (3.2rem · 1s p3.out). ══ */}
      {/* R355 (a11y): tabIndex 0 — the strip is a snap-scroll region and
          axe's scrollable-region-focusable wants keyboard users able to
          scroll it; its aria-label names it. The ITEMS stay tabIndex -1
          (programmatically focusable, never tab stops — the strip is the
          keyboard seat, the items are decorative chrome). */}
      <div className="hro-work fo-hero-work" aria-label="قدرات أُلارا العاملة اليوم" tabIndex={0}>
        <div className="hro-work-track">
          {/* divs, not spans — the instrument asserts the reference's
              measured div boxes (T-11c) */}
          {HERO_WORK_ITEMS.map((cap, i) => (
            <div
              key={cap}
              className="hro-work-item"
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
    </section>
  );
}
