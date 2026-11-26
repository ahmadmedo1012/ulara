# Plan 12: About page

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework the about section in `frontend/src/pages/PublicPages.tsx` with shared landing patterns.

## Files in scope
- `frontend/src/pages/PublicPages.tsx`
- `frontend/src/components/landing/patterns/`

## Rules to change (with reason)
- None.

## Data and art contracts
Hero art v2 variant for about.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/12-about/`.

## Phone/tablet strategy
Stacked sections.

## Research notes (reference measurements)
- No dedicated about page in the corpus; the site-wide grammar in reference-map.md and the pricing-style page (shots/pricing-top) give the page template.