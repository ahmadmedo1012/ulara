/**
 * Iso.tsx — the isometric plate primitives (r346).
 *
 * Pure deterministic SVG. Every drawing on the landing mounts from
 * this one kernel: boxes, slabs, nodes, leaders, tags, ground. Ported
 * from the r346 sandbox rebuild; colours ride the --iso-* custom
 * properties (see lib/iso.ts's PLATE) so the color gate's var-only
 * contract holds and the plates re-theme with the app.
 *
 * Motion law: the kernel draws NOTHING by itself — variants and
 * entrance choreography are carried by CSS classes on the scene root
 * (iso-plate.css), so the reveal/motion token gates stay the owners
 * of every duration/easing, and a dead JS pass still renders the
 * fully-inked plate (JS-off safety).
 */
import type { ReactNode } from 'react';
import {
  PLATE,
  diamond,
  iso,
  isoBoxFaces,
  poly,
  sheetDiamond,
} from '../../../lib/iso';

/* ————————————————— scene ————————————————— */

/* The grammar's shared pattern definitions — the hatch (shadows /
 * hatched faces) + the iso ground lattice. ONE definition site: every
 * plate that mounts fills (`url(#ulara-hatch)` / `url(#ulara-ground)`)
 * resolves these; identical definitions duplicated per-plate were a
 * jscpd clone source (r346 dedupe), and a second mount on the same
 * sheet resolves the same paint either way. */
export function IsoDefs() {
  return (
    <defs>
      <pattern
        id="ulara-hatch"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke={PLATE.ink} strokeWidth="0.7" opacity="0.35" />
      </pattern>
      <pattern
        id="ulara-ground"
        width="16"
        height="16"
        patternUnits="userSpaceOnUse"
        patternTransform="matrix(1,0.5,-1,0.5,0,0)"
      >
        <path d="M0 0 H16 M0 0 V16" stroke={PLATE.hair} strokeWidth="0.5" fill="none" opacity="0.55" />
      </pattern>
    </defs>
  );
}

export function GroundFill({
  x,
  y,
  w,
  d,
  opacity = 0.5,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  opacity?: number;
}) {
  return (
    <polygon
      points={poly(
        { x, y, z: 0 },
        { x: x + w, y, z: 0 },
        { x: x + w, y: y + d, z: 0 },
        { x, y: y + d, z: 0 },
      )}
      fill="url(#ulara-ground)"
      opacity={opacity}
      stroke="none"
    />
  );
}

/* ————————————————— box ————————————————— */

export function IsoBox({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  top = PLATE.top,
  east = PLATE.east,
  west = PLATE.west,
  stroke = PLATE.ink,
  strokeWidth = 1.4,
  hatchEast = false,
  opacity = 1,
  className,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  top?: string;
  east?: string;
  west?: string;
  stroke?: string;
  strokeWidth?: number;
  hatchEast?: boolean;
  opacity?: number;
  className?: string;
}) {
  /* r354 — the cornerStone prop retires with its last consumer: the
   * campus colour-law pass removed the copper quoin inlays (a scatter
   * of warm points across the wings/gate/tower crown — the warm voice
   * stays on the plate's focal moments only), and no other plate
   * mounts it (the deadcode ratchet owns the removal) */
  const f = isoBoxFaces(x, y, z, w, d, h);
  return (
    <g className={className} opacity={opacity}>
      <polygon points={f.west} fill={west} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <polygon
        points={f.east}
        fill={hatchEast ? 'url(#ulara-hatch)' : east}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <polygon points={f.top} fill={top} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </g>
  );
}

/* ————————————————— node / diamond ————————————————— */

/* r354-final colour law (the census verdict): the kernel's DEFAULTS
 * are the SYSTEM voice — a node on the data net paints ROYAL unless
 * a plate explicitly claims the warm learner focal. Every warm
 * accent in the plates is now an EXPLICIT fill at its focal seat. */
export function IsoNode({
  x,
  y,
  z = 0,
  s = 1.6,
  fill = PLATE.royal,
  stroke = PLATE.ink,
  className,
}: {
  x: number;
  y: number;
  z?: number;
  s?: number;
  fill?: string;
  stroke?: string;
  className?: string;
}) {
  return (
    <polygon
      className={className}
      points={diamond(x, y, z, s)}
      fill={fill}
      stroke={stroke}
      strokeWidth={0.9}
    />
  );
}

