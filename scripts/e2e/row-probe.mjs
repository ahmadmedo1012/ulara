import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const TRANSPORT = '/home/z/agent02/ulara-work/frontend/tests/e2e/fixtures/mock-transport.ts';
const FIX = '/home/z/agent02/ulara-work/frontend/tests/e2e/fixtures/api-fixtures.ts';
const { installMockApi, seedSession } = await import(TRANSPORT);
const { ROLE_USERS } = await import(FIX);
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const b = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch {} });
await seedSession(ctx, ROLE_USERS.STUDENT, {});
await installMockApi(ctx, { sessionUser: ROLE_USERS.STUDENT, overrides: [] });
const page = await ctx.newPage();
await page.goto('http://localhost:5302/student/dashboard', { waitUntil: 'domcontentloaded' });
await page.locator('.content .skeleton').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
await page.waitForTimeout(400);
const rows = await page.evaluate(() => {
  const out = [];
  for (const a of document.querySelectorAll('main a')) {
    const t = (a.textContent || '').trim();
    if (t.includes('واجب الأسبوع') || t.includes('قاعة A2')) {
      const r = a.getBoundingClientRect();
      out.push({ cls: a.className.slice(0, 60), h: Math.round(r.height), w: Math.round(r.width) });
    }
  }
  return out;
});
console.log(JSON.stringify(rows, null, 1));
await b.close();
