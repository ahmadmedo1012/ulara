import { chromium } from 'playwright';
// r369 slice 03 batch B — element capture of the ladder section (the
// shell scrolls internally, so fullPage stays viewport-tall).
const [, , baseUrl = 'http://127.0.0.1:5310', outDir = 'out'] = process.argv;
const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const [width, dark] of [[1440, false], [1440, true], [390, false], [390, true]]) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    deviceScaleFactor: width < 500 ? 2 : 1,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.addInitScript((d) => {
    localStorage.setItem('ula-auth', JSON.stringify({
      state: { user: { id: 'cap-student', email: 'student@test.ly', firstName: 'طالب', lastName: 'التجريبي', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 'cap-token', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' },
      version: 1,
    }));
    if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
    sessionStorage.setItem('ulara-intro-skip', '1');
  }, dark);
  await page.goto(`${baseUrl}/student/gamification`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const n = await page.locator('.g369-level').count();
  const el = page.locator('.g369-ladder').first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: `${outDir}/ladder-${width}${dark ? '-dark' : ''}.png` });
  console.log(`OK ladder ${width}${dark ? '-dark' : ''} rungs=${n}`);
  await ctx.close();
}
await browser.close();
