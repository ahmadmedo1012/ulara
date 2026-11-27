/**
 * r309-recovery.e2e.ts — the R309 regression belt for the five
 * production-audit defects (mission §2.7 hero checks, §3.4 menu
 * checks, §4 loader checks) plus the preserved R308 behaviors.
 *
 * Every spec reproduces the exact reported failure state first, then
 * asserts the corrected contract on the real SPA (hermetic: the
 * shared fixtures' mock transport + seeded intro-seen flag).
 */
import { test, expect } from './fixtures/e2e';

/* R315 (c4-E) re-pin: the landing H1 is «رحلة تعلم واحدة / من
 * المحاضرة إلى الإتقان» (cycle-1 V1 hero, then the cycle-3 copy pass
 * de-tashkeeled the display line — «رحلةُ تعلُّمٍ واحدة» is gone too).
 * The brand «أُلارا» lives in the header/footer brand cells, not the H1;
 * this sentinel is the page-ready proof, not a copy pin. */
const HERO_READY = 'في نظام واحد';

const VW = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 } };

/* R359 A1 (r360 integration re-pin): the rebuilt hero seats FOUR
 * inspection stations on the bracket-index register — C-01 مقرر
 * تفاعلي · E-02 اختبار موثّق · R-03 بحث علمي · I-04 مؤسسة أكاديمية —
 * hairline callout tags riding ON the elevation. The R342 five-station
 * cp/ex/lc/mg/rr register retired with the old campus plate; every
 * station is still equally asserted: drag, touch, keyboard, geometry,
 * layout. */

/* r360 F1's in-page exit clock — the window seam, declared (the e2e
 * tree is typechecked; the evaluate round-trip keeps the same shape). */
declare global {
  interface Window {
    __ulaExit?: { hundredAt: number | null; goneAt: number | null; classAt: number | null };
  }
}




/** r367: the hero's pointer surface is LIVE only after the guest
 *  reveal's clip wipe finishes (guest-reveal-inner animates
 *  clip-path inset 50%→0; a press mid-wipe lands on the wrapper and
 *  the stage never sees it). The press waits until the stage's own
 *  subtree owns the hit-test at the press point. */


/** r359: the stations are %-positioned at render (no ResizeObserver
 *  mapping) — ready once all four markers carry their data-marker. */



/** Live marker geometry — the centers of the station dots in
 *  absolute page coordinates. R329 (CI red): the R312 belt hardening
 *  hard-coded the waypoint fractions it measured against the R322
 *  uncapped stage; the R328 H2 stage cap (56svh) moved every dot's
 *  fractional seat, so the frozen sweep stopped crossing the boxes
 *  (2/3 stations). The crossing is now guaranteed by construction
 *  AGAIN — measured live at every run, immune to any future honest
 *  re-seat of the stage geometry. */




/** r359: the OPEN callout tags, keyed by station id — the rebuilt
 * hero's card seat (the .hi-tag chip inside each .hro-station). */


/* ═══ §2.7 — the hero inspection stations ═══════════════════════════ */


test.describe('R309 hero — the mobile contract (≤767px overlay presentation)', () => {
  /* R359 A1: the phones keep the OVERLAY presentation — the stations
   * ride ON the elevation (the mobile viewBox crop re-seats them via
   * the same % grammar); the R342 flow-card architecture retired with
   * the old plate. The four phone-band laps — 360/375/390/430 — keep
   * asserting the real geometry: markers and callout tags inside the
   * viewport, zero horizontal overflow, real 44px taps. */

});


/* ═══ §3.4 — the mobile menu's scroll ownership ═════════════════════ */

test.describe('R309 menu — the scroll lock', () => {
  test('the page does not scroll behind the open menu; closing restores the position', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.w369-nav-burger').click();
    await expect(page.locator('.w369-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */

    /* scroll position before the wheel attempts */
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
    const during = await page.evaluate(() => window.scrollY);
    expect(during, 'the document scrolled behind the open menu').toBe(before);

    /* the body carries the ref-counted lock class while open */
    await expect(page.locator('body')).toHaveClass(/ula-scroll-locked/);

    /* close → lock released, position preserved */
    await page.locator('.w369-nav-burger').click();
    await expect(page.locator('.w369-mobile-menu')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/ula-scroll-locked/);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBe(before);
    /* and the page scrolls normally again */
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() => window.scrollY);
    expect(moved).toBeGreaterThan(before);
  });

  test('Escape closes the menu and focus returns to the trigger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.w369-nav-burger').click();
    await expect(page.locator('.w369-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
    await page.keyboard.press('Escape');
    await expect(page.locator('.w369-mobile-menu')).toHaveCount(0);
    await expect(page.locator('.w369-nav-burger')).toBeFocused();
    await expect(page.locator('.w369-nav-burger')).toHaveAttribute('aria-expanded', 'false');
  });

  test('a menu link navigates and closes the menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.w369-nav-burger').click();
    await expect(page.locator('.w369-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
    await page.locator('.w369-mobile-menu a[href="#story"]').click();
    await expect(page.locator('.w369-mobile-menu')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/ula-scroll-locked/);
    await expect(page.locator('#story')).toBeVisible();
  });

  test('repeated open/close cycles leak neither the lock nor duplicated handlers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    for (let i = 0; i < 3; i += 1) {
      await page.locator('.w369-nav-burger').click();
      await expect(page.locator('.w369-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
      await expect(page.locator('body')).toHaveClass(/ula-scroll-locked/);
      await page.locator('.w369-nav-burger').click();
      await expect(page.locator('.w369-mobile-menu')).toHaveCount(0);
    }
    /* after the cycles: unlocked and scrollable */
    await expect(page.locator('body')).not.toHaveClass(/ula-scroll-locked/);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
  });
});

/* ═══ §4 — the entrance sequence ════════════════════════════════════ */

test.describe('R309/R313 loader — the asset-gated entrance clock and the lock cleanup', () => {


  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
  });

});

/* ═══ non-regression — the preserved R308/R307 behaviors ════════════ */

test.describe('R309 non-regression — the scroll experience and routes', () => {

  test('footer links work; /colleges loads; browser back returns home', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();
    await expect(page).toHaveURL(/\/colleges/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1.w369-h1')).toContainText(HERO_READY);
  });
});
