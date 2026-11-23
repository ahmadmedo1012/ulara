# R352 — Target Data Model

> One domain model for all institution kinds. All changes **additive**;
> existing tables/columns/IDs untouched except explicitly listed nullable
> additions. Migrations: the chain `0003_r352_institutional_core` →
> `0004_r352_backend_hardening` → `0005_r352_mirror_ids_cuid_shape` (DDL +
> backfills + partial unique indexes via raw SQL), plus
> `0006_r352_feedback_institution_scope`: `PilotFeedback` gains a nullable
> `institutionId` — the ADMIN/QUALITY feedback inbox is institution-scoped
> while OWNER keeps the platform-wide view.

## 1. Institution classification

### New seeded catalogs

**`RegulatoryAuthority`** — `id, code @unique, nameAr, nameEn?, kind, notes?, createdAt`
Seeded: `MINISTRY_HESR` (وزارة التعليم العالي والبحث العلمي), `NATIONAL_QA_CENTER`
(المركز الوطني لضمان جودة واعتماد المؤسسات التعليمية والتدريبية), `TECHNICAL_ACADEMY`
(الأكاديمية الوطنية للتعليم التقني), `MINISTRY_EDUCATION`, `MINISTRY_LABOR`, `OTHER`.

**`InstitutionType`** — `id, code @unique, sector (InstitutionSector), nameAr, nameEn?,
isIndependentLegalPersonality Boolean, legalBasis?, defaultAuthorityId? → RegulatoryAuthority,
createdAt`. Seeded per LEGAL-MATRIX:

| code | sector | Arabic | legal basis |
|---|---|---|---|
| `UNIVERSITY` | HIGHER_EDUCATION_RESEARCH | جامعة | Law 2/2018 (4/2020, 9/2026) |
| `GRADUATE_ACADEMY` | HIGHER_EDUCATION_RESEARCH | أكاديمية دراسات عليا | Law 4/2020 Art.1 |
| `RESEARCH_AUTHORITY` | HIGHER_EDUCATION_RESEARCH | هيئة بحثية | Law 9/2026 Art.1 |
| `INDEPENDENT_RESEARCH_CENTER` | HIGHER_EDUCATION_RESEARCH | مركز أبحاث مستقل | configurable non-statutory extension (`legalBasis: null` in the seed — LEGAL-MATRIX §C) |
| `MEDICAL_SPECIALIZATIONS_BOARD` | HIGHER_EDUCATION_RESEARCH | مجلس التخصصات الطبية | Law 9/2026 Art.33 مكرر |
| `TECHNICAL_ACADEMY` | TECHNICAL_VOCATIONAL_PROFESSIONAL | أكاديمية التعليم التقني | Law 21/2023 |
| `TECHNICAL_COLLEGE` | TECHNICAL_VOCATIONAL_PROFESSIONAL | كلية تقنية | Law 21/2023 Arts.12,24 |
| `HIGHER_TECHNICAL_INSTITUTE` | TECHNICAL_VOCATIONAL_PROFESSIONAL | معهد تقني عالٍ | Law 21/2023 Arts.12,32 |
| `INTERMEDIATE_TECHNICAL_INSTITUTE` | TECHNICAL_VOCATIONAL_PROFESSIONAL | معهد فني متوسط | Law 21/2023 Art.12 |
| `VOCATIONAL_TRAINING_CENTER` | TECHNICAL_VOCATIONAL_PROFESSIONAL | مركز تكوين وتدريب مهني | Law 21/2023 Arts.12,38–41 |

### `Institution` (extensions — all nullable, backward compatible)

`sector InstitutionSector?` (HIGHER_EDUCATION_RESEARCH | TECHNICAL_VOCATIONAL_PROFESSIONAL)
· `kindId? → InstitutionType` · `ownership OwnershipType?`
(PUBLIC | PRIVATE | OPEN | MIXED | INTERNATIONAL | OTHER) ·
`supervisingAuthorityId? → RegulatoryAuthority` ·
`establishmentDecisionNumber?` · `establishmentDecisionDate?` ·
`parentInstitutionId?` (self-FK, legally-justified affiliation only).
`InstitutionStatus` enum **extended additively**: + `PENDING_APPROVAL`,
`CLOSED`, `MERGED` (existing ACTIVE/SUSPENDED untouched; context middleware
admits only ACTIVE).

