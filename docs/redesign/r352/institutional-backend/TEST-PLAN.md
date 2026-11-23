# R352 — Test Plan

## 1. Layers (mirrors repo canon: AGENTS.md §2, docs/testing.md)

| Layer | What | Where | DB |
|---|---|---|---|
| Unit (pure) | permission merge/deny precedence, org-tree cycle+ancestry logic, appointment overlap windows, status-transition tables, credential progression rules, DTO validation | `backend/tests/modules/r352-*.test.ts` | none (mocked/no DB) |
| Integration | full HTTP stack on real disposable local PG: CRUD, guards, tenant isolation, lifecycle transitions, migration backfill correctness, seed idempotency | `backend/tests/integration/r352-*.test.ts` | localhost embedded PG (guard-enforced) |
| Contract | additive-only snapshot (existing suite) — new routes added to the table where seeded accounts allow | `backend/tests/contract/` | seeded dev DB |
| OpenAPI | regenerated spec covers new routes; additive-only vs committed | `npm run api:openapi` | none |

## 2. Unit matrix (all measured, `npx vitest run <file>`)

Actual files (`backend/tests/modules/`):

| File | Pins |
|---|---|
| `r352-org-tree.test.ts` | cycle detection incl. self-parent; ancestor chain (bounded); same-institution parent predicate; sibling-name uniqueness predicate; tree build depth bound |
| `r352-appointments-logic.test.ts` | overlap window predicate (substantive vs acting); scope-requirement satisfaction per unit type; date validity; eligibility per institution kind |
| `r352-lifecycle-rules.test.ts` | transition tables: accreditation, license, inspection, finding, corrective action, resolution, minutes, program version, program enrollment, work order, reservation, research project — legal moves allowed, illegal moves rejected |
| `r352-credentials-logic.test.ts` | progression flags (vocational-training cert never progresses; basic-formation cert progresses to intermediate; specialized professional diploma never); level ordering |
| `r352-mirror-org-unit-id.test.ts` | the mirror-id convention (migration `0005`): `mirrorOrgUnitId` mints the legacy row's own cuid shape — never the retired `ou-f-`/`ou-d-` prefixed ids that failed `z.string().cuid()` params |
| `permissions-merge.test.ts` (no r352 prefix) | deterministic deny precedence (global grant + scoped revoke ⇒ denied; scoped grant + global revoke ⇒ denied; grant-only ⇒ granted; revoke-only ⇒ denied); unit-grant role defaults merge; OWNER full set; QUALITY default set unchanged (no new caps) |
| `src/lib/__tests__/roleLabels.test.ts` (updated existing file content) | ADMIN label = إدارة المؤسسة; twin belt expectation updated |

DTO accept/reject pins live inside the integration suites' 400 cases (no
standalone `r352-dto-validation` module file exists).

## 3. Integration matrix (`DATABASE_URL=postgresql://ulara@127.0.0.1:5433/ulara_r352_test`)

Actual files (`backend/tests/integration/`):

