// probe: rendered innerText of one route, split by section
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const FIX = '/home/z/agent02/ulara-work/frontend/tests/e2e/fixtures/api-fixtures.ts';
const TRANSPORT = '/home/z/agent02/ulara-work/frontend/tests/e2e/fixtures/mock-transport.ts';
const { ROLE_USERS } = await import(FIX);
const { installMockApi, seedSession } = await import(TRANSPORT);
const [,, role, route] = process.argv;
let vite;
function kill() { if (vite?.pid) try { process.kill(-vite.pid, 'SIGTERM'); } catch {} }
const root = '/home/z/agent02/ulara-work';
vite = spawn('node', [root + '/node_modules/vite/bin/vite.js', '--port', '5302', '--strictPort'], { cwd: root + '/frontend', detached: true, stdio: 'ignore' });
process.on('exit', kill);
for (let i = 0; i < 90; i++) { try { const r = await fetch('http://localhost:5302/', { signal: AbortSignal.timeout(1000) }); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 700)); }
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });
const ctx = await browser.newContext({ locale: 'ar-LY', viewport: { width: 1440, height: 900 } });
// r351: freeze at FIXED_NOW — the same deterministic instant the e2e
// harness pins (page.clock.setFixedTime); live-clock probes drift with
// the relative-date labels.
await ctx.clock.install({ time: new Date('2026-03-15T10:00:00.000Z') });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ulara-intro-skip', '1'); Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 8 }); } catch {} });
await seedSession(ctx, ROLE_USERS[role], {});
await installMockApi(ctx, { sessionUser: ROLE_USERS[role], overrides: [] });
const page = await ctx.newPage();
await page.goto('http://localhost:5302' + route, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar, main').first().waitFor({ state: 'visible', timeout: 30000 });
await page.locator('.content .skeleton, .content [aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
await page.waitForTimeout(400);
const text = await page.evaluate(() => document.body.innerText);
console.log(text);
await browser.close(); kill();
