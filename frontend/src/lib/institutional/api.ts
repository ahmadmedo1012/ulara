/**
 * r352 — the institutional API client: one typed function per
 * contract operation (API-CONTRACT.md §0–§12). Paths, query params
 * and bodies are byte-faithful to the published contract — nothing
 * invented, nothing renamed.
 *
 * Transport = the app's existing client (lib/api.ts): same `{ data }`
 * envelope unwrap, same Bearer/refresh pipeline, same error shape the
 * pages' mappers already read. Institution scoping is SERVER-side
 * (verified membership) — the client never sends an institutionId
 * except where the contract itself takes one (the admin
 * unit-capabilities surface, where the server verifies it).
 */
import { api, unwrap } from '../api';
import type {
  AcademicTerm, AccreditationStatus, Appointment, AppointmentDetail, AppointmentInput,
  AwardedCredential, AuthorityRow, ClassificationPatch, ComplianceEvidence, ComplianceFinding,
  CorrectiveAction, Council, CouncilDetail, CouncilDocument, CouncilInput, CouncilMeeting,
  CouncilMembership, CriteriaSetRow, CredentialTypeRow, Equipment, ExternalAccreditation, Facility,
  FacilityReservation, ID, InstitutionProfile, InstitutionTypeRow, InternalSelfAssessment,
  MaintenanceWorkOrder, MeetingDetail, MyPermissions, OperationalLicense, OrgUnit,
  OrgUnitDetail, OrgUnitInput, OrgUnitTreeNode, Paged, Person, PersonDetail, PersonInput,
  PositionTemplateRow, Program, ProgramCourseRow, ProgramDetail, ProgramEnrollment,
  ProgramInput, ProgramVersion, RegulatoryInspection, ResearchOutput, ResearchProject,
  ResearchProjectDetail, SafetyIncident, TrainingPlacement, UnitCapabilityGrant,
  LearnerInput, LearnerProfileRow,
} from './types';

/* ── internal helpers (not exported — keep the surface typed) ────── */

type Params = Record<string, unknown>;

async function getList<T>(path: string, params?: Params): Promise<Paged<T>> {
  // Paginated rows arrive as `{ data, meta }` — unwrap keeps the meta.
  const res = await api.get<never>(path, { params });
  return res.data as unknown as Paged<T>;
}

async function getOne<T>(path: string, params?: Params): Promise<T> {
  return unwrap<T>(api.get<never>(path, { params }));
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  return unwrap<T>(api.post<never>(path, body));
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  return unwrap<T>(api.patch<never>(path, body));
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  return unwrap<T>(api.put<never>(path, body));
}

async function del<T>(path: string): Promise<T> {
  return unwrap<T>(api.delete<never>(path));
}

