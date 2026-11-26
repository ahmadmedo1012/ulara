import { test } from '@playwright/test';
import { ADMIN_USER } from './fixtures/api-fixtures';
import { installMockApi, seedSession } from './fixtures/mock-transport';

test.use({ e2eRole: 'ADMIN', viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });

test('probe admin students settled', async ({ page }) => {
  const context = page.context();
  await seedSession(context, ADMIN_USER);
  await installMockApi(context, { sessionUser: ADMIN_USER });
  await page.goto('/admin/students');
  await page.waitForSelector('main h1', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/admin-students-settled.png', fullPage: true, animations: 'disabled' });
});
