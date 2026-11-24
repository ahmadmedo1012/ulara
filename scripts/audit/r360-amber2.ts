import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';
/* reproduce the SCAN's context-leak state: one context, visit the
   prior OWNER routes first, then /owner/users, then sweep. */
async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 768, height: 900 }, colorScheme: 'light', locale: 'ar-LY' });
  await context.addInitScript('window.__name = function (f) { return f; };');
  await seedSession(context, 'OWNER', { theme: 'light' });
  await installMockApi(context, { sessionUser: 'OWNER', overrides: [] });
  const page = await context.newPage();
  for (const r of ['/', '/owner/institutions', '/auth/reset-password', '/owner/users']) {
    await page.goto('http://localhost:4173' + r, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1800);
  }
  const hits = await page.evaluate(`
    var out = [];
    var els = document.querySelectorAll('body *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var cs = getComputedStyle(el);
      var props = [cs.color, cs.backgroundColor, cs.borderTopColor];
      for (var j = 0; j < props.length; j++) {
        var prop = props[j];
        if (prop && prop.indexOf('rgb') >= 0) {
          var m = prop.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (m && m[1] === '217' && m[2] === '119' && m[3] === '6') {
            out.push('<' + el.tagName + '> class=' + String(el.className).slice(0,60) + ' ' + prop + ' text=' + (el.textContent||'').trim().slice(0,30));
          }
        }
      }
    }
    out.slice(0, 6);
  `);
  console.log((hits as string[]).length ? (hits as string[]).join('\n') : 'CLEAN');
  await browser.close();
}
main();
