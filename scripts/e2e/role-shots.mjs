#!/usr/bin/env node
/**
 * role-shots — the r350 B1 evidence instrument: every guarded role's
 * dashboard captured at 1440 and 390 (light + dark on demand) against
 * the HERMETIC fixture corpus (mock transport — no backend, no DB,
 * no network), with the same body.innerText word-count instrument the
 * r350 LOG baseline uses. Screenshots are people-facing (DSF 2).
 *
 * Run (repo root):  npx tsx scripts/e2e/role-shots.mjs
 *   --themes light,dark   (default: light)
 *   --roles STUDENT,TEACHER,ADMIN,QUALITY,OWNER
 *   --viewports 1440x900,390x844
 *   --port 5199
 *   --out docs/redesign/r350/shots
 *
 * Output: PNG per cell + role-shots-results.json (words, console errors,
 * failed requests) + a stdout table. Exit 1 if any cell hard-fails to
 * render (no shell chrome) — a screenshot without the app behind it is
 * not evidence.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// The ONE fixture corpus — never a second copy (same law as login-all).
const FIX = resolve(process.cwd(), 'frontend/tests/e2e/fixtures/api-fixtures.ts');
const TRANSPORT = resolve(process.cwd(), 'frontend/tests/e2e/fixtures/mock-transport.ts');
const { ROLE_USERS } = await import(FIX);
const { installMockApi, seedSession } = await import(TRANSPORT);

// ── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const parseList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const parseVPs = (s) =>
  parseList(s).map((v) => {
    const m = /^(\d+)x(\d+)$/.exec(v);
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
  }).filter(Boolean);

const ROLES = parseList(arg('roles', 'STUDENT,TEACHER,ADMIN,QUALITY,OWNER'));
const THEMES = parseList(arg('themes', 'light'));
const VPS = parseVPs(arg('viewports', '1440x900,390x844'));
const PORT = Number.parseInt(arg('port', '5199'), 10);
const BASE = `http://localhost:${PORT}`;
const OUT = resolve(process.cwd(), arg('out', 'docs/redesign/r350/shots'));

const ROLE_HOME = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER: '/owner/dashboard',
};

mkdirSync(OUT, { recursive: true });

// ── vite dev server lifecycle (the a11y-gate's proven self-boot) ────────
let vite = null;
function killVite() {
  if (vite?.pid) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* gone */ } }
}
async function bootVite() {
  const root = process.cwd();
  const cmd = existsSync(resolve(root, 'node_modules/vite/bin/vite.js'))
    ? ['node', [resolve(root, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort']]
    : ['npx', ['vite', '--port', String(PORT), '--strictPort']];
  vite = spawn(cmd[0], [...cmd[1]], {
    cwd: resolve(root, 'frontend'),
    detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.on('exit', () => killVite());
  vite.stdout.on('data', () => {});
  vite.stderr.on('data', () => {});
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error(`vite dev server not ready on :${PORT} within 90s`);
}

const countWords = (t) => t.trim().split(/\s+/).filter(Boolean).length;

await bootVite();
const browser = await chromium.launch();
const results = [];
let failed = 0;

for (const role of ROLES) {
  const user = ROLE_USERS[role];
  const home = ROLE_HOME[role];
  if (!user) { console.error(`role ${role}: no fixture user`); failed++; continue; }
  for (const theme of THEMES) {
    for (const vp of VPS) {
      const cell = `${role}-${theme}-${vp.width}`;
      const shotPath = resolve(OUT, `r350-role-${role.toLowerCase()}-${theme}-${vp.width}.png`);
      const context = await browser.newContext({
        locale: 'ar-LY',
        timezoneId: 'UTC',
        viewport: vp,
        deviceScaleFactor: 2,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const devAuditNotices = [];
      const failedRequests = [];
      // Dev-mode noise separator: the app runs axe in dev and logs its
      // findings (plus react-router future-flag warnings) through
      // console.error — a11y notices, not runtime failures. Both counts
      // ship; the axe findings are recorded for the LOG, never hidden.
      const DEV_AUDIT = /(New axe issues|axe|React Router Future Flag|React DevTools|\[vite\]|moderate|serious|critical)/;
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        if (DEV_AUDIT.test(m.text())) devAuditNotices.push(m.text());
        else consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));
      page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
      try {
        // the e2e fixture's boot-plate: skip the entrance loader, stub
        // core count up (2-core CI hosts must see the full app too)
        await context.addInitScript(() => {
          try {
            sessionStorage.setItem('ulara-intro-skip', '1');
            Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
              configurable: true, get: () => 8,
            });
          } catch { /* storage denied — app stands anyway */ }
        });
        await seedSession(context, user, { theme });
        await installMockApi(context, { sessionUser: user, overrides: [] });
        await page.goto(`${BASE}${home}`, { waitUntil: 'domcontentloaded' });
        // content-ready: the page's own header or the shell topbar
        await page
          .locator('.pf-page-header, .topbar-scope, main')
          .first()
          .waitFor({ state: 'visible', timeout: 30_000 });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(700); // settle motion
        const words = await page.evaluate(() => {
          const t = document.body.innerText;
          return t.trim().split(/\s+/).filter(Boolean).length;
        });
        await page.screenshot({ path: shotPath, fullPage: false });
        results.push({ cell, role, theme, viewport: `${vp.width}x${vp.height}`, words, consoleErrors: consoleErrors.length, devAuditNotices: devAuditNotices.length, failedRequests: failedRequests.length, shot: shotPath });
        console.log(`${cell}: ${words} words · ${consoleErrors.length} runtime errs · ${devAuditNotices.length} dev-audit notices · ${failedRequests.length} failed reqs → ${shotPath}`);
        if (consoleErrors.length || failedRequests.length) {
          console.log(`  console: ${consoleErrors.slice(0, 3).join(' | ')}`);
          console.log(`  failed:  ${failedRequests.slice(0, 3).join(' | ')}`);
        }
      } catch (e) {
        failed++;
        results.push({ cell, role, theme, viewport: `${vp.width}x${vp.height}`, error: String(e).slice(0, 300) });
        console.error(`${cell}: FAILED — ${String(e).slice(0, 300)}`);
      } finally {
        await context.close();
      }
    }
  }
}

await browser.close();
killVite();

const outJson = resolve(OUT, 'role-shots-results.json');
writeFileSync(outJson, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, matrix: { roles: ROLES, themes: THEMES, viewports: VPS.map((v) => `${v.width}x${v.height}`) }, results }, null, 2));
console.log(`\nresults: ${outJson}`);
console.log('ROLE SHOTS ' + (failed ? `FAIL (${failed} cells)` : 'PASS'));
process.exit(failed ? 1 : 0);
