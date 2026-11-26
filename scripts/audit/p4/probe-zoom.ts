#!/usr/bin/env tsx
/**
 * scripts/audit/p4/probe-zoom.ts — P4-ZOOM: the 200% TEXT-ZOOM probe.
 *
 * WCAG 1.4.4 (resize text) as a RE-FLOW gate: every cell runs TWICE at
 * the same viewport — a 100% baseline, then a 200% cell — and the gate
 * is on the DELTA:
 *
 *   · 0 horizontal overflow at 200% (documentElement.scrollWidth may
 *     not exceed the viewport);
 *   · 0 NEW glyph-ink text collisions at 200% (the r362 COLLECT source,
 *     verbatim from sweep.ts — a collision seen at 200 that the 100%
 *     baseline does not show is new re-flow damage);
 *   · tap-target census re-run at 200% — NEW sub-44px interactive
 *     targets ride the catalog as inventory (P2, non-gating, the sweep's
 *     P2 convention: inventory reports, the gate stays the P0s above).
 *
 * THE HONEST EMULATION — the r362 type-scale root: the app's fluid rem
 * root (frontend/src/styles/tokens/tokens.css R313) is raw vw bands
 * (base 0.5787vw · ≤991px 1.19904vw · ≤767px 2.54453vw) with NO
 * --root-fluid variable, so the probe measures the live computed root
 * font-size and injects `html { font-size: <2×measured>px !important }`
 * — doubling the ROOT REM BASIS exactly, in whatever band the viewport
 * sits. CDP setPageScaleFactor is pinch-zoom (no re-flow) — never used.
 * The probe widths (320 / 390) are the half viewports of 640 / 780:
 * phone CSS width + rem×2 is the honest 200%-text-reflow cell.
 *
 * Routes (the sweep-ux lane's set): / + /auth + /student/courses +
 * /quality/notifications. SERVING: attach-only ULARA_E2E_BASE_URL + the
 * AUDIT_API_MOCK fixture transport (probe-shared).
 *
 * Output: `zoom-200.json` in --report <dir> (default /tmp).
 * Exit: 0 clean · 1 any gate finding (overflow/NEW collisions) · 2 infra.
 *
 * Usage:
 *   npx tsx scripts/audit/p4/probe-zoom.ts [--routes /,/auth] [--widths 320,390] [--report DIR]
 *   npx tsx scripts/audit/p4/probe-zoom.ts --help
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
  settleForGeometry,
  writeCatalog,
  type Role,
} from './probe-shared';

/* ── args ──────────────────────────────────────────────────────────── */

