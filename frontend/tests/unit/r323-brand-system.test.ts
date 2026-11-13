/**
 * r323-brand-system.test.ts — the R323 §A1 brand gates (the owner's
 * «ONE brand system» contract, enforced):
 *
 *   (a) NO copper/gold (#B57438 / #E9B44C) anywhere under frontend/src,
 *       frontend/public or frontend/index.html — except the frozen
 *       R323-PENDING allowlist below (live achievement tokens, a live
 *       PDF swatch, historical comments). frontend/public and
 *       index.html carry NO entry at all: the brand assets are clean.
 *
 *   (b) the StarMark/BrandMark import graph is FROZEN: exactly the nine
 *       documented importers (the future <Logo> call-sites), plus the
 *       one documented non-importing member (EdgeTab.tsx — its inline
 *       white star is a brand render site the integration pass swaps).
 *       Any new importer fails; any retirement fails until the frozen
 *       list shrinks with it (the ratchet must be conscious).
 *
 *   (c) the regenerated assets are the NEW system: favicon.svg +
 *       brand/*.svg contain no <linearGradient> and no copper hexes,
 *       carry the 32-grid U-vessel geometry (ONE ink stroke, round
 *       caps/joins, M/L/Q commands only) + the one sienna #C43E16
 *       cornerstone — and the static twins stay pinned to
 *       frontend/src/brand/mark.ts + lockups.ts (the same numbers
 *       scripts/r323/brand-assets.mjs re-states).
 *
 *   (d) the RN port is the SAME geometry: apps/mobile/src/brand/{mark,
 *       lockups,wordmark.generated}.ts are byte-identical twins of the
 *       web seats (the parity tokens:check verifies — pinned here so
 *       the unit belt fails louder + closer to the cause).
 *
 *   Plus the public contract the parallel work packages code against
 *   (frontend/src/brand — Logo variants/tones/animation), rendered for
 *   real in jsdom.
 *
 * Pure fs + jsdom — no network, no DB, no fixtures.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as React from 'react';
import { render } from '@testing-library/react';

import { Logo } from '../../src/brand';
import { LOCKUP } from '../../src/brand/lockups';
import {
  MARK_CORNERSTONE,
  MARK_GRID_POINTS,
  MARK_INK,
  MARK_VESSEL_PATH,
  MARK_VIEWBOX,
  markStrokePx,
} from '../../src/brand/mark';
import { WORDMARK_AR } from '../../src/brand/wordmark.generated';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = path.resolve(FRONTEND, '..');

const read = (p: string) => readFileSync(path.resolve(FRONTEND, p), 'utf8');
const exists = (p: string) => existsSync(path.resolve(FRONTEND, p));
const repoRead = (p: string) => readFileSync(path.resolve(REPO, p), 'utf8');

/* ════════════════════════════════════════════════════════════════════
 * the copper/gold scanner (gate a)
 * ════════════════════════════════════════════════════════════════════ */
const COPPER_RE = /#B57438|#E9B44C/i;
const TEXT_SUFFIXES = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.scss', '.html', '.htm',
  '.svg', '.json', '.webmanifest', '.md', '.txt', '.xml',
]);

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else if (TEXT_SUFFIXES.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

interface CopperHit {
  file: string; /* frontend/-relative, forward slashes */
  line: number;
  text: string;
}

function copperCensus(): CopperHit[] {
  const roots = [
    path.join(FRONTEND, 'src'),
    path.join(FRONTEND, 'public'),
    path.join(FRONTEND, 'index.html'),
  ];
  const hits: CopperHit[] = [];
  for (const r0 of roots) {
    const files = statSync(r0).isFile() ? [r0] : walkFiles(r0);
    for (const file of files) {
      const rel = path.relative(FRONTEND, file).split(path.sep).join('/');
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (COPPER_RE.test(line)) {
          hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
        }
      }
    }
  }
  return hits;
}

/** R323-PENDING — frozen at A1, each entry owned and retired at the
 * foreman's integration pass (see AUDIT.md §2). Paths are
 * frontend/-relative. `expectZero` entries are TOLERATED paths pinned
 * to zero hits today (documentary — any hex there must consciously
 * re-open the entry). */
