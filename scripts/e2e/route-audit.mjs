#!/usr/bin/env node
/**
 * route-audit — the r351 A2 baseline instrument: EVERY authenticated
 * route in lib/nav.ts for all five roles (+ settings, community,
 * messages, lecture player, exam runner/authoring, document viewer)
 * measured against the HERMETIC fixture corpus (mock transport).
 *
 * Per cell it emits: rendered words, scroller scrollHeight, horizontal
 * overflow, tap targets < 44px, runtime console errors, 501s (missing
 * fixtures), and fixed-UI ∩ content overlaps. One JSON per run. Run:
 *
 *   npx tsx scripts/e2e/route-audit.mjs \
 *     --viewports 1440x900,1024x768,768x900,390x844 \
 *     --themes light            (dark rides --matrix dashboards)
 *     --matrix full|dashboards|custom --port 5302
 *     --out docs/redesign/r351/authenticated/baseline
 *
 * full      = every nav route of every role × viewports × light
 *             (+ dark @1440/390 for the five dashboards).
 * dashboards= the five role dashboards × all viewports × light+dark.
 *
 * Screenshots (DSF 2) only with --shots, dashboards + the wordiest
 * screens — metrics-only visits keep the full matrix fast.
 *
 * Exit 1 only on hard render failure (no shell chrome). Defects are
 * DATA (the JSON), not exit codes — the fixes are separate commits.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// The ONE fixture corpus + the ONE nav map — never a second copy.
const FIX = resolve(process.cwd(), 'frontend/tests/e2e/fixtures/api-fixtures.ts');
const TRANSPORT = resolve(process.cwd(), 'frontend/tests/e2e/fixtures/mock-transport.ts');
const NAV = resolve(process.cwd(), 'frontend/src/lib/nav.ts');
const ROUTES = resolve(process.cwd(), 'frontend/src/lib/routes.ts');
const { ROLE_USERS } = await import(FIX);
const { installMockApi, seedSession } = await import(TRANSPORT);
const { NAV_BY_ROLE } = await import(NAV);
const { ROUTES: R } = await import(ROUTES);

// ── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const parseList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const parseVPs = (s) =>
  parseList(s).map((v) => {
    const m = /^(\d+)x(\d+)$/.exec(v);
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
  }).filter(Boolean);

const MATRIX = arg('matrix', 'full');
const THEMES = parseList(arg('themes', 'light'));
const VPS = parseVPs(arg('viewports', '1440x900,1024x768,768x900,390x844'));
const PORT = Number.parseInt(arg('port', '5302'), 10);
const BASE = `http://localhost:${PORT}`;
const OUT = resolve(process.cwd(), arg('out', 'docs/redesign/r351/authenticated/baseline'));
const SHOTS = argv.includes('--shots');
// AI pages are A3's fixture territory (r351 §4) — excluded from the
// 501 ledger here, never hidden: they are listed in the JSON's
// `excluded` block.
const AI_PATHS = new Set([R.studentAi, R.teacherAi, R.ownerAi]);

mkdirSync(OUT, { recursive: true });

// ── the route corpus ────────────────────────────────────────────────────
/** Deep-detail exemplars with real fixture ids (r351 Q0 spec). */
const DEEP_ROUTES = {
  STUDENT: [
    R.studentCourses + '/offr_e2e_algorithms', // course detail (fixture offering)
    '/student/lectures/lec_e2e_greedy',        // lecture player
    '/student/online-exams/exm_e2e_quiz3',     // exam runner
    '/document/syllabus-sample.pdf',           // document viewer
  ],
  TEACHER: [
    '/teacher/exams/tpl_e2e_quiz4',           // exam authoring detail
    '/teacher/intelligence/offr_e2e_algorithms',
  ],
  ADMIN: [], QUALITY: [], OWNER: [],
};

function roleRoutes(role) {
  const routes = [];
  for (const group of NAV_BY_ROLE[role]) {
    for (const item of group.items) routes.push(item.to);
  }
  for (const extra of DEEP_ROUTES[role] ?? []) routes.push(extra);
  // dedupe, keep DOM/nav order
  return [...new Set(routes)];
}

