/**
 * r354-final.e2e.ts — the closing hardening belt (the final-phase
 * directives §6/§11): REAL-BROWSER geometry for the defects this round
 * fixed, not source-text assumptions.
 *
 *   1. HERO CAMPUS GEOMETRY — across 360/390/768/1024/1280/1440: the
 *      campus SVG renders at a real size (the composition regression:
 *      the r353 window read 33.7% of the 1440 band; the rebalanced
 *      window ≥45%), no horizontal overflow, and the four inspection
 *      stations sit ON the artwork (station centers inside the SVG's
 *      rect), each carrying a ≥44px hit target and an accessible name,
 *      each a real focusable button.
 *   2. THE JOURNEY EXIT at exact clock beats (the r354-final window
 *      out t 2.15–2.35): full presence at t 2.10, mid-fall at t 2.20,
 *      GONE by t 2.35 — and the exit completes while the satellite
 *      layer is still resolving (the clean-window invariant), desktop
 *      AND the ≤991 warp; the halo belt is the em-keyed text-shadow
 *      (12+ passes) with the retired SVG-stroke declarations gone.
 *   3. WHY — the settled plate under reduced motion (every loop
 *      element at opacity 1 — the «faint unfinished capture» defect
 *      can never be a rest state) + the NEXT STEP chip's REAL rendered
 *      clearance off the recommendation box (SVG client rects, not
 *      source constants).
 *   4. PAINS — the four indexed challenges and their answers at three widths.
 *   5. ROLES — five platform entry roles, three labelled use cases,
 *      the [05/05] group divider, keyboard-operable accordion rows.
 *   6. THEME — the dark tier resolves the royal seat to its measured
 *      dark value (the strong text tier), through the real store.
 */
import { test, expect } from './fixtures/e2e';
import { approachSection, scrollToPin } from './fixtures/landing-scene';
import type { Page } from '@playwright/test';

const HERO_READY = 'رحلة تعلم واحدة';

/** band progress → the scene clock t (desktop: linear; mobile: the warp). */
const pinForT = (t: number, mobile: boolean) =>
  mobile
    ? 1.034 * Math.pow(t / 5.52, 1 / 0.55) - 0.082
    : (t / 5.52) * 1.034 - 0.082;

async function awaitJourney(page: Page) {
  await approachSection(page, 'chapters');
  await page.waitForFunction(
    () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
    undefined,
    { timeout: 8000 },
  );
}

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* ── 1 · the hero campus geometry ─────────────────────────────────── */

const HERO_BELTS = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
  { w: 360, h: 800 },
] as const;

