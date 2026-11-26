# Feature Spec 06: Solution blocks and journey/chapters

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A long sticky scene where plan stages scrub under a pinned viewport.
- Chapter text and plans change as the visitor scrolls.

## Measured facts (from the reference)
- Map 2458 to 9458 (about 7,000 px) under CSS sticky .home-map-inner (top 0, h 987); mobile about 4,800 px with .home-map-main-stick-inner.
- Zero GSAP pins; scrub via ScrollTrigger.

## States and motion
- Scrubbed stage changes; reduced motion shows stages as a static stacked sequence.

## Responsive and theme
- Phone shorter scene, different sticky container.

## Content that may differ (the 1%)
Chapter copy ULARA Arabic.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Number of stages?
  A: Counted from driven-scroll-states.json at each offset (recorded in research.md at implementation).
