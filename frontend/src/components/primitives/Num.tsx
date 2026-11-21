import type { ReactNode } from 'react';

/**
 * Num — r351 A2 (Q2): the ONE bidi-isolate helper for numbers and
 * their units/percent/codes.
 *
 * The measured defect: percent+plus ranges and unit-suffixed numbers
 * scrambled in RTL context («(80%+)» rendered with the % on the wrong
 * side; «مقدمة في الخوارزميات%100» chips). The fix is structural, not
 * per-site: every number-with-adjacent-symbol string renders inside a
 * dir="ltr" isolate, so the digit run + its unit keep the visual order
 * the author wrote, while the surrounding Arabic paragraph flows RTL
 * around the isolate.
 *
 * Usage: `<Num>80%+</Num>` · `<Num>100%</Num>` · `<Num>09:00–10:30</Num>`.
 * Plain digits alone never need it (the bidi algorithm already keeps
 * an isolated digit run intact); it exists for the mixed runs.
 */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}
