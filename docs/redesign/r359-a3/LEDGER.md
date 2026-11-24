# R359 · A3 LEDGER — the authenticated product + design system

Branch `r359/a3-product` · PR #55 · Agent A3 of 4 · all evidence under `docs/redesign/r359-a3/evidence/`

## Method

Every visual claim below is backed by a hermetic capture (the e2e mock
transport + fixture sessions, no backend/DB) at 1440×900 / 390×844 ×
light/dark, taken by `evidence/capture.mjs`, plus computed-style scans
by `evidence/probe.ts`. Fidelity verdicts come from written critiques
of side-by-side sheets (`evidence/sheets/sheet-1..4` + `critique-1..4.md`)
measured against the committed reference corpus.

## DONE — foundation (the §2 measured token set)

- `shared/design-tokens.json` re-keyed and regenerated: paper
  `#F2F1EC` · ink `#282828` · secondary text `#646464` (neutral.500) ·
  hairline `#B3B3AF` holds · dark paper twin `#F0F0EB` · text tiers
  re-keyed to AA-passing greys (`#666663`/`#6E6E6A` — verified ≥4.5:1 on
  paper, white AND surface-3). Motion ladder re-keyed to the THREE-value
  mechanical register **160/320/640ms on ONE easing
  cubic-bezier(0.2,0,0,1)**; the spring/bounce vocabulary re-points at
  it (names survive as aliases — no overshoot anywhere).
- `tokens.css`: the §2 type scale — **h1 62.22 · h2 44.44 · lead 17.78
  @1440** (7.4664/5.3328/2.1336rem on the fluid root); the APP ladder
  joins the display scale (62.22/44.44/23.33 @1440, floors 30/22/17
  @390); d1/d2 caps re-keyed to the same rungs; the Y4 clamp discipline
  rides the h1/h2/h3 aliases too. `tokens:check` green.
- Evidence: `captures/F-*.webp` (computed h1 ≈ 62px on every role
  dashboard), `report.json`.

## DONE — the sheet grammar (the page language)

`styles/shared/r359-grammar.css` (shell-imported, unlayered, last word —
the house cascade contract) + `components/patterns/Sheet.tsx`:

