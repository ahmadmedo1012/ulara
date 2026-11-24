#!/usr/bin/env node
/**
 * build-og.mjs — r359 A2: the 1200×630 Open-Graph image, derived from
 * the grammar (hero elevation + mono sheet captions on paper).
 *
 * Renders via chromium (the shared playwright seat) at exact pixels.
 * Output: frontend/public/og/ulara-og-1200x630.png (+ .webp).
 *
 * Run from the repo root:  node scripts/art/build-og.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const { chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright');
const OUT_DIR = join(ROOT, 'frontend', 'public', 'og');

const hero = readFileSync(join(ROOT, 'shared', 'art', 'svg', 'hero-elevation.svg'), 'utf8');
const plan = readFileSync(join(ROOT, 'shared', 'art', 'svg', 'plan-lecture-hall.svg'), 'utf8');
// The wordmark vessel rides the CANONICAL brand twin (shared/brand/
// mark.svg — generated from frontend/src/brand/mark.ts geometry), never
// a hand-copied path: the logo single-source law (scripts/brand/
// logo-gate.sh). The ink is re-seated to the r359 measured ink via CSS
// (presentation attributes lose to CSS — geometry stays single-source).
const mark = readFileSync(join(ROOT, 'shared', 'brand', 'mark.svg'), 'utf8');

const html = `<!doctype html><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #F3F2EC;
    font-family: ui-monospace, 'Geist Mono', monospace;
    color: #282828;
    position: relative;
  }
  .hero { position: absolute; left: 40px; top: 26px; width: 800px; }
  .hero svg { width: 100%; display: block; }
  .plan { position: absolute; right: 40px; top: 190px; width: 300px; }
  .plan svg { width: 100%; display: block; }
  .wordmark { position: absolute; left: 44px; top: 470px; display: flex; align-items: center; gap: 14px; }
  .u { width: 44px; height: 44px; }
  .u svg { width: 100%; height: 100%; display: block; }
  .u svg g { stroke: #282828; }
  .ar { font-family: sans-serif; font-size: 40px; font-weight: 700; letter-spacing: 0; }
  .en { font-size: 13px; letter-spacing: 3px; color: #62625F; margin-top: 4px; }
  .sig { position: absolute; left: 44px; top: 560px; display: flex; gap: 10px; align-items: center; }
  .sq { width: 12px; height: 12px; background: #2540D9; }
  .cap { font-size: 12px; letter-spacing: 2px; color: #282828; }
  .coord { position: absolute; right: 44px; bottom: 18px; font-size: 11px; color: #62625F; letter-spacing: 1px; }
  .frame { position: absolute; inset: 16px; border: 1px solid #B3B3AF; }
</style>
<div class="frame"></div>
<div class="hero">${hero}</div>
<div class="plan">${plan}</div>
<div class="wordmark">
  <div class="u">${mark}</div>
  <div>
    <div class="ar">أُلارا</div>
    <div class="en">ULARA — UNIVERSITY OS</div>
  </div>
</div>
<div class="sig"><span class="sq"></span><span class="cap">LECTURES · MASTERY · EXAMS · RESEARCH</span></div>
<div class="coord">X:1200PX / Y:630PX · A-101</div>
<script>document.fonts.ready.then(() => setTimeout(() => window.__done = true, 200));</script>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync('/tmp/r359-og.html', html);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file:///tmp/r359-og.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT_DIR, 'ulara-og-1200x630.png') });
await browser.close();

// webp twin (≤ 60KB walk-down)
execFileSync('python3', ['-c', `
from PIL import Image
src, dst = '${join(OUT_DIR, 'ulara-og-1200x630.png')}', '${join(OUT_DIR, 'ulara-og-1200x630.webp')}'
im = Image.open(src).convert('RGB')
q = 90
while q >= 40:
    im.save(dst, 'WEBP', quality=q, method=6)
    import os
    if os.path.getsize(dst) < 60000: break
    q -= 10
print('webp at q', q)
`], { stdio: ['ignore', 'inherit', 'inherit'] });

console.log('build-og: frontend/public/og/ulara-og-1200x630.{png,webp}');
