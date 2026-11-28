import { chromium } from 'playwright';
const OUT = 'docs/redesign/r369/evidence/02-product-shell/batch2';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const NOTIFS = [
  { id: 'n1', type: 'ACADEMIC', title: 'محاضرة تحضيرية غداً', body: 'تنعقد المحاضرة التحضيرية لمقرر البرمجة ٢ غداً الساعة العاشرة.', link: null, readAt: null, createdAt: new Date(Date.now() - 3600e3).toISOString() },
  { id: 'n2', type: 'URGENT', title: 'رصدت درجة اختبار قواعد البيانات', body: null, link: null, readAt: null, createdAt: new Date(Date.now() - 7200e3).toISOString() },
  { id: 'n3', type: 'SYSTEM', title: 'اكتمل رفع تسجيل المحاضرة', body: 'يمكنك مشاهدتها الآن من صفحة المقرر.', link: null, readAt: new Date(Date.now() - 86400e3).toISOString(), createdAt: new Date(Date.now() - 86400e3).toISOString() },
];

async function seed(page, dark) {
  await page.addInitScript((d) => {
    localStorage.setItem('ula-auth', JSON.stringify({ state: { user: { id: 'x', email: 's@t.ly', firstName: 'طالب', lastName: 'ت', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 't', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' }, version: 1 }));
    if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
    sessionStorage.setItem('ulara-intro-skip', '1');
  }, dark);
  await page.route('**/api/v1/notifications?limit=1**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { unread: 2 } }) }));
  await page.route('**/api/v1/search/global**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {
    courses: [{ id: 'c1', title: 'البرمجة ٢', subtitle: 'كلية علوم الحاسوب', href: '/student/courses/c1', iconEmoji: null, themeColor: null }],
    lectures: [{ id: 'l1', title: 'مدخل إلى البرمجة كائنية التوجه', subtitle: 'البرمجة ٢ · المحاضرة ٤', href: '/student/lectures/l1', iconEmoji: null, themeColor: null }],
    papers: [],
    tracks: [{ id: 't1', title: 'مسار أساسيات البرمجة', subtitle: '٦ وحدات', href: '/student/training/t1', iconEmoji: null, themeColor: null }],
  } }) }));
  await page.route('**/api/v1/notifications?limit=50**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: NOTIFS }) }));
}

const browser = await chromium.launch({});
for (const dark of [false, true]) {
  const sfx = dark ? '-dark' : '';
  // 1. palette open at 1440
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
  let page = await ctx.newPage();
  await seed(page, dark);
  await page.goto('http://127.0.0.1:5310/student/dashboard', { waitUntil: 'networkidle' });
  await page.click('.topbar-search');
  await page.keyboard.type('برمجة', { delay: 30 });
  await page.waitForTimeout(900);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/palette-1440${sfx}.png`, clip: { x: 0, y: 0, width: 760, height: 560 } });
  // 2. notifications open at 1440
  await page.keyboard.press('Escape');
  await page.click('.topbar-notif');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/notif-1440${sfx}.png`, clip: { x: 0, y: 0, width: 760, height: 640 } });
  await ctx.close();
  // 3. mobile 390: dock + More drawer + palette via search toggle
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  page = await ctx.newPage();
  await seed(page, dark);
  await page.goto('http://127.0.0.1:5310/student/dashboard', { waitUntil: 'networkidle' });
  await page.click('button[aria-label="المزيد — فتح القائمة الكاملة"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/drawer-390${sfx}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.click('.topbar-notif');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/notif-390${sfx}.png` });
  await ctx.close();
  console.log(`OK batch2 ${sfx || 'light'}`);
}
await browser.close();
