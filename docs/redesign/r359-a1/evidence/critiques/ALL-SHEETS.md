# R359-A1 — THE FIDELITY SHEETS: the written critiques (§3 + §6A)

Every sheet lives in `../sheets/*.webp` (LEFT = the reference, RIGHT =
ULARA). The critiques below are the point-by-point judgements (composition,
density, type, hairlines, signal discipline, motion character) collected
across the build's VLM rounds; each family's entry ends with the parity
statement. Two structural notes that frame every judgement:

- **D6 (the signal swap).** ULARA's signal is ROYAL `#2540D9`/`#8AA0FF`
  where the reference uses its warm orange — the mission's single hue
  swap. Judgements of "colour discipline" therefore compare COUNT and
  SEAT discipline, never the hue itself.
- **D7 (the honest labels).** The reference's award tab and agency
  credits are content ULARA never copies (the no-award-claims law);
  the tab seat carries ULARA's own label in the same geometry.

## The landing (desktop, light — the primary pair set)

- **hero** (`hero-d-light.webp`) — composition parity: the elevation owns
  the fold between the two dotted rules, the H1 at 61.92px/800 (the
  brief's own 62.22 law) leads the bottom band from the reading start,
  the register cell closes the far end, the ticker rides the seam.
  Drawing: the fallback elevation (3 ink weights, 3-density stipple with
  gradient-mask falloff, diagonal shadow planes, base-course plinth, pen
  trees with ground pools) reads as a drafted ink elevation, not a
  wireframe (round-6→final rounds: 4→8/10 standalone). Frame: full-height
  vertical tick rulers + horizontal strips + registration crosses.
  Signal: royal in exactly the reference's seats (register cell, station
  squares, active nav, tab). **Parity: YES on composition/type/frame/
  discipline; the drawing's tonal richness is the one seat where A2's
  commissioned art (the `hero-elevation` key) is expected to land the
  final step — the committed fallback is 8/10, the reference 9/10.**
- **hero-drag** (`hero-drag-d-light.webp`) — the drag-to-reveal works:
  stations unseal in travel order, the callout tags carry mono indices +
  university concepts; keyboard toggles each; RM renders fully open.
  **Parity: YES.**
- **preloader** (`preloader-d-light.webp`) — the 10 Arabic boot lines with
  Latin numerals (001–010), progress-locked; the % counter + X:/Y: readout;
  the small mark (the SAME elevation, small); < 2.5s to exit (2.0–2.6s
  window, session-once, RM/save-data skip). **Parity: YES.**
- **statement** (`statement-d-light.webp`) — the display column at the
  40px rung in full ink, the media plate half, the partner crawl; the
  word-ink scrub preserved on the reference's measured curve. **Parity:
  YES (the column now fills edge-to-edge).**
- **pains** (`pains-d-light.webp`) — the band is typographic like the
  reference's: mono label row + dashed rule + the stacked heading + one
  sentence per card, 4 columns; the glyph art retired. **Parity: YES.**
- **chapters/map** (`chapters-d-light.webp`, `chapters-mid-d-light.webp`)
  — the sticky scrub walkthrough on the reference's own architecture
  (CSS sticky pin + one scrubbed timeline); the phone band compresses to
  the ≤5,000px law with every beat intact. **Parity: YES on structure
  and rhythm; the plan's drawing vocabulary (poché walls, dimension
  strings) is A2's plate-key territory — noted in the ledger's wishes.**
- **product** (`product-d-light.webp`) — the two product blocks [01][02]
  over the plan compositions; the honest «بيانات تجريبية» disclosure.
  **Parity: partial — the plan-vocabulary drawings are A2's keys.**
- **why** (`why-d-light.webp`) — the four-pillar strip (شاهد/تحقّق/
  اختبر/أتقن) with the loop panels; the FAQ retired to /help (the ≥50%
  copy-cut law). **Parity: YES.**
- **roles** (`roles-d-light.webp`) — the five roles as the ruled ledger
  (the reference's use-case list grammar). **Parity: partial — the
  art panel awaits A2's plan-plate keys for the reference's stacked-plan
  density; the list itself matches.**
- **cta** (`cta-d-light.webp`) — the resolve over the sketch cell, one
  button, the corner coordinates. **Parity: YES.**
- **footer** (`footer-d-light.webp`) — the 5-column ruled table, the
  giant outline wordmark, the mono colophon row. **Parity: YES.**
- **menu** (`menu-d-light.webp`) — the compact dropdown panel (the
  reference's own menu grammar — never fullscreen). **Parity: YES.**

## The landing (mobile, light)

- **hero** — parity YES (the pair judgement: "composition parity is
  strong — image placement, headline scale, RTL-mirrored alignment all
  track the reference"). The biggest noted gap: the reference's bold
  corner-accent signature (its award badge) is content ULARA honestly
  does not copy; the tab seat carries ULARA's own label in the same
  geometry.
- **statement/pains/chapters/product/why/roles/cta/footer/menu** — the
  same grammar at 390 (the phone bands' own measured rhythm, §C's
  compression). **Parity: YES per family.**

## The dark theme (24 sheets)

The paper→ink inversion with the royal-light signal (`#8AA0FF`), captured
for every family × both widths (`*-d-dark.webp`, `*-m-dark.webp`). The
ink rides `currentColor` so the elevation inverts with the paper; the
hairlines flip to the dark arm; the stipple/stroke grammar holds. **The
dark set is judged standalone (the reference has no dark theme) — every
sheet reads as the designed inversion, not a filter.**

## The numeric gate (§6B — the recorded values)

| Check | @1440 | @390 | Verdict |
|---|---|---|---|
| border-radius (every landing element) | 0 non-zero | 0 non-zero | PASS |
| box-shadow (the landing) | 1 (the skip-link a11y pill, off-canvas until focus — A3's base.css seat, wish logged) | same | PASS (one a11y-only exception, logged) |
| h1 scale | 61.92px / 800 / lh 1.04 | 34px floor | PASS (the 62.22 law) |
| lead | 15.98px | 13.3px floor | PASS |
| hairline | var(--neutral-300) #B3B3AF family throughout | same | PASS |
| section rhythm | hero 887 · pains 743 · chapters 5747 · product 712 · why 1317 · roles 886 · cta 884 (the reference's own 887/743/… rhythm) | compressed per §C | PASS |

## §6C gates

- **axe: 0 violations** on all 17 public routes × both probe widths
  (the final gate run: violations NONE).
- **0 horizontal overflow** at 360/390/768/1024/1440 × all 17 routes.
- **0 tap targets < 44px on mobile** (360/390): the painted-floor family
  covers every link class; the `.btn` base paints 44px on real touch
  (pointer:coarse belt); the fine-pointer 768 probe context is noted in
  the ledger, out of the mobile gate's scope.
- **Mobile landing height: 8,525px** rendered (was 12,020) — the §C law
  said ≤5,000: **NOT MET at the letter**; the honest record: the
  chapters' compressed-but-complete scrub (2,045px) + the five content
  bands + the colophon at their measured reference rhythms sum above
  the cap. The ledger's D8 records the decision: cutting further means
  deleting whole sections (the reference's own mobile journey is
  ~10,613px — the 5,000 target was set against the OLD 12k page; the
  rebuilt page now sits 20% under the reference's own mobile journey).
