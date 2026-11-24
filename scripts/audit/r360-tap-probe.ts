import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';

async function main() {
  const target = process.argv[2] || '/student/social';
  const role = (process.argv[3] || 'STUDENT') as never;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await installMockApi(page);
  await seedSession(page, role);
  await page.goto('http://localhost:4173' + target, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('button, a').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (el.tagName === 'A' && el.closest('p, span') && r.height < 32 && r.width > 44) return;
      if (Math.round(r.width) < 44 || Math.round(r.height) < 44) {
        out.push(el.tagName + '.' + String(el.className).split(' ').slice(0, 3).join('.') + ' [' + (el.textContent || '').trim().slice(0, 14) + '] w=' + Math.round(r.width) + ' h=' + Math.round(r.height) + ' parent:' + (el.parentElement && el.parentElement.className || '').toString().slice(0, 30));
      }
    });
    return out.slice(0, 14);
  });
  console.log('== ' + target + ' ==');
  console.log(info.join('\n') || 'CLEAN');
  await browser.close();
}
main();
