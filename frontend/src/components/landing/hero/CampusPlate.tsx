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
import { PLATE, iso, isoBoxFaces, poly } from '../../../lib/iso';
import {
  Coord,
  IsoBox,
  IsoNode,
  Leader,
  RegMark,
  Route,
  SheetDiamond,
} from '../kernel/Iso';
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

/** hatched ground shadow (light from screen-right) */
function Shadow({ x, y, w, d, s = 5 }: { x: number; y: number; w: number; d: number; s?: number }) {
  const pts = poly(
    { x, y: y + d, z: 0 },
    { x: x + w, y: y + d, z: 0 },
    { x: x + w + s * 0.7, y: y + d + s, z: 0 },
    { x: x + s * 0.7, y: y + d + s, z: 0 },
  );
  return <polygon points={pts} fill="url(#ulara-hatch)" opacity={0.3} stroke="none" />;
}

/** geometric tree: stem + double-diamond canopy */
function Tree({ x, y, s = 3.4 }: { x: number; y: number; s?: number }) {
  const base = iso(x, y, 0);
  const top = iso(x, y, 4.5);
  return (
    <g>
      <line x1={base.sx} y1={base.sy} x2={top.sx} y2={top.sy} stroke={PLATE.ink} strokeWidth={1.1} />
      <SheetDiamond cx={top.sx} cy={top.sy - s * 0.6} s={s} fill={PLATE.west} stroke={PLATE.ink} strokeWidth={0.9} />
      <SheetDiamond cx={top.sx} cy={top.sy - s * 1.5} s={s * 0.62} fill={PLATE.east} stroke={PLATE.ink} strokeWidth={0.9} />
    </g>
  );
}

function lineBetween(a: { sx: number; sy: number }, b: { sx: number; sy: number }) {
  return { x1: a.sx, y1: a.sy, x2: b.sx, y2: b.sy };
}

function WindowStrips({ x, y, z, w, d, h }: { x: number; y: number; z: number; w: number; d: number; h: number }) {
  // two mullion strips on the east (max-x) face
  const strips = [];
  for (let i = 1; i <= 2; i++) {
    const yy = y + (d * i) / 3;
    strips.push(
      <line
        key={i}
        {...lineBetween(iso(x + w, yy, z + 1), iso(x + w, yy, z + h - 1.4))}
        stroke={PLATE.muted}
        strokeWidth={0.8}
      />,
    );
  }
  return <g>{strips}</g>;
}

