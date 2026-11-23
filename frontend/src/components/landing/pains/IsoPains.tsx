/**
 * IsoPains — r346 · the pains band's isometric self-drawing plates.
 *
 * THE PHASE-4 DIRECTIVE (r346, commit e4c84e7): the landing's flat 2D
 * artwork retires — every drawing becomes an isometric 3D plate in the
 * reference's plate language (geometric volumes on a diamond ground,
 * dashed data routes, drafting furniture, mono micro-tags). This file
 * ports the r346 sandbox rebuild's «المشكلات» recipe (Problems.tsx —
 * cards whose schematics DRAW THEMSELVES when the card enters view)
 * onto the band's own measured seats: each pain column's art cell
 * (problem.artsvg.N — the frozen r335 census seat PainArt held) now
 * renders ONE small isometric plate drawn from the kernel MATH
 * (lib/iso.ts's 30° projection — the kernel components themselves
 * carry no pathLength, so the plates render their own faces through
 * isoBoxFaces/poly, one normalised stroke per face).
 *
 * The four plates keep the band's honest pain stories (the r322
 * lineage: each pain is answered by a live capability — the column
 * text carries the answer; the drawing carries the wound) and absorb
 * the R345 measurement furniture's instrument captions (TRACE Ø /
 * D+14 / ؟ + MAP 8/9 / IDX — — Live.tsx's PainFurniture retired into
 * these plates with this mount):
 *   01 LECTURE — the lectern + screen tower over the audience rows,
 *                the dashed trace that dies midway, and the measuring
 *                ruler it never reaches («TRACE Ø»);
 *   02 GRADING — the offset paper stack, the day-count rail the
 *                correction crawls (D+1 … D+14), the stamp that
 *                outlives the stack («D+14»);
 *   03 MASTERY — the 3×3 concept grid with its one dashed gap cell,
 *                the mastery route bending around the gap the score
 *                cannot name («؟» + «MAP 8/9»);
 *   04 ARCHIVE — the submitted page drifting toward the drawer
 *                cabinet, the trail that dies midway, one index tab
 *                broken away («IDX —»).
 *
 * Motion law (the house grammar, NO GSAP, no keyframes here): the
 * self-draw is TRANSITION-driven — the reveals module (lib/reveals.ts)
 * arms the root (.js-reveal-armed) and writes .in-view on the column
 * (.pm-col rides its ITEM belt); pains.css's r346 section keys every
 * stroke on `.js-reveal-armed .pm-col.in-view` (the R345 furniture's
 * own proven belt), durations on the --t rungs and --ease tokens, the
 * per-stroke ladder on the exempt inline --ipd delay slot. Reduced
 * motion and a dead JS pass both stand the fully-inked plate (hidden
 * initial states exist ONLY under the armed root class).
 *
 * Colour law: every paint flows the --iso-* seats (PLATE, lib/iso.ts)
 * — zero raw literals in this file. The furniture hair lines ride
 * currentColor (the column's own ghost/active tint grammar), the
 * signal routes paint the copper family, and the <path> element is
 * deliberately never used (the band's stroke: currentColor rule
 * targets paths — routes render as <polyline> to keep their paint).
 */
import type { CSSProperties, ReactElement } from 'react';
import { PLATE, iso, isoBoxFaces, poly, sheetDiamond } from '../../../lib/iso';
import { IsoDefs } from '../kernel/Iso';
/* the isometric plate grammar's painting system (the --iso-* seats +
   the loop belt) rides the plate — every plate mounting the kernel
   inherits it (the repo's CSS-rides-the-component law) */
import '../../../styles/landing/iso-plate.css';

/* the art seat's own square sheet (PainArt's frame — the census seat
 * keeps its geometry; the drawing inside is the plate) */
const FRAME = '0 0 200 200';

/* ── the local draw primitives ──────────────────────────────────────
 * One normalised stroke per shape: pathLength={1} + the .ip-draw belt
 * (pains.css) draws the ink; .ip-fill fades the face fill on the same
 * ladder; dashed routes/markers fade instead of drawing (the pm-fx
 * law — a dash-phase tween reads as a glitch, not a draw). */

type Delay = CSSProperties;

const d = (ms: number): Delay => ({ ['--ipd' as string]: `${ms}ms` } as CSSProperties);

