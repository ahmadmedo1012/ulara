# Feature Spec 11: Art system gaps

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Hero elevations, thick-wall plans, flat royal shapes and photographic-feel scenes all look hand-inked with the same hatching, line weight and density as the reference.

## Measured facts (from the reference)
- Flat-shape kit and art v2 requirements in docs/redesign/r364/reference-map.md.
- Ink mask filter constants from REFERENCE.md section 5.

## States and motion
- Static art; drag-reveal layers share the ink filter.

## Responsive and theme
- Every plate has a portrait variant.

## Content that may differ (the 1%)
Subjects are ULARA university content (gate, lecture hall, library, lab, exam hall, podium).

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Raster or vector?
  A: Plans programmatic SVG; ink and duotone scenes WebP; mission section 0 allows raster.
