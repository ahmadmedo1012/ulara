#!/usr/bin/env node
/**
 * login-all — the owner's acceptance proof for the login rescue
 * (2026-11-12): EVERY documented demo account, typed MANUALLY into the
 * REAL login page of the REAL deployment, verified to reach its role
 * dashboard, screenshot per account.
 *
 * Contract (the owner's words): «سكربت Playwright يفتح /auth ببيئة
 * نظيفة، ولكل حساب من الاثني عشر: يكتب البريد وكلمة المرور يدويًا
 * (لا الزر السريع)، يضغط دخول، يتحقق من الوصول للوحة الدور، يلتقط
 * صورة، ثم يخرج».
 *
 * What this is NOT:
 *   - NOT the quick-login path — credentials are TYPED character by
 *     character (pressSequentially), the exact journey the owner's own
 *     hands take.
 *   - NOT a mocked/hermetic run — it drives the LIVE deployment
 *     (default https://ulara.vercel.app; override with ULARA_BASE_URL).
 *
 * Accounts come from the ONE shared table
 * (backend/src/modules/auth/test-accounts.data.ts via tsx) — never a
 * second copy. Each account gets a FRESH browser context (clean
 * cookies + storage), so no logout is needed between roles.
 *
 * Usage (repo root):
 *   npx tsx scripts/e2e/login-all.mjs
 * Environment:
 *   ULARA_BASE_URL     target origin (default https://ulara.vercel.app)
 *   ULARA_LOGIN_ALL_OUT screenshot dir (default scripts/e2e/artifacts/login-all)
 *
 * Output: a results table (account · role · result · ms · screenshot)
 * on stdout + login-all-results.json next to the screenshots. Exit 1
 * if ANY account failed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
// ONE shared table — the same module the auth panel renders.
import { TEST_ACCOUNTS } from '../../backend/src/modules/auth/test-accounts.data.js';

const BASE = (process.env.ULARA_BASE_URL ?? 'https://ulara.vercel.app').replace(/\/+$/, '');
const OUT = process.env.ULARA_LOGIN_ALL_OUT ?? 'scripts/e2e/artifacts/login-all';

/** The dashboard URL each role must land on after login (lib/routes.ts
 * ROUTES — duplicated here on purpose: an independent assertion source
 * for the navigation contract). */
const ROLE_HOME = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER: '/owner/dashboard',
};

// Cold starts can make the first login slow (the page itself silently
// retries twice); allow generous time so the proof never flakes.
const NAV_TIMEOUT_MS = 120_000;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
let failed = 0;

for (const account of TEST_ACCOUNTS) {
  const expectedHome = ROLE_HOME[account.role];
  const shot = `${OUT}/${account.role.toLowerCase()}-${account.email.replace(/@.*/, '')}.png`;
  const startedAt = Date.now();
  // Fresh context per account: clean cookies + storage — the honest
  // "clean environment" the owner asked for.
  const context = await browser.newContext({
    locale: 'ar-LY',
    timezoneId: 'Africa/Tripoli',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  try {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });

    // Type MANUALLY — character by character, NOT the quick-login
    // button, NOT .fill(): the owner's own hands' journey.
    // exact: true — the password toggle carries the aria-label
    // «إظهار كلمة المرور» and getByLabel's default SUBSTRING match
    // resolves BOTH elements (a strict-mode violation, measured live in
    // CI run 43323784883).
    const emailField = page.getByLabel('البريد الإلكتروني أو رقم القيد', { exact: true });
    const passwordField = page.getByLabel('كلمة المرور', { exact: true });
    await emailField.click();
    await emailField.pressSequentially(account.email, { delay: 12 });
    await passwordField.click();
    await passwordField.pressSequentially(account.password, { delay: 12 });

    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // The proof: the protected dashboard of THIS role loads (a failed
    // login would stay on /auth with the Arabic refusal banner).
    await page.waitForURL(
      (u) => !u.pathname.startsWith('/auth'),
      { timeout: NAV_TIMEOUT_MS },
    );
    if (!page.url().startsWith(`${BASE}${expectedHome}`)) {
      throw new Error(`landed on ${page.url()} — expected ${BASE}${expectedHome}`);
    }
    // Let the dashboard settle (data fetches), then the evidence shot.
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: shot, fullPage: false });
    const ms = Date.now() - startedAt;
    results.push({ email: account.email, job: account.job, role: account.role, ok: true, ms, screenshot: shot });
    console.log(`✓ ${account.email.padEnd(24)} ${account.role.padEnd(8)} ${String(ms).padStart(6)}ms  ${shot}`);
  } catch (err) {
    failed += 1;
    const ms = Date.now() - startedAt;
    // Screenshot the failure state too — the honest evidence.
    await page.screenshot({ path: shot.replace(/\.png$/, '-FAIL.png'), fullPage: false }).catch(() => {});
    results.push({ email: account.email, job: account.job, role: account.role, ok: false, ms, error: String(err?.message ?? err).slice(0, 300), screenshot: shot });
    console.error(`✗ ${account.email.padEnd(24)} ${account.role.padEnd(8)} ${String(ms).padStart(6)}ms  ${String(err?.message ?? err).split('\n')[0].slice(0, 160)}`);
  } finally {
    await context.close();
  }
}

await browser.close();

const summary = {
  base: BASE,
  ranAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed,
  results,
};
writeFileSync(`${OUT}/login-all-results.json`, JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed}/${summary.total} passed — results: ${OUT}/login-all-results.json`);
process.exit(failed > 0 ? 1 : 0);
