/**
 * r369 — the landing ticker travels with the RTL reading flow (left to
 * right: new items enter from the leading edge) and stands still under
 * prefers-reduced-motion.
 */
import { test, expect } from './fixtures/e2e';

test.describe('r369 marquee direction', () => {
  test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

  test('the ticker moves rightward in RTL', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('.w369-marquee-track');
    await expect(track).toHaveCount(1);
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('w369-marquee-rtl');
    const x0 = await track.evaluate((el) => el.getBoundingClientRect().left);
    await page.waitForTimeout(600);
    const x1 = await track.evaluate((el) => el.getBoundingClientRect().left);
    expect(x1, 'the strip drifts toward the right').toBeGreaterThan(x0);
  });
});

test.describe('r369 marquee reduced motion', () => {
  test.use({ e2eRole: 'guest', reducedMotion: 'reduce' });

  test('the ticker holds still', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('.w369-marquee-track');
    await expect(track).toHaveCount(1);
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});
