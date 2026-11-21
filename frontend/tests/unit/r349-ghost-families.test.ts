/**
 * R349 (Agent 02) — the ghost families stay RESTORED.
 *
 * The defect this pins: components.css shipped §TABLE, §LIST ROW, the
 * form-feedback banner and three utility rungs as comment shells since
 * the 1.0 squash — every rule body stripped by a pre-squash orphan
 * sweep while the TSX kept emitting the classes (live-measured:
 * .table-wrap computed overflow-x *visible*; /student/downloads' 397px
 * table clipped 122px past .content's overflow-x:clip at 320px,
 * unreachable; the teacher profile's keyword badges overhung .content
 * by 541px; 26 role=alert/status banners rendered as bare divs with no
 * signal at all).
 *
 * The empty shells even fooled the CSS-ratchet gate — there was no CSS
 * left to raise a stylelint error. This suite re-arms the contract
 * from the CONSUMER side: every family pinned below has live TSX
 * consumers, so if a future sweep deletes the rule bodies again, these
 * fail before another silent no-op round can ship.
 *
 * Pins (see the r349 wave-3/4/5/6 commit for the full anatomy):
 *   1. §TABLE — the wrap's scroll contract, the base anatomy (surface-2
 *      header band + hairline rows + hover tint, per admin.css §1's
 *      documented contract), the ≤640 tbl-stack labelled-card ladder,
 *      the sticky opt-in cap (≥641 only), the row-actions reveal, the
 *      pagination floor.
 *   2. §LIST ROW — the row flex + the body's 208px basis (the
 *      anti-crush floor) + the msg-body hover-only ellipsis clamp.
 *   3. Form feedback — .form-feedback.ok/.fail and .form-error on the
 *      -soft/-ink semantic washes; .exa-error-line carries danger ink.
 *   4. Utilities — .flex-wrap / .gap-1 / .gap-4 exist as rules.
 *   5. patterns.css §5 — .tpg-asg-side keeps the r169a cap (max-inline-
 *      size + wrap) so the restored wrapping .list-row can never
 *      re-overflow it at phone widths.
 *   6. The TSX consumer census stays above the measured floor — the
 *      families are load-bearing, not dead selectors a sweep may take.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const components = readFileSync(path.join(root, 'src/styles/components.css'), 'utf8');
const patterns = readFileSync(path.join(root, 'src/styles/patterns.css'), 'utf8');

/* Strip comments newline-preserving (the repo contract-test convention). */
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(components);
const pat = strip(patterns);

/**
 * Consumer census — count textual occurrences of a class name across the
 * TSX tree (src/pages + src/components). Originally `rg -o … | wc -l`,
 * but the CI ubuntu-24.04 test job has NO ripgrep on PATH (/bin/sh:
 * "rg: not found"), the execSync threw, and the catch floor (0) failed
 * all four census pins on main. Same counting semantics, zero external
 * binaries: recursive readdir + plain-string occurrence counting over
 * every *.tsx under both roots.
 */
const consumerCount = (needle: string): number => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : e.name.endsWith('.tsx') ? [p] : [];
    });
  const roots = ['src/pages', 'src/components'].map((d) => path.join(root, d));
  let count = 0;
  for (const dir of roots) {
    for (const file of walk(dir)) {
      count += readFileSync(file, 'utf8').split(needle).length - 1;
    }
  }
  return count;
};

