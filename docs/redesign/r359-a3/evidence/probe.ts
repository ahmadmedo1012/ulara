/**
 * r359-A3 probe — lists every radius/shadow violation + sub-44px target
 * on a route, with selectors, so they can be killed at the source.
 * Run from frontend/: npx tsx ../docs/redesign/r359-a3/evidence/probe.mjs <route> <role> [width]
 */
import { chromium } from '@playwright/test';
import { installMockApi, seedSession } from '../../../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../../../frontend/tests/e2e/fixtures/api-fixtures';

const route = process.argv[2] ?? '/student/dashboard';
const role = process.argv[3] ?? 'STUDENT';
const width = Number(process.argv[4] ?? 1440);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 900 } });
const probeUser = ROLE_USERS[role];
await installMockApi(ctx, { sessionUser: probeUser });
await seedSession(ctx, probeUser, { theme: 'light' });
const page = await ctx.newPage();
await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);

const findings = await page.evaluate(`(() => {
  const describe = (el) => {
    const cls = Array.from(el.classList).slice(0, 3).join('.');
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const radius = [];
  const shadow = [];
  const small = [];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    const cs = getComputedStyle(el);
    const br = cs.borderRadius;
    if (br && br !== '0px' && !br.includes('%')) {
      radius.push(describe(el) + ' -> ' + br);
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      shadow.push(describe(el) + ' -> ' + cs.boxShadow.slice(0, 90));
    }
    if (document.documentElement.clientWidth <= 700 && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        small.push(describe(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    }
  }
  return { radius, shadow, small };
})()`);
console.log(`\n=== ${route} (${role}, ${width}px) ===`);
console.log(`RADIUS (${findings.radius.length}):`);
findings.radius.slice(0, 20).forEach((f) => console.log('  ' + f));
console.log(`SHADOW (${findings.shadow.length}):`);
findings.shadow.slice(0, 20).forEach((f) => console.log('  ' + f));
console.log(`SMALL TARGETS (${findings.small.length}):`);
findings.small.slice(0, 20).forEach((f) => console.log('  ' + f));
await browser.close();
