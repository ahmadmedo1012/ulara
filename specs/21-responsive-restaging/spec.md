# Feature Spec 21: Phones, tablets and ultrawide re-staging

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Every band is re-composed at 390/360/320, 820 and 2560 rather than scaled; density stays in every viewport, no empty bands.

## Measured facts (from the reference)
- Mobile journey 10,613 px, map about 4,800 px, 26 ScrollTriggers, cursor off, hero keeps interactive image (REFERENCE.md section 9).

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
- Q: Phone measurements?
  A: Corpus mobile data: 390x844, journey 10,613 px, 26 triggers, html font-size about 9.92 px; 320 and 360 derived and logged.
