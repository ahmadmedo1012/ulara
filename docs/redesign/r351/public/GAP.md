# r351 — A1 PUBLIC — GAP MATRIX (P0)

Measured **2026-02-14** on the hermetic build (`vite build` + `vite preview :4301` +
fixtures), Playwright chromium, `window.scrollTo` steps (Lenis syncs via onNativeScroll),
450 ms settle per step, after one full scroll-past to arm the reveal belt.

Reference numbers from `docs/redesign/r350/reference/` (measured live, 2026-11-21).

## 1. Headline numbers

| metric | ULARA now (measured) | reference (measured) | delta |
|---|---|---|---|
| landing scroll height @1440×900 | **14,637 px** | 13,255 px | **+1,382 px (+10.4%)** |
| landing scroll height @390×844 | **12,457 px** | 10,613 px | **+1,844 px (+17.4%)** |
| rendered words (dedup aria-hidden) @1440 | **1,038** | sparse ceiling | −50% target ⇒ ≤ 519 |
| rendered words (dedup) @390 | **1,024** | — | −50% target |
| horizontal overflow @1440 / @390 | 0 / 0 | 0 | ✓ |
| console errors (prod build) | 0 | 0 | ✓ |

## 2. Section map @1440 (ULARA now vs reference)

| ULARA section | top | height | reference counterpart | ref height | gap |
|---|---|---|---|---|---|
| hero `.fo-hero` | 0 | **828** | home-hero | 987 | shorter, but crowded |
| statement `.st-section` | 828 | **910** | home-intro | 723 | +187 |
| pains `.pm-section` | 1738 | **884** | home-problem | 743 | +141 |
| chapters `.chapters` (sticky journey) | 2622 | **4,671** | home-map | 7,000 | shorter (scene sparser) |
| product `.pr-section` | 7294 | **995** | home-platform | 710 | +285 |
| why `.wy-section` | 8289 | **1,351** | home-why | 698 | **+653** |
| roles `.rl-section` | 9640 | **1,031** | home-usecase | 987 | +44 |
| vision/cta `.fo-cta` | 10670 | **940** | cta | 698 | +242 |
| footer `.fo-footer` | 11610 | **1,596** | footer | ≈555 | **+1,041** |

Section ORDER already matches the reference rhythm (hero → statement → problems → scrubbed
journey → platform/product → why → use-cases/roles → cta → footer) — no reorder needed.

**Height budget to ≤13,255:** footer −900, why −650, cta −240, product −285, statement −187,
pains −141, roles −44 ⇒ −2,447 ⇒ 12,190 ≤ 13,255 ✓ (mobile: journey + footer + why carry
the cut; target ≤10,613).

## 3. Per-section gaps, ranked by visual impact

1. **HERO — crowded stage, headline buried (worst first).** The art band carries 4 static
   zone-name leader labels («المكتبة البحثية»…) crossing the plate, static corner readouts
   (`X:56.0 / Z:24.0 / GRID:32 / ISO:30°`), north+sun compass, scale bar, 2 deco cards,
   ruler strips, ± marks — at 390 the zone titles OVERLAP the plate ink and the top edge
   clips «المكتبة البحثية». The reference hero = ONE image + crosshair + live X/Y + hint.
   The H1 sits BELOW the stage (content band last) — the reference leads with the giant
   headline. Two CTAs (register + login) + work strip crowd the fold.
2. **FOOTER — +1,041px.** A full-width university elevation plate (~550px tall) + 5 link
   columns + mission paragraph + early-access form + giant wordmark row. The reference
   footer ≈555px: menu + form + logo + hairlines.
3. **WHY — +653px.** Head (two-column grid) + 4 pillars, each with title + mono caption +
   description sentence + FAQ block («الأسئلة الشائعة» 4 items) at the tail. The reference
   why band = 698px with 4 sparse items.
4. **PRODUCT — +285px.** Two large frames each with 2–3 caption rows + drawing alt text.
5. **CTA — +242px.** Corner coordinates + title block + resolve paragraph + colleges
   registry strip (3 colleges + 3 value chips + «كيف تُبنى الكليات» explainer).
6. **STATEMENT — +187px.** 33-word scrub paragraph + VALUES strip with doubled labels
   (title + repeated chip text) + partner ticker + mono captions.
7. **PAINS — +141px.** Each card = pain + answer + 1 sentence — dense but ordered.
8. **JOURNEY — sparser than the reference (4,671 vs 7,000).** The scrub scene shows large
   empty paper at most offsets (captured y3000/y4000: headline floats over empty plate;
   the capabilities panel COVERS the drawing at y7000). The reference fills its 7,000px
   map with staged build-up. ⇒ P5 rebuilds the scene beats to compose the plate, not
   float over it.
9. **ROLES — ok height**, but 8 desks (5 roles + 3 honest personas) each carry a full
   sentence — copy cut to one short line per role.
10. **CHROME** — masthead carries 6 links + 2 CTAs + 2 icon buttons; the journey header
    chip («الفصول [04]») sits near the frame plus-marks (overlap risk at narrow widths);
    progress edge rail («01/09 الأنشاء») duplicated by the boot-log strip + scroll rule —
    three instruments answer the same question.

## 4. NOT-EXTRACTED re-check (P0 duty)

- footer pointer-lens: NOT in the extracted data (REFERENCE.md §8) — we design our own
  (pointer-following mask circle revealing the ink logo) and note it as our own design.
- ink-mask scrub drive: constants extracted (§5); the drive is our own scrubbed CSS var.
- cursor velocity trail: construction inferred from §6 — implement on our SheetCursor.

## 5. Artifacts

- shots: `shots/p0/desktop-y*.png` (21) + `mobile-y*.png` (12)
- instrument: repo-root `/tmp/p0-capture.mjs` (session tool, not committed)
