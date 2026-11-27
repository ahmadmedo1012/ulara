#!/usr/bin/env node
/**
 * r369 capture rig — headless evidence, no visible window needed.
 *
 *   node docs/redesign/r369/capture.mjs <url> <outDir> [--dark] [--tags]
 *
 * Produces, for each device preset:
 *   · <name>.png        the full page
 *   · <name>-scroll.png a frame after a stepped wheel scroll (reveal check)
 *
 * The intro is skipped through its own session key (except when
 * --preloader is passed, which is the point of testing it).
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , url = 'http://127.0.0.1:5310/', outDir = 'docs/redesign/r369/evidence', ...flags] = process.argv;
const dark = flags.includes('--dark');
const preloader = flags.includes('--preloader');

const PRESETS = [
  { name: 'phone', viewport: { width: 390, height: 844 }, dsf: 2, mobile: true },
  { name: 'tablet', viewport: { width: 768, height: 1024 }, dsf: 2 },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, dsf: 1 },
  { name: 'wide', viewport: { width: 1920, height: 1080 }, dsf: 1 },
];

mkdirSync(outDir, { recursive: true });

/* This box ships Google Chrome but Playwright's own chromium build is
 * unavailable for the distro (ubuntu26.04), so the rig drives the
 * installed browser through the `chrome` channel — same engine, no
 * download, and the evidence is still headless. */
const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const p of PRESETS) {
  const ctx = await browser.newContext({
    viewport: p.viewport,
    deviceScaleFactor: p.dsf,
    isMobile: Boolean(p.mobile),
    hasTouch: Boolean(p.mobile),
    locale: 'ar-LY',
    colorScheme: dark ? 'dark' : 'light',
    ...(p.mobile ? { userAgent: devices['iPhone 13'].userAgent } : {}),
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([d, skip]) => {
      if (d) localStorage.setItem('ulara-theme', 'dark');
      if (skip) sessionStorage.setItem('ulara-intro-skip', '1');
    },
    [dark, !preloader],
  );
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(preloader ? 900 : 1400);
  const suffix = dark ? '-dark' : '';
  /* Walk the page the way a reader does, then return to the top, so the
   * full-page shot shows the REVEALED state rather than the armed one. */
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${outDir}/r369-${p.name}${suffix}.png`, fullPage: true });
  // stepped scroll — the reveal choreography must not leave a blank band
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 640);
    await page.waitForTimeout(220);
  }
  await page.screenshot({ path: `${outDir}/r369-${p.name}${suffix}-scroll.png`, fullPage: false });
  console.log(`✓ ${p.name}${suffix} ${p.viewport.width}×${p.viewport.height}`);
  await ctx.close();
}
await browser.close();
