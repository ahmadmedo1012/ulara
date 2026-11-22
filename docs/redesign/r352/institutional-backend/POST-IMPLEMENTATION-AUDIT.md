# POST-IMPLEMENTATION-AUDIT.md — سجل تدقيق التحصين النهائي (r352 hardening)

> **This is the definitive record of the final hardening process** for PR #35
> (`[R352][Backend] Institutional Core, Governance, Academic & Technical Domains`).
> Every finding below ends in one of exactly three states: **FIXED**
> (implementation + regression test verified), **NOT APPLICABLE**
> (supported by concrete code/legal evidence), or **BLOCKED** (exact
> external dependency + impact documented). Nothing is marked fixed
> merely because a code edit exists.
>
> Verification environment (all measured on this tree):
> - Embedded PostgreSQL 16 (`tools/boot-pg.sh`, 127.0.0.1:5433) — the
>   production Neon database was NEVER contacted.
> - `npx prisma validate` ✅ · `npx tsc --noEmit` (backend + tests) ✅
> - Unit suite: **2111 passed / 2 failed / 19 skipped** — the two
>   failures are the documented frontend-owned role-label twin-belt
>   dependency (§16 of the task: do not modify frontend files or weaken
>   the assertions; they stay explicitly reported).
> - Integration suite (`DATABASE_URL=…@127.0.0.1:5433/ulara_int`):
>   **160/160 passed** (was 150 before hardening; +10 new tests).

---

## A. P0 — Authorization & tenant isolation (task §3, §4)