const COPPER_ALLOWLIST: Readonly<Record<string, string>> = {
  /* live: the achievement-gold token kept its seat (light + print lock)
     — the A5 design-system pass owns the move, not the brand task.
     R326 M0.4: the light --gold VALUE moved to the generated shared
     half (below); tokens.css keeps the prefers-contrast print lock and
     the historical comments. */
  'src/styles/tokens/tokens.css':
    'R323-PENDING — prefers-contrast print lock --gold (tokens.css:1133) + historical comments (:79,:635); owner: A5 token pass',
  /* R326 M0.4 — the generated shared half: the light --gold achievement
     token landed here when the values moved out of tokens.css. It is
     byte-drift-gated (npm run tokens:check against
     shared/design-tokens.json) and can only move WITH the JSON. */
  'src/styles/tokens/tokens.generated.css':
    'R323-PENDING — generated --gold light (#B57438) from shared/design-tokens.json (R326 M0.4); byte-gated by tokens:check — moves only WITH the JSON',
  /* live: the parity-export mirror is value-pinned by
     scripts/verify-parity-export.mjs — it can only move WITH tokens.css. */
  'src/styles/unified-parity.css':
    'R323-PENDING — value-pinned parity mirror of --gold (unified-parity.css:476); moves with the tokens pass',
  /* live: the PDF annotation swatch «نحاسي» is a product FEATURE colour
     (user-facing ink picker), not brand — out of A1 scope. */
  'src/components/pdf/AnnotationsPanel.tsx':
    'R323-PENDING — live PDF annotation ink swatch «نحاسي» (AnnotationsPanel.tsx:50); product feature colour, not a logo',
  /* historical comments only — copy edits at integration. */
  'src/styles/components.css': 'R323-PENDING — historical comments only (:206,:208,:322)',
  'src/styles/base.css': 'R323-PENDING — historical comment only (:93)',
  'src/styles/polish.css': 'R323-PENDING — historical comment only (:294)',
  'src/pages/owner/OwnerContentPage.tsx': 'R323-PENDING — historical comment only (:59)',
  /* R323 integration: the r318 footer wordmark sheet (wordmark-art.generated.ts)
     and FooterArt.tsx are DELETED — the footer draws <Logo variant="wordmark">
     (the Plex 600 letterforms). No allowlist entry is needed. */
};

