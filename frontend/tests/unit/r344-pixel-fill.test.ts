/**
 * r344-pixel-fill.test.ts — the r344 A1/A2 signature contract (the
 * pixel-dissolve CTA fill), pinned statically so the wiring can't
 * drift silently:
 *
 *   (a) THE SPRITE — public/brand/pixel-mask.svg exists, is the
 *       generated 20-slice dither (800×40, 4px cells, provenance
 *       comment), and slice 0 is empty (rest = fill fully hidden) while
 *       the last slice is full (resolved = the slab seated).
 *
 *   (b) THE RUNG — tokens.css seats --ease-pixel: steps(19, end) as a
 *       named, documented rung (the motion-gate-allowlisted home).
 *
 *   (c) THE SEATS — exactly four: components.css (.btn--pixel ::before
 *       base + pointer hover arm + keyboard focus arm), cta.css (the
 *       finale rbtn wash + the dark T-12 structure preserved: no color
 *       leg added in dark), nav.css (the desktop cell base + focus
 *       parity + the recorded #DB3A00 light ground). Every seat walks
 *       mask-position with var(--ease-pixel) and rides
 *       /brand/pixel-mask.svg. No layout property ever appears in a
 *       pixel transition list (the motion-gate §5 law).
 *
 *   (d) THE MARKUP — the finale accent carries btn--pixel
 *       (landing-funnel's ONE-accent law element unchanged), the
 *       mobile-menu register CTA carries it, and no other element
 *       adopts the variant this round (the ratchet is conscious).
 *
 * Pure fs — no network, no DB, no fixtures.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FRONT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(FRONT, p), 'utf8');

describe('r344 A1 — the sprite', () => {
  const svg = read('public/brand/pixel-mask.svg');

  it('exists with the generated provenance and the 800×40 geometry', () => {
    expect(svg).toContain('scripts/art/pixel-mask.mjs');
    expect(svg).toContain('viewBox="0 0 800 40"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    // preserveAspectRatio="none" is LOAD-BEARING: without it the 20:1
    // intrinsic ratio letterboxes inside the 2000%-scaled mask box and
    // the position-100% window lands on EMPTY padding (measured on the
    // dev build — the dissolve never fired). The reference sprite
    // carries the same attribute.
    expect(svg).toContain('preserveAspectRatio="none"');
  });

  it('slice 0 is EMPTY (rest = fill hidden) and the last slice is FULL', () => {
    const rects = [...svg.matchAll(/<rect x="(\d+)"/g)].map((m) => Number(m[1]));
    expect(rects.length).toBeGreaterThan(900); // the dither's density
    expect(rects.filter((x) => x < 40)).toHaveLength(0); // slice 0: none
    const last = rects.filter((x) => x >= 760);
    expect(last.length).toBe(100); // 10×10 cells — the seated slab
  });
});

describe('r344 A1 — the rung', () => {
  it('tokens.css seats --ease-pixel as the documented steps rung', () => {
    const tokens = read('src/styles/tokens/tokens.css');
    expect(tokens).toMatch(/--ease-pixel:\s*steps\(19, end\);/);
    expect(tokens).toMatch(/r344 A1 — the pixel-dissolve rung/);
  });
});

describe('r344 A2 — the seats', () => {
  const components = read('src/styles/components.css');
  const cta = read('src/styles/landing/cta.css');
  const nav = read('src/styles/landing/nav.css');
  const patterns = read('src/styles/landing/patterns.css');
  const sprite = "url('/brand/pixel-mask.svg')";
  const walk = /mask-position\s+var\(--t-slow\)\s+var\(--ease-pixel\)/;

  it('patterns.css: the shared mask grammar exists ONCE for the three seats', () => {
    expect(patterns).toMatch(
      /\.btn--pixel::before,\s*\n\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-rbtn::after,\s*\n\.fo-actions-cta::before \{/,
    );
    const block = patterns.slice(patterns.indexOf('.btn--pixel::before,'));
    const seat = block.slice(0, block.indexOf('}'));
    expect(seat).toContain(sprite);
    expect(seat).toContain('mask-size: 2000% 100%');
    expect(seat).toContain('mask-mode: alpha');
    expect(seat).toContain('will-change');
    expect(seat).toContain('mask-position: 0% 50%');
    expect(patterns).toContain('preserveAspectRatio'); /* documented as load-bearing in the grammar comment */
    // ONE grammar occurrence across the landing family (the jscpd lesson)
    const occurrences = [
      components, cta, nav,
    ].filter((s) => s.includes("url('/brand/pixel-mask.svg')")).length;
    expect(occurrences).toBe(0);
  });

  it('components.css: the .btn--pixel base + both arms, no transform slide', () => {
    expect(components).toContain('.btn--pixel::before');
    const base = components.slice(components.indexOf('.btn--pixel::before'));
    const block = base.slice(0, base.indexOf('}', base.indexOf('mask-position')));
    expect(block).toContain('transform: none');
    expect(block).toMatch(walk);
    // the pointer arm + the keyboard arm both walk to slice 19
    expect(components).toMatch(/\.btn--pixel:hover[^{]*\{[^}]*mask-position: 100% 50%/s);
    expect(components).toMatch(/\.btn--pixel:focus-visible[^{]*\{[^}]*mask-position: 100% 50%/s);
  });

  it('components.css: the RM belt still covers the variant (transition: none)', () => {
    expect(components).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.btn::before,/);
  });

  it('cta.css: the finale rides the THREE-layer dissolve — rest slab kept, ink masked, children lifted', () => {
    // anatomy truth: the rbtn is the permanent slab — masking it would hide
    // the button (measured on the dev build). The rbtn goes transparent over
    // an isolated ::before rest slab; the ink dissolve is the ::after.
    expect(cta).toContain('.fo-cta .btn.accent.btn--pixel .fo-cta-rbtn {');
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-rbtn \{[^}]*position: relative;[^}]*isolation: isolate;[^}]*background: transparent;/s,
    );
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-rbtn::before \{[^}]*background: var\(--cta-resolve-bg\);[^}]*z-index: -1;/s,
    );
    const after = cta.slice(cta.indexOf('.fo-cta .btn.accent.btn--pixel .fo-cta-rbtn::after'));
    const afterBlock = after.slice(0, after.indexOf('}'));
    expect(afterBlock).toContain('background: var(--neutral-900)'); /* 2026: the dissolve slab is the INK tier — --primary is the royal rest, an invisible hover */
    expect(afterBlock).toMatch(walk);
    // the recorded T-13 final pair is untouched above the dissolve block
    /* 2026: the final pair re-points to the INK tier (neutral-900 +
       neutral-50) — --primary is the royal rest seat now, and a
       royal-rest → royal-hover swap would be invisible. */
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent:is\(:hover, :focus-within\) \.fo-cta-rbtn,\s*\n\.fo-cta \.btn\.accent\.probe-hover \.fo-cta-rbtn \{\s*\n  background: var\(--neutral-900\);\s*\n  color: var\(--neutral-50\);/,
    );
    // the children lift above the ink layer; hover/focus/probe arms walk it
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-rlabel,\s*\n\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-ricons \{\s*\n  z-index: 1;/,
    );
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent\.btn--pixel:is\(:hover, :focus-within\) \.fo-cta-rbtn::after,\s*\n\.fo-cta \.btn\.accent\.btn--pixel\.probe-hover \.fo-cta-rbtn::after \{\s*\n  -webkit-mask-position: 100% 50%;\s*\n  mask-position: 100% 50%;/,
    );
    // the masked layer's transition is PAINT-ONLY: no color leg anywhere near
    // the mask (the r339 T-12 frozen-flip latch concern is structurally void)
    const lists = [...afterBlock.matchAll(/transition:\s*([^;]*);/g)].map((m) => m[1]);
    for (const list of lists) {
      expect(list).not.toMatch(/(^|[\s,])color\s/);
    }
  });

  it('nav.css: the desktop cell base is pointer-ungated, focus parity exists, the accent-token law stands', () => {
    const base = nav.slice(nav.indexOf('.fo-actions-cta::before'));
    const baseBlock = base.slice(0, base.indexOf('}', base.indexOf('mask-position')));
    expect(baseBlock).toContain('transform: none');
    expect(baseBlock).toMatch(walk);
    expect(nav).toMatch(/\.fo-actions-cta:focus-visible::before \{[^}]*mask-position: 100% 50%/s);
    expect(nav).toMatch(/\.fo-actions-cta:hover::before \{[^}]*background: var\(--accent\)/s);
  });

  it('no pixel transition list smuggles a layout property (motion-gate §5)', () => {
    for (const [name, src] of [
      ['components.css', components],
      ['cta.css', cta],
      ['nav.css', nav],
      ['patterns.css', patterns],
    ] as const) {
      const lists = [...src.matchAll(/transition:\s*([^;]*mask-position[^;]*);/g)].map((m) => m[1]);
      if (lists.length === 0) continue;
      for (const list of lists) {
        expect(list, name).not.toMatch(
          /\b(width|height|inline-size|block-size|inset|margin|padding|gap|top|left|right|bottom)\b/,
        );
      }
    }
  });
});

