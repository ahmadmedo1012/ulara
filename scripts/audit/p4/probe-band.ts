#!/usr/bin/env tsx
/** P4-FIX probe #2 — what sits in the dock band (viewport 766..844) on clean vs dirty pages. */
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
  const bandTop = 766;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    if (!text) continue;
    const el = node.parentElement;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    for (const r of rects) {
      if (r.bottom > bandTop && r.top < 844) {
        out.push({ y: Math.round(r.top) + '..' + Math.round(r.bottom), x: Math.round(r.left) + '..' + Math.round(r.right), text: text.slice(0, 30), cls: String(el.className).slice(0, 40) });
        break;
      }
    }
  }
  const scroller = document.querySelector('.content');
  const inner = document.querySelector('.content-inner');
  return {
    scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight,
    innerPadBottom: getComputedStyle(inner).paddingBottom,
    contentPadBottom: getComputedStyle(scroller).paddingBottom,
    bandTexts: out.slice(0, 14),
  };
})()`;

const TARGETS = [
  { route: '/admin/dashboard', role: 'ADMIN' },
  { route: '/owner/dashboard', role: 'OWNER' },
  { route: '/institution', role: 'ADMIN' },
];

async function main() {
  const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true, args: ['--no-sandbox'] });
  for (const t of TARGETS) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      locale: 'ar-LY', timezoneId: 'UTC', colorScheme: 'light', extraHTTPHeaders: { 'Accept-Language': 'ar' },
    });
    await ctx.addInitScript(() => {
      try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch { /* */ }
      (window as unknown as { __name: (f: unknown) => unknown }).__name = function (f: unknown) { return f; };
    });
    const user = ROLE_USERS[t.role as keyof typeof ROLE_USERS] ?? null;
    await seedSession(ctx, user, { theme: 'light', selectedInstitution: t.role === 'ADMIN' });
    await installMockApi(ctx, { sessionUser: user, selectedInstitution: t.role === 'ADMIN' });
    const page = await ctx.newPage();
    await page.goto(BASE + t.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => {
      document.querySelectorAll('.toast-close').forEach((b) => { try { (b as HTMLElement).click(); } catch { /* */ } });
      document.querySelectorAll('[class*="reveal"]').forEach((el) => { el.classList.add('in-view'); });
    }).catch(() => {});
    await page.waitForTimeout(900);
    console.log(`\n===== ${t.route} @390 =====`);
    console.log(JSON.stringify(await page.evaluate(PROBE), null, 1));
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(2); });
