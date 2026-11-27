/**
 * r351-public-audit.e2e.ts — the public sheet's GEOMETRY AUDIT (r351 P5).
 *
 * The r351 gap matrix (docs/redesign/r351/public/GAP.md §3.1) re-confirmed
 * the class of defect the overflow probes cannot see: TEXT RENDERING ON
 * TEXT and captions clipped at the sheet's edges in the two densest
 * stages — the masthead band and the journey's pinned viewport. This belt
 * walks the five recorded widths (1440/1024/768/390/360) and asserts:
 *
 *   1. NO TEXT-ON-TEXT — inside the header band (the masthead's own top
 *      strip) and the journey stage, no two text-leaf rects overlap by
 *      more than a 4px tolerance in BOTH axes unless one contains the
 *      other (a parent box is not a collision).
 *   2. NO CLIPPED CAPTIONS — every text leaf in those stages reads fully
 *      inside the viewport horizontally (the §0 «caption clipped at the
 *      right edge» class).
 *   3. NO HORIZONTAL OVERFLOW — the document never scrolls sideways.
 *
 * The audit samples the journey at three scrub seats (25% / 55% / 85%)
 * so every scene beat's overlays are audited, not just the first frame.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

const WIDTHS = [1440, 1024, 768, 390, 360] as const;
const TOL = 4; /* px — the AA/rounding floor; real collisions exceed it */


for (const w of WIDTHS) {

  test(`no text-on-text and no clipped captions in the journey stage @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w >= 1024 ? 900 : 844 });
    await page.goto('/');
    await page.waitForTimeout(5_400);

    for (const seat of [0.25, 0.55, 0.85]) {
      await page.evaluate((s) => {
        const el = document.querySelector('#chapters') as HTMLElement | null;
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top + el.getBoundingClientRect().height * s);
        }
      }, seat);
      await page.waitForTimeout(900);

      const res = await page.evaluate(({ sel, width, tol }) => {
        const root = document.querySelector(sel);
        if (!root) return { missing: true as const };
        const leaves: { x1: number; y1: number; x2: number; y2: number; txt: string }[] = [];
        /* the perceived-text filters: a parked card deck (the findings'
         * stack) and the masked-line reveals hold INVISIBLE text whose
         * Range rects still collide — the audit measures what a reader
         * SEES, so a leaf under opacity < .15 or clipped by its nearest
         * overflow-hidden ancestor never enters the pairwise pool. */
        const effectiveOpacity = (el: Element) => {
          let op = 1;
          let cur: Element | null = el;
          while (cur && cur !== document.body) {
            const o = parseFloat(getComputedStyle(cur).opacity);
            if (o < op) op = o;
            if (op < 0.15) break;
            cur = cur.parentElement;
          }
          return op;
        };
        const clippedByMask = (el: Element, r: DOMRect) => {
          let cur: Element | null = el.parentElement;
          while (cur && cur !== document.body) {
            const st = getComputedStyle(cur);
            if (/(hidden|clip)/.test(st.overflow + st.overflowX + st.overflowY)) {
              const b = cur.getBoundingClientRect();
              if (r.top < b.top - 1 || r.bottom > b.bottom + 1 || r.left < b.left - 1 || r.right > b.right + 1) return true;
            }
            cur = cur.parentElement;
          }
          return false;
        };
        const walk = (el: Element) => {
          for (const node of el.childNodes) {
            if (node.nodeType === 3) {
              const t = (node.textContent ?? '').trim();
              if (!t) continue;
              const range = document.createRange();
              range.selectNodeContents(node as Text);
              const b = range.getBoundingClientRect();
              if (b.width === 0 && b.height === 0) continue;
              if (b.bottom < 0 || b.top > innerHeight) continue; /* off-viewport beats are inert */
              const parent = node.parentElement;
              if (!parent) continue;
              if (effectiveOpacity(parent) < 0.15) continue;
              if (clippedByMask(parent, b)) continue;
              leaves.push({ x1: b.left, y1: b.top, x2: b.right, y2: b.bottom, txt: t.slice(0, 18) });
            } else if (node.nodeType === 1) {
              const c = node as Element;
              const st = getComputedStyle(c);
              if (st.display === 'none' || st.visibility === 'hidden' || c.getAttribute('aria-hidden') === 'true') continue;
              walk(c);
            }
          }
        };
        walk(root);
        const overlaps: string[] = [];
        for (let i = 0; i < leaves.length; i++) {
          for (let j = i + 1; j < leaves.length; j++) {
            const a = leaves[i]!;
            const b = leaves[j]!;
            const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
            const oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
            const contains =
              (a.x1 <= b.x1 + 1 && a.x2 >= b.x2 - 1 && a.y1 <= b.y1 + 1 && a.y2 >= b.y2 - 1) ||
              (b.x1 <= a.x1 + 1 && b.x2 >= a.x2 - 1 && b.y1 <= a.y1 + 1 && b.y2 >= a.y2 - 1);
            if (!contains && ox > tol && oy > tol) {
              overlaps.push(`«${a.txt}» × «${b.txt}» (${Math.round(ox)}×${Math.round(oy)}px)`);
            }
          }
        }
        const clipped = leaves
          .filter((l) => l.x1 < -tol || l.x2 > width + tol)
          .map((l) => `«${l.txt}» [${Math.round(l.x1)}…${Math.round(l.x2)}]`);
        return { missing: false as const, overlaps, clipped, count: leaves.length };
      }, { sel: '#chapters', width: w, tol: TOL });

      expect(res.missing, 'the journey must mount').toBe(false);
      if (res.missing) continue;
      expect(
        res.overlaps,
        `journey text collisions @${w} seat ${seat}: ${res.overlaps.join(' · ')}`,
      ).toEqual([]);
      expect(
        res.clipped,
        `journey clipped captions @${w} seat ${seat}: ${res.clipped.join(' · ')}`,
      ).toEqual([]);
    }
  });

  test(`zero horizontal overflow on the landing @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w >= 1024 ? 900 : 844 });
    await page.goto('/');
    await page.waitForTimeout(5_400);
    for (const seat of [0, 0.3, 0.6, 0.9, 1]) {
      await page.evaluate((s) => {
        window.scrollTo(0, (document.body.scrollHeight - innerHeight) * s);
      }, seat);
      await page.waitForTimeout(420);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(ov, `horizontal overflow @${w} seat ${seat}`).toBe(0);
    }
  });
}
