import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'ar-LY', isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  await p.addInitScript(() => sessionStorage.setItem('ulara-intro-skip', '1'));
  await p.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `docs/redesign/r369/evidence/match/ours-hero-${name}.png` });
  await ctx.close();
}
await b.close();
