/* RulerStrip — THE ruler tick strip (P3 furniture kit, the B9 unification).
 *
 * The corpus shipped the tick-ruler motif as TWO private constructions
 * (the r363 patterns inventory, deviation B9): the hero stage's
 * `.bp-ruler-*` (4px strip, 1px tick / 6px pitch) and the preloader's
 * dashed tick rules — each sheet re-drawing the same repeating-gradient
 * by hand, with different inks and different retirement points. This
 * component + the `.ruler-strip` block in styles/patterns.css replace
 * the DOM voice with ONE drawing:
 *
 *   · an evenly-spaced tick strip: 1px ticks on a repeating gradient,
 *     pitch via --ruler-strip-pitch (default 6px — the hero's measured
 *     rhythm), strip thickness via --ruler-strip-thickness (default
 *     4px — the hero's measured rung);
 *   · LENGTH IS THE SEAT: the orientation modifier stretches the strip
 *     edge-to-edge of its positioning context (inset-inline: 0 on the
 *     horizontal run / inset-block: 0 on the vertical run) — the
 *     consumer owns the positioning context, the strip fills it. Tick
 *     COUNT is derived (length ÷ pitch) — never a prop;
 *   · pure furniture: pointer-events none, aria-hidden FORCED, no
 *     layout footprint beyond its seat (absolute).
 *
 * API
 *   <RulerStrip />                       default horizontal, rule ink
 *   orientation="horizontal|vertical"    the run axis (ticks grow
 *                                        along the run; the strip is
 *                                        --ruler-strip-thickness thick)
 *   tone="rule|ink|muted"                ink register — see MODIFIERS
 *   className / data-* / …               forwarded (seat classes,
 *                                        data-spec)
 *
 * MODIFIERS — the complete list (one documented register; matches
 * RegCross so the furniture kit reads as one family):
 *   default            ink var(--rule-strong) — the canonical hairline
 *   .ruler-strip--ink  ink var(--text)
 *   .ruler-strip--muted ink var(--text-muted)
 *   Re-inking per seat rides `color` on the seat class (the hero's
 *   .bp-ruler keeps its stage-scoped --hro-hair ink that way).
 *
 * SEATS (the migration contract, identical to RegCross's): a seat is
 * POSITION + local ink only. Hero.tsx renders four RulerStrip
 * components and keeps the .bp-ruler / .bp-ruler-t/b/s/e classes; the
 * drawing rules moved OUT of landing/hero.css into the shared block —
 * the seats never moved.
 *
 * OUT OF SCOPE (deliberate): the preloader's dashed tick rules
 * (pl-rulers) draw a two-ink dashed voice with its own retirement
 * contract; migrating that voice is P3 follow-up work, not part of
 * this kit's first cut.
 */

import type { HTMLAttributes } from 'react';

type RulerStripOrientation = 'horizontal' | 'vertical';
type RulerStripTone = 'rule' | 'ink' | 'muted';

const ORIENTATION_CLASSES: Record<RulerStripOrientation, string> = {
  horizontal: 'ruler-strip--horizontal',
  vertical: 'ruler-strip--vertical',
};

const TONE_CLASSES: Record<RulerStripTone, string> = {
  rule: '',
  ink: 'ruler-strip--ink',
  muted: 'ruler-strip--muted',
};

interface RulerStripProps extends HTMLAttributes<HTMLSpanElement> {
  orientation?: RulerStripOrientation;
  tone?: RulerStripTone;
}

export function RulerStrip({ orientation = 'horizontal', tone = 'rule', className, ...rest }: RulerStripProps) {
  const cls = ['ruler-strip', ORIENTATION_CLASSES[orientation], TONE_CLASSES[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  /* aria-hidden is FORCED (after the spread): a tick ruler is chrome
   * by definition — no call site may opt it into the tree. */
  return <span className={cls} {...rest} aria-hidden="true" />;
}
