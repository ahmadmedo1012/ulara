/**
 * r319-student-pages-a.e2e.ts — C3-S1: the student ACADEMIC pages join
 * the sheet system (§B2 grammar sweep, the pages-A half of Cycle 3).
 *
 * The dashboard (r319-dashboard-material) + the shared shell
 * (r319-shell-chrome) already pin the frame/grain/ambient sheet code.
 * This spec pins THIS sweep's layer from the USER'S side of the glass —
 * STUDENT role, chromium, light theme, hermetic mock transport + frozen
 * clock (FIXED_NOW 2026-03-15T10:00Z):
 *
 *  1. SECTION BARS — every visited academic route opens its regions
 *     with the indexed title bar (`[01] مقرّراتك …`), the gutter
 *     index marked aria-hidden; ≥2 sections per route.
 *  2. INDICATORS — the §B2 instruments render where the data exists:
 *     CourseBar hairlines (course rows, lecture rows, matrix mastery),
 *     the mono StatusChip register (DUE nD on assignment rows), the
 *     BarCount mono meta on every bar.
 *  3. NO ROUNDED CHROME — the card class sample on each route
 *     computes borderRadius 0px (the R313 collapsed ladder — a
 *     regression here means someone re-widened a corner).
 *  4. The retired ambient page code stays absent from the rendered page.
 *
 * Routes: /student/courses · /student/courses/:offeringId (the seeded
 * OFFERING_ID fixture) · /student/matrix (stateful /me/matrix +
 * /me/gaps fixtures — the standard table carries no matrix corpus) ·
 * /student/library (books tab; the paginated books envelope carries
 * its meta SIBLING per the real backend's shape).
 */
import { expectSheetSections } from './fixtures/sheet-sections';
import { test, expect } from './fixtures/e2e';
import {
  OFFERING_ID, LIBRARY_BOOKS, LIBRARY_RESEARCH,
} from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk, statefulJson } from './fixtures/mock-transport';
import { R369_RADII } from './fixtures/r369-radii';

test.use({ e2eRole: 'STUDENT' });

/* ── the matrix corpus (standard table carries none) ──────────────── */

const MATRIX_FIXTURE = [
  {
    courseId: 'crs_e2e_algorithms',
    courseCode: 'CS-201',
    courseName: 'مقدمة في الخوارزميات',
    themeColor: '#7c3aed',
    offeringId: OFFERING_ID,
    concepts: [
      { id: 'cpt_e2e_1', name: 'تحليل التعقيد', level: 0.9, attempts: 4 },
      { id: 'cpt_e2e_2', name: 'الخوارزميات الجشعة', level: 0.5, attempts: 3 },
      { id: 'cpt_e2e_3', name: 'البرمجة الديناميكية', level: 0.2, attempts: 2 },
    ],
  },
];

const GAPS_FIXTURE = [
  {
    conceptId: 'cpt_e2e_3',
    conceptName: 'البرمجة الديناميكية',
    courseId: 'crs_e2e_algorithms',
    courseName: 'مقدمة في الخوارزميات',
    courseColor: '#7c3aed',
    level: 0.2,
    recommendedLectureId: 'lec_e2e_greedy',
    recommendedLectureTitle: 'الخوارزميات الجشعة',
  },
];

async function expectSheetContract(page: import('@playwright/test').Page) {
  /* r324 X10 re-pin: the ambient sheet code is RETIRED from the DOM
   * (the innerText jargon sweep — unit gate r324-text-gate.test.tsx and
   * PageHeader.test.tsx already pin the retirement; this e2e belt now
   * pins the same contract on the REAL rendered page: the corner-code
   * line must be gone, never half-alive). Structure-agnostic — some
   * of these routes carry no h1.pf-page-title, so the belt reads the
   * page's own text, not a specific header node. */
  const code = page.locator('.page-sheet-code');
  await expect(code).toHaveCount(0);
  const pageText = await page.evaluate(() => document.body?.innerText ?? '');
  expect(pageText).not.toContain('SHEET S-01');
}

