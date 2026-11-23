/**
 * r353 — the institutional query hooks (web hooks/institutional/
 * queries.ts parity): one family, the app's own conventions:
 *
 *  · Query keys live under ['inst', …] and are institution-scoped by
 *    appending the scope segment LAST (withScope) so a membership
 *    switch re-keys everything — no stale institution data survives a
 *    context change.
 *  · Mutations invalidate their own family (and 'my-permissions' — a
 *    grant to SELF changes the effective set immediately).
 *  · Toast feedback stays at PAGE call sites; hooks never toast.
 *  · useMyCapabilities is the ONLY write gate (contract §0: the UI
 *    hides/disables what the SERVER's effective set says the caller
 *    lacks — never role-name inference).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstitutionScope, withScope } from "@/hooks/useInstitutionScope";
import { institutionalApi } from "@/api/institutional";
import type {
  ID, MyPermissions, UnitCapabilityGrant, OrgUnitTreeNode, Appointment,
  Council, CouncilMeeting, MeetingDetail, LearnerProfileRow, Program,
  ProgramEnrollment, TrainingPlacement, AwardedCredential,
  InternalSelfAssessment, ExternalAccreditation, OperationalLicense,
  RegulatoryInspection, ComplianceFinding, Facility, Equipment,
  FacilityReservation, MaintenanceWorkOrder, ResearchProject,
  ResearchOutput,
} from "@/api/institutional";

/* ── capabilities & identity (the server's own word) ────────────── */

/** The caller's effective capability set in the CURRENT institution
 *  context — the server merges membership-role defaults, unit-grant
 *  role defaults and explicit grants/revokes (contract §12). The UI
 *  gates WRITE controls on this and NOTHING else. */
export function useMyCapabilities() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "my-permissions"], scope),
    queryFn: () => institutionalApi.getMyPermissions(),
    enabled: scope !== null,
    staleTime: 30_000,
    select: (p: MyPermissions): MyPermissions & { has: (cap: string) => boolean } => ({
      ...p,
      has: (cap: string) => p.capabilities.includes(cap),
    }),
  });
}

export function useMyInstitutionProfile() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "profile"], scope),
    queryFn: () => institutionalApi.getMyInstitutionProfile(),
    enabled: scope !== null,
    staleTime: 60_000,
    select: (r: { institution: Awaited<ReturnType<typeof institutionalApi.getMyInstitutionProfile>>["institution"] }) => r.institution,
  });
}

export function useMyUnitCapabilities() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "my-unit-capabilities"], scope),
    queryFn: () => institutionalApi.getMyUnitCapabilities(),
    enabled: scope !== null,
  });
}

/* ── the generic institution-scoped hooks ───────────────────────── */

function useInstItem<T>(key: readonly unknown[], fetcher: () => Promise<T>, enabled = true) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope([...key] as [...unknown[], string | null], scope),
    queryFn: fetcher,
    enabled: enabled && scope !== null,
  });
}

/* ── §3 organizational units ───────────────────────────────────── */

export function useOrgUnitTree() {
  const scope = useInstitutionScope();
  return useQuery<OrgUnitTreeNode[]>({
    queryKey: withScope(["inst", "org-units", "tree"], scope),
    queryFn: () => institutionalApi.getOrgUnitTree(),
    enabled: scope !== null,
    staleTime: 60_000,
  });
}

export function useOrgUnit(id: ID | null) {
  return useInstItem(["inst", "org-units", "detail", id], () => institutionalApi.getOrgUnit(id!), id !== null);
}

/* ── §4 people ─────────────────────────────────────────────────── */

export function usePeople(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "people", q], scope),
    queryFn: () => institutionalApi.listPeople(q as { q?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listPeople>> | undefined) => prev,
  });
}

export function usePerson(id: ID | null) {
  return useInstItem(["inst", "people", "detail", id], () => institutionalApi.getPerson(id!), id !== null);
}

