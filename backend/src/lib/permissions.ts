import { Capability, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * Default capabilities granted to each role.
 *
 * Important governance rule (per spec):
 *  - ADMIN does NOT auto-inherit teacher-only or quality-only capabilities.
 *  - QUALITY has oversight (read + report + moderation), not admin power.
 *  - TEACHER acts only on their own offerings (own = grade/curriculum scope).
 *
 * r352 — the institutional-operations set is added to ADMIN (structure,
 * people, appointments, councils, programs, credentials, compliance
 * records, facilities, research projects, scoped-grant assignment) and to
 * OWNER (the pinned invariant: OWNER holds the FULL capability set).
 * QUALITY deliberately gains NONE of the r352 capabilities —
 * QUALITY_INTERNAL_MANAGE (internal QA-office writes) is an
 * explicit-grant-only capability so the oversight semantics survive
 * (DECISIONS.md D8).
 *
 * r352 HARDENING (§3.2) — one coherent scoped-authorization model:
 *
 *   effective caps =
 *       DEFAULT_ROLE_CAPABILITIES[membership role]              (layer 1)
 *     ∪ RolePermission rows for that role                        (layer 1)
 *     ∪ UserPermission grants (global + same institution)        (layer 2)
 *     ∪ UnitCapabilityGrant rows (same institution):             (layer 3)
 *         • institution-wide grants (orgUnitId IS NULL) always apply;
 *         • unit-scoped grants apply ONLY when the check targets that
 *           unit or one of its descendants (assertCapabilityForUnit) —
 *           they NEVER authorize institution-wide operations.
 *     − UserPermission revokes (global + same institution) — a revoke
 *       ALWAYS wins over every grant layer (deny precedence).
 *
 * A unit-scoped grant adds EXACTLY ONE capability within its subtree —
 * it can never compose a full role bundle (the pre-hardening
 * UnitRoleGrant defect). Positions, academic ranks, and legal titles
 * never grant anything by themselves; OWNER is a platform identity
 * (User.role) and cannot be granted institutionally. Every
 * UnitCapabilityGrant lookup hits the DB directly — no cache — so
 * revocation is effective on the very next request.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  STUDENT: [
    'EXAMS_TAKE',
  ],
  TEACHER: [
    'RESEARCH_GRADE_OWN',
    'RESEARCH_PUBLISH',
    'EXAMS_AUTHOR',
    'CURRICULUM_EDIT_OWN',
    'ANNOUNCE_FACULTY',
    'COMPETITIONS_RUN',
    'EVENTS_RUN',
  ],
  ADMIN: [
    'USERS_MANAGE',
    'ROLES_ASSIGN',
    'TEACHERS_VERIFY',
    'ANNOUNCE_PLATFORM',
    'ANNOUNCE_FACULTY',
    'COMPETITIONS_RUN',
    'EVENTS_RUN',
    'CURRICULUM_EDIT_ANY',
    'RESEARCH_PUBLISH',
    // r352 — institutional operations (documented widening for the NEW
    // modules only; no existing capability semantics changed).
    'ORG_STRUCTURE_MANAGE',
    'PEOPLE_MANAGE',
    'APPOINTMENTS_MANAGE',
    'COUNCILS_MANAGE',
    'PROGRAMS_MANAGE',
    'CREDENTIALS_MANAGE',
    'ACCREDITATION_MANAGE',
    'FACILITIES_MANAGE',
    'RESEARCH_PROJECTS_MANAGE',
    'UNIT_CAPABILITIES_ASSIGN',
    // r359 A4 — institution-scoped audit trail browsing.
    'AUDIT_BROWSE',
    // NOTE: No RESEARCH_GRADE_OWN/ANY — admins shouldn't grade by default.
    //       No EXAMS_AUTHOR/MODERATE — separate capability grant required.
    //       No QUALITY_VIEW — separate role.
    //       No QUALITY_INTERNAL_MANAGE — explicit grant only (r352).
  ],
  QUALITY: [
    'QUALITY_VIEW',
    'QUALITY_REPORT',
    'EXAMS_MODERATE',
    'ANNOUNCE_FACULTY',
    // r359 A4 — audit browsing is an oversight READ, squarely the
    // quality role's job; writes stay out (unchanged).
    'AUDIT_BROWSE',
    // NOTE: NO USERS_MANAGE, NO ROLES_ASSIGN — quality is oversight, not control.
    //       r352: NO institutional-management capabilities either — the
    //       internal QA-office writes ride the explicit
    //       QUALITY_INTERNAL_MANAGE grant (UserPermission/UnitCapabilityGrant).
  ],
  OWNER: [
    // Platform owner — Master Control Panel role.
    // Holds the full capability set; nothing is implicitly restricted.
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
    // r352 — the full-set invariant extends to the new capabilities.
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
    'AUDIT_BROWSE',
  ],
};

