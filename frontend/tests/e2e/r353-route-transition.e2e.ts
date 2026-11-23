/**
 * r353-route-transition.e2e.ts — the REAL route-transition belt.
 *
 * r351 shipped the paper-strip route transition with two silent
 * defects (fixed in motion.css's r353 block): the strips lived on the
 * PERSISTENT `.page-transition` wrapper, so the open leg ran ONCE on
 * shell mount and never again, and `animation-fill-mode: backwards`
 * held no end state — after that single run the strips fell back to
 * their base `translateY(0)`: an opaque, full-viewport cover at
  * `var(--bg)` on the --pt-z rung. Every routed page rendered BLANK
 * to the eye while the DOM stayed perfectly healthy underneath
 * (`pointer-events: none` kept clicks landing; Playwright's
 * box-based `toBeVisible` stayed green). That is exactly why every
 * pre-existing belt passed while a human saw an empty owner console.
 *
 * This spec is the instrument the transition never had — it refuses
 * the DOM-presence shortcut and proves ACTUAL VISUAL APPEARANCE:
 *
 *  1. THE OPEN LEG EXISTS — on first load, internal navigation and
 *     back/forward, a live `pt-open-*` CSS animation on the strips
 *     (`.page-transition-inner::before/::after`, the r353 keyed
 *     seat) is observed RUNNING (Web Animations API), then awaited
 *     to `finished`.
 *  2. NOTHING COVERS THE PAGE AT REST — after the open leg finishes,
 *     the computed transforms of BOTH strips are off-screen
 *     (|ty| ≥ ½ viewport height, correct signs), the strips are
 *     pointer-transparent, and no `pt-*` animation is still running.
 *  3. PIXEL PROOF — the content region is screenshot-decoded (a
 *     minimal in-spec PNG reader: zlib inflate + scanline
 *     unfiltering) and its `--bg`-colored pixel fraction is compared
 *     against a SAME-CLIP blank probe (a `--bg` overlay div — the
 *     pixel-true image of the r351 blank-page defect): the rendered
 *     region must be decisively non-blank, and the two screenshots'
 *     bytes must differ.
 *  4. REDUCED MOTION — with `reducedMotion: 'reduce'` the strips are
 *     `display: none`, no `pt-*` animation ever runs, and the content
 *     is pixel-proven immediately.
 *
 * The hermetic pattern is the suite's own: real router, hooks, stores
 * and render tree against the mock transport — only the /api/v1 wire
 * is fixed.
 */
import { test, expect } from './fixtures/e2e';
import zlib from 'node:zlib';
import type { Locator, Page } from '@playwright/test';

/* ── the minimal PNG reader (Chromium screenshots: 8-bit RGB/RGBA,
      non-interlaced) — the pixel-truth instrument ─────────────────── */

interface PngImage { width: number; height: number; rgb: Uint8Array }

function decodePng(png: Buffer): PngImage {
  if (png.length < 8 || png.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('r353: screenshot buffer is not a PNG');
  }
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (off + 12 <= png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      interlace = data[12] ?? 0;
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(`r353: unsupported PNG (depth=${bitDepth} color=${colorType} interlace=${interlace})`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = new Uint8Array(width * height * 3);
  let prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const x = line[i] ?? 0;
      const a = i >= bpp ? cur[i - bpp] ?? 0 : 0;
      const b = prev[i] ?? 0;
      const c = i >= bpp ? prev[i - bpp] ?? 0 : 0;
      let v: number;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = (x + a) & 0xff; break;
        case 2: v = (x + b) & 0xff; break;
        case 3: v = (x + ((a + b) >> 1)) & 0xff; break;
        default: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
        }
      }
      cur[i] = v;
    }
    for (let px = 0; px < width; px++) {
      out[(y * width + px) * 3] = cur[px * bpp] ?? 0;
      out[(y * width + px) * 3 + 1] = cur[px * bpp + 1] ?? 0;
      out[(y * width + px) * 3 + 2] = cur[px * bpp + 2] ?? 0;
    }
    prev = cur;
  }
  return { width, height, rgb: out };
}

function bgPixelFraction(img: PngImage, bg: readonly [number, number, number], tol = 3): number {
  let n = 0;
  const total = img.rgb.length / 3;
  for (let i = 0; i < img.rgb.length; i += 3) {
    if (
      Math.abs((img.rgb[i] ?? 0) - bg[0]) <= tol
      && Math.abs((img.rgb[i + 1] ?? 0) - bg[1]) <= tol
      && Math.abs((img.rgb[i + 2] ?? 0) - bg[2]) <= tol
    ) n += 1;
  }
  return total === 0 ? 1 : n / total;
}

/* ── the in-page probes (computed styles + Web Animations) ───────── */

interface StripState {
  beforeTransform: string;
  afterTransform: string;
  beforeDisplay: string;
  afterDisplay: string;
  beforePointerEvents: string;
  afterPointerEvents: string;
}

