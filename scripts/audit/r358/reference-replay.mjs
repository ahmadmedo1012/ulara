#!/usr/bin/env node
/**
 * scripts/audit/r358/reference-replay.mjs — R358 Phase A instrument 1/3.
 *
 * WHAT: replays THE REFERENCE locally from the r350 corpus and measures it
 * fresh. The reference's live deployment is dark (site + engine host 404 —
 * a temporary demo), but the corpus (docs/redesign/r350/reference/)
 * carries: the full saved DOM at its pre-init state (home + pricing), the
 * extracted stylesheets, the REAL 289 KB engine bundle (obfuscated
 * Lenis/GSAP/ScrollTrigger/SplitText/barba/Swiper build), the SVG
 * filters, and the measured timelines; the platform CDN that hosts its
 * images/webflow runtime is still live. So the site is reconstructed at
 * its ORIGINAL origin URL inside Playwright by routing: origin pages +
 * engine bundle → corpus files, platform CDN → live (corpus fallback),
 * analytics → blocked. The engine then re-initializes the real
 * choreography; we drive it the honest way (mouse.wheel — Lenis wrapper
 * mode, never scrollTo) and measure.
 *
 * ZERO-TRACE: the origin domain, the engine-bundle host and the agency
 * name are PARSED AT RUNTIME from corpus files (data-wf-domain attribute,
 * config.js PRODUCTION_MAIN_URL, ../platform-cdn hrefs) — this file
 * spells none of them; outputs under docs/redesign/r358/reference/replay
 * carry sanitized labels ("the reference").
 *
 * Captures per width (default 1440×900 and 390×844):
 *   shots/  01-hero-rest · 02-hero-hover · 03-hero-after-drag ·
 *           04-cta-hover · 05-cta-press · 06-focus-visible · 07-menu-open ·
 *           08-journey-#### (wheel-driven frames ~every 1000px) ·
 *           09-footer-rest · 10-footer-hover · 11-pricing ·
 *           preloader frames (pre-1..5 + exit)
 *   styles.json      computed styles per element role + :root palette
 *                    (parsed from the corpus stylesheet) + section
 *                    geometry (tops/rhythm at both widths)
 *   motion.json      preloader counter series · reveal sampling series ·
 *                    page-transition (barba) clip-path series ·
 *                    getAnimations() dump · measured section tops
 *   assets-fallback.json  every platform-CDN asset that had to fall back
 *
 * Usage: node scripts/audit/r358/reference-replay.mjs [--widths 1440,390]
 *        [--corpus docs/redesign/r350/reference] [--timeout 15000]
 * Exit 0 = replay produced its artifact set (warnings listed, not fatal).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(join(ROOT, 'frontend', 'package.json'));
const { chromium } = require('playwright');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const CORPUS = resolve(ROOT, arg('corpus', 'docs/redesign/r350/reference'));
const OUT = resolve(ROOT, 'docs/redesign/r358/reference/replay');
const WIDTHS = arg('widths', '1440,390').split(',').map(Number);
const PRELOAD_TIMEOUT = Number(arg('timeout', '15000'));

/* ── corpus facts, parsed at runtime (zero-trace: nothing spelled here) ── */
const homeHtml = readFileSync(join(CORPUS, 'refsite-home.html'), 'utf8');
const pricingHtml = readFileSync(join(CORPUS, 'refsite-pricing.html'), 'utf8');
const configJs = readFileSync(join(CORPUS, 'config.js'), 'utf8');
const corpusCss = readFileSync(join(CORPUS, 'refsite.css'), 'utf8');

