/**
 * r352 — zod DTOs for every institutional-core surface.
 *
 * Conventions (BACKEND.md): `.strict()` objects, trimmed strings with
 * explicit bounds, z.coerce numbers for query pagination, ISO-8601
 * dates. The OpenAPI generator resolves these named schemas from the
 * route files' imports.
 */
import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';
import { ORG_UNIT_TYPES } from '../../lib/org-unit-types.js';

// ─── shared primitives ─────────────────────────────────────────────
const id = z.string().cuid();
const optionalId = z.string().cuid().optional();
const date = z.coerce.date();
const optionalDate = z.coerce.date().optional();
const orgUnitType = z.enum(ORG_UNIT_TYPES);

// ─── institution classification ────────────────────────────────────
export const institutionClassificationSchema = z
  .object({
    sector: z.enum(['HIGHER_EDUCATION_RESEARCH', 'TECHNICAL_VOCATIONAL_PROFESSIONAL']).optional(),
    kindCode: z.string().trim().min(2).max(64).optional(),
    ownership: z
      .enum(['PUBLIC', 'PRIVATE', 'OPEN', 'MIXED', 'INTERNATIONAL', 'OTHER'])
      .optional(),
    supervisingAuthorityCode: z.string().trim().min(2).max(64).optional(),
    establishmentDecisionNumber: z.string().trim().max(120).optional(),
    establishmentDecisionDate: optionalDate,
    parentInstitutionId: id.optional(),
  })
  .strict();

// ─── organizational units ──────────────────────────────────────────
export const orgUnitListSchema = paginationSchema.extend({
  type: orgUnitType.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISSOLVED']).optional(),
  parentId: z.string().cuid().optional(),
});

export const orgUnitCreateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().max(200).optional(),
    type: orgUnitType,
    code: z.string().trim().min(1).max(64).optional(),
    parentId: optionalId,
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    location: z.string().trim().max(200).optional(),
    contactEmail: z.string().trim().email().max(200).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    establishedAt: optionalDate,
    // Required when type mirrors to the legacy Faculty table.
    city: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const orgUnitUpdateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200).optional(),
    nameEn: z.string().trim().max(200).nullable().optional(),
    code: z.string().trim().min(1).max(64).nullable().optional(),
    parentId: z.string().cuid().nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    location: z.string().trim().max(200).nullable().optional(),
    contactEmail: z.string().trim().email().max(200).nullable().optional(),
    contactPhone: z.string().trim().max(40).nullable().optional(),
    city: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const orgUnitStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'DISSOLVED']),
    dissolvedAt: optionalDate,
  })
  .strict();

// ─── people ────────────────────────────────────────────────────────
export const peopleListSchema = paginationSchema.extend({
  category: z
    .enum([
      'ACADEMIC_STAFF', 'TEACHING_ASSISTANT', 'TRAINER', 'ASSISTANT_TRAINER',
      'TEACHER', 'TECHNICAL_GUIDE', 'ADMINISTRATIVE_STAFF', 'TECHNICIAN',
      'PROFESSIONAL', 'OTHER',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'ENDED']).optional(),
  orgUnitId: z.string().cuid().optional(),
});

export const personCreateSchema = z
  .object({
    fullNameAr: z.string().trim().min(1).max(200),
    fullNameEn: z.string().trim().max(200).optional(),
    category: z.enum([
      'ACADEMIC_STAFF', 'TEACHING_ASSISTANT', 'TRAINER', 'ASSISTANT_TRAINER',
      'TEACHER', 'TECHNICAL_GUIDE', 'ADMINISTRATIVE_STAFF', 'TECHNICIAN',
      'PROFESSIONAL', 'OTHER',
    ]),
    staffNumber: z.string().trim().min(1).max(64).optional(),
    userId: optionalId,
    primaryOrgUnitId: optionalId,
    hiredAt: optionalDate,
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const personUpdateSchema = personCreateSchema.partial().strict();

export const personStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'ENDED']),
    endedAt: optionalDate,
  })
  .strict();

