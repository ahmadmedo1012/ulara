#!/usr/bin/env node
/**
 * a11y-gate.mjs — ULARA Ω §7: the axe-core serious/critical a11y gate.
 *
 * The scorecard row that was "instrument pending": axe a11y
 * serious/critical, limit "0 · contrast ≥ 4.5:1 · touch ≥ 44px". This
 * script is that instrument — it runs the REAL axe-core browser bundle
 * (node_modules/axe-core/axe.min.js, hoisted from @axe-core/react; no
 * new dependency, no rule disabling, no trimmed ruleset) against the
 * actual rendered app and fails on regressions.
 *
 * What counts as a violation here (and only here — this is the
 * acceptance instrument, so its definitions are the contract):
 *   an axe.run violation whose impact is serious or critical, counted
 *   by affected NODES, on a page that actually rendered (React mounted,
 *   route-ready selector visible, reveals fired). Moderate/minor
 *   findings are counted honestly in the report as below-threshold
 *   noise but never gate.
 *
 * Matrix for this cycle (CLI-overridable):
 *   pages      / (landing) · /auth (canonical login) · /404 (the
 *              designed not-found sheet; the `*` catch-all renders the
 *              same NotFoundPage component)
 *   themes     light + dark — forced via the app's own mechanism
 *              (`<html data-theme>` + data-theme-swapping freeze, the
 *              footer-overlap.mjs proven pass; the zustand store only
 *              re-applies on mode change, so a post-mount force sticks)
 *   viewports  mobile 390×844 + desktop 1280×800
 *   direction  RTL only (index.html hard-locks dir="rtl"; the app is
 *              Arabic-first with no LTR locale — routes.ts DIRS agrees)
 *
 * Ratchet honesty (same philosophy as scripts/gates/stylelint-baseline.json):
 *   pre-existing violations must not block the gate forever — the
 *   committed baseline scripts/brand/a11y-baseline.json stores the
 *   current per-cell serious/critical counts; the gate fails ONLY when
 *   a count EXCEEDS its floor. The floor only tightens: edit it DOWN
 *   when violations are burned down (the §4 loop), NEVER up to force
 *   green. Absent cell = floor 0. Current violations of ZERO need no
 *   baseline at all (hard gate).
 *
 * Self-contained in killing-environment sandboxes (footer-overlap.mjs
 * pattern): boots its own Vite dev server on :5182 (process group,
 * killed on exit even on failure), drives real Chromium via the repo's
 * chromiumExecutable() convention. The dev server has no backend, so
 * public surfaces render their real no-API states — the same hermetic
 * environment the e2e/design suites audit.
 *
 * Usage:
 *   node scripts/brand/a11y-gate.mjs                          # full matrix
 *   node scripts/brand/a11y-gate.mjs --pages /,/auth --themes dark
 *   node scripts/brand/a11y-gate.mjs --viewports 390x844
 *   node scripts/brand/a11y-gate.mjs --out /tmp/a11y-gate --port 5182
 *   node scripts/brand/a11y-gate.mjs --write-baseline       # set the floor
 * Exit 0 = zero serious/critical across the matrix (or none above the
 * baseline floor). Exit 1 = a count EXCEEDS the baseline (regression).
 * Exit 2 = infrastructure error (vite/browser/axe injection failure —
 * distinguished from a11y regressions, which are exit 1). Report JSON
 * + per-cell screenshots are written to the --out dir.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

/** The repo's own convention (playwright.config.ts c4-E): sandbox boxes run a
 *  pre-installed Chrome-for-Testing instead of `playwright install`. */
function chromiumExecutable() {
  if (process.env.ULARA_E2E_EXECUTABLE) return process.env.ULARA_E2E_EXECUTABLE;
  const cache = `${process.env.HOME}/.cache/ms-playwright`;
  try {
    const revs = readdirSync(cache)
      .filter((d) => d.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const rev of revs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = `${cache}/${rev}/${sub}`;
        if (existsSync(p)) return p;
      }
    }
  } catch { /* fall through to bundled */ }
  return undefined;
}

