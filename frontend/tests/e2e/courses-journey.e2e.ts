/**
 * courses-journey.e2e.ts — رحلة المقرّرات (r164-k).
 *
 * مسار ثلاثي حقيقي: قائمة «مقرّراتي الدراسية» → بطاقة المقرّر →
 * تفاصيل العرض (offering full) → مشغّل المحاضرة. كل خطوة عبر روابط
 * DOM حقيقية وبيانات من النقل الوهمي (enrollments/me + offerings/full
 * + lectures/:id)، مع عناوين التبويب من resolveTitle (AppShell).
 */
import { test, expect } from './fixtures/e2e';
import { LECTURE_ID, OFFERING_ID } from './fixtures/api-fixtures';

test.use({ e2eRole: 'STUDENT' });

test.describe('رحلة المقرّرات', () => {
  test('القائمة → تفاصيل المقرّر → مشغّل المحاضرة', async ({ page }) => {
    /* 1 — قائمة المقرّرات */
    await page.goto('/student/courses');
    // usePageTitle: «<السياق> · أُلارا».
    await expect(page).toHaveTitle('مقرّراتي الدراسية · أُلارا');
    const enrolled = page.locator('.sg-kpi').filter({ hasText: 'مقرّرات مسجَّلة هذا الفصل' });
    await expect(enrolled.locator('.sg-kpi-value')).toHaveText(/^[2٢]$/);
    const cardRow = page.getByRole('row').filter({ hasText: 'مقدمة في الخوارزميات' });
    const card = cardRow.getByRole('link', { name: 'مقدمة في الخوارزميات' });
    await expect(card).toContainText('مقدمة في الخوارزميات');
    await expect(cardRow).toContainText('CS-201');
    await expect(cardRow).toContainText('د. ليلى الفيتوري');

    /* 2 — تفاصيل المقرّر */
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/student/courses/${OFFERING_ID}$`));
    await expect(page).toHaveTitle('مقدمة في الخوارزميات · أُلارا'); // r315 C4-E re-pin (content-anchored): r183-B6 — the tab names the COURSE (CourseDetailPage.tsx:118)
    // هيكل البطل: اسم المقرّر + الأستاذ (من offerings/full).
    await expect(page.getByText('مقدمة في الخوارزميات').first()).toBeVisible();
    await expect(page.getByText('ليلى الفيتوري').first()).toBeVisible();

    /* 3 — صف المحاضرة «التالية» ثم المشغّل */
    // r164-d: زرّ «التالي: المحاضرة» الرئيسيّ يقود للدرس غير المكتمل
    // نفسه — وجوده دليل دمج r164d؛ نثبّته ثم ندخل من صف القائمة.
    const nextCta = page.getByRole('link', { name: 'التالي: المحاضرة' });
    await expect(nextCta).toHaveAttribute('href', `/student/lectures/${LECTURE_ID}`);
    const lecRow = page.getByRole('link', { name: /المحاضرة.*الخوارزميات الجشعة/ });
    await expect(lecRow).toContainText('الخوارزميات الجشعة');
    await expect(lecRow).toContainText('المحاضرة');
    await lecRow.click();

    await expect(page).toHaveURL(new RegExp(`/student/lectures/${LECTURE_ID}$`));
    // r315 C4-E re-pin (content-anchored): r183-B6 (A4 P3-4) — the tab names
    // the LECTURE, not the generic «مشغّل المحاضرة» (LecturePlayerPage.tsx:132).
    await expect(page).toHaveTitle('الخوارزميات الجشعة · أُلارا');
    // المشغّل يعرض عنوان المحاضرة + عنصر الفيديو + فصول المشاهدة.
    await expect(page.getByText('الخوارزميات الجشعة').first()).toBeVisible();
    await expect(page.locator('video').first()).toBeAttached();
    await expect(page.getByText('أمثلة وتطبيقات').first()).toBeVisible();
  });
});
