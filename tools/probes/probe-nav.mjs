import { chromium } from 'playwright';
const browser = await chromium.launch({});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('ula-auth', JSON.stringify({ state: { user: { id: 'x', email: 's@t.ly', firstName: 'طالب', lastName: 'ت', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 't', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' }, version: 1 }));
  sessionStorage.setItem('ulara-intro-skip', '1');
});
await page.route('**/api/v1/me/dashboard**', (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ data: {
    kpi: { courseCount: 4, attendancePct: 91, pendingAssignmentsCount: 2, totalXp: 245, rank: 3, cohortSize: 41 },
    today: [], week: [], continueLearning: null, announcements: [], upcoming: [],
  } }),
}));
await page.goto('http://127.0.0.1:5310/student/dashboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const out = await page.evaluate(() => {
  const el = document.querySelector('.nav-item.on');
  const chip = document.querySelector('.topbar-xp');
  const cs = el ? getComputedStyle(el) : null;
  return {
    activeBg: cs?.backgroundColor, activeFg: cs?.color,
    chipText: chip?.textContent ?? null,
    chipBg: chip ? getComputedStyle(chip).backgroundColor : null,
    chipFg: chip ? getComputedStyle(chip).color : null,
  };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: '/home/sandbox/ulara-r369/docs/redesign/r369/evidence/02-product-shell/batch1/probe-1440-chip.png', clip: { x: 0, y: 0, width: 1440, height: 120 } });
await page.screenshot({ path: '/home/sandbox/ulara-r369/docs/redesign/r369/evidence/02-product-shell/batch1/probe-1440-rail.png', clip: { x: 1440 - 340, y: 0, width: 340, height: 900 } });
await browser.close();
