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
 * records, facilities, research projects, unit-role assignment) and to
 * OWNER (the pinned invariant: OWNER holds the FULL capability set).
 * QUALITY deliberately gains NONE of the r352 capabilities —
 * QUALITY_INTERNAL_MANAGE (internal QA-office writes) is an
 * explicit-grant-only capability so the oversight semantics survive
 * (DECISIONS.md D8).
 *
 * Effective capability set =
 *    role-defaults (DEFAULT_ROLE_CAPABILITIES[membership role]
 *                   ∪ defaults of actively unit-granted roles)   — r352
 *  + RolePermission rows for those roles (DB layer, 30s-cached)
 *  + UserPermission grants
 *  − UserPermission revokes — with DETERMINISTIC DENY PRECEDENCE (r352,
 *    DECISIONS.md D6): for a given capability, ANY applicable revoke
 *    denies; grants apply only when no revoke exists. The old row-order
 *    "last write wins" was non-deterministic when a global grant and a
 *    scoped revoke coexisted.
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
    'UNIT_ROLES_ASSIGN',
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
    // NOTE: NO USERS_MANAGE, NO ROLES_ASSIGN — quality is oversight, not control.
    //       r352: NO institutional-management capabilities either — the
    //       internal QA-office writes ride the explicit
    //       QUALITY_INTERNAL_MANAGE grant (UserPermission/UnitRoleGrant).
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
    'UNIT_ROLES_ASSIGN',
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
//               + UserPermission grants
//               − UserPermission revokes
//
// A short in-process cache (global, 30s TTL) avoids one RolePermission
// query per `requireCapability` check. Nothing in the app writes
// RolePermission at runtime (it is changed by operators/seed), so a
// 30s staleness window is acceptable.
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
 * r352 (DECISIONS.md D5/D6): `unitGrantRoles` are the roles of the
 * caller's ACTIVE UnitRoleGrant rows considered for this check — their
 * defaults and RolePermission rows merge into the base set. Overrides
 * are applied with deterministic deny precedence: for each capability,
 * ANY revoke denies; grants land only when no revoke exists (order of
 * rows is irrelevant — the pre-r352 "last write wins" was
 * non-deterministic under mixed global/scoped rows).
 */
export function mergeCapabilities(
  role: Role,
  dbRoleRows: RolePermissionRow[],
  userOverrides: ReadonlyArray<{ capability: Capability; grant: boolean }>,
  unitGrantRoles: readonly Role[] = [],
): Set<Capability> {
  const grantRoles = new Set<Role>([role, ...unitGrantRoles]);
  const caps = new Set<Capability>();
  for (const r of grantRoles) {
    for (const c of DEFAULT_ROLE_CAPABILITIES[r]) caps.add(c);
  }
  for (const row of dbRoleRows) {
    if (grantRoles.has(row.role)) caps.add(row.capability);
  }
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

/** Interface of the unit-grant rows the effective-set computation needs. */
export interface UnitGrantRow {
  role: Role;
  orgUnitId: string | null;
}

/**
 * Compute the effective capability set for a user.
 *
 * r352: ACTIVE UnitRoleGrant rows for the caller in the institution are
 * part of the base set. Institution-wide grants (orgUnitId = null) merge
 * unconditionally; unit-scoped grants merge ONLY when `orgUnitId` is
 * supplied and the grant's unit is the target unit or one of its
 * ancestors (see assertCapabilityForUnit).
 */
export async function getEffectiveCapabilities(
  userId: string,
  role: Role,
  institutionId?: string | null,
  orgUnitId?: string | null,
): Promise<Set<Capability>> {
  const overridesWhere =
    typeof institutionId === 'string' && institutionId.length > 0
      ? { userId, OR: [{ institutionId: null }, { institutionId }] }
      : { userId, institutionId: null };
  const inInstitution = typeof institutionId === 'string' && institutionId.length > 0;
  const [dbRoleRows, overrides, unitGrants] = await Promise.all([
    getRolePermissions(),
    prisma.userPermission.findMany({
      where: overridesWhere,
      select: { capability: true, grant: true },
    }),
    inInstitution
      ? prisma.unitRoleGrant.findMany({
          where: { userId, institutionId, isActive: true },
          select: { role: true, orgUnitId: true },
        })
      : Promise.resolve([] as UnitGrantRow[]),
  ]);
  const applicable = unitGrants.filter(
    (g) => g.orgUnitId === null || (orgUnitId !== undefined && orgUnitId !== null && g.orgUnitId === orgUnitId),
  );
  return mergeCapabilities(
    role,
    dbRoleRows,
    overrides,
    applicable.map((g) => g.role),
  );
}

/**
 * r352: the ancestor chain of an org unit (the unit itself first, then
 * parents up to the root) — used to let a faculty-scoped grant cover the
 * faculty's departments. Bounded walk; the DB trigger guarantees no
 * cycles and same-institution parents.
 */
export async function orgUnitAncestorChain(
  orgUnitId: string,
  maxDepth = 32,
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
 * r352: assert a capability FOR A SPECIFIC ORGANIZATIONAL UNIT — an
 * institution-wide UnitRoleGrant applies anywhere in the institution;
 * a unit-scoped grant applies when its unit is the target or an
 * ancestor of it (a dean's faculty grant covers the faculty's
 * departments). UserPermission denies always win.
 */
export async function assertCapabilityForUnit(
  userId: string,
  role: Role,
  institutionId: string,
  orgUnitId: string,
  ...required: Capability[]
): Promise<void> {
  const chain = await orgUnitAncestorChain(orgUnitId);
  const [dbRoleRows, overrides, unitGrants] = await Promise.all([
    getRolePermissions(),
    prisma.userPermission.findMany({
      where: { userId, OR: [{ institutionId: null }, { institutionId }] },
      select: { capability: true, grant: true },
    }),
    prisma.unitRoleGrant.findMany({
      where: { userId, institutionId, isActive: true, orgUnitId: { in: chain } },
      select: { role: true },
    }),
  ]);
  const caps = mergeCapabilities(
    role,
    dbRoleRows,
    overrides,
    unitGrants.map((g) => g.role),
  );
  for (const r of required) if (caps.has(r)) return;
  throw AppError.forbidden(`صلاحية مفقودة: ${required.join(' أو ')}`);
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
 */
export async function assertCapabilityIn(
  userId: string,
  role: Role,
  institutionId: string | null,
  ...required: Capability[]
): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role, institutionId);
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

