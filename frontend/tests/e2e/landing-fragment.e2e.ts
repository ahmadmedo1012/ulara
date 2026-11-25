import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

test('a cold product link and a subsequent section link reach their visible targets', async ({ page }) => {
  await page.goto('/#product');
  await expect(page.locator('#product')).toBeInViewport();
  await page.getByRole('link', { name: 'أنشئ حسابك لتجربتها حيّة الآن' }).click();
  await expect(page).toHaveURL(/\/#cta$/);
  await expect(page.locator('#cta')).toBeInViewport();
});
