# Feature Spec 07: Why-us (observe / advise / act / learn)

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A platform tab rail (Observe, Advise, Act, Learn) that sticks while the stages change beneath it, with a plan, a feature ledger of ruled rows, a chat widget and a [01] index.
- Then a duotone brutalist scene: flat signal circle, tall slab, pale circle and a lone human figure for scale.

## Measured facts (from the reference)
- Platform section 9458 to 10168; tab rail is CSS sticky .home-platform-content-inner (top 427, h 145); about 1,200 px scrub (9458 to 10655).
- Why section 10168 to 10867 (698 px).

## States and motion
- Active tab changes with scroll and on click; ledger row hover; reduced motion shows all four stages stacked.

## Responsive and theme
- Phone: the rail becomes a horizontal tab strip; scene crop keeps the circle, slab and figure.

## Content that may differ (the 1%)
Tab names, ledger rows and chat lines are ULARA Arabic copy.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Does the rail scrub or click?
  A: Both: sticky rail scrubbed by scroll, tabs also clickable (corpus platform shots 1 to 3).
