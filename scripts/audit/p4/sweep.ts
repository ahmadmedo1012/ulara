#!/usr/bin/env tsx
/**
 * scripts/audit/p4/sweep.ts — the P4 PRODUCT SWEEP (work-order items #1+#2).
 *
 * ONE gateable CLI wrapping the PROVEN detectors behind a mode switch:
 *
 *   --slice  the PR lane: landing (/) + one page per role + /institution
 *            × 390/1440 × light/dark = 28 cells.
 *   --full   the main-push lane: the r358-DERIVED route matrix (derived
 *            from frontend/src/lib/routes.ts and cross-checked against
 *            every path= mounted in frontend/src/App.tsx) × the 7-width
 *            set × 2 themes × the 6 role lanes (PUBLIC/STUDENT/TEACHER/
 *            ADMIN/QUALITY/OWNER — /institution rides ADMIN per the r358
 *            roleFor mapping). In CI one lane runs per job (--lane);
 *            without --lane all six run sequentially in one process.
 *
 * Detectors per cell (REUSED, not reinvented):
 *   · glyph-ink TEXT COLLISIONS, CLIPPED TEXT (must-read elements) and
 *     PAGE OVERFLOW — the r362-overlap COLLECT source, verbatim
 *     (Range.getClientRects ink boxes; fullscreen designed layers exempt;
 *     r363 P4: ink under a COLLAPSED <details> is exempt too — the
 *     r362 known-limitation zone, closed at the detector with the
 *     reason inline — Chromium keeps closed panes' boxes queryable).
 *   · r358 pageMetrics: horizontal overflow (P0), tap targets < 44px
 *     (P1, < 768 widths), soft-clipped text (P2), BLANK_PAGE (P0),
 *     ERROR_BANNER_MOUNTED (P0), retired-accent computed colors (P1),
 *     KPI stacked list (P2), raster/radius-shadow inventory (P2 —
 *     honors the documented RADIUS_SHADOW_ALLOWS table, the *-gate
 *     convention).
 *   · CONSOLE ERRORS + pageerrors (P1) and the loud 501 →
 *     MISSING_FIXTURE elevation (P1) — the zero-501 assertion.
 *   · axe-core serious/critical on wcag2a+wcag2aa (P1) — same floor as
 *     the r358 scan (the a11y ratchet only tightens).
 *   · UNEXPECTED_REDIRECT (P0) and NAVIGATION_ERROR (P0).
 *
 * Gate semantics (the P4 job draft): exit 0 clean, exit 1 on ANY P0/P1
 * finding (P2s ride the catalog as inventory, they do not gate),
 * exit 2 on INFRA (server down, browser missing, route-derivation gap,
 * axe bundle missing). Every lane's catalog lands as
 * `defects-<lane>.json` (+ a `defects-summary.md` for the run) in
 * --report <dir> (default docs/redesign/p4/evidence — the CI artifact
 * path).
 *
 * SERVING CONTRACT — attach, never boot: the sweep honors
 * ULARA_E2E_BASE_URL (default http://localhost:4173) and drives an
 * ALREADY-RUNNING server the way the surface-drift job serves it
 * (`npx vite preview --port 4173 --strictPort` over the production
 * build). It does NOT spawn vite (that is r358/capture.ts's local
 * convenience, deliberately NOT reused here). Every /api/ call is
 * fulfilled at the Playwright transport by the REAL e2e fixture corpus
 * (tests/e2e/fixtures/mock-transport.ts installMockApi/seedSession —
 * the AUDIT_API_MOCK=1 contract), so the sweep runs DB-less and
 * network-less exactly like the e2e job; an unmatched endpoint answers
 * the transport's loud 501 and the MISSING_FIXTURE detector elevates it.
 *
 * Usage (repo root):
 *   npx tsx scripts/audit/p4/sweep.ts --slice --report /tmp/p4
 *   npx tsx scripts/audit/p4/sweep.ts --mode full --lane ADMIN
 *   npx tsx scripts/audit/p4/sweep.ts --full            # all six lanes
 *   npx tsx scripts/audit/p4/sweep.ts --slice --only /  # debug one route
 *   npx tsx scripts/audit/p4/sweep.ts --full --list     # print the plan
 *
 * Flags: --slice | --full | --mode slice|full · --lane PUBLIC|STUDENT|
 * TEACHER|ADMIN|QUALITY|OWNER (full only) · --widths 390,1440 ·
 * --themes light,dark · --report <dir> · --only <route> · --list.
 * Exit: 0 clean · 1 any P0/P1 (gate) · 2 infra.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTES } from '../../../frontend/src/lib/routes';
import { installMockApi, seedSession } from '../../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../../frontend/tests/e2e/fixtures/api-fixtures';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const BASE = process.env.ULARA_E2E_BASE_URL || 'http://localhost:4173';
const AXE_BUNDLE = resolve(ROOT, 'node_modules/axe-core/axe.min.js');
const DEFAULT_REPORT_DIR = resolve(ROOT, 'docs/redesign/p4/evidence');

const LANES = ['PUBLIC', 'STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const;
type Lane = (typeof LANES)[number];

const SLICE_WIDTHS = [390, 1440];
const FULL_WIDTHS = [320, 360, 390, 768, 1024, 1440, 1920];
const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

type Severity = 'P0' | 'P1' | 'P2';

interface Finding {
  lane: string;
  role: string;
  route: string;
  width: number;
  theme: string;
  detector: string;
  severity: Severity;
  detail: string;
  [key: string]: unknown;
}

/** One pageMetrics-shaped issue straight from the in-page probe. */
interface PageIssue {
  type: string;
  severity: Severity;
  message?: string;
  count?: number;
  samples?: unknown[];
  errors?: string[];
  violations?: { id: string; impact: string; nodesCount: number }[];
}

