# Plan 01: the inner public pages

## Constitution check
- Reference wins: the landing's grammar extends inward; the old
  per-page sheets give way. Old page-specific CSS that fights the
  world is deleted, not overridden.
- Zero-trace: only "the reference" in any artifact; run the gate.
- Visual test first: each template gets a failing capture sheet
  before its components are written.
- Floors: all gates listed in README §constitution; bundle stays
  ≤ 832 KB gz (827.6 today; this slice must stay roughly neutral by
  deleting the sheets it replaces).
- Arabic-first, RTL, both themes, phones composed.
- Scope: `frontend/src/pages/**` public routes, their styles, shared
  public sections. No backend change; reads use existing endpoints.

## Technical approach
- One new sheet `frontend/src/styles/landing/r369-pages.css` holding
  the five templates (T1–T5) as composable classes; no new component
  names beyond the template set. `world.css` stays the only global
  shape sheet.
- Shared sections become components under
  `frontend/src/components/landing/r369/`: `PageKicker`,
  `PageHead`, `FactChips`, `StateCard` (loading/empty/error),
  `DoorGrid`, `ArticleBody`, `DetailRail`, `MediaPlate`.
- Pages mount the public `LandingNav` + footer already used by the
  landing; T4 pages may mount the stage navigator with in-page stages.
- Data: colleges/leaderboard/competitions read the existing public
  API hooks; each gets the three states through `StateCard`.
- Auth pages: re-skin only (tokens + world shapes + T5 layout). Form
  logic, validation, and flows are out of scope except class names.

## Files in scope
- `frontend/src/pages/PublicPages.tsx`, `legal/`, `auth/` (skin),
  `campus/`, `capabilities/`, `colleges/`, `competitions/`, `vision/`,
  `NotFoundPage.tsx`, `AppDownloadPage.tsx`, `BrandPage`/`__design`
  only to keep them building.
- `frontend/src/styles/{help,about,legal,errors,plates,vision,research,campus-media}.css`
  — merged into `r369-pages.css` and deleted.
- New: `frontend/src/components/landing/r369/pages/*`,
  `frontend/src/styles/landing/r369-pages.css`.

## Rules to change (with reason)
- Page-length ceiling relaxed for T4 pages (showcase grammar needs
  bands); bundle ceiling is NOT relaxed.

## Capture/compare harness
- Reuse `docs/redesign/r369/capture.mjs` + `audit.mjs`; add a routes
  list. Sheets at 1440/1024/820/768/390/360/320 × light/dark.
- Reference comparison is per-template against the study frames, not
  per-page pixel matches (the reference has no college detail page).

## Phone/tablet strategy
- T1 prose column full-bleed with page gutters; T2 grids 1-col;
  T3 rail stacks; T4 bands stack with media first where it leads;
  T5 centred card capped at 480px.

## Research notes
- See specs/00 §4 (scenes), §5 (chrome), §2 (type) for the grammar.
- Existing pages keep their copy unless it breaks the honesty voice;
  «نجوم» never appears (نقطة إتقان where a unit is needed).
