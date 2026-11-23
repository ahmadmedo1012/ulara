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
| Zero-trace | ❌ | **branch content hit fixed + inherited history blocker — §1.2** |

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

### 1.2 Zero-trace — the branch-owned hit FIXED, the inherited history blocker proven separately

The earlier text of this section was itself part of the problem and is
corrected here (honest disclosure, not concealment). The gate's CI run
failed on TWO distinct problems:

**1. Branch-owned CONTENT hit — this report's own fault, now FIXED.**
The previous revision of this file quoted the two historical commit
subjects verbatim while documenting them — reproducing a retired name
inside branch-owned content (exactly the content hit CI reported, and a
contradiction of this report's earlier "no file this branch adds
contains a retired name" claim). This rewrite refers to those commits
by hash + safe description only. After the fix, the branch re-scans
clean on both branch-owned halves:

```text
bash scripts/brand/zero-trace.sh   →
✔ content clean — no retired name in any tracked file
✔ names clean — no retired name in any tracked path
✖ retired names in the git history: (the two r350 commits below)
zero-trace: FAIL  ← the history half only
```

**2. Inherited HISTORY hits — proven ancestors of main, owner-level.**
Two r350 commits carry the retired reference identity inside their
subjects; neither was authored by this branch:

| commit | safe description | ancestry proof |
|---|---|---|
| `0227904b` | r350 CI-repairs commit (its subject contains the retired design-reference name) | `git merge-base --is-ancestor 0227904b a71d7d8` → YES — precedes the fork point |
| `669f12b6` | r350 reference-extraction doc commit (its subject contains the retired reference domain) | `git merge-base --is-ancestor 669f12b6 a71d7d8` → YES — precedes the fork point |

The fork point is the merge-base `a71d7d8` (= origin/main HEAD): both
commits entered **main's own history** before this branch existed.
Per the round's rules: the git history is NOT rewritten, the gate is
NOT weakened, no exception is added. The history half stays red until
the owner resolves main's own history (an owner-level decision —
history rewriting is outside every agent's lane); the content and name
halves pass on this branch's tree.

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

## 3. The journey statement — the overlap cured on MEASURED contrast

**The finding (the r353 defect):** the desktop plaque-2 window
(out t 2.5–3.0) held the statement over the assembled campus through
band progress 0.30–0.48 — the VLM-flagged destructive beats (glyphs
dissolving into the tower's lantern strokes; the crops:
`evidence/crops/REF-1x-journey-*` vs the before/after beats).

**The final fix (two passes, both measured):**

*Pass 1* pulled the desktop exit to the mobile window (2.2–2.6). The
final-phase pair-diff audit then showed the deeper truth: **a uniform
opacity fade cannot hold readable contrast into its tail at all** —
the statement/reference glyph-contrast metric (the A/REF screenshot
pairs at identical scroll positions; the plaques hidden by a
visibility override — pointer-transparent overlays, no layout change)
measures the drop crossing below the 3:1 WCAG large-text bar around
alpha 0.95 and falling monotonically. No exit *timing* fixes that;
the fix is to cross the degraded span fast:

*Pass 2 (final)* — **out t 2.15–2.35**: the 1.0→0.5 alpha drop spans
~0.06s of clock ≈ **16px of scroll** at 1440 (a flick, not a restable
frame), and the exit completes while the satellite layer (2.02–2.52)
is still ~2/3 resolved. The campus owns a clean reading window from
band progress ~0.36; the statement never *rests* at low contrast over
dense ink on either belt.

**The halo's true belt (a wrong claim corrected):** the r354 report
claimed a «two-belt mechanism — the CSS paint stroke (Chromium
renders it on HTML text) plus text-shadow». **The stroke belt never
painted**: stroke/stroke-width are SVG-text properties; a 12px red
stroke injected on the live plate paints ZERO pixels in Chromium
(measured live in this round). The em-keyed `text-shadow` is the ONE
belt, and it now carries a true rim — the 0.025em crisp pass + a
**0.05em solid 8-way rim** (≈2.3px at the D1 rung; the old ≤1.4px
band was half-eaten by the glyphs' own anti-aliasing) + the two soft
outer passes. The dead stroke declarations retire with the mobile
`stroke-width: 4px` override.

**The reproducible readability verdict** (the method replaces the
earlier «8/10» impression — full definition with the evidence):

| beat (band progress) | alpha | glyph luma | halo perimeter purity | verdict |
|---|---|---|---|---|
| after p0.2929 (t2.0, full presence) | 1.00 | 61.0 | **97.4%** | READABLE |
| after p0.3210 (t2.15, exit start) | 0.985 | 63.1 | **98.4%** | READABLE |
| after p0.3304 (t2.2, mid-flick) | 0.554 | 134.0 | 76.6% | transient crossing (by design, ~16px) |
| before p0.2929 (the r353 halo) | 1.00 | 61.0 | **75.7%** | halo unreliable — the defect |
| before p0.3679 (the r353 held window) | 1.00 | 60.7 | **73.9%** | halo unreliable — the defect |

The before build's halo held only ~75% of the glyph perimeter at FULL
presence; the final belt holds 97–98%. The r325 contracts hold
verbatim (r325-map-clip 4/4; the new r354-final e2e pins the exit
beats, the belt, and the clean-window invariant).

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

## 5. The two-voice colour law — the COMPLETE census (final)

The final-phase audit re-censused every `PLATE.sienna` use including
**shared-helper defaults** (the r354 pass missed them). The verdict
that emerged: the kernel's DEFAULTS must be the SYSTEM voice — a node
on the data net paints royal unless a plate explicitly claims the
warm learner focal. The law's wording never changes; the
implementation now actually satisfies it:

| seat | was | now | why |
|---|---|---|---|
| `IsoNode` default fill | sienna | **royal** | the system voice; warm is always an explicit claim |
| `Route` default stroke | sienna | **royal** | the data-path voice |
| `Leader` / `SeatLabel` dots | sienna | **royal** | annotation = system |
| `Palm` crown marker | sienna | **muted** | decorative — the campus's ONE warm cluster stays the observatory beacon + its signal route + the two narrative flags |
| CampusArt vessel watermark rect | sienna @10% opacity | **ink** | a watermark detail must not carry the signal |
| CampusArt field node | (default warm) | **royal explicit** | the plaza's data node |
| ProductPlates: timer needle, knowledge-ring diamond | sienna | **royal** | the platform's measurement/orbit voices |
| ProductPlates: question node | (default warm) | **sienna explicit** | the panel's ONE warm focal — now an honest explicit claim |
| ProductPlates: answer lines, review-plan lines | first line sienna | **all muted** | record voice; no competing warm stripes |
| WhyPanels 01 checkpoints | middle node sienna | **all neutral top** | the attendance check stays the panel's ONE warm focal |
| (r354 pass, kept) | cornerStone quoins, lamp crowns, the dome oculus, the secondary ledger/lens/pulse marks, the IsoPains play diamond + crawl | **retired/royal** | the original scatter retirement |

After the census the warm inventory per plate: **CampusArt** — the
observatory beacon + its signal route + the gate pennant + the tower
flag (one coherent narrative cluster); **WhyPanels** — one focal each
(the attendance check · the gap cell · the scan dial · the ledger
tick); **IsoPains** — the wounds themselves (the dying trace + ring ·
the D+14 stamp · the gap · the shard); **RolePlates/PRODUCT** — the
seats the r354 census already retired to single focals. Grayscale
legibility: the measurement instruments read by shape (the crops/
`15*-gray` evidence); dark-mode royal verified at runtime:
`--iso-royal` resolves to **#A9B8FF** in dark (the strong text tier)
through the real theme store (pinned by the r354-final e2e).

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

## 8. Gates (re-measured from the FINAL branch tree — the closure run)

| gate | result (this round's closure run) |
|---|---|
| **bundle** | **812.6 KB gz / 815 — PASS** (entry 65.0/92 · pdf 95.7/110). The final pass costs **+0.1 KB** net (the exit retiming + the census re-keys are value swaps); the ceilings untouched |
| typecheck (root: backend + frontend + both test trees) | PASS |
| eslint | 0 errors (14 pre-existing warnings) |
| stylelint ratchet (`stylelint-gate.sh`) | **GREEN — 40 errors vs baseline 40, held** (the raw `lint:css` output reports the pre-existing baseline set; the ratchet is the enforced authority) |
| check-colors --strict · check-icons · check-raw-css --strict · check-motion-tokens | all PASS |
| tokens build --check | PASS (mobile + brand twins byte-identical) |
| deadcode ratchet | GREEN (the earlier retirements hold; nothing new regressed) |
| **size gate** | **GREEN** — rule 1 ok (7 allowlisted legacy), **rule 2: docs 40,572KB ≤ 40,960KB**, rule 3: the final push adds ~1,587KB (≤5MB; the branch's total docs delta vs main ≈ 4.65MB ≤ 5MB) |
| vitest frontend (full) | **3062/3062** |
| vitest backend (DB-free) | **2161 passed / 19 skipped** (the disposable-Postgres integration file — CI owns its run) |
| **e2e r354-final (NEW — 18 checks)** | **18/18** — the hero geometry ×6 belts, the keyboard station, the exit beats desktop+mobile, the halo belt, the RM settled plates, the NEXT STEP rendered clearance, the three pains instruments, the roles truth + accordion, the dark tier |
| e2e: r325-map-clip + r349-public-clip + r308-landing-instruments | **26/26** |
| e2e: r312-guest-reveal + r312-mobile-camera + r351-public-audit | **25/25** |
| e2e: r305 (shell + theme + reduced-motion) | **76/76** |

(e2e on the round's own vite :5310/5311 pair; WebKit absent on this
box — CI owns it (the PR-triggered iOS run completed green on the last
audited round); the preloader does not play on ≤2-core sandboxes — the
r323-loader-overlap contracts + CI own that seat.)

## 9. Visual evidence — the REBUILT set (matched-pair truth)

The earlier set's defects (mismatched routes in the hero pair,
unmatched journey progress, non-deterministic why captures) are cured
by the full rebuild: **every pair is the same route, same viewport,
same theme path, same scroll position, same capture method** — the
only variable is the tree (AFTER = the branch HEAD code commit;
BEFORE = 7c15daf, the r353-final pre-round tree). Full per-shot
conditions in **`evidence/MANIFEST.json`** (route, commit, browser,
viewport, theme, scroll progress, capture state, counterpart).

- **hero**: `before/after/01-hero-home-1440-light` — the SAME homepage
  route both sides (the old «after» shot was a different page
  entirely); + dark 1440/390, light 1024/390/360.
- **journey (matched band-progress beats)**: desktop
  `1x-journey-p{2554,2929,3210,3304,3398,3585,4054,4804}` (after) vs
  `p{2929,3304,3679,4054,4429,4804}` (before — the old 2.5–3.0
  window), mobile `2x-journey-m-p{0812,1122,1451}`, dark
  `12/13-journey`, RM `31/32-journey-rm`; **the REF pairs**
  (`crops/REF-*`) capture the identical beats with the statement
  hidden — the pair-diff metric's input; the statement line close-ups
  ride `crops/1x-journey-*-line`.
- **why**: 1440×1200 before/after (all four panels fully seated — the
  old 900px shots cropped panels 3–4), 768, RM settled state, and the
  four 2x panel crops (`crops/why-p{1..4}-{before,after}`).
- **pains**: 1440/390 bands + the instrument close-ups at 2x
  (`crops/15{a,b,c}-*-{before,after}`) **+ grayscale**
  (`crops/15{a,b,c}-*-gray-after`) proving the shape legibility.
- **roles**: the band before/after + `16a-roles-usecase-open`
  (row 06 opened via its keyboard-operable icon, deck at [06/08]).

All WebP ≤115KB; dark through the REAL theme store; RM through real
media emulation (not a class toggle).

## 10. Residuals (honest)

- **Zero-trace**: the branch-owned content hit (this report's earlier
  revision quoting historical commit subjects) is fixed — the content
  and name halves pass on this branch's tree. The gate stays red on
  main's own git history (§1.2) — the documented inherited blocker
  (two r350 commits, ancestry-proven); owner-level resolution.
- **The bundle margin is 2.4 KB** (812.6/815) after the final pass.
  The ceilings stand; a future bundle-diet round owns further
  reduction.
- The journey statement's exit flick (t 2.15–2.35) crosses below the
  3:1 bar by design — the crossing spans ~16px of scroll and the
  statement is never AT REST in it (the r354-final e2e pins the
  beats); at full presence the halo belt holds 97–98% perimeter
  purity.
- The preloader trace seat could not be captured on this box (the
  2-core gate suppresses the intro) — geometry-verified + CI-owned.
- The `.jt-anno` CSS block in journey.css has no markup consumer
  (an orphaned seat predating this round) — flagged for the owner's
  CSS-diet; removing it is outside this round's lane (the stylelint
  baseline owns the count).

---

# 11. FINAL CLOSURE (the final-phase handoff)

## A. Final code state

- Final branch HEAD at this writing: **bc0444e** (the closure
  evidence/docs commits follow it; the PR page carries the live tip).
- Base: **a71d7d8** (`origin/main`). 20+ commits ahead, 0 behind —
  18 carried from R353/R354 + the final-phase commits (the code fix,
  the e2e belt, the evidence rebuild + this closure).
- Scope confirmation: `frontend/src/components/landing/**`,
  `frontend/src/styles/landing/journey.css`,
  `frontend/tests/e2e/r354-final.e2e.ts`,
  `docs/redesign/r354/**`. No backend, no `apps/mobile/**`, no
  workflows, no gates, no shared tokens, no other agent's files.
- Main files: `IsoJourneyScene.tsx` (the exit retiming),
  `journey.css` (the halo belt), `kernel/Iso.tsx` + the four plates
  (the census), `r354-final.e2e.ts` (the 18-check belt), the evidence
  set + MANIFEST.

## B. Defects and corrections (each with its guard)

| defect | root cause | correction | guard |
|---|---|---|---|
| the hero before/after pair compared different routes | the old «after» shot was captured on `/campus`-family content while named as the homepage hero | both sides re-captured on `/` at scroll 0, matched viewport/theme/method | the MANIFEST's route+state fields; the e2e hero belt pins the route's own geometry |
| journey before/after at unmatched progress (~32% vs ~38%) | the beats were chosen per-build, not per-band-progress | both builds scrolled to the SAME pRaw values via the r312 convergence scroll (the pin JSONs record the achieved pRaw) | r354-final e2e: the exit beats at exact clock t |
| the statement unreadable in its exit tail | a uniform opacity fade physically cannot hold 3:1 into its tail (measured) | the exit window re-timed 2.15–2.35 — the degraded span crossed in ~16px of scroll; the exit completes before the satellite layer resolves | r354-final e2e: presence/fall/gone beats + the clean-window invariant |
| the halo unreliable (75% perimeter purity at full presence) | the «SVG stroke on HTML text» belt never painted (wrong r354 claim); the shadow band was ≤1.4px | the shadow belt carries a 0.05em 8-way rim (97–98% purity measured); the dead stroke declarations retired | r354-final e2e: ≥12 shadow passes + stroke retired |
| why captures showed faint/unfinished panels | the CSS loops' pre-iteration opacity-0 state was captured mid-cycle | captures FREEZE every animation at its canonical 35% phase (progress-based animations skipped); the RM belt pins the settled outcome | r354-final e2e: under RM every loop element rests at opacity 1 |
| pains refinements unverifiable at full-band scale | the instruments are ~170px art cells | 2x close-up crops + grayscale pairs ship per instrument | r354-final e2e: the ruler/tick/shape assertions on real SVG rects |
| NEXT STEP chip kissing the rec box | the authored anchor sat the chip's bottom ON the box's corner | the anchor lifted −12→−15 (3-unit ring) | r354-final e2e: the rendered clearance ≥2px (SVG client rects) |
| warm scatter beyond the claimed focals | the kernel's shared defaults were warm (IsoNode/Route/Leader/SeatLabel/Palm) | the defaults re-key royal/muted; warm survives only as explicit focal claims | the census table §5 + check-colors --strict |
| the report's zero-trace claim contradicted CI | the report quoted historical commit subjects verbatim | hash+safe-description references only; honest §1.2 disclosure | zero-trace content/name halves green |
| PR description's commit count (17 vs 18) | a stale count | corrected in the PR body at push time | the PR page |

## C. Evidence

`evidence/{before,after,crops}` + `evidence/MANIFEST.json` — every
shot's route/commit/browser/viewport/theme/scroll/state recorded. The
matched pairs and what each demonstrates:

- `01-hero-home-1440-light` (before/after): the same homepage; the
  campus window 486→756px wide (33.7%→52.5% of the band), the
  stations re-seated onto the volumes (the geom JSONs in the capture
  meta record the exact rects).
- `1x-journey-p*`: the matched beats — before holds the statement at
  full opacity over the resolved campus through p0.368+; after clears
  by p0.3585 while the satellites still resolve.
- `crops/REF-*`: the same beats with the plaques hidden — the
  pair-diff metric's substrate (§3's table).
- `crops/why-p*`: the four panels complete both sides; the NEXT STEP
  clearance visible in p2.
- `crops/15{a,b,c}-*`: the ruler graduations, the D+14 tick clear of
  the stamp, the broken tab's three beats — each with grayscale.

## D. Verification matrix (the closure run — this tree, this box)

| check | command | result |
|---|---|---|
| typecheck | `npm run typecheck` (backend+frontend+tests) | PASS |
| eslint | `npm run lint` | 0 errors (14 pre-existing warnings) |
| vitest frontend | `npm --prefix frontend run test` | **3062/3062** |
| vitest backend | (root `npm test`) | **2161 passed, 19 skipped** (DB-integration — CI owns) |
| e2e new | `playwright test tests/e2e/r354-final.e2e.ts` | **18/18** |
| e2e guards | r325 + r349 + r308 | **26/26** |
| e2e guards | r312×2 + r351 | **25/25** |
| e2e r305 | `npm run test:r305` | **76/76** |
| build + bundle | `npm --prefix frontend run build` + `node scripts/check-bundle-size.mjs` | **812.6/815 KB gz** (entry 65.0/92, pdf 95.7/110) |
| stylelint ratchet | `scripts/gates/stylelint-gate.sh` | GREEN 40=40 |
| colors/icons/raw-css/motion | the four `scripts/check-*.sh` | all PASS |
| tokens | `node scripts/tokens/build.mjs --check` | PASS (twins identical) |
| size gate | `scripts/gates/size-gate.sh` (staged) | **GREEN** (docs 40,572≤40,960KB; push +1,587KB≤5MB) |
| zero-trace | `bash scripts/brand/zero-trace.sh` | content ✔ names ✔ history ✖ (inherited, §1.2) |
| WebKit iOS | CI `ios-webkit` job | not runnable on this box (no WebKit libs, no root); CI owns — the last PR-triggered run completed green |

Not run locally (owner/CI-owned per the house rules): the disposable-
Postgres DB integration, the full heavyweight verify matrix, the iOS
WebKit belt, the production deployment checks.

## E. Residual risks

1. **Zero-trace history** (§1.2): owner-level — requires a main
   history decision outside every agent's lane. Disclosed, proven,
   not bypassed.
2. **Bundle margin 2.4KB**: any future landing addition needs a
   diet first; the ceilings are the CI authority (AGENTS.md's older
   770KB reference is stale vs the gate's 815KB — flagged to the
   owner, the gate untouched).
3. **The exit flick** (t 2.15–2.35): by design and guarded; if a
   reviewer wants a longer readable tail, the physics says the
   statement must exit BEFORE the ink resolves further (a placement
   change), not fade slower.
4. **WebKit**: verified by CI only (the skipped PR run earlier was a
   workflow-order artifact; the completed run was green).
5. **The `.jt-anno` orphan CSS** — owner's CSS-diet lane.

## F. Final PR status

- PR **#40 remains OPEN and unmerged**; the branch
  `agent/ulara-visual-artwork` remains separate; no other branch was
  touched; no force-push; no history rewrite.
- The PR description is refreshed at push time (the honest commit
  count, the final-phase summary, the ECC triage below).

### The ECC bot triage (the generic warnings)

- «role-owner paths deleted»: the diff's deletions under
  `frontend/public/` are **static illustration assets retired by the
  R353 rebuild** (dead 3.4MB of pre-rebuild art) — no authorization,
  authentication or role-ownership code path is touched by this
  branch (the changed-file list is landing visuals + docs + tests
  only).
- «reference-readiness»: the round's reference materials live under
  `docs/redesign/**` as historical evidence; adding RAG corpora or
  evaluator datasets is outside this branch's lane and would violate
  the ownership rules — not applicable.

— the visual-artwork agent, R354-FINAL
