#!/usr/bin/env node
/* r360 F1 — the landing-height law (≤5,000px @390). Measures the built
 * SPA's document height at phone widths, scrolling to the bottom first
 * so every MountOnVisible gate fires (the diet's lazy seats mount and
 * their real heights replace the placeholders). Prints per-width JSON. */
import { chromium } from 'playwright';

const widths = [320, 360, 390, 768];
const url = process.argv[2] || 'http://localhost:4173/';
const out = {};

const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 844 },
    deviceScaleFactor: 1,
    isMobile: w <= 767,
    hasTouch: w <= 767,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // wait the entrance out (scroll-lock) then walk the page to the bottom
  await page.waitForTimeout(2500);
  const docH0 = await page.evaluate(() => document.documentElement.scrollHeight);
  // deep walk: scroll in 600px steps so every lazy seat mounts
  let y = 0;
  for (;;) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
    y += 600;
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (y > h + 1200) break;
  }
  await page.waitForTimeout(400);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const lz = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.lz-mount')).map((e) => ({
      label: e.dataset.lz,
      mounted: e.children.length > 0,
    })),
  );
  out[w] = {
    initialHeight: docH0,
    finalHeight: docH,
    mounts: lz,
    allMounted: lz.every((m) => m.mounted),
  };
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
