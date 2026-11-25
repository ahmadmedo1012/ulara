/**
 * R321 §A6 — the decor-innertext belt (STATIC half; the runtime half
 * lives in scripts/r321/sweep-r321.mjs, per route × viewport × theme).
 *
 * The class of bug: decorative glyphs ('+', '±', '·') rendered as REAL
 * TEXT inside aria-hidden spans. aria-hidden removes an element from
 * the ACCESSIBILITY TREE but NOT from innerText — so every sheet's
 * innerText carried runs like `+ | + | + | +` and screen-reader
 * copy-paste/text-search surfaces read the chrome as words.
 *
 * The contract (TIGHTENED by P3/r363, the B1 unification): the
 * REGISTRATION-CROSS families render through the ONE RegCross
 * primitive (components/patterns/RegCross.tsx + the .reg-cross block
 * in styles/patterns.css) — an EMPTY span whose crosshair is two 1px
 * CSS bars painted as pseudo-element BACKGROUNDS. No glyph text
 * exists anywhere in the drawing, so nothing can leak into innerText
 * by construction. The remaining sketch/wordmark families keep the
 * classic CSS ::before content:'+' seat (no DOM text either).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '../../src');

/** The registration-cross families — every one renders through the
 * RegCross primitive (the r363 B1 unification). */
const CROSS_FAMILIES = [
  'auth-mark',
  'nf-mark',
  'sheet-mark',
  'bp-plus',
  'bp-dmark',
  'sg-reg',
  'jt-mark',
  'st-draft-mark',
  'fo-giant-plus',
  'pl-rplus',
] as const;

/** The non-cross decorative families that keep the classic ::before
 * content:'+' glyph seat (still CSS-painted, never DOM text). */
const GLYPH_FAMILIES = [
  'inkm-sketch-mark',
  'fo-cta-sketch-mark',
  'fo-wordmark-reg',
] as const;

/** Every decorative-mark family the app ships (the §A6 sweep —
 * if you ADD a family, it joins this list; a NEW decorative text
 * glyph anywhere is a finding, not an allowlist row). */
const DECOR_FAMILIES: readonly string[] = [...CROSS_FAMILIES, ...GLYPH_FAMILIES, 'reg-cross'];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.tsx$/.test(name)) yield p;
  }
}

/** A span whose className contains a decor family AND carries text
 * children (regex: >glyph< inside the element). */
const textChild = (src: string): number => {
  let hits = 0;
  for (const fam of DECOR_FAMILIES) {
    const re = new RegExp(`class(?:Name)?="[^"]*\\b${fam}[^"]*"[^>]*>[^<{}]+<`, 'g');
    for (const m of src.matchAll(re)) {
      const inner = m[0].replace(/^[^>]*>/, '').replace(/<$/, '').trim();
      if (inner) hits += 1;
    }
  }
  return hits;
};

