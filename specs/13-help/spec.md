# Feature Spec 13: Help (FAQ)

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Same sheet grammar as the home: 1px frame with plus marks, giant tight display heading, ruled grid, mono labels, one dense royal-accented illustration.
- The FAQ is a ruled accordion with mono index numbers; opening a row eases its height and rotates a plus mark.

## Measured facts (from the reference)
- No dedicated page in the corpus: the model is the reference's page template (pricing-style page, shots/pricing-top) plus the site-wide grammar in reference-map.md. Recorded as derived, not measured.

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
- Q: Accordion exclusive or multi?
  A: Multi-open, as the reference footer accordion behaves (measured in footer-hover).
