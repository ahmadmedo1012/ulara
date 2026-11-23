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

## D5 — UnitCapabilityGrant for scoped responsibilities (hardened §3.2)

**Decision (r352 hardening — supersedes the original UnitRoleGrant
design):** Membership keeps exactly one institutional role per
(userId, institutionId) — the session role. Additional scoped
responsibilities are `UnitCapabilityGrant` rows: EACH row grants exactly
ONE `Capability`, scoped to an org unit (covering its subtree) or the
institution (`orgUnitId IS NULL`). A unit-scoped grant never composes a
role bundle and never authorizes institution-wide operations; the actor
may not grant a capability exceeding their own authority over the target
scope (rule-8 parity, `GRANT_EXCEEDS_AUTHORITY`); OWNER is a platform
identity that cannot appear in a grant row; revocation is stamped and
immediately effective (no grant cache).
**Why:** the pre-hardening design merged the granted role's ENTIRE
default bundle — a faculty-scoped "ADMIN" grant equaled institution-wide
ADMIN power inside the subtree, and generic requireCapability checks
supplied no unit target. The single-capability model is the only shape
that satisfies the task's twelve mandatory authorization rules.
**Why (kept from before):** the `@@unique([userId, institutionId])`
membership contract and every context-resolution path stay untouched.
**Rejected:** relaxing Membership uniqueness (same as before); keeping
role-typed grants with "narrowed defaults" — every narrowing rule is a
leakage opportunity the reviewers already demonstrated.
**Data impact:** `UnitRoleGrant` dropped in migration 0004 (same-PR
table, zero production rows; dev rows disposable — task-sanctioned
replacement).

## D6 — Deterministic deny precedence (behavioral fix, documented)

**Decision:** `mergeCapabilities` evaluates, per capability: any
applicable UserPermission row with `grant=false` denies; otherwise any
`grant=true` grants; otherwise role defaults (membership role ∪
RolePermission rows) ∪ applicable UnitCapabilityGrant capabilities
(institution-wide always; unit-scoped only when the check targets that
unit's subtree — see D5-hardened).
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

## D12 — Governance documents ride the REAL storage system (hardened §9)

**Decision (r352 hardening — supersedes the deferral):** a `governance`
namespace was added to the EXISTING storage architecture (same drivers,
same `BinaryObject` sink, same key-shape belt — no second storage
system). Keys are exactly `governance/<institutionId>/<file>.pdf` — the
tenant binding lives IN the key, so a leaked key can never be
re-associated by another institution. `CouncilDocument` and
`ComplianceEvidence` gained `binaryObjectId` FKs; association validates
the key's institution; upload (`POST /governance/documents/upload`) and
download (`GET /governance/documents/:id/file`) are separate,
capability-gated, institution-scoped routes with the platform's PDF gates
(magic bytes, 20 MB cap, active-content scan) and audit rows. The legacy
`fileUrl` stays a DEPRECATED external reference — never trusted as an
upload.

**Correction (post-audit):** the upload/download byte routes above were
DEFERRED — they were never implemented. What is real: the storage rails
(the governance key namespace + `BinaryObject` sink) and the
`binaryObjectId` FKs on `CouncilDocument`/`ComplianceEvidence`, consumed
today only via `POST /governance/councils/:id/documents` metadata (an
optional reference to an already-stored governance-key object).

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


---

# r352 hardening decisions (post-review)

## D15 — The generalized learner domain (§5)
`LearnerProfile` is the canonical learner record (institution-scoped,
optional account, STUDENT/TRAINEE category, own lifecycle). The three
learner-facing tables (ProgramEnrollment, TrainingPlacement,
AwardedCredential) retarget to it with `studentProfileId` kept as an
optional legacy bridge; `StudentProfile.learnerProfileId` is the 1:1
non-destructive bridge (migration-backfilled). `Course.orgUnitId` adds
organizational ownership without a second Course system. Category ↔
program-kind compatibility is the Law 21/2023 Art. 2 matrix (طالب ≠
متدرب). Cross-institution admission verification links profiles by
`nationalId` (registry pattern, read-only, decision-affecting only).

## D16 — CouncilStatus is its own lifecycle (§7.2)
A council is an organ, not a member: `Council.status` uses the dedicated
`CouncilStatus` enum (ACTIVE/DISSOLVED/CANCELLED) instead of reusing
`CouncilMembershipStatus`.

## D17 — Meeting minutes are truly versioned (§7.1)
One row per version; `isCurrent` + partial unique guarantees a single
live revision; SIGNED/APPROVED content, status (except the legal
APPROVED→SIGNED transition) and provenance are frozen by the
`ulara_minutes_immutable` trigger — `isCurrent` flips are exempt so a
signed version can be superseded by a NEW draft, never overwritten.

## D18 — Attendance models MEMBER vs GUEST explicitly (§7.3)
`MeetingAttendance.attendeeKind`: MEMBER rows must map to ACTIVE council
memberships of that council; GUEST rows are the documented
external-participant path (same-institution person integrity still
applies).

## D19 — Criterion-level internal self-assessment (§8)
`SelfAssessmentItem` links each response to a REAL
`AccreditationCriteriaItem` of the assessment's OWN criteria set
(server-verified — no mixing versions/authorities/types), with a
controlled rating vocabulary, assessor provenance, and corrective-plan
links (`CorrectiveActionPlan.selfAssessmentItemId`). External
accreditation and internal self-assessment stay separate workflows.

## D20 — The controlled org-unit type catalog (§11)
`OrgUnitTypeDefinition` (seeded 18 global types + institution-local
types) with sector/kind eligibility and parent compatibility; unit
creation validates against it. Extending types needs a catalog row, not
a release.

## D21 — Explicit credential progression (§12)
`CredentialProgressionRule` rows ARE the law: six seeded Law 21/2023
transitions with legal references and destination constraints; the
absence of a row is the prohibition. Numeric `level` is display-only.
Enforcement is server-side at enrollment (own credentials or the
nationalId registry link).

## D22 — Attendance at the §3.1 institution-context law
A client-supplied `institutionId` NEVER scopes an admin read: non-OWNER
callers operate only inside their server-verified context; OWNER may
pass an explicit institutionId, verified to exist and be ACTIVE. Foreign
rows read as 404 — no existence leak.

## D23 — Program admission JSON is descriptive only
`Program.admissionRequirements`/`progressionRules` JSON carries
descriptive metadata; statutory enforcement is exclusively the
CredentialProgressionRule catalog (D21). No arbitrary JSON is treated as
an admission rule.
