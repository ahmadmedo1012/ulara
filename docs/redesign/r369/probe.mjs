import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.addInitScript(() => sessionStorage.setItem('ulara-intro-skip', '1'));
await page.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const bands = [...document.querySelectorAll('.w369-band')].map((s) => {
    const body = s.querySelector('.w369-band-body');
    const first = body?.firstElementChild;
    const r = (e) => e ? [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().width)] : null;
    return { band: s.dataset.jar, body: r(body), first: r(first), firstCls: first?.className };
  });
  return bands;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
