# R352 — Test Plan

## 1. Layers (mirrors repo canon: AGENTS.md §2, docs/testing.md)

| Layer | What | Where | DB |
|---|---|---|---|
| Unit (pure) | permission merge/deny precedence, org-tree cycle+ancestry logic, appointment overlap windows, status-transition tables, credential progression rules, DTO validation | `backend/tests/modules/r352-*.test.ts` | none (mocked/no DB) |
| Integration | full HTTP stack on real disposable local PG: CRUD, guards, tenant isolation, lifecycle transitions, migration backfill correctness, seed idempotency | `backend/tests/integration/r352-*.test.ts` | localhost embedded PG (guard-enforced) |
| Contract | additive-only snapshot (existing suite) — new routes added to the table where seeded accounts allow | `backend/tests/contract/` | seeded dev DB |
| OpenAPI | regenerated spec covers new routes; additive-only vs committed | `npm run api:openapi` | none |

## 2. Unit matrix (all measured, `npx vitest run <file>`)

| File | Pins |
|---|---|
| `r352-permissions-merge.test.ts` | deterministic deny precedence (global grant + scoped revoke ⇒ denied; scoped grant + global revoke ⇒ denied; grant-only ⇒ granted; revoke-only ⇒ denied); unit-grant role defaults merge; OWNER full set; QUALITY default set unchanged (no new caps) |
| `r352-org-tree.test.ts` | cycle detection incl. self-parent; ancestor chain (bounded); same-institution parent predicate; sibling-name uniqueness predicate; tree build depth bound |
| `r352-appointments-logic.test.ts` | overlap window predicate (substantive vs acting); scope-requirement satisfaction per unit type; date validity; eligibility per institution kind |
| `r352-lifecycle-rules.test.ts` | transition tables: accreditation, license, inspection, finding, corrective action, resolution, minutes, program version, program enrollment, work order, reservation, research project — legal moves allowed, illegal moves rejected |
| `r352-credentials-logic.test.ts` | progression flags (vocational-training cert never progresses; basic-formation cert progresses to intermediate; specialized professional diploma never); level ordering |
| `r352-dto-validation.test.ts` | zod DTOs accept valid payloads, reject invalid (bad enums, negative numbers, future-dated dissolutions, oversized strings) |
| `r352-role-labels.test.ts` (updated existing file content) | ADMIN label = إدارة المؤسسة; twin belt expectation updated |

## 3. Integration matrix (`DATABASE_URL=postgresql://ulara@127.0.0.1:5433/ulara_r352_test`)

| File | Scenarios |
|---|---|
| `r352-org-units.test.ts` | create/list/tree/patch/status; faculty↔legacy Faculty write-through (city required; rename mirrors); department under faculty unit; duplicate code 409; cross-institution parent 400; cycle 409; unauthorized (member without cap) 403; unit of another institution 404 |
| `r352-institution-classification.test.ts` | PATCH classification happy path (OWNER); kind/sector mismatch 409; parent cycle 409; audit row written in-transaction; ADMIN cannot call OWNER route |
| `r352-people.test.ts` | CRUD + category filter; staff number unique per institution; user link; cross-institution orgUnit 400; PEOPLE_MANAGE required |
| `r352-appointments.test.ts` | create (validated eligibility: DEAN requires FACULTY/COLLEGE unit; INSTITUTE_DIRECTOR requires HIGHER_TECHNICAL_INSTITUTE kind); overlap 409; acting coexists; end/cancel + history; appointments never touch TeacherProfile.rank or Role |
| `r352-councils.test.ts` | council + membership (dup active 409) + meeting + attendance bulk + agenda + resolution transitions + minutes draft→approve→sign (order enforced); council doc metadata |
| `r352-programs.test.ts` | program/version/courses; single ACTIVE version; cross-institution course 400; enrollment transitions; placement create/complete; term uniqueness |
| `r352-credentials.test.ts` | award + revoke; serial unique per institution; catalog seeded values present (10 types) |
| `r352-compliance.test.ts` | accreditation transitions; license; inspection→finding→corrective action chain with due dates; self-assessment requires QUALITY_INTERNAL_MANAGE (ADMIN 403 without explicit grant, granted ADMIN 201); evidence owner validation |
| `r352-facilities.test.ts` | facility/equipment CRUD; equipment-program link; work-order transitions; reservation overlap 409; safety incident |
| `r352-research.test.ts` | project lifecycle; member add/remove; output linked to existing ResearchPaper |
| `r352-tenant-isolation.test.ts` | **two institutions with same unit names/codes/person numbers/serials**: every list scoped; cross-institution ids 404; people/appointments/evidence/programs cannot leak; unit-role grant for institution B invisible in A; audit rows carry the right institutionId |
| `r352-unit-roles.test.ts` | grant/revoke via ROLES_ASSIGN; capability effective only within scope; ancestor-unit grant covers descendants; deny precedence end-to-end |
| `r352-migration-backfill.test.ts` | after `migrate deploy` + seed: every Faculty/Department has an orgUnitId; legacy TeacherProfile.position rows produced appointments; catalogs idempotent on re-run |

## 4. Migration & seed gates

- `prisma validate` + `prisma generate` clean.
- `prisma migrate deploy` applies 0001→0003 on the empty disposable DB with
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
