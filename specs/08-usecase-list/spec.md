# Feature Spec 08: Use-case hover/tap list with image reveals

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A large ruled list of roles; hovering (or tapping) a row reveals a plan or scene image with title bars and dark info cards (checking / learned equivalents).

## Measured facts (from the reference)
- Use-case section 10867 to 11853 (987 px).
- Gallery is Swiper 11 style with image reveals; dark card is ink slab with paper mono text.

## States and motion
- Hover reveal on fine pointers, tap on touch, keyboard focus reveals too; reduced motion swaps without animation.

## Responsive and theme
- Phone: tap list with the active image inline under the row.

## Content that may differ (the 1%)
Role names and card text are ULARA Arabic copy.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Reveal transition timing?
  A: Measured from the hover frame sequence at implementation; corpus shot-usecase gives end state (recorded in research.md).
