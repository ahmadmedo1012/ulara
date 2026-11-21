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
          if (!svg) return [{ txt: '.bp-svg', missing: true, inside: false, left: 0, right: 0 }];
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

/* ═══════════════════════════════════════════════════════════════════
   R349 (wave 2) — the journey's three dead seats + the resolve's
   phone band + the colophon's channels row. Every pin below guards a
   defect the first R349 sweep confirmed on the live branch:
     · THE CAPTION'S DEAD REF — captionRef was never attached, so the
       assembly clock's exit window (step a) was dead code: the
       «الرحلة — المنظومة تتجمع» statement rode the drawing for the
       band's WHOLE scrub at every width (the audit's
       heading-over-artwork defect). The ref lands; the exit breathes.
     · THE FINDING-'0' BLANK CARD — the ≤991 story card forced its
       body open from frame one while the findings machine kept every
       finding at opacity 0 until data-finding='1' (~25% of the phone
       track): a dark «مقدمة» chip over a ~10.2em EMPTY paper box.
       The '0' beat now reads finding 1 (CSS seat) — AND the finding
       seats inside its wrapper (the R342-11 `position: static` let
       the absolute findings escape to the sticky window's origin,
       their first line UNDER the chip at every story beat).
     · THE PANEL'S BLANK UNFOLD — the 0.62→0.85 clip held a near-empty
       paper box over the yielding plate for ~23% of the band while
       the header waited at 0.85. The compressed windows (clip →0.74,
       head 0.76→0.82, rows 0.78+) settle every row by ~0.92.
     · THE PARKED-SKETCH PHONE BAND — the CTA sheet's 13.91rem sketch
       row painted an empty box on the conversion screen at ≤767 (the
       content parked at 0×0 since T-10d2). The row retires.
     · THE CHANNELS ROW — the colophon's CHANNELS group duplicated
       the legal row's six doors verbatim (the audit's «repeated
       navigation strings»); ONE index + ONE policy row carry them.
   ═══════════════════════════════════════════════════════════════════ */

/** scroll to a journey pin progress and let the driver settle (the
 *  r312 convergence discipline: the intro card's stage flips change
 *  the sticky window's height, so the first hop can overshoot). */
async function scrollToJourneyPin(page: Page, p: number, mobile: boolean) {
  let prev = -1;
  for (let i = 0; i < 4; i += 1) {
    const landed = await page.evaluate(
      ({ p, mobile }) => {
        const track = document.querySelector('.jt') as HTMLElement;
        const col = document.querySelector('.jt-map-col') as HTMLElement;
        const win = document.querySelector('.jt-map-in') as HTMLElement;
        let target: number;
        if (mobile) {
          const cRect = col.getBoundingClientRect();
          const colTop = cRect.top + window.scrollY;
          const winH = win.getBoundingClientRect().height;
          const stickyTop = parseFloat(getComputedStyle(win).top) || 0;
          target = colTop - stickyTop + p * (cRect.height - winH);
        } else {
          const r = track.getBoundingClientRect();
          target = r.top + window.scrollY + p * (r.height - window.innerHeight);
        }
        window.scrollTo({ top: target, behavior: 'instant' });
        return Math.round(window.scrollY);
      },
      { p, mobile },
    );
    await page.waitForTimeout(430);
    if (Math.abs(landed - prev) < 2) break;
    prev = landed;
  }
  await page.waitForTimeout(350);
}

test.describe('R349 — the caption exit breathes (the dead-ref belt)', () => {
  for (const [label, vw, mobile] of [
    ['390', { width: 390, height: 844 }, true],
    ['1440', { width: 1440, height: 1000 }, false],
  ] as const) {
    test(`the caption is written and gone by mid-band @${label}`, async ({ page }) => {
      await page.setViewportSize(vw);
      await page.goto('/');
      await page.waitForFunction(
        () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
        undefined,
        { timeout: 8000 },
      );

      /* mid-band the exit window is long past at both widths (mobile
       * span 0.025 · desktop 0.10): the driver must have WRITTEN the
       * caption hidden — the pre-fix dead ref left the inline style
       * empty and the statement standing over the drawing. */
      await scrollToJourneyPin(page, 0.5, mobile);
      const cap = await page.evaluate(() => {
        const el = document.querySelector('.jt-caption') as HTMLElement | null;
        if (!el) return { missing: true };
        return {
          missing: false,
          inlineOpacity: el.style.opacity,
          visibility: el.style.visibility,
          computedVisibility: getComputedStyle(el).visibility,
        };
      });
      expect(cap.missing, 'the caption seat must exist').toBe(false);
      expect(cap.inlineOpacity, 'the driver must own the caption (the ref is attached)').not.toBe('');
      expect(cap.computedVisibility).toBe('hidden');
    });
  }
});

