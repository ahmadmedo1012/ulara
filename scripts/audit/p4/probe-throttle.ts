#!/usr/bin/env tsx
/**
 * scripts/audit/p4/probe-throttle.ts — P4-THROTTLE: slow-3G + CPU 4×.
 *
 * The honest first-paint cell: CDP `Network.emulateNetworkConditions`
 * (Slow-3G: 400 ms RTT / 400 kbps down / 100 kbps up) + CDP
 * `Emulation.setCPUThrottlingRate(4)` — installed BEFORE the navigation
 * so the document fetch itself rides the throttled pipe — then, per
 * route, the probe asserts:
 *
 *   · CORE CONTENT PAINTS within 12 s — the route's title (the landing
 *     hero h1 / the auth form h1 / the shell's PageHeader h1) becomes
 *     VISIBLE (bounding box + not hidden) within the budget; the
 *     measured paint time is recorded per route in the catalog.
 *   · 0 console ERRORS / pageerrors (the sweep's CONSOLE_ERRORS
 *     detector; fixture 501s elevate to MISSING_FIXTURE exactly like
 *     the sweep).
 *   · 0 BLANK — #root has children and no [role=alert]/error-boundary
 *     banner is mounted (the sweep's BLANK_PAGE + ERROR_BANNERMounted
 *     P0 detectors).
 *
 * The API stays hermetic and instant BY DESIGN: the AUDIT_API_MOCK
 * fixture transport fulfils /api/** at the Playwright routing layer
 * (no network I/O), so the throttled pipe carries exactly what a real
 * cold start would carry — the JS/CSS of the production build. That is
 * the honest measurement: data-facts are fixture work, first paint is
 * bundle work.
 *
 * Routes: / + /auth + one role page (/student/courses).
 * SERVING: attach-only ULARA_E2E_BASE_URL (probe-shared).
 *
 * Output: `throttle.json` in --report <dir> (default /tmp).
 * Exit: 0 clean · 1 any gate finding · 2 infra.
 *
 * Usage:
 *   npx tsx scripts/audit/p4/probe-throttle.ts [--cpu 4] [--timeout 12000] [--report DIR]
 *   npx tsx scripts/audit/p4/probe-throttle.ts --help
 */
import type { Browser, Page } from 'playwright';

import {
  assertServerUp,
  BASE,
  DEFAULT_REPORT_DIR,
  fail,
  launchBrowser,
  newSeededContext,
  reportDirFlag,
  resolve,
  writeCatalog,
  type Role,
} from './probe-shared';

/* ── args ──────────────────────────────────────────────────────────── */

interface Args { cpu: number; paintBudgetMs: number; reportDir: string }

function parseArgs(argv: string[]): Args {
  const out: Args = { cpu: 4, paintBudgetMs: 12000, reportDir: DEFAULT_REPORT_DIR };
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`probe-throttle — P4-THROTTLE slow-3G + CPU throttling first-paint gate

Usage: npx tsx scripts/audit/p4/probe-throttle.ts [--cpu 4] [--timeout 12000] [--report <dir>]

Flags:
  --cpu <n>        CPU throttling rate (default 4)
  --timeout <ms>   core-content paint budget (default 12000)
  --report <dir>   catalog output directory (default ${DEFAULT_REPORT_DIR})
  --help           this text

Network (fixed Slow-3G): 400ms RTT · 400 kbps down · 100 kbps up.
Exit: 0 clean · 1 any gate finding · 2 infra.
Serving: ULARA_E2E_BASE_URL (default ${BASE}) — attach-only, never boots.`);
    process.exit(0);
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (what: string): string => {
      const v = argv[i + 1];
      if (v === undefined) fail(`flag ${a} needs a value (${what})`, 2);
      i += 1;
      return v;
    };
    if (a === '--cpu') out.cpu = Number(next('N'));
    else if (a === '--timeout') out.paintBudgetMs = Number(next('MS'));
    else if (a === '--report') out.reportDir = resolve(process.cwd(), next('DIR'));
    else fail(`unknown flag ${a} (try --help)`, 2);
  }
  if (!Number.isFinite(out.cpu) || out.cpu < 1) fail(`--cpu ${out.cpu} — want a number ≥ 1`, 2);
  if (!Number.isFinite(out.paintBudgetMs) || out.paintBudgetMs < 1000) fail(`--timeout ${out.paintBudgetMs} — want ms ≥ 1000`, 2);
  return out;
}

