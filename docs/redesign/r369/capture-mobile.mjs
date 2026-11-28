import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

/**
 * r369 slice 04 — the mobile acceptance captures (NO simulators in this
 * sandbox; the expo web export + Playwright is the established honest
 * proxy, same as r351's capture-web.mjs). Cells: splash / auth /
 * dashboard / list(courses) / gamification, light + dark, 390x844 RTL.
 * The API mock returns empty data: screens render their honest states.
 * Splash = the boot plate captured mid-boot (fonts still loading).
 *
 * Usage: node docs/redesign/r369/capture-mobile.mjs   (from the repo
 * root, after `cd apps/mobile && npx expo export --platform web`)
 */
const DIST = resolve(process.cwd(), 'apps/mobile/dist');
const PORT = 5391;
const BASE = `http://localhost:${PORT}`;
const SHOTS = resolve(process.cwd(), 'docs/redesign/r369/evidence/04-mobile-apps');
await mkdir(SHOTS, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, BASE).pathname;
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!existsSync(file)) file = join(DIST, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const USER = { id: 'u_stu', role: 'STUDENT', email: 's@test.dev', firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج' };
const CELLS = [
  ['dashboard', '/student/dashboard', true],
  ['list-courses', '/student/courses', true],
  ['gamification', '/student/gamification', true],
  ['auth-login', '/auth/login', false],
];

const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : {});
for (const dark of [false, true]) {
  for (const [name, route, authed] of CELLS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 80)); });
    await page.addInitScript(([user, d, authed]) => {
      try {
        if (authed) {
          window.localStorage.setItem('ula-mobile-user', JSON.stringify(user));
          window.localStorage.setItem('ula-mobile-active-institution', 'inst_e2e');
        }
        window.localStorage.setItem('ula-mobile-theme', JSON.stringify({ state: { preference: d ? 'dark' : 'light' }, version: 0 }));
      } catch { /* storage unavailable */ }
    }, [USER, dark, authed]);
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }),
    );
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const sfx = dark ? '-dark' : '';
    await page.screenshot({ path: join(SHOTS, `mobile-${name}-390${sfx}.png`) });
    console.log(`OK ${name}${sfx} console-errors=${errors.length}`);
    await ctx.close();
  }
  // splash: a fresh boot captured mid-load (before networkidle settles).
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript((d) => {
    try { window.localStorage.setItem('ula-mobile-theme', JSON.stringify({ state: { preference: d ? 'dark' : 'light' }, version: 0 })); } catch {}
  }, dark);
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' }));
  page.goto(`${BASE}/student/dashboard`, { waitUntil: 'commit' }).catch(() => {});
  await page.waitForTimeout(2600);
  await page.screenshot({ path: join(SHOTS, `mobile-splash-390${dark ? '-dark' : ''}.png`) });
  console.log(`OK splash${dark ? '-dark' : ''} (boot screen held ~2.6s)`);
  await ctx.close();
}
await browser.close();
server.close();
