import { useEffect, useRef } from 'react';
/**
 * CampusPlate — «الحرم الرقمي» (r346): the isometric centerpiece.
 *
 * THE PHASE-4 DIRECTIVE (r346): the flat frontal elevation retires —
 * the landing's pictures become ISOMETRIC 3D drawings in the
 * reference's plate language (geometric volumes on a diamond plinth,
 * data routes between them, drafting furniture around them). The
 * whole university reads as ONE system: the plinth, the central
 * research-library tower, four college wings, the quality
 * observatory, the community plaza, the training field, the dashed
 * data routes that tie every wing to the tower, the geometric
 * tree ring, and the sheet's own furniture (north arrow, scale bar,
 * registration marks, coordinate readouts, leader labels).
 *
 * Same contract as the retired elevation (every consumer keeps its
 * mount — the r306 sheet test pins the interface, not the geometry):
 *   · `variant="ink"`  — the full plate (the hero seat; staged ink-in
 *     rides the data-ink layer indices on the SAME
 *     .landing.intro-draw → .intro-done belt hero-mechanics.css
 *     already drives — the iso belt lives in iso-plate.css).
 *   · `variant="trace"` — the STRUCTURE silhouettes only, each stroke
 *     carrying cp-draw + its sequence delay (the preloader's
 *     self-drawing plate; duration = the canonical brand-draw token
 *     consumed in preloader.css).
 *   · `bp-svg` — the inspection instrument's frame selector (the ONE
 *     shared frame contract); `cp-svg` is the plate's own style hook.
 *   · `CAMPUS_FRAME` — the plate's own viewBox (exported, single
 *     source). The frame is the ISO sheet window; HeroInspect's
 *     stations author in the SAME viewBox space.
 *   · `data-frag` groups — the Journey scene (and any scrub driver)
 *     can address the plate's semantic fragments (plinth, tower,
 *     wings, observatory, plaza, field, routes, trees, furniture,
 *     labels) for explode/assemble choreography.
 *
 * Geometry: every volume is authored in ISO SPACE (lib/iso.ts's 30°
 * projection — +x to the lower-right, +y to the lower-left, +z up)
 * and projected by the kernel primitives (kernel/Iso.tsx). Colour
 * law: the kernel paints through the --iso-* custom properties
 * (iso-plate.css) — zero raw literals in this file (the color gate).
 */
import { iso, isoBoxFaces } from '../../../lib/iso';
import { IsoDefs } from '../kernel/Iso';
import { CampusFrag } from '../plates/CampusArt';
/* the isometric plate grammar's painting system (the --iso-* seats +
   the ink belt) rides the plate — every plate mounting the kernel
   inherits it (the repo's CSS-rides-the-component law) */
import '../../../styles/landing/iso-plate.css';

/* The plate's own frame — the ONE shared coordinate space (the artwork
 * AND the inspection stations author against it directly). The sheet
 * window is the iso projection's bounding box with margin for the
 * furniture + labels: x/y are NEGATIVE (the iso origin sits at the
 * plinth's reading-start corner, the drawing extends around it). */
export const CAMPUS_FRAME = { x: -92, y: -58, w: 184, h: 168 } as const;

/* ── the ink variant's layer schedule (data-ink — the drafting order:
 * ground first, masses, connectors, then furniture + labels last). ── */
type CampusVariant = 'trace' | 'ink';

/* ── the trace seat — the STRUCTURE silhouettes, one closed stroke per
 * volume, drawing in drafting order (each carries cp-draw + its inline
 * delay; the duration is preloader.css's canonical token). ── */
