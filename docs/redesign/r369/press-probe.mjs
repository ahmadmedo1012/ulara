import { chromium } from 'playwright';
const AUTH = { state: { user: { id: 'cap-student', email: 's@t.ly', firstName: 'طالب', lastName: 'ت', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 'cap', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' }, version: 2 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((a) => { localStorage.setItem('ula-auth', JSON.stringify(a)); localStorage.setItem('ula-level:cap-student','4'); sessionStorage.setItem('ulara-intro-skip','1'); }, AUTH);
await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }));
await page.goto('http://localhost:5310/student/gamification', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const btn = page.locator('.btn.primary').first();
console.log('cls=', await btn.getAttribute('class'), 'tag=', await btn.evaluate(e=>e.tagName));
const rest = await btn.evaluate((el) => { const c = getComputedStyle(el); return { t: c.transform, tr: c.transition, ps: c.getPropertyValue('--press-scale') }; });
console.log('rest:', JSON.stringify(rest));
const box = await btn.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
await page.mouse.down();
for (const ms of [30, 200]) {
  await page.waitForTimeout(ms);
  const v = await btn.evaluate((el) => { const c = getComputedStyle(el); return { a: el.matches(':active'), t: c.transform }; });
  console.log(`+${ms}ms:`, JSON.stringify(v));
}
await page.mouse.up();
await browser.close();