export function SheetDiamond({
  cx,
  cy,
  s,
  fill = 'none',
  stroke = PLATE.hair,
  strokeWidth = 1,
}: {
  cx: number;
  cy: number;
  s: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <polygon
      points={sheetDiamond(cx, cy, s)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

/* ————————————————— leaders & routes ————————————————— */

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function Route({
  points,
  dashed = true,
  stroke = PLATE.royal,
  strokeWidth = 1.2,
  opacity = 0.85,
  className,
}: {
  points: [number, number, number?][];
  dashed?: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  className?: string;
}) {
  const d = points
    .map((p) => {
      const s = iso(p[0], p[1], p[2] ?? 0);
      return `${round2(s.sx)} ${round2(s.sy)}`;
    })
    .join(' L ');
  return (
    <path
      className={className}
      d={`M ${d}`}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '5 4' : undefined}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
}

/** A flat annotation leader on the sheet: elbow polyline + terminal dot. */
export function Leader({
  from,
  to,
  elbow = 'h',
  stroke = PLATE.muted,
  text,
  textAnchor = 'start',
  mono,
  color = PLATE.ink,
}: {
  from: { sx: number; sy: number }; // sheet coords (an iso() projection)
  to: { x: number; y: number };
  elbow?: 'h' | 'v';
  stroke?: string;
  text?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
  color?: string;
}) {
  const o = { x: from.sx, y: from.sy };
  const mid =
    elbow === 'v' ? { x: o.x, y: to.y } : { x: to.x, y: o.y };
  const labelY =
    elbow === 'v' ? to.y + (to.y > o.y ? 14 : -8) : to.y - 6;
  return (
    <g>
      <path
        d={`M ${o.x} ${o.y} L ${mid.x} ${mid.y} L ${to.x} ${to.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={0.9}
        strokeDasharray="4 3"
      />
      <circle
        cx={o.x}
        cy={o.y}
        r="1.8"
        fill={PLATE.royal}
        stroke={PLATE.ink}
        strokeWidth="0.6"
      />
      {text && (
        <text
          x={to.x}
          y={labelY}
          textAnchor={textAnchor}
          fontSize={mono ? 11 : 13}
          fontFamily={
            mono
              ? 'var(--font-iso-mono), monospace'
              : 'var(--font-iso-arabic), sans-serif'
          }
          fontWeight={mono ? 500 : 600}
          fill={color}
          style={{ direction: mono ? 'ltr' : 'rtl' }}
        >
          {text}
        </text>
      )}
    </g>
  );
}

/** Arabic capability label — flat on the sheet, always readable. */
export function PlateLabel({
  x,
  y,
  children,
  anchor = 'middle',
  size = 13,
  color = PLATE.ink,
  weight = 600,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontFamily="var(--font-iso-arabic), sans-serif"
      fontWeight={weight}
      fill={color}
      style={{ direction: 'rtl' }}
    >
      {children}
    </text>
  );
}

/* ————————————————— drafting furniture ————————————————— */

/** The mono instrument chip — a paper (or ink) ground rect measured to
 * its text, the plate grammar's INSTRUMENT name voice (ATTEND · NOTE ·
 * PLAN…). One kernel primitive: every plate's chips render identically
 * (the r347 dedupe — per-plate copies were a jscpd clone source). */
export function PlateTag({
  x,
  y,
  text,
  dark = false,
}: {
  x: number;
  y: number;
  text: string;
  dark?: boolean;
}) {
  const w = text.length * 5.6 + 8;
  return (
    <g>
      <rect x={x - w / 2} y={y - 8} width={w} height={13} fill={dark ? PLATE.ink : PLATE.paperHi} stroke={PLATE.ink} strokeWidth={0.8} />
      <text x={x} y={y + 1.5} textAnchor="middle" fontSize={8} fontFamily="var(--font-iso-mono), monospace" fontWeight={500} fill={dark ? 'var(--iso-label-on-ink)' : PLATE.ink} style={{ direction: 'ltr' }}>
        {text}
      </text>
    </g>
  );
}

/** The concept label — a copper dot seated ON the target, a dashed
 * hairline, and the Arabic word at the line's far end (the plate
 * grammar's CONCEPT voice: المؤقّت · السؤال · النواة…). The word
 * anchors MIDDLE above the line's end (ty-6 keeps the glyphs clear of
 * the stroke). */
export function SeatLabel({
  x,
  y,
  tx,
  ty,
  text,
}: {
  x: number;
  y: number;
  tx: number;
  ty: number;
  text: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={1.9} fill={PLATE.royal} stroke={PLATE.ink} strokeWidth={0.6} />
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={PLATE.muted} strokeWidth={0.9} strokeDasharray="4 3" />
      <text
        x={tx}
        y={ty - 6}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="var(--font-iso-arabic), sans-serif"
        fontWeight={600}
        fill={PLATE.ink}
        style={{ direction: 'rtl' }}
      >
        {text}
      </text>
    </g>
  );
}

/** Corner registration mark for plate frames. */
export function RegMark({ x, y, s = 10 }: { x: number; y: number; s?: number }) {
  return (
    <g stroke={PLATE.muted} strokeWidth="1">
      <line x1={x - s} y1={y} x2={x + s} y2={y} />
      <line x1={x} y1={y - s} x2={x} y2={y + s} />
      <circle cx={x} cy={y} r={s * 0.35} fill="none" />
    </g>
  );
}

/* ————————————————— r353 · the architectural drafting set ———————————————
 * The visual-artwork round's shared vocabulary: the annotation layer
 * (dimensions + section marks in ROYAL — the platform's engineering
 * voice) and the planting/roofline primitives the campus, journey and
 * role plates compose from. All compact + data-driven: one seat per
 * motif, colours through the PLATE vars only. */

/** The horizontal circle's sheet ellipse in 30° iso: radius r at
 * (cx,cy,z) projects rx = r·√2·cos30, ry = r·√2·sin30. */
export function isoEllipse(cx: number, cy: number, z: number, r: number) {
  const c = iso(cx, cy, z);
  return { cx: c.sx, cy: c.sy, rx: r * 1.2247, ry: r * 0.7071 };
}

/** A dimension line — extension lines from two iso points, an
 * arrowed measure stroke between them, and the mono value label.
 * The r353 annotation voice: royal blue, the drafting sheet's own
 * measurement register (system lines = the platform's colour). */
export function Dim({
  a,
  b,
  label,
  gap = 3,
  stroke = PLATE.royal,
}: {
  a: { x: number; y: number; z?: number };
  b: { x: number; y: number; z?: number };
  label: string;
  gap?: number;
  stroke?: string;
}) {
  const p = iso(a.x, a.y, a.z ?? 0);
  const q = iso(b.x, b.y, b.z ?? 0);
  const dx = q.sx - p.sx;
  const dy = q.sy - p.sy;
  const len = Math.hypot(dx, dy) || 1;
  /* the sheet-space normal (extensions step off the measured span) */
  const nx = -dy / len;
  const ny = dx / len;
  const e1 = { x: p.sx + nx * gap, y: p.sy + ny * gap };
  const e2 = { x: q.sx + nx * gap, y: q.sy + ny * gap };
  const ext = (o: { sx: number; sy: number }, e: { x: number; y: number }) =>
    `M ${o.sx + nx * 1.2} ${o.sy + ny * 1.2} L ${e.x + nx * 2.4} ${e.y + ny * 2.4}`;
  const ah = (tip: { x: number; y: number }, sgn: number) =>
    `M ${tip.x} ${tip.y} L ${tip.x - sgn * (dx / len) * 3 + nx * 1.1} ${tip.y - sgn * (dy / len) * 3 + ny * 1.1} L ${tip.x - sgn * (dx / len) * 3 - nx * 1.1} ${tip.y - sgn * (dy / len) * 3 - ny * 1.1} Z`;
  return (
    <g className="iso-dim" stroke={stroke} fill={stroke}>
      <path d={ext(p, e1)} fill="none" strokeWidth={0.6} opacity={0.6} />
      <path d={ext(q, e2)} fill="none" strokeWidth={0.6} opacity={0.6} />
      <line x1={e1.x} y1={e1.y} x2={e2.x} y2={e2.y} strokeWidth={0.7} />
      <path d={ah(e1, 1)} strokeWidth={0.45} />
      <path d={ah(e2, -1)} strokeWidth={0.45} />
      <text
        x={(e1.x + e2.x) / 2 + nx * 6.5}
        y={(e1.y + e2.y) / 2 + ny * 6.5 + 1.6}
        textAnchor="middle"
        fontSize={7}
        fontFamily="var(--font-iso-mono), monospace"
        fontWeight={500}
        fill={stroke}
        /* the measured value rides a paper halo (paint-order stroke)
           so the numerals never merge with the line they name — the
           drafting sheet's own break-line convention */
        stroke={PLATE.paper}
        strokeWidth={2.6}
        style={{ direction: 'ltr', paintOrder: 'stroke' }}
      >
        {label}
      </text>
    </g>
  );
}

/** An arcade colonnade on a box face — the riwaq rhythm: column
 * pairs along the face + the lintel line they carry. face = 'east'
 * (max-x, faces lower-right) | 'west' (max-y, faces lower-left). */
export function Arcade({
  x,
  y,
  z,
  w,
  d,
  h,
  face = 'east',
  n = 4,
  inset = 1.4,
  stroke = PLATE.ink,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  face?: 'east' | 'west';
  n?: number;
  inset?: number;
  stroke?: string;
}) {
  const cols: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p =
      face === 'east'
        ? { a: iso(x + w, y + inset + (d - inset * 2) * t, z), b: iso(x + w, y + inset + (d - inset * 2) * t, z + h) }
        : { a: iso(x + inset + (w - inset * 2) * t, y + d, z), b: iso(x + inset + (w - inset * 2) * t, y + d, z + h) };
    cols.push({ x1: p.a.sx, y1: p.a.sy, x2: p.b.sx, y2: p.b.sy });
  }
  const lintel =
    face === 'east'
      ? { a: iso(x + w, y + inset, z + h), b: iso(x + w, y + d - inset, z + h) }
      : { a: iso(x + inset, y + d, z + h), b: iso(x + w - inset, y + d, z + h) };
  return (
    <g className="iso-arcade" stroke={stroke} fill="none">
      {cols.map((c, i) => (
        <g key={i}>
          <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} strokeWidth={0.75} />
          <circle cx={c.x2} cy={c.y2} r={0.55} fill={stroke} stroke="none" />
        </g>
      ))}
      <line x1={lintel.a.sx} y1={lintel.a.sy} x2={lintel.b.sx} y2={lintel.b.sy} strokeWidth={0.75} />
    </g>
  );
}

/** A palm — the campus planting's vertical accent: a gently curved
 * trunk, a diamond crown boss and 5 splayed fronds. */
export function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const b = iso(x, y, 0);
  const m = iso(x + 0.6 * s, y + 0.6 * s, 3.4 * s);
  const t = iso(x + 1.1 * s, y + 1.1 * s, 6.4 * s);
  return (
    <g className="iso-palm">
      <path
        d={`M ${b.sx} ${b.sy} Q ${m.sx} ${m.sy} ${t.sx} ${t.sy}`}
        fill="none"
        stroke={PLATE.ink}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <g stroke={PLATE.ink} strokeWidth={0.85} fill="none" strokeLinecap="round">
        <path d={`M ${t.sx} ${t.sy} q ${4.6 * s} ${-2.2 * s} ${7.6 * s} ${-1.1 * s}`} />
        <path d={`M ${t.sx} ${t.sy} q ${4.4 * s} ${1.4 * s} ${7.2 * s} ${2.6 * s}`} />
        <path d={`M ${t.sx} ${t.sy} q ${-4.6 * s} ${-2.4 * s} ${-7.4 * s} ${-1.4 * s}`} />
        <path d={`M ${t.sx} ${t.sy} q ${-4.2 * s} ${1.2 * s} ${-7 * s} ${2.8 * s}`} />
        <path d={`M ${t.sx} ${t.sy} q ${-0.6 * s} ${-3.4 * s} ${0.4 * s} ${-5 * s}`} />
      </g>
      <SheetDiamond cx={t.sx} cy={t.sy} s={0.9 * s} fill={PLATE.muted} stroke={PLATE.ink} strokeWidth={0.6} />
    </g>
  );
}

/** A dome — the sheet ellipse's crown: the upper half-ellipse over a
 * drum cylinder side (the observatory / reading-room silhouettes). */
export function IsoDome({
  x,
  y,
  z,
  r,
  oculus = true,
  fill = PLATE.top,
  stroke = PLATE.ink,
}: {
  x: number;
  y: number;
  z: number;
  r: number;
  oculus?: boolean;
  fill?: string;
  stroke?: string;
}) {
  const e = isoEllipse(x, y, z, r);
  const b = iso(x, y, z - r * 0.9);
  return (
    <g className="iso-dome">
      <path
        d={`M ${e.cx - e.rx} ${e.cy} A ${e.rx} ${e.ry} 0 0 1 ${e.cx + e.rx} ${e.cy} L ${e.cx + e.rx} ${e.cy + 0.01} Z`}
        fill={fill}
        stroke="none"
        opacity={0.92}
      />
      <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="none" stroke={stroke} strokeWidth={1} opacity={0.35} />
      <path
        d={`M ${e.cx - e.rx} ${e.cy} A ${e.rx} ${e.ry} 0 0 1 ${e.cx + e.rx} ${e.cy}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.1}
      />
      {/* the meridian seam — one drafted section line over the crown */}
      <ellipse
        cx={e.cx}
        cy={e.cy}
        rx={e.rx * 0.55}
        ry={e.ry}
        fill="none"
        stroke={stroke}
        strokeWidth={0.7}
        opacity={0.6}
      />
      {oculus && <circle cx={e.cx} cy={b.sy + 2.4} r={0.9} fill={PLATE.sienna} stroke="none" />}
    </g>
  );
}

/** Coordinate readout in mono (drafting voice). */
export function Coord({
  x,
  y,
  children,
  anchor = 'start',
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="10.5"
      fontFamily="var(--font-iso-mono), monospace"
      fill={PLATE.muted}
      style={{ direction: 'ltr' }}
      letterSpacing="0.08em"
    >
      {children}
    </text>
  );
}
