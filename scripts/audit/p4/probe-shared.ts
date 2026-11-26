#!/usr/bin/env tsx
/**
 * scripts/audit/p4/probe-shared.ts — the P4 UX probes' common substrate.
 *
 * COPIED, never imported from sweep.ts (sweep.ts self-executes `main()`).
 * Everything here is the sweep's exact serving/bootstrap contract, lifted
 * verbatim so the four UX probes (keyboard / zoom / reduced-motion /
 * throttle) run under the SAME hermetic rules as the sweep:
 *
 *   · ATTACH, never boot — ULARA_E2E_BASE_URL (default
 *     http://localhost:4173) must already be serving the production
 *     build (`npx vite preview --port 4173 --strictPort`); a dead
 *     server is INFRA (exit 2), not a page defect.
 *   · The AUDIT_API_MOCK fixture transport — every /api/ call is
 *     fulfilled at the Playwright layer by the REAL e2e fixture corpus
 *     (frontend/tests/e2e/fixtures/mock-transport.ts installMockApi +
 *     seedSession), so the probes run DB-less and network-less.
 *   · The r358 context recipe: locale ar-LY, Accept-Language ar, the
 *     `ulara-intro-skip` hermetic intro kill, the tsx/esbuild __name
 *     shim, isMobile/hasTouch at phone widths.
 *   · Exit semantics: 0 clean · 1 any gate finding · 2 infra.
 *   · Catalogs: one JSON per probe, written to --report <dir>
 *     (default /tmp).
 *
 * This module EXPORTS ONLY — importing it never launches anything.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Re-exported so every probe resolves --report paths identically. */
export { resolve };

import { chromium, type Browser, type BrowserContext } from 'playwright';

import { installMockApi, seedSession } from '../../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../../frontend/tests/e2e/fixtures/api-fixtures';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Attach-only serving: the sweep/probes never boot a server. */
export const BASE = process.env.ULARA_E2E_BASE_URL || 'http://localhost:4173';

/** The UX probes default their catalogs to /tmp (the sweep defaults to
 *  docs/redesign/p4/evidence; the probes are noisier, cheaper evidence). */
export const DEFAULT_REPORT_DIR = '/tmp';

/** sweep.ts verbatim — chromium from the shared fleet cache (r358). */
export function chromiumExecutable(): string | undefined {
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

export function fail(msg: string, code: number): never {
  console.error(`[PROBE] ${msg}`);
  process.exit(code);
}

/** Attach-only readiness: ping the server, exit 2 if nothing answers. */
export async function assertServerUp(base = BASE): Promise<void> {
  try {
    const ping = await fetch(`${base}/`, { signal: AbortSignal.timeout(5000) });
    if (!ping.ok) throw new Error(`status ${ping.status}`);
  } catch (e) {
    fail(`nothing answered at ${base} — start it the CI way: (cd frontend && npx vite preview --port 4173 --strictPort) with ULARA_E2E_BASE_URL set (${String(e).slice(0, 120)})`, 2);
  }
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    executablePath: chromiumExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export type Role = 'PUBLIC' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

interface SeededContextOptions {
  role: Role;
  width: number;
  height?: number;
  theme?: 'light' | 'dark';
  colorScheme?: 'light' | 'dark';
  reducedMotion?: 'reduce' | 'no-preference';
  selectedInstitution?: boolean;
}

/**
 * One sweep-shaped context: viewport/locale/mobile flags + the intro
 * skip + the __name shim + seeded session + the fixture transport.
 * `role: 'PUBLIC'` seeds a guest; every other role seeds ROLE_USERS.
 */
export async function newSeededContext(
  browser: Browser,
  opts: SeededContextOptions,
): Promise<BrowserContext> {
  const height = opts.height ?? (opts.width < 500 ? 844 : 900);
  const theme = opts.theme ?? 'light';
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height },
    isMobile: opts.width < 500,
    hasTouch: opts.width < 500,
    locale: 'ar-LY',
    timezoneId: 'UTC',
    colorScheme: opts.colorScheme ?? theme,
    reducedMotion: opts.reducedMotion,
    extraHTTPHeaders: { 'Accept-Language': 'ar' },
  });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('ulara-intro-skip', '1');
      try {
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 8 });
      } catch { /* degrade */ }
    } catch { /* storage denied */ }
    // tsx/esbuild keepNames shim (r358): serialized evaluate() callbacks
    // may reference the __name helper.
    (window as unknown as { __name: (f: unknown) => unknown }).__name = function (f: unknown) { return f; };
  });
  const user = opts.role === 'PUBLIC'
    ? null
    : ROLE_USERS[opts.role as keyof typeof ROLE_USERS] ?? null;
  const selectedInstitution = opts.selectedInstitution ?? opts.role === 'ADMIN';
  await seedSession(ctx, user, { theme, selectedInstitution });
  await installMockApi(ctx, { sessionUser: user, selectedInstitution });
  return ctx;
}

/**
 * The sweep's bounded settle (r360-F3): preloader out, mid-enter toasts
 * dismissed, reveal entrances force-completed (scaled rects lie to
 * geometry), transitions landed. GEOMETRY-ONLY — never use before an
 * honest motion/animation read (see probe-reduced-motion.ts).
 */
export async function settleForGeometry(page: import('playwright').Page): Promise<void> {
  // The first-load entrance draws a DUPLICATE of the hero over the real
  // one while it runs (r362) — wait it out, bounded.
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
  await page.evaluate(() => {
    document.querySelectorAll('.toast-close').forEach((b) => { try { (b as HTMLElement).click(); } catch { /* already gone */ } });
    document.querySelectorAll('[class*="reveal"]').forEach((el) => { el.classList.add('in-view'); });
  }).catch(() => { /* nothing to dismiss */ });
  await page.waitForTimeout(900);
}

/** Write one probe catalog (the artifact the CI job uploads). */
export function writeCatalog(reportDir: string, name: string, payload: unknown): string {
  mkdirSync(reportDir, { recursive: true });
  const path = resolve(reportDir, name);
  writeFileSync(path, JSON.stringify(payload, null, 1));
  return path;
}

/**
 * `--report <dir>` extraction shared by every probe's parser: pull the
 * value out of argv and let each probe keep its own specialist flags.
 * Returns null when the flag is absent (caller applies its default).
 */
export function reportDirFlag(argv: string[]): string | null {
  const i = argv.indexOf('--report');
  if (i === -1) return null;
  const v = argv[i + 1];
  if (v === undefined) fail('--report needs a directory', 2);
  return v;
}
