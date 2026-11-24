/**
 * shared/art/grammar.ts — the r359 ART GRAMMAR (A2 slice).
 * ─────────────────────────────────────────────────────────────────
 * The single drawing language every ULARA plate, plan, elevation and
 * state graphic is drawn with (see docs/redesign/r359-a2/ART-GRAMMAR.md).
 *
 * This module is PURE TypeScript — no React, no DOM, no node APIs —
 * so the exact same scene builders render:
 *   · web   — frontend/src/components/illustrations/r359/<key>.tsx
 *   · RN    — apps/mobile/src/components/art/<Key>.tsx (via scripts/art/build-native.mjs)
 *   · SVG   — shared/art/svg/<key>.svg (via scripts/art/export-svg.mjs)
 *
 * GRAMMAR (measured from the reference, mapped to ULARA):
 *   paper ground, ink line-work, hairline construction, ONE royal signal.
 *   line weights : hairline 0.75 · fine 1.25 · medium 2 · wall 3.5 · heavy 6
 *   hatching     : 45° parallel hairlines, 6–10px pitch, broken by seed
 *   stipple      : round-cap micro-dots, seeded, density = tone (20–80%)
 *   trees        : bare winter branching, recursive, tapering stroke
 *   dimensions   : extension + dim line + 45° slash ticks + mono text
 *   callouts     : signal square + leader + 0-radius signal tag, white mono
 *   registration : + crosses at corners, mono coordinate readouts
 *   motion       : stroke draw-in / slow dash flow / ±1px drift ONLY
 *                  (no springs, no bounce, no gradients, no glow)
 *
 * Palette flows through CSS custom properties on the web (illustrations.css
 * maps them to house tokens) and is swapped to concrete hex by the RN /
 * SVG runtimes. ZERO raw colors in scene code.
 */

/* ════════════════════════════ types ════════════════════════════ */

export type ArtTag =
  | 'g' | 'path' | 'rect' | 'circle' | 'ellipse'
  | 'line' | 'polyline' | 'polygon' | 'text';

/** A single SVG-shaped node. `a` = attributes, `c` = children, `s` = text. */
export interface ArtNode {
  t: ArtTag;
  a?: Record<string, string | number>;
  c?: ArtNode[];
  s?: string;
}

/** A finished drawing: viewBox size + node tree + Arabic accessible title. */
export interface ArtDoc {
  w: number;
  h: number;
  title: string;
  nodes: ArtNode[];
}

export interface ArtPlateProps {
  className?: string;
  title?: string;
  animated?: boolean;
  theme?: 'light' | 'dark';
}

export type ArtBuilder = () => ArtDoc;

/* ═══════════════════════ palette (token refs) ═══════════════════ */

/** The five grammar colors — CSS-var refs on web, hex-mapped on RN/SVG. */
export const C = {
  ink: 'var(--r359-ink)',
  ink2: 'var(--r359-ink-2)',
  hair: 'var(--r359-hair)',
  sig: 'var(--r359-sig)',
  paper: 'var(--r359-paper)',
} as const;
export type ArtColor = keyof typeof C;

/** Line-weight ladder (spec §2: hairline .75 / wall 3–5 / heavy 6). */
export const W = {
  hair: 0.75,
  fine: 1.25,
  med: 2,
  wall: 3.5,
  heavy: 6,
} as const;

/** Mono micro-label size (reference: 8–10px at 1440). */
export const MONO = 9;
export const MONO_SM = 7.5;

/* ═══════════════════════ deterministic RNG ══════════════════════ */

/** mulberry32 — small, fast, seedable; identical output web/RN/node. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rr = (r: () => number, lo: number, hi: number): number => lo + r() * (hi - lo);
export const ri = (r: () => number, lo: number, hi: number): number => Math.floor(rr(r, lo, hi + 1));

/* ═══════════════════════ node shorthands ════════════════════════ */

