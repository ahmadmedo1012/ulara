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
import { approachSection, scrollToPin } from './fixtures/landing-scene';
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
      await approachSection(page, 'why');
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
    await approachSection(page, 'why');
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

test.describe('R349 — the plate leader labels read inside the frame (r351: the journey seat)', () => {
  /* r351 P1 — the HERO STAGE IS DECLUTTERED: the static zone-name leader
   * labels retired from the hero seat (they now live ONLY on the
   * journey plate — IsoCampusSheet renders the same labels fragment in
   * its pinned window). The clip-prevention pin re-targets that seat:
   * the same labels fragment, the same leader grammar, measured inside
   * the viewport at the journey's desktop frame (1440 — the sticky
   * window fills the viewport; ≤991 the walkthrough is a stacked
   * readable sequence whose seats the r351 audit belt re-pins). */
  test('every Arabic leader label lands inside @1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await approachSection(page, 'chapters');
    /* the labels are the journey's LAST assembly beat — sit deep in the
     * scrub so the plate is fully assembled before measuring */
    await page.evaluate(() => {
      const el = document.querySelector('#chapters') as HTMLElement | null;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + el.getBoundingClientRect().height * 0.55);
      }
    });
    await settleReveals(page, 1500);

    const labels = await page.evaluate(
      ({ w: vw, tol }) => {
        const svg = document.querySelector('.jt-plan');
        if (!svg) return [{ txt: '.jt-plan', missing: true, inside: false, left: 0, right: 0 }];
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
      { w: 1440, tol: TOLERANCE },
    );

    expect(labels.length).toBeGreaterThanOrEqual(4);
    for (const l of labels) {
      expect(l.missing, `${l.txt} must exist`).toBe(false);
      expect(
        l.inside,
        `«${l.txt}» must read inside the viewport (L=${l.left} R=${l.right} @1440)`,
      ).toBe(true);
    }
  });
});