// ── CLI ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);
const PAGES = arg('pages', '/,/auth,/404').split(',').map((p) => p.trim()).filter(Boolean);
const THEMES = arg('themes', 'light,dark').split(',').map((t) => t.trim()).filter(Boolean);
const VIEWPORTS = arg('viewports', '390x844,1280x800')
  .split(',').map((v) => {
    const m = /^(\d+)x(\d+)$/.exec(v.trim());
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
  }).filter(Boolean);
const OUT = arg('out', '/tmp/a11y-gate');
const PORT = Number.parseInt(arg('port', '5182'), 10);
const BASE = `http://localhost:${PORT}`;
const BASELINE_PATH = resolve(ROOT, arg('baseline', 'scripts/brand/a11y-baseline.json'));
const WRITE_BASELINE = has('write-baseline');

const AXE_BUNDLE = resolve(ROOT, 'node_modules/axe-core/axe.min.js');
const GATED_IMPACTS = ['serious', 'critical']; // the gate's definition — never widened
/** Route → content-ready selector (the app's own surfaces). Falls back to
 *  the boot-plate-detached React-mounted signal for unlisted routes. */
const ROUTE_READY = {
  '/': 'footer.fo-footer',   // landing colophon footer (footer-overlap's proven wait)
  '/auth': '.auth-shell',    // the login sheet root (App.tsx GuestRoute)
  '/404': '.nf-shell',       // NotFoundPage sheet root (also the `*` catch-all)
};

mkdirSync(OUT, { recursive: true });

// ── infra guard: the real axe bundle must be present ───────────────────
let axeVersion = 'unknown';
if (!existsSync(AXE_BUNDLE)) {
  console.error(`INFRA — axe-core bundle not found: ${AXE_BUNDLE} (hoisted from @axe-core/react; the gate adds no dependency)`);
  process.exit(2);
}
try { axeVersion = JSON.parse(readFileSync(resolve(ROOT, 'node_modules/axe-core/package.json'), 'utf8')).version; } catch { /* keep 'unknown' */ }

// ── baseline (ratchet floor) ────────────────────────────────────────────
function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (e) {
    console.error(`INFRA — baseline unparseable (${BASELINE_PATH}): ${e.message}`);
    process.exit(2);
  }
}
let baseline = readBaseline();
const floorOf = (b, key) => b?.cells?.[key] ?? { serious: 0, critical: 0 };
const cellKey = (route, vp, theme, dir) => `${route}|${vp.width}x${vp.height}|${theme}|${dir}`;

