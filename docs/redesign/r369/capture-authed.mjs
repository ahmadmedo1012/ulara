#!/usr/bin/env node
/**
 * r369 authed capture rig — the product shell's evidence.
 *
 *   node docs/redesign/r369/capture-authed.mjs <baseUrl> <outDir> [--dark] [--widths=1440,820,390] [--route=/student]
 *
 * Seeds a persisted zustand session (ula-auth, version 1) so ProtectedRoute
 * admits the render without a backend. API calls fail against the preview
 * server — the pages show their honest error/empty states while the SHELL
 * (the subject of slice 02) renders in full.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , baseUrl = 'http://127.0.0.1:5310', outDir = 'docs/redesign/r369/evidence/02-product-shell', ...flags] = process.argv;
const dark = flags.includes('--dark');
const wFlag = flags.find((f) => f.startsWith('--widths='));
const WIDTHS = wFlag ? wFlag.slice(9).split(',').map(Number) : [1440, 820, 390];
const rFlag = flags.find((f) => f.startsWith('--route='));
const ROUTE = rFlag ? rFlag.slice(8) : '/student';

const SESSION = {
  state: {
    user: {
      id: 'r369-capture-student',
      email: 'student@test.ly',
      firstName: 'طالب',
      lastName: 'التجريبي',
      role: 'STUDENT',
      avatarColor: null,
      avatarInitials: null,
      scopeFacultyId: null,
    },
    accessToken: 'r369-capture-token',
    memberships: [],
    currentInstitution: null,
    membershipRole: 'STUDENT',
  },
  version: 1,
};

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    deviceScaleFactor: width < 500 ? 2 : 1,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([session, d]) => {
      localStorage.setItem('ula-auth', JSON.stringify(session));
      /* zustand persist shape (theme.store.ts: name ulara-theme, version 2) */
      if (d) localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 0 }, version: 2 }));
      sessionStorage.setItem('ulara-intro-skip', '1');
    },
    [SESSION, dark],
  );
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const suffix = dark ? '-dark' : '';
  await page.screenshot({ path: `${outDir}/shell-${width}${suffix}.png`, fullPage: true });
  console.log(`OK shell ${width}${suffix} console-errors=${errors.length}`);
  await ctx.close();
}
await browser.close();
