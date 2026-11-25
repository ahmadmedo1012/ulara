#!/usr/bin/env node
/**
 * r362 — the OVERLAP / COLLISION detector (P2.1, and the geometry half of P3).
 *
 * The owner's complaint is specific: text collides with text on the landing
 * and in the top bar (nav items, logo, theme/lang toggles, menu button, side
 * tab, cookie bar, hero headline vs paragraph vs links).
 *
 * Eyeballing screenshots cannot prove that at 7 widths × 2 themes × N routes;
 * geometry can. The probe walks a real page in Chromium and reports:
 *
 *   1. TEXT COLLISIONS — the GLYPH boxes of two text nodes intersect, where
 *      neither text is inside the other. Measured from `Range.getClientRects()`
 *      on the text node itself, not from the element's border box: two words of
 *      one wrapped heading have element boxes that can touch (inline-block
 *      padding, reveal masks, line-height tricks) while the glyphs are
 *      perfectly clear of each other. A reader collision means ink over ink.
 *      Fullscreen designed layers (preloader, menu overlay — a fixed element
 *      covering ≥80% of the viewport) are exempt while they are up: they are
 *      ON TOP by design, and the page beneath is not being read.
 *   2. CLIPPED TEXT — an element whose inline content is wider than its box
 *      (horizontal scroll) or taller than it, with text the reader therefore
 *      cannot read. Intentional one-line ellipsis on a body/subtitle element
 *      is a design decision and is not reported; an ellipsised HEADING or a
 *      control label is.
 *   3. PAGE OVERFLOW — the document scrolls horizontally.
 *
 * Usage (needs a built app on :4173 — `npm --prefix frontend run build`
 * then `npx vite preview --port 4173 --strictPort`):
 *
 *   node scripts/audit/r362-overlap.ts                    # public routes
 *   node scripts/audit/r362-overlap.ts --role STUDENT      # + a role's routes
 *   node scripts/audit/r362-overlap.ts --all --json out.json
 *
 * Exit status: 0 when clean, 1 when any finding — so it can gate CI.
 *
 * KNOWN LIMITATION (r362, not yet closed): inside an accordion/`<details>`, a
 * collapsed answer's text can still produce rects that intersect the next
 * question even though the reader sees nothing (the answer is clipped by the
 * item). `/help` therefore over-reports. Do NOT use this instrument on
 * accordion-dense pages until the clip-ancestor walk handles that pattern;
 * it is trustworthy on the landing and the shell pages, which is where the
 * owner's collisions were reported.
 */
import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';
import { ROLE_USERS } from '../../frontend/tests/e2e/fixtures/api-fixtures';

const BASE = process.env.ULARA_E2E_BASE_URL || 'http://localhost:4173';
const WIDTHS = [320, 360, 390, 768, 1024, 1440, 1920];
const THEMES = ['light', 'dark'];

const PUBLIC_ROUTES = ['/', '/auth', '/auth/register', '/404', '/colleges', '/about', '/help'];

const ROLE_ROUTES: Record<string, string[]> = {
  STUDENT: ['/student/dashboard', '/student/courses', '/student/calendar', '/student/alerts'],
  TEACHER: ['/teacher/dashboard', '/teacher/courses'],
  ADMIN: ['/admin/dashboard'],
  QUALITY: ['/quality/dashboard'],
  OWNER: ['/owner/dashboard'],
};

function parseArgs(argv: string[]) {
  const out = { roles: [] as string[], all: false, json: null as string | null, only: null as string | null, width: null as number | null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--role') out.roles.push(argv[++i]);
    else if (a === '--json') out.json = argv[++i];
    else if (a === '--only') out.only = argv[++i];
    else if (a === '--width') out.width = Number(argv[++i]);
  }
  return out;
}

/**
 * Runs inside the page. Kept as a SOURCE STRING on purpose: `page.evaluate(fn)`
 * ships the function's text through the bundler, which injects its `__name`
 * helper and fails in the page context (ReferenceError: __name).
 */