describe('R323 gate (a) — no copper/gold outside the frozen allowlist', () => {
  it('frontend/src + frontend/public + index.html are copper-clean except the R323-PENDING files', () => {
    const hits = copperCensus();
    const offenders = hits.filter((h) => !(h.file in COPPER_ALLOWLIST));
    expect(
      offenders,
      `copper/gold hexes outside the R323-PENDING allowlist:\n${offenders
        .map((h) => `${h.file}:${h.line}: ${h.text}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('every allowlist entry exists on disk and carries an R323-PENDING reason', () => {
    for (const [file, reason] of Object.entries(COPPER_ALLOWLIST)) {
      expect(exists(file), `allowlist entry missing on disk: ${file}`).toBe(true);
      expect(reason, file).toMatch(/^R323-PENDING —/);
    }
  });

  it('frontend/public and frontend/index.html carry NO allowlist entry (brand assets are clean)', () => {
    for (const file of Object.keys(COPPER_ALLOWLIST)) {
      expect(file.startsWith('src/'), `no public/index entries allowed: ${file}`).toBe(true);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
 * the frozen import graph (gate b)
 * ════════════════════════════════════════════════════════════════════ */
const IMPORT_RE = /from\s+'[^']*(StarMark|BrandMark)'/;
const FROZEN_BRAND_IMPORTERS = [
  // R323 integration COMPLETE: every call-site draws the new <Logo> —
  // StarMark.tsx / BrandMark.tsx are DELETED, so the only acceptable
  // import graph is the EMPTY set. Any re-import fails this gate.
] as const;
/** R323 integration: EdgeTab now draws <Logo variant="mark" tone="paper">
 * (no inline star, no primitive import) — the expected surplus is empty. */
const DOCUMENTED_NON_IMPORTERS: readonly string[] = [];
const EXPECTED_IMPORTERS = FROZEN_BRAND_IMPORTERS.filter(
  (f) => !DOCUMENTED_NON_IMPORTERS.includes(f),
);

function brandImporters(): string[] {
  const out: string[] = [];
  for (const file of walkFiles(path.join(FRONTEND, 'src'))) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (IMPORT_RE.test(readFileSync(file, 'utf8'))) {
      out.push(path.relative(FRONTEND, file).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

describe('R323 gate (b) — the StarMark/BrandMark import graph is frozen', () => {
  it('the real import graph equals the frozen list (empty — integration complete)', () => {
    const actual = brandImporters();
    expect(actual).toEqual([...EXPECTED_IMPORTERS].sort());
    for (const f of FROZEN_BRAND_IMPORTERS) {
      expect(exists(f), `frozen R323-PENDING file missing: ${f}`).toBe(true);
    }
  });

  it('EdgeTab keeps its documented inline-star status (no primitive import)', () => {
    const src = read('src/components/landing/chrome/EdgeTab.tsx');
    expect(IMPORT_RE.test(src)).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════
 * the regenerated assets (gate c) + geometry sync
 * ════════════════════════════════════════════════════════════════════ */
/* The vessel's cornerstone rect exactly as the static twins serialize
 * it (brand-assets.mjs markGroup). */
const cornerRect = (fill: string) =>
  `<rect x="${MARK_CORNERSTONE.x}" y="${MARK_CORNERSTONE.y}" width="${MARK_CORNERSTONE.size}" height="${MARK_CORNERSTONE.size}" fill="${fill}"/>`;

describe('R323 gate (c) — favicon + brand twins are the ULARA system', () => {
  const favicon = read('public/favicon.svg');
  const ularaMark = read('public/brand/ulara-mark.svg');

  it('favicon.svg + ulara-mark.svg carry no <linearGradient> and no copper hexes', () => {
    for (const [name, svg] of [
      ['public/favicon.svg', favicon],
      ['public/brand/ulara-mark.svg', ularaMark],
    ] as const) {
      expect(svg, name).not.toMatch(/<linearGradient/i);
      expect(svg, name).not.toMatch(COPPER_RE);
    }
  });

  it('favicon.svg: the 32-grid U-vessel, round caps/joins, the 2.25 favicon ratio, one sienna cornerstone', () => {
    expect(favicon).toContain(`viewBox="${MARK_VIEWBOX}"`);
    expect(favicon).toContain(MARK_VESSEL_PATH);
    expect(favicon).toContain('stroke-linecap="round"');
    expect(favicon).toContain('stroke-linejoin="round"');
    expect(favicon).toContain('stroke-width="2.25"');
    expect(favicon).toContain(cornerRect('#C43E16'));
    /* the vessel is ONE continuous stroke — never mitered */
    expect(favicon).not.toMatch(/stroke-linejoin="miter"/);
  });

  it('ulara-mark.svg: same geometry, round joins, the sienna cornerstone, twin of the shared canonical mark', () => {
    expect(ularaMark).toContain(`viewBox="${MARK_VIEWBOX}"`);
    expect(ularaMark).toContain(MARK_VESSEL_PATH);
    expect(ularaMark).toContain('stroke-linecap="round"');
    expect(ularaMark).toContain('stroke-linejoin="round"');
    expect(ularaMark).toContain('stroke-width="1.5"');
    expect(ularaMark).toContain(cornerRect('#C43E16'));
    expect(ularaMark).toContain('<title>أُلارا</title>');
    /* geometry parity with the SHARED canonical mark (the compact RN/
     * kit form scripts/brand/build-app-icons.mjs writes — same numbers,
     * different serialization: the vessel + the cornerstone must be
     * identically stated). */
    const shared = repoRead('shared/brand/mark.svg');
    expect(shared).toContain(MARK_VESSEL_PATH);
    expect(shared).toContain(cornerRect('#C43E16'));
  });

  it('every public/brand/*.svg is gradient-free and copper-free', () => {
    for (const file of walkFiles(path.join(FRONTEND, 'public', 'brand'))) {
      if (path.extname(file) !== '.svg') continue;
      const svg = readFileSync(file, 'utf8');
      const rel = path.relative(FRONTEND, file).split(path.sep).join('/');
      expect(svg, rel).not.toMatch(/<linearGradient/i);
      expect(svg, rel).not.toMatch(COPPER_RE);
      expect(svg, rel).not.toMatch(/#B57438|#E9B44C/i);
    }
  });

  it('the static lockup twin is pinned to the component composition (lockups.ts)', () => {
    const lockupSvg = read('public/brand/lockup.svg');
    expect(lockupSvg).toContain(`viewBox="0 0 ${LOCKUP.w} ${LOCKUP.h}"`);
    expect(lockupSvg).toContain(`translate(${LOCKUP.mark.x} 0)`);
    /* RTL: the mark sits to the RIGHT of the wordmark ink */
    expect(LOCKUP.mark.x).toBeGreaterThan(LOCKUP.ar.x);
  });

  it('mark.ts states the pinned geometry (the r323 generator twin was deleted in the wave-2 purge)', () => {
    const mark = read('src/brand/mark.ts');
    for (const fact of [
      `MARK_VESSEL_PATH = '${MARK_VESSEL_PATH}'`,
      `MARK_CORNERSTONE = { x: ${MARK_CORNERSTONE.x}, y: ${MARK_CORNERSTONE.y}, size: ${MARK_CORNERSTONE.size} }`,
      `MARK_INK = { x: ${MARK_INK.x}, y: ${MARK_INK.y}, w: ${MARK_INK.w}, h: ${MARK_INK.h} }`,
      `MARK_VIEWBOX = '${MARK_VIEWBOX}'`,
      `MARK_GRID_POINTS: readonly (readonly [number, number])[] = [`,
    ]) {
      expect(mark, `mark.ts missing ${fact}`).toContain(fact);
    }
    /* the grid anchors are exactly the construction's judged points */
    expect(MARK_GRID_POINTS).toHaveLength(9);
    expect(MARK_GRID_POINTS).toContainEqual([MARK_CORNERSTONE.x, MARK_CORNERSTONE.y]);
    expect(MARK_GRID_POINTS).toContainEqual([MARK_CORNERSTONE.x + MARK_CORNERSTONE.size, MARK_CORNERSTONE.y + MARK_CORNERSTONE.size]);
  });

  it('the generated wordmark is the ULARA sheet — أُلارا shaped WITH the damma', () => {
    const gen = read('src/brand/wordmark.generated.ts');
    expect(gen).toContain('scripts/r323/wordmark-build-r323.mjs');
    expect(gen).toContain('GENERATED FILE');
    /* the damma contract is documented at the seat (the damma-less
     * form is forbidden brand-wide) */
    expect(gen).toContain('(U+064F — mandatory)');
    expect(WORDMARK_AR.ink.h).toBe(100);
    expect(WORDMARK_AR.ink.w).toBeGreaterThan(0);
    /* a real shaped sheet, not a stub: the unioned outline data is
     * substantial and the sheet carries its own viewBox */
    expect(WORDMARK_AR.d.length).toBeGreaterThan(1000);
    expect(WORDMARK_AR.viewBox).toBe('0 0 94.99 112.00');
    /* the shaper (scripts/r323/wordmark-build-r323.mjs) was deleted in
     * the wave-2 purge; the damma contract stays pinned by the sheet
     * assertions above and the brand tests below. */
  });
});

/* ════════════════════════════════════════════════════════════════════
 * the RN port (gate d) — apps/mobile/src/brand is the SAME geometry
 * ═══════════════════════════════════════════════════════════════════ */
describe('R323 gate (d) — the RN port is the same geometry (byte-identical twins)', () => {
  it('apps/mobile/src/brand/mark.ts is the byte-identical twin of the web seat', () => {
    expect(repoRead('apps/mobile/src/brand/mark.ts')).toBe(read('src/brand/mark.ts'));
  });

  it('apps/mobile lockups + wordmark sheets are byte-identical twins', () => {
    expect(repoRead('apps/mobile/src/brand/lockups.ts')).toBe(read('src/brand/lockups.ts'));
    expect(repoRead('apps/mobile/src/brand/wordmark.generated.ts')).toBe(read('src/brand/wordmark.generated.ts'));
  });
});

/* ════════════════════════════════════════════════════════════════════
 * the public contract (the parallel packages code against this)
 * ════════════════════════════════════════════════════════════════════ */
describe('R323 contract — <Logo> (frontend/src/brand)', () => {
  it('default render: lockup, role=img, <title>أُلارا, data-logo, the vessel ROUND joins', () => {
    const { container } = render(React.createElement(Logo));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('data-logo')).toBe('lockup');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('أُلارا');
    expect(svg?.querySelector('title')?.textContent).toBe('أُلارا');
    /* the vessel is one continuous ROUND-joined stroke; the wordmark
     * sheet keeps its miter-joined drafting outline */
    expect(svg?.querySelector('[stroke-linejoin="round"]')).not.toBeNull();
    expect(svg?.querySelector('[stroke-linejoin="miter"]')).not.toBeNull();
    /* auto tone: the ink rides currentColor, the cornerstone rides var(--accent) */
    expect(svg?.querySelector('[fill="var(--accent)"]')).not.toBeNull();
    expect(svg?.innerHTML).not.toContain('#B57438');
  });

  it('tones: sienna/paper/ink swap BOTH slots to the literal colour', () => {
    const sienna = render(React.createElement(Logo, { tone: 'sienna' })).container;
    expect(sienna.querySelector('[fill="var(--accent)"]')).toBeNull();
    expect(sienna.querySelector('[fill="#C43E16"]')).not.toBeNull();
    expect(sienna.querySelector('[stroke="#C43E16"]')).not.toBeNull();

    const paper = render(React.createElement(Logo, { tone: 'paper' })).container;
    expect(paper.querySelector('[stroke="#F5F1E8"]')).not.toBeNull();
    expect(paper.querySelector('[fill="var(--accent)"]')).toBeNull();

    const ink = render(React.createElement(Logo, { tone: 'ink' })).container;
    expect(ink.querySelector('[stroke="#262019"]')).not.toBeNull();
  });

  it('variants: mark is square; wordmark scales from the ink metrics; stacked is vertical', () => {
    const mark = render(React.createElement(Logo, { variant: 'mark', size: 20 })).container;
    const markSvg = mark.querySelector('svg');
    expect(markSvg?.getAttribute('viewBox')).toBe('0 0 32 32');
    expect(markSvg?.getAttribute('width')).toBe('20');

    const word = render(React.createElement(Logo, { variant: 'wordmark', size: 30 })).container;
    const wordSvg = word.querySelector('svg');
    const expectedW = +((30 * WORDMARK_AR.ink.w) / WORDMARK_AR.ink.h).toFixed(2);
    expect(Number(wordSvg?.getAttribute('width'))).toBeCloseTo(expectedW, 2);
    expect(Number(wordSvg?.getAttribute('height'))).toBe(30);

    const stacked = render(React.createElement(Logo, { variant: 'stacked', size: 32 })).container;
    const stackedSvg = stacked.querySelector('svg');
    expect(Number(stackedSvg?.getAttribute('height'))).toBeGreaterThan(32);
  });

  it('animated: injects the keyframes + reduced-motion opt-out, cornerstone LAST (750ms)', () => {
    const still = render(React.createElement(Logo, { variant: 'mark' })).container;
    expect(still.querySelector('style')).toBeNull();

    const moving = render(React.createElement(Logo, { variant: 'mark', animated: true })).container;
    const style = moving.querySelector('style')?.textContent ?? '';
    expect(style).toContain('@keyframes');
    expect(style).toContain('prefers-reduced-motion');
    /* the cornerstone pops LAST: its inline style carries the 750ms
     * delay (the vessel draws at 0ms; the stone waits for it) */
    const stone = moving.querySelector('[fill="var(--accent)"]');
    expect(stone).not.toBeNull();
    const stoneStyle = stone?.getAttribute('style') ?? '';
    expect(stoneStyle).toContain('animation');
    expect(stoneStyle).toContain('750ms');
  });

  it('R324/X11 — the optical-size ramp tapers the hairline below 32px', () => {
    /* the ramp itself: 1.5 @32, favicon ratio @16, 0.9 floor */
    expect(markStrokePx(32)).toBe(1.5);
    expect(markStrokePx(88)).toBe(1.5); /* ≥32 unchanged */
    expect(markStrokePx(16)).toBe(1.125); /* = favicon 2.25 × 16/32 */
    expect(markStrokePx(26)).toBeCloseTo(1.359, 3);
    expect(markStrokePx(24)).toBeCloseTo(1.313, 3);
    expect(markStrokePx(22)).toBeCloseTo(1.266, 3);
    expect(markStrokePx(14)).toBeCloseTo(1.078, 3);
    expect(markStrokePx(12)).toBeCloseTo(1.031, 3);
    expect(markStrokePx(8)).toBeCloseTo(0.938, 3);
    expect(markStrokePx(6)).toBe(0.9); /* the sub-pixel floor (<6.4px) */

    /* rendered for real: the 12px EdgeTab seat carries the tapered
     * stroke, the 32px design seat stays 1.5 */
    const tiny = render(React.createElement(Logo, { variant: 'mark', size: 12 })).container;
    const tinyG = tiny.querySelector('g[stroke]');
    expect(Number(tinyG?.getAttribute('stroke-width'))).toBeCloseTo(1.031, 3);

    const design = render(React.createElement(Logo, { variant: 'mark', size: 32 })).container;
    const designG = design.querySelector('g[stroke]');
    expect(Number(designG?.getAttribute('stroke-width'))).toBe(1.5);
  });
});