/** Drops undefined/'' params so the wire stays clean. */
export function cleanParams(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

/* ── §1 catalogs (session-level) ────────────────────────────────── */

export const listInstitutionTypes = () => getOne<InstitutionTypeRow[]>('/catalog/institution-types');
export const listAuthorities = () => getOne<AuthorityRow[]>('/catalog/regulatory-authorities');
export const listCredentialTypes = () => getOne<CredentialTypeRow[]>('/catalog/credential-types');
export const listPositionTemplates = () => getOne<PositionTemplateRow[]>('/catalog/position-templates');
export const listCriteriaSets = () => getOne<CriteriaSetRow[]>('/catalog/accreditation-criteria-sets');

/* ── §2 institution classification ──────────────────────────────── */

export const getMyInstitutionProfile = () =>
  getOne<{ institution: InstitutionProfile }>('/institutions/me/profile');

export const updateInstitutionClassification = (id: ID, patchBody: ClassificationPatch) =>
  patch<{ institution: InstitutionProfile }>(`/owner/institutions/${id}/classification`, patchBody);

/* ── §3 organizational units ────────────────────────────────────── */

export type UnitQuery = { type?: string; q?: string; parentId?: ID; page?: number; limit?: number };

export const listOrgUnits = (params: UnitQuery) =>
  getList<OrgUnit>('/institutional/org-units', cleanParams(params));

export const getOrgUnitTree = () =>
  getOne<OrgUnitTreeNode[]>('/institutional/org-units/tree');

export const createOrgUnit = (input: OrgUnitInput) => post<{ unit: OrgUnit }>('/institutional/org-units', input);

export const getOrgUnit = (id: ID) =>
  getOne<OrgUnitDetail>(`/institutional/org-units/${id}`);

export const updateOrgUnit = (id: ID, input: Partial<OrgUnitInput>) =>
  patch<{ unit: OrgUnit }>(`/institutional/org-units/${id}`, input);

export const setOrgUnitStatus = (id: ID, status: string, dissolvedAt?: string) =>
  post<{ unit: OrgUnit }>(`/institutional/org-units/${id}/status`, { status, dissolvedAt });

/* ── §4 people ──────────────────────────────────────────────────── */

export type PeopleQuery = {
  category?: string; orgUnitId?: ID; q?: string; status?: string; page?: number; limit?: number;
};

export const listPeople = (params: PeopleQuery) =>
  getList<Person>('/institutional/people', cleanParams(params));

export const createPerson = (input: PersonInput) => post<Person>('/institutional/people', input);

export const getPerson = (id: ID) => getOne<PersonDetail>(`/institutional/people/${id}`);

export const updatePerson = (id: ID, input: Partial<PersonInput>) =>
  patch<Person>(`/institutional/people/${id}`, input);

export const setPersonStatus = (id: ID, status: string, endedAt?: string) =>
  post<Person>(`/institutional/people/${id}/status`, { status, endedAt });

export const listPersonAppointments = (personId: ID) =>
  getOne<Appointment[]>(`/institutional/people/${personId}/appointments`);

/* ── §5 appointments ────────────────────────────────────────────── */

export type AppointmentQuery = {
  status?: string; personId?: ID; orgUnitId?: ID; positionId?: ID; page?: number; limit?: number;
};

export const listAppointments = (params: AppointmentQuery) =>
  getList<Appointment>('/institutional/appointments', cleanParams(params));

export const createAppointment = (input: AppointmentInput) =>
  post<Appointment>('/institutional/appointments', input);

export const getAppointment = (id: ID) =>
  getOne<AppointmentDetail>(`/institutional/appointments/${id}`);

export const endAppointment = (id: ID, body: { endDate?: string; notes?: string }) =>
  post<Appointment>(`/institutional/appointments/${id}/end`, body);

export const cancelAppointment = (id: ID, notes?: string) =>
  post<Appointment>(`/institutional/appointments/${id}/cancel`, { notes });

/* ── §6 councils & committees ───────────────────────────────────── */

export type CouncilQuery = { type?: string; status?: string; page?: number; limit?: number };

export const listCouncils = (params: CouncilQuery) =>
  getList<Council>('/governance/councils', cleanParams(params));

export const createCouncil = (input: CouncilInput) => post<Council>('/governance/councils', input);

export const getCouncil = (id: ID) => getOne<CouncilDetail>(`/governance/councils/${id}`);

export const updateCouncil = (id: ID, input: Partial<CouncilInput> & { status?: string }) =>
  patch<Council>(`/governance/councils/${id}`, input);

export const addCouncilMember = (councilId: ID, input: {
  personId: ID; role: string; startDate: string; endDate?: string; decisionRef?: string;
}) => post<CouncilMembership>(`/governance/councils/${councilId}/members`, input);

export const endCouncilMembership = (membershipId: ID, body: { endDate?: string; reason?: string }) =>
  post<CouncilMembership>(`/governance/council-memberships/${membershipId}/end`, body);

export const listMeetings = (councilId: ID) =>
  getOne<CouncilMeeting[]>(`/governance/councils/${councilId}/meetings`);

export const createMeeting = (councilId: ID, input: {
  scheduledAt: string; location?: string; seqNumber?: number; agendaSummary?: string;
}) => post<CouncilMeeting>(`/governance/councils/${councilId}/meetings`, input);

export const getMeeting = (id: ID) => getOne<MeetingDetail>(`/governance/meetings/${id}`);

export const updateMeeting = (id: ID, input: { scheduledAt?: string; location?: string; status?: string }) =>
  patch<CouncilMeeting>(`/governance/meetings/${id}`, input);

export const saveAttendance = (meetingId: ID, records: Array<{ personId: ID; status: string; attendeeKind?: 'MEMBER' | 'GUEST' }>) =>
  post<never>(`/governance/meetings/${meetingId}/attendance`, { records });

export const addAgendaItem = (meetingId: ID, input: { orderNo: number; titleAr: string; description?: string }) =>
  post<never>(`/governance/meetings/${meetingId}/agenda-items`, input);

export const updateAgendaItem = (itemId: ID, input: { titleAr?: string; description?: string; status?: string; orderNo?: number }) =>
  patch<never>(`/governance/agenda-items/${itemId}`, input);

export const addResolution = (meetingId: ID, input: {
  agendaItemId?: ID; number?: string; kind: string; textAr: string;
  dueDate?: string; ownerPersonId?: ID;
}) => post<never>(`/governance/meetings/${meetingId}/resolutions`, input);

export const updateResolution = (resolutionId: ID, input: {
  status?: string; approvedAt?: string; completedAt?: string; completionRef?: string;
}) => patch<never>(`/governance/resolutions/${resolutionId}`, input);

export const getMinutes = (meetingId: ID) =>
  getOne<MeetingDetail['minutes']>(`/governance/meetings/${meetingId}/minutes`);

export const saveMinutes = (meetingId: ID, contentAr: string) =>
  put<never>(`/governance/meetings/${meetingId}/minutes`, { contentAr });

export const approveMinutes = (meetingId: ID, approvedByPersonId: ID) =>
  post<never>(`/governance/meetings/${meetingId}/minutes/approve`, { approvedByPersonId });

export const signMinutes = (meetingId: ID, signedByPersonId: ID) =>
  post<never>(`/governance/meetings/${meetingId}/minutes/sign`, { signedByPersonId });

export const addCouncilDocument = (councilId: ID, input: {
  titleAr: string; fileUrl?: string; kind?: string; meetingId?: ID; notes?: string;
}) => post<CouncilDocument>(`/governance/councils/${councilId}/documents`, input);

/* ── §7 programs, terms, enrollments, placements ────────────────── */

export const listTerms = () => getOne<AcademicTerm[]>('/academic/terms');
export const createTerm = (input: { code: string; startsAt: string; endsAt?: string; isCurrent?: boolean }) =>
  post<AcademicTerm>('/academic/terms', input);

export type ProgramQuery = { kind?: string; status?: string; orgUnitId?: ID; page?: number; limit?: number };

/* ── the generalized learner domain (r352 hardening §5) ────────── */

export type LearnerQuery = {
  category?: 'STUDENT' | 'TRAINEE'; status?: string; q?: string; orgUnitId?: ID; page?: number; limit?: number;
};

/** The canonical learner register (account optional — TRAINEE intake
 * works without a platform user; no Faculty/Department required). */
export const listLearners = (params: LearnerQuery) =>
  getList<LearnerProfileRow>('/academic/learners', cleanParams(params));

export const createLearner = (input: LearnerInput) =>
  post<LearnerProfileRow>('/academic/learners', input);

export const listPrograms = (params: ProgramQuery) =>
  getList<Program>('/academic/programs', cleanParams(params));

export const createProgram = (input: ProgramInput) => post<Program>('/academic/programs', input);

export const getProgram = (id: ID) => getOne<ProgramDetail>(`/academic/programs/${id}`);

export const updateProgram = (id: ID, input: Partial<ProgramInput> & { status?: string }) =>
  patch<Program>(`/academic/programs/${id}`, input);

export const createProgramVersion = (programId: ID, input: { label: string; effectiveFrom?: string; approvalRef?: string }) =>
  post<ProgramVersion>(`/academic/programs/${programId}/versions`, input);

export const updateProgramVersion = (versionId: ID, input: { status?: string; effectiveFrom?: string; approvalRef?: string }) =>
  patch<ProgramVersion>(`/academic/program-versions/${versionId}`, input);

export const listVersionCourses = (versionId: ID) =>
  getOne<ProgramCourseRow[]>(`/academic/program-versions/${versionId}/courses`);

export const addVersionCourse = (versionId: ID, input: {
  courseId: ID; termNo?: number; kind: string; creditHours?: number;
}) => post<ProgramCourseRow>(`/academic/program-versions/${versionId}/courses`, input);

export const removeVersionCourse = (versionId: ID, courseId: ID) =>
  del<{ ok: boolean }>(`/academic/program-versions/${versionId}/courses/${courseId}`);

export type EnrollmentQuery = {
  programId?: ID; learnerProfileId?: ID; status?: string; page?: number; limit?: number;
};

export const listEnrollments = (params: EnrollmentQuery) =>
  getList<ProgramEnrollment>('/academic/program-enrollments', cleanParams(params));

export const createEnrollment = (input: {
  learnerProfileId: ID; programId: ID; programVersionId?: ID; expectedCompletionAt?: string;
}) => post<ProgramEnrollment>('/academic/program-enrollments', input);

export const setEnrollmentStatus = (id: ID, status: string, completionAt?: string) =>
  post<ProgramEnrollment>(`/academic/program-enrollments/${id}/status`, { status, completionAt });

export type PlacementQuery = { status?: string; studentProfileId?: ID; page?: number; limit?: number };

export const listPlacements = (params: PlacementQuery) =>
  getList<TrainingPlacement>('/academic/training-placements', cleanParams(params));

export const createPlacement = (input: {
  studentProfileId: ID; programEnrollmentId?: ID; hostOrgUnitId?: ID; externalHost?: string;
  supervisorPersonId?: ID; startsAt: string; endsAt?: string;
}) => post<TrainingPlacement>('/academic/training-placements', input);

export const updatePlacement = (id: ID, input: {
  status?: string; evaluationSummary?: string; evaluationScore?: number; endsAt?: string;
}) => patch<TrainingPlacement>(`/academic/training-placements/${id}`, input);

/* ── §8 credentials ─────────────────────────────────────────────── */

export type CredentialQuery = { learnerProfileId?: ID; credentialTypeId?: ID; page?: number; limit?: number };

export const listCredentials = (params: CredentialQuery) =>
  getList<AwardedCredential>('/academic/credentials', cleanParams(params));

export const awardCredential = (input: {
  learnerProfileId: ID; credentialTypeCode: string; programId?: ID; programEnrollmentId?: ID;
  decisionNumber?: string; decisionDate?: string; conferredAt?: string; serialNumber?: string; notes?: string;
}) => post<AwardedCredential>('/academic/credentials/award', input);

export const revokeCredential = (id: ID, notes?: string) =>
  post<AwardedCredential>(`/academic/credentials/${id}/revoke`, { notes });

/* ── §9 compliance ──────────────────────────────────────────────── */

export type AccreditationQuery = { status?: string; type?: string; page?: number; limit?: number };

export const listAccreditations = (params: AccreditationQuery) =>
  getList<ExternalAccreditation>('/compliance/accreditations', cleanParams(params));

export const createAccreditation = (input: {
  type: string; authorityCode: string; scopeType: string; orgUnitId?: ID; programId?: ID;
  decisionNumber?: string; decisionDate?: string; effectiveFrom?: string; effectiveTo?: string;
  criteriaSetId?: ID; reportRef?: string; notes?: string;
}) => post<ExternalAccreditation>('/compliance/accreditations', input);

export const updateAccreditation = (id: ID, input: { status?: AccreditationStatus; notes?: string }) =>
  patch<ExternalAccreditation>(`/compliance/accreditations/${id}`, input);

export type LicenseQuery = { status?: string; kind?: string; page?: number; limit?: number };

export const listLicenses = (params: LicenseQuery) =>
  getList<OperationalLicense>('/compliance/licenses', cleanParams(params));

export const createLicense = (input: {
  kind: string; authorityCode: string; licenseNumber?: string; scopeType?: string;
  orgUnitId?: ID; programId?: ID; issuedAt?: string; expiresAt?: string;
  conditions?: string; documentRef?: string;
}) => post<OperationalLicense>('/compliance/licenses', input);

export const updateLicense = (id: ID, input: { status?: string; notes?: string }) =>
  patch<OperationalLicense>(`/compliance/licenses/${id}`, input);

export const listInspections = (params: { status?: string; page?: number; limit?: number }) =>
  getList<RegulatoryInspection>('/compliance/inspections', cleanParams(params));

export const createInspection = (input: {
  authorityCode: string; kind: string; orgUnitId?: ID; scheduledAt?: string; reportRef?: string;
}) => post<RegulatoryInspection>('/compliance/inspections', input);

export const updateInspection = (id: ID, input: {
  scheduledAt?: string; conductedAt?: string; status?: string; summary?: string; reportRef?: string;
}) => patch<RegulatoryInspection>(`/compliance/inspections/${id}`, input);

export const listFindings = (params: { status?: string; severity?: string; page?: number; limit?: number }) =>
  getList<ComplianceFinding>('/compliance/findings', cleanParams(params));

export const createFinding = (input: {
  severity: string; titleAr: string; description?: string; inspectionId?: ID;
  externalAccreditationId?: ID; orgUnitId?: ID; programId?: ID; legalReference?: string; dueDate?: string;
}) => post<ComplianceFinding>('/compliance/findings', input);

export const updateFinding = (id: ID, input: { status?: string }) =>
  patch<ComplianceFinding>(`/compliance/findings/${id}`, input);

export const addCorrectiveAction = (findingId: ID, input: {
  planText: string; ownerPersonId?: ID; targetDate?: string;
}) => post<CorrectiveAction>(`/compliance/findings/${findingId}/corrective-actions`, input);

export const updateCorrectiveAction = (id: ID, input: {
  status?: string; completedAt?: string; verificationRef?: string;
}) => patch<CorrectiveAction>(`/compliance/corrective-actions/${id}`, input);

export const listSelfAssessments = (params: { status?: string; page?: number; limit?: number }) =>
  getList<InternalSelfAssessment>('/compliance/self-assessments', cleanParams(params));

export const createSelfAssessment = (input: {
  periodLabel: string; orgUnitId?: ID; criteriaSetId?: ID; summary?: string;
}) => post<InternalSelfAssessment>('/compliance/self-assessments', input);

export const updateSelfAssessment = (id: ID, input: { status?: string; summary?: string }) =>
  patch<InternalSelfAssessment>(`/compliance/self-assessments/${id}`, input);

export const listEvidence = (params: { ownerType?: string; ownerId?: ID; page?: number; limit?: number }) =>
  getList<ComplianceEvidence>('/compliance/evidence', cleanParams(params));

export const createEvidence = (input: {
  ownerType: string; ownerId: ID; titleAr: string; documentRef?: string; fileUrl?: string; description?: string;
}) => post<ComplianceEvidence>('/compliance/evidence', input);

/* ── §10 facilities & equipment ─────────────────────────────────── */

export const listFacilities = (params: { type?: string; status?: string; page?: number; limit?: number }) =>
  getList<Facility>('/operations/facilities', cleanParams(params));

export const createFacility = (input: {
  nameAr: string; nameEn?: string; type: string; code?: string; orgUnitId?: ID;
  building?: string; room?: string; capacity?: number; safetyNotes?: string;
}) => post<Facility>('/operations/facilities', input);

export const getFacility = (id: ID) => getOne<Facility>(`/operations/facilities/${id}`);

export const updateFacility = (id: ID, input: Partial<Facility> & { status?: string }) =>
  patch<Facility>(`/operations/facilities/${id}`, input);

export const listEquipment = (params: { status?: string; facilityId?: ID; page?: number; limit?: number }) =>
  getList<Equipment>('/operations/equipment', cleanParams(params));

export const createEquipment = (input: {
  nameAr: string; nameEn?: string; code?: string; facilityId?: ID; orgUnitId?: ID;
  category?: string; serialNumber?: string; acquiredAt?: string; value?: number;
  condition?: string; status?: string; responsiblePersonId?: ID;
}) => post<Equipment>('/operations/equipment', input);

export const updateEquipment = (id: ID, input: Partial<Equipment>) =>
  patch<Equipment>(`/operations/equipment/${id}`, input);

export const linkEquipmentProgram = (equipmentId: ID, input: { programId: ID; criteriaItemId?: ID }) =>
  post<never>(`/operations/equipment/${equipmentId}/programs`, input);

export const unlinkEquipmentProgram = (equipmentId: ID, programId: ID) =>
  del<{ ok: boolean }>(`/operations/equipment/${equipmentId}/programs/${programId}`);

export const listWorkOrders = (params: { status?: string; equipmentId?: ID; page?: number; limit?: number }) =>
  getList<MaintenanceWorkOrder>('/operations/work-orders', cleanParams(params));

export const createWorkOrder = (input: {
  titleAr: string; kind: string; facilityId?: ID; equipmentId?: ID;
  description?: string; scheduledDate?: string; assignedPersonId?: ID;
}) => post<MaintenanceWorkOrder>('/operations/work-orders', input);

export const updateWorkOrder = (id: ID, input: {
  status?: string; completedAt?: string; cost?: number; notes?: string;
}) => patch<MaintenanceWorkOrder>(`/operations/work-orders/${id}`, input);

export const listReservations = (params: { facilityId?: ID; status?: string; page?: number; limit?: number }) =>
  getList<FacilityReservation>('/operations/reservations', cleanParams(params));

export const createReservation = (input: {
  facilityId: ID; purpose: string; startsAt: string; endsAt: string; orgUnitId?: ID;
}) => post<FacilityReservation>('/operations/reservations', input);

export const updateReservation = (id: ID, input: { status?: string }) =>
  patch<FacilityReservation>(`/operations/reservations/${id}`, input);

export const listSafetyIncidents = (params: { status?: string; page?: number; limit?: number }) =>
  getList<SafetyIncident>('/operations/safety-incidents', cleanParams(params));

export const createSafetyIncident = (input: {
  kind: string; severity?: string; titleAr: string; description?: string;
  facilityId?: ID; equipmentId?: ID; occurredAt: string;
}) => post<SafetyIncident>('/operations/safety-incidents', input);

export const updateSafetyIncident = (id: ID, input: { status?: string; resolutionNotes?: string; resolvedAt?: string }) =>
  patch<SafetyIncident>(`/operations/safety-incidents/${id}`, input);

/* ── §11 research ───────────────────────────────────────────────── */

export const listResearchProjects = (params: { status?: string; page?: number; limit?: number }) =>
  getList<ResearchProject>('/research-projects', cleanParams(params));

export const createResearchProject = (input: {
  titleAr: string; titleEn?: string; code?: string; orgUnitId?: ID; field?: string;
  principalInvestigatorId?: ID; startsAt?: string; endsAt?: string;
  fundingSource?: string; budget?: number; ethicsApprovalRef?: string;
}) => post<ResearchProject>('/research-projects', input);

export const getResearchProject = (id: ID) =>
  getOne<ResearchProjectDetail>(`/research-projects/${id}`);

export const updateResearchProject = (id: ID, input: { status?: string; notes?: string }) =>
  patch<ResearchProject>(`/research-projects/${id}`, input);

export const addResearchMember = (projectId: ID, input: { personId: ID; role: string; allocationPct?: number }) =>
  post<never>(`/research-projects/${projectId}/members`, input);

export const removeResearchMember = (projectId: ID, personId: ID) =>
  del<{ ok: boolean }>(`/research-projects/${projectId}/members/${personId}`);

export const listResearchOutputs = (params: { projectId?: ID; type?: string; page?: number; limit?: number }) =>
  getList<ResearchOutput>('/research-outputs', cleanParams(params));

export const createResearchOutput = (input: {
  type: string; title: string; projectId?: ID; personId?: ID;
  referenceUrl?: string; doi?: string; publishedAt?: string; notes?: string;
}) => post<ResearchOutput>('/research-outputs', input);

/* ── §12 scoped capability grants & permissions (the hardened surface) ── */

export const getMyPermissions = () => getOne<MyPermissions>('/me/permissions');

/** The caller's ACTIVE scoped-capability grants in the current
 * institution (contract §12: single-capability rows — never role
 * bundles; D5). */
export const getMyUnitCapabilities = () =>
  getOne<UnitCapabilityGrant[]>('/me/unit-capabilities');

/** A user's grants in an institution (admin surface; the server
 * ignores the param for non-OWNER and uses the verified context). */
export const listUserUnitCapabilities = (userId: ID, institutionId: ID) =>
  getOne<UnitCapabilityGrant[]>(`/admin/users/${userId}/unit-capabilities`, { institutionId });

/** Grant ONE capability, scoped to a unit subtree or the whole
 * institution (orgUnitId null). The body carries the SESSION's
 * institutionId — the contract-sanctioned admin surface (server-side
 * verification, authority parity enforced). */
export const grantUnitCapability = (userId: ID, input: {
  institutionId: ID; orgUnitId?: ID; capability: string; reason?: string;
}) => post<UnitCapabilityGrant>(`/admin/users/${userId}/unit-capabilities`, input);

export const revokeUnitCapability = (grantId: ID) =>
  post<UnitCapabilityGrant>(`/admin/unit-capabilities/${grantId}/revoke`);
