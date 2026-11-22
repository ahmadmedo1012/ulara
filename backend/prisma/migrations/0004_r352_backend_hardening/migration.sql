-- r352 BACKEND HARDENING (PR #35 follow-up) — additive to 0003.
--
-- Scope (per POST-IMPLEMENTATION-AUDIT.md):
--   §3.2  UnitCapabilityGrant replaces UnitRoleGrant (single scoped
--         capabilities — never role bundles).
--   §5    LearnerProfile: the generalized learner domain (no forced
--         Faculty/Department); ProgramEnrollment / TrainingPlacement /
--         AwardedCredential retarget to it; StudentProfile keeps a
--         non-destructive 1:1 bridge; Course gains an additive
--         organizational owner.
--   §6    Concurrency invariants: partial unique for institution-wide
--         capability grants, one ACTIVE ProgramVersion per program,
--         facility-reservation overlap exclusion constraint (btree_gist),
--         appointment-seat partial index, cycle-safe + depth-bounded +
--         advisory-lock-serialized org-unit and institution-affiliation
--         triggers.
--   §7    CouncilStatus (own lifecycle), MeetingMinutes real versioning
--         (isCurrent + immutability trigger), attendance attendeeKind.
--   §8    SelfAssessmentItem (criterion-level internal assessment),
--         CorrectiveActionPlan origin link, program-scoped assessments.
--   §9    CouncilDocument / ComplianceEvidence binaryObject storage links.
--   §11   OrgUnitTypeDefinition controlled catalog.
--   §12   CredentialProgressionRule explicit transition catalog.
--   §10.3 PositionTemplate.allowedUnitTypes (multi-type unit scope).
--
-- Data impact: purely additive except (a) UnitRoleGrant is DROPPED — the
-- table was introduced in the SAME unmerged PR (0003), carries zero
-- production rows (production has not run 0003), and its replacement is
-- the task-mandated scoped-capability model; (b) the three learner FK
-- columns are backfilled from the StudentProfile bridge before being
-- made NOT NULL; (c) Council.status values map 1:1 (ENDED → DISSOLVED).
-- No other column, row, or ID is dropped or rewritten.

-- ── 1. New enums ──────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "CouncilStatus" AS ENUM ('ACTIVE', 'DISSOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingAttendeeKind" AS ENUM ('MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "LearnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "SelfAssessmentRating" AS ENUM ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_ASSESSED', 'NOT_APPLICABLE');

-- ── 2. Capability enum evolution (UNIT_ROLES_ASSIGN → UNIT_CAPABILITIES_ASSIGN) ──

-- AlterEnum
BEGIN;
CREATE TYPE "Capability_new" AS ENUM ('RESEARCH_GRADE_OWN', 'RESEARCH_GRADE_ANY', 'RESEARCH_PUBLISH', 'EXAMS_AUTHOR', 'EXAMS_MODERATE', 'EXAMS_TAKE', 'CURRICULUM_EDIT_OWN', 'CURRICULUM_EDIT_ANY', 'USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'QUALITY_VIEW', 'QUALITY_REPORT', 'ANNOUNCE_PLATFORM', 'ANNOUNCE_FACULTY', 'COMPETITIONS_RUN', 'EVENTS_RUN', 'ORG_STRUCTURE_MANAGE', 'PEOPLE_MANAGE', 'APPOINTMENTS_MANAGE', 'COUNCILS_MANAGE', 'PROGRAMS_MANAGE', 'CREDENTIALS_MANAGE', 'ACCREDITATION_MANAGE', 'QUALITY_INTERNAL_MANAGE', 'FACILITIES_MANAGE', 'RESEARCH_PROJECTS_MANAGE', 'UNIT_CAPABILITIES_ASSIGN');
ALTER TABLE "RolePermission" ALTER COLUMN "capability" TYPE "Capability_new" USING ("capability"::text::"Capability_new");
ALTER TABLE "UserPermission" ALTER COLUMN "capability" TYPE "Capability_new" USING ("capability"::text::"Capability_new");
ALTER TYPE "Capability" RENAME TO "Capability_old";
ALTER TYPE "Capability_new" RENAME TO "Capability";
DROP TYPE "Capability_old";
COMMIT;

-- ── 3. UnitRoleGrant → UnitCapabilityGrant (§3.2) ─────────────────

-- DropForeignKey
ALTER TABLE "UnitRoleGrant" DROP CONSTRAINT "UnitRoleGrant_userId_fkey";

-- DropForeignKey
ALTER TABLE "UnitRoleGrant" DROP CONSTRAINT "UnitRoleGrant_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "UnitRoleGrant" DROP CONSTRAINT "UnitRoleGrant_orgUnitId_fkey";

-- DropTable
DROP TABLE "UnitRoleGrant";

-- CreateTable
CREATE TABLE "UnitCapabilityGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "capability" "Capability" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" TEXT,
    "reason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitCapabilityGrant_institutionId_orgUnitId_idx" ON "UnitCapabilityGrant"("institutionId", "orgUnitId");

-- CreateIndex
CREATE INDEX "UnitCapabilityGrant_userId_isActive_idx" ON "UnitCapabilityGrant"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UnitCapabilityGrant_capability_idx" ON "UnitCapabilityGrant"("capability");

-- CreateIndex
CREATE UNIQUE INDEX "UnitCapabilityGrant_userId_institutionId_orgUnitId_capabili_key" ON "UnitCapabilityGrant"("userId", "institutionId", "orgUnitId", "capability");

-- AddForeignKey
ALTER TABLE "UnitCapabilityGrant" ADD CONSTRAINT "UnitCapabilityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCapabilityGrant" ADD CONSTRAINT "UnitCapabilityGrant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCapabilityGrant" ADD CONSTRAINT "UnitCapabilityGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- §6.1: NULLs are distinct in the composite unique above — the partial
-- index below is the REAL institution-wide uniqueness belt (only ACTIVE
-- rows conflict; a revoked row plus its re-grant coexist).
CREATE UNIQUE INDEX "UnitCapabilityGrant_institution_wide_active_key"
    ON "UnitCapabilityGrant"("userId", "institutionId", "capability")
    WHERE "orgUnitId" IS NULL AND "isActive";

-- ── 4. The generalized learner domain (§5) ────────────────────────

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT,
    "category" "LearnerCategory" NOT NULL,
    "learnerNumber" TEXT NOT NULL,
    "fullNameAr" TEXT NOT NULL,
    "fullNameEn" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "nationalId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "orgUnitId" TEXT,
    "status" "LearnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerProfile_institutionId_category_status_idx" ON "LearnerProfile"("institutionId", "category", "status");

-- CreateIndex
CREATE INDEX "LearnerProfile_orgUnitId_idx" ON "LearnerProfile"("orgUnitId");

-- CreateIndex
CREATE INDEX "LearnerProfile_userId_idx" ON "LearnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_institutionId_learnerNumber_key" ON "LearnerProfile"("institutionId", "learnerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_institutionId_userId_key" ON "LearnerProfile"("institutionId", "userId");

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The StudentProfile bridge column (non-destructive).
-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "learnerProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_learnerProfileId_key" ON "StudentProfile"("learnerProfileId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Retarget the three learner-facing tables (nullable first, backfill,
-- then NOT NULL below).
-- AlterTable
ALTER TABLE "ProgramEnrollment" ADD COLUMN "learnerProfileId" TEXT,
ALTER COLUMN "studentProfileId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TrainingPlacement" ADD COLUMN "learnerProfileId" TEXT,
ALTER COLUMN "studentProfileId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AwardedCredential" ADD COLUMN "learnerProfileId" TEXT,
ALTER COLUMN "studentProfileId" DROP NOT NULL;

-- DropIndex (replaced by the learnerProfileId unique below)
DROP INDEX "ProgramEnrollment_studentProfileId_programId_key";

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Learner bridge backfill (deterministic ids — re-run safe) ──
-- One LearnerProfile per StudentProfile, mapped through the User for
-- the display name, the department mirror for the org-unit home, and
-- the profile's own legal category + registration number.
INSERT INTO "LearnerProfile" (
    "id", "institutionId", "userId", "category", "learnerNumber",
    "fullNameAr", "email", "orgUnitId", "status", "enrolledAt",
    "notes", "createdAt", "updatedAt"
)
SELECT
    'lp-' || sp."id",
    sp."institutionId",
    sp."userId",
    sp."learnerCategory",
    sp."universityId",
    COALESCE(u."firstName" || ' ' || u."lastName", 'متعلم ' || sp."universityId"),
    u."email",
    d."orgUnitId",
    'ACTIVE',
    sp."createdAt",
    'جسر تلقائي من ملف الطالب القديم (r352 hardening §5)',
    NOW(),
    NOW()
FROM "StudentProfile" sp
JOIN "User" u ON u."id" = sp."userId"
LEFT JOIN "Department" d ON d."id" = sp."departmentId"
WHERE NOT EXISTS (
    SELECT 1 FROM "LearnerProfile" lp WHERE lp."id" = 'lp-' || sp."id"
);

UPDATE "StudentProfile" sp
SET "learnerProfileId" = 'lp-' || sp."id"
WHERE sp."learnerProfileId" IS NULL
  AND EXISTS (SELECT 1 FROM "LearnerProfile" lp WHERE lp."id" = 'lp-' || sp."id");

UPDATE "ProgramEnrollment" pe
SET "learnerProfileId" = sp."learnerProfileId"
FROM "StudentProfile" sp
WHERE pe."studentProfileId" = sp."id"
  AND pe."learnerProfileId" IS NULL
  AND sp."learnerProfileId" IS NOT NULL;

UPDATE "TrainingPlacement" tp
SET "learnerProfileId" = sp."learnerProfileId"
FROM "StudentProfile" sp
WHERE tp."studentProfileId" = sp."id"
  AND tp."learnerProfileId" IS NULL
  AND sp."learnerProfileId" IS NOT NULL;

UPDATE "AwardedCredential" ac
SET "learnerProfileId" = sp."learnerProfileId"
FROM "StudentProfile" sp
WHERE ac."studentProfileId" = sp."id"
  AND ac."learnerProfileId" IS NULL
  AND sp."learnerProfileId" IS NOT NULL;

-- Any pre-hardening row whose bridge failed to resolve (orphaned
-- studentProfile) would block SET NOT NULL. These tables are r352-new
-- with no production rows; guard explicitly so the migration FAILS
-- LOUDLY instead of silently dropping the invariant.
DO $$
DECLARE orphaned BIGINT;
BEGIN
    SELECT count(*) INTO orphaned FROM "ProgramEnrollment" WHERE "learnerProfileId" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'R352_BACKFILL_ORPHAN: % ProgramEnrollment rows have no learner profile', orphaned;
    END IF;
    SELECT count(*) INTO orphaned FROM "TrainingPlacement" WHERE "learnerProfileId" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'R352_BACKFILL_ORPHAN: % TrainingPlacement rows have no learner profile', orphaned;
    END IF;
    SELECT count(*) INTO orphaned FROM "AwardedCredential" WHERE "learnerProfileId" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'R352_BACKFILL_ORPHAN: % AwardedCredential rows have no learner profile', orphaned;
    END IF;
END
$$;

-- Backfill verified — tighten the columns.
ALTER TABLE "ProgramEnrollment" ALTER COLUMN "learnerProfileId" SET NOT NULL;
ALTER TABLE "TrainingPlacement" ALTER COLUMN "learnerProfileId" SET NOT NULL;
ALTER TABLE "AwardedCredential" ALTER COLUMN "learnerProfileId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ProgramEnrollment_learnerProfileId_idx" ON "ProgramEnrollment"("learnerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_learnerProfileId_programId_key" ON "ProgramEnrollment"("learnerProfileId", "programId");

-- CreateIndex
CREATE INDEX "TrainingPlacement_learnerProfileId_idx" ON "TrainingPlacement"("learnerProfileId");

-- CreateIndex
CREATE INDEX "AwardedCredential_learnerProfileId_idx" ON "AwardedCredential"("learnerProfileId");

-- ── 6. Course organizational ownership (§5 — additive) ────────────

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "orgUnitId" TEXT;

-- CreateIndex
CREATE INDEX "Course_orgUnitId_idx" ON "Course"("orgUnitId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 7. Council own lifecycle (§7.2 — value-preserving conversion) ─

ALTER TABLE "Council"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "CouncilStatus" USING (
        CASE "status"::text
            WHEN 'ACTIVE' THEN 'ACTIVE'::"CouncilStatus"
            WHEN 'ENDED' THEN 'DISSOLVED'::"CouncilStatus"
            WHEN 'CANCELLED' THEN 'CANCELLED'::"CouncilStatus"
            ELSE 'ACTIVE'::"CouncilStatus"
        END
    ),
    ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- ── 8. MeetingMinutes real versioning (§7.1) ──────────────────────

-- DropIndex (a meeting now has MANY versions)
DROP INDEX "MeetingMinutes_meetingId_key";

-- AlterTable
ALTER TABLE "MeetingMinutes" ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "MeetingMinutes_meetingId_isCurrent_idx" ON "MeetingMinutes"("meetingId", "isCurrent");

-- Exactly one current version per meeting (the belt the API relies on).
CREATE UNIQUE INDEX "MeetingMinutes_one_current_version_key"
    ON "MeetingMinutes"("meetingId") WHERE "isCurrent";

-- Immutability belt: a SIGNED/APPROVED version's CONTENT, STATUS and
-- PROVENANCE never change (re-drafting MUST create a new version — the
-- route layer is the deliberate path, this is the database invariant of
-- record). The isCurrent flag is deliberately EXEMPT: superseding a
-- signed version (minting the next revision) flips only that flag.
CREATE OR REPLACE FUNCTION ulara_minutes_immutable() RETURNS trigger AS $$
BEGIN
    IF OLD."status" = 'SIGNED' AND (
           NEW."contentAr" IS DISTINCT FROM OLD."contentAr"
        OR NEW."status" IS DISTINCT FROM OLD."status"
        OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"
        OR NEW."approvedByPersonId" IS DISTINCT FROM OLD."approvedByPersonId"
        OR NEW."signedAt" IS DISTINCT FROM OLD."signedAt"
        OR NEW."signedByPersonId" IS DISTINCT FROM OLD."signedByPersonId"
    ) THEN
        RAISE EXCEPTION 'MINUTES_SIGNED_IMMUTABLE: a signed minutes version cannot be modified';
    END IF;
    IF OLD."status" = 'APPROVED' AND (
           NEW."contentAr" IS DISTINCT FROM OLD."contentAr"
        OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"
        OR NEW."approvedByPersonId" IS DISTINCT FROM OLD."approvedByPersonId"
        -- The APPROVED → SIGNED transition is the legal lifecycle; any
        -- other status change must mint a new version instead.
        OR (NEW."status" IS DISTINCT FROM OLD."status" AND NEW."status" <> 'SIGNED')
    ) THEN
        RAISE EXCEPTION 'MINUTES_APPROVED_IMMUTABLE: re-drafting must create a new version';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER minutes_version_invariants
BEFORE UPDATE ON "MeetingMinutes"
FOR EACH ROW EXECUTE FUNCTION ulara_minutes_immutable();

-- ── 9. Attendance policy (§7.3) ───────────────────────────────────

-- AlterTable
ALTER TABLE "MeetingAttendance" ADD COLUMN "attendeeKind" "MeetingAttendeeKind" NOT NULL DEFAULT 'MEMBER';

-- ── 10. Document storage links (§9) ───────────────────────────────

-- AlterTable
ALTER TABLE "CouncilDocument" ADD COLUMN "binaryObjectId" TEXT;

-- CreateIndex
CREATE INDEX "CouncilDocument_binaryObjectId_idx" ON "CouncilDocument"("binaryObjectId");

-- AddForeignKey
ALTER TABLE "CouncilDocument" ADD CONSTRAINT "CouncilDocument_binaryObjectId_fkey" FOREIGN KEY ("binaryObjectId") REFERENCES "BinaryObject"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ComplianceEvidence" ADD COLUMN "binaryObjectId" TEXT;

-- CreateIndex
CREATE INDEX "ComplianceEvidence_binaryObjectId_idx" ON "ComplianceEvidence"("binaryObjectId");

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_binaryObjectId_fkey" FOREIGN KEY ("binaryObjectId") REFERENCES "BinaryObject"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 11. Criterion-level self-assessment (§8) ──────────────────────

-- AlterTable
ALTER TABLE "InternalSelfAssessment" ADD COLUMN "programId" TEXT;

-- CreateIndex
CREATE INDEX "InternalSelfAssessment_programId_idx" ON "InternalSelfAssessment"("programId");

-- AddForeignKey
ALTER TABLE "InternalSelfAssessment" ADD CONSTRAINT "InternalSelfAssessment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SelfAssessmentItem" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "criteriaItemId" TEXT NOT NULL,
    "rating" "SelfAssessmentRating",
    "responseAr" TEXT,
    "evidenceRefs" TEXT,
    "findingsAr" TEXT,
    "assessorPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfAssessmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SelfAssessmentItem_criteriaItemId_idx" ON "SelfAssessmentItem"("criteriaItemId");

-- CreateIndex
CREATE INDEX "SelfAssessmentItem_assessorPersonId_idx" ON "SelfAssessmentItem"("assessorPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "SelfAssessmentItem_assessmentId_criteriaItemId_key" ON "SelfAssessmentItem"("assessmentId", "criteriaItemId");

-- AddForeignKey
ALTER TABLE "SelfAssessmentItem" ADD CONSTRAINT "SelfAssessmentItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InternalSelfAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfAssessmentItem" ADD CONSTRAINT "SelfAssessmentItem_criteriaItemId_fkey" FOREIGN KEY ("criteriaItemId") REFERENCES "AccreditationCriteriaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfAssessmentItem" ADD CONSTRAINT "SelfAssessmentItem_assessorPersonId_fkey" FOREIGN KEY ("assessorPersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CorrectiveActionPlan" ADD COLUMN "selfAssessmentItemId" TEXT;

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_selfAssessmentItemId_idx" ON "CorrectiveActionPlan"("selfAssessmentItemId");

-- AddForeignKey
ALTER TABLE "CorrectiveActionPlan" ADD CONSTRAINT "CorrectiveActionPlan_selfAssessmentItemId_fkey" FOREIGN KEY ("selfAssessmentItemId") REFERENCES "SelfAssessmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 12. Explicit credential progression catalog (§12) ─────────────

-- CreateTable
CREATE TABLE "CredentialProgressionRule" (
    "id" TEXT NOT NULL,
    "fromCredentialTypeId" TEXT NOT NULL,
    "toCredentialTypeId" TEXT NOT NULL,
    "toInstitutionTypeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "toProgramKinds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "admissionConditions" TEXT,
    "legalReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialProgressionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CredentialProgressionRule_fromCredentialTypeId_isActive_idx" ON "CredentialProgressionRule"("fromCredentialTypeId", "isActive");

-- CreateIndex
CREATE INDEX "CredentialProgressionRule_toCredentialTypeId_idx" ON "CredentialProgressionRule"("toCredentialTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialProgressionRule_fromCredentialTypeId_toCredential_key" ON "CredentialProgressionRule"("fromCredentialTypeId", "toCredentialTypeId");

-- AddForeignKey
ALTER TABLE "CredentialProgressionRule" ADD CONSTRAINT "CredentialProgressionRule_fromCredentialTypeId_fkey" FOREIGN KEY ("fromCredentialTypeId") REFERENCES "CredentialType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialProgressionRule" ADD CONSTRAINT "CredentialProgressionRule_toCredentialTypeId_fkey" FOREIGN KEY ("toCredentialTypeId") REFERENCES "CredentialType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 13. Controlled org-unit type catalog (§11) ────────────────────

-- CreateTable
CREATE TABLE "OrgUnitTypeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "allowedParentCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleSectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleInstitutionTypeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
    "institutionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnitTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnitTypeDefinition_code_key" ON "OrgUnitTypeDefinition"("code");

-- CreateIndex
CREATE INDEX "OrgUnitTypeDefinition_isLocal_institutionId_idx" ON "OrgUnitTypeDefinition"("isLocal", "institutionId");

-- CreateIndex
CREATE INDEX "OrgUnitTypeDefinition_isActive_idx" ON "OrgUnitTypeDefinition"("isActive");

-- AddForeignKey
ALTER TABLE "OrgUnitTypeDefinition" ADD CONSTRAINT "OrgUnitTypeDefinition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 14. PositionTemplate multi-type unit scope (§10.3) ────────────

-- AlterTable
ALTER TABLE "PositionTemplate" ADD COLUMN "allowedUnitTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ── 15. Concurrency invariants (§6) ───────────────────────────────

-- §6.4: exactly one ACTIVE version per program (app pre-checks cannot
-- survive two concurrent activations).
CREATE UNIQUE INDEX "ProgramVersion_one_active_per_program_key"
    ON "ProgramVersion"("programId") WHERE "status" = 'ACTIVE';

-- §6.2: the substantive-seat scan index (conflict resolution itself is
-- advisory-lock serialized inside the route transaction — orgUnitId is
-- NULLable so an exclusion constraint cannot express the institution-
-- wide seat).
CREATE INDEX "PositionAppointment_substantive_seat_idx"
    ON "PositionAppointment"("institutionId", "positionId", "orgUnitId")
    WHERE "status" IN ('SCHEDULED', 'ACTIVE') AND "acting" = false;

-- §6.3: no two live REQUESTED/APPROVED reservations may overlap on the
-- same facility — a real exclusion constraint beats every application
-- pre-check under concurrency.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "FacilityReservation"
    ADD CONSTRAINT "FacilityReservation_no_overlap_live"
    EXCLUDE USING gist (
        "facilityId" WITH =,
        tsrange("startsAt", "endsAt") WITH &&
    ) WHERE ("status" IN ('REQUESTED', 'APPROVED'));

ALTER TABLE "FacilityReservation"
    ADD CONSTRAINT "FacilityReservation_interval_valid"
    CHECK ("startsAt" < "endsAt");

-- §6.5: cycle-safe, depth-bounded, advisory-lock-serialized org-unit
-- parent invariant. Replaces the 0003 trigger whose ancestor walk could
-- loop forever on a pre-existing corrupt cycle and which serialized
-- nothing under concurrent re-parenting.
CREATE OR REPLACE FUNCTION ulara_org_unit_check_parent() RETURNS trigger AS $$
DECLARE
    cur TEXT;
    parent_institution TEXT;
    depth INT;
    visited TEXT[];
BEGIN
    -- Serialize structural changes within ONE institution: two
    -- concurrent re-parents cannot interleave their cycle walks.
    PERFORM pg_advisory_xact_lock(hashtext('ulara_org_unit:' || NEW."institutionId"));

    IF NEW."parentId" IS NULL THEN
        RETURN NEW;
    END IF;
    IF NEW."parentId" = NEW."id" THEN
        RAISE EXCEPTION 'ORG_UNIT_CYCLE: a unit cannot be its own parent';
    END IF;
    SELECT "institutionId" INTO parent_institution FROM "OrganizationalUnit" WHERE "id" = NEW."parentId";
    IF parent_institution IS NULL THEN
        RAISE EXCEPTION 'ORG_UNIT_PARENT_MISSING: parent unit does not exist';
    END IF;
    IF parent_institution <> NEW."institutionId" THEN
        RAISE EXCEPTION 'ORG_UNIT_PARENT_SAME_INSTITUTION: parent unit belongs to another institution';
    END IF;

    -- Visited-set walk: terminates on ANY graph state (including a
    -- pre-existing corrupt cycle elsewhere in the chain) and enforces
    -- a deliberate depth bound of 64 levels.
    cur := NEW."parentId";
    depth := 0;
    WHILE cur IS NOT NULL LOOP
        IF cur = NEW."id" THEN
            RAISE EXCEPTION 'ORG_UNIT_CYCLE: parent chain returns to this unit';
        END IF;
        IF cur = ANY (visited) THEN
            RAISE EXCEPTION 'ORG_UNIT_CORRUPT_CYCLE: pre-existing cycle detected in the parent chain';
        END IF;
        visited := array_append(visited, cur);
        depth := depth + 1;
        IF depth > 64 THEN
            RAISE EXCEPTION 'ORG_UNIT_DEPTH_EXCEEDED: hierarchy deeper than 64 levels';
        END IF;
        SELECT "parentId" INTO cur FROM "OrganizationalUnit" WHERE "id" = cur;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (The 0003 trigger of the same name is replaced in place — the
-- CREATE TRIGGER below drops and recreates it against the new body.)
DROP TRIGGER IF EXISTS org_unit_parent_invariants ON "OrganizationalUnit";
CREATE TRIGGER org_unit_parent_invariants
  BEFORE INSERT OR UPDATE OF "parentId", "institutionId" ON "OrganizationalUnit"
  FOR EACH ROW EXECUTE FUNCTION ulara_org_unit_check_parent();

-- §6.6: institution affiliation — explicit cycle rejection, depth bound
-- of 16, same-sector + classified-parent enforcement, advisory-lock
-- serialization (the route layer adds the Arabic 409 envelopes).
CREATE OR REPLACE FUNCTION ulara_institution_check_parent() RETURNS trigger AS $$
DECLARE
    cur TEXT;
    parent_sector TEXT;
    parent_kind TEXT;
    depth INT;
    visited TEXT[];
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('ulara_institution_affiliation'));

    IF NEW."parentInstitutionId" IS NULL THEN
        RETURN NEW;
    END IF;
    IF NEW."parentInstitutionId" = NEW."id" THEN
        RAISE EXCEPTION 'INSTITUTION_AFFILIATION_CYCLE: an institution cannot be its own parent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "Institution" WHERE "id" = NEW."parentInstitutionId") THEN
        RAISE EXCEPTION 'INSTITUTION_AFFILIATION_PARENT_MISSING: parent institution does not exist';
    END IF;
    SELECT "sector", "kindId" INTO parent_sector, parent_kind FROM "Institution" WHERE "id" = NEW."parentInstitutionId";
    -- An affiliation parent must be a CLASSIFIED institution (sector
    -- AND kind): unclassified parents cannot legally host children.
    IF parent_sector IS NULL OR parent_kind IS NULL THEN
        RAISE EXCEPTION 'INSTITUTION_AFFILIATION_PARENT_UNCLASSIFIED: parent institution lacks sector/kind classification';
    END IF;
    IF NEW."sector" IS NOT NULL AND NEW."sector"::text <> parent_sector THEN
        RAISE EXCEPTION 'INSTITUTION_AFFILIATION_CROSS_SECTOR: parent belongs to another sector';
    END IF;

    cur := NEW."parentInstitutionId";
    depth := 0;
    WHILE cur IS NOT NULL LOOP
        IF cur = NEW."id" THEN
            RAISE EXCEPTION 'INSTITUTION_AFFILIATION_CYCLE: affiliation chain returns to this institution';
        END IF;
        IF cur = ANY (visited) THEN
            RAISE EXCEPTION 'INSTITUTION_AFFILIATION_CORRUPT_CYCLE: pre-existing cycle detected in the affiliation chain';
        END IF;
        visited := array_append(visited, cur);
        depth := depth + 1;
        IF depth > 16 THEN
            RAISE EXCEPTION 'INSTITUTION_AFFILIATION_DEPTH_EXCEEDED: affiliation chain deeper than 16 levels';
        END IF;
        SELECT "parentInstitutionId" INTO cur FROM "Institution" WHERE "id" = cur;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER institution_affiliation_invariants
  BEFORE INSERT OR UPDATE OF "parentInstitutionId", "sector" ON "Institution"
  FOR EACH ROW EXECUTE FUNCTION ulara_institution_check_parent();
