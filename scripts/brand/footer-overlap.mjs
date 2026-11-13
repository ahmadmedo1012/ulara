#!/usr/bin/env node
/**
 * footer-overlap.mjs — R345 1-C: the programmatic footer overlap detector.
 *
 * The ULARA Ω master contract (§1-C): "a script that detects overlap
 * PROGRAMMATICALLY (Playwright: getBoundingClientRect intersection between
 * footer/logo/menu elements, and scrollWidth > clientWidth) at 8 widths
 * (320/360/390/768/1024/1280/1440/1920) × light/dark × RTL."
 *
 * What counts as a DEFECT here (and only here — this is the acceptance
 * instrument, so its definitions are the contract):
 *   D1 horizontal overflow — documentElement/body/footer inner containers
 *      with scrollWidth > clientWidth + 1px.
 *   D2 content clipped outside the footer's own box — a footer descendant
 *      whose rect escapes the footer's content box by > 2px on any side
 *      (the -39px negative-margin strip class of bugs).
 *   D3 pairwise overlap — two VISIBLE content elements (text-bearing or
 *      interactive) whose client rects intersect by more than 2px in BOTH
 *      axes, where neither is an ancestor of the other. Pure decoration
 *      (aria-hidden / role=presentation / textless non-interactive) is
 *      exempt: a background band behind readable text is a design seat,
 *      not a defect.
 *
 * Self-contained in killing-environment sandboxes: the script boots its own
 * Vite dev server (process group, killed on exit) so no long-lived
 * background process is needed, then drives real Chromium.
 *
 * Usage:
 *   node scripts/brand/footer-overlap.mjs                 # 8 widths × 2 themes
 *   node scripts/brand/footer-overlap.mjs --widths 390,1440 --themes dark
 *   node scripts/brand/footer-overlap.mjs --out /tmp/footer-audit
 * Exit 0 = zero defects across the matrix. Exit 1 = defects (JSON report
 * path printed). Screenshots of the footer are written per cell.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

/** The repo's own convention (playwright.config.ts c4-E): sandbox boxes run a
 *  pre-installed Chrome-for-Testing instead of `playwright install`. */
function chromiumExecutable() {
  if (process.env.ULARA_E2E_EXECUTABLE) return process.env.ULARA_E2E_EXECUTABLE;
  const cache = `${process.env.HOME}/.cache/ms-playwright`;
  try {
    const revs = readdirSync(cache)
      .filter((d) => d.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const rev of revs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = `${cache}/${rev}/${sub}`;
        if (existsSync(p)) return p;
      }
    }
  } catch { /* fall through to bundled */ }
  return undefined;
}

// ── CLI ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const WIDTHS = (arg('widths', '320,360,390,768,1024,1280,1440,1920'))
  .split(',').map((w) => Number.parseInt(w, 10)).filter(Number.isFinite);
const THEMES = (arg('themes', 'light,dark')).split(',');
const OUT = arg('out', '/tmp/footer-audit');
const BASE = arg('base', 'http://localhost:5173');
const FOOTER_SEL = arg('footer', '.fo-footer');

const TOLERANCE = 2; // px — sub-pixel + AA noise floor for overlap/clipping
const OVERFLOW_TOL = 1; // px — scrollWidth noise floor

mkdirSync(OUT, { recursive: true });

// ── Vite dev server lifecycle (self-boot, process-group kill) ─────────
let vite = null;
async function bootVite() {
  if (existsSync(resolve(ROOT, 'frontend/node_modules/.bin/vite'))) {
    vite = spawn('node', ['node_modules/vite/bin/vite.js', '--port', '5173', '--strictPort'], {
      cwd: resolve(ROOT, 'frontend'),
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    vite = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
      cwd: resolve(ROOT, 'frontend'),
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
  }
  vite.stdout.on('data', () => {}); // drain
  vite.stderr.on('data', () => {}); // drain
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error('vite dev server did not become ready on :5173 within 90s');
}
function killVite() {
  if (vite?.pid) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* already gone */ } }
}

