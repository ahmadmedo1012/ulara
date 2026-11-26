# Cross-slice analysis (r368, all 22 slices)

- Shared tokens: royal #2540D9 / dark #8AA0FF, ink #282828, hairline #b3b3af, mono label scale 10 to 14 px, tracking -0.02em. One token source (`shared/design-tokens.json`); outputs regenerated, never hand-merged.
- Shared primitives (additive only): button roll/fill (10), plus-mark frame (02), ruled grid and accordion (05, 09, 13), page template (12 to 20).
- Duplicated art risk: plan plates used by 05, 06, 08; duotone scene by 07, 09; hero elevation by 03, 12, 18. Single generator in `scripts/art/` (slice 11 owns inventory).
- Conflicts found: edge tab (02) vs cookie strip (09) share the right edge: tab stays on the right edge, cookie strip sits bottom-right above it with distinct z-order. Skip flag (01) must keep working for every hermetic capture. Page-length and bundle ceilings raised once, in slice 06, with reason.
- Gap flagged: no reference page exists for 12 to 20 (templates derived from the pricing-style page); the footer logo lens (09) is not in the corpus. Both are logged as honest limits, not hidden.
- Ordering: harness S00 first, then 11 (art), 03, 02, 01, then bands 04 to 09, states 10, pages 12 to 20, then 21 and 22 as whole-site loops.