| File | Scenarios |
|---|---|
| `r352-org-units.test.ts` | create/list/tree/patch/status; faculty↔legacy Faculty write-through (city required; rename mirrors); department under faculty unit; duplicate code 409; cross-institution parent 400; cycle 409; unauthorized (member without cap) 403; unit of another institution 404 |
| `r352-unit-roles-classification.test.ts` | unit-capability grants (§3.1/§3.2): grant/revoke semantics, subtree-only coverage, institution-wide grants, authority parity, deny precedence end-to-end, immediate revocation, cross-institution closure + institution classification: PATCH happy path (OWNER); kind/sector mismatch 409; parent cycle 409; audit row written in-transaction; ADMIN cannot call OWNER route |
| `r352-people-appointments.test.ts` | people: CRUD + category filter; staff number unique per institution; user link; cross-institution orgUnit 400; PEOPLE_MANAGE required + appointments: create (validated eligibility: DEAN requires FACULTY/COLLEGE unit; INSTITUTE_DIRECTOR requires HIGHER_TECHNICAL_INSTITUTE kind); overlap 409; acting coexists; end/cancel + history; appointments never touch TeacherProfile.rank or Role |
| `r352-councils.test.ts` | council + membership (dup active 409) + meeting + attendance bulk + agenda + resolution transitions + minutes draft→approve→sign (order enforced); council doc metadata; minutes versioning (draft → approve → sign → revise mints v2 with v1 preserved) |
| `r352-academic.test.ts` | programs: program/version/courses; single ACTIVE version; cross-institution course 400; enrollment transitions; placement create/complete; term uniqueness + credentials: award + revoke; serial unique per institution; catalog seeded values present (10 types) |
| `r352-compliance.test.ts` | accreditation transitions; license; inspection→finding→corrective action chain with due dates; self-assessment requires QUALITY_INTERNAL_MANAGE (ADMIN 403 without explicit grant, granted ADMIN 201); evidence owner validation |
| `r352-operations-research.test.ts` | operations: facility/equipment CRUD; equipment-program link; work-order transitions; reservation overlap 409; safety incident + research: project lifecycle; member add/remove; output linked to existing ResearchPaper |
| `r352-tenant-isolation.test.ts` | **two institutions with same unit names/codes/person numbers/serials**: every list scoped; cross-institution ids 404; people/appointments/evidence/programs cannot leak; capability grant for institution B invisible in A; audit rows carry the right institutionId |
| `r352-migration-backfill.test.ts` | after `migrate deploy` + seed: every Faculty/Department has an orgUnitId; legacy TeacherProfile.position rows produced appointments; catalogs idempotent on re-run |
| `r352-scenarios.test.ts` | acceptance scenarios B/C/E (see the hardening additions below) |
| `r352-concurrency.test.ts` | §6 belts under REAL parallel HTTP transactions (see the hardening additions below) |
| `r352-production-regression.test.ts` | the 2026-11-23 schema-drift 500 belt: the exact production-failing queries (GET /colleges, /auth/me, /catalog/institution-types, /me/permissions for ADMIN) must answer 200 with their documented shapes against a MIGRATED database — drift fails loudly |
| `r352-cross-tenant-writes.test.ts` | the 2026-11-23 isolation-fix belt: findings institution-check programId/orgUnitId per-field; learners require the linked userId to be an ACTIVE member of the caller's institution (USER_NOT_MEMBER); position-templates serve global + the caller's OWN institution variants only; institutional-ADMIN permission overrides are institution-scoped |
| `feedback-institution-scope.test.ts` | the feedback inbox institution scope (migration `0006`): POST /feedback stamps the DB-verified institution; the ADMIN/QUALITY inbox is pinned to their institution's rows (contextless 403); OWNER keeps the platform-wide view; foreign PATCH rows 404 |
| `lecture-video-access.test.ts` | the r342 t14 lecture-video serving gate: GET /files/lectures/:filename rides assertOfferingAccess — authorized callers pass the gate (honest FILE_NOT_FOUND for absent objects), unauthorized callers 403 before any storage lookup, orphan keys streamable by no one |

## 4. Migration & seed gates

- `prisma validate` + `prisma generate` clean.
- `prisma migrate deploy` applies 0001→0006 on the empty disposable DB with
  zero data loss statements (reviewed SQL; no DROP of existing tables).
- Re-running `ensureR352Catalogs()` changes nothing (counts stable).
- Existing integration suites still green (`two-institution-regression`,
  `institutions-flow`, `uniqueness-constraints`, `seed-idempotency`,
  `governance-lock`, …).

## 5. Negative-case requirements (every suite)

- unauthenticated 401; contextless 403 INSTITUTION_CONTEXT_REQUIRED;
  suspended institution 403; wrong-capability 403; cross-tenant 404;
  invalid transitions 409; malformed payloads 400/VALIDATION_ERROR.

## 6. Honest reporting

Counts are measured from the current tree at verification time and recorded
in `LOG.md` with the exact commands. No historical numbers copied. The
roleLabels frontend-twin assertions are expected-red until the frontend
agent mirrors the ADMIN label — reported explicitly, never hidden.


## 5. r352 hardening additions (measured)

| File | Pins |
|---|---|
| `tests/modules/learner-logic.test.ts` | Law 21/2023 Art. 2 category/program matrix (STUDENT vs TRAINEE × 5 program kinds); progression decision rules (absence = prohibition; inactive rules; destination credential/type/kind constraints) |
| `tests/modules/permissions-merge.test.ts` (updated) | a unit grant adds EXACTLY ONE capability (no role-bundle leakage); deny beats unit grants; ADMIN/OWNER capability sets incl. UNIT_CAPABILITIES_ASSIGN |
| `tests/integration/r352-unit-roles-classification.test.ts` (rewritten) | §3.2 subtree-only coverage + root-unit denial + no-bundle leakage; institution-wide grants; §3.1 cross-institution closure (query-param override, foreign revoke 404, OWNER verified path); authority parity (GRANT_EXCEEDS_AUTHORITY + the positive case); deny precedence end-to-end; immediate revocation; classified affiliation parents |
| `tests/integration/r352-scenarios.test.ts` | acceptance scenarios B/C/E: COLLEGE dean seating (zero legacy mirrors), the institute diploma pathway + premature-award refusal, the vocational center with ZERO Faculty/Department, and the §12 progression matrix via the nationalId registry (positive + two negatives) |
| `tests/integration/r352-concurrency.test.ts` | §6 belts under REAL parallel HTTP transactions: racing grants / reservations (clean Arabic 409 from the exclusion constraint) / version activations / appointment seats — exactly one winner each |
| `tests/integration/r352-councils.test.ts` (updated) | minutes versioning: draft → approve → sign → revise mints v2 with v1 preserved (SIGNED + signatories); history endpoint counts; current-version projection in meeting detail |
