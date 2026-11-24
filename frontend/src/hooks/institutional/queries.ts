/**
 * r352 — the institutional query hooks: one family, the same
 * conventions the rest of the app uses (hooks/useInstitutions.ts):
 *
 *  · Query keys live under ['inst', …] and are institution-scoped by
 *    appending the scope segment LAST (withInstitutionScope) so a
 *    context switch re-keys everything and existing prefix
 *    invalidations keep working.
 *  · Catalogs (session-level, not institution-scoped) ride their own
 *    ['inst-catalog', …] family.
 *  · Mutations invalidate only their own family.
 *  · Toast feedback stays at PAGE call sites (context-specific Arabic
 *    copy); hooks never toast.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
import * as instApi from '../../lib/institutional/api';
import type { ID, Paged } from '../../lib/institutional/types';

/* ── the generic institution-scoped list hook ───────────────────── */

/**
 * Paged, institution-scoped list. `path`-based (the api functions are
 * passed whole so the seam stays mockable in tests exactly like the
 * rest of the app's hooks).
 */
function useInstList<T>(
  key: readonly unknown[],
  fetcher: (params: Record<string, unknown>) => Promise<Paged<T>>,
  params: Record<string, unknown> = {},
) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', ...key, params], scope),
    queryFn: () => fetcher(params),
    placeholderData: (prev) => prev,
    enabled: scope !== null,
  });
}

/** Institution-scoped single-record / aggregate fetch. */
function useInstItem<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  enabled = true,
) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', ...key], scope),
    queryFn: fetcher,
    enabled: enabled && scope !== null,
  });
}


/** The standard mutation dispatcher: ONE useMutation whose fn runs
 * the named endpoint then invalidates the family. Builds the stable
 * per-endpoint callers every module uses (bundle diet, r352 — the
 * previous hand-rolled object-of-N-useMutation wrappers are gone).
 *
 * Usage: const m = useInstActions(['councils'], { create: api.createCouncil });
 *        await m.create(input);            // typed (input) => Promise<T>
 */
export function useInstActions<M extends Record<string, (input: never) => Promise<unknown>>>(
  family: readonly unknown[],
  endpoints: M,
  /** Sibling ['inst', ...] families invalidated in the same success
   * transaction (e.g. the capabilities surface also invalidates
   * 'my-permissions' — a grant to SELF changes the effective set
   * immediately and the 30s staleTime would otherwise hide it). */
  extraFamilies: readonly (readonly unknown[])[] = [],
): { [K in keyof M]: (input: Parameters<M[K]>[0]) => Promise<Awaited<ReturnType<M[K]>>> } {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (job: { fn: (input: never) => Promise<unknown>; input: never }) => {
      const out = await job.fn(job.input);
      qc.invalidateQueries({ queryKey: ['inst', ...family] });
      for (const f of extraFamilies) {
        qc.invalidateQueries({ queryKey: ['inst', ...f] });
      }
      return out;
    },
  });
  const mutate = mutation.mutateAsync;
  const bound = useMemo(() => {
    const out: Record<string, (input: never) => Promise<unknown>> = {};
    for (const key of Object.keys(endpoints)) {
      out[key] = (input: never) => mutate({ fn: endpoints[key]!, input });
    }
    return out;
  }, [endpoints, mutate]);
  return bound as { [K in keyof M]: (input: Parameters<M[K]>[0]) => Promise<Awaited<ReturnType<M[K]>>> };
}

/* ── catalogs (session-level, cached long — they are seed data) ──── */

const CATALOG_STALE = 10 * 60_000;

export function useInstitutionTypes() {
  return useQuery({
    queryKey: ['inst-catalog', 'institution-types'],
    queryFn: instApi.listInstitutionTypes,
    staleTime: CATALOG_STALE,
  });
}

export function useAuthorities() {
  return useQuery({
    queryKey: ['inst-catalog', 'authorities'],
    queryFn: instApi.listAuthorities,
    staleTime: CATALOG_STALE,
  });
}

export function useCredentialTypes() {
  return useQuery({
    queryKey: ['inst-catalog', 'credential-types'],
    queryFn: instApi.listCredentialTypes,
    staleTime: CATALOG_STALE,
  });
}

export function usePositionTemplates() {
  return useQuery({
    queryKey: ['inst-catalog', 'position-templates'],
    queryFn: instApi.listPositionTemplates,
    staleTime: CATALOG_STALE,
  });
}