/** an isometric box that draws itself: west → east → top, one stroke
 *  per face, the fill fading on the same rung. */
function DrawBox({
  x, y, z = 0, w, dd, h,
  top = PLATE.top, east = PLATE.east, west = PLATE.west,
  delay = 0, step = 70,
}: {
  x: number; y: number; z?: number; w: number; dd: number; h: number;
  top?: string; east?: string; west?: string;
  delay?: number; step?: number;
}) {
  const f = isoBoxFaces(x, y, z, w, dd, h);
  return (
    <g>
      <polygon className="ip-draw ip-fill" pathLength={1} points={f.west} fill={west} stroke={PLATE.ink} strokeWidth={1.3} strokeLinejoin="round" style={d(delay)} />
      <polygon className="ip-draw ip-fill" pathLength={1} points={f.east} fill={east} stroke={PLATE.ink} strokeWidth={1.3} strokeLinejoin="round" style={d(delay + step)} />
      <polygon className="ip-draw ip-fill" pathLength={1} points={f.top} fill={top} stroke={PLATE.ink} strokeWidth={1.3} strokeLinejoin="round" style={d(delay + step * 2)} />
    </g>
  );
}

/** a dashed data route (polyline — keeps its own paint, unlike <path>
 *  which the band's currentColor belt owns) that fades in. */
function DrawRoute({
  points, delay = 0, stroke = PLATE.sienna, strokeWidth = 1.3, opacity = 0.85,
}: {
  points: [number, number, number?][]; delay?: number; stroke?: string; strokeWidth?: number; opacity?: number;
}) {
  const pts = points
    .map((p) => {
      const s = iso(p[0], p[1], p[2] ?? 0);
      return `${s.sx},${s.sy}`;
    })
    .join(' ');
  return (
    <polyline className="ip-dash" points={pts} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="4 3.5" opacity={opacity} strokeLinecap="round" style={d(delay)} />
  );
}

/** a hair furniture line that draws itself (currentColor — the
 *  column's own tint register rides it; the r353 measurement ticks
 *  may override to the royal annotation voice). */
function DrawLine({
  from, to, delay = 0, strokeWidth = 0.9, dashed = false, color = 'currentColor',
}: {
  from: [number, number, number?]; to: [number, number, number?]; delay?: number; strokeWidth?: number; dashed?: boolean; color?: string;
}) {
  const a = iso(from[0], from[1], from[2] ?? 0);
  const b = iso(to[0], to[1], to[2] ?? 0);
  if (dashed) {
    return (
      <line className="ip-dash" x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={color} strokeWidth={strokeWidth} strokeDasharray="3 3" style={d(delay)} />
    );
  }
  return (
    <line className="ip-draw" pathLength={1} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" style={d(delay)} />
  );
}

/** a mono micro-tag (the instrument caption) that lands with a tiny
 *  rise — the r345 furniture's own tag grammar. */
function DrawTag({
  x, y, text, delay = 0, dark = false, anchor = 'middle',
}: {
  x: number; y: number; text: string; delay?: number; dark?: boolean; anchor?: 'start' | 'middle' | 'end';
}) {
  const w = text.length * 4.6 + 6;
  const bx = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w;
  return (
    <g className="ip-tag" style={d(delay)}>
      <rect x={bx} y={y - 7.5} width={w} height={12} fill={dark ? PLATE.ink : PLATE.paperHi} stroke={PLATE.ink} strokeWidth={0.8} />
      <text x={bx + w / 2} y={y + 1} textAnchor="middle" fontSize={7} fontFamily="var(--font-iso-mono), monospace" fontWeight={500} fill={dark ? 'var(--iso-label-on-ink)' : PLATE.ink} style={{ direction: 'ltr' }}>
        {text}
      </text>
    </g>
  );
}

/** the diamond ground lattice (the plate's own sheet of paper). */
function DrawGround({ x, y, w, dd, delay = 0 }: { x: number; y: number; w: number; dd: number; delay?: number }) {
  return (
    <polygon
      className="ip-fill"
      points={poly(
        { x, y, z: 0 },
        { x: x + w, y, z: 0 },
        { x: x + w, y: y + dd, z: 0 },
        { x, y: y + dd, z: 0 },
      )}
      fill="url(#ulara-ground)"
      opacity={0.45}
      style={d(delay)}
    />
  );
}

