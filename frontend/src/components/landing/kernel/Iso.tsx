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
  cornerStone,
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
  cornerStone?: boolean;
}) {
  const f = isoBoxFaces(x, y, z, w, d, h);
  const corner = cornerStone
    ? poly(
        { x: x + w, y, z: z + h },
        { x: x + w, y, z: z + h - 4 },
        { x: x + w - 4, y, z: z + h },
      )
    : null;
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
      {corner && (
        <polygon points={corner} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.8} />
      )}
    </g>
  );
}

/* ————————————————— node / diamond ————————————————— */

export function IsoNode({
  x,
  y,
  z = 0,
  s = 1.6,
  fill = PLATE.sienna,
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
  stroke = PLATE.sienna,
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
        fill={PLATE.sienna}
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
      <circle cx={x} cy={y} r={1.9} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.6} />
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
