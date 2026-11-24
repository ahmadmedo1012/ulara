#!/usr/bin/env node
/**
 * export-svg.mjs — r359 A2: standalone optimized SVGs → shared/art/svg/.
 *
 * Every contract key rendered from the same scene builders the web
 * and RN apps use (esbuild-bundled, run in node — no DOM needed),
 * serialized to a self-contained SVG: a <style> block carries the
 * grammar palette for light + prefers-color-scheme dark, so the
 * exports theme themselves anywhere they land. SVGO-optimized.
 *
 * Run from the repo root:  node scripts/art/export-svg.mjs [--key k]
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'shared', 'art', 'svg');

/* ── bundle a dump entry: manifest + every family ───────────────── */
const TMP = join(ROOT, '.tmp-art-dump.mjs');
const ENTRY = join(ROOT, '.tmp-art-entry.ts');
const stubKeys = readFileSync(join(ROOT, 'shared', 'art', 'scenes', 'stubs.ts'), 'utf8');
writeFileSync(ENTRY, `
import { STUBS } from './shared/art/scenes/stubs';
const ALL = { ...STUBS };
for (const m of ['hero', 'plans', 'sections', 'usecases', 'states', 'onboarding']) {
  try {
    const mod = await import(\`./shared/art/scenes/\${m}\`);
    Object.assign(ALL, mod.SCENES);
  } catch { /* family not landed */ }
}
export { ALL };
`);
await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: TMP,
  logLevel: 'silent',
});
const { ALL } = await import(`file://${TMP}`);
rmSync(TMP, { force: true });
rmSync(ENTRY, { force: true });

/* ── serialize ArtDoc → standalone SVG ──────────────────────────── */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function attrs(a) {
  return Object.entries(a ?? {})
    .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
    .join('');
}

function ser(n) {
  if (n.t === 'text') return `<text${attrs(n.a)}>${esc(n.s ?? '')}</text>`;
  const inner = (n.c ?? []).map(ser).join('');
  return `<${n.t}${attrs(n.a)}${inner ? `>${inner}</${n.t}>` : '/>'}`;
}

const STYLE = `<style>:root{--r359-ink:#282828;--r359-ink-2:#62625F;--r359-hair:#B3B3AF;--r359-sig:#2540D9;--r359-paper:#F3F2EC;--font-mono:ui-monospace,monospace;--font-sans:sans-serif}@media (prefers-color-scheme:dark){:root{--r359-ink:#F3F2EC;--r359-ink-2:#B3B3AF;--r359-hair:#4A4A48;--r359-sig:#8AA0FF;--r359-paper:#1C1C1A}}</style>`;

mkdirSync(OUT, { recursive: true });
const only = process.argv.includes('--key') ? process.argv[process.argv.indexOf('--key') + 1] : null;
let n = 0, bytes = 0;
for (const [key, buildFn] of Object.entries(ALL)) {
  if (only && key !== only) continue;
  const doc = buildFn();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.w} ${doc.h}" role="img" aria-label="${esc(doc.title)}">${STYLE}<title>${esc(doc.title)}</title>${doc.nodes.map(ser).join('')}</svg>`;
  const res = optimize(svg, {
    multipass: true,
    plugins: [
      // Keep the root palette in CSS: inline light variables override the dark media rule.
      { name: 'preset-default', params: { overrides: { inlineStyles: false } } },
      'removeDimensions',
      { name: 'removeViewBox', active: false },
    ],
  });
  const file = join(OUT, `${key}.svg`);
  writeFileSync(file, res.data);
  n++;
  bytes += res.data.length;
}
console.log(`export-svg: ${n} SVGs (${(bytes / 1024).toFixed(1)} KB total) → ${OUT}`);