interface Args {
  routes: string[];
  widths: number[];
  reportDir: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { routes: [], widths: [], reportDir: DEFAULT_REPORT_DIR };
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`probe-zoom — P4-ZOOM 200% text-zoom re-flow gate

Usage: npx tsx scripts/audit/p4/probe-zoom.ts [--routes /,/auth,...] [--widths 320,390] [--report <dir>]

Flags:
  --routes <a,b>   comma list of routes (default /,/auth,/student/courses,/quality/notifications)
  --widths <n,n>   phone widths (default 320,390 — the half viewports of 640/780)
  --report <dir>   catalog output directory (default ${DEFAULT_REPORT_DIR})
  --help           this text

Exit: 0 clean · 1 any gate finding (overflow@200 / NEW collisions@200) · 2 infra.
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
    else if (a === '--widths') out.widths = next('N,N').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
    else if (a === '--report') out.reportDir = resolve(process.cwd(), next('DIR'));
    else fail(`unknown flag ${a} (try --help)`, 2);
  }
  if (out.routes.length === 0) out.routes = ['/', '/auth', '/student/courses', '/quality/notifications'];
  if (out.widths.length === 0) out.widths = [320, 390];
  return out;
}

/* ── the role map for the default route set (sweep lane mapping) ───── */

const ROLE_FOR: Record<string, Role> = {
  '/': 'PUBLIC',
  '/auth': 'PUBLIC',
  '/student/courses': 'STUDENT',
  '/quality/notifications': 'QUALITY',
};
function roleFor(route: string): Role {
  if (ROLE_FOR[route]) return ROLE_FOR[route];
  if (route.startsWith('/student')) return 'STUDENT';
  if (route.startsWith('/teacher')) return 'TEACHER';
  if (route.startsWith('/admin')) return 'ADMIN';
  if (route.startsWith('/quality')) return 'QUALITY';
  if (route.startsWith('/owner')) return 'OWNER';
  if (route.startsWith('/institution')) return 'ADMIN';
  return 'PUBLIC';
}

/* ── r362-overlap COLLECT — verbatim from sweep.ts (bundler immunity:
 *    page.evaluate(fn) ships the function's text through the bundler,
 *    which injects its __name helper; a plain string is immune) ───── */

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

interface Collision { a: string; b: string; aText: string; bText: string; area: number; ratio: number }
interface CollectResult {
  collisions: Collision[];
  clipped: { el: string; text: string; scrollW: number; clientW: number; axis: string }[];
  overflow: number;
}

/* ── the tap-target census (the r358 SMALL_TAP_TARGETS section, with
 *    the r363 skip-link exemption) as a standalone string probe ────── */

const tapSrc = (curWidth: number): string => `(function () {
  const viewportWidth = ${curWidth};
  const small = [];
  if (viewportWidth >= 768) return small; /* the r358 width gate */
  const interactives = document.querySelectorAll('button, a, input, select, textarea, summary, [role="button"], [role="tab"]');
  for (const el of Array.from(interactives)) {
    /* r363 — the SKIP-LINK exemption (the WCAG 2.5.8 target-size
       keyboard/inline exception). */
    if (el.closest('.skip-link')) continue;
    const target = el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)
      ? el.closest('label') ?? el : el;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (Math.round(rect.width) < 44 || Math.round(rect.height) < 44) {
      small.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').slice(0, 26).trim(), w: Math.round(rect.width), h: Math.round(rect.height) });
    }
  }
  return small;
})();`;

interface SmallTarget { tag: string; text: string; w: number; h: number }

const collisionKey = (c: Collision): string => `${c.a}|${c.b}|${c.aText}|${c.bText}`;
const tapKey = (t: SmallTarget): string => `${t.tag}|${t.text}`;

/* ── one cell: baseline 100% → inject rem×2 → 200% ─────────────────── */

interface CellRec {
  route: string;
  width: number;
  role: Role;
  ok: boolean;
  rootPx100: number;
  rootPx200: number;
  overflow100: number;
  overflow200: number;
  collisions100: number;
  collisions200: number;
  newCollisions: Collision[];
  tap100: number;
  tap200: number;
  newTaps: SmallTarget[];
  findings: { detector: string; severity: 'P0' | 'P1' | 'P2'; gate: boolean; detail: string }[];
}

async function runCell(browser: Browser, route: string, width: number): Promise<CellRec> {
  const role = roleFor(route);
  const rec: CellRec = {
    route, width, role, ok: false,
    rootPx100: 0, rootPx200: 0, overflow100: 0, overflow200: 0,
    collisions100: 0, collisions200: 0, newCollisions: [],
    tap100: 0, tap200: 0, newTaps: [], findings: [],
  };
  const ctx = await newSeededContext(browser, { role, width });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error('navigation status ' + (resp ? resp.status() : 'none'));
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await settleForGeometry(page);

    // The 100% baseline.
    rec.rootPx100 = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const geo100 = await page.evaluate(COLLECT_SRC) as CollectResult;
    const tap100 = await page.evaluate(tapSrc(width)) as SmallTarget[];
    rec.overflow100 = geo100.overflow;
    rec.collisions100 = geo100.collisions.length;
    rec.tap100 = tap100.length;

    // The 200% cell: double the LIVE computed root (the R313 fluid root
    // has no variable — see the header) and let the re-flow land.
    const rootPx2 = Math.round(rec.rootPx100 * 2 * 100) / 100;
    await page.addStyleTag({ content: `html { font-size: ${rootPx2}px !important; }` });
    await page.waitForTimeout(300);
    const rootNow = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (Math.abs(rootNow - rootPx2) > 0.5) {
      fail(`zoom injection did not take on ${route}@${width} (computed root ${rootNow}px ≠ injected ${rootPx2}px) — style layer broken`, 2);
    }
    rec.rootPx200 = rootNow;

    const geo200 = await page.evaluate(COLLECT_SRC) as CollectResult;
    const tap200 = await page.evaluate(tapSrc(width)) as SmallTarget[];
    rec.overflow200 = geo200.overflow;
    rec.collisions200 = geo200.collisions.length;

    const seen100 = new Set(geo100.collisions.map(collisionKey));
    rec.newCollisions = geo200.collisions.filter((c) => !seen100.has(collisionKey(c)));
    const seenTaps100 = new Set(tap100.map(tapKey));
    rec.newTaps = tap200.filter((t) => !seenTaps100.has(tapKey(t)));

    if (rec.overflow200 > 1) {
      rec.findings.push({ detector: 'HORIZONTAL_OVERFLOW_ZOOM', severity: 'P0', gate: true, detail: `@200% scrollWidth exceeds viewport by ${rec.overflow200}px (100% baseline: ${rec.overflow100 > 1 ? '+' + rec.overflow100 : 'clean'})` });
    }
    for (const c of rec.newCollisions) {
      rec.findings.push({ detector: 'TEXT_COLLISION_ZOOM', severity: 'P0', gate: true, detail: `NEW @200%: "${c.aText}" × "${c.bText}" ink area=${c.area}px² ratio=${c.ratio} (${c.a} × ${c.b})` });
    }
    // NEW sub-44px targets at 200% — inventory (P2, non-gating).
    for (const t of rec.newTaps.slice(0, 8)) {
      rec.findings.push({ detector: 'SMALL_TAP_TARGET_ZOOM', severity: 'P2', gate: false, detail: `NEW @200%: ${t.tag} "${t.text}" ${t.w}×${t.h}px` });
    }
    rec.ok = rec.findings.every((f) => !f.gate);
  } catch (err) {
    rec.findings.push({ detector: 'NAVIGATION_ERROR', severity: 'P0', gate: true, detail: String((err as Error).message).slice(0, 200) });
    rec.ok = false;
  } finally {
    await ctx.close();
  }
  return rec;
}

/* ── main ──────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertServerUp();

  console.log(`[ZOOM] ${args.routes.length} routes × ${args.widths.length} widths × (100% baseline + rem×2) @ ${BASE}`);
  const browser = await launchBrowser();
  const cells: CellRec[] = [];
  let navDeaths = 0;

  for (const route of args.routes) {
    for (const width of args.widths) {
      const rec = await runCell(browser, route, width);
      if (rec.findings.some((f) => f.detector === 'NAVIGATION_ERROR')) navDeaths += 1;
      cells.push(rec);
      const gates = rec.findings.filter((f) => f.gate);
      console.log(`  [cell] ${route} @${width} — root ${rec.rootPx100.toFixed(2)}→${rec.rootPx200.toFixed(2)}px · overflow ${rec.overflow100}/${rec.overflow200} · collisions ${rec.collisions100}/${rec.collisions200} (NEW ${rec.newCollisions.length}) · taps ${rec.tap100}/${rec.tap200} (NEW ${rec.newTaps.length}) — ${gates.length === 0 ? 'clean' : gates.map((f) => f.detector).join(',')}`);
    }
  }
  await browser.close();

  const allFindings = cells.flatMap((c) => c.findings.map((f) => ({ ...f, route: c.route, width: c.width })));
  const gateFindings = allFindings.filter((f) => f.gate);
  const catalogPath = writeCatalog(args.reportDir, 'zoom-200.json', {
    generatedAt: new Date().toISOString(),
    base: BASE,
    widths: args.widths,
    routes: args.routes,
    emulation: 'html { font-size: <2×live computed root>px !important } — the R313 fluid root is raw vw bands (no variable); measured-then-doubled',
    cells,
    findings: allFindings,
    summary: { cells: cells.length, gateFindings: gateFindings.length, inventory: allFindings.length - gateFindings.length },
  });
  for (const f of gateFindings) console.log(`[ZOOM] GATE ${f.detector} [${f.route}@${f.width}]: ${f.detail}`);
  console.log(`[ZOOM] ${cells.length} cells — ${gateFindings.length} gate finding(s), ${allFindings.length - gateFindings.length} inventory → ${catalogPath}`);

  if (navDeaths >= cells.length && cells.length > 0) fail('every cell failed to navigate — serving or transport infra', 2);
  process.exit(gateFindings.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(2);
});
