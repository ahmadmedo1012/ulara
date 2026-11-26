# Bands round 0 (intro, problems, map, platform), 1440, band-aligned

Sheet: round0-intro-to-platform.webp (reference left, ULARA right). Reference shots are stored corpus frames; ULARA captured by band selector. Slices 04, 05, 06, 07.

Slice 04/05 (intro + problems):
1. The reference intro band holds a tall hatched tower elevation with a large flat signal circle behind it, a giant paragraph in 4 to 5 tight lines, a partners strip below; ULARA shows a small plan sketch top-right and a thin statement block: art scale and density are far below.
2. Problems: the reference has four ruled columns with short bold headings (3 lines) and a very large single centered display line below on empty paper; ULARA has four columns but with small body text and an empty lower plane with a crosshair grid only. Scale of the display line and the heading weight must go up.
Slice 06 (map): the reference shows one giant centered display line per stage on bare paper; ULARA shows a boxed title plus a list at the start side: composition differs. Stage plans must fill the sticky viewport.
Slice 07 (platform): the reference puts a large thick-wall plan with red callout squares and a dark info card at the start side and an accordion ledger at the end; ULARA shows small isometric tile drawings: scale of art and the thick-wall plan are missing.
Use-case/CTA/footer bands (slices 08, 09): the reference gives HALF the band to flat shapes (a very large solid signal circle, a tall slab, a pale circle) over a brutalist cantilever scene, with the ruled roles list at the other half; ULARA has a wide photo with a small circle and a thin slab: shapes must be 3 to 5 times larger and the scene must be a calm cantilever composition. (Capture of these bands in this round returned one repeated position: the warm-up scroll fix in capture.mjs is untested; next round re-verifies.)
Status: all bands FAILING. Not nearly indistinguishable.

## Round 1 (sheet: round1-shapes-why-footer.webp)
Done: flat shapes now scale with the scene (container units): circle 26% of width, slab 13% by 78% height, pale circle 22%, phone variants larger. Shapes read at reference weight.
Still different:
1. Composition: in the reference the shapes sit on bare paper in the start half of the band and the building overlaps the slab (slab BEHIND the scene, scene cut out on paper, calm light concrete with a pale ground). ULARA lays opaque shapes OVER a dark, full-width photograph. Needs the scene cut out on paper and the layer order changed (slice 11 art: light cantilever scene with transparent ground).
2. Layout: reference splits the band half art / half ruled role list with the heading above the list; ULARA stacks heading, wide photo, then cards.
3. Tone: reference scene is high-key light grey; ULARA's is near black.
Status: FAILING, closer on shape scale only.

## Round 2 (sheet: round2-layering-why.webp)
Done: shapes now sit behind the scene (layer order as the reference) and the scene is high-key and multiplies over them; paper tone shows through.
Still different:
1. The scene is a full-frame photograph, not a cut-out: the shapes show through its detailed sky and facade as muddy blue instead of sitting on bare paper beside a clean building edge. Needs a real cut-out scene (transparent ground) or a regenerated vector/raster cantilever: art generation work (slice 11) that cannot be done with CSS filters.
2. Half-art/half-list layout not built (slice 08/09).
3. Thick-wall plan at reference scale (slices 05/07) not started.
Status: FAILING. 

## Round 3 (sheet: round3-cantilever-why.webp) — procedural cantilever
Done: original procedural SVG cantilever scene (scripts/art/cantilever.mjs, assets/art-v2/cantilever.svg), flat inks, transparent ground, lone figure; mounted in the why band (DuotoneScene `flat`); shapes at physical left seats on paper (circle bleeds the left edge, slab, pale circle). Grammar now matches the reference's collage: flat royal shapes on bare paper beside a light cantilever.
Still different:
1. The building is smaller and thinner than the reference's, which fills the full band height and overlaps the slab base; columns need the thick board-formed concrete texture and a second slab tier.
2. Reference band is half art / half ruled list under the heading; ULARA still stacks heading above the art, list elsewhere (slice 08/09 layout).
3. Footer strip still uses the old photo variant; roles band has no art reveal.
4. Typecheck passes.
Status: FAILING, much closer in construction.
