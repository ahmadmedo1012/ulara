import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const out = 'docs/redesign/r369/evidence/match/';
for (const [w, h, name] of [[1440, 900, 'a-1440'], [390, 844, 'a-390']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ar' });
  await ctx.addInitScript(() => sessionStorage.setItem('ulara-intro-skip', '1'));
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(e => e.dataset.reveal = 'in'));
  await page.waitForTimeout(600);
  const ids = ['story','stars','progress','rewards','levels','handoff','showcase','principles'];
  for (const id of ids) {
    const el = await page.$('#' + id);
    if (!el) { console.log('missing', id); continue; }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    await el.screenshot({ path: `${out}${name}-${id}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log('done');
