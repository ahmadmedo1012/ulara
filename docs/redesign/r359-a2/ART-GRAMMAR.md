# r359 ART GRAMMAR — the ULARA drawing language (A2)

The single source of truth for every illustration, plate, plan, elevation and state
graphic in ULARA. Code: `shared/art/grammar.ts` (+ `scenes/*`). Living proof: `/__plates`.

## 1. Surfaces (where the art renders)

| surface | path | renderer |
|---|---|---|
| web (44 keys) | `frontend/src/components/illustrations/r359/<key>.tsx` | `lib/runtime.tsx` (React SVG, CSS-var palette) |
| RN (44 keys) | `apps/mobile/src/components/art/<Pascal>.tsx` | `RnArt.tsx` (react-native-svg, hex palette) |
| standalone SVG | `shared/art/svg/<key>.svg` | `scripts/art/export-svg.mjs` (SVGO, self-theming) |
| OG / raster | `frontend/public/og/*`, `media/illustrations/r342/footer/*` | `scripts/art/build-og.mjs`, `retire-skyline.mjs` |

All four render the SAME `ArtDoc` scene trees — one drawing, every surface, byte-identical geometry.

## 2. Palette (exactly five voices — nothing else ships)

| voice | token | light | dark | use |
|---|---|---|---|---|
| ink | `--r359-ink` | `#282828` | `#F3F2EC` | every line, poché, silhouette, label |
| ink-2 | `--r359-ink-2` | `#62625F` | `#B3B3AF` | secondary mono captions, furniture hints |
| hairline | `--r359-hair` | `#B3B3AF` | `#4A4A48` | construction rules, registration, dashed guides |
| signal | `--r359-sig` | `#2540D9` | `#8AA0FF` | THE one accent: callout tags, anchors, route/loop overlays |
| paper | `--r359-paper` | `#F3F2EC` | `#1C1C1A` | fills that must read as ground (never decorative) |

- Web maps them onto house tokens (`illustrations.css`: `--text-primary`, `--rule`,
  `--c-royal-ink`, `--bg`) — light/dark rides the theme cascade; `data-art-theme` forces a twin.
- **NO gradients. NO glow. NO shadows (box/filters). NO red/orange anywhere**
  (`scripts/art/check-art-colors.sh` gates this: 144 surfaces, zero off-grammar hues).
- Radius **0** everywhere in art chrome; circles only where the drawing itself is round
  (dots, tree-nothing, wheels).

## 3. Line weights (the weight ladder)

| rung | value | use |
|---|---|---|
| hair | 0.75 | joints, pane subdivisions, furniture, construction |
| fine | 1.25 | dimension lines, ticks, mullion shadows, door leaves |
| med | 2 | floor bands, slab edges, lintels, transoms, wall caps |
| wall | 3.5 | core/massing outlines, plan poché partitions |
| heavy | 6 | ground line, roof slab, section cuts |

Plans use poché strokes: exterior walls 10, interior partitions 6 (see `scenes/plans.ts`).

## 4. Texture (the tonal engine)

- **Stipple** — `stipplePoly(poly, tone 0..1, seed)`: seeded round-cap micro-dots; tone maps
  to BOTH dot size (0.85→2.5) and lattice pitch (6.5→2.0px). Measured from the reference:
  sunlit grain ≈ tone 0.10–0.17, shade 0.3–0.45, cast shadows 0.5+, recesses 0.72.
  Deep tones overlap into 60–80% ink — shadows must READ, not whisper.
- **Hatch** — `hatchPoly(poly, {angle 45°, pitch 6–10, breaks})`: parallel hairlines with
  seeded breaks; the shadow language for stair soffits + plaza paving.
- **Graded ramps** — `stippleGraded(x,y,w,h, topD, botD)`: 4-band density ramps; concrete
  darkens under roof shadows and fades to near-paper at lit bases.
- **Tie-holes / joints** — sparse dot grids + vertical hairlines at ~46px: the board-formed
  concrete signature.
