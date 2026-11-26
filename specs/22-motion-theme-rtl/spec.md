# Feature Spec 22: Reduced motion, themes (light/dark) and RTL parity

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- With reduced motion every animated band shows a composed static sheet. Light and dark both hold the signal-colour roles (royal #2540D9 / dark #8AA0FF). RTL layouts mirror correctly while art, counters and coordinates stay unmirrored.

## Measured facts (from the reference)
- Palette in REFERENCE.md section 1; royal replaces the reference orange (owner ruling).

## States and motion
- Loading, empty and error states real on this page; reveals as the home; reduced motion static.

## Responsive and theme
- Composed stacked sections, no scaled desktop.
- RTL and light/dark parity checked 320 to 1920.

## Content that may differ (the 1%)
All copy ULARA Arabic.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Dark-theme paper colour?
  A: Ink paper from the existing dark tokens; only the signal colour is fixed to #8AA0FF (owner-ruled).
