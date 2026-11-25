#!/usr/bin/env tsx
/**
 * scripts/audit/r358/capture.ts — R358 Phase A instrument 2/3: the ULARA
 * full-product visual scan.
 *
 * Evolves scripts/audit/r355/capture.mjs on four axes (the r358 mission):
 *  1. ROUTES ARE DERIVED, never guessed — imported from
 *     frontend/src/lib/routes.ts (the r341/Y2 single source), expanded with concrete
 *     fixture records for parameterized routes, role-mapped by shell prefix, then CROSS-CHECKED
 *     against every `path=` mounted in frontend/src/App.tsx; the
 *     derivation diff (mounted-but-uncaptured / captured-but-unmounted)
 *     is written to route-derivation.json and the scan FAILS if any
 *     mounted route is missed.
 *  2. HERMETIC TRANSPORT = the REAL e2e fixture corpus
 *     (tests/e2e/fixtures/mock-transport.ts + api-fixtures.ts — the same
 *     installMockApi/seedSession substrate the journey suites ride), so
 *     pages render REAL fixture data, not empty envelopes. The transport's
 *     loud 501 (missing fixture) is elevated to a MISSING_FIXTURE P1
 *     defect — the zero-501 assertion.
 *  3. ALL r355 detectors kept: horizontal overflow, <44px taps (integer
 *     floor), clipped text (sr-only idioms excluded), blank/error pages,
 *     axe serious/critical, console errors, raster assets, old-accent art.
 *  4. NEW r358 visual-gap metrics per route: type-scale samples (display/
 *     section/body), KPI layout mode (grid vs stacked — the quality
 *     dashboard defect), and for the landing: page height, section
 *     rhythm (tops/heights/gaps of the home-* wraps), hero plate ratio
 *     (illustration box vs viewport), and computed-color sweep for the
 *     retired accent hexes.
 *
 * Output: docs/redesign/r358/evidence/
 *   defects-master.json · defects-summary.md · visual-metrics.json ·
 *   route-derivation.json · captures/<role>/<name>-<w>-<theme>.webp
 *
 * Usage (repo root): npx tsx scripts/audit/r358/capture.ts
 *   [--widths 360,390,768,1024,1440] [--themes light,dark] [--role STUDENT]
 *   [--limit N] [--routes /,/auth] [--port 5198]
 * Requires frontend/dist (run a vite build first — verify.sh --fast does it).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTES } from '../../../frontend/src/lib/routes';
import { installMockApi, seedSession } from '../../../frontend/tests/e2e/fixtures/mock-transport';
import {
  STUDENT_USER, TEACHER_USER, ADMIN_USER, QUALITY_USER, OWNER_USER,
} from '../../../frontend/tests/e2e/fixtures/api-fixtures';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(join(ROOT, 'frontend', 'package.json'));
const { chromium } = require('playwright') as typeof import('playwright');

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(arg('port', '5198'));
const DIST = resolve(ROOT, arg('dist', 'frontend/dist'));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EVIDENCE = resolve(ROOT, arg('output', 'docs/redesign/r358/evidence'));
const CAPTURES = resolve(EVIDENCE, 'captures');
const AXE_BUNDLE = resolve(ROOT, 'node_modules/axe-core/axe.min.js');
const WIDTHS = arg('widths', '360,390,768,1024,1440').split(',').map(Number);
const THEMES = arg('themes', 'light,dark').split(',');
const FILTER_ROLE = arg('role', null);
const LIMIT = Number.parseInt(arg('limit', '0'), 10);
const ROUTES_FILTER = arg('routes', null);

/* ── 1. route derivation (never guessed) ─────────────────────────── */
type ScanRoute = { path: string; basePath: string; role: string; name: string };

function roleFor(path: string): string {
  if (path.startsWith('/student')) return 'STUDENT';
  if (path.startsWith('/teacher')) return 'TEACHER';
  if (path.startsWith('/admin')) return 'ADMIN';
  if (path.startsWith('/quality')) return 'QUALITY';
  if (path.startsWith('/owner')) return 'OWNER';
  if (path.startsWith('/institution')) return 'ADMIN';
  if (['training', 'achievements', 'community', 'competitions', 'vision', 'document'].some(p => path === `/${p}` || path.startsWith(`/${p}/`))) return 'STUDENT';
  if (path === '/settings') return 'STUDENT'; // any-authed shared doors (App.tsx r320 P2-1)
  if (path === '/admin/analysis') return 'ADMIN';
  return 'PUBLIC';
}

