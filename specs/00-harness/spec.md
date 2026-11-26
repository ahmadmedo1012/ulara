# Shared harness S00: capture + side-by-side

Needed by every slice (visual test-first). To build at `scripts/fidelity/`:
- `capture.mjs --slice <id-slug> --viewports ... --out <dir>`: Playwright capture of ULARA at viewport and scroll (sets `sessionStorage['ulara-intro-skip']='1'` unless the preloader is under test); frame sequences via `ffmpeg -vf fps=12`.
- `sheet.mjs`: builds a side-by-side WebP (reference left, ULARA right) from the corpus shots `docs/redesign/r350/reference/shots/*.webp` or a live reference capture (kept out of the repo; its name never written).
- Reference live capture uses `page.mouse.wheel` (its smooth scroll). The live site was behind a bot gate in r364, so the corpus is the baseline.
Status: not built yet. First implement task of the whole mission.
