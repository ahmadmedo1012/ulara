import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLYPHS, GLYPH_NAMES, Glyph } from '../../src/components/icons';

/**
 * r369 — the icon language is a CONTRACT, not a pile of SVGs.
 *
 * These pins exist because the failure they catch is invisible in a
 * screenshot: one glyph drifting off the 24 grid, a stray hard-coded
 * colour, a second stroke weight, an icon that ships a `<img>` and a
 * network request. All of those make a set read as assembled-from-
 * different-libraries rather than drawn as one language.
 */

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const SOURCE = read('src/components/icons/index.tsx');

describe('r369 §S1 — the icon set', () => {
  it('ships a real language, not a handful of glyphs (≥ 40 named icons)', () => {
    expect(GLYPH_NAMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(GLYPH_NAMES).size).toBe(GLYPH_NAMES.length);
  });

  it('every glyph draws something (no empty seat)', () => {
    for (const name of GLYPH_NAMES) {
      const g = GLYPHS[name]!;
      expect(g.stroke.length, name).toBeGreaterThan(0);
      for (const d of g.stroke) {
        expect(d.startsWith('M'), `${name}: path must start with a move`).toBe(true);
        expect(d, name).not.toMatch(/NaN|undefined/);
      }
    }
  });

  it('every glyph starts on the grid with the 2px safety margin', () => {
    /* Paths mix absolute moves with relative (`l`, `a`) deltas, so the
     * meaningful pin is the ANCHOR: each sub-path starts inside 1–23,
     * which is what keeps a 2px round cap from clipping at the viewBox
     * edge (the classic “the star is cut” bug). */
    for (const name of GLYPH_NAMES) {
      const g = GLYPHS[name]!;
      for (const d of [(g as { accent?: string }).accent ?? '', ...g.stroke].filter(Boolean)) {
        const anchor = d.match(/^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
        expect(anchor, `${name}: path must open with M x y`).toBeTruthy();
        const [, x, y] = anchor!;
        for (const n of [Number(x), Number(y)]) {
          expect(n, `${name}: anchor ${n} escapes the grid`).toBeGreaterThanOrEqual(1);
          expect(n, `${name}: anchor ${n} escapes the grid`).toBeLessThanOrEqual(23);
        }
      }
    }
  });

  it('stroke grammar is one: 2px, round caps and joins, no fill', () => {
    expect(SOURCE).toContain('strokeWidth="2"');
    expect(SOURCE).toContain('strokeLinecap="round"');
    expect(SOURCE).toContain('strokeLinejoin="round"');
    expect(SOURCE).toContain('fill="none"');
    expect(SOURCE).toContain('viewBox="0 0 24 24"');
  });

  it('colour comes from the text — no palette is baked into an icon', () => {
    expect(SOURCE).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(SOURCE).not.toMatch(/rgba?\(/);
    expect(SOURCE).toContain('stroke="currentColor"');
    expect(SOURCE).toContain('fill="currentColor"');
  });

  it('decorative by default and never a network request', () => {
    expect(SOURCE).toContain('aria-hidden="true"');
    expect(SOURCE).not.toMatch(/<image|xlinkHref|<use /);
    expect(SOURCE).not.toMatch(/https?:\/\//);
  });

  it('the renderer accepts a named glyph and tapers the accent by theme', () => {
    const el = Glyph({ name: 'star', size: 20 });
    expect(el.props.viewBox).toBe('0 0 24 24');
    expect(el.props['aria-hidden']).toBe('true');
    expect(el.props.width).toBe(20);
    const css = read('src/styles/icons.css');
    expect(css).toContain('.ui-glyph-accent');
    // the duotone accent is themed, not duplicated as a second colour
    expect(css).toMatch(/\[data-theme='dark'\] \.ui-glyph-accent/);
    // and every micro-motion stops for reduced motion
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});

describe('r369 §S1 — the landing speaks the language', () => {
  it('the public surface imports our set, not the stock library', () => {
    const landing = read('src/components/landing/r369/index.tsx');
    expect(landing).not.toContain("from 'lucide-react'");
    expect(landing).toContain("import { Glyph, type GlyphName } from '../../icons'");
  });

  it('one meaning per glyph on the landing (no double duty)', () => {
    /* The defect this pins: the same star used for the jar, the brand
     * mark, the stat, the streak and the ladder — placeholder energy.
     * Role glyphs must differ; the star appears only as the star. */
    const landing = read('src/components/landing/r369/index.tsx');
    for (const role of ['student', 'teacher', 'admin']) {
      expect(landing, `the ${role} role needs its own glyph`).toContain(`icon: '${role}'`);
    }
    expect(landing).toContain("icon: 'medal'");
    expect(landing).toContain("icon: 'certificate'");
    expect(landing).toContain("icon: 'trophy'");
    // the progress band is the chart, not a star
    expect(landing).toContain('icon="leaderboard"');
  });
});
