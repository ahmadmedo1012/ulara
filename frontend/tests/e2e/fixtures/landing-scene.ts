import { expect, type Page } from '@playwright/test';

export async function approachSection(page: Page, section: string) {
  const seat = page.locator(`[data-lz="${section}"]`);
  // A section above can mount and move this placeholder after the first scroll.
  await expect.poll(async () => {
    await seat.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    return seat.locator(':scope > :first-child').isVisible();
  }, { timeout: 15_000 }).toBe(true);
}

export async function scrollToPin(page: Page, p: number, mobile: boolean) {
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
          const span = cRect.height - winH;
          if (span > 1) target = colTop - stickyTop + p * span;
          else {
            // On compact phones the column has no sticky runway. The scene
            // traverses the screen from its leading edge to its trailing edge.
            const r = track.getBoundingClientRect();
            const top = r.top + window.scrollY;
            target = r.height > innerHeight
              ? top + p * (r.height - innerHeight)
              : top - innerHeight + p * (innerHeight + r.height);
          }
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
