import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';
const RETIRED = '#d97706';
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: Number(process.env.PW || 768), height: 900 } });
  const page = await ctx.newPage();
  await installMockApi(page);
  await seedSession(page, 'OWNER');
  await page.goto('http://localhost:4173/owner/users', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  const code = `
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
          if (m) {
            var hex = '#' + [1,2,3].map(function(k){ return Number(m[k]).toString(16).padStart(2,'0'); }).join('');
            if (hex === '${RETIRED}') out.push(hex + ' ' + prop + ' @ <' + el.tagName + '> class=' + String(el.className).slice(0,50) + ' text=' + (el.textContent||'').trim().slice(0,20));
          }
        }
      }
    }
    out.slice(0, 8);
  `;
  const hits = await page.evaluate(code);
  console.log((hits as string[]).length ? (hits as string[]).join('\n') : 'CLEAN');
  await browser.close();
}
main();
