#!/usr/bin/env tsx
/**
 * scripts/audit/p4/probe-keyboard.ts — P4-KBD: the KEYBOARD-ONLY probe.
 *
 * Walks the five main journeys driving NOTHING but page.keyboard
 * (Tab / Shift+Tab / Enter / Escape / arrows / typing — zero mouse
 * clicks, zero element.click(), zero locator.focus()):
 *
 *   1. auth→login            guest: /auth → fill the form → submit → role home
 *   2. student: courses→lecture detail
 *                            /student/courses → offering → lecture player
 *   3. teacher: dashboard→live
 *                            /teacher/dashboard → sidebar → /teacher/live
 *   4. admin: dashboard→courses
 *                            /admin/dashboard → sidebar → /admin/courses
 *   5. institution: dashboard
 *                            /institution → workspace nav item
 *
 * Per journey the probe asserts (each an explicit step in the catalog):
 *   (a) FOCUS ADVANCES — document.activeElement changes on every Tab for
 *       N steps (no consecutive repeat = no trap) and covers ≥ 6
 *       distinct stops;
 *   (b) the PRIMARY ACTION is keyboard-REACHABLE (found within a bounded
 *       Tab budget of 80 stops) and Enter ACTIVATES it (the URL changes —
 *       login submit → role home; course card → offering page; nav item
 *       → target route);
 *   (c) ESCAPE CLOSES an opened overlay and focus RETURNS to the trigger
 *       — the shell's notification bell (aria-expanded syncs; the
 *       overlayStack contract returns focus to the trigger);
 *   (d) the SKIP LINK (a.skip-link) is the FIRST Tab stop and Enter
 *       jumps focus to #main (the r305 contract).
 *
 * SERVING: attach-only ULARA_E2E_BASE_URL + the AUDIT_API_MOCK fixture
 * transport (probe-shared) — DB-less, network-less, like the sweep.
 *
 * Output: `keyboard-journeys.json` in --report <dir> (default /tmp) —
 * flat step records { journey, step, ok, detail }.
 * Exit: 0 all steps pass · 1 any step fails (gate) · 2 infra.
 *
 * Usage:
 *   npx tsx scripts/audit/p4/probe-keyboard.ts [--report /tmp/p4ux]
 *   npx tsx scripts/audit/p4/probe-keyboard.ts --help
 */
import { resolve } from 'node:path';

import type { Page } from 'playwright';

import {
  assertServerUp,
  BASE,
  DEFAULT_REPORT_DIR,
  fail,
  launchBrowser,
  newSeededContext,
  reportDirFlag,
  writeCatalog,
} from './probe-shared';

import { DEMO_PASSWORD, VALID_LOGIN } from '../../../frontend/tests/e2e/fixtures/api-fixtures';

/* ── args ──────────────────────────────────────────────────────────── */

const WIDTH = 1440; // the r305 keyboard-contract viewport (desktop shell)
const HEIGHT = 900;
const WALK_STEPS = 12; // (a) focus-advance walk length
const MIN_DISTINCT = 6; // (a) distinct stops required within the walk
const TAB_BUDGET = 80; // (b) bounded reachability budget

function parseArgs(argv: string[]): { reportDir: string } {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`probe-keyboard — P4-KBD keyboard-only journeys (five journeys, keyboard-only)

Usage: npx tsx scripts/audit/p4/probe-keyboard.ts [--report <dir>]

Flags:
  --report <dir>   catalog output directory (default ${DEFAULT_REPORT_DIR})
  --help           this text

Exit: 0 clean · 1 any step fails · 2 infra (server down, navigation dead).
Serving: ULARA_E2E_BASE_URL (default ${BASE}) — attach-only, never boots.`);
    process.exit(0);
  }
  for (const a of argv) {
    if (a.startsWith('--') && a !== '--report') fail(`unknown flag ${a} (try --help)`, 2);
  }
  return { reportDir: resolve(reportDirFlag(argv) ?? DEFAULT_REPORT_DIR) };
}

