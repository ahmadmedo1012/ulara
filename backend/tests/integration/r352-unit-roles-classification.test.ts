/**
 * r352 hardening DB integration — unit-scoped CAPABILITY grants (§3.1 +
 * §3.2) and the institution classification surface.
 *
 * Covers the P0 matrix:
 *  - a unit-scoped grant adds EXACTLY ONE capability over the unit's
 *    subtree (ancestor coverage, sibling denial, institution-wide
 *    operation denial);
 *  - an institution-wide grant authorizes institution-wide operations;
 *  - cross-institution grant administration is closed (§3.1): a
 *    non-OWNER caller's server-verified context wins over any query
 *    parameter, and cross-institution grant reads/revokes read as 404;
 *  - grant rules: membership required, unit must belong, no duplicate,
 *    actor authority parity (GRANT_EXCEEDS_AUTHORITY);
 *  - deterministic deny precedence end-to-end;
 *  - revocation is immediately effective.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, classifyInstitution, db, seedInstitution, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';
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

/** A classified university world with an ADMIN, a faculty tree, and a
 * STUDENT-member grant candidate. */
async function seedGrantWorld() {
  const institution = await seedInstitution();
  await classifyInstitution(institution.id, 'UNIVERSITY');
  const admin = await seedUser({ role: Role.ADMIN });
  await seedMembership(admin.id, institution.id, Role.ADMIN);
  const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
  const faculty = await api('POST', '/api/v1/institutional/org-units', {
    nameAr: `كلية ${uniqueSuffix()}`, type: 'FACULTY', city: 'طرابلس',
  }, adminAuth);
  const dept = await api('POST', '/api/v1/institutional/org-units', {
    nameAr: `قسم ${uniqueSuffix()}`, type: 'SCIENTIFIC_DEPARTMENT', parentId: faculty.body.data.id,
  }, adminAuth);
  const otherFaculty = await api('POST', '/api/v1/institutional/org-units', {
    nameAr: `كلية أخرى ${uniqueSuffix()}`, type: 'FACULTY', city: 'بنغازي',
  }, adminAuth);
  const member = await seedUser({ role: Role.STUDENT });
  await seedMembership(member.id, institution.id, Role.STUDENT);
  const memberAuth = bearer(member.id, Role.STUDENT, institution.id);
  return {
    institution, admin, adminAuth, member, memberAuth,
    facultyId: faculty.body.data.id as string,
    deptId: dept.body.data.id as string,
    otherFacultyId: otherFaculty.body.data.id as string,
  };
}

