# R354 — Visual Artwork Excellence: Architectural Refinement & Final Hardening

> Round owner: the visual-artwork agent (`agent/ulara-visual-artwork`) — the
> continuation round on the SAME branch and PR #40 (R353's follow-up:
> close the delivery gates, fix the documented residuals, and harden the
> drawings' credibility). No gate, ceiling, workflow or ownership file
> touched (AGENTS.md §4/§7 hold).

## 0. The inherited CI state (measured at round start)

| check (run 45091642687/40) | result | this round's action |
|---|---|---|
| E2E (hermetic journeys) | ✅ completed | verified — not assumed |
| Typecheck · Lint · Build · Frontend · Backend · DB | ✅ | re-run locally below |
| Design gates · Surface drift · deadcode | ✅ | re-run locally below |
| **Size gate** | ❌ two PNGs >500KB | **FIXED — §1** |
| Zero-trace | ❌ | **inherited main blocker — §1.3** |

### 1.1 The Size Gate fix (no allowlist, no ceiling change)

`r353/evidence/{after,before}/02-statement-1440-light.png` measured
757,125 / 628,414 bytes (the limit: 512,000). Both re-encoded to
high-quality WebP (quality 96, method 6):

| file | before | after | PSNR vs the PNG |
|---|---|---|---|
| `after/02-statement-1440-light.webp` | 757,125 B | **203,388 B** (−73%) | 40.1 dB |
| `before/02-statement-1440-light.webp` | 628,414 B | **131,844 B** (−79%) | 40.2 dB |

40 dB+ is visually lossless for evidence (the fine hatching and the
numerals re-verify pixel-clear in the before/after pair). **No
`.size-gate-allowlist` entry, no resolution drop.** The gate re-runs
GREEN — rule 1 (no tracked file >500KB), rule 2 (docs 39,788KB ≤ 40MB),
rule 3 (the branch adds 3,087KB to docs vs main ≤ 5MB). Every other
evidence image in this round ships WebP ≤115KB from the start.

### 1.2 Zero-trace — the inherited main blocker (documented, not worked around)

`bash scripts/brand/zero-trace.sh` fails on the GIT HISTORY of two
R350 commits («fix(r350): CI repairs … heron->refsite» and «docs(r350):
the B0 reference extraction — heronaiapp.com measured live…») — commits
that live in **main's own history** (`git merge-base --is-ancestor`
verified: both precede this branch's fork point a71d7d8). No file or
path this branch adds contains a retired name (the content + name
halves of the gate pass locally). Per the round's rules: the git
history is NOT rewritten, the gate is NOT weakened, no exception is
added — recorded as an inherited main blocker with the proof above.

## 2. The hero composition rebalance (the measured fix, not a zoom)

**The finding (VLM-audited):** at 1440×900 the campus rendered
486×444px with the ink occupying only 480×233 — **33% of the viewport
width, 50% of the stage height** — because the r353 window
(−92,−58,184×168) still reserved ~80 sheet units of dead vertical
margin for the furniture the hero seat HIDES (labels, coord readouts,
scale bar). The audit's verdict: «a charming sketch stranded on too
much paper».