/* ── the route plan: landing + auth + one role page ────────────────── */

interface ThrottleRoute {
  route: string;
  role: Role;
  titleSel: string;
  what: string;
}

const PLAN: ThrottleRoute[] = [
  { route: '/', role: 'PUBLIC', titleSel: 'h1.hro-title', what: 'hero title' },
  { route: '/auth', role: 'PUBLIC', titleSel: 'h1.auth-form-title', what: 'auth form title' },
  { route: '/student/courses', role: 'STUDENT', titleSel: 'h1.pf-page-title', what: 'page title' },
];

const SLOW3G = {
  offline: false,
  latency: 400, // ms RTT
  downloadThroughput: 400 * 1024 / 8, // 400 kbps → 50 KB/s
  uploadThroughput: 100 * 1024 / 8, // 100 kbps → 12.5 KB/s
} as const;

/* ── one throttled cell ────────────────────────────────────────────── */

interface Finding { route: string; detector: string; severity: 'P0' | 'P1' | 'P2'; gate: boolean; detail: string }

interface RouteRec {
  route: string;
  ok: boolean;
  navOk: boolean;
  titleSel: string;
  paintMs: number | null;
  paintBudgetMs: number;
  painted: boolean;
  consoleErrors: string[];
  missingFixtures: string[];
  blank: boolean;
  banner: string | null;
  findings: Finding[];
}

async function runRoute(browser: Browser, def: ThrottleRoute, args: Args): Promise<RouteRec> {
  const rec: RouteRec = {
    route: def.route, ok: false, navOk: false,
    titleSel: def.titleSel, paintMs: null, paintBudgetMs: args.paintBudgetMs,
    painted: false, consoleErrors: [], missingFixtures: [],
    blank: false, banner: null, findings: [],
  };
  const ctx = await newSeededContext(browser, { role: def.role, width: 390 });
  const page = await ctx.newPage();

  // The detectors listen from byte zero (a throttled cold start must
  // not get credit for errors fired during the wait).
  page.on('response', (res) => {
    if (res.status() === 501) rec.missingFixtures.push(res.request().method() + ' ' + new URL(res.url()).pathname);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      const fixture = t.match(/no fixture for (\w+ [^ ]+)/);
      if (fixture?.[1]) rec.missingFixtures.push(fixture[1]);
      else rec.consoleErrors.push(t.slice(0, 160));
    }
  });
  page.on('pageerror', (e) => rec.consoleErrors.push(String(e.message).slice(0, 160)));

  try {
    // CDP throttling in place BEFORE the navigation — the document
    // fetch itself rides the slow pipe (the honest cold start).
    const session = await ctx.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', { ...SLOW3G });
    await session.send('Emulation.setCPUThrottlingRate', { rate: args.cpu });

    const t0 = Date.now();
    await page.goto(BASE + def.route, { waitUntil: 'commit', timeout: 60000 });
    const painted = await page
      .waitForSelector(def.titleSel, { state: 'visible', timeout: args.paintBudgetMs })
      .then(() => true)
      .catch(() => false);
    rec.paintMs = Date.now() - t0;
    rec.painted = painted;
    rec.navOk = true;
    if (!painted) {
      rec.findings.push({
        route: def.route, detector: 'PAINT_TIMEOUT', severity: 'P0', gate: true,
        detail: `the ${def.what} (${def.titleSel}) did not paint within ${args.paintBudgetMs}ms under slow-3G + CPU ${args.cpu}× (measured ${rec.paintMs}ms)`,
      });
    } else if (rec.paintMs > args.paintBudgetMs) {
      rec.findings.push({
        route: def.route, detector: 'PAINT_TIMEOUT', severity: 'P0', gate: true,
        detail: `paint measured ${rec.paintMs}ms > budget ${args.paintBudgetMs}ms`,
      });
    }

    // Bounded settle (preloader/entrance out) — NOT part of the paint
    // budget; only the blank/banner detectors read after this.
    await page.waitForFunction(
      `(() => {
         const layer = document.querySelector('[data-preloader], .pl-');
         if (!layer) return true;
         const cs = getComputedStyle(layer);
         return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
       })()`,
      undefined,
      { timeout: 8000 },
    ).catch(() => { /* bounded — proceed */ });
    await page.waitForTimeout(500);

    const sanity = await page.evaluate(`(() => {
      const root = document.getElementById('root');
      const banner = document.querySelector('[role="alert"], .error-boundary, .crash-boundary');
      return {
        blank: !root || root.children.length === 0,
        banner: banner && banner.offsetParent !== null ? String(banner.textContent || '').slice(0, 80) : null,
      };
    })();`) as { blank: boolean; banner: string | null };
    rec.blank = sanity.blank;
    rec.banner = sanity.banner;
    if (sanity.blank) rec.findings.push({ route: def.route, detector: 'BLANK_PAGE', severity: 'P0', gate: true, detail: 'root has no children' });
    if (sanity.banner) rec.findings.push({ route: def.route, detector: 'ERROR_BANNER_MOUNTED', severity: 'P0', gate: true, detail: sanity.banner });
  } catch (err) {
    rec.findings.push({ route: def.route, detector: 'NAVIGATION_ERROR', severity: 'P0', gate: true, detail: String((err as Error).message).slice(0, 200) });
    await ctx.close();
    return rec;
  }

  // Transport/console detectors (sweep-exact).
  if (rec.missingFixtures.length > 0) {
    rec.findings.push({ route: def.route, detector: 'MISSING_FIXTURE', severity: 'P1', gate: true, detail: `501s: ${[...new Set(rec.missingFixtures)].slice(0, 6).join(' · ')}` });
  }
  if (rec.consoleErrors.length > 0) {
    rec.findings.push({ route: def.route, detector: 'CONSOLE_ERRORS', severity: 'P1', gate: true, detail: rec.consoleErrors.slice(0, 4).join(' | ') });
  }
  rec.ok = rec.findings.every((f) => !f.gate);
  await ctx.close();
  return rec;
}