- **SheetSection** — hairline frame + registration crosses at the
  corners + the draw-in rule (scaleX from the inline-start edge, 640ms
  mechanical, keyed off the sanctioned Reveal belt's `data-revealed`)
  + `[nn]` mono index + Latin mono caption over the Arabic title +
  actions slot on the head rule. Indices are ALWAYS page-authored
  strings (the r351 lesson — never DOM-derived).
- **KpiBand** — the reference's dimension-string register: hairline-
  divided auto-fit strip, huge Geist Mono tabular numerals (metric-lg
  30px / xl 48px), count-in on mount, deltas in the ONE signal or
  semantic ink, honest-empty register (`—` at body weight).
- **DataSheet** — dense hairline table, mono numerics, sticky mono
  head, row pins, hover fill, the inline-end arrow register; collapses
  to labelled cards ≤640px via `data-label`.
- **CalloutTag** — the royal square pin + label (annotation marker).
- **CoordReadout** — live mono `X:0000PX / Y:0000PX` scroll instrument
  (reads `.content`, the app's one scroller), paper chip, desktop only.
- **SheetEmpty** — the hairline placeholder frame with mono code.
- **Lateral rhythm** — `.sg-split` (7:5 with a full-height hairline —
  the reference's plan/text division) and `.sg-cols` hairline grids.
- **PageHeader** — optional explicit `index` prop (the `[01]` eyebrow
  numeral); `.pf-page-title` at the §2 h1; `.pf-page-desc` at the 17.78
  lead; breadcrumb mono register + 44px floors.
- **The StatStrip family** (`.stat-*`, admin/owner/quality) re-keyed
  onto the KPI-band register by CSS — every consumer upgraded with
  zero TSX changes (the achievements ink-pole variant restated).
- **Tab strips** gain the start-edge fade mask on mobile bands
  (RTL-aware) — never a hard-clipped label (`.inst-rail`, `.inst-tabs`,
  `.tabs`, `.pf-page-tabs .tabs`).
- Exported additively from the patterns barrel; CONTRACT.md v1
  signatures untouched.

## DONE — shell

- The labeled rail is the DEFAULT (icon rail stays one Ctrl+B away);
  the sidebar rides the PAPER ground (the tinted-surface slab retired —
  the reference separates by lines, not fills).
- CoordReadout mounted as shell chrome.

## DONE — pages

- **Quality dashboard** — full grammar rebuild (the reference
  implementation): KPI band + 7:5 split + framed sections + the one-
  signal donut (royal/grey/ink). Kills the stacked-KPI-list defect.
- **Institution workspace** — the dead «choose an institution» region
  is now a membership-aware SheetEmpty (picker pointer / OWNER create
  CTA / honest ask-your-owner note); the clipped mobile module rail
  gains the edge fade.
- **Teacher trend chart + owner composition donut** re-keyed to the
  one-signal dataviz law (royal hero series + ink/grey neutrals).
- **chartTheme** — ticks re-keyed to `--text-secondary` 11px mono.
- **/__design** — section [18] «قواعد الورقة» demonstrates every new
  primitive live (SheetSection/KpiBand/DataSheet/CalloutTag/SheetEmpty).
- All five role dashboards verified in the capture matrix (they ride
  the re-keyed StatLine/StatStrip bands + §2 page headers).

## DONE — the no-shadow / radius-0 law (§6C)

Killed at the source (computed-style verified): the notif-badge glow,
the cursor ring, the theme-toggle thumb inset ring, the hr-cta ember
ring, the progress-zero collar, the selected-pill halo (→ outline).
Remaining computed `box-shadow` on captured routes: **0** (the
focus-ring system is outline-based by house law). Radius: **0**
non-circular on every captured route (9999px circular primitives only).

## DONE — touch floors

Sub-44px targets fixed: `.pf-row-toggle` (20→44px wide), `.btn.sm`
(min-inline 44), breadcrumb links (42→44), `.ai-conv-open` (43→44,
floor made unconditional). Matrix: **0 targets < 44px** on the
captured mobile routes (was 3–7 per page).

## Numbers (the capture matrix — 30 captures)

- Horizontal overflow: **0** on every route × width (one 1px exception
  on `/__design` mobile — the gallery's own demo grid, noted).
- Console errors: **0** real errors (dev-mode axe contrast notes on a
  few pre-existing tinted-surface seats — see follow-ups).
- Full unit suite: **3069 tests green** after updating 3 pins that
  pinned the pre-r359 values (d1 cap, quality card→sg-section, the
  institution empty-state copy).
- `verify.sh --fast`-equivalent locally: tsc ✓ · vitest ✓ · lint ✓ ·
  stylelint gate ✓ · raw-css/colors/motion/icons gates ✓ ·
  tokens:check ✓ · route-transition e2e belt **5/5 ✓**.

## Fidelity verdicts (the §3 gate — sheets + written critiques)

1. **Grammar translation** (quality dashboard vs the reference platform
   section): HOLDS on composition, type hierarchy, hairlines, grid,
   micro-labels. Defects found and fixed during the pass: the sidebar
   tinted slab (→ paper). Remaining honest gap: the topbar chrome is
   busier than the reference's bar (software chrome vs marketing bar).
2. **Columns/indices** (admin KPI band vs the problems band): HOLDS —
   the trio (index/caption/numeral) reproduces the reference registers.
3. **Mobile grammar**: HOLDS on type scale, hairline calendar, micro-
   labels; the reference still wins on whitespace audacity. Honest
   gap: density (software) vs poster restraint.
4. **Paper/ink/signal** (student dashboard vs the hero): the micro-
   label axis is judged **ULARA's win** (the drafting instruments are
   functional, not decorative); the reference still wins on composition
   courage/whitespace budget.

**The statement the gate demands**: a designer would not pick the
reference out as the better one on typography scale, hairline
discipline, micro-labeling, indices, color discipline or the KPI
register; on pure whitespace audacity the reference's marketing pages
remain bolder — an intentional, documented trade for software density.

## NOT DONE (honest, for the integrator)

- The remaining ~50 menu items keep their current (already re-keyed)
  composition — the grammar is available to them but only the flagship
  surfaces listed above were recomposed by hand this round.
- Governance document upload UI (D-6) + notification-preferences UI
  per the r352 contract: NOT built this round (backend endpoints are
  A4's slice; the UI remains the honest 501 handling).
- The missing hermetic fixtures (`/catalog/regulatory-authorities`,
  `/catalog/credential-types` answer 501 → honest error states render).
- A few pre-existing sub-4.5:1 13px seats on tinted surfaces (dev-mode
  axe notes; hunted — likely transient skeleton/meta seats).
- The audit surface baseline will need re-promotion after merge (the
  motion/type re-key intentionally drifts it — run
  `npm run audit:baseline` in mock mode).
- The student hero ink band: kept deliberately (ink is sanctioned;
   the house r305/r313/r355 «ONE inversion» law) — flagged for the
   owner's eye in the fidelity sheets.

## Regenerate rule

`shared/design-tokens.json` changed → `tokens.generated.css` +
`tokens.generated.ts` are committed regenerated. After merging with
A1/A2/A4, the integrator must re-run `npm run tokens:build` and
re-promote the audit baseline.
