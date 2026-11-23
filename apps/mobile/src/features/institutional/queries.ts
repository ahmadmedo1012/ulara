/**
 * r353 — the institutional query hooks (web hooks/institutional/
 * queries.ts parity): one family, the app's own conventions:
 *
 *  · Query keys live under ['inst', …] and are institution-scoped by
 *    appending the scope segment LAST (withScope) so a membership
 *    switch re-keys everything.
 *  · R353-2 §5 (the privacy law) — the previous data a query shows
 *    while its NEW key loads is guarded by sameScopePlaceholder: the
 *    previous page is kept ONLY when its own key's scope segment
 *    equals the CURRENT scope. A membership switch therefore shows
 *    the honest loading state, never the previous institution's rows
 *    (placeholderData crosses keys BY DESIGN — the scope segment in
 *    the key does NOT protect against it; only the guard does).
 *  · LIST hooks ride usePagedList + getPaged (R353-2 §4): meta
 *    (total/totalPages) reaches the pager, so lists page past the
 *    first page and totals are the server's word.
 *  · Mutations invalidate the WHOLE ['inst'] family — a grant, an
 *    evaluation or a reservation written while the user switches
 *    institution must never miss its invalidation because a stale
 *    scope was captured in the mutation closure.
 *  · useMyCapabilities is the ONLY write gate (contract §0: the UI
 *    hides/disables what the SERVER's effective set says the caller
 *    lacks — never role-name inference).
 *  · Toast feedback stays at PAGE call sites; hooks never toast.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstitutionScope, withScope } from "@/hooks/useInstitutionScope";
import { usePagedList } from "@/components/ui/data";
import { adminApi, type AdminUserRow } from "@/api/admin";
import { institutionalApi } from "@/api/institutional";
import type {
  ID, MyPermissions, UnitCapabilityGrant, OrgUnitTreeNode, OrgUnitDetail,
  Council, CouncilDetail, CouncilMeeting, MeetingDetail, Appointment, AppointmentDetail,
  LearnerProfileRow, Program, ProgramDetail, ProgramEnrollment, TrainingPlacement,
  AwardedCredential, InternalSelfAssessment, ExternalAccreditation, OperationalLicense,
  RegulatoryInspection, ComplianceFinding, Facility, FacilityDetail, Equipment,
  FacilityReservation, MaintenanceWorkOrder, SafetyIncident, ResearchProject,
  ResearchProjectDetail, ResearchOutput,
} from "@/api/institutional";

/** The list page size the institutional pagers ride (server default
 *  is 20; getNextPageParam follows meta.totalPages — every page is
 *  reachable, nothing is capped at «the first 50»). */
const PAGE_LIMIT = 20;

/* ── §5 the scope guard — ONE exported law, used by every hook below ── */

/**
 * sameScopePlaceholder — keep-previous-data ONLY within the same
 * institution scope. withScope appends the scope segment LAST, so the
 * previous query's LAST key segment IS its scope: when it differs
 * from the current scope the previous data is dropped (undefined →
 * the honest loading state) instead of painting the previous
 * institution's rows under the new context. This is a privacy /
 * data-isolation rule (R353-2 §5), not a cache-performance taste.
 */
export function sameScopePlaceholder<T>(scope: string | null) {
  return (
    prev: T | undefined,
    prevQuery: { queryKey: readonly unknown[] } | undefined,
  ): T | undefined => {
    if (!prevQuery) return undefined;
    const prevScope = prevQuery.queryKey[prevQuery.queryKey.length - 1];
    return prevScope === scope ? prev : undefined;
  };
}

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

/* ── the generic institution-scoped item hook ──────────────────── */

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

