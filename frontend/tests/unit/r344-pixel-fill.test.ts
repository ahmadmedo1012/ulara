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
  const sprite = "url('/brand/pixel-mask.svg')";
  const walk = /mask-position\s+var\(--t-slow\)\s+var\(--ease-pixel\)/;

  it('components.css: the .btn--pixel base + both arms, no transform slide', () => {
    expect(components).toContain('.btn--pixel::before');
    const base = components.slice(components.indexOf('.btn--pixel::before'));
    const block = base.slice(0, base.indexOf('}', base.indexOf('mask-position')));
    expect(block).toContain('-webkit-mask-image');
    expect(block).toContain(sprite);
    expect(block).toContain('mask-size: 2000% 100%');
    expect(block).toContain('transform: none');
    expect(block).toMatch(walk);
    // the pointer arm + the keyboard arm both walk to slice 19
    expect(components).toMatch(/\.btn--pixel:hover[^{]*\{[^}]*mask-position: 100% 50%/s);
    expect(components).toMatch(/\.btn--pixel:focus-visible[^{]*\{[^}]*mask-position: 100% 50%/s);
  });

  it('components.css: the RM belt still covers the variant (transition: none)', () => {
    expect(components).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.btn::before,/);
  });

  it('cta.css: the finale wash rides the dither, the dark T-12 arm keeps its color-leg-free structure', () => {
    expect(cta).toContain('.fo-cta .btn.accent.btn--pixel .fo-cta-rbtn');
    expect(cta).toMatch(/\.fo-cta \.btn\.accent\.btn--pixel \.fo-cta-rbtn \{[^}]*mask-image/s);
    expect(cta).toMatch(walk);
    // the recorded T-13 final pair is untouched above the dissolve block
    expect(cta).toMatch(
      /\.fo-cta \.btn\.accent:is\(:hover, :focus-within\) \.fo-cta-rbtn,\s*\n\.fo-cta \.btn\.accent\.probe-hover \.fo-cta-rbtn \{\s*\n  background: var\(--primary\);\s*\n  color: var\(--primary-fg\);/,
    );
    // dark arm: mask legs + the T-12 opacity leg, NO color leg
    const dark = cta.slice(cta.indexOf("html[data-theme='dark'] .fo-cta .btn.accent.btn--pixel"));
    const darkBlock = dark.slice(0, dark.indexOf('}'));
    expect(darkBlock).toContain('mask-position');
    expect(darkBlock).toContain('opacity 0.3s');
    expect(darkBlock).not.toMatch(/(^|\s)color\s+0\.3s/);
  });

  it('nav.css: the desktop cell base is pointer-ungated, focus parity exists, the #DB3A00 law stands', () => {
    const base = nav.slice(nav.indexOf('.fo-actions-cta::before'));
    const baseBlock = base.slice(0, base.indexOf('}', base.indexOf('mask-position')));
    expect(baseBlock).toContain(sprite);
    expect(baseBlock).toContain('transform: none');
    expect(baseBlock).toMatch(walk);
    expect(nav).toMatch(/\.fo-actions-cta:focus-visible::before \{[^}]*mask-position: 100% 50%/s);
    expect(nav).toMatch(/\.fo-actions-cta:hover::before \{[^}]*background: #DB3A00/s);
  });

  it('no pixel transition list smuggles a layout property (motion-gate §5)', () => {
    for (const [name, src] of [
      ['components.css', components],
      ['cta.css', cta],
      ['nav.css', nav],
    ] as const) {
      const lists = [...src.matchAll(/transition:\s*([^;]*mask-position[^;]*);/g)].map((m) => m[1]);
      expect(lists.length, name).toBeGreaterThan(0);
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
