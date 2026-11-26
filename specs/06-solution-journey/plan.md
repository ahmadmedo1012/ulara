# Plan 06: Solution blocks and journey/chapters

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Chapters.tsx`, `journey/IsoJourneyScene.tsx`, `patterns/PinnedScene.tsx` to CSS sticky with scrub.

## Files in scope
- `frontend/src/components/landing/sections/Chapters.tsx`
- `frontend/src/components/landing/journey/`
- `frontend/src/components/landing/patterns/PinnedScene.tsx`

## Rules to change (with reason)
- Page-length ceiling is raised to the measured 13,255 px journey.

## Data and art contracts
Stage plans reuse slice 05 generator output.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/06-solution-journey/`.

## Phone/tablet strategy
4,800 px scene, composed stages.

## Research notes (reference measurements)
- Map 2458 to 9458 (about 7,000 px) under CSS sticky .home-map-inner (top 0, h 987); mobile about 4,800 px with .home-map-main-stick-inner.
- Zero GSAP pins; scrub via ScrollTrigger.