const mDomain = homeHtml.match(/data-wf-domain="([^"]+)"/);
const mEngine = configJs.match(/PRODUCTION_MAIN_URL\s*=\s*['"]([^'"]+)['"]/);
const mCdn = homeHtml.match(/\.\.\/([a-z0-9.-]+\.website-files\.com)\//i);
if (!mDomain || !mEngine || !mCdn) {
  console.error('[replay] corpus parse failed — origin/engine/cdn not found');
  process.exit(2);
}
const ORIGIN = `https://${mDomain[1]}`;
const ENGINE_URL = mEngine[1];
const ENGINE_BASE = ENGINE_URL.slice(0, ENGINE_URL.lastIndexOf('/'));
const CDN_HOST = mCdn[1];
console.log(`[replay] origin resolved from corpus (unprinted) · engine + cdn parsed`);

/* ── chromium from the shared fleet cache (r355 pattern) ── */
function chromiumExecutable() {
  if (process.env.ULARA_E2E_EXECUTABLE) return process.env.ULARA_E2E_EXECUTABLE;
  const cache = `${process.env.HOME}/.cache/ms-playwright`;
  try {
    const revs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort().reverse();
    for (const rev of revs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = `${cache}/${rev}/${sub}`;
        if (existsSync(p)) return p;
      }
    }
  } catch {}
  return undefined;
}

/* ── routing: corpus reconstruction + live CDN + blocked analytics ── */
const assetFallbacks = [];
const ANALYTICS = [
  'https://scripts.clarity.ms/**', 'https://www.clarity.ms/**',
  'https://cdn.mxpnl.com/**', 'https://api.mixpanel.com/**',
  '**://www.googletagmanager.com/**', '**://www.google-analytics.com/**',
  '**://*.doubleclick.net/**', '**://snap.licdn.com/**',
];
const MIME = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml' };
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PIXEL_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>');

function serveFile(route, file, type) {
  route.fulfill({ status: 200, contentType: type, body: readFileSync(file) });
}

async function installRouting(context) {
  for (const p of ANALYTICS) await context.route(p, r => r.abort());

  await context.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/' || path === '') return serveFile(route, join(CORPUS, 'refsite-home.html'), MIME.html);
    if (path === '/pricing') return serveFile(route, join(CORPUS, 'refsite-pricing.html'), MIME.html);
    return route.fulfill({ status: 404, contentType: MIME.html, body: '<!doctype html><title>404</title>' });
  });

  await context.route(`${ENGINE_BASE}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('main.js')) return serveFile(route, join(CORPUS, 'main.js'), MIME.js);
    if (path.endsWith('config.js')) return serveFile(route, join(CORPUS, 'config.js'), MIME.js);
    if (path.endsWith('.svg')) return route.fulfill({ status: 200, contentType: MIME.svg, body: PIXEL_SVG });
    return route.fulfill({ status: 404, body: '' });
  });

  await context.route(`https://${CDN_HOST}/**`, async (route) => {
    try {
      const resp = await route.fetch();
      if (resp.status() < 400) return route.fulfill({ response: resp });
      throw new Error(`upstream ${resp.status()}`);
    } catch {
      const path = new URL(route.request().url()).pathname;
      assetFallbacks.push(path);
      if (path.endsWith('.css')) return serveFile(route, join(CORPUS, 'refsite.css'), MIME.css);
      if (path.endsWith('.js')) return serveFile(route, join(CORPUS, 'main.js'), MIME.js);
      if (path.endsWith('.svg')) return route.fulfill({ status: 200, contentType: MIME.svg, body: PIXEL_SVG });
      return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG });
    }
  });
}

