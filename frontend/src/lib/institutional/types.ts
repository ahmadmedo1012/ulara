/**
 * r352 — the institutional domain DTOs, field-for-field from the
 * backend agent's published contract
 * (docs/redesign/r352/institutional-backend/API-CONTRACT.md, branch
 * r352/institutional-backend) and its DATA-MODEL.md enum registry.
 *
 * NOTHING here is invented: every path, property and enum value is the
 * contract's own vocabulary. Where the contract leaves a field
 * optional it stays optional here. Type-only module — zero bundle
 * cost (erased at compile time).
 *
 * Envelope: `{ data: T }` (+ `meta` on paginated lists) is unwrapped
 * by lib/api.ts `unwrap` before these types are seen.
 */

/* ── shared shapes ──────────────────────────────────────────────── */

/** The paginated-list envelope meta (contract header). */
export interface PagedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PagedMeta;
}

export type ID = string;

/* ── §1 catalogs (session-level, no institution context) ─────────── */

export interface InstitutionTypeRow {
  id: ID;
  code: string;
  sector: 'HIGHER_EDUCATION_RESEARCH' | 'TECHNICAL_VOCATIONAL_PROFESSIONAL';
  nameAr: string;
  nameEn?: string | null;
  isIndependentLegalPersonality: boolean;
  legalBasis?: string | null;
  defaultAuthorityId?: ID | null;
}

export interface AuthorityRow {
  id: ID;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  kind: string;
}

export interface CredentialTypeRow {
  id: ID;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  level: number;
  grantsProgression: boolean;
  legalBasis?: string | null;
}

export interface PositionTemplateRow {
  id: ID;
  code: string;
  titleAr: string;
  titleEn?: string | null;
  category: PositionCategory;
  scopeRequirement?: OrgUnitType | null;
  /** Empty = eligible for every institution kind. */
  eligibleInstitutionTypeCodes: string[];
  isLocalVariant: boolean;
  institutionId?: ID | null;
}

export interface CriteriaItemRow {
  id: ID;
  code: string;
  titleAr: string;
}

export interface CriteriaSetRow {
  id: ID;
  code: string;
  version: string;
  nameAr: string;
  appliesTo: 'INSTITUTIONAL' | 'PROGRAM';
  authorityId: ID;
  isActive: boolean;
  items: CriteriaItemRow[];
}

/* ── §2 institution classification ──────────────────────────────── */

export type InstitutionSector = 'HIGHER_EDUCATION_RESEARCH' | 'TECHNICAL_VOCATIONAL_PROFESSIONAL';
export type OwnershipType = 'PUBLIC' | 'PRIVATE' | 'OPEN' | 'MIXED' | 'INTERNATIONAL' | 'OTHER';
/** Additive statuses — existing ACTIVE/SUSPENDED plus the r352 rows. */
export type InstitutionStatusExt = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'CLOSED' | 'MERGED';

