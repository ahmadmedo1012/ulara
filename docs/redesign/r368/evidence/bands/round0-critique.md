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

## Round 4 (sheet: round4-cantilever-arcade.webp)
Done: the cantilever is now one structure (columns stand between the slab underside and the ground line in one-point perspective, board-formed course lines); footer strip uses the same flat scene (cover crop, physical shape seats).
Still different: (1) the reference building is a solid concrete mass with texture and a pale distant horizon; ours is flat ink and a bit too dominant, hiding the slab; scale the scene to about 70% and let the slab rise behind its roof. (2) Half-art/half-list layout not built. (3) Thick-wall plan scale (05/07) not started.
Status: FAILING; typecheck passes.

## Platform band round 1 (slice 07, sheet: round1-platform-plans.webp)
Done: the platform band's central plates are now large thick-wall plans (exam hall, laboratory) filling the column at reference scale, instead of small isometric tiles.
Still different: (1) plans are cropped mid-wall (object-fit cover) and should show a whole room cluster with dimension strings along the foot and royal callout squares + a dark info card overlapping it, as the reference does; (2) the heading and ledger rows should be large and sit centre-right (reference h2 about 4.8rem/1 uppercase-weight), ours are small at the band foot; (3) the ledger rows with icon rings are missing here. Status: FAILING, closer in scale.

## Platform band round 2 (sheet: round2-platform-heading.webp)
Done: heading to h2 scale (4.8rem/1) like the reference; plans back to cover crop for scale (a contain crop made them small; the plan art already carries its own royal callouts).
Still different: the reference has ONE large plan filling a full-height cell with a dark info card and the ledger rows beside it; ULARA's grid still has two stacked plan cells. Next: merge the two cells into one tall plan cell and add the ledger rows with icon rings. Status: FAILING.

## Roles band round 1
Art now sits physically left, list right, as in the reference. Still wrong: scene sits low in the pane, the royal slab is too tall, the circle is cropped, the heading is cramped. Status: FAILING.

## Roles band round 2
Shapes shrunk (slab 38% tall, circles smaller), scene seated bottom. Slab/circle still not aligned to the scene geometry; list still lacks reference scale. Status: FAILING.

## Platform round 3
Plate column is now one tall cell. Still wrong: copy column order/scale, no ledger rows or chat-widget dark card, plan needs numbered markers. Status: FAILING.

## Platform round 4
Ledger rows added (four ruled lines with icon). Still wrong: row scale/position vs reference, copy column too small, dark chat card only on hover. Status: FAILING.

## Platform round 5
Ledger row scale raised. Dark card stays hover-only (spec-measured rest state); not yet visible at rest like the reference. Status: FAILING.

## Slices 05 and 06 round 1 (measured, not yet fixed)
05 problem: the reference is four ruled head-columns with tight sans headings, then one empty cream field carrying a single huge centred statement. Ours stacks a plan, a dense list and chrome inside the band, so the empty field and the single statement are missing. 06 map: the reference is the same single huge centred statement on blank ground; ours is a boxed headline over a grid with a side list. Both need the content moved out of the band and the statement scaled to about 6vw. Status: FAILING.

## Slice 06 map round 2
Statement plate box removed, 6vw bold centred line. Closer in scale. Still wrong: side list, caption box, grid and chrome crowd the band; the reference is bare ground; font is Arabic display vs the reference grotesk (language only). Status: FAILING.

## Slice 06 map round 3
Caption border removed (paper seat kept for contrast over art). Side list and grid chrome remain; they are content/structure, to be reduced with the nav slice. Status: FAILING.

## Slice 02 nav round 1
Nav structure already matches the measured reference tree (inset, 56px bar, mono items, CTA cell). Defect found: bar was transparent so content showed through. Now opaque (bg). Remaining: the in-band meta strip and plan still sit beside the nav in the first viewport (slice 04/05); hover fills and submenu not yet compared. Status: FAILING.

## Slice 01 preloader round 1
The headless sandbox has under 3 cores, so the intro gate skips the loader; capture needs hardwareConcurrency forced to 8 on a production build. Found: the 880px centred .pl-plate rule beat .pl-mark, so the 'small mark' rendered as a full elevation; the boot ledger crowded the field. Fixed: mark is small, boot ledger hidden at desktop, mark and headline seated physically left. Still wrong: progress rule is full-width where the reference is a short orange-to-royal line with % at its start; hairline and the small welcome line differ; timing not yet compared to preloader-timeline.json. Status: FAILING.