// ─────────────────────────────────────────────────────────────────
// RolePermission DB layer
//
// The `RolePermission` table is the operator-editable extension of
// DEFAULT_ROLE_CAPABILITIES. Until now it was seeded but never read —
// grants added there had zero effect. Effective caps are now:
//
//     effective = (DEFAULT_ROLE_CAPABILITIES[role] ∪ RolePermission rows for role)
//               + UserPermission grants + applicable UnitCapabilityGrant rows
//               − UserPermission revokes
//
// A short in-process cache (global, 30s TTL) avoids one RolePermission
// query per `requireCapability` check. Nothing in the app writes
// RolePermission at runtime (it is changed by operators/seed), so a
// 30s staleness window is acceptable. UnitCapabilityGrant rows are
// NEVER cached — revocation must be immediate.
// ─────────────────────────────────────────────────────────────────
const ROLE_PERMISSION_CACHE_TTL_MS = 30_000;

interface RolePermissionRow {
  role: Role;
  capability: Capability;
}

interface RolePermissionCache {
  rows: RolePermissionRow[];
  fetchedAt: number;
}

let rolePermissionCache: RolePermissionCache | null = null;
let rolePermissionFetch: Promise<RolePermissionRow[]> | null = null;

async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  try {
    return await prisma.rolePermission.findMany({
      select: { role: true, capability: true },
    });
  } catch {
    // Table empty / unreachable (e.g. transient DB blip) → pure fallback.
    return [];
  }
}

async function getRolePermissions(): Promise<RolePermissionRow[]> {
  const now = Date.now();
  if (rolePermissionCache && now - rolePermissionCache.fetchedAt < ROLE_PERMISSION_CACHE_TTL_MS) {
    return rolePermissionCache.rows;
  }
  // Coalesce concurrent misses into one query (no stampede).
  if (!rolePermissionFetch) {
    rolePermissionFetch = fetchRolePermissions().finally(() => {
      rolePermissionFetch = null;
    });
  }
  const rows = await rolePermissionFetch;
  rolePermissionCache = { rows, fetchedAt: Date.now() };
  return rows;
}

/**
 * Pure merge of the capability layers. Exported so the merge semantics
 * are unit-testable without a DB.
 *
 * r352 hardening: `unitGrants` are the capability codes of the
 * caller's ACTIVE UnitCapabilityGrant rows applicable to THIS check —
 * each row contributes exactly one capability (no role bundles).
 * Overrides keep deterministic deny precedence: for each capability,
 * ANY revoke denies; grants land only when no revoke exists (order of
 * rows is irrelevant).
 */
export function mergeCapabilities(
  role: Role,
  dbRoleRows: RolePermissionRow[],
  userOverrides: ReadonlyArray<{ capability: Capability; grant: boolean }>,
  unitGrants: readonly Capability[] = [],
): Set<Capability> {
  const caps = new Set<Capability>();
  for (const c of DEFAULT_ROLE_CAPABILITIES[role]) caps.add(c);
  for (const row of dbRoleRows) {
    if (row.role === role) caps.add(row.capability);
  }
  for (const cap of unitGrants) caps.add(cap);
  const denied = new Set<Capability>();
  const granted = new Set<Capability>();
  for (const o of userOverrides) {
    if (o.grant) granted.add(o.capability);
    else denied.add(o.capability);
  }
  for (const cap of denied) caps.delete(cap); // deny always wins
  for (const cap of granted) {
    if (!denied.has(cap)) caps.add(cap);
  }
  return caps;
}

/** The raw shape of a UserPermission row the merge needs. */
export interface UserPermissionRow {
  capability: Capability;
  grant: boolean;
}