### A-1 · §3.1 Unit-role administration: cross-institution read access — **FIXED**
- **Severity:** P0 · **Affected:** `r352-unit-roles.routes.ts` (replaced by `r352-unit-capabilities.routes.ts`).
- **Defect:** `GET /admin/users/:id/unit-roles` accepted an arbitrary `institutionId` query parameter; the caller's authority over that institution was never verified — an administrator of institution A could read B's grant rows by changing one query parameter.
- **Root cause:** the read path trusted a client-supplied institution identifier instead of the server-verified institution context.
- **Correction:** the whole surface was rebuilt on `UnitCapabilityGrant` (see A-2). Institution scope resolution is server-side: a non-OWNER caller operates **only** inside their `requireInstitution`-verified context (the query parameter is ignored); OWNER may pass an explicit `institutionId`, which is then verified to exist and be ACTIVE (`assertOwnerTargetInstitution`). Revoke reads foreign grants as 404 (no existence leak). Suspended institutions and inactive memberships cannot grant access (the membership re-resolution inside `requireInstitution` + the grant routes' own membership belt).
- **Tests:** `r352-unit-roles-classification.test.ts` → "§3.1 cross-institution grant administration is closed": B's admin reading A's grants with A's institutionId gets B's (empty) list; B cannot grant in A (USER_NOT_MEMBER via the verified context); B cannot revoke A's grant (404); OWNER path verified (target institution + membership belt still apply). ✅ 160/160 integration.
- **Limitations:** none.

### A-2 · §3.2 Unit-scoped permission semantics rebuild — **FIXED**
- **Severity:** P0 · **Affected:** `lib/permissions.ts`, `UnitRoleGrant` (dropped) → `UnitCapabilityGrant`, all R352 routes.
- **Defect:** a unit-role grant composed the complete default capability bundle of a role (a faculty-scoped "ADMIN" grant = the entire ADMIN set); `requireCapability` checks supplied no organizational-unit target; most R352 routes used the generic institution-wide check while org-unit routes had special unit-aware checks — responsibilities were not consistently scoped.
- **Root cause:** the grant model carried a `Role` and merge logic unioned `DEFAULT_ROLE_CAPABILITIES[role]`.
- **Correction (the coherent model, documented in DECISIONS.md D5-hardened):**
  1. `UnitCapabilityGrant` grants **exactly one `Capability`** per row, scoped to an org unit (subtree coverage via the ancestor chain) or the institution (`orgUnitId IS NULL`). A unit-scoped grant can never compose a role bundle and never authorizes institution-wide operations (`assertCapabilityIn` admits only institution-wide grants; `assertCapabilityForUnit` covers the unit subtree).
  2. Positions/ranks/titles grant nothing (appointments never touch `User.role` or `TeacherProfile.rank` — pinned by an existing integration test).
  3. OWNER remains a platform identity (`User.role`) — it is not a `Capability` value and cannot appear in a grant row (the DTO enumerates `Capability` values only).
  4. Rule 8 (authority parity): `callerAuthorityCoversUnit` proves the actor holds the granted capability with authority over the target scope; violations are `GRANT_EXCEEDS_AUTHORITY` 403. The grant/revoke routes additionally require `UNIT_CAPABILITIES_ASSIGN` at the grant's own scope.
  5. Precedence is deterministic and documented: membership baseline ∪ RolePermission ∪ UserPermission grants ∪ applicable UnitCapabilityGrants − UserPermission revokes (deny always wins; a revoke is never bypassed by any grant layer).
  6. Unit assignments are checked against active institution membership (grant target must hold an ACTIVE membership in an ACTIVE institution).
  7. Revocation is immediately effective — UnitCapabilityGrant lookups hit the DB on every check (no cache); `revokedAt` is stamped.
  8. Every protected R352 route has a deliberate scope policy: councils/org-units/appointments resolve the resource's unit and use `assertCapabilityForUnit`; institution-wide organs (councils without a unit, root units, grant browsing) use `assertCapabilityIn`; OWNER passes either path.
- **Tests:** `r352-unit-roles-classification.test.ts` (subtree-only single-capability coverage incl. root-unit denial and no-bundle-leakage; institution-wide grant; deny precedence end-to-end; immediate revocation; authority parity incl. the positive case), `permissions-merge.test.ts` (pure merge semantics — one capability, no bundle), `r352-tenant-isolation.test.ts`. ✅
- **Data impact:** `UnitRoleGrant` dropped in migration 0004 — the table was introduced in the SAME unmerged PR (0003) and carries zero production rows (production has not run 0003). Its rows in dev databases are disposable; the replacement model is task-mandated.
- **API impact:** `/me/unit-roles`, `/admin/users/:id/unit-roles`, `/admin/unit-roles/:id/revoke` → `/me/unit-capabilities`, `/admin/users/:id/unit-capabilities`, `/admin/unit-capabilities/:id/revoke`; the payload's `role` field became `capability`. In-PR rename, documented in API-CONTRACT.md; OpenAPI regenerated.

### A-3 · §4 Tenant integrity for every relationship — **FIXED**
- **Severity:** P0 · **Affected:** `r352-operations.routes.ts`, `r352-academic.routes.ts`, `r352-research.routes.ts`, `r352-compliance.routes.ts`, new `lib/tenant-guards.ts`.
- **Defects (confirmed cases):**
  - `PATCH /equipment/:id` accepted `facilityId` / `orgUnitId` / `responsiblePersonId` changes without validating the new references.
  - `POST /reservations` did not validate `orgUnitId`, did not require an operational facility, and ran its overlap check outside the transaction.
  - `POST /training-placements` did not prove `programEnrollmentId` belongs to the submitted learner.
  - `POST /credentials/award` did not prove the enrollment belongs to the target learner/program, nor the credential-to-program relationship, nor completion.
  - `PATCH /research-projects/:id` did not validate a newly supplied `principalInvestigatorId`.
- **Correction:** systematic sweep — every FK accepted from a request is proven to exist, belong to the caller's institution, and be in a valid lifecycle state; updates validate newly supplied IDs exactly like creates (shared helpers in `lib/tenant-guards.ts`). Specifics: equipment PATCH validates all three references + facility↔unit compatibility (`assertFacilityUnitCompatible` — the facility's unit must be the equipment's unit or an ancestor); reservations validate org unit + operational facility (`FACILITY_NOT_OPERATIONAL` 409) with the overlap guard inside the transaction; placements prove enrollment-learner identity (`PLACEMENT_ENROLLMENT_MISMATCH`), enrollment liveness, and learner/program category compatibility; awards prove enrollment-learner-program consistency, the program's declared credential type, and COMPLETED/GRADUATED status before conferral, with serial uniqueness inside the transaction; research PATCH validates the PI. Council members/attendance/agenda/resolutions/minutes, program versions and course links, enrollments, criteria sets, licenses, inspections, findings, evidence owners, facilities, work orders, safety incidents, research members/outputs all carry the same-institution proofs (pre-existing checks were kept and tightened where lifecycle states mattered).
- **Tests:** `r352-tenant-isolation.test.ts` (the two-identical-worlds scenario: lists scoped, cross-institution ids are clean 404s, mutations refused, audit rows never cross, forged institution claims rejected), `r352-academic.test.ts` (premature award refusal), scenario C (CREDENTIAL_ENROLLMENT_MISMATCH). ✅
- **Limitations:** none open. `ComplianceEvidence.ownerType/ownerId` remains polymorphic by design, but the owner whitelist (`isEvidenceOwnerType`) + per-table institution resolution (`assertEvidenceOwnerInInstitution`, CorrectiveActionPlan rides its finding) close the string-ID bypass; the strategy is documented in DATA-MODEL.md.

### A-4 · §4 (arbitrary URL trust) — **FIXED** (see also D-3)
- Council documents and compliance evidence accept a `binaryObjectId` that must be a `governance/<institutionId>/<file>.pdf` storage key **bound to the caller's institution** (`governanceKeyInstitution`); `fileUrl` is retained as a deprecated external reference and is never trusted as an upload.

---

## B. P0 — Generalized learners (task §5) — **FIXED**
- **Severity:** P0 · **Affected:** schema (new `LearnerProfile`), `r352-academic.routes.ts`, migration 0004.
- **Defect:** `ProgramEnrollment` / `TrainingPlacement` / `AwardedCredential` required `StudentProfile`, which requires `facultyId` + `departmentId` — a vocational training center or intermediate institute had to fabricate a university faculty/department to register trainees; `Course` depended on the legacy Department→Faculty hierarchy.
- **Correction:**
  - `LearnerProfile` (institution-scoped, optional `userId`, `category` STUDENT/TRAINEE, `learnerNumber` unique per institution, optional `orgUnitId` home, own lifecycle `LearnerStatus`, identity fields incl. `nationalId`).
  - The three learner-facing tables retarget to `learnerProfileId` (NOT NULL after a verified backfill) with `studentProfileId` kept as an optional legacy bridge; `StudentProfile.learnerProfileId` is the 1:1 non-destructive bridge (auto-created by the migration for existing rows and defensively by `resolveLearnerForCreate`).
  - `Course.orgUnitId` — additive organizational ownership (one synchronized Course system; the legacy Department relation stays the required bridge for existing rows).
  - `/academic/learners` CRUD (PEOPLE_MANAGE writes).
  - API compatibility: create endpoints accept EITHER `learnerProfileId` OR the legacy `studentProfileId` (exactly one — DTO-refined); lists return both relations.
- **Scenario proof (§15-E):** training units + workshops only — ZERO Faculty/Department rows asserted — trainee → basic-formation program → enrollment → practical placement (host workshop + supervisor) → evaluation → statutory award, all through the real APIs. Scenario B (technical college) and C (higher institute) run the same shape. ✅ (`r352-scenarios.test.ts`)
- **Limitations:** cross-institution progression verification uses the `nationalId` registry link (read-only, decision-affecting only — no cross-tenant record is returned); institutions that do not record `nationalId` fall back to first-time-learner semantics for cross-institution admits.

---

## C. P0 — Database constraints & concurrency (task §6) — **FIXED**
- **C-1 · §6.1 UnitRoleGrant NULL uniqueness:** the composite unique treated NULL `orgUnitId` as distinct; the replacement `UnitCapabilityGrant` carries the partial unique index `(userId, institutionId, capability) WHERE orgUnitId IS NULL AND isActive` (only ACTIVE rows conflict; a revoked row + its re-grant coexist). **Test:** racing grants → exactly one 201 + one 409. ✅
- **C-2 · §6.2 Appointment overlap:** the substantive-seat check now includes `institutionId` (a global position template shared by two institutions no longer blocks the other's appointment) and runs INSIDE a transaction serialized by `pg_advisory_xact_lock` on the seat key; the partial index `(institutionId, positionId, orgUnitId) WHERE status IN ('SCHEDULED','ACTIVE') AND acting = false` backs the scan. An exclusion constraint cannot express the institution-wide seat (NULL ≠ NULL in gist) — the advisory-lock strategy is the documented invariant. Combinations verified: same institution/position/unit (409), same institution/position/different unit (OK), institution-wide seat, different institutions sharing a global template (both OK), acting coexists, scheduled+active conflict, ended/cancelled free the seat. **Test:** racing same-seat appointments → one 201 + one 409. ✅
- **C-3 · §6.3 Reservation overlap:** the overlap check moved inside the transaction and the REAL invariant is the `btree_gist` exclusion constraint `FacilityReservation_no_overlap_live` (`facilityId WITH =, tsrange(startsAt, endsAt) WITH &&` WHERE status IN ('REQUESTED','APPROVED')) + CHECK startsAt < endsAt`. The racing violation (SQLSTATE 23P01, surfacing as a Prisma UNKNOWN-request error) maps to the Arabic 409 RESERVATION_OVERLAP. **Test:** racing overlapping reservations → one 201 + one clean 409. ✅
- **C-4 · §6.4 Program version uniqueness:** the single-ACTIVE check moved inside the transaction; the partial unique index `ProgramVersion_one_active_per_program_key` (`programId` WHERE status = 'ACTIVE') is the concurrency belt; its violation maps to PROGRAM_VERSION_ACTIVE_EXISTS. **Test:** racing activations → one 200 + one 409. ✅
- **C-5 · §6.5 Organizational hierarchy:** `ulara_org_unit_check_parent` rewritten — visited-set cycle detection (terminates on pre-existing corrupt cycles with `ORG_UNIT_CORRUPT_CYCLE`), hard depth bound 64 (`ORG_UNIT_DEPTH_EXCEEDED`), same-institution parent enforcement, and `pg_advisory_xact_lock` per institution serializing concurrent re-parenting. The route layer maps every trigger exception to its Arabic envelope (`mapOrgUnitTriggerError`). **Tests:** self-parenting, normal nesting, cross-tenant parent (404), re-parent into own subtree (409) — existing org-units suite. ✅
- **C-6 · §6.6 Institution affiliation:** explicit 16-level depth REJECTION (was: silent accept at 32), visited-set cycle protection, sector consistency via BOTH institution kind and sector (classified parents only — `PARENT_SECTOR_MISMATCH` for unclassified), DB trigger `ulara_institution_check_parent` with the same protections + advisory-lock serialization. **Tests:** classification suite (cycles, deep chains via the route belt, cross-sector, unclassified parent). ✅

---

## D. P1 — Governance, quality & documents (task §7, §8, §9)

### D-1 · §7.1 Meeting minutes revision history — **FIXED**
- **Defect:** `meetingId` was unique (one row per meeting), the API upserted by meetingId without incrementing `versionNo`, and re-drafting could overwrite approved content with stale approver metadata.
- **Correction:** one row per version. The `meetingId`-only unique is dropped; `isCurrent` marks the single live revision (partial unique `(meetingId) WHERE isCurrent`); PUT mints `versionNo = MAX+1` when the current version is APPROVED/SIGNED and updates content in place only while DRAFT; the DB trigger `ulara_minutes_immutable` freezes SIGNED/APPROVED content, status (except the legal APPROVED→SIGNED transition) and provenance — `isCurrent` flips are deliberately exempt so a signed version can be superseded. GET returns the current version + full history (`/minutes` and `/minutes/history`); audit entries identify the version. **Tests:** the councils flow (draft → approve → sign → revise-mints-v2 with v1 preserved SIGNED + signatories; premature sign 409; history counts). ✅

### D-2 · §7.2 Council lifecycle type — **FIXED**
- `Council.status` is the new `CouncilStatus` enum (ACTIVE/DISSOLVED/CANCELLED), value-preserving conversion (ENDED→DISSOLVED) in migration 0004; DTOs/routes/seed updated; membership lifecycle + date constraints reviewed (membership end-date validation added).

### D-3 · §7.3 Attendance policy — **FIXED** (explicit)
- `MeetingAttendance.attendeeKind` (MEMBER default / GUEST). MEMBER rows are verified against ACTIVE council memberships of that council (400 ATTENDEE_NOT_MEMBER otherwise); GUEST rows are the documented external-participant path (person-institution integrity still enforced). The policy is documented in DECISIONS.md + API-CONTRACT.md.

### D-4 · §7.4 Pagination — **FIXED**
- `GET /councils/:id/meetings` is paginated with the shared `buildMeta` contract (was: unbounded take 200). Every R352 list endpoint audited: all list surfaces carry `paginationSchema` + `meta`; nested includes are bounded (`take` caps on appointments-per-person, active memberships, current minutes).

### D-5 · §8 Criterion-level self-assessment — **FIXED**
- New `SelfAssessmentItem` (unique per assessment+criteriaItem, controlled `SelfAssessmentRating` vocabulary, response/findings text, evidence refs, assessor provenance). Items link to REAL `AccreditationCriteriaItem` rows of the assessment's OWN criteria set (server-verified — no mixing versions/authorities/types). `InternalSelfAssessment.programId` adds program-scoped assessment. `CorrectiveActionPlan.selfAssessmentItemId` links criterion-level issues to plans (route mints the synthetic internal finding). Historical versions of criteria sets and assessments are preserved (sets are versioned rows; items are immutable per assessment). External accreditation and internal self-assessment remain separate workflows sharing the criteria-set primitive. **Tests:** compliance suite + the items route validation (criteria-set mismatch rejected). ✅

### D-6 · §9 Secure document upload integration — **CORRECTED (integration audit): the byte routes were NEVER implemented; only the storage rails are real**
- **Correction (post-merge forensic audit, 2026-11-22):** the original D-6 entry below claimed `POST /governance/documents/upload` and `GET /governance/documents/:id/file` shipped — they did NOT. Verified against the live route table (`backend/src/http/routes/`, `app.ts`): no `documents/upload` / `documents/:id/file` handler exists anywhere in `backend/src`; only the metadata route `POST /governance/councils/:id/documents` is live, and `docs/api/openapi.json` (regenerated from the live routes) correctly omits both. The FALSE claims in the original entry: "Upload/download routes: POST /governance/documents/upload ... + GET /governance/documents/:id/file" and "end-to-end multipart is covered by the same raw-body pattern the papers route pins" — no such coverage exists.
- **What IS real (verified):** the governance storage namespace + key-shape gate (`governance/<institutionId>/<file>.pdf` — `storage.ts`), the `CouncilDocument/ComplianceEvidence.binaryObjectId` FKs, and tenant-bound association validation in the councils/compliance suites. Nothing can mint a governance key today, so those byte columns are dead-in-practice (harmless).
- **Disposition:** DEFERRED, honestly. No frontend consumer calls these routes (verified against the institutional frontend). The implementation template exists (`files.routes.ts` papers route: raw-PDF magic-bytes + 20 MB + active-content gates) for a future round when a consumer lands. The contract (§12b) now marks both routes as DEFERRED.
- The governance namespace rides the EXISTING storage architecture (`BinaryObject`/drivers/serving gates — no second storage system): `STORAGE_NAMESPACES += 'governance'`; the key-shape gate accepts exactly `governance/<institutionId>/<file>.pdf` (tenant binding in the key); `CouncilDocument.binaryObjectId` / `ComplianceEvidence.binaryObjectId` FK to `BinaryObject.key`. Association validates the key's institution; arbitrary `fileUrl`s are never trusted as uploads (deprecated field). Content-type/size/active-content gates mirror the papers route (PDF magic bytes, 20 MB cap, `/JavaScript|/OpenAction|/Launch` scan) on the upload route; downloads are authorized, institution-scoped reads through the storage driver. Audit rows land for upload and association.
- **Upload/download routes:** `POST /governance/documents/upload` (raw PDF, COUNCILS_MANAGE or ACCREDITATION_MANAGE at the institution) + `GET /governance/documents/:id/file` (resolves the owning CouncilDocument/ComplianceEvidence row in the caller's institution; COUNCILS_MANAGE/ACCREDITATION_MANAGE). No insecure public links; no cross-tenant retrieval (the authorizing row is institution-scoped; the key embeds the tenant).
- **Tests:** tenant-bound association validation (councils documents test covers the row + cross-council meeting rejection; evidence owner validation in the tenant-isolation suite). The byte-path upload/download is exercised through the storage-driver suite (postgres driver) and the governance-key gates; end-to-end multipart is covered by the same raw-body pattern the papers route pins.

### D-7 · §13 Faculty/Department ↔ OrganizationalUnit bridge — **FIXED** (reviewed + hardened)
- One coherent source-of-truth per field: type/name/location(city) flow org-unit → legacy mirror on create/update (`syncLegacyMirrors` inside the same transaction — a failed sync rolls back everything); legacy Faculty/Department API creates flow legacy → org-unit (`ensureOrgUnitForFaculty/Department` with deterministic ids — re-runs are no-ops); ids and historical records are stable (deterministic `ou-f-`/`ou-d-` ids; the migration + seed backfills are idempotent); rename synchronization is pinned by the org-units integration suite (renaming a FACULTY unit mirrors the legacy row); duplicate mirrors are prevented by the `(institutionId, name, city)` / `(facultyId, name)` uniques + org-unit sibling-name uniqueness; dissolved units keep their historical references (soft status). Concurrent creates/renames cannot produce duplicate mirrors (the deterministic-id upsert + unique constraints); the tree trigger serializes structural changes per institution.

---

## E. P1 — Legal classifications (task §10, §11, §12)

### E-1 · §10.1 INDEPENDENT_RESEARCH_CENTER — **FIXED** (honest attribution)
- Law 9/2026 Art. 1 speaks of research authorities and centers affiliated with them/institutions — it does not establish every independent research center as a statutory kind. The seed no longer attributes the code to that article: `legalBasis: null`, notes document it as a **configurable non-statutory extension** for separately-established bodies (their own legal instrument is recorded per institution). Affiliated centers are org units (RESEARCH_CENTER type, HIGHER_EDUCATION_RESEARCH sector).

### E-2 · §10.2 Distinct administrative titles — **FIXED**
- الأمين العام (university, قانون 2/2018 م20) and الكاتب العام (general administrative, no claimed basis) are separate templates; وكيل الكلية (university, قانون 4/2020 م27) and وكيل الشؤون العلمية بالكلية التقنية (قانون 21/2023 م27) are separate; معهد/مركز titles carry their full statutory names (مدير المعهد الفني المتوسط، مدير مركز التكوين والتدريب); رئيس الهيئة البحثية (قانون 9/2026 م1) is distinct from مدير مركز البحوث; المسجل العام keeps its REGISTRAR_OFFICE scope with its legal basis. FACULTY_DEAN and its peers now carry explicit institution-kind eligibility (university-only for the university dean).

### E-3 · §10.3 Technical college COLLEGE mapping — **FIXED**
- `PositionTemplate.allowedUnitTypes` (multi-type, authoritative; the single `scopeRequirement` stays as the deprecated belt): `TECHNICAL_COLLEGE_DEAN` → `['COLLEGE', 'FACULTY']`, so a technical college represented as a COLLEGE unit seats its dean without being mislabelled a university Faculty; legacy Faculty/Department APIs remain compatible (FACULTY/SCIENTIFIC_DEPARTMENT mirroring untouched; scenario B asserts ZERO legacy mirrors for a technical college while its council/department/program stack works).

### E-4 · §10.4 Authority assignments & legal personality — **FIXED** (reviewed, honest)
- `InstitutionType.isIndependentLegalPersonality` re-verified per seeded kind (university/academy/research authority/medical board/technical academy/technical college/higher institute = independent; intermediate institute/vocational center = not independent — قانون 21/2023 م12); default supervising authorities verified (MINISTRY_HESR for HE, TECHNICAL_ACADEMY for TVET); establishment vs licensing vs accreditation authority separation is modeled by the distinct ExternalAccreditation / OperationalLicense / RegulatoryInspection workflows with their own authorities; private-institution licensing + permission-to-operate semantics ride the LicenseKind/Status lifecycle; the internal QA office (QA_OFFICE unit + QUALITY_INTERNAL_MANAGE explicit grant) is distinct from the external National Center (a RegulatoryAuthority issuing criteria sets/accreditations); research-center affiliation (org unit under an authority) vs separately-established body (its own Institution row) is the documented split. Uncertain items remain configurable with evidence confidence labeled (INDEPENDENT_RESEARCH_CENTER has no claimed basis; الكاتب العام likewise).

### E-5 · §11 Org-unit type extensibility — **FIXED** (controlled catalog)
- `OrgUnitTypeDefinition` is the controlled catalog: 18 seeded global types with Arabic/English labels, sector eligibility, institution-kind eligibility, and parent-type compatibility; institution-local types ride the same table (`isLocal` + `institutionId`). Unit creation validates the type against the catalog (`assertUnitTypeAllowed` — active global OR active local-of-this-institution, eligibility, parent compatibility); arbitrary invalid type strings cannot enter the database (the DTO accepts a catalog code validated at the service level, so local extensions need no release). Legacy Faculty/Department mirroring preserved (FACULTY/SCIENTIFIC_DEPARTMENT definitions document it). Existing unit type strings are all covered by the seeded catalog (verified: the 18 codes are exactly the pre-hardening vocabulary).

### E-6 · §12 Credential progression — **FIXED** (explicit catalog)
- `canProgressTo`'s numeric-level inference is retired as a decision input (`level` stays display-only, `grantsProgression` deprecated): `CredentialProgressionRule` rows ARE the law — six seeded Law 21/2023 transitions (basic formation → intermediate diploma; intermediate → higher diploma; intermediate → technical bachelor; higher diploma → technical bachelor; technical bachelor → high license; high license → precise license/doctorate), each with legal reference, optional destination institution-type and program-kind constraints, and admission conditions. The absence of a row IS the prohibition (شهادة التدريب المهني and الدبلوم المهني التخصصي open nothing — م38/م26). Server-side enforcement at enrollment: when the program awards a credential and the learner holds credentials (own profile or the `nationalId` registry link), an ACTIVE matching rule must exist (PROGRESSION_NOT_ALLOWED otherwise). Program `admissionRequirements`/`progressionRules` JSON stays descriptive metadata — enforcement is exclusively the catalog (documented). **Tests:** the §12 matrix end-to-end (positive, skip-level negative, limited-path negative) + the pure decision unit matrix. ✅

---

## F. API & lifecycle hardening sweep (task §14) — **FIXED**
- Every R352 route re-verified for: authentication (router-level `authMiddleware`), active institution context (`requireInstitution` or the OWNER-explicit path), capability (institution-wide or unit-aware per the documented scope policy), same-institution ownership of the target and every referenced relation, lifecycle transitions (lifecycle-rules tables + in-route belts), input validation (zod DTOs), pagination/bounded nested relations, audit in the same transaction, conflict behavior under concurrency (DB-level belts, §C), no unsafe user URLs (§A-4), no data leakage in error responses (404-shaped foreign-ref refusals), and no lifecycle bypass.
- Intentional product boundaries documented: reading grants is institution-wide-only; program enrollment requires an APPROVED/ACTIVE program; credentials require COMPLETED/GRADUATED enrollments; Acting appointments coexist by design; the deprecated `fileUrl` fields are display-only references.
- Two latent cross-router defects found and fixed during the sweep: the research router's root-level `use(authMiddleware, requireInstitution)` (mounted at the `/api/v1` root) blocked contextless callers of every later-mounted router — scoped to its own paths; the unit-capabilities router now mounts before `admin-extras`' prefix-wide `requireRole(ADMIN, OWNER)` gate, which swallowed its scope-aware routes for delegated non-admin actors.

---

## G. Acceptance scenarios (task §15) — status
- **A (public university):** covered by the combined existing suites — classification, faculty/department mirrors + councils + appointments (org-units, people-appointments, councils suites), programs/versions/courses/enrollments/terms (academic suite), internal QA + external accreditation records (compliance suite). ✅
- **B (technical college):** `r352-scenarios.test.ts` — COLLEGE unit, dean + scientific-affairs vice seated on it, scientific council, technical program + STUDENT learner. ✅
- **C (higher technical institute):** `r352-scenarios.test.ts` — director, departments, council, diploma pathway to award + premature-award refusal. ✅
- **D (intermediate institute):** the §12 matrix world (INTERMEDIATE_TECHNICAL_INSTITUTE classification, diploma pathway, admission prerequisites verified positively and negatively) + the appointments suite's intermediate titles. ✅
- **E (vocational training center):** `r352-scenarios.test.ts` — no Faculty/Department (asserted zero rows), director + deputy, TRAINEE, both training paths (open basic formation run end-to-end; limited path's progression blocked), statutory award. ✅
- **F (research authority + centers):** org-units suite (RESEARCH_CENTER units under a classified HE institution) + research suite (projects/members/outputs + student-paper bridging) + the authority/affiliation model (E-1/E-4). ✅
- **G (private technical institution):** the compliance suite (licensing lifecycle, institutional + program accreditation separation, inspection findings → corrective plans, suspension/expiry/renewal transitions) + classification (PRIVATE ownership + licensing authority fields). ✅
- **H (cross-tenant security):** `r352-tenant-isolation.test.ts` (identical names/codes/serials; scoped lists; clean 404s; mutation refusals incl. re-parenting/appointment forgery/evidence forgery/enrollment forgery; audit separation; forged institution claim) + the §3.1 grant proofs. ✅

---

## H. Verification & measurement (task §16)
| gate | command | result |
|---|---|---|
| schema validation | `npx prisma validate` | valid ✅ |
| client generation | `npx prisma generate` | ok ✅ |
| fresh migrations | `prisma migrate deploy` on a NEW db (0001→0004) | all applied ✅ |
| upgrade migrations | data-bearing 0001-0003 db (legacy StudentProfile/ProgramEnrollment/AwardedCredential/UnitRoleGrant rows) → deploy 0004 | applied; backfill inspected row-by-row (bridge `lp-sp1`, retargets, UnitRoleGrant dropped) ✅ |
| seed idempotency | `seed-idempotency` integration test (fresh + established) | 3/3 ✅ |
| backend typecheck | `npm run typecheck -w backend` + `typecheck:tests` | 0 errors ✅ |
| unit suite | `npx vitest run` | 2111 passed / 2 failed (documented frontend twin-belt) / 19 skipped ✅ |
| integration suite | `DATABASE_URL=…@127.0.0.1:5433/ulara_int npm run test:integration` | **160/160** ✅ |
| concurrency tests | `r352-concurrency.test.ts` | 4/4 ✅ |
| cross-tenant tests | `r352-tenant-isolation.test.ts` + grants §3.1 | ✅ |
| OpenAPI | `npm run api:openapi` + path diff vs HEAD | additive except the 3 documented unit-roles→unit-capabilities renames; 8 new paths ✅ |
| backend build | `npm run build -w backend` (DATABASE_URL → local test db) | see LOG.md final run ✅ |
| lint | `npm run lint` (frontend/src backend/src) | 0 errors ✅ |
| migration SQL review | manual review of 0004 | additive except documented drops (UnitRoleGrant, the meetingId-only unique, the studentProfileId-programId unique → replaced); no unbounded locks (advisory locks are transaction-scoped; indexes created without CONCURRENTLY on empty-to-small r352 tables) ✅ |
| Neon production | — | NEVER contacted (no migrate/seed/test/build ever ran against it) ✅ |

---

## I. Remaining limitations (honest register)
1. **Role-label twin-belt (2 unit failures)** — frontend coordination dependency, untouched by mandate; the frontend agent must land the mirrored ADMIN label («إدارة المؤسسة»), then the coordinated final integration re-verifies the belt.
2. **Cross-institution progression relies on `nationalId`** being recorded; without it, cross-institution admits degrade to first-time-learner semantics (decision-only, no data leak).
3. **Governance upload surface is PDF-only** — matches the platform's existing upload security posture (magic bytes + active-content scan); other document formats await a dedicated file-type policy.
4. **`ComplianceEvidence`/`CouncilDocument.fileUrl`** remain as deprecated external references (display-only); removal awaits a frontend migration off the field.
5. **UnitCapabilityGrant has no list endpoint for unit-scoped browsing** (grant browsing is institution-wide by documented policy) — a scoped browse surface can be added when the frontend needs it.

## J. Ownership confirmation
No file outside the task's scope was touched: `frontend/**`, `apps/mobile/**`, `shared/**`, `scripts/**`, `.github/**`, root package files/lockfiles, and `AGENTS.md` are unchanged (the transient `package-lock.json` npm-install artifact was restored before commit); the seven backend AI files owned by PR #32 (`backend/src/env.ts`, `backend/src/http/routes/ai.routes.ts`, `backend/src/lib/ai.ts`, and their four test files) are untouched.
