#!/usr/bin/env tsx
/** P4-FIX probe #5 — sticky bottom:0 constraint model inside .content. */
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function main() {
  const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    locale: 'ar-LY', timezoneId: 'UTC', colorScheme: 'light', extraHTTPHeaders: { 'Accept-Language': 'ar' },
  });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch { /* */ }
    (window as unknown as { __name: (f: unknown) => unknown }).__name = function (f: unknown) { return f; };
  });
  const user = ROLE_USERS.STUDENT;
  await seedSession(ctx, user, { theme: 'light' });
  await installMockApi(ctx, { sessionUser: user });
  const page = await ctx.newPage();
  await page.goto(BASE + '/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const out = await page.evaluate(() => {
    const content = document.querySelector('.content');
    // Scroll to the end so a sticky bar is in its stuck state.
    content.scrollTop = content.scrollHeight;
    return new Promise((res) => requestAnimationFrame(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:sticky;bottom:0;height:20px;background:#f00;z-index:1;';
      probe.id = 'sticky-probe';
      content.querySelector('.content-inner').appendChild(probe);
      requestAnimationFrame(() => {
        const r = probe.getBoundingClientRect();
        const c = content.getBoundingClientRect();
        const cs = getComputedStyle(content);
        const inner = document.querySelector('.content-inner');
        res({
          probeBottom: Math.round(r.bottom), probeTop: Math.round(r.top),
          contentRectBottom: Math.round(c.bottom),
          contentPadBottom: cs.paddingBottom, contentMarginBottom: cs.marginBottom,
          innerPadBottom: getComputedStyle(inner).paddingBottom,
          contentScrollTop: content.scrollTop, contentClientH: content.clientHeight,
        });
      });
    }));
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(2); });
