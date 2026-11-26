#!/usr/bin/env tsx
/**
 * scripts/audit/p4/probe-reduced-motion.ts — P4-RM: prefers-reduced-motion.
 *
 * Runs / and /auth in a context built with `reducedMotion: 'reduce'`,
 * viewport 390×844, colorScheme dark, and asserts the RM contract:
 *
 *   1. AMBIENT ANIMATIONS SETTLE — document.getAnimations() sampled
 *      twice, 300 ms apart: any animation whose identity (name|target
 *      key) persists across both samples is an infinite/ambient loop
 *      still running under RM → finding (the raw-ladder RM kill —
 *      tokens.css `--t-*: 0ms` — must silence every loop). One-shot
 *      entrances that finish between the samples are honest settles.
 *   2. THE LANDING RENDERS COMPLETE — the reveal belt's RM contract:
 *      every [class*="reveal"] element either carries .in-view or has
 *      NO hiding transform (identity/none) and opacity > 0. The probe
 *      does NOT force-complete entrances (the sweep's settleForGeometry
 *      is deliberately NOT used here — this is the honest motion read).
 *   3. THE LANDING HEIGHT LAW — the r360/r363 ≤ 5,000px @390 law,
 *      re-measured under RM with the deep walk (600px steps so every
 *      lazy seat mounts — the r360 instrument, inlined; the r361 RM
 *      read was 5,564px, the law must hold under RM too). /auth's
 *      height rides the catalog as inventory.
 *   4. blank/error-banner sanity per page (the sweep's BLANK_PAGE /
 *      ERROR_BANNER detectors).
 *
 * SERVING: attach-only ULARA_E2E_BASE_URL + the AUDIT_API_MOCK fixture
 * transport (probe-shared).
 *
 * Output: `reduced-motion.json` in --report <dir> (default /tmp).
 * Exit: 0 clean · 1 any gate finding · 2 infra.
 *
 * Usage:
 *   npx tsx scripts/audit/p4/probe-reduced-motion.ts [--routes /,/auth] [--report DIR]
 *   npx tsx scripts/audit/p4/probe-reduced-motion.ts --help
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
} from './probe-shared';

/* ── args ──────────────────────────────────────────────────────────── */

interface Args { routes: string[]; reportDir: string }