/* ── 01 · LECTURE — the trace that never reaches the ruler ────────── */

function DrawLecture() {
  const ring = iso(19.5, -6, 1); // where the signal should land
  return (
    <>
      <DrawGround x={-24} y={-20} w={46} dd={42} delay={80} />
      {/* the lectern + the screen tower above it */}
      <DrawBox x={-20} y={-16} w={8} dd={8} h={6} delay={160} />
      <DrawBox x={-22} y={-14} z={6} w={14} dd={6} h={9} delay={300} />
      {/* the play diamond on the screen's top face — the lecture plays */}
      <polygon className="ip-draw ip-fill" pathLength={1} points={sheetDiamond(iso(-15, -11, 15.6).sx, iso(-15, -11, 15.6).sy, 2.6)} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.9} style={d(580)} />
      {/* the audience rows — six seats, no signal returning */}
      {[-16, -8, 0].map((ax, i) =>
        [2, 10].map((ay, j) => (
          <DrawBox key={`${i}-${j}`} x={ax} y={ay} w={4} dd={4} h={2} delay={660 + (i * 2 + j) * 90} step={40} />
        )),
      )}
      {/* the measuring ruler — full height, at the far edge; its ticks
          read ROYAL (r353: the platform's measurement voice on the
          wound — the system that would have caught the dead trace) */}
      <DrawBox x={18} y={-8} w={3} dd={4} h={24} delay={1350} />
      {[3, 7, 11, 15, 19, 23].map((tz, i) => (
        <DrawLine key={tz} from={[21, -7.6, tz]} to={[21, -6.2, tz]} delay={1450 + i * 45} strokeWidth={0.8} color={PLATE.royal} />
      ))}
      {/* the lecture's dashed trace — it dies midway, never arriving */}
      <DrawRoute points={[[-10, -9, 15], [4, -3, 10], [14, -4, 7]]} delay={1700} />
      <DrawRoute points={[[14, -4, 7], [14, -4, 3]]} delay={1820} opacity={0.55} />
      {/* the empty landing ring — the signal that never lands */}
      <polygon className="ip-dash" points={sheetDiamond(ring.sx, ring.sy, 5.5)} fill="none" stroke={PLATE.sienna} strokeWidth={1.2} strokeDasharray="3 3" style={d(1900)} />
      <DrawTag x={ring.sx} y={ring.sy + 13} text="TRACE Ø" delay={2050} />
    </>
  );
}

/* ── 02 · GRADING — the stack outlives the correction ─────────────── */

function DrawGrading() {
  const stampTop = iso(21, 5.5, 4.5); // above the D+14 stamp
  return (
    <>
      <DrawGround x={-24} y={-18} w={44} dd={36} delay={80} />
      {/* the paper stack — four offset sheets, the oldest darkest */}
      <DrawBox x={-22} y={-10} w={12} dd={9} h={1.6} delay={160} step={50} />
      <DrawBox x={-20} y={-8.5} z={1.6} w={12} dd={9} h={1.6} delay={330} step={50} />
      <DrawBox x={-18} y={-7} z={3.2} w={12} dd={9} h={1.6} delay={500} step={50} />
      <DrawBox x={-16} y={-5.5} z={4.8} w={12} dd={9} h={1.6} top={PLATE.east} delay={670} step={50} />
      {/* correction rows on the top sheet */}
      {[-3.5, -1, 1.5].map((ly, i) => (
        <DrawLine key={ly} from={[-14, ly, 6.4]} to={[-7, ly, 6.4]} delay={840 + i * 70} strokeWidth={0.8} />
      ))}
      {/* the day-count rail — the correction's journey across the
          weeks; the ticks read ROYAL (the platform's clock on the
          wound — the wait the system would have closed) */}
      <DrawBox x={-8} y={6} w={34} dd={4} h={1} delay={1000} step={60} />
      {[-6, -1.8, 2.4, 6.6, 10.8, 15, 19.2, 23.4].map((tx, i) => (
        <DrawLine key={tx} from={[tx, 7.2, 1]} to={[tx, 8.8, 1]} delay={1120 + i * 55} strokeWidth={0.8} color={PLATE.royal} />
      ))}
      {/* the inked crawl — only the first stretch is ever corrected */}
      <DrawRoute points={[[-6, 8, 1.6], [10, 8, 1.6]]} delay={1600} strokeWidth={1.6} opacity={1} />
      {/* the dashed remainder — weeks away */}
      <DrawRoute points={[[10, 8, 1.6], [24, 8, 1.6]]} delay={1720} opacity={0.55} />
      {/* the D+14 stamp slamming in past the rail's end */}
      <DrawBox x={18} y={3} z={1} w={6} dd={5} h={3.5} top={PLATE.sienna} delay={1850} />
      <DrawTag x={stampTop.sx} y={stampTop.sy - 9} text="D+14" delay={2050} dark />
      {/* the rail's own day labels */}
      <DrawTag x={iso(-6, 11, 1).sx} y={iso(-6, 11, 1).sy + 9} text="D+1" delay={2150} />
    </>
  );
}

