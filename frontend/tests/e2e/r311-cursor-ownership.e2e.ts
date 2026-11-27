/**
 * r311-cursor-ownership.e2e.ts — the R311 §1.7 integration belt.
 *
 * The R310 audit missed the app-level conflict: CursorManager (the
 * circular dot/ring, R305-A2) kept running ON the landing alongside
 * the landing's own instrument — measured before-evidence in
 * audits/evidence/r311/before/. The R311 fix is architectural
 * (§1.3 option a): the landing route owns its pointer; the app layer
 * yields for the whole route (render null + teardown).
 *
 * r363 P2 — the landing instrument itself was rebuilt to the
 * reference's committed DOT grammar (docs/redesign/r350/reference/
 * refsite.css: 0.6rem round dot, opacity 0 at rest, transition on the
 * --t-fast/--ease tokens, grow on interactive hover; the reference
 * records no press state, no drawn trail, and never hides the native
 * pointer). These specs re-pin that grammar; the ownership LAWS are
 * unchanged: exactly ONE pointer system per route, no app-layer glyph
 * on the landing, the unified data-cursor="none" vocabulary, and the
 * RM/touch native fallback.
 *
 * These specs run against the REAL router + REAL landing (hermetic:
 * mock transport + Vite dev server; the shared fixture pre-seeds the
 * intro-seen flag — the loader spec clears it when needed).
 */
import { test, expect } from './fixtures/e2e';

/* R315 (c4-E) re-pin: the landing H1 is «رحلة تعلم واحدة / من
 * المحاضرة إلى الإتقان» (cycle-1 V1 hero, then the cycle-3 copy pass
 * de-tashkeeled the display line — «رحلةُ تعلُّمٍ واحدة» is gone too).
 * The brand «أُلارا» lives in the header/footer brand cells, not the H1;
 * this sentinel is the page-ready proof, not a copy pin. */
const HERO_READY = 'في نظام واحد';

const VW = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 800, height: 900 },
  mobile: { width: 390, height: 844 },
};

/** r367: the hero's pointer surface is LIVE only after the guest
 *  reveal's clip wipe finishes (guest-reveal-inner animates
 *  clip-path inset 50%→0; a press mid-wipe lands on the wrapper and
 *  the stage never sees it). The press waits until the stage's own
 *  subtree owns the hit-test at the press point. */
async function waitForHeroPointer(page: import('@playwright/test').Page, xf: number, yf: number) {
  await page.waitForFunction(
    (arg) => {
      /* the arg rides as unknown (Playwright's overload types it loose):
       * destructure with guards — never a typed param (TS2769), never an
       * unguarded read (TS18048) */
      const pair = arg as [number, number];
      const fx = pair?.[0] ?? 0.5;
      const fy = pair?.[1] ?? 0.5;
      const st = document.querySelector('.hro-stage');
      if (!st) return false;
      const r = st.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
      return !!el && (st === el || st.contains(el));
    },
    [xf, yf],
    { timeout: 20_000 },
  );
}

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* ═══ §1.7-1/2 — the landing: ONE pointer system, the reference dot ══ */