// Concrete detail records served by the same hermetic API as the journeys.
const DETAIL_PATHS: Record<string, string> = {
  '/student/courses/:offeringId': '/student/courses/offr_e2e_algorithms',
  '/student/lectures/:lectureId': '/student/lectures/lec_e2e_greedy',
  '/training/:slug': '/training/study-plan',
  '/training/:slug/lesson/:lessonId': '/training/study-plan/lesson/lesson_1',
  '/student/online-exams/:id': '/student/online-exams/exm_e2e_quiz3',
  '/teacher/exams/:templateId': '/teacher/exams/tpl_e2e_quiz4',
  '/teacher/intelligence/:offeringId': '/teacher/intelligence/offr_e2e_algorithms',
  '/admin/permissions/:id': '/admin/permissions/usr_e2e_teacher',
  '/owner/institutions/:slug': '/owner/institutions/ulara-demo',
  '/institution/people/:id': '/institution/people/person_1',
  '/institution/appointments/:id': '/institution/appointments/appt_1',
  '/institution/councils/:id': '/institution/councils/council_1',
  '/institution/councils/:id/meetings/:meetingId': '/institution/councils/council_1/meetings/meeting_1',
  '/institution/programs/:id': '/institution/programs/prog_1',
  '/institution/facilities/:id': '/institution/facilities/fac_1',
  '/institution/research/:id': '/institution/research/res_proj_1',
  '/colleges/:id': '/colleges/clg_e2e_eng',
  '/vision/:slug': '/vision/ai-predictor',
  '/document/:filename': '/document/paper.pdf',
  '/competitions/:id': '/competitions/cmp_e2e_1',
};

