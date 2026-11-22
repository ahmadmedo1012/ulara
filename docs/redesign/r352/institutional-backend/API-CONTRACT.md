# R352 — API Contract (v1, published for the frontend agent)

> **Source of truth for consumers.** All operations are additive to the
> existing `/api/v1` surface; nothing existing is removed or renamed.
> Envelope: success `{ "data": … }` (+ `{ "meta": { page, limit, total,
> totalPages } }` on paginated lists); error `{ "error": { "code",
> "message" } }` with Arabic messages. Pagination: `?page=1&limit=20`
> (limit ≤ 100). IDs are cuids. Dates are ISO-8601 UTC.
>
> **Scope rule:** every `/institutional/*`, `/governance/*`, `/academic/*`,
> `/compliance/*`, `/operations/*`, `/research-projects/*` route below
> resolves the caller's institution from their **verified membership**
> (`requireInstitution`). A client-supplied institution or unit id is NEVER
> trusted as scope: unit ids are validated server-side to belong to the
> caller's institution (cross-institution ids → `404 NOT_FOUND`, never 403 —
> existence is not leaked).
>
> **Common errors** (beyond per-route): `401 UNAUTHENTICATED`,
> `403 INSTITUTION_CONTEXT_REQUIRED` (select institution first),
> `403 INSTITUTION_CONTEXT_INVALID`, `403 FORBIDDEN` (missing capability),
> `400 VALIDATION_ERROR` (zod), `409 CONFLICT` (state/law violations).

## 0. Capability gates (who can call what)

| Capability | Default holders | Guards |
|---|---|---|
| `ORG_STRUCTURE_MANAGE` | ADMIN, OWNER | org-units writes |
| `PEOPLE_MANAGE` | ADMIN, OWNER | people writes |
| `APPOINTMENTS_MANAGE` | ADMIN, OWNER | appointments writes |
| `COUNCILS_MANAGE` | ADMIN, OWNER | councils writes |
| `PROGRAMS_MANAGE` | ADMIN, OWNER | programs/terms/enrollments writes |
| `CREDENTIALS_MANAGE` | ADMIN, OWNER | credential award/revoke |
| `ACCREDITATION_MANAGE` | ADMIN, OWNER | external accreditation/licenses/inspections/findings |
| `QUALITY_INTERNAL_MANAGE` | **nobody by default** — explicit grant only | internal self-assessment writes |
| `FACILITIES_MANAGE` | ADMIN, OWNER | facilities/equipment/work orders |
| `RESEARCH_PROJECTS_MANAGE` | ADMIN, OWNER | research projects |
| `UNIT_CAPABILITIES_ASSIGN` | ADMIN (existing `ROLES_ASSIGN` holders also gate the admin surface) | unit-capability grants (one capability per grant — D5) |

Reads are institution-context (any active member) unless noted. QUALITY's
existing read-only oversight (`QUALITY_VIEW`) applies to the read surfaces.

## 1. Catalogs (public within a session — Bearer, no institution context needed)

| Method | Path | Response `data` |
|---|---|---|
| GET | `/catalog/institution-types` | `[{ id, code, sector, nameAr, nameEn, isIndependentLegalPersonality, legalBasis, defaultAuthorityId }]` |
| GET | `/catalog/regulatory-authorities` | `[{ id, code, nameAr, nameEn, kind }]` |
| GET | `/catalog/credential-types` | `[{ id, code, nameAr, nameEn, level, grantsProgression, legalBasis }]` |
| GET | `/catalog/position-templates` | `[{ id, code, titleAr, titleEn, category, scopeRequirement, eligibleInstitutionTypeCodes, isLocalVariant, institutionId }]` |
| GET | `/catalog/accreditation-criteria-sets` | `[{ id, code, version, nameAr, appliesTo, authorityId, isActive, items: [{ id, code, titleAr }] }]` |

## 2. Institution classification

