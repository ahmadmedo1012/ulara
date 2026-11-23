# R353 — Visual Art Direction & Illustration Engineering

> Round owner: the visual-artwork agent (`agent/ulara-visual-artwork`).
> Scope: the landing sheet's drawing grammar, the public pages' visual
> defects, the identity docs — NO gate, ceiling, workflow or ownership
> file touched (AGENTS.md §4/§7 hold).

## What changed

### 1. The plate grammar gains the ROYAL annotation layer (the identity law, carried into the drawings)

- `iso-plate.css` — two new seats: `--iso-royal` (+ dark-theme lift to the
  strong tier `#A9B8FF`: the ink seat `#8AA0FF` is a fill tone and muddies at
  hairline stroke weights on charcoal) + `--iso-royal-soft`.
- `lib/iso.ts` — `PLATE.royal` / `PLATE.royalSoft` join the palette.
- **The two-voice colour law** (documented in `DESIGN.md §5.a`): ROYAL =
  the platform's engineering layer (data routes, nodes, dimensions,
  measurement ticks, the compass needle); warm sienna = the learner's
  focal moments ONLY (the flag, the mastery gap, the observatory beacon).
  The 2026 «Parchment & Royal» identity now reads inside the drawings,
  not just in the UI chrome.

### 2. The campus plate — an architectural rebuild (not a recolor)

`plates/CampusArt.tsx` (the ONE geometry source both the hero centerpiece
AND the journey's 540dvh campus sheet mount):

- **A real campus edge** — perimeter wall with a GATE (piers + lintel +
  pennant) on the reading-start corner + a paved spine gate → tower.
- **The library tower** — riwaq arcade on the ground tier, glazed mullion
  lantern (royal) on the middle, clerestory crown + DOME + finial flag.
- **Four distinct wings** — arcaded faculty wing, lecture annex (stepped,
  wide-span arcade), hipped-roof hall, laboratory bar with rooftop unit;
  parapets, fenestration grids on BOTH faces, doors everywhere.
- **The observatory** — a full instrument storey of drum + dome + slit
  (reads telescope, not tank).
- **The plaza** — octagonal fountain (basin + royal water disc + jet),
  benches, lamp posts. **The field** — track lanes inside the track's own
  bounds, goal frame, two-step stand.
- **Planting** — palms (new primitive) mixed with the geometric trees.
- **The data net** — royal routes + nodes (hair lighter than the
  architecture — overlay, not engraving), flow chevrons; the observatory
  signal keeps the ONE warm route.
- **Surveyed dimensions** — the campus edge (56.0) + the tower height
  (H 29.0) on royal measure lines with paper-haloed numerals.
- **Line-weight hierarchy** — profile 1.6–1.8 / structure 1.1–1.3 /
  detail 0.7–0.9; the wall steps DOWN so the tower owns the plate's black.
- `kernel/Iso.tsx` — the shared drafting set: `Dim`, `Arcade`, `Palm`,
  `IsoDome`, `isoEllipse` (compact + data-driven; every colour through
  the PLATE vars — the color gate stays green).
- `IsoCampusSheet` — the journey's `SHEET_INK_CSS` ladder re-keys the new
  voices so the plan-voice hairline register holds at ×4.4.
- `CampusPlate` trace strokes — the preloader's self-drawing silhouette
  set matches the new volumes (wall runs, both domes).

### 3. The statement's destructive filter retires (the worst live-site defect)

The r351 displacement-ink filter (scale-100 turbulence on a fine-hatched
raster) smeared the courtyard illustration into the gray blotch the audit
caught. Filter + defs deleted — the original ink drawing ships raw.

### 4. The footer skyline breathes (mask fade, not a hard crop)

### 5. Royal data accents across the plates (why loops / pains / role machines)

System flows (progress crawl, connectors, recommendation arrow, research
pipeline, quality gauge sweep, submissions/governance/report routes,
pains' measurement instruments) read royal; every plate keeps its ONE
warm focal.

### 6. The campus page headline lh floor (AGENTS §6's own Arabic rule)

### 7. Dead media deleted (−3.4 MB)

The five unconsumed r342 illustration sets (hero/journey/problems/roles/
why) — superseded by the live plate grammar — leave the vault; the two
CONSUMED plates (statement-courtyard, footer-skyline — pinned by
r306-landing-sheet) stay. Manifest trimmed 19 → 2.

### 8. Identity docs reconciled

- `docs/design-system.md` — «إشارة برتقالية واحدة» → the royal signal
  (2026 «Parchment & Royal»), the warm accent re-seated as the secondary
  decorative voice, `--accent-ink` contrast 5.16 → 6.62 (the measured AA).
- `DESIGN.md §5.a` — NEW: the isometric plate grammar's art direction
  (the two-voice colour law, the line-weight hierarchy, the architectural
  credibility law).

## Gates (all measured from this branch's tree)

| gate | result |
|---|---|
| bundle (check-bundle-size) | **812.2 KB gz / 815** — PASS (entry 65.0/92 · pdf 95.7/110; baseline main measured 809.5 → the round costs +2.7 KB gz for the whole rebuild) |
| typecheck (tsc both sides) | PASS |
| eslint | 0 errors (14 pre-existing warnings, none in round files) |
| stylelint ratchet | GREEN — 40 errors vs baseline 45 (the round REMOVES 3: the dead statement defs/filters) |
| check-colors --strict | PASS |
| check-icons | PASS |
| check-raw-css --strict | PASS |
| check-motion-tokens | PASS |
| vitest (frontend, full) | **3060/3060** |
| e2e: r351-public-audit + r349-public-clip | **32/32** (text-on-text, clipped captions, horizontal overflow @ 1440/1024/768/390/360) |
| e2e: r308-landing-instruments | 5/5 (entrance, stations, walkthrough, RM) |
| e2e: r312-guest-reveal | 4/4 |
| e2e: r312-mobile-camera + guest-landing | 8/8 |
| e2e: r325-map-clip | 4/4 |

(e2e ran against the task's own vite on :5310 with the AGENTS §8
chromium-1200 → 1223 symlink fallback; WebKit absent on this box — CI
owns it, per the house note.)

## Visual evidence

`evidence/before` / `evidence/after` — hero (light + dark), journey
(2 scrub seats), statement, why, roles, footer, 390 hero. VLM-assisted
art-direction review of the AFTER hero: **light theme A, dark theme A−**
(previously C+ wireframe-fidelity per the BEFORE audit); the
before/after review verdict: «a rebuild, not a recolor — approved for
production».

## Residuals (honest)

- The journey's opening statement overlapping the ghost plate is the
  r325 ghost-crossfade contract (by design, pinned) — not touched.
- The why-panel `NEXT STEP` chip kisses its frame edge (pre-existing,
  inside the frame, cosmetic).
- The hero seat's size cap (54svh) is the r351 measured economy —
  deliberately unchanged.