test.describe('R354-final · the hero campus geometry (real browser)', () => {
  for (const { w, h } of HERO_BELTS) {
    test(`${w}x${h}: the campus reads at scale, stations sit on the art, no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
      await page.waitForTimeout(600);

      const seat = await page.evaluate(() => {
        const svg = document.querySelector<SVGSVGElement | HTMLImageElement>('.hro-stage .hro-elevation');
        const stations = Array.from(document.querySelectorAll('.fo-hero .hi-marker')).map((el) => {
          const r = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-marker'),
            label: el.getAttribute('aria-label') || '',
            tag: el.tagName,
            w: r.width,
            h: r.height,
            cx: r.x + r.width / 2,
            cy: r.y + r.height / 2,
          };
        });
        const loaded = !(svg instanceof HTMLImageElement) || (svg.complete && svg.naturalWidth > 0);
        const sr = svg && loaded ? svg.getBoundingClientRect() : null;
        return {
          vw: innerWidth,
          svg: sr ? { x: sr.x, y: sr.y, w: sr.width, h: sr.height } : null,
          hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          stations,
        };
      });

      expect(seat.svg, 'the campus SVG renders').not.toBeNull();
      expect(seat.hOverflow, `${w}: no horizontal overflow`).toBe(false);
      expect(seat.stations.map((s) => s.id)).toEqual(['C-01', 'E-02', 'R-03', 'I-04']);
      if (seat.svg) {
        /* the composition floor: at the wide belts the campus window
         * must read at ≥45% of the band (the rebalanced 184×100
         * window; the r353 defect read 33.7%). Mobile belts crop the
         * letterbox to the sheet's width — the floor is the fit. */
        if (w >= 1024) {
          expect(
            seat.svg.w / seat.vw,
            `${w}: campus ≥45% of the viewport band (was 33.7% pre-fix)`,
          ).toBeGreaterThanOrEqual(0.45);
        }
        for (const st of seat.stations) {
          expect(st.tag, 'stations are real buttons').toBe('BUTTON');
          expect(st.label.length, 'each station carries an accessible name').toBeGreaterThan(8);
          expect(Math.min(st.w, st.h), 'the 44px hit target (tolerance 4)').toBeGreaterThanOrEqual(40);
          expect(
            st.cx >= seat.svg.x - 4 && st.cx <= seat.svg.x + seat.svg.w + 4,
            `station «${st.label.slice(0, 18)}» centered on the artwork horizontally`,
          ).toBe(true);
          expect(
            st.cy >= seat.svg.y - 4 && st.cy <= seat.svg.y + seat.svg.h + 4,
            `station «${st.label.slice(0, 18)}» centered on the artwork vertically`,
          ).toBe(true);
        }
      }
    });
  }

  test('the first station opens by keyboard (focus + Enter reveals its panel)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    const first = page.locator('.fo-hero .hi-marker').first();
    // Keyboard focus previews the first station; Enter toggles that same
    // named callout, and a second Enter must restore it without losing focus.
    await page.keyboard.press('Tab');
    await first.focus();
    await expect(first).toBeFocused();
    const label = first.locator('..').locator('.hi-tag');
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(label).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await expect(label).toHaveAttribute('aria-hidden', 'true');
    await page.keyboard.press('Enter');
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(label).toHaveCSS('opacity', '1');
  });
});

/* ── 2 · the journey exit at exact clock beats ───────────────────── */

test.describe('R354-final · the journey statement exit (t out 2.15–2.35)', () => {
  test('1440: full presence holds to t2.10, falls fast, is gone by t2.35 — before the satellites resolve', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await awaitJourney(page);

    const read = async () =>
      page.evaluate(() => {
        const c2 = document.querySelector('.jt-card2w') as HTMLElement | null;
        const layer = (n: string) => {
          const g = document.querySelector(`.jt-plan [data-xl='${n}']`);
          return g ? parseFloat(getComputedStyle(g).opacity) : null;
        };
        return {
          alpha: c2 ? parseFloat(getComputedStyle(c2).opacity) : null,
          satellites: layer('4'),
        };
      });

    /* t 2.10 — the last full-presence beat before the exit window */
    await scrollToPin(page, pinForT(2.1, false), false);
    let s = await read();
    expect(s.alpha, 't2.10: the statement still stands at full presence').toBeGreaterThanOrEqual(0.97);

    /* t 2.20 — mid-fall (the flick) */
    await scrollToPin(page, pinForT(2.2, false), false);
    s = await read();
    expect(s.alpha, 't2.20: the exit crosses fast (mid-fall ≤ 0.6)').toBeLessThanOrEqual(0.6);

    /* t 2.35 — the exit is complete */
    await scrollToPin(page, pinForT(2.35, false), false);
    s = await read();
    expect(s.alpha, 't2.35: the statement is gone').toBe(0);
    expect(s.satellites, 't2.35: the satellite layer is STILL resolving (< 1) beneath the cleared seat').toBeLessThan(1);
    expect(s.satellites, 't2.35: the satellites are meaningfully on their way (≥ the ghost floor + 0.3)').toBeGreaterThan(0.45);

    /* t 2.60 — the campus owns the window, statement stays gone */
    await scrollToPin(page, pinForT(2.6, false), false);
    s = await read();
    expect(s.alpha, 't2.60: no ghost of the statement lingers').toBe(0);
  });

  test('390: the mobile warp rides the same window (present t2.0, gone by t2.4)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await awaitJourney(page);

    const alpha = () =>
      page.evaluate(() => {
        const c2 = document.querySelector('.jt-card2w') as HTMLElement | null;
        return c2 ? parseFloat(getComputedStyle(c2).opacity) : null;
      });

    await scrollToPin(page, pinForT(2.0, true), true);
    expect(await alpha(), 'mobile t2.0: entrance complete, full presence').toBeGreaterThanOrEqual(0.95);
    await scrollToPin(page, pinForT(2.4, true), true);
    expect(await alpha(), 'mobile t2.4: exit complete (never rides the t2.8 camera pan)').toBe(0);
  });

  test('the halo belt is the em-keyed text-shadow; the dead SVG-stroke declarations are retired', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await awaitJourney(page);
    await scrollToPin(page, pinForT(2.0, false), false);

    const belt = await page.evaluate(() => {
      const plate = document.querySelector('.jt-card2 .jt-card-plate') as HTMLElement | null;
      if (!plate) return null;
      const cs = getComputedStyle(plate);
      /* every pass opens an rgb( — the robust count (the colour's own
       * commas defeat a comma-split) */
      return {
        shadowPasses: (cs.textShadow.match(/rgb\(/g) || []).length,
        stroke: cs.webkitTextStrokeWidth,
        paintOrder: cs.paintOrder,
      };
    });
    expect(belt).not.toBeNull();
    /* 13 shadow passes (the 0.025em crisp + the 0.05em rim 8-way +
     * the two soft outer passes); ≥12 is the belt */
    expect(belt!.shadowPasses, 'the rim belt carries its passes').toBeGreaterThanOrEqual(12);
    /* r354-final: the SVG stroke on HTML text NEVER painted (a 12px
     * red injection paints zero pixels in Chromium) — the declarations
     * are retired, the shadow is the one belt */
    expect(belt!.stroke, 'no dead stroke width on the HTML text seat').toBe('0px');
  });
});

/* ── 3 · the why plates ──────────────────────────────────────────── */

test.describe('R354-final · the why plates', () => {
  test.use({ reducedMotion: 'reduce' });

  test('under reduced motion every loop element stands at its settled plate (opacity 1)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await approachSection(page, 'why');
    const band = page.locator('.wy-panels');
    await band.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const ops = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.wy-panels .iso-loop-box, .wy-panels .iso-loop-dot, .wy-panels .iso-loop-pulse')).map(
        (el) => ({ cls: el.className, opacity: parseFloat(getComputedStyle(el).opacity) }),
      ),
    );
    expect(ops.length, 'the four plates carry their loop elements').toBeGreaterThan(12);
    for (const o of ops) {
      expect(o.opacity, `the settled plate: ${o.cls} rests at opacity 1 (never the faint unfinished state)`).toBeGreaterThanOrEqual(0.99);
    }
  });

  test('the NEXT STEP chip keeps its rendered clearance off the recommendation box', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await approachSection(page, 'why');
    await page.locator('.wy-panels').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const seat = await page.evaluate(() => {
      /* the mastery panel (02): the .iso-loop-box group that contains
       * the NEXT STEP chip. The IsoBox renders west/east/top polygons
       * — the TOP face (index 2) is the recommendation box's crown
       * the chip must clear. */
      const text = Array.from(document.querySelectorAll('.wy-panels text')).find((t) =>
        (t.textContent || '').trim() === 'NEXT STEP',
      );
      if (!text) return { err: 'no NEXT STEP text' };
      const g = text.closest('.iso-loop-box');
      const chipRect = (text.previousElementSibling as SVGRectElement | null)?.getBoundingClientRect();
      /* the IsoBox wraps its west/east/top faces in a <g> — query the
       * descendants; [2] is the TOP face (the box's crown) */
      const polygons = g ? Array.from(g.querySelectorAll('polygon')) : [];
      const topFace = polygons[2]?.getBoundingClientRect() ?? null;
      return {
        err: null,
        chipBottom: chipRect ? chipRect.bottom : null,
        boxTop: topFace ? topFace.top : null,
      };
    });
    expect(seat.err).toBeNull();
    expect(seat.chipBottom).not.toBeNull();
    expect(seat.boxTop).not.toBeNull();
    /* the authored 3-unit ring (×1.35 scale ≈ 4px rendered); the
     * browser-true floor is 2px — the kiss can never return */
    expect(
      seat.boxTop! - seat.chipBottom!,
      `the chip's bottom edge clears the box's top face by ≥2px (measured ${(seat.boxTop! - seat.chipBottom!).toFixed(1)}px)`,
    ).toBeGreaterThanOrEqual(2);
  });
});

// R359 replaced the drawings with a four-column text ledger (A1, ALL-SHEETS).
for (const width of [1440, 768, 390]) {
  test(`the four challenges and their answers remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto('/');
    await approachSection(page, 'live');
    const cards = page.locator('.pm-cols > [role=listitem]');
    await expect(cards).toHaveCount(4);
    await expect(cards.locator('.pm-keyword')).toHaveText(['LECTURE', 'GRADING', 'MASTERY', 'ARCHIVE']);
    await expect(cards.locator('.pm-index')).toHaveText(['01', '02', '03', '04']);
    for (const [i, card] of (await cards.all()).entries()) {
      await card.scrollIntoViewIfNeeded();
      const title = card.locator('.pm-item-title');
      await expect(title).toBeInViewport();
      await expect(card.locator('.pm-ans')).toHaveText(/^الجواب: .+/);
      await card.locator('.pm-ans').scrollIntoViewIfNeeded();
      await expect(card.locator('.pm-ans')).toBeInViewport();
      await expect(card.locator('svg')).toHaveCount(0);
      if (width >= 768 && i % (width < 992 ? 2 : 4) > 0) {
        const left = await card.boundingBox();
        const right = await cards.nth(i - 1).boundingBox();
        expect(left!.y).toBe(right!.y);
        expect(left!.x).toBeLessThan(right!.x);
      }
    }
  });
}

/* ── 5 · the roles truth ─────────────────────────────────────────── */

test.describe('R354-final · five platform roles, honestly separated', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await approachSection(page, 'roles');
    await page.locator('.rl-section').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  });

  test('8 rows: 5 platform roles, 3 use-case chips, the [05/05] divider', async ({ page }) => {
    const truth = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.rl-row'));
      const chips = rows.map((r) => !!r.querySelector('.rl-kind'));
      const divider = document.querySelector('.rl-group');
      return {
        rowCount: rows.length,
        chipCount: chips.filter(Boolean).length,
        firstChipIndex: chips.findIndex(Boolean),
        divider: divider
          ? { visible: getComputedStyle(divider).display !== 'none', text: divider.textContent || '' }
          : null,
      };
    });
    expect(truth.rowCount).toBe(8);
    expect(truth.chipCount, 'exactly three use-case rows (06–08)').toBe(3);
    expect(truth.firstChipIndex, 'the chips begin at row 06 (after the five platform roles)').toBe(5);
    expect(truth.divider).not.toBeNull();
    expect(truth.divider!.visible, 'the group divider renders').toBe(true);
    expect(truth.divider!.text).toContain('[05/05]');
    expect(truth.divider!.text).toContain('أدوار المنصّة الخمسة');
  });

  test('the accordion is keyboard-operable and communicates its state', async ({ page }) => {
    /* row 06 (a use-case persona) opens via its icon button */
    const row6 = page.locator('.rl-row').nth(5);
    const icon = row6.locator('.rl-row-icon');
    await expect(icon).toHaveAttribute('role', 'button');
    await expect(icon).toHaveAttribute('tabindex', '0');
    await icon.focus();
    await expect(icon).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await expect(row6).toHaveClass(/is-open/);
    const deck = await page.evaluate(() => document.querySelector('.rl-deck-count')?.textContent?.trim() || '');
    expect(deck, 'the media deck follows the open row').toBe('[06/08]');
    /* the chip is inside the open row's title */
    expect(row6.locator('.rl-kind')).toHaveText('حالة استخدام');
  });
});

/* ── 6 · the dark tier ───────────────────────────────────────────── */

test.describe('R354-final · the dark tier resolves the royal seat', () => {
  test.use({ e2eRole: 'guest', themeSeed: 'dark' });

  test('dark: --iso-royal resolves to the strong text tier (rgb 169,184,255)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await approachSection(page, 'why');
    const seat = await page.evaluate(() => {
      const html = document.documentElement;
      const svg = document.querySelector('.wy-panels svg') as SVGElement | null;
      const probe = svg ?? html;
      return {
        theme: html.dataset.theme || html.getAttribute('data-theme') || '',
        royal: getComputedStyle(probe).getPropertyValue('--iso-royal').trim(),
      };
    });
    expect(seat.theme, 'the real store owns the dark mode').toBe('dark');
    expect(
      seat.royal,
      `the dark royal resolves to the measured strong tier #A9B8FF (got «${seat.royal}»)`,
    ).toBe('#A9B8FF');
  });
});
