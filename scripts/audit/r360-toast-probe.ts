import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await installMockApi(page);
  await seedSession(page, 'STUDENT');
  await page.goto('http://localhost:4173/student/dashboard', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  const t = await page.evaluate(() => document.querySelector('.toast')?.textContent?.trim().slice(0, 120) || 'NO TOAST');
  console.log('TOAST TEXT:', t);
  const gone = await page.waitForSelector('.toast', { state: 'detached', timeout: 8000 }).then(() => 'auto-dismissed').catch(() => 'still present at 8s');
  console.log('TOAST LIFECYCLE:', gone);
  await browser.close();
}
main();
