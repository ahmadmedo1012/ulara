/**
 * r351-shell-chrome.e2e.ts — the shell-chrome pins (A2 · Q1/Q2/Q3/Q6/Q8).
 *
 * The hermetic belts that hold the r351 shell contract on every role's
 * dashboard, against the mock transport (no backend, no DB):
 *
 *  1. ONE title — exactly one visible h1 per dashboard (the r350 law).
 *  2. ONE identity — exactly one user trigger (.topbar-user-trigger);
 *     the sidebar identity block (.sidebar-user) and the floating
 *     feedback FAB (.fb-fab) never exist anywhere in the DOM.
 *  3. Topbar control budget — at ≥1200px: search · bell · user (≤4
 *     visible controls; the standalone theme toggle and the AI
 *     quick-action are retired). Below 1200px the search pill hides
 *     and the palette icon owns search (≤3 + burger on phones).
 *  4. Fixed UI never covers content — at 1440/1024: NO interactive
 *     fixed element intersects any content text/control (the r350 FAB
 *     defect class). At 390/360: the dock is allowed over scrolling
 *     content, but the content track's block-end padding must clear
 *     the dock's height + safe area, so the LAST row can always be
 *     scrolled above it.
 *  5. The 44px tap floor — every visible interactive element in the
 *     shell chrome (sidebar/topbar/bottom-nav) at 1440 and 390.
 *  6. The word budget — every role's dashboard ≤ 180 rendered words
 *     @1440 (the r351 Q3 target; body.innerText, the r350 instrument).
 *  7. Skeleton geometry — a cold dashboard's pending KPI strip and the
 *     resolved one occupy the same block size (CLS ≈ 0; the Q4 law).
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

const DASHBOARDS: Record<Role, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER: '/owner/dashboard',
};

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'];

async function settleDashboard(page: Page): Promise<void> {
  await page.locator('.content .skeleton, .content [aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(400);
}

/* ─── 1+2+6: one title, one identity, the word budget ────────────── */

for (const role of ROLES) {
  test.describe(`r351 shell chrome — ${role}`, () => {
    test.use({ e2eRole: role, viewport: { width: 1440, height: 900 } });

    test('ONE h1, ONE identity seat, no FAB, ≤180 words @1440', async ({ page }) => {
      await page.goto(DASHBOARDS[role]);
      await settleDashboard(page);

      // 1 — exactly one h1 (the r350 one-title law).
      const h1s = await page.locator('main h1').all();
      expect(h1s, `${role}: exactly one h1 in the content`).toHaveLength(1);

      // 2 — ONE identity seat: the topbar user trigger; the retired
      // sidebar identity block and FAB never render anywhere.
      await expect(page.locator('.topbar-user-trigger')).toHaveCount(1);
      await expect(page.locator('.sidebar-user')).toHaveCount(0);
      await expect(page.locator('.fb-fab')).toHaveCount(0);

      // 6 — the word budget (the r350 instrument: body.innerText).
      const words = await page.evaluate(() =>
        document.body.innerText.trim().split(/\s+/).filter(Boolean).length,
      );
      expect(words, `${role}: dashboard word budget (measured ${words})`).toBeLessThanOrEqual(180);
    });
  });
}

/* ─── 3: the topbar control budget ───────────────────────────────── */

test.describe('r351 shell chrome — topbar control budget', () => {
  test.use({ e2eRole: 'STUDENT' });

  test('≥1200px: search pill + bell + user — the theme toggle and AI button are retired', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/student/dashboard');
    await settleDashboard(page);

    // The retired seats never render.
    await expect(page.locator('.topbar-theme')).toHaveCount(0);
    await expect(page.locator('.topbar .btn.primary')).toHaveCount(0);
    // The search pill owns search; the palette icon is hidden ≥1201px.
    await expect(page.locator('.topbar .global-search')).toBeVisible();
    await expect(page.locator('.topbar-search-toggle')).toBeHidden();
    // The visible interactive controls: pill, bell, user (≤4 budget).
    const controls = await page.evaluate(() => {
      const topbar = document.querySelector('.topbar');
      if (!topbar) return 0;
      let n = 0;
      for (const el of topbar.querySelectorAll('button, a, input')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        n += 1;
      }
      return n;
    });
    expect(controls, 'topbar visible controls @1440 (search+bell+user ≤4)').toBeLessThanOrEqual(4);
  });

  test('≤1200px: the palette icon owns search (the pill hides)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/student/dashboard');
    await settleDashboard(page);
    await expect(page.locator('.topbar .global-search')).toBeHidden();
    await expect(page.locator('.topbar-search-toggle')).toBeVisible();
  });
});

/* ─── 4: fixed UI never covers content ───────────────────────────── */

async function fixedUiOverlaps(page: Page): Promise<number> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fixed: Array<{ r: DOMRect; el: Element }> = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      // Decorative chrome is not UI (aria-hidden or pointer-transparent).
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.width >= vw - 2 && r.height >= vh - 2) continue; // full-viewport chrome
      fixed.push({ r, el });
    }
    if (fixed.length === 0) return 0;
    const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"]';
    let hits = 0;
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > vh) continue;
      const isInteractive = el.matches(INTERACTIVE);
      const hasOwnText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent || '').trim().length > 1,
      );
      if (!isInteractive && !hasOwnText) continue;
      for (const f of fixed) {
        const ix = Math.max(0, Math.min(f.r.right, r.right) - Math.max(f.r.left, r.left));
        const iy = Math.max(0, Math.min(f.r.bottom, r.bottom) - Math.max(f.r.top, r.top));
        if (ix > 2 && iy > 2) { hits += 1; break; }
      }
    }
    return hits;
  });
}

