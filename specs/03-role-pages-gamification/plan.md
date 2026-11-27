# Plan 03: role pages + the gamification layer

## Constitution check
- Reference wins: role surfaces take the warm world; retired sheets
  deleted, not overridden.
- Zero-trace; visual test first per family.
- Floors per README; bundle ceiling held by retiring replaced sheets.
- Arabic-first RTL, both themes, phones composed.
- Scope: `frontend/src/pages/{student,teacher,admin,owner,
  institutional}/**`, their style sheets, the gamification surface.
  No backend work.

## Technical approach
- Wave order: student first (largest, proves the pattern), then
  teacher, admin, owner, institutional. Each wave: inventory the
  family's sheets, retire what the world covers, fix what it does not
  with additive classes in the family's own sheet.
- The gamification page is rebuilt on the landing's band components
  (progress readout, streak week, level ladder, milestone list)
  parameterised by real selectors; the components move into a shared
  `components/gamification/` so the landing and the product share one
  source.
- `+N` rise line: reuse the landing's `PointsGain` for XP moments
  already recorded by the app (e.g. completing a recorded activity);
  no new earn events invented.

## Files in scope
- `frontend/src/pages/student/**` (wave 1), `teacher/**`,
  `admin/**`, `owner/**`, `institutional/**`.
- `frontend/src/styles/{student,admin,owner,teacher,institutional}/**`.
- `frontend/src/components/gamification/` (new shared home),
  `frontend/src/pages/student/GamificationPage.tsx`.

## Rules to change (with reason)
- Page-family sheet ownership: family sheets shrink to page-specific
  exceptions; the world owns shape. Reason: one grammar, one audit.

## Capture/compare harness
- `capture.mjs` with the per-role test accounts; one representative
  page per family pattern (list, detail, authoring, dashboard) plus
  the gamification page, at 1440/820/390 × light/dark.
- Critique judges consistency with the landed landing + shell.

## Phone/tablet strategy
- Card-stack tables below 768; authoring flows keep their desktop
  layout at ≥1024 and get a composed phone layout, never a squeeze.

## Research notes
- specs/00 §4 scenes 03/04/05 (progress/rewards/habits grammar),
  §8 honesty; LEDGER r369-mat vocabulary ruling.
