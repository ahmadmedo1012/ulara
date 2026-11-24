# r359-A2 LEDGER — Art & Assets (Agent A2)

Branch: `r359/a2-art` · PR: https://github.com/ahmadmedo1012/ulara/pull/56
Owner of every illustration, drawing, plate, OG image and mobile art asset.

## Decisions log (ambiguity → choice → one line, keep moving)

1. `shared/art/` = pure-TS grammar + scene builders (no React) so web TSX, RN TSX and exported SVG all render from ONE source; the 44 web seats are GENERATED thin wrappers (`scripts/art/gen-wrappers.mjs`, graduation map).
2. Colors ride scoped `--r359-*` custom properties in `frontend/src/styles/illustrations.css` (A2-owned) mapped onto house tokens (`--text-primary`, `--rule`, `--c-royal-ink`, `--bg`). Forced-theme blocks use the gate's sanctioned `/* color-gate: allow */` per-line comments. Token wishes for A3: none — house tokens already match the r359 spec.
3. Heroes are frameless full-bleed (the page frame is landing chrome, not art). Survey anchors = plain royal squares at rest (halo removed after i4 critique read it as a UI artifact).
4. `/__plates` keeps the R344 product-plate scenes (render-plates byte-stability) and appends the r359 gallery below.
5. The svg-filters displacement (reference §5) is a LANDING-layer effect (A1's seat) — art ships clean line-work; nothing blocks A1 from filtering.
6. `frontend/public/brand/**` untouched (logo geometry gate — verified green via `icons:check`).

## Acceptance — evidence index

### A. All keys exist, render light+dark, axe, /__plates ✔
- 44/44 keys (`shared/art/manifest.ts` ↔ `frontend/src/components/illustrations/r359/*.tsx`)
- captures: `evidence/captures/<key>-{light,dark}.png` (88 shots)
- whole-library sheet: `evidence/library-sheet.webp`
- axe on /__plates: **0 violations** (`evidence/axe-clean.txt` context; two pre-existing product-plate a11y bugs fixed in PlatesPage)
- gallery: light/dark × desktop/mobile × anim toggle, lazy chunks

### B. Fidelity sheets + written critiques ✔
- `evidence/sheets/hero-desktop-i1..i5,final.webp`, `hero-mobile-final.webp`
- `evidence/sheets/plan-lecture-i1..i3.webp`, `why-observe-sheet+i2.webp`
- written record: `evidence/CRITIQUES.md` (per-iteration verdicts + final statement + honest remaining deltas)
- numeric checks: `evidence/numeric-checks.json` (radius 0, 0 shadows, 5-token stroke census, Geist Mono)

### C. Zero red/orange ✔
- `scripts/art/check-art-colors.sh` → OK (144 surfaces: ink/paper/hairline/royal only)
- raster sweep: 0 orange rasters in `frontend/public/media` + `frontend/src/assets`
  (footer skyline webps REGENERATED from the grammar; product-plate captures re-rendered with royal)

### D. Mobile ✔
- `npm -w apps/mobile run typecheck` → 0 errors
- jest render test: **44/44 pass** (light+dark) — `apps/mobile/src/components/art/__tests__/art.test.tsx`
- screenshots at 360 + 412: `evidence/mobile-<key>-{360,412}.png`
- adaptive icon/splash: regenerated via the sanctioned pipeline (`npm run icons`) — `icons:check` byte-identical ✔ (one drifted favicon re-baselined by regeneration)
- logo geometry gate: green (no brand file touched)

### E. Size budget + dead assets ✔
- max **13.7 KB** gz per key (wrapper+runtime+grammar+family; budget 40 KB)
- shared/art/svg: 44 SVGO SVGs, 228 KB total
- dead assets: old mk-ill pieces + r342 landing illustrations stay (LIVE consumers in A1's sections — thin-wrapper law); retirement list handed to the integrator
- knip: not re-baselined by A2 (fleet gate — my files all have live consumers)

## Gates snapshot (measured on branch head)

| gate | result |
|---|---|
| frontend typecheck (`tsc -b --noEmit`) | PASS 0 errors |
| eslint (`npm run lint`) | PASS |
| stylelint (illustrations.css, plates.css) | PASS |
| mobile typecheck (`tsc --noEmit`) | PASS |
| mobile jest (art suite) | 44/44 PASS |
| art color scan | PASS (zero off-grammar hues) |
| icons:check | byte-identical ✔ |
| axe (/__plates) | 0 violations |
| zero-trace (non-history) | PASS (`bash scripts/brand/zero-trace.sh` — history half red on the two known old commits, owner decision) |

## Progress

- [x] M0 — grammar + manifest + runtime + ALL 44 key files present (pushed within the window)
- [x] M0.5 — /__plates art gallery
- [x] M1 — hero-elevation + mobile (6 fidelity iterations, final verdict: credible sibling)
- [x] M2 — 7 plans (3 iterations)
- [x] M3 — sections (12 keys; why upgraded to real plan language)
- [x] M4 — usecases (6)
- [x] M5 — states (9)
- [x] M6 — onboarding + splash (5)
- [x] M7 — RN library + SVG exports + OG + icons
- [x] M8 — evidence loop (sheets, critiques, numeric, mobile shots, library sheet)
- [x] M9 — retire old art (skyline + product captures regenerated; zero orange)
- [x] M10 — ART-GRAMMAR.md + LEDGER + REPORT.ar.md + PR

## For the integrator

1. Regenerate after merge: nothing A2-generated needs re-merge — `gen-wrappers.mjs`,
   `build-native.mjs`, `export-svg.mjs`, `build-og.mjs`, `retire-skyline.mjs`,
   `render-plates.mjs` are all idempotent from source; re-run `render-plates.mjs --check`
   after landing (product captures were re-baselined with the royal accent).
2. A1 should switch landing consumers (Statement/Footer/Hero) to the r359 library at will —
   `import.meta.glob('../illustrations/r359/*.tsx')` + the keys in `shared/art/manifest.ts`;
   then delete `public/media/illustrations/r342/*` (only consumer-bound today).
3. A4 takes `apps/mobile/src/components/art/index.ts` as-is (expected add/add → A2's version wins).
4. If A3 ever wants the art palette in `shared/design-tokens.json`, the five `--r359-*` seats
   in `illustrations.css` are the canonical definitions to promote.
