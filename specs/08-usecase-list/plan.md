# Plan 08: Use-case hover/tap list with image reveals

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Roles.tsx` and `plates/RolePlates.tsx`.

## Files in scope
- `frontend/src/components/landing/sections/Roles.tsx`
- `frontend/src/components/landing/plates/RolePlates.tsx`

## Rules to change (with reason)
- None expected.

## Data and art contracts
Per-role plan and scene reveals from the art generator.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/08-usecase-list/`.

## Phone/tablet strategy
Inline reveal per row.

## Research notes (reference measurements)
- Use-case section 10867 to 11853 (987 px).
- Gallery is Swiper 11 style with image reveals; dark card is ink slab with paper mono text.