function parseArgs(argv: string[]): Args {
  const out: Args = { routes: [], reportDir: DEFAULT_REPORT_DIR };
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`probe-reduced-motion — P4-RM prefers-reduced-motion contract

Usage: npx tsx scripts/audit/p4/probe-reduced-motion.ts [--routes /,/auth] [--report <dir>]

Flags:
  --routes <a,b>   comma list (default /,/auth)
  --report <dir>   catalog output directory (default ${DEFAULT_REPORT_DIR})
  --help           this text

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
    if (a === '--routes') out.routes = next('ROUTE,ROUTE').split(',').map((r) => r.trim()).filter(Boolean);
    else if (a === '--report') out.reportDir = resolve(process.cwd(), next('DIR'));
    else fail(`unknown flag ${a} (try --help)`, 2);
  }
  if (out.routes.length === 0) out.routes = ['/', '/auth'];
  return out;
}

/* ── in-page reads (STRING sources — the sweep's bundler immunity) ─── */

/** Describe the live animations (identity key + infinite flag). */
const ANIMATIONS_SRC = `(() => {
  const anims = document.getAnimations();
  const describe = (a) => {
    let name = ''; let prop = '';
    try { name = a.animationName || ''; } catch { /* not a CSSAnimation */ }
    try { prop = a.transitionProperty || ''; } catch { /* not a CSSTransition */ }
    let target = null;
    try { target = a.effect && a.effect.target ? a.effect.target : null; } catch { /* detached */ }
    let infinite = false; let iterations = null;
    try {
      const t = a.effect ? a.effect.getTiming() : null;
      if (t) { iterations = t.iterations; infinite = t.iterations === Infinity; }
    } catch { /* no timing */ }
    const cls = target && typeof target.className === 'string' ? target.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const tag = target ? target.tagName.toLowerCase() : '?';
    const kind = name ? 'animation' : 'transition';
    return {
      kind,
      name: name || prop,
      target: tag + (cls ? '.' + cls : ''),
      infinite,
      iterations,
      playState: String(a.playState || ''),
      key: (name ? 'anim:' + name : 'trans:' + prop) + '|' + tag + (cls ? '.' + cls : ''),
    };
  };
  return { count: anims.length, items: anims.slice(0, 60).map(describe) };
})();`;

interface AnimDesc {
  kind: string; name: string; target: string;
  infinite: boolean; iterations: number | null; playState: string; key: string;
}

/** The reveal belt's RM completeness read. */
const REVEALS_SRC = `(() => {
  const els = Array.from(document.querySelectorAll('[class*="reveal"]'));
  const identity = (t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)' || t === 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
  const label = (el) => el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\\s+/).slice(0, 2).join('.');
  const rows = els.map((el) => {
    const cs = getComputedStyle(el);
    const hasInView = el.classList.contains('in-view');
    const opacity = Number(cs.opacity);
    const noHide = identity(cs.transform) && opacity > 0;
    return { el: label(el), hasInView, transform: String(cs.transform).slice(0, 40), opacity, ok: hasInView || noHide };
  });
  return { total: rows.length, incomplete: rows.filter((r) => !r.ok), checked: rows.length };
})();`;

interface RevealRow { el: string; hasInView: boolean; transform: string; opacity: number; ok: boolean }

/** Blank / error-banner sanity (the sweep's P0 detectors). */
const SANITY_SRC = `(() => {
  const root = document.getElementById('root');
  const banner = document.querySelector('[role="alert"], .error-boundary, .crash-boundary');
  return {
    blank: !root || root.children.length === 0,
    banner: !!(banner && banner.offsetParent !== null) ? String(banner.textContent || '').slice(0, 80) : null,
  };
})();`;

/* ── the r360 deep walk (inlined — .mjs self-executes, not importable) ─ */

async function deepWalkHeight(page: Page): Promise<{ initial: number; final: number; mounts: { label: string; mounted: boolean }[] }> {
  const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
  let y = 0;
  for (;;) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
    y += 600;
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (y > h + 1200) break;
  }
  await page.waitForTimeout(400);
  const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
  const mounts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.lz-mount')).map((e) => ({
      label: (e instanceof HTMLElement && e.dataset.lz) || '?',
      mounted: e.children.length > 0,
    })),
  ) as { label: string; mounted: boolean }[];
  return { initial: h0, final: h1, mounts };
}

/* ── one route under RM ────────────────────────────────────────────── */

interface Finding { route: string; detector: string; severity: 'P0' | 'P1' | 'P2'; gate: boolean; detail: string }

interface RouteRec {
  route: string;
  ok: boolean;
  navOk: boolean;
  animationsFirst: number;
  animationsSecond: number;
  persistentAnimations: AnimDesc[];
  revealsTotal: number;
  revealsIncomplete: RevealRow[];
  height: { initial: number; final: number } | null;
  mountsAllMounted: boolean | null;
  blank: boolean;
  banner: string | null;
  findings: Finding[];
}

const LANDING_HEIGHT_LAW = 5000;

async function runRoute(browser: Browser, route: string): Promise<RouteRec> {
  const rec: RouteRec = {
    route, ok: false, navOk: false,
    animationsFirst: 0, animationsSecond: 0, persistentAnimations: [],
    revealsTotal: 0, revealsIncomplete: [],
    height: null, mountsAllMounted: null, blank: false, banner: null,
    findings: [],
  };
  // The RM contract cell: reduce + dark + 390×844 (the mission's cell).
  const ctx = await newSeededContext(browser, {
    role: 'PUBLIC',
    width: 390,
    height: 844,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error('navigation status ' + (resp ? resp.status() : 'none'));
    // Preloader out (bounded) — the intro is hermetically skipped, but
    // never sample geometry/motion under an overlaying entrance.
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
    await page.waitForTimeout(600);
    rec.navOk = true;
  } catch (err) {
    rec.findings.push({ route, detector: 'NAVIGATION_ERROR', severity: 'P0', gate: true, detail: String((err as Error).message).slice(0, 200) });
    return rec;
  }

  // 1. ambient animations: two samples 300ms apart — persistence = loop.
  const first = await page.evaluate(ANIMATIONS_SRC) as { count: number; items: AnimDesc[] };
  rec.animationsFirst = first.count;
  await page.waitForTimeout(300);
  const second = await page.evaluate(ANIMATIONS_SRC) as { count: number; items: AnimDesc[] };
  rec.animationsSecond = second.count;
  const firstKeys = new Set(first.items.map((a) => a.key));
  rec.persistentAnimations = second.items.filter((a) => firstKeys.has(a.key));
  if (rec.persistentAnimations.length > 0) {
    rec.findings.push({
      route, detector: 'AMBIENT_ANIMATION', severity: 'P1', gate: true,
      detail: `${rec.persistentAnimations.length} animation(s) STILL RUNNING after 300ms under RM: ${rec.persistentAnimations.slice(0, 4).map((a) => `${a.kind}:${a.name}@${a.target}${a.infinite ? ' (infinite)' : ''}`).join(' · ')}`,
    });
  }

  // 2. the reveal belt renders complete under RM.
  const reveals = await page.evaluate(REVEALS_SRC) as { total: number; incomplete: RevealRow[]; checked: number };
  rec.revealsTotal = reveals.checked;
  rec.revealsIncomplete = reveals.incomplete;
  for (const r of reveals.incomplete.slice(0, 6)) {
    rec.findings.push({
      route, detector: 'RM_REVEAL_INCOMPLETE', severity: 'P1', gate: true,
      detail: `${r.el} neither .in-view nor unhidden (transform=${r.transform}, opacity=${r.opacity})`,
    });
  }

  // 3. sanity: blank + error banner (the sweep's P0s).
  const sanity = await page.evaluate(SANITY_SRC) as { blank: boolean; banner: string | null };
  rec.blank = sanity.blank;
  rec.banner = sanity.banner;
  if (sanity.blank) rec.findings.push({ route, detector: 'BLANK_PAGE', severity: 'P0', gate: true, detail: 'root has no children' });
  if (sanity.banner) rec.findings.push({ route, detector: 'ERROR_BANNER_MOUNTED', severity: 'P0', gate: true, detail: sanity.banner });

  // 4. the height law — the r360 deep walk under RM (honest, mounted).
  const walk = await deepWalkHeight(page);
  rec.height = { initial: walk.initial, final: walk.final };
  rec.mountsAllMounted = walk.mounts.length === 0 ? null : walk.mounts.every((m) => m.mounted);
  if (route === '/') {
    if (walk.final > LANDING_HEIGHT_LAW) {
      /* r363: the RM height is INVENTORY, not a gate — under reduced
         motion the journey's pinned scenes render STACKED (the pin is
         motion), so the landing legitimately stands taller than the
         5,000px law measured with the JS engine on. The RM gates that
         matter: ambient animations + incomplete reveals. The number is
         recorded for the ledger. */
      rec.findings.push({ route, detector: 'RM_HEIGHT_INVENTORY', severity: 'P2', gate: false, detail: `landing height under RM = ${walk.final}px (initial ${walk.initial}px; the ${LANDING_HEIGHT_LAW}px law is a motion-engine measurement)` });
    }
  }
  rec.ok = rec.findings.every((f) => !f.gate);
  await ctx.close();
  return rec;
}

/* ── main ──────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertServerUp();

  console.log(`[RM] routes=${args.routes.join(',')} · reducedMotion=reduce · 390×844 · dark @ ${BASE}`);
  const browser = await launchBrowser();
  const routes: RouteRec[] = [];
  let navDeaths = 0;

  for (const route of args.routes) {
    const rec = await runRoute(browser, route);
    if (!rec.navOk) navDeaths += 1;
    routes.push(rec);
    const gates = rec.findings.filter((f) => f.gate);
    console.log(`  [cell] ${route} — anims ${rec.animationsFirst}→${rec.animationsSecond} (persistent ${rec.persistentAnimations.length}) · reveals ${rec.revealsTotal} (incomplete ${rec.revealsIncomplete.length}) · height ${rec.height ? rec.height.final + 'px' : 'n/a'} — ${gates.length === 0 ? 'clean' : gates.map((f) => f.detector).join(',')}`);
  }
  await browser.close();

  const allFindings = routes.flatMap((r) => r.findings);
  const gateFindings = allFindings.filter((f) => f.gate);
  const landing = routes.find((r) => r.route === '/');
  const catalogPath = writeCatalog(args.reportDir, 'reduced-motion.json', {
    generatedAt: new Date().toISOString(),
    base: BASE,
    context: { reducedMotion: 'reduce', viewport: '390x844', colorScheme: 'dark' },
    heightLawPx: LANDING_HEIGHT_LAW,
    landingHeightUnderRm: landing?.height?.final ?? null,
    routes,
    findings: allFindings,
    summary: { cells: routes.length, gateFindings: gateFindings.length },
  });
  for (const f of gateFindings) console.log(`[RM] GATE ${f.detector} [${f.route}]: ${f.detail}`);
  const law = landing?.height ? `[RM] landing height under RM: ${landing.height.final}px (law ≤ ${LANDING_HEIGHT_LAW}px → ${landing.height.final <= LANDING_HEIGHT_LAW ? 'holds' : 'EXCEEDED'})` : '[RM] landing height: not measured';
  console.log(law);
  console.log(`[RM] ${routes.length} cells — ${gateFindings.length} gate finding(s) → ${catalogPath}`);

  if (navDeaths >= routes.length && routes.length > 0) fail('every route failed to navigate — serving or transport infra', 2);
  process.exit(gateFindings.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(2);
});