export function useCriteriaSets() {
  return useQuery({
    queryKey: ['inst-catalog', 'criteria-sets'],
    queryFn: instApi.listCriteriaSets,
    staleTime: CATALOG_STALE,
  });
}

/* ── capabilities & identity (the server's own word) ────────────── */

/**
 * The caller's effective capability set in the CURRENT institution
 * context — the server merges membership-role defaults, unit-grant
 * role defaults and explicit grants/revokes (contract §12). The UI
 * gates WRITE controls on this and NOTHING else.
 */
export function useMyCapabilities() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', 'my-permissions'], scope),
    queryFn: instApi.getMyPermissions,
    enabled: scope !== null,
    staleTime: 30_000,
    select: (p) => ({
      ...p,
      has: (cap: string) => p.capabilities.includes(cap),
    }),
  });
}

export function useMyInstitutionProfile() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', 'profile'], scope),
    queryFn: instApi.getMyInstitutionProfile,
    enabled: scope !== null,
    staleTime: 60_000,
    select: (r) => r.institution,
  });
}

export function useMyUnitCapabilities() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', 'my-unit-capabilities'], scope),
    queryFn: instApi.getMyUnitCapabilities,
    enabled: scope !== null,
  });
}

/* ── org units ──────────────────────────────────────────────────── */

export function useOrgUnits(params: Record<string, unknown>) {
  return useInstList(['org-units'], instApi.listOrgUnits, params);
}

export function useOrgUnitTree() {
  return useInstItem(['org-units', 'tree'], instApi.getOrgUnitTree);
}

export function useOrgUnit(id: ID | null) {
  return useInstItem(['org-units', 'detail', id], () => instApi.getOrgUnit(id!), id !== null);
}


/* ── people ─────────────────────────────────────────────────────── */

export function usePeople(params: Record<string, unknown>) {
  return useInstList(['people'], instApi.listPeople, params);
}

export function usePerson(id: ID | null) {
  return useInstItem(['people', 'detail', id], () => instApi.getPerson(id!), id !== null);
}



/* ── appointments ───────────────────────────────────────────────── */

export function useAppointments(params: Record<string, unknown>) {
  return useInstList(['appointments'], instApi.listAppointments, params);
}

/** The standalone appointment record (the detail route): person +
 * position + unit summary relations from the wire. */
export function useAppointment(id: ID | null) {
  return useInstItem(['appointments', 'detail', id], () => instApi.getAppointment(id!), id !== null);
}


/* ── the generalized learner register ───────────────────────────── */

/** The canonical learner register (STUDENT + TRAINEE, account
 * optional — the enrollment/award pickers source from here, not the
 * legacy /admin/students platform-profiles surface). */
export function useLearners(params: Record<string, unknown>) {
  return useInstList(['learners'], instApi.listLearners, params);
}

/* ── councils & meetings ────────────────────────────────────────── */

export function useCouncils(params: Record<string, unknown>) {
  return useInstList(['councils'], instApi.listCouncils, params);
}

export function useCouncil(id: ID | null) {
  return useInstItem(['councils', 'detail', id], () => instApi.getCouncil(id!), id !== null);
}

export function useMeetings(councilId: ID | null) {
  return useInstItem(['councils', 'meetings', councilId], () =>
    instApi.listMeetings(councilId!), councilId !== null);
}

export function useMeeting(id: ID | null) {
  return useInstItem(['meetings', 'detail', id], () => instApi.getMeeting(id!), id !== null);
}



/* ── programs, terms, enrollments, placements ───────────────────── */

export function useTerms() {
  return useInstItem(['terms'], instApi.listTerms);
}

export function usePrograms(params: Record<string, unknown>) {
  return useInstList(['programs'], instApi.listPrograms, params);
}

export function useProgram(id: ID | null) {
  return useInstItem(['programs', 'detail', id], () => instApi.getProgram(id!), id !== null);
}

export function useVersionCourses(versionId: ID | null) {
  return useInstItem(['programs', 'version-courses', versionId], () =>
    instApi.listVersionCourses(versionId!), versionId !== null);
}


export function useEnrollments(params: Record<string, unknown>) {
  return useInstList(['enrollments'], instApi.listEnrollments, params);
}


export function usePlacements(params: Record<string, unknown>) {
  return useInstList(['placements'], instApi.listPlacements, params);
}