interface Collision {
  a: string;
  b: string;
  aText: string;
  bText: string;
  area: number;
  ratio: number;
}

interface ClippedRead {
  el: string;
  text: string;
  scrollW: number;
  clientW: number;
  axis: string;
}

/** r362 COLLECT result — glyph-ink collisions, must-read clipping, overflow px. */
interface CollectResult {
  collisions: Collision[];
  clipped: ClippedRead[];
  overflow: number;
}

/* ── args ──────────────────────────────────────────────────────────── */

interface Args {
  mode: 'slice' | 'full';
  lane: Lane | null;
  widths: number[];
  themes: Theme[];
  reportDir: string;
  only: string | null;
  list: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    mode: 'slice',
    lane: null,
    widths: [],
    themes: [],
    reportDir: DEFAULT_REPORT_DIR,
    only: null,
    list: false,
  };
  let modeSeen = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (what: string): string => {
      const v = argv[i + 1];
      if (v === undefined) fail(`flag ${a} needs a value (${what})`, 2);
      i += 1;
      return v;
    };
    if (a === '--slice') {
      out.mode = 'slice';
      modeSeen = true;
    } else if (a === '--full') {
      out.mode = 'full';
      modeSeen = true;
    } else if (a === '--mode') {
      const v = next('slice|full');
      if (v !== 'slice' && v !== 'full') fail(`--mode ${v} — want slice|full`, 2);
      out.mode = v;
      modeSeen = true;
    } else if (a === '--lane') {
      const l = next('LANE');
      if (!(LANES as readonly string[]).includes(l)) fail(`unknown lane ${l} — one of ${LANES.join('/')}`, 2);
      out.lane = l as Lane;
    } else if (a === '--widths') {
      out.widths = next('N,N').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
    } else if (a === '--themes') {
      out.themes = next('light,dark').split(',').filter((t): t is Theme => (THEMES as readonly string[]).includes(t));
    } else if (a === '--report') {
      out.reportDir = resolve(process.cwd(), next('DIR'));
    } else if (a === '--only') {
      out.only = next('ROUTE');
    } else if (a === '--list') {
      out.list = true;
    } else {
      fail(`unknown flag ${a}`, 2);
    }
  }
  if (!modeSeen) fail('no mode — pass --slice or --full (or --mode slice|full)', 2);
  if (out.widths.length === 0) out.widths = out.mode === 'slice' ? SLICE_WIDTHS : FULL_WIDTHS;
  if (out.themes.length === 0) out.themes = [...THEMES];
  return out;
}

function fail(msg: string, code: number): never {
  console.error(`[SWEEP] ${msg}`);
  process.exit(code);
}

/* ── chromium from the shared fleet cache (r358 heritage) ──────────── */

function chromiumExecutable(): string | undefined {
  if (process.env.ULARA_E2E_EXECUTABLE) return process.env.ULARA_E2E_EXECUTABLE;
  const cache = `${process.env.HOME}/.cache/ms-playwright`;
  try {
    const revs = readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const rev of revs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = `${cache}/${rev}/${sub}`;
        if (existsSync(p)) return p;
      }
    }
  } catch { /* fall through to playwright's own resolution */ }
  return undefined;
}

/* ── the slice plan (hand-pinned, all proven under the mock transport) ── */

interface CellRoute { route: string; basePath: string; role: string; name: string }

const SLICE_PLAN: CellRoute[] = [
  { route: '/', basePath: '/', role: 'PUBLIC', name: 'landing' },
  { route: '/student/courses', basePath: '/student/courses', role: 'STUDENT', name: 'student-courses' },
  { route: '/teacher/dashboard', basePath: '/teacher/dashboard', role: 'TEACHER', name: 'teacher-dashboard' },
  { route: '/admin/dashboard', basePath: '/admin/dashboard', role: 'ADMIN', name: 'admin-dashboard' },
  { route: '/quality/dashboard', basePath: '/quality/dashboard', role: 'QUALITY', name: 'quality-dashboard' },
  { route: '/owner/dashboard', basePath: '/owner/dashboard', role: 'OWNER', name: 'owner-dashboard' },
  // /institution rides the ADMIN lane (r358 roleFor mapping) — the sweep
  // seeds selectedInstitution for every ADMIN-lane cell.
  { route: '/institution', basePath: '/institution', role: 'ADMIN', name: 'institution' },
];

