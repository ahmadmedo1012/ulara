/**
 * CampusArt.tsx — the campus drawing's ONE geometry source (r346
 * dedupe wave).
 *
 * Every semantic FRAGMENT of the isometric campus — the plinth, the
 * research-library tower, the four college wings, the quality
 * observatory, the community plaza, the training field, the dashed
 * data routes, the geometric tree ring, the drafting furniture, the
 * leader labels — renders from this module exactly once. The two
 * sheets that mount the drawing compose their OWN layer wrappers
 * around `<CampusFrag>`:
 *
 *   · hero/CampusPlate — the `data-ink` belt (6 staged layers, the
 *     intro-draw → intro-done entrance choreography, iso-plate.css);
 *   · journey/IsoCampusSheet — the `data-xl` ghost layers (8 seats,
 *     the r312/r325 contracts) + the ×4.4 sheet transform, with the
 *     SHEET_INK_CSS ladder re-keying every weight through the class
 *     hooks below (CSS beats the presentation attributes — the
 *     canonical hero weights are the single authored source).
 *
 * The class hooks (iso-box / iso-route / iso-node / iso-tree /
 * iso-leader / iso-lab / iso-coord / iso-furn / iso-reg) are inert on
 * the hero seat and addressed by the sheet's ladder. Colour law: the
 * PLATE palette (var() references) only.
 */
import { PLATE, iso, poly } from '../../../lib/iso';
import {
  Coord,
  IsoBox,
  IsoNode,
  Leader,
  RegMark,
  Route,
  SheetDiamond,
} from '../kernel/Iso';

/* the fragment names — the driver's FRAG_VECTORS table (the scene)
 * keys the same thirteen strings; the union keeps the switch total. */
type CampusFragName =
  | 'plinth'
  | 'tower'
  | 'wing-1'
  | 'wing-2'
  | 'wing-3'
  | 'wing-4'
  | 'observatory'
  | 'plaza'
  | 'field'
  | 'routes'
  | 'trees'
  | 'furniture'
  | 'labels';

/* ── the shared micro-helpers ────────────────────────────────────────── */

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
    <g className="iso-tree">
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

function Wing({ x, y, w = 10, d = 10, h = 7 }: { x: number; y: number; w?: number; d?: number; h?: number }) {
  return (
    <g>
      <Shadow x={x} y={y} w={w} d={d} s={4} />
      <IsoBox className="iso-box" x={x} y={y} z={2} w={w} d={d} h={h} cornerStone />
      {/* window strips on the east face */}
      <WindowStrips x={x} y={y} z={2} w={w} d={d} h={h} />
    </g>
  );
}

/* ── the fragments ───────────────────────────────────────────────────── */

/**
 * ONE semantic fragment of the campus, by name. The consumer wraps
 * this in its own layer/flight group (`data-ink` / `data-xl` +
 * `data-frag`) — the fragment itself never owns a layer seat.
 */
