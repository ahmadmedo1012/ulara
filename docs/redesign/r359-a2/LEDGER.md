# r359-A2 LEDGER — Art & Assets (Agent A2)

Branch: `r359/a2-art` · Owner of every illustration, drawing, plate, OG image and mobile art asset.

## Decisions log (ambiguity → choice → one line, keep moving)

1. `shared/art/` = pure-TS grammar + scene builders (no React) so web TSX, RN TSX and exported SVG all render from ONE source. `frontend/src/components/illustrations/r359/<key>.tsx` = generated thin wrappers (scripts/art/gen-wrappers.mjs). Rationale: contract §5.3 requires same keys on web + mobile; single-source keeps them byte-identical.
2. Colors ride scoped `--r359-*` custom properties defined in `frontend/src/styles/illustrations.css` (A2-owned) mapped onto house tokens (`--text-primary`, `--rule`, `--c-royal-ink`, `--bg`). Forced-theme blocks use `/* color-gate: allow */` per-line comments (the gate's sanctioned mechanism) — A3 token wishes: none so far; house tokens already match the r359 spec.
3. `shared/art/scenes/stubs.ts` = M0 scaffolding; keys graduate family by family (hero → plans → why/usecases → states → onboarding). Wrappers regenerate via gen-wrappers.mjs with the GRADUATED map.
4. `/__plates` keeps the R344 product-plate scenes (render-plates.mjs byte-stability contract) and appends the r359 art library gallery below.
5. Wishes for the integrator: none yet.

## Progress

- [x] M0 — grammar + manifest + runtime + ALL 44 key files present & valid (typecheck/lint/stylelint green). 2026-11-24.
- [ ] M0.5 — /__plates art gallery
- [ ] M1 — hero-elevation + mobile (flagship)
- [ ] M2 — 7 plans
- [ ] M3 — why/sections/cta
- [ ] M4 — usecases
- [ ] M5 — states
- [ ] M6 — onboarding/splash
- [ ] M7 — RN + icons/OG
- [ ] M8 — evidence loop
- [ ] M9 — retire old art
- [ ] M10 — report + PR final

## Gates snapshot (measured on branch head)

- typecheck: PASS (tsc -b --noEmit, frontend workspace incl. shared/art via @shared alias)
- lint: PASS (eslint frontend/src backend/src)
- stylelint: PASS (illustrations.css)