Invariants (service + integration-tested): `kind.sector == sector` when both
set; no parent cycles; no cross-sector parent; kind's eligibility rules for
position templates.

## 2. Organizational hierarchy

**`OrganizationalUnit`** — `id, institutionId → Institution, parentId? (self-FK
"OrgUnitTree"), code?, nameAr, nameEn?, type String (an OrgUnitType code —
validated against the `OrgUnitTypeDefinition` catalog, not a DB enum), status
OrgUnitStatus
(ACTIVE | INACTIVE | DISSOLVED), sortOrder, location?, contactEmail?,
contactPhone?, establishedAt?, dissolvedAt?, createdAt, updatedAt`.
`@@unique([institutionId, code])` (nullable code), indexes
(institutionId,type), (institutionId,parentId).

OrgUnitType codes (18 seeded catalog rows in `OrgUnitTypeDefinition`; the
plain-string column is validated against the catalog so local extensions
need no migration): `FACULTY, COLLEGE, SCIENTIFIC_DEPARTMENT, INSTITUTE,
RESEARCH_CENTER, RESEARCH_UNIT, GENERAL_ADMINISTRATION, OFFICE,
ADMINISTRATIVE_DEPARTMENT, BRANCH, CAMPUS, TRAINING_UNIT, LABORATORY,
WORKSHOP, DEANERY_OFFICE, REGISTRAR_OFFICE, QA_OFFICE, OTHER` — covers
faculties, scientific departments, institutes/centers, research centers,
general administrations, offices, branches/campuses, training units,
labs/workshops.

Invariants: same-institution parent only (service + DB trigger in
migration); cycle prevention (bounded walk, tested); sibling nameAr
uniqueness per institution (service, configurable).

### Faculty/Department unification (no second source of truth)