/* ── step ledger ───────────────────────────────────────────────────── */

interface StepRec { journey: string; step: string; ok: boolean; detail: string }

const steps: StepRec[] = [];

/* ── in-page reads (STRING sources — the sweep's bundler immunity) ─── */

/** Descriptor of the currently focused element (+ the match fields). */
const ACTIVE_SRC = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) {
    return { present: false, key: '', desc: 'no-focused-element', isSkip: false, isMain: false, href: '', expanded: null };
  }
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
  const text = (el.textContent || '').trim().slice(0, 30);
  const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') || '' : '';
  const r = el.getBoundingClientRect();
  const at = Math.round(r.left) + ',' + Math.round(r.top);
  return {
    present: true,
    key: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '') + '|' + text + '@' + at,
    desc: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '') + (text ? ' "' + text + '"' : '') + (href ? ' → ' + href : '') + ' @' + at,
    isSkip: !!(el.closest && el.closest('a.skip-link')),
    isMain: el.id === 'main',
    href,
    expanded: el.getAttribute('aria-expanded'),
  };
})()`;

interface ActiveInfo {
  present: boolean;
  key: string;
  desc: string;
  isSkip: boolean;
  isMain: boolean;
  href: string;
  expanded: string | null;
}

async function readActive(page: Page): Promise<ActiveInfo> {
  return page.evaluate(ACTIVE_SRC) as Promise<ActiveInfo>;
}

/** The in-page match for TabUntil — kind/arg are probe-internal constants. */
function matchExpr(kind: 'selector' | 'href-suffix' | 'href-prefix-other', arg: string): string {
  const a = JSON.stringify(arg);
  if (kind === 'selector') return `!!(el && el.matches(${a}))`;
  if (kind === 'href-suffix') {
    return `!!(el && el instanceof HTMLAnchorElement && info.href !== '' && info.href.split('?')[0].endsWith(${a}) && info.href.split('?')[0] !== location.pathname)`;
  }
  return `!!(el && el instanceof HTMLAnchorElement && info.href !== '' && info.href.split('?')[0].startsWith(${a}) && info.href.split('?')[0] !== location.pathname)`;
}

/* ── keyboard primitives ───────────────────────────────────────────── */

/** One Tab + the focused-element read. */
async function tabOnce(page: Page): Promise<ActiveInfo> {
  await page.keyboard.press('Tab');
  return readActive(page);
}

/** Press Tab until the focused element matches — bounded. Returns null
 *  when the budget runs out (the reachability failure). */
async function tabUntil(
  page: Page,
  kind: 'selector' | 'href-suffix' | 'href-prefix-other',
  arg: string,
): Promise<ActiveInfo | null> {
  for (let i = 0; i < TAB_BUDGET; i++) {
    const info = await tabOnce(page);
    const hit = await page.evaluate(`(() => {
      const el = document.activeElement;
      const cls = el && typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      const text = el ? (el.textContent || '').trim().slice(0, 30) : '';
      const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') || '' : '';
      const info = { href };
      return ${matchExpr(kind, arg)};
    })()`);
    if (hit) return info;
  }
  return null;
}

/** (d) first Tab = the skip link; Enter jumps to #main. Assumes the
 *  page just settled with focus near <body>. On a d1 FAIL the probe
 *  does NOT press Enter (the first stop may be a navigation link —
 *  pressing it would hijack the journey) and reports both steps; the
 *  CALLER decides whether to continue the journey (it does — every
 *  remaining contract still gets measured). */
async function skipLinkContract(page: Page, journey: string): Promise<boolean> {
  const first = await tabOnce(page);
  const firstOk = first.present && first.isSkip;
  steps.push({
    journey,
    step: 'd1-first-tab-is-skip-link',
    ok: firstOk,
    detail: firstOk
      ? `first Tab stop = ${first.desc}`
      : `first Tab stop is NOT a.skip-link (got: ${first.desc}) — the skip-link-first contract (r305) fails here`,
  });
  if (!firstOk) {
    steps.push({ journey, step: 'd2-skip-enter-lands-main', ok: false, detail: 'NOT RUN — d1 failed; pressing Enter on a non-skip first stop could navigate away' });
    return false;
  }
  await page.keyboard.press('Enter');
  const landed = await page
    .waitForFunction(
      `(() => {
         const a = document.activeElement;
         const main = document.getElementById('main');
         return a != null && main != null && (a === main || (a.contains && a.contains(main)));
       })()`,
      undefined,
      { timeout: 3000 },
    )
    .then(() => true)
    .catch(() => false);
  const at = await readActive(page);
  steps.push({
    journey,
    step: 'd2-skip-enter-lands-main',
    ok: landed,
    detail: landed
      ? `Enter on the skip link jumped to #main (${at.desc})`
      : `Enter on the skip link did NOT land focus on #main (got: ${at.desc})`,
  });
  return landed;
}

