import { chromium } from 'playwright';
const browser = await chromium.launch({});
const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('ula-auth', JSON.stringify({ state: { user: { id: 'x', email: 's@t.ly', firstName: 'طالب', lastName: 'ت', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 't', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' }, version: 1 }));
  sessionStorage.setItem('ulara-intro-skip', '1');
});
await page.goto('http://127.0.0.1:5310/student/dashboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const find = (txt) => [...document.querySelectorAll('.sidebar *')].find((el) => el.children.length === 0 && el.textContent?.trim().startsWith(txt));
  const a = find('المجتمع والفرص'), b = find('عرض الجولة');
  const rect = (el) => el ? JSON.stringify(el.getBoundingClientRect()) : null;
  return {
    a: rect(a), b: rect(b),
    aClass: a?.className, bClass: b?.className,
    aParent: a?.parentElement?.className, bParent: b?.parentElement?.className,
    sidebarH: document.querySelector('.sidebar')?.getBoundingClientRect().height,
    navScroll: document.querySelector('.sidebar-nav')?.scrollHeight,
    navClient: document.querySelector('.sidebar-nav')?.clientHeight,
  };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: 'docs/redesign/r369/evidence/02-product-shell/batch2/probe-1920-sidebar.png', clip: { x: 1920 - 320, y: 550, width: 320, height: 350 } });
await browser.close();
