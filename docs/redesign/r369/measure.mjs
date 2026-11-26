import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * r369 measure — the instrument that makes "match" measurable.
 *
 *   node docs/redesign/r369/measure.mjs <url> [outDir]
 *
 * The URL is a RUNTIME argument on purpose: the captured site is referred
 * to as «the inspiration» everywhere in this repository, and its address
 * is never stored. Everything this script writes is GEOMETRY AND STYLE —
 * no markup, no text content, no code bytes — so the record cannot leak
 * the source it measured.
 *
 * Output: measure/inspiration.json + full-page shots + per-section shots
 * + a scroll frame sequence at 1440 and 390.
 */
const url = process.argv[2];
const out = process.argv[3] ?? 'docs/redesign/r369/measure';
if (!url) {
  console.error('usage: measure.mjs <url> [outDir]');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, dsf: 1 },
  { name: 'phone', width: 390, height: 844, dsf: 2 },
];

/* the probe — runs in the page, returns pure numbers/strings of style */
const PROBE = () => {
  const px = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
  const style = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      box: {
        x: px(r.x + window.scrollX), y: px(r.y + window.scrollY),
        w: px(r.width), h: px(r.height),
      },
      font: {
        size: px(cs.fontSize), lineHeight: px(cs.lineHeight),
        weight: cs.fontWeight, family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        tracking: cs.letterSpacing, transform: cs.textTransform,
      },
      box2: {
        margin: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].map(px),
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px),
        gap: px(cs.gap), radius: px(cs.borderRadius),
        border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
        shadow: cs.boxShadow, background: cs.backgroundColor, color: cs.color,
        position: cs.position, zIndex: cs.zIndex, display: cs.display,
      },
    };
  };

  const roots = [...document.body.children].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 120 && getComputedStyle(el).display !== 'none';
  });

  const sections = roots.map((el, i) => {
    const kids = [...el.querySelectorAll('h1,h2,h3,h4,p,button,a.img,img,svg,li')].slice(0, 40);
    return {
      i,
      tag: el.tagName.toLowerCase(),
      clsCount: el.classList.length,
      box: style(el).box,
      children: kids.map((k) => ({
        tag: k.tagName.toLowerCase(),
        ...style(k),
      })),
      textNodes: [...el.querySelectorAll('h1,h2,h3,h4')].slice(0, 6).map((h) => ({
        tag: h.tagName.toLowerCase(),
        chars: (h.textContent ?? '').trim().length,
        words: (h.textContent ?? '').trim().split(/\s+/).length,
        ...style(h),
      })),
    };
  });

  const bodyStyle = getComputedStyle(document.body);
  const htmlStyle = getComputedStyle(document.documentElement);
  return {
    docHeight: Math.round(document.documentElement.scrollHeight),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    tokens: {
      bodyBg: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
      bodyFont: bodyStyle.fontFamily.split(',')[0].replace(/["']/g, ''),
      bodySize: px(bodyStyle.fontSize),
      bodyLineHeight: px(bodyStyle.lineHeight),
      rootSize: px(htmlStyle.fontSize),
      scrollBehavior: htmlStyle.scrollBehavior,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
    },
    sticky: [...document.querySelectorAll('body *')]
      .filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position))
      .slice(0, 12)
      .map((el) => ({ ...style(el), z: getComputedStyle(el).zIndex })),
    sections,
  };
};

const browser = await chromium.launch({ channel: 'chrome' });
const report = {};

for (const vp of VIEWPORTS) {
 try {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    locale: 'en-GB',
    isMobile: vp.width < 500,
    hasTouch: vp.width < 500,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const data = await page.evaluate(PROBE);
  report[vp.name] = data;

  await page.screenshot({ path: `${out}/${vp.name}-full.png`, fullPage: true });

  /* per-section crops: one frame per band at its own scroll offset */
  for (const s of data.sections.slice(0, 14)) {
    const top = Math.max(0, s.box.y - 40);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.waitForTimeout(700);
    await page
      .screenshot({
        path: `${out}/${vp.name}-s${String(s.i).padStart(2, '0')}.png`,
        clip: undefined,
      })
      .catch(() => {});
  }

  /* a stepped scroll sequence — motion replay material */
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const height = data.docHeight;
  const step = Math.round(height / 12);
  for (let i = 0; i < 12; i += 1) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), i * step);
    await page.waitForTimeout(320);
    await page
      .screenshot({ path: `${out}/${vp.name}-f${String(i).padStart(2, '0')}.png` })
      .catch(() => {});
  }
  await ctx.close();
  writeFileSync(`${out}/inspiration.json`, JSON.stringify(report, null, 1));
  console.log(`✓ measured ${vp.name} (${data.docHeight}px tall, ${data.sections.length} bands)`);
 } catch (err) {
  console.log(`! ${vp.name} pass failed: ${err.message.split('\n')[0]}`);
  writeFileSync(`${out}/inspiration.json`, JSON.stringify(report, null, 1));
 }
}

await browser.close();
writeFileSync(`${out}/inspiration.json`, JSON.stringify(report, null, 1));
console.log(`wrote ${out}/inspiration.json`);
