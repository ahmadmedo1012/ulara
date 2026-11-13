/**
 * mark.ts — the ULARA mark «الأُلارا — الإناء» — the single source of the
 * mark's GEOMETRY (the <Logo> component in ./Logo.tsx renders it;
 * scripts/brand/wordmark-build.mjs + scripts/r323/brand-assets.mjs re-state
 * the same numbers for the static twins, scripts/brand/build-app-icons.mjs
 * parses this file for the mobile asset set, and the brand pin test
 * frontend/tests/unit/r323-brand-system.test.ts pins them together — never
 * edit one without the other).
 *
 * CONSTRUCTION (32-unit grid, viewBox 0 0 32 32):
 *  · the vessel idea: the letter U opened upward — a vessel, an open
 *    book, a container of knowledge — drawn as ONE unified ink stroke:
 *    two vertical stems on the x=9 and x=23 rails joined by a quadratic
 *    bowl dipping to y=27. M/L/Q commands only — the retired arch's arc
 *    signature is structurally impossible in this family (logo-gate);
 *  · stems rise from the bowl to y=7, round caps and joins throughout;
 *  · ONE solid sienna square — the CORNERSTONE — seated at the top-right
 *    corner of the right stem: a 4×4 cell at x=21..25, y=3..7, flush
 *    with the stem's round cap — the letter grows out of the stone. The
 *    cornerstone is the person at the opening of the vessel — the
 *    university system built around its people
 *    («المؤسّسة في منظومة واحدة»);
 *  · the construction ink lands x9..25, y3..27 (stroke outset excluded)
 *    — centred in the 32-grid;
 *  · hairline ink strokes, UNIFORM weight, ROUND joins (never miter —
 *    the vessel is one continuous stroke), no fills except the
 *    cornerstone, no gradients, no shadows.
 *
 * COLOURS (the only three): paper #F5F1E8 · ink #262019 · sienna #C43E16.
 * In the app the ink rides currentColor and the sienna rides var(--accent)
 * (tokens.css re-keys that shared seat per theme: #C43E16 on light, the
 * luminous ember #FF6B3D on dark — the sanctioned dark-theme swap, one
 * var() and the mark themes without props).
 */

/** The mark's own viewBox (the 32-unit grid). */
export const MARK_VIEWBOX = '0 0 32 32';

/** The vessel as ONE open stroke: left stem down, the quadratic bowl
 * through the bottom, right stem up — round caps and joins everywhere. */
export const MARK_VESSEL_PATH = 'M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7';

/** The sienna cornerstone: 4×4 square flush with the right stem's top. */
export const MARK_CORNERSTONE = { x: 21, y: 3, size: 4 } as const;

/** The mark's construction ink bbox inside the 32 viewBox (x9..25, y3..27). */
export const MARK_INK = { x: 9, y: 3, w: 16, h: 24 } as const;

/** The grid anchors the construction is judged on. */
export const MARK_GRID_POINTS: readonly (readonly [number, number])[] = [
  [9, 7], [23, 7],    /* the stem tops */
  [9, 19], [23, 19],  /* the bowl springs */
  [16, 27],           /* the bowl bottom */
  [21, 3], [25, 3], [21, 7], [25, 7], /* the cornerstone's corners */
];

/** Static stroke ratios. The component renders the mark with a
 * non-scaling uniform hairline (vector-effect), the favicon carries a
 * thicker PROPORTIONAL ratio for 16 px legibility — the only sanctioned
 * deviation (BRAND.md §min-sizes). */
export const MARK_STROKE_COMPONENT = 1.5; /* px, non-scaling */
export const MARK_STROKE_FAVICON = 2.25;  /* viewBox units, proportional */

/** The optical-size ramp (R324/X11). A CONSTANT 1.5 px screen stroke
 * below the 32-grid design size reads progressively heavier: 12.5 % of
 * the mark's height at the 12 px EdgeTab seat (2.7× the designed 4.7 %)
 * — the small seats turn the hairline into a blob. The ramp tapers the
 * screen stroke linearly from 1.5 px @32 down to 1.125 px @16 — exactly
 * the favicon's sanctioned 2.25/32 ratio at 16 px — with a 0.9 px floor
 * so the hairline never washes sub-pixel. ≥32 stays the design 1.5 px.
 *   32→1.500 · 26→1.359 · 24→1.313 · 22→1.266 · 16→1.125 · 14→1.078 · 12→1.031 */
export function markStrokePx(size: number): number {
  if (size >= 32) return MARK_STROKE_COMPONENT;
  const tapered = MARK_STROKE_COMPONENT - (0.375 * (32 - size)) / 16;
  return Math.max(0.9, +tapered.toFixed(3));
}
