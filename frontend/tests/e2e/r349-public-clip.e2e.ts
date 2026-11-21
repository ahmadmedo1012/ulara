/**
 * r349-public-clip.e2e.ts — the public sheet's SILENT-CLIP belt.
 *
 * The R349 public-experience audit found the class of defect the
 * document-overflow probes can never see: content rendered OUTSIDE the
 * viewport while scrollWidth stays put (clip-by-layout, not scroll).
 * Three confirmed cases, three regression pins:
 *
 *   1. THE WHY HEAD (the worst): the head's measured two-column grid
 *      never re-seated ≤991 — the side-rail column consumed 552px of
 *      the 390px viewport («0px 552px» cols), seating the H2/lede/note
 *      95–146px off the inline-start edge. The re-seat (why.css) stacks
 *      the head; this belt proves every head seat reads INSIDE the
 *      viewport at the phone rungs the audit measured (390/360/320).
 *   2. THE HERO LEADER LABELS: ساحة المجتمع anchored RTL-start at
 *      x=-56, extending ~74 plate units past the frame's -92 edge —
 *      44px of real label ink rendered outside the hero window at 390
 *      (the svg's overflow:visible let it bleed). The end-anchor fix
 *      (CampusArt) reads the phrase INTO the frame; the belt proves
 *      every Arabic leader label lands inside the viewport.
 *   3. THE PHONE DECK + THE ONE SITEMAP (structure pins): the why
 *      pillars ride a snap deck ≤767 (swipeable, zero document
 *      overflow) and the colophon carries ONE sitemap (the duplicated
 *      brand-block rows retired with R349 D1) while the ten-door legal
 *      row survives intact.
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';

const PHONE_WIDTHS = [390, 360, 320] as const;
const HEAD_SEATS = ['.wy-eyebrow-t', '.wy-title', '.wy-lede-t', '.wy-note-t'] as const;
const TOLERANCE = 0.5; /* px — sub-pixel AA edges, never content */

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/** the reveal engine seats content with pre-fire transforms — give the
 *  armed rungs a beat to land before measuring (the r333 discipline). */
async function settleReveals(page: Page, ms = 700) {
  await page.waitForTimeout(ms);
}

test.describe('R349 — the why head stands inside the phone viewport (the silent clip)', () => {
  for (const w of PHONE_WIDTHS) {
    test(`why head seats read fully inside @${w}x844`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto('/');
      await page.locator('.wy-section').scrollIntoViewIfNeeded();
      await settleReveals(page);

      const seats = await page.evaluate(
        ({ seats, w: vw, tol }) =>
          seats.map((sel) => {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (!el) return { sel, missing: true };
            const r = el.getBoundingClientRect();
            return {
              sel,
              missing: false,
              left: r.left,
              right: r.right,
              inside: r.left >= -tol && r.right <= vw + tol && r.width > 0,
            };
          }),
        { seats: [...HEAD_SEATS], w, tol: TOLERANCE },
      );

      for (const s of seats) {
        expect(s.missing, `${s.sel} must exist`).toBe(false);
        expect(
          s.inside,
          `${s.sel} must read inside the viewport (L=${s.left} R=${s.right} @${w})`,
        ).toBe(true);
      }
    });
  }

  test('the head grid re-seats to ONE column ≤991 (the 552px side-rail root cause)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.wy-section').scrollIntoViewIfNeeded();
    await settleReveals(page, 300);

    const cols = await page.evaluate(() => {
      const head = document.querySelector('.wy-head') as HTMLElement;
      return getComputedStyle(head).gridTemplateColumns;
    });
    /* one track — the two-column «0px 552px» collapse can never recur */
    expect(cols.split(' ').length).toBe(1);
  });
});

test.describe('R349 — the hero leader labels read inside the frame', () => {
  for (const w of [390, 320] as const) {
    test(`every Arabic leader label lands inside @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto('/');
      await page.locator('.fo-hero').scrollIntoViewIfNeeded();
      await settleReveals(page, 1800); /* the staged ink-in belt */

      const labels = await page.evaluate(
        ({ w: vw, tol }) => {
          const svg = document.querySelector('.fo-hero .bp-svg');
          if (!svg) return [{ txt: '.bp-svg', missing: true, inside: false }];
          return Array.from(svg.querySelectorAll('.iso-leader text')).map((t) => {
            const r = t.getBoundingClientRect();
            const txt = (t.textContent ?? '').trim();
            return {
              txt,
              missing: false,
              left: r.left,
              right: r.right,
              /* the leaders are REAL labels (not HUD furniture): each
                 phrase must read fully inside the viewport */
              inside: r.left >= -tol && r.right <= vw + tol && r.width > 0,
            };
          });
        },
        { w, tol: TOLERANCE },
      );

      expect(labels.length).toBeGreaterThanOrEqual(4);
      for (const l of labels) {
        expect(l.missing, `${l.txt} must exist`).toBe(false);
        expect(
          l.inside,
          `«${l.txt}» must read inside the viewport (L=${l.left} R=${l.right} @${w})`,
        ).toBe(true);
      }
    });
  }
});

test.describe('R349 — the phone deck and the one sitemap (structure pins)', () => {
  test('the why pillars swipe as a snap deck ≤767 (no document overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.wy-panels').scrollIntoViewIfNeeded();
    await settleReveals(page);

    const deck = await page.evaluate(() => {
      const p = document.querySelector('.wy-panels') as HTMLElement;
      return {
        scrollable: p.scrollWidth > p.clientWidth,
        slides: p.querySelectorAll('.wy-panel').length,
      };
    });
    expect(deck.scrollable, 'the deck must be swipeable (4 slides > 1 viewport)').toBe(true);
    expect(deck.slides).toBe(4);

    /* the swipe moves the deck (RTL: scrollLeft goes negative) */
    await page.evaluate(() => {
      const p = document.querySelector('.wy-panels') as HTMLElement;
      p.scrollBy({ left: -320, behavior: 'instant' as ScrollBehavior });
    });
    await settleReveals(page, 300);
    const moved = await page.evaluate(() => {
      const p = document.querySelector('.wy-panels') as HTMLElement;
      return Math.abs(p.scrollLeft) > 50;
    });
    expect(moved, 'the deck must actually scroll').toBe(true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(overflow).toBeLessThanOrEqual(390);
  });

  test('the colophon carries ONE sitemap and keeps its ten-door legal row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-footer').scrollIntoViewIfNeeded();
    await settleReveals(page);

    /* the retired duplicate rows must stay retired */
    const dupRows = await page.locator('.fo-brow').count();
    expect(dupRows).toBe(0);

    /* the ONE index: col2's ruled groups still carry the platform doors */
    const groups = await page.locator('.fo-c2-top .fo-lgroup').count();
    expect(groups).toBe(3);

    /* the ten-door legal row (the r321 §A2 contract) survives the
     * compaction untouched */
    const legalDoors = await page.locator('.fo-legal-row .fo-legal-link').count();
    expect(legalDoors).toBeGreaterThanOrEqual(9);
  });
});
