#!/usr/bin/env node
/**
 * r369 route capture — one screenshot set per public route.
 *
 *   node docs/redesign/r369/capture-routes.mjs <baseUrl> <outDir> [--dark] [--widths=1440,390]
 *
 * For each route in ROUTES: <route>-<width>.png full page + -scroll frame.
 * The intro is skipped through its own session key.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , baseUrl = 'http://127.0.0.1:5310', outDir = 'docs/redesign/r369/evidence/routes', ...flags] = process.argv;
const dark = flags.includes('--dark');
const wFlag = flags.find((f) => f.startsWith('--widths='));
const WIDTHS = wFlag ? wFlag.slice(9).split(',').map(Number) : [1440, 390];

const ROUTES = [
  ['about', '/about'],
  ['help', '/help'],
  ['contact', '/contact'],
  ['app', '/app'],
  ['legal-privacy', '/legal/privacy'],
  ['colleges', '/colleges'],
  ['leaderboard', '/colleges/leaderboard'],
  ['college-detail', '/colleges/1'],
  ['campus', '/campus'],
  ['capabilities', '/capabilities'],
  ['vision', '/vision'],
  ['competitions', '/competitions'],
  ['auth', '/auth'],
  ['auth-register', '/auth/register'],
  ['auth-forgot', '/auth/forgot-password'],
  ['auth-reset', '/auth/reset-password'],
  ['404', '/no-such-page-r369'],
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    deviceScaleFactor: width < 500 ? 2 : 1,
    isMobile: width < 500,
    hasTouch: width < 500,
    locale: 'ar-LY',
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.addInitScript((d) => {
    sessionStorage.setItem('ulara-intro-skip', '1');
    if (d) localStorage.setItem('ulara-theme', 'dark');
  }, dark);
  for (const [name, route] of ROUTES) {
    try {
      await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 20000 });
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 700) {
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
        await page.waitForTimeout(30);
      }
      await page.screenshot({ path: `${outDir}/${name}-${width}-scroll.png`, fullPage: false });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${outDir}/${name}-${width}.png`, fullPage: true });
      console.log('ok', name, width);
    } catch (e) {
      console.log('FAIL', name, width, String(e).slice(0, 120));
    }
  }
  await ctx.close();
}
await browser.close();