**The fix (three measured seats):**
- `CAMPUS_FRAME` tightens to **184×100** (y −30…70) — the window now
  wraps the VISIBLE ink (the north-arrow ticks at sy −24 … the 56.0
  dimension's extensions at sy ≈ +62.8) with a 6–7-unit drafting mat.
  Aspect 1.095 → 1.84: at the same seat width the drawing gains ×1.68
  rendered height.
- The hero seat cap re-rungs `54svh/720px → 84svh/760px` (the old cap
  was keyed to the retired near-square window): the campus now reads at
  **756×411 — 52% of the 1440 band's width, 82% of the stage height**,
  and the fold holds at every belt (hero section stays 100svh−13
  @1440/1024/768; measured no horizontal overflow at 360/390/768/1024/
  1280/1440; the 1280×800 fold actually IMPROVES ~828→798px).
- The five inspection stations re-seat ON the campus's own volumes
  (the lecture annex, the tower's riwaq, the observatory beacon, the
  hipped-roof hall, the plaza fountain) — the old corner anchors sat
  in the retired dead margins. Hit boxes re-rung to the tightened
  window (168×48 ≈ the old relative footprint).

**The guard:** `tests/unit/r354-plate-guards.test.ts` pins the frame
against the measured ink bounds (the mat ≥4 units, the dead-margin
ceiling 12 — the window can never silently regrow the shrink) and the
NEXT-STEP clearance below.

## 3. The journey statement — the overlap cured within the contract

**The finding:** the desktop plaque-2 window (out t 2.5–3.0) held the
statement over the assembled campus through band progress 0.30–0.48 —
the VLM-flagged destructive beats (glyphs dissolving into the tower's
lantern strokes; the audit's before shot: `evidence/before/
10-journey-mid-1440-light.webp`).

**The fix (the R349 precedent applied to the seat it was invented
for):** the desktop exit aligns with the mobile window — **out
2.2–2.6** (one window for both belts). The exit now completes before
the satellite layer finishes resolving beneath the glyphs; from beat
0.4 the campus owns a clean reading window (`after/
11-journey-late-1440-light.webp`). The r325 contracts hold verbatim
(unboxed plaques, the 18% ghost floor at progress 0, the rest states,
the RM static sheet — r325-map-clip 4/4).

**The halo hardens for cross-browser truth:** the plaque's paper halo
rides a two-belt mechanism — the CSS paint stroke (Chromium renders it
on HTML text; verified by an isolated binary render test) **plus** an
em-keyed `text-shadow` outline (the same halo where the stroke does
not paint — Firefox/Safari). At the statement's full-presence beat
the VLM rates legibility over ink **8/10** with the halo clearly
separating glyphs from line-work.

## 4. The why / pains / roles plates — the residuals closed

### 4.1 WhyPanels — the NEXT STEP kiss is gone (with a guard)
The r353 residual: the chip's bottom edge sat at sy +3 — EXACTLY the
recommendation box's top-face corner (iso(33.5,−3.5,5).sy − 12 + 5 =
iso(26,−10,5).sy = +3). The anchor lifts to **−15** (a 3-unit ≈ 4px
clearance ring); the guard test recomputes the sheet geometry through
`lib/iso` from the AUTHORED seat so a re-lowered chip fails the pin.

### 4.2 IsoPains — the instruments read by SHAPE, not colour alone
- **The lecture ruler:** the r353 ticks were ~2px marks inside a
  3×4-unit face (the audit read them as «colour segments on a pole»).
  The majors now CROSS the staff's silhouette (y −10.2…−4.2, the Dim
  measure-line grammar) with minors tucked inside — the leveling-rod
  graduation reads in grayscale.
- **The day-count rail:** the same crossing grammar (majors at D+1,
  the midpoint, and the end; minors between). The r353 END tick rode
  x 23.4 — straight through the D+14 stamp's body; it re-seats at the
  rail's true terminus (x 25.6).
- **The broken tab reads as «broke AWAY» now:** three beats — the
  dashed ghost slot, a dashed FALL LINE down the cabinet's blind
  side, and the tilted SHARD resting clear on bare paper (the r353
  ghost alone read as «an empty slot»). The IDX tag lifts 2 units off
  the ghost's crown.
- **The colour law inside the wounds:** the play control and the
  correction crawl re-key ROYAL (the platform's media/data voices);
  the warm colour stays on the wounds themselves (the dying trace,
  the D+14 stamp, the gap, the shard).

### 4.3 RolePlates — five platform roles, honestly separated
The platform has EXACTLY five entry roles (STUDENT · TEACHER · ADMIN ·
QUALITY · OWNER — the auth surface's own register). The band now SAYS
so, visually and textually:
- a **group divider** under row 05 — `[05/05]` in the royal mono
  counter + «أدوار المنصّة الخمسة — وما يليها شخصيات وحالات استخدام،
  ليست أدوار دخول»;
- **kind chips** («حالة استخدام») on rows 06–08 only;
- the slides' own captions re-register: `ROLE 01/05 … ROLE 05/05` vs
  `USE CASE · …` / `BENEFICIARY · …`, with the Arabic captions
  prefixed honestly («حالة استخدام —», «مستفيد بلا حساب منفصل —»).
The r306 num-ladder (01–08), the r168b truthfulness pins and the
frozen-spec row structure all hold (32/32 pin tests re-run green). No
visitor can read eight independent entry roles off the sheet.

## 5. The colour-law ratchet — one warm focal per plate

The audit's demand: prove each plate keeps ONE clear warm focal, not a
scatter of copper points. The r353 census found the scatter; r354
retires it (every change documented at its seat):

| plate | retired warm seats | the ONE focal that remains |
|---|---|---|
| CampusArt | 4 wing quoins + 2 gate-pier quoins + the tower crown quoin (the cornerStone prop retires with its last consumer), 2 lamp crowns, the dome's oculus dot, the `--iso-signal` alias | the observatory beacon + its signal route + the two narrative flags |
| WhyPanels 01–04 | the orbiting attendance beacon, the rec-box's third line, the document's copper line, the shelf receipt mark, the council seats' first line | the attendance check · the gap cell · the scan dial · the ledger tick |
| IsoPains 01/02 | the play diamond, the correction crawl (both → royal) | the dying trace + ring · the D+14 stamp |
| RolePlates 03–08 | the live-reports line, the gauge needle (the why-panel precedent), the ledger hot tick, the three seal marks, the lens diamond + pulse, the labs pulse, the report's first line | the permissions key · the flagged institution · the keystone · the professor's copper margins · the sealed boxes · the report itself |

**Dark-mode royal verified at runtime:** `--iso-royal` resolves to
`--c-royal-deep` = **#A9B8FF** in dark (the strong text tier, 6.85:1
on the dark soft) — not the pale fill seat; measured live in the
browser through the real theme store.

## 6. The identity docs say the royal truth

- **DESIGN.md** — §1 (the LIVE law) now states the royal as the ONE
  signal with the warm sienna explicitly secondary-decorative; a
  single r354 note at §1 teaches the reader how to read the older
  rounds' «orange» language («the seat never moved — `--accent` is
  still the ONE signal; its VALUE re-keyed to the royal»). The R313
  record's `#C72E00`/5.16 sentence is preserved AS HISTORY inside an
  explicit era-note (not silently rewritten); the R325 «orange»
  phrases re-key to «signal» with the era pointer at each seat.
- **docs/mobile.md** — the visual fingerprint reads ورق/حبر/**أزرق
  ملكي** («الرقّ والأزرق الملكي» 2026); the notification tint now
  states the truth the code already lives (`app.config.ts` color
  `#2540D9`); the semantic-layer rule re-keys «عنصر إشارة واحد» to
  the royal. No `apps/mobile/**` file touched.
- **manifest.json** — the illustrations policy names the exact
  current tokens (paper `#F5F1E8` / ink `#1A1713` / royal `#2540D9`,
  dark signal `#8AA0FF`) without touching `generatedAt`, the asset
  dates, or claiming any regeneration.

## 7. The public pages audit

`/` (all sections), `/campus`, `/capabilities`, `/app` audited at
1440 light + scroll-throughs (VLM-assisted): color discipline holds
(royal = the sole primary signal; warm only as small accents), no
real text-on-drawing collisions, no clipped diacritics — the flagged
noises were scroll-stitch artifacts; the substantive contracts are
pinned by the e2e audit suites (below). No new content invented, no
stock imagery.

## 8. Gates (all measured from this branch's tree after the round)

| gate | result |
|---|---|
| **bundle** | **812.5 KB gz / 815 — PASS** (entry 65.0/92 · pdf 95.7/110). The round costs **+0.3 KB gz net** (the roles-truth furniture + the graduations + the shard + the halo − the dedupes below); the ceiling untouched, no gate weakened |
| typecheck (tsc) | PASS |
| eslint (changed files + tree) | 0 errors |
| stylelint ratchet (`stylelint-gate.sh`) | **GREEN — 40 vs baseline 40** (the round ADDS zero; the six pre-existing roles.css duplicates predate it — verified by stash-diff) |
| check-colors --strict | PASS |
| check-icons | PASS |
| check-raw-css --strict | PASS |
| check-motion-tokens | PASS |
| deadcode ratchet | GREEN — 10 at baseline, 0 regressed (the cornerStone prop + the isoBoxTop helper + the --iso-signal alias retired with their consumers) |
| size gate | **GREEN** (rule 1/2/3 — §1.1) |
| vitest (frontend, full) | **3062/3062** (3060 + this round's 2 guards) |
| e2e: r351-public-audit + r349-public-clip + r308-landing-instruments + r325-map-clip | **41/41** (text-on-text, clipped captions, horizontal overflow @1440/1024/768/390/360; stations; the map clip) |
| e2e: r312-guest-reveal + guest-landing | 6/6 |
| e2e: r312-mobile-camera | 6/6 |

(e2e on the task's own vite :5310; WebKit absent on this box — CI owns
it, per the house note. The preloader does not play on this sandbox —
2 CPU cores trip the low-cores gate — so the trace seat is verified by
the r323-loader-overlap contracts + CI, not by a local capture; the
frame math keeps the centreline through the tower's lantern.)

## 9. Visual evidence

`evidence/before` / `evidence/after` — hero (light + dark, 1440; light
@1024/390/360; dark @390), the journey's fixed mid beat + the clean
late window (light + dark), why (1440 + 768), pains (1440 + 390),
roles (1440). All WebP ≤115KB, dark captured through the REAL theme
store (`ulara-theme` → `data-theme=dark`, not emulated media). The
before set: this round's own pre-fix captures (hero, journey, why,
pains) + r353's roles shot.

## 10. Residuals (honest)

- **Zero-trace** stays red on main's own git history (§1.3) — the
  documented inherited blocker; nothing this branch adds trips it.
- **The bundle margin is 2.5 KB** (812.5/815) — the round nets +0.3 KB
  for the roles-truth furniture and the instrument graduations after
  the dedupe claw-backs (cornerStone/isoBoxTop/--iso-signal retire).
  The ceiling stands; a future bundle-diet round owns further
  reduction, as every prior lift has documented.
- The statement plaque's mid-exit beats (0.3–0.4) still show the
  statement fading over ink — transient by design (the exit completes
  at beat 0.405); at full presence the halo carries 8/10 legibility,
  and from 0.4 the drawing owns the window.
- The preloader trace seat could not be captured on this box (the
  2-core gate suppresses the intro) — geometry-verified + CI-owned.

— the visual-artwork agent, R354
