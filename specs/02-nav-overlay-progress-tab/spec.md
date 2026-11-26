# Feature Spec 02: Nav, overlay menu, scroll progress, right-edge tab

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A hairline top bar that never collides with content at any width, with the logo mark, a menu trigger and the primary call to action.
- The menu opens an overlay sheet with large display links on hairline rows and mono index numbers.
- A thin scroll-progress rule and a vertical right-edge tab (signal block plus label) stay fixed.
- Page changes use an inset clip transition: the main content closes inward then opens.

## Measured facts (from the reference)
- Page transition: inset 0 to 50% in about 0.6 s accelerating (power2.in), swap behind full inset, then 50 to 0% in about 0.7 s decelerating (power2.out); total about 1.3 s.
- Header structure in header.html; 1px frame with plus marks at four corners (bg-border).
- Right-edge tab is a vertical block in the signal colour.

## States and motion
- Menu open/close with staggered row reveal; link hover roll swap; focus ring visible.
- Progress rule scales with scroll of the wrapper.
- Reduced motion: no clip transition, instant route swap, progress still visible.

## Responsive and theme
- Nav collision-free from 320 to 2560; overlay becomes full sheet on phone.
- RTL mirrors bar order; the edge tab sits on the right edge in both directions (the reference's right edge is kept).

## Content that may differ (the 1%)
Link labels and the tab label are ULARA Arabic copy.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Where does the tab sit in RTL?
  A: Stay on the physical right edge as in the reference; only its label direction follows RTL.
- Q: Is the transition on every route?
  A: Yes, public routes (barba-style); measured sample curve in REFERENCE.md section 7.
