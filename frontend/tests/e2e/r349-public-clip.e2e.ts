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


test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });



test.describe('R349 — the plate leader labels read inside the frame (r351: the journey seat)', () => {
  /* r351 P1 — the HERO STAGE IS DECLUTTERED: the static zone-name leader
   * labels retired from the hero seat (they now live ONLY on the
   * journey plate — IsoCampusSheet renders the same labels fragment in
   * its pinned window). The clip-prevention pin re-targets that seat:
   * the same labels fragment, the same leader grammar, measured inside
   * the viewport at the journey's desktop frame (1440 — the sticky
   * window fills the viewport; ≤991 the walkthrough is a stacked
   * readable sequence whose seats the r351 audit belt re-pins). */
});

test.describe('R349 — the phone deck and the one sitemap (structure pins)', () => {

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





test.describe('R349 — the resolve sheet retires the parked phone band + the channels row', () => {

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
});

test.describe('R349 — the app sheet QR decodes (the honest-extension belt)', () => {
  test('the QR image loads as a true vector on /app', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/app');
    const image = page.locator('.lg-qr img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node: HTMLImageElement) => node.decode());

    const qr = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>('.lg-qr img');
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
