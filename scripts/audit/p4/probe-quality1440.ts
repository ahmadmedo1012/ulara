#!/usr/bin/env tsx
/** P4-FIX probe #3 — /quality/dashboard @1440 overlap geometry. */
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE = process.env.ULARA_E2E_BASE_URL || 'http://localhost:4173';
import { installMockApi, seedSession } from '../../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../../frontend/tests/e2e/fixtures/api-fixtures';

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
  } catch { /* fall through */ }
  return undefined;
}

const PROBE = `(() => {
  const dump = (sel) => [...document.querySelectorAll(sel)].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel, text: (el.textContent || '').trim().slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), pos: cs.position, display: cs.display, open: el.open };
  });
  const detailsState = [...document.querySelectorAll('details')].map((d) => ({ open: d.open, summary: (d.querySelector('summary')?.textContent || '').trim().slice(0, 30) }));
  return {
    details: detailsState,
    alertTitles: dump('.alert-title'),
    ghostCtas: dump('.hr-cta'),
    h2s: dump('h2.sg-title'),
    spans: dump('.qlt-kpi-ledger span, .qlt-kpi-ledger [role="progressbar"] *').slice(0, 12),
    split: dump('.sg-split'),
  };
})()`;

async function main() {
  const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, locale: 'ar-LY', timezoneId: 'UTC', colorScheme: 'light', extraHTTPHeaders: { 'Accept-Language': 'ar' },
  });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch { /* */ }
    (window as unknown as { __name: (f: unknown) => unknown }).__name = function (f: unknown) { return f; };
  });
  const user = ROLE_USERS.QUALITY;
  await seedSession(ctx, user, { theme: 'light' });
  await installMockApi(ctx, { sessionUser: user });
  const page = await ctx.newPage();
  await page.goto(BASE + '/quality/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('.toast-close').forEach((b) => { try { (b as HTMLElement).click(); } catch { /* */ } });
    document.querySelectorAll('[class*="reveal"]').forEach((el) => { el.classList.add('in-view'); });
  }).catch(() => {});
  await page.waitForTimeout(900);
  console.log(JSON.stringify(await page.evaluate(PROBE), null, 1));
  await browser.close();
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(2); });