/** Load the caller's applicable UserPermission rows (global + institution). */
async function getUserOverrides(
  userId: string,
  institutionId: string | null,
): Promise<UserPermissionRow[]> {
  const where =
    typeof institutionId === 'string' && institutionId.length > 0
      ? { userId, OR: [{ institutionId: null }, { institutionId }] }
      : { userId, institutionId: null };
  return prisma.userPermission.findMany({
    where,
    select: { capability: true, grant: true },
  });
}

/**
 * r352 hardening: the ancestor chain of an org unit (the unit itself
 * first, then parents up to the root) — the scope a unit-scoped
 * capability grant covers (a faculty-scoped grant covers the faculty's
 * departments). Bounded walk; the DB trigger guarantees no cycles,
 * same-institution parents, and depth ≤ 64.
 */
export async function orgUnitAncestorChain(
  orgUnitId: string,
  maxDepth = 65,
): Promise<string[]> {
  const chain: string[] = [];
  let cur: string | null = orgUnitId;
  for (let i = 0; i < maxDepth && cur !== null; i += 1) {
    chain.push(cur);
    const row: { parentId: string | null } | null = await prisma.organizationalUnit.findUnique({
      where: { id: cur },
      select: { parentId: true },
    });
    cur = row?.parentId ?? null;
  }
  return chain;
}

/**
 * The UnitCapabilityGrant rows of `userId` in `institutionId` that are
 * applicable to a check targeting `orgUnitId`:
 *  - orgUnitId undefined/null → ONLY institution-wide grants (a unit
 *    grant must not authorize institution-wide operations);
 *  - orgUnitId given → institution-wide grants + grants whose unit is
 *    the target or one of its ancestors.
 */
async function applicableUnitGrants(
  userId: string,
  institutionId: string,
  orgUnitId: string | null | undefined,
): Promise<Capability[]> {
  const chain =
    orgUnitId !== undefined && orgUnitId !== null
      ? await orgUnitAncestorChain(orgUnitId)
      : null;
  const grants = await prisma.unitCapabilityGrant.findMany({
    where: { userId, institutionId, isActive: true },
    select: { capability: true, orgUnitId: true },
  });
  return grants
    .filter((g) => (chain === null ? g.orgUnitId === null : g.orgUnitId === null || chain.includes(g.orgUnitId)))
    .map((g) => g.capability);
}

/**
 * Compute the effective capability set for a user.
 *
 * r352 hardening: UnitCapabilityGrant rows merge as SINGLE capabilities
 * scoped by the rules in applicableUnitGrants — never as role bundles.
 */
export async function getEffectiveCapabilities(
  userId: string,
  role: Role,
  institutionId?: string | null,
  orgUnitId?: string | null,
): Promise<Set<Capability>> {
  const inInstitution = typeof institutionId === 'string' && institutionId.length > 0;
  const [dbRoleRows, overrides, unitGrants] = await Promise.all([
    getRolePermissions(),
    getUserOverrides(userId, institutionId ?? null),
    inInstitution
      ? applicableUnitGrants(userId, institutionId, orgUnitId)
      : Promise.resolve([] as Capability[]),
  ]);
  return mergeCapabilities(role, dbRoleRows, overrides, unitGrants);
}

/**
 * r352 hardening: assert a capability FOR A SPECIFIC ORGANIZATIONAL
 * UNIT. Institution-wide UnitCapabilityGrants apply anywhere in the
 * institution; unit-scoped grants apply when their unit is the target
 * or an ancestor of it (a dean's faculty grant covers the faculty's
 * departments — never sibling faculties, never platform-wide ops).
 * UserPermission denies always win. There is NO caching of unit
 * grants: revocation is effective on the next request.
 */
export async function assertCapabilityForUnit(
  userId: string,
  role: Role,
  institutionId: string,
  orgUnitId: string,
  ...required: Capability[]
): Promise<void> {
  const [dbRoleRows, overrides, unitGrants] = await Promise.all([
    getRolePermissions(),
    getUserOverrides(userId, institutionId),
    applicableUnitGrants(userId, institutionId, orgUnitId),
  ]);
  const caps = mergeCapabilities(role, dbRoleRows, overrides, unitGrants);
  for (const r of required) if (caps.has(r)) return;
  throw AppError.forbidden(`صلاحية مفقودة: ${required.join(' أو ')}`);
}