/* ── measurement helpers ── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function readPreloaderState(page) {
  return page.evaluate(() => {
    const pct = document.querySelector('.loading-progress-txt-percent');
    const coord = document.querySelector('.loading-ruler-coordi');
    const loading = document.querySelector('.loading');
    return {
      pct: pct ? pct.textContent.trim() : null,
      x: coord ? (coord.querySelector('[data-loading-control="x"]') || {}).textContent || null : null,
      y: coord ? (coord.querySelector('[data-loading-control="y"]') || {}).textContent || null : null,
      loaded: loading ? loading.classList.contains('loaded') : 'absent',
      visible: loading ? getComputedStyle(loading).display !== 'none' && getComputedStyle(loading).visibility !== 'hidden' : false,
    };
  });
}

async function shot(page, dir, name) {
  await page.screenshot({ path: join(dir, `${name}.webp`), type: 'webp', quality: 80 });
}

async function measureStyles(page) {
  return page.evaluate(() => {
    const pick = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
        color: cs.color, background: cs.backgroundColor,
        borderRadius: cs.borderRadius, borderTopWidth: cs.borderTopWidth,
        borderTopColor: cs.borderTopColor, borderStyle: cs.borderTopStyle,
        padding: cs.padding, display: cs.display, w: Math.round(r.width), h: Math.round(r.height),
      };
    };
    const out = {};
    const groups = {
      headings: 'h1,h2,h3,h4,h5,h6',
      bodyTxt: '.txt:not(.txt-font-mono)',
      mono: '.txt-font-mono',
      buttons: '.btn-fill, .btn-line, [class*="btn-"]',
      headingsClass: '.heading',
      nav: '[class*="nav"] .txt, [class*="header"] .txt',
      footer: '[class*="footer"] .txt',
      sections: '[class^="home-"][class*="-wrap"], .home-intro-content, footer',
    };
    for (const [g, sel] of Object.entries(groups)) {
      const els = document.querySelectorAll(sel);
      const arr = [];
      els.forEach(el => { if (arr.length < 40) arr.push(pick(el)); });
      out[g] = arr;
    }
    // root geometry
    const de = document.documentElement;
    out.page = {
      htmlFontSize: getComputedStyle(de).fontSize,
      innerWidth: innerWidth, innerHeight: innerHeight,
      docScrollHeight: de.scrollHeight,
      scrollWrapper: (document.querySelector('.main-inner.lenis') || {}).scrollHeight || null,
    };
    return out;
  });
}

async function sectionTops(page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector('.main-inner.lenis');
    const base = wrapper ? wrapper.scrollTop : window.scrollY;
    const sels = ['.home-hero', '.home-intro-content', '.home-problem', '.home-map',
      '.home-platform', '.home-why', '.home-usecase', '.home-cta', 'footer',
      '.home-map-inner', '.home-platform-content-inner'];
    const tops = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) tops[s] = Math.round(el.getBoundingClientRect().top + base);
    }
    tops.__scroll = Math.round(base);
    tops.__docH = document.documentElement.scrollHeight;
    return tops;
  });
}

async function revealSeries(page, selector, ms = 1600, step = 50) {
  return page.evaluate(async ([sel, total, st]) => {
    const series = [];
    const t0 = performance.now();
    while (performance.now() - t0 < total) {
      const el = document.querySelector(sel);
      series.push(el ? {
        t: Math.round(performance.now() - t0),
        transform: el.style.transform || getComputedStyle(el).transform,
        opacity: getComputedStyle(el).opacity,
        visibility: getComputedStyle(el).visibility,
      } : null);
      await new Promise(r => setTimeout(r, st));
    }
    return series;
  }, [selector, ms, step]);
}

async function animationsDump(page) {
  return page.evaluate(() => {
    return document.getAnimations().map(a => {
      const el = a.effect && a.effect.target;
      const timing = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      return {
        targetClass: el && el.className && String(el.className).slice(0, 80),
        playState: a.playState, duration: timing.duration, delay: timing.delay,
        easing: timing.easing, iterations: timing.iterations,
        startTime: a.startTime, currentTime: a.currentTime,
      };
    });
  });
}

/* ── main flow ── */
async function runWidth(browser, width, height) {
  const shotsDir = join(OUT, 'shots', String(width));
  mkdirSync(shotsDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height } });
  await installRouting(context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => consoleErrors.push(String(e.message).slice(0, 160)));

  console.log(`[replay ${width}] goto origin`);
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  /* 1 — preloader series */
  const pre = [];
  const t0 = Date.now();
  let lastShotIdx = -1;
  while (Date.now() - t0 < PRELOAD_TIMEOUT) {
    const s = await readPreloaderState(page);
    pre.push({ t: Date.now() - t0, ...s });
    const idx = Math.floor((Date.now() - t0) / 1000);
    if (idx !== lastShotIdx && idx <= 5) {
      await shot(page, shotsDir, `preloader-${idx}`);
      lastShotIdx = idx;
    }
    if (s.loaded === true || s.visible === false) break;
    await sleep(200);
  }
  await sleep(800);
  await shot(page, shotsDir, 'preloader-exit');

  /* 2 — hero states */
  await shot(page, shotsDir, '01-hero-rest');
  const heroWrap = await page.$('.home-hero-img-interact-wrap');
  if (heroWrap) {
    const bb = await heroWrap.boundingBox();
    if (bb) {
      await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.4);
      await sleep(400);
      await shot(page, shotsDir, '02-hero-hover');
      await page.mouse.down();
      for (let i = 0; i < 8; i++) {
        await page.mouse.move(bb.x + bb.width * (0.2 + i * 0.09), bb.y + bb.height * (0.3 + i * 0.05));
        await sleep(90);
      }
      await page.mouse.up();
      await sleep(600);
      await shot(page, shotsDir, '03-hero-after-drag');
    }
  }
  const cta = await page.$('.btn-fill');
  if (cta) {
    await cta.hover(); await sleep(450); await shot(page, shotsDir, '04-cta-hover');
    await page.mouse.down(); await sleep(300); await shot(page, shotsDir, '05-cta-press');
    await page.mouse.up();
  }
  await page.keyboard.press('Tab'); await sleep(300);
  await page.keyboard.press('Tab'); await sleep(300);
  await shot(page, shotsDir, '06-focus-visible');

  /* 3 — menu overlay */
  const menuSelectors = ['.nav-menu-btn', '.menu-btn', '[class*="menu-open"]', '[data-menu-btn]', '.header [class*="burger"]', '[class*="burger"]'];
  let menuOpened = false;
  for (const sel of menuSelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click(); await sleep(900);
      await shot(page, shotsDir, '07-menu-open');
      menuOpened = true;
      break;
    }
  }
  if (!menuOpened) console.log(`[replay ${width}] menu trigger not found (selectors tried, none matched)`);

  /* 4 — wheel-driven journey */
  const journey = [];
  const sectionTopsLog = [];
  let lastTop = -1, stuck = 0, steps = 0;
  while (steps < 90 && stuck < 6) {
    await page.mouse.wheel(0, 500);
    await sleep(230);
    const top = await page.evaluate(() => {
      const w = document.querySelector('.main-inner.lenis');
      return Math.round(w ? w.scrollTop : window.scrollY);
    });
    journey.push({ t: steps, top });
    if (Math.abs(top - lastTop) < 3) stuck++; else stuck = 0;
    lastTop = top;
    if (top > 0 && top % 1000 < 500 && journey.length > 0 && Math.floor(top / 1000) !== Math.floor((lastTop) / 1000)) {
      // near a 1000px boundary — frame + section tops
    }
    if (top > 0 && Math.floor(top / 1000) > Math.floor((journey.length > 1 ? journey[journey.length - 2].top : 0) / 1000)) {
      await shot(page, shotsDir, `08-journey-${String(top).padStart(4, '0')}`);
      sectionTopsLog.push(await sectionTops(page));
    }
    steps++;
  }
  // footer frame
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 800); await sleep(150); }
  await sleep(900);
  await shot(page, shotsDir, '09-footer-rest');
  const flogo = await page.$('.footer-logo');
  if (flogo) { await flogo.hover(); await sleep(500); await shot(page, shotsDir, '10-footer-hover'); }

  /* 5 — reveal motion sampling (scroll back to a fresh section) */
  const revealSel = '.home-intro-content-title .bp-line, .home-intro-content .bp-line';
  // jump near the intro section by wheeling backwards several steps
  for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, -900); await sleep(80); }
  await sleep(600);
  const beforeSeries = await revealSeries(page, revealSel, 300, 40);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 350); await sleep(300); }
  const duringSeries = await revealSeries(page, revealSel, 1800, 40);

  /* 6 — styles + animations */
  // reset to top for style sampling at scroll 0
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, -1200); await sleep(60); }
  await sleep(1200);
  const styles = await measureStyles(page);
  const topsAtZero = await sectionTops(page);
  const anims = await animationsDump(page);

  /* 7 — page transition to pricing (barba) via menu/footer link if present */
  let transitionSeries = null;
  const pricingLink = await page.$('a[href="/pricing"]');
  if (pricingLink) {
    const sampler = page.evaluate(() => new Promise(resolve => {
      const series = [];
      const t0 = performance.now();
      const iv = setInterval(() => {
        const main = document.querySelector('.main');
        const cs = main ? getComputedStyle(main) : null;
        series.push({ t: Math.round(performance.now() - t0), clip: cs ? cs.clipPath : null, mask: main ? main.style.getPropertyValue('--mask-percent') : null });
        if (series.length > 40) { clearInterval(iv); resolve(series); }
      }, 60);
      setTimeout(() => { clearInterval(iv); resolve(series); }, 2600);
    }));
    await pricingLink.click();
    transitionSeries = await sampler;
    await sleep(1200);
    await shot(page, shotsDir, '11-pricing');
  }

  /* cookie/notice bar probe */
  const cookie = await page.evaluate(() => {
    const cands = ['[class*="cookie"]', '[id*="cookie"]', '[class*="consent"]', '[class*="notice"]'];
    for (const c of cands) { const el = document.querySelector(c); if (el && getComputedStyle(el).display !== 'none') return c; }
    return null;
  });

  const result = {
    width, height,
    preloaderSeries: pre,
    journeySeries: journey,
    sectionTopsAtScroll0: topsAtZero,
    sectionTopsDuringJourney: sectionTopsLog,
    revealBefore: beforeSeries,
    revealDuring: duringSeries,
    transitionSeries,
    cookieBarSelector: cookie,
    consoleErrors: consoleErrors.slice(0, 12),
    animations: anims.slice(0, 60),
    styles,
  };
  await context.close();
  return result;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: chromiumExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const all = {};
  for (const w of WIDTHS) {
    const h = w < 768 ? 844 : 900;
    console.log(`\n[replay] width ${w}×${h}`);
    try { all[String(w)] = await runWidth(browser, w, h); }
    catch (e) { all[String(w)] = { fatal: String(e.message).slice(0, 300) }; }
  }
  await browser.close();

  /* :root palette parsed from the corpus stylesheet (cross-origin sheets
     are unreadable from the page, so parse the extracted copy in Node) */
  const rootVars = {};
  const rootBlock = corpusCss.match(/:root\s*{([^}]+)}/);
  if (rootBlock) {
    for (const m of rootBlock[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) rootVars[m[1]] = m[2].trim();
  }

  writeFileSync(join(OUT, 'styles.json'), JSON.stringify({
    rootVars,
    widths: Object.fromEntries(Object.entries(all).map(([w, r]) => [w, r.styles || null])),
  }, null, 2));
  const { styles: _s, ...motionOnly } = all;
  writeFileSync(join(OUT, 'motion.json'), JSON.stringify(motionOnly, null, 2));
  writeFileSync(join(OUT, 'assets-fallback.json'), JSON.stringify({ fallbacks: assetFallbacks }, null, 2));

  const errs = Object.entries(all).flatMap(([w, r]) => (r.consoleErrors || []).map(e => `${w}: ${e}`));
  console.log(`\n[replay] DONE — artifacts in docs/redesign/r358/reference/replay`);
  console.log(`[replay] console errors (${errs.length}):`); errs.slice(0, 10).forEach(e => console.log('  ·', e));
  const fallbackCount = assetFallbacks.length;
  console.log(`[replay] platform-CDN fallbacks: ${fallbackCount}`);
}

main().catch(e => { console.error('[replay] FATAL', e); process.exit(1); });
