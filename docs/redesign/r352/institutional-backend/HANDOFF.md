# R352 — HANDOFF (backend → frontend agent)

> The complete, binding API surface is **`API-CONTRACT.md`** in this
> directory. This file adds integration notes, permissions, error codes,
> and known limitations. Backend branch: `r352/institutional-backend`.
>
> **Measured state at handoff:** 366 OpenAPI operations (253 before,
> additive-only); backend unit suite 2102 green + the two twin-belt rows
> below expected-red; integration suite 150/150 green including the
> two-institution isolation scenario; OpenAPI + contract snapshot
> regenerated and committed.

## 1. What the backend now provides

1. **Institution classification** — sector, kind (10 seeded legal types),
   ownership, supervising authority, establishment decision, lifecycle,
   legally-justified parent. `GET /api/v1/institutions/me/profile`;
   OWNER sets classification via `PATCH /api/v1/owner/institutions/:id/classification`.
2. **Unified org tree** — `/api/v1/institutional/org-units` (+`/tree`);
   18 unit types; Faculty/Department are mirrored (legacy admin surfaces
   still work; new surfaces should read/write org units).
3. **People** — `/api/v1/institutional/people` (10 statutory staff
   categories; optional account link; org-unit homing).
4. **Appointments** — `/api/v1/institutional/appointments` (position
   catalog with institution-kind eligibility + unit-scope requirement;
   decision refs, terms, acting, supersession, full history per person).
5. **Councils** — `/api/v1/governance/*` (councils, memberships, meetings,
   attendance, agenda, resolutions, minutes DRAFT→APPROVED→SIGNED,
   documents).
6. **Programs** — `/api/v1/academic/*` (terms, programs with 5 kinds,
   versions, program-courses, enrollments with enforced transitions,
   training placements).
7. **Credentials** — `/api/v1/academic/credentials` (10 seeded legal
   qualification types with progression flags; award/revoke with serials).
8. **Compliance** — `/api/v1/compliance/*` (external accreditation
   institutional/program, licenses incl. technical license + operating
   permit, inspections, findings with severities, corrective actions,
   internal self-assessments, evidence).
9. **Operations** — `/api/v1/operations/*` (facilities, equipment with
   program/criteria links, work orders, reservations with overlap checks,
   safety incidents).
10. **Research** — `/api/v1/research-projects/*` (+ outputs, bridged to the
    existing student-paper workflow via `researchPaperId`).
11. **Scoped roles** — `/api/v1/me/unit-roles` (self), admin grant/revoke
    via `/api/v1/admin/users/:id/unit-roles` + `/api/v1/admin/unit-roles/:id/revoke`.

## 2. Required capabilities per surface

See API-CONTRACT.md §0. Notables:
- Self-assessment writes need **`QUALITY_INTERNAL_MANAGE`** — granted to
  NOBODY by default (explicit UserPermission or UnitRoleGrant). Keep the
  QUALITY console read-only; surface internal-QA writes only when the
  grant exists.
- All new institutional-management writes need the matching `*_MANAGE`
  capability (ADMIN/OWNER defaults).
- Unit-scoped grants: a user may hold extra role grants narrowed to an org
  unit (or institution-wide); capability checks for unit-scoped actions
  accept the unit or any ancestor unit.

## 3. Response/error contract

- Envelope `{ data }` / `{ data, meta }` (paginated:
  `meta: { page, limit, total, totalPages }`) /
  `{ error: { code, message } }` (Arabic message, English UPPER_SNAKE code).
- New error codes (all 4xx, Arabic messages): `ORG_UNIT_CODE_TAKEN`,
  `ORG_UNIT_DUPLICATE_NAME`, `ORG_UNIT_PARENT_SAME_INSTITUTION`,
  `ORG_UNIT_CYCLE`, `ORG_UNIT_HAS_ACTIVE_CHILDREN`, `ORG_UNIT_CITY_REQUIRED`,
  `PERSON_NUMBER_TAKEN`, `PERSON_USER_ALREADY_LINKED`,
  `PERSON_UNIT_NOT_IN_INSTITUTION`, `APPOINTMENT_CONFLICT`,
  `APPOINTMENT_UNIT_TYPE_REQUIRED`, `APPOINTMENT_DATES_INVALID`,
  `APPOINTMENT_POSITION_NOT_ELIGIBLE`, `COUNCIL_MEMBERSHIP_ACTIVE_EXISTS`,
  `MEETING_SEQ_TAKEN`, `MEETING_INVALID_TRANSITION`,
  `RESOLUTION_INVALID_TRANSITION`, `MINUTES_INVALID_TRANSITION`,
  `TERM_CODE_TAKEN`, `PROGRAM_CODE_TAKEN`,
  `PROGRAM_VERSION_INVALID_TRANSITION`, `PROGRAM_VERSION_ACTIVE_EXISTS`,
  `PROGRAM_COURSE_WRONG_INSTITUTION`, `PROGRAM_ENROLLMENT_EXISTS`,
  `PROGRAM_ENROLLMENT_INVALID_TRANSITION`,
  `ENROLLMENT_PROFILE_WRONG_INSTITUTION`, `CREDENTIAL_SERIAL_TAKEN`,
  `ACCREDITATION_SCOPE_INVALID`, `ACCREDITATION_INVALID_TRANSITION`,
  `LICENSE_INVALID_TRANSITION`, `INSPECTION_INVALID_TRANSITION`,
  `FINDING_INVALID_TRANSITION`, `CORRECTIVE_ACTION_INVALID_TRANSITION`,
  `SELF_ASSESSMENT_INVALID_TRANSITION`, `EVIDENCE_OWNER_INVALID`,
  `FACILITY_CODE_TAKEN`, `EQUIPMENT_CODE_TAKEN`,
  `WORK_ORDER_INVALID_TRANSITION`, `RESERVATION_WINDOW_INVALID`,
  `RESERVATION_OVERLAP`, `RESEARCH_PROJECT_INVALID_TRANSITION`,
  `PROJECT_MEMBER_EXISTS`, `UNIT_ROLE_EXISTS`, `UNIT_ROLE_UNIT_INVALID`,
  `USER_NOT_MEMBER`, `INSTITUTION_KIND_SECTOR_MISMATCH`, `PARENT_CYCLE`,
  `PARENT_SECTOR_MISMATCH`.

