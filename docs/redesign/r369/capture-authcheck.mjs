import { chromium } from 'playwright';
/* slice 06 dead-code sweep proof: the auth sheets render IDENTICALLY
 * after the retired errors.css AUTH section + patterns.css .auth-shell
 * rule + the four imports were deleted (the warm .p369 sheet owns the
 * look). Public pages need no auth seed. */
const browser = await chromium.launch();
for (const [route, name] of [['/auth', 'login'], ['/auth/register', 'register']]) {
  for (const dark of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: dark ? 'dark' : 'light' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 80)); });
    await page.addInitScript((d) => {
      if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
      sessionStorage.setItem('ulara-intro-skip', '1');
    }, dark);
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }));
    await page.goto(`http://localhost:5310${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/redesign/r369/evidence/06-closeout/auth-${name}-${dark ? 'dark' : 'light'}.png` });
    const title = await page.locator('.p369 .auth-form-title, .auth-form-title').first().textContent().catch(() => 'MISSING');
    console.log(`OK auth-${name}-${dark ? 'dark' : 'light'} console-errors=${errors.length} title=${title?.trim()}`);
    await ctx.close();
  }
}
await browser.close();
