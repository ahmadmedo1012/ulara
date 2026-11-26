# r365 — critique sheets, pass 1 (dashboards, desktop 1440 light/dark, phone 390 light)

Sheets: `evidence/sheets/dash-{student,teacher,admin,quality,owner}.webp` — ULARA capture
beside the closest reference composition (the product dashboard capture; the reference's
KPI/dashboard grammar is corpus-derived, see `../product-grammar.md` §3).

## What already matches (do not regress)

- Sheet frame, registration crosses, hairline cells, bracket indices `[01]`, mono
  eyebrows/captions, huge Arabic display titles, royal accent — all five dashboards carry
  the grammar natively; language/brand are the only differences from the reference's
  constructions.
- Dark theme holds (ink inverts, hairlines survive, royal → `#8AA0FF`), phone composes
  (bottom bar, stacked KPI cells, labelled row cards, bottom-sheet grammar).

## Defect list (each must be fixed and re-captured)

1. **Delta flags absent from every KPI band.** The reference's KPI grammar is numeral +
   flat directional flag; our bands show bare numerals (admin, owner, teacher). → P1
   primitive shipped (`deltaDir`); wire real deltas where data supports direction.
2. **Teacher dashboard, bottom section renders header-only.** «الأداء والمتابعات» shows a
   section header with an empty band under it — either a reveal-race in capture or a
   genuine missing empty state. Must resolve to content or `SheetEmpty`; re-capture.
3. **Quality dashboard captured as a route-level skeleton in pass 1.** Lazy-chunk compile
   race in dev; the preview-based matrix (built assets) is the deciding capture. If it
   still pends, it is a real defect.
4. **Admin/owner dashboards show no callout-flag rows on KPI deltas** and the admin
   «بحاجة إلى إنجاجهات» quick-reads strip is header-only — same loading-closure audit as
   (2).
5. **Student dashboard lacks a KPI band entirely** (the term ruler + dark lecture card
   play the hero). Acceptable composition, but the reference grammar wants at least one
   huge-numeral band on the primary dashboard — decide: add a compact KPI band (courses
   in progress / pending work / attendance / GPA) or document the exception in the
   critique of the page loop.
6. **Dark topbar bell/badge contrast** — verify by audit (contrast run), fix if flagged.

## Verdict per screen (pass 1)

| Screen | Light | Dark | Phone | Verdict |
|---|---|---|---|---|
| student dashboard | matches, KPI band missing (5) | pending preview matrix | matches | NOT FINAL |
| teacher dashboard | matches, bottom section empty (2) | pending | matches | NOT FINAL |
| admin dashboard | matches, deltas (1) | matches | matches | NOT FINAL |
| quality dashboard | (3) race — recapture | (3) | pending | NOT FINAL |
| owner dashboard | matches, deltas (1) | matches | matches | NOT FINAL |