/* ── credentials ────────────────────────────────────────────────── */

export function useCredentials(params: Record<string, unknown>) {
  return useInstList(['credentials'], instApi.listCredentials, params);
}


/* ── compliance ─────────────────────────────────────────────────── */

export function useAccreditations(params: Record<string, unknown>) {
  return useInstList(['accreditations'], instApi.listAccreditations, params);
}


export function useLicenses(params: Record<string, unknown>) {
  return useInstList(['licenses'], instApi.listLicenses, params);
}


export function useInspections(params: Record<string, unknown>) {
  return useInstList(['inspections'], instApi.listInspections, params);
}


export function useFindings(params: Record<string, unknown>) {
  return useInstList(['findings'], instApi.listFindings, params);
}


export function useSelfAssessments(params: Record<string, unknown>) {
  return useInstList(['self-assessments'], instApi.listSelfAssessments, params);
}


export function useEvidence(params: Record<string, unknown>) {
  return useInstList(['evidence'], instApi.listEvidence, params);
}


/* ── facilities & equipment ─────────────────────────────────────── */

export function useFacilities(params: Record<string, unknown>) {
  return useInstList(['facilities'], instApi.listFacilities, params);
}

export function useFacility(id: ID | null) {
  return useInstItem(['facilities', 'detail', id], () => instApi.getFacility(id!), id !== null);
}

export function useEquipment(params: Record<string, unknown>) {
  return useInstList(['equipment'], instApi.listEquipment, params);
}

export function useWorkOrders(params: Record<string, unknown>) {
  return useInstList(['work-orders'], instApi.listWorkOrders, params);
}

export function useReservations(params: Record<string, unknown>) {
  return useInstList(['reservations'], instApi.listReservations, params);
}

export function useSafetyIncidents(params: Record<string, unknown>) {
  return useInstList(['safety-incidents'], instApi.listSafetyIncidents, params);
}






/* ── research ───────────────────────────────────────────────────── */

export function useResearchProjects(params: Record<string, unknown>) {
  return useInstList(['research'], instApi.listResearchProjects, params);
}

export function useResearchProject(id: ID | null) {
  return useInstItem(['research', 'detail', id], () => instApi.getResearchProject(id!), id !== null);
}

export function useResearchOutputs(params: Record<string, unknown>) {
  return useInstList(['research-outputs'], instApi.listResearchOutputs, params);
}


/* ── scoped capability grants (admin surface) ───────────────────── */

export function useUserUnitCapabilities(userId: ID | null, institutionId: ID | null) {
  const scope = useInstitutionScope();
  return useQuery({
    // Scope-keyed like every institutional read — a context switch
    // re-keys the admin's view of the target user's grants.
    queryKey: withInstitutionScope(['inst', 'user-unit-capabilities', userId], scope),
    queryFn: () => instApi.listUserUnitCapabilities(userId!, institutionId!),
    enabled: scope !== null && !!userId && !!institutionId,
  });
}

/** Grant/revoke mutations for the admin capabilities surface. Beyond
 * the target user's grant rows, the success transaction invalidates
 * the caller's OWN grants and effective capabilities — a grant to
 * SELF must be visible immediately (the 30s staleTime would otherwise
 * hide it), and revocations change the effective set on the next
 * server resolution. */
export function useUnitCapabilityActions() {
  return useInstActions(
    ['user-unit-capabilities'],
    {
      grant: (i: { userId: string; input: Parameters<typeof instApi.grantUnitCapability>[1] }) =>
        instApi.grantUnitCapability(i.userId, i.input),
      revoke: (i: { id: string }) => instApi.revokeUnitCapability(i.id),
    },
    [['my-unit-capabilities'], ['my-permissions']],
  );
}


/* ── r360 F4 — the audit trail (r359 A4's route) ─────────────────── */

/** GET /institutional/audit-logs — the paged, institution-scoped
 * trail (AUDIT_BROWSE-gated on the server; the 403 rides the page's
 * honest states). Params are the route's own filter contract. */
export function useAuditLogs(params: {
  q?: string; action?: string; entityType?: string; entityId?: string;
  actorId?: string; from?: string; to?: string; page?: number; limit?: number;
}) {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['inst', 'audit-logs', params], scope),
    queryFn: () => instApi.getAuditLogs(params),
    enabled: scope !== null,
    placeholderData: (prev) => prev,
  });
}
