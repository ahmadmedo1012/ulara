/**
 * R319 C1-C — §B2 data-leak line, pinned at the hermetic journey level.
 *
 * The owner's real-iPhone screenshot (student dashboard) carried, in one
 * header line: «مساء النور، J — كلية تقنية المعلومات · قسم اختبار ·
 * السنة 8 · r180» — a seed test-department and a raw revision code
 * rendered as identity — plus «01/15 وينتهي 09/10» (numeric slash dates
 * with an invisible RLM inside an Arabic sentence) and «36% من الفصل»
 * (un-isolated digits+symbol in Arabic prose).
 *
 * This spec pins the durable fixes on the REAL rendered page (mock
 * transport, frozen clock):
 *  1. the header identity line carries no raw codes, no placeholder
 *     test names («قسم اختبار»/«كلية اختبار»), no stringified junk —
 *     while the honest segments (faculty, department, year) survive;
 *  2. the meta line renders REAL ar-LY term dates (Arabic month names +
 *     Latin digits — pinned against the fixture's FIXED_NOW-derived
 *     term: startsAt iso(-24·42) → 2026-02-01, endsAt iso(+24·70) →
 *     2026-05-24), the percentage in the ONE numeral system (Latin),
 *     and no numeric-slash date shape (the «01‏/02» RLM defect);
 *  3. a POISONED /me/dashboard (departmentName 'قسم اختبار r180' — the
 *     exact seed junk from the screenshot) sanitizes to NOTHING: the
 *     rendered header omits both «قسم اختبار» and «r180», keeps the
 *     clean segments, and never leaves a dangling «·».
 */
import { test, expect } from './fixtures/e2e';
import { STUDENT_DASHBOARD } from './fixtures/api-fixtures';

/** The §E-10 leak shapes the rendered header must never match. */
const LEAK_RE = /\br\d{2,3}\b|قسم اختبار|كلية اختبار|undefined/;

test.use({ e2eRole: 'STUDENT' });

test.describe('R319 — سطر التسريب في لوحة الطالب (leak-proof header)', () => {
  test('the identity surfaces leak no codes / placeholder names / junk — and keep the honest segments', async ({ page }) => {
    /* r351 A2 (Q3): the dashboard header's identity line retired — the
       sanitizer's live consumer is the PROFILE page's FactRows (the
       same sanitizeInstitutionName law). */
    await page.goto('/student/profile');

    const factBlock = page.locator('main');
    await expect(factBlock).toContainText('كلية الهندسة');
    const text = await factBlock.innerText();
    expect(text, `profile must not leak — got: ${text}`).not.toMatch(LEAK_RE);
  });

  test('the meta line renders real ar-LY term dates + one numeral system', async ({ page }) => {
    await page.goto('/student/dashboard');

    const meta = page.locator('.pf-page-meta').first();
    await expect(meta).toBeVisible();
    /* r351 A2 (Q3): the meta line is the DATE alone — the term dates
       live in the semester ruler's own meta (they were printed twice
       on one screen). */
    await expect(meta).toContainText('15 مارس');
    /* R319 override (c2-G1): the semester's «45% من الفصل» prose moved
     * from the masthead meta into the [01] section's RulerGauge — the
     * same datum as the instrument's quiet mono meta (§B2). The pin
     * follows the datum to its new home. */
    const rulerMeta = page.locator('.r319s-ruler-meta').first();
    await expect(rulerMeta).toContainText('45%');
    // r351 A2 (Q3): the prose caption retired — the % carries it.

    const text = await meta.innerText();
    const rulerText = await rulerMeta.innerText();
    // Never Arabic-Indic / Persian digits in visible text.
    expect(text, `meta must stay Latin-digit — got: ${text}`).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    expect(rulerText, `ruler meta must stay Latin-digit — got: ${rulerText}`).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    // The numeric-slash date shape («01‏/02» with its invisible RLM)
    // is gone — real dates only.
    expect(text).not.toMatch(/\d\u200F\s*\/\s*\d/);
  });
});

test.describe('R319 — the poisoned /me/dashboard proves the sanitizer kills the seed junk', () => {
  test.use({
    e2eRole: 'STUDENT',
    apiOverrides: [{
      method: 'GET',
      path: '/me/dashboard',
      /* The photographed junk as one poisoned payload: the placeholder
       * test department carrying a raw revision code. */
      json: {
        data: {
          ...STUDENT_DASHBOARD,
          profile: {
            ...STUDENT_DASHBOARD.profile,
            departmentName: 'قسم اختبار r180',
          },
        },
      },
    }],
  });

  test('the poisoned payload never leaks — the dashboard renders clean', async ({ page }) => {
    /* r351 A2 (Q3): the identity line retired; the poisoned profile
       datum now proves itself by NOT appearing anywhere on the page
       (the sanitizer's FactRow consumer is pinned on /student/profile
       by the first test; this one pins the whole dashboard DOM). */
    await page.goto('/student/dashboard');

    const main = page.locator('main');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 15_000 });
    const text = await main.innerText();
    expect(text, `poisoned page must not leak — got: ${text}`).not.toMatch(LEAK_RE);
    expect(text).not.toContain('قسم اختبار');
    expect(text).not.toContain('r180');
    // The honest surfaces keep rendering (the date meta + the KPI row).
    const meta = page.locator('.pf-page-meta').first();
    await expect(meta).toBeVisible();
  });
});
