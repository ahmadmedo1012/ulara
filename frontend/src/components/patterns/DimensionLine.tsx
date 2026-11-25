/* DimensionLine — THE dimension line (P3 furniture kit, inventory d.3).
 *
 * The reference frames its plans with dimension CHAINS as SECTION
 * furniture — slash-tick dimension strings with mono numerals
 * (4980 / 2550 / 8990… framing the platform plan, shot-platform-1) —
 * while ULARA drew dimension lines only inside SVG art plates
 * (shared/art/grammar.ts dimH/dimV, the r363 inventory's «missing on
 * the public side» row). This component + the `.dim-line` block in
 * styles/patterns.css translate the ART construction to the DOM voice,
 * measured construction preserved:
 *
 *   · the measured rule — 1px, currentColor (default ink
 *     var(--rule-strong), the hairline family), seated on the box's
 *     block-end edge (horizontal run) / inline-start edge (vertical);
 *   · the 45° slash ticks at BOTH ends — the art voice's tick, a 1px
 *     bar rotated -45° and centered ON the rule line (tick length via
 *     --dim-line-tick, default 9px; the slash angle is physical — a
 *     drafting tick, decorative, identical in both directions);
 *   · the mono mid-label — var(--font-mono) var(--fs-mono-sm), muted
 *     ink (--text-muted), tabular numerals, riding above the rule
 *     (horizontal) / beside the rule on the reading side (vertical),
 *     exactly the art voice's label offset (4px);
 *   · pure furniture: pointer-events none, aria-hidden FORCED (the
 *     numerals are decorative measurement chrome), absolute seat like
 *     RegCross — the consumer owns the geometry.
 *
 * API
 *   <DimensionLine label="54.0" />           horizontal (the default)
 *   <DimensionLine label="2550" orientation="vertical" />
 *   className / data-* / …                   forwarded (seat classes)
 *
 * SEATING CONTRACT — seat the box so its block-end edge (h) / inline
 * -start edge (v) lies where the measurement reads, and give the box
 * headroom for the label (block-size on h, inline-size on v). Length
 * is the seat: the rule spans the box edge-to-edge; ticks hug both
 * ends via LOGICAL inset-inline anchors (the pair is symmetric, so
 * the seat mirrors correctly under RTL).
 *
 * OUT OF SCOPE (deliberate): the SVG art voices — grammar.ts dimH/dimV
 * draw inside SVG scenes in viewBox units at the art hairline weight
 * (0.75px); the DOM construction cannot migrate there (the inventory
 * keeps the art voice).
 */

import type { HTMLAttributes } from 'react';

type DimensionLineOrientation = 'horizontal' | 'vertical';

interface DimensionLineProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  orientation?: DimensionLineOrientation;
}

export function DimensionLine({ label, orientation = 'horizontal', className, ...rest }: DimensionLineProps) {
  const cls = ['dim-line', `dim-line--${orientation}`, className ?? ''].filter(Boolean).join(' ');
  /* aria-hidden is FORCED (after the spread): a dimension line is
   * measurement chrome — the label must never enter the a11y tree. */
  return (
    <span className={cls} {...rest} aria-hidden="true">
      <span className="dim-line-tick dim-line-tick-s" />
      <span className="dim-line-tick dim-line-tick-e" />
      <span className="dim-line-label" dir="ltr">{label}</span>
    </span>
  );
}
