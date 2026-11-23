/**
 * r352 FINAL CLOSURE (§3) — the privilege-escalation / tenant-scope
 * belt for the capability-gated governance routes:
 *
 *   GET  /admin/users
 *   GET  /admin/users/:id/permissions
 *   POST /admin/users/:id/permissions
 *   POST /admin/users/:id/role
 *
 * The pinned rule (lib/governance.ts resolveGovernanceCallerContext):
 *   - OWNER is the ONLY role entitled to the platform-wide governance
 *     path (null context BY DEFINITION — the documented platform view).
 *   - EVERY non-OWNER caller must operate under a DB-verified, ACTIVE
 *     institution context: missing → 403 INSTITUTION_CONTEXT_REQUIRED,
 *     revoked/forged/suspended → 403 INSTITUTION_CONTEXT_INVALID.
 *   - A capability grant (institution-scoped or even platform-global)
 *     NEVER widens a non-OWNER caller into the platform-wide path: a
 *     STUDENT/TEACHER holding ROLES_ASSIGN operates strictly inside
 *     their verified institution — their writes land INSTITUTION-SCOPED,
 *     never platform-global; cross-institution targets are refused
 *     (404 on reads — existence never leaks; 403 on writes).
 *
 * The pre-fix defect this belt kills: the routes resolved a context
 * only for ADMIN/QUALITY, so any other capability-holding role fell
 * through to `callerInstitution = null` — the platform-wide/OWNER
 * scope (cross-tenant listing, the full override trail, and even
 * platform-GLOBAL UserPermission writes).
 *
 * Every denial is proven at the HTTP boundary AND against the
 * resulting database rows (a 403 whose row still landed would fail
 * here): rejected writes leave zero rows and zero audit entries.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import {
  bearer,
  db,
  seedInstitution,
  seedMembership,
  seedUser,
  truncateAll,
  unknownCuid,
} from './helpers.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
beforeEach(async () => {
  await truncateAll(db());
});

const api = async (method: string, path: string, auth: Record<string, string>, body?: unknown) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('governance routes — OWNER-only platform-wide scope (the §3 belt)', () => {
  beforeEach(async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();

    // The governance caller set.
    const adminA = await seedUser({ role: Role.ADMIN, firstName: 'مدير أ' });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);
    // QUALITY with the explicitly supported permission configuration:
    // oversight + a platform-global ROLES_ASSIGN grant (the only way
    // QUALITY legally reaches this route — pinned by the r352 belt).
    const qualityA = await seedUser({ role: Role.QUALITY, firstName: 'جودة أ' });
    await seedMembership(qualityA.id, instA.id, Role.QUALITY);
    await db().userPermission.create({
      data: { userId: qualityA.id, capability: 'ROLES_ASSIGN', grant: true, institutionId: null },
    });
    const owner = await seedUser({ role: Role.OWNER, firstName: 'المالك' });

    // A STUDENT and a TEACHER carrying EXPLICIT institution-scoped
    // (A) grants for BOTH governance capabilities this surface uses
    // (USERS_MANAGE for the listing, ROLES_ASSIGN for the override/
    // role/inspection routes) — the exact privilege-escalation probe
    // of this belt: they hold the capabilities, they must still NEVER
    // hold OWNER's platform-wide authority.
    const studentA = await seedUser({ role: Role.STUDENT, firstName: 'طالب منح' });
    await seedMembership(studentA.id, instA.id, Role.STUDENT);
    for (const capability of ['ROLES_ASSIGN', 'USERS_MANAGE'] as const) {
      await db().userPermission.create({
        data: { userId: studentA.id, capability, grant: true, institutionId: instA.id },
      });
    }
    const teacherA = await seedUser({ role: Role.TEACHER, firstName: 'أستاذ منح' });
    await seedMembership(teacherA.id, instA.id, Role.TEACHER);
    for (const capability of ['ROLES_ASSIGN', 'USERS_MANAGE'] as const) {
      await db().userPermission.create({
        data: { userId: teacherA.id, capability, grant: true, institutionId: instA.id },
      });
    }
    // A non-OWNER with PLATFORM-GLOBAL overrides for both capabilities
    // (the rows only OWNER can mint — planted here as the worst legal
    // case): the global overrides satisfy the capability gate even
    // contextlessly, but they must NOT unlock the platform-wide
    // governance path.
    const globalGrantee = await seedUser({ role: Role.STUDENT, firstName: 'منح عام' });
    await seedMembership(globalGrantee.id, instA.id, Role.STUDENT);
    for (const capability of ['ROLES_ASSIGN', 'USERS_MANAGE'] as const) {
      await db().userPermission.create({
        data: { userId: globalGrantee.id, capability, grant: true, institutionId: null },
      });
    }
    // A contextless ADMIN (no membership anywhere) — the REQUIRED probe.
    const homelessAdmin = await seedUser({ role: Role.ADMIN, firstName: 'بلا سياق' });

    // Targets: member-of-A, member-of-B-only, and a member of BOTH.
    const targetA = await seedUser({ role: Role.STUDENT, firstName: 'هدف أ' });
    await seedMembership(targetA.id, instA.id, Role.STUDENT);
    const targetB = await seedUser({ role: Role.STUDENT, firstName: 'هدف ب' });
    await seedMembership(targetB.id, instB.id, Role.STUDENT);
    const targetAB = await seedUser({ role: Role.STUDENT, firstName: 'هدف أب' });
    await seedMembership(targetAB.id, instA.id, Role.STUDENT);
    await seedMembership(targetAB.id, instB.id, Role.STUDENT);

    // A pre-existing B-scoped override on the both-institution target —
    // the row a bounded caller must NEVER see or modify.
    await db().userPermission.create({
      data: { userId: targetAB.id, capability: 'RESEARCH_PUBLISH', grant: true, institutionId: instB.id },
    });

    globalThis.__gov = {
      instA,
      instB,
      adminA,
      adminAAuth: bearer(adminA.id, Role.ADMIN, instA.id),
      qualityAAuth: bearer(qualityA.id, Role.QUALITY, instA.id),
      ownerAuth: bearer(owner.id, Role.OWNER, null),
      studentA,
      studentAAuth: bearer(studentA.id, Role.STUDENT, instA.id),
      studentAContextlessAuth: bearer(studentA.id, Role.STUDENT, null),
      teacherA,
      teacherAAuth: bearer(teacherA.id, Role.TEACHER, instA.id),
      globalGranteeAuth: bearer(globalGrantee.id, Role.STUDENT, instA.id),
      globalGranteeContextlessAuth: bearer(globalGrantee.id, Role.STUDENT, null),
      homelessAdminAuth: bearer(homelessAdmin.id, Role.ADMIN, null),
      adminAForgedAuth: bearer(adminA.id, Role.ADMIN, unknownCuid()),
      targetA,
      targetB,
      targetAB,
    };
  });

  // ── the preserved legitimate paths ────────────────────────────────

  it('ADMIN in A inspects a member of A (the legitimate institutional path)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.contextInstitutionId).toBe(w.instA.id);
  });

  it('ADMIN in A attempting to inspect a member of B → 404 (existence never leaks)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', `/api/v1/admin/users/${w.targetB.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(404);
  });

  it('OWNER performs the documented platform-wide operation (cross-tenant list + global write)', async () => {
    const w = globalThis.__gov as any;
    // The platform-wide LIST sees members of BOTH institutions.
    const list = await api('GET', '/api/v1/admin/users?limit=200', w.ownerAuth);
    expect(list.status).toBe(200);
    const listed = new Set((list.body.data as { id: string }[]).map((u) => u.id));
    expect(listed.has(w.targetA.id)).toBe(true);
    expect(listed.has(w.targetB.id)).toBe(true);
    // The platform-wide INSPECTION reads the full cross-tenant trail.
    const inspect = await api('GET', `/api/v1/admin/users/${w.targetAB.id}/permissions`, w.ownerAuth);
    expect(inspect.status).toBe(200);
    expect(inspect.body.data.contextInstitutionId).toBe(null);
    const caps = (inspect.body.data.overrides as { capability: string }[]).map((o) => o.capability);
    expect(caps).toContain('RESEARCH_PUBLISH'); // the B-scoped row — OWNER sees the full trail
    // The platform-wide WRITE lands the platform-GLOBAL row — the only
    // path in the system that can mint one.
    const globalBefore = await db().userPermission.count({
      where: { userId: w.targetA.id, capability: 'QUALITY_VIEW', institutionId: null },
    });
    const write = await api('POST', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.ownerAuth, {
      capability: 'QUALITY_VIEW',
      grant: true,
      reason: 'منح مالك',
    });
    expect(write.status).toBe(200);
    const globalAfter = await db().userPermission.count({
      where: { userId: w.targetA.id, capability: 'QUALITY_VIEW', institutionId: null },
    });
    expect(globalAfter).toBe(globalBefore + 1);
  });

  it('QUALITY under the explicitly supported configuration (global ROLES_ASSIGN grant)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.qualityAAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.contextInstitutionId).toBe(w.instA.id);
    // Bounded to A: the B-scoped row never surfaces in the listing.
    const scoped = res.body.data.overrides as { capability: string; institutionId: string | null }[];
    expect(scoped.some((o) => o.institutionId === w.instB.id)).toBe(false);
  });

  // ── the escalation probes: capability-holding non-OWNER callers ──

  it('STUDENT with an institution-scoped ROLES_ASSIGN grant: bounded to A — never the platform list', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', '/api/v1/admin/users?limit=200', w.studentAAuth);
    expect(res.status).toBe(200);
    const listed = new Set((res.body.data as { id: string }[]).map((u) => u.id));
    expect(listed.has(w.targetA.id)).toBe(true); // A members are visible (the granted capability works)
    expect(listed.has(w.targetB.id)).toBe(false); // B members NEVER (the pre-fix defect showed them)
  });

  it('STUDENT with an institution-scoped ROLES_ASSIGN grant: inspect scoped + 404 on foreign targets', async () => {
    const w = globalThis.__gov as any;
    const ok = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.studentAAuth);
    expect(ok.status).toBe(200);
    expect(ok.body.data.contextInstitutionId).toBe(w.instA.id); // bounded — never null (the OWNER slice)
    const scoped = ok.body.data.overrides as { capability: string; institutionId: string | null }[];
    expect(scoped.some((o) => o.institutionId === w.instB.id)).toBe(false); // the B row never surfaces
    const foreign = await api('GET', `/api/v1/admin/users/${w.targetB.id}/permissions`, w.studentAAuth);
    expect(foreign.status).toBe(404);
  });

  it('STUDENT with an institution-scoped grant writes INSTITUTION-SCOPED rows only — never a global UserPermission', async () => {
    const w = globalThis.__gov as any;
    const res = await api('POST', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.studentAAuth, {
      capability: 'QUALITY_VIEW',
      grant: true,
      reason: 'منح مبتوت الصلاحيات',
    });
    expect(res.status).toBe(200);
    // The row landed scoped to A — the pre-fix path wrote institutionId NULL
    // (platform-global, effective across every tenant the target touches).
    const row = await db().userPermission.findFirst({
      where: { userId: w.targetA.id, capability: 'QUALITY_VIEW' },
      select: { institutionId: true, grant: true },
    });
    expect(row).not.toBeNull();
    expect(row!.institutionId).toBe(w.instA.id);
    const globalRows = await db().userPermission.count({
      where: { userId: w.targetA.id, capability: 'QUALITY_VIEW', institutionId: null },
    });
    expect(globalRows).toBe(0);
    // Foreign B-scoped rows stay untouched.
    const bRows = await db().userPermission.count({
      where: { userId: w.targetAB.id, institutionId: w.instB.id },
    });
    expect(bRows).toBe(1);
  });

  it('TEACHER with an institution-scoped ROLES_ASSIGN grant: the same bounding (scoped write, never global)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('POST', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.teacherAAuth, {
      capability: 'EXAMS_MODERATE',
      grant: true,
    });
    expect(res.status).toBe(200);
    const row = await db().userPermission.findFirst({
      where: { userId: w.targetA.id, capability: 'EXAMS_MODERATE' },
      select: { institutionId: true },
    });
    expect(row!.institutionId).toBe(w.instA.id);
    const globalRows = await db().userPermission.count({
      where: { userId: w.targetA.id, capability: 'EXAMS_MODERATE', institutionId: null },
    });
    expect(globalRows).toBe(0);
  });

  it('a non-OWNER with a GLOBAL ROLES_ASSIGN override is refused contextless (403 REQUIRED) — the override never unlocks the platform path', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.globalGranteeContextlessAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    const list = await api('GET', '/api/v1/admin/users', w.globalGranteeContextlessAuth);
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('a non-OWNER with a GLOBAL override + selected context is still bounded to their institution', async () => {
    const w = globalThis.__gov as any;
    const list = await api('GET', '/api/v1/admin/users?limit=200', w.globalGranteeAuth);
    expect(list.status).toBe(200);
    const listed = new Set((list.body.data as { id: string }[]).map((u) => u.id));
    expect(listed.has(w.targetB.id)).toBe(false);
    const write = await api('POST', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.globalGranteeAuth, {
      capability: 'QUALITY_VIEW',
      grant: true,
    });
    expect(write.status).toBe(200);
    const row = await db().userPermission.findFirst({
      where: { userId: w.targetA.id, capability: 'QUALITY_VIEW', institutionId: w.instA.id },
      select: { id: true },
    });
    expect(row).not.toBeNull();
  });

  it('a STUDENT holding only institution-scoped grants is capability-refused contextlessly (403), never reaching the route', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', '/api/v1/admin/users', w.studentAContextlessAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('a contextless non-OWNER ADMIN is refused (403 INSTITUTION_CONTEXT_REQUIRED)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', '/api/v1/admin/users', w.homelessAdminAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('a stale institution claim after membership revocation → 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const w = globalThis.__gov as any;
    await db().membership.updateMany({
      where: { userId: w.adminA.id, institutionId: w.instA.id, isActive: true },
      data: { isActive: false },
    });
    const res = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });

  it('a caller whose institution is SUSPENDED → 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const w = globalThis.__gov as any;
    await db().institution.update({ where: { id: w.instA.id }, data: { status: 'SUSPENDED' } });
    const res = await api('GET', `/api/v1/admin/users/${w.targetA.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });

  it('a forged / nonexistent institution id claim → 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const w = globalThis.__gov as any;
    const res = await api('GET', '/api/v1/admin/users', w.adminAForgedAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });

  // ── cross-institution write refusals (HTTP boundary + DB rows) ────

  it('ADMIN of A granting/revoking on a member of B → 403 and ZERO rows/audit entries written', async () => {
    const w = globalThis.__gov as any;
    const grant = await api('POST', `/api/v1/admin/users/${w.targetB.id}/permissions`, w.adminAAuth, {
      capability: 'QUALITY_VIEW',
      grant: true,
    });
    expect(grant.status).toBe(403);
    const rows = await db().userPermission.count({ where: { userId: w.targetB.id } });
    expect(rows).toBe(0);
    const audits = await db().auditLog.count({
      where: { action: 'CAPABILITY_OVERRIDE', resourceId: w.targetB.id },
    });
    expect(audits).toBe(0);
    const revoke = await api('POST', `/api/v1/admin/users/${w.targetB.id}/permissions`, w.adminAAuth, {
      capability: 'QUALITY_VIEW',
      grant: false,
    });
    expect(revoke.status).toBe(403);
    expect(await db().userPermission.count({ where: { userId: w.targetB.id } })).toBe(0);
  });

  it('ADMIN of A changing the ROLE of a member of B → 403 (the cross-institution role change)', async () => {
    const w = globalThis.__gov as any;
    const res = await api('POST', `/api/v1/admin/users/${w.targetB.id}/role`, w.adminAAuth, {
      role: 'TEACHER',
    });
    expect(res.status).toBe(403);
    const row = await db().user.findUnique({ where: { id: w.targetB.id }, select: { role: true } });
    expect(row!.role).toBe('STUDENT'); // untouched
    const audits = await db().auditLog.count({ where: { action: 'ROLE_CHANGE', resourceId: w.targetB.id } });
    expect(audits).toBe(0);
  });

  it('a STUDENT-with-grant changing the role of a foreign-institution member → 403, target untouched', async () => {
    const w = globalThis.__gov as any;
    const res = await api('POST', `/api/v1/admin/users/${w.targetB.id}/role`, w.studentAAuth, {
      role: 'TEACHER',
    });
    expect(res.status).toBe(403);
    const row = await db().user.findUnique({ where: { id: w.targetB.id }, select: { role: true } });
    expect(row!.role).toBe('STUDENT');
  });

  it('self-grant / self-revoke / self-role-change are refused (the governance loop guard)', async () => {
    const w = globalThis.__gov as any;
    const selfGrant = await api('POST', `/api/v1/admin/users/${w.studentA.id}/permissions`, w.studentAAuth, {
      capability: 'USERS_MANAGE',
      grant: true,
    });
    expect(selfGrant.status).toBe(403);
    const selfRole = await api('POST', `/api/v1/admin/users/${w.studentA.id}/role`, w.studentAAuth, {
      role: 'ADMIN',
    });
    expect(selfRole.status).toBe(403);
    // The escalation attempt left nothing new behind — the only
    // USERS_MANAGE row the student owns is the setup's A-scoped grant
    // (never a platform-global one, never a second row).
    const globalRows = await db().userPermission.count({
      where: { userId: w.studentA.id, capability: 'USERS_MANAGE', institutionId: null },
    });
    expect(globalRows).toBe(0);
    const totalRows = await db().userPermission.count({
      where: { userId: w.studentA.id, capability: 'USERS_MANAGE' },
    });
    expect(totalRows).toBe(1);
  });

  it('no foreign UserPermission rows are returned or modified by any bounded caller', async () => {
    const w = globalThis.__gov as any;
    // The B-scoped row planted in setup on the both-institution target.
    const before = await db().userPermission.findMany({
      where: { userId: w.targetAB.id },
      select: { capability: true, institutionId: true, grant: true },
    });
    // Bounded callers (ADMIN A, STUDENT A with grant) listing the target.
    for (const auth of [w.adminAAuth, w.studentAAuth]) {
      const res = await api('GET', `/api/v1/admin/users/${w.targetAB.id}/permissions`, auth);
      expect(res.status).toBe(200);
      const scoped = res.body.data.overrides as { capability: string; institutionId: string | null }[];
      expect(scoped.some((o) => o.institutionId === w.instB.id)).toBe(false);
    }
    // A bounded caller writing on the target touches ONLY the A scope.
    await api('POST', `/api/v1/admin/users/${w.targetAB.id}/permissions`, w.studentAAuth, {
      capability: 'QUALITY_VIEW',
      grant: true,
    });
    const after = await db().userPermission.findMany({
      where: { userId: w.targetAB.id },
      select: { capability: true, institutionId: true, grant: true },
    });
    // The B row survives byte-identically; exactly one A row appeared.
    const bRowBefore = before.filter((r) => r.institutionId === w.instB.id);
    const bRowAfter = after.filter((r) => r.institutionId === w.instB.id);
    expect(bRowAfter).toEqual(bRowBefore);
    expect(after.filter((r) => r.institutionId === w.instA.id)).toHaveLength(1);
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __gov: unknown;
}