describe('r352 unit-scoped capability grants (§3.2)', () => {
  it('a unit-scoped grant adds EXACTLY ONE capability over the subtree — no role bundles', async () => {
    const w = await seedGrantWorld();

    // Before the grant: no structure writes.
    const before = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `محاولة قبل المنح ${uniqueSuffix()}`, type: 'OFFICE', parentId: w.deptId,
    }, w.memberAuth);
    expect(before.status).toBe(403);

    // ADMIN grants ORG_STRUCTURE_MANAGE scoped to the faculty (a
    // faculty-deputy-shaped responsibility).
    const grant = await api('POST', `/api/v1/admin/users/${w.member.id}/unit-capabilities`, {
      institutionId: w.institution.id, orgUnitId: w.facultyId, capability: 'ORG_STRUCTURE_MANAGE', reason: 'وكيل الكلية',
    }, w.adminAuth);
    expect(grant.status).toBe(201);
    expect(grant.body.data.capability).toBe('ORG_STRUCTURE_MANAGE');

    // Subtree coverage: a unit under the faculty's department works...
    const inside = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب داخل النطاق ${uniqueSuffix()}`, type: 'OFFICE', parentId: w.deptId,
    }, w.memberAuth);
    expect(inside.status).toBe(201);
    // ...and directly under the faculty...
    const insideRoot = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب تحت الكلية ${uniqueSuffix()}`, type: 'OFFICE', parentId: w.facultyId,
    }, w.memberAuth);
    expect(insideRoot.status).toBe(201);
    // ...but NOT under a sibling faculty (out of scope).
    const outside = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `محاولة خارج النطاق ${uniqueSuffix()}`, type: 'OFFICE', parentId: w.otherFacultyId,
    }, w.memberAuth);
    expect(outside.status).toBe(403);
    // ...and NOT for a root unit (an institution-wide operation: the
    // unit-scoped grant must never authorize it — §3.2 rule 1).
    const rootAttempt = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `محاولة جذر ${uniqueSuffix()}`, type: 'OFFICE',
    }, w.memberAuth);
    expect(rootAttempt.status).toBe(403);
    // The grant composed NO role bundle: another capability is absent.
    const peopleAttempt = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'موظف تجربة', category: 'TECHNICIAN',
    }, w.memberAuth);
    expect(peopleAttempt.status).toBe(403);

    // The grant is visible on /me/unit-capabilities.
    const mine = await api('GET', '/api/v1/me/unit-capabilities', undefined, w.memberAuth);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].capability).toBe('ORG_STRUCTURE_MANAGE');

    // Revocation is immediately effective (no grant cache).
    const revoked = await api('POST', `/api/v1/admin/unit-capabilities/${grant.body.data.id}/revoke`, {}, w.adminAuth);
    expect(revoked.status).toBe(200);
    const afterRevoke = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `بعد السحب ${uniqueSuffix()}`, type: 'OFFICE', parentId: w.deptId,
    }, w.memberAuth);
    expect(afterRevoke.status).toBe(403);
  });

  it('an institution-wide grant authorizes institution-wide operations', async () => {
    const w = await seedGrantWorld();
    const grant = await api('POST', `/api/v1/admin/users/${w.member.id}/unit-capabilities`, {
      institutionId: w.institution.id, capability: 'PEOPLE_MANAGE',
    }, w.adminAuth);
    expect(grant.status).toBe(201);
    const created = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'موظف بإدارة شاملة', category: 'TECHNICIAN',
    }, w.memberAuth);
    expect(created.status).toBe(201);
    // ...but the OTHER capabilities stay absent (single-capability model).
    const structure = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة ${uniqueSuffix()}`, type: 'OFFICE',
    }, w.memberAuth);
    expect(structure.status).toBe(403);
  });

  it('§3.1 cross-institution grant administration is closed', async () => {
    const worldA = await seedGrantWorld();
    const worldB = await seedGrantWorld();

    // A's member (for grant targeting inside A).
    const target = await seedUser({ role: Role.STUDENT });
    await seedMembership(target.id, worldA.institution.id, Role.STUDENT);

    // B's admin asks for A's grants by passing A's institutionId as a
    // query parameter — the server-verified context (B) wins: the list
    // comes back scoped to B (empty), never A's rows.
    const read = await api(
      'GET',
      `/api/v1/admin/users/${target.id}/unit-capabilities?institutionId=${worldA.institution.id}`,
      undefined,
      worldB.adminAuth,
    );
    expect(read.status).toBe(200);
    expect(read.body.data).toHaveLength(0);

    // B's admin cannot GRANT inside A even with A's institutionId in
    // the body: the verified context (B) is what governs.
    const grantAttempt = await api('POST', `/api/v1/admin/users/${target.id}/unit-capabilities`, {
      institutionId: worldA.institution.id, capability: 'PEOPLE_MANAGE',
    }, worldB.adminAuth);
    expect(grantAttempt.status).toBe(400);
    expect(grantAttempt.body.error.code).toBe('USER_NOT_MEMBER');

    // A real grant exists in A; B's admin cannot revoke it (404 — no
    // existence leak).
    const grant = await api('POST', `/api/v1/admin/users/${target.id}/unit-capabilities`, {
      institutionId: worldA.institution.id, orgUnitId: worldA.deptId, capability: 'ORG_STRUCTURE_MANAGE',
    }, worldA.adminAuth);
    expect(grant.status).toBe(201);
    const revokeAttempt = await api('POST', `/api/v1/admin/unit-capabilities/${grant.body.data.id}/revoke`, {}, worldB.adminAuth);
    expect(revokeAttempt.status).toBe(404);

    // OWNER may administer across institutions: verify + grant in B.
    const owner = await seedUser({ role: Role.OWNER });
    const ownerAuth = bearer(owner.id, Role.OWNER, null);
    const ownerGrant = await api('POST', `/api/v1/admin/users/${target.id}/unit-capabilities?institutionId=${worldB.institution.id}`, {
      institutionId: worldB.institution.id, capability: 'PEOPLE_MANAGE',
    }, ownerAuth);
    // target has no membership in B — the belt still applies to OWNER.
    expect(ownerGrant.status).toBe(400);
    expect(ownerGrant.body.error.code).toBe('USER_NOT_MEMBER');
  });

  it('grant rules: membership required, unit must belong, no duplicate, authority parity', async () => {
    const w = await seedGrantWorld();
    const outsider = await seedUser({ role: Role.STUDENT }); // no membership anywhere
    const noMember = await api('POST', `/api/v1/admin/users/${outsider.id}/unit-capabilities`, {
      institutionId: w.institution.id, capability: 'PEOPLE_MANAGE',
    }, w.adminAuth);
    expect(noMember.status).toBe(400);
    expect(noMember.body.error.code).toBe('USER_NOT_MEMBER');

    const otherInstitution = await seedInstitution();
    const foreignUnit = await db().organizationalUnit.create({
      data: { institutionId: otherInstitution.id, nameAr: 'وحدة غريبة', type: 'OFFICE' },
    });
    const member = await seedUser({ role: Role.STUDENT });
    await seedMembership(member.id, w.institution.id, Role.STUDENT);
    const badUnit = await api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
      institutionId: w.institution.id, orgUnitId: foreignUnit.id, capability: 'PEOPLE_MANAGE',
    }, w.adminAuth);
    expect(badUnit.status).toBe(404);

    await api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
      institutionId: w.institution.id, capability: 'PEOPLE_MANAGE',
    }, w.adminAuth);
    const dup = await api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
      institutionId: w.institution.id, capability: 'PEOPLE_MANAGE',
    }, w.adminAuth);
    expect(dup.status).toBe(409);

    // §3.2 rule 8 — authority parity: an actor who may assign grants
    // (institution-wide UNIT_CAPABILITIES_ASSIGN via UserPermission)
    // but holds no FACILITIES_MANAGE anywhere cannot grant it.
    const delegate = await seedUser({ role: Role.STUDENT });
    await seedMembership(delegate.id, w.institution.id, Role.STUDENT);
    await db().userPermission.create({
      data: {
        userId: delegate.id, capability: 'UNIT_CAPABILITIES_ASSIGN',
        institutionId: w.institution.id, grant: true, reason: 'مفوّض منح',
      },
    });
    const delegateAuth = bearer(delegate.id, Role.STUDENT, w.institution.id);
    const exceeds = await api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
      institutionId: w.institution.id, capability: 'FACILITIES_MANAGE',
    }, delegateAuth);
    expect(exceeds.status).toBe(403);
    expect(exceeds.body.error.code).toBe('GRANT_EXCEEDS_AUTHORITY');
    // The same delegate CAN grant a capability they DO hold
    // (UNIT_CAPABILITIES_ASSIGN itself, unit-scoped).
    const within = await api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
      institutionId: w.institution.id, orgUnitId: w.deptId, capability: 'UNIT_CAPABILITIES_ASSIGN',
    }, delegateAuth);
    expect(within.status).toBe(201);
  });

  it('deterministic deny precedence end-to-end: a revoke beats a unit grant', async () => {
    const w = await seedGrantWorld();
    await api('POST', `/api/v1/admin/users/${w.member.id}/unit-capabilities`, {
      institutionId: w.institution.id, orgUnitId: w.facultyId, capability: 'ORG_STRUCTURE_MANAGE',
    }, w.adminAuth);
    await db().userPermission.create({
      data: {
        userId: w.member.id, capability: 'ORG_STRUCTURE_MANAGE',
        institutionId: w.institution.id, grant: false, reason: 'اختبار أسبقية المنع',
      },
    });
    const denied = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `منع صريح ${uniqueSuffix()}`, type: 'OFFICE',
    }, w.memberAuth);
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

    // Affiliation: the parent must be classified first (§6.6).
    const parent = await seedInstitution();
    const unclassifiedParent = await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      parentInstitutionId: parent.id,
    }, ownerAuth);
    expect(unclassifiedParent.status).toBe(409);
    expect(unclassifiedParent.body.error.code).toBe('PARENT_SECTOR_MISMATCH');
    await api('PATCH', `/api/v1/owner/institutions/${parent.id}/classification`, {
      sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL', kindCode: 'TECHNICAL_COLLEGE',
    }, ownerAuth);
    const affiliated = await api('PATCH', `/api/v1/owner/institutions/${institution.id}/classification`, {
      parentInstitutionId: parent.id,
    }, ownerAuth);
    expect(affiliated.status).toBe(200);

    // Parent cycle.
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
