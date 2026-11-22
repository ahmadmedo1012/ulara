/**
 * student-dashboard.e2e.ts — لوحة تحكم الطالب (r164-k).
 *
 * يثبّت رحلة الهبوط الأساسية للطالب: التحية بالاسم من الجلسة،
 * صفّ KPI، بطاقة الاستئناف (PP-X2)، والأجندة المركّبة من
 * الحصص/المهام — كلها من حمولة /me/dashboard + /me/resume الوهمية
 * الملتزمة بعقد الأظرف الحقيقي.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

test.describe('لوحة تحكم الطالب', () => {
  test('التحية والهوية وصفّ KPI يُعرضون ببيانات حقيقية', async ({ page }) => {
    await page.goto('/student/dashboard');

    // التحية من الساعة المجمدة (10:00 UTC → «صباح الخير») + الاسم من
    // جلسة ula-auth المبذورة.
    /* R189→R287 re-pin: the masthead — the patterns PageHeader h1
       carries the nav-label identity («لوحة التحكم»، r183-B6 contract),
       r351: the greeting/identity line retired — the h1 + date meta carry the header; the KPI row
       is the StatLine (pf-statlabel). */
    const h1 = page.locator('h1.pf-page-title');
    await expect(h1).toHaveText('لوحة التحكم');
    /* r351 A2 (Q3): the greeting retired — the date meta is the only
       line under the h1 (the identity lives in the shell user menu). */
    await expect(page.locator('.pf-page-meta')).toBeVisible();

    // صفّ المؤشرات — التسميات الخمس الحقيقية (الأرقام تتظاهر عبر CountIn).
    for (const label of ['المعدل التراكمي', 'نسبة الحضور', 'مهام معلّقة', 'نقاط الإنجاز', 'إنجاز المقرّرات']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('بطاقة «أكمل من حيث توقفت» تعرض المحاضرة المتوقّفة و CTA مباشرًا إليها', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* R304 re-pin: the resume card left the TodayList — it is the
       dashboard's ONE hero band now (.dash-resume-card.stu-hero,
       DashResumeHero): the eyebrow carries the «تابع»
       verb, the main column the course name + lecture ordinal/title,
       and the side note the code + lecture clock. The hero CTA is the
       a.btn.accent whose href goes straight to the paused lecture. */
    const resume = page.locator('.dash-resume-card');
    await expect(resume).toBeVisible();
    await expect(resume.locator('.dash-resume-eyebrow')).toHaveText('تابع');
    await expect(resume).toContainText('مقدمة في الخوارزميات');
    await expect(resume).toContainText('CS-201');
    await expect(resume).toContainText('الخوارزميات الجشعة');
    await expect(
      resume.locator('a[href="/student/lectures/lec_e2e_greedy"]'),
    ).toBeVisible();
  });

  test('الأجندة تعرض حصص اليوم/الغد والمهمة القادمة مع تسمية الموعد', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* R189 re-pin: the agenda is the TODAY ledger + the week ledger.
       حصة اليوم تقود سجلّ اليوم؛ والمهمة بعد 3 أيام تسكن سجلّ الأسبوع. */
    await expect(page.getByRole('heading', { name: 'اليوم', exact: true })).toBeVisible();
    await expect(page.getByText('المهام والفصول القادمة', { exact: true })).toHaveCount(0);

    // حصة اليوم — في سجلّ «اليوم»، التسمية الحرفية «اليوم» من DAY_LABEL.
    // (R287: نحدّد بالـhref — صفّ «أكمل من حيث توقفت» يحمل نفس اسم المقرّر في عنوانه.)
    const todayRow = page.locator('li.pf-today-item', { hasText: 'قاعة A2' });
    await expect(todayRow).toContainText('مقدمة في الخوارزميات');
    await expect(todayRow).toContainText('اليوم');
    /* r351 A2 (Q3): the «أسبوعك القادم» section retired — the task
       after 3 days rides the TODAY list's upcoming row (the week strip
       carries the week glance; the calendar owns beyond-today). */
    const taskRow = page.locator('li.pf-today-item, .pf-today-list li', { hasText: 'واجب الأسبوع الثالث' });
    /* r351 A2 (Q3): the honest deadline chip carries the reading (the
       relative-date meta retired with the week section). */
    await expect(taskRow.first()).toContainText('واجب الأسبوع الثالث');
    await expect(taskRow.first().locator('.r319s-chip')).toContainText('DUE 3D');
    // صف الأجندة: العنوان نفسه هو الرابط (PP-X2 audit P1-8 — Link على مستوى الصف).
    // الحصة والواجب كلاهما يقود إلى المقرّر نفسه، فالتحديد على صفّ الحصة
    // لا على الـhref وحده (r351 A2: الواجب صار صفًّا في القائمة نفسها).
    await expect(
      todayRow.locator('a.pf-today-link[href="/student/courses/offr_e2e_algorithms"]'),
    ).toBeVisible();
  });
});
