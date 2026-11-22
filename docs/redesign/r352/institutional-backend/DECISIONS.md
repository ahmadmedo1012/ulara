# R352 — Architectural Decisions

## D1 — One domain model, sector as a dimension (not parallel systems)

**Decision:** universities and TVET institutions live in the same
`Institution`/`OrganizationalUnit`/`InstitutionalPerson`/`PositionTemplate`
models; the legal distinction is carried by `InstitutionType` (seeded,
legally referenced) + `StaffCategory` + eligibility rules.
**Rejected:** separate `TechnicalInstitute`/`University` model families —
duplicates every relation, breaks the "one product" rule, and Law 10/2026
(Art. 54) itself establishes staff parity between the sectors.

## D2 — Seeded catalogs instead of enums for legal classification

**Decision:** `InstitutionType`, `RegulatoryAuthority`, `CredentialType`,
`PositionTemplate`, `AccreditationCriteriaSet(+Item)` are tables seeded
additively (`ensureR352Catalogs()`).
**Why:** laws change (three amendments in 2026 alone); operators must add
types/authorities/local title variants without migrations; traceability
(legalBasis column) beats enum opacity.
**Rejected:** giant enums — every legal change becomes a migration; no
per-row provenance.

## D3 — OrganizationalUnit with legacy write-through (not a big-bang replace)

**Decision:** `OrganizationalUnit` is the structural backbone. `Faculty`/
`Department` gain `orgUnitId` and are backfilled; the org-unit service
write-throughs FACULTY/SCIENTIFIC_DEPARTMENT units into the legacy tables
and the legacy create/rename paths create/link units. Both APIs keep
working; IDs preserved; new domains (positions, councils, programs,
facilities) reference only OrganizationalUnit.
**Rejected:** (a) dropping Faculty/Department — breaks dozens of relations
(Course, StudentProfile, TeacherProfile, invites, scoping) and the
additive-only API contract; (b) leaving both models un-synchronized — two
sources of truth drift (explicitly forbidden by the task).
**Trade-off documented:** renames through either surface mirror to the
other; dissolution of a unit with active children is blocked.

## D4 — Position catalog + appointment records (not enum expansion)

**Decision:** `AcademicPosition` stays for legacy reads; new
`PositionTemplate` catalog (global + institution-local variants,
kind-eligibility, unit-scope requirement) + `PositionAppointment` history
(decision refs, terms, acting flag, supersession). A person's position
never mutates `AcademicRank` or platform `Role` — three separate axes.
**Rejected:** growing the `AcademicPosition` enum per office — no history,
no decision references, no kind-specific titles, no acting appointments.

## D5 — UnitRoleGrant for scoped responsibilities (not Membership rows)

**Decision:** Membership keeps exactly one institutional role per
(userId, institutionId) — the session role. Additional scoped
responsibilities are `UnitRoleGrant` rows (role defaults merged into
effective capabilities, optionally narrowed to an org unit / ancestors).
**Why:** the `@@unique([userId, institutionId])` contract and every
context-resolution path stay untouched; multiple concurrent grants compose
deterministically.
**Rejected:** relaxing Membership uniqueness to (userId, institutionId,
role) — cascades through auth/session/JWT claim semantics; high blast
radius for zero added expressiveness.

## D6 — Deterministic deny precedence (behavioral fix, documented)

**Decision:** `mergeCapabilities` now evaluates, per capability: any
applicable UserPermission row with `grant=false` denies (scoped rows
considered with priority over global ones); otherwise any `grant=true`
grants; otherwise role defaults (membership role ∪ active unit-grant roles
∪ RolePermission rows).
**Why:** the previous row-order merge was non-deterministic when a global
grant and a scoped revoke (or vice versa) coexisted — the task mandates
deterministic deny-wins. This is strictly a fix toward the documented
spec; the existing unit suite's semantics are preserved for the
single-scope cases it pinned.
**Rejected:** timestamp-ordered "last write wins" — still allows a later
grant to resurrect a denied capability.