- Determinism: every generator is seeded (`mulberry32`) — identical output web/RN/SVG/node.

## 5. Trees (the entourage voice)

`tree(x, baseY, h, {depth, spread, lean, limbs, trunk, opacity, seed})` — bare winter
branching: quadratic-bend branches, taper 0.6×/order down to 0.5px twigs, optional forked
limbs; ghosts at opacity 0.16–0.22 behind the ink foreground. Trunks stay lighter than the
building mass (`trunk: 0.6`) so the architecture reads first.

## 6. Annotations (the drafting furniture)

- **Dimension** — `dimH/dimV`: hairline extension lines, fine dim line, 45° slash ticks,
  mono `14400MM` labels.
- **Callout** — `callout(x,y,code)`: royal square anchor + leader + 0-radius royal tag
  with WHITE mono code (`HALL-A/01 · 180 SEAT`). One finding per anchor — reference discipline.
- **Registration** — `regCross(x,y)`: hairline `+` crosses at plate corners.
- **Coordinates** — mono `X:1131PX / Y:1131PX` readouts at sheet edges.
- **Title block** — identity rule + `CODE / NAME` + graphic scale bar (alternating ink
  fills) + `SHT A-101`.
- Mono voice: Latin digits/codes ride `var(--font-mono)`; Arabic labels ride the sans voice.

## 7. Motion register (slow, precise, mechanical — nothing else)

`animated` prop adds `data-anim="on"`; CSS in `illustrations.css`:

| hook | behavior |
|---|---|
| `data-a="draw"` | stroke draw-in (`pathLength=1`, dashoffset 1→0, `--t-slower --ease-out`) |
| `data-a="draw-slow"` | same at cinema pace |
| `data-a="dash"` | slow dash flow (dashoffset 0→−36 loop, linear) |
| `data-a="drift"` | ±1px translate loop |
| `data-a="pulse"` | opacity 0.55↔1 loop |

No springs, no bounce, no parallax beyond ±1px. The global reduced-motion belt zeroes it;
RN renders static (native motion is A4's seat).

## 8. Composition laws

- Heroes are frameless, full-bleed; the page frame is the landing's chrome, not the art's.
- The building owns ~50% of the hero canvas; trees flank and OVERLAP the mass; ONE heavy
  ground line runs wider than everything.
- ONE sun: upper-left, 45°. Shadows are hard-edged stipple polygons — slab→bay, tower→bay,
  fins→core, columns→recess, building→ground. Never ambivalent.
- Glazing: paper panes, SOLID ink mullion bars + hairline shadow offset, heavier horizontal
  transoms, 3-tone interior alternation, sparse diagonal reflections, interior hints at
  0.3–0.35 opacity. Glass never carries concrete grain.
- One near-black anchor per drawing (door void, recess, contact shadow) — measured tonal
  range on the hero: paper 235 → contact shadow 116 (0–255 luminance).
- Plans: poché walls with paper-cut openings + jamb ticks + swings; hairline furniture that
  recedes; X-in-box fixtures; circled-cross plumbing; dims on two sides; ONE royal callout.
- State graphics: the same grammar at 320–480px — sheets, rules, ONE royal accent, mono
  captions; never cute, never colored beyond the signal.

## 9. Contract (the 44 keys)

`shared/art/manifest.ts` is the registry (key → PascalCase → Arabic title → family).
Families: `hero` `plans` `sections` `why` `usecases` `marks` `states` `cta` `onboarding`.
Wrappers are GENERATED (`scripts/art/gen-wrappers.mjs`) — never hand-edit; graduate a key
by adding it to the script's GRADUATED map and re-running.

## 10. Budgets & gates

- ≤ 40KB gz per key (measured max: 13.7KB — wrapper+runtime+grammar+family).
- `bash scripts/art/check-art-colors.sh` — zero off-grammar hues.
- `/__plates` — axe-clean, 44/44 cards, light/dark, desktop/mobile, anim toggle.
- Mobile: `tsc --noEmit` + 44/44 jest render tests.