/* ── main ──────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertServerUp();

  console.log(`[3G] routes=${PLAN.map((p) => p.route).join(',')} · slow-3G (400ms RTT / 400↓ / 100↑ kbps) + CPU ${args.cpu}× · paint budget ${args.paintBudgetMs}ms @ ${BASE}`);
  const browser = await launchBrowser();
  const routes: RouteRec[] = [];
  let navDeaths = 0;

  for (const def of PLAN) {
    const rec = await runRoute(browser, def, args);
    if (!rec.navOk) navDeaths += 1;
    routes.push(rec);
    const gates = rec.findings.filter((f) => f.gate);
    console.log(`  [cell] ${def.route} — paint ${rec.paintMs !== null ? rec.paintMs + 'ms' : 'n/a'} (budget ${args.paintBudgetMs}ms) ${rec.painted ? '✓' : '✗'} · console ${rec.consoleErrors.length} · blank ${rec.blank ? 'YES' : 'no'} — ${gates.length === 0 ? 'clean' : gates.map((f) => f.detector).join(',')}`);
  }
  await browser.close();

  const allFindings = routes.flatMap((r) => r.findings);
  const gateFindings = allFindings.filter((f) => f.gate);
  const catalogPath = writeCatalog(args.reportDir, 'throttle.json', {
    generatedAt: new Date().toISOString(),
    base: BASE,
    network: SLOW3G,
    cpuRate: args.cpu,
    paintBudgetMs: args.paintBudgetMs,
    routes,
    findings: allFindings,
    summary: { cells: routes.length, gateFindings: gateFindings.length },
  });
  for (const f of gateFindings) console.log(`[3G] GATE ${f.detector} [${f.route}]: ${f.detail}`);
  console.log(`[3G] paints: ${routes.map((r) => `${r.route}=${r.paintMs !== null ? r.paintMs + 'ms' : 'n/a'}`).join(' · ')}`);
  console.log(`[3G] ${routes.length} cells — ${gateFindings.length} gate finding(s) → ${catalogPath}`);

  if (navDeaths >= routes.length && routes.length > 0) fail('every route failed to navigate — serving or transport infra', 2);
  process.exit(gateFindings.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(2);
});
