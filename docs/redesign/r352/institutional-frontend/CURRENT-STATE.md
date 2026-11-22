# R352 — CURRENT-STATE (frontend audit → what this PR changes)

## Baseline audited (origin/main @ 5892504)

- **Stack**: React 18.3 + Vite 5 SPA, react-router-dom 6, TanStack Query 5, zustand,
  react-hook-form + zod, chart.js; served by the Express backend (workspaces:
  `backend`, `frontend`; npm only).
- **Shell**: `App.tsx` (963 lines) — lazy route table, `ProtectedRoute({allow})`,
  `AppShell` (sidebar/topbar/bottom-nav, skip link, title resolver), role homes.
- **Auth/session**: `stores/auth.store.ts` (persist `ula-auth` v1: user, accessToken,
  memberships, currentInstitution, membershipRole); `lib/api.ts` — native-fetch
  transport with the axios-shaped seam (`api.defaults.adapter` for tests), Bearer +
  single-shot 401 refresh, `{ data }` / `{ error: { code, message } }` envelopes,
  `unwrap`.
- **Queries**: institution-scoped keys append the scope segment LAST
  (`withInstitutionScope`, r179 convention); retry policy `shouldRetryQuery`
  (4xx = final).
- **Design system**: semantic tokens (`tokens.css` wins over DESIGN.md); gates —
  `check-colors --strict`, `check-raw-css --strict`, `check-icons`,
  `check-motion-tokens`, css-counts ratchet, stylelint (errors-grows-above-baseline);
  bundle gate `check-bundle-size.mjs` (**770 KB gz total / 92 entry / 110 pdf**).
- **Patterns (frozen contract)**: PageFrame, PageHeader, SectionHeader, RowList,
  SplitView, StatLine, FilterBar (prefixed `pf-`, imported from `main.tsx`).
- **Route/title laws**: `routes.ts` = the single source; nav↔routes consistency +
  route-title coverage tests pin every route.

## Open-PR collision check (re-verified at implementation time)

- **PR #35** (backend r352): `backend/**` + `docs/redesign/r352/institutional-backend/**`
  only — no frontend files. **No collision.** Its API-CONTRACT.md is consumed here.
- **PR #36** (unified blue palette): `frontend/src/brand/**`, `chartTheme.ts`,
  `BrandPage.tsx`, `SheetCursor.tsx`, `styles/tokens/**`, several style sheets
  (`admin/components/landing/notifications/patterns/polish/training/unified-parity.css`)
  + `AGENTS.md` + mobile. **None of my files overlap** — I touch no global token,
  no palette file, no landing/brand surface. My single CSS sheet is
  `styles/institutional/workspace.css` (new).
- PRs #32/#33/#34 are CLOSED (merged) — their surfaces are main's; this PR adds a
  NEW namespace instead of editing their pages.

## Files this PR changes (complete)

**New** (all under `frontend/src/` + `frontend/tests/` + this docs directory):
- `lib/institutional/{types,labels,api}.ts`, `hooks/institutional/queries.ts`
- `components/institutional/{modules.ts,shell.tsx,kit.tsx}`
- `pages/institutional/{OverviewPage,OrganizationPage,PeoplePage,PositionsPage,AccessPage,CouncilsPage,CouncilDetailPage,ProgramsPage,ProgramDetailPage,TrainingPage,StudentsPage,QualityPage,LicensesPage,FacilitiesPage,ResearchPage}.tsx`
- `styles/institutional/workspace.css`
- `tests/unit/r352-institutional-{labels,modules,api,gating}.test.ts(x)`
- `tests/e2e/r352-institutional-workspace.e2e.ts`, `tests/e2e/r352-visual-capture.e2e.ts`

**Modified** (integration only, none owned by an open PR):
- `lib/routes.ts` (+24 seats), `lib/nav.ts` (+3 entries), `App.tsx` (+55 lines: the
  lazy block), `components/layout/AppShell.tsx` (+18 lines: titles only).

## Measured state after this PR

| Check | Result |
|---|---|
| `tsc --noEmit` (typecheck incl. tests) | 0 errors |
| ESLint (changed files) | 0 errors / 0 warnings |
| Vitest (full suite) | 3060 passed / 0 failed (36 of them new r352) |
| Production build | ✓ (7.79s) |
| Design gates (colors/raw-css/icons/motion) | PASS (all four) |
| css-counts ratchet | 52 important / 71 rawZ / 36 rawHex — **no growth** |
| stylelint (my sheet) | 0 errors (5 warning-tier no-descending-specificity, tracked not enforced) |
| Hermetic e2e (r352 journey, 5 tests) | 5 passed |
| 360/390px horizontal overflow (all 13 sections) | ≤ 0px everywhere |
| Bundle gate | **804.7 KB gz > 770 ceiling (+4.5%)** — see LOG.md §bundle |