## 4. The ADMIN label change (action needed on your side)

Backend `ROLE_LABELS.ADMIN` is now **«إدارة المؤسسة»** (indefinite
«إدارة مؤسسة», plural-oblique «إدارات المؤسسات»). Mirror it in
`frontend/src/lib/roleLabels.ts`. Until then the roleLabels twin belt
(backend `src/lib/__tests__/roleLabels.test.ts` reads your file as source)
is expected-red — that is the designed coordination signal, not a bug.
The job title «المسجل العام» is now a seeded PositionTemplate
(`REGISTRAR_GENERAL`, university kind) — render leadership from
appointments, not from the role label.

## 5. Known limitations (honest)

1. Governance/compliance documents are metadata + URL references — no new
   byte-upload path this round (files workstream owns storage namespaces).
2. Org-unit sibling-name uniqueness is service-enforced (not a DB partial
   index over nullable parent) — the API reports it as 409 consistently.
3. `Enrollment` (course-level) still references User (legacy); program-level
   study uses `ProgramEnrollment` (StudentProfile-based). Both are stable.
4. Faculty/Department legacy write surfaces remain the source for
   Course/StudentProfile/TeacherProfile relations; org-unit write-through
   keeps them synchronized (renames mirror both ways).
5. The criteria sets seeded are the fetched National-Center standard
   TITLES (9 institutional + 8 program) — no invented indicator text.
6. `MEDICAL_BOARD_CERT` is seeded as PhD-equivalent (Law 9/2026 Art. 33
   مكرر) with `grantsProgression=true`.
7. Contract-snapshot coverage of the new routes is read-surface only for
   seeded accounts; full OpenAPI coverage comes from the generator.

## 6. Suggested frontend entry points

- Institution profile card: `GET /institutions/me/profile` +
  `GET /catalog/institution-types` (labels).
- Structure screen: `GET /institutional/org-units/tree`.
- Leadership screen: `GET /institutional/appointments?status=ACTIVE` +
  `GET /catalog/position-templates`.
- Programs screen: `GET /academic/programs?status=ACTIVE` +
  `GET /catalog/credential-types`.
- Compliance screen: `GET /compliance/accreditations` + `/licenses` +
  `/findings` (+ `/self-assessments` behind `QUALITY_INTERNAL_MANAGE`).


---

# r352 hardening handoff (final backend state)

> **Measured state:** OpenAPI regenerated (8 additive paths + the three
> documented unit-roles → unit-capabilities renames); backend unit suite
> 2111 green + the two twin-belt rows expected-red; integration suite
> **160/160**; typecheck 0 errors; lint 0 errors.

## What changed for the frontend

1. **Unit-role surface renamed** `/me/unit-roles` → `/me/unit-capabilities`
   (same for the admin paths); the payload field `role` became
   `capability` (one capability per grant — never a role bundle). The
   grant list item shape is otherwise identical.
2. **New learner endpoints** `/academic/learners` (CRUD) — the
   generalized learner; enrollment/placement/award creates accept
   `learnerProfileId` OR the legacy `studentProfileId` (exactly one).
3. **Enrollment/award gates** (new 4xx/409s): programs must be
   APPROVED/ACTIVE to enroll; credentials require a completed enrollment
   of the same learner; `PROGRESSION_NOT_ALLOWED` (statutory admission
   prerequisites); `LEARNER_ENROLLMENT_CATEGORY_MISMATCH`.
4. **Minutes are versioned**: `GET …/minutes` returns
   `{ data: current, meta: { versions, versionCount } }`; re-drafting a
   signed/approved version mints a new revision (200, versionNo+1) —
   history at `GET …/minutes/history`.
5. **Council status** value `ENDED` → `DISSOLVED`; attendance records
   carry `attendeeKind` (MEMBER/GUEST); meetings list is paginated.
6. **Self-assessment items**: `GET/PUT …/self-assessments/:id/items` +
   corrective-action creation per item.
7. **Documents**: upload via `POST /governance/documents/upload` (raw
   PDF) → attach the returned `binaryObjectId`; download at
   `GET /governance/documents/:id/file`. `fileUrl` is deprecated.

The twin-belt ADMIN-label dependency (2 expected-red unit rows) is
unchanged and still yours — see POST-IMPLEMENTATION-AUDIT.md §I.
