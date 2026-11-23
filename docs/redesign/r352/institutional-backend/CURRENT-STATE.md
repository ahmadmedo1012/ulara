# R352 — Current State (audited 2026-11-22, base b92185c0)

## 1. Architecture

- Express 4.22.3 + TypeScript ESM + Prisma 5.22 over PostgreSQL (Neon in
  production). One service serves the built SPA. API base `/api/v1`,
  envelope `{ data }` / `{ error: { code, message } }`.
- 89 Prisma models (single baseline migration `0001_ulara_baseline` +
  `0002_retire_zu_sync`). Multi-tenancy since r178: `Institution` +
  `Membership` (`@@unique([userId, institutionId])`), role lives in
  Membership; `User.role` is the platform role (OWNER global, never a member).
- Institution context resolved server-side per request
  (`http/middleware/institution.ts` → `requireInstitution`); client-supplied
  institution IDs are never trusted. Suspended institutions block context.
- OpenAPI 3.1 generated offline from the live router + zod DTOs
  (`npm run api:openapi` → `docs/api/openapi.json`); additive-only contract
  enforced by `backend/tests/contract/api-contract.test.ts` + `snapshot.json`.

## 2. Identity & permissions (as found)

- Roles: `STUDENT | TEACHER | ADMIN | QUALITY | OWNER`.
- Capabilities: 28-value enum (17 pre-R352 + the 11 institutional-core
  values); `DEFAULT_ROLE_CAPABILITIES` + `RolePermission`
  rows (30s cache) + `UserPermission` overrides
  (`@@unique([userId, capability, institutionId])`, `grant` boolean,
  NULL institution = platform-global).
- `mergeCapabilities()` applies overrides in **row order** — with a global
  grant + scoped revoke for the same capability the result is
  non-deterministic (the R352 deny-precedence fix targets exactly this).
- Governance scoping: `User.scopeFacultyId` (single faculty, ADMIN/QUALITY)
  — flat, university-shaped, no org-tree, no unit-scoped capability grants.
- `getEffectiveCapabilities(userId, role, institutionId?)` merges global +
  context-scoped UserPermission rows.
- Guards: `requireRole(...)`, `requireCapability(...)`,
  `assertCapabilityIn(...)`, resource guards (`assertOfferingAccess`,
  `assertOwnsResearchPaper`).
- ADMIN is displayed «المسجل العام» (`backend/src/lib/roleLabels.ts`,
  belt-locked to the frontend twin by tests on both sides) although the role
  carries broad institutional administration capabilities — the job title
  and the access category are conflated (R352 corrects the label).

## 3. Academic structure (as found)

- `Faculty` (institutionId, name, city — unique) → `Department`
  (facultyId, name — unique) → `Course` (institutionId, code — unique) →
  `CourseOffering` (courseId, term string, teacherId) → `Enrollment`
  (studentId → **User**, offeringId).
- Hardwired University → Faculty → Department shape; `city` mandatory on
  Faculty; no org-tree, no units for institutes/centers/administrations.
- `StudentProfile` (per-membership since r178): **required** facultyId +
  departmentId + universityId (institution-scoped unique), year, gpa —
  university-shaped; no learner-category distinction (طالب vs متدرب).
- `TeacherProfile` (per-membership): specialty, `rank AcademicRank`
  (LECTURER…PROFESSOR — 4 values, محاضر مساعد missing), department,
  verification, and leadership as flat columns `position AcademicPosition?`
  (DEAN | ASSOCIATE_DEAN | DEPARTMENT_HEAD) + positionFacultyId /
  positionDepartmentId / appointedAt / termEndsAt — no appointment history,
  no decision references, no institution-kind-specific titles, no acting
  appointments.
- `DegreeLevel` enum (BACHELORS/MASTERS/PHD) — teacher qualification only,
  not a credential catalog.
- `TrainingTrack` = platform self-development feature (badges/points) —
  explicitly NOT the TVET program model.
- `VirtualLab`/`LabSession` = virtual learning feature — not physical
  facilities.
- Research: student `ResearchPaper` lifecycle (upload → scan → grade →
  publish) + annotations; no institutional research projects/centers.

## 4. Routes (as found)

43 route modules mounted in `app.ts` (ordering-sensitive: public routers
before broad authed mounts). Governance mutations use the shared pattern:
`prisma.$transaction` + `AuditLog` row inside the same transaction
(`courses.routes.ts` / `institution.routes.ts` pattern). Zod DTOs in
`modules/<domain>/*.dto.ts`, validated via `http/validate.ts`
(`validate(schema)`). Error envelope: `AppError` + Arabic messages,
Prisma P2002→409, P2025→404, P2003→400.

## 5. Seeds & test accounts

