/**
 * IsoCampusSheet — r346 · the journey window's isometric campus sheet.
 *
 * THE PORT (r346, task 2-a): the JOURNEY band's 2D architectural floor
 * plan (LearningPlanDrawing — retired from the mount by
 * IsoJourneyScene, the file kept on disk for rollback per the house
 * convention) gives way to the ISOMETRIC PLATE GRAMMAR the hero
 * landed (e4c84e7): the digital campus — the diamond plinth, the
 * research-library tower, four college wings, the quality
 * observatory, the community plaza, the training field, the dashed
 * data routes, the geometric tree ring, the drafting furniture and
 * the leader labels — re-composed from the SAME kernel (lib/iso.ts +
 * kernel/Iso.tsx) onto the journey band's own sheet.
 *
 * THE SHEET CONTRACT (r312/r322 — test law, unchanged): the band's
 * whole camera architecture rides ONE svg.bp-svg inside .jt-window:
 *   · viewBox "0 0 1200 760" — the plan sheet's own seat (PLAN_VB
 *     parity): the ≤991 camera families crop it ([640,54,560,355] …
 *     [713,0,460,600] …), the ≥992 branch holds the full overview,
 *     and the journey.css aspect-ratio pins match the families.
 *   · preserveAspectRatio="xMidYMid meet" — pinned by r312.
 *   · className="bp-svg jt-plan" — the ONE-window contract (.jt
 *     .bp-svg === 1) + the .jt-plan scoping every layer rule reads.
 *   · EIGHT [data-xl] layer groups — the R310/R325 ghost-crossfade
 *     register (the CSS 18% floor → the driver's six windowed ramps
 *     → 1): the drafting order re-keyed for the campus — 1 the site ·
 *     2 the tower + the first wings · 3 the far wings · 4 the
 *     satellites · 5 the routes + trees · 6 the furniture + labels.
 *   · THIRTEEN [data-frag] groups — the r346 assembly's targets (the
 *     sandbox's own census: قاعدة، برج، أربع كليات، مرصد، ساحة،
 *     ميدان، مسارات، أشجار، أثاث، بيانات) — each volume an
 *     independently addressable fragment the scrub flies in from its
 *     off-canvas vector (FRAG_VECTORS below).
 *
 * THE TRANSFORM: the campus composes in ITS OWN plate units (the
 * hero's CAMPUS_FRAME grammar — 184×168 about the centre (0, 26))
 * centered onto the 1200×760 sheet at ×4.4; the sheet's own margins
 * breathe around the drawing exactly like a drafting sheet's border
 * zone. The CSS translate each fragment rides composes INSIDE this
 * transform, so the r346 sandbox's plate-unit vectors carry over
 * verbatim (±300 clears the 184-unit frame by ~1.6×).
 *
 * THE INK LADDER (SHEET_INK_CSS — the PLAN_INK_CSS pattern): the
 * kernel's plate-unit stroke weights and text sizes are tuned for the
 * hero's ~3.5× centerpiece seat; this sheet renders at ×4.4 inside
 * the plan band's hairline drafting voice, so the strokes halve and
 * the texts re-rung to the retired plan's own ladder (sheet units),
 * via the svg-scoped <style> block below (CSS on the element beats
 * the kernel's presentation attributes; the sizes stay SVG user
 * units — the kernel's own authoring grammar).
 *
 * Colour law: every fill/stroke flows the --iso-* seats
 * (iso-plate.css — imported here per the CSS-rides-the-component
 * law); zero raw literals (the color gate). The pattern ids match
 * the kernel's own (ulara-hatch / ulara-ground — the grammar's
 * shared defs; the definitions are identical, so a second mount on
 * the same sheet resolves the same paint).
 */
import { IsoDefs } from '../kernel/Iso';
import { CampusFrag } from '../plates/CampusArt';
/* the isometric plate grammar's painting system (the --iso-* seats)
 * rides the sheet — every plate mounting the kernel inherits it (the
 * repo's CSS-rides-the-component law). */
import '../../../styles/landing/iso-plate.css';

/* the sheet seat — the journey window's own drafting sheet (PLAN_VB
 * parity: the r312 camera contract + the journey.css aspect-ratio
 * pins all ride the 1200×760 box). PLAN_VB is the numeric source
 * (the camera's CAM_FULL + the viewBox string both derive it). */
export const PLAN_VB = { w: 1200, h: 760 } as const;
const ISO_SHEET_VB = `0 0 ${PLAN_VB.w} ${PLAN_VB.h}`;

/* the plate→sheet transform: CAMPUS_FRAME's centre (0, 26) onto the
 * sheet centre at ×4.4 — the campus spans ~810×739 of the sheet. */
const SHEET_K = 4.4;
const SHEET_XFORM = `translate(600 380) scale(${SHEET_K}) translate(0 -26)`;

/* ── the assembly's flight vectors (plate units — the r346 sandbox's
 *    own FRAG_VECTORS, verbatim: each fragment's CSS translate
 *    composes inside SHEET_XFORM, so the authored magnitudes carry
 *    straight over; ±300 clears the 184-unit frame by ~1.6×). ────── */
