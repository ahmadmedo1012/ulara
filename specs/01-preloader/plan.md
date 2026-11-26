# Plan 01: Preloader / boot sequence

## Constitution check
- I reference wins: rules in the way are changed with a one-line reason (list below).
- II zero-trace: only "the reference" in any artifact; `bash scripts/brand/zero-trace.sh` before each commit.
- III/IV fidelity loop + visual test-first: capture/compare written and shown failing before code.
- V floors: typecheck, behaviour tests, focus, reduced motion, logo gate.
- VI Arabic-first RTL, light and dark, phones composed.
- VIII scope: landing components, public pages, art system only; shared primitives additive.

## Technical approach (React/Vite, CSS tokens)
- Keep `chrome/Preloader.tsx`; re-time the counter to the measured three-phase curve and add the ruler layer, coordinate readout and typed boot lines.
- Masked row reveal reuses `journey/WordReveal.tsx` primitives.
- Timing constants live in one tokenised object so the capture script can assert them.

## Files in scope
- `frontend/src/components/landing/chrome/Preloader.tsx`
- `frontend/src/styles/ (preloader rules)`
- `frontend/tests/motion/`

## Rules to change (with reason)
- FCP floor: the sheet is allowed to hold the first paint for the counter duration; reason: the reference does.

## Data and art contracts
No raster. Ruler marks are CSS hairlines + SVG plus marks.

## Capture/compare harness
Uses `scripts/fidelity/capture.mjs` + `scripts/fidelity/sheet.mjs` (shared harness S00, see specs/00-harness/; the older `scripts/art/capture.mjs` only captures plate-gallery art keys; Playwright; hermetic ULARA capture sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test; the reference is captured from the corpus shots and, where reachable, live with `page.mouse.wheel` for its smooth scroll). Frame sequences: `ffmpeg -vf fps=12`. Sheets are WebP under `docs/redesign/r368/evidence/01-preloader/`.

## Phone/tablet strategy
Compose a 390 layout from the same parts; do not scale the desktop sheet.

## Research notes (reference measurements)
- Counter duration about 4.35 s, exit included about 6.9 s at 1440.
- Counter curve: fast to 45% in 0.9 s, slow 45 to 60% in 1.5 s, fast 60 to 100% in 1.8 s (samples in preloader-timeline.json).
- Anatomy: loading-progress (counter + item-bot coordinate), loading-ruler, loading-main > loading-content (title rows, spec sheet, boot lines, credit).
- Spec sheet and labels are mono 10 px; boot lines typed (TextPlugin style) and progress-locked.
- Exit: loading element goes display:none after the wipe.