/**
 * notifications.e2e.ts — جرس الإشعارات ولوحته (r164-k).
 *
 * يثبّت: عدّاد غير المقروء من meta.unread (استطلاع limit=1)، فتح
 * اللوحة، صفوف الإشعارات مع الزمن النسبي على الساعة المجمّدة
 * («منذ ساعتين» — timeAgoAr)، وواجهة «تعليم الكل كمقروء»، ثم النقر
 * على صف يقود إلى صفحة /alerts للدور.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

test.describe('الإشعارات', () => {
  test('الجرس يعرض عدّاد غير المقروء واللوحة تعرض الصفوف وتستقر في /alerts', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* العدّاد قبل الفتح — arUnit(2, …) → «إشعاران غير مقروءان» */
    const bell = page.getByRole('button', { name: 'إشعاران غير مقروءان' });
    await expect(bell).toBeVisible();
    await expect(page.locator('.topbar-notif-badge')).toHaveText('2');

    /* الفتح — اللوحة نفسها سطح 012-spec (portal .notification-panel) */
    await bell.click();
    const panel = page.locator('.notification-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.notif-panel-title')).toHaveText('الإشعارات');

    /* الصفوف — عنوان أول إشعار + زمنه النسبي من الساعة المجمّدة */
    const item = page.locator('.notif-item', { hasText: 'تم نشر درجة الواجب الثاني' });
    await expect(item).toBeVisible();
    await expect(item).toContainText('منذ ساعتين');

    /* واجهة الإجراء الجماعي (bulk) */
    await expect(page.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeVisible();

    /* النقر على الصف يقود إلى صفحة التنبيهات الكاملة للدور */
    await item.click();
    await expect(page).toHaveURL(/\/student\/alerts$/);
    // R304: AlertsPage rides the patterns header (same selector update
    // the ai-assistant/library migrations made).
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
  });

  /* R349 (Agent 02) — the panel's CONTAINER GEOMETRY belt.
   *
   * Since the 1.0 squash the panel rendered as an UNPOSITIONED static
   * block appended to document.body (the R313 D16 glass retirement had
   * deleted the whole @supports block that carried the geometry; the
   * WS-D2 orphan sweeps then removed the backups as "dead"). The
   * toBeVisible() assertions above kept passing — a static block IS
   * visible — while the panel pushed the page down and its footer sat
   * below the fold on phones. This belt pins the anchored contract at
   * the narrow band where it broke hardest. */
  test('R349: اللوحة مُثبَّتة على الجرس وداخل الإطار والتذييل في المتناول (الهندسة)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/student/dashboard');

    await page.locator('.topbar-notif').click();
    const panel = page.locator('.notification-panel');
    await expect(panel).toBeVisible();

    /* The container is a positioned overlay (fixed), never a static
       block riding the document flow. */
    await expect(panel).toHaveCSS('position', 'fixed');
    /* The entrance animation rides the popover family's keyframes. */
    await expect(panel).toHaveCSS('animation-name', 'ulara-popover-in');

    /* Geometry: anchored under the bell, capped at the design height,
       and FULLY inside the viewport — the footer's «عرض جميع
       الإشعارات» must be reachable on a 390×844 phone. */
    const geo = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const viewAll = el.querySelector('.notif-panel-viewall');
      const vr = viewAll ? viewAll.getBoundingClientRect() : null;
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom),
        right: Math.round(r.right),
        vh: window.innerHeight,
        vw: window.innerWidth,
        viewAllBottom: vr ? Math.round(vr.bottom) : null,
      };
    });
    expect(geo.top).toBeGreaterThanOrEqual(48); // hangs below the topbar bell, not at 0
    expect(geo.bottom).toBeLessThanOrEqual(geo.vh);
    expect(geo.right).toBeLessThanOrEqual(geo.vw);
    expect(geo.left).toBeGreaterThanOrEqual(0);
    expect(geo.height).toBeLessThanOrEqual(540); // the design cap holds
    expect(geo.viewAllBottom, '«عرض جميع الإشعارات» داخل الإطار').not.toBeNull();
    expect(geo.viewAllBottom!).toBeLessThanOrEqual(geo.vh);

    /* ONE scroller: the list flexes to the container's cap and scrolls
       internally (the header and footer stay pinned) — the old fixed
       list caps produced a nested scroll trap. */
    const listState = await panel.evaluate((el) => {
      const list = el.querySelector('.notif-panel-list');
      if (!list) return null;
      const cs = getComputedStyle(list);
      return {
        maxBlockSize: cs.maxBlockSize,
        containerOverflow: getComputedStyle(el).overflow,
        listScrollable: list.scrollHeight > list.clientHeight,
      };
    });
    expect(listState).not.toBeNull();
    expect(listState!.containerOverflow).toBe('hidden'); // the container clips; the list scrolls
    expect(listState!.maxBlockSize).toBe('none'); // the fixed 420px/60vh caps are retired
  });
});
