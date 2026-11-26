# r368 ledger

- Spec Kit 1.4.5 installed (copilot integration, extensions bug/assess/github), constitution written, SPECKIT-SETUP.md added.
- Specs batch 1: slices 01-06 have spec (with resolved clarifications), plan, research, quickstart, tasks, analysis, checklist, critique stub under specs/. Shared harness spec in specs/00-harness.
- Specs batch 2: slices 07-12 specified/planned/tasked/analysed/checklisted.
- Specs batch 3: slices 13-22 specified/planned/tasked/analysed/checklisted; cross-slice analysis written (specs/CROSS-SLICE-ANALYSIS.md). All 22 slices at spec stage.
- Harness S00 built (scripts/fidelity/capture.mjs + sheet.py); slice 03 round-0 side-by-side sheet and written critique (failing).
- Capture harness gains --selectors (band-aligned); bands round-0 sheet and critique for slices 04-09 (evidence/bands/). Live reference blocked by a bot challenge (not bypassed): corpus shots are the baseline.
- Flat-shape kit scales with the scene (cqw) in art-v2.css; round-1 band sheet + critique.
- Duotone layering: shapes behind scene, high-key scene (art-v2.css); round-2 critique.
- Procedural cantilever scene (scripts/art/cantilever.mjs) + flat shapes on paper in the why band; round-3 sheet and critique. tsc passes.
- Cantilever reworked into one arcade structure; footer strip on the flat scene; round-4 sheet.
- Platform band central plates are thick-wall plans at reference scale (Product.tsx, platform.css); round-1 sheet.
- Platform heading to h2 scale; plan crop tuned; round-2 sheet.

NEXT: platform grid to one tall plan cell + ledger rows; half-art/half-list roles layout (08/09); nav/preloader/cursor from measured CSS.
- roles band: art-left/list-right layout with flat cantilever pane (still FAILING; NEXT: pane seats, single tall platform plan cell)
- roles pane seats tuned (FAILING; NEXT: single tall platform plan cell)
- platform: single tall plan cell (FAILING; NEXT: ledger rows + dark card, then 05/06 scale)
- platform: ledger rows (FAILING; NEXT: slice 05/06 scale)
- platform ledger scale (FAILING; NEXT: 05/06 scale, nav, preloader)
- slices 05/06 measured against shots, critique written (FAILING; NEXT: empty-field statement layout, nav, preloader)
- slice 06 statement unboxed at 6vw (FAILING; NEXT: clear band chrome, nav, preloader)
- slice 06 caption unboxed (FAILING; NEXT: nav, preloader)
- nav bar opaque (FAILING; NEXT: preloader re-timing from preloader-timeline.json)
- preloader: small mark, ledger hidden, left-seated (FAILING; NEXT: progress line + timing, then pages)
- preloader progress rule + welcome card seats (FAILING; NEXT: headline scale, timing, pages 12-20)
- preloader headline scaled; timing measured and kept (FAILING; NEXT: pages 12-20)
- about: full nav bar on inner page (FAILING; NEXT: same bar on help/contact/legal/app/colleges/campus/capabilities, centred titles)
- inner pages 12-16,18 carry the full nav bar (FAILING; NEXT: centred framed titles, colleges/auth/error)
- merged origin/main (clean); inner titles centred (FAILING; NEXT: colleges, auth, error, column rules)
- colleges + 404 carry the full bar; type gate kept (FAILING; NEXT: suite result, column rules, responsive loops)
- slice 21 mobile round-0 measured (FAILING; NEXT: mobile fold, platform, use-case)
- phone fold art narrowed; dark capture harness fixed; suite 2964/2966 then gate fixed (FAILING; NEXT: dark hero art contrast, more mobile)
- dark hero art legible; phone hint hidden (FAILING; NEXT: mobile platform/use-case, stored-shot loops)
- hero desktop art is a procedural flat elevation (FAILING; NEXT: heavier massing + shadow, mobile elevation, mobile bands)
- hero elevation v2: heavy massing, bare trees (FAILING; NEXT: mobile elevation, shadow tone)
- mobile hero uses a cropped flat elevation (FAILING; NEXT: mobile platform/use-case, footer, cookie, cursor)
- mobile hero markers re-seated on the flat elevation (FAILING; NEXT: footer, cookie bar, cursor, mobile art scale)
- all four mobile hero markers seated on the drawing (FAILING; NEXT: consent bar to fixed corner look, footer, cursor)
- consent bar seated as fixed bottom strip like the reference (UNVERIFIED visually: capture harness hides it; FAILING; NEXT: harness consent-visible capture, footer rebuild, cursor)
- consent gate mounts at page root (was inside lazy footer) and shows from first paint as a bottom-right strip; 404 login test scoped (FAILING; NEXT: strip proportions/accent, footer rebuild, cursor)
- consent strip proportions tuned: one short row, compact buttons (close; FAILING: reference sits inside the frame inset, orange accent vs royal)
- cursor: SheetCursor already implements the measured dot model (opacity 0 at rest, grows on interactive hover, hidden on touch); no change, slice 10 verified by spec only (live reference blocked)
- footer closing CTA band added (FAILING; NEXT: use-case accordion, merge main ~6PM)
- footer use-case accordion + art plate (FAILING; NEXT: merge main, mobile platform/use-case rebuild)
- phone platform: plan chrome chips dropped (FAILING; NEXT: icon-row rebuild of the phone platform list)
- phone platform rebuilt as auto-height stack with ledger rows (FAILING; NEXT: line icons, use-case phone band)
- ledger rows carry hexagon line icons with a glyph each (FAILING; NEXT: phone use-case band)
- footer closing band classes renamed fo-close-* (fo-cta already belongs to the Vision section; my CSS had leaked onto it)
- phone roles: group divider wraps inside the frame, use-case chips dropped (FAILING; NEXT: big art plate above list, dark/RTL loop)
- phone roles art plate restored to 4/3 over the diet shrink (additive media override)
NEXT: dark and RTL loops
- dark/RTL loop 1 logged
NEXT: dark hero art flat massing
- dark hero art audited (inversion only, no dark reference)
NEXT: RTL footer/platform loops
- RTL footer/platform loop 1 logged
NEXT: platform blank panel check, corner label clip
- blank platform panel reproduced twice, cause unlocated; label clip open
NEXT: locate the panel by section class
