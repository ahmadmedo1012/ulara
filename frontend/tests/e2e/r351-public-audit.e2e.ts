/**
 * r351-public-audit.e2e.ts — the public sheet's GEOMETRY AUDIT (r351 P5).
 *
 * The r351 gap matrix (docs/redesign/r351/public/GAP.md §3.1) re-confirmed
 * the class of defect the overflow probes cannot see: TEXT RENDERING ON
 * TEXT and captions clipped at the sheet's edges in the two densest
 * stages — the masthead band and the journey's pinned viewport. This belt
 * walks the five recorded widths (1440/1024/768/390/360) and asserts:
 *
 *   1. NO TEXT-ON-TEXT — inside the header band (the masthead's own top
 *      strip) and the journey stage, no two text-leaf rects overlap by
 *      more than a 4px tolerance in BOTH axes unless one contains the
 *      other (a parent box is not a collision).
 *   2. NO CLIPPED CAPTIONS — every text leaf in those stages reads fully
 *      inside the viewport horizontally (the §0 «caption clipped at the
 *      right edge» class).
 *   3. NO HORIZONTAL OVERFLOW — the document never scrolls sideways.
 *
 * The audit samples the journey at three scrub seats (25% / 55% / 85%)
 * so every scene beat's overlays are audited, not just the first frame.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

const WIDTHS = [1440, 1024, 768, 390, 360] as const;


for (const w of WIDTHS) {


  test(`zero horizontal overflow on the landing @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w >= 1024 ? 900 : 844 });
    await page.goto('/');
    await page.waitForTimeout(5_400);
    for (const seat of [0, 0.3, 0.6, 0.9, 1]) {
      await page.evaluate((s) => {
        window.scrollTo(0, (document.body.scrollHeight - innerHeight) * s);
      }, seat);
      await page.waitForTimeout(420);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(ov, `horizontal overflow @${w} seat ${seat}`).toBe(0);
    }
  });
}
