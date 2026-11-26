# Feature Spec 03: Hero (stage art, type, ticker)

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A full-bleed stage (about 987 px tall at 1440) holding one huge dense ink elevation of the campus gate building inside a 1px frame.
- A crosshair (two 1px lines at 16% opacity) and an X/Y mono readout follow the pointer; a hint chip invites drag.
- Dragging sweeps a survey pass revealing royal callout markers with a mono code and label.
- A display headline (h2 scale), one sentence, and a filled call-to-action with roll swap and signal fill wipe; below, an infinite marquee and a ruler strip.

## Measured facts (from the reference)
- Hero top 7 to 993 px at 1440; img wrap top 60; inner top 87.
- Headline scale: h1 7.2rem/1, h2 4.8rem/1 (display, tight, uppercase-capable).
- Marker wash reaches about 0.75 opacity; two markers (item1/item2).
- Ink mask displacement filter constants: baseFrequency 0.045 0.055, octaves 4, seed 5, scale 100, blur 1.8, alpha slope 2.2 intercept -0.6.

## States and motion
- Pointer move: crosshair follows with lerp; drag: markers fade in; button hover: label roll top/bottom + fill wipe; press and focus states.
- Touch: no crosshair; drag still reveals; reduced motion: markers visible statically.

## Responsive and theme
- Phone keeps the interactive image, coords and hint; headings use the mobile scale; art composed for portrait.
- RTL: headline right aligned; the art is not mirrored (it is architecture).

## Content that may differ (the 1%)
Headline, sentence, marker codes and labels are ULARA Arabic copy about university exam and learning compliance.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: How is the marker revealed?
  A: Sub image layer through the drag mask with the shared displacement filter (REFERENCE.md section 5).
- Q: Marquee direction in RTL?
  A: Moves in the reading direction; speed from marquee-left.anim measured in main-strings/corpus.
