/**
 * r359-A3 capture tool — the fidelity-gate camera.
 *
 * Hermetic: runs the Vite-served SPA with the e2e mock transport
 * (tests/e2e/fixtures/mock-transport.ts), seeds a fixture session per
 * role, and writes WebP screenshots + a JSON report (console errors,
 * horizontal overflow, tap-target sizes < 44px on mobile widths).
 *
 * Run (from frontend/):
 *   npx tsx ../docs/redesign/r359-a3/evidence/capture.mjs <shots.json> [--full]
 * where shots.json = [{ name, route, role, theme, width, height, fullPage? }]
 * role: STUDENT|TEACHER|ADMIN|QUALITY|OWNER|guest
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { installMockApi, seedSession } from '../../../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../../../frontend/tests/e2e/fixtures/api-fixtures';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CAPTURE_BASE ?? 'http://localhost:5173';

const cfgPath = process.argv[2];
if (!cfgPath) {
  console.error('usage: capture.mjs <shots.json>');
  process.exit(1);
}
const shots = JSON.parse(readFileSync(resolve(process.cwd(), cfgPath), 'utf8'));
const outDir = resolve(process.cwd(), process.env.CAPTURE_OUT ?? 'captures');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const report = [];
const ctxCache = new Map();

async function contextFor(role, theme) {
  const key = `${role}:${theme}`;
  if (ctxCache.has(key)) return ctxCache.get(key);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const user = role === 'guest' ? null : ROLE_USERS[role];
  await installMockApi(ctx, { sessionUser: user });
  await seedSession(ctx, user, { theme });
  ctxCache.set(key, ctx);
  return ctx;
}

for (const s of shots) {
  const ctx = await contextFor(s.role ?? 'STUDENT', s.theme ?? 'light');
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await page.setViewportSize({ width: s.width ?? 1440, height: s.height ?? 900 });
  const url = BASE + s.route;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    /* networkidle timeout — still capture what rendered */
  }
  await page.waitForTimeout(s.settle ?? 900);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    let smallTargets = 0;
    const targetList = [];
    if (doc.clientWidth <= 700) {
      for (const el of document.querySelectorAll('a,button,[role="button"],[role="tab"],input,select,summary')) {
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0;
        const style = getComputedStyle(el);
        if (visible && style.visibility !== 'hidden' && style.pointerEvents !== 'none') {
          if (r.width < 44 || r.height < 44) {
            smallTargets++;
            if (targetList.length < 8) {
              targetList.push(`${el.tagName.toLowerCase()}.${(el.className + '').split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
            }
          }
        }
      }
    }
    let radiusViolations = 0;
    let shadowViolations = 0;
    for (const el of Array.from(document.querySelectorAll('*')).slice(0, 3000)) {
      const cs = getComputedStyle(el);
      const isRound = el.tagName === 'IMG' && el.closest('[data-round-ok]') !== null;
      if (!isRound) {
        const br = cs.borderRadius;
        if (br && br !== '0px' && !br.includes('%')) radiusViolations++;
      }
      if (cs.boxShadow && cs.boxShadow !== 'none') shadowViolations++;
    }
    return { overflowX, smallTargets, targetList, radiusViolations, shadowViolations, title: document.title };
  });
  const file = `${s.name}.webp`;
  const pngPath = resolve(outDir, `${s.name}.png`);
  await page.screenshot({
    path: pngPath,
    fullPage: s.fullPage ?? false,
  });
  try {
    const { execSync } = await import('node:child_process');
    execSync(`ffmpeg -y -loglevel error -i "${pngPath}" -quality 80 "${resolve(outDir, file)}"`);
    execSync(`rm -f "${pngPath}"`);
  } catch {
    /* ffmpeg missing — keep the png, report it */
  }
  report.push({ ...s, file, errors, ...metrics });
  await page.close();
  console.log(`✓ ${file} — ovX:${metrics.overflowX} r:${metrics.radiusViolations} sh:${metrics.shadowViolations} t44:${metrics.smallTargets} err:${errors.length}`);
}

await browser.close();
writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.length} captures → ${outDir}`);