describe('R349 · the ghost families stay restored (§TABLE)', () => {
  it('the wrap owns the scroll contract (overflow-x — the clip escape)', () => {
    expect(css).toMatch(/\.table-wrap\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('the base anatomy: surface-2 header band, hairline rows, hover tint', () => {
    // header band + hairline under it
    expect(css).toMatch(/\.table thead th\s*\{[^}]*background:\s*var\(--surface-2\)/);
    expect(css).toMatch(/\.table thead th\s*\{[^}]*border-block-end:\s*1px solid var\(--rule\)/);
    // body hairlines
    expect(css).toMatch(/\.table tbody td\s*\{[^}]*border-block-end:\s*1px solid var\(--rule\)/);
    // hover tint, pointer-guarded (the R313 D16 law: no zebra, hover only)
    expect(css).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.table tbody tr:hover\s*\{[^}]*background:\s*var\(--surface-2\)/,
    );
  });

  it('the ≤640 ladder: rung 1 turns opted-in tables into labelled cards', () => {
    expect(css).toMatch(/\.table\.tbl-stack thead\s*\{\s*display:\s*none/);
    expect(css).toMatch(/\.table\.tbl-stack tr\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    // the data-label ::before carries the column name on each field line
    expect(css).toMatch(/\.table\.tbl-stack td\[data-label\]::before\s*\{[^}]*content:\s*attr\(data-label\)/);
  });

  it('the sticky opt-in is capped ≥641 only (no phone nested-scroll trap)', () => {
    // the cap must live INSIDE a min-width: 641px media block
    const m = css.match(/@media \(min-width:\s*641px\)\s*\{[^@]*?\.table-wrap\.sticky\s*\{[^}]*max-block-size[^}]*\}\s*\}/s);
    expect(m).not.toBeNull();
    // …and the sticky thead itself is unconditional.
    expect(css).toMatch(/\.table-wrap\.sticky thead th\s*\{[^}]*position:\s*sticky/);
  });

  it('the row-actions reveal stays hover/focus-gated with a touch-persistent floor', () => {
    expect(css).toMatch(/\.table-row-actions\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.table-row-actions:focus-within/);
    expect(css).toMatch(/\.table tbody tr:hover \.table-row-actions/);
  });

  it('pagination keeps the 44px phone floor on its bare-button cluster', () => {
    expect(css).toMatch(/\.table-pagination-actions button\s*\{/);
    expect(css).toMatch(/@media \(max-width:\s*640px\)\s*\{[^@]*?\.table-pagination-actions button\s*\{[^}]*min-block-size:\s*44px/s);
  });
});

describe('R349 · the ghost families stay restored (§LIST ROW)', () => {
  it('the row is a wrapping flex with the 44px floor', () => {
    expect(css).toMatch(/\.list-row\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap[^}]*min-block-size:\s*44px/s);
  });

  it('the body claims a 208px basis before trailing clusters take theirs', () => {
    // literal px on purpose (the sheet scales rem — see the rule's own
    // comment); the basis is what folds a trailing cluster under.
    expect(css).toMatch(/\.list-row-body\s*\{[^}]*flex:\s*1 1 208px/s);
    // the documented clamp dependency survives: min-inline-size 0.
    expect(css).toMatch(/\.list-row-body\s*\{[^}]*min-inline-size:\s*0/s);
  });

  it('the msg-body one-line clamp stays hover-capable-pointers-only', () => {
    // inside the hover media block, never outside (a title tooltip
    // never opens on touch — phones keep the full text).
    expect(css).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{[^@]*?\.list-row-sub\.msg-body\s*\{[^}]*text-overflow:\s*ellipsis/s,
    );
  });

  it('the title/sub voices ride the family register', () => {
    expect(css).toMatch(/\.list-row-title\s*\{[^}]*font-weight:\s*var\(--fw-semibold\)/);
    expect(css).toMatch(/\.list-row-sub,\s*\n?\s*\.list-row-meta\s*\{[^}]*color:\s*var\(--text-muted\)/);
  });
});

describe('R349 · the ghost families stay restored (form feedback + utilities)', () => {
  it('the fail banner and .form-error share the danger wash; ok rides success', () => {
    expect(css).toMatch(/\.form-feedback\.fail,\s*\n?\s*\.form-error\s*\{[^}]*background:\s*var\(--danger-soft\)[^}]*color:\s*var\(--danger-ink\)/s);
    expect(css).toMatch(/\.form-feedback\.ok\s*\{[^}]*background:\s*var\(--success-soft\)[^}]*color:\s*var\(--success-ink\)/s);
  });

  it('the exam-author error line carries danger ink', () => {
    expect(css).toMatch(/\.exa-error-line\s*\{[^}]*color:\s*var\(--danger-ink\)/);
  });

  it('the revived utilities exist as rules (not silent no-ops)', () => {
    expect(css).toMatch(/\.flex-wrap\s*\{\s*flex-wrap:\s*wrap;\s*\}/);
    expect(css).toMatch(/\.gap-1\s*\{\s*gap:\s*var\(--sp-1\);\s*\}/);
    expect(css).toMatch(/\.gap-4\s*\{\s*gap:\s*var\(--sp-4\);\s*\}/);
  });

  it('patterns §5: .tpg-asg-side keeps the r169a cap under the wrapping row', () => {
    expect(pat).toMatch(/\.tpg-asg-side\s*\{[^}]*max-inline-size:\s*100%[^}]*flex-wrap:\s*wrap/s);
  });
});

describe('R349 · the families are load-bearing (consumer census)', () => {
  it('.table-wrap keeps its TSX consumers (the sweep can never call it dead)', () => {
    // measured at restoration: 15 page files render .table-wrap.
    expect(consumerCount('table-wrap')).toBeGreaterThanOrEqual(12);
  });

  it('.list-row keeps its TSX consumers', () => {
    // measured at restoration: 21 rows across 12 files.
    expect(consumerCount('list-row')).toBeGreaterThanOrEqual(15);
  });

  it('.form-feedback keeps its TSX consumers', () => {
    // measured at restoration: 26 banners across 10 files.
    expect(consumerCount('form-feedback')).toBeGreaterThanOrEqual(20);
  });

  it('.flex-wrap keeps its TSX consumers', () => {
    // measured at restoration: 25 uses.
    expect(consumerCount('flex-wrap')).toBeGreaterThanOrEqual(20);
  });
});