async function readStrips(page: Page): Promise<StripState> {
  return page.evaluate(() => {
    const inner = document.querySelector('.page-transition-inner');
    if (!inner) throw new Error('r353: .page-transition-inner not found — the strips\' keyed seat is gone');
    const before = getComputedStyle(inner, '::before');
    const after = getComputedStyle(inner, '::after');
    return {
      beforeTransform: before.transform,
      afterTransform: after.transform,
      beforeDisplay: before.display,
      afterDisplay: after.display,
      beforePointerEvents: before.pointerEvents,
      afterPointerEvents: after.pointerEvents,
    };
  });
}

/** Parse the y-translation out of a computed `matrix(1, 0, 0, 1, x, y)`. */
function matrixY(transform: string): number {
  const m = /matrix\(([^)]+)\)/.exec(transform);
  if (!m) return Number.NaN;
  const parts = (m[1] ?? '').split(',').map((s) => parseFloat(s.trim()));
  return parts.length >= 6 ? parts[5] ?? Number.NaN : Number.NaN;
}

/** True while any `pt-*` strip animation is running/unfinished. */
async function ptAnimations(page: Page): Promise<{ name: string; state: string; current: number }[]> {
  return page.evaluate(() => {
    const out: { name: string; state: string; current: number }[] = [];
    for (const a of document.getAnimations()) {
      const name = (a as unknown as { animationName?: string }).animationName;
      if (typeof name === 'string' && name.startsWith('pt-')) {
        out.push({ name, state: a.playState, current: Number(a.currentTime ?? -1) });
      }
    }
    return out;
  });
}

/** Poll until a `pt-open-*` animation is observed (deadline ms). */
async function waitForOpenLeg(page: Page, deadline = 4_000): Promise<void> {
  await expect
    .poll(async () => (await ptAnimations(page)).some((a) => a.name.startsWith('pt-open')), {
      timeout: deadline,
      message: 'r353: the open leg (pt-open-*) never started — the route transition is dead',
    })
    .toBe(true);
}

/** Wait until every `pt-*` animation reached `finished`. */
async function waitForStripsSettled(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const anims = await ptAnimations(page);
      return anims.length === 0 ? false : anims.every((a) => a.state === 'finished');
    }, {
      timeout: 8_000,
      message: 'r353: the strip animations never finished — the page may stay covered',
    })
    .toBe(true);
}

/** THE assertion set: strips off-screen at rest + never block + the
 *  transition really replayed for THIS navigation. */
async function assertStripsRetreated(page: Page): Promise<void> {
  const vh = page.viewportSize()?.height ?? 800;
  const strips = await readStrips(page);
  // Off-screen: |ty| beyond half the viewport (strip height 50.2%vh ×
  // 101% ≈ 50.7%vh), top strip UP, bottom strip DOWN.
  const tyBefore = matrixY(strips.beforeTransform);
  const tyAfter = matrixY(strips.afterTransform);
  expect(tyBefore, `::before transform at rest (want ≤ -${vh / 2}px): ${strips.beforeTransform}`).toBeLessThanOrEqual(-vh / 2);
  expect(tyAfter, `::after transform at rest (want ≥ ${vh / 2}px): ${strips.afterTransform}`).toBeGreaterThanOrEqual(vh / 2);
  // The never-blocks guarantees.
  expect(strips.beforePointerEvents).toBe('none');
  expect(strips.afterPointerEvents).toBe('none');
}

/** The pixel-truth: decode the content-region screenshot and compare
 *  its --bg fraction against the same clip under a --bg probe (the
 *  pixel-true image of the r351 blank page). */