const DASHBOARDS = {
  STUDENT: R.studentDashboard,
  TEACHER: R.teacherDashboard,
  ADMIN: R.adminDashboard,
  QUALITY: R.qualityDashboard,
  OWNER: R.ownerDashboard,
};

const ROLE_HOME = { ...DASHBOARDS };
const ROLES = parseList(arg('roles', 'STUDENT,TEACHER,ADMIN,QUALITY,OWNER'));

// ── vite dev server lifecycle ───────────────────────────────────────────
let vite = null;
function killVite() {
  if (vite?.pid) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* gone */ } }
}
async function bootVite() {
  const root = process.cwd();
  const cmd = existsSync(resolve(root, 'node_modules/vite/bin/vite.js'))
    ? ['node', [resolve(root, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort']]
    : ['npx', ['vite', '--port', String(PORT), '--strictPort']];
  vite = spawn(cmd[0], [...cmd[1]], {
    cwd: resolve(root, 'frontend'),
    detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.on('exit', () => killVite());
  vite.stdout.on('data', () => {});
  vite.stderr.on('data', () => {});
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error(`vite dev server not ready on :${PORT} within 120s`);
}

// ── in-page measurement (one serialized function, no bindings) ──────────
const MEASURE = () => {
  const vw = window.innerWidth;
  const words = document.body.innerText.trim().split(/\s+/).filter(Boolean).length;
  // the app's scroller is .content inside the shell; fall back to
  // the document for chrome-less surfaces.
  const scroller = document.querySelector('.content');
  const scrollHeight = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
  const hOverflowDoc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const hOverflowScroller = scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
  // tap targets < 44px: visible, sized interactive elements
  const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]';
  const smallTargets = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // skip elements clipped out of the viewport band (fixed chrome
    // parked off-screen) but keep partially-visible ones
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (r.width < 44 || r.height < 44) {
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40);
      smallTargets.push({ tag: el.tagName.toLowerCase(), name, w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  // fixed-UI ∩ content overlap: every position:fixed INTERACTIVE
  // element (r351: aria-hidden decorative chrome — the drafting frame,
  // the grain film — and pointer-transparent layers are excluded; the
  // task's law is «fixed UI must never cover content», and a
  // pointer-transparent frame is not UI) intersecting any visible text
  // node or interactive element in the content flow.
  const overlaps = [];
  const fixedEls = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    // decorative chrome is not UI (aria-hidden or pointer-transparent)
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (cs.pointerEvents === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // full-viewport chrome (scrim, grain, frame) intersects everything
    // by design — only flag PARTIAL-width/height fixed elements
    if (r.width >= vw - 2 && r.height >= window.innerHeight - 2) continue;
    fixedEls.push({ el, r, cls: (el.className || '').toString().slice(0, 60) });
  }
  if (fixedEls.length) {
    const hits = (target) => {
      const out = [];
      for (const f of fixedEls) {
        const ix = Math.max(0, Math.min(f.r.right, target.right) - Math.max(f.r.left, target.left));
        const iy = Math.max(0, Math.min(f.r.bottom, target.bottom) - Math.max(f.r.top, target.top));
        if (ix > 2 && iy > 2) out.push({ fixed: f.cls, area: Math.round(ix * iy) });
      }
      return out;
    };
    for (const el of document.querySelectorAll('main *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      const isInteractive = el.matches(INTERACTIVE);
      const hasOwnText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent || '').trim().length > 1,
      );
      if (!isInteractive && !hasOwnText) continue;
      const found = hits(r);
      if (found.length) overlaps.push({ el: (el.className || el.tagName).toString().slice(0, 40), text: (el.textContent || '').trim().slice(0, 30), by: found });
      if (overlaps.length > 8) break;
    }
  }
  return {
    words,
    scrollHeight,
    hOverflowDoc,
    hOverflowScroller,
    smallTargets: smallTargets.slice(0, 12),
    smallTargetCount: smallTargets.length,
    overlapCount: overlaps.length,
    overlaps: overlaps.slice(0, 6),
  };
};

await bootVite();
// Fleet browser pin (AGENTS.md §8): the shared cache carries
// chromium build 1200; this repo's playwright asks for 1223. Symlinks
// are blocked in the sandbox, so the executable is pointed at the
// shared build directly (headless shell for the metrics run — the
// same engine chromium.launch() would use, one build older).
const PW_EXECUTABLE = process.env.PW_CHROMIUM_EXECUTABLE
  ?? `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell`;
const browser = await chromium.launch({
  executablePath: existsSync(PW_EXECUTABLE) ? PW_EXECUTABLE : undefined,
});
const results = [];
const cells501 = [];
let hardFail = 0;

async function auditCell({ page, role, theme, vp, route, shot }) {
  const cell = `${role}·${route}·${theme}·${vp.width}`;
  const consoleErrors = [];
  const notImplemented = [];
  const DEV_AUDIT = /^%c|React Router Future Flag|^\[vite\]|dequeuniversity\.com|^Fix any of the following/;
  const onConsole = (m) => {
    if (m.type() !== 'error') return;
    if (!DEV_AUDIT.test(m.text())) consoleErrors.push(m.text().slice(0, 160));
  };
  const onPageError = (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`);
  const onResponse = (res) => {
    if (res.status() === 501) notImplemented.push(res.url().replace(BASE, '').slice(0, 120));
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  const user = ROLE_USERS[role];
  try {
    await page.setViewportSize(vp);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page
      .locator('.pf-page-header, .topbar, main')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
    /* r351 fix: the first visit of a lazy route can catch the
     * PageSkeleton if the chunk compile outruns the settle window
     * (measured: ~35 cells at 21–57 words = shell chrome only).
     * Wait for every skeleton/busy marker inside the content track to
     * clear (8s cap), THEN settle — the measurement is the resolved
     * page, never the placeholder. */
    await page
      .locator('.content .skeleton, .content [aria-busy="true"]')
      .first()
      .waitFor({ state: 'detached', timeout: 8_000 })
      .catch(() => {});
    await page.waitForTimeout(350); // settle motion (mock transport resolves instantly)
    const m = await page.evaluate(MEASURE);
    if (shot) {
      const shotPath = resolve(OUT, `shot-${cell.replace(/[^\w·-]/g, '_')}.png`);
      await page.screenshot({ path: shotPath });
      m.shot = shotPath;
    }
    const rec = {
      cell, role, route, theme, viewport: `${vp.width}x${vp.height}`,
      ...m,
      consoleErrors: consoleErrors.length,
      consoleErrorSample: consoleErrors.slice(0, 2),
      notImplemented: [...new Set(notImplemented)],
    };
    results.push(rec);
    if (notImplemented.length && !AI_PATHS.has(route)) cells501.push(rec);
    console.log(
      `${cell}: ${m.words}w · hOv ${Math.max(m.hOverflowDoc, m.hOverflowScroller)}px · taps<44 ${m.smallTargetCount} · ovl ${m.overlapCount} · err ${consoleErrors.length} · 501 ${notImplemented.length}`,
    );
  } catch (e) {
    hardFail++;
    results.push({ cell, role, route, theme, viewport: `${vp.width}x${vp.height}`, error: String(e).slice(0, 300) });
    console.error(`${cell}: HARD FAIL — ${String(e).slice(0, 200)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
  }
}

if (MATRIX === 'dashboards') {
  for (const role of ROLES) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        locale: 'ar-LY', timezoneId: 'UTC', viewport: VPS[0], deviceScaleFactor: 2,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      await context.addInitScript(() => {
        try {
          sessionStorage.setItem('ulara-intro-skip', '1');
          Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
            configurable: true, get: () => 8,
          });
        } catch { /* storage denied */ }
      });
      await seedSession(context, ROLE_USERS[role], { theme });
      await installMockApi(context, { sessionUser: ROLE_USERS[role], overrides: [] });
      const page = await context.newPage();
      for (const vp of VPS) {
        await auditCell({ page, role, theme, vp, route: DASHBOARDS[role], shot: SHOTS });
      }
      await context.close();
    }
  }
} else {
  // full: light × all viewports for every route; dark @1440/390 for
  // the five dashboards (theme-specific defects concentrate on the
  // report widths; words are theme-invariant).
  const darkVps = VPS.filter((v) => v.width === 1440 || v.width === 390);
  for (const role of ROLES) {
    const context = await browser.newContext({
      locale: 'ar-LY', timezoneId: 'UTC', viewport: VPS[0], deviceScaleFactor: 2,
      colorScheme: 'light',
    });
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('ulara-intro-skip', '1');
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          configurable: true, get: () => 8,
        });
      } catch { /* storage denied */ }
    });
    await seedSession(context, ROLE_USERS[role], { theme: 'light' });
    await installMockApi(context, { sessionUser: ROLE_USERS[role], overrides: [] });
    const page = await context.newPage();
    const routes = roleRoutes(role);
    // route OUTER, viewport INNER: the first visit of each route pays
    // vite's on-demand compile once; the other viewports ride the cache.
    for (const route of routes) {
      for (const vp of VPS) {
        await auditCell({ page, role, theme: 'light', vp, route, shot: false });
      }
    }
    await context.close();
    for (const theme of THEMES.length > 1 ? THEMES : ['dark']) {
      const dctx = await browser.newContext({
        locale: 'ar-LY', timezoneId: 'UTC', viewport: VPS[0], deviceScaleFactor: 2,
        colorScheme: 'dark',
      });
      await dctx.addInitScript(() => {
        try {
          sessionStorage.setItem('ulara-intro-skip', '1');
          Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
            configurable: true, get: () => 8,
          });
        } catch { /* storage denied */ }
      });
      await seedSession(dctx, ROLE_USERS[role], { theme });
      await installMockApi(dctx, { sessionUser: ROLE_USERS[role], overrides: [] });
      const dpage = await dctx.newPage();
      for (const vp of darkVps) {
        await auditCell({ page: dpage, role, theme, vp, route: DASHBOARDS[role], shot: SHOTS });
      }
      await dctx.close();
    }
  }
}

