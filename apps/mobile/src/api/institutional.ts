/**
 * r353 — the institutional API module (web lib/institutional/api.ts
 * parity): one typed function per contract operation. Paths, query
 * params and bodies are byte-faithful to the published contract
 * (API-CONTRACT.md §0–§12 + the r352 route files) — nothing invented,
 * nothing renamed.
 *
 * Transport notes (the mobile reality, deliberately documented):
 *  · The mobile client unwraps `{ data: T }` envelopes by key presence,
 *    so a paginated wire body `{ data: rows, meta }` surfaces as the
 *    ROWS ARRAY — meta rides the consumer's honest full-page guess
 *    (usePagedList's array branch, the app-wide convention).
 *  · Institution scoping is SERVER-side (verified membership); the
 *    client never sends an institutionId except where the contract
 *    itself takes one (the admin unit-capabilities grant surface).
 */
import { get, post, patch } from "./client";
import type { Paginated } from "./types";

/* ── the wire types the screens render (web types.ts, trimmed to the
      fields the mobile surfaces actually paint — relations included
      where a list row or detail reads them) ──────────────────────── */

export type ID = string;

export interface InstitutionProfile {
  id: ID;
  name: string;
  nameEn: string | null;
  slug: string;
  status: string;
  sector: string | null;
  kind?: { id: ID; code: string; nameAr: string } | null;
  ownership: string | null;
  supervisingAuthority?: { id: ID; code: string; nameAr: string } | null;
  establishmentDecisionNumber: string | null;
  establishmentDecisionDate: string | null;
  parentId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: ID;
  institutionId: ID;
  parentId: ID | null;
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: string;
  status: string;
  sortOrder: number;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The tree node the screens consume — the wire's `{ unit, children }`
 *  shape unwrapped HERE (web precedent: the tree labels read
 *  «undefined» until the api seam owned the unwrap). */
export interface OrgUnitTreeNode extends OrgUnit {
  children: OrgUnitTreeNode[];
}

export interface Person {
  id: ID;
  displayName: string;
  staffNumber: string | null;
  category: string;
  status: string;
  primaryOrgUnit?: { id: ID; nameAr: string; type: string } | null;
  platformUser?: { id: ID; email: string; role: string } | null;
  createdAt: string;
}

export interface PersonDetail extends Person {
  appointments?: {
    id: ID;
    position?: { id: ID; titleAr: string; category: string } | null;
    orgUnit?: { id: ID; nameAr: string; type: string } | null;
    startDate: string;
    endDate: string | null;
    status: string;
  }[];
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}

export interface Appointment {
  id: ID;
  person?: { id: ID; displayName: string } | null;
  personId: ID;
  position?: { id: ID; titleAr: string; category: string } | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  startDate: string;
  endDate: string | null;
  status: string;
  decisionRef: string | null;
}

export interface AppointmentDetail extends Appointment {
  person?: { id: ID; displayName: string; staffNumber: string | null } | null;
  position?: { id: ID; titleAr: string; category: string; kind: string } | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  notes: string | null;
}

/** The r352 capability keys (contract §0) — the grants surface and the
 *  Access screen share this ONE vocabulary. */
export type InstCapability =
  | "ORG_STRUCTURE_MANAGE" | "PEOPLE_MANAGE" | "APPOINTMENTS_MANAGE"
  | "COUNCILS_MANAGE" | "PROGRAMS_MANAGE" | "CREDENTIALS_MANAGE"
  | "ACCREDITATION_MANAGE" | "QUALITY_INTERNAL_MANAGE" | "FACILITIES_MANAGE"
  | "RESEARCH_PROJECTS_MANAGE" | "UNIT_CAPABILITIES_ASSIGN";

export interface MyPermissions {
  role: string;
  capabilities: string[];
  roleDefaults: string[];
  membershipRole: string | null;
}

/** The hardened scoped-grant row (D5): ONE explicit capability per
 *  grant — never a role bundle. Unit-scoped (orgUnitId subtree) or
 *  institution-wide when orgUnitId is null. */
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
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  user?: { id: ID; email: string; firstName: string; lastName: string } | null;
}

export interface Council {
  id: ID;
  nameAr: string;
  type: string;
  status: string;
  formedAt: string;
  dissolvedAt: string | null;
  decisionRef: string | null;
  memberCount?: number;
}

