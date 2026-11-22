# R352 — HANDOFF

## 1. Endpoint → screen map

Complete in **API-USAGE-MAP.md** (every contract §0–§12 operation the workspace
consumes, screen by screen). Summary: 78 contract operations consumed; 4 consumed
in the client but not yet surfaced as standalone UI (people PATCH edit dialog,
appointment :id standalone screen, equipment↔program link screen, council PATCH
dissolve flow) — recorded as follow-ups, never fake-implemented.

## 2. Missing operations / contract gaps (for the backend agent)

1. **Learner search** — enrollments/credentials/placements take `studentProfileId`
   but no institutional learner-list endpoint exists; the UI currently reads the
   platform's `/admin/students` catalog for options (works, but an
   institution-scoped `GET /institutional/learners?category=STUDENT|TRAINEE&q=`
   would be the honest source — Law 21/2023's طالب≠متدرب distinction is in the
   data model's `learnerCategory` already).
2. **Evidence/minutes byte upload** — metadata only this round (contract's own
   scope); the UI records `documentRef`/`fileUrl` strings.
3. **Meeting agenda PATCH / resolution transitions** — consumed as contracted;
   no gaps found beyond the above.

## 3. Follow-ups (this PR's recorded residuals)

| # | Item | Why deferred | Where it lands |
|---|---|---|---|
| F1 | **Native mobile app screens** for the institutional APIs | PR #32 owns `apps/mobile/**` (the never-do list); the web workspace is mobile-browser-verified at 360/390 | The mobile track's next round — the APIs are mobile-capable per the contract |
| F2 | **Bundle ceiling decision** | Measured 804.7 KB gz vs the 770 ceiling (+4.5%) — the gate is lead-owned (AGENTS.md never-do; this task's §10) | The lead: documented raise (repo precedent r320/r323/r326/r337) or a dedicated diet round; LOG.md §bundle carries the numbers |
| F3 | **roleLabels ADMIN twin mirror** («إدارة المؤسسة») | The backend PR #35 changed the backend map; the belt test on MAIN still pins both maps to «المسجل العام» — mirroring here would break main's belt | Lands together with (immediately after) the backend PR's merge — the backend branch itself documents this as the designed expected-red coordination signal |
| F4 | Pixel-level screenshot verification of the authed shell | Fleet rasterization quirk (the repo's own admin dashboard paints blank in headless captures here — full trail in LOG.md); DOM/geometry verification stands | QA on a machine where the authed shell rasterizes; the 104 screenshots are archived in `screenshots/` |
| F5 | axe-core scans + manual SR pass (NVDA/VoiceOver) | Not executable in this sandbox | QA follow-up (ACCESSIBILITY-PLAN) |
| F6 | People edit dialog (PATCH consumed, UI pending); appointment standalone detail; equipment↔program support screen; council dissolve flow | The registry's core operations (create/status) cover today's workflows; these are additive screens on already-consumed endpoints | Next frontend round on this namespace |

## 4. Integration notes for reviewers

- **Merge order**: this PR is coordinated with backend PR #35 — the institutional
  routes 404/501 on main's backend until #35 merges (the workspace renders its
  honest error states meanwhile; no invented data).
- **PR #36 (palette)**: zero file overlap; the workspace uses semantic tokens
  only, so any global palette merges cleanly on top.
- **The e2e fixtures** seed the r178 `/auth/me` context fields and the `ula-auth`
  v1 shape — the documented grammar for any future institutional spec.

## 5. File ownership map (this PR)

New: `frontend/src/{lib,hooks,components,pages,styles}/institutional/**`,
`frontend/tests/unit/r352-*.test.ts(x)`, `frontend/tests/e2e/r352-*.e2e.ts`,
`docs/redesign/r352/institutional-frontend/**` (incl. `screenshots/`).
Modified (integration only): `frontend/src/lib/routes.ts`, `frontend/src/lib/nav.ts`,
`frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx` (titles).
Untouched: backend, mobile, shared, scripts, gates, root files, landing/brand/
tokens/palette, every other agent's surface.
