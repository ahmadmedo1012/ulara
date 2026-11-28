import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

/**
 * r369 authed capture, per role + route.
 *   node capture-role.mjs <baseUrl> <outDir> --role=STUDENT --route=/student/courses [--widths=1440,820,390] [--dark]
 * Seeds the zustand persists (ula-auth v1 / ulara-theme v2 JSON); the
 * offline API renders each page's honest error state. Console errors
 * from failed fetches are expected and counted, not failed on.
 */
const [, , baseUrl = 'http://127.0.0.1:5310', outDir = 'out', ...flags] = process.argv;
const opt = (name, dflt) => {
  const f = flags.find((f) => f.startsWith(`--${name}=`));
  return f ? f.slice(name.length + 3) : dflt;
};
const ROLE = opt('role', 'STUDENT');
const ROUTE = opt('route', '/student/dashboard');
const WIDTHS = opt('widths', '1440,820,390').split(',').map(Number);
const dark = flags.includes('--dark');
const NAMES = { STUDENT: ['طالب', 'التجريبي'], TEACHER: ['أستاذ', 'التجريبي'], ADMIN: ['مدير', 'التجريبي'], QUALITY: ['أخصائي', 'التجريبي'], OWNER: ['مالك', 'التجريبي'] };

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    deviceScaleFactor: width < 500 ? 2 : 1,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([role, names, d]) => {
      localStorage.setItem('ula-auth', JSON.stringify({
        state: { user: { id: `cap-${role.toLowerCase()}`, email: `${role.toLowerCase()}@test.ly`, firstName: names[0], lastName: names[1], role, avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 'cap-token', memberships: [], currentInstitution: null, membershipRole: role },
        version: 1,
      }));
      if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
      sessionStorage.setItem('ulara-intro-skip', '1');
    },
    [ROLE, NAMES[ROLE] ?? NAMES.STUDENT, dark],
  );
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const sfx = dark ? '-dark' : '';
  const slug = ROUTE.replace(/\//g, '-').replace(/^-/, '');
  await page.screenshot({ path: `${outDir}/${slug}-${width}${sfx}.png`, fullPage: true });
  console.log(`OK ${slug} ${width}${sfx} console-errors=${errors.length}`);
  await ctx.close();
}
await browser.close();
