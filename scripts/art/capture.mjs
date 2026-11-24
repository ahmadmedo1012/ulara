#!/usr/bin/env node
/**
 * capture.mjs — r359 A2 evidence instrument.
 *
 * Captures any set of art keys from the /__plates gallery at TRUE
 * viewBox width, in light and dark, desktop and mobile, as PNG for
 * the side-by-side fidelity sheets (scripts/art/sheet.mjs).
 *
 * The instrument overrides gallery CSS in the CAPTURE context only
 * (single column, full-width frames, paper ground) — the product
 * page is untouched.
 *
 * Usage:
 *   node scripts/art/capture.mjs --keys hero-elevation,hero-elevation-mobile \
 *        --themes light,dark --out docs/redesign/r359-a2/evidence/captures
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const { chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const KEYS = (arg('keys', '')).split(',').filter(Boolean);
const THEMES = (arg('themes', 'light,dark')).split(',').filter(Boolean);
const URL_BASE = arg('url', 'http://localhost:5173');
const _out = arg('out', 'docs/redesign/r359-a2/evidence/captures');
const OUT = isAbsolute(_out) ? _out : join(ROOT, _out);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
let shot = 0;

for (const theme of THEMES) {
  const page = await browser.newPage({ viewport: { width: 1560, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`${URL_BASE}/__plates`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.click(`[data-ctl="theme-${theme}"]`);
  await page.addStyleTag({ content: `
    .artlib-grid { display: block !important; }
    .artcard { display: block !important; }
    .artframe { max-inline-size: none !important; inline-size: fit-content !important;
                border: 0 !important; padding: 0 !important; background: transparent !important; }
    .artframe > svg { display: block; }
  `});
  await page.waitForTimeout(400);
  for (const key of KEYS) {
    const el = page.locator(`[data-artcard="${key}"] .artframe`);
    await el.waitFor({ state: 'visible', timeout: 30000 });
    // pin the frame to the art's TRUE viewBox width (fit-content lies —
    // a viewBox svg has no intrinsic width and collapses to ~300px)
    await page.evaluate((k) => {
      const svg = document.querySelector(`[data-artcard="${k}"] .artframe svg`);
      const frame = svg?.closest('.artframe');
      if (svg && frame) frame.style.setProperty('inline-size', `${svg.viewBox.baseVal.width}px`, 'important');
    }, key);
    await page.waitForTimeout(120);
    const file = join(OUT, `${key}-${theme}.png`);
    await el.screenshot({ path: file });
    shot++;
    console.log(`captured ${key}-${theme}`);
  }
  await page.close();
}
await browser.close();
console.log(`capture: ${shot} shots → ${OUT}`);