- `Faculty.orgUnitId?`, `Department.orgUnitId?` (nullable FKs).
- Migration backfill: one OrgUnit per Faculty (`type=FACULTY`) and per
  Department (`type=SCIENTIFIC_DEPARTMENT`, parent = faculty's unit),
  preserving names/cities in `location`.
- Write-through sync (`modules/org-units/sync.ts`): creating/renaming a
  FACULTY/SCIENTIFIC_DEPARTMENT unit creates/updates the mirrored legacy
  row and vice-versa (legacy create paths in catalog routes hooked);
  `orgUnitId` is the join. Legacy APIs keep working; IDs preserved.

## 3. People

**`InstitutionalPerson`** — `id, institutionId, userId? → User (optional
account link; @@unique([institutionId, userId]) when set), staffNumber?
(@@unique([institutionId, staffNumber])), fullNameAr, fullNameEn?, category
StaffCategory, primaryOrgUnitId? → OrganizationalUnit, staffStatus
StaffStatus (ACTIVE | ON_LEAVE | SUSPENDED | ENDED), hiredAt?, endedAt?,
email?, phone?, notes?, createdAt, updatedAt`.

`StaffCategory` (10, from Law 21/2023 م2/م50): `ACADEMIC_STAFF
(عضو هيئة التدريس), TEACHING_ASSISTANT (معيد), TRAINER (مدرب),
ASSISTANT_TRAINER (مساعد مدرب), TEACHER (معلم), TECHNICAL_GUIDE (موجه فني),
ADMINISTRATIVE_STAFF (موظف), TECHNICIAN (فني), PROFESSIONAL (مهني), OTHER`.

Links: `TeacherProfile.personId?` (unique — academic profile stays distinct
from the employment record; teacher functionality untouched).
`StudentProfile.learnerCategory LearnerCategory @default(STUDENT)`
(STUDENT طالب | TRAINEE متدرب).

## 4. Positions & appointments

**`PositionTemplate`** — `id, code @unique, titleAr, titleEn?, category
PositionCategory, scopeRequirement OrgUnitType?, eligibleInstitutionTypeCodes
String[] (empty = all), isLocalVariant Boolean, institutionId? (null =
global catalog; set = institution-local variant), notes?, createdAt`.
Categories: UNIVERSITY_LEADERSHIP, FACULTY_LEADERSHIP, DEPARTMENT_LEADERSHIP,
INSTITUTE_LEADERSHIP, CENTER_LEADERSHIP, ADMINISTRATIVE_LEADERSHIP,
TRAINING_LEADERSHIP, BOARD_OFFICE, OTHER. Seeded templates per LEGAL-MATRIX
§D (رئيس الجامعة، وكيل الجامعة، الأمين العام/الكاتب العام، المسجل العام، عميد،
وكيل كلية، رئيس قسم علمي، مدير المعهد العالي، وكيل الشؤون العلمية، مدير
المعهد المتوسط، نائب المدير، موجه فني أول، مدير المركز، نائب مدير المركز…).

**`PositionAppointment`** — `id, institutionId, personId → InstitutionalPerson,
positionId → PositionTemplate, orgUnitId? → OrganizationalUnit (required when
template.scopeRequirement set), appointedByAuthority? (جهة التعيين),
decisionNumber?, decisionDate?, startDate, endDate?, termMonths?, status
AppointmentStatus (SCHEDULED | ACTIVE | ENDED | CANCELLED), acting Boolean
@default(false), supersededById? (self-FK), notes?, createdById?, createdAt,
updatedAt`. Partial unique index (raw SQL): one substantive (non-acting)
ACTIVE/SCHEDULED appointment per (positionId, orgUnitId); acting appointments
exempt; person may hold multiple different positions. Position NEVER changes
academic rank or platform role (enforced by separation of models).

**`AcademicRank`** + `ASSISTANT_LECTURER` (محاضر مساعد) — additive enum
value, no data rewrite. Legacy `TeacherProfile.position` columns preserved;
backfill creates appointment rows for existing leadership (DEAN →
`FACULTY_DEAN` under positionFaculty's org unit, etc.); legacy columns keep
serving existing reads until the frontend migrates.

## 5. Scoped roles & permissions

- `Capability` enum **extended additively** (+11): `ORG_STRUCTURE_MANAGE,
PEOPLE_MANAGE, APPOINTMENTS_MANAGE, COUNCILS_MANAGE, PROGRAMS_MANAGE,
CREDENTIALS_MANAGE, ACCREDITATION_MANAGE, QUALITY_INTERNAL_MANAGE,
FACILITIES_MANAGE, RESEARCH_PROJECTS_MANAGE, UNIT_CAPABILITIES_ASSIGN`.
- Defaults (documented, deliberate): ADMIN gains the institutional-operations
  set (ORG_STRUCTURE/PEOPLE/APPOINTMENTS/COUNCILS/PROGRAMS/CREDENTIALS/
  FACILITIES/RESEARCH_PROJECTS manage). OWNER holds everything (existing
  rule). **QUALITY gains NOTHING by default** — `QUALITY_INTERNAL_MANAGE`
  (internal QA-office self-assessment writes) is explicitly granted only
  (UserPermission / UnitCapabilityGrant), preserving QUALITY's read-only oversight
  + exam moderation semantics. The National Center ≠ the institution's QA
  office: `ACCREDITATION_MANAGE` (external records) defaults to ADMIN.
- **`UnitRoleGrant`** — superseded by **`UnitCapabilityGrant`** (migration
  `0004`, which dropped the old table): a grant is a SINGLE `Capability`
  scoped to `orgUnitId? → OrganizationalUnit` (null = institution-wide;
  unit grants cover their subtree) with `isActive` + `revokedAt` — never a
  role bundle (the pre-hardening shape below is kept for the record). The
  effective-caps merge today: membership-role defaults ∪ RolePermission
  rows ∪ UserPermission grants ∪ active `UnitCapabilityGrant` capabilities
  (institution-wide grants apply anywhere; unit grants only within their
  subtree), minus UserPermission revokes (deny precedence). Original
  (superseded) shape: `id, userId → User, institutionId, orgUnitId? →
  OrganizationalUnit (null = institution-wide), role Role, isActive,
  grantedById?, reason?, createdAt, updatedAt` — multiple grants per user
  allowed; effective caps = membership-role defaults ∪ active UnitRoleGrant
  role defaults ∪ RolePermission rows ∪ UserPermission grants, minus denies.
- **Deny precedence (fix)**: `mergeCapabilities` rewritten deterministically —
  for each capability, any applicable `grant=false` row (scoped before
  global) denies; else any `grant=true` grants; else role defaults. Pure
  function, unit-pinned both directions.
- Unit-scoped checks: `assertCapabilityForUnit(userId, role, institutionId,
  orgUnitId, ...caps)` — grant matches the unit or any ancestor (org-tree
  walk, bounded).
- `ADMIN` display label: «إدارة المؤسسة» (institutional administration) —
  the access category, not the المسجل العام job title (which remains a
  PositionTemplate). Frontend twin update is the frontend agent's task.

## 6. Councils & committees

**`Council`** — `id, institutionId, orgUnitId?, code?, nameAr, nameEn?, type
CouncilType (UNIVERSITY_COUNCIL | FACULTY_COUNCIL | DEPARTMENT_COUNCIL |
SCIENTIFIC_COUNCIL | INSTITUTE_COUNCIL | DISCIPLINARY_COUNCIL |
STANDING_COMMITTEE | OTHER), legalBasis?, charterRef?, establishedAt?,
dissolvedAt?, status (ACTIVE | DISSOLVED | CANCELLED), createdAt, updatedAt`;
`@@unique([institutionId, code])`.
**`CouncilMembership`** — councilId, personId, role CouncilRole (CHAIR |
DEPUTY_CHAIR | SECRETARY | MEMBER | OBSERVER), startDate, endDate?,
decisionRef?, status (ACTIVE | ENDED | CANCELLED); one ACTIVE membership per
(council, person) via partial unique index.
**`CouncilMeeting`** — councilId, seqNumber? (per-council), scheduledAt,
location?, status (SCHEDULED | HELD | CANCELLED), agendaSummary?, notes?,
createdAt, updatedAt.
**`MeetingAttendance`** — meetingId, personId, status (PRESENT | ABSENT |
EXCUSED | LATE), recordedById?; `@@unique([meetingId, personId])`.
**`MeetingAgendaItem`** — meetingId, orderNo, titleAr, description?, status
(OPEN | DISCUSSED | DEFERRED | CLOSED); `@@unique([meetingId, orderNo])`.
**`CouncilResolution`** — meetingId, agendaItemId?, number?, kind
(RESOLUTION | RECOMMENDATION | FOLLOW_UP_ACTION), textAr, status (DRAFT |
APPROVED | REJECTED | IMPLEMENTED | ARCHIVED), approvedAt?, dueDate?,
ownerPersonId?, completionRef?, completedAt?.
**`MeetingMinutes`** — meetingId (unique), versionNo, contentAr, status
(DRAFT | APPROVED | SIGNED), approvedAt?, approvedByPersonId?, signedAt?,
signedByPersonId?; `@@unique([meetingId, versionNo])`.
**`CouncilDocument`** — councilId, meetingId?, titleAr, fileUrl?, kind?,
notes?, uploadedById?.

## 7. Programs, terms, credentials

**`AcademicTerm`** — institutionId, code (e.g. `2026-FALL`), startsAt,
endsAt?, isCurrent; `@@unique([institutionId, code])`.
**`Program`** — institutionId, orgUnitId?, code, nameAr, nameEn?, kind
ProgramKind (ACADEMIC | TECHNICAL | PROFESSIONAL | VOCATIONAL_TRAINING |
BASIC_FORMATION), credentialTypeId? → CredentialType, status (DRAFT |
APPROVED | ACTIVE | SUSPENDED | CLOSED), approvalRef?, admissionRequirements
Json?, progressionRules Json?, durationMonths?, totalCreditHours?;
`@@unique([institutionId, code])`.
**`ProgramVersion`** — programId, label, effectiveFrom?, status (DRAFT |
APPROVED | ACTIVE | RETIRED), approvedAt?, approvalRef?;
`@@unique([programId, label])`.
**`ProgramCourse`** — programVersionId, courseId → Course, termNo?, kind
(CORE | ELECTIVE | PRACTICUM | CAPSTONE | SUPPORTING), creditHours?;
`@@unique([programVersionId, courseId])`.
**`ProgramEnrollment`** — studentProfileId → StudentProfile, programId,
programVersionId?, status (CANDIDATE | ACTIVE | ON_LEAVE | WITHDRAWN |
SUSPENDED | COMPLETED | GRADUATED), entryDate, expectedCompletionAt?,
completionAt?, gpa?; `@@unique([studentProfileId, programId])`.
**`TrainingPlacement`** — institutionId, programEnrollmentId?,
studentProfileId, hostOrgUnitId?, externalHost?, supervisorPersonId?,
startsAt, endsAt?, status (PLANNED | ACTIVE | COMPLETED | CANCELLED |
TERMINATED), evaluationSummary?, evaluationScore?.
**`CredentialType`** (seeded, per Law 21/2023 م5 + 9/2026):
`VOCATIONAL_TRAINING_CERT` (شهادة التدريب المهني — no progression),
`BASIC_FORMATION_CERT` (شهادة التكوين الأساسي — progression to intermediate
institutes), `INTERMEDIATE_TECHNICAL_DIPLOMA`, `SPECIALIZED_PROFESSIONAL_DIPLOMA`
(no progression), `HIGHER_TECHNICAL_DIPLOMA`, `TECHNICAL_BACHELOR`,
`HIGH_LICENSE_MASTERS`, `PRECISE_LICENSE_DOCTORATE`, `MEDICAL_BOARD_CERT`
(= PhD-equivalent per 9/2026 م33مكرر), `OTHER` — fields: code @unique, nameAr,
nameEn?, level (ordering), grantsProgression Boolean, legalBasis?, notes?.
**`AwardedCredential`** — institutionId (issuer), studentProfileId,
credentialTypeId, programId?, programEnrollmentId?, decisionNumber?,
decisionDate?, conferredAt?, serialNumber?, status (AWARDED | REVOKED |
SUSPENDED), notes?, createdById?.
Legacy `DegreeLevel` enum untouched (teacher qualification only).

## 8. Quality, accreditation, licensing, inspection

**`AccreditationCriteriaSet`** — code, version, nameAr, nameEn?, authorityId
→ RegulatoryAuthority, appliesTo (INSTITUTIONAL | PROGRAM), publishedRef?,
isActive, notes?; `@@unique([code, version])`; items
**`AccreditationCriteriaItem`** (code, titleAr, description?, sortOrder;
`@@unique([criteriaSetId, code])`). Seeded from the fetched National-Center
criteria titles (9 institutional + 8 program standards) — titles only, no
invented text.
**`ExternalAccreditation`** — institutionId, scopeType (INSTITUTION |
ORGANIZATIONAL_UNIT | PROGRAM), orgUnitId?, programId?, authorityId, type
(INSTITUTIONAL | PROGRAM), decisionNumber?, decisionDate?, effectiveFrom?,
effectiveTo?, status (PENDING | IN_REVIEW | GRANTED | CONDITIONAL | RENEWED |
SUSPENDED | REVOKED | EXPIRED | WITHDRAWN), criteriaSetId?, reportRef?,
notes?, createdById?.
**`OperationalLicense`** — institutionId, authorityId, kind (TECHNICAL_LICENSE
| OPERATING_PERMIT | ESTABLISHMENT_DECISION | OTHER), licenseNumber?,
scopeType?, orgUnitId?, programId?, issuedAt?, expiresAt?, status (PENDING |
ACTIVE | RENEWED | SUSPENDED | REVOKED | EXPIRED), conditions?, documentRef?,
notes?, createdById?.
**`RegulatoryInspection`** — institutionId, orgUnitId?, authorityId, kind
(MINISTRY | REGULATOR | SAFETY | TECHNICAL | OTHER), scheduledAt?,
conductedAt?, status (SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED),
summary?, reportRef?, createdById?.
**`ComplianceFinding`** — institutionId, inspectionId?, externalAccreditationId?,
orgUnitId?, programId?, severity (MINOR | MAJOR | CRITICAL), titleAr,
description?, legalReference?, status (OPEN | ACKNOWLEDGED | IN_REMEDIATION |
RESOLVED | DISPUTED | CLOSED), dueDate?, resolvedAt?, closedAt?, createdById?.
**`CorrectiveActionPlan`** — findingId, ownerPersonId?, planText, targetDate?,
status (PLANNED | IN_PROGRESS | COMPLETED | VERIFIED | CANCELLED),
approvedById?, completedAt?, verificationRef?.
**`InternalSelfAssessment`** — institutionId, orgUnitId?, periodLabel,
criteriaSetId?, status (DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED |
ARCHIVED), submittedAt?, approvedAt?, summary?, createdById? (the QA office's
own workflow — capability `QUALITY_INTERNAL_MANAGE`, never conflated with the
National Center).
**`ComplianceEvidence`** — institutionId, ownerType, ownerId, titleAr,
documentRef?, fileUrl?, description?, uploadedById? (indexed
(ownerType, ownerId)).

## 9. Facilities & equipment

**`Facility`** — institutionId, orgUnitId?, code?, nameAr, nameEn?, type
(LABORATORY | WORKSHOP | CLASSROOM | PRACTICAL_TRAINING_FACILITY |
LECTURE_HALL | OTHER), status (ACTIVE | UNDER_MAINTENANCE | CLOSED |
DECOMMISSIONED), building?, room?, capacity?, safetyNotes?;
`@@unique([institutionId, code])`.
**`Equipment`** — institutionId, facilityId?, orgUnitId?, code?, nameAr,
nameEn?, category?, serialNumber?, acquiredAt?, value?, condition (NEW |
GOOD | FAIR | POOR | BROKEN), status (IN_SERVICE | UNDER_MAINTENANCE |
OUT_OF_SERVICE | DECOMMISSIONED | LOST), responsiblePersonId?.
**`EquipmentProgramSupport`** — equipmentId + programId composite PK, optional
criteriaItemId (links equipment to the programs/criteria it supports).
**`MaintenanceWorkOrder`** — institutionId, facilityId?, equipmentId?, kind
(PREVENTIVE | CORRECTIVE | SAFETY_INSPECTION | INSTALLATION | OTHER),
titleAr, description?, scheduledDate?, completedAt?, status (OPEN |
IN_PROGRESS | COMPLETED | CANCELLED), assignedPersonId?, cost?.
**`FacilityReservation`** — institutionId, facilityId, orgUnitId?,
requestedById?, purpose, startsAt, endsAt, status (REQUESTED | APPROVED |
REJECTED | CANCELLED | COMPLETED), decidedById?, decidedAt?, notes?
(overlap-checked in service).
**`SafetyIncident`** — institutionId, facilityId?, equipmentId?, kind
(INCIDENT | INSPECTION), severity (MINOR | MAJOR | CRITICAL), titleAr,
description?, occurredAt, reportedById?, status, resolutionNotes?, resolvedAt?.

## 10. Research

**`ResearchProject`** — institutionId, orgUnitId? (RESEARCH_CENTER unit when
affiliated — centers are units, not institutions, unless independently
established), code?, titleAr, titleEn?, field?, principalInvestigatorId?,
startsAt?, endsAt?, status (PROPOSED | APPROVED | ACTIVE | SUSPENDED |
COMPLETED | TERMINATED), fundingSource?, budget?, ethicsApprovalRef?,
approvalRef?, notes?.
**`ResearchProjectMember`** — projectId, personId, role (PRINCIPAL_INVESTIGATOR
| CO_INVESTIGATOR | RESEARCHER | RESEARCH_ASSISTANT | COLLABORATOR |
TECHNICIAN), allocationPct?, joinedAt, leftAt?; `@@unique([projectId, personId])`.
**`ResearchOutput`** — institutionId, projectId?, personId?, type
(PUBLICATION | PATENT | PROTOTYPE | APPLIED_PRODUCT | TECHNICAL_REPORT),
title, referenceUrl?, doi?, publishedAt?, notes?, researchPaperId? →
ResearchPaper (bridge to the existing student-paper workflow).

## 11. Migration strategy

- One forward-only migration `0003_r352_institutional_core`: DDL (all new
  tables/enums/columns) + `ALTER TYPE` additions + partial unique indexes +
  same-institution parent trigger for `OrganizationalUnit` + data backfills
  (org units from faculties/departments; appointment rows from legacy
  TeacherProfile.position; catalog seeds live in `prisma/seed.ts` as additive
  upserts — `ensureR352Catalogs()`, also callable standalone).
- Idempotency: backfills guarded (`WHERE ... IS NULL` / `ON CONFLICT DO
  NOTHING`); re-running the seed is safe.
- Applied only to the isolated local dev/test DB (embedded PG 5433,
  `ulara_r352_test`); never against Neon (guard + policy).
- Rollback: forward-safe by design (all additive; no column/type removal).


---

# r352 hardening data-model changes (migration 0004)

## New models
- **`UnitCapabilityGrant`** (replaces the dropped `UnitRoleGrant`): one
  `Capability` per row, scoped to `orgUnitId` (subtree coverage) or the
  institution (NULL); `isActive` + `revokedAt` revocation handle;
  partial unique `(userId, institutionId, capability) WHERE orgUnitId IS
  NULL AND isActive` is the institution-wide belt.
- **`LearnerProfile`**: the generalized learner — institution-scoped,
  optional `userId`, `category` (STUDENT/TRAINEE), unique
  `(institutionId, learnerNumber)`, optional `orgUnitId` home,
  `LearnerStatus` lifecycle, identity fields incl. `nationalId` (the
  cross-institution registry link).
- **`SelfAssessmentItem`**: criterion-level internal-QA responses —
  unique per (assessment, criteriaItem), `SelfAssessmentRating`
  vocabulary, assessor provenance, corrective-plan links.
- **`CredentialProgressionRule`**: the explicit statutory transition
  catalog (from/to credential types, destination institution-type and
  program-kind constraints, legal reference; unique per pair).
- **`OrgUnitTypeDefinition`**: the controlled unit-type catalog (18
  seeded globals + institution-local rows) with sector/kind eligibility
  and parent compatibility.

## Changed models
- `ProgramEnrollment` / `TrainingPlacement` / `AwardedCredential`:
  `learnerProfileId` (required, backfilled) is canonical;
  `studentProfileId` is the optional legacy bridge.
- `StudentProfile.learnerProfileId` — the 1:1 non-destructive bridge.
- `Course.orgUnitId` — additive organizational ownership (one Course
  system; the Department relation stays the legacy bridge).
- `Council.status` → the `CouncilStatus` enum (ENDED→DISSOLVED,
  value-preserving).
- `MeetingMinutes`: the meetingId-only unique dropped; `isCurrent` +
  partial unique `(meetingId) WHERE isCurrent`; immutability trigger
  for SIGNED/APPROVED content + provenance (isCurrent flips exempt).
- `MeetingAttendance.attendeeKind` (MEMBER/GUEST).
- `CouncilDocument.binaryObjectId` / `ComplianceEvidence.binaryObjectId`
  → `BinaryObject.key` (the governance namespace,
  `governance/<institutionId>/<file>.pdf` — tenant-bound keys).
- `InternalSelfAssessment.programId` (program-scoped assessment).
- `CorrectiveActionPlan.selfAssessmentItemId` (criterion-origin plans).
- `PositionTemplate.allowedUnitTypes` (multi-type unit scope — the
  COLLEGE dean fix; `scopeRequirement` deprecated).
- `CredentialType.level`/`grantsProgression` are display-only now — the
  rule table is the law.

## Database-level invariants added
- `FacilityReservation_no_overlap_live` — btree_gist exclusion
  (`facilityId` =, `tsrange(startsAt, endsAt)` &&) WHERE live statuses;
  CHECK startsAt < endsAt.
- `ProgramVersion_one_active_per_program_key` — partial unique.
- `PositionAppointment_substantive_seat_idx` — partial scan index;
  the seat itself is advisory-lock serialized in-transaction.
- `ulara_org_unit_check_parent` — visited-set cycles, depth ≤ 64,
  same-institution, per-institution advisory lock.
- `ulara_institution_check_parent` — classified same-sector parents,
  cycles, depth ≤ 16, global advisory lock.
- `ulara_minutes_immutable` — version immutability belt.