export const FRAG_VECTORS: Readonly<Record<string, readonly [number, number]>> = {
  plinth: [-320, -60],
  tower: [0, -300],
  'wing-1': [-240, -180],
  'wing-2': [240, -180],
  'wing-3': [-240, 180],
  'wing-4': [240, 180],
  observatory: [320, 40],
  plaza: [30, 300],
  field: [-320, 40],
  routes: [140, -300],
  trees: [-140, 300],
  furniture: [320, 220],
  labels: [0, 300],
};

/* the sheet's ink ladder (see the file head — the PLAN_INK_CSS
 * pattern: CSS rules beat the kernel's presentation attributes, the
 * values stay plate-unit user units). r353 — the rebuild's new
 * drafting voices join the ladder (the arcade colonnades, the palms,
 * the domes, the royal dimension lines) so the journey sheet keeps
 * its hairline plan-voice against the hero's heavier centerpiece
 * register. */
const SHEET_INK_CSS = `
  .jt .jt-plan .iso-box polygon      { stroke-width: 0.55; }
  .jt .jt-plan .iso-route            { stroke-width: 0.6; stroke-dasharray: 2.6 2; }
  .jt .jt-plan .iso-node             { stroke-width: 0.42; }
  .jt .jt-plan .iso-tree line        { stroke-width: 0.5; }
  .jt .jt-plan .iso-tree polygon     { stroke-width: 0.42; }
  .jt .jt-plan .iso-arcade line,
  .jt .jt-plan .iso-arcade circle    { stroke-width: 0.34; }
  .jt .jt-plan .iso-palm path        { stroke-width: 0.38; }
  .jt .jt-plan .iso-palm polygon     { stroke-width: 0.32; }
  .jt .jt-plan .iso-dome path        { stroke-width: 0.45; }
  .jt .jt-plan .iso-dome ellipse     { stroke-width: 0.4; }
  .jt .jt-plan .iso-dim line,
  .jt .jt-plan .iso-dim path         { stroke-width: 0.3; }
  .jt .jt-plan .iso-dim text         { font-size: 3.4px; }
  .jt .jt-plan .iso-leader path      { stroke-width: 0.42; stroke-dasharray: 2 1.5; }
  .jt .jt-plan .iso-leader circle    { stroke-width: 0.3; }
  .jt .jt-plan .iso-furn line,
  .jt .jt-plan .iso-furn circle      { stroke-width: 0.45; }
  .jt .jt-plan .iso-furn path        { stroke-width: 0.4; }
  .jt .jt-plan .iso-furn rect        { stroke-width: 0.35; }
  .jt .jt-plan .iso-lab text         { font-size: 4.6px; }
  .jt .jt-plan .iso-coord text       { font-size: 3.2px; }
`;

/* ── the sheet — ONE svg.bp-svg: the whole r312 camera contract ──── */
export function IsoCampusSheet() {
  return (
    <svg
      /* bp-svg — the ONE plan-svg contract (.jt .bp-svg === 1, the
       * r312/r306 pin); jt-plan — the layer rules' scoping root (the
       * retired plan carried the same pair); iso-sheet — this sheet's
       * own hook (the yield transform's will-change seat). */
      className="bp-svg jt-plan iso-sheet"
      viewBox={ISO_SHEET_VB}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      data-variant="ink"
      aria-label="رسم ثلاثي الأبعاد لمنظومة أُلارا تتجمع على مسطح واحد: القاعدة الماسية، برج المكتبة البحثية، أربع كليات، مرصد الجودة، ساحة المجتمع، ميدان التدريب، ومسارات البيانات المتقطعة التي تربطها جميعًا"
    >
      <IsoDefs />
      <style>{SHEET_INK_CSS}</style>

      <g className="jt-iso" transform={SHEET_XFORM}>
        {/* ───── the ghost layers (the r325 floor contract: every
             [data-xl] starts at its 18% CSS floor and resolves on the
             sheet clock) — the campus drawing itself mounts from
             plates/CampusArt (the ONE geometry source, r346 dedupe);
             the SHEET_INK_CSS ladder below re-keys every weight
             through the iso-* class hooks ───── */}
        <g data-xl="1">
          <g data-frag="plinth"><CampusFrag name="plinth" /></g>
        </g>
        <g data-xl="2">
          <g data-frag="tower"><CampusFrag name="tower" /></g>
        </g>
        <g data-xl="2">
          <g data-frag="wing-1"><CampusFrag name="wing-1" /></g>
          <g data-frag="wing-2"><CampusFrag name="wing-2" /></g>
        </g>
        <g data-xl="3">
          <g data-frag="wing-3"><CampusFrag name="wing-3" /></g>
          <g data-frag="wing-4"><CampusFrag name="wing-4" /></g>
        </g>
        <g data-xl="4">
          <g data-frag="observatory"><CampusFrag name="observatory" /></g>
          <g data-frag="plaza"><CampusFrag name="plaza" /></g>
          <g data-frag="field"><CampusFrag name="field" /></g>
        </g>
        <g data-xl="5">
          <g data-frag="routes"><CampusFrag name="routes" /></g>
          <g data-frag="trees"><CampusFrag name="trees" /></g>
        </g>
        <g data-xl="6">
          <g data-frag="furniture"><CampusFrag name="furniture" /></g>
        </g>
        <g data-xl="6">
          <g data-frag="labels"><CampusFrag name="labels" /></g>
        </g>
      </g>
    </svg>
  );
}