export const g = (a: Record<string, string | number> | undefined, ...c: ArtNode[]): ArtNode => ({ t: 'g', a, c });
export const path = (d: string, a: Record<string, string | number> = {}): ArtNode => ({ t: 'path', a: { d, ...a } });
export const rect = (x: number, y: number, w: number, h: number, a: Record<string, string | number> = {}): ArtNode =>
  ({ t: 'rect', a: { x: n2(x), y: n2(y), width: n2(w), height: n2(h), ...a } });
export const circ = (cx: number, cy: number, r: number, a: Record<string, string | number> = {}): ArtNode =>
  ({ t: 'circle', a: { cx: n2(cx), cy: n2(cy), r: n2(r), ...a } });
export const line = (x1: number, y1: number, x2: number, y2: number, a: Record<string, string | number> = {}): ArtNode =>
  ({ t: 'line', a: { x1: n2(x1), y1: n2(y1), x2: n2(x2), y2: n2(y2), ...a } });
export const poly = (pts: Array<[number, number]>, a: Record<string, string | number> = {}): ArtNode =>
  ({ t: 'polygon', a: { points: pts.map(([x, y]) => `${n2(x)},${n2(y)}`).join(' '), ...a } });

/** mono micro-label (Latin digits/codes ride the mono voice). */
export function label(x: number, y: number, s: string, a: Record<string, string | number> = {}): ArtNode {
  return {
    t: 'text',
    a: { x: n2(x), y: n2(y), fill: C.ink2, 'font-size': MONO, 'font-family': 'var(--font-mono)', ...a },
    s,
  };
}

/** Arabic label (rides the sans voice — mono has no Arabic glyphs). */
export function labelAr(x: number, y: number, s: string, a: Record<string, string | number> = {}): ArtNode {
  return {
    t: 'text',
    a: { x: n2(x), y: n2(y), fill: C.ink, 'font-size': 12, 'font-family': 'var(--font-sans)', ...a },
    s,
  };
}

const n2 = (v: number): string => (Math.round(v * 100) / 100).toString();

/* ═══════════════════════ path builder ═══════════════════════════ */

/** Fluent SVG path-data builder (chainable). */
export class D {
  private s: string;
  constructor(x = NaN, y = NaN) {
    this.s = Number.isNaN(x) ? '' : `M${n2(x)} ${n2(y)}`;
  }
  m(x: number, y: number): D { this.s += `M${n2(x)} ${n2(y)}`; return this; }
  l(x: number, y: number): D { this.s += `L${n2(x)} ${n2(y)}`; return this; }
  h(x: number): D { this.s += `H${n2(x)}`; return this; }
  v(y: number): D { this.s += `V${n2(y)}`; return this; }
  /** quadratic curve to (x,y) with control (cx,cy). */
  q(cx: number, cy: number, x: number, y: number): D { this.s += `Q${n2(cx)} ${n2(cy)} ${n2(x)} ${n2(y)}`; return this; }
  /** polyline through points. */
  pts(pts: Array<[number, number]>): D { for (const [x, y] of pts) this.l(x, y); return this; }
  toString(): string { return this.s; }
}

/* ═══════════════════════ page furniture ═════════════════════════ */

/** registration cross `+` at (x,y), arm length s/2. */
export function regCross(x: number, y: number, s = 10, w = W.hair): ArtNode {
  const k = s / 2;
  return g(
    { stroke: C.hair, 'stroke-width': w },
    line(x - k, y, x + k, y),
    line(x, y - k, x, y + k),
  );
}

/** hairline plate frame + 4 registration crosses inset m. */
export function frame(w: number, h: number, m = 14, opts: { crosses?: boolean; dash?: boolean } = {}): ArtNode[] {
  const out: ArtNode[] = [
    rect(m, m, w - 2 * m, h - 2 * m, {
      fill: 'none',
      stroke: C.hair,
      'stroke-width': W.hair,
      ...(opts.dash ? { 'stroke-dasharray': '4 3' } : {}),
    }),
  ];
  if (opts.crosses !== false) {
    out.push(regCross(m, m, 9), regCross(w - m, m, 9), regCross(m, h - m, 9), regCross(w - m, h - m, 9));
  }
  return out;
}

