/**
 * band-scroll-stop.e2e.ts — every landing band's headline scene STOPS
 * the scroll, like the reference (measured: no scroll-snap, no wheel
 * handling; each scene is a tall track holding a position: sticky,
 * one-viewport stage at top 0).
 *
 * Real scroll: step the page by 20px and count how many pixels the
 * stage stays seated at the viewport top. Native scroll must stay:
 * html carries no scroll-snap, and wheel / keyboard moves are exact
 * (no hijack). Reduced motion gets the plain flow (no pinning). No
 * horizontal overflow at either width.
 */
import { test, expect } from './fixtures/qa';

const BANDS = ['story', 'progress', 'rewards', 'levels', 'handoff', 'showcase', 'principles', 'roles'] as const;

async function pinnedPx(page: import('@playwright/test').Page, id: string) {
  return page.evaluate(async (bandId) => {
    const el = document.getElementById(bandId)!;
    const stage = el.querySelector('.w369-band-stage') as HTMLElement;
    const top0 = el.getBoundingClientRect().top + scrollY;
    let pinned = 0;
    for (let y = Math.max(0, top0 - innerHeight); y < top0 + el.offsetHeight; y += 20) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 8));
      if (Math.abs(stage.getBoundingClientRect().top) <= 2) pinned += 20;
    }
    return { pinned, vh: innerHeight };
  }, id);
}

for (const vp of [{ name: '1440x900', width: 1440, height: 900 }, { name: '390x844', width: 390, height: 844 }]) {
  test.describe(`band scroll stop ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const id of BANDS) {
      test(`#${id} headline stage pins for a real stretch of scroll`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector(`#${id} .w369-band-stage`);
        const { pinned, vh } = await pinnedPx(page, id);
        expect(pinned, `#${id} pinned ${pinned}px of ${vh}px viewport`).toBeGreaterThanOrEqual(Math.round(vh * 0.3));
      });
    }

    test('native scroll: no scroll-snap, wheel moves are exact, no overflow', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#progress .w369-band-stage');
      const snap = await page.evaluate(() => [
        getComputedStyle(document.documentElement).scrollSnapType,
        getComputedStyle(document.body).scrollSnapType,
      ]);
      expect(snap).toEqual(['none', 'none']);
      if (vp.width >= 1024) {
        await page.mouse.move(vp.width / 2, vp.height / 2);
        const y0 = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(900);
        expect(Math.abs((await page.evaluate(() => scrollY)) - (y0 + 300))).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('reduced motion: the band flows normally (no pinned runway)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForSelector('#progress .w369-band-stage');
      const pos = await page.evaluate(() => getComputedStyle(document.querySelector('#progress .w369-band-stage')!).position);
      expect(pos).not.toBe('sticky');
    });
  });
}

test.describe('band subject card holds in the stage (tall desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const id of ['progress', 'rewards', 'levels']) {
    test(`#${id} subject card stays seated while the page scrolls past it`, async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(`#${id} .w369-band-body`);
      // geometry is read once, so let fonts and the first layout passes land
      // first (a late font swap above the band moves every offset by pixels)
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const geo = await page.evaluate((bandId) => {
        const body = document.querySelector(`#${bandId} .w369-band-body`) as HTMLElement;
        const card = body.firstElementChild as HTMLElement;
        return { top0: body.getBoundingClientRect().top + scrollY, bodyH: body.offsetHeight, cardH: card.offsetHeight, seat: parseFloat(getComputedStyle(card).top) };
      }, id);
      // travel = bodyH - cardH; sample the card at 25%, 50% and 75% of it
      const travel = geo.bodyH - geo.cardH;
      expect(travel, `#${id} pin travel ${travel}px`).toBeGreaterThanOrEqual(300);
      for (const f of [0.25, 0.5, 0.75]) {
        const y = geo.top0 - geo.seat + travel * f;
        await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y);
        await page.waitForTimeout(700);
        const rc = await page.evaluate((bandId) => {
          const c = (document.querySelector(`#${bandId} .w369-band-body`) as HTMLElement).firstElementChild as HTMLElement;
          const r = c.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, vh: innerHeight };
        }, id);
        expect(Math.abs(rc.top - geo.seat), `#${id} at ${f}: card top ${rc.top} vs seat ${geo.seat}`).toBeLessThanOrEqual(6);
        expect(rc.bottom, `#${id} card fits the viewport while pinned`).toBeLessThanOrEqual(rc.vh);
      }
    });
  }
});
