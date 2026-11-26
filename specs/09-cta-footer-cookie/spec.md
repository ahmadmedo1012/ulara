# Feature Spec 09: CTA, footer and cookie strip

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A CTA band: hairline grid, coordinate labels, giant centered heading, royal button.
- A footer with a duotone collage band above an accordion of roles, a corner-anchored large logo (about 357x355), an email form with success state, menu, info and copyright on hairline rules.
- A cookie strip bottom-right with LEARN MORE and ACCEPT (royal fill) / REJECT.

## Measured facts (from the reference)
- CTA 11853 to 12551 (698 px); footer 12551 to 13262 (711 px).
- Footer title uses the masked line reveals; the pointer lens on the logo was NOT EXTRACTED in the corpus (inside the obfuscated bundle).

## States and motion
- Accordion open/close; form idle, focus, success, error; cookie strip enter, accept, reject, persisted choice; hover roll swaps.

## Responsive and theme
- Phone: cookie strip becomes a bottom sheet; footer stacks; collage cropped.

## Content that may differ (the 1%)
All copy ULARA Arabic.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Footer logo lens behaviour?
  A: Not in corpus; resolved by a live pointer-recording pass (capture with mouse moves) at implementation; if unreachable, a subtle ink-pulse equivalent is used and logged as the one honest gap.