/* ── §5 appointments ───────────────────────────────────────────── */

export function useAppointments(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "appointments", q], scope),
    queryFn: () => institutionalApi.listAppointments(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listAppointments>> | undefined) => prev,
  });
}

export function useAppointment(id: ID | null) {
  return useInstItem(["inst", "appointments", "detail", id], () => institutionalApi.getAppointment(id!), id !== null);
}

/* ── §6 councils & meetings ────────────────────────────────────── */

export function useCouncils(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "councils", q], scope),
    queryFn: () => institutionalApi.listCouncils(q as { type?: string; status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listCouncils>> | undefined) => prev,
  });
}

export function useCouncil(id: ID | null) {
  return useInstItem(["inst", "councils", "detail", id], () => institutionalApi.getCouncil(id!), id !== null);
}

export function useMeetings(councilId: ID | null) {
  return useInstItem(["inst", "councils", "meetings", councilId], () => institutionalApi.listMeetings(councilId!), councilId !== null);
}

export function useMeeting(id: ID | null) {
  return useInstItem(["inst", "meetings", "detail", id], () => institutionalApi.getMeeting(id!), id !== null);
}

/* ── §7 programs, learners, enrollments, placements ─────────────── */

export function usePrograms(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "programs", q], scope),
    queryFn: () => institutionalApi.listPrograms(q as { kind?: string; status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listPrograms>> | undefined) => prev,
  });
}

export function useProgram(id: ID | null) {
  return useInstItem(["inst", "programs", "detail", id], () => institutionalApi.getProgram(id!), id !== null);
}

export function useLearners(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "learners", q], scope),
    queryFn: () => institutionalApi.listLearners(q as { category?: string; q?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listLearners>> | undefined) => prev,
  });
}

export function useEnrollments(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "enrollments", q], scope),
    queryFn: () => institutionalApi.listEnrollments(q as { programId?: ID; status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listEnrollments>> | undefined) => prev,
  });
}

export function usePlacements(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "placements", q], scope),
    queryFn: () => institutionalApi.listPlacements(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listPlacements>> | undefined) => prev,
  });
}

/** The evaluation write (training module): invalidates the placements
 *  family on success. */
export function useUpdatePlacement() {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  return useMutation({
    mutationFn: (input: { id: ID; status?: string; evaluationSummary?: string; evaluationScore?: number }) =>
      institutionalApi.updatePlacement(input.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withScope(["inst", "placements"], scope) });
    },
  });
}

/* ── §8 credentials ─────────────────────────────────────────────── */

export function useCredentials(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "credentials", q], scope),
    queryFn: () => institutionalApi.listCredentials(q as { learnerProfileId?: ID; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listCredentials>> | undefined) => prev,
  });
}

/* ── §9 compliance ──────────────────────────────────────────────── */

export function useSelfAssessments(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "self-assessments", q], scope),
    queryFn: () => institutionalApi.listSelfAssessments(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listSelfAssessments>> | undefined) => prev,
  });
}

export function useAccreditations(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "accreditations", q], scope),
    queryFn: () => institutionalApi.listAccreditations(q as { status?: string; type?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listAccreditations>> | undefined) => prev,
  });
}

export function useLicenses(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "licenses", q], scope),
    queryFn: () => institutionalApi.listLicenses(q as { status?: string; kind?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listLicenses>> | undefined) => prev,
  });
}

export function useInspections(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "inspections", q], scope),
    queryFn: () => institutionalApi.listInspections(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listInspections>> | undefined) => prev,
  });
}

export function useFindings(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "findings", q], scope),
    queryFn: () => institutionalApi.listFindings(q as { status?: string; severity?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listFindings>> | undefined) => prev,
  });
}

/* ── §10 facilities & equipment ─────────────────────────────────── */

export function useFacilities(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "facilities", q], scope),
    queryFn: () => institutionalApi.listFacilities(q as { type?: string; status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listFacilities>> | undefined) => prev,
  });
}

