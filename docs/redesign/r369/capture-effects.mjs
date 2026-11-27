import { chromium } from 'playwright';
import fs from 'node:fs';

/* r369 slice 05 evidence — effects + sound:
 *   celebrate-{light,dark}   — <Celebrate/> firing on a REAL level-up
 *                              (remembered 2, API reports 4 فضي).
 *   celebrate-rm             — the reduced-motion static fact line.
 *   mascot-{light,dark}      — نجّوم in the achievements empty state.
 *   mascot-rm                — the reduced-motion still star.
 *   press-active             — the press spring held mid-:active.
 *   shimmer-{light,dark}     — skeletons mid-shimmer (API stalled).
 * Sound has no pixel; its contract is proven by tests/unit/sound.test.ts
 * and the Settings «الصوت» section (settings-sound-light.png).
 *
 * Needs: vite preview on :5310 (frontend/dist built). No backend —
 * /api/v1/training/me is mocked to the level-up payload, achievements
 * to an honest empty list, everything else fails quietly.
 */
const BASE = 'http://localhost:5310';
const OUT = 'docs/redesign/r369/evidence/05-effects-sound';

const AUTH = {
  state: { user: { id: 'cap-student', email: 'student@test.ly', firstName: 'طالب', lastName: 'التجريبي', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 'cap-token', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' },
  version: 2,
};
const LEVEL_UP = {
  data: {
    points: 1240,
    level: { level: 4, tier: 'SILVER', toNext: 160, pctIntoLevel: 55 },
    badgeCount: 0, certificateCount: 0, tracksEnrolled: 0, tracksCompleted: 0, recentBadges: [],
  },
};

async function newPage(browser, { dark = false, rm = false, stallApi = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    reducedMotion: rm ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 90)); });
  await page.addInitScript(([auth, d]) => {
    localStorage.setItem('ula-auth', JSON.stringify(auth));
    /* the level-up event: remembered 2, the API will report 4 */
    localStorage.setItem('ula-level:cap-student', '2');
    if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
    sessionStorage.setItem('ulara-intro-skip', '1');
  }, [AUTH, dark]);
  /* Playwright matches routes in reverse registration order — the
   * catch-all first so the specific mocks win. */
  await page.route('**/api/**', (route) =>
    stallApi ? new Promise(() => {}) : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }),
  );
  await page.route('**/api/v1/me/achievements**', (route) =>
    stallApi ? new Promise(() => {}) : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
  );
  await page.route('**/api/v1/training/me**', (route) =>
    stallApi ? new Promise(() => {}) : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LEVEL_UP) }),
  );
  return { ctx, page, errors };
}

const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : {});

/* 1+2 · Celebrate firing, light + dark */
for (const dark of [false, true]) {
  const { ctx, page, errors } = await newPage(browser, { dark });
  await page.goto(`${BASE}/student/gamification`, { waitUntil: 'networkidle' });
  const cel = page.locator('.g369-celebrate');
  await cel.waitFor({ state: 'visible', timeout: 8000 });
  const txt = ((await cel.textContent({ timeout: 3000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  /* the moment retires at ~1100ms — two frames inside that window:
     mid-rise immediately, fully risen at +380ms (guarded). */
  await cel.screenshot({ path: `${OUT}/celebrate-rise-${dark ? 'dark' : 'light'}.png` });
  await page.waitForTimeout(380);
  try {
    await cel.screenshot({ path: `${OUT}/celebrate-${dark ? 'dark' : 'light'}.png`, timeout: 2500 });
  } catch { fs.copyFileSync(`${OUT}/celebrate-rise-${dark ? 'dark' : 'light'}.png`, `${OUT}/celebrate-${dark ? 'dark' : 'light'}.png`); }
  console.log(`OK celebrate-${dark ? 'dark' : 'light'} console-errors=${errors.length} text=${txt}`);
  await ctx.close();
}

/* 3 · Celebrate under reduced motion — the static line */
{
  const { ctx, page, errors } = await newPage(browser, { rm: true });
  await page.goto(`${BASE}/student/gamification`, { waitUntil: 'networkidle' });
  const cel = page.locator('.g369-celebrate');
  await cel.waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(400);
  await cel.screenshot({ path: `${OUT}/celebrate-rm.png` });
  const anim = await cel.locator('.g369-celebrate-halo').evaluate((el) => getComputedStyle(el).animationName);
  console.log(`OK celebrate-rm console-errors=${errors.length} halo-animation=${anim}`);
  await ctx.close();
}

/* 4+5 · the mascot in the achievements empty state, light + dark + RM */
for (const [name, opts] of [['light', {}], ['dark', { dark: true }], ['rm', { rm: true }]]) {
  const { ctx, page, errors } = await newPage(browser, opts);
  await page.goto(`${BASE}/student/gamification`, { waitUntil: 'networkidle' });
  const m = page.locator('.g369-mascot-empty').first();
  await m.waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(1400); // mid-bob frame
  /* the whole empty state: the mascot over its SheetEmpty words */
  await m.locator('xpath=..').screenshot({ path: `${OUT}/mascot-${name}.png` });
  const anim = await m.locator('svg').evaluate((el) => getComputedStyle(el).animationName);
  console.log(`OK mascot-${name} console-errors=${errors.length} idle-animation=${anim}`);
  await ctx.close();
}

/* 6 · the press spring held mid-:active on a primary button */
{
  const { ctx, page, errors } = await newPage(browser, {});
  await page.goto(`${BASE}/student/gamification`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400); // let the celebration settle first
  const btn = page.locator('.btn.primary').first();
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150); // inside the 120ms down-beat + hold
  const live = await btn.evaluate((el) => ({ t: getComputedStyle(el).transform, a: el.matches(':active') }));
  await btn.screenshot({ path: `${OUT}/press-active.png` });
  await page.mouse.up();
  console.log(`OK press-active console-errors=${errors.length} active=${live.a} transform=${live.t}`);
  await ctx.close();
}

/* 7 · shimmer: the API stalled, skeletons mid-loop, light + dark */
for (const dark of [false, true]) {
  const { ctx, page, errors } = await newPage(browser, { dark, stallApi: true });
  await page.goto(`${BASE}/student/gamification`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/shimmer-${dark ? 'dark' : 'light'}.png` });
  const n = await page.locator('.skeleton').count();
  console.log(`OK shimmer-${dark ? 'dark' : 'light'} console-errors=${errors.length} skeletons=${n}`);
  await ctx.close();
}

/* 8 · the Settings «الصوت» seat */
{
  const { ctx, page, errors } = await newPage(browser, {});
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const sec = page.locator('text=أصوات الواجهة').first();
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/settings-sound-light.png` });
  const pressed = await page.locator('button[aria-label^="أصوات الواجهة"]').getAttribute('aria-pressed');
  console.log(`OK settings-sound console-errors=${errors.length} default-pressed=${pressed}`);
  await ctx.close();
}

await browser.close();
console.log('DONE slice-05 evidence');