/** mono coordinate readout, reference style `X:1131PX / Y:1131PX`. */
export function coord(x: number, y: number, cx: number, cy: number, a: Record<string, string | number> = {}): ArtNode {
  return label(x, y, `X:${Math.round(cx)}PX / Y:${Math.round(cy)}PX`, a);
}

/* ═══════════════════════ texture generators ═════════════════════ */

/**
 * Stipple field inside a polygon — the board-formed concrete tone.
 * One path, round linecap micro-segments; density 0..1 controls tone.
 */
export function stipplePoly(
  pts: Array<[number, number]>,
  density: number,
  seed: number,
  opts: { dot?: number; a?: Record<string, string | number> } = {},
): ArtNode {
  const r = rng(seed);
  const dot = opts.dot ?? 0.9;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const area = Math.abs(polyArea(pts));
  const n = Math.round(area * density * 0.16);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = rr(r, minX, maxX);
    const y = rr(r, minY, maxY);
    if (!pointInPoly(x, y, pts)) continue;
    d += `M${n2(x)} ${n2(y)}l${n2(dot * 0.3)} 0`;
  }
  if (!d) return g({});
  return path(d, {
    fill: 'none',
    stroke: C.ink,
    'stroke-width': dot,
    'stroke-linecap': 'round',
    ...opts.a,
  });
}

/** Stipple inside a rectangle. */
export function stippleRect(
  x: number, y: number, w: number, h: number, density: number, seed: number,
  opts: { dot?: number; a?: Record<string, string | number> } = {},
): ArtNode {
  return stipplePoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], density, seed, opts);
}

/**
 * Parallel hatch lines clipped to a polygon (45° default — the ink
 * shadow language). Seeded breaks keep it hand-finished, not mechanical.
 */
export function hatchPoly(
  pts: Array<[number, number]>,
  opts: { angle?: number; pitch?: number; seed?: number; breaks?: number; a?: Record<string, string | number> } = {},
): ArtNode {
  const { angle = 45, pitch = 8, seed = 7, breaks = 0.12 } = opts;
  const r = rng(seed);
  const rad = (angle * Math.PI) / 180;
  const [ux, uy] = [Math.cos(rad), Math.sin(rad)];   // along the hatch
  const [vx, vy] = [-Math.sin(rad), Math.cos(rad)];  // scan direction
  const uv = pts.map(([x, y]) => [x * ux + y * uy, x * vx + y * vy] as [number, number]);
  let d = '';
  const vLo = Math.min(...uv.map((p) => p[1]));
  const vHi = Math.max(...uv.map((p) => p[1]));
  for (let v = Math.ceil(vLo / pitch) * pitch; v <= vHi; v += pitch) {
    const us: number[] = [];
    for (let i = 0; i < uv.length; i++) {
      const [u1, v1] = uv[i]!;
      const [u2, v2] = uv[(i + 1) % uv.length]!;
      if ((v1 <= v && v2 > v) || (v2 <= v && v1 > v)) {
        us.push(u1 + ((v - v1) / (v2 - v1)) * (u2 - u1));
      }
    }
    us.sort((p, q) => p - q);
    for (let i = 0; i + 1 < us.length; i += 2) {
      const a = us[i]!;
      const b = us[i + 1]!;
      if (b - a < 1.2) continue;
      if (breaks > 0 && r() < breaks) {
        const cut = rr(r, a + 1, b - 1);
        if (cut - a > 2) seg(a, cut, v);
        if (b - cut > 2) seg(cut, b, v);
      } else {
        seg(a, b, v);
      }
    }
  }
  return path(d, {
    fill: 'none',
    stroke: C.ink,
    'stroke-width': W.hair,
    ...(opts.a ?? {}),
  });

  function seg(a: number, b: number, v: number): void {
    const j = breaks > 0 ? rr(r, -0.6, 0.6) : 0;
    const x1 = a * ux + v * vx + j;
    const y1 = a * uy + v * vy + j;
    const x2 = b * ux + v * vx + j;
    const y2 = b * uy + v * vy + j;
    d += `M${n2(x1)} ${n2(y1)}L${n2(x2)} ${n2(y2)}`;
  }
}

