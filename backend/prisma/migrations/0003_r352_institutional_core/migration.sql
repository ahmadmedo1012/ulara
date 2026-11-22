-- CreateEnum
CREATE TYPE "InstitutionSector" AS ENUM ('HIGHER_EDUCATION_RESEARCH', 'TECHNICAL_VOCATIONAL_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('PUBLIC', 'PRIVATE', 'OPEN', 'MIXED', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "StaffCategory" AS ENUM ('ACADEMIC_STAFF', 'TEACHING_ASSISTANT', 'TRAINER', 'ASSISTANT_TRAINER', 'TEACHER', 'TECHNICAL_GUIDE', 'ADMINISTRATIVE_STAFF', 'TECHNICIAN', 'PROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "LearnerCategory" AS ENUM ('STUDENT', 'TRAINEE');

-- CreateEnum
CREATE TYPE "PositionCategory" AS ENUM ('UNIVERSITY_LEADERSHIP', 'FACULTY_LEADERSHIP', 'DEPARTMENT_LEADERSHIP', 'INSTITUTE_LEADERSHIP', 'CENTER_LEADERSHIP', 'ADMINISTRATIVE_LEADERSHIP', 'TRAINING_LEADERSHIP', 'BOARD_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CouncilType" AS ENUM ('UNIVERSITY_COUNCIL', 'FACULTY_COUNCIL', 'DEPARTMENT_COUNCIL', 'SCIENTIFIC_COUNCIL', 'INSTITUTE_COUNCIL', 'DISCIPLINARY_COUNCIL', 'STANDING_COMMITTEE', 'OTHER');

-- CreateEnum
CREATE TYPE "CouncilRole" AS ENUM ('CHAIR', 'DEPUTY_CHAIR', 'SECRETARY', 'MEMBER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "CouncilMembershipStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceOutcome" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- CreateEnum
CREATE TYPE "AgendaItemStatus" AS ENUM ('OPEN', 'DISCUSSED', 'DEFERRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ResolutionKind" AS ENUM ('RESOLUTION', 'RECOMMENDATION', 'FOLLOW_UP_ACTION');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MinutesStatus" AS ENUM ('DRAFT', 'APPROVED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ProgramKind" AS ENUM ('ACADEMIC', 'TECHNICAL', 'PROFESSIONAL', 'VOCATIONAL_TRAINING', 'BASIC_FORMATION');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProgramVersionStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProgramCourseKind" AS ENUM ('CORE', 'ELECTIVE', 'PRACTICUM', 'CAPSTONE', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "ProgramEnrollmentStatus" AS ENUM ('CANDIDATE', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN', 'SUSPENDED', 'COMPLETED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AwardedCredentialStatus" AS ENUM ('AWARDED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ExternalScopeType" AS ENUM ('INSTITUTION', 'ORGANIZATIONAL_UNIT', 'PROGRAM');

-- CreateEnum
CREATE TYPE "AccreditationType" AS ENUM ('INSTITUTIONAL', 'PROGRAM');

-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'GRANTED', 'CONDITIONAL', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LicenseKind" AS ENUM ('TECHNICAL_LICENSE', 'OPERATING_PERMIT', 'ESTABLISHMENT_DECISION', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InspectionKind" AS ENUM ('MINISTRY', 'REGULATOR', 'SAFETY', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISPUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SelfAssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('LABORATORY', 'WORKSHOP', 'CLASSROOM', 'PRACTICAL_TRAINING_FACILITY', 'LECTURE_HALL', 'OTHER');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'CLOSED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED', 'LOST');

-- CreateEnum
CREATE TYPE "WorkOrderKind" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'SAFETY_INSPECTION', 'INSTALLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SafetyRecordKind" AS ENUM ('INCIDENT', 'INSPECTION');

-- CreateEnum
CREATE TYPE "ResearchProjectStatus" AS ENUM ('PROPOSED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ResearchOutputType" AS ENUM ('PUBLICATION', 'PATENT', 'PROTOTYPE', 'APPLIED_PRODUCT', 'TECHNICAL_REPORT');

-- CreateEnum
CREATE TYPE "ResearchMemberRole" AS ENUM ('PRINCIPAL_INVESTIGATOR', 'CO_INVESTIGATOR', 'RESEARCHER', 'RESEARCH_ASSISTANT', 'COLLABORATOR', 'TECHNICIAN');

-- AlterEnum
ALTER TYPE "AcademicRank" ADD VALUE 'ASSISTANT_LECTURER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Capability" ADD VALUE 'ORG_STRUCTURE_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'PEOPLE_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'APPOINTMENTS_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'COUNCILS_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'PROGRAMS_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'CREDENTIALS_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'ACCREDITATION_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'QUALITY_INTERNAL_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'FACILITIES_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'RESEARCH_PROJECTS_MANAGE';
ALTER TYPE "Capability" ADD VALUE 'UNIT_ROLES_ASSIGN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InstitutionStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "InstitutionStatus" ADD VALUE 'CLOSED';
ALTER TYPE "InstitutionStatus" ADD VALUE 'MERGED';

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "orgUnitId" TEXT;

-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN     "orgUnitId" TEXT;

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "establishmentDecisionDate" TIMESTAMP(3),
ADD COLUMN     "establishmentDecisionNumber" TEXT,
ADD COLUMN     "kindId" TEXT,
ADD COLUMN     "ownership" "OwnershipType",
ADD COLUMN     "parentInstitutionId" TEXT,
ADD COLUMN     "sector" "InstitutionSector",
ADD COLUMN     "supervisingAuthorityId" TEXT;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "learnerCategory" "LearnerCategory" NOT NULL DEFAULT 'STUDENT';

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "RegulatoryAuthority" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'GOVERNMENTAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulatoryAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sector" "InstitutionSector" NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "isIndependentLegalPersonality" BOOLEAN NOT NULL DEFAULT true,
    "legalBasis" TEXT,
    "defaultAuthorityId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalUnit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL,
    "status" "OrgUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "establishedAt" TIMESTAMP(3),
    "dissolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalPerson" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT,
    "staffNumber" TEXT,
    "fullNameAr" TEXT NOT NULL,
    "fullNameEn" TEXT,
    "category" "StaffCategory" NOT NULL,
    "primaryOrgUnitId" TEXT,
    "staffStatus" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionalPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "category" "PositionCategory" NOT NULL,
    "scopeRequirement" TEXT,
    "eligibleInstitutionTypeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isLocalVariant" BOOLEAN NOT NULL DEFAULT false,
    "institutionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAppointment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "appointedByAuthority" TEXT,
    "decisionNumber" TEXT,
    "decisionDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "termMonths" INTEGER,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "acting" BOOLEAN NOT NULL DEFAULT false,
    "supersededById" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitRoleGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitRoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Council" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "code" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" "CouncilType" NOT NULL,
    "legalBasis" TEXT,
    "charterRef" TEXT,
    "establishedAt" TIMESTAMP(3),
    "dissolvedAt" TIMESTAMP(3),
    "status" "CouncilMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Council_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilMembership" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "CouncilRole" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "decisionRef" TEXT,
    "status" "CouncilMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilMeeting" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "seqNumber" INTEGER,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "agendaSummary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "AttendanceOutcome" NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAgendaItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "orderNo" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgendaItemStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilResolution" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "agendaItemId" TEXT,
    "number" TEXT,
    "kind" "ResolutionKind" NOT NULL,
    "textAr" TEXT NOT NULL,
    "status" "ResolutionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "ownerPersonId" TEXT,
    "completionRef" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingMinutes" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "contentAr" TEXT NOT NULL,
    "status" "MinutesStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedByPersonId" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedByPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilDocument" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "meetingId" TEXT,
    "titleAr" TEXT NOT NULL,
    "fileUrl" TEXT,
    "kind" TEXT,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "kind" "ProgramKind" NOT NULL,
    "credentialTypeId" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalRef" TEXT,
    "admissionRequirements" JSONB,
    "progressionRules" JSONB,
    "durationMonths" INTEGER,
    "totalCreditHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramVersion" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "status" "ProgramVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramCourse" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termNo" INTEGER,
    "kind" "ProgramCourseKind" NOT NULL DEFAULT 'CORE',
    "creditHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "programVersionId" TEXT,
    "status" "ProgramEnrollmentStatus" NOT NULL DEFAULT 'CANDIDATE',
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedCompletionAt" TIMESTAMP(3),
    "completionAt" TIMESTAMP(3),
    "gpa" DECIMAL(3,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlacement" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programEnrollmentId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "hostOrgUnitId" TEXT,
    "externalHost" TEXT,
    "supervisorPersonId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "PlacementStatus" NOT NULL DEFAULT 'PLANNED',
    "evaluationSummary" TEXT,
    "evaluationScore" DECIMAL(4,1),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "level" INTEGER NOT NULL,
    "grantsProgression" BOOLEAN NOT NULL DEFAULT false,
    "legalBasis" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardedCredential" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "credentialTypeId" TEXT NOT NULL,
    "programId" TEXT,
    "programEnrollmentId" TEXT,
    "decisionNumber" TEXT,
    "decisionDate" TIMESTAMP(3),
    "conferredAt" TIMESTAMP(3),
    "serialNumber" TEXT,
    "status" "AwardedCredentialStatus" NOT NULL DEFAULT 'AWARDED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardedCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccreditationCriteriaSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "authorityId" TEXT NOT NULL,
    "appliesTo" "AccreditationType" NOT NULL,
    "publishedRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccreditationCriteriaSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccreditationCriteriaItem" (
    "id" TEXT NOT NULL,
    "criteriaSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccreditationCriteriaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAccreditation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "scopeType" "ExternalScopeType" NOT NULL DEFAULT 'INSTITUTION',
    "orgUnitId" TEXT,
    "programId" TEXT,
    "authorityId" TEXT NOT NULL,
    "type" "AccreditationType" NOT NULL,
    "decisionNumber" TEXT,
    "decisionDate" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "status" "AccreditationStatus" NOT NULL DEFAULT 'PENDING',
    "criteriaSetId" TEXT,
    "reportRef" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalAccreditation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalLicense" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "kind" "LicenseKind" NOT NULL,
    "licenseNumber" TEXT,
    "scopeType" "ExternalScopeType",
    "orgUnitId" TEXT,
    "programId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "conditions" TEXT,
    "documentRef" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryInspection" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "authorityId" TEXT NOT NULL,
    "kind" "InspectionKind" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "conductedAt" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "summary" TEXT,
    "reportRef" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceFinding" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "externalAccreditationId" TEXT,
    "orgUnitId" TEXT,
    "programId" TEXT,
    "severity" "FindingSeverity" NOT NULL,
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "legalReference" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveActionPlan" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "planText" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'PLANNED',
    "approvedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "verificationRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalSelfAssessment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "periodLabel" TEXT NOT NULL,
    "criteriaSetId" TEXT,
    "status" "SelfAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "summary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalSelfAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "documentRef" TEXT,
    "fileUrl" TEXT,
    "description" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "code" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" "FacilityType" NOT NULL,
    "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "building" TEXT,
    "room" TEXT,
    "capacity" INTEGER,
    "safetyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "facilityId" TEXT,
    "orgUnitId" TEXT,
    "code" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" TEXT,
    "serialNumber" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "value" DECIMAL(12,2),
    "condition" "EquipmentCondition" NOT NULL DEFAULT 'GOOD',
    "status" "EquipmentStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "responsiblePersonId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentProgramSupport" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "criteriaItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentProgramSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceWorkOrder" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "facilityId" TEXT,
    "equipmentId" TEXT,
    "kind" "WorkOrderKind" NOT NULL,
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "assignedPersonId" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityReservation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "requestedById" TEXT,
    "purpose" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "facilityId" TEXT,
    "equipmentId" TEXT,
    "kind" "SafetyRecordKind" NOT NULL,
    "severity" "FindingSeverity",
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "code" TEXT,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "field" TEXT,
    "principalInvestigatorId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "ResearchProjectStatus" NOT NULL DEFAULT 'PROPOSED',
    "fundingSource" TEXT,
    "budget" DECIMAL(14,2),
    "ethicsApprovalRef" TEXT,
    "approvalRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "ResearchMemberRole" NOT NULL,
    "allocationPct" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ResearchProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchOutput" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "projectId" TEXT,
    "personId" TEXT,
    "type" "ResearchOutputType" NOT NULL,
    "title" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "doi" TEXT,
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "researchPaperId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryAuthority_code_key" ON "RegulatoryAuthority"("code");

-- CreateIndex
CREATE INDEX "RegulatoryAuthority_kind_idx" ON "RegulatoryAuthority"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionType_code_key" ON "InstitutionType"("code");

-- CreateIndex
CREATE INDEX "InstitutionType_sector_idx" ON "InstitutionType"("sector");

-- CreateIndex
CREATE INDEX "OrganizationalUnit_institutionId_type_idx" ON "OrganizationalUnit"("institutionId", "type");

-- CreateIndex
CREATE INDEX "OrganizationalUnit_institutionId_parentId_idx" ON "OrganizationalUnit"("institutionId", "parentId");

-- CreateIndex
CREATE INDEX "OrganizationalUnit_parentId_idx" ON "OrganizationalUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrganizationalUnit_institutionId_nameAr_idx" ON "OrganizationalUnit"("institutionId", "nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationalUnit_institutionId_code_key" ON "OrganizationalUnit"("institutionId", "code");

-- CreateIndex
CREATE INDEX "InstitutionalPerson_institutionId_category_idx" ON "InstitutionalPerson"("institutionId", "category");

-- CreateIndex
CREATE INDEX "InstitutionalPerson_primaryOrgUnitId_idx" ON "InstitutionalPerson"("primaryOrgUnitId");

-- CreateIndex
CREATE INDEX "InstitutionalPerson_userId_idx" ON "InstitutionalPerson"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionalPerson_institutionId_userId_key" ON "InstitutionalPerson"("institutionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionalPerson_institutionId_staffNumber_key" ON "InstitutionalPerson"("institutionId", "staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PositionTemplate_code_key" ON "PositionTemplate"("code");

-- CreateIndex
CREATE INDEX "PositionTemplate_category_idx" ON "PositionTemplate"("category");

-- CreateIndex
CREATE INDEX "PositionTemplate_institutionId_idx" ON "PositionTemplate"("institutionId");

-- CreateIndex
CREATE INDEX "PositionAppointment_institutionId_status_idx" ON "PositionAppointment"("institutionId", "status");

-- CreateIndex
CREATE INDEX "PositionAppointment_personId_idx" ON "PositionAppointment"("personId");

-- CreateIndex
CREATE INDEX "PositionAppointment_positionId_orgUnitId_status_idx" ON "PositionAppointment"("positionId", "orgUnitId", "status");

-- CreateIndex
CREATE INDEX "PositionAppointment_orgUnitId_idx" ON "PositionAppointment"("orgUnitId");

-- CreateIndex
CREATE INDEX "UnitRoleGrant_institutionId_orgUnitId_idx" ON "UnitRoleGrant"("institutionId", "orgUnitId");

-- CreateIndex
CREATE INDEX "UnitRoleGrant_userId_isActive_idx" ON "UnitRoleGrant"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UnitRoleGrant_userId_institutionId_orgUnitId_role_key" ON "UnitRoleGrant"("userId", "institutionId", "orgUnitId", "role");

-- CreateIndex
CREATE INDEX "Council_institutionId_type_idx" ON "Council"("institutionId", "type");

-- CreateIndex
CREATE INDEX "Council_orgUnitId_idx" ON "Council"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Council_institutionId_code_key" ON "Council"("institutionId", "code");

-- CreateIndex
CREATE INDEX "CouncilMembership_councilId_status_idx" ON "CouncilMembership"("councilId", "status");

-- CreateIndex
CREATE INDEX "CouncilMembership_personId_idx" ON "CouncilMembership"("personId");

-- CreateIndex
CREATE INDEX "CouncilMeeting_councilId_scheduledAt_idx" ON "CouncilMeeting"("councilId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilMeeting_councilId_seqNumber_key" ON "CouncilMeeting"("councilId", "seqNumber");

-- CreateIndex
CREATE INDEX "MeetingAttendance_personId_idx" ON "MeetingAttendance"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendance_meetingId_personId_key" ON "MeetingAttendance"("meetingId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAgendaItem_meetingId_orderNo_key" ON "MeetingAgendaItem"("meetingId", "orderNo");

-- CreateIndex
CREATE INDEX "CouncilResolution_meetingId_idx" ON "CouncilResolution"("meetingId");

-- CreateIndex
CREATE INDEX "CouncilResolution_status_dueDate_idx" ON "CouncilResolution"("status", "dueDate");

-- CreateIndex
CREATE INDEX "CouncilResolution_ownerPersonId_idx" ON "CouncilResolution"("ownerPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinutes_meetingId_key" ON "MeetingMinutes"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinutes_meetingId_versionNo_key" ON "MeetingMinutes"("meetingId", "versionNo");

-- CreateIndex
CREATE INDEX "CouncilDocument_councilId_idx" ON "CouncilDocument"("councilId");

-- CreateIndex
CREATE INDEX "CouncilDocument_meetingId_idx" ON "CouncilDocument"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_institutionId_code_key" ON "AcademicTerm"("institutionId", "code");

-- CreateIndex
CREATE INDEX "Program_institutionId_kind_status_idx" ON "Program"("institutionId", "kind", "status");

-- CreateIndex
CREATE INDEX "Program_orgUnitId_idx" ON "Program"("orgUnitId");

-- CreateIndex
CREATE INDEX "Program_credentialTypeId_idx" ON "Program"("credentialTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Program_institutionId_code_key" ON "Program"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ProgramVersion_status_idx" ON "ProgramVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersion_programId_label_key" ON "ProgramVersion"("programId", "label");

-- CreateIndex
CREATE INDEX "ProgramCourse_courseId_idx" ON "ProgramCourse"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramCourse_programVersionId_courseId_key" ON "ProgramCourse"("programVersionId", "courseId");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_programId_status_idx" ON "ProgramEnrollment"("programId", "status");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_studentProfileId_idx" ON "ProgramEnrollment"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_studentProfileId_programId_key" ON "ProgramEnrollment"("studentProfileId", "programId");

-- CreateIndex
CREATE INDEX "TrainingPlacement_institutionId_status_idx" ON "TrainingPlacement"("institutionId", "status");

-- CreateIndex
CREATE INDEX "TrainingPlacement_studentProfileId_idx" ON "TrainingPlacement"("studentProfileId");

-- CreateIndex
CREATE INDEX "TrainingPlacement_programEnrollmentId_idx" ON "TrainingPlacement"("programEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialType_code_key" ON "CredentialType"("code");

-- CreateIndex
CREATE INDEX "CredentialType_level_idx" ON "CredentialType"("level");

-- CreateIndex
CREATE INDEX "AwardedCredential_studentProfileId_idx" ON "AwardedCredential"("studentProfileId");

-- CreateIndex
CREATE INDEX "AwardedCredential_institutionId_credentialTypeId_idx" ON "AwardedCredential"("institutionId", "credentialTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardedCredential_institutionId_serialNumber_key" ON "AwardedCredential"("institutionId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccreditationCriteriaSet_code_version_key" ON "AccreditationCriteriaSet"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AccreditationCriteriaItem_criteriaSetId_code_key" ON "AccreditationCriteriaItem"("criteriaSetId", "code");

-- CreateIndex
CREATE INDEX "ExternalAccreditation_institutionId_status_idx" ON "ExternalAccreditation"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ExternalAccreditation_authorityId_idx" ON "ExternalAccreditation"("authorityId");

-- CreateIndex
CREATE INDEX "ExternalAccreditation_programId_idx" ON "ExternalAccreditation"("programId");

-- CreateIndex
CREATE INDEX "ExternalAccreditation_orgUnitId_idx" ON "ExternalAccreditation"("orgUnitId");

-- CreateIndex
CREATE INDEX "OperationalLicense_institutionId_status_idx" ON "OperationalLicense"("institutionId", "status");

-- CreateIndex
CREATE INDEX "OperationalLicense_authorityId_idx" ON "OperationalLicense"("authorityId");

-- CreateIndex
CREATE INDEX "OperationalLicense_programId_idx" ON "OperationalLicense"("programId");

-- CreateIndex
CREATE INDEX "RegulatoryInspection_institutionId_status_idx" ON "RegulatoryInspection"("institutionId", "status");

-- CreateIndex
CREATE INDEX "RegulatoryInspection_authorityId_idx" ON "RegulatoryInspection"("authorityId");

-- CreateIndex
CREATE INDEX "ComplianceFinding_institutionId_status_idx" ON "ComplianceFinding"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ComplianceFinding_severity_idx" ON "ComplianceFinding"("severity");

-- CreateIndex
CREATE INDEX "ComplianceFinding_dueDate_idx" ON "ComplianceFinding"("dueDate");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_findingId_idx" ON "CorrectiveActionPlan"("findingId");

-- CreateIndex
CREATE INDEX "CorrectiveActionPlan_status_targetDate_idx" ON "CorrectiveActionPlan"("status", "targetDate");

-- CreateIndex
CREATE INDEX "InternalSelfAssessment_institutionId_status_idx" ON "InternalSelfAssessment"("institutionId", "status");

-- CreateIndex
CREATE INDEX "InternalSelfAssessment_orgUnitId_idx" ON "InternalSelfAssessment"("orgUnitId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_ownerType_ownerId_idx" ON "ComplianceEvidence"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_institutionId_idx" ON "ComplianceEvidence"("institutionId");

-- CreateIndex
CREATE INDEX "Facility_institutionId_type_status_idx" ON "Facility"("institutionId", "type", "status");

-- CreateIndex
CREATE INDEX "Facility_orgUnitId_idx" ON "Facility"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_institutionId_code_key" ON "Facility"("institutionId", "code");

-- CreateIndex
CREATE INDEX "Equipment_facilityId_idx" ON "Equipment"("facilityId");

-- CreateIndex
CREATE INDEX "Equipment_institutionId_status_idx" ON "Equipment"("institutionId", "status");

-- CreateIndex
CREATE INDEX "Equipment_orgUnitId_idx" ON "Equipment"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_institutionId_code_key" ON "Equipment"("institutionId", "code");

-- CreateIndex
CREATE INDEX "EquipmentProgramSupport_programId_idx" ON "EquipmentProgramSupport"("programId");

-- CreateIndex
CREATE INDEX "EquipmentProgramSupport_criteriaItemId_idx" ON "EquipmentProgramSupport"("criteriaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentProgramSupport_equipmentId_programId_key" ON "EquipmentProgramSupport"("equipmentId", "programId");

-- CreateIndex
CREATE INDEX "MaintenanceWorkOrder_institutionId_status_idx" ON "MaintenanceWorkOrder"("institutionId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceWorkOrder_equipmentId_idx" ON "MaintenanceWorkOrder"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceWorkOrder_facilityId_idx" ON "MaintenanceWorkOrder"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityReservation_facilityId_startsAt_idx" ON "FacilityReservation"("facilityId", "startsAt");

-- CreateIndex
CREATE INDEX "FacilityReservation_institutionId_status_idx" ON "FacilityReservation"("institutionId", "status");

-- CreateIndex
CREATE INDEX "SafetyIncident_institutionId_occurredAt_idx" ON "SafetyIncident"("institutionId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_status_idx" ON "SafetyIncident"("status");

-- CreateIndex
CREATE INDEX "ResearchProject_institutionId_status_idx" ON "ResearchProject"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ResearchProject_orgUnitId_idx" ON "ResearchProject"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchProject_institutionId_code_key" ON "ResearchProject"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ResearchProjectMember_personId_idx" ON "ResearchProjectMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchProjectMember_projectId_personId_key" ON "ResearchProjectMember"("projectId", "personId");

-- CreateIndex
CREATE INDEX "ResearchOutput_institutionId_type_idx" ON "ResearchOutput"("institutionId", "type");

-- CreateIndex
CREATE INDEX "ResearchOutput_projectId_idx" ON "ResearchOutput"("projectId");

-- CreateIndex
CREATE INDEX "ResearchOutput_personId_idx" ON "ResearchOutput"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_orgUnitId_key" ON "Department"("orgUnitId");

-- CreateIndex
CREATE INDEX "Department_orgUnitId_idx" ON "Department"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_orgUnitId_key" ON "Faculty"("orgUnitId");

-- CreateIndex
CREATE INDEX "Faculty_orgUnitId_idx" ON "Faculty"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_personId_key" ON "TeacherProfile"("personId");

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "InstitutionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_supervisingAuthorityId_fkey" FOREIGN KEY ("supervisingAuthorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_parentInstitutionId_fkey" FOREIGN KEY ("parentInstitutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionType" ADD CONSTRAINT "InstitutionType_defaultAuthorityId_fkey" FOREIGN KEY ("defaultAuthorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalUnit" ADD CONSTRAINT "OrganizationalUnit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalUnit" ADD CONSTRAINT "OrganizationalUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalPerson" ADD CONSTRAINT "InstitutionalPerson_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalPerson" ADD CONSTRAINT "InstitutionalPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalPerson" ADD CONSTRAINT "InstitutionalPerson_primaryOrgUnitId_fkey" FOREIGN KEY ("primaryOrgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionTemplate" ADD CONSTRAINT "PositionTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAppointment" ADD CONSTRAINT "PositionAppointment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAppointment" ADD CONSTRAINT "PositionAppointment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAppointment" ADD CONSTRAINT "PositionAppointment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "PositionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAppointment" ADD CONSTRAINT "PositionAppointment_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAppointment" ADD CONSTRAINT "PositionAppointment_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "PositionAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoleGrant" ADD CONSTRAINT "UnitRoleGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoleGrant" ADD CONSTRAINT "UnitRoleGrant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoleGrant" ADD CONSTRAINT "UnitRoleGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Council" ADD CONSTRAINT "Council_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Council" ADD CONSTRAINT "Council_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMembership" ADD CONSTRAINT "CouncilMembership_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMembership" ADD CONSTRAINT "CouncilMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMeeting" ADD CONSTRAINT "CouncilMeeting_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendance" ADD CONSTRAINT "MeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CouncilMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendance" ADD CONSTRAINT "MeetingAttendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CouncilMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilResolution" ADD CONSTRAINT "CouncilResolution_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CouncilMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilResolution" ADD CONSTRAINT "CouncilResolution_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilResolution" ADD CONSTRAINT "CouncilResolution_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingMinutes" ADD CONSTRAINT "MeetingMinutes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CouncilMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilDocument" ADD CONSTRAINT "CouncilDocument_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilDocument" ADD CONSTRAINT "CouncilDocument_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CouncilMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "CredentialType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_programEnrollmentId_fkey" FOREIGN KEY ("programEnrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_hostOrgUnitId_fkey" FOREIGN KEY ("hostOrgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlacement" ADD CONSTRAINT "TrainingPlacement_supervisorPersonId_fkey" FOREIGN KEY ("supervisorPersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "CredentialType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardedCredential" ADD CONSTRAINT "AwardedCredential_programEnrollmentId_fkey" FOREIGN KEY ("programEnrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationCriteriaSet" ADD CONSTRAINT "AccreditationCriteriaSet_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationCriteriaItem" ADD CONSTRAINT "AccreditationCriteriaItem_criteriaSetId_fkey" FOREIGN KEY ("criteriaSetId") REFERENCES "AccreditationCriteriaSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccreditation" ADD CONSTRAINT "ExternalAccreditation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccreditation" ADD CONSTRAINT "ExternalAccreditation_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccreditation" ADD CONSTRAINT "ExternalAccreditation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccreditation" ADD CONSTRAINT "ExternalAccreditation_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccreditation" ADD CONSTRAINT "ExternalAccreditation_criteriaSetId_fkey" FOREIGN KEY ("criteriaSetId") REFERENCES "AccreditationCriteriaSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalLicense" ADD CONSTRAINT "OperationalLicense_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalLicense" ADD CONSTRAINT "OperationalLicense_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalLicense" ADD CONSTRAINT "OperationalLicense_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalLicense" ADD CONSTRAINT "OperationalLicense_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryInspection" ADD CONSTRAINT "RegulatoryInspection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryInspection" ADD CONSTRAINT "RegulatoryInspection_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryInspection" ADD CONSTRAINT "RegulatoryInspection_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "RegulatoryAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "RegulatoryInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_externalAccreditationId_fkey" FOREIGN KEY ("externalAccreditationId") REFERENCES "ExternalAccreditation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveActionPlan" ADD CONSTRAINT "CorrectiveActionPlan_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "ComplianceFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveActionPlan" ADD CONSTRAINT "CorrectiveActionPlan_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalSelfAssessment" ADD CONSTRAINT "InternalSelfAssessment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalSelfAssessment" ADD CONSTRAINT "InternalSelfAssessment_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalSelfAssessment" ADD CONSTRAINT "InternalSelfAssessment_criteriaSetId_fkey" FOREIGN KEY ("criteriaSetId") REFERENCES "AccreditationCriteriaSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentProgramSupport" ADD CONSTRAINT "EquipmentProgramSupport_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentProgramSupport" ADD CONSTRAINT "EquipmentProgramSupport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentProgramSupport" ADD CONSTRAINT "EquipmentProgramSupport_criteriaItemId_fkey" FOREIGN KEY ("criteriaItemId") REFERENCES "AccreditationCriteriaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_assignedPersonId_fkey" FOREIGN KEY ("assignedPersonId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityReservation" ADD CONSTRAINT "FacilityReservation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityReservation" ADD CONSTRAINT "FacilityReservation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityReservation" ADD CONSTRAINT "FacilityReservation_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_principalInvestigatorId_fkey" FOREIGN KEY ("principalInvestigatorId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProjectMember" ADD CONSTRAINT "ResearchProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProjectMember" ADD CONSTRAINT "ResearchProjectMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOutput" ADD CONSTRAINT "ResearchOutput_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOutput" ADD CONSTRAINT "ResearchOutput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOutput" ADD CONSTRAINT "ResearchOutput_personId_fkey" FOREIGN KEY ("personId") REFERENCES "InstitutionalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOutput" ADD CONSTRAINT "ResearchOutput_researchPaperId_fkey" FOREIGN KEY ("researchPaperId") REFERENCES "ResearchPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ════════════════════════════════════════════════════════════════
-- r352 — hand-authored belt: partial unique indexes + the org-unit
-- parent invariant trigger + structural backfills (DECISIONS.md D13).
-- Everything is additive and idempotent-by-guard; existing rows and
-- IDs are preserved.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Partial unique indexes (invariants Prisma cannot declare) ──

-- One substantive (non-acting) SCHEDULED/ACTIVE appointment per
-- position+unit; institution-wide appointments (NULL unit) are keyed
-- per institution instead (Postgres NULLs are distinct in unique
-- indexes, hence the second partial index).
CREATE UNIQUE INDEX "PositionAppointment_substantive_unit_key"
  ON "PositionAppointment"("positionId", "orgUnitId")
  WHERE "orgUnitId" IS NOT NULL AND "acting" = false
    AND "status" IN ('SCHEDULED', 'ACTIVE');
CREATE UNIQUE INDEX "PositionAppointment_substantive_institution_key"
  ON "PositionAppointment"("institutionId", "positionId")
  WHERE "orgUnitId" IS NULL AND "acting" = false
    AND "status" IN ('SCHEDULED', 'ACTIVE');

-- One ACTIVE membership per (council, person).
CREATE UNIQUE INDEX "CouncilMembership_active_person_key"
  ON "CouncilMembership"("councilId", "personId")
  WHERE "status" = 'ACTIVE';

-- Sibling nameAr uniqueness under a parent (root-level faculties are
-- exempt on purpose — the legacy Faculty uniqueness is per
-- (institution, name, city), and city-distinct faculties with equal
-- names are legal historical data).
CREATE UNIQUE INDEX "OrganizationalUnit_sibling_name_key"
  ON "OrganizationalUnit"("parentId", "nameAr")
  WHERE "parentId" IS NOT NULL AND "status" <> 'DISSOLVED';

-- Only one current term per institution.
CREATE UNIQUE INDEX "AcademicTerm_single_current_key"
  ON "AcademicTerm"("institutionId")
  WHERE "isCurrent" = true;

-- ── 2. Org-unit parent invariants (DB belt; the service layer
--      pre-checks and answers clean Arabic 409s) ────────────────────

CREATE OR REPLACE FUNCTION ulara_org_unit_check_parent() RETURNS trigger AS $$
DECLARE
  cur TEXT;
  parent_institution TEXT;
BEGIN
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
  -- Walk up (bounded: every ancestor is same-institution by the check
  -- above, and the tree is finite) to prove the new edge creates no cycle.
  cur := NEW."parentId";
  WHILE cur IS NOT NULL LOOP
    IF cur = NEW."id" THEN
      RAISE EXCEPTION 'ORG_UNIT_CYCLE: parent chain returns to this unit';
    END IF;
    SELECT "parentId" INTO cur FROM "OrganizationalUnit" WHERE "id" = cur;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_unit_parent_invariants
  BEFORE INSERT OR UPDATE OF "parentId", "institutionId" ON "OrganizationalUnit"
  FOR EACH ROW EXECUTE FUNCTION ulara_org_unit_check_parent();

-- ── 3. Structural backfill: one OrganizationalUnit per Faculty and
--      per Department, preserving legacy rows/IDs and linking them
--      (DECISIONS.md D3). Deterministic ids make re-runs no-ops. ────

INSERT INTO "OrganizationalUnit" ("id", "institutionId", "parentId", "code", "nameAr", "nameEn", "type", "status", "sortOrder", "location", "createdAt", "updatedAt")
SELECT
  'ou-f-' || f."id",
  f."institutionId",
  NULL,
  NULL,
  f."name",
  f."nameEn",
  'FACULTY',
  'ACTIVE',
  0,
  f."city",
  now(),
  now()
FROM "Faculty" f
WHERE NOT EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-f-' || f."id");

UPDATE "Faculty" f
SET "orgUnitId" = 'ou-f-' || f."id"
WHERE f."orgUnitId" IS NULL
  AND EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-f-' || f."id");

INSERT INTO "OrganizationalUnit" ("id", "institutionId", "parentId", "code", "nameAr", "nameEn", "type", "status", "sortOrder", "createdAt", "updatedAt")
SELECT
  'ou-d-' || d."id",
  f."institutionId",
  'ou-f-' || d."facultyId",
  NULL,
  d."name",
  d."nameEn",
  'SCIENTIFIC_DEPARTMENT',
  'ACTIVE',
  0,
  now(),
  now()
FROM "Department" d
JOIN "Faculty" f ON f."id" = d."facultyId"
WHERE NOT EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-d-' || d."id");

UPDATE "Department" d
SET "orgUnitId" = 'ou-d-' || d."id"
WHERE d."orgUnitId" IS NULL
  AND EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-d-' || d."id");
