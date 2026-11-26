# Plan 03: Hero (stage art, type, ticker)

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Build on `hero/Hero.tsx` and `hero/ElevationArt.tsx` (art v2); add pointer crosshair, drag mask with the filter constants, marker layer and marquee.
- Art comes from `scripts/art` (slice 11 closes any gaps).

## Files in scope
- `frontend/src/components/landing/hero/`
- `frontend/src/components/landing/sections/Hero.tsx`
- `scripts/art/`

## Rules to change (with reason)
- Raster hero plate allowed where tonal richness needs it (mission directive).

## Data and art contracts
Hero elevation: ink hatching, thick outline, royal callouts; WebP plate + SVG overlay.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/03-hero/`.

## Phone/tablet strategy
Portrait elevation crop; markers re-placed, not scaled.

## Research notes (reference measurements)
- Hero top 7 to 993 px at 1440; img wrap top 60; inner top 87.
- Headline scale: h1 7.2rem/1, h2 4.8rem/1 (display, tight, uppercase-capable).
- Marker wash reaches about 0.75 opacity; two markers (item1/item2).
- Ink mask displacement filter constants: baseFrequency 0.045 0.055, octaves 4, seed 5, scale 100, blur 1.8, alpha slope 2.2 intercept -0.6.