test.describe('R349 — the phone story card reads from frame one (no blank box)', () => {
  test('finding 1 stands during the data-finding=0 beat, below the chip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 8000 },
    );

    /* the pre-story beat (stage 0–1): the card's body must carry the
     * FIRST finding at full ink — the pre-fix blank box. */
    await scrollToJourneyPin(page, 0.06, true);
    const state = await page.evaluate(() => {
      const track = document.querySelector('.jt') as HTMLElement;
      const chip = document.querySelector('.jt-intro-headchip') as HTMLElement;
      const f1 = document.querySelector('.jt-intro-finding:nth-child(1)') as HTMLElement;
      if (!chip || !f1) return { missing: true };
      const cr = chip.getBoundingClientRect();
      const fr = f1.getBoundingClientRect();
      return {
        missing: false,
        finding: track.dataset.finding,
        f1Opacity: getComputedStyle(f1).opacity,
        /* the mis-seat belt: the absolute finding seats INSIDE the
         * findings wrapper (its relative containing block) — its top
         * can never ride under the dark chip again. */
        f1Top: +fr.top.toFixed(1),
        chipBottom: +cr.bottom.toFixed(1),
      };
    });
    expect(state.missing).toBe(false);
    expect(state.finding).toBe('0');
    expect(parseFloat(state.f1Opacity ?? '0')).toBeGreaterThanOrEqual(0.9);
    expect(
      state.f1Top,
      `the finding seats below the chip (top ${state.f1Top} vs chip bottom ${state.chipBottom})`,
    ).toBeGreaterThanOrEqual(state.chipBottom! - 1);
  });

  test('the desktop stage-2 card opens WITH its first finding (no blank window)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 8000 },
    );

    /* pRaw ≈ 0.42 lands inside stage 2 (t 2.5–3.0): the card + its
     * body open at stage 2, and the pre-fix wrapper seat waited for
     * stage 3 — a ~0.5s blank paper card over the plan on every
     * desktop width. The wrapper now opens with the body; the first
     * finding must already read. */
    await scrollToJourneyPin(page, 0.42, false);
    const state = await page.evaluate(() => {
      const track = document.querySelector('.jt') as HTMLElement;
      const wrap = document.querySelector('.jt-intro-findings') as HTMLElement;
      const f1 = document.querySelector('.jt-intro-finding:nth-child(1)') as HTMLElement;
      return {
        stage: track.dataset.stage,
        finding: track.dataset.finding,
        wrapOpacity: wrap ? getComputedStyle(wrap).opacity : null,
        f1Opacity: f1 ? getComputedStyle(f1).opacity : null,
      };
    });
    expect(state.stage).toBe('2');
    expect(state.finding).toBe('1');
    expect(parseFloat(state.wrapOpacity ?? '0')).toBeGreaterThanOrEqual(0.9);
    expect(parseFloat(state.f1Opacity ?? '0')).toBeGreaterThanOrEqual(0.9);
  });
});

test.describe('R349 — the capability panel settles by 92% (no blank unfold)', () => {
  for (const [label, vw, mobile] of [
    ['390', { width: 390, height: 844 }, true],
    ['1440', { width: 1440, height: 1000 }, false],
  ] as const) {
    test(`the head and every row carry ink @${label}`, async ({ page }) => {
      await page.setViewportSize(vw);
      await page.goto('/');
      await page.waitForFunction(
        () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
        undefined,
        { timeout: 8000 },
      );

      /* the compressed windows settle every row by ~0.92; the retired
       * windows left the header at 0 and the rows mid-flight here. */
      await scrollToJourneyPin(page, 0.93, mobile);
      const panel = await page.evaluate(() => {
        const head = document.querySelector('.map-panel-head') as HTMLElement | null;
        const rows = Array.from(document.querySelectorAll('.map-panel-row')) as HTMLElement[];
        return {
          headOpacity: head ? head.style.opacity : null,
          rowOpacities: rows.map((r) => r.style.opacity),
        };
      });
      expect(parseFloat(panel.headOpacity ?? '0')).toBeGreaterThanOrEqual(0.99);
      expect(panel.rowOpacities).toHaveLength(4);
      for (const o of panel.rowOpacities) {
        expect(parseFloat(o ?? '0')).toBeGreaterThanOrEqual(0.99);
      }
    });
  }
});

test.describe('R349 — the resolve sheet retires the parked phone band + the channels row', () => {
  test('the sketch band is gone at 390 and the ledger runs two rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-cta').scrollIntoViewIfNeeded();
    await settleReveals(page);

    const state = await page.evaluate(() => {
      const band = document.querySelector('.fo-cta-band-sketch') as HTMLElement | null;
      const ledger = document.querySelector('.fo-cta-ledger') as HTMLElement | null;
      return {
        bandDisplay: band ? getComputedStyle(band).display : 'absent',
        rows: ledger ? getComputedStyle(ledger).gridTemplateRows : null,
      };
    });
    expect(state.bandDisplay).toBe('none');
    /* two tracks — the retired 13.91rem sketch row can never return */
    expect((state.rows ?? '').split(' ')).toHaveLength(2);
  });

  test('the colophon carries no channels row while the legal row keeps its ten doors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-footer').scrollIntoViewIfNeeded();
    await settleReveals(page);

    expect(await page.locator('.fo-socials').count()).toBe(0);
    expect(await page.locator('.fo-legal-row .fo-legal-link').count()).toBeGreaterThanOrEqual(9);
  });
});
