# Plan 04: Intro scroll-text and partners strip

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Rework `sections/Statement.tsx` with `journey/WordReveal.tsx`; add partners strip using existing `patterns/Marquee.tsx`.

## Files in scope
- `frontend/src/components/landing/sections/Statement.tsx`
- `frontend/src/components/landing/patterns/Marquee.tsx`

## Rules to change (with reason)
- None expected.

## Data and art contracts
Original partner marks as SVG.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/04-intro-partners/`.

## Phone/tablet strategy
Statement lines re-broken for narrow measure.

## Research notes (reference measurements)
- Intro section top 993 to 1716 (723 px); title runs a scrubbed drift from center bottom+=10% to center top+=40%.
- Reveals use start 'top+=X% bottom'; masked line reveals (bp-line style).
- Carousel is Swiper 11 style.