async function assertContentPainted(page: Page, label: string): Promise<void> {
  const clip = await page.evaluate(() => {
    const r = document.querySelector('.content')!.getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, window.innerWidth - Math.max(0, r.left)), height: Math.min(r.height, window.innerHeight - Math.max(0, r.top)) };
  });
  expect(clip.width, `${label}: the content region has a clip width`).toBeGreaterThan(200);
  expect(clip.height, `${label}: the content region has a clip height`).toBeGreaterThan(200);

  const painted = await page.screenshot({ clip });
  const bg = await page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
    if (!m || !m[1] || !m[2] || !m[3]) throw new Error(`r353: unparsable --bg token: ${v}`);
    const rgb: [number, number, number] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    return rgb;
  });

  // The blank reference: a --bg overlay on the exact same clip.
  await page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const r = document.querySelector('.content')!.getBoundingClientRect();
    const d = document.createElement('div');
    d.id = 'r353-blank-probe';
    d.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background:${v};z-index:2147483647;pointer-events:none;`;
    document.body.appendChild(d);
  });
  const blank = await page.screenshot({ clip });
  await page.evaluate(() => document.getElementById('r353-blank-probe')?.remove());

  const paintedImg = decodePng(painted);
  const blankImg = decodePng(blank);
  const paintedFraction = bgPixelFraction(paintedImg, bg);
  const blankFraction = bgPixelFraction(blankImg, bg);

  // The probe really images the blank defect (a sanity gate on the
  // instrument itself: an opaque --bg cover must be ~100% --bg).
  expect(blankFraction, `${label}: the blank probe must be ≈100% --bg (got ${blankFraction})`).toBeGreaterThan(0.97);
  // The rendered page must be decisively non-blank in the SAME clip.
  expect(paintedFraction, `${label}: content painted (non-bg pixel fraction ${(1 - paintedFraction).toFixed(3)} — the r351 defect renders ≥0.99)`).toBeLessThan(0.85);
  // And the bytes differ outright.
  expect(painted.equals(blank), `${label}: the painted screenshot must differ from the blank probe`).toBe(false);
}

/** One full navigation cycle: open leg observed → finished → strips
 *  retreated → h1 present → content pixel-painted. */
async function assertNavigationTransition(page: Page, label: string): Promise<void> {
  await waitForOpenLeg(page);
  await waitForStripsSettled(page);
  await assertStripsRetreated(page);
  await expect(page.locator('main h1'), `${label}: the page carries its one h1`).toBeVisible();
  await assertContentPainted(page, label);
}

async function settleDashboard(page: Page): Promise<void> {
  await page.locator('.content .skeleton, .content [aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function sidebarLink(page: Page, href: string): Promise<Locator> {
  const link = page.locator(`.sidebar a[href="${href}"]`);
  await expect(link, `the sidebar link ${href} exists for the journey`).toBeVisible();
  return link;
}

/* ═══ 1 — the OWNER console (the reported victim): load, internal
       navigation, and back/forward all replay + all reveal ═════════ */

test.describe('r353 route transition — the OWNER console', () => {
  test.use({ e2eRole: 'OWNER', viewport: { width: 1280, height: 800 } });

  test('first load: the strips open once and the dashboard is PIXEL-visible after the transition', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await settleDashboard(page);
    await assertNavigationTransition(page, 'OWNER first load');
    await expect(page).toHaveURL(/\/owner\/dashboard/);
  });

  test('internal navigation: the open leg REPLAYS and the activity page is PIXEL-visible', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await settleDashboard(page);
    // Baseline: the dashboard's open leg settles before we navigate.
    await waitForOpenLeg(page);
    await waitForStripsSettled(page);
    await assertStripsRetreated(page);

    await (await sidebarLink(page, '/owner/activity')).click();
    await expect(page).toHaveURL(/\/owner\/activity/);
    await assertNavigationTransition(page, 'OWNER internal nav → /owner/activity');
  });

  test('back navigation: the open leg REPLAYS on history back and the dashboard is PIXEL-visible', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await settleDashboard(page);
    await waitForOpenLeg(page);
    await waitForStripsSettled(page);

    await (await sidebarLink(page, '/owner/activity')).click();
    await expect(page).toHaveURL(/\/owner\/activity/);
    await waitForOpenLeg(page);
    await waitForStripsSettled(page);
    await assertStripsRetreated(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/owner\/dashboard/);
    await settleDashboard(page);
    await assertNavigationTransition(page, 'OWNER back → /owner/dashboard');
  });
});

/* ═══ 2 — breadth: the STUDENT surface rides the same law ══════════ */

test.describe('r353 route transition — the STUDENT surface', () => {
  test.use({ e2eRole: 'STUDENT', viewport: { width: 1280, height: 800 } });

  test('internal navigation from the dashboard to the schedule replays and reveals', async ({ page }) => {
    await page.goto('/student/dashboard');
    await settleDashboard(page);
    await waitForOpenLeg(page);
    await waitForStripsSettled(page);
    await assertStripsRetreated(page);

    await (await sidebarLink(page, '/student/schedule')).click();
    await expect(page).toHaveURL(/\/student\/schedule/);
    await assertNavigationTransition(page, 'STUDENT internal nav → /student/schedule');
  });
});

/* ═══ 3 — reduced motion: no strips, no animations, content
       immediately pixel-visible ═════════════════════════════════════ */

test.describe('r353 route transition — reduced motion', () => {
  test.use({ e2eRole: 'OWNER', reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });

  test('the strips never render and the dashboard is PIXEL-visible without any pt animation', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await settleDashboard(page);

    const strips = await readStrips(page);
    expect(strips.beforeDisplay, 'reduced motion: ::before strip is display:none').toBe('none');
    expect(strips.afterDisplay, 'reduced motion: ::after strip is display:none').toBe('none');
    const anims = await ptAnimations(page);
    expect(anims, 'reduced motion: zero pt-* animations ever run').toEqual([]);
    await expect(page.locator('main h1')).toBeVisible();
    await assertContentPainted(page, 'OWNER reduced-motion');
  });
});