// ── Vite dev server lifecycle (self-boot, process-group kill) ─────────
let vite = null;
function killVite() {
  if (vite?.pid) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* already gone */ } }
}
async function bootVite() {
  if (existsSync(resolve(ROOT, 'node_modules/vite/bin/vite.js'))) {
    // worktree/hoisted layout: cwd frontend, run the root copy directly
    vite = spawn('node', ['../node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
      cwd: resolve(ROOT, 'frontend'),
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: resolve(ROOT, 'frontend'),
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
  }
  process.on('exit', () => killVite()); // die-hard discipline: kill even on thrown exits
  vite.stdout.on('data', () => {}); // drain
  vite.stderr.on('data', () => {}); // drain
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error(`vite dev server did not become ready on :${PORT} within 90s`);
}

// ── Matrix run ─────────────────────────────────────────────────────────
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  axe: { version: axeVersion, bundle: 'node_modules/axe-core/axe.min.js', ruleset: 'axe default (no rules disabled, no runOnly filter)' },
  matrix: { pages: PAGES, themes: THEMES, viewports: VIEWPORTS, dir: 'rtl (app default — hard-locked in index.html)' },
  baseline: { path: 'scripts/brand/a11y-baseline.json', present: Boolean(baseline), floorTotals: null },
  cells: [],
  totals: { serious: 0, critical: 0, belowThreshold: {} },
  regressions: [],
  exit: null,
};
const slug = (route) => route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

let browser;
let infraError = null;
try {
  await bootVite();
  browser = await chromium.launch({ executablePath: chromiumExecutable() });
  for (const route of PAGES) {
    for (const theme of THEMES) {
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: 'reduce', // the app ships content visible under reduced motion (reveals bail)
          bypassCSP: true, // only so the injected axe bundle itself runs; the DOM audit is unaffected
        });
        const page = await ctx.newPage();
        const cell = {
          url: route, viewport: vp, theme, direction: null,
          counts: { serious: 0, critical: 0 }, rules: [], belowThreshold: {}, error: null,
        };
        try {
          await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          // React's first commit replaces the static boot plate — the mount signal
          await page.waitForSelector('.ula-boot-plate', { state: 'detached', timeout: 45_000 });
          const ready = ROUTE_READY[route];
          if (ready) await page.locator(ready).first().waitFor({ state: 'visible', timeout: 45_000 });
          cell.direction = await page.evaluate(() =>
            document.documentElement.dir || getComputedStyle(document.documentElement).direction);

          // force the theme via the app's own mechanism (post-mount, the store
          // only re-applies on mode change — footer-overlap's proven pass)
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.setAttribute('data-theme-swapping', ''); // freeze transitions
          }, theme);
          // scroll through the page to trigger every reveal-on-scroll observer
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            return new Promise((r) => setTimeout(r, 350));
          });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(700); // settle (fonts, late reveal)

          // inject the REAL axe-core bundle — never a trimmed/filtered ruleset
          await page.addScriptTag({ path: AXE_BUNDLE });
          const results = await page.evaluate(() => Promise.race([
            axe.run(document, { resultTypes: ['violations'] }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('axe.run exceeded 120s')), 120_000)),
          ]));
          for (const v of results.violations ?? []) {
            if (GATED_IMPACTS.includes(v.impact)) {
              cell.counts[v.impact] += v.nodes.length;
              cell.rules.push({
                id: v.id, impact: v.impact, help: v.help,
                nodes: v.nodes.length,
                selectors: v.nodes.slice(0, 5).map((n) => (Array.isArray(n.target) ? n.target.join(' ') : String(n.target))),
              });
            } else {
              const bucket = v.impact ?? 'other';
              cell.belowThreshold[bucket] = (cell.belowThreshold[bucket] ?? 0) + v.nodes.length;
            }
          }
          await page.screenshot({ path: `${OUT}/${slug(route)}-${vp.width}x${vp.height}-${theme}.png` }).catch(() => {});
        } catch (err) {
          cell.error = String(err?.message ?? err).slice(0, 300);
        }

        report.totals.serious += cell.counts.serious;
        report.totals.critical += cell.counts.critical;
        for (const [bucket, n] of Object.entries(cell.belowThreshold)) {
          report.totals.belowThreshold[bucket] = (report.totals.belowThreshold[bucket] ?? 0) + n;
        }
        report.cells.push(cell);
        const total = cell.counts.serious + cell.counts.critical;
        const mark = cell.error ? 'ERR ' : total === 0 ? 'OK  ' : `${String(total).padStart(3)}x `;
        const below = Object.entries(cell.belowThreshold).map(([k, n]) => `${k}=${n}`).join(',');
        console.log(`${mark} ${route.padEnd(7)} ${vp.width}x${vp.height}  ${theme.padEnd(5)} ${cell.direction ?? '—'}  S=${cell.counts.serious} C=${cell.counts.critical}${below ? `  (below: ${below})` : ''}`);
        for (const r of cell.rules) {
          console.log(`      ${r.impact.padEnd(8)} ${r.id} ×${r.nodes}  ${r.selectors.slice(0, 3).join(' | ')}`);
        }
        if (cell.error) console.log(`      RUN-ERROR: ${cell.error}`);
        await ctx.close();
      }
    }
  }
} catch (err) {
  infraError = String(err?.message ?? err).slice(0, 300);
} finally {
  await browser?.close().catch(() => {});
  killVite();
}

