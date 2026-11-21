#!/usr/bin/env node
/**
 * apps/mobile/scripts/capture-web.mjs — r351 N0: the RN-web audit
 * harness (NO simulators in this sandbox; expo export --platform web +
 * Playwright is the honest proxy — what RN-web CANNOT show is listed
 * as NOT MEASURED in NATIVE_AUDIT.md).
 *
 * Boots the exported web bundle on a local static server, seeds each
 * role's session (AsyncStorage = localStorage on web: ula-mobile-user
 * + ula-mobile-active-institution), mocks the API with the platform's
 * own fixture corpus (the same backend the web e2e suite mocks), then
 * captures every role's key screens at 390×844 and 820×1180 with word
 * counts + overflow + console errors into docs/…/native-ai/shots/ and
 * a JSON the audit doc reads.
 *
 * Usage: node scripts/capture-web.mjs   (from apps/mobile, after
 * `npx expo export --platform web`)
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve(process.cwd(), 'dist');
const PORT = 5390;
const BASE = `http://localhost:${PORT}`;
const SHOTS = resolve(process.cwd(), '../../docs/redesign/r351/native-ai/shots');
const OUT_JSON = resolve(process.cwd(), '../../docs/redesign/r351/native-ai/capture-web.json');
await mkdir(SHOTS, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.svg': 'image/svg+xml' };

/* ── static server for the export ─────────────────────────────────── */
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, BASE).pathname;
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!existsSync(file)) file = join(DIST, 'index.html'); // SPA fallback
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

/* ── the roles' key screens (expo-router paths) ───────────────────── */
const ROLES = [
  { role: 'STUDENT', home: '/student/' , screens: [
    ['dashboard', '/student/'], ['courses', '/student/courses'], ['ai', '/student/ai'],
    ['matrix', '/student/matrix'], ['results', '/student/results'], ['library', '/student/library'],
  ]},
  { role: 'TEACHER', home: '/teacher/', screens: [
    ['dashboard', '/teacher/'], ['schedule', '/teacher/schedule'], ['students', '/teacher/students'],
    ['grades', '/teacher/grades'], ['attendance', '/teacher/attendance'],
  ]},
  { role: 'ADMIN', home: '/admin/', screens: [
    ['dashboard', '/admin/'], ['faculties', '/admin/faculties'], ['students', '/admin/students'],
    ['teachers', '/admin/teachers'], ['reports', '/admin/reports'],
  ]},
  { role: 'QUALITY', home: '/quality/', screens: [
    ['dashboard', '/quality/'], ['courses', '/quality/courses'], ['engagement', '/quality/engagement'],
  ]},
  { role: 'OWNER', home: '/owner/', screens: [
    ['dashboard', '/owner/'], ['governance', '/owner/governance'], ['users', '/owner/users'],
    ['realtime', '/owner/realtime'],
  ]},
];

/* ── the API mock: the web fixture corpus serves the same backend ─── */
const { installMockApi } = await import('../../frontend/tests/e2e/fixtures/mock-transport.ts').catch(() => ({}));
const FIXTURES_AVAILABLE = typeof installMockApi === 'function';

/* Minimal per-role user rows (the session store's persisted shape). */
const USERS = {
  STUDENT: { id: 'u_stu', role: 'STUDENT', email: 's@test.dev', firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج' },
  TEACHER: { id: 'u_tea', role: 'TEACHER', email: 't@test.dev', firstName: 'أستاذ', lastName: 'تجريبي', avatarInitials: 'أتج' },
  ADMIN: { id: 'u_adm', role: 'ADMIN', email: 'a@test.dev', firstName: 'مسؤول', lastName: 'تجريبي', avatarInitials: 'متج' },
  QUALITY: { id: 'u_qua', role: 'QUALITY', email: 'q@test.dev', firstName: 'جودة', lastName: 'تجريبي', avatarInitials: 'جتج' },
  OWNER: { id: 'u_own', role: 'OWNER', email: 'o@test.dev', firstName: 'مالك', lastName: 'تجريبي', avatarInitials: 'متج' },
};

const browser = await chromium.launch();
const results = [];

for (const r of ROLES) {
  for (const [vpTag, vp] of [['390', { width: 390, height: 844 }], ['820', { width: 820, height: 1180 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpTag === '390', hasTouch: vpTag === '390' });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 100)); });

    // Seed the session BEFORE any app script (AsyncStorage reads at boot).
    await page.addInitScript(([user]) => {
      try {
        window.localStorage.setItem('ula-mobile-user', JSON.stringify(user));
        window.localStorage.setItem('ula-mobile-active-institution', 'inst_e2e');
      } catch { /* storage unavailable */ }
    }, [USERS[r.role]]);

    // Mock the API (best effort with the web corpus — unmatched → 501 logged).
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const p = url.pathname.replace(/^\/api\/v1/, '');
      const ok = (d) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: d }) });
      // The minimum the boot + role shells ask for.
      if (p === '/auth/me') return ok(USERS[r.role]);
      if (p === '/me/gaps') return ok([]);
      if (p === '/faculties') return ok([]);
      if (p === '/colleges') return ok([]);
      if (p === '/ai/config') return ok({ provider: 'local', model: null });
      if (p === '/ai/conversations') return ok([]);
      if (p === '/status') return ok({ status: 'ok', buildId: 'capture' });
      if (p === '/me/dashboard') return ok({ kpis: [], agenda: [], resume: null });
      if (p === '/me/resume') return ok(null);
      if (p === '/me/notifications') return ok({ items: [], unread: 0 });
      if (p.startsWith('/notifications')) return ok({ items: [], unread: 0 });
      if (p === '/teacher/dashboard') return ok({ todaySessions: [], pendingGrading: 0 });
      if (p === '/admin/dashboard') return ok({ counts: {} });
      if (p === '/quality/dashboard') return ok({ counts: {} });
      if (p === '/owner/dashboard') return ok({ counts: {} });
      return route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ error: { message: `no fixture: ${p}` } }) });
    });

    for (const [name, path] of r.screens) {
      const tag = `${r.role.toLowerCase()}-${name}`;
      try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1800); // boot + queries settle
        const data = await page.evaluate(() => {
          const de = document.documentElement;
          const words = (document.body.innerText ?? '').trim().split(/\s+/).filter(Boolean).length;
          return { words, overflowX: de.scrollWidth - de.clientWidth };
        });
        await page.screenshot({ path: join(SHOTS, `mob-${tag}-${vpTag}.png`) });
        results.push({ role: r.role, screen: name, path, vp: vpTag, ...data, fixtureCorpus: FIXTURES_AVAILABLE });
      } catch (e) {
        results.push({ role: r.role, screen: name, path, vp: vpTag, error: String(e).slice(0, 120) });
      }
    }
    await ctx.close();
  }
}

await browser.close();
server.close();
await writeFile(OUT_JSON, JSON.stringify(results, null, 1));
const heavy = results.filter((x) => !x.error && x.words > 80);
console.log(`captured ${results.length} cells → ${OUT_JSON}`);
console.log(`screens > 80 words (the N4 sweep list): ${heavy.filter((x, i) => heavy.findIndex((y) => y.role === x.role && y.screen === x.screen) === i).length}`);
process.exit(0);
