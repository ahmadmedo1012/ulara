# Critique 03 hero, round 0 (FAILING, visual test written first)

Sheet: docs/redesign/r368/evidence/03-hero/round0-1440.webp (reference left, ULARA right, 1440x1000, light, RTL, intro skipped).

1. Composition: the reference stage is one full-height field where the elevation floats on bare paper with no visible image edge; ULARA shows a rectangular photographic plate whose edge and grey ground read as a boxed picture. Fix: cut the elevation out on paper (alpha/ink-on-paper), no plate edge.
2. Scale of art: reference elevation fills about 60% of stage width and sits in the vertical centre with generous air; ULARA art is wider and lower, crowding the headline. Fix: re-scale and re-seat.
3. Type: reference headline is giant, tight (leading 1), bottom-left in a hairline cell, spanning about 50% width; ULARA headline is smaller with looser leading and a separate sentence cell. Fix: display scale per h2 (4.8rem/1 or larger) in the bottom band, sentence and CTA in a ruled cell beside it.
4. Chrome: the reference has no heavy top bar in the stage; ULARA's nav bar plus tool icons sits on top with visible hairline clutter. Slice 02 owns this.
5. Colour discipline: markers royal squares match the orange squares in role; ULARA's are too small and few. Fix: larger solid callout squares at the two measured positions.
6. Frame: reference plus marks sit at four stage corners; ULARA has them but fainter. Fix: darker hairline.
7. Cookie strip, right-edge tab: present in the reference at bottom-right and mid-right; slice 09 and 02.
Status: not nearly indistinguishable. Implementation pending.

## Round 1 (CSS pass, sheet: evidence/03-hero/round1-1440.webp)
Fixed: headline scale raised to 5vw (floor 36, cap 96); plate ground lifted so the boxed edge is far less visible; art capped at 88% width so it floats with side air; callout squares 9px to 14px.
Still different (not passing):
1. The art style: the reference is a flat, clean-line brutalist elevation with large calm tone fields and a few bold ink shapes; ULARA's plate is a dense photographic hatching with a visible ground strip and shadow band. This needs a regenerated flat-field elevation: slice 11.
2. The nav bar and tool icons above the stage add clutter the reference stage does not have: slice 02.
3. Bottom band: the reference headline sits left in a wide cell with sub-copy in a narrow cell beside it; ULARA has the same structure mirrored, sub cell wider than the reference's. Fine-tune after the art lands.
4. Reference stage is taller and emptier above the roof; ours is cropped by the nav. Re-seat after slice 02.
Status: FAILING, improved. Not "nearly indistinguishable".