function TraceStrokes() {
  /* the volumes' outlines in drafting order: plinth → wings → tower →
   * observatory → plaza → field. The delays ramp over the sequence. */
  const outlines: string[] = [
    isoBoxFaces(0, 0, 0, 56, 56, 2).outline,
    isoBoxFaces(4, 4, 2, 10, 10, 7).outline,
    isoBoxFaces(42, 4, 2, 11, 9, 8).outline,
    isoBoxFaces(4, 42, 2, 9, 11, 8).outline,
    isoBoxFaces(43, 43, 2, 10, 10, 7).outline,
    isoBoxFaces(18, 18, 2, 20, 20, 6).outline,
    isoBoxFaces(20.5, 20.5, 8, 15, 15, 7).outline,
    isoBoxFaces(23, 23, 15, 10, 10, 8).outline,
    isoBoxFaces(47, 26, 2, 7, 7, 9).outline,
    isoBoxFaces(20, 44, 2, 17, 10, 1.2).outline,
    isoBoxFaces(6, 24, 2, 8, 14, 0.9).outline,
  ];
  const spread = 90;
  return (
    <>
      {outlines.map((points, i) => (
        <polygon
          key={i}
          className="cp-draw cp-2"
          points={points}
          pathLength={1}
          style={{ animationDelay: `${i * spread}ms` }}
        />
      ))}
      {/* the ground rule + the tree ring close the trace */}
      <polyline
        className="cp-draw cp-15"
        points={[
        iso(-8, -8), iso(64, -8), iso(64, 64), iso(-8, 64), iso(-8, -8),
      ].map((pt) => `${pt.sx},${pt.sy}`).join(' ')}
        pathLength={1}
        style={{ animationDelay: `${outlines.length * spread}ms` }}
      />
    </>
  );
}

export function CampusPlate({ variant }: { variant: CampusVariant }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  /* the mono micro-labels' rendered floor — the same inverse-scale
   * mechanism the sheet established: the svg scales with the
   * viewport, so the label font scales against the LIVE width (rAF-
   * throttled; jsdom-safe). Only the ink seat carries labels. */
  useEffect(() => {
    if (variant !== 'ink') return undefined;
    const svg = svgRef.current;
    if (!svg || typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const w = svg.getBoundingClientRect().width;
      if (!w) return;
      const units = (11 * CAMPUS_FRAME.w) / w;
      svg.style.setProperty('--cp-label-fs', `${Math.max(12, Math.round(units * 10) / 10)}px`);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [variant]);

  return (
    <svg
      ref={svgRef}
      /* bp-svg — the inspection instrument's frame selector (the ONE
       * shared frame contract); cp-svg is the plate's own style hook */
      className="bp-svg cp-svg"
      viewBox={`${CAMPUS_FRAME.x} ${CAMPUS_FRAME.y} ${CAMPUS_FRAME.w} ${CAMPUS_FRAME.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      data-variant={variant}
      aria-label="رسم ثلاثي الأبعاد: الحرم الرقمي لأُلارا — برج المكتبة البحثية، أربع كليات، مرصد الجودة، ساحة المجتمع، ميدان التدريب، ومسارات البيانات التي تربطها جميعًا"
      style={{ overflow: 'visible' }}
    >
      <IsoDefs />
      {variant === 'ink' ? (
        <>
          {/* the campus drawing — ONE geometry source (plates/CampusArt),
           * staged on the data-ink belt (the drafting order: ground,
           * masses, connectors, furniture, labels) */}
          <g data-ink="1" data-frag="plinth"><CampusFrag name="plinth" /></g>
          <g data-ink="2" data-frag="tower"><CampusFrag name="tower" /></g>
          <g data-ink="2">
            <g data-frag="wing-1"><CampusFrag name="wing-1" /></g>
            <g data-frag="wing-2"><CampusFrag name="wing-2" /></g>
            <g data-frag="wing-3"><CampusFrag name="wing-3" /></g>
            <g data-frag="wing-4"><CampusFrag name="wing-4" /></g>
          </g>
          <g data-ink="3" data-frag="observatory"><CampusFrag name="observatory" /></g>
          <g data-ink="3" data-frag="plaza"><CampusFrag name="plaza" /></g>
          <g data-ink="3" data-frag="field"><CampusFrag name="field" /></g>
          <g data-ink="4" data-frag="routes"><CampusFrag name="routes" /></g>
          <g data-ink="4" data-frag="trees"><CampusFrag name="trees" /></g>
          <g data-ink="5" data-frag="furniture"><CampusFrag name="furniture" /></g>
          <g data-ink="6" data-frag="labels"><CampusFrag name="labels" /></g>
        </>
      ) : (
        /* the trace seat — the same campus, silhouette by silhouette */
        <TraceStrokes />
      )}
    </svg>
  );
}
