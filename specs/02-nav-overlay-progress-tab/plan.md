# Plan 02: Nav, overlay menu, scroll progress, right-edge tab

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `chrome/SheetNav.tsx` and `chrome/EdgeTab.tsx`; add a route-transition wrapper applying `clip-path: inset(var(--mask-percent))` on the main region driven by the shared ticker.
- Progress rule as a transform-scaled element.

## Files in scope
- `frontend/src/components/landing/chrome/SheetNav.tsx`
- `frontend/src/components/landing/chrome/EdgeTab.tsx`
- `frontend/src/styles/`

## Rules to change (with reason)
- Any existing nav height or z-index rule that fights the measured bar is changed with a reason line.

## Data and art contracts
None.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/02-nav-overlay-progress-tab/`.

## Phone/tablet strategy
Overlay is a composed full-height sheet with large tap rows (44 px minimum).

## Research notes (reference measurements)
- Page transition: inset 0 to 50% in about 0.6 s accelerating (power2.in), swap behind full inset, then 50 to 0% in about 0.7 s decelerating (power2.out); total about 1.3 s.
- Header structure in header.html; 1px frame with plus marks at four corners (bg-border).
- Right-edge tab is a vertical block in the signal colour.