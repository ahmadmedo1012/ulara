/**
 * CampusArt.tsx — the campus drawing's ONE geometry source (r346
 * dedupe wave → r353 the architectural rebuild).
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
 * iso-leader / iso-lab / iso-coord / iso-furn / iso-reg + the r353
 * iso-arcade / iso-palm / iso-dome / iso-dim) are inert on the hero
 * seat and addressed by the sheet's ladder. Colour law: the PLATE
 * palette (var() references) only.
 *
 * ── r353 · THE ARCHITECTURAL REBUILD (the visual-artwork round) ──
 * The macro composition is UNCHANGED (the plinth, the tower's three
 * tiers, the four wing seats, the observatory, plaza, field — every
 * fragment keeps its footprint so the inspection stations, the
 * flight vectors and the de-collided label seats all hold). What
 * changes is the DRAWING'S OWN ARCHITECTURE — each volume gains the
 * register of a surveyed institutional drawing:
 *   · a real campus EDGE — a perimeter wall with a gate (piers +
 *     lintel + pennant) on the reading-start corner, and a paved
 *     spine running gate → tower;
 *   · the library tower carries its riwaq arcade on the ground tier,
 *     a glazed mullion lantern on the middle tier, a clerestory crown
 *     and a DOME over the reading room — the landmark silhouette;
 *   · the wings read as four DIFFERENT buildings: an arcaded faculty
 *     wing, a stepped lecture annex, a hipped-roof hall and a
 *     laboratory bar with its rooftop unit — parapets, doors and a
 *     fenestration grid on BOTH faces everywhere;
 *   · the observatory is a drum + dome with an instrument slit;
 *   · the plaza centres on an octagonal fountain (the basin, the
 *     royal water disc, the jet) with benches and lamp posts;
 *   · the field gains its track lanes, a goal and a two-step stand;
 *   · the planting mixes geometric trees with palms;
 *   · the DATA layer paints ROYAL (the platform's routes + nodes +
 *     dimensions — the 2026 identity law: blue = the system, the one
 *     warm sienna = the learner's journey, on the observatory beacon
 *     and the flag alone).
 * Line-weight hierarchy: profile 1.6–1.8 on silhouettes, structure
 * 1.1–1.3, detail 0.7–0.9 — the drafting sheet's own three voices.
 */
