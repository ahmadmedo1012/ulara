# Feature Spec 10: Buttons, inputs, links, hover/press/focus states and custom cursor

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Filled buttons roll their label (top/bottom swap) and wipe a royal fill on hover; press nudges; focus shows a visible ring.
- Inputs and links follow the same hairline grammar.
- On fine pointers a small head point follows the pointer with easing and a 5x5 dot grows and ink-pulses over interactive elements.

## Measured facts (from the reference)
- Cursor: .cursor fixed, pointer-events none, display none on touch; .cursor-main 0x0 transform-driven; .cursor-inner 5x5 dot (opacity 0 at rest); lerp via shared ticker.
- Base tracking -0.02em; labels mono 10 to 14 px.

## States and motion
- default, hover, press, focus-visible, disabled, loading, error for buttons and inputs; cursor rest, hover-interactive, pulse; reduced motion disables the roll and lerp.

## Responsive and theme
- Cursor off on touch; buttons keep 44 px targets on phone.

## Content that may differ (the 1%)
Labels only.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Cursor trail?
  A: No trail; velocity feel comes from the lerp only (REFERENCE.md section 6).