/* ── 03 · MASTERY — the map with its unnamed gap ───────────────────── */

function DrawMastery() {
  const cols = [-24, -15, -6];
  const rows = [-16, -7, 2];
  const gapCol = 1; // the centre cell — the concept the score cannot name
  const gapRow = 1;
  const gapTop = iso(cols[1]! + 3.5, rows[1]! + 3.5, 1.4); // the gap cell's top centre
  return (
    <>
      <DrawGround x={-26} y={-20} w={50} dd={40} delay={80} />
      {/* the 3×3 concept grid — eight cells land, one never does */}
      {cols.map((cx, c) =>
        rows.map((cy, r) =>
          c === gapCol && r === gapRow ? null : (
            <DrawBox key={`${c}-${r}`} x={cx} y={cy} w={7} dd={7} h={1.4} delay={160 + (c * 3 + r) * 110} step={55} />
          ),
        ),
      )}
      {/* the gap cell — dashed, unfilled, unnamed */}
      <polygon
        className="ip-dash"
        points={isoBoxFaces(cols[1]!, rows[1]!, 0, 7, 7, 1.4).top}
        fill="none"
        stroke={PLATE.sienna}
        strokeWidth={1.2}
        strokeDasharray="3.5 3"
        style={d(1050)}
      />
      <text className="ip-tag" x={gapTop.sx} y={gapTop.sy - 7} textAnchor="middle" fontSize={13} fontFamily="var(--font-iso-arabic), sans-serif" fontWeight={600} fill={PLATE.sienna} style={{ ...d(1150), direction: 'rtl' }}>
        ؟
      </text>
      {/* the mastery route — visiting the cells, bending around the gap */}
      <DrawRoute points={[[-20.5, -12.5, 2], [-2.5, -12.5, 2], [-2.5, -3.5, 2], [6, -3.5, 2]]} delay={1250} />
      {([
        [-20.5, -12.5, 2],
        [-2.5, -12.5, 2],
        [-2.5, -3.5, 2],
      ] as [number, number, number][]).map((n, i) => (
        <polygon
          key={i}
          className="ip-draw ip-fill"
          pathLength={1}
          points={sheetDiamond(iso(n[0], n[1], n[2]).sx, iso(n[0], n[1], n[2]).sy, 1.7)}
          fill={PLATE.sienna}
          stroke={PLATE.ink}
          strokeWidth={0.8}
          style={d(1350 + i * 90)}
        />
      ))}
      {/* the map's two axes — the measure frame, in the royal
          annotation voice (r353: the platform's measure over the
          unnamed gap) */}
      <DrawLine from={[-26, -20, 0]} to={[24, -20, 0]} delay={1620} strokeWidth={0.9} color={PLATE.royal} />
      <polyline className="ip-draw" pathLength={1} points={`${iso(24, -20, 0).sx},${iso(24, -20, 0).sy} ${iso(21.4, -19, 0).sx},${iso(21.4, -19, 0).sy} ${iso(21.4, -21, 0).sx},${iso(21.4, -21, 0).sy}`} fill="none" stroke={PLATE.royal} strokeWidth={0.9} strokeLinejoin="round" style={d(1680)} />
      <DrawLine from={[-26, -20, 0]} to={[-26, 20, 0]} delay={1740} strokeWidth={0.9} color={PLATE.royal} />
      <polyline className="ip-draw" pathLength={1} points={`${iso(-26, 20, 0).sx},${iso(-26, 20, 0).sy} ${iso(-25, 17.4, 0).sx},${iso(-25, 17.4, 0).sy} ${iso(-27, 17.4, 0).sx},${iso(-27, 17.4, 0).sy}`} fill="none" stroke={PLATE.royal} strokeWidth={0.9} strokeLinejoin="round" style={d(1800)} />
      {/* the counted-vs-unnamed tag */}
      <DrawTag x={iso(6, -3.5, 2).sx + 14} y={iso(6, -3.5, 2).sy + 2} text="MAP 8/9" delay={1950} />
    </>
  );
}