/* ═══════════════════════ trees (winter branching) ═══════════════ */

export interface TreeOpts {
  depth?: number;
  spread?: number;
  lean?: number;
  opacity?: number;
  stroke?: string;
  seed?: number;
}

/**
 * A bare winter tree — recursive tapering branches, the reference's
 * foreground voice. Root at (x, baseY), height h.
 */
export function tree(x: number, baseY: number, h: number, opts: TreeOpts = {}): ArtNode {
  const { depth = 6, spread = 26, lean = 0, opacity = 1, stroke = C.ink, seed = 1 } = opts;
  const r = rng(seed * 7919 + 13);
  const nodes: ArtNode[] = [];

  const branch = (
    bx: number, by: number, ang: number, len: number, d: number, wgt: number,
  ): void => {
    const bend = rr(r, -0.18, 0.18);
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    const cx = bx + Math.cos(ang + bend) * len * 0.55;
    const cy = by + Math.sin(ang + bend) * len * 0.55;
    nodes.push(path(
      new D(bx, by).q(cx, cy, ex, ey).toString(),
      { fill: 'none', stroke, 'stroke-width': n2(wgt), 'stroke-linecap': 'round' },
    ));
    if (d <= 1) return;
    const n = r() < 0.32 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const t = n === 2 ? i * 2 - 1 : i - 1;
      const sp = rr(r, 0.45, 1) * spread * (t === 0 ? 0.3 : 1) * (Math.PI / 180);
      branch(ex, ey, ang + sp * (t === 0 ? 0.4 : t), len * rr(r, 0.62, 0.78), d - 1, Math.max(wgt * 0.62, W.hair));
    }
  };

  branch(x, baseY, -Math.PI / 2 + lean, h * 0.34, depth, Math.max(h / 42, 1.1));
  return g({ opacity: n2(opacity) }, ...nodes);
}

/* ═══════════════════════ dimensions ═════════════════════════════ */

export interface DimOpts {
  tick?: number;
  label?: string;
  a?: Record<string, string | number>;
}

/** Horizontal dimension line with 45° slash ticks + mono label. */
export function dimH(x1: number, x2: number, y: number, ext1: number, ext2: number, opts: DimOpts = {}): ArtNode {
  const { tick = 5, label: lb } = opts;
  const nodes: ArtNode[] = [
    line(x1, y - ext1, x1, y + 3, { stroke: C.hair, 'stroke-width': W.hair }),
    line(x2, y - ext2, x2, y + 3, { stroke: C.hair, 'stroke-width': W.hair }),
    line(x1, y, x2, y, { stroke: C.ink, 'stroke-width': W.fine, ...opts.a }),
    line(x1 - tick / 2, y + tick / 2, x1 + tick / 2, y - tick / 2, { stroke: C.ink, 'stroke-width': W.fine }),
    line(x2 - tick / 2, y + tick / 2, x2 + tick / 2, y - tick / 2, { stroke: C.ink, 'stroke-width': W.fine }),
  ];
  if (lb) nodes.push(label((x1 + x2) / 2, y - 4, lb, { 'text-anchor': 'middle' }));
  return g({}, ...nodes);
}

/** Vertical dimension line with 45° slash ticks + mono label. */
export function dimV(y1: number, y2: number, x: number, ext1: number, ext2: number, opts: DimOpts = {}): ArtNode {
  const { tick = 5, label: lb } = opts;
  const nodes: ArtNode[] = [
    line(x - ext1, y1, x + 3, y1, { stroke: C.hair, 'stroke-width': W.hair }),
    line(x - ext2, y2, x + 3, y2, { stroke: C.hair, 'stroke-width': W.hair }),
    line(x, y1, x, y2, { stroke: C.ink, 'stroke-width': W.fine, ...opts.a }),
    line(x - tick / 2, y1 + tick / 2, x + tick / 2, y1 - tick / 2, { stroke: C.ink, 'stroke-width': W.fine }),
    line(x - tick / 2, y2 + tick / 2, x + tick / 2, y2 - tick / 2, { stroke: C.ink, 'stroke-width': W.fine }),
  ];
  if (lb) nodes.push(label(x - 4, (y1 + y2) / 2 + 3, lb, { 'text-anchor': 'end' }));
  return g({}, ...nodes);
}

