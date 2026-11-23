/**
 * r353 — the institutional API module (web lib/institutional/api.ts
 * parity): one typed function per contract operation. Paths, query
 * params and bodies are byte-faithful to the published contract
 * (API-CONTRACT.md §0–§12) AND audited field-for-field against the
 * REAL route handlers on main (backend/src/http/routes/r352-*.ts —
 * their prisma select/include shapes are the wire's truth).
 *
 * R353-2 §8 (the type audit) — every row below mirrors the route's
 * actual projection, e.g.:
 *  · relation rows carry fullNameAr (never the invented «displayName»);
 *  · councils list carries membershipCount/meetingCount (the _count
 *    projection), not memberCount;
 *  · GET /org-units/:id answers { unit, ancestors };
 *  · GET /people/:id answers the { person, appointments,
 *    unitCapabilityGrants } aggregate;
 *  · GET /meetings/:id answers the FLAT prisma row (minutes rides a
 *    one-to-many include → an ARRAY of ≤1 row, never an object);
 *  · credentials carry conferredAt (no awardedAt on the wire);
 *  · enrollments carry entryDate + learnerProfile/studentProfile.
 *
 * Transport notes:
 *  · R353-2 §4: every LIST rides getPaged — the { data, meta } body
 *    reaches the caller whole, so meta (total/totalPages) survives the
 *    envelope seam and usePagedList can page past the first page.
 *    Non-paginated shapes (bare arrays, { data: null }) normalize to
 *    an honest no-more-pages page.
 *  · Institution scoping is SERVER-side (verified membership); the
 *    client never sends an institutionId except where the contract
 *    itself takes one (the admin unit-capabilities grant surface).
 */
import { get, getPaged, post, patch } from "./client";

/* ── the wire types the screens render (field-for-field from the
      backend route handlers — relations included exactly where a list
      row or detail reads them) ──────────────────────────────────── */

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
  code: string | null;
  nameAr: string;
  nameEn: string | null;
  type: string;
  status: string;
  sortOrder: number | null;
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

/** GET /org-units/:id — the route's real answer (r352-org-units.routes
 *  GET /org-units/:id res.json({ data: { unit, ancestors } })). */
export interface OrgUnitDetail {
  unit: OrgUnit;
  ancestors: OrgUnit[];
}

/* ── §4 people (personSelect + the people/:id aggregate) ────────── */

