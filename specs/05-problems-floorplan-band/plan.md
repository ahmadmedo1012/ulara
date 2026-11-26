# Plan 05: Problems grid and floor-plan band

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Live.tsx` and `plates/PlanPlate.tsx`.

## Files in scope
- `frontend/src/components/landing/sections/Live.tsx`
- `frontend/src/components/landing/plates/PlanPlate.tsx`
- `scripts/art/plans-v2.mjs`

## Rules to change (with reason)
- Art grammar rule against heavy walls is changed if present.

## Data and art contracts
Thick-wall plans from `plans-v2.mjs`.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/05-problems-floorplan-band/`.

## Phone/tablet strategy
Plan cropped to one room cluster.

## Research notes (reference measurements)
- Problem section 1716 to 2458 (743 px).
- Map section is a 7,000 px sticky scrub (see slice 06); plans use thick walls, dimension strings, tags, callout squares, dark info cards.