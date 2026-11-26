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

## Platform blank panel check
The white panel is stable across two captures, so it is not a one-off paint. A DOM probe could not find a #platform element in a fresh page, so the cause is unlocated. Open defect, not fixed. Footer corner label clip also not fixed. Status: FAILING.

## Platform blank panel resolved
The white box is .map-panel mid-unfold (header and rows reveal only after the clip stands full), a transient animation frame at the capture scroll, not a defect. Footer corner label moved clear of the side tab (left 36px). Status: FAILING overall.

## Inner pages: nav CTA slab
/colleges header CTA painted a solid royal block because the pixel-mask rule lived only in the landing page stylesheet. SheetNav now imports it; re-captured, CTA reads as small text like home. Still wrong: no ruled column frame on inner pages, plan block boxed notes. Status: FAILING.

## Inner pages: column rules
Added two hairline full-height column rules at 20.3% and 79.7% to the guest frame (>=992px), matching the reference pricing shot. Only one inner shot exists in the corpus, and ULARA has no pricing route (404), so the table grammar cannot be compared. Still wrong: plan block boxed, no ruled tables. Status: FAILING.

## Colleges plan block
The plan plate is a thick-wall SVG asset (PlanPlate, r364). The corpus has no plan-drawing shot to measure line weight against, so changing it would be a guess. Left unchanged; flagged as unmeasured, not as matching. Status: FAILING.

## Auth and slice 05 audit
Auth (/login): sheet chrome plus my column rules line up with the frame; it carries drafting captions (TEXT / 48PX) the reference has no analogue for, and the corpus has no auth shot, so left. /auth/login is a 404 (login lives at /login). Slice 05: reference reads four ruled cards on top then a big empty field with one centred statement; ours puts a heading and aside above the cards and the statement elsewhere. Order and field not yet matched. Status: FAILING.

## Slice 05 round 2
Desktop: the four ruled cards now ride above the head (CSS order, DOM untouched) and the head becomes a centred statement field, as in the reference. Still wrong: statement is a small heading in a mostly empty field rather than the reference one large line; card titles smaller than the reference; phone unchanged. Status: FAILING.

## Slice 05 round 3
Statement scaled to clamp(3.6rem,5.4vw,7.6rem), centred, two lines; kicker centred. Closer to the reference one-line statement but still two lines with a sub paragraph the reference lacks. Status: FAILING.

## Slice 06 round 4 (scroll sweep at 2600/3400/4200/5200)
Four offsets captured and opened. The reference shows only one huge centred statement on bare ground per stage. Ours keeps a persistent left column (title, ledger, plan thumbnail) and the isometric art sits on top of the statement at about 4200 (text and art collide), and at 3400 the statement is ghosted behind the art. Needs the left column and thumbnail removed from the stage and the art moved off the statement line; not done this round. Status: FAILING.

## Slice 06 round 5
Added a paper-coloured text outline to the statement plaques so type crossing the iso art stays legible (desktop). This is legibility, not separation: true separation needs the scroll driver to exit the art during the statement, a choreography change to a timing-belt-pinned driver. After the slice 05 reorder the sweep offsets moved, and the new statement window was not re-hit in this round, so the outline is unverified by capture. Status: FAILING.

## Slice 06 round 6 (re-sweep)
Re-swept 4800 to 5400 in steps. The scroll harness jumps from the slice 05 band straight to the assembled iso stage, so the statement window (plaque 1 at stage start, plaque 2 mid-scrub) was not caught in any frame; the outline stays unverified by capture. The assembled stage at 5000+ is clear of statements. Needs a driven-scroll capture (smooth wheel steps) to hit the plaque windows. Status: FAILING.

## Slice 06 round 7 (wheel-step capture, scripts/fidelity/wheel.mjs)
Real wheel steps hit the statement windows. Defect found and fixed: the dominant plan thumbnail sat above the plaques and cut the end of the line ("...واحد"). It now sits below the stack and the statement reads whole, wrapped to two balanced lines. The earlier paper-outline attempt was dropped (the plate already carries a text-shadow rim). Still wrong: the left column and plan thumbnail remain on the stage; the reference stage is bare ground; the art still crosses the second statement. Status: FAILING.

## Slice 06 round 8 (statement 2 vs art)
Statement 2 (t 1.6 to 2.35) rides while the first isometric fragments fly in and cross it. That timing is the driver choreography (writeFade 1.6/2.0/2.15/2.35 against the layer windows), tuned and pinned by the timing belt tests; changing it means re-timing the fragment windows, not CSS. Not changed this round. The reference shows one line on bare ground, so this remains a visible difference. Status: FAILING.

