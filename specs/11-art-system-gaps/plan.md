# Plan 11: Art system gaps

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Extend `scripts/art/` (plans-v2, render-plates, export-svg); no second generator; inventory every plate against slices 03 to 09 and fill gaps.

## Files in scope
- `scripts/art/`
- `frontend/src/components/landing/plates/`
- `frontend/src/components/landing/hero/ElevationArt.tsx`

## Rules to change (with reason)
- ART-GRAMMAR raster ban and colour checks (`scripts/art/check-art-colors.sh`) are updated with a reason.

## Data and art contracts
Plate inventory table in research.md at implementation.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/11-art-system-gaps/`.

## Phone/tablet strategy
Portrait variants.

## Research notes (reference measurements)
- Flat-shape kit and art v2 requirements in docs/redesign/r364/reference-map.md.
- Ink mask filter constants from REFERENCE.md section 5.