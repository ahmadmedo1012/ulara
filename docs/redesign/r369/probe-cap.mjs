import { chromium } from 'playwright';
const b = await chromium.launch({});
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto('http://127.0.0.1:5310/capabilities', { waitUntil: 'networkidle' });
const r = await p.evaluate(() => ({
  sections: [...document.querySelectorAll('.p369-article-sec')].map((s) => ({
    head: s.querySelector('h2')?.textContent?.slice(0, 30),
    reveal: s.getAttribute('data-reveal'),
    visible: s.getBoundingClientRect().height,
    opacity: getComputedStyle(s).opacity,
  })),
  bodyHeight: document.body.scrollHeight,
  mainHTML: document.querySelector('main')?.children.length,
}));
console.log(JSON.stringify(r, null, 1), 'ERRORS:', errors);
await b.close();