export interface InstitutionProfile {
  id: ID;
  name: string;
  nameEn?: string | null;
  slug: string;
  status: InstitutionStatusExt;
  sector?: InstitutionSector | null;
  kind?: { id: ID; code: string; nameAr: string } | null;
  ownership?: OwnershipType | null;
  supervisingAuthority?: { id: ID; code: string; nameAr: string } | null;
  establishmentDecisionNumber?: string | null;
  establishmentDecisionDate?: string | null;
  parentId?: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationPatch {
  sector?: InstitutionSector;
  kindCode?: string;
  ownership?: OwnershipType;
  supervisingAuthorityCode?: string;
  establishmentDecisionNumber?: string;
  establishmentDecisionDate?: string;
  parentInstitutionId?: ID;
}

/* ── §3 organizational units ────────────────────────────────────── */

/** OrgUnitType — the 18 contract kinds (DATA-MODEL §2). */
export type OrgUnitType =
  | 'FACULTY' | 'COLLEGE' | 'SCIENTIFIC_DEPARTMENT' | 'INSTITUTE'
  | 'RESEARCH_CENTER' | 'RESEARCH_UNIT' | 'GENERAL_ADMINISTRATION' | 'OFFICE'
  | 'ADMINISTRATIVE_DEPARTMENT' | 'BRANCH' | 'CAMPUS' | 'TRAINING_UNIT'
  | 'LABORATORY' | 'WORKSHOP' | 'DEANERY_OFFICE' | 'REGISTRAR_OFFICE'
  | 'QA_OFFICE' | 'OTHER';

export type OrgUnitStatus = 'ACTIVE' | 'INACTIVE' | 'DISSOLVED';

export interface OrgUnit {
  id: ID;
  institutionId: ID;
  parentId?: ID | null;
  code?: string | null;
  nameAr: string;
  nameEn?: string | null;
  type: OrgUnitType;
  status: OrgUnitStatus;
  sortOrder?: number | null;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnitTreeNode extends OrgUnit {
  children: OrgUnitTreeNode[];
}

export interface OrgUnitInput {
  nameAr: string;
  nameEn?: string;
  type: OrgUnitType;
  code?: string;
  parentId?: ID | null;
  sortOrder?: number;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
}

export interface OrgUnitDetail {
  unit: OrgUnit;
  ancestors: OrgUnit[];
}

/* ── §4 people ──────────────────────────────────────────────────── */

/** StaffCategory — Law 21/2023 م2/م50 (the 10 statutory kinds). */
export type StaffCategory =
  | 'ACADEMIC_STAFF' | 'TEACHING_ASSISTANT' | 'TRAINER' | 'ASSISTANT_TRAINER'
  | 'TEACHER' | 'TECHNICAL_GUIDE' | 'ADMINISTRATIVE_STAFF' | 'TECHNICIAN'
  | 'PROFESSIONAL' | 'OTHER';

export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'ENDED';

export interface Person {
  id: ID;
  institutionId: ID;
  userId?: ID | null;
  staffNumber?: string | null;
  fullNameAr: string;
  fullNameEn?: string | null;
  category: StaffCategory;
  primaryOrgUnitId?: ID | null;
  staffStatus: StaffStatus;
  hiredAt?: string | null;
  endedAt?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonInput {
  fullNameAr: string;
  fullNameEn?: string;
  category: StaffCategory;
  staffNumber?: string;
  userId?: ID;
  primaryOrgUnitId?: ID | null;
  hiredAt?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

/** GET /institutional/people/:id — person + active appointments +
 * unit-capability grants when populated (contract §4 — the hardened surface). */
export interface PersonDetail {
  person: Person;
  appointments: Appointment[];
  unitCapabilityGrants: UnitCapabilityGrant[];
}

/* ── §5 appointments ────────────────────────────────────────────── */

export type PositionCategory =
  | 'UNIVERSITY_LEADERSHIP' | 'FACULTY_LEADERSHIP' | 'DEPARTMENT_LEADERSHIP'
  | 'INSTITUTE_LEADERSHIP' | 'CENTER_LEADERSHIP' | 'ADMINISTRATIVE_LEADERSHIP'
  | 'TRAINING_LEADERSHIP' | 'BOARD_OFFICE' | 'OTHER';

export type AppointmentStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface Appointment {
  id: ID;
  institutionId: ID;
  personId: ID;
  positionId: ID;
  orgUnitId?: ID | null;
  appointedByAuthority?: string | null;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  startDate: string;
  endDate?: string | null;
  termMonths?: number | null;
  status: AppointmentStatus;
  acting: boolean;
  supersededById?: ID | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentInput {
  personId: ID;
  positionCode: string;
  orgUnitId?: ID;
  appointedByAuthority?: string;
  decisionNumber?: string;
  decisionDate?: string;
  startDate: string;
  endDate?: string;
  termMonths?: number;
  acting?: boolean;
}

/** GET /institutional/appointments/:id — incl. summary relations. */
export interface AppointmentDetail extends Appointment {
  person?: { id: ID; fullNameAr: string } | null;
  position?: { id: ID; code: string; titleAr: string } | null;
  orgUnit?: { id: ID; nameAr: string; type: OrgUnitType } | null;
}

/* ── §6 councils & committees ───────────────────────────────────── */

export type CouncilType =
  | 'UNIVERSITY_COUNCIL' | 'FACULTY_COUNCIL' | 'DEPARTMENT_COUNCIL'
  | 'SCIENTIFIC_COUNCIL' | 'INSTITUTE_COUNCIL' | 'DISCIPLINARY_COUNCIL'
  | 'STANDING_COMMITTEE' | 'OTHER';

export type CouncilStatus = 'ACTIVE' | 'DISSOLVED' | 'CANCELLED';
export type CouncilRole = 'CHAIR' | 'DEPUTY_CHAIR' | 'SECRETARY' | 'MEMBER' | 'OBSERVER';

export interface Council {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  code?: string | null;
  nameAr: string;
  nameEn?: string | null;
  type: CouncilType;
  legalBasis?: string | null;
  charterRef?: string | null;
  establishedAt?: string | null;
  dissolvedAt?: string | null;
  status: CouncilStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CouncilInput {
  nameAr: string;
  nameEn?: string;
  type: CouncilType;
  orgUnitId?: ID;
  code?: string;
  legalBasis?: string;
  charterRef?: string;
  establishedAt?: string;
}

export interface CouncilMembership {
  id: ID;
  councilId: ID;
  personId: ID;
  role: CouncilRole;
  startDate: string;
  endDate?: string | null;
  decisionRef?: string | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  person?: { id: ID; fullNameAr: string } | null;
}

export interface CouncilDetail extends Council {
  memberships: CouncilMembership[];
}

export type MeetingStatus = 'SCHEDULED' | 'HELD' | 'CANCELLED';

export interface CouncilMeeting {
  id: ID;
  councilId: ID;
  seqNumber?: number | null;
  scheduledAt: string;
  location?: string | null;
  status: MeetingStatus;
  agendaSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AgendaItemStatus = 'OPEN' | 'DISCUSSED' | 'DEFERRED' | 'CLOSED';

export interface AgendaItem {
  id: ID;
  meetingId: ID;
  orderNo: number;
  titleAr: string;
  description?: string | null;
  status: AgendaItemStatus;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';

export interface AttendanceRecord {
  id: ID;
  meetingId: ID;
  personId: ID;
  status: AttendanceStatus;
  /** D18/§7.3: MEMBER (verified membership) vs GUEST (documented
   * external participant) — explicit, never assumed. */
  attendeeKind: 'MEMBER' | 'GUEST';
  person?: { id: ID; fullNameAr: string } | null;
}

export type ResolutionKind = 'RESOLUTION' | 'RECOMMENDATION' | 'FOLLOW_UP_ACTION';
export type ResolutionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED' | 'ARCHIVED';

export interface CouncilResolution {
  id: ID;
  meetingId: ID;
  agendaItemId?: ID | null;
  number?: string | null;
  kind: ResolutionKind;
  textAr: string;
  status: ResolutionStatus;
  approvedAt?: string | null;
  dueDate?: string | null;
  ownerPersonId?: ID | null;
  completionRef?: string | null;
  completedAt?: string | null;
}

export type MinutesStatus = 'DRAFT' | 'APPROVED' | 'SIGNED';

export interface MeetingMinutes {
  id: ID;
  meetingId: ID;
  versionNo: number;
  contentAr: string;
  status: MinutesStatus;
  approvedAt?: string | null;
  approvedByPersonId?: ID | null;
  signedAt?: string | null;
  signedByPersonId?: ID | null;
}

/** GET /governance/meetings/:id — the full meeting aggregate. */
export interface MeetingDetail {
  meeting: CouncilMeeting;
  agendaItems: AgendaItem[];
  attendance: AttendanceRecord[];
  resolutions: CouncilResolution[];
  minutes: MeetingMinutes | null;
}

export interface CouncilDocument {
  id: ID;
  councilId: ID;
  meetingId?: ID | null;
  titleAr: string;
  fileUrl?: string | null;
  kind?: string | null;
  notes?: string | null;
  createdAt: string;
}

/* ── §7 programs, terms, enrollments, placements ────────────────── */

export interface AcademicTerm {
  id: ID;
  institutionId: ID;
  code: string;
  startsAt: string;
  endsAt?: string | null;
  isCurrent: boolean;
}

export type ProgramKind = 'ACADEMIC' | 'TECHNICAL' | 'PROFESSIONAL' | 'VOCATIONAL_TRAINING' | 'BASIC_FORMATION';
export type ProgramStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface Program {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  kind: ProgramKind;
  credentialTypeId?: ID | null;
  status: ProgramStatus;
  approvalRef?: string | null;
  durationMonths?: number | null;
  totalCreditHours?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramInput {
  code: string;
  nameAr: string;
  nameEn?: string;
  kind: ProgramKind;
  orgUnitId?: ID;
  credentialTypeCode?: string;
  approvalRef?: string;
  durationMonths?: number;
  totalCreditHours?: number;
}

export type ProgramVersionStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'RETIRED';

export interface ProgramVersion {
  id: ID;
  programId: ID;
  label: string;
  effectiveFrom?: string | null;
  status: ProgramVersionStatus;
  approvedAt?: string | null;
  approvalRef?: string | null;
  _count?: { courses: number };
}

export interface ProgramDetail extends Program {
  versions: ProgramVersion[];
}

export type ProgramCourseKind = 'CORE' | 'ELECTIVE' | 'PRACTICUM' | 'CAPSTONE' | 'SUPPORTING';

export interface ProgramCourseRow {
  id: ID;
  programVersionId: ID;
  courseId: ID;
  termNo?: number | null;
  kind: ProgramCourseKind;
  creditHours?: number | null;
  course?: { id: ID; name: string; code: string } | null;
}

export type EnrollmentStatus =
  'CANDIDATE' | 'ACTIVE' | 'ON_LEAVE' | 'WITHDRAWN' | 'SUSPENDED' | 'COMPLETED' | 'GRADUATED';

export interface ProgramEnrollment {
  id: ID;
  studentProfileId: ID;
  programId: ID;
  programVersionId?: ID | null;
  status: EnrollmentStatus;
  entryDate: string;
  expectedCompletionAt?: string | null;
  completionAt?: string | null;
  gpa?: number | null;
  student?: { id: ID; firstName: string; lastName: string } | null;
  program?: { id: ID; nameAr: string; code: string } | null;
}

export type PlacementStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED';

export interface TrainingPlacement {
  id: ID;
  institutionId: ID;
  programEnrollmentId?: ID | null;
  studentProfileId: ID;
  hostOrgUnitId?: ID | null;
  externalHost?: string | null;
  supervisorPersonId?: ID | null;
  startsAt: string;
  endsAt?: string | null;
  status: PlacementStatus;
  evaluationSummary?: string | null;
  evaluationScore?: number | null;
  student?: { id: ID; firstName: string; lastName: string } | null;
}

/* ── §8 credentials ─────────────────────────────────────────────── */

export type CredentialStatus = 'AWARDED' | 'REVOKED' | 'SUSPENDED';

export interface AwardedCredential {
  id: ID;
  institutionId: ID;
  studentProfileId: ID;
  credentialTypeId: ID;
  programId?: ID | null;
  programEnrollmentId?: ID | null;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  conferredAt?: string | null;
  serialNumber?: string | null;
  status: CredentialStatus;
  notes?: string | null;
  createdAt: string;
  credentialType?: { id: ID; code: string; nameAr: string } | null;
  student?: { id: ID; firstName: string; lastName: string } | null;
}

/* ── §9 compliance ──────────────────────────────────────────────── */

export type AccreditationType = 'INSTITUTIONAL' | 'PROGRAM';
export type AccreditationScopeType = 'INSTITUTION' | 'ORGANIZATIONAL_UNIT' | 'PROGRAM';
export type AccreditationStatus =
  'PENDING' | 'IN_REVIEW' | 'GRANTED' | 'CONDITIONAL' | 'RENEWED'
  | 'SUSPENDED' | 'REVOKED' | 'EXPIRED' | 'WITHDRAWN';

export interface ExternalAccreditation {
  id: ID;
  institutionId: ID;
  scopeType: AccreditationScopeType;
  orgUnitId?: ID | null;
  programId?: ID | null;
  authorityId: ID;
  type: AccreditationType;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status: AccreditationStatus;
  criteriaSetId?: ID | null;
  reportRef?: string | null;
  notes?: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
  program?: { id: ID; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
}

export type LicenseKind = 'TECHNICAL_LICENSE' | 'OPERATING_PERMIT' | 'ESTABLISHMENT_DECISION' | 'OTHER';
export type LicenseStatus = 'PENDING' | 'ACTIVE' | 'RENEWED' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export interface OperationalLicense {
  id: ID;
  institutionId: ID;
  authorityId: ID;
  kind: LicenseKind;
  licenseNumber?: string | null;
  scopeType?: AccreditationScopeType | null;
  orgUnitId?: ID | null;
  programId?: ID | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  status: LicenseStatus;
  conditions?: string | null;
  documentRef?: string | null;
  notes?: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
}

export type InspectionKind = 'MINISTRY' | 'REGULATOR' | 'SAFETY' | 'TECHNICAL' | 'OTHER';
export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RegulatoryInspection {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  authorityId: ID;
  kind: InspectionKind;
  scheduledAt?: string | null;
  conductedAt?: string | null;
  status: InspectionStatus;
  summary?: string | null;
  reportRef?: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
}

export type FindingSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';
export type FindingStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_REMEDIATION' | 'RESOLVED' | 'DISPUTED' | 'CLOSED';

export interface ComplianceFinding {
  id: ID;
  institutionId: ID;
  inspectionId?: ID | null;
  externalAccreditationId?: ID | null;
  orgUnitId?: ID | null;
  programId?: ID | null;
  severity: FindingSeverity;
  titleAr: string;
  description?: string | null;
  legalReference?: string | null;
  status: FindingStatus;
  dueDate?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  correctiveActions?: CorrectiveAction[];
}

export type CorrectiveStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';

export interface CorrectiveAction {
  id: ID;
  findingId: ID;
  ownerPersonId?: ID | null;
  planText: string;
  targetDate?: string | null;
  status: CorrectiveStatus;
  completedAt?: string | null;
  verificationRef?: string | null;
}

export type SelfAssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ARCHIVED';

export interface InternalSelfAssessment {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  periodLabel: string;
  criteriaSetId?: ID | null;
  status: SelfAssessmentStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  summary?: string | null;
  criteriaSet?: { id: ID; nameAr: string; version: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
}

/** Evidence ownerType values (contract §9 — evidence attaches to the
 * owning record kinds). */
export type EvidenceOwnerType =
  | 'SELF_ASSESSMENT' | 'ACCREDITATION' | 'LICENSE' | 'INSPECTION'
  | 'FINDING' | 'CORRECTIVE_ACTION' | 'PROGRAM' | 'ORGANIZATIONAL_UNIT' | 'INSTITUTION';

export interface ComplianceEvidence {
  id: ID;
  institutionId: ID;
  ownerType: EvidenceOwnerType;
  ownerId: ID;
  titleAr: string;
  documentRef?: string | null;
  fileUrl?: string | null;
  description?: string | null;
  createdAt: string;
}

/* ── §10 facilities & equipment ─────────────────────────────────── */

export type FacilityType =
  | 'LABORATORY' | 'WORKSHOP' | 'CLASSROOM' | 'PRACTICAL_TRAINING_FACILITY'
  | 'LECTURE_HALL' | 'OTHER';
export type FacilityStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'CLOSED' | 'DECOMMISSIONED';

export interface Facility {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  code?: string | null;
  nameAr: string;
  nameEn?: string | null;
  type: FacilityType;
  status: FacilityStatus;
  building?: string | null;
  room?: string | null;
  capacity?: number | null;
  safetyNotes?: string | null;
  orgUnit?: { id: ID; nameAr: string } | null;
  _count?: { equipment: number };
}

export type EquipmentCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'BROKEN';
export type EquipmentStatus = 'IN_SERVICE' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE' | 'DECOMMISSIONED' | 'LOST';

export interface Equipment {
  id: ID;
  institutionId: ID;
  facilityId?: ID | null;
  orgUnitId?: ID | null;
  code?: string | null;
  nameAr: string;
  nameEn?: string | null;
  category?: string | null;
  serialNumber?: string | null;
  acquiredAt?: string | null;
  value?: number | null;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  responsiblePersonId?: ID | null;
  responsiblePerson?: { id: ID; fullNameAr: string } | null;
  facility?: { id: ID; nameAr: string } | null;
}

export type WorkOrderKind = 'PREVENTIVE' | 'CORRECTIVE' | 'SAFETY_INSPECTION' | 'INSTALLATION' | 'OTHER';
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MaintenanceWorkOrder {
  id: ID;
  institutionId: ID;
  facilityId?: ID | null;
  equipmentId?: ID | null;
  kind: WorkOrderKind;
  titleAr: string;
  description?: string | null;
  scheduledDate?: string | null;
  completedAt?: string | null;
  status: WorkOrderStatus;
  assignedPersonId?: ID | null;
  cost?: number | null;
  assignedPerson?: { id: ID; fullNameAr: string } | null;
  facility?: { id: ID; nameAr: string } | null;
  equipment?: { id: ID; nameAr: string } | null;
}

export type ReservationStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface FacilityReservation {
  id: ID;
  institutionId: ID;
  facilityId: ID;
  orgUnitId?: ID | null;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  facility?: { id: ID; nameAr: string } | null;
}

export type IncidentKind = 'INCIDENT' | 'INSPECTION';
export type IncidentSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface SafetyIncident {
  id: ID;
  institutionId: ID;
  facilityId?: ID | null;
  equipmentId?: ID | null;
  kind: IncidentKind;
  severity?: IncidentSeverity | null;
  titleAr: string;
  description?: string | null;
  occurredAt: string;
  status: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  facility?: { id: ID; nameAr: string } | null;
}

/* ── §11 research ───────────────────────────────────────────────── */

export type ResearchStatus = 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'TERMINATED';
export type ResearchMemberRole =
  | 'PRINCIPAL_INVESTIGATOR' | 'CO_INVESTIGATOR' | 'RESEARCHER'
  | 'RESEARCH_ASSISTANT' | 'COLLABORATOR' | 'TECHNICIAN';

export interface ResearchProject {
  id: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  code?: string | null;
  titleAr: string;
  titleEn?: string | null;
  field?: string | null;
  principalInvestigatorId?: ID | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: ResearchStatus;
  fundingSource?: string | null;
  budget?: number | null;
  ethicsApprovalRef?: string | null;
  approvalRef?: string | null;
  notes?: string | null;
  orgUnit?: { id: ID; nameAr: string } | null;
}

export interface ResearchProjectMember {
  id: ID;
  projectId: ID;
  personId: ID;
  role: ResearchMemberRole;
  allocationPct?: number | null;
  joinedAt: string;
  leftAt?: string | null;
  person?: { id: ID; fullNameAr: string } | null;
}

export interface ResearchProjectDetail extends ResearchProject {
  members: ResearchProjectMember[];
}

export type ResearchOutputType = 'PUBLICATION' | 'PATENT' | 'PROTOTYPE' | 'APPLIED_PRODUCT' | 'TECHNICAL_REPORT';

export interface ResearchOutput {
  id: ID;
  institutionId: ID;
  projectId?: ID | null;
  personId?: ID | null;
  type: ResearchOutputType;
  title: string;
  referenceUrl?: string | null;
  doi?: string | null;
  publishedAt?: string | null;
  notes?: string | null;
  researchPaperId?: ID | null;
  project?: { id: ID; titleAr: string } | null;
}

/* ── §12 scoped roles & permissions ─────────────────────────────── */

export type PlatformRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/** The r352 capability keys (contract §0) the workspace gates on. */
export type InstCapability =
  | 'ORG_STRUCTURE_MANAGE' | 'PEOPLE_MANAGE' | 'APPOINTMENTS_MANAGE'
  | 'COUNCILS_MANAGE' | 'PROGRAMS_MANAGE' | 'CREDENTIALS_MANAGE'
  | 'ACCREDITATION_MANAGE' | 'QUALITY_INTERNAL_MANAGE' | 'FACILITIES_MANAGE'
  | 'RESEARCH_PROJECTS_MANAGE' | 'UNIT_CAPABILITIES_ASSIGN';

export interface MyPermissions {
  role: PlatformRole;
  capabilities: string[];
  roleDefaults: string[];
  membershipRole: PlatformRole | null;
}

/** The hardened scoped-grant row (D5): ONE explicit capability per
 * grant — never a role bundle. The capability is unit-scoped (the
 * subtree of orgUnitId) or institution-wide when orgUnitId is null. */
export interface UnitCapabilityGrant {
  id: ID;
  userId: ID;
  institutionId: ID;
  orgUnitId?: ID | null;
  capability: InstCapability;
  isActive: boolean;
  reason?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  orgUnit?: { id: ID; nameAr: string; type: OrgUnitType } | null;
  user?: { id: ID; email: string; firstName: string; lastName: string } | null;
}