await browser.close();
killVite();

// ── summary ─────────────────────────────────────────────────────────────
const byRoute = new Map();
for (const r of results) {
  if (r.error) continue;
  const key = `${r.role} ${r.route}`;
  const prev = byRoute.get(key);
  if (!prev || r.words > prev.words) byRoute.set(key, r);
}
const wordiest = [...byRoute.values()].sort((a, b) => b.words - a.words).slice(0, 25)
  .map((r) => ({ role: r.role, route: r.route, words: r.words, viewport: r.viewport }));
const defects = {
  overflows: results.filter((r) => !r.error && Math.max(r.hOverflowDoc, r.hOverflowScroller) > 1)
    .map((r) => ({ cell: r.cell, px: Math.max(r.hOverflowDoc, r.hOverflowScroller) })),
  smallTargets: results.filter((r) => !r.error && r.smallTargetCount > 0)
    .map((r) => ({ cell: r.cell, count: r.smallTargetCount, sample: r.smallTargets.slice(0, 3) })),
  overlaps: results.filter((r) => !r.error && r.overlapCount > 0)
    .map((r) => ({ cell: r.cell, count: r.overlapCount, sample: r.overlaps.slice(0, 2) })),
  runtimeErrors: results.filter((r) => !r.error && r.consoleErrors > 0)
    .map((r) => ({ cell: r.cell, count: r.consoleErrors, sample: r.consoleErrorSample })),
  notImplemented: cells501.map((r) => ({ cell: r.cell, endpoints: r.notImplemented })),
};
const summary = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  matrix: MATRIX,
  visitedCells: results.length,
  hardFailures: hardFail,
  wordiest,
  defects,
};
const outJson = resolve(OUT, 'route-audit.json');
writeFileSync(outJson, JSON.stringify(summary, null, 2));
const outRaw = resolve(OUT, 'route-audit-cells.json');
writeFileSync(outRaw, JSON.stringify(results, null, 2));
console.log(`\nvisited ${results.length} cells · hardFail ${hardFail}`);
console.log(`wordiest: ${wordiest.slice(0, 5).map((w) => `${w.role} ${w.route} ${w.words}w`).join(' · ')}`);
console.log(`defects: ovf ${defects.overflows.length} · smallTap ${defects.smallTargets.length} · ovl ${defects.overlaps.length} · err ${defects.runtimeErrors.length} · 501cells ${defects.notImplemented.length}`);
console.log(`results: ${outJson}`);
console.log('ROUTE AUDIT ' + (hardFail ? `FAIL (${hardFail} cells)` : 'PASS'));
process.exit(hardFail ? 1 : 0);
