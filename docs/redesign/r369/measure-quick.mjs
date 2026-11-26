import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await p.waitForTimeout(3000);
const out = await p.evaluate(() => {
  const px = (v) => Math.round(parseFloat(v) || 0);
  const sec = [...document.querySelectorAll('section, header, footer, main > div')].slice(0, 22).map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const h = el.querySelector('h1,h2');
    return {
      tag: el.tagName.toLowerCase(),
      y: px(r.top + scrollY), h: px(r.height),
      pt: px(cs.paddingTop), pb: px(cs.paddingBottom),
      maxW: px(cs.maxWidth), radius: px(cs.borderRadius), gap: px(cs.gap),
      head: h ? { tag: h.tagName.toLowerCase(), fs: px(getComputedStyle(h).fontSize), lh: px(getComputedStyle(h).lineHeight), w: getComputedStyle(h).fontWeight, ls: getComputedStyle(h).letterSpacing } : null,
    };
  });
  const body = getComputedStyle(document.body);
  return { docH: Math.round(document.documentElement.scrollHeight), bg: body.backgroundColor, ink: body.color, font: body.fontFamily.split(',')[0], fs: px(body.fontSize), sec };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
