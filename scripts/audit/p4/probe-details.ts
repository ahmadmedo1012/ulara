#!/usr/bin/env tsx
/** P4-FIX probe #4 — why do closed-details children have live rects? */
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
  const h2 = [...document.querySelectorAll('h2.sg-title')].find((el) => (el.textContent || '').trim() === 'توزيع الحضور');
  const chain = [];
  for (let a = h2; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    const r = a.getBoundingClientRect();
    chain.push({
      tag: a.tagName + '.' + String(a.className).slice(0, 40),
      open: a.open !== undefined ? a.open : undefined,
      display: cs.display, visibility: cs.visibility, contentVisibility: cs.contentVisibility,
      opacity: cs.opacity, transform: cs.transform === 'none' ? 'none' : 'matrix',
      rect: Math.round(r.top) + '..' + Math.round(r.bottom) + ' h=' + Math.round(r.height),
    });
  }
  return { chain, chromeVer: navigator.userAgent.match(/Chrome\\/[\\d.]+/)?.[0] };
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
  await page.waitForTimeout(900);
  console.log(JSON.stringify(await page.evaluate(PROBE), null, 1));
  await browser.close();
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(2); });
