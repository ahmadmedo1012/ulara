# Plan 14: Contact

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework the page with shared landing patterns (additive); keep behaviour and data contracts.

## Files in scope
- `frontend/src/pages/PublicPages.tsx`

## Rules to change (with reason)
- Any DESIGN.md/token rule that blocks the page template is changed with a one-line reason.

## Data and art contracts
Hero art v2 variant for this page.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/14-contact/`.

## Phone/tablet strategy
Composed stacked sections, no scaled desktop.

## Research notes (reference measurements)
- No dedicated page in the corpus: the model is the reference's page template (pricing-style page, shots/pricing-top) plus the site-wide grammar in reference-map.md. Recorded as derived, not measured.