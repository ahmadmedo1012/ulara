import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
await ctx.addInitScript(() => sessionStorage.setItem('ulara-intro-skip', '1'));
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });

// 02 — tap three tasks
const tasks = p.locator('.w369-task');
await tasks.nth(0).click(); await tasks.nth(1).click(); await tasks.nth(2).click();
console.log('02 count:', await p.locator('.w369-today-count b').innerText(), '| earn:', await p.locator('.w369-today-earn').innerText(), '| pressed:', await tasks.nth(0).getAttribute('aria-pressed'));
// untap one
await tasks.nth(0).click();
console.log('02 after untap:', await p.locator('.w369-today-count b').innerText());

// 03 — tap add twice
const add = p.locator('.w369-meter .w369-btn');
await add.scrollIntoViewIfNeeded();
const before = await p.locator('.w369-meter-msg').innerText();
await add.click(); await add.click();
console.log('03 msg before/after:', before, '→', await p.locator('.w369-meter-msg').innerText());

// 04 — wallet to unlock first reward
const wbtn = p.locator('.w369-wallet .w369-btn');
await wbtn.scrollIntoViewIfNeeded();
for (let i = 0; i < 6; i++) await wbtn.click();
console.log('04 opened:', await p.locator('.w369-reward[data-open="true"]').count(), '| num:', await p.locator('.w369-wallet-num').innerText());

// 05 — pick level 12
await p.locator('.w369-level').nth(11).click();
console.log('05 readout:', await p.locator('.w369-levels-idx').innerText(), '| name:', await p.locator('.w369-levels-name').innerText());

// 07 — teacher phone + approval
await p.locator('.w369-two-tab').nth(1).click();
const approve = p.locator('.w369-mini-cta');
await approve.scrollIntoViewIfNeeded();
await approve.click();
console.log('07 after send:', (await p.locator('.w369-mini-note').first().innerText()));
await approve.click();
console.log('07 after approve:', (await p.locator('.w369-mini-note').first().innerText()));

// 08 — carousel next
await p.locator('.w369-arrow').nth(1).click();
console.log('08 count:', await p.locator('.w369-slide-count').innerText(), '| title:', await p.locator('.w369-show .w369-h3').innerText());
console.log('console errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
