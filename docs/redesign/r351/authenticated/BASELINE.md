# r351 A2 — BASELINE (main@35793f7, hermetic fixtures, 430 cells)

Instrument: `scripts/e2e/route-audit.mjs` (A2-owned). Matrix: every
authenticated nav route of the five roles + deep exemplars (course detail,
lecture player, exam runner, exam authoring detail, intelligence detail,
document viewer) × viewports {1440×900, 1024×768, 768×900, 390×844} light +
the five dashboards dark @1440/390. Raw cells: `baseline/*/route-audit-cells.json`.

Runs (final, skeleton-race fixed): `student/` 154 cells · `teacher-admin/`
156 · `staff-owner/` 120. Hard failures: **0**. Horizontal overflow:
**0 cells** (all 430). Scroll-lock: n/a (content-scroller architecture).

## The 20 wordiest screens (1440, light, per-route max)

| route | role | words | taps<44 | scrollH |
|---|---|---|---|---|
| /student/dashboard | STUDENT | 297 | 25 | 1776 |
| /teacher/dashboard | TEACHER | 277 | 25 | 1619 |
| /student/university | STUDENT | 259 | 24 | 2336 |
| /vision | any | 254 | 22 | 1284 |
| /settings | any | 245 | 26 | 2142 |
| /owner/dashboard | OWNER | 224 | 22 | 1822 |
| /quality/dashboard | QUALITY | 209 | 17 | 1945 |
| /student/research | STUDENT | 196 | 25 | 1214 |
| /admin/reports | ADMIN | 190 | 16 | 2022 |
| /owner/education | OWNER | 188 | 20 | 1856 |
| /owner/system | OWNER | 183 | 20 | 1491 |
| /student/payment | STUDENT | 182 | 24 | 1636 |
| /teacher/research | TEACHER | 180 | 22 | 1384 |
| /owner/activity | OWNER | 178 | 22 | 1225 |
| /student/ai | STUDENT | 177 | 29 | 1003 |
| /teacher/ai | TEACHER | 175 | 29 | 951 |
| /colleges | any | 173 | 22 | 1138 |
| /teacher/grades | TEACHER | 173 | 25 | 1314 |
| /student/courses/:id | STUDENT | 172 | 23 | 978 |
| /admin/dashboard | ADMIN | 171 | 16 | 1428 |

Dashboards vs the ≤180 target: student 297 · teacher 277 · owner 224 ·
quality 209 · admin 171 (admin already under). **38 of 92 routes > 120 words.**

## Defect inventory (all measured)

1. **Tap-target floor broken shell-wide** — every sidebar nav row is
   55×36 px and the rail collapse toggle («توسعة القائمة») is 28×28 px;
   16–29 sub-44px targets per screen @1440 (the count collapses to 0–2
   at 390 because the desktop rail is hidden — the drawer rows pass).
2. **Identity duplication** — the topbar carries a name chip + avatar
   while the sidebar footer carries a second avatar + name + role +
   logout (two identity elements on one screen).
3. **Topbar control count** — search pill + AI button + institution
   chip + theme toggle + bell + user chip = 5–6 visible controls @1440
   (student), over the ≤4 budget.
4. **Feedback FAB** — a floating pill with a sentence label
   («أبلغ عن مشكلة / اقتراح») mounted on every authenticated screen;
   the r350 FAB-offset fix did not clear content intersections (the
   rect audit in Q1 pins it; the sweep's fixed-element overlap count
   is dominated by the decorative sheet-frame, which the Q1 audit
   excludes).
5. **[0N] section numerals out of order** — teacher dashboard renders
   02 → 01 → 03; the AI pages 02, 05, 03 (observed in r350; to be
   re-verified and removed in Q2).
6. **Bidi percent bug** — mastery chips render «%100» (task §0; the
   fix lands in Q2 with an isolate helper).
7. **Runtime errors** — all remaining cells' console errors are the
   AI pages' missing fixtures (A3's slice): 12 cells total
   (student/teacher/owner × 1024/768/390 + owner@1440).
8. **501s (missing fixtures)** — 57 endpoints at first sweep; ALL
   closed in this Q0 commit (see fixture block in
   `frontend/tests/e2e/fixtures/api-fixtures.ts` + the route table in
   `mock-transport.ts`), EXCEPT `/ai/config` + `/ai/conversations`
   which are A3's (marker block left in `mock-transport.ts`).
   Verified: **0 × 501 on non-AI authenticated routes** (430 cells).
9. **Skeleton race on cold lazy routes** (instrument finding): ~35 of
   430 first-visit cells measured the PageSkeleton (21–57 words).
   Instrument now waits for `.content .skeleton` / `[aria-busy]` to
   clear; re-measured clean (only /document viewer's 35w stays low —
   its chrome-only surface, honest).

## Notes

- The corpus renders real lists now (1–3 rows per endpoint), so the
  word counts above are the honest post-fixture baseline for Q3's
  −35% target (screens > 120 words).
- `zero-trace` gate: FAILS on the inherited base (r350 commit
  messages + CHANGELOG/docs content) — pre-existing on
  main@35793f7, documented in r350 LOG as "the one documented red".
  My commits add no new patterns (verified by diffing the gate's leak
  set main vs branch — identical).
