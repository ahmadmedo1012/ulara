# PR: [R352][Frontend] Institutional Operating Workspace, Academic & Technical Management

## Scope

The complete frontend experience for ULARA's institutional expansion: a distinct,
Arabic-first RTL **Institutional Workspace** under `/institution/**` — inside the
existing authenticated shell (no shell redesign) — supporting universities,
academies, research bodies, technical colleges, higher/intermediate technical
institutes, and vocational training centers.

**13 sections:** نظرة عامة · الهيكل التنظيمي · الأفراد والكوادر · المناصب
والتعيينات · الصلاحيات والأدوار · المجالس واللجان · البرامج والخطط الدراسية ·
التدريب العملي · الطلاب والمتدربون · الجودة والاعتماد · التراخيص والتفتيش ·
المعامل والموارد · البحث المؤسسي (+6 detail routes).

## API contract dependency

Coordinated with **PR #35** (`r352/institutional-backend`): the published contract
`docs/redesign/r352/institutional-backend/API-CONTRACT.md` (branch
`r352/institutional-backend`) is the consumed source of truth — **78 operations,
paths/fields/capabilities byte-faithful, nothing invented** (the wire contract is
pinned by `tests/unit/r352-institutional-api.test.ts`). Until #35 merges, the
institutional routes on main's backend answer 404/501 and the workspace renders
its honest error states. Full endpoint↔screen map: `API-USAGE-MAP.md`.

## What's inside

- **Contract layer** — typed DTOs, the Arabic label registry (every contract enum;
  statutory wording per the backend's LEGAL-MATRIX), one typed function per
  operation, institution-scoped query families + the `useInstActions` mutation
  dispatcher.
- **Real workflows** — org-unit tree/list CRUD with invalid-parent prevention;
  the statutory staff directory; appointments with scope-aware unit options and
  decision references; the role/membership/scoped-grant/capability separation
  (server-authoritative — the UI only reads `/me/permissions`); the full council
  meeting lifecycle (agenda → attendance → resolutions → minutes draft/approve/
  sign); program versions with the one-ACTIVE rule linked to the EXISTING courses
  catalog; enrollments + statutory credentials rendered from the catalog;
  internal-QA self-assessment kept separate from external accreditation/licenses/
  inspections/findings/corrective-actions; physical facilities/equipment/work
  orders/reservations/safety; research projects/teams/outputs.
- **Integration** — 24 route seats, 19 lazy chunks, nav entries for
  ADMIN/OWNER/QUALITY, WCAG route titles. No file owned by PRs #35/#36 is touched;
  no global token, palette, gate, or baseline is modified.

## Verification (measured in this branch)

| Check | Result |
|---|---|
| Typecheck (`tsc -b --noEmit`, incl. tests) | **0 errors** |
| ESLint (all changed files) | **0 errors / 0 warnings** |
| Vitest (full suite) | **3060 passed / 0 failed** (36 new r352) |
| Production build | ✓ 7.79s |
| Design gates: colors / raw-css / icons / motion | **PASS (all four)** |
| css-counts ratchet (important/rawZ/rawHex) | 52/71/36 — **no growth** (z-rungs tokenized) |
| stylelint (the new institutional sheet) | 0 errors |
| Hermetic e2e journey (5 tests) | **5 passed** |
| 360/390px horizontal overflow — all 13 sections | **≤ 0px everywhere** |
| Visual matrix | 104 screenshots @ 1440/820/390/360 × light/dark (`docs/.../screenshots/`) |
| Route-title coverage (WCAG 2.4.2) | green (18 new titles) |
| **Bundle gate** | **804.7 KB gz > 770 ceiling (+4.5%) — see residual #1** |

## Known residuals (documented in HANDOFF.md)

1. **Bundle ceiling (+34.7 KB gz over)** — the gate file is lead-owned (AGENTS.md
   never-do; this task forbids touching gates). Two diet rounds already executed
   (mutation-hook factory collapse, dead-code removal); the remaining weight is
   the 13 modules' product content. **Needs the lead's documented raise** (repo
   precedent: r320/r323/r326/r337) or a dedicated diet round. LOG.md §bundle.
2. **Pixel-verification of the authed shell is fleet-limited** — the repo's own
   `/admin/dashboard` paints blank in headless captures in this sandbox (both
   chromium binaries; landing paints; DOM/geometry/fonts all verified — full
   trail in LOG.md). Verification rests on the DOM/visibility/geometry
   assertions; screenshots archived for a machine that rasterizes the authed shell.
3. **Native mobile screens** deferred to the mobile track (PR #32 owns
   `apps/mobile/**`); web is mobile-browser-verified at 360/390.
4. **roleLabels ADMIN mirror** («إدارة المؤسسة») lands with/after PR #35's merge
   (main's belt test pins both maps today — the backend branch documents the
   expected-red coordination).
5. Additive follow-ups on consumed endpoints: people edit dialog, appointment
   standalone detail, equipment↔program screen, council dissolve flow, axe-core
   scans + manual SR pass (QA).

## Docs

`docs/redesign/r352/institutional-frontend/`: PLAN · CURRENT-STATE ·
UX-ARCHITECTURE · SCREEN-MATRIX · API-USAGE-MAP · ACCESSIBILITY-PLAN · TEST-PLAN ·
LOG · HANDOFF (+ screenshots/).

## Files changed

**New:** `frontend/src/{lib,hooks,components,pages,styles}/institutional/**`,
6 test files, the docs set. **Modified (integration only):** `routes.ts`,
`nav.ts`, `App.tsx`, `AppShell.tsx` (titles). Frontend-only; no merge, no
force-push, no other agent's files.