test.describe('R349 — the phone deck and the one sitemap (structure pins)', () => {
  test('the why pillars swipe as a snap deck ≤767 (no document overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await approachSection(page, 'why');
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
    await approachSection(page, 'footer');
    await page.locator('.fo-footer').scrollIntoViewIfNeeded();
    await settleReveals(page);

    /* the retired duplicate rows must stay retired */
    const dupRows = await page.locator('.fo-brow').count();
    expect(dupRows).toBe(0);

    /* the ONE index (r363 — the owner's ruling): ONE horizontal link
     * row replaces the retired col2 three-group column stack. The row
     * carries the platform doors + the funnel pair; the phone ribbon
     * wraps in place — never a column stack. */
    const links = await page.locator('.fo-linkrow .fo-link').count();
    expect(links).toBeGreaterThanOrEqual(14);
    const retiredGroups = await page.locator('.fo-linkrow .fo-lgroup').count();
    expect(retiredGroups).toBe(0);

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


test.describe('R349 — the caption exit breathes (the dead-ref belt)', () => {
  for (const [label, vw, mobile] of [
    ['390', { width: 390, height: 844 }, true],
    ['1440', { width: 1440, height: 1000 }, false],
  ] as const) {
    test(`the caption is written and gone by mid-band @${label}`, async ({ page }) => {
      await page.setViewportSize(vw);
      await page.goto('/');
      await approachSection(page, 'chapters');
      await page.waitForFunction(
        () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
        undefined,
        { timeout: 8000 },
      );

      /* mid-band the exit window is long past at both widths (mobile
       * span 0.025 · desktop 0.10): the driver must have WRITTEN the
       * caption hidden — the pre-fix dead ref left the inline style
       * empty and the statement standing over the drawing. */
      await scrollToPin(page, 0.5, mobile);
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
    await approachSection(page, 'chapters');
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 8000 },
    );

    /* the pre-story beat (stage 0–1): the card's body must carry the
     * FIRST finding at full ink — the pre-fix blank box. */
    await scrollToPin(page, 0.06, true);
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
    await approachSection(page, 'chapters');
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
    await scrollToPin(page, 0.42, false);
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
      await approachSection(page, 'chapters');
      await page.waitForFunction(
        () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
        undefined,
        { timeout: 8000 },
      );

      /* the compressed windows settle every row by ~0.92; the retired
       * windows left the header at 0 and the rows mid-flight here. */
      await scrollToPin(page, 0.93, mobile);
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
    await approachSection(page, 'vision');
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
    await approachSection(page, 'footer');
    await page.locator('.fo-footer').scrollIntoViewIfNeeded();
    await settleReveals(page);

    expect(await page.locator('.fo-socials').count()).toBe(0);
    expect(await page.locator('.fo-legal-row .fo-legal-link').count()).toBeGreaterThanOrEqual(9);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   R349 (wave 3) — the re-verification sweep's two confirmed defects:
     · THE LABEL'S INK-ON-INK SEATS — the wave-1 end-anchor closed the
       frame clip but landed «ساحة المجتمع» on the scale bar's solid
       segment (the alif of «ساحة» merged with the bar's left end at
       every width) while the leader's vertical drop at x=−56 crossed
       «ميدان التدريب»'s letterforms. The re-seat drops the phrase
       into the clear band (baseline 80, reading rightward from
       x=−12); this belt proves the label's ink clears BOTH the bar
       and its neighbour's text by ≥2 sheet units, and the leader's
       path clears «ميدان التدريب» — measured in SVG user units
       (getBBox), so the pin holds at EVERY viewport scale.
     · THE QR'S HONEST EXTENSION — the app sheet's QR asset shipped
       since ULARA 1.0 as .svg while carrying PNG bytes: servers
       answer image/svg+xml, the SVG parser refuses the binary magic,
       and the code rendered as a broken image on every environment.
       The file keeps its PNG identity; this belt proves the image
       actually decodes on the /app sheet.
   ═══════════════════════════════════════════════════════════════════ */

test.describe('R349 — the plate label ink clears the sheet furniture (the ink-on-ink belt)', () => {
  /* r351 P1 — the labels fragment retired from the hero seat; the
   * ink-on-ink clearance law follows the labels to their journey seat
   * (same fragment, same authored grammar — only the mounting seat
   * changed). */
  test('«ساحة المجتمع» clears the scale bar, «ميدان التدريب» and the leader path', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await approachSection(page, 'chapters');
    /* the labels are the journey's LAST assembly beat — sit deep in
     * the scrub so the plate is fully assembled before measuring */
    await page.evaluate(() => {
      const el = document.querySelector('#chapters') as HTMLElement | null;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + el.getBoundingClientRect().height * 0.55);
      }
    });
    await settleReveals(page, 1500);

    /* every seat is measured through getScreenCTM — the label texts
     * live in the svg's root user space while the scale bar rides a
     * translate(40,104) group, so raw getBBox would compare DIFFERENT
     * coordinate spaces (a local-space bar box can pass while the
     * transformed box collides). Mapping every box to screen space and
     * normalising by the CTM scale yields true SHEET-UNIT boxes that
     * hold at every viewport. */
    const seats = await page.evaluate(() => {
      const svg = document.querySelector('.jt-plan') as SVGSVGElement | null;
      if (!svg) return { missing: true } as const;
      const labels = Array.from(svg.querySelectorAll('.iso-leader text')) as SVGTextElement[];
      const find = (needle: string) => labels.find((t) => (t.textContent ?? '').includes(needle));
      const plaza = find('ساحة المجتمع');
      const field = find('ميدان التدريب');
      /* the scale bar: the furniture group's solid rect */
      const barRects = Array.from(svg.querySelectorAll('.iso-furn rect')) as SVGRectElement[];
      const bar = barRects.find((r) => r.getAttribute('fill') !== 'none');
      /* the plaza label's own leader path (the g wraps path + dot + text) */
      const plazaLeader = plaza?.closest('g')?.querySelector('path');
      const sheet = (el: SVGGraphicsElement | null | undefined) => {
        if (!el) return null;
        const b = el.getBBox();
        /* getCTM maps the element's LOCAL space to the svg's user
         * space (the viewBox units every seat shares) — the bar's
         * translate(40,104) is folded in, the label texts' identity
         * passes through: one shared coordinate space, no screen
         * dependence. */
        const m = el.getCTM();
        if (!m) return null;
        const pts: ReadonlyArray<readonly [number, number]> = [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x, b.y + b.height],
          [b.x + b.width, b.y + b.height],
        ];
        const corners = pts.map(
          ([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }),
        );
        const xs = corners.map((c) => c.x);
        const ys = corners.map((c) => c.y);
        /* divide by the CTM's uniform scale (px per sheet unit) — the
         * shared screen offset cancels in every edge-to-edge
         * comparison, so the boxes compare in TRUE sheet units at
         * any viewport the belt runs at. */
        const a = Math.abs(m.a) || 1;
        return {
          l: Math.min(...xs) / a,
          r: Math.max(...xs) / a,
          t: Math.min(...ys) / a,
          b: Math.max(...ys) / a,
        };
      };
      return {
        missing: false,
        plaza: sheet(plaza),
        field: sheet(field),
        bar: sheet(bar ?? null),
        leader: sheet(plazaLeader ?? null),
      } as const;
    });

    expect(seats.missing, 'the journey plate must mount').toBe(false);
    if (seats.missing) return;
    expect(seats.plaza, '«ساحة المجتمع» must exist').not.toBeNull();
    expect(seats.field, '«ميدان التدريب» must exist').not.toBeNull();
    expect(seats.bar, 'the scale bar must exist').not.toBeNull();
    expect(seats.leader, 'the plaza leader path must exist').not.toBeNull();
    if (!seats.plaza || !seats.field || !seats.bar || !seats.leader) return;

    /* the clearance floor: 2 sheet units (≈8px at the 1440 hero seat,
     * proportionally identical at every scale) — ink-on-ink can never
     * recur while the phrase keeps its authored grammar. */
    const GAP = 2;
    const separated = (a: { l: number; r: number; t: number; b: number }, b: typeof a) =>
      a.r + GAP <= b.l || b.r + GAP <= a.l || a.b + GAP <= b.t || b.b + GAP <= a.t;

    expect(
      separated(seats.plaza, seats.bar),
      `«ساحة المجتمع» (${JSON.stringify(seats.plaza)}) must clear the scale bar (${JSON.stringify(seats.bar)}) by ≥${GAP} sheet units`,
    ).toBe(true);
    expect(
      separated(seats.plaza, seats.field),
      `«ساحة المجتمع» (${JSON.stringify(seats.plaza)}) must clear «ميدان التدريب» (${JSON.stringify(seats.field)}) by ≥${GAP} sheet units`,
    ).toBe(true);
    expect(
      separated(seats.leader, seats.field),
      `the plaza leader (${JSON.stringify(seats.leader)}) must clear the «ميدان التدريب» letterforms (${JSON.stringify(seats.field)}) by ≥${GAP} sheet units`,
    ).toBe(true);
  });
});

test.describe('R349 — the app sheet QR decodes (the honest-extension belt)', () => {
  test('the QR image loads as a true vector on /app', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/app');
    const image = page.locator('.ap-qr img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node: HTMLImageElement) => node.decode());

    const qr = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>('.ap-qr img');
      if (!img) return { missing: true } as const;
      return {
        missing: false,
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      } as const;
    });

    expect(qr.missing, 'the QR seat must exist on the app sheet').toBe(false);
    if (qr.missing) return;
    /* R355: the retired asset shipped PNG bytes — first mislabeled .svg
     * (broken decode), then honestly renamed .png by r349 — but its
     * module matrix still encoded a stale pre-rebrand deployment URL.
     * The code is now a TRUE single-path SVG encoding this page's
     * canonical production URL; the belt pins the vector identity. */
    expect(qr.src?.endsWith('.svg'), `the QR must load its true vector identity (got ${qr.src})`).toBe(true);
    expect(qr.complete, 'the QR image must finish loading').toBe(true);
    expect(qr.naturalWidth, 'the QR must carry intrinsic dimensions (not a broken icon)').toBeGreaterThanOrEqual(300);
    expect(qr.naturalHeight).toBeGreaterThanOrEqual(300);
  });
});