const COLLECT_SRC = `(() => {
  const MIN_OVERLAP = 40;   // px² of ink-on-ink before it is a collision
  const MIN_RATIO = 0.3;    // of the smaller ink box

  /* A designed fullscreen layer (preloader, menu overlay) sits ON TOP by
     design; the page under it is not being read while it is up. */
  const fullscreenLayers = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height >= window.innerWidth * window.innerHeight * 0.8) fullscreenLayers.push(el);
  }
  const inLayer = (el) => fullscreenLayers.some((l) => l.contains(el));

  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };

  /* Every text node that a reader can actually see, with the LINE BOXES of
     its glyphs (Range rects), not its element's border box. */
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    if (text.length === 0) continue;
    const el = node.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (inLayer(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (rects.length === 0) continue;
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue;
    /* Deflate to the INK box: a font's ascent+descent box is taller than the
       line advance under tight display leading, so two consecutive lines have
       em-boxes that overlap while the glyphs are perfectly clear. Shrinking
       each rect by half the (box - font-size) removes the leading, which is
       exactly the part that carries no ink. */
    const fs = parseFloat(cs.fontSize) || 0;
    /* Visible area: a text box clipped away by an ancestor's overflow is not
       rendered. A collapsed FAQ answer keeps live rects under its question —
       a fact about the DOM, not about what the reader sees. */
    let clipL = -Infinity, clipT = -Infinity, clipR = Infinity, clipB = Infinity;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflow === 'visible' && acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect();
      clipL = Math.max(clipL, ar.left); clipT = Math.max(clipT, ar.top);
      clipR = Math.min(clipR, ar.right); clipB = Math.min(clipB, ar.bottom);
    }
    const ink = rects.map((r) => {
      const pad = Math.max(0, (r.height - fs) / 2);
      const top = Math.max(r.top + pad, clipT);
      const bottom = Math.min(r.bottom - pad, clipB);
      const left = Math.max(r.left, clipL);
      const right = Math.min(r.right, clipR);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    });
    if (!ink.some((r) => r.height > 1)) continue;
    items.push({ el, node, rects: ink, text: text.slice(0, 48) });
  }

  const collisions = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let best = 0;
      let bestSmaller = 1;
      for (const ra of a.rects) {
        for (const rb of b.rects) {
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox <= 0 || oy <= 0) continue;
          const area = ox * oy;
          if (area <= best) continue;
          best = area;
          bestSmaller = Math.min(ra.width * ra.height, rb.width * rb.height);
        }
      }
      if (best < MIN_OVERLAP || best / bestSmaller < MIN_RATIO) continue;
      collisions.push({
        a: label(a.el),
        b: label(b.el),
        aText: a.text,
        bText: b.text,
        area: Math.round(best),
        ratio: Number((best / bestSmaller).toFixed(2)),
        aRect: a.rects.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]).slice(0, 3),
        bRect: b.rects.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]).slice(0, 3),
        aOpacity: getComputedStyle(a.el).opacity,
        aTransform: getComputedStyle(a.el).transform,
        aClip: getComputedStyle(a.el).clipPath,
      });
    }
  }

  /* Clipped text: the box hides content the reader needs. */
  const clipped = [];
  const seen = new Set();
  for (const { el, text } of items) {
    if (seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    const hidesX = el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible';
    const hidesY = el.scrollHeight > el.clientHeight + 1 && cs.overflowY !== 'visible';
    if (!hidesX && !hidesY) continue;
    const ellipsis = cs.textOverflow === 'ellipsis';
    const mustRead = /^H[1-6]$/.test(el.tagName) || el.tagName === 'BUTTON' || el.tagName === 'A';
    if (ellipsis && !mustRead) continue;
    clipped.push({
      el: label(el),
      text: text.slice(0, 48),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      axis: hidesX ? 'x' : 'y',
    });
  }

  return { collisions, clipped, overflow: document.documentElement.scrollWidth - window.innerWidth };
})()`;

