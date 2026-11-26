# r369 — «عالم أُلارا الدافئ» · PLAN

The redesign brief, sliced vertically. Each slice ends with its own
check and a push. `LEDGER.md` carries the landed state and the `NEXT:`
pointer so a cut-off never loses the thread.

## Direction in one line

A warm, playful, star-driven learning journey: cream paper, deep indigo
ink, ONE amber reward signal, soft 22px cards, pill actions, huge
friendly Arabic display type with one emphasised word per heading, and
a numbered story told with counters, a star total, a streak row and a
20-level ladder. Royal blue survives only as the info/link colour.

## Ownership of file groups

| group | files | owner |
|---|---|---|
| **tokens** | `shared/design-tokens.json`, `frontend/src/styles/tokens/tokens.css`, `scripts/tokens/build.mjs` (no logic change) | foundation |
| **type + fonts** | `frontend/src/styles/fonts.css`, `frontend/public/fonts/*`, `frontend/index.html` (preloads + theme-color + boot plate) | foundation |
| **shape layer** | `frontend/src/styles/world.css` (new, last in the chain), `frontend/src/main.tsx` (import order) | foundation |
| **public landing** | `frontend/src/pages/LandingPage.tsx`, `frontend/src/components/landing/r369/*`, `frontend/src/styles/landing/r369.css` | public |
| **public inner pages** | `frontend/src/pages/**`, `frontend/src/styles/{help,about,legal,errors,plates,vision,research,campus-media}.css` | public |
| **product shell + roles** | `frontend/src/components/layout/**`, `frontend/src/styles/{app,layout,components,patterns,student,admin,owner,teacher,institutional}/**` | product |
| **mobile** | `apps/mobile/src/design/*`, `apps/mobile/src/components/ui/*` | mobile |
| **evidence + docs** | `docs/redesign/r369/**`, `DESIGN.md` | every slice |

## Slices

### P0 — read + plan ✅
Repo truth read: `DESIGN.md`, `shared/design-tokens.json`, the token
sheets, the landing composition, the primitive class set, the gate
scripts (`check-colors`, `check-raw-css`, `check-icons`,
`check-csp-hash`, `tokens:build`). Output: this file + `LEDGER.md`.

### P1 — foundation ✅
- New token source: cream/indigo/amber palette + soft radius ladder
  (8→36 + pill) + springy motion (one overshoot curve) + re-keyed
  college/role tints (violet/teal/coral/sky/leaf through the existing
  family names, which are the mobile contract).
- `tokens:build` regenerates web CSS + mobile TS (verified PASS: 10
  triads · 43 semantic seats · both themes).
- Fonts: **Baloo Bhaijaan 2** (display, 400/600/700/800) +
  **Readex Pro** (body, 400–700), self-hosted woff2, arabic + latin
  subsets. Alexandria / IBM Plex Sans Arabic / IBM Plex Mono deleted.
- Boot plate + `theme-color` metas + preloads re-pinned to the new
  ground and the new LCP faces.
- Display ladder: h1 → `clamp(38px, 8.2vw, 118px)`, h2 →
  `clamp(32px, 6.4vw, 92px)`; leading floors 1.12/1.16 so Baloo's
  Arabic ascenders never clip. App ladder stays calm (28→48px).
- `world.css`: cards 22px + soft double shadow, pill buttons with the
  inset-outline secondary, 14px fields, pill chips, rounded/clipped
  tables, pill nav rows, bottom-sheet corners on phones, 3px focus ring.

### P2 — primitives ✅ (via the layered shape sheet)
The primitive families are re-shaped globally rather than re-written
per component: every `.card`/`.btn`/field/chip/table/nav/overlay/progress
rule now resolves the soft world. `world.css` is the ONLY new sheet and
it introduces no new component names.

### P3 — public site ✅ (landing) / partial (inner pages)
Landing rebuilt as the numbered story: nav → hero with a composed phone
mockup → marquee → 02 stars → 03 progress → 04 rewards → 05 habits →
06 levels → roles → FAQ → CTA → footer, plus the star jar (a scroll
counter that describes the PAGE, not product data) and the star-burst
preloader.
Inner public pages inherit the palette/type/shape through the tokens and
`world.css`; they were not individually re-composed (see LEDGER).

### P4 — logged-in product
Inherits tokens + shape. Gamification surfaces (XP/streak/badges) are
NOT wired to new endpoints — see the honest gap note in LEDGER.

### P5 — sound
Not landed in this slice. Off-by-default design is recorded in LEDGER.

### P6 — mobile
Consumes the regenerated `apps/mobile/src/design/tokens.generated.ts`
(colours, radii, motion, type ladder). Screens not re-composed.

### P7 — cleanup + docs
Delete the retired landing tree + sheets, update `DESIGN.md`, run
`scripts/brand/zero-trace.sh`, regenerate baselines.

### P8 — evidence
Capture the public matrix, write the honest critique, fix defects.
