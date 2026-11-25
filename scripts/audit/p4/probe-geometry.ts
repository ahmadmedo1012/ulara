#!/usr/bin/env tsx
/** P4-FIX probe — dump viewport geometry of named elements (+ ancestor chain)
 *  to locate the positioning context behind the sweep's collisions. Debug
 *  tool only; not part of the gate. */
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const chain = [];
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      chain.push(a.tagName.toLowerCase() + (a.className && typeof a.className === 'string' ? '.' + a.className.trim().split(/\\s+/).slice(0,3).join('.') : '') +
        ' pos=' + cs.position + ' ov=' + cs.overflow + '/' + cs.overflowY +
        ' rect=' + Math.round(r_0(a).top) + '..' + Math.round(r_0(a).bottom) + 'x' + Math.round(r_0(a).left) + '..' + Math.round(r_0(a).right));
    }
    return { sel, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }, text: (el.textContent||'').trim().slice(0,40), chain };
  };
  const r_0 = (a) => a.getBoundingClientRect();
  const doc = document.documentElement;
  const scroller = document.querySelector('.content');
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    docScroll: { w: doc.scrollWidth, h: doc.scrollHeight },
    contentScroller: scroller ? { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
    nav: pick('.bottom-nav'),
    hits: [
      ...[...document.querySelectorAll('a.btn.accent, p.pf-section-desc, a.btn.ghost, summary, h2.sg-title, span.inst-cap-note, b')].map((el) => {
        const r = el.getBoundingClientRect();
        if (r.height === 0) return null;
        return { sel: el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\\s+/).slice(0,2).join('.'), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent||'').trim().slice(0,30) };
      }).filter((x) => x && x.bottom > 700),
    ],
  };
})()`;

interface Target { route: string; width: number; role: string; selects: string[] }

const TARGETS: Target[] = [
  { route: '/student/courses', width: 390, role: 'STUDENT', selects: ['a.btn.accent'] },
  { route: '/teacher/dashboard', width: 390, role: 'TEACHER', selects: ['p.pf-section-desc', 'a.btn.ghost', 'summary'] },
  { route: '/quality/dashboard', width: 390, role: 'QUALITY', selects: ['h2.sg-title'] },
  { route: '/quality/dashboard', width: 1440, role: 'QUALITY', selects: ['div.alert-title', 'a.btn.ghost', 'h2.sg-title'] },
  { route: '/institution', width: 390, role: 'ADMIN', selects: ['span.inst-cap-note', 'b'] },
];

async function main() {
  const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true, args: ['--no-sandbox'] });
  for (const t of TARGETS) {
    const height = t.width < 500 ? 844 : 900;
    const ctx = await browser.newContext({
      viewport: { width: t.width, height }, isMobile: t.width < 500, hasTouch: t.width < 500,
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
    const out = await page.evaluate(PROBE);
    console.log(`\n===== ${t.route} @${t.width} =====`);
    console.log(JSON.stringify(out, null, 1));
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(2); });