`prisma/seed.ts`: two neutral demo workspaces (ulara-demo, ulara-demo-2),
3 faculties per workspace, test accounts (student/teacher/registrar/quality/
owner @test.ly + second-workspace twins), password `12345678`;
`ensureTestAccounts()` maintains the documented job table on every seed.
Established-DB zero-writes rule (r183) except @test.ly accounts.

## 6. Tests (as found)

- Unit (`npm test -w backend`): DB-free, `vi.mock('../../src/db.js')`,
  NODE_ENV=test placeholder secrets. ~120 files under `tests/modules` +
  co-located `src/**/__tests__`.
- Integration (`npm run test:integration -w backend`): opt-in, guarded by
  `guard.setup.ts` — **localhost-only DATABASE_URL**, refuses neon/vercel/
  render hosts; `fileParallelism: false`; `truncateAll()` per test.
- Contract suite: boots the real app in-process; snapshot additive-only;
  DB-probe skip when unreachable.
- Local PG: `tools/boot-pg.sh` (embedded PG16, port 5433, superuser+db
  `ulara`). Two-institution regression already exists
  (`two-institution-regression.test.ts`).

## 7. Compatibility risks identified (pre-work)

1. `Faculty.city` NOT NULL + unique (institutionId, name, city) — org-unit
   unification must not break faculty creation paths.
2. `StudentProfile.facultyId/departmentId` required — trainee modeling must
   keep these populated (platform requirement) while the learner category +
   program enrollment carry the legal distinction.
3. `Enrollment.studentId` references User, not StudentProfile — unchanged
   this round (additive `ProgramEnrollment` carries program-level study).
4. Membership uniqueness (userId, institutionId) — exactly ONE institutional
   role per membership; multiple scoped responsibilities therefore need a
   separate grant table (`UnitRoleGrant`), not more Membership rows.
5. roleLabels twin belt reads `frontend/src/lib/roleLabels.ts` as source —
   the ADMIN label correction will fail the twin assertions until the
   frontend agent mirrors it (documented, expected).
6. Root `npm run build` migrates + seeds — never run here; targeted gates
   only (`AGENTS.md`).
7. `AcademicRank` enum extension (`ASSISTANT_LECTURER`) — additive
   `ALTER TYPE ... ADD VALUE`; Prisma orders it safely.

## 8. Reusable as-is

`AppError`/error handler, `validate()` middleware, `requireInstitution`
context chain, `pagination.ts` helpers, `governance.ts` guards/patterns,
`withRetry` (db.ts), AuditLog + in-transaction audit pattern, contract
snapshot tooling, integration harness (`seedUser`/`seedInstitution`/
`seedMembership`/`bearer`/`truncateAll`), embedded-PG tooling.


---

# r352 hardening state (post-review, this PR)

- Migrations: `0001` → `0006` (`0002_retire_zu_sync`,
  `0003_r352_institutional_core`, `0004_r352_backend_hardening`,
  `0005_r352_mirror_ids_cuid_shape`, `0006_r352_feedback_institution_scope`)
  — additive except the documented UnitRoleGrant drop and the replaced
  uniques; learner bridge backfill verified on fresh AND data-bearing
  upgrades; `0006` adds `PilotFeedback.institutionId` (nullable — the
  ADMIN/QUALITY feedback inbox is institution-scoped, OWNER keeps the
  platform-wide view).
- Authorization: single-capability scoped grants (`UnitCapabilityGrant`);
  deterministic deny precedence; unit-aware scope policies on the R352
  write routes; §3.1 institution-context law enforced end-to-end.
- Learner domain: `LearnerProfile` is canonical for
  ProgramEnrollment/TrainingPlacement/AwardedCredential (StudentProfile
  bridge preserved); `Course.orgUnitId` organizational ownership;
  `/academic/learners` CRUD.
- Concurrency: partial unique indexes (institution-wide grants, single
  ACTIVE program version), btree_gist reservation-overlap exclusion
  constraint, advisory-lock-serialized appointment seats and structural
  changes, cycle-safe depth-bounded org-unit + affiliation triggers.
- Governance: versioned immutable minutes; CouncilStatus; MEMBER/GUEST
  attendance; paginated meetings; criterion-level self-assessment items
  with corrective-plan links; governance storage namespace with
  tenant-bound keys.
- Legal: honest attribution (INDEPENDENT_RESEARCH_CENTER de-attributed),
  split statutory titles, COLLEGE dean seating, controlled org-unit type
  catalog, explicit progression rule catalog (six Law 21/2023
  transitions; absence = prohibition).
- Docs: POST-IMPLEMENTATION-AUDIT.md is the definitive findings ledger;
  all sibling docs updated; OpenAPI regenerated (additive + the three
  documented renames).