/** (a) N Tabs — activeElement must change on every step (no trap) and
 *  cover ≥ MIN_DISTINCT distinct stops. An ISOLATED focus-drop (one Tab
 *  landing on <body> — usually a re-render dismounting the focused
 *  element mid-walk) recovers with the next Tab (recorded); TWO
 *  consecutive drops or a repeated stop is a trap. */
async function focusAdvanceWalk(page: Page, journey: string): Promise<boolean> {
  const keys: string[] = [];
  let trappedAt = -1;
  let drops = 0;
  for (let i = 0; i < WALK_STEPS; i++) {
    const info = await tabOnce(page);
    if (!info.present) {
      drops += 1;
      const prev = keys[keys.length - 1];
      if (prev === '∅') { trappedAt = i; keys.push('∅'); continue; } // consecutive drop = trap
      keys.push('∅');
      continue;
    }
    if (keys.length > 0 && keys[keys.length - 1] === info.key) { trappedAt = i; keys.push(info.key); continue; }
    keys.push(info.key);
  }
  const distinct = new Set(keys.filter((k) => k !== '∅')).size;
  const ok = trappedAt === -1 && distinct >= MIN_DISTINCT;
  steps.push({
    journey,
    step: 'a-focus-advances',
    ok,
    detail: ok
      ? `${WALK_STEPS} Tabs → ${distinct} distinct stops, no trap${drops > 0 ? ` (${drops} isolated focus-drop(s) recovered)` : ''}`
      : trappedAt >= 0
        ? `focus TRAPPED at Tab #${trappedAt + 1} (${keys[trappedAt] === '∅' ? 'focus fell to <body> twice in a row' : `repeat of ${keys[trappedAt] ?? '?'}`}) — stops: ${keys.slice(0, 6).join(' ␣ ')}`
        : `only ${distinct} distinct stops in ${WALK_STEPS} Tabs (want ≥ ${MIN_DISTINCT})`,
  });
  return ok;
}

/** (c) open the shell overlay (notification bell) and Escape-close it —
 *  focus must RETURN to the trigger and aria-expanded must clear. */