test.describe('R311 — the landing owns its pointer', () => {
  test('exactly one pointer system renders: the sheet dot, no app layer, native pointer never hidden', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.w369-h1')).toContainText(HERO_READY);

    /* the app-level circular layer is FULLY down on this route */
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-core')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-ring')).toHaveCount(0);

    /* the landing's dot instrument is up — ONE layer, ONE dot element
     * (the reference anatomy: .cursor → .cursor-main → .cursor-inner) */
    await expect(page.locator('.sc-cursor')).toHaveCount(1);
    await expect(page.locator('.sc-cursor-dot')).toHaveCount(1);

    /* pointer activity must not resurrect the app layer */
    await page.mouse.move(300, 300);
    await page.mouse.move(900, 500, { steps: 10 });
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* the extraction carries no cursor:none anywhere — the native
     * pointer stays on plain ground AND on interactive seats */
    const groundCursor = await page.evaluate(
      () => getComputedStyle(document.querySelector('.landing') as Element).cursor,
    );
    expect(groundCursor).not.toBe('none');
    const ctaCursor = await page.evaluate(
      () => getComputedStyle(document.querySelector('.w369-hero-actions') as Element).cursor,
    );
    expect(ctaCursor).toBe('pointer');

    /* the dot is hidden over plain ground (the committed model: the
     * rest state is opacity 0 — no glyph at rest, no drawn trail) */
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'off');
    const restOpacity = await page.evaluate(
      () => getComputedStyle(document.querySelector('.sc-cursor-dot') as Element).opacity,
    );
    expect(restOpacity).toBe('0');

    /* the suppression vocabulary is the unified "none" (the
     * reference's own data-cursor="hidden" token is NOT ours) */
    await expect(page.locator('[data-cursor="hidden"]')).toHaveCount(0);
    await expect(page.locator('.hro-stage')).toHaveAttribute('data-cursor', 'none');
    const stageCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.hro-stage') as Element).cursor);
    expect(stageCursor).toBe('crosshair');
  });

  test('link hover: the dot lights + grows on the tokens — never a ring, no press contraction', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const cta = page.locator('.w369-hero-actions').first();
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    /* single jump — the §1.6 "initial pointer entry" edge: the boundary
     * event can fire before the first pointermove, so the dot state
     * must be owned by the move handler too (fixed in R311). */
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'on');
    /* the reveal rides the 320ms token — let the transition land before
     * reading computed styles (the attribute flips synchronously, the
     * computed opacity/scale do not) */
    await page.waitForTimeout(450);

    /* the dot grammar: a ROUND 0.6rem accent dot, lit + grown on the
     * interactive seat (refsite.css .cursor-inner + the documented
     * scale-2.4 inference), revealed on the --t-fast/--ease tokens */
    const dotStyle = await page.evaluate(() => {
      const el = document.querySelector('.sc-cursor-dot') as Element;
      const cs = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.color =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || 'none';
      document.body.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return {
        borderRadius: cs.borderRadius,
        opacity: cs.opacity,
        scale: cs.scale,
        transitionProperty: cs.transitionProperty,
        transitionDuration: cs.transitionDuration,
        backgroundColor: cs.backgroundColor,
        accent,
      };
    });
    expect(dotStyle.borderRadius).toBe('50%');
    expect(dotStyle.opacity).toBe('1');
    expect(dotStyle.scale).toBe('2.4');
    expect(dotStyle.transitionProperty).toBe('opacity, scale');
    expect(dotStyle.transitionDuration).toContain('0.32s'); /* --t-fast — closest rung to the reference's .4s */
    expect(dotStyle.backgroundColor).toBe(dotStyle.accent); /* the dot rides var(--accent) */

    /* back over plain ground: the dot hides again (opacity 0 at rest) */
    const title = page.locator('.w369-h1').first();
    const tb = await title.boundingBox();
    expect(tb).not.toBeNull();
    await page.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, { steps: 4 });
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'off');
    await page.waitForTimeout(450); /* the hide transition lands */
    const restStyle = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.sc-cursor-dot') as Element);
      return { opacity: cs.opacity, scale: cs.scale };
    });
    expect(restStyle.opacity).toBe('0');
    expect(restStyle.scale).toBe('1');

    /* the extraction records NO press state: pressing on a real BUTTON
     * must NOT contract the dot (the retired ring's scale-.56 reticle
     * is gone). Press on the theme toggle — a button outside every
     * suppression zone; pressing an anchor and moving starts Chromium's
     * NATIVE link drag (the drag session swallows the pointer stream —
     * measured: events die after step 1). Release away: no click fires. */
    const toggle = page.locator('.theme-toggle-option').first();
    const kb = await toggle.boundingBox();
    expect(kb).not.toBeNull();
    await page.mouse.move(kb!.x + kb!.width / 2, kb!.y + kb!.height / 2, { steps: 6 });
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'on');
    await page.waitForTimeout(450); /* the grow lands before the press probe */
    await page.mouse.down();
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'on');
    const pressedScale = await page.evaluate(
      () => getComputedStyle(document.querySelector('.sc-cursor-dot') as Element).scale,
    );
    expect(pressedScale).toBe('2.4'); /* no press contraction in the reference grammar */
    await page.mouse.move(120, 160, { steps: 12 }); /* release away — no click */
    await page.mouse.up();
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'off');

    /* throughout: no app-layer glyph anywhere, and the retired square
     * instruments stay retired */
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-ring')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
  });

  test('hero entry: the native crosshair guides the drag and the stations open', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const stage = page.locator('.hro-stage').first();
    await expect(stage).toBeVisible();
    /* r367 fix: the entrance loader OWNS the pointer while it plays
     * (§1.7-4's own law) — the replay-on-every-load rule (R313) keeps
     * it up on every goto, and the eager-LCP art lengthened the boot
     * past this test's first press: the drag landed ON the loader and
     * the stage never saw it. Wait for the handoff, then for the
     * reveal wipe to hand the surface back. */
    await expect(page.locator('.pl')).toHaveCount(0, { timeout: 20_000 });
    await waitForHeroPointer(page, 0.5, 0.45);
    const sb = await stage.boundingBox();
    expect(sb).not.toBeNull();

    await page.mouse.move(sb!.x + sb!.width * 0.5, sb!.y + sb!.height * 0.45, { steps: 8 });
    await expect(stage).toHaveCSS('cursor', 'crosshair');
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-core')).toHaveCount(0);

    /* the suppression zone wins over interactive seats INSIDE it: the
     * stage's station markers never light the dot */
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'off');

    await page.mouse.down();
    await page.mouse.move(sb!.x + sb!.width * 0.72, sb!.y + sb!.height * 0.6, { steps: 14 });
    await expect(stage.locator('.hi-marker[aria-pressed="true"]').first()).toBeVisible();
    await page.mouse.up();
    await page.waitForTimeout(700);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
  });
});