export interface CouncilMembership {
  id: ID;
  person?: { id: ID; displayName: string } | null;
  role: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

export interface CouncilDetail extends Council {
  memberships?: CouncilMembership[];
  documents?: { id: ID; titleAr: string; kind: string; createdAt: string }[];
}

export interface CouncilMeeting {
  id: ID;
  councilId: ID;
  seqNumber: number | null;
  scheduledAt: string;
  location: string | null;
  status: string;
  agendaSummary: string | null;
}

export interface MeetingDetail extends CouncilMeeting {
  attendance?: {
    id: ID;
    person?: { id: ID; displayName: string } | null;
    status: string;
    attendeeKind: string;
  }[];
  agendaItems?: { id: ID; orderNo: number; titleAr: string; status: string }[];
  resolutions?: {
    id: ID;
    number: string | null;
    kind: string;
    status: string;
    textAr: string;
    dueDate: string | null;
  }[];
  minutes?: { status: string; contentAr: string | null; approvedAt: string | null; signedAt: string | null } | null;
}

export interface Program {
  id: ID;
  code: string | null;
  nameAr: string;
  kind: string;
  status: string;
  orgUnit?: { id: ID; nameAr: string } | null;
  credentialType?: { id: ID; nameAr: string } | null;
  createdAt: string;
}

export interface ProgramVersion {
  id: ID;
  programId: ID;
  label: string;
  status: string;
  effectiveFrom: string | null;
  approvalRef: string | null;
}

export interface ProgramCourseRow {
  id: ID;
  courseId: ID;
  course?: { id: ID; code: string; name: string } | null;
  termNo: number | null;
  kind: string;
  creditHours: number | null;
}

export interface ProgramDetail extends Program {
  versions?: ProgramVersion[];
}

export interface LearnerProfileRow {
  id: ID;
  displayName: string;
  universityId: string | null;
  category: string;
  status: string;
  programEnrollmentCount?: number;
  createdAt: string;
}

export interface ProgramEnrollment {
  id: ID;
  learnerProfile?: { id: ID; displayName: string } | null;
  program?: { id: ID; nameAr: string } | null;
  status: string;
  enrolledAt: string;
  expectedCompletionAt: string | null;
}

export interface AwardedCredential {
  id: ID;
  learnerProfile?: { id: ID; displayName: string } | null;
  credentialType?: { id: ID; nameAr: string } | null;
  program?: { id: ID; nameAr: string } | null;
  status: string;
  serialNumber: string | null;
  awardedAt: string | null;
  revokedAt: string | null;
}

export interface TrainingPlacement {
  id: ID;
  learnerProfile?: { id: ID; displayName: string } | null;
  hostOrgUnit?: { id: ID; nameAr: string } | null;
  externalHost: string | null;
  supervisor?: { id: ID; displayName: string } | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  evaluationSummary: string | null;
  evaluationScore: number | null;
}

export interface InternalSelfAssessment {
  id: ID;
  periodLabel: string;
  orgUnit?: { id: ID; nameAr: string } | null;
  status: string;
  summary: string | null;
  createdAt: string;
}

export interface ExternalAccreditation {
  id: ID;
  type: string;
  authority?: { id: ID; code: string; nameAr: string } | null;
  scopeType: string;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  decisionNumber: string | null;
}

export interface OperationalLicense {
  id: ID;
  kind: string;
  authority?: { id: ID; code: string; nameAr: string } | null;
  licenseNumber: string | null;
  status: string;
  issuedAt: string | null;
  expiresAt: string | null;
}

export interface RegulatoryInspection {
  id: ID;
  authority?: { id: ID; code: string; nameAr: string } | null;
  kind: string;
  status: string;
  scheduledAt: string | null;
  conductedAt: string | null;
  reportRef: string | null;
  summary: string | null;
}

export interface ComplianceFinding {
  id: ID;
  severity: string;
  titleAr: string;
  status: string;
  dueDate: string | null;
  inspection?: { id: ID; reportRef: string | null } | null;
}

export interface Facility {
  id: ID;
  nameAr: string;
  type: string;
  status: string;
  code: string | null;
  orgUnit?: { id: ID; nameAr: string } | null;
  building: string | null;
  room: string | null;
  capacity: number | null;
  safetyNotes: string | null;
}

export interface Equipment {
  id: ID;
  nameAr: string;
  code: string | null;
  category: string | null;
  facility?: { id: ID; nameAr: string } | null;
  status: string;
  condition: string | null;
  serialNumber: string | null;
}

export interface FacilityReservation {
  id: ID;
  facility?: { id: ID; nameAr: string } | null;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: string;
  orgUnit?: { id: ID; nameAr: string } | null;
}

export interface MaintenanceWorkOrder {
  id: ID;
  titleAr: string;
  kind: string;
  status: string;
  facility?: { id: ID; nameAr: string } | null;
  equipment?: { id: ID; nameAr: string } | null;
  scheduledDate: string | null;
}

export interface ResearchProject {
  id: ID;
  code: string | null;
  titleAr: string;
  field: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  principalInvestigator?: { id: ID; displayName: string } | null;
}

export interface ResearchProjectDetail extends ResearchProject {
  members?: {
    id: ID;
    person?: { id: ID; displayName: string } | null;
    role: string;
    allocationPct: number | null;
  }[];
  fundingSource: string | null;
  budget: number | null;
  ethicsApprovalRef: string | null;
}

export interface ResearchOutput {
  id: ID;
  type: string;
  title: string;
  status?: string | null;
  projectId: ID | null;
  person?: { id: ID; displayName: string } | null;
  publishedAt: string | null;
  doi: string | null;
  referenceUrl: string | null;
}

/* ── §2 institution classification ───────────────────────────────── */

export const institutionalApi = {
  getMyInstitutionProfile: () =>
    get<{ institution: InstitutionProfile }>("/institutions/me/profile"),

  /* ── §3 organizational units ──────────────────────────────────── */

  /** Paginated rows (the transport surfaces the rows array; meta rides
   *  the honest full-page guess). */
  listOrgUnits: (q?: { type?: string; q?: string; parentId?: ID; page?: number; limit?: number }) =>
    get<Paginated<OrgUnit> | OrgUnit[]>("/institutional/org-units", q),

  /** GET /org-units/tree — the WIRE shape is nested { unit, children }
   *  (backend lib/org-tree.ts buildTree); unwrapped HERE so every
   *  consumer reads one shape (the web's live-QA lesson). */
  async getOrgUnitTree(): Promise<OrgUnitTreeNode[]> {
    type WireNode = { unit: OrgUnit; children: WireNode[] };
    const wire = await get<WireNode[]>("/institutional/org-units/tree");
    const unwrap = (nodes: readonly WireNode[]): OrgUnitTreeNode[] =>
      nodes.map(({ unit, children }) => ({ ...unit, children: unwrap(children) }));
    return unwrap(wire);
  },

  getOrgUnit: (id: ID) => get<OrgUnit>(`/institutional/org-units/${id}`),

  /* ── §4 people ────────────────────────────────────────────────── */

  listPeople: (q?: { category?: string; orgUnitId?: ID; q?: string; status?: string; page?: number; limit?: number }) =>
    get<Paginated<Person> | Person[]>("/institutional/people", q),

  getPerson: (id: ID) => get<PersonDetail>(`/institutional/people/${id}`),

  listPersonAppointments: (personId: ID) =>
    get<Appointment[]>(`/institutional/people/${personId}/appointments`),

  /* ── §5 appointments ───────────────────────────────────────────── */

  listAppointments: (q?: { status?: string; personId?: ID; orgUnitId?: ID; positionId?: ID; page?: number; limit?: number }) =>
    get<Paginated<Appointment> | Appointment[]>("/institutional/appointments", q),

  getAppointment: (id: ID) => get<AppointmentDetail>(`/institutional/appointments/${id}`),

  /* ── §6 councils & committees ─────────────────────────────────── */

  listCouncils: (q?: { type?: string; status?: string; page?: number; limit?: number }) =>
    get<Paginated<Council> | Council[]>("/governance/councils", q),

  getCouncil: (id: ID) => get<CouncilDetail>(`/governance/councils/${id}`),

  listMeetings: (councilId: ID) => get<CouncilMeeting[]>(`/governance/councils/${councilId}/meetings`),

  getMeeting: (id: ID) => get<MeetingDetail>(`/governance/meetings/${id}`),

  /* ── §7 programs, learners, enrollments, placements ─────────────── */

  listPrograms: (q?: { kind?: string; status?: string; orgUnitId?: ID; page?: number; limit?: number }) =>
    get<Paginated<Program> | Program[]>("/academic/programs", q),

  getProgram: (id: ID) => get<ProgramDetail>(`/academic/programs/${id}`),

  listLearners: (q?: { category?: string; status?: string; q?: string; orgUnitId?: ID; page?: number; limit?: number }) =>
    get<Paginated<LearnerProfileRow> | LearnerProfileRow[]>("/academic/learners", q),

  listEnrollments: (q?: { programId?: ID; learnerProfileId?: ID; status?: string; page?: number; limit?: number }) =>
    get<Paginated<ProgramEnrollment> | ProgramEnrollment[]>("/academic/program-enrollments", q),

  listPlacements: (q?: { status?: string; studentProfileId?: ID; page?: number; limit?: number }) =>
    get<Paginated<TrainingPlacement> | TrainingPlacement[]>("/academic/training-placements", q),

  /** The evaluation write (the training module's on-site value): score
   *  + summary on the placement record. */
  updatePlacement: (id: ID, input: { status?: string; evaluationSummary?: string; evaluationScore?: number; endsAt?: string }) =>
    patch<TrainingPlacement>(`/academic/training-placements/${id}`, input),

  /* ── §8 credentials ───────────────────────────────────────────── */

  listCredentials: (q?: { learnerProfileId?: ID; credentialTypeId?: ID; page?: number; limit?: number }) =>
    get<Paginated<AwardedCredential> | AwardedCredential[]>("/academic/credentials", q),

  /* ── §9 compliance ────────────────────────────────────────────── */

  listSelfAssessments: (q?: { status?: string; page?: number; limit?: number }) =>
    get<Paginated<InternalSelfAssessment> | InternalSelfAssessment[]>("/compliance/self-assessments", q),

  listAccreditations: (q?: { status?: string; type?: string; page?: number; limit?: number }) =>
    get<Paginated<ExternalAccreditation> | ExternalAccreditation[]>("/compliance/accreditations", q),

  listLicenses: (q?: { status?: string; kind?: string; page?: number; limit?: number }) =>
    get<Paginated<OperationalLicense> | OperationalLicense[]>("/compliance/licenses", q),

  listInspections: (q?: { status?: string; page?: number; limit?: number }) =>
    get<Paginated<RegulatoryInspection> | RegulatoryInspection[]>("/compliance/inspections", q),

  listFindings: (q?: { status?: string; severity?: string; page?: number; limit?: number }) =>
    get<Paginated<ComplianceFinding> | ComplianceFinding[]>("/compliance/findings", q),

  /* ── §10 facilities & equipment ───────────────────────────────── */

  listFacilities: (q?: { type?: string; status?: string; page?: number; limit?: number }) =>
    get<Paginated<Facility> | Facility[]>("/operations/facilities", q),

  getFacility: (id: ID) => get<Facility>(`/operations/facilities/${id}`),

  listEquipment: (q?: { status?: string; facilityId?: ID; page?: number; limit?: number }) =>
    get<Paginated<Equipment> | Equipment[]>("/operations/equipment", q),

  listWorkOrders: (q?: { status?: string; equipmentId?: ID; page?: number; limit?: number }) =>
    get<Paginated<MaintenanceWorkOrder> | MaintenanceWorkOrder[]>("/operations/work-orders", q),

  listReservations: (q?: { facilityId?: ID; status?: string; page?: number; limit?: number }) =>
    get<Paginated<FacilityReservation> | FacilityReservation[]>("/operations/reservations", q),

  /** The reservation write (the facilities module's on-site value). */
  createReservation: (input: { facilityId: ID; purpose: string; startsAt: string; endsAt: string; orgUnitId?: ID }) =>
    post<FacilityReservation>("/operations/reservations", input),

  /* ── §11 research ─────────────────────────────────────────────── */

  listResearchProjects: (q?: { status?: string; page?: number; limit?: number }) =>
    get<Paginated<ResearchProject> | ResearchProject[]>("/research-projects", q),

  getResearchProject: (id: ID) => get<ResearchProjectDetail>(`/research-projects/${id}`),

  listResearchOutputs: (q?: { projectId?: ID; type?: string; page?: number; limit?: number }) =>
    get<Paginated<ResearchOutput> | ResearchOutput[]>("/research-outputs", q),

  /* ── §12 scoped capability grants & permissions ───────────────── */

  getMyPermissions: () => get<MyPermissions>("/me/permissions"),

  getMyUnitCapabilities: () => get<UnitCapabilityGrant[]>("/me/unit-capabilities"),

  listUserUnitCapabilities: (userId: ID, institutionId: ID) =>
    get<UnitCapabilityGrant[]>(`/admin/users/${userId}/unit-capabilities`, { institutionId }),

  grantUnitCapability: (userId: ID, input: { institutionId: ID; orgUnitId?: ID; capability: string; reason?: string }) =>
    post<UnitCapabilityGrant>(`/admin/users/${userId}/unit-capabilities`, input),

  revokeUnitCapability: (grantId: ID) =>
    post<UnitCapabilityGrant>(`/admin/unit-capabilities/${grantId}/revoke`),
};