test.describe('r351 shell chrome — fixed UI never covers content', () => {
  test.use({ e2eRole: 'STUDENT' });
  for (const role of ROLES) {
    test(`${role}: zero fixed-UI ∩ content at 1440 and 1024`, async ({ page }) => {
      test.use({ e2eRole: role });
      for (const width of [1440, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(DASHBOARDS[role]);
        await settleDashboard(page);
        const hits = await fixedUiOverlaps(page);
        expect(hits, `${role} @${width}: fixed UI intersects content`).toBe(0);
      }
    });
  }

  test('STUDENT @390/360: the dock may ride, but the content pad clears it (the last row scrolls above)', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/student/dashboard');
      await settleDashboard(page);
      const clearance = await page.evaluate(() => {
        const inner = document.querySelector('.content-inner');
        const dock = document.querySelector('.bottom-nav');
        if (!inner || !dock) return { pad: -1, dock: -1 };
        const pad = parseFloat(getComputedStyle(inner).paddingBlockEnd || '0');
        const dockH = dock.getBoundingClientRect().height
          + (dock.checkVisibility() ? 0 : 0);
        const cs = getComputedStyle(dock);
        const safe = (cs.paddingBlockEnd || '0px').includes('env')
          ? 0 : parseFloat(cs.paddingBlockEnd || '0px');
        return { pad, dock: dockH + safe };
      });
      // The pad must clear the dock's height (78px authored + safe-area
      // growth) so the page's LAST row always scrolls above the dock.
      expect(clearance.pad, `@${width}: content pad ≥ dock height`).toBeGreaterThanOrEqual(clearance.dock - 2);
    }
  });
});

/* ─── 5: the 44px tap floor in the shell chrome ──────────────────── */

test.describe('r351 shell chrome — the 44px tap floor', () => {
  test.use({ e2eRole: 'STUDENT' });
  for (const width of [1440, 390]) {
    test(`every visible shell control ≥44px @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/student/dashboard');
      await settleDashboard(page);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const chrome = document.querySelector('.has-shell');
        if (!chrome) return out;
        const SHELL = '.sidebar, .topbar, .bottom-nav';
        for (const el of Array.from(chrome.querySelectorAll(`${SHELL} button, ${SHELL} a, ${SHELL} input`))) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.bottom < 0 || r.top > window.innerHeight) continue;
          if (r.width < 44 || r.height < 44) {
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
        return out;
      });
      expect(small, `sub-44px shell controls @${width}: ${small.join(', ')}`).toEqual([]);
    });
  }
});

/* ─── 7: skeleton geometry ≡ resolved geometry ───────────────────── */

test.describe('r351 shell chrome — skeleton geometry (CLS ≈ 0)', () => {
  test.use({ e2eRole: 'STUDENT' });
  test('the pending KPI strip and the resolved strip occupy the same block size', async ({ page, browser }) => {
    // A cold route with a NEVER-settling dashboard payload holds the
    // page in its pending branch (the skeleton anatomy).
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ulara-intro-skip', '1'); } catch { /* ignore */ } });
    const { installMockApi, seedSession } = await import('./fixtures/mock-transport');
    const { STUDENT_USER } = await import('./fixtures/api-fixtures');
    await seedSession(ctx, STUDENT_USER, {});
    await installMockApi(ctx, {
      sessionUser: STUDENT_USER,
      overrides: [],
      routes: [],
    });
    // Stateful never-resolving /me/dashboard on the page level.
    const slow = await ctx.newPage();
    await slow.route('**/api/v1/me/dashboard', async () => {
      await new Promise(() => { /* never fulfills — the pending branch holds */ });
    });
    await slow.goto('/student/dashboard');
    // The app route suspends/pends — the shell chrome must paint.
    await slow.locator('.topbar').waitFor({ state: 'visible', timeout: 15_000 });
    await slow.waitForTimeout(300);
    const pendingH = await slow.evaluate(() => {
      const strip = document.querySelector('.content-inner .grid-4');
      return strip ? Math.round(strip.getBoundingClientRect().height) : -1;
    });
    await slow.close();

    // The resolved page.
    await page.goto('/student/dashboard');
    await settleDashboard(page);
    const resolvedH = await page.evaluate(() => {
      const strip = document.querySelector('.content-inner .grid-4');
      return strip ? Math.round(strip.getBoundingClientRect().height) : -1;
    });

    expect(pendingH, 'the pending KPI strip renders (the skeleton anatomy)').toBeGreaterThan(0);
    expect(resolvedH, 'the resolved KPI strip renders').toBeGreaterThan(0);
    // CLS ≈ 0: the skeleton's KPI strip matches the resolved height
    // (the r172b calibration: ±2px tolerance for sub-pixel rounding).
    expect(Math.abs(pendingH - resolvedH)).toBeLessThanOrEqual(2);
    await ctx.close();
  });
});