type Cell = { collisions: { a: string; b: string; aText: string; bText: string; area: number; ratio: number }[]; clipped: { el: string; text: string; scrollW: number; clientW: number; axis: string }[]; overflow: number };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const routes = args.only ? [args.only] : [...PUBLIC_ROUTES];
  for (const role of args.roles) routes.push(...(ROLE_ROUTES[role] || []));
  if (args.all) for (const rs of Object.values(ROLE_ROUTES)) routes.push(...rs);

  const browser = await chromium.launch();
  const findings: Record<string, unknown>[] = [];
  let cells = 0;

  for (const route of routes) {
    const role = Object.entries(ROLE_ROUTES).find(([, rs]) => rs.includes(route))?.[0] ?? null;
    for (const width of args.width ? [args.width] : WIDTHS) {
      for (const theme of THEMES) {
        const ctx = await browser.newContext({
          viewport: { width, height: width < 500 ? 844 : 900 },
          isMobile: width < 500,
          hasTouch: width < 500,
          colorScheme: theme as 'light' | 'dark',
        });
        const page = await ctx.newPage();
        try {
          await installMockApi(page);
          if (role) await seedSession(ctx, ROLE_USERS[role as keyof typeof ROLE_USERS], { theme: theme as 'light' | 'dark' });
          const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (!resp || resp.status() >= 400) throw new Error('navigation status ' + (resp ? resp.status() : 'none'));
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          /* The first-load entrance (preloader + hero reveal) draws a
           * DUPLICATE of the hero headline over the real one while it runs —
           * two copies of the same words on top of each other is the
           * designed state, not a collision. Wait for the entrance to leave
           * the DOM (bounded: a stuck entrance must not hang the sweep). */
          await page
            .waitForFunction(
              `(() => {
                 const layer = document.querySelector('[data-preloader], .pl-');
                 if (!layer) return true;
                 const cs = getComputedStyle(layer);
                 return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
               })()`,
              undefined,
              { timeout: 6000 },
            )
            .catch(() => {});
          await page.waitForTimeout(1200);
          const res = (await page.evaluate(COLLECT_SRC)) as Cell;
          cells += 1;
          if (res.overflow > 1) findings.push({ route, width, theme, kind: 'overflow', px: res.overflow });
          for (const c of res.collisions) findings.push({ route, width, theme, kind: 'overlap', ...c });
          for (const c of res.clipped) findings.push({ route, width, theme, kind: 'clipped', ...c });
        } catch (err) {
          findings.push({ route, width, theme, kind: 'probe-error', detail: String(err).slice(0, 160) });
        } finally {
          await ctx.close();
        }
      }
    }
  }

  await browser.close();

  const out = { generatedAt: new Date().toISOString(), base: BASE, cells, routes: routes.length, findings };
  if (args.json) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(args.json, JSON.stringify(out, null, 1));
  }

  const byKind = findings.reduce<Record<string, number>>((m, f) => {
    const k = String(f.kind);
    m[k] = (m[k] || 0) + 1;
    return m;
  }, {});
  console.log(`overlap sweep: ${cells} cells × ${routes.length} routes @ ${BASE}`);
  console.log(`findings: ${findings.length}`, JSON.stringify(byKind));
  for (const f of findings.slice(0, 70)) {
    const head = `${String(f.route)} @${String(f.width)}/${String(f.theme)} ${String(f.kind).toUpperCase()}`;
    if (f.kind === 'overlap') console.log(`  ${head} ${f.a} (${JSON.stringify(f.aText)}) × ${f.b} (${JSON.stringify(f.bText)}) area=${f.area} ratio=${f.ratio} a=${JSON.stringify(f.aRect)} b=${JSON.stringify(f.bRect)} op=${f.aOpacity} tf=${f.aTransform} clip=${f.aClip}`);
    else if (f.kind === 'clipped') console.log(`  ${head} ${f.el} ${f.axis} ${f.scrollW}>${f.clientW} ${JSON.stringify(f.text)}`);
    else if (f.kind === 'overflow') console.log(`  ${head} +${f.px}px`);
    else console.log(`  ${head} ${String(f.detail ?? '')}`);
  }
  if (findings.length > 70) console.log(`  … ${findings.length - 70} more (use --json)`);
  process.exit(findings.length === 0 ? 0 : 1);
}

main();