| Method | Path | Auth | Body / Response |
|---|---|---|---|
| GET | `/institutions/me/profile` | institution context | `data: { institution: { id, name, nameEn, slug, status, sector, kind: {id, code, nameAr} \| null, ownership, supervisingAuthority: {id, code, nameAr} \| null, establishmentDecisionNumber, establishmentDecisionDate, parentId, createdAt, updatedAt } }` |
| PATCH | `/owner/institutions/:id/classification` | OWNER | body `{ sector?, kindCode?, ownership?, supervisingAuthorityCode?, establishmentDecisionNumber?, establishmentDecisionDate?, parentInstitutionId? }` → `data: { institution }`. Errors: `404` unknown id/codes; `409 INSTITUTION_KIND_SECTOR_MISMATCH` (kind's sector ≠ sector); `409 PARENT_CYCLE`; `409 PARENT_SECTOR_MISMATCH`. Audit `institution.classification.update`. |
| PATCH | `/owner/institutions/:id` | OWNER (existing) | unchanged, still name/nameEn/status |

`InstitutionStatus` gains `PENDING_APPROVAL`, `CLOSED`, `MERGED` (existing
values untouched; only `ACTIVE` admits a session context).

## 3. Organizational units (`ORG_STRUCTURE_MANAGE` for writes; reads = context)

Base: `/institutional/org-units`

| Method | Path | Notes |
|---|---|---|
| GET | `/institutional/org-units?type=&q=&parentId=&page=&limit=` | paginated; `data: [unit]`, `meta` |
| GET | `/institutional/org-units/tree` | `data: [{ ...unit, children: [ … ] }]` (bounded depth 20) |
| POST | `/institutional/org-units` | body `{ nameAr, nameEn?, type, code?, parentId?, sortOrder?, location?, contactEmail?, contactPhone?, city? }` (`city` required when type=FACULTY — mirrors legacy). → `201 data: { unit }` |
| GET | `/institutional/org-units/:id` | `data: { unit, ancestors: [unit…] }` |
| PATCH | `/institutional/org-units/:id` | body: any of nameAr/nameEn/code/parentId/status/sortOrder/location/contact fields. Faculties/departments mirror to legacy rows. |
| POST | `/institutional/org-units/:id/status` | body `{ status: "ACTIVE"\|"INACTIVE"\|"DISSOLVED", dissolvedAt? }` |

`unit = { id, institutionId, parentId, code, nameAr, nameEn, type, status,
sortOrder, location, contactEmail, contactPhone, createdAt, updatedAt }`

Errors: `409 ORG_UNIT_CODE_TAKEN`, `409 ORG_UNIT_DUPLICATE_NAME` (sibling),
`400 ORG_UNIT_PARENT_SAME_INSTITUTION` (cross-institution parent — also
DB-triggered), `409 ORG_UNIT_CYCLE`, `409 ORG_UNIT_HAS_ACTIVE_CHILDREN`
(dissolve with children), `400 ORG_UNIT_CITY_REQUIRED`.

## 4. People (`PEOPLE_MANAGE` for writes; reads = context)

Base: `/institutional/people`

| Method | Path | Notes |
|---|---|---|
| GET | `/institutional/people?category=&orgUnitId=&q=&status=&page=&limit=` | paginated |
| POST | `/institutional/people` | `{ fullNameAr, fullNameEn?, category, staffNumber?, userId?, primaryOrgUnitId?, hiredAt?, email?, phone?, notes? }` → 201 |
| GET | `/institutional/people/:id` | + `appointments` (active) + `unitRoleGrants` when populated |
| PATCH | `/institutional/people/:id` | any of the above mutable fields |
| POST | `/institutional/people/:id/status` | `{ status: ACTIVE\|ON_LEAVE\|SUSPENDED\|ENDED, endedAt? }` |

`person = { id, institutionId, userId, staffNumber, fullNameAr, fullNameEn,
category, primaryOrgUnitId, staffStatus, hiredAt, endedAt, email, phone,
createdAt, updatedAt }`
Errors: `409 PERSON_NUMBER_TAKEN`, `409 PERSON_USER_ALREADY_LINKED`,
`400 PERSON_UNIT_NOT_IN_INSTITUTION`.

## 5. Appointments (`APPOINTMENTS_MANAGE`)

Base: `/institutional/appointments`

| Method | Path | Notes |
|---|---|---|
| GET | `/institutional/appointments?status=&personId=&orgUnitId=&positionId=&page=&limit=` | paginated, newest first |
| POST | `/institutional/appointments` | `{ personId, positionCode, orgUnitId?, appointedByAuthority?, decisionNumber?, decisionDate?, startDate, endDate?, termMonths?, acting? }` → 201. Validates: person in institution; template eligible for institution kind; `scopeRequirement` satisfied (org unit of required type — `400 APPOINTMENT_UNIT_TYPE_REQUIRED`); no overlapping substantive appointment (`409 APPOINTMENT_CONFLICT`); startDate ≤ endDate (`400 APPOINTMENT_DATES_INVALID`). Audit `appointment.create`. |
| GET | `/institutional/appointments/:id` | incl. person + position + unit summaries |
| POST | `/institutional/appointments/:id/end` | `{ endDate?, notes? }` → status ENDED (audit) |
| POST | `/institutional/appointments/:id/cancel` | `{ notes? }` → CANCELLED (audit) |
| GET | `/institutional/people/:id/appointments` | full history for one person |

`appointment = { id, institutionId, personId, positionId, orgUnitId,
appointedByAuthority, decisionNumber, decisionDate, startDate, endDate,
termMonths, status, acting, supersededById, notes, createdAt, updatedAt }`
Statuses: `SCHEDULED | ACTIVE | ENDED | CANCELLED`.

## 6. Councils (`COUNCILS_MANAGE` for writes; reads = context)

Base: `/governance/councils`

| Method | Path | Notes |
|---|---|---|
| GET | `/governance/councils?type=&status=&page=&limit=` | paginated |
| POST | `/governance/councils` | `{ nameAr, nameEn?, type, orgUnitId?, code?, legalBasis?, charterRef?, establishedAt? }` → 201 |
| GET | `/governance/councils/:id` | + memberships (active) |
| PATCH | `/governance/councils/:id` | mutable fields incl. status — `status` rides `COUNCIL_TRANSITIONS` (ACTIVE→DISSOLVED\|CANCELLED; CANCELLED→ACTIVE clerical un-cancel; DISSOLVED terminal): `409 COUNCIL_INVALID_TRANSITION` |
| POST | `/governance/councils/:id/members` | `{ personId, role: CHAIR\|DEPUTY_CHAIR\|SECRETARY\|MEMBER\|OBSERVER, startDate, endDate?, decisionRef? }` — `409 COUNCIL_MEMBERSHIP_ACTIVE_EXISTS`; `409 COUNCIL_NOT_ACTIVE` when the council is not ACTIVE |
| POST | `/governance/council-memberships/:id/end` | `{ endDate?, reason? }` |

Meetings:

| Method | Path | Notes |
|---|---|---|
| GET | `/governance/councils/:id/meetings` | list |
| POST | `/governance/councils/:id/meetings` | `{ scheduledAt, location?, seqNumber?, agendaSummary? }` → 201; `409 MEETING_SEQ_TAKEN`; `409 COUNCIL_NOT_ACTIVE` when the council is not ACTIVE |
| GET | `/governance/meetings/:id` | + agenda items + attendance + resolutions + minutes (if any) |
| PATCH | `/governance/meetings/:id` | `{ scheduledAt?, location?, status? }` — `409 MEETING_INVALID_TRANSITION` on illegal status move |
| POST | `/governance/meetings/:id/attendance` | `{ records: [{ personId, status: PRESENT\|ABSENT\|EXCUSED\|LATE }] }` — bulk upsert, persons validated in-institution |
| POST | `/governance/meetings/:id/agenda-items` | `{ orderNo, titleAr, description? }` |
| PATCH | `/governance/agenda-items/:id` | `{ titleAr?, description?, status?, orderNo? }` |
| POST | `/governance/meetings/:id/resolutions` | `{ agendaItemId?, number?, kind: RESOLUTION\|RECOMMENDATION\|FOLLOW_UP_ACTION, textAr, dueDate?, ownerPersonId? }` |
| PATCH | `/governance/resolutions/:id` | `{ status?, approvedAt?, completedAt?, completionRef? }` — transitions DRAFT→APPROVED/REJECTED→IMPLEMENTED/ARCHIVED enforced (`409 RESOLUTION_INVALID_TRANSITION`) |
| GET | `/governance/meetings/:id/minutes` | current minutes or `data: null` |
| PUT | `/governance/meetings/:id/minutes` | `{ contentAr }` — upsert DRAFT minutes (meeting must be HELD) |
| POST | `/governance/meetings/:id/minutes/approve` | `{ approvedByPersonId }` → APPROVED |
| POST | `/governance/meetings/:id/minutes/sign` | `{ signedByPersonId }` → SIGNED (requires APPROVED) |
| POST | `/governance/councils/:id/documents` | `{ titleAr, fileUrl?, kind?, meetingId?, notes? }` (metadata/reference — no byte upload this round) |

## 7. Programs, terms, placements (`PROGRAMS_MANAGE`)

Base: `/academic`

| Method | Path | Notes |
|---|---|---|
| GET | `/academic/terms` | list for institution |
| POST | `/academic/terms` | `{ code, startsAt, endsAt?, isCurrent? }` — `409 TERM_CODE_TAKEN` |
| GET | `/academic/programs?kind=&status=&orgUnitId=&page=&limit=` | paginated |
| POST | `/academic/programs` | `{ code, nameAr, nameEn?, kind, orgUnitId?, credentialTypeCode?, approvalRef?, durationMonths?, totalCreditHours?, admissionRequirements?, progressionRules? }` → 201; `409 PROGRAM_CODE_TAKEN` |
| GET | `/academic/programs/:id` | + versions (+ version.courses count) |
| PATCH | `/academic/programs/:id` | mutable fields; status transitions enforced |
| POST | `/academic/programs/:id/versions` | `{ label, effectiveFrom?, approvalRef? }` → 201 DRAFT |
| PATCH | `/academic/program-versions/:id` | `{ status?: DRAFT→APPROVED→ACTIVE→RETIRED, effectiveFrom?, approvalRef? }` — `409 PROGRAM_VERSION_INVALID_TRANSITION`; only one ACTIVE version per program (`409 PROGRAM_VERSION_ACTIVE_EXISTS`) |
| GET | `/academic/program-versions/:id/courses` | list |
| POST | `/academic/program-versions/:id/courses` | `{ courseId, termNo?, kind: CORE\|ELECTIVE\|PRACTICUM\|CAPSTONE\|SUPPORTING, creditHours? }` — course must belong to the same institution (`400 PROGRAM_COURSE_WRONG_INSTITUTION`) |
| DELETE | `/academic/program-versions/:id/courses/:courseId` | `{ ok: true }` |
| GET | `/academic/program-enrollments?programId=&studentProfileId=&status=&page=&limit=` | paginated |
| POST | `/academic/program-enrollments` | `{ studentProfileId, programId, programVersionId?, expectedCompletionAt? }` — profile must be in-institution (`400 ENROLLMENT_PROFILE_WRONG_INSTITUTION`); `409 PROGRAM_ENROLLMENT_EXISTS` |
| POST | `/academic/program-enrollments/:id/status` | `{ status: CANDIDATE→ACTIVE→(ON_LEAVE⇄ACTIVE)→COMPLETED/GRADUATED/WITHDRAWN/SUSPENDED, completionAt? }` — enforced transitions (`409 PROGRAM_ENROLLMENT_INVALID_TRANSITION`) |
| GET | `/academic/training-placements?status=&studentProfileId=&page=&limit=` | paginated |
| POST | `/academic/training-placements` | `{ studentProfileId, programEnrollmentId?, hostOrgUnitId?, externalHost?, supervisorPersonId?, startsAt, endsAt? }` |
| PATCH | `/academic/training-placements/:id` | status/evaluation updates |

## 8. Credentials (`CREDENTIALS_MANAGE`)

Base: `/academic/credentials`

| Method | Path | Notes |
|---|---|---|
| GET | `/academic/credentials?studentProfileId=&credentialTypeId=&page=&limit=` | paginated |
| POST | `/academic/credentials/award` | `{ studentProfileId, credentialTypeCode, programId?, programEnrollmentId?, decisionNumber?, decisionDate?, conferredAt?, serialNumber?, notes? }` → 201; profile/program in-institution validated; `409 CREDENTIAL_SERIAL_TAKEN` |
| POST | `/academic/credentials/:id/revoke` | `{ notes? }` → status REVOKED (audit) |

`credential = { id, institutionId, studentProfileId, credentialTypeId,
programId, programEnrollmentId, decisionNumber, decisionDate, conferredAt,
serialNumber, status, notes, createdAt, updatedAt }`

## 9. Compliance: accreditation, licenses, inspections, findings

Base: `/compliance` (external records — `ACCREDITATION_MANAGE`; internal
self-assessments — `QUALITY_INTERNAL_MANAGE`; reads = context)

| Method | Path | Notes |
|---|---|---|
| GET | `/compliance/accreditations?status=&type=&page=&limit=` | paginated |
| POST | `/compliance/accreditations` | `{ type: INSTITUTIONAL\|PROGRAM, authorityCode, scopeType: INSTITUTION\|ORGANIZATIONAL_UNIT\|PROGRAM, orgUnitId?, programId?, decisionNumber?, decisionDate?, effectiveFrom?, effectiveTo?, criteriaSetId?, reportRef?, notes? }` — scope targets validated in-institution (`400 ACCREDITATION_SCOPE_INVALID`) |
| PATCH | `/compliance/accreditations/:id` | status transitions enforced: PENDING→IN_REVIEW→(GRANTED\|CONDITIONAL\|REJECTED?)→RENEWED/SUSPENDED/REVOKED/EXPIRED/WITHDRAWN (`409 ACCREDITATION_INVALID_TRANSITION`) |
| GET | `/compliance/licenses?status=&kind=&page=&limit=` | paginated |
| POST | `/compliance/licenses` | `{ kind: TECHNICAL_LICENSE\|OPERATING_PERMIT\|ESTABLISHMENT_DECISION\|OTHER, authorityCode, licenseNumber?, scopeType?, orgUnitId?, programId?, issuedAt?, expiresAt?, conditions?, documentRef? }` |
| PATCH | `/compliance/licenses/:id` | status transitions (PENDING→ACTIVE→RENEWED/SUSPENDED/REVOKED/EXPIRED) |
| GET | `/compliance/inspections?status=&page=&limit=` | paginated |
| POST | `/compliance/inspections` | `{ authorityCode, kind, orgUnitId?, scheduledAt?, reportRef? }` |
| PATCH | `/compliance/inspections/:id` | `{ scheduledAt?, conductedAt?, status?: SCHEDULED→IN_PROGRESS→COMPLETED\|CANCELLED, summary?, reportRef? }` |
| GET | `/compliance/findings?status=&severity=&page=&limit=` | paginated |
| POST | `/compliance/findings` | `{ severity: MINOR\|MAJOR\|CRITICAL, titleAr, description?, inspectionId?, externalAccreditationId?, orgUnitId?, programId?, legalReference?, dueDate? }` |
| PATCH | `/compliance/findings/:id` | status transitions OPEN→ACKNOWLEDGED→IN_REMEDIATION→RESOLVED→CLOSED (+DISPUTED) |
| POST | `/compliance/findings/:id/corrective-actions` | `{ planText, ownerPersonId?, targetDate? }` |
| PATCH | `/compliance/corrective-actions/:id` | `{ status?: PLANNED→IN_PROGRESS→COMPLETED→VERIFIED\|CANCELLED, completedAt?, verificationRef? }` |
| GET | `/compliance/self-assessments?status=&page=&limit=` | internal QA workflow (`QUALITY_INTERNAL_MANAGE` for writes) |
| POST | `/compliance/self-assessments` | `{ periodLabel, orgUnitId?, criteriaSetId?, summary? }` |
| PATCH | `/compliance/self-assessments/:id` | status transitions DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED→ARCHIVED |
| GET | `/compliance/evidence?ownerType=&ownerId=&page=&limit=` | paginated |
| POST | `/compliance/evidence` | `{ ownerType, ownerId, titleAr, documentRef?, fileUrl?, description? }` — owning record validated in-institution (`400 EVIDENCE_OWNER_INVALID`) |

## 10. Facilities & equipment (`FACILITIES_MANAGE`)

Base: `/operations`

| Method | Path | Notes |
|---|---|---|
| GET | `/operations/facilities?type=&status=&page=&limit=` | paginated |
| POST | `/operations/facilities` | `{ nameAr, nameEn?, type, code?, orgUnitId?, building?, room?, capacity?, safetyNotes? }` — `409 FACILITY_CODE_TAKEN` |
| GET | `/operations/facilities/:id` | + equipment count |
| PATCH | `/operations/facilities/:id` | mutable fields + status |
| GET | `/operations/equipment?status=&facilityId=&page=&limit=` | paginated |
| POST | `/operations/equipment` | `{ nameAr, nameEn?, code?, facilityId?, orgUnitId?, category?, serialNumber?, acquiredAt?, value?, condition?, status?, responsiblePersonId? }` |
| PATCH | `/operations/equipment/:id` | mutable fields + condition/status |
| POST | `/operations/equipment/:id/programs` | `{ programId, criteriaItemId? }` — link |
| DELETE | `/operations/equipment/:id/programs/:programId` | `{ ok: true }` |
| GET | `/operations/work-orders?status=&equipmentId=&page=&limit=` | paginated |
| POST | `/operations/work-orders` | `{ titleAr, kind, facilityId?, equipmentId?, description?, scheduledDate?, assignedPersonId? }` |
| PATCH | `/operations/work-orders/:id` | `{ status?: OPEN→IN_PROGRESS→COMPLETED\|CANCELLED, completedAt?, cost?, notes? }` |
| GET | `/operations/reservations?facilityId=&status=&page=&limit=` | paginated |
| POST | `/operations/reservations` | `{ facilityId, purpose, startsAt, endsAt, orgUnitId? }` — `400 RESERVATION_WINDOW_INVALID` (end ≤ start), `409 RESERVATION_OVERLAP` |
| PATCH | `/operations/reservations/:id` | `{ status?: REQUESTED→APPROVED\|REJECTED→CANCELLED\|COMPLETED }` — `409 RESERVATION_INVALID_TRANSITION` on illegal status move |
| GET | `/operations/safety-incidents?status=&page=&limit=` | paginated |
| POST | `/operations/safety-incidents` | `{ kind: INCIDENT\|INSPECTION, severity?, titleAr, description?, facilityId?, equipmentId?, occurredAt }` |
| PATCH | `/operations/safety-incidents/:id` | `{ status?, resolutionNotes?, resolvedAt? }` |

## 11. Research projects (`RESEARCH_PROJECTS_MANAGE`)

Base: `/research-projects`

| Method | Path | Notes |
|---|---|---|
| GET | `/research-projects?status=&page=&limit=` | paginated |
| POST | `/research-projects` | `{ titleAr, titleEn?, code?, orgUnitId?, field?, principalInvestigatorId?, startsAt?, endsAt?, fundingSource?, budget?, ethicsApprovalRef? }` |
| GET | `/research-projects/:id` | + members |
| PATCH | `/research-projects/:id` | status transitions PROPOSED→APPROVED→ACTIVE→(SUSPENDED⇄ACTIVE)→COMPLETED\|TERMINATED |
| POST | `/research-projects/:id/members` | `{ personId, role, allocationPct? }` — `409 PROJECT_MEMBER_EXISTS` |
| DELETE | `/research-projects/:id/members/:personId` | `{ ok: true }` |
| GET | `/research-outputs?projectId=&type=&page=&limit=` | paginated |
| POST | `/research-outputs` | `{ type, title, projectId?, personId?, referenceUrl?, doi?, publishedAt?, notes?, researchPaperId? }` |

## 12. Scoped capability grants (r352 hardening §3.1/§3.2 — replaces the unit-roles surface)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me/unit-capabilities` | institution context | caller's active `UnitCapabilityGrant[]` |
| GET | `/admin/users/:id/unit-capabilities` | `UNIT_CAPABILITIES_ASSIGN` (institution-wide) | a user's grants — **the institution is the caller's SERVER-VERIFIED context**; the `?institutionId=` query parameter is honored for OWNER only (target verified to exist + be ACTIVE). A non-OWNER caller passing a foreign institutionId gets THEIR OWN institution's (empty) list — §3.1 |
| POST | `/admin/users/:id/unit-capabilities` | `UNIT_CAPABILITIES_ASSIGN` at the grant's scope | `{ institutionId, orgUnitId?, capability, reason? }` — target must hold an ACTIVE membership (`400 USER_NOT_MEMBER`); grantee unit same-institution (404-shaped); actor authority parity (`403 GRANT_EXCEEDS_AUTHORITY`); `409` duplicates (partial unique belt incl. racing requests); audit `unit_capability.grant` |
| POST | `/admin/unit-capabilities/:id/revoke` | `UNIT_CAPABILITIES_ASSIGN` at the grant's scope | → isActive=false + revokedAt (immediately effective — no grant cache); foreign grants read as 404; audit `unit_capability.revoke` |

**The scoped model (DECISIONS.md D5-hardened):** each grant row adds
EXACTLY ONE capability, scoped to a unit subtree or the institution.
Institution-wide operations (`assertCapabilityIn`) admit only
institution-wide grants; unit-targeted operations
(`assertCapabilityForUnit`) cover the target unit + its ancestors.
OWNER is a platform identity and can never be granted. Deny precedence:
membership baseline ∪ RolePermission ∪ UserPermission grants ∪ applicable
unit grants − UserPermission revokes — **a revoke is never bypassed by any
grant layer**. `GET /me/permissions` reflects the merged set.

**ADMIN label correction:** the backend `ROLE_LABELS.ADMIN` becomes
«إدارة المؤسسة» (institutional administration). Technical identifiers
unchanged. The frontend twin (`frontend/src/lib/roleLabels.ts`) must mirror
it — see HANDOFF.

## 12b. r352 hardening additions (all additive)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST | `/academic/learners` | `PEOPLE_MANAGE` writes; reads = context | the generalized learner (STUDENT/TRAINEE, no Faculty/Department required) |
| GET/PATCH | `/academic/learners/:id` | `PEOPLE_MANAGE` writes | status lifecycle ACTIVE/SUSPENDED/GRADUATED/WITHDRAWN/TRANSFERRED |
| GET | `/governance/meetings/:id/minutes/history` | context | full versioned minutes history |
| PUT | `/governance/meetings/:id/minutes` | `COUNCILS_MANAGE` at the council's scope | versioning contract: DRAFT updated in place; APPROVED/SIGNED current mints versionNo+1 (signed content + signatories preserved — DB trigger belt) |
| GET/PUT | `/compliance/self-assessments/:id/items` | `QUALITY_INTERNAL_MANAGE` writes | criterion-level responses; the criteria item must belong to the assessment's OWN criteria set (400 otherwise) |
| POST | `/compliance/self-assessments/:id/items/:itemId/corrective-action` | `QUALITY_INTERNAL_MANAGE` | corrective plan from a criterion-level issue |
| POST | `/governance/documents/upload` | `COUNCILS_MANAGE` or `ACCREDITATION_MANAGE` | raw `application/pdf` (magic bytes + 20 MB + active-content gates); returns the tenant-bound `governance/<institutionId>/<file>.pdf` key |
| GET | `/governance/documents/:id/file` | capability | authorized, institution-scoped PDF download through the storage driver |

**Behavioral gates added (documented, tested):** program enrollment
requires an APPROVED/ACTIVE program; credentials require a
COMPLETED/GRADUATED enrollment of the SAME learner (+ the program's
declared credential type); statutory admission prerequisites are enforced
via the CredentialProgressionRule catalog (`409 PROGRESSION_NOT_ALLOWED`);
learner/program category compatibility (`400
LEARNER_ENROLLMENT_CATEGORY_MISMATCH`, Law 21/2023 Art. 2);
`Council.status` uses CouncilStatus (DISSOLVED); attendance carries
`attendeeKind` (MEMBER verified against active memberships; GUEST
documented); council meetings list is paginated with `meta`; reservations
require an operational facility and reject overlaps with a DB-level
exclusion constraint (Arabic 409 under racing requests); equipment PATCH
validates every newly supplied reference; research-project PATCH validates
a newly supplied PI; affiliation parents must be classified institutions
(same sector), 16 levels max.

## 13. What does NOT change

- All existing routes, fields, envelopes, error codes (additive-only
  contract suite still guards the snapshot).
- `Faculty`/`Department`/`Course`/`CourseOffering`/`Enrollment` APIs and
  the admin structure flows (now write-through synced with org units).
- `TeacherProfile` self-service surface (`/me/teacher-profile`) — the
  `position` columns remain readable; new appointment history is additive.
- `TrainingTrack` (platform self-development) — untouched, NOT the TVET
  program model.
- `VirtualLab`/`LabSession` — untouched; physical facilities are a separate
  domain (`/operations/*`).
