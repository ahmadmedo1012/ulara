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

const browser = await chromium.launch();
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
