/**
 * iso.ts — the isometric kernel (r346 plate grammar).
 *
 * True 30° isometric projection on the sheet:
 *   +x runs to the lower-right, +y to the lower-left, +z up.
 * All landing plates are authored in iso-space and projected here —
 * ONE deterministic grammar for every drawing on the site (the hero
 * campus plate, the journey assembly, the product plates, the why
 * panels). Ported from the r346 sandbox rebuild (the phase-4
 * directive: the flat 2D elevations/plans retire; the landing's
 * pictures become isometric 3D drawings in the reference's plate
 * language).
 *
 * Colour law: the palette rides CSS custom properties ONLY (the
 * color gate's contract — raw hex never appears in TS). The --iso-*
 * seats are defined in styles/landing/iso-plate.css against the
 * repo's own token ladder (paper/ink/sienna — the same family the
 * r313 canon keyed), so the plates re-theme with the app for free.
 */

/** Project an iso-space point onto the 2D sheet (true 30° isometric:
 * +x to the lower-right, +y to the lower-left, +z up). */
export function iso(x: number, y: number, z = 0): { sx: number; sy: number } {
  return {
    sx: (x - y) * Math.cos(Math.PI / 6), // 0.8660
    sy: (x + y) * Math.sin(Math.PI / 6) - z, // 0.5
  };
}

/** Polygon string for a list of iso points. */
export function poly(...pts: { x: number; y: number; z: number }[]): string {
  return pts.map((p) => {
    const s = iso(p.x, p.y, p.z);
    return `${round(s.sx)},${round(s.sy)}`;
  }).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The three visible faces of a box as polygon point-strings. */
export function isoBoxFaces(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
) {
  return {
    // top face (z + h plane)
    top: poly(
      { x, y, z: z + h },
      { x: x + w, y, z: z + h },
      { x: x + w, y: y + d, z: z + h },
      { x, y: y + d, z: z + h },
    ),
    // east face (max-x side, faces the lower-right)
    east: poly(
      { x: x + w, y, z },
      { x: x + w, y: y + d, z },
      { x: x + w, y: y + d, z: z + h },
      { x: x + w, y, z: z + h },
    ),
    // west face (max-y side, faces the lower-left)
    west: poly(
      { x, y: y + d, z },
      { x: x + w, y: y + d, z },
      { x: x + w, y: y + d, z: z + h },
      { x, y: y + d, z: z + h },
    ),
    // silhouette outline (for optional outer stroke)
    outline: poly(
      { x, y, z: z + h },
      { x: x + w, y, z: z + h },
      { x: x + w, y: y + d, z: z + h },
      { x, y: y + d, z: z + h },
      { x, y: y + d, z },
      { x: x + w, y: y + d, z },
      { x: x + w, y, z },
    ),
  };
}

/** A diamond marker (node) centered at iso point. */
export function diamond(x: number, y: number, z: number, s: number): string {
  return poly(
    { x, y: y + s, z },
    { x: x + s, y, z },
    { x, y: y - s, z },
    { x: x - s, y, z },
  );
}

/** A flat diamond on the sheet (for ground markers / decorations). */
export function sheetDiamond(cx: number, cy: number, s: number): string {
  return `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
}

/**
 * Plate palette — the one drawing grammar's colour seats, as CSS
 * custom-property references (defined in iso-plate.css against the
 * repo token ladder). SVG presentation attributes accept var(), so
 * every fill/stroke below flows the live theme.
 */
export const PLATE = {
  top: 'var(--iso-top)',
  east: 'var(--iso-east)',
  west: 'var(--iso-west)',
  ink: 'var(--iso-ink)',
  inkSoft: 'var(--iso-ink-soft)',
  muted: 'var(--iso-muted)',
  hair: 'var(--iso-hair)',
  sienna: 'var(--iso-sienna)',
  signal: 'var(--iso-signal)',
  paper: 'var(--iso-paper)',
  paperHi: 'var(--iso-paper-hi)',
} as const;