/* ═══ §1.7-4 — the loader owns the pointer while it plays ══════════ */

test.describe('R311 — the entrance loader', () => {
  test('the loader instrument owns the pointer at every width; handoff on exit is clean', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        /* R313: the fixture seeds the skip key — clear THAT (the
         * seen-flag is inert under the replay-on-every-load rule) */
        sessionStorage.removeItem('ulara-intro-skip');
      } catch { /* ignore */ }
    });
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.pl')).toBeVisible();

    /* its own cross + readout is the sole instrument (the arms are the
     * cross's visible geometry — the anchor span itself is 0×0) */
    await page.mouse.move(720, 420);
    await page.waitForTimeout(400);
    await expect(page.locator('.pl')).toHaveAttribute('data-cursor', 'none');
    await expect(page.locator('.pl-cross-h')).toBeVisible();
    await expect(page.locator('.pl-cross-v')).toBeVisible();
    await expect(page.locator('.pl')).toBeVisible();
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-cursor')).toHaveCount(1); /* mounted, suppressed inside the zone */
    await expect(page.locator('.sc-cursor-dot')).toHaveAttribute('data-on', 'off'); /* the dot never lights here */

    /* narrow window: the loader still owns the pointer at EVERY width */
    await page.setViewportSize(VW.narrow);
    await expect(page.locator('.pl')).toBeVisible();
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* exit handoff: back on the sheet, the dot instrument owns the route */
    await expect(page.locator('.pl')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-cursor')).toHaveCount(1);
    await expect(page.locator('.w369-h1')).toContainText(HERO_READY);
  });
});

/* ═══ §1.7-9/10 — route transitions restore/yield the app layer ════ */

test.describe('R311 — route yield transitions', () => {
  test('off the landing the app layer returns; returning to the landing tears it down', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.sc-cursor')).toHaveCount(1);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* leave via a real SPA navigation to the public /colleges */
    await page.click('a[href="/colleges"]');
    await expect(page).toHaveURL(/\/colleges/);
    await page.mouse.move(300, 300);
    await page.mouse.move(700, 400, { steps: 6 });
    await expect(page.locator('.cursor-layer')).toHaveCount(1);
    const active = await page.evaluate(() => (document.querySelector('.cursor-layer') as HTMLElement).getAttribute('data-active'));
    expect(active).toBe('true');
    await expect(page.locator('.sc-cursor')).toHaveCount(0);

    /* back to the landing via a real link — the layer tears down */
    await page.click('a[href="/"]');
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-cursor')).toHaveCount(1);

    /* browser back: POP also restores the app layer on /colleges */
    await page.goBack();
    await expect(page).toHaveURL(/\/colleges/);
    await page.mouse.move(400, 400);
    await expect(page.locator('.cursor-layer')).toHaveCount(1);
  });
});

/* ═══ §1.7-11/12 — reduced motion + touch: native fallback ═════════ */

test.describe('R311 — native fallback', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion: no custom layers, the native cursor stays', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.w369-h1')).toContainText(HERO_READY);
    await expect(page.locator('.sc-cursor')).toHaveCount(0);
    await expect(page.locator('.sc-cursor-dot')).toHaveCount(0);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    const stageCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.hro-stage') as Element).cursor);
    expect(stageCursor).not.toBe('none');
  });

  test('touch viewport: no custom layers, the native pointer stays', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.w369-h1')).toContainText(HERO_READY);
    await expect(page.locator('.sc-cursor')).toHaveCount(0);
    await expect(page.locator('.sc-cursor-dot')).toHaveCount(0);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.hi-instrument')).toBeHidden();
  });
});