export function useFacility(id: ID | null) {
  return useInstItem(["inst", "facilities", "detail", id], () => institutionalApi.getFacility(id!), id !== null);
}

export function useEquipment(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "equipment", q], scope),
    queryFn: () => institutionalApi.listEquipment(q as { status?: string; facilityId?: ID; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listEquipment>> | undefined) => prev,
  });
}

export function useReservations(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "reservations", q], scope),
    queryFn: () => institutionalApi.listReservations(q as { facilityId?: ID; status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listReservations>> | undefined) => prev,
  });
}

export function useWorkOrders(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "work-orders", q], scope),
    queryFn: () => institutionalApi.listWorkOrders(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listWorkOrders>> | undefined) => prev,
  });
}

/** The reservation write (facilities module): invalidates the
 *  reservations family on success. */
export function useCreateReservation() {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  return useMutation({
    mutationFn: (input: { facilityId: ID; purpose: string; startsAt: string; endsAt: string }) =>
      institutionalApi.createReservation(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withScope(["inst", "reservations"], scope) });
    },
  });
}

/* ── §11 research ──────────────────────────────────────────────── */

export function useResearchProjects(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "research", q], scope),
    queryFn: () => institutionalApi.listResearchProjects(q as { status?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listResearchProjects>> | undefined) => prev,
  });
}

export function useResearchProject(id: ID | null) {
  return useInstItem(["inst", "research", "detail", id], () => institutionalApi.getResearchProject(id!), id !== null);
}

export function useResearchOutputs(q: Record<string, unknown> = {}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withScope(["inst", "research-outputs", q], scope),
    queryFn: () => institutionalApi.listResearchOutputs(q as { projectId?: ID; type?: string; page?: number; limit?: number }),
    enabled: scope !== null,
    placeholderData: (prev: Awaited<ReturnType<typeof institutionalApi.listResearchOutputs>> | undefined) => prev,
  });
}

/* ── §12 scoped capability grants ───────────────────────────────── */

/** A user's grants in the current institution (admin surface). */
export function useUserUnitCapabilities(userId: ID | null) {
  const scope = useInstitutionScope();
  return useQuery<UnitCapabilityGrant[]>({
    queryKey: withScope(["inst", "user-unit-capabilities", userId], scope),
    queryFn: () => institutionalApi.listUserUnitCapabilities(userId!, scope!),
    enabled: userId !== null && scope !== null,
  });
}

/** Grant ONE capability, scoped to a unit subtree or the whole
 *  institution (orgUnitId null). Invalidates the target's grants AND
 *  my-permissions (a grant to SELF changes the effective set
 *  immediately — the web precedent). */
export function useGrantUnitCapability(userId: ID) {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  return useMutation({
    mutationFn: (input: { orgUnitId?: ID; capability: string; reason?: string }) =>
      institutionalApi.grantUnitCapability(userId, { institutionId: scope!, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withScope(["inst", "user-unit-capabilities"], scope) });
      qc.invalidateQueries({ queryKey: withScope(["inst", "my-permissions"], scope) });
    },
  });
}

export function useRevokeUnitCapability() {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  return useMutation({
    mutationFn: (grantId: ID) => institutionalApi.revokeUnitCapability(grantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withScope(["inst", "user-unit-capabilities"], scope) });
      qc.invalidateQueries({ queryKey: withScope(["inst", "my-permissions"], scope) });
    },
  });
}

/* re-exports the screens' row types (single import surface) */
export type {
  Council, CouncilMeeting, MeetingDetail, Appointment, Program, ProgramEnrollment,
  TrainingPlacement, AwardedCredential, InternalSelfAssessment, ExternalAccreditation,
  OperationalLicense, RegulatoryInspection, ComplianceFinding, Facility, Equipment,
  FacilityReservation, MaintenanceWorkOrder, ResearchProject, ResearchOutput,
  LearnerProfileRow, UnitCapabilityGrant,
};
