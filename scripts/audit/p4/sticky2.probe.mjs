import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../../frontend/tests/e2e/fixtures/mock-transport.ts';
import { ROLE_USERS } from '../../../frontend/tests/e2e/fixtures/api-fixtures.ts';
const BASE = 'http://localhost:4173';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar-LY', colorScheme: 'light' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch {} });
await seedSession(ctx, ROLE_USERS.STUDENT, { theme: 'light' });
await installMockApi(ctx, { sessionUser: ROLE_USERS.STUDENT });
const page = await ctx.newPage();
await page.goto(BASE + '/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const content = document.querySelector('.content');
  content.scrollTop = content.scrollHeight;
  return new Promise((res) => requestAnimationFrame(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:sticky;bottom:700px;height:20px;background:#f00;';
    probe.id = 'sticky-probe';
    content.querySelector('.content-inner').appendChild(probe);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const r = probe.getBoundingClientRect();
      res({ probeTop: Math.round(r.top), probeBottom: Math.round(r.bottom), contentBottom: Math.round(content.getBoundingClientRect().bottom), pad: getComputedStyle(content).paddingBottom, scrollTop: content.scrollTop, scrollH: content.scrollHeight, clientH: content.clientHeight });
    }));
  }));
});
console.log(JSON.stringify(out));
await browser.close();
