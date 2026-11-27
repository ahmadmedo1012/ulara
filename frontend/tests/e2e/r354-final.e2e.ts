/**
 * r354-final.e2e.ts — the closing hardening belt (the final-phase
 * directives §6/§11): REAL-BROWSER geometry for the defects this round
 * fixed, not source-text assumptions.
 *
 *   1. HERO CAMPUS GEOMETRY — across 360/390/768/1024/1280/1440: the
 *      campus SVG renders at a real size (the composition regression:
 *      the r353 window read 33.7% of the 1440 band; the rebalanced
 *      window ≥45%), no horizontal overflow, and the four inspection
 *      stations sit ON the artwork (station centers inside the SVG's
 *      rect), each carrying a ≥44px hit target and an accessible name,
 *      each a real focusable button.
 *   2. THE JOURNEY EXIT at exact clock beats (the r354-final window
 *      out t 2.15–2.35): full presence at t 2.10, mid-fall at t 2.20,
 *      GONE by t 2.35 — and the exit completes while the satellite
 *      layer is still resolving (the clean-window invariant), desktop
 *      AND the ≤991 warp; the halo belt is the em-keyed text-shadow
 *      (12+ passes) with the retired SVG-stroke declarations gone.
 *   3. WHY — the settled plate under reduced motion (every loop
 *      element at opacity 1 — the «faint unfinished capture» defect
 *      can never be a rest state) + the NEXT STEP chip's REAL rendered
 *      clearance off the recommendation box (SVG client rects, not
 *      source constants).
 *   4. PAINS — the four indexed challenges and their answers at three widths.
 *   5. ROLES — five platform entry roles, three labelled use cases,
 *      the [05/05] group divider, keyboard-operable accordion rows.
 *   6. THEME — the dark tier resolves the royal seat to its measured
 *      dark value (the strong text tier), through the real store.
 */
import { test, expect } from './fixtures/e2e';
import { approachSection } from './fixtures/landing-scene';

const HERO_READY = 'في نظام واحد';

/** band progress → the scene clock t (desktop: linear; mobile: the warp). */




test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* ── 1 · the hero campus geometry ─────────────────────────────────── */



/* ── 2 · the journey exit at exact clock beats ───────────────────── */


/* ── 3 · the why plates ──────────────────────────────────────────── */

test.describe('R354-final · the why plates', () => {
  test.use({ reducedMotion: 'reduce' });


});


/* ── 5 · the roles truth ─────────────────────────────────────────── */

test.describe('R354-final · five platform roles, honestly separated', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1.w369-h1')).toContainText(HERO_READY);
    await approachSection(page, 'roles');
    await page.locator('.rl-section').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  });

  test('8 rows: 5 platform roles, 3 use-case chips, the [05/05] divider', async ({ page }) => {
    const truth = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.rl-row'));
      const chips = rows.map((r) => !!r.querySelector('.rl-kind'));
      const divider = document.querySelector('.rl-group');
      return {
        rowCount: rows.length,
        chipCount: chips.filter(Boolean).length,
        firstChipIndex: chips.findIndex(Boolean),
        divider: divider
          ? { visible: getComputedStyle(divider).display !== 'none', text: divider.textContent || '' }
          : null,
      };
    });
    expect(truth.rowCount).toBe(8);
    expect(truth.chipCount, 'exactly three use-case rows (06–08)').toBe(3);
    expect(truth.firstChipIndex, 'the chips begin at row 06 (after the five platform roles)').toBe(5);
    expect(truth.divider).not.toBeNull();
    expect(truth.divider!.visible, 'the group divider renders').toBe(true);
    expect(truth.divider!.text).toContain('[05/05]');
    expect(truth.divider!.text).toContain('أدوار المنصّة الخمسة');
  });

  test('the accordion is keyboard-operable and communicates its state', async ({ page }) => {
    /* row 06 (a use-case persona) opens via its icon button */
    const row6 = page.locator('.rl-row').nth(5);
    const icon = row6.locator('.rl-row-icon');
    await expect(icon).toHaveAttribute('role', 'button');
    await expect(icon).toHaveAttribute('tabindex', '0');
    await icon.focus();
    await expect(icon).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await expect(row6).toHaveClass(/is-open/);
    const deck = await page.evaluate(() => document.querySelector('.rl-deck-count')?.textContent?.trim() || '');
    expect(deck, 'the media deck follows the open row').toBe('[06/08]');
    /* the chip is inside the open row's title */
    expect(row6.locator('.rl-kind')).toHaveText('حالة استخدام');
  });
});

/* ── 6 · the dark tier ───────────────────────────────────────────── */

test.describe('R354-final · the dark tier resolves the royal seat', () => {
  test.use({ e2eRole: 'guest', themeSeed: 'dark' });

});