function deriveRoutes(): { routes: ScanRoute[]; mounted: string[]; diffs: Record<string, string[]> } {
  // constants from the single source
  const fromRoutes = Object.values(ROUTES).filter(p => !p.includes(':')) as string[];
  // public pages that live outside ROUTES (verified against App.tsx below)
  const literalExtras = ['/admin/analysis']; // literal-mounted, not in ROUTES
  const publicExtras = ['/about', '/help', '/app', '/legal/privacy', '/legal/terms',
    '/legal/cookies', '/legal/accessibility', '/legal/security', '/legal/data',
    '/contact', '/campus', '/colleges/leaderboard',
    '/404', '/403', '/500', '/maintenance',
    '/auth/forgot-password', '/auth/reset-password'];
  /* r360 F3 — the reset sheet is a TOKENED route by contract (a bare
   * visit is the page's own honest terminal state — the dead-link
   * register — and would read as a P0 error banner). The scan visits
   * the form state: a fixture token satisfies the page's structural
   * ?token=<43 chars> contract without touching the API (the page
   * only calls the backend on submit). The name/mounted checks below
   * use the path SANS query. */
  const QUERY_OVERRIDES: Record<string, string> = {
    '/auth/reset-password': '/auth/reset-password?token=e2e_fixture_reset_token_0123456789abcdef0123456',
  };
  const candidates = [...new Set([...fromRoutes, ...publicExtras, ...literalExtras, ...Object.keys(DETAIL_PATHS)])].filter(p => p !== '/login' && p !== '/register' && p !== '/universities' && p !== '/features');

  // every path literally mounted in App.tsx (path="…" or path={ROUTES.x})
  const appSrc = readFileSync(resolve(ROOT, 'frontend/src/App.tsx'), 'utf8');
  const mounted = new Set<string>();
  const redirects = new Set<string>();
  // redirect stubs: <Route path=… element={<Navigate …/>}> — they render another route
  for (const m of appSrc.matchAll(/<Route path="([^"]+)"[^>]*element=\{<Navigate/g)) redirects.add(m[1]);
  for (const m of appSrc.matchAll(/<Route path=\{ROUTES\.(\w+)\}[^>]*element=\{<Navigate/g)) {
    const v = (ROUTES as Record<string, string>)[m[1]];
    if (v) redirects.add(v);
  }
  for (const m of appSrc.matchAll(/path="([^"]+)"/g)) {
    const p = m[1];
    if (!p.startsWith('/__') && p !== '*') mounted.add(p);
  }
  for (const m of appSrc.matchAll(/path=\{ROUTES\.(\w+)\}/g)) {
    const v = (ROUTES as Record<string, string>)[m[1]];
    if (v) mounted.add(v);
  }
  for (const m of appSrc.matchAll(/<Route path="([^"]+)" element=\{<ParamRedirect/g)) redirects.add(m[1]);
  for (const r of redirects) mounted.delete(r);

  // drop design/dev surfaces (BrandPage/__design/__plates are instruments, not product)
  // AND keep only MOUNTED paths (+ the /404 wildcard target) — never scan unmounted paths.
  const scan = candidates
    .filter(p => !p.startsWith('/__'))
    .filter(p => mounted.has(p) || p === '/404')
    .map(path => ({
      path: QUERY_OVERRIDES[path] ?? DETAIL_PATHS[path] ?? path,
      basePath: path,
      role: roleFor(path),
      name: path === '/' ? 'landing' : (DETAIL_PATHS[path] ?? path).replace(/\//g, '_').replace(/^_/, '').replace(/_/g, '-'),
    }));

  const scannedSet = new Set(scan.map(s => s.basePath));
  const mountedNotScanned = [...mounted].filter(p => !scannedSet.has(p) && !p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/universities') && !p.startsWith('/features'));
  const scannedNotMounted = scan.filter(s => !mounted.has(s.basePath)).map(s => s.basePath);
  return { routes: scan, mounted: [...mounted].sort(), diffs: { mountedNotScanned, scannedNotMounted } };
}

/* ── 2. users per role (the real fixture corpus) ─────────────────── */
const ROLE_USERS: Record<string, typeof STUDENT_USER | null> = {
  PUBLIC: null,
  STUDENT: STUDENT_USER,
  TEACHER: TEACHER_USER,
  ADMIN: ADMIN_USER,
  QUALITY: QUALITY_USER,
  OWNER: OWNER_USER,
};

/* ── 3. chromium from the shared fleet cache ─────────────────────── */
function chromiumExecutable(): string | undefined {
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
  } catch { /* fall through */ }
  return undefined;
}

/* ── 4. preview server ───────────────────────────────────────────── */
let serverProc: ChildProcess | null = null;
function killServer() {
  if (serverProc?.pid) { try { process.kill(-serverProc.pid, 'SIGTERM'); } catch { /* already gone */ } }
}
async function bootPreview() {
  console.log(`[BOOT] vite preview on :${PORT} (build: ${DIST})`);
  serverProc = spawn(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: resolve(ROOT, 'frontend'), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.on('exit', killServer);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) { console.log(`[BOOT] ready`); return; }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('vite preview failed to start (is frontend/dist built?)');
}

/* ── 5. in-page detectors (r355 heritage + r358 additions) ───────── */
async function pageMetrics(page: import('playwright').Page, width: number): Promise<Record<string, unknown>[]> {
  return page.evaluate((curWidth: number) => {
    const issues: Record<string, unknown>[] = [];
    const docEl = document.documentElement;
    const scrollW = docEl.scrollWidth;
    if (scrollW > curWidth + 1) {
      issues.push({ type: 'HORIZONTAL_OVERFLOW', severity: 'P0', message: `scrollWidth ${scrollW}px > viewport ${curWidth}px (+${scrollW - curWidth})` });
    }
    if (curWidth < 768) {
      const interactives = document.querySelectorAll('button, a, input, select, textarea, summary, [role="button"], [role="tab"]');
      const small: unknown[] = [];
      for (const el of Array.from(interactives)) {
        const target = el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)
          ? el.closest('label') ?? el : el;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (Math.round(rect.width) < 44 || Math.round(rect.height) < 44) {
          small.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').slice(0, 26).trim(), w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
      if (small.length > 0) issues.push({ type: 'SMALL_TAP_TARGETS', severity: 'P1', count: small.length, samples: small.slice(0, 6) });
    }
    const clipped: unknown[] = [];
    for (const el of Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, td, th'))) {
      if (el.children.length > 0) continue;
      if (el.classList.contains('sr-only') || el.classList.contains('visually-hidden')) continue;
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 2) {
        const style = getComputedStyle(el);
        if (style.overflow === 'hidden' && style.textOverflow !== 'ellipsis') {
          clipped.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').slice(0, 36), scrollW: el.scrollWidth, clientW: el.clientWidth });
        }
      }
    }
    if (clipped.length > 0) issues.push({ type: 'TEXT_CLIPPED', severity: 'P2', count: clipped.length, samples: clipped.slice(0, 4) });
    const root = document.getElementById('root');
    if (!root || root.children.length === 0) issues.push({ type: 'BLANK_PAGE', severity: 'P0', message: 'root has no children' });
    const banner = document.querySelector('[role="alert"], .error-boundary, .crash-boundary');
    if (banner && (banner as HTMLElement).offsetParent !== null) issues.push({ type: 'ERROR_BANNER_MOUNTED', severity: 'P0', message: (banner.textContent || '').slice(0, 80) });
    const rasters = document.querySelectorAll('img[src*=".png"], img[src*=".jpg"], img[src*=".jpeg"]');
    if (rasters.length > 0) issues.push({ type: 'RASTER_ASSETS', severity: 'P2', count: rasters.length, sources: Array.from(rasters).map(i => (i as HTMLImageElement).src.split('/').pop()).slice(0, 5) });

    /* r358 — retired-accent computed-color sweep */
    const RETIRED = ['#ea580c', '#f97316', '#c2410c', '#c43e16', '#ff6b3d', '#d97706', '#fbbf24'];
    const norm = (c: string) => c.replace(/\s+/g, '').toLowerCase();
    const retiredHits: string[] = [];
    const materials: { element: string; radius: string; shadow: string }[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const cs = getComputedStyle(el);
      if (el instanceof HTMLElement && el.getClientRects().length && cs.visibility === 'visible' &&
          (cs.boxShadow !== 'none' || [cs.borderTopLeftRadius, cs.borderTopRightRadius,
            cs.borderBottomRightRadius, cs.borderBottomLeftRadius].some(r => parseFloat(r) > 0))) {
        materials.push({ element: el.tagName + '.' + Array.from(el.classList).join('.'), radius: cs.borderRadius, shadow: cs.boxShadow });
      }
      for (const prop of [cs.color, cs.backgroundColor, cs.borderTopColor] as string[]) {
        if (prop && prop.includes('rgb')) {
          // convert to hex for compare
          const m = prop.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) {
            const hex = '#' + [1, 2, 3].map(i => Number(m[i]).toString(16).padStart(2, '0')).join('');
            if (RETIRED.includes(hex) && !retiredHits.includes(hex)) retiredHits.push(hex);
          }
        }
      }
    }
    if (materials.length) issues.push({ type: 'RADIUS_OR_SHADOW', severity: 'P2', count: materials.length, samples: materials.slice(0, 6) });
    if (retiredHits.length > 0) issues.push({ type: 'OLD_ACCENT_COLOR', severity: 'P1', message: `retired accent computed colors present: ${retiredHits.join(',')}` });

    /* r360 F3 — KPI layout mode. display:contents is a PASSTHROUGH
     * (the .hr-scope boxless wrapper idiom), not a stacked list: walk
     * up to the first real layout ancestor before judging grid/flex.
     * (The old read flagged the .sg-kpis band itself — the first
     * [class*="kpi"] match in document order — under its contents
     * wrapper, while the band is its own grid.) */
    const cells = document.querySelectorAll('.sg-kpi, [data-testid="kpi"], .kpi-card');
    const parents = new Set<Element>();
    for (const cell of cells) {
      let parent = cell.parentElement;
      while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
      if (parent) parents.add(parent);
    }
    for (const band of parents) {
      const count = Array.from(cells).filter(cell => band.contains(cell)).length;
      const display = getComputedStyle(band).display;
      if (count >= 3 && !['grid', 'flex', 'inline-grid', 'inline-flex'].includes(display)) {
        issues.push({ type: 'KPI_STACKED_LIST', severity: 'P2', message: `${count} KPI cells under display:${display}` });
      }
    }
    return issues;
  }, width);
}