export interface Person {
  id: ID;
  institutionId: ID;
  userId: ID | null;
  staffNumber: string | null;
  fullNameAr: string;
  fullNameEn: string | null;
  category: string;
  primaryOrgUnitId: ID | null;
  staffStatus: string;
  hiredAt: string | null;
  endedAt: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /people/:id — the { person, appointments, unitCapabilityGrants }
 *  aggregate (appointments are the ACTIVE/SCHEDULED ones, take 20). */
export interface PersonDetail {
  person: Person;
  appointments: {
    id: ID;
    positionId: ID;
    orgUnitId: ID | null;
    startDate: string;
    endDate: string | null;
    status: string;
    acting: boolean;
    position?: { id: ID; code: string; titleAr: string } | null;
  }[];
  unitCapabilityGrants: { id: ID; capability: string; orgUnitId: ID | null; reason: string | null }[];
}

/* ── §5 appointments (appointmentSelect + the list/detail includes) ── */

export interface Appointment {
  id: ID;
  institutionId: ID;
  personId: ID;
  positionId: ID;
  orgUnitId: ID | null;
  appointedByAuthority: string | null;
  decisionNumber: string | null;
  decisionDate: string | null;
  startDate: string;
  endDate: string | null;
  termMonths: number | null;
  status: string;
  acting: boolean;
  supersededById: ID | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** the LIST and DETAIL routes both include these relations. */
  person?: { id: ID; fullNameAr: string; fullNameEn?: string | null; category?: string } | null;
  position?: { id: ID; code: string; titleAr: string; titleEn?: string | null; category?: string } | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
}

/** The detail select widens position with scopeRequirement. */
export interface AppointmentDetail extends Appointment {
  position?: { id: ID; code: string; titleAr: string; titleEn?: string | null; category?: string; scopeRequirement?: string | null } | null;
}

/* ── §6 councils & meetings (the route projections) ─────────────── */

export interface Council {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  code: string | null;
  nameAr: string;
  nameEn: string | null;
  type: string;
  legalBasis: string | null;
  charterRef: string | null;
  establishedAt: string | null;
  dissolvedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  /** the LIST route's _count projection (councils.routes GET /councils). */
  membershipCount?: number;
  meetingCount?: number;
}

export interface CouncilMembership {
  id: ID;
  councilId: ID;
  personId: ID;
  role: string;
  startDate: string;
  endDate: string | null;
  decisionRef: string | null;
  status: string;
  person?: { id: ID; fullNameAr: string; category?: string } | null;
}

/** GET /councils/:id — includes ACTIVE memberships + orgUnit. */
export interface CouncilDetail extends Council {
  memberships: CouncilMembership[];
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
}

export interface CouncilMeeting {
  id: ID;
  councilId: ID;
  seqNumber: number | null;
  scheduledAt: string;
  location: string | null;
  status: string;
  agendaSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /meetings/:id — the route answers the FLAT prisma row with its
 *  one-to-many includes; `minutes` is an ARRAY of ≤1 current row
 *  (Prisma include semantics — never an object on this wire). */
export interface MeetingDetail extends CouncilMeeting {
  attendance?: {
    id: ID;
    meetingId: ID;
    personId: ID;
    status: string;
    attendeeKind?: string | null;
    person?: { id: ID; fullNameAr: string; category?: string } | null;
  }[];
  agendaItems?: { id: ID; meetingId: ID; orderNo: number; titleAr: string; description?: string | null; status: string }[];
  resolutions?: {
    id: ID;
    meetingId: ID;
    agendaItemId: ID | null;
    number: string | null;
    kind: string;
    textAr: string;
    status: string;
    approvedAt: string | null;
    dueDate: string | null;
  }[];
  minutes?: MeetingMinutesRow[];
  documents?: { id: ID; titleAr: string; kind?: string | null; createdAt: string }[];
}

export interface MeetingMinutesRow {
  id: ID;
  meetingId: ID;
  versionNo: number;
  contentAr: string;
  status: string;
  approvedAt: string | null;
  signedAt: string | null;
  isCurrent?: boolean;
}

/* ── §7 programs, learners, enrollments, placements ─────────────── */

export interface Program {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  code: string;
  nameAr: string;
  nameEn: string | null;
  kind: string;
  credentialTypeId: ID | null;
  status: string;
  approvalRef: string | null;
  durationMonths: number | null;
  totalCreditHours: number | null;
  createdAt: string;
  updatedAt: string;
  /** the LIST route includes these relations + counts. */
  credentialType?: { id: ID; code: string; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string; type?: string } | null;
  versionCount?: number;
  enrollmentCount?: number;
}

export interface ProgramVersion {
  id: ID;
  programId: ID;
  label: string;
  effectiveFrom: string | null;
  status: string;
  approvedAt: string | null;
  approvalRef: string | null;
  _count?: { courses: number };
}

export interface ProgramDetail extends Program {
  versions: ProgramVersion[];
}

export interface LearnerProfileRow {
  id: ID;
  institutionId: ID;
  category: string;
  learnerNumber: string;
  fullNameAr: string;
  fullNameEn: string | null;
  nationalId: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  orgUnitId: ID | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  user?: { id: ID; email: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface ProgramEnrollment {
  id: ID;
  studentProfileId: ID;
  programId: ID;
  programVersionId: ID | null;
  learnerProfileId?: ID | null;
  status: string;
  entryDate: string;
  expectedCompletionAt: string | null;
  completionAt: string | null;
  gpa: number | null;
  program?: { id: ID; code: string; nameAr: string; kind?: string } | null;
  programVersion?: { id: ID; label: string; status: string } | null;
  learnerProfile?: { id: ID; learnerNumber: string; fullNameAr: string; category: string } | null;
  studentProfile?: { id: ID; universityId: string | null; learnerCategory?: string | null; user?: { firstName: string; lastName: string } | null } | null;
}

export interface TrainingPlacement {
  id: ID;
  institutionId: ID;
  programEnrollmentId: ID | null;
  studentProfileId: ID;
  learnerProfileId?: ID | null;
  hostOrgUnitId: ID | null;
  externalHost: string | null;
  supervisorPersonId: ID | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  evaluationSummary: string | null;
  evaluationScore: number | null;
  /** the LIST route's includes (learnerProfile + programEnrollment +
   *  hostOrgUnit + supervisorPerson). */
  learnerProfile?: { id: ID; learnerNumber: string; fullNameAr: string; category: string } | null;
  programEnrollment?: { id: ID; programId: ID; status: string } | null;
  hostOrgUnit?: { id: ID; nameAr: string; type: string } | null;
  supervisorPerson?: { id: ID; fullNameAr: string } | null;
}

/* ── §8 credentials (the route's includes) ─────────────────────── */

export interface AwardedCredential {
  id: ID;
  institutionId: ID;
  studentProfileId: ID;
  credentialTypeId: ID;
  programId: ID | null;
  programEnrollmentId: ID | null;
  decisionNumber: string | null;
  decisionDate: string | null;
  conferredAt: string | null;
  serialNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  credentialType?: { id: ID; code: string; nameAr: string; level?: number; grantsProgression?: boolean } | null;
  program?: { id: ID; code: string; nameAr: string } | null;
  learnerProfile?: { id: ID; learnerNumber: string; fullNameAr: string; category: string } | null;
  studentProfile?: { id: ID; universityId: string | null; learnerCategory?: string | null; user?: { firstName: string; lastName: string } | null } | null;
}

/* ── §9 compliance (the routes' includes + count projections) ───── */

export interface InternalSelfAssessment {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  periodLabel: string;
  criteriaSetId: ID | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  summary: string | null;
  criteriaSet?: { id: ID; code: string; version: string; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
}

export interface ExternalAccreditation {
  id: ID;
  institutionId: ID;
  scopeType: string;
  orgUnitId: ID | null;
  programId: ID | null;
  authorityId: ID;
  type: string;
  decisionNumber: string | null;
  decisionDate: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  criteriaSetId: ID | null;
  reportRef: string | null;
  notes: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
  criteriaSet?: { id: ID; code: string; version: string; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
  program?: { id: ID; code: string; nameAr: string } | null;
}

export interface OperationalLicense {
  id: ID;
  institutionId: ID;
  authorityId: ID;
  kind: string;
  licenseNumber: string | null;
  scopeType: string | null;
  orgUnitId: ID | null;
  programId: ID | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  conditions: string | null;
  documentRef: string | null;
  notes: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
}

export interface RegulatoryInspection {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  authorityId: ID;
  kind: string;
  scheduledAt: string | null;
  conductedAt: string | null;
  status: string;
  summary: string | null;
  reportRef: string | null;
  authority?: { id: ID; code: string; nameAr: string } | null;
  orgUnit?: { id: ID; nameAr: string } | null;
  /** the LIST route's _count projection (findingCount). */
  findingCount?: number;
}

export interface ComplianceFinding {
  id: ID;
  institutionId: ID;
  inspectionId: ID | null;
  externalAccreditationId: ID | null;
  orgUnitId: ID | null;
  programId: ID | null;
  severity: string;
  titleAr: string;
  description: string | null;
  legalReference: string | null;
  status: string;
  dueDate: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  inspection?: { id: ID; kind: string; conductedAt: string | null } | null;
  externalAccreditation?: { id: ID; type: string; status: string } | null;
}

/* ── §10 facilities & equipment (the routes' includes) ──────────── */

export interface Facility {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  code: string | null;
  nameAr: string;
  nameEn: string | null;
  type: string;
  status: string;
  building: string | null;
  room: string | null;
  capacity: number | null;
  safetyNotes: string | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  /** the LIST route's _count projections. */
  equipmentCount?: number;
  reservationCount?: number;
}

/** GET /facilities/:id — include: orgUnit + raw prisma _count
 *  ({ equipment, workOrders, incidents }). */
export interface FacilityDetail extends Facility {
  _count?: { equipment: number; workOrders: number; incidents: number };
}

export interface Equipment {
  id: ID;
  institutionId: ID;
  facilityId: ID | null;
  orgUnitId: ID | null;
  code: string | null;
  nameAr: string;
  nameEn: string | null;
  category: string | null;
  serialNumber: string | null;
  acquiredAt: string | null;
  value: number | null;
  condition: string | null;
  status: string;
  responsiblePersonId: ID | null;
  facility?: { id: ID; nameAr: string; type: string } | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  responsiblePerson?: { id: ID; fullNameAr: string } | null;
  /** the LIST route's _count projections. */
  programLinkCount?: number;
  workOrderCount?: number;
}

export interface FacilityReservation {
  id: ID;
  institutionId: ID;
  facilityId: ID;
  orgUnitId: ID | null;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: string;
  facility?: { id: ID; nameAr: string; type: string } | null;
}

export interface MaintenanceWorkOrder {
  id: ID;
  institutionId: ID;
  facilityId: ID | null;
  equipmentId: ID | null;
  kind: string;
  titleAr: string;
  description: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  status: string;
  assignedPersonId: ID | null;
  cost: number | null;
  assignedPerson?: { id: ID; fullNameAr: string } | null;
  facility?: { id: ID; nameAr: string } | null;
  equipment?: { id: ID; nameAr: string; code: string } | null;
}

export interface SafetyIncident {
  id: ID;
  institutionId: ID;
  facilityId: ID | null;
  equipmentId: ID | null;
  kind: string;
  severity: string | null;
  titleAr: string;
  description: string | null;
  occurredAt: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  facility?: { id: ID; nameAr: string } | null;
}

/* ── §11 research (the routes' includes + count projections) ────── */

export interface ResearchProject {
  id: ID;
  institutionId: ID;
  orgUnitId: ID | null;
  code: string | null;
  titleAr: string;
  titleEn: string | null;
  field: string | null;
  principalInvestigatorId: ID | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  fundingSource: string | null;
  budget: number | null;
  ethicsApprovalRef: string | null;
  approvalRef: string | null;
  notes: string | null;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  principalInvestigator?: { id: ID; fullNameAr: string } | null;
  /** the LIST route's _count projections. */
  memberCount?: number;
  outputCount?: number;
}

export interface ResearchProjectDetail extends ResearchProject {
  members: {
    id: ID;
    projectId: ID;
    personId: ID;
    role: string;
    allocationPct: number | null;
    joinedAt: string;
    leftAt: string | null;
    person?: { id: ID; fullNameAr: string } | null;
  }[];
}

export interface ResearchOutput {
  id: ID;
  institutionId: ID;
  projectId: ID | null;
  personId: ID | null;
  type: string;
  title: string;
  referenceUrl: string | null;
  doi: string | null;
  publishedAt: string | null;
  notes: string | null;
  project?: { id: ID; titleAr: string; code: string } | null;
  person?: { id: ID; fullNameAr: string } | null;
}

/* ── §12 scoped capability grants & permissions ─────────────────── */

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
  orgUnitId: ID | null;
  capability: InstCapability;
  isActive: boolean;
  reason: string | null;
  revokedAt: string | null;
  createdAt: string;
  orgUnit?: { id: ID; nameAr: string; type: string } | null;
  user?: { id: ID; email: string; firstName: string; lastName: string } | null;
}

/* ── §2 institution classification ───────────────────────────────── */

export const institutionalApi = {
  getMyInstitutionProfile: () =>
    get<{ institution: InstitutionProfile }>("/institutions/me/profile"),

  /* ── §3 organizational units ──────────────────────────────────── */

  listOrgUnits: (q?: { type?: string; q?: string; parentId?: ID; page?: number; limit?: number }) =>
    getPaged<OrgUnit>("/institutional/org-units", q),

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

  /** GET /org-units/:id — { unit, ancestors } (the route's real answer). */
  getOrgUnit: (id: ID) => get<OrgUnitDetail>(`/institutional/org-units/${id}`),

  /* ── §4 people ────────────────────────────────────────────────── */

  listPeople: (q?: { category?: string; orgUnitId?: ID; q?: string; status?: string; page?: number; limit?: number }) =>
    getPaged<Person>("/institutional/people", q),

  getPerson: (id: ID) => get<PersonDetail>(`/institutional/people/${id}`),

  listPersonAppointments: (personId: ID) =>
    getPaged<Appointment>(`/institutional/people/${personId}/appointments`),

  /* ── §5 appointments ─────────────────────────────────────────── */

  listAppointments: (q?: { status?: string; personId?: ID; orgUnitId?: ID; positionId?: ID; page?: number; limit?: number }) =>
    getPaged<Appointment>("/institutional/appointments", q),

  getAppointment: (id: ID) => get<AppointmentDetail>(`/institutional/appointments/${id}`),

  /* ── §6 councils & committees ─────────────────────────────────── */

  listCouncils: (q?: { type?: string; status?: string; q?: string; page?: number; limit?: number }) =>
    getPaged<Council>("/governance/councils", q),

  getCouncil: (id: ID) => get<CouncilDetail>(`/governance/councils/${id}`),

  listMeetings: (q?: { councilId: ID; status?: string; page?: number; limit?: number }) =>
    getPaged<CouncilMeeting>(`/governance/councils/${q?.councilId}/meetings`, { status: q?.status, page: q?.page, limit: q?.limit }),

  getMeeting: (id: ID) => get<MeetingDetail>(`/governance/meetings/${id}`),

  /* ── §7 programs, learners, enrollments, placements ────────────── */

  listPrograms: (q?: { kind?: string; status?: string; orgUnitId?: ID; q?: string; page?: number; limit?: number }) =>
    getPaged<Program>("/academic/programs", q),

  getProgram: (id: ID) => get<ProgramDetail>(`/academic/programs/${id}`),

  listLearners: (q?: { category?: string; status?: string; q?: string; orgUnitId?: ID; page?: number; limit?: number }) =>
    getPaged<LearnerProfileRow>("/academic/learners", q),

  listEnrollments: (q?: { programId?: ID; learnerProfileId?: ID; studentProfileId?: ID; status?: string; page?: number; limit?: number }) =>
    getPaged<ProgramEnrollment>("/academic/program-enrollments", q),

  listPlacements: (q?: { status?: string; learnerProfileId?: ID; studentProfileId?: ID; page?: number; limit?: number }) =>
    getPaged<TrainingPlacement>("/academic/training-placements", q),

  /** The evaluation write (the training module's on-site value): score
   *  + summary on the placement record (server: endsAt ≥ startsAt,
   *  score 0–100 by schema). */
  updatePlacement: (id: ID, input: { status?: string; evaluationSummary?: string; evaluationScore?: number; endsAt?: string }) =>
    patch<TrainingPlacement>(`/academic/training-placements/${id}`, input),

  /* ── §8 credentials ───────────────────────────────────────────── */

  listCredentials: (q?: { learnerProfileId?: ID; studentProfileId?: ID; credentialTypeId?: ID; status?: string; page?: number; limit?: number }) =>
    getPaged<AwardedCredential>("/academic/credentials", q),

  /* ── §9 compliance ────────────────────────────────────────────── */

  listSelfAssessments: (q?: { status?: string; page?: number; limit?: number }) =>
    getPaged<InternalSelfAssessment>("/compliance/self-assessments", q),

  listAccreditations: (q?: { status?: string; type?: string; page?: number; limit?: number }) =>
    getPaged<ExternalAccreditation>("/compliance/accreditations", q),

  listLicenses: (q?: { status?: string; kind?: string; page?: number; limit?: number }) =>
    getPaged<OperationalLicense>("/compliance/licenses", q),

  listInspections: (q?: { status?: string; page?: number; limit?: number }) =>
    getPaged<RegulatoryInspection>("/compliance/inspections", q),

  listFindings: (q?: { status?: string; severity?: string; page?: number; limit?: number }) =>
    getPaged<ComplianceFinding>("/compliance/findings", q),

  /* ── §10 facilities & equipment ───────────────────────────────── */

  listFacilities: (q?: { type?: string; status?: string; q?: string; page?: number; limit?: number }) =>
    getPaged<Facility>("/operations/facilities", q),

  getFacility: (id: ID) => get<FacilityDetail>(`/operations/facilities/${id}`),

  listEquipment: (q?: { status?: string; facilityId?: ID; q?: string; page?: number; limit?: number }) =>
    getPaged<Equipment>("/operations/equipment", q),

  listWorkOrders: (q?: { status?: string; equipmentId?: ID; page?: number; limit?: number }) =>
    getPaged<MaintenanceWorkOrder>("/operations/work-orders", q),

  listReservations: (q?: { facilityId?: ID; status?: string; page?: number; limit?: number }) =>
    getPaged<FacilityReservation>("/operations/reservations", q),

  listSafetyIncidents: (q?: { status?: string; page?: number; limit?: number }) =>
    getPaged<SafetyIncident>("/operations/safety-incidents", q),

  /** The reservation write (the facilities module's on-site value).
   *  Server: facility must be ACTIVE, endsAt > startsAt, no overlap
   *  with REQUESTED/APPROVED rows (409 RESERVATION_OVERLAP). */
  createReservation: (input: { facilityId: ID; purpose: string; startsAt: string; endsAt: string; orgUnitId?: ID }) =>
    post<FacilityReservation>("/operations/reservations", input),

  /* ── §11 research ─────────────────────────────────────────────── */

  listResearchProjects: (q?: { status?: string; q?: string; page?: number; limit?: number }) =>
    getPaged<ResearchProject>("/research-projects", q),

  getResearchProject: (id: ID) => get<ResearchProjectDetail>(`/research-projects/${id}`),

  listResearchOutputs: (q?: { projectId?: ID; type?: string; q?: string; page?: number; limit?: number }) =>
    getPaged<ResearchOutput>("/research-outputs", q),

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