## Slice 01 preloader round 2
Progress rule now grows left to right with the % at its start (19% frame vs reference 18%: same geometry). Welcome card moved clear of the headline, bottom-right. Layout now matches structurally. Still wrong: Arabic headline is larger and heavier than the reference's small grotesk; the hairline with ticks under the mark is missing; timing against preloader-timeline.json not yet compared. Status: FAILING (closer).

## Slice 01 preloader round 3 (headline and timing)
Headline now 2.4rem/600 at desktop. Timing measured from preloader-timeline.json: reference reaches 100% at about 4.5s and the loader is gone at about 7.2s, but that run is network-bound (the percent stalls at 58-60% between 1.8s and 2.7s, then jumps). Ours holds a pinned 2.0s floor, 2.6s cap, about 3.3-4.0s total (r309 belt tests). Decision: do not lengthen the wait to imitate a network stall; keep the progress curve front-loaded then eased. Status: FAILING on headline face (Arabic display vs grotesk, language only) and on the missing tick hairline.

## Slice 12 about round 1 (inner-page template, compared to the only inner reference shot: the pricing top)
Defect: the inner page opened with a thin guest header (logo + back link); the reference's inner pages carry the same full bar as the home page. Fix: SheetNav mounted on About; the old header stays in the DOM visually hidden (back link, tests, focus-reveal). Anchors on the bar now resolve to the landing off-home. Still wrong: reference page title is a centred 2-line grotesk in a framed cell with ruled columns; ours is a start-aligned title over a stack of boxed notes. Other inner pages (13-20) still use the old header. Status: FAILING.

## Slices 13-18 round 1 (inner pages: help, legal, app, campus, capabilities, plus about)
The full nav bar now leads help, legal, app download, campus and capabilities, as on About; old header kept hidden in the DOM (focus-reveal). 186 unit tests across routes, legal, guest, funnel and sheet pass. Eyebrow clipped under the bar in the first capture; main top padding raised to 96px. Colleges pages (17) and auth (19) and error/maintenance (20) not changed. Still wrong everywhere: titles start-aligned instead of centred in a framed cell, boxed note stacks instead of ruled cells, no ruled column frame. Status: FAILING.

## Slices 12-18 round 2
Inner-page titles centred in a ruled cell at desktop (guest pages only: scoped to pages with the full bar). Closer to the reference opening. Still wrong: no vertical column rules framing the title cell, no ruled pricing-style grid below, the hero image block and boxed notes are not reference structure, title face is Arabic display. Merged origin/main (47 commits, clean, no conflicts, no baselines touched). Colleges (17), auth (19), error/maintenance (20) not yet touched. Status: FAILING.

## Slices 17 and 20 round 1 (colleges, error)
Full bar now leads the colleges registry (portalled, guest only) and the not-found page. The type census gate (r324-type-gate) failed on my first title size override; the override is dropped (title already rides the d2 rung), gate passes 127. Auth (19) is a task form with no reference counterpart in the corpus; left as is, with its own thin header. Still wrong: colleges plan block and boxed notes, 404 headline stacks to three lines; no ruled column frame. Status: FAILING.

## Slice 21 responsive round 0 (390x844 vs the mobile corpus shots)
Fold: the reference shows a small elevation in a quiet cream field, then a tight grotesk headline and body; ours opens with a full-width photographic plate that fills the fold, headline pushed below. Platform: the reference stacks a large headline then four icon rows; ours stacks small ruled rows with tiny type. Use cases: reference has the art first and a dark card; ours leads with the list and a plan. All three are structural and unchanged so far. Status: FAILING, not started beyond measurement.

## Slice 21 mobile fold round 1
Art box narrowed to 62% at phone widths; headline now rides inside the fold. Still wrong: the mounted phone art is a cropped photographic facade, not the reference's small flat elevation in a quiet field; the drag hint overlaps the art. Status: FAILING (closer).