/**
 * r352 hardening: does the caller hold `capability` with authority over
 * `targetOrgUnitId` (institution-wide authority OR a grant whose unit
 * is the target or one of its ancestors)? Used by the grant routes to
 * enforce "a caller must not assign capabilities exceeding their own
 * authority" (§3.2 rule 8). OWNER and membership-baseline holders
 * (role defaults / RolePermission / UserPermission grants) hold every
 * capability institution-wide by definition.
 */
export async function callerAuthorityCoversUnit(
  userId: string,
  role: Role,
  institutionId: string,
  capability: Capability,
  targetOrgUnitId: string | null,
): Promise<boolean> {
  // Baseline (role defaults + RolePermission + UserPermission grants):
  // institution-wide authority when the capability is held at all.
  const [dbRoleRows, overrides] = await Promise.all([
    getRolePermissions(),
    getUserOverrides(userId, institutionId),
  ]);
  const caps = mergeCapabilities(role, dbRoleRows, overrides);
  if (caps.has(capability)) return true;

  // Unit-grant authority: the grant's unit must be the target unit or
  // one of its ancestors (an institution-wide grant row also covers
  // any target — belt for the baseline-miss path).
  const grants = await prisma.unitCapabilityGrant.findMany({
    where: { userId, institutionId, isActive: true, capability },
    select: { orgUnitId: true },
  });
  if (grants.some((g) => g.orgUnitId === null)) return true;
  if (targetOrgUnitId === null) return false; // institution-wide grant requires institution-wide authority
  const chain = await orgUnitAncestorChain(targetOrgUnitId);
  return grants.some((g) => g.orgUnitId !== null && chain.includes(g.orgUnitId));
}

/**
 * Throw unless the user has ANY of the listed capabilities
 * (any-of semantics — possessing one is enough).
 *
 * The thrown message names the missing capabilities: they are part of the
 * operator-facing permissions surface (RolePermission/UserPermission rows,
 * /permissions routes), not internal identifiers.
 *
 * Global-only check (no institution context) — see assertCapabilityIn.
 */
export async function assertCapability(
  userId: string,
  role: Role,
  ...required: Capability[]
): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role);
  for (const r of required) if (caps.has(r)) return;
  throw AppError.forbidden(`صلاحية مفقودة: ${required.join(' أو ')}`);
}

/**
 * r178: assertCapability WITH an institution context. Institution-scoped
 * UserPermission grants (institutionId = the context) AND platform-global
 * grants (institutionId = null) both apply; scoped grants for OTHER
 * institutions are invisible. Variadic caps keep the assertCapability
 * ergonomics — the institution id leads because it scopes the lookup.
 *
 * r352 hardening: ONLY institution-wide UnitCapabilityGrants apply here
 * — a unit-scoped grant must never authorize an institution-wide
 * operation (§3.2 rule 1).
 */
export async function assertCapabilityIn(
  userId: string,
  role: Role,
  institutionId: string | null,
  ...required: Capability[]
): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role, institutionId, null);
  for (const r of required) if (caps.has(r)) return;
  throw AppError.forbidden(`صلاحية مفقودة: ${required.join(' أو ')}`);
}

/**
 * Resource ownership helpers — these return without throwing if access OK.
 *
 * OWNER (platform master) bypasses ownership checks entirely. Any
 * resource-level "you don't own this" guards would otherwise produce
 * sporadic 403s for the platform owner browsing the same pages a teacher
 * or admin can browse without issue.
 */
export async function assertOwnsResearchPaper(paperId: string, userId: string, role: Role): Promise<void> {
  if (role === Role.OWNER) return;
  const caps = await getEffectiveCapabilities(userId, role);
  if (caps.has('RESEARCH_GRADE_ANY')) return;
  if (!caps.has('RESEARCH_GRADE_OWN')) throw AppError.forbidden('لا تملك صلاحية تصحيح الأوراق البحثية');

  const paper = await prisma.researchPaper.findUnique({
    where: { id: paperId },
    select: {
      offeringId: true,
      offering: { select: { teacherId: true } },
    },
  });
  if (!paper) throw AppError.notFound('الورقة البحثية غير موجودة');
  // No offering linked → orphaned paper, only ADMIN with GRADE_ANY can touch
  if (!paper.offering) throw AppError.forbidden('هذه الورقة البحثية غير مرتبطة بأي مقرر');
  if (paper.offering.teacherId !== userId) {
    throw AppError.forbidden('لا تدرّس المقرر المرتبط بهذه الورقة');
  }
}

