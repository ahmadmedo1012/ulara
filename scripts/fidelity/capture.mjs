#!/usr/bin/env node
/**
 * capture.mjs — r368 fidelity-loop capture (ULARA side).
 * Usage: node scripts/fidelity/capture.mjs --route / --viewports 1440x1000,390x844 \
 *   --scrolls 0,1000 --themes light,dark --dir ltr|rtl --out /tmp/cap [--intro] [--reduced] [--url http://localhost:5173]
 * Hermetic: sets sessionStorage['ulara-intro-skip']='1' unless --intro. Output PNG (sheet.py makes WebP sheets).
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const route = arg('route', '/');
const vps = arg('viewports', '1440x1000').split(',').map((v) => v.split('x').map(Number));
const scrolls = arg('scrolls', '0').split(',').map(Number);
const themes = arg('themes', 'light').split(',');
const dir = arg('dir', 'rtl');
const base = arg('url', 'http://localhost:5173');
const out = isAbsolute(arg('out', '/tmp/cap')) ? arg('out', '/tmp/cap') : join(ROOT, arg('out'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [w, h] of vps) for (const theme of themes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: flag('reduced') ? 'reduce' : 'no-preference', colorScheme: theme });
  await ctx.addInitScript((skip) => { if (skip) sessionStorage.setItem('ulara-intro-skip', '1'); }, !flag('intro'));
  const page = await ctx.newPage();
  await page.goto(base + route, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.waitForTimeout(1200);
  for (const y of scrolls) {
    await page.evaluate((yy) => { const s = document.querySelector('.lenis') || document.scrollingElement; s.scrollTop = yy; window.scrollTo(0, yy); }, y);
    await page.waitForTimeout(700);
    const name = `${route.replace(/\W+/g, '_') || 'home'}-${w}x${h}-${theme}-${dir}-y${y}.png`;
    await page.screenshot({ path: join(out, name) });
    console.log(name);
  }
  await ctx.close();
}
await browser.close();