/* ── the full matrix (r358 deriveRoutes, copied — capture.ts executes
 *    main() at import so its derivation is not importable) ──────────── */

function roleFor(path: string): string {
  if (path.startsWith('/student')) return 'STUDENT';
  if (path.startsWith('/teacher')) return 'TEACHER';
  if (path.startsWith('/admin')) return 'ADMIN';
  if (path.startsWith('/quality')) return 'QUALITY';
  if (path.startsWith('/owner')) return 'OWNER';
  if (path.startsWith('/institution')) return 'ADMIN';
  if (['training', 'achievements', 'community', 'competitions', 'vision', 'document'].some((p) => path === `/${p}` || path.startsWith(`/${p}/`))) return 'STUDENT';
  if (path === '/settings') return 'STUDENT'; // any-authed shared doors (App.tsx r320 P2-1)
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

function deriveRoutes(): { routes: CellRoute[]; mounted: string[]; mountedNotScanned: string[]; scannedNotMounted: string[] } {
  const fromRoutes = Object.values(ROUTES).filter((p) => !p.includes(':')) as string[];
  const literalExtras = ['/admin/analysis']; // literal-mounted, not in ROUTES
  const publicExtras = ['/about', '/help', '/app', '/legal/privacy', '/legal/terms',
    '/legal/cookies', '/legal/accessibility', '/legal/security', '/legal/data',
    '/contact', '/campus', '/colleges/leaderboard',
    '/404', '/403', '/500', '/maintenance',
    '/auth/forgot-password', '/auth/reset-password'];
  // r360 F3 — the reset sheet is a TOKENED route by contract; visit the form
  // state (the page only calls the backend on submit).
  const QUERY_OVERRIDES: Record<string, string> = {
    '/auth/reset-password': '/auth/reset-password?token=e2e_fixture_reset_token_0123456789abcdef0123456',
  };
  const candidates = [...new Set([...fromRoutes, ...publicExtras, ...literalExtras, ...Object.keys(DETAIL_PATHS)])]
    .filter((p) => p !== '/login' && p !== '/register' && p !== '/universities' && p !== '/features');

  // every path literally mounted in App.tsx (path="…" or path={ROUTES.x})
  const appSrc = readFileSync(resolve(ROOT, 'frontend/src/App.tsx'), 'utf8');
  const mounted = new Set<string>();
  const redirects = new Set<string>();
  for (const m of appSrc.matchAll(/<Route path="([^"]+)"[^>]*element=\{<Navigate/g)) { const v = m[1]; if (v) redirects.add(v); }
  for (const m of appSrc.matchAll(/<Route path=\{ROUTES\.(\w+)\}[^>]*element=\{<Navigate/g)) {
    const key = m[1];
    const v = key ? (ROUTES as Record<string, string>)[key] : undefined;
    if (v) redirects.add(v);
  }
  for (const m of appSrc.matchAll(/path="([^"]+)"/g)) {
    const p = m[1];
    if (p && !p.startsWith('/__') && p !== '*') mounted.add(p);
  }
  for (const m of appSrc.matchAll(/path=\{ROUTES\.(\w+)\}/g)) {
    const key = m[1];
    const v = key ? (ROUTES as Record<string, string>)[key] : undefined;
    if (v) mounted.add(v);
  }
  for (const m of appSrc.matchAll(/<Route path="([^"]+)" element=\{<ParamRedirect/g)) { const v = m[1]; if (v) redirects.add(v); }
  for (const r of redirects) mounted.delete(r);

  const scan = candidates
    .filter((p) => !p.startsWith('/__'))
    .filter((p) => mounted.has(p) || p === '/404')
    .map((basePath) => ({
      route: QUERY_OVERRIDES[basePath] ?? DETAIL_PATHS[basePath] ?? basePath,
      basePath,
      role: roleFor(basePath),
      name: basePath === '/' ? 'landing' : (DETAIL_PATHS[basePath] ?? basePath).replace(/\//g, '_').replace(/^_/, '').replace(/_/g, '-'),
    }));

  // The diff runs on the TEMPLATE paths (basePath — the mounted contracts),
  // not the concrete substituted routes (r358).
  const scannedSet = new Set(scan.map((s) => s.basePath));
  const mountedNotScanned = [...mounted].filter((p) => !scannedSet.has(p) && !p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/universities') && !p.startsWith('/features'));
  const scannedNotMounted = scan.filter((s) => !mounted.has(s.basePath)).map((s) => s.basePath);
  return { routes: scan, mounted: [...mounted].sort(), mountedNotScanned, scannedNotMounted };
}

/* ── in-page probe 1: r362-overlap COLLECT (verbatim source string —
 *    page.evaluate(fn) ships the function's text through the bundler,
 *    which injects its __name helper; a plain string is immune) ─────── */

const COLLECT_SRC = `(() => {
  const MIN_OVERLAP = 40;   // px² of ink-on-ink before it is a collision
  const MIN_RATIO = 0.3;    // of the smaller ink box

  const fullscreenLayers = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height >= window.innerWidth * window.innerHeight * 0.8) fullscreenLayers.push(el);
  }
  const inLayer = (el) => fullscreenLayers.some((l) => l.contains(el));

  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };

  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    if (text.length === 0) continue;
    const el = node.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (inLayer(el)) continue;
    /* r362's KNOWN LIMITATION, closed at the detector (r363 P4): inside
       a COLLAPSED <details>, Chromium still keeps the hidden pane's
       boxes queryable (the ::details-content slot lays its subtree out),
       so a closed answer's text yields live glyph rects that intersect
       ink the reader CAN see — /help over-reported for exactly this,
       and the r363 P4 sweep's first run hit it on /quality/dashboard
       @1440 (a closed «تنبيهات أخرى» alert and the closed KPI-ledger /
       attendance-mix sections colliding with the visible CTA and each
       other). A reader cannot read a closed pane, so its ink is exempt:
       skip any text whose ancestor chain holds a closed <details> —
       unless the text IS the summary (always visible). */
    let inClosedDetails = false;
    for (let a = el; a; a = a.parentElement) {
      if (a.tagName === 'DETAILS' && a.open === false) { inClosedDetails = true; break; }
    }
    if (inClosedDetails && !el.closest('summary')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (rects.length === 0) continue;
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue;
    const fs = parseFloat(cs.fontSize) || 0;
    let clipL = -Infinity, clipT = -Infinity, clipR = Infinity, clipB = Infinity;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflow === 'visible' && acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect();
      clipL = Math.max(clipL, ar.left); clipT = Math.max(clipT, ar.top);
      clipR = Math.min(clipR, ar.right); clipB = Math.min(clipB, ar.bottom);
    }
    const ink = rects.map((r) => {
      const pad = Math.max(0, (r.height - fs) / 2);
      const top = Math.max(r.top + pad, clipT);
      const bottom = Math.min(r.bottom - pad, clipB);
      const left = Math.max(r.left, clipL);
      const right = Math.min(r.right, clipR);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    });
    if (!ink.some((r) => r.height > 1)) continue;
    items.push({ el, node, rects: ink, text: text.slice(0, 48) });
  }

  const collisions = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let best = 0;
      let bestSmaller = 1;
      for (const ra of a.rects) {
        for (const rb of b.rects) {
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox <= 0 || oy <= 0) continue;
          const area = ox * oy;
          if (area <= best) continue;
          best = area;
          bestSmaller = Math.min(ra.width * ra.height, rb.width * rb.height);
        }
      }
      if (best < MIN_OVERLAP || best / bestSmaller < MIN_RATIO) continue;
      collisions.push({
        a: label(a.el),
        b: label(b.el),
        aText: a.text,
        bText: b.text,
        area: Math.round(best),
        ratio: Number((best / bestSmaller).toFixed(2)),
      });
    }
  }

  const clipped = [];
  const seen = new Set();
  for (const { el, text } of items) {
    if (seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    /* r363 — the DESIGNED-CLAMP exemption: -webkit-line-clamp is the
       house's deliberate preview truncation (the notification cards'
       two-line .np-desc, et al) — the reader sees the ellipsis and
       the full text lives one click away. A clamp that has clamped
       satisfies scrollH > clientH by construction, so the clipped-read
       detector must not flag it. (First CI run: /quality/notifications
       x4 cells.) */
    const isDesignedClamp = String(cs.webkitLineClamp || 'none') !== 'none';
    const hidesX = el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible';
    const hidesY = el.scrollHeight > el.clientHeight + 1 && cs.overflowY !== 'visible';
    if (!hidesX && !hidesY) continue;
    if (isDesignedClamp) continue;
    const ellipsis = cs.textOverflow === 'ellipsis';
    const mustRead = /^H[1-6]$/.test(el.tagName) || el.tagName === 'BUTTON' || el.tagName === 'A';
    if (ellipsis && !mustRead) continue;
    clipped.push({
      el: label(el),
      text: text.slice(0, 48),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      axis: hidesX ? 'x' : 'y',
    });
  }

  return { collisions, clipped, overflow: document.documentElement.scrollWidth - window.innerWidth };
})()`;

/* ── in-page probe 2: r358 pageMetrics (source string, same immunity) ── */

/** Playwright evaluates STRING sources as expressions (no auto-invoke),
 *  so the pageMetrics probe ships as a self-invoking function with the
 *  width interpolated in (a number — safe to inline). */
const pageMetricsSrc = (curWidth: number): string => `(function () {
  const viewportWidth = ${curWidth};
  const issues = [];
  const docEl = document.documentElement;
  const scrollW = docEl.scrollWidth;
  if (scrollW > viewportWidth + 1) {
    issues.push({ type: 'HORIZONTAL_OVERFLOW_R358', severity: 'P0', message: 'scrollWidth ' + scrollW + 'px > viewport ' + viewportWidth + 'px (+' + (scrollW - viewportWidth) + ')' });
  }
  if (viewportWidth < 768) {
    const interactives = document.querySelectorAll('button, a, input, select, textarea, summary, [role="button"], [role="tab"]');
    const small = [];
    for (const el of Array.from(interactives)) {
      /* r363 — the SKIP-LINK exemption (the WCAG 2.5.8 target-size
         keyboard/inline exception): the skip link is invisible until
         focused and its only audience is keyboard users (Tab, not
         tap) — measuring it as a tap target is a category error. */
      if (el.closest('.skip-link')) continue;
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
  const clipped = [];
  for (const el of Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, td, th'))) {
    if (el.children.length > 0) continue;
    if (el.classList.contains('sr-only') || el.classList.contains('visually-hidden')) continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 2) {
      const style = getComputedStyle(el);
      /* the designed-clamp exemption (see COLLECT_SRC) */
      const isDesignedClamp =
        style.display === '-webkit-box' && style.webkitLineClamp !== 'none';
      if (style.overflow === 'hidden' && style.textOverflow !== 'ellipsis' && !isDesignedClamp) {
        clipped.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').slice(0, 36), scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
    }
  }
  if (clipped.length > 0) issues.push({ type: 'TEXT_CLIPPED', severity: 'P2', count: clipped.length, samples: clipped.slice(0, 4) });
  const root = document.getElementById('root');
  if (!root || root.children.length === 0) issues.push({ type: 'BLANK_PAGE', severity: 'P0', message: 'root has no children' });
  const banner = document.querySelector('[role="alert"], .error-boundary, .crash-boundary');
  if (banner && banner.offsetParent !== null) issues.push({ type: 'ERROR_BANNER_MOUNTED', severity: 'P0', message: (banner.textContent || '').slice(0, 80) });
  const rasters = document.querySelectorAll('img[src*=".png"], img[src*=".jpg"], img[src*=".jpeg"]');
  if (rasters.length > 0) issues.push({ type: 'RASTER_ASSETS', severity: 'P2', count: rasters.length, sources: Array.from(rasters).map((i) => i.src.split('/').pop()).slice(0, 5) });

  /* r358 — retired-accent computed-color sweep */
  const RETIRED = ['#ea580c', '#f97316', '#c2410c', '#c43e16', '#ff6b3d', '#d97706', '#fbbf24'];
  /* r363 P4 — documented radius/shadow allows, mirroring the
     *-gate: allow convention of check-raw-css.sh AT this inventory
     detector (an entry here = sanctioned inventory, not a defect).
     Current entries, each with its reason:
       · .sc-cursor-dot — the landing's pointer dot: the r363 P2
         fidelity-gated copy of the reference's own .cursor-inner
         anatomy — a 0.6rem 50% circle (ground truth committed in
         docs/redesign/r350/reference/refsite.css; anatomy in
         REFERENCE.md §6; verdict in r363 evidence
         p2-sheets-critique.md §4). The radius-0 law governs SURFACES
         (cards/controls/chrome); the pointer instrument is a measured
         reference extraction, and the raw-css RADIUS axis already
         sanctions 50% as the circle primitive. */
  const RADIUS_SHADOW_ALLOWS = '.sc-cursor-dot';
  const retiredHits = [];
  const materials = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const cs = getComputedStyle(el);
    if (el instanceof HTMLElement && el.getClientRects().length && cs.visibility === 'visible' &&
        (cs.boxShadow !== 'none' || [cs.borderTopLeftRadius, cs.borderTopRightRadius,
          cs.borderBottomRightRadius, cs.borderBottomLeftRadius].some((r) => parseFloat(r) > 0))) {
      if (el.matches(RADIUS_SHADOW_ALLOWS)) continue; /* documented allow — see the table above */
      materials.push({ element: el.tagName + '.' + Array.from(el.classList).join('.'), radius: cs.borderRadius, shadow: cs.boxShadow });
    }
    for (const prop of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      if (prop && prop.includes('rgb')) {
        const m = prop.match(/rgba?(\\d+),\\s*(\\d+),\\s*(\\d+)/);
        if (m) {
          const hex = '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('');
          if (RETIRED.includes(hex) && !retiredHits.includes(hex)) retiredHits.push(hex);
        }
      }
    }
  }
  if (materials.length) issues.push({ type: 'RADIUS_OR_SHADOW', severity: 'P2', count: materials.length, samples: materials.slice(0, 6) });
  if (retiredHits.length > 0) issues.push({ type: 'OLD_ACCENT_COLOR', severity: 'P1', message: 'retired accent computed colors present: ' + retiredHits.join(',') });

  /* r360 F3 — KPI layout mode (display:contents passthrough walk-up) */
  const cells = document.querySelectorAll('.sg-kpi, [data-testid="kpi"], .kpi-card');
  const parents = new Set();
  for (const cell of cells) {
    let parent = cell.parentElement;
    while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
    if (parent) parents.add(parent);
  }
  for (const band of parents) {
    const count = Array.from(cells).filter((cell) => band.contains(cell)).length;
    const display = getComputedStyle(band).display;
    if (count >= 3 && !['grid', 'flex', 'inline-grid', 'inline-flex'].includes(display)) {
      issues.push({ type: 'KPI_STACKED_LIST', severity: 'P2', message: count + ' KPI cells under display:' + display });
    }
  }
  return issues;
})();`;

/* ── the sweep ─────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(AXE_BUNDLE)) fail(`axe bundle missing at ${AXE_BUNDLE} (npm ci first)`, 2);

  // Plan the lanes.
  let lanes: { lane: string; routes: CellRoute[] }[] = [];
  if (args.mode === 'slice') {
    const routes = args.only
      ? SLICE_PLAN.filter((r) => r.route === args.only)
      : SLICE_PLAN;
    if (routes.length === 0) fail(`--only ${args.only} is not in the slice plan (${SLICE_PLAN.map((r) => r.route).join(' ')})`, 2);
    lanes = [{ lane: 'slice', routes }];
  } else {
    const derivation = deriveRoutes();
    mkdirSync(args.reportDir, { recursive: true });
    writeFileSync(join(args.reportDir, 'route-derivation.json'), JSON.stringify({
      scanned: derivation.routes.map((r) => r.route).sort(),
      mountedRoutes: derivation.mounted,
      mountedNotScanned: derivation.mountedNotScanned,
      scannedNotMounted: derivation.scannedNotMounted,
    }, null, 2));
    // The derivation contract (r358): a mounted-but-uncaptured route is a
    // coverage hole — infra-level failure (exit 2), not a page defect.
    if (derivation.mountedNotScanned.length > 0) {
      fail(`DERIVE FAIL — mounted but not scanned: ${derivation.mountedNotScanned.join(', ')}`, 2);
    }
    const byLane = new Map<string, CellRoute[]>();
    for (const r of derivation.routes) {
      const list = byLane.get(r.role) ?? [];
      list.push(r);
      byLane.set(r.role, list);
    }
    lanes = (args.lane ? [args.lane] : [...LANES]).map((lane) => ({ lane, routes: byLane.get(lane) ?? [] }));
    lanes = lanes.filter((l) => l.routes.length > 0);
    if (lanes.length === 0) fail('the requested lane(s) hold no derived routes', 2);
  }

  if (args.list) {
    for (const l of lanes) {
      console.log(`lane ${l.lane}: ${l.routes.length} routes × ${args.widths.length} widths × ${args.themes.length} themes = ${l.routes.length * args.widths.length * args.themes.length} cells`);
      for (const r of l.routes) console.log(`  [${r.role}] ${r.route}`);
    }
    process.exit(0);
  }

  const totalPlanned = lanes.reduce((n, l) => n + l.routes.length * args.widths.length * args.themes.length, 0);
  console.log(`[SWEEP] mode=${args.mode} lanes=${lanes.map((l) => l.lane).join(',')} widths=${args.widths.join(',')} themes=${args.themes.join(',')} → ${totalPlanned} cells @ ${BASE}`);

  // Attach — never boot. The server must already be up (surface-drift
  // convention); a dead server is infra (exit 2), not a page defect.
  try {
    const ping = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
    if (!ping.ok) throw new Error(`status ${ping.status}`);
  } catch (e) {
    fail(`nothing answered at ${BASE} — start it the CI way: (cd frontend && npx vite preview --port 4173 --strictPort) with ULARA_E2E_BASE_URL set (${String(e).slice(0, 120)})`, 2);
  }

  const axeScript = readFileSync(AXE_BUNDLE, 'utf8');
  const browser = await chromium.launch({
    executablePath: chromiumExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allFindings: Finding[] = [];
  let cellsOk = 0;

  for (const { lane, routes } of lanes) {
    const findings: Finding[] = [];
    let cells = 0;
    for (const routeDef of routes) {
      for (const width of args.widths) {
        for (const theme of args.themes) {
          const height = width < 500 ? 844 : 900;
          const ctx = await browser.newContext({
            viewport: { width, height },
            isMobile: width < 500,
            hasTouch: width < 500,
            locale: 'ar-LY',
            timezoneId: 'UTC',
            colorScheme: theme,
            extraHTTPHeaders: { 'Accept-Language': 'ar' },
          });
          await ctx.addInitScript(() => {
            try {
              sessionStorage.setItem('ulara-intro-skip', '1');
              try {
                Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 8 });
              } catch { /* degrade */ }
            } catch { /* storage denied */ }
            // tsx/esbuild keepNames shim (r358): serialized evaluate()
            // callbacks may reference the __name helper.
            (window as unknown as { __name: (f: unknown) => unknown }).__name = function (f: unknown) { return f; };
          });
          const user = routeDef.role === 'PUBLIC' ? null : ROLE_USERS[routeDef.role as keyof typeof ROLE_USERS] ?? null;
          await seedSession(ctx, user, { theme, selectedInstitution: routeDef.role === 'ADMIN' });
          await installMockApi(ctx, { sessionUser: user, selectedInstitution: routeDef.role === 'ADMIN' });

          const page = await ctx.newPage();
          const consoleErrors: string[] = [];
          const missingFixtures: string[] = [];
          page.on('response', (res) => {
            if (res.status() === 501) missingFixtures.push(res.request().method() + ' ' + new URL(res.url()).pathname);
          });
          page.on('console', (m) => {
            if (m.type() === 'error') {
              const t = m.text();
              const fixture = t.match(/no fixture for (\w+ [^ ]+)/);
              if (fixture?.[1]) missingFixtures.push(fixture[1]);
              else consoleErrors.push(t.slice(0, 160));
            }
          });
          page.on('pageerror', (e) => consoleErrors.push(String(e.message).slice(0, 160)));

          const push = (detector: string, severity: Severity, detail: string, extra: Record<string, unknown> = {}) => {
            findings.push({ lane, role: routeDef.role, route: routeDef.route, width, theme, detector, severity, detail, ...extra });
          };

          try {
            const resp = await page.goto(BASE + routeDef.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
            if (!resp || resp.status() >= 400) throw new Error('navigation status ' + (resp ? resp.status() : 'none'));
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
            // The first-load entrance draws a DUPLICATE of the hero over the
            // real one while it runs (r362) — wait it out, bounded.
            await page.waitForFunction(
              `(() => {
                 const layer = document.querySelector('[data-preloader], .pl-');
                 if (!layer) return true;
                 const cs = getComputedStyle(layer);
                 return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
               })()`,
              undefined,
              { timeout: 6000 },
            ).catch(() => { });
            // r360-F3 settle: dismiss mid-enter toasts, force-complete reveal
            // entrances (scaled rects lie to the tap/overlap geometry), let
            // transitions land.
            await page.evaluate(() => {
              document.querySelectorAll('.toast-close').forEach((b) => { try { (b as HTMLElement).click(); } catch { /* already gone */ } });
              document.querySelectorAll('[class*="reveal"]').forEach((el) => { el.classList.add('in-view'); });
            }).catch(() => { });
            await page.waitForTimeout(900);

            // 1. r362 glyph-ink geometry (collisions / clipped / overflow).
            const geo = await page.evaluate(COLLECT_SRC) as CollectResult;
            if (geo.overflow > 1) push('HORIZONTAL_OVERFLOW', 'P0', `scrollWidth ${width + geo.overflow}px > viewport ${width}px (+${geo.overflow})`);
            for (const c of geo.collisions) {
              push('TEXT_COLLISION', 'P0', `"${c.aText}" × "${c.bText}" ink-on-ink area=${c.area}px² ratio=${c.ratio} (${c.a} × ${c.b})`, { a: c.a, b: c.b, area: c.area, ratio: c.ratio });
            }
            for (const c of geo.clipped) {
              push('CLIPPED_TEXT', 'P1', `${c.el} hides ${c.axis}-overflow ${c.scrollW}>${c.clientW} "${c.text}"`, { el: c.el, axis: c.axis });
            }

            // 2. r358 pageMetrics (runs BEFORE axe — the r360-F3 ordering
            //    lesson: axe's injected artifacts pollute computed-color sweeps).
            const issues = await page.evaluate(pageMetricsSrc(width)) as PageIssue[];
            for (const issue of issues) {
              const bits: string[] = [];
              if (issue.message) bits.push(issue.message);
              if (typeof issue.count === 'number') bits.push(`count=${issue.count}`);
              if (issue.samples && issue.samples.length > 0) bits.push(`samples=${JSON.stringify(issue.samples).slice(0, 200)}`);
              push(issue.type, issue.severity, bits.join(' · ') || issue.type, issue.count !== undefined ? { count: issue.count, samples: issue.samples } : {});
            }

            // 3. axe serious/critical (r358 floor, 20s race).
            try {
              await page.evaluate(axeScript);
              const axeResult = await page.evaluate(async () => {
                const w = window as unknown as { axe: { run: (n: Document, o: object) => Promise<{ violations: { id: string; impact: string; nodes: unknown[] }[] }> } };
                const scan = w.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
                let timer: number | undefined;
                try {
                  return await Promise.race([scan, new Promise<never>((_, reject) => {
                    timer = window.setTimeout(() => reject(new Error('axe timeout after 20s')), 20000);
                  })]);
                } finally { window.clearTimeout(timer); }
              });
              const violations = (axeResult.violations || [])
                .filter((v) => ['serious', 'critical'].includes(v.impact))
                .map((v) => ({ id: v.id, impact: v.impact, nodesCount: v.nodes.length }));
              if (violations.length > 0) {
                push('AXE_VIOLATIONS', 'P1', violations.map((v) => `${v.id}/${v.impact}×${v.nodesCount}`).join(', '), { violations });
              }
            } catch (error) {
              push('INSTRUMENT_ERROR', 'P1', `axe: ${String(error).slice(0, 140)}`);
            }

            // 4. redirect honesty + transport/ console assertions.
            const requested = new URL(routeDef.route, BASE).pathname;
            const actual = new URL(page.url()).pathname;
            /* r363 — REDIRECT_ALLOWS: the designed bookmark-compat
               redirects (each with its in-code reason), the same
               documented-allow convention as RADIUS_SHADOW_ALLOWS. */
            const REDIRECT_ALLOWS: Record<string, string> = {
              // AdminExtraPages.tsx:636 — /admin/analysis folded into
              // /admin/reports as the trend's table view; old bookmarks
              // keep working by design.
              '/admin/analysis': '/admin/reports',
            };
            const allowedTo = REDIRECT_ALLOWS[requested];
            const isAllowed =
              allowedTo != null &&
              (actual === allowedTo || actual.startsWith(allowedTo + '?'));
            if (actual !== requested && !isAllowed) {
              push('UNEXPECTED_REDIRECT', 'P0', `${requested} → ${actual}`);
            }
            if (missingFixtures.length > 0) {
              push('MISSING_FIXTURE', 'P1', `501s: ${[...new Set(missingFixtures)].slice(0, 6).join(' · ')}`, { endpoints: [...new Set(missingFixtures)] });
            }
            if (consoleErrors.length > 0) {
              push('CONSOLE_ERRORS', 'P1', consoleErrors.slice(0, 4).join(' | '), { errors: consoleErrors.slice(0, 4) });
            }

            cells += 1;
            cellsOk += 1;
            const cellSev = findings.filter((f) => f.width === width && f.theme === theme && f.route === routeDef.route);
            const p0 = cellSev.filter((f) => f.severity === 'P0').length;
            const p1 = cellSev.filter((f) => f.severity === 'P1').length;
            console.log(`  [cell] ${routeDef.route} @${width}/${theme}${routeDef.role === 'PUBLIC' ? '' : ` (${routeDef.role})`} — ${cellSev.length === 0 ? 'clean' : `${cellSev.length} finding(s) P0:${p0} P1:${p1}`}`);
          } catch (err) {
            push('NAVIGATION_ERROR', 'P0', String((err as Error).message).slice(0, 200));
            console.log(`  [cell] ${routeDef.route} @${width}/${theme} — NAVIGATION_ERROR`);
          } finally {
            await ctx.close();
          }
        }
      }
    }

    // Lane catalog (the artifact the CI job uploads).
    mkdirSync(args.reportDir, { recursive: true });
    const catalogPath = join(args.reportDir, `defects-${lane}.json`);
    writeFileSync(catalogPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      base: BASE,
      mode: args.mode,
      lane,
      cells,
      findings,
    }, null, 1));
    const p0 = findings.filter((f) => f.severity === 'P0').length;
    const p1 = findings.filter((f) => f.severity === 'P1').length;
    console.log(`[lane ${lane}] ${cells} cells — ${findings.length} finding(s): P0 ${p0} · P1 ${p1} · P2 ${findings.length - p0 - p1} → ${catalogPath}`);
    allFindings.push(...findings);
  }

  await browser.close();

  // Run summary (house style: defects-summary.md next to the catalogs).
  const byDetector = allFindings.reduce<Record<string, number>>((m, f) => {
    m[f.detector] = (m[f.detector] ?? 0) + 1;
    return m;
  }, {});
  const p0 = allFindings.filter((f) => f.severity === 'P0');
  const p1 = allFindings.filter((f) => f.severity === 'P1');
  mkdirSync(args.reportDir, { recursive: true });
  const summary = [
    `# P4 sweep — ${args.mode}`,
    '',
    `**Base:** ${BASE} · **Generated:** ${new Date().toISOString()}`,
    `**Cells:** ${cellsOk} · **Findings:** ${allFindings.length} — P0 ${p0.length} · P1 ${p1.length} · P2 ${allFindings.length - p0.length - p1.length}`,
    '',
    `**By detector:** ${JSON.stringify(byDetector)}`,
    '',
    '## P0',
    p0.map((f) => `- [${f.lane}/${f.role}] ${f.route} @${f.width}/${f.theme}: ${f.detector} — ${f.detail}`).join('\n') || '_none_',
    '',
    '## P1',
    p1.slice(0, 60).map((f) => `- [${f.lane}/${f.role}] ${f.route} @${f.width}/${f.theme}: ${f.detector} — ${f.detail}`).join('\n') || '_none_',
    '',
  ].join('\n');
  writeFileSync(join(args.reportDir, 'defects-summary.md'), summary);

  console.log(`[SWEEP] ${cellsOk} cells — ${allFindings.length} finding(s): P0 ${p0.length} · P1 ${p1.length} · P2 ${allFindings.length - p0.length - p1.length}`);
  console.log(`[SWEEP] by detector: ${JSON.stringify(byDetector)}`);
  console.log(`[SWEEP] catalogs + summary in ${args.reportDir}`);

  // Gate: 0 clean · 1 any P0/P1 · 2 infra (infra already exited above).
  if (cellsOk === 0) fail('every cell failed — serving or transport infra', 2);
  process.exit(p0.length + p1.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(2);
});