// ── In-page measurement (runs inside Chromium) ─────────────────────────
const MEASURE = ([footerSel, tolerance, overflowTol]) => {
  const footer = document.querySelector(footerSel);
  if (!footer) return { fatal: `footer not found: ${footerSel}` };
  footer.scrollIntoView({ block: 'end' });

  const style = (el) => getComputedStyle(el);
  const isDecor = (el) =>
    el.getAttribute('aria-hidden') === 'true' ||
    el.getAttribute('role') === 'presentation';

  /** Elements that carry readable content: own text, or interactive. */
  const contentEls = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (!footer.contains(el)) continue;
      const cs = style(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('');
      const interactive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
      if (!ownText && !interactive) continue; // pure container/decor
      if (isDecor(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      contentEls.push({ el, r, ownText, interactive });
    }
  };
  walk(footer);

  const contains = (a, b) => a.contains(b);

  // D3 — pairwise overlap between independent visible content elements
  const overlaps = [];
  for (let i = 0; i < contentEls.length; i++) {
    for (let j = i + 1; j < contentEls.length; j++) {
      const A = contentEls[i], B = contentEls[j];
      if (contains(A.el, B.el) || contains(B.el, A.el)) continue;
      const x = Math.max(0, Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left));
      const y = Math.max(0, Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top));
      if (x > tolerance && y > tolerance) {
        overlaps.push({
          a: describe(A), b: describe(B),
          area: Math.round(x * y),
          rect: [Math.round(x), Math.round(y)],
        });
      }
    }
  }
  function describe(c) {
    const cls = (c.el.className && typeof c.el.className === 'string') ? `.${c.el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const label = c.ownText ? `"${c.ownText.slice(0, 24)}"` : (c.interactive ? `<${c.el.tagName.toLowerCase()}>` : '?');
    return `${c.el.tagName.toLowerCase()}${cls}${label}`;
  }

  // D1 — horizontal overflow on the page and every footer container
  const overflows = [];
  const seenOverflow = new Set();
  const pushOverflow = (name, node) => {
    const key = `${name}:${node.scrollWidth}x${node.clientWidth}`;
    if (seenOverflow.has(key)) return;
    seenOverflow.add(key);
    overflows.push({ where: name, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, by: node.scrollWidth - node.clientWidth });
  };
  const scrollRoot = document.scrollingElement || document.documentElement;
  for (const [name, node] of [
    ['document', scrollRoot],
    ['body', document.body],
    ['footer', footer],
    ...[...footer.querySelectorAll('*')].slice(0, 400)
      .filter((el) => [document.body, scrollRoot, footer].every((x) => !x || !x.isSameNode(el)))
      .map((el) => [`.${(el.className || 'el').toString().trim().split(/\s+/)[0] ?? 'el'}`, el]),
  ]) {
    if (!node || node.scrollWidth <= node.clientWidth + overflowTol) continue;
    // skip elements whose own children overflow a scrollable seat by design (scroll areas)
    const cs = style(node);
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
    pushOverflow(name, node);
  }

  // D2 — footer descendants clipped outside the footer box
  const fr = footer.getBoundingClientRect();
  const clipped = [];
  for (const c of contentEls) {
    const out =
      Math.max(0, fr.left - c.r.left) + Math.max(0, c.r.right - fr.right) +
      Math.max(0, fr.top - c.r.top) + Math.max(0, c.r.bottom - fr.bottom);
    if (out > tolerance * 2) {
      clipped.push({ el: describe(c), outBy: Math.round(out) });
    }
  }

  return {
    fatal: null,
    dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
    footerHeight: Math.round(fr.height),
    contentCount: contentEls.length,
    overlaps, overflows, clipped,
  };
};

// ── Matrix run ─────────────────────────────────────────────────────────
const report = { generatedAt: new Date().toISOString(), base: BASE, footer: FOOTER_SEL, cells: [], totals: { defects: 0 } };

let browser;
try {
  await bootVite();
  browser = await chromium.launch({ executablePath: chromiumExecutable() });
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      const cell = { width, theme, defects: [] };
      try {
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.locator(FOOTER_SEL).waitFor({ state: 'visible', timeout: 45_000 });
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          document.documentElement.setAttribute('data-theme-swapping', ''); // freeze transitions (the app's own mechanism)
        }, theme);
        // scroll through the page to trigger every reveal-on-scroll observer
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          return new Promise((r) => setTimeout(r, 350));
        });
        await page.locator(FOOTER_SEL).scrollIntoViewIfNeeded();
        await page.waitForTimeout(700); // settle (fonts, late reveal)

        const m = await page.evaluate(MEASURE, [FOOTER_SEL, TOLERANCE, OVERFLOW_TOL]);
        if (m.fatal) { cell.defects.push({ kind: 'FATAL', detail: m.fatal }); }
        else {
          cell.dir = m.dir; cell.footerHeight = m.footerHeight; cell.contentCount = m.contentCount;
          for (const o of m.overflows) cell.defects.push({ kind: 'D1-overflow', detail: o });
          for (const c of m.clipped) cell.defects.push({ kind: 'D2-clipped', detail: c });
          for (const o of m.overlaps) cell.defects.push({ kind: 'D3-overlap', detail: o });
        }
        const footerEl = page.locator(FOOTER_SEL);
        await footerEl.screenshot({ path: `${OUT}/${width}-${theme}.png` }).catch(() => {});
      } catch (err) {
        cell.defects.push({ kind: 'RUN-ERROR', detail: String(err).slice(0, 300) });
      }
      report.totals.defects += cell.defects.length;
      report.cells.push(cell);
      const mark = cell.defects.length === 0 ? 'OK ' : `${String(cell.defects.length).padStart(3)}x`;
      console.log(`${mark}  ${width}×${theme.padEnd(5)}  h=${cell.footerHeight ?? '—'}  content=${cell.contentCount ?? '—'}  dir=${cell.dir ?? '—'}`);
      for (const d of cell.defects.slice(0, 6)) {
        console.log(`      ${d.kind}: ${JSON.stringify(d.detail).slice(0, 160)}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser?.close().catch(() => {});
  killVite();
}

const reportPath = `${OUT}/footer-overlap.json`;
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n${report.totals.defects === 0 ? 'PASS — zero defects' : `FAIL — ${report.totals.defects} defect(s)`} · report: ${reportPath}`);
process.exit(report.totals.defects === 0 ? 0 : 1);