export function CampusFrag({ name }: { name: CampusFragName }) {
  switch (name) {
    case 'plinth':
      return (
        <>
          {/* ground lattice */}
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
          <IsoBox className="iso-box" x={0} y={0} z={0} w={56} d={56} h={2} top={PLATE.top} />
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
        </>
      );
    case 'tower':
      return (
        <>
          <Shadow x={18} y={18} w={20} d={20} s={6} />
          <IsoBox className="iso-box" x={18} y={18} z={2} w={20} d={20} h={6} />
          <IsoBox className="iso-box" x={20.5} y={20.5} z={8} w={15} d={15} h={7} />
          <IsoBox className="iso-box" x={23} y={23} z={15} w={10} d={10} h={8} cornerStone />
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
        </>
      );
    case 'wing-1':
      return <Wing x={4} y={4} />;
    case 'wing-2':
      return <Wing x={42} y={4} w={11} d={9} h={8} />;
    case 'wing-3':
      return <Wing x={4} y={42} w={9} d={11} h={8} />;
    case 'wing-4':
      return <Wing x={43} y={43} />;
    case 'observatory':
      return (
        <>
          <Shadow x={47} y={26} w={7} d={7} s={3} />
          <IsoBox className="iso-box" x={47} y={26} z={2} w={7} d={7} h={9} hatchEast />
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
        </>
      );
    case 'plaza':
      return (
        <>
          <IsoBox className="iso-box" x={20} y={44} z={2} w={17} d={10} h={1.2} top={PLATE.east} />
          {[0, 1, 2].map((i) => (
            <IsoNode className="iso-node" key={i} x={24 + i * 4.6} y={49} z={3.4} s={1.1} />
          ))}
          <Route
            className="iso-route"
            points={[
              [24, 49, 3.4],
              [28.6, 49, 3.4],
              [33.2, 49, 3.4],
            ]}
            stroke={PLATE.muted}
            strokeWidth={0.9}
          />
        </>
      );
    case 'field':
      return (
        <>
          <IsoBox className="iso-box" x={6} y={24} z={2} w={8} d={14} h={0.9} top={PLATE.east} />
          <IsoBox className="iso-box" x={7.5} y={26} z={2.9} w={5} d={10} h={0.9} top="var(--iso-mid)" />
          <IsoBox className="iso-box" x={9} y={28} z={3.8} w={2} d={6} h={0.9} top={PLATE.top} />
        </>
      );
    case 'routes':
      return (
        <>
          <Route className="iso-route" points={[[9, 9, 9], [16, 16, 9], [20, 20, 9]]} />
          <Route className="iso-route" points={[[47, 8, 10], [40, 16, 10], [36, 21, 10]]} />
          <Route className="iso-route" points={[[9, 47, 10], [16, 40, 10], [21, 36, 10]]} />
          <Route className="iso-route" points={[[47, 47, 9], [40, 40, 9], [38, 38, 9]]} />
          <Route className="iso-route" points={[[50.5, 30, 12], [44, 28, 12], [38, 27, 12]]} stroke="var(--iso-signal)" />
          <Route className="iso-route" points={[[24, 49, 4], [22, 42, 6], [24, 38, 8]]} />
          <IsoNode className="iso-node" x={16} y={16} z={9} s={1.3} />
          <IsoNode className="iso-node" x={40} y={16} z={10} s={1.3} />
          <IsoNode className="iso-node" x={16} y={40} z={10} s={1.3} />
          <IsoNode className="iso-node" x={40} y={40} z={9} s={1.3} />
          <IsoNode className="iso-node" x={44} y={28} z={12} s={1.3} fill="var(--iso-signal)" />
        </>
      );
    case 'trees':
      return (
        <>
          <Tree x={-4} y={12} />
          <Tree x={-4} y={52} s={3} />
          <Tree x={12} y={-4} />
          <Tree x={52} y={-4} s={3} />
          <Tree x={60} y={12} s={3.2} />
          <Tree x={60} y={52} s={2.8} />
          <Tree x={30} y={60} s={3} />
          <Tree x={-4} y={32} s={2.7} />
        </>
      );
    case 'furniture':
      return (
        <g className="iso-furn">
          {/* north arrow + sun compass */}
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
          <g className="iso-reg">
            <RegMark x={-84} y={-14} s={7} />
            <RegMark x={84} y={-14} s={7} />
          </g>
          {/* scale bar */}
          <g transform="translate(40,104)">
            <rect x="-34" y="-6" width="34" height="3" fill={PLATE.ink} />
            <rect x="0" y="-6" width="34" height="3" fill="none" stroke={PLATE.ink} strokeWidth="0.8" />
            <g className="iso-coord">
              <Coord x={-34} y={-9} anchor="start">0</Coord>
              <Coord x={0} y={-9} anchor="middle">8</Coord>
              <Coord x={34} y={-9} anchor="end">16</Coord>
            </g>
          </g>
          {/* birds */}
          <g stroke="var(--iso-ink-soft)" strokeWidth="0.9" fill="none">
            <path d="M 8 -14 q 2.4 -2.4 4.8 0 M 12.8 -14 q 2.4 -2.4 4.8 0" />
            <path d="M -2 -8 q 1.8 -1.8 3.6 0 M 1.6 -8 q 1.8 -1.8 3.6 0" />
          </g>
          {/* coordinate readouts (corners, clear of the drawing) */}
          <g className="iso-coord">
            <Coord x={-88} y={-38} anchor="start">X:56.0</Coord>
            <Coord x={-88} y={-26} anchor="start">GRID:32</Coord>
            <Coord x={88} y={-38} anchor="end">Z:24.0</Coord>
            <Coord x={88} y={-26} anchor="end">ISO:30°</Coord>
          </g>
        </g>
      );
    case 'labels':
      return (
        <g className="iso-lab">
          <g className="iso-leader">
            <Leader from={iso(28, 28, 23)} to={{ x: 44, y: -44 }} text="المكتبة البحثية" textAnchor="start" />
            <Leader from={iso(50.5, 29.5, 17)} to={{ x: 90, y: 60 }} text="مرصد الجودة" textAnchor="start" />
            <Leader from={iso(28, 54, 2)} to={{ x: -56, y: 112 }} text="ساحة المجتمع" textAnchor="start" />
            <Leader from={iso(10, 31, 4)} to={{ x: -92, y: 62 }} text="ميدان التدريب" textAnchor="end" />
          </g>
        </g>
      );
  }
}
