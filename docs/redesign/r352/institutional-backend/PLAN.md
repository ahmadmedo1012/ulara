# R352 — Institutional Backend · PLAN

> Owner: backend agent (r352/institutional-backend). Scope: `backend/**`,
> `docs/api/openapi.json` (regenerated), `docs/redesign/r352/institutional-backend/**`.
> Frontend/mobile/shared/scripts/.github are owned by other agents.

## 1. Mission

Transform ULARA from a university-shaped platform into a configurable,
legally aware, multi-institution educational operating system serving Libyan
higher-education, technical, vocational, and research institutions — one
domain model, no parallel systems.

## 2. Phases

| # | Phase | Contents | Status |
|---|---|---|---|
| P0 | Evidence base | Deep audit of schema/routes/permissions/tests; legal research with verbatim sources; this doc set | done |
| P1 | Contract checkpoint | `API-CONTRACT.md` + `DATA-MODEL.md` published early for the frontend agent | done (pushed) |
| P2 | Data layer | Prisma schema extension (≈40 models), migration `0003_r352_institutional_core` with data backfills, seeded catalogs | done |
| P3 | Permission architecture | Deterministic deny precedence, unit-scoped role grants (`UnitRoleGrant`), new capabilities, ADMIN label correction | done |
| P4 | Domain APIs | org-units, people, appointments, councils, programs, credentials, quality/accreditation/licenses/inspections, facilities, research + audit logging | done |
| P5 | Tests | Unit (pure logic) + integration (lifecycle, tenant isolation, permissions, migration idempotency) | done |
| P6 | Verification & PR | prisma validate/generate, typecheck, lint, unit+integration suites, OpenAPI regen, PR | done |

## 3. Dependencies & ordering

1. Legal research (P0) feeds LEGAL-MATRIX → seeded catalogs (institution
   types, authorities, credential types, position templates).
2. Permission changes (P3) land before domain APIs (P4) — every route is
   capability-guarded.
3. Org units (P2) are the anchor for people/appointments/councils/programs/
   facilities; Faculty/Department backfill ships in the same migration.
4. API contract (P1) is the frontend agent's source of truth; changes are
   additive-only and re-published.

## 4. Acceptance criteria

- [x] Every doc in this directory exists with measured evidence or explicitly
      recorded gaps.
- [x] `API-CONTRACT.md` pushed as an early checkpoint before implementation.
- [x] Migration is additive; existing rows/IDs preserved; runs on isolated
      local PG only (`tools/boot-pg.sh`, port 5433, disposable DBs).
- [x] `prisma validate` + `prisma generate` clean.
- [x] `npm run typecheck` + `typecheck:tests` (backend) clean.
- [x] Backend unit suite green (`npm test -w backend`).
- [x] Integration suite green against local disposable PG
      (`npm run test:integration -w backend`), including the two-institution
      isolation scenario.
- [x] Lint clean on changed backend files.
- [x] `docs/api/openapi.json` regenerated from source; additive-only.
- [x] PR open with scope, decisions, migration notes, measured tests,
      residual risks.
- [x] `HANDOFF.md` gives the frontend agent exact endpoints, permissions,
      shapes, error codes, limitations.
- [x] The roleLabels twin belt is the one expected-red check pending the
      frontend mirror of the corrected ADMIN label (documented in HANDOFF).

## 5. Non-goals (this round)

- No frontend work, no mobile work, no dependency upgrades, no RLS.
- No new file-upload byte path for governance documents (evidence rows carry
  references; upload integration is a residual).
- No destructive changes to Faculty/Department/TeacherProfile/StudentProfile.


---

# r352 hardening plan (executed)

1. ~~P0 authorization & tenant isolation (§3, §4)~~ — FIXED (see
   POST-IMPLEMENTATION-AUDIT.md A-1..A-4).
2. ~~P0 generalized learners (§5)~~ — FIXED (B).
3. ~~P0 concurrency invariants (§6)~~ — FIXED (C-1..C-6).
4. ~~P1 governance lifecycle (§7)~~ — FIXED (D-1..D-4).
5. ~~P1 quality workflows (§8)~~ — FIXED (D-5).
6. ~~P1 document upload integration (§9)~~ — FIXED (D-6, integrated —
   no second storage system).
7. ~~P1 legal classifications (§10)~~ — FIXED (E-1..E-4).
8. ~~P1 org-unit type extensibility (§11)~~ — FIXED (E-5, controlled
   catalog).
9. ~~P1 credential progression (§12)~~ — FIXED (E-6, explicit catalog).
10. ~~P1 faculty/department bridge review (§13)~~ — FIXED (D-7).
11. ~~API & lifecycle sweep (§14)~~ — FIXED (F, incl. two latent
    cross-router defects).
12. ~~Acceptance scenarios A–H (§15)~~ — implemented + measured (G).
13. Documentation & handoff (§17) — this pass.