/* ── 04 · ARCHIVE — the page that never completes its trail ────────── */

function DrawArchive() {
  const brokenTab = isoBoxFaces(21.5, -8, 22, 3, 3, 1.2).top;
  return (
    <>
      <DrawGround x={-26} y={-18} w={48} dd={36} delay={80} />
      {/* the archive cabinet — tall, three drawers deep */}
      <DrawBox x={12} y={-10} w={11} dd={10} h={22} delay={160} />
      {[6, 11.5, 17].map((dz, i) => (
        <DrawLine key={dz} from={[23, -9, dz]} to={[23, -1, dz]} delay={380 + i * 70} strokeWidth={0.8} />
      ))}
      {/* the one drawer pulled out — one sheet filed, then nothing */}
      <DrawBox x={6} y={-8} z={4} w={5} dd={6} h={3} delay={600} step={55} />
      <DrawLine from={[7.2, -5.5, 7.1]} to={[10, -5.5, 7.1]} delay={760} strokeWidth={0.8} />
      {/* the index tabs on the cabinet's top — the third broken away */}
      <DrawBox x={13.5} y={-8} z={22} w={3} dd={3} h={1.2} delay={840} step={50} />
      <DrawBox x={17.5} y={-8} z={22} w={3} dd={3} h={1.2} delay={940} step={50} />
      <polygon className="ip-dash" points={brokenTab} fill="none" stroke={PLATE.sienna} strokeWidth={1.1} strokeDasharray="3 3" style={d(1060)} />
      {/* the submitted page — floating, drifting toward the archive */}
      <DrawBox x={-24} y={-8} z={12} w={10} dd={7} h={1} delay={1150} step={60} />
      {[-6, -3.5, -1].map((ly, i) => (
        <DrawLine key={ly} from={[-22, ly, 13]} to={[-15, ly, 13]} delay={1330 + i * 70} strokeWidth={0.8} />
      ))}
      {/* the fading trail — the path the research never completes */}
      <DrawRoute points={[[-13, -4, 12.5], [-4, -3.5, 10.5]]} delay={1560} />
      <DrawRoute points={[[-4, -3.5, 10.5], [8, -4, 7]]} delay={1680} opacity={0.5} />
      {/* the lost-index tag — clear of the broken tab, above it */}
      <DrawTag x={28} y={-24} text="IDX —" delay={1820} />
    </>
  );
}

/* the seat → scene table (PainArt's own kind contract, kept verbatim;
 * the cx/cy pair centres each scene's projection on the square sheet) */
const SCENES: Record<'01' | '02' | '03' | '04', { draw: () => ReactElement; cx: number; cy: number }> = {
  '01': { draw: DrawLecture, cx: 102, cy: 106 },
  '02': { draw: DrawGrading, cx: 102, cy: 102 },
  '03': { draw: DrawMastery, cx: 101, cy: 101 },
  '04': { draw: DrawArchive, cx: 102, cy: 101 },
};

export function IsoPains({ kind, 'data-spec': dataSpec }: { kind: '01' | '02' | '03' | '04'; 'data-spec'?: string }) {
  const scene = SCENES[kind];
  return (
    <svg
      className="pm-art ip-svg"
      viewBox={FRAME}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      data-spec={dataSpec}
    >
      <IsoDefs />
      {/* the iso-space scene: authored around the origin, scaled to the
          seat, centred on the sheet (the CampusPlate frame convention) */}
      <g transform={`translate(${scene.cx} ${scene.cy}) scale(1.5)`}>
        <scene.draw />
      </g>
    </svg>
  );
}