## Slices 07 and 08 loop (1440, wheel harness)
07: the band selector #why does not exist in ours; the platform/journey stage sits where the reference shows its two plan plates and the red-accent annotation cards on bare ground. Ours keeps the left title column, ledger and a 3-plate stack, so composition differs (reference: two floating plates, one dark card, no side column). 08: the plan strip (three title-barred plates plus a dark checking card) is close in grammar to the reference use-case plates; the difference is that ours also stacks the duotone scene and a role list above it, where the reference has plates only and the list hover-reveals them. Not changed this round. Status: FAILING.

## Slice 09 footer uses stage (1440)
Fixed: royal circle and tall royal slab now sit behind the cantilever (multiply), matching the reference stage. Remaining: pale disc, different ground tint, cookie strip is blue-on-white vs reference. Status: FAILING.

## Slices 10/11
11: pale disc added to the footer art stage (hand-built kit shape under royal shapes). 10: cursor still spec-verified only, no reference to measure. Status: FAILING.

## Slices 12-14 (about/help/contact vs the reference pricing-top template, 1440)
The grammar already matches: column rules (added earlier), centred giant heading, mono labels, one royal-accented plate. Remaining differences: the reference header sits in a tall ruled cell with a full-width rule under it (ours has a short rule), no ruled tables, and the reference has no dedicated page to measure. No code change this round because remaining gaps are unmeasurable. Status: FAILING.

## Slices 15-18 (app, legal/terms route, colleges, 404 at 1440)
Same sheet grammar holds on every page (column rules, giant heading, one royal plate). /terms is not a real route (404 shows). Gaps: no ruled pricing-style cells on app cards, legal lacks a sticky mono TOC at this capture, no reference to measure. No code change this round. Status: FAILING.

## Slices 19-22 (820/2560 restage check)
Fixed: at 768-991 the hero elevation overflowed and cropped the house; now sized by width, whole elevation visible (evidence slice21-hero-820.png). 2560: elevation centred with air, holds. Slice 19 auth, 20 error pages, 22 motion/theme/RTL: no new fixes, no reference. Status: FAILING.

## Cross-slice analyze (6:02 PM)
origin/main already merged (up to date), tsc clean, zero-trace PASS, targeted suites pass; the full suite exceeded the 115s cap so the last full baseline (2964/2966) stands unrefreshed. Verdict per slice: all 22 FAILING (not indistinguishable). Closest: 03 hero (desktop), 09/11 footer stage, 12-14 page template. Furthest: 05/06 (extra statement lines, left column), 08 (duotone stacked over plates), 10, 19, 20, 22 (no reference; spec-verified only). Live reference blocked (403), corpus only.

## Mobile scroll performance (7:30 PM)
Probe: scripts/fidelity/scrollperf.mjs (390x844 touch, 4x CPU throttle, production build, 24px steps). Before: p50 66 ms/frame, 118 frames over 50 ms, 9.1 s long tasks. Culprit by elimination (animations/transitions off: 1.0 s): about 2000 infinite SVG iso-loop animations running on the main thread, offscreen included. Fix: on coarse pointers the loops settle to the authored plate (iso-plate.css); Lenis JS smooth-scroll is not initialised on coarse pointers (native compositor scroll). After: p50 33 ms, 32 frames over 50 ms, 1.5 s long tasks. Remaining spike near 1000-2000 px is a lazy section mount. Synthetic throttled desktop Chromium, not a real phone: unverified on device.

## Mobile spike + slice 07 recheck (7:35 PM)
Remaining 1-2k px spike is first mount cost of lazy sections (chunks are already warmed on idle); with transitions off the run drops to 1.1 s long tasks, so reveal transitions firing together on jump-scroll account for most of the rest (a real finger scroll arrives gradually). Slice 07 at 1440: the reference stage is bare ground with two floating plates and a royal annotation hairline; ours is a full-bleed photographic cantilever with a royal circle. Large structural gap, not closed. Status: FAILING.

## Slice 07 redo (1440)
Why stage is now two floating plan plates (campus, laboratory) on bare ground, a royal annotation hairline and the dark checking card, replacing the full-bleed cantilever on desktop (DOM kept, hidden at 992px and up). Remaining: plates are small and quiet versus the reference plates, no corner plus marks or red tag cards, the pillar panels still follow below. Status: FAILING (closer).

## Slice 08 redo (1440)
The plan strip now takes the left half as a stack of title-barred plates with the dark checking card on bare ground; the duotone collage pane is hidden (kept in DOM). Remaining: plate sizes and offsets are not measured against the reference, the third plate is clipped by the section height, no tag cards. Status: FAILING (closer).
