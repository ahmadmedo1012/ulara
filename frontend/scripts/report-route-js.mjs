#!/usr/bin/env node
/**
 * scripts/report-route-js.mjs — r370 round 3, honest per-route JS weight.
 *
 * The bundle gate prints ONE total (830 KB gz at r370) and that number is
 * useless to a route owner: it sums every lazy chunk in the app. This reads
 * the real build output and answers the two questions a visitor's network
 * actually asks:
 *
 *   boot  — the gz of the modules `dist/index.html` preloads (what a first
 *           paint must download before any route renders);
 *   route — boot + that route's own lazy chunk (what navigating there adds).
 *
 * Sizes are gzip -9 of the emitted files, the same measure the bundle gate
 * uses, so the two reports agree on the total.
 *
 * Usage: node scripts/report-route-js.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');
const ASSETS = join(DIST, 'assets');

const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const bootFiles = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const bootJs = [...new Set(bootFiles.filter((f) => f.endsWith('.js')))];
const bootCss = [...new Set(bootFiles.filter((f) => f.endsWith('.css')))];

const sizes = new Map();
const gzOf = (name) => {
  if (!sizes.has(name)) {
    try {
      sizes.set(name, gz(join(ASSETS, name)));
    } catch {
      sizes.set(name, 0);
    }
  }
  return sizes.get(name);
};

const bootJsGz = bootJs.reduce((s, f) => s + gzOf(f), 0);
const bootCssGz = bootCss.reduce((s, f) => s + gzOf(f), 0);
const bootTotalGz = bootJsGz + bootCssGz;

// Lazy chunks: the emitted JS that index.html does NOT preload.
const allJs = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const lazy = allJs
  .filter((f) => !bootJs.includes(f))
  .map((f) => ({ file: f, name: f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''), gz: gzOf(f) }))
  .sort((a, b) => b.gz - a.gz);

const totalJsGz = allJs.reduce((s, f) => s + gzOf(f), 0);
const allCss = readdirSync(ASSETS).filter((f) => f.endsWith('.css'));
const totalCssGz = allCss.reduce((s, f) => s + gzOf(f), 0);

// A few named routes worth watching (chunk-name prefix → label).
const WATCH = ['LandingPage', 'AuthPages', 'StudentDashboard', 'TeacherPages', 'OwnerPages', 'charts', 'pdf'];

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      {
        boot: { js: bootJsGz, css: bootCssGz, total: bootTotalGz, modules: bootJs },
        totals: { js: totalJsGz, css: totalCssGz, jsPlusCss: totalJsGz + totalCssGz },
        lazy,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log('## route JS weight (gzip -9 of the emitted build)\n');
console.log(`BOOT (what index.html preloads before first paint)`);
console.log(`  JS  ${kb(bootJsGz).padStart(9)}   ${bootJs.length} modules`);
console.log(`  CSS ${kb(bootCssGz).padStart(9)}   ${bootCss.length} sheet(s)`);
console.log(`  ─── ${kb(bootTotalGz).padStart(9)} to render anything\n`);

console.log(`TOTAL  JS ${kb(totalJsGz)} · CSS ${kb(totalCssGz)} · both ${kb(totalJsGz + totalCssGz)} (${allJs.length} chunks)`);
console.log('  (the bundle gate counts JS only; its r370 number is 830.4 KB gz)\n');

console.log('per route (boot + the route chunk):');
for (const w of WATCH) {
  const hit = lazy.filter((c) => c.name.startsWith(w));
  if (!hit.length) continue;
  const g = hit.reduce((s, c) => s + c.gz, 0);
  console.log(`  ${w.padEnd(16)} +${kb(g).padStart(9)}  → ${kb(bootTotalGz + g)}`);
}

console.log('\nheaviest lazy chunks:');
for (const c of lazy.slice(0, 8)) console.log(`  ${kb(c.gz).padStart(9)}  ${c.file}`);