function Wing({
  x,
  y,
  w = 10,
  d = 10,
  h = 7,
  frag,
}: {
  x: number;
  y: number;
  w?: number;
  d?: number;
  h?: number;
  frag: string;
}) {
  return (
    <g data-frag={frag}>
      <Shadow x={x} y={y} w={w} d={d} s={4} />
      <IsoBox x={x} y={y} z={2} w={w} d={d} h={h} cornerStone />
      {/* window strips on the east face */}
      <WindowStrips x={x} y={y} z={2} w={w} d={d} h={h} />
    </g>
  );
}

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
        points={poly(
          { x: -8, y: -8, z: 0 },
          { x: 64, y: -8, z: 0 },
          { x: 64, y: 64, z: 0 },
          { x: -8, y: 64, z: 0 },
          { x: -8, y: -8, z: 0 },
        )}
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
      <defs>
        <pattern id="ulara-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={PLATE.ink} strokeWidth="0.7" opacity="0.35" />
        </pattern>
        <pattern id="ulara-ground" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(1,0.5,-1,0.5,0,0)">
          <path d="M0 0 H16 M0 0 V16" stroke={PLATE.hair} strokeWidth="0.5" fill="none" opacity="0.55" />
        </pattern>
      </defs>
      {variant === 'ink' ? (
        <>
          {/* ————— ground: plinth + faint diamond lattice (ink 1) ————— */}
          <g data-ink="1" data-frag="plinth">
            <polygon
              points={poly(
                { x: -8, y: -8, z: 0 },
                { x: 64, y: -8, z: 0 },
                { x: 64, y: 64, z: 0 },
                { x: -8, y: 64, z: 0 },
              )}
              fill="url(#ulara-ground)"
              opacity={0.42}
              stroke="none"
            />
            <IsoBox x={0} y={0} z={0} w={56} d={56} h={2} top={PLATE.top} />
            {/* vessel watermark on the plinth */}
            <g transform="translate(0,26) scale(1.35)" opacity={0.1}>
              <path
                d="M -7 -8 L -7 4 Q -7 10 -1 10 Q 5 10 5 4 L 5 -8"
                fill="none"
                stroke={PLATE.ink}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <rect x="4.2" y="-9.6" width="3.4" height="3.4" fill={PLATE.sienna} stroke="none" />
            </g>
          </g>

          {/* ————— central library tower: 3 tiers + flag (ink 2) ————— */}
          <g data-ink="2" data-frag="tower">
            <Shadow x={18} y={18} w={20} d={20} s={6} />
            <IsoBox x={18} y={18} z={2} w={20} d={20} h={6} />
            <IsoBox x={20.5} y={20.5} z={8} w={15} d={15} h={7} />
            <IsoBox x={23} y={23} z={15} w={10} d={10} h={8} cornerStone />
            {/* mullion grid on mid tier east face */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                {...lineBetween(iso(35.5, 21 + i * 2.6, 9), iso(35.5, 21 + i * 2.6, 14))}
                stroke={PLATE.muted}
                strokeWidth={0.7}
              />
            ))}
            {/* flag */}
            {(() => {
              const t = iso(28, 28, 23);
              const t2 = iso(28, 28, 29);
              return (
                <g>
                  <line x1={t.sx} y1={t.sy} x2={t2.sx} y2={t2.sy} stroke={PLATE.ink} strokeWidth={1} />
                  <path d={`M ${t2.sx} ${t2.sy} L ${t2.sx - 9} ${t2.sy + 2.4} L ${t2.sx} ${t2.sy + 5} Z`} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth="0.7" />
                </g>
              );
            })()}
          </g>

          {/* ————— four colleges (ink 2, each its own fragment) ————— */}
          <g data-ink="2">
            <Wing x={4} y={4} frag="wing-1" />
            <Wing x={42} y={4} w={11} d={9} h={8} frag="wing-2" />
            <Wing x={4} y={42} w={9} d={11} h={8} frag="wing-3" />
            <Wing x={43} y={43} frag="wing-4" />
          </g>

          {/* ————— quality observatory (ink 3) ————— */}
          <g data-ink="3" data-frag="observatory">
            <Shadow x={47} y={26} w={7} d={7} s={3} />
            <IsoBox x={47} y={26} z={2} w={7} d={7} h={9} hatchEast />
            {(() => {
              const b = iso(50.5, 29.5, 11);
              const t = iso(50.5, 29.5, 17);
              return (
                <g>
                  <line x1={b.sx} y1={b.sy} x2={t.sx} y2={t.sy} stroke={PLATE.ink} strokeWidth={1} />
                  <SheetDiamond cx={t.sx} cy={t.sy - 2.2} s={4.6} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.9} />
                  <circle cx={t.sx} cy={t.sy - 2.2} r={1.3} fill="var(--iso-label-on-ink)" stroke={PLATE.ink} strokeWidth="0.7" />
                </g>
              );
            })()}
          </g>

          {/* ————— community plaza + training field (ink 3) ————— */}
          <g data-ink="3" data-frag="plaza">
            <IsoBox x={20} y={44} z={2} w={17} d={10} h={1.2} top={PLATE.east} />
            {[0, 1, 2].map((i) => (
              <IsoNode key={i} x={24 + i * 4.6} y={49} z={3.4} s={1.1} />
            ))}
            <Route
              points={[
                [24, 49, 3.4],
                [28.6, 49, 3.4],
                [33.2, 49, 3.4],
              ]}
              stroke={PLATE.muted}
              strokeWidth={0.9}
            />
          </g>
          <g data-ink="3" data-frag="field">
            <IsoBox x={6} y={24} z={2} w={8} d={14} h={0.9} top={PLATE.east} />
            <IsoBox x={7.5} y={26} z={2.9} w={5} d={10} h={0.9} top="var(--iso-mid)" />
            <IsoBox x={9} y={28} z={3.8} w={2} d={6} h={0.9} top={PLATE.top} />
          </g>

          {/* ————— data routes: colleges → tower, the ONE system (ink 4) ————— */}
          <g data-ink="4" data-frag="routes">
            <Route points={[[9, 9, 9], [16, 16, 9], [20, 20, 9]]} />
            <Route points={[[47, 8, 10], [40, 16, 10], [36, 21, 10]]} />
            <Route points={[[9, 47, 10], [16, 40, 10], [21, 36, 10]]} />
            <Route points={[[47, 47, 9], [40, 40, 9], [38, 38, 9]]} />
            <Route points={[[50.5, 30, 12], [44, 28, 12], [38, 27, 12]]} stroke="var(--iso-signal)" />
            <Route points={[[24, 49, 4], [22, 42, 6], [24, 38, 8]]} />
            <IsoNode x={16} y={16} z={9} s={1.3} />
            <IsoNode x={40} y={16} z={10} s={1.3} />
            <IsoNode x={16} y={40} z={10} s={1.3} />
            <IsoNode x={40} y={40} z={9} s={1.3} />
            <IsoNode x={44} y={28} z={12} s={1.3} fill="var(--iso-signal)" />
          </g>

          {/* ————— trees ring (ink 4) ————— */}
          <g data-ink="4" data-frag="trees">
            <Tree x={-4} y={12} />
            <Tree x={-4} y={52} s={3} />
            <Tree x={12} y={-4} />
            <Tree x={52} y={-4} s={3} />
            <Tree x={60} y={12} s={3.2} />
            <Tree x={60} y={52} s={2.8} />
            <Tree x={30} y={60} s={3} />
            <Tree x={-4} y={32} s={2.7} />
          </g>

          {/* ————— drafting furniture: north arrow, regmarks, scale bar,
               birds, coordinate readouts (ink 5) ————— */}
          <g data-ink="5" data-frag="furniture">
            <g transform="translate(-50,-12)">
              <circle r="7" fill="none" stroke={PLATE.muted} strokeWidth="0.9" />
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * Math.PI) / 4;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * 9}
                    y1={Math.sin(a) * 9}
                    x2={Math.cos(a) * 12}
                    y2={Math.sin(a) * 12}
                    stroke={PLATE.hair}
                    strokeWidth="0.9"
                  />
                );
              })}
              <path d="M0 -4 L2.6 3 L0 1.4 L-2.6 3 Z" fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth="0.7" />
            </g>
            <RegMark x={-84} y={-14} s={7} />
            <RegMark x={84} y={-14} s={7} />
            {/* scale bar */}
            <g transform="translate(40,104)">
              <rect x="-34" y="-6" width="34" height="3" fill={PLATE.ink} />
              <rect x="0" y="-6" width="34" height="3" fill="none" stroke={PLATE.ink} strokeWidth="0.8" />
              <Coord x={-34} y={-9} anchor="start">0</Coord>
              <Coord x={0} y={-9} anchor="middle">8</Coord>
              <Coord x={34} y={-9} anchor="end">16</Coord>
            </g>
            {/* birds */}
            <g stroke="var(--iso-ink-soft)" strokeWidth="0.9" fill="none">
              <path d="M 8 -14 q 2.4 -2.4 4.8 0 M 12.8 -14 q 2.4 -2.4 4.8 0" />
              <path d="M -2 -8 q 1.8 -1.8 3.6 0 M 1.6 -8 q 1.8 -1.8 3.6 0" />
            </g>
            {/* coordinate readouts (corners, clear of the drawing) */}
            <Coord x={-88} y={-38} anchor="start">X:56.0</Coord>
            <Coord x={-88} y={-26} anchor="start">GRID:32</Coord>
            <Coord x={88} y={-38} anchor="end">Z:24.0</Coord>
            <Coord x={88} y={-26} anchor="end">ISO:30°</Coord>
          </g>

          {/* ————— flat annotations: leaders + labels (ink 6) ————— */}
          <g data-ink="6" data-frag="labels">
            {(() => {
              const towerTop = iso(28, 28, 23);
              const obs = iso(50.5, 29.5, 17);
              const plaza = iso(28, 54, 2);
              const field = iso(10, 31, 4);
              return (
                <g>
                  <Leader from={towerTop} to={{ x: 44, y: -44 }} text="المكتبة البحثية" textAnchor="start" />
                  <Leader from={obs} to={{ x: 90, y: 60 }} text="مرصد الجودة" textAnchor="start" />
                  <Leader from={plaza} to={{ x: -56, y: 112 }} text="ساحة المجتمع" textAnchor="start" />
                  <Leader from={field} to={{ x: -92, y: 62 }} text="ميدان التدريب" textAnchor="end" />
                </g>
              );
            })()}
          </g>
        </>
      ) : (
        /* the trace seat — the same campus, silhouette by silhouette */
        <TraceStrokes />
      )}
    </svg>
  );
}

/** The plate's bounding info for layout (used by Hero + Journey). */
export const CAMPUS_VIEWBOX = `${CAMPUS_FRAME.x} ${CAMPUS_FRAME.y} ${CAMPUS_FRAME.w} ${CAMPUS_FRAME.h}`;
