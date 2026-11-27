/* RegCross — THE registration cross (P3/r363, the B1 unification).
 *
 * The drafting corpus shipped EIGHT cross constructions (10/11/13px,
 * three inks, font-glyph / CSS-bar / inline-SVG variants — the
 * r363 patterns inventory, deviation B1). This component + the
 * `.reg-cross` block in styles/patterns.css replace every DOM voice
 * with ONE drawing:
 *
 *   · 13px box (the canonical measured rung — the largest the
 *     corpus measured), 1px strokes, hairline ink var(--rule-strong)
 *     (the frame line's own ink — the reference stills read the
 *     marks and the frame at one darkness);
 *   · the centered crosshair form: two 1px bars crossing at the
 *     box center — the plus with the HOLLOW center (no glyph, no
 *     circle), per the reference stills (r350 shots: shot-top,
 *     shot-map-1, shot-footer);
 *   · NO text content anywhere — the bars are pseudo-element
 *     backgrounds, so the R321 §A6 innerText law holds by
 *     construction (stronger than the old content:'+' seats).
 *
 * API
 *   <RegCross />                 drawing only — the consumer seats it
 *                                (its own position classes stay in its
 *                                own sheet; positions never migrated)
 *   corner="tl|tr|bl|br"         the frame-corner register: physical
 *                                anchors (top/right/bottom/left — a
 *                                corner is a physical seat; the
 *                                auth-mark RTL note documents why
 *                                logical anchors drift) + translate
 *                                ±50% so the cross centers ON the
 *                                corner point, straddling the line
 *                                (the reference's own geometry)
 *   tone="rule|ink|muted"        ink register — see MODIFIERS
 *   className / data-* / …       forwarded (seat classes, data-spec)
 *
 * MODIFIERS — the complete list (one documented block; two only):
 *   .reg-cross--ink     ink var(--text)        solid-ink seats (the
 *                       journey window's measured solid mark colour)
 *   .reg-cross--muted   ink var(--text-muted)  in-composition light
 *                       seats (statement title box, footer wordmark,
 *                       preloader ruler crossings)
 *   Everything on a frame line or its corners (page frames, section
 *   frames, hero stage) takes the DEFAULT tone — the canonical
 *   hairline ink. Size has NO modifier class: the CSS custom
 *   property --reg-cross-size (default 13px) is the one re-seating
 *   mechanism, for the em-scaled seats that measure against their
 *   band's own type (jt-mark 0.75em).
 *
 * OUT OF SCOPE (deliberate): the SVG art-plate voices —
 * shared/art/grammar.ts regCross() and kernel/Iso.tsx RegMark() draw
 * inside SVG scenes in viewBox units at the art hairline weight
 * (0.75px); the DOM construction cannot migrate there (the r363
 * inventory P3-1 keeps the art voice).
 */

import type { HTMLAttributes } from 'react';

type RegCrossCorner = 'tl' | 'tr' | 'bl' | 'br';
type RegCrossTone = 'rule' | 'ink' | 'muted';

const CORNER_CLASSES: Record<RegCrossCorner, string> = {
  tl: 'reg-cross-tl',
  tr: 'reg-cross-tr',
  bl: 'reg-cross-bl',
  br: 'reg-cross-br',
};

const TONE_CLASSES: Record<RegCrossTone, string> = {
  rule: '',
  ink: 'reg-cross--ink',
  muted: 'reg-cross--muted',
};

interface RegCrossProps extends HTMLAttributes<HTMLSpanElement> {
  corner?: RegCrossCorner;
  tone?: RegCrossTone;
}

export function RegCross({ corner, tone = 'rule', className, ...rest }: RegCrossProps) {
  const cls = ['reg-cross', corner ? CORNER_CLASSES[corner] : '', TONE_CLASSES[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  /* aria-hidden is FORCED (after the spread): a registration mark is
   * chrome by definition — no call site may opt it into the tree. */
  return <span className={cls} {...rest} aria-hidden="true" />;
}