describe('r344 A2 — the markup seats', () => {
  it('the finale accent + the mobile register CTA carry btn--pixel — nothing else', () => {
    const vision = read('src/components/landing/sections/Vision.tsx');
    expect(vision).toContain('className="btn accent lg btn--pixel"');
    const nav = read('src/components/landing/chrome/SheetNav.tsx');
    expect(nav).toContain('className="btn primary fo-mb-cta btn--pixel"');
    // the conscious ratchet: exactly two .btn--pixel class strings repo-wide
    const hits: string[] = [];
    for (const p of [
      'src/components/landing/sections/Vision.tsx',
      'src/components/landing/chrome/SheetNav.tsx',
      'src/components/landing/hero/Hero.tsx',
      'src/components/landing/sections/Product.tsx',
      'src/components/landing/sections/Roles.tsx',
      'src/components/landing/sections/Footer.tsx',
      'src/components/landing/sections/Statement.tsx',
      'src/components/landing/sections/Chapters.tsx',
      'src/components/landing/sections/Why.tsx',
      'src/components/landing/sections/Live.tsx',
    ]) {
      if (read(p).includes('btn--pixel')) hits.push(p);
    }
    expect(hits).toEqual([
      'src/components/landing/sections/Vision.tsx',
      'src/components/landing/chrome/SheetNav.tsx',
    ]);
  });
});