test.describe('student pages A — §B2 sheet grammar (chromium · light)', () => {
  test.use({ themeSeed: 'light' });

  test('/student/courses — [01] مقرّراتك + [02] الواجبات القادمة with CourseBars and DUE chips', async ({ page }) => {
    await page.goto('/student/courses');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    const heads = await expectSheetSections(page, [['01', 'مقرّراتك'], ['02', 'الواجبات القادمة']]);
    await expect(page.getByRole('table', { name: 'قائمة المقرّرات المسجّلة' }).getByRole('row')).toHaveCount(3);
    await expect(heads.nth(1).locator('.r319s-count')).toHaveText('01');

    // The per-course CourseBars — the fixture's two enrollments (62% and
    // 100%), hairline track + end-tick + mono pct readout.
    const bars2 = page.locator('.r319s-coursebar');
    await expect(bars2).toHaveCount(2);
    const pcts = await bars2.locator('.r319s-coursebar-pct').allTextContents();
    expect(pcts).toEqual(['62%', '100%']);
    expect(await bars2.first().getAttribute('role')).toBe('meter');

    // The upcoming assignment's due state — the mono chip register.
    const chip = page.locator('.r319s-chip').first();
    await expect(chip).toHaveText(/^(متأخر|اليوم|غدًا|بعد يومين|بعد \d+ أيام|موعد)$/);
    expect(R369_RADII).toContain(await chip.evaluate((el) => getComputedStyle(el).borderRadius));

    // The card-class sample computes radius 0 (the collapsed ladder).
    const rowlist = page.locator('.pf-rowlist').first();
    await expect(rowlist).toBeVisible();
    expect(R369_RADII).toContain(await rowlist.evaluate((el) => getComputedStyle(el).borderRadius));

    await expectSheetContract(page);
  });

  test('/student/courses/:offeringId — [01]…[05] course sections, lecture CourseBar, DUE chip', async ({ page }) => {
    await page.goto(`/student/courses/${OFFERING_ID}`);
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    const heads = await expectSheetSections(page, [['01', 'مؤشرات المقرّر'], ['02', 'المحاضرات'], ['03', 'المواد المرفقة'], ['04', 'الجدول الأسبوعي'], ['05', 'الواجبات']]);
    await expect(heads.nth(1).locator('.r319s-count')).toBeVisible();

    const lecBar = page.getByRole('table', { name: 'محاضرات المقرر' }).getByRole('meter');
    await expect(lecBar).toHaveCount(2);
    await expect(lecBar.locator('.r319s-coursebar-pct')).toHaveText(['100%', '62%']);

    // The assignment row's due chip — the mono register.
    await expect(page.locator('.r319s-chip').first()).toHaveText(/^(متأخر|اليوم|غدًا|بعد يومين|بعد \d+ أيام|موعد)$/);

    // The continue strip (the page's one-action rail) computes radius 0.
    const rail = page.locator('.r305c-continue');
    await expect(rail).toBeVisible();
    expect(R369_RADII).toContain(await rail.evaluate((el) => getComputedStyle(el).borderRadius));

    await expectSheetContract(page);
  });

  test('/student/matrix — [01] gaps + [02] heatmap with the per-course mastery bar', async ({ page }) => {
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/me/matrix',
        fulfill: async ({ route }) => {
          await statefulOk(route, MATRIX_FIXTURE);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => {
          await statefulOk(route, GAPS_FIXTURE);
        },
      },
    ]);

    await page.goto('/student/matrix');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    const heads = await expectSheetSections(page, [['01', 'فجواتك ذات الأولوية'], ['02', 'مصفوفتك حسب المقرّر']]);
    await expect(heads.locator('.r319s-count')).toHaveText(['01', '03']);

    // The per-course mastery CourseBar — (0.9 + 0.5 + 0.2) / 3 → 53%.
    const mastery = page.locator('.r319sp-matrix-bar .r319s-coursebar');
    await expect(mastery).toHaveCount(1);
    await expect(mastery.locator('.r319s-coursebar-pct')).toHaveText('53%');
    expect(await mastery.getAttribute('role')).toBe('meter');

    // The matrix course block (the card class sample) computes radius 0.
    const block = page.locator('.matrix-course').first();
    await expect(block).toBeVisible();
    expect(R369_RADII).toContain(await block.evaluate((el) => getComputedStyle(el).borderRadius));

    await expectSheetContract(page);
  });

  test('/student/library — books tab: [01] استعاراتي + [02] الكتب with the mono count meta', async ({ page }) => {
    const books = LIBRARY_BOOKS.map((b) => ({ ...b }));
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/library/books**',
        fulfill: async ({ route }) => {
          /* The paginated envelope's meta rides as a SIBLING of data
           * (the real backend's shape — the page's total reads
           * meta.total, never the page array). */
          await statefulJson(route, 200, {
            data: books,
            meta: { page: 1, limit: 24, total: books.length, totalPages: 1 },
          });
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/research/published',
        fulfill: async ({ route }) => {
          await statefulOk(route, LIBRARY_RESEARCH);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/loans',
        fulfill: async ({ route }) => {
          await statefulOk(route, []);
        },
      },
    ]);

    await page.goto('/student/library');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    const heads = await expectSheetSections(page, [['01', 'استعاراتي'], ['02', 'الكتب']]);
    const booksBar = heads.nth(1);
    await expect(booksBar.locator('.r319s-count')).toHaveText('02');

    // The honest empty loans region renders (no fabricated rows) — the
    // indicator/empty contract: the page carries its §B2 count meta
    // AND the reserved-but-empty loans line.
    const loansPanel = page.locator('section.sg-section').filter({ has: page.getByRole('heading', { name: 'استعاراتي', exact: true }) });
    await expect(loansPanel).toContainText('لا استعارات نشطة');

    // The panel (the card class sample) computes radius 0.
    expect(R369_RADII).toContain(await loansPanel.evaluate((el) => getComputedStyle(el).borderRadius));

    await expectSheetContract(page);
  });
});
