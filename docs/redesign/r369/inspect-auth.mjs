import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5310/auth', { waitUntil: 'networkidle' });
const info = await p.evaluate(() => {
  const pick = (el, props) => { const c = getComputedStyle(el); const o = {}; for (const k of props) o[k] = c[k]; return o; };
  const cell = document.querySelector('.auth-cell');
  const control = document.querySelector('.auth-cell-control');
  const input = document.querySelector('.auth-input');
  return {
    cell: pick(cell, ['display', 'gridTemplateColumns', 'justifyItems', 'justifyContent', 'width']),
    control: pick(control, ['display', 'justifySelf', 'width', 'inlineSize', 'minInlineSize', 'gridTemplateColumns']),
    input: pick(input, ['display', 'width', 'inlineSize', 'boxSizing', 'justifySelf']),
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