export function usePeoplePaged(q: { q?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "people", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listPeople({ q: q.q, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function usePerson(id: ID | null) {
  return useInstItem(["inst", "people", "detail", id], () => institutionalApi.getPerson(id!), id !== null);
}

/* ── §5 appointments ───────────────────────────────────────────── */

export function useAppointmentsPaged(q: { status?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "appointments", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listAppointments({ status: q.status, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useAppointment(id: ID | null) {
  return useInstItem(["inst", "appointments", "detail", id], () => institutionalApi.getAppointment(id!), id !== null);
}

/* ── §6 councils & meetings ────────────────────────────────────── */

export function useCouncilsPaged(q: { status?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "councils", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listCouncils({ status: q.status, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useCouncil(id: ID | null) {
  return useInstItem(["inst", "councils", "detail", id], () => institutionalApi.getCouncil(id!), id !== null);
}

export function useMeetingsPaged(councilId: ID | null) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "councils", "meetings", councilId], scope),
    fetchPage: (page: number) => institutionalApi.listMeetings({ councilId: councilId!, page, limit: PAGE_LIMIT }),
    enabled: councilId !== null && scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useMeeting(id: ID | null) {
  return useInstItem(["inst", "meetings", "detail", id], () => institutionalApi.getMeeting(id!), id !== null);
}

/* ── §7 programs, learners, enrollments, placements ─────────────── */

export function useProgramsPaged(q: { status?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "programs", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listPrograms({ status: q.status, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useProgram(id: ID | null) {
  return useInstItem(["inst", "programs", "detail", id], () => institutionalApi.getProgram(id!), id !== null);
}

export function useLearnersPaged(q: { q?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "learners", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listLearners({ q: q.q, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useEnrollmentsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "enrollments", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listEnrollments({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useCredentialsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "credentials", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listCredentials({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function usePlacementsPaged(q: { status?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "placements", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listPlacements({ status: q.status, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

/** The evaluation write (training module): invalidates the whole
 *  ['inst'] family on success (scope captured at render time must
 *  never strand the invalidation on a stale institution). */
export function useUpdatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: ID; status?: string; evaluationSummary?: string; evaluationScore?: number }) =>
      institutionalApi.updatePlacement(input.id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inst"] });
    },
  });
}

/* ── §9 compliance ──────────────────────────────────────────────── */

export function useSelfAssessmentsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "self-assessments", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listSelfAssessments({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useAccreditationsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "accreditations", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listAccreditations({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useLicensesPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "licenses", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listLicenses({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useInspectionsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "inspections", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listInspections({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useFindingsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "findings", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listFindings({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

/* ── §10 facilities & equipment ─────────────────────────────────── */

export function useFacilitiesPaged(q: { type?: string } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "facilities", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listFacilities({ type: q.type, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useFacility(id: ID | null) {
  return useInstItem(["inst", "facilities", "detail", id], () => institutionalApi.getFacility(id!), id !== null);
}

export function useEquipmentPaged(q: { facilityId?: ID } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "equipment", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listEquipment({ facilityId: q.facilityId, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useReservationsPaged(q: { facilityId?: ID } = {}) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "reservations", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listReservations({ facilityId: q.facilityId, page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useWorkOrdersPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "work-orders", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listWorkOrders({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

export function useSafetyIncidentsPaged() {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "safety-incidents", "list"], scope),
    fetchPage: (page: number) => institutionalApi.listSafetyIncidents({ page, limit: PAGE_LIMIT }),
    enabled: scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

/** The reservation write (facilities module): invalidates the whole
 *  ['inst'] family (see useUpdatePlacement for the scope-capture rule). */
export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { facilityId: ID; purpose: string; startsAt: string; endsAt: string }) =>
      institutionalApi.createReservation(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inst"] });
    },
  });
}

/* ── §11 research ──────────────────────────────────────────────── */

export function useResearchProjectsPaged(q: { status?: string } = {}, enabled = true) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "research", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listResearchProjects({ status: q.status, page, limit: PAGE_LIMIT }),
    enabled: enabled && scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
}

/** `enabled` gates the deep-link kind rule (§7): the research module
 *  is structurally foreign to Law 21/2023 stages 1–2 — the screens
 *  must not fire research reads for a foreign kind, not merely hide
 *  the nav row. */
export function useResearchProject(id: ID | null, enabled = true) {
  return useInstItem(["inst", "research", "detail", id], () => institutionalApi.getResearchProject(id!), id !== null && enabled);
}

export function useResearchOutputsPaged(q: { projectId?: ID } = {}, enabled = true) {
  const scope = useInstitutionScope();
  return usePagedList({
    queryKey: withScope(["inst", "research-outputs", "list", q], scope),
    fetchPage: (page: number) => institutionalApi.listResearchOutputs({ projectId: q.projectId, page, limit: PAGE_LIMIT }),
    enabled: enabled && scope !== null,
    placeholderData: sameScopePlaceholder(scope),
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
      void qc.invalidateQueries({ queryKey: ["inst"] });
    },
  });
}

export function useRevokeUnitCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: ID) => institutionalApi.revokeUnitCapability(grantId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inst"] });
    },
  });
}

/* ── the access screen's user search (§5 — institution-scoped) ──── */

/**
 * The per-user grant management's user search: the platform-wide
 * /admin/users surface the SERVER authorizes. R353-2 §5: the query
 * key carries the institution scope + the guard — a membership switch
 * re-keys the search (results never carry across institutions) and
 * the previous results are dropped while the new scope loads.
 */
export function useUserSearch(appliedQ: string, enabled: boolean) {
  const scope = useInstitutionScope();
  const query = useQuery({
    queryKey: withScope(["inst", "user-search", appliedQ], scope),
    queryFn: async (): Promise<AdminUserRow[]> => {
      const res = await adminApi.users({ q: appliedQ || undefined, limit: 10 });
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: enabled && scope !== null,
    placeholderData: sameScopePlaceholder(scope),
  });
  return { results: query.data ?? [], isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

/* re-exports the screens' row types (single import surface) */
export type {
  Council, CouncilDetail, CouncilMeeting, MeetingDetail, Appointment, AppointmentDetail,
  Program, ProgramDetail, ProgramEnrollment, TrainingPlacement, AwardedCredential,
  InternalSelfAssessment, ExternalAccreditation, OperationalLicense, RegulatoryInspection,
  ComplianceFinding, Facility, FacilityDetail, Equipment, FacilityReservation,
  MaintenanceWorkOrder, SafetyIncident, ResearchProject, ResearchProjectDetail,
  ResearchOutput, LearnerProfileRow, UnitCapabilityGrant, OrgUnitDetail,
};
