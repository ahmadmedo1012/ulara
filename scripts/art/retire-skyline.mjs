#!/usr/bin/env node
/**
 * retire-skyline.mjs — r359 A2: replace the last baked-orange art.
 *
 * The r342 footer skyline webps are the only shipped rasters with a
 * baked red/orange accent. They regenerate HERE from the r359
 * grammar (same paths, same 1440×384 + 2x sizes, opaque, light+dark)
 * so the consumer (landing Footer) keeps working untouched — with
 * ink/paper/royal only.
 *
 * Run from the repo root:  node scripts/art/retire-skyline.mjs
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'frontend', 'public', 'media', 'illustrations', 'r359', 'footer');
const { chromium } = createRequire(join(ROOT, 'package.json'))('playwright');

/* ── the skyline scene, drawn with the shared grammar ───────────── */
const ENTRY = join(ROOT, '.tmp-skyline-entry.ts');
const TMP = join(ROOT, '.tmp-skyline.mjs');
writeFileSync(ENTRY, `
import { C, W, circ, g, hatchPoly, line, path, rect, stairs, stipplePoly, tree, label } from './shared/art/grammar';
export function build(w, h) {
  const nodes = [];
  const GY = h * 0.86;
  nodes.push(line(w * 0.02, GY, w * 0.98, GY, { stroke: C.ink, 'stroke-width': W.heavy * 0.7 }));
  // campus blocks: a staggered skyline of volumes
  const blocks: Array<[number, number, number, number, number]> = [
    [0.05, 0.42, 0.10, 0.34, 0.10], [0.16, 0.30, 0.07, 0.28, 0.14], [0.245, 0.52, 0.13, 0.40, 0.08],
    [0.39, 0.22, 0.06, 0.22, 0.18], [0.465, 0.60, 0.16, 0.46, 0.06], [0.635, 0.34, 0.09, 0.30, 0.12],
    [0.74, 0.50, 0.12, 0.38, 0.09], [0.875, 0.26, 0.07, 0.24, 0.16],
  ];
  for (const [bx, bw, by, bh, tone] of blocks) {
    const x = w * bx, ww = w * bw, y = GY - h * bh, hh = h * bh;
    nodes.push(rect(x, y, ww, hh, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall * 0.8 }));
    nodes.push(stipplePoly([[x, y], [x + ww, y], [x + ww, y + hh], [x, y + hh]], tone, Math.round(x + y)));
    // glazing grid on the tall blocks
    if (bh > 0.35) {
      for (let mx = x + ww * 0.18; mx < x + ww * 0.85; mx += ww * 0.22) {
        nodes.push(rect(mx, y + hh * 0.12, 2, hh * 0.5, { fill: C.ink, stroke: 'none' }));
      }
      nodes.push(rect(x + 2, y + hh * 0.66, ww - 4, 4, { fill: C.ink, stroke: 'none' }));
    }
    nodes.push(line(x, y, x + ww, y, { stroke: C.ink, 'stroke-width': W.med }));
  }
  // trees between the blocks
  const spots: Array<[number, number]> = [[0.135, 0.16], [0.37, 0.13], [0.63, 0.15], [0.72, 0.12], [0.86, 0.14]];
  for (const [tx, th] of spots) nodes.push(tree(w * tx, GY, h * th, { seed: Math.round(tx * 100), depth: 5, limbs: 2 }));
  // royal signal: one survey anchor on the tallest block
  nodes.push(rect(w * 0.53, GY - h * 0.46, 8, 8, { fill: C.sig, stroke: 'none' }));
  const ser = (n) => n.t === 'text'
    ? '<text' + Object.entries(n.a ?? {}).map(([k, v]) => ' ' + k + '="' + v + '"').join('') + '>' + (n.s ?? '') + '</text>'
    : '<' + n.t + Object.entries(n.a ?? {}).map(([k, v]) => ' ' + k + '="' + v + '"').join('') + ((n.c ?? []).length ? '>' + n.c.map(ser).join('') + '</' + n.t + '>' : '/>');
  return nodes.map(ser).join('');
}
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'neutral', outfile: TMP, logLevel: 'silent' });
const { build: buildSkyline } = await import(`file://${TMP}`);
rmSync(TMP, { force: true });
rmSync(ENTRY, { force: true });

const THEMES = {
  light: { bg: '#F3F2EC', vars: '--r359-ink:#282828;--r359-ink-2:#62625F;--r359-hair:#B3B3AF;--r359-sig:#2540D9;--r359-paper:#F3F2EC' },
  dark: { bg: '#1C1C1A', vars: '--r359-ink:#F3F2EC;--r359-ink-2:#B3B3AF;--r359-hair:#4A4A48;--r359-sig:#8AA0FF;--r359-paper:#1C1C1A' },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [theme, { bg, vars }] of Object.entries(THEMES)) {
  for (const scale of [1, 2]) {
    const w = 1440 * scale, h = 384 * scale;
    const inner = buildSkyline(w, h);
    const html = `<!doctype html><meta charset="utf-8"><style>*{margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${bg}}svg{display:block}:root{${vars};--font-mono:monospace;--font-sans:sans-serif}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync('/tmp/r359-skyline.html', html);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file:///tmp/r359-skyline.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    const png = `/tmp/r359-skyline-${theme}-${scale}.png`;
    await page.screenshot({ path: png });
    await page.close();
    const suffix = scale === 2 ? '@2x' : '';
    execFileSync('python3', ['-c', `
from PIL import Image
Image.open('${png}').convert('RGB').save('${join(OUT, `footer-skyline-${theme}${suffix}.webp`)}', 'WEBP', quality=88, method=6)
`], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`retired footer-skyline-${theme}${suffix}.webp`);
  }
}
await browser.close();
console.log('retire-skyline: 4 webps regenerated from the r359 grammar (zero orange)');
