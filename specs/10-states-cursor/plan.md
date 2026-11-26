# Plan 10: Buttons, inputs, links, hover/press/focus states and custom cursor

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Additive variants in shared button/input styles (new class, no change for logged-in pages); rework `cursor/SheetCursor.tsx`.

## Files in scope
- `frontend/src/components/landing/cursor/SheetCursor.tsx`
- `frontend/src/styles/components.css (additive)`

## Rules to change (with reason)
- None; shared primitives change additively only.

## Data and art contracts
None.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/10-states-cursor/`.

## Phone/tablet strategy
No cursor; larger targets.

## Research notes (reference measurements)
- Cursor: .cursor fixed, pointer-events none, display none on touch; .cursor-main 0x0 transform-driven; .cursor-inner 5x5 dot (opacity 0 at rest); lerp via shared ticker.
- Base tracking -0.02em; labels mono 10 to 14 px.