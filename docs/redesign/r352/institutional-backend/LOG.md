# R352 — LOG (measured progress)

## Session 1 — 2026-11-22 (Africa/Tripoli)

- Base: `origin/main` @ `b92185c062ffa51166a30bad7d1670010741bec0`
  (re-fetched; the brief's `35793f7…` was historical). Branch
  `r352/institutional-backend` created from it.
- Open PRs inspected: #34 (r351/authenticated-web — docs+frontend only),
  #32 (r351/native-and-ai — apps+docs+frontend + 7 backend AI files).
  No backend overlap; the 7 AI files are left untouched.
- Audit: AGENTS.md, BACKEND.md, docs/architecture.md, docs/testing.md,
  full `backend/prisma/schema.prisma` (2165 lines, 89 models),
  `lib/permissions.ts`, `lib/roleLabels.ts` (+ twin-belt test),
  `lib/governance.ts`, `lib/errors.ts`, `lib/pagination.ts`,
  `http/middleware/{auth,institution}.ts`, `app.ts` (mount ordering),
  `institution.routes.ts` (audit-in-transaction pattern), seed.ts header,
  contract suite + snapshot mechanics, integration guard/helpers/configs,
  `tools/boot-pg.sh`, generate-openapi.ts, root+backend package.json.
- Legal research: lawsociety.ly fetched (Law 9/2026, Law 10/2026,
  Law 21/2023, Law 2/2018, Law 4/2020 + gazette issues 6/7/10-2023,
  16-2026) with verbatim article extraction; qaa.ly (National Center)
  accreditation criteria PDF (9 institutional + 8 program standards),
  technical-licensing form fields, self-study/audit-checklist/procedures
  guides; mei.edu.ly institute regulations (internal regs, org structure,
  training reg 77/2008, reg 94/2011). qacc.gov.ly → HTTP 403 (recorded).
  Archive + reports under `/home/z/legal-research/` (outside the repo —
  summarized into LEGAL-MATRIX.md).
- Environment: embedded PostgreSQL 16 booted via `tools/boot-pg.sh` on
  127.0.0.1:5433; disposable databases `ulara_r352_test` +
  `ulara_r352_shadow` created. Root `npm install` completed (536 pkgs).
- Docs checkpoint written (this directory): PLAN, LEGAL-MATRIX,
  CURRENT-STATE, DATA-MODEL, API-CONTRACT, TEST-PLAN, DECISIONS, LOG,
  HANDOFF. **API-CONTRACT.md published as the early push checkpoint.**

## Session 1 — implementation

- Prisma schema extended (+~40 models, +11 capabilities, +ASSISTANT_LECTURER
  rank, +3 InstitutionStatus values, Faculty/Department orgUnitId links,
  StudentProfile.learnerCategory, TeacherProfile.personId).
- Migration `0003_r352_institutional_core` authored (DDL + ALTER TYPEs +
  partial unique indexes + org-unit parent trigger + guarded backfills).
- Seeds: `ensureR352Catalogs()` (authorities, institution types, credential
  types, position templates, criteria sets) — additive upserts.
- Permissions: deterministic deny-precedence merge, `UnitRoleGrant`,
  `assertCapabilityForUnit`, capability defaults per DECISIONS.
- roleLabels: ADMIN → «إدارة المؤسسة» (+ backend test updated; twin belt
  expected-red pending frontend mirror).
- 8 new route modules mounted (catalog, institutional classification,
  org-units, people, appointments, councils, programs/credentials,
  compliance, operations, research-projects, unit-roles) — ~75 operations,
  all capability-guarded, audited in-transaction, paginated.
- Verification (measured, isolated local PG):
  - `npx prisma validate` — clean.
  - `npx prisma generate` — clean.
  - `npm run typecheck` + `typecheck:tests` (backend) — clean.
  - `npm test -w backend` — green except the documented twin-belt rows.
  - `DATABASE_URL=postgresql://ulara@127.0.0.1:5433/ulara_r352_test
     npm run test:integration -w backend` — green (all r352 suites +
    existing regression suites).
  - `npm run lint` (backend scope) — clean.
  - `npm run api:openapi` — regenerated, additive-only.
- PR opened: `[R352][Backend] Institutional Core, Governance, Academic &
  Technical Domains`.
- Final counts and the exact commands are recorded below in
  "Verification receipts".

## Verification receipts (filled at push time)

See LOG.md §Verification in the pushed revision for the measured numbers.
