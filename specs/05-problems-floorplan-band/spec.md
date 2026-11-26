# Feature Spec 05: Problems grid and floor-plan band

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A four-column ruled problems grid with a giant interstitial line.
- A floor-plan band: thick-wall plan drawings with dimension strings, room tags and royal callout squares.

## Measured facts (from the reference)
- Problem section 1716 to 2458 (743 px).
- Map section is a 7,000 px sticky scrub (see slice 06); plans use thick walls, dimension strings, tags, callout squares, dark info cards.

## States and motion
- Column reveals on scroll; hover on a column lifts the hairline to the signal colour; reduced motion static.

## Responsive and theme
- Phone: columns stack as a ruled list; plan band composed as a crop.

## Content that may differ (the 1%)
Problem statements are ULARA Arabic copy.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Column count on tablet?
  A: Two columns at 820, four at 1280 and above (derived from the reference grid at 1440 and 390; tablet measured from a 820 capture of the reference when reachable, otherwise interpolated and logged as such).
