import { chromium } from 'playwright';
import { installMockApi } from '../../frontend/tests/e2e/fixtures/mock-transport';

const [, , route = '/', width = '1024', theme = 'light', out = '/tmp/shot.png'] = process.argv;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: Number(width), height: Number(width) < 500 ? 844 : 900 },
    colorScheme: theme as 'light' | 'dark',
  });
  const page = await ctx.newPage();
  await installMockApi(page);
  await page.goto((process.env.ULARA_E2E_BASE_URL || 'http://localhost:4173') + route, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Where the hero headline text lives, plus the statement words:
  const boxes = await page.evaluate(`(() => {
    const out = [];
    for (const sel of ['.hro-line', '.wr-i']) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({ sel, text: (el.textContent || '').trim().slice(0, 24), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), lh: cs.lineHeight, fs: cs.fontSize, disp: cs.display, pos: cs.position });
      }
    }
    return out;
  })()`);
  console.log(JSON.stringify(boxes, null, 1));
  await page.screenshot({ path: out });
  await browser.close();
})();