## D7 — ADMIN label = «إدارة المؤسسة» (access category ≠ job title)

**Decision:** backend `ROLE_LABELS.ADMIN` becomes «إدارة المؤسسة»;
indefinite «إدارة مؤسسة»; plural-oblique «إدارات المؤسسات». The
المسجل العام job title moves to where it legally belongs: a
`PositionTemplate` (seeded, university kind, REGISTRAR_OFFICE scope).
Enum/DB/JWT/API identifiers unchanged.
**Coordination:** the frontend twin must mirror the label; the twin-belt
assertions in the backend suite stay active and are expected-red until
that lands (reported in LOG/PR; not skipped, not weakened).

## D8 — QUALITY stays read-only; internal QA writes are a separate explicit capability

**Decision:** `QUALITY_INTERNAL_MANAGE` defaults to NOBODY. The internal
QA office's self-assessment workflow is separate from the National
Center's external accreditation domain (`ACCREDITATION_MANAGE`, ADMIN
default) — different legal entities, different workflows, different
models (`InternalSelfAssessment` vs `ExternalAccreditation`).

## D9 — Student/trainee distinction without breaking the profile contract

**Decision:** `StudentProfile.learnerCategory` (STUDENT | TRAINEE, default
STUDENT) + program-level context in `ProgramEnrollment`/`TrainingPlacement`
carry the legal distinction (طالب vs متدرب; open vocational vs basic
formation via Program kind + CredentialType.grantsProgression). The
legacy required facultyId/departmentId stay (platform modeling requirement
— every learner is homed in a unit; a training center models its training
units as org units and mirrors its catch-all as the legacy pair).
**Rejected:** making facultyId/departmentId nullable — every consumer type
changes (backend + frontend + mobile), violating additive-only for no
legal gain: the legal distinction is the category + program, not the
absence of a home unit.

## D10 — Credentials as their own domain

**Decision:** `CredentialType` catalog (10 seeded legal qualifications with
progression flags + legalBasis) + `AwardedCredential` records (issuing
institution, decision refs, serial, revoke). `DegreeLevel` enum untouched
(teacher-qualification semantics).
**Why:** the task explicitly forbids stuffing qualifications into
DegreeLevel; progression eligibility (م38: basic-formation → intermediate
institute; specialized professional diploma → nowhere) is data, not code.

## D11 — Migration policy

**Decision:** single forward-only migration `0003_r352_institutional_core`
(DDL + ALTER TYPE additions + partial unique indexes + org-unit parent
trigger + guarded backfills). Catalogs seeded via idempotent upserts in
`prisma/seed.ts` (`ensureR352Catalogs()`). Applied only to the isolated
local embedded PG (port 5433, disposable databases); the integration guard
refuses anything non-localhost (neon/vercel/render markers).
**Rejected:** `prisma migrate dev` against any shared/remote DB;
destructive seed rewrites.

## D12 — No new byte-upload path for governance documents

**Decision:** `CouncilDocument`/`ComplianceEvidence` carry references
(URL/documentRef). Reusing the existing papers/materials upload chain
needs storage-namespace and access-gate extensions owned by the files
workstream — recorded as a residual, not silently improvised.

## D13 — Partial unique indexes in raw SQL

Prisma 5.22 cannot declare partial/expression indexes. Overlap prevention
(substantive appointments per position+unit), single-active
council-membership, and similar invariants are raw `CREATE UNIQUE INDEX ...
WHERE ...` statements inside the migration, plus service-level checks with
clean 409 envelopes. DB constraint is the belt; service check gives the
Arabic error.

## D14 — Route namespaces

New mounts: `/institutional/*` (structure+people+appointments),
`/governance/*` (councils), `/academic/*` (programs/terms/credentials/
enrollments/placements), `/compliance/*` (quality/accreditation/licenses/
inspections), `/operations/*` (facilities/equipment), `/research-projects/*`,
`/catalog/*` (public reference catalogs). All after `requireInstitution`
except catalog/owner routes — preserving app.ts's public-before-authed
ordering law.
