/**
 * r354 — the plate geometry guards (the visual-artwork round's own
 * ratchet: the documented r353 residuals get regression pins so the
 * fixes cannot silently return).
 *
 * GUARD 1 — the mastery panel's NEXT STEP chip clearance. The r353
 * residual (documented in docs/redesign/r353/REPORT.md): the chip's
 * bottom edge kissed the recommendation box's top-face corner — the
 * anchor seat (iso(33.5,-3.5,5).sy − 12) put the PlateTag rect's
 * bottom (anchor + 5) at sy +3, EXACTLY the box's topmost corner
 * (iso(26,-10,5).sy = +3). The r354 re-seat lifts the anchor to
 * −15 (a 3-unit clearance, ×1.35 scale ≈ 4px). This guard reads the
 * AUTHORED SEAT from the source and recomputes the sheet geometry
 * through the projection itself (lib/iso) — a re-lowered chip fails
 * the pin before it can ship.
 *
 * GUARD 2 — the hero campus window wraps the visible ink. The r354
 * composition rebalance tightened CAMPUS_FRAME from 184×168 (the
 * r353 window carried ~80 units of dead vertical margin — the hidden
 * furniture's reservation) to 184×100. The guard pins the frame
 * against the measured ink bounds (the north-arrow ticks at sy −24 …
 * the campus dimension's extensions at sy ≈ +63): every edge keeps
 * its drafting mat (≥4 units) and the window never regrows the dead
 * margins that shrank the drawing to ~52% of its own frame.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { iso } from '../../src/lib/iso';

const read = (p: string) =>
  readFileSync(join(__dirname, '..', '..', 'src', p), 'utf8');

describe('r354 — the why-panel plate guards', () => {
  it('the NEXT STEP chip clears the recommendation box by ≥ 2 sheet units', () => {
    const src = read('components/landing/plates/WhyPanels.tsx');

    /* the chip's authored seat — the anchor expression is the pin:
     * any re-seat (different anchor iso point or lift) trips the
     * regex and forces this guard to be re-evaluated deliberately */
    const seat = src.match(
      /PlateTag x=\{iso\(33\.5, -3\.5, 5\)\.sx\} y=\{iso\(33\.5, -3\.5, 5\)\.sy - (\d+)\} text="NEXT STEP"/,
    );
    expect(seat, 'the mastery chip keeps its authored anchor seat (iso 33.5,-3.5,5)').not.toBeNull();

    /* the recommendation box the chip names — same stability pin */
    const box = src.match(/<IsoBox x=\{26\} y=\{-10\} w=\{15\} d=\{13\} h=\{5\}/);
    expect(box, 'the recommendation box keeps its authored footprint (26,-10,15,13,5)').not.toBeNull();

    /* the geometry, recomputed through the projection:
     *   · PlateTag's rect bottom = anchor.y + 5 (the kernel's own
     *     y−8 … y+5 rect box);
     *   · the box's topmost top-face corner = iso(26,-10,5).sy
     *     (the top face spans x 26…41 × y −10…3 at z 5; its
     *     reading-start corner is the sheet-space topmost). */
    const lift = Number(seat![1]);
    expect(Number.isFinite(lift) && lift > 0, 'the lift is a positive number').toBe(true);
    const chipBottom = iso(33.5, -3.5, 5).sy - lift + 5;
    const boxTopCorner = iso(26, -10, 5).sy;
    expect(
      chipBottom,
      `the chip bottom (sy ${chipBottom.toFixed(1)}) clears the box top corner (sy ${boxTopCorner.toFixed(1)}) by ≥2 units`,
    ).toBeLessThanOrEqual(boxTopCorner - 2);
  });
});

describe('r354 — the hero campus window guards', () => {
  it('CAMPUS_FRAME wraps the visible ink with a drafting mat (no dead margins)', () => {
    const src = read('components/landing/hero/CampusPlate.tsx');
    const frame = src.match(
      /export const CAMPUS_FRAME = \{ x: (-?\d+), y: (-?\d+), w: (\d+), h: (\d+) \} as const;/,
    );
    expect(frame, 'CAMPUS_FRAME stays the exported single-source literal').not.toBeNull();

    const x = Number(frame![1]);
    const y = Number(frame![2]);
    const w = Number(frame![3]);
    const h = Number(frame![4]);

    /* the measured visible-ink bounds (r354's own audit, computed
     * from the authored geometry): the north-arrow tick crown at
     * sy −24 (furniture translate(−50,−12), ticks to r 12) … the
     * campus edge dimension's extension feet at sy ≈ +62.8 (the
     * 56.0 Dim's off-sheet extensions, gap 4 + 2.4). The window
     * keeps ≥4 units of mat beyond each — and never carries more
     * than 12 units (the dead-margin ceiling that keeps the drawing
     * at ≥75% of its own frame height). */
    const INK_TOP = -24;
    const INK_BOTTOM = 62.8;
    expect(y, 'the mat above the ink (≥4 units)').toBeLessThanOrEqual(INK_TOP - 4);
    expect(y + h, 'the mat below the ink (≥4 units)').toBeGreaterThanOrEqual(INK_BOTTOM + 4);
    expect(y, 'no dead top margin (>12 units regrows the r353 shrink)').toBeGreaterThanOrEqual(INK_TOP - 12);
    expect(y + h, 'no dead bottom margin (>12 units regrows the r353 shrink)').toBeLessThanOrEqual(INK_BOTTOM + 12);
    /* the window stays centered on the sheet's own grammar: the
     * horizontal extent is the RegMark pair at sheet x ±91 — the
     * frame wraps them with the same mat law */
    expect(x, 'the left mat (RegMark at −91 needs ≥1 unit)').toBeLessThanOrEqual(-92);
    expect(x + w, 'the right mat (RegMark at +91 needs ≥1 unit)').toBeGreaterThanOrEqual(92);
  });
});