const reportPath = `${OUT}/a11y-gate.json`;
const cellErrors = report.cells.filter((c) => c.error).length;
if (infraError || cellErrors > 0) {
  report.exit = { code: 2, reason: infraError ?? `${cellErrors} cell(s) failed to render/audit` };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nINFRA — ${infraError ?? `${cellErrors} cell(s) errored (see report cells[].error)`} · report: ${reportPath}`);
  process.exit(2);
}

// ── --write-baseline: set the floor to EXACTLY the current counts ───────
if (WRITE_BASELINE) {
  const cells = {};
  for (const cell of report.cells) {
    cells[cellKey(cell.url, cell.viewport, cell.theme, cell.direction ?? 'rtl')] = {
      serious: cell.counts.serious, critical: cell.counts.critical,
    };
  }
  const floorTotals = { serious: report.totals.serious, critical: report.totals.critical };
  writeFileSync(BASELINE_PATH, JSON.stringify({
    _comment: 'a11y ratchet floor (ULARA Ω §7 axe gate) — per-cell serious/critical node counts keyed route|viewport|theme|dir. The floor only tightens (same philosophy as scripts/gates/stylelint-baseline.json): edit DOWN as violations are burned down (§4 loop), NEVER up to force green. A missing cell key means floor 0. Regenerate deliberately with: node scripts/brand/a11y-gate.mjs --write-baseline',
    generatedAt: new Date().toISOString(),
    axe: axeVersion,
    cells,
  }, null, 2));
  baseline = { cells };
  report.baseline.present = true;
  report.baseline.floorTotals = floorTotals;
  console.log(`baseline written: ${BASELINE_PATH} (S${floorTotals.serious}/C${floorTotals.critical} — the floor is now these counts)`);
}

// ── ratchet verdict ─────────────────────────────────────────────────────
const floorTotals = { serious: 0, critical: 0 };
let belowFloorCells = 0;
for (const cell of report.cells) {
  const key = cellKey(cell.url, cell.viewport, cell.theme, cell.direction ?? 'rtl');
  const floor = floorOf(baseline, key);
  floorTotals.serious += floor.serious ?? 0;
  floorTotals.critical += floor.critical ?? 0;
  for (const impact of GATED_IMPACTS) {
    if (cell.counts[impact] > (floor[impact] ?? 0)) {
      report.regressions.push({ cell: key, impact, baseline: floor[impact] ?? 0, current: cell.counts[impact] });
    }
  }
  if (cell.counts.serious < (floor.serious ?? 0) || cell.counts.critical < (floor.critical ?? 0)) belowFloorCells++;
}
report.baseline.floorTotals = floorTotals;

if (report.regressions.length > 0) {
  report.exit = { code: 1, reason: `${report.regressions.length} count(s) above the ratchet floor` };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\nregressions above the ratchet floor:');
  for (const r of report.regressions) {
    console.log(`      ${r.cell}  ${r.impact}: floor ${r.baseline} → current ${r.current}`);
  }
  console.log(`\nFAIL — ${report.regressions.length} regression(s) above ${baseline ? 'the committed floor' : 'the hard floor 0'} · report: ${reportPath}`);
  process.exit(1);
}

report.exit = { code: 0, reason: 'no count above the ratchet floor' };
writeFileSync(reportPath, JSON.stringify(report, null, 2));
if (belowFloorCells > 0 && !WRITE_BASELINE) {
  console.log(`ratchet: ${belowFloorCells} cell(s) BELOW the floor — tighten scripts/brand/a11y-baseline.json (the floor only tightens)`);
}

const total = report.totals.serious + report.totals.critical;
console.log(`\nPASS — ${total} serious/critical across ${report.cells.length} cells${baseline ? `, 0 above the ratchet floor (floor: S${floorTotals.serious}/C${floorTotals.critical})` : ' (hard floor 0 — no baseline needed)'} · report: ${reportPath}`);
process.exit(0);
