/**
 * r352 DB integration — unit-scoped role grants (scoped capability
 * enforcement incl. ancestor coverage + deny precedence end-to-end)
 * and the institution classification surface.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';
import { ensureR352Catalogs } from '../../prisma/seed-r352-catalogs.js';

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
  await ensureR352Catalogs(db());
});

const api = async (method: string, path: string, body: unknown, auth: Record<string, string>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('r352 unit-scoped role grants', () => {
  it('a unit-scoped ADMIN grant (e.g. a faculty deputy) manages that subtree only', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
    // The teacher: STUDENT membership (no management caps) + TEACHER grant scoped to the faculty unit.
    const teacher = await seedUser({ role: Role.STUDENT });
    await seedMembership(teacher.id, institution.id, Role.STUDENT);
    const teacherAuth = bearer(teacher.id, Role.STUDENT, institution.id);

    const faculty = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية ${uniqueSuffix()}`, type: 'FACULTY', city: 'طرابلس',
    }, adminAuth);
    const dept = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `قسم ${uniqueSuffix()}`, type: 'SCIENTIFIC_DEPARTMENT', parentId: faculty.body.data.id,
    }, adminAuth);
    const otherFaculty = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية أخرى ${uniqueSuffix()}`, type: 'FACULTY', city: 'بنغازي',
    }, adminAuth);

    // Before the grant: no structure writes.
    const before = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `محاولة قبل المنح ${uniqueSuffix()}`, type: 'OFFICE', parentId: dept.body.data.id,
    }, teacherAuth);
    expect(before.status).toBe(403);

    // ADMIN (ROLES_ASSIGN default) grants TEACHER scoped to the faculty.
    const grant = await api('POST', `/api/v1/admin/users/${teacher.id}/unit-roles`, {
      institutionId: institution.id, orgUnitId: faculty.body.data.id, role: 'ADMIN', reason: 'وكيل الكلية',
    }, adminAuth);
    expect(grant.status).toBe(201);

    // After the grant: the teacher can create a unit under the faculty's
    // department (ancestor coverage)...
    const inside = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب داخل النطاق ${uniqueSuffix()}`, type: 'OFFICE', parentId: dept.body.data.id,
    }, teacherAuth);
    expect(inside.status).toBe(201);
    // ...and directly under the faculty...
    const insideRoot = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب تحت الكلية ${uniqueSuffix()}`, type: 'OFFICE', parentId: faculty.body.data.id,
    }, teacherAuth);
    expect(insideRoot.status).toBe(201);
    // ...but NOT under another faculty (out of scope).
    const outside = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `محاولة خارج النطاق ${uniqueSuffix()}`, type: 'OFFICE', parentId: otherFaculty.body.data.id,
    }, teacherAuth);
    expect(outside.status).toBe(403);
    // The grant is visible on /me/unit-roles.
    const mine = await api('GET', '/api/v1/me/unit-roles', undefined, teacherAuth);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].role).toBe('ADMIN');
    // Revoking removes the capability.
    await api('POST', `/api/v1/admin/unit-roles/${grant.body.data.id}/revoke`, {}, adminAuth);
    const afterRevoke = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `بعد السحب ${uniqueSuffix()}`, type: 'OFFICE', parentId: dept.body.data.id,
    }, teacherAuth);
    expect(afterRevoke.status).toBe(403);
  });

  it('grant rules: membership required, unit must belong, no duplicate', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
    const outsider = await seedUser({ role: Role.STUDENT }); // no membership anywhere
    const noMember = await api('POST', `/api/v1/admin/users/${outsider.id}/unit-roles`, {
      institutionId: institution.id, role: 'TEACHER',
    }, adminAuth);
    expect(noMember.status).toBe(400);
    expect(noMember.body.error.code).toBe('USER_NOT_MEMBER');
    const otherInstitution = await seedInstitution();
    const foreignUnit = await db().organizationalUnit.create({
      data: { institutionId: otherInstitution.id, nameAr: 'وحدة غريبة', type: 'OFFICE' },
    });
    const member = await seedUser({ role: Role.STUDENT });
    await seedMembership(member.id, institution.id, Role.STUDENT);
    const badUnit = await api('POST', `/api/v1/admin/users/${member.id}/unit-roles`, {
      institutionId: institution.id, orgUnitId: foreignUnit.id, role: 'TEACHER',
    }, adminAuth);
    expect(badUnit.status).toBe(400);
    expect(badUnit.body.error.code).toBe('UNIT_ROLE_UNIT_INVALID');
    await api('POST', `/api/v1/admin/users/${member.id}/unit-roles`, {
      institutionId: institution.id, role: 'TEACHER',
    }, adminAuth);
    const dup = await api('POST', `/api/v1/admin/users/${member.id}/unit-roles`, {
      institutionId: institution.id, role: 'TEACHER',
    }, adminAuth);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('UNIT_ROLE_EXISTS');
  });

  it('deterministic deny precedence end-to-end: a revoke beats a unit-grant role default', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
    const teacher = await seedUser({ role: Role.STUDENT });
    await seedMembership(teacher.id, institution.id, Role.STUDENT);
    const teacherAuth = bearer(teacher.id, Role.STUDENT, institution.id);
    // Grant TEACHER (defaults include CURRICULUM_EDIT_OWN)... but wait —
    // the management capability under test is ORG_STRUCTURE_MANAGE which
    // TEACHER defaults lack. Use ADMIN-grant + revoke instead.
    await api('POST', `/api/v1/admin/users/${teacher.id}/unit-roles`, {
      institutionId: institution.id, role: 'ADMIN',
    }, adminAuth);
    // ...and an explicit scoped UserPermission revoke of ORG_STRUCTURE_MANAGE.
    await db().userPermission.create({
      data: {
        userId: teacher.id, capability: 'ORG_STRUCTURE_MANAGE',
        institutionId: institution.id, grant: false, reason: 'اختبار أسبقية المنع',
      },
    });
    const denied = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `منع صريح ${uniqueSuffix()}`, type: 'OFFICE',
    }, teacherAuth);
    expect(denied.status).toBe(403);
  });
});

describe('r352 institution classification', () => {
  it('OWNER classifies an institution; kind/sector mismatch and cycles are rejected; audit lands', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const ownerAuth = bearer(owner.id, Role.OWNER, null);
    const institution = await seedInstitution();
    const ok = await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL', kindCode: 'HIGHER_TECHNICAL_INSTITUTE',
      ownership: 'PUBLIC', supervisingAuthorityCode: 'TECHNICAL_ACADEMY',
      establishmentDecisionNumber: 'قرار مجلس الوزراء 456/2026', establishmentDecisionDate: '2026-03-10',
    }, ownerAuth);
    expect(ok.status).toBe(200);
    expect(ok.body.data.institution.kind.code).toBe('HIGHER_TECHNICAL_INSTITUTE');
    const audit = await db().auditLog.findFirst({
      where: { action: 'institution.classification.update', resourceId: institution.id },
    });
    expect(audit).not.toBeNull();

    // Mismatch: university kind in the TVET sector.
    const mismatch = await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      kindCode: 'UNIVERSITY',
    }, ownerAuth);
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.error.code).toBe('INSTITUTION_KIND_SECTOR_MISMATCH');

    // Parent cycle.
    const parent = await seedInstitution();
    await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      parentInstitutionId: parent.id,
    }, ownerAuth);
    const cycle = await api('PATCH', `/api/v1/owner/institutions/${parent.id}/classification`, {
      parentInstitutionId: institution.id,
    }, ownerAuth);
    expect(cycle.status).toBe(409);
    expect(cycle.body.error.code).toBe('PARENT_CYCLE');

    // The classified profile is readable by members.
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const profile = await api('GET', '/api/v1/institutions/me/profile', undefined, bearer(admin.id, Role.ADMIN, institution.id));
    expect(profile.status).toBe(200);
    expect(profile.body.data.institution.kind.code).toBe('HIGHER_TECHNICAL_INSTITUTE');
    expect(profile.body.data.institution.sector).toBe('TECHNICAL_VOCATIONAL_PROFESSIONAL');
    expect(profile.body.data.institution.parentInstitution.id).toBe(parent.id);

    // ADMIN cannot call the OWNER classification route.
    const forbidden = await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      ownership: 'PRIVATE',
    }, bearer(admin.id, Role.ADMIN, institution.id));
    expect(forbidden.status).toBe(403);
  });
});