async function visualMetrics(page: import('playwright').Page, path: string, width: number): Promise<Record<string, unknown>> {
  return page.evaluate(([p, curWidth]: [string, number]) => {
    const out: Record<string, unknown> = { path: p, width: curWidth };
    const docEl = document.documentElement;
    (out as Record<string, unknown>).pageHeight = docEl.scrollHeight;
    const pick = (el: Element) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color, w: Math.round(r.width), h: Math.round(r.height) };
    };
    const sample = (sel: string) => Array.from(document.querySelectorAll(sel)).slice(0, 8).map(pick);
    (out as Record<string, unknown>).h1 = sample('h1');
    (out as Record<string, unknown>).h2 = sample('h2');
    (out as Record<string, unknown>).h3 = sample('h3');
    if (p === '/') {
      // landing rhythm: the home-* wrap seats + footer
      const wraps = Array.from(document.querySelectorAll('[class^="home-"][class$="-wrap"]'));
      const rhythm = wraps.map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { cls: String(el.className).split(' ')[0], top: Math.round(r.top + window.scrollY), h: Math.round(r.height), padTop: cs.paddingTop, padBottom: cs.paddingBottom };
      });
      (out as Record<string, unknown>).sectionRhythm = rhythm;
      // hero illustration box vs viewport
      const heroImg = document.querySelector('[class*="hero"] img, [class*="hero"] svg, .home-hero-img-interact-wrap, [class*="iso"], [class*="plate"]');
      if (heroImg) {
        const r = heroImg.getBoundingClientRect();
        (out as Record<string, unknown>).heroPlate = { w: Math.round(r.width), h: Math.round(r.height), ratioToViewport: Math.round((r.width / curWidth) * 100) / 100, ratioToHeight: Math.round((r.height / innerHeight) * 100) / 100 };
      }
    }
    return out;
  }, [path, width]);
}

/* ── 6. the scan ─────────────────────────────────────────────────── */
async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  // r358 lesson: probes must never clobber a full-scan catalog — require --force to overwrite.
  /* r360 F3 — the sandbox reaps detached processes, so the FULL matrix
   * runs in role/width CHUNKS; --master names the chunk's own catalog
   * (merged into defects-master.json by the caller). */
  const MASTER_NAME = arg('master', 'defects-master.json');
  const masterPath = join(EVIDENCE, MASTER_NAME);
  if (existsSync(masterPath) && !argv.includes('--force')) {
    console.error(`[GUARD] ${MASTER_NAME} exists — pass --force to overwrite (or move it aside). Aborting.`);
    process.exit(3);
  }
  const { routes: derived, diffs } = deriveRoutes();
  writeFileSync(join(EVIDENCE, 'route-derivation.json'), JSON.stringify({
    scanned: derived.map(r => r.path).sort(),
    mountedNotScanned: diffs.mountedNotScanned,
    scannedNotMounted: diffs.scannedNotMounted,
    mountedRoutes: deriveRoutes().mounted,
  }, null, 2));
  if (diffs.mountedNotScanned.length > 0) {
    console.error(`[DERIVE] FAIL — mounted but not scanned: ${diffs.mountedNotScanned.join(', ')}`);
    process.exit(2);
  }
  const routes = ROUTES_FILTER
    ? ROUTES_FILTER.split(',').map(p => ({ path: p, basePath: p, role: roleFor(p), name: p === '/' ? 'landing' : p.replace(/\//g, '-').replace(/^-/, '') }))
    : derived.filter(r => !FILTER_ROLE || r.role === FILTER_ROLE).slice(0, LIMIT > 0 ? LIMIT : undefined);

  await bootPreview();
  const browser = await chromium.launch({
    executablePath: chromiumExecutable(), headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log(`[SCAN] ${routes.length} routes × ${WIDTHS.length} widths × ${THEMES.length} themes`);
  const defects: Record<string, unknown>[] = [];
  const visuals: Record<string, unknown>[] = [];
  const axeScript = readFileSync(AXE_BUNDLE, 'utf8');

  for (const roleKey of ['PUBLIC', 'STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER']) {
    const roleRoutes = routes.filter(r => r.role === roleKey);
    if (roleRoutes.length === 0) continue;
    const user = ROLE_USERS[roleKey];
    for (const theme of THEMES) {
      const context = await browser.newContext({
        locale: 'ar-LY', timezoneId: 'UTC', colorScheme: theme === 'dark' ? 'dark' : 'light',
        extraHTTPHeaders: { 'Accept-Language': 'ar' },
      });
      await context.addInitScript(() => {
        try {
          sessionStorage.setItem('ulara-intro-skip', '1');
          try {
            Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 8 });
          } catch { /* degrade */ }
        } catch { /* storage denied */ }
      });
      if (user || theme) await seedSession(context, user, { theme: theme as 'light' | 'dark', selectedInstitution: roleKey === 'ADMIN' });
      await installMockApi(context, { sessionUser: user, selectedInstitution: roleKey === 'ADMIN' });

      const page = await context.newPage();
      // tsx/esbuild keepNames shim: serialized evaluate() callbacks may
      // reference the __name helper — define it in page before any evaluate.
      await page.addInitScript('window.__name = function (f) { return f; };');
      const consoleErrors: string[] = [];
      const missingFixtures: string[] = [];
      page.on('response', res => {
        if (res.status() === 501) missingFixtures.push(res.request().method() + ' ' + new URL(res.url()).pathname);
      });
      page.on('console', m => {
        if (m.type() === 'error') {
          const t = m.text();
          const fixture = t.match(/no fixture for (\w+ [^ ]+)/);
          if (fixture) missingFixtures.push(fixture[1]);
          else consoleErrors.push(t.slice(0, 160));
        }
      });
      page.on('pageerror', e => consoleErrors.push(String(e.message).slice(0, 160)));

      for (const routeDef of roleRoutes) {
        for (const width of WIDTHS) {
          consoleErrors.length = 0;
          missingFixtures.length = 0;
          const height = width < 768 ? 844 : 900;
          await page.setViewportSize({ width, height });
          try {
            await page.goto(`${BASE_URL}${routeDef.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(700);
          } catch (e) {
            defects.push({ route: routeDef.basePath, role: routeDef.role, width, theme, type: 'NAVIGATION_ERROR', severity: 'P0', message: String((e as Error).message).slice(0, 200) });
            continue;
          }
          /* r360 F3 — the settle hardening: three transient states were
           * poisoning the measurements (each reproduced CLEAN in a
           * controlled probe at the same fixture/width/theme):
           * 1. toasts mid-enter (opacity < 1 → axe color-contrast flags
           *    on the animating text) — dismiss them before measuring;
           * 2. reveal-up entrances mid-flight (scaled rects — a 44px
           *    seat sampled at 0.84 scale reads 37px) — force-complete
           *    every reveal, then let the transitions land;
           * 3. axe's own injected artifacts lingering into the
           *    retired-accent computed-color sweep — the sweep runs
           *    BEFORE axe now (pageMetrics precedes this block). */
          try {
            await page.evaluate(() => {
              document.querySelectorAll('.toast-close').forEach((b) => { try { (b as HTMLElement).click(); } catch { /* already gone */ } });
              document.querySelectorAll('[class*="reveal"]').forEach((el) => { el.classList.add('in-view'); });
            });
            await page.waitForTimeout(900);
          } catch { /* best-effort settle */ }
          const evaluation = await pageMetrics(page, width);
          const requested = new URL(routeDef.path, BASE_URL).pathname;
          const actual = new URL(page.url()).pathname;
          if (actual !== requested) evaluation.push({ type: 'UNEXPECTED_REDIRECT', severity: 'P0', message: requested + ' → ' + actual });
          // axe
          try {
            await page.evaluate(axeScript);
            const axeResult = await page.evaluate(async () => {
              const scan = (window as unknown as { axe: { run: (n: Document, o: object) => Promise<{ violations: { id: string; impact: string; nodes: unknown[] }[] }> } }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
              let timer: number | undefined;
              try { return await Promise.race([scan, new Promise<never>((_, reject) => {
                timer = window.setTimeout(() => reject(new Error('axe timeout after 20s')), 20000);
              })]); } finally { window.clearTimeout(timer); }
            });
            const axeViolations = (axeResult.violations || []).filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, nodesCount: v.nodes.length }));
            if (axeViolations.length > 0) evaluation.push({ type: 'AXE_VIOLATIONS', severity: 'P1', violations: axeViolations });
          } catch (error) { evaluation.push({ type: 'INSTRUMENT_ERROR', severity: 'P1', message: 'axe: ' + String(error) }); }
          if (missingFixtures.length > 0) evaluation.push({ type: 'MISSING_FIXTURE', severity: 'P1', message: `501s: ${[...new Set(missingFixtures)].slice(0, 6).join(' · ')}` });
          if (consoleErrors.length > 0) evaluation.push({ type: 'CONSOLE_ERRORS', severity: 'P1', errors: consoleErrors.slice(0, 4) });

          if (width === 390 || width === 1440) {
            try {
              const roleDir = resolve(CAPTURES, roleKey.toLowerCase());
              mkdirSync(roleDir, { recursive: true });
              await page.screenshot({ path: join(roleDir, `${routeDef.name}-${width}-${theme}.jpg`), type: 'jpeg', timeout: 15000, quality: 75, fullPage: width === 390 && routeDef.path === '/' });
              visuals.push(await visualMetrics(page, routeDef.path, width));
            } catch (e) {
              defects.push({ route: routeDef.basePath, role: routeDef.role, width, theme, type: 'INSTRUMENT_ERROR', severity: 'P2', message: `visual-metrics/shot: ${String((e as Error).message).slice(0, 140)}` });
            }
          }
          for (const issue of evaluation) defects.push({ route: routeDef.basePath, role: routeDef.role, width, theme, ...issue });
        }
      }
      await context.close();
    }
  }
  await browser.close();
  killServer();

  // dedupe across viewports (r355 grouping)
  const grouped: Record<string, Record<string, unknown>> = {};
  for (const d of defects) {
    const rawMsg = (d.message as string) || (d.errors ? (d.errors as string[])[0] : '') || (d.type as string);
    const cleanMsg = String(rawMsg).split('\n')[0].slice(0, 200);
    const key = `${d.route}|${d.type}|${cleanMsg}`;
    if (!grouped[key]) grouped[key] = { route: d.route, role: d.role, type: d.type, severity: d.severity, message: cleanMsg, viewports: [] as string[], count: (d as { count?: number }).count, samples: (d as { samples?: unknown[] }).samples, violations: (d as { violations?: unknown[] }).violations }; /* r360 F3 — keep count/samples through the dedup (the element-level evidence the fixes need) */
    (grouped[key].viewports as string[]).push(`${d.width}px:${d.theme}`);
  }
  const deduped = Object.values(grouped);
  writeFileSync(masterPath, JSON.stringify(deduped, null, 2));
  writeFileSync(join(EVIDENCE, 'visual-metrics.json'), JSON.stringify(visuals, null, 2));

  const p0 = deduped.filter(d => d.severity === 'P0');
  const p1 = deduped.filter(d => d.severity === 'P1');
  const p2 = deduped.filter(d => d.severity === 'P2');
  const summary = `# R358 Phase A — ULARA Scan\n\n**Scope:** ${routes.length} routes × ${WIDTHS.join('/')} × ${THEMES.join('/')}\n**Master:** ${MASTER_NAME}\n**Defects (deduped):** ${deduped.length} — P0 ${p0.length} · P1 ${p1.length} · P2 ${p2.length}\n\n## P0\n${p0.map(d => `- [${d.role}] ${d.route} (${(d.viewports as string[]).slice(0, 3).join(', ')}): ${d.message}`).join('\n') || '_none_'}\n\n## P1\n${p1.slice(0, 40).map(d => `- [${d.role}] ${d.route} (${(d.viewports as string[]).slice(0, 2).join(', ')}): ${d.type} — ${d.message || ''}`).join('\n') || '_none_'}\n\n## P2\n${p2.slice(0, 40).map(d => `- [${d.role}] ${d.route}: ${d.type} — ${d.message || ''}`).join('\n') || '_none_'}\n`;
  writeFileSync(join(EVIDENCE, MASTER_NAME.replace(/\.json$/, '') + '-summary.md'), summary);
  console.log(`[COMPLETE] ${deduped.length} defects — evidence in ${EVIDENCE}`);
}

main().catch(e => { console.error('[FATAL]', e); killServer(); process.exit(1); });