async function overlayEscapeContract(page: Page, journey: string): Promise<boolean> {
  const trig = await tabUntil(page, 'selector', '.topbar-notif');
  if (!trig) {
    steps.push({ journey, step: 'c-overlay-escape-returns', ok: false, detail: `.topbar-notif not reachable within ${TAB_BUDGET} Tabs` });
    return false;
  }
  await page.keyboard.press('Enter');
  const opened = await page
    .waitForFunction(
      `(() => {
         const t = document.querySelector('.topbar-notif');
         if (!t) return false;
         if (t.getAttribute('aria-expanded') === 'true') return true;
         const dlg = document.querySelector('[role="dialog"]');
         return !!(dlg && dlg.getBoundingClientRect().height > 0);
       })()`,
      undefined,
      { timeout: 4000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    steps.push({ journey, step: 'c-overlay-escape-returns', ok: false, detail: 'Enter on the bell did NOT open the notification panel (aria-expanded stayed false, no visible dialog)' });
    return false;
  }
  await page.keyboard.press('Escape');
  const closed = await page
    .waitForFunction(
      `(() => {
         const t = document.querySelector('.topbar-notif');
         if (!t) return false;
         const a = document.activeElement;
         return t.getAttribute('aria-expanded') !== 'true' && a === t;
       })()`,
      undefined,
      { timeout: 4000 },
    )
    .then(() => true)
    .catch(() => false);
  const at = await readActive(page);
  steps.push({
    journey,
    step: 'c-overlay-escape-returns',
    ok: closed,
    detail: closed
      ? 'Escape closed the notification panel; focus returned to the bell trigger'
      : `Escape did NOT close+refocus (expanded=${at.expanded}, focused=${at.desc})`,
  });
  return closed;
}

/** Bounded settle for keyboard reads: preloader out + h1 in + the data
 *  layer drained. The networkidle/extra-wait matters: guarded pages
 *  keep re-rendering as fixtures resolve, and a re-render that
 *  dismounts the focused element drops focus to <body> mid-walk. */
async function settle(page: Page, h1Selector: string): Promise<boolean> {
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
  const h1 = await page
    .waitForSelector(h1Selector, { state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { /* fixtures churn */ });
  await page.waitForTimeout(700);
  return h1;
}

/* ── the five journeys ─────────────────────────────────────────────── */

type Role = 'PUBLIC' | 'STUDENT' | 'TEACHER' | 'ADMIN';

interface JourneyDef {
  name: string;
  role: Role;
  entry: string;
  h1: string;
  run: (page: Page, journey: string) => Promise<void>;
}

/** Journey 1 — auth→login. */
async function journeyAuthLogin(page: Page, journey: string): Promise<void> {
  const settled = await settle(page, 'h1.auth-form-title');
  steps.push({ journey, step: 'nav-entry-renders', ok: settled, detail: settled ? '/auth renders the login form (h1.auth-form-title visible)' : '/auth did NOT render h1.auth-form-title' });
  if (!settled) return;
  // A failed skip contract does NOT abort the journey — every remaining
  // contract (advance/reach/activate/overlay) still gets measured.
  await skipLinkContract(page, journey);
  await focusAdvanceWalk(page, journey);

  // Reach + fill the form, keyboard-only (typing IS keyboard input).
  const email = await tabUntil(page, 'selector', '#auth-email');
  steps.push({ journey, step: 'b1-email-field-reachable', ok: !!email, detail: email ? `#auth-email focused after ${TAB_BUDGET}-budgeted Tabs` : `#auth-email NOT reachable within ${TAB_BUDGET} Tabs` });
  if (!email) return;
  await page.keyboard.type(VALID_LOGIN.email);

  const pass = await tabUntil(page, 'selector', '#auth-password');
  steps.push({ journey, step: 'b2-password-field-reachable', ok: !!pass, detail: pass ? '#auth-password focused' : `#auth-password NOT reachable within ${TAB_BUDGET} Tabs` });
  if (!pass) return;
  await page.keyboard.type(DEMO_PASSWORD);

  const submit = await tabUntil(page, 'selector', '.auth-submit');
  steps.push({ journey, step: 'b3-submit-reachable', ok: !!submit, detail: submit ? `.auth-submit focused ("${submit.desc}")` : `.auth-submit NOT reachable within ${TAB_BUDGET} Tabs` });
  if (!submit) return;

  await page.keyboard.press('Enter');
  const arrived = await page
    .waitForURL((u) => new URL(u).pathname === '/student/dashboard', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  const path = await page.evaluate(() => new URL(document.location.href).pathname);
  steps.push({ journey, step: 'b4-submit-enters-role-home', ok: arrived, detail: arrived ? `Enter on submit navigated to ${path}` : `Enter on submit did NOT navigate (still ${path})` });
  if (!arrived) return;

  const home = await settle(page, 'h1.pf-page-title');
  steps.push({ journey, step: 'nav-role-home-renders', ok: home, detail: home ? '/student/dashboard renders its page title' : '/student/dashboard did NOT render h1.pf-page-title' });
  if (!home) return;
  await overlayEscapeContract(page, journey);
}

/** Journeys 2-5 — a guarded page → keyboard-chosen destinations.
 *  Each hop: TabUntil the target link (bounded), Enter, expect the URL.
 *  Hops target the FIXTURE-BACKED concrete records where the hermetic
 *  corpus pins one (the sweep's DETAIL_PATHS convention — an unmatched
 *  endpoint answers the transport's loud 501 and would measure the
 *  fixture gap, not the journey). */
interface Hop {
  kind: 'href-suffix' | 'href-prefix-other';
  arg: string;
  stepTag: string;
  expectPath: (path: string) => boolean;
  describe: string;
  h1: string;
}

function journeyToLink(hops: Hop[]) {
  return async (page: Page, journey: string): Promise<void> => {
    const settled = await settle(page, 'h1.pf-page-title');
    steps.push({ journey, step: 'nav-entry-renders', ok: settled, detail: settled ? 'entry page renders its page title' : 'entry page did NOT render h1.pf-page-title' });
    if (!settled) return;
    // A failed skip contract does NOT abort — keep measuring.
    await skipLinkContract(page, journey);
    await focusAdvanceWalk(page, journey);

    for (let h = 0; h < hops.length; h++) {
      const hop = hops[h];
      if (!hop) return;
      const hit = await tabUntil(page, hop.kind, hop.arg);
      steps.push({
        journey,
        step: `b${2 * h + 1}-${hop.stepTag}-reachable`,
        ok: !!hit,
        detail: hit ? `${hop.describe} focused: ${hit.desc}` : `${hop.describe} NOT reachable within ${TAB_BUDGET} Tabs`,
      });
      if (!hit) return;

      await page.keyboard.press('Enter');
      const arrived = await page
        .waitForURL((u) => hop.expectPath(new URL(u).pathname), { timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      const path = await page.evaluate(() => new URL(document.location.href).pathname);
      steps.push({
        journey,
        step: `b${2 * h + 2}-${hop.stepTag}-enter-navigates`,
        ok: arrived,
        detail: arrived ? `Enter navigated to ${path}` : `Enter did NOT navigate (${hop.describe}); still ${path}`,
      });
      if (!arrived) return;

      const dest = await settle(page, hop.h1);
      steps.push({ journey, step: `nav-destination-${hop.stepTag}-renders`, ok: dest, detail: dest ? `destination ${path} renders its title (${hop.h1})` : `destination ${path} did NOT render ${hop.h1}` });
      if (!dest) return;
    }
    await overlayEscapeContract(page, journey);
  };
}

const JOURNEYS: JourneyDef[] = [
  {
    name: 'auth-login',
    role: 'PUBLIC',
    entry: '/auth',
    h1: 'h1.auth-form-title',
    run: journeyAuthLogin,
  },
  {
    name: 'student-courses-lecture-detail',
    role: 'STUDENT',
    entry: '/student/courses',
    h1: 'h1.pf-page-title',
    // Two hops, fixture-pinned (sweep DETAIL_PATHS): the offering list
    // → the offering's detail (offr_e2e_algorithms — the corpus' backed
    // record; the FIRST tab-order card, offr_e2e_databases, has no
    // /full fixture and would measure the transport gap, not the
    // journey) → the lecture player (lec_e2e_greedy).
    run: journeyToLink([
      {
        kind: 'href-prefix-other',
        arg: '/student/courses/offr_e2e_algorithms',
        stepTag: 'course-card',
        expectPath: (p) => p.startsWith('/student/courses/'),
        describe: 'the offering card link (a[href^="/student/courses/offr_e2e_algorithms"])',
        h1: 'main h1',
      },
      {
        kind: 'href-prefix-other',
        arg: '/student/lectures/',
        stepTag: 'lecture-link',
        expectPath: (p) => p.startsWith('/student/lectures/'),
        describe: 'a lecture link (a[href^="/student/lectures/"])',
        h1: 'main h1',
      },
    ]),
  },
  {
    name: 'teacher-dashboard-live',
    role: 'TEACHER',
    entry: '/teacher/dashboard',
    h1: 'h1.pf-page-title',
    run: journeyToLink([
      {
        kind: 'href-suffix',
        arg: '/teacher/live',
        stepTag: 'live-nav',
        expectPath: (p) => p === '/teacher/live',
        describe: 'the sidebar live link (a[href$="/teacher/live"])',
        h1: 'main h1',
      },
    ]),
  },
  {
    name: 'admin-dashboard-courses',
    role: 'ADMIN',
    entry: '/admin/dashboard',
    h1: 'h1.pf-page-title',
    run: journeyToLink([
      {
        kind: 'href-suffix',
        arg: '/admin/courses',
        stepTag: 'courses-nav',
        expectPath: (p) => p === '/admin/courses',
        describe: 'the sidebar courses link (a[href$="/admin/courses"])',
        h1: 'main h1',
      },
    ]),
  },
  {
    name: 'institution-dashboard',
    role: 'ADMIN',
    entry: '/institution',
    h1: 'h1.pf-page-title',
    run: journeyToLink([
      {
        kind: 'href-prefix-other',
        arg: '/institution/',
        stepTag: 'workspace-nav',
        expectPath: (p) => p.startsWith('/institution/') && p !== '/institution',
        describe: 'a workspace nav link (a[href^="/institution/"])',
        h1: 'main h1',
      },
    ]),
  },
];

/* ── main ──────────────────────────────────────────────────────────── */

async function main() {
  const { reportDir } = parseArgs(process.argv.slice(2));
  await assertServerUp();

  const browser = await launchBrowser();
  let navDeaths = 0;

  for (const def of JOURNEYS) {
    console.log(`[KBD] journey ${def.name} (${def.role}) ${def.entry} @${WIDTH}`);
    const ctx = await newSeededContext(browser, { role: def.role, width: WIDTH, height: HEIGHT });
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(BASE + def.entry, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!resp || resp.status() >= 400) throw new Error('navigation status ' + (resp ? resp.status() : 'none'));
      await def.run(page, def.name);
    } catch (err) {
      navDeaths += 1;
      console.error(`[KBD] journey ${def.name} threw:`, (err as Error).stack?.slice(0, 600));
      steps.push({ journey: def.name, step: 'nav-entry', ok: false, detail: `NAVIGATION FAILURE: ${String((err as Error).message).slice(0, 160)}` });
    } finally {
      await ctx.close();
    }
    const failed = steps.filter((s) => s.journey === def.name && !s.ok).length;
    console.log(`[KBD] journey ${def.name} — ${failed} failed step(s)`);
  }
  await browser.close();

  const total = steps.length;
  const failed = steps.filter((s) => !s.ok);
  const catalogPath = writeCatalog(reportDir, 'keyboard-journeys.json', {
    generatedAt: new Date().toISOString(),
    base: BASE,
    width: WIDTH,
    journeys: JOURNEYS.map((j) => j.name),
    steps,
    summary: { journeys: JOURNEYS.length, steps: total, failed: failed.length },
  });
  for (const s of failed) console.log(`[KBD] FAIL ${s.journey}/${s.step}: ${s.detail}`);
  console.log(`[KBD] ${total} steps, ${failed.length} failed → ${catalogPath}`);

  if (navDeaths >= JOURNEYS.length) fail('every journey failed to navigate — serving or transport infra', 2);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(2);
});