describe('R321 §A6 — decorative marks never carry DOM text (the innerText leak)', () => {
  it('every decorative mark family in the sources renders an EMPTY span', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      const n = textChild(src);
      if (n > 0) offenders.push(`${path.relative(SRC, file)}: ${n} text-bearing mark span(s)`);
    }
    expect(offenders, `decorative glyphs must be CSS-drawn, not text children:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the registration-cross families draw from the ONE RegCross primitive (bars, never glyphs)', () => {
    /* P3/r363 (B1) re-pin: the old per-family glyph rules
     * (`.fam::before { content: '+' }`) are RETIRED — the drawing is
     * the shared .reg-cross block: a 13px box, the hairline ink, two
     * 1px bars as pseudo-element backgrounds (content is EMPTY).
     * R332 split note kept: landing.css is now the per-section family
     * under styles/landing/ (the stub landing.css is rule-free). */
    const styles = [
      'patterns.css',
      'landing/chrome.css',
      'landing/hero.css',
      'landing/statement.css',
      'landing/journey.css',
      'landing/pains.css',
      'landing/roles.css',
      'landing/colleges.css',
      'landing/cta.css',
      'landing/why.css',
      'landing/footer.css',
      'landing/shared.css',
      'landing/platform.css',
      'landing/strata.css',
      'shell/sheet-frame.css',
    ]
      .map((f) => readFileSync(path.join(SRC, 'styles', f), 'utf8'))
      .join('\n');
    const patterns = readFileSync(path.join(SRC, 'styles', 'patterns.css'), 'utf8');
    // the ONE drawing: 13px canonical rung, hairline ink, two empty
    // pseudo-elements painted with currentColor.
    expect(patterns).toMatch(/\.reg-cross\s*\{[^}]*--reg-cross-size:\s*13px/);
    expect(patterns).toMatch(/\.reg-cross\s*\{[^}]*color:\s*var\(--rule-strong\)/);
    expect(patterns).toMatch(/\.reg-cross::before,\s*\.reg-cross::after\s*\{[^}]*content:\s*''/);
    expect(patterns).toMatch(/\.reg-cross::before,\s*\.reg-cross::after\s*\{[^}]*background:\s*currentColor/);
    // the bar strokes: 1px horizontal (::before) + 1px vertical (::after).
    expect(patterns).toMatch(/\.reg-cross::before\s*\{[^}]*block-size:\s*1px/);
    expect(patterns).toMatch(/\.reg-cross::after\s*\{[^}]*inline-size:\s*1px/);
    // no cross family paints a '+' glyph anymore — the family sheets
    // carry SEATS ONLY (position), the drawing lives once.
    for (const fam of CROSS_FAMILIES) {
      const re = new RegExp(`\\.${fam}::(?:before|after)\\s*\\{[^}]*content\\s*:\\s*['"]\\+['"]`);
      expect(re.test(styles), `.${fam} still paints a '+' glyph — draw it via .reg-cross`).toBe(false);
    }
  });

  it('the cross families render THROUGH the RegCross component (no hand-rolled mark spans)', () => {
    /* the import graph pins: each migrated call site must consume the
     * primitive (a family regressing to a raw span fails here — knip
     * guards the component's exports, this guards the seats). */
    const callSites: Array<[string, string]> = [
      ['components/layout/SheetFrame.tsx', 'sheet-mark'],
      ['components/layout/GuestSheetChrome.tsx', 'auth-mark'],
      ['components/error/ErrorSheetPage.tsx', 'nf-mark'],
      ['pages/AuthPage.tsx', 'auth-mark'],
      ['pages/NotFoundPage.tsx', 'nf-mark'],
      ['pages/LandingPage.tsx', 'corner="tl"'],
      ['components/patterns/Sheet.tsx', 'sg-reg'],
      ['components/landing/hero/Hero.tsx', 'bp-dmark'],
      ['components/landing/journey/IsoJourneyScene.tsx', 'jt-mark'],
      ['components/landing/sections/Statement.tsx', 'st-draft-mark'],
      ['components/landing/sections/Footer.tsx', 'fo-giant-plus'],
      ['components/landing/chrome/Preloader.tsx', 'pl-rplus'],
    ];
    for (const [file, marker] of callSites) {
      const src = readFileSync(path.join(SRC, file), 'utf8');
      expect(src).toContain('RegCross');
      expect(src).toContain(marker);
    }
  });

  it('the sketch/wordmark families keep their CSS ::before glyph (content only, never DOM text)', () => {
    const styles = [
      'patterns.css',
      'landing/footer.css',
      'landing/cta.css',
    ]
      .map((f) => readFileSync(path.join(SRC, 'styles', f), 'utf8'))
      .join('\n');
    for (const fam of GLYPH_FAMILIES) {
      const re = new RegExp(`\\.${fam}::(?:before|after)\\s*\\{[^}]*content\\s*:\\s*['"]\\+['"]`);
      expect(re.test(styles), `.${fam}::before { content: '+' } missing from the stylesheets`).toBe(true);
    }
  });
});
