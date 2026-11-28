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

## Pass 2 — long-shot re-captures (built preview, shell opened, `sheets/dash2-*.webp`)

The pass-1 "full page" shots were viewport-only (the shell scrolls inside `.content`);
pass 2 opens the shell for the shot, so the sheets see the whole page. Fixes landed:

1. **Delta flags** — the flat-triangle flag primitive shipped (`KpiItem.deltaDir`), and
   the student dashboard's momentum strip now IS a KPI band: `58% / 1,240 / 2 / 87% /
   3.42` with the GPA flag riding its real trend («جيد جداً ▲», tone ink). Capture:
   `dash2-student` — flag renders, hairline cells, honest-empty keeps its register.
2. **Quality dashboard** — defect 3 was the dev-server chunk race; the built preview
   renders the full board (KPI band five cells with bracket indices, flagged alert rows).
   Verdict: matches.
3. **Student KPI band** — defect 5 resolved by the momentum lift; no extra band needed.
4. Teacher/admin/owner dashboards keep their compositions; their KPI cells carry mono
   captions and state hints, and flags stay OFF where the datum has no real direction
   (PENDING 6 is a state, not a trend) — the grammar flags direction only.
5. The teacher page's closed `<details>` disclosures are the repo's deliberate
   dashboard-disclosure pattern — content exists under both; captured as states, not
   defects.

### Remaining for dashboards (P6 sweep)

- Re-capture dark long-shots for all five and phone long-shots after the page loops.
- Admin/owner: consider wiring flags where the KPI payload later gains a real trend
  series (backend limitation noted in the ledger).

| Screen | Long-shot light | Verdict |
|---|---|---|
| student dashboard | KPI band + flags render, whole page coherent | MATCHES (await dark/phone in sweep) |
| teacher dashboard | KPI band + queue + disclosures; no directional data to flag | MATCHES (await sweep) |
| admin dashboard | KPI band + distribution chart + quick reads | MATCHES (await sweep) |
| quality dashboard | full board on built assets | MATCHES (await sweep) |
| owner dashboard | KPI band + alerts strip + donut | MATCHES (await sweep) |
