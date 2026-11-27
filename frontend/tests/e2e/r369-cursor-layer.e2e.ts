/**
 * r369-cursor-layer.e2e.ts — the app-level CursorManager belt.
 *
 * The r311 landing instrument (SheetCursor) retired with the old landing;
 * what remains is the one app layer (.cursor-layer). Contract: it paints
 * only on a fine-pointer desktop (≥992px) without reduced motion, is fully
 * down on the landing route (suspended) and on phones, and a hovered link
 * flips its data-state. The native cursor is never hidden.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

test.describe('r369 — the app cursor layer', () => {
  test('desktop /colleges: the layer mounts, wakes on pointer move, and a link flips its state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/colleges');
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 320);
    const layer = page.locator('.cursor-layer');
    await expect(layer).toBeAttached();
    await expect(layer).toHaveAttribute('data-active', 'true');
    const link = page.locator('main a').first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect(layer).toHaveAttribute('data-state', 'link');
    /* the native pointer is never hidden by the decoration */
    const cursor = await page.evaluate(() => getComputedStyle(document.body).cursor);
    expect(cursor).not.toBe('none');
  });

  test('the landing route suspends the layer entirely (no hidden div)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.mouse.move(400, 300);
    await expect(page.locator('h1.w369-h1')).toBeVisible();
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
  });

  test('phone width: no custom layer, the native pointer stays', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/colleges');
    await page.mouse.move(100, 200);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('no custom layer, the native cursor stays', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/colleges');
      await page.mouse.move(400, 300);
      await expect(page.locator('.cursor-layer')).toHaveCount(0);
    });
  });
});
