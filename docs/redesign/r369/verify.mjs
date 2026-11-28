import { chromium } from 'playwright';
const b = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.addInitScript(() => sessionStorage.setItem('ulara-intro-skip', '1'));
await page.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const at0 = await page.evaluate(() => ({
  rail: getComputedStyle(document.querySelector('.w369-rail-fill')).transform,
  jar: document.querySelector('.w369-jar')?.textContent?.trim().replace(/\s+/g,' '),
}));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.55, behavior: 'instant' }));
await page.waitForTimeout(400);
const at55 = await page.evaluate(() => ({
  rail: getComputedStyle(document.querySelector('.w369-rail-fill')).transform,
  jar: document.querySelector('.w369-jar')?.textContent?.trim().replace(/\s+/g,' '),
  pending: document.querySelectorAll('[data-reveal="pending"]').length,
}));
// anchor: click «المستويات» and check the heading clears the sticky nav
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.click('a[href="#levels"]');
await page.waitForTimeout(1200);
const anchor = await page.evaluate(() => {
  const h = document.querySelector('#levels h2');
  const nav = document.querySelector('.w369-nav');
  const hr = h.getBoundingClientRect(), nr = nav.getBoundingClientRect();
  return { headingTop: Math.round(hr.top), navBottom: Math.round(nr.bottom), hidesHeading: hr.top < nr.bottom };
});
console.log({ at0, at55, anchor });
await b.close();
