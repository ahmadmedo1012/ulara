# Plan 09: CTA, footer and cookie strip

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Vision.tsx` (CTA), `sections/Footer.tsx`, `chrome/ConsentBanner.tsx`.

## Files in scope
- `frontend/src/components/landing/sections/Vision.tsx`
- `frontend/src/components/landing/sections/Footer.tsx`
- `frontend/src/components/landing/chrome/ConsentBanner.tsx`

## Rules to change (with reason)
- Footer overlap gate (`scripts/brand/footer-overlap.mjs`) updated if collage overlap is intended.

## Data and art contracts
Duotone collage band with royal circle, slab and pale circle.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/09-cta-footer-cookie/`.

## Phone/tablet strategy
Collage crop, bottom-sheet cookie.

## Research notes (reference measurements)
- CTA 11853 to 12551 (698 px); footer 12551 to 13262 (711 px).
- Footer title uses the masked line reveals; the pointer lens on the logo was NOT EXTRACTED in the corpus (inside the obfuscated bundle).