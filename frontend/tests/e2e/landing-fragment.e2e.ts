import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

test('a cold section link and a subsequent section link reach their visible targets', async ({ page }) => {
  await page.goto('/#roles');
  await expect(page.locator('#roles')).toBeInViewport();
  await page.locator('.w369-nav-burger').click();
  await page.locator('.w369-mobile-menu').getByRole('link', { name: 'الحكاية' }).click();
  await expect(page).toHaveURL(/\/#story$/);
  await expect(page.locator('#story')).toBeInViewport();
});