## Slice 22 dark theme round 0
Harness fix: capture.mjs now sets the real theme store key so dark captures are truly dark (earlier dark captures were light). Findings: dark tokens hold (royal becomes the light periwinkle, paper becomes ink); hero elevation is almost invisible in dark (very low contrast, dim hatching), roles scene and slab read fine. Status: FAILING on the hero art contrast. Full unit suite: 2964 of 2966 passed; the 2 failures were the type gate, fixed (127 pass) after the run started.

## Slice 22 dark round 1
Dark hero elevation inverted and screened: now reads as pale blueprint ink on dark paper, legible. A faint lighter patch edge remains at the plate boundary. Phone: the drag hint no longer overlaps the art (display none at <=767). Status: FAILING overall; hero art is still the raster drawing, not the reference's flat elevation.

## Slice 03 hero round 2
The desktop hero art is now an original procedural flat elevation (scripts/art/elevation-flat.mjs): concrete frame, glazed bays, roof slab, podium, steps, two line trees, a cast-shadow wedge. Flat architectural style, as in the reference, instead of dense photographic hatching. Still wrong: our massing is symmetric and thin; the reference stacks a deep solid concrete base under recessed glass with strong shadow tone and bare branching trees. Mobile still uses the raster. Two tests re-pinned to the new asset seat (reference wins over the old raster pin). Status: FAILING (closer).

## Slice 03 hero round 3
Rebuilt the procedural elevation: two slender outer fins, two heavy piers under a deep roof slab, a recessed two-storey glazed core with reflections, a textured solid podium, a long cast-shadow wedge, side steps, and recursive bare branching trees (the earlier leaf scribbles read as dandelions). Reads as the same family of drawing as the reference, flat and architectural. Still wrong: the reference is more intricate (ribbed concrete, stepped terrace blocks, third volume at the back, denser shadow tone), ours is cleaner and lighter; mobile still uses the raster. Status: FAILING (closer).

## Slice 03 mobile round 1
Whole building now shows at phone width (the crop cut it before). Still wrong: art is small in a tall empty frame, the three station markers float off the drawing (seated on the old raster), no cookie bar or sticky tag as in the reference. Status: FAILING.

## Slice 21 footer round 1
Added a centred ruled closing band (headline, one line, one button, corner coords) at the top of the footer, the reference's closing grammar. Still wrong: no use-case accordion beside a large art plate, the link index, early-access form and giant wordmark remain below, the band is not sized to the reference. Status: FAILING.

## Slice 21 footer round 2
Added the use-case accordion (art plate left, ruled native-details list right) above the closing band: the reference closing section's structure now exists. Still wrong: art plate is the existing cantilever scene, not a reference-like flat massing with sun disc; type scale and spacing not measured. Status: FAILING.

## Slice 06/07 platform phone round
Dropped the plan chrome chips on phone (they overlapped the row copy). Still wrong: the plan thumbnail is tiny and the 2nd row's CTA label is clipped by it, rows are fixed-height grids stacked by explicit row numbers, the reference is a plain list of icon rows (a rebuild, not a patch). Status: FAILING.

## Slice 06/07 platform phone round 2
Rebuilt the phone band as an auto-height stack: title, paragraph, four ruled capability rows (ledger), no thumbnail, no CTA strip, no overlap. Still wrong: row icons are empty squares not line icons, no hero-sized title, copy column padding unmeasured. Status: FAILING (much closer).

## Phone roles round 2
Art plate now tall (4/3, collage fills it). Still wrong: title column overlap, plate is not the reference flat massing with a sun disc. Status: FAILING.

## Dark/RTL loop 1
Phone roles title clip was a scroll-under-header capture artifact. Dark desktop hero: layout, nav and consent strip hold in RTL, but the art is still the old wireframe elevation, not the flat massing twin. Status: FAILING.

## Dark hero art
Checked: dark uses the same flat elevation SVG, inverted and screened (hero.css slice 22), so massing reads as pale tone on dark paper. No dark reference shot exists in the corpus, so a native dark palette is unmeasurable. Left as is. Status: FAILING (unverified vs reference).

## RTL footer and platform loop 1 (1440)
Footer: accordion left plate, right list, closing band hold in RTL; the left corner coordinate label is clipped by the side tab. Platform: ledger and title columns mirror correctly; a blank white panel sits over the isometric art in the capture (likely a lazy panel not yet painted, unverified); the art is the isometric campus, not the reference flat plate. Status: FAILING.