// ─── appointments ──────────────────────────────────────────────────
export const appointmentListSchema = paginationSchema.extend({
  status: z.enum(['SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED']).optional(),
  personId: z.string().cuid().optional(),
  orgUnitId: z.string().cuid().optional(),
  positionId: z.string().cuid().optional(),
});

export const appointmentCreateSchema = z
  .object({
    personId: id,
    positionCode: z.string().trim().min(2).max(64),
    orgUnitId: optionalId,
    appointedByAuthority: z.string().trim().max(200).optional(),
    decisionNumber: z.string().trim().max(120).optional(),
    decisionDate: optionalDate,
    startDate: date,
    endDate: optionalDate,
    termMonths: z.coerce.number().int().min(1).max(120).optional(),
    acting: z.boolean().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const appointmentEndSchema = z
  .object({
    endDate: date,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const appointmentCancelSchema = z
  .object({ notes: z.string().trim().max(2000).optional() })
  .strict();

// ─── councils ──────────────────────────────────────────────────────
export const councilListSchema = paginationSchema.extend({
  type: z
    .enum([
      'UNIVERSITY_COUNCIL', 'FACULTY_COUNCIL', 'DEPARTMENT_COUNCIL',
      'SCIENTIFIC_COUNCIL', 'INSTITUTE_COUNCIL', 'DISCIPLINARY_COUNCIL',
      'STANDING_COMMITTEE', 'OTHER',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'DISSOLVED', 'CANCELLED']).optional(),
});

export const councilCreateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().max(200).optional(),
    type: z.enum([
      'UNIVERSITY_COUNCIL', 'FACULTY_COUNCIL', 'DEPARTMENT_COUNCIL',
      'SCIENTIFIC_COUNCIL', 'INSTITUTE_COUNCIL', 'DISCIPLINARY_COUNCIL',
      'STANDING_COMMITTEE', 'OTHER',
    ]),
    orgUnitId: optionalId,
    code: z.string().trim().min(1).max(64).optional(),
    legalBasis: z.string().trim().max(400).optional(),
    charterRef: z.string().trim().max(200).optional(),
    establishedAt: optionalDate,
  })
  .strict();

export const councilUpdateSchema = councilCreateSchema
  .partial()
  .extend({ status: z.enum(['ACTIVE', 'DISSOLVED', 'CANCELLED']).optional() })
  .strict();

export const councilMembershipCreateSchema = z
  .object({
    personId: id,
    role: z.enum(['CHAIR', 'DEPUTY_CHAIR', 'SECRETARY', 'MEMBER', 'OBSERVER']),
    startDate: date,
    endDate: optionalDate,
    decisionRef: z.string().trim().max(200).optional(),
  })
  .strict();

export const councilMembershipEndSchema = z
  .object({
    endDate: date,
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

export const meetingCreateSchema = z
  .object({
    scheduledAt: date,
    location: z.string().trim().max(200).optional(),
    seqNumber: z.coerce.number().int().min(1).max(99999).optional(),
    agendaSummary: z.string().trim().max(2000).optional(),
  })
  .strict();

export const meetingUpdateSchema = z
  .object({
    scheduledAt: date.optional(),
    location: z.string().trim().max(200).nullable().optional(),
    status: z.enum(['SCHEDULED', 'HELD', 'CANCELLED']).optional(),
    agendaSummary: z.string().trim().max(2000).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const attendanceBulkSchema = z
  .object({
    records: z
      .array(
        z
          .object({
            personId: id,
            status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']),
            // r352 hardening §7.3 — the guest/participant distinction is
            // explicit. MEMBER (default) rows are verified against ACTIVE
            // council memberships; GUEST rows are documented external
            // participants of the same institution.
            attendeeKind: z.enum(['MEMBER', 'GUEST']).default('MEMBER'),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export const agendaItemCreateSchema = z
  .object({
    orderNo: z.coerce.number().int().min(1).max(999),
    titleAr: z.string().trim().min(1).max(300),
    description: z.string().trim().max(4000).optional(),
  })
  .strict();

export const agendaItemUpdateSchema = z
  .object({
    titleAr: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    status: z.enum(['OPEN', 'DISCUSSED', 'DEFERRED', 'CLOSED']).optional(),
    orderNo: z.coerce.number().int().min(1).max(999).optional(),
  })
  .strict();

export const resolutionCreateSchema = z
  .object({
    agendaItemId: optionalId,
    number: z.string().trim().max(64).optional(),
    kind: z.enum(['RESOLUTION', 'RECOMMENDATION', 'FOLLOW_UP_ACTION']),
    textAr: z.string().trim().min(1).max(8000),
    dueDate: optionalDate,
    ownerPersonId: optionalId,
  })
  .strict();

export const resolutionUpdateSchema = z
  .object({
    status: z.enum(['DRAFT', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'ARCHIVED']).optional(),
    approvedAt: optionalDate,
    completedAt: optionalDate,
    completionRef: z.string().trim().max(200).optional(),
  })
  .strict();

export const minutesUpsertSchema = z
  .object({ contentAr: z.string().trim().min(1).max(60000) })
  .strict();

export const minutesApproveSchema = z.object({ approvedByPersonId: id }).strict();
export const minutesSignSchema = z.object({ signedByPersonId: id }).strict();

export const councilDocumentCreateSchema = z
  .object({
    titleAr: z.string().trim().min(1).max(300),
    // r352 hardening §9 — the real storage link (governance namespace).
    binaryObjectId: z.string().trim().max(200).optional(),
    // DEPRECATED external reference — never trusted as an upload.
    fileUrl: z.string().trim().max(1000).optional(),
    kind: z.string().trim().max(64).optional(),
    meetingId: optionalId,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

// r352 hardening §7.4 — paginated council meetings list.
export const meetingListSchema = paginationSchema.extend({}).strict();

// ─── learners (r352 hardening §5 — the generalized learner) ────────
export const learnerListSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.enum(['STUDENT', 'TRAINEE']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED']).optional(),
  orgUnitId: z.string().cuid().optional(),
});

export const learnerCreateSchema = z
  .object({
    category: z.enum(['STUDENT', 'TRAINEE']),
    learnerNumber: z.string().trim().min(1).max(64),
    fullNameAr: z.string().trim().min(1).max(200),
    fullNameEn: z.string().trim().max(200).optional(),
    gender: z.string().trim().max(30).optional(),
    birthDate: optionalDate,
    nationality: z.string().trim().max(80).optional(),
    nationalId: z.string().trim().max(64).optional(),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(300).optional(),
    orgUnitId: optionalId,
    userId: optionalId,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const learnerUpdateSchema = learnerCreateSchema
  .partial()
  .omit({ category: true, learnerNumber: true })
  .extend({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED']).optional(),
  })
  .strict();

// ─── academic: terms, programs, enrollments, placements ───────────
export const termCreateSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    startsAt: date,
    endsAt: optionalDate,
    isCurrent: z.boolean().optional(),
  })
  .strict();

export const programListSchema = paginationSchema.extend({
  kind: z
    .enum(['ACADEMIC', 'TECHNICAL', 'PROFESSIONAL', 'VOCATIONAL_TRAINING', 'BASIC_FORMATION'])
    .optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  orgUnitId: z.string().cuid().optional(),
});

export const programCreateSchema = z
  .object({
    code: z.string().trim().min(2).max(64),
    nameAr: z.string().trim().min(1).max(300),
    nameEn: z.string().trim().max(300).optional(),
    kind: z.enum(['ACADEMIC', 'TECHNICAL', 'PROFESSIONAL', 'VOCATIONAL_TRAINING', 'BASIC_FORMATION']),
    orgUnitId: optionalId,
    credentialTypeCode: z.string().trim().min(2).max(64).optional(),
    approvalRef: z.string().trim().max(200).optional(),
    durationMonths: z.coerce.number().int().min(1).max(120).optional(),
    totalCreditHours: z.coerce.number().int().min(1).max(1000).optional(),
    admissionRequirements: z.record(z.string(), z.unknown()).optional(),
    progressionRules: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const programUpdateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(300).optional(),
    nameEn: z.string().trim().max(300).nullable().optional(),
    orgUnitId: z.string().cuid().nullable().optional(),
    credentialTypeCode: z.string().trim().min(2).max(64).nullable().optional(),
    approvalRef: z.string().trim().max(200).nullable().optional(),
    durationMonths: z.coerce.number().int().min(1).max(120).nullable().optional(),
    totalCreditHours: z.coerce.number().int().min(1).max(1000).nullable().optional(),
    status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
    admissionRequirements: z.record(z.string(), z.unknown()).optional(),
    progressionRules: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const programVersionCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(64),
    effectiveFrom: optionalDate,
    approvalRef: z.string().trim().max(200).optional(),
  })
  .strict();

export const programVersionUpdateSchema = z
  .object({
    status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'RETIRED']).optional(),
    effectiveFrom: optionalDate,
    approvalRef: z.string().trim().max(200).optional(),
  })
  .strict();

export const programCourseCreateSchema = z
  .object({
    courseId: id,
    termNo: z.coerce.number().int().min(1).max(20).optional(),
    kind: z.enum(['CORE', 'ELECTIVE', 'PRACTICUM', 'CAPSTONE', 'SUPPORTING']).optional(),
    creditHours: z.coerce.number().int().min(1).max(30).optional(),
  })
  .strict();

export const programEnrollmentListSchema = paginationSchema.extend({
  programId: z.string().cuid().optional(),
  learnerProfileId: z.string().cuid().optional(),
  studentProfileId: z.string().cuid().optional(),
  status: z
    .enum(['CANDIDATE', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN', 'SUSPENDED', 'COMPLETED', 'GRADUATED'])
    .optional(),
});

// r352 hardening §5 — the generalized learner is the canonical target;
// exactly ONE of learnerProfileId / studentProfileId (legacy bridge).
export const programEnrollmentCreateSchema = z
  .object({
    learnerProfileId: optionalId,
    studentProfileId: optionalId,
    programId: id,
    programVersionId: optionalId,
    expectedCompletionAt: optionalDate,
  })
  .strict()
  .refine(
    (v) => (v.learnerProfileId !== undefined) !== (v.studentProfileId !== undefined),
    { message: 'حدد learnerProfileId أو studentProfileId — لا كليهما ولا أياً منهما' },
  );

export const programEnrollmentStatusSchema = z
  .object({
    status: z
      .enum(['CANDIDATE', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN', 'SUSPENDED', 'COMPLETED', 'GRADUATED']),
    completionAt: optionalDate,
    gpa: z.coerce.number().min(0).max(4).optional(),
  })
  .strict();

export const placementListSchema = paginationSchema.extend({
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED']).optional(),
  learnerProfileId: z.string().cuid().optional(),
  studentProfileId: z.string().cuid().optional(),
});

// r352 hardening §4.3/§5 — placements target the generalized learner;
// exactly ONE of learnerProfileId / studentProfileId (legacy bridge).
export const placementCreateSchema = z
  .object({
    learnerProfileId: optionalId,
    studentProfileId: optionalId,
    programEnrollmentId: optionalId,
    hostOrgUnitId: optionalId,
    externalHost: z.string().trim().max(300).optional(),
    supervisorPersonId: optionalId,
    startsAt: date,
    endsAt: optionalDate,
  })
  .strict()
  .refine(
    (v) => (v.learnerProfileId !== undefined) !== (v.studentProfileId !== undefined),
    { message: 'حدد learnerProfileId أو studentProfileId — لا كليهما ولا أياً منهما' },
  );

export const placementUpdateSchema = z
  .object({
    status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED']).optional(),
    endsAt: optionalDate,
    evaluationSummary: z.string().trim().max(4000).optional(),
    evaluationScore: z.coerce.number().min(0).max(100).optional(),
  })
  .strict();

// ─── credentials ───────────────────────────────────────────────────
export const credentialListSchema = paginationSchema.extend({
  learnerProfileId: z.string().cuid().optional(),
  studentProfileId: z.string().cuid().optional(),
  credentialTypeId: z.string().cuid().optional(),
  status: z.enum(['AWARDED', 'REVOKED', 'SUSPENDED']).optional(),
});

// r352 hardening §4.4/§5 — awards target the generalized learner;
// exactly ONE of learnerProfileId / studentProfileId (legacy bridge).
export const credentialAwardSchema = z
  .object({
    learnerProfileId: optionalId,
    studentProfileId: optionalId,
    credentialTypeCode: z.string().trim().min(2).max(64),
    programId: optionalId,
    programEnrollmentId: optionalId,
    decisionNumber: z.string().trim().max(120).optional(),
    decisionDate: optionalDate,
    conferredAt: optionalDate,
    serialNumber: z.string().trim().min(1).max(80).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine(
    (v) => (v.learnerProfileId !== undefined) !== (v.studentProfileId !== undefined),
    { message: 'حدد learnerProfileId أو studentProfileId — لا كليهما ولا أياً منهما' },
  );

export const credentialRevokeSchema = z
  .object({ notes: z.string().trim().max(2000).optional() })
  .strict();

// ─── compliance ────────────────────────────────────────────────────
const accreditationScope = z
  .object({
    scopeType: z.enum(['INSTITUTION', 'ORGANIZATIONAL_UNIT', 'PROGRAM']).optional(),
    orgUnitId: optionalId,
    programId: optionalId,
  })
  .strict();

export const accreditationListSchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'IN_REVIEW', 'GRANTED', 'CONDITIONAL', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN'])
    .optional(),
  type: z.enum(['INSTITUTIONAL', 'PROGRAM']).optional(),
});

export const accreditationCreateSchema = accreditationScope.extend({
  type: z.enum(['INSTITUTIONAL', 'PROGRAM']),
  authorityCode: z.string().trim().min(2).max(64),
  decisionNumber: z.string().trim().max(120).optional(),
  decisionDate: optionalDate,
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
  criteriaSetId: optionalId,
  reportRef: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const accreditationUpdateSchema = z
  .object({
    status: z
      .enum(['PENDING', 'IN_REVIEW', 'GRANTED', 'CONDITIONAL', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN'])
      .optional(),
    decisionNumber: z.string().trim().max(120).optional(),
    decisionDate: optionalDate,
    effectiveFrom: optionalDate,
    effectiveTo: optionalDate,
    reportRef: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export const licenseListSchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'ACTIVE', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED']).optional(),
  kind: z.enum(['TECHNICAL_LICENSE', 'OPERATING_PERMIT', 'ESTABLISHMENT_DECISION', 'OTHER']).optional(),
});

export const licenseCreateSchema = z
  .object({
    kind: z.enum(['TECHNICAL_LICENSE', 'OPERATING_PERMIT', 'ESTABLISHMENT_DECISION', 'OTHER']),
    authorityCode: z.string().trim().min(2).max(64),
    licenseNumber: z.string().trim().max(120).optional(),
    scopeType: z.enum(['INSTITUTION', 'ORGANIZATIONAL_UNIT', 'PROGRAM']).optional(),
    orgUnitId: optionalId,
    programId: optionalId,
    issuedAt: optionalDate,
    expiresAt: optionalDate,
    conditions: z.string().trim().max(4000).optional(),
    documentRef: z.string().trim().max(300).optional(),
  })
  .strict();

export const licenseUpdateSchema = z
  .object({
    status: z.enum(['PENDING', 'ACTIVE', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED']).optional(),
    licenseNumber: z.string().trim().max(120).optional(),
    issuedAt: optionalDate,
    expiresAt: optionalDate,
    conditions: z.string().trim().max(4000).optional(),
    documentRef: z.string().trim().max(300).optional(),
  })
  .strict();

export const inspectionListSchema = paginationSchema.extend({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const inspectionCreateSchema = z
  .object({
    authorityCode: z.string().trim().min(2).max(64),
    kind: z.enum(['MINISTRY', 'REGULATOR', 'SAFETY', 'TECHNICAL', 'OTHER']),
    orgUnitId: optionalId,
    scheduledAt: optionalDate,
    reportRef: z.string().trim().max(300).optional(),
  })
  .strict();

export const inspectionUpdateSchema = z
  .object({
    scheduledAt: optionalDate,
    conductedAt: optionalDate,
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    summary: z.string().trim().max(8000).optional(),
    reportRef: z.string().trim().max(300).optional(),
  })
  .strict();

export const findingListSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISPUTED', 'CLOSED']).optional(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).optional(),
});

export const findingCreateSchema = z
  .object({
    severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
    titleAr: z.string().trim().min(1).max(300),
    description: z.string().trim().max(8000).optional(),
    inspectionId: optionalId,
    externalAccreditationId: optionalId,
    orgUnitId: optionalId,
    programId: optionalId,
    legalReference: z.string().trim().max(200).optional(),
    dueDate: optionalDate,
  })
  .strict();

export const findingUpdateSchema = z
  .object({
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISPUTED', 'CLOSED']).optional(),
    dueDate: optionalDate,
    description: z.string().trim().max(8000).optional(),
  })
  .strict();

export const correctiveActionCreateSchema = z
  .object({
    planText: z.string().trim().min(1).max(8000),
    ownerPersonId: optionalId,
    targetDate: optionalDate,
  })
  .strict();

export const correctiveActionUpdateSchema = z
  .object({
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED']).optional(),
    completedAt: optionalDate,
    verificationRef: z.string().trim().max(300).optional(),
  })
  .strict();

export const selfAssessmentListSchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
});

export const selfAssessmentCreateSchema = z
  .object({
    periodLabel: z.string().trim().min(1).max(100),
    orgUnitId: optionalId,
    criteriaSetId: optionalId,
    summary: z.string().trim().max(8000).optional(),
  })
  .strict();

export const selfAssessmentUpdateSchema = z
  .object({
    status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
    summary: z.string().trim().max(8000).optional(),
  })
  .strict();

export const evidenceListSchema = paginationSchema.extend({
  ownerType: z.string().trim().max(64).optional(),
  ownerId: z.string().cuid().optional(),
});

export const evidenceCreateSchema = z
  .object({
    ownerType: z.enum([
      'ExternalAccreditation', 'CorrectiveActionPlan', 'InternalSelfAssessment',
      'RegulatoryInspection', 'OperationalLicense',
    ]),
    ownerId: id,
    titleAr: z.string().trim().min(1).max(300),
    documentRef: z.string().trim().max(300).optional(),
    fileUrl: z.string().trim().max(1000).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

// ─── operations: facilities, equipment, work orders ───────────────
export const facilityListSchema = paginationSchema.extend({
  type: z.enum(['LABORATORY', 'WORKSHOP', 'CLASSROOM', 'PRACTICAL_TRAINING_FACILITY', 'LECTURE_HALL', 'OTHER']).optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'CLOSED', 'DECOMMISSIONED']).optional(),
});

export const facilityCreateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().max(200).optional(),
    type: z.enum(['LABORATORY', 'WORKSHOP', 'CLASSROOM', 'PRACTICAL_TRAINING_FACILITY', 'LECTURE_HALL', 'OTHER']),
    code: z.string().trim().min(1).max(64).optional(),
    orgUnitId: optionalId,
    building: z.string().trim().max(120).optional(),
    room: z.string().trim().max(80).optional(),
    capacity: z.coerce.number().int().min(1).max(10000).optional(),
    safetyNotes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const facilityUpdateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200).optional(),
    nameEn: z.string().trim().max(200).nullable().optional(),
    code: z.string().trim().min(1).max(64).nullable().optional(),
    orgUnitId: z.string().cuid().nullable().optional(),
    building: z.string().trim().max(120).nullable().optional(),
    room: z.string().trim().max(80).nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(10000).nullable().optional(),
    safetyNotes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'CLOSED', 'DECOMMISSIONED']).optional(),
  })
  .strict();

export const equipmentListSchema = paginationSchema.extend({
  status: z.enum(['IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED', 'LOST']).optional(),
  facilityId: z.string().cuid().optional(),
});

export const equipmentCreateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().max(200).optional(),
    code: z.string().trim().min(1).max(64).optional(),
    facilityId: optionalId,
    orgUnitId: optionalId,
    category: z.string().trim().max(120).optional(),
    serialNumber: z.string().trim().max(120).optional(),
    acquiredAt: optionalDate,
    value: z.coerce.number().min(0).max(1e12).optional(),
    condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN']).optional(),
    status: z.enum(['IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED', 'LOST']).optional(),
    responsiblePersonId: optionalId,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const equipmentUpdateSchema = equipmentCreateSchema.partial().strict();

export const equipmentProgramLinkSchema = z
  .object({
    programId: id,
    criteriaItemId: optionalId,
  })
  .strict();

export const workOrderListSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  equipmentId: z.string().cuid().optional(),
});

export const workOrderCreateSchema = z
  .object({
    titleAr: z.string().trim().min(1).max(300),
    kind: z.enum(['PREVENTIVE', 'CORRECTIVE', 'SAFETY_INSPECTION', 'INSTALLATION', 'OTHER']),
    facilityId: optionalId,
    equipmentId: optionalId,
    description: z.string().trim().max(4000).optional(),
    scheduledDate: optionalDate,
    assignedPersonId: optionalId,
  })
  .strict();

export const workOrderUpdateSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    completedAt: optionalDate,
    cost: z.coerce.number().min(0).max(1e12).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const reservationListSchema = paginationSchema.extend({
  facilityId: z.string().cuid().optional(),
  status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
});

export const reservationCreateSchema = z
  .object({
    facilityId: id,
    purpose: z.string().trim().min(1).max(400),
    startsAt: date,
    endsAt: date,
    orgUnitId: optionalId,
  })
  .strict();

export const reservationUpdateSchema = z
  .object({
    status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const safetyIncidentListSchema = paginationSchema.extend({
  status: z.string().trim().max(40).optional(),
});

export const safetyIncidentCreateSchema = z
  .object({
    kind: z.enum(['INCIDENT', 'INSPECTION']),
    severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).optional(),
    titleAr: z.string().trim().min(1).max(300),
    description: z.string().trim().max(8000).optional(),
    facilityId: optionalId,
    equipmentId: optionalId,
    occurredAt: date,
  })
  .strict();

export const safetyIncidentUpdateSchema = z
  .object({
    status: z.string().trim().max(40).optional(),
    resolutionNotes: z.string().trim().max(4000).optional(),
    resolvedAt: optionalDate,
  })
  .strict();

// ─── research ──────────────────────────────────────────────────────
export const researchProjectListSchema = paginationSchema.extend({
  status: z.enum(['PROPOSED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED']).optional(),
});

export const researchProjectCreateSchema = z
  .object({
    titleAr: z.string().trim().min(1).max(400),
    titleEn: z.string().trim().max(400).optional(),
    code: z.string().trim().min(1).max(64).optional(),
    orgUnitId: optionalId,
    field: z.string().trim().max(200).optional(),
    principalInvestigatorId: optionalId,
    startsAt: optionalDate,
    endsAt: optionalDate,
    fundingSource: z.string().trim().max(200).optional(),
    budget: z.coerce.number().min(0).max(1e14).optional(),
    ethicsApprovalRef: z.string().trim().max(200).optional(),
    approvalRef: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export const researchProjectUpdateSchema = z
  .object({
    status: z.enum(['PROPOSED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED']).optional(),
    titleEn: z.string().trim().max(400).nullable().optional(),
    field: z.string().trim().max(200).nullable().optional(),
    principalInvestigatorId: z.string().cuid().nullable().optional(),
    endsAt: optionalDate,
    fundingSource: z.string().trim().max(200).nullable().optional(),
    budget: z.coerce.number().min(0).max(1e14).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const researchMemberCreateSchema = z
  .object({
    personId: id,
    role: z.enum([
      'PRINCIPAL_INVESTIGATOR', 'CO_INVESTIGATOR', 'RESEARCHER',
      'RESEARCH_ASSISTANT', 'COLLABORATOR', 'TECHNICIAN',
    ]),
    allocationPct: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const researchOutputListSchema = paginationSchema.extend({
  projectId: z.string().cuid().optional(),
  type: z.enum(['PUBLICATION', 'PATENT', 'PROTOTYPE', 'APPLIED_PRODUCT', 'TECHNICAL_REPORT']).optional(),
});

export const researchOutputCreateSchema = z
  .object({
    type: z.enum(['PUBLICATION', 'PATENT', 'PROTOTYPE', 'APPLIED_PRODUCT', 'TECHNICAL_REPORT']),
    title: z.string().trim().min(1).max(400),
    projectId: optionalId,
    personId: optionalId,
    referenceUrl: z.string().trim().max(1000).optional(),
    doi: z.string().trim().max(120).optional(),
    publishedAt: optionalDate,
    notes: z.string().trim().max(2000).optional(),
    researchPaperId: optionalId,
  })
  .strict();

// ─── unit capability grants (r352 hardening §3.2) ──────────────────
// ONE explicit capability per grant — never a role bundle. The
// capability enum excludes nothing: OWNER is a platform identity
// expressed via User.role, not a Capability, so it can never appear
// here. institutionId is honored ONLY for the OWNER cross-institution
// path; every other caller's server-verified context wins.
export const unitCapabilityGrantCreateSchema = z
  .object({
    institutionId: id,
    orgUnitId: z.string().cuid().nullable().optional(),
    capability: z.enum([
      'RESEARCH_GRADE_OWN',
      'RESEARCH_GRADE_ANY',
      'RESEARCH_PUBLISH',
      'EXAMS_AUTHOR',
      'EXAMS_MODERATE',
      'EXAMS_TAKE',
      'CURRICULUM_EDIT_OWN',
      'CURRICULUM_EDIT_ANY',
      'USERS_MANAGE',
      'ROLES_ASSIGN',
      'TEACHERS_VERIFY',
      'QUALITY_VIEW',
      'QUALITY_REPORT',
      'ANNOUNCE_PLATFORM',
      'ANNOUNCE_FACULTY',
      'COMPETITIONS_RUN',
      'EVENTS_RUN',
      'ORG_STRUCTURE_MANAGE',
      'PEOPLE_MANAGE',
      'APPOINTMENTS_MANAGE',
      'COUNCILS_MANAGE',
      'PROGRAMS_MANAGE',
      'CREDENTIALS_MANAGE',
      'ACCREDITATION_MANAGE',
      'QUALITY_INTERNAL_MANAGE',
      'FACILITIES_MANAGE',
      'RESEARCH_PROJECTS_MANAGE',
      'UNIT_CAPABILITIES_ASSIGN',
    ]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();