export async function assertOwnsOffering(offeringId: string, userId: string, role: Role): Promise<void> {
  if (role === Role.OWNER) return;
  const caps = await getEffectiveCapabilities(userId, role);
  if (caps.has('CURRICULUM_EDIT_ANY')) return;
  if (!caps.has('CURRICULUM_EDIT_OWN')) throw AppError.forbidden('لا تملك صلاحية تعديل المحتوى التعليمي');
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: { teacherId: true },
  });
  if (!offering) throw AppError.notFound('المقرر المطلوب غير موجود');
  if (offering.teacherId !== userId) throw AppError.forbidden('أنت لا تدرّس هذا المقرر');
}

/** Facts about one offering + caller, as needed by the access decision. */
interface OfferingAccessFacts {
  /** The offering row exists (a missing row 404s for every non-bypass role). */
  exists: boolean;
  /** The offering is taught by the calling user (teacher path). */
  taughtBy: boolean;
  /** The caller has an enrollment row with status 'active' (student path). */
  activelyEnrolled: boolean;
}

/** Outcome of `decideOfferingAccess` — mapped to AppError by the wrapper. */
type OfferingAccessDecision = 'ok' | 'not_found' | 'forbidden';

/**
 * Pure access decision for a CourseOffering, factored out of
 * `assertOfferingAccess` so the role matrix is unit-testable without a DB.
 *
 * Semantics (mirrors the platform-wide enrollment convention — only
 * `status: 'active'` rows grant content access, never dropped/completed
 * leftovers):
 *   - offering missing → 'not_found' (never leak existence)
 *   - TEACHER → allowed iff they teach the offering
 *   - STUDENT → allowed iff actively enrolled
 *   - QUALITY → allowed (oversight role, read-only)
 *
 * Precondition: ADMIN/OWNER bypass entirely in `assertOfferingAccess`
 * (they are allowed without touching the DB) and never reach this.
 */
export function decideOfferingAccess(role: Role, facts: OfferingAccessFacts): OfferingAccessDecision {
  if (!facts.exists) return 'not_found';
  if (role === Role.TEACHER) return facts.taughtBy ? 'ok' : 'forbidden';
  if (role === Role.STUDENT) return facts.activelyEnrolled ? 'ok' : 'forbidden';
  if (role === Role.QUALITY) return 'ok'; // oversight role — read-only
  return 'forbidden';
}

/**
 * Resource-level read access guard for a CourseOffering.
 *
 * Allowed if ANY of:
 *   - role is ADMIN or OWNER (oversight — bypasses the DB check entirely)
 *   - role is TEACHER and the offering is taught by this user
 *   - role is STUDENT and the user is actively enrolled (status 'active')
 *     in the offering
 *   - role is QUALITY (oversight — read-only)
 *
 * Throws AppError.notFound if the offering doesn't exist (don't leak existence)
 * and AppError.forbidden if the caller has no business reading it.
 *
 * Use this for any endpoint that returns offering content
 * (lectures, materials, assignments, watch-event writes, checkpoint
 * answers, etc.). Without it, any authenticated user can read any
 * course's full content — an IDOR.
 */
export async function assertOfferingAccess(offeringId: string, userId: string, role: Role): Promise<void> {
  if (role === Role.ADMIN || role === Role.OWNER) return;
  // Only teacherId + the caller's ACTIVE enrollment existence feed the
  // decision — fetch exactly that, filtered server-side by status.
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: {
      teacherId: true,
      enrollments: { where: { studentId: userId, status: 'active' }, take: 1, select: { id: true } },
    },
  });
  const decision = decideOfferingAccess(role, {
    exists: offering !== null,
    taughtBy: offering?.teacherId === userId,
    activelyEnrolled: (offering?.enrollments.length ?? 0) > 0,
  });
  if (decision === 'not_found') throw AppError.notFound('المقرر المطلوب غير موجود');
  if (decision === 'forbidden') throw AppError.forbidden('لا تملك صلاحية الوصول إلى هذا المقرر');
}