import { PLATE, iso, poly } from '../../../lib/iso';
import {
  Arcade,
  Coord,
  Dim,
  IsoBox,
  IsoDome,
  IsoNode,
  Leader,
  Palm,
  RegMark,
  Route,
  SheetDiamond,
  isoEllipse,
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

/** A mullion fenestration grid on one face — n columns × 2 rows of
 *  light strokes between z0 and z1 (the wings' glazing voice). */
function WindowGrid({
  x,
  y,
  z,
  w,
  d,
  h,
  face = 'east',
  cols = 3,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  face?: 'east' | 'west';
  cols?: number;
}) {
  const lines = [];
  for (let i = 1; i <= cols; i++) {
    const t = i / (cols + 1);
    const p = face === 'east' ? x + w : x + w * t;
    const q = face === 'east' ? y + d * t : y + d;
    lines.push(
      <line
        key={`c${i}`}
        {...lineBetween(iso(p, q, z + h * 0.22), iso(p, q, z + h * 0.78))}
        stroke={PLATE.muted}
        strokeWidth={0.8}
      />,
    );
  }
  /* the transom — one horizontal mid-rail across the glazing */
  const rA = face === 'east' ? iso(x + w, y + d * 0.15, z + h * 0.5) : iso(x + w * 0.15, y + d, z + h * 0.5);
  const rB = face === 'east' ? iso(x + w, y + d * 0.85, z + h * 0.5) : iso(x + w * 0.85, y + d, z + h * 0.5);
  lines.push(<line key="rail" x1={rA.sx} y1={rA.sy} x2={rB.sx} y2={rB.sy} stroke={PLATE.muted} strokeWidth={0.7} />);
  return <g>{lines}</g>;
}

/** The wing — one college building. Every variant shares the base
 *  mass + parapet + fenestration + door; the flavour rides the
 *  options (arcade | annex | hip | roofUnit) so each wing reads as a
 *  DIFFERENT building while one function paints them all. */
function Wing({
  x,
  y,
  w = 10,
  d = 10,
  h = 7,
  arcade = false,
  annex = false,
  hip = false,
  roofUnit = false,
}: {
  x: number;
  y: number;
  w?: number;
  d?: number;
  h?: number;
  arcade?: boolean;
  annex?: boolean;
  hip?: boolean;
  roofUnit?: boolean;
}) {
  const roofZ = 2 + h;
  return (
    <g>
      <Shadow x={x} y={y} w={w} d={d} s={4} />
      {/* r354 colour-law pass: the wing's base drops its copper quoin
          (cornerStone) — four wings × one inlay each read as a scatter
          of copper points across the plinth; the wings keep clean
          silhouettes (their arcades and roofs speak), the warm voice
          stays on the campus's OWN focal moments (the two flags + the
          observatory beacon + its signal route) */}
      <IsoBox className="iso-box" x={x} y={y} z={2} w={w} d={d} h={h} strokeWidth={1.5} />
      {hip ? (
        /* the hipped roof — ridge + four hips, two shaded faces */
        (() => {
          const rz = roofZ + 2.8;
          const r1 = iso(x + w * 0.3, y + d * 0.3, rz);
          const r2 = iso(x + w * 0.7, y + d * 0.7, rz);
          const c1 = iso(x, y, roofZ);
          const c2 = iso(x + w, y, roofZ);
          const c3 = iso(x + w, y + d, roofZ);
          const c4 = iso(x, y + d, roofZ);
          return (
            <g>
              <polygon points={`${c1.sx},${c1.sy} ${r1.sx},${r1.sy} ${c4.sx},${c4.sy}`} fill={PLATE.west} stroke={PLATE.ink} strokeWidth={0.9} />
              <polygon points={`${c2.sx},${c2.sy} ${r2.sx},${r2.sy} ${c3.sx},${c3.sy}`} fill={PLATE.west} stroke={PLATE.ink} strokeWidth={0.9} />
              <polygon points={`${c1.sx},${c1.sy} ${r1.sx},${r1.sy} ${r2.sx},${r2.sy} ${c2.sx},${c2.sy}`} fill={PLATE.top} stroke={PLATE.ink} strokeWidth={0.9} />
              <polygon points={`${c4.sx},${c4.sy} ${r1.sx},${r1.sy} ${r2.sx},${r2.sy} ${c3.sx},${c3.sy}`} fill={PLATE.east} stroke={PLATE.ink} strokeWidth={0.9} />
              <line x1={r1.sx} y1={r1.sy} x2={r2.sx} y2={r2.sy} stroke={PLATE.ink} strokeWidth={1.1} />
            </g>
          );
        })()
      ) : (
        /* the parapet — the flat roof's own edge */
        <IsoBox className="iso-box" x={x + 0.9} y={y + 0.9} z={roofZ} w={w - 1.8} d={d - 1.8} h={0.7} top={PLATE.east} stroke={PLATE.ink} strokeWidth={0.7} />
      )}
      {roofUnit && (
        <IsoBox className="iso-box" x={x + w * 0.5 - 1.5} y={y + d * 0.5 - 1.5} z={roofZ + 0.7} w={3} d={3} h={1.5} strokeWidth={0.8} />
      )}
      {annex && (
        /* the lecture annex — a lower stepped block off the east face */
        <g>
          <IsoBox className="iso-box" x={x + w} y={y + 1} z={2} w={5} d={d - 2} h={3.2} strokeWidth={1.2} />
          <Arcade x={x + w} y={y + 1} z={2} w={5} d={d - 2} h={2.4} face="east" n={3} />
        </g>
      )}
      <WindowGrid x={x} y={y} z={2} w={w} d={d} h={h} face="east" />
      <WindowGrid x={x} y={y} z={2} w={w} d={d} h={h} face="west" />
      {arcade && <Arcade x={x} y={y} z={2} w={w} d={d} h={h} face="west" n={3} />}
      {/* the door — a small ink opening on the front corner */}
      <polygon
        points={poly(
          { x: x + w - 3.4, y: y + d, z: 2 },
          { x: x + w - 1.6, y: y + d, z: 2 },
          { x: x + w - 1.6, y: y + d, z: 2 + 2.4 },
          { x: x + w - 3.4, y: y + d, z: 2 + 2.4 },
        )}
        fill={PLATE.ink}
        stroke="none"
        opacity={0.82}
      />
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
          <IsoBox className="iso-box" x={0} y={0} z={0} w={56} d={56} h={2} top={PLATE.top} strokeWidth={1.8} />
          {/* the campus edge — a low perimeter wall (three runs; the
              west run opens for the gate). r353 refinement: the wall's
              top reads LIGHT (PLATE.top) and its stroke steps down —
              the tower owns the plate's black, the edge stays a step
              lighter than the masses (the line-weight law). */}
          {[
            { x: 1.6, y: 1.6, w: 52.8, d: 1.1 },
            { x: 1.6, y: 1.6, w: 1.1, d: 52.8 },
            { x: 54.3, y: 1.6, w: 1.1, d: 52.8 },
          ].map((seg, i) => (
            <IsoBox className="iso-box" key={i} x={seg.x} y={seg.y} z={2} w={seg.w} d={seg.d} h={2} top={PLATE.top} strokeWidth={0.8} />
          ))}
          {/* the west wall's two leaves — the gate gap between them */}
          <IsoBox className="iso-box" x={1.6} y={54.3} w={21} d={1.1} h={2} z={2} top={PLATE.top} strokeWidth={0.8} />
          <IsoBox className="iso-box" x={33.4} y={54.3} w={21} d={1.1} h={2} z={2} top={PLATE.top} strokeWidth={0.8} />
          {/* the gate — two piers, the lintel, the pennant (r354: the
              piers drop their copper quoins — the gate's warm voice is
              the PENNANT, the learner's threshold flag, not cut-stone
              inlays) */}
          <IsoBox className="iso-box" x={23} y={53.6} w={2} d={2.5} h={5.4} strokeWidth={1.1} />
          <IsoBox className="iso-box" x={31} y={53.6} w={2} d={2.5} h={5.4} strokeWidth={1.1} />
          <IsoBox className="iso-box" x={23} y={54.2} z={7.4} w={10} d={1.3} h={0.9} top={PLATE.east} strokeWidth={0.9} />
          {(() => {
            const t = iso(28, 54.8, 8.3);
            return (
              <path d={`M ${t.sx} ${t.sy} l -6.4 -1.6 l 0 3.4 Z`} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
            );
          })()}
          {/* the paved spine — gate → tower forecourt */}
          {Array.from({ length: 7 }, (_, i) => {
            const yy = 51.4 - i * 2.2;
            return (
              <line
                key={i}
                {...lineBetween(iso(24.6, yy, 2), iso(31.4, yy, 2))}
                stroke={PLATE.hair}
                strokeWidth={0.7}
              />
            );
          })}
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
          {/* the ground tier — the riwaq: an arcaded hall on both
              front faces carrying the reading rooms above */}
          <IsoBox className="iso-box" x={18} y={18} z={2} w={20} d={20} h={6} strokeWidth={1.6} />
          <Arcade x={18} y={18} z={2} w={20} d={20} h={4.4} face="east" n={5} />
          <Arcade x={18} y={18} z={2} w={20} d={20} h={4.4} face="west" n={5} />
          {/* the lantern tier — the glazed mullion shaft */}
          <IsoBox className="iso-box" x={20.5} y={20.5} z={8} w={15} d={15} h={7} strokeWidth={1.3} />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`e${i}`}
              {...lineBetween(iso(35.5, 21 + i * 2.6, 9), iso(35.5, 21 + i * 2.6, 14))}
              stroke={PLATE.royal}
              strokeWidth={0.7}
              opacity={0.65}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`w${i}`}
              {...lineBetween(iso(21 + i * 2.6, 35.5, 9), iso(21 + i * 2.6, 35.5, 14))}
              stroke={PLATE.royal}
              strokeWidth={0.7}
              opacity={0.65}
            />
          ))}
          {/* the crown — clerestory slits + the dome over the
              reading room + the finial flag */}
          <IsoBox className="iso-box" x={23} y={23} z={15} w={10} d={10} h={8} strokeWidth={1.4} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line {...lineBetween(iso(33, 25.5 + i * 3, 16.4), iso(33, 25.5 + i * 3, 21.4))} stroke={PLATE.muted} strokeWidth={0.8} />
              <line {...lineBetween(iso(25.5 + i * 3, 33, 16.4), iso(25.5 + i * 3, 33, 21.4))} stroke={PLATE.muted} strokeWidth={0.8} />
            </g>
          ))}
          {/* r354 — oculus={false}: the reading-room dome drops its warm
              oculus dot (another copper scatter point); the tower's warm
              voice is the finial flag alone */}
          <IsoDome x={28} y={28} z={23} r={5.6} oculus={false} />
          {(() => {
            const t = iso(28, 28, 27.4);
            const t2 = iso(28, 28, 31);
            return (
              <g>
                <line x1={t.sx} y1={t.sy} x2={t2.sx} y2={t2.sy} stroke={PLATE.ink} strokeWidth={1} />
                <path d={`M ${t2.sx} ${t2.sy} L ${t2.sx - 8.6} ${t2.sy + 2.3} L ${t2.sx} ${t2.sy + 4.8} Z`} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth="0.7" />
              </g>
            );
          })()}
        </>
      );
    case 'wing-1':
      return <Wing x={4} y={4} arcade />;
    case 'wing-2':
      return <Wing x={42} y={4} w={11} d={9} h={8} annex />;
    case 'wing-3':
      return <Wing x={4} y={42} w={9} d={11} h={8} hip />;
    case 'wing-4':
      return <Wing x={43} y={43} roofUnit />;
    case 'observatory':
      return (
        <>
          <Shadow x={47} y={26} w={7} d={7} s={3} />
          <IsoBox className="iso-box" x={47} y={26} z={2} w={7} d={7} h={9} hatchEast strokeWidth={1.4} />
          {/* the drum + dome + the instrument slit (r353: the drum
              rises a full instrument storey — the observatory reads
              telescope, not tank) */}
          {(() => {
            const b = isoEllipse(50.5, 29.5, 11, 3.4);
            return (
              <g className="iso-dome">
                <path
                  d={`M ${b.cx - b.rx} ${b.cy} V ${b.cy - 5.4} A ${b.rx} ${b.ry} 0 0 1 ${b.cx + b.rx} ${b.cy - 5.4} V ${b.cy}`}
                  fill="none"
                  stroke={PLATE.ink}
                  strokeWidth={0.9}
                />
                <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={PLATE.top} stroke={PLATE.ink} strokeWidth={0.9} />
              </g>
            );
          })()}
          <IsoDome x={50.5} y={29.5} z={16.4} r={3.4} oculus={false} />
          {(() => {
            const s1 = iso(50.5, 29.5, 16.4);
            const s2 = iso(50.5, 29.5, 19.8);
            return <line x1={s1.sx} y1={s1.sy} x2={s2.sx} y2={s2.sy} stroke={PLATE.ink} strokeWidth={0.9} />;
          })()}
          {/* the beacon — the ONE warm focal point on the data net */}
          {(() => {
            const t = iso(50.5, 29.5, 20.6);
            return (
              <g>
                <line x1={t.sx} y1={t.sy} x2={t.sx} y2={t.sy - 3.6} stroke={PLATE.ink} strokeWidth={1} />
                <SheetDiamond cx={t.sx} cy={t.sy - 5.6} s={4.4} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.9} />
                <circle cx={t.sx} cy={t.sy - 5.6} r={1.3} fill="var(--iso-label-on-ink)" stroke={PLATE.ink} strokeWidth="0.7" />
              </g>
            );
          })()}
        </>
      );
    case 'plaza':
      return (
        <>
          <IsoBox className="iso-box" x={20} y={44} z={2} w={17} d={10} h={1.2} top={PLATE.east} strokeWidth={1.1} />
          {/* the fountain — basin ring, the royal water disc, the jet
              (r353: scaled to a fountain, not a pool — the basin reads
              as furniture on the plaza slab) */}
          {(() => {
            const o = isoEllipse(28.5, 49, 3.2, 3.7);
            const wtr = isoEllipse(28.5, 49, 3.3, 2.7);
            const c = iso(28.5, 49, 3.3);
            return (
              <g className="iso-furn">
                <ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fill={PLATE.paperHi} stroke={PLATE.ink} strokeWidth={0.95} />
                <ellipse cx={wtr.cx} cy={wtr.cy} rx={wtr.rx} ry={wtr.ry} fill={PLATE.royal} stroke={PLATE.ink} strokeWidth={0.6} opacity={0.32} />
                <line x1={c.sx} y1={c.sy} x2={c.sx} y2={c.sy - 3} stroke={PLATE.royal} strokeWidth={1} strokeLinecap="round" />
                <line x1={c.sx} y1={c.sy - 3} x2={c.sx - 1.8} y2={c.sy - 1.2} stroke={PLATE.royal} strokeWidth={0.85} strokeLinecap="round" opacity={0.75} />
                <line x1={c.sx} y1={c.sy - 3} x2={c.sx + 1.8} y2={c.sy - 1.2} stroke={PLATE.royal} strokeWidth={0.85} strokeLinecap="round" opacity={0.75} />
              </g>
            );
          })()}
          {/* benches + lamp posts */}
          <IsoBox className="iso-box" x={35.2} y={45.6} z={3.2} w={1.2} d={3.6} h={1} strokeWidth={0.7} />
          <IsoBox className="iso-box" x={20.8} y={51.2} z={3.2} w={1.2} d={3.6} h={1} strokeWidth={0.7} />
          {([
            [21.6, 46.2],
            [35.4, 52.4],
          ] as const).map(([lx, ly], i) => {
            const p = iso(lx, ly, 3.2);
            return (
              <g key={i} className="iso-furn">
                <line x1={p.sx} y1={p.sy} x2={p.sx} y2={p.sy - 4.4} stroke={PLATE.ink} strokeWidth={0.9} />
                {/* r354 — the lamp crowns de-copper (furniture, not a
                    focal moment): the plaza's warm voice stays with the
                    observatory beacon alone */}
                <SheetDiamond cx={p.sx} cy={p.sy - 5.4} s={1.1} fill={PLATE.ink} stroke={PLATE.ink} strokeWidth={0.6} />
              </g>
            );
          })}
          <Route
            className="iso-route"
            points={[
              [33.8, 49, 3.4],
              [36.5, 49, 3.4],
            ]}
            stroke={PLATE.muted}
            strokeWidth={0.9}
          />
          <IsoNode className="iso-node" x={36.5} y={49} z={3.4} s={1} />
        </>
      );
    case 'field':
      return (
        <>
          <IsoBox className="iso-box" x={6} y={24} z={2} w={8} d={14} h={0.9} top={PLATE.east} strokeWidth={1.1} />
          <IsoBox className="iso-box" x={7.5} y={26} z={2.9} w={5} d={10} h={0.9} top="var(--iso-mid)" strokeWidth={0.8} />
          <IsoBox className="iso-box" x={9} y={28} z={3.8} w={2} d={6} h={0.9} top={PLATE.top} strokeWidth={0.8} />
          {/* the track lanes — three painted runs down the straight */}
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              {...lineBetween(iso(6.4, 27.5 + i * 3.4, 2.95), iso(13.6, 27.5 + i * 3.4, 2.95))}
              stroke={PLATE.muted}
              strokeWidth={0.6}
              strokeDasharray="2.4 2"
            />
          ))}
          {/* the goal — two posts + the crossbar at the west end */}
          {(() => {
            const a = iso(6.6, 30.4, 2.9);
            const b = iso(6.6, 33.6, 2.9);
            return (
              <g stroke={PLATE.ink} strokeWidth={0.9} fill="none">
                <line x1={a.sx} y1={a.sy} x2={a.sx} y2={a.sy - 3.4} />
                <line x1={b.sx} y1={b.sy} x2={b.sx} y2={b.sy - 3.4} />
                <line x1={a.sx} y1={a.sy - 3.4} x2={b.sx} y2={b.sy - 3.4} />
              </g>
            );
          })()}
          {/* the stand — a two-step bleacher on the north side */}
          <IsoBox className="iso-box" x={6.6} y={22.4} z={2} w={6.6} d={1.4} h={1.1} top={PLATE.east} strokeWidth={0.7} />
          <IsoBox className="iso-box" x={6.6} y={21.2} z={2} w={6.6} d={1.2} h={2.2} top={PLATE.east} strokeWidth={0.7} />
        </>
      );
    case 'routes':
      return (
        <>
          {/* the DATA NET — royal (the platform's routes: every wing
              feeds the tower; the tower feeds the observatory) */}
          <Route className="iso-route" points={[[9, 9, 9], [16, 16, 9], [20, 20, 9]]} stroke={PLATE.royal} />
          <Route className="iso-route" points={[[47, 8, 10], [40, 16, 10], [36, 21, 10]]} stroke={PLATE.royal} />
          <Route className="iso-route" points={[[9, 47, 10], [16, 40, 10], [21, 36, 10]]} stroke={PLATE.royal} />
          <Route className="iso-route" points={[[47, 47, 9], [40, 40, 9], [38, 38, 9]]} stroke={PLATE.royal} />
          <Route className="iso-route" points={[[24, 49, 4], [22, 42, 6], [24, 38, 8]]} stroke={PLATE.royal} />
          {/* the observatory signal — the ONE warm route on the sheet
              (r354: rides --iso-sienna directly — the redundant
              --iso-signal alias retires; ONE warm seat, one name) */}
          <Route className="iso-route" points={[[50.5, 30, 12], [44, 28, 12], [38, 27, 12]]} stroke={PLATE.sienna} />
          {/* the flow chevrons — direction on the two reading-start
              routes (small royal arrows, the net's own pulse) */}
          {([
            [16, 16, 9],
            [40, 40, 9],
          ] as const).map(([cx, cy, cz], i) => {
            const p = iso(cx, cy, cz);
            return (
              <path
                key={i}
                className="iso-route"
                d={`M ${p.sx - 2} ${p.sy - 1.6} L ${p.sx + 0.6} ${p.sy} L ${p.sx - 2} ${p.sy + 1.6}`}
                fill="none"
                stroke={PLATE.royal}
                strokeWidth={0.9}
                strokeLinecap="round"
              />
            );
          })}
          <IsoNode className="iso-node" x={16} y={16} z={9} s={1.3} fill={PLATE.royal} />
          <IsoNode className="iso-node" x={40} y={16} z={10} s={1.3} fill={PLATE.royal} />
          <IsoNode className="iso-node" x={16} y={40} z={10} s={1.3} fill={PLATE.royal} />
          <IsoNode className="iso-node" x={40} y={40} z={9} s={1.3} fill={PLATE.royal} />
          <IsoNode className="iso-node" x={44} y={28} z={12} s={1.3} fill={PLATE.sienna} />
        </>
      );
    case 'trees':
      return (
        <>
          <Palm x={-4} y={12} />
          <Tree x={-4} y={52} s={3} />
          <Tree x={12} y={-4} />
          <Palm x={52} y={-4} s={0.92} />
          <Tree x={60} y={12} s={3.2} />
          <Tree x={60} y={52} s={2.8} />
          <Palm x={30} y={60} s={0.96} />
          <Tree x={-4} y={32} s={2.7} />
        </>
      );
    case 'furniture':
      return (
        <g className="iso-furn">
          {/* north arrow + sun compass — the needle reads royal (the
              system's orientation), the ticks stay hair */}
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
            <path d="M0 -4 L2.6 3 L0 1.4 L-2.6 3 Z" fill={PLATE.royal} stroke={PLATE.ink} strokeWidth="0.7" />
          </g>
          <g className="iso-reg">
            <RegMark x={-84} y={-14} s={7} />
            <RegMark x={84} y={-14} s={7} />
          </g>
          {/* scale bar — carries iso-scalebar so a seat can retire it
              (r351 P1: the hero stage hides it; the journey keeps it) */}
          <g className="iso-scalebar" transform="translate(40,104)">
            <rect x="-34" y="-6" width="34" height="3" fill={PLATE.ink} />
            <rect x="0" y="-6" width="34" height="3" fill="none" stroke={PLATE.ink} strokeWidth="0.8" />
            <g className="iso-coord">
              <Coord x={-34} y={-9} anchor="start">0</Coord>
              <Coord x={0} y={-9} anchor="middle">8</Coord>
              <Coord x={34} y={-9} anchor="end">16</Coord>
            </g>
          </g>
          {/* r353 — the surveyed dimensions, in the royal annotation
              voice: the campus edge (a real Dim along the SW wall) +
              the tower's full height (sheet-authored beside the SE
              silhouette — its measure line stands clear of the
              drawing, extensions running from the tower's own base
              and crown corners) */}
          <Dim a={{ x: 0, y: 58.4 }} b={{ x: 56, y: 58.4 }} label="56.0" gap={4} />
          {(() => {
            const base = iso(38, 38, 2);
            const top = iso(38, 38, 31);
            const lx = 52; /* sheet x — the clear band right of wing-2 */
            return (
              <g className="iso-dim" stroke={PLATE.royal} fill={PLATE.royal}>
                <line x1={base.sx} y1={base.sy} x2={lx + 2.4} y2={base.sy} strokeWidth={0.6} opacity={0.6} />
                <line x1={top.sx} y1={top.sy} x2={lx + 2.4} y2={top.sy} strokeWidth={0.6} opacity={0.6} />
                <line x1={lx} y1={base.sy} x2={lx} y2={top.sy} strokeWidth={0.7} />
                <path d={`M ${lx} ${base.sy} l -1.1 -2.8 l 2.2 0 Z`} strokeWidth={0.45} />
                <path d={`M ${lx} ${top.sy} l -1.1 2.8 l 2.2 0 Z`} strokeWidth={0.45} />
                <text
                  x={lx + 3.2}
                  y={(base.sy + top.sy) / 2 + 1.6}
                  fontSize={7}
                  fontFamily="var(--font-iso-mono), monospace"
                  fontWeight={500}
                  fill={PLATE.royal}
                  stroke={PLATE.paper}
                  strokeWidth={2.6}
                  style={{ direction: 'ltr', paintOrder: 'stroke' }}
                >
                  H 29.0
                </text>
              </g>
            );
          })()}
          {/* birds */}
          <g stroke="var(--iso-ink-soft)" strokeWidth="0.9" fill="none">
            <path d="M 8 -14 q 2.4 -2.4 4.8 0 M 12.8 -14 q 2.4 -2.4 4.8 0" />
            <path d="M -2 -8 q 1.8 -1.8 3.6 0 M 1.6 -8 q 1.8 -1.8 3.6 0" />
          </g>
          {/* coordinate readouts (corners, clear of the drawing) */}
          <g className="iso-coord">
            <Coord x={-88} y={-38} anchor="start">X:56.0</Coord>
            <Coord x={-88} y={-26} anchor="start">GRID:32</Coord>
            <Coord x={88} y={-38} anchor="end">Z:31.0</Coord>
            <Coord x={88} y={-26} anchor="end">ISO:30°</Coord>
          </g>
        </g>
      );
    case 'labels':
      return (
        <g className="iso-lab">
          <g className="iso-leader">
            <Leader from={iso(28, 28, 27)} to={{ x: 44, y: -44 }} text="المكتبة البحثية" textAnchor="start" />
            <Leader from={iso(50.5, 29.5, 19.8)} to={{ x: 90, y: 60 }} text="مرصد الجودة" textAnchor="start" />
            {/* R349 (wave 3 · the label's clear seat): the wave-1
             * end-anchor closed the frame clip but landed the phrase
             * on the scale bar's ink (the bar's solid segment starts
             * at sheet x=+6; the end-anchored phrase ran to +18.5 —
             * the alif of «ساحة» merged with the bar's left end) and
             * the leader's vertical drop at x=-56 crossed «ميدان
             * التدريب»'s letterforms (its text spans −92…−18.9 at the
             * same y-band the vertical passes through). The re-seat
             * drops the phrase INTO THE CLEAR BAND between «مرصد
             * الجودة»'s ink (bottom ≈ y58) and the scale bar's
             * numerals (ink from ≈ y87): the dot moves to the plaza's
             * south corner, the leader descends at x=−12 — right of
             * «ميدان التدريب»'s last glyph by ≈7 sheet units — and
             * the end-anchored phrase reads rightward from there
             * (−12…+62.5, baseline 80), mirroring «ميدان»'s own
             * leader-at-the-left-edge grammar. Every collision is
             * closed with ≥2 sheet units of clearance; pinned by the
             * r349 belt's label-clearance pins. */}
            <Leader from={iso(37, 54, 2)} to={{ x: -12, y: 86 }} text="ساحة المجتمع" textAnchor="end" />
            <Leader from={iso(10, 31, 4)} to={{ x: -92, y: 62 }} text="ميدان التدريب" textAnchor="end" />
          </g>
        </g>
      );
  }
}
