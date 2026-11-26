# Plan 07: Why-us (observe / advise / act / learn)

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Product.tsx`, `plates/ProductPlates.tsx`, `sections/Why.tsx`, `plates/WhyPanels.tsx`, `plates/DuotoneScene.tsx` using the flat-shape kit.

## Files in scope
- `frontend/src/components/landing/sections/Product.tsx`
- `frontend/src/components/landing/sections/Why.tsx`
- `frontend/src/components/landing/plates/`

## Rules to change (with reason)
- Flat-shape kit may use raster duotone where tonal richness needs it.

## Data and art contracts
Duotone campus podium scene with flat royal shapes and a lone figure (original).

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/07-why-us/`.

## Phone/tablet strategy
Tab strip plus cropped scene.

## Research notes (reference measurements)
- Platform section 9458 to 10168; tab rail is CSS sticky .home-platform-content-inner (top 427, h 145); about 1,200 px scrub (9458 to 10655).
- Why section 10168 to 10867 (698 px).