/* ═══════════════════════ callout tags ═══════════════════════════ */

export interface CalloutOpts {
  w?: number;
  anchor?: 'start' | 'middle' | 'end';
}

/**
 * Signal callout: filled square anchor at (x,y) + leader + 0-radius
 * signal-filled tag with WHITE mono code — the "violation marker"
 * voice, re-keyed to ULARA's royal signal.
 */
export function callout(x: number, y: number, code: string, opts: CalloutOpts = {}): ArtNode {
  const { w = 118, anchor = 'start' } = opts;
  const s = 9;
  const dir = anchor === 'end' ? -1 : 1;
  const tagX = x + (anchor === 'middle' ? -w / 2 : dir > 0 ? 16 : -w - 16);
  const tagY = y - 10;
  const h = 20;
  return g(
    {},
    path(`M${n2(x + dir * (s / 2 + 1))} ${n2(y)}L${n2(tagX + (dir > 0 ? 0 : w))} ${n2(tagY + h / 2)}`,
      { stroke: C.sig, 'stroke-width': W.fine, fill: 'none' }),
    rect(tagX, tagY, w, h, { fill: C.sig, stroke: 'none' }),
    {
      t: 'text',
      a: {
        x: n2(tagX + w / 2), y: n2(tagY + 13.5), fill: 'var(--r359-paper)',
        'font-size': MONO, 'font-family': 'var(--font-mono)',
        'text-anchor': 'middle', 'letter-spacing': '0.5',
      },
      s: code,
    },
    rect(x - s / 2, y - s / 2, s, s, { fill: C.sig, stroke: 'none' }),
  );
}

/* ═══════════════════════ geometry utils ═════════════════════════ */

export function polyArea(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function pointInPoly(x: number, y: number, pts: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Stair flight: treads between (x,y) and (x2,y2) — plan or elevation
 * (`view: 'plan'` draws parallel treads, `'elev'` a zig-zag section).
 */
export function stairs(
  x: number, y: number, x2: number, y2: number, treads: number,
  view: 'plan' | 'elev' = 'plan', a: Record<string, string | number> = {},
): ArtNode {
  const d = new D();
  const n = Math.max(2, treads);
  if (view === 'plan') {
    d.m(x, y).l(x2, y);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      d.m(x + (x2 - x) * t, y).l(x + (x2 - x) * t, y2);
    }
    d.m(x, y2).l(x2, y2);
  } else {
    const w = (x2 - x) / n;
    const hStep = (y2 - y) / n;
    d.m(x, y2);
    for (let i = 0; i < n; i++) {
      d.v(y2 - hStep * (i + 1)).h(x + w * (i + 1));
    }
  }
  return path(d.toString(), { fill: 'none', stroke: C.ink, 'stroke-width': W.fine, ...a });
}

/**
 * Colonnade: n columns between x1..x2 from yTop to yBase (elevation
 * verticals with capital/base ticks).
 */
export function colonnade(
  x1: number, x2: number, yTop: number, yBase: number, n: number,
  a: Record<string, string | number> = {},
): ArtNode {
  const nodes: ArtNode[] = [];
  const step = (x2 - x1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = x1 + i * step;
    nodes.push(line(x, yTop, x, yBase, { stroke: C.ink, 'stroke-width': W.med, ...a }));
    nodes.push(line(x - 3, yTop, x + 3, yTop, { stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(x - 3, yBase, x + 3, yBase, { stroke: C.ink, 'stroke-width': W.fine }));
  }
  return g({}, ...nodes);
}

/** Dashed construction rule (the reference's `line-dash` furniture). */
export function dashRule(x1: number, y1: number, x2: number, y2: number, a: Record<string, string | number> = {}): ArtNode {
  return line(x1, y1, x2, y2, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '5 4', ...a });
}
