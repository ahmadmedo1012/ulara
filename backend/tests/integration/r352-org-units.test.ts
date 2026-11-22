/**
 * r352 DB integration — the unified organizational-unit surface:
 * create/list/tree/patch/status, the Faculty/Department write-through,
 * the invariant belts (cross-institution parent, cycle, duplicate
 * code/name), and the capability gate.
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
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(async () => {
  await truncateAll(db());
  await ensureR352Catalogs(db());
});

/** ADMIN member of a fresh institution (ADMIN defaults carry ORG_STRUCTURE_MANAGE). */
async function seedAdminInstitution() {
  const institution = await seedInstitution();
  const admin = await seedUser({ role: Role.ADMIN });
  await seedMembership(admin.id, institution.id, Role.ADMIN);
  const student = await seedUser({ role: Role.STUDENT });
  await seedMembership(student.id, institution.id, Role.STUDENT);
  return { institution, admin, student };
}

const api = async (
  method: string,
  path: string,
  body: unknown,
  auth: { authorization: string } | Record<string, never>,
) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('r352 org-units', () => {
  it('creates a unit, lists it, and the tree nests children', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const created = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية الحاسوب ${uniqueSuffix()}`,
      type: 'FACULTY',
      city: 'طرابلس',
    }, auth);
    expect(created.status).toBe(201);
    const facultyUnitId = created.body.data.id as string;

    const child = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `قسم علوم الحاسوب ${uniqueSuffix()}`,
      type: 'SCIENTIFIC_DEPARTMENT',
      parentId: facultyUnitId,
    }, auth);
    expect(child.status).toBe(201);

    // The FACULTY mirror: a legacy Faculty row exists and is linked.
    const facultyMirror = await db().faculty.findUnique({ where: { orgUnitId: facultyUnitId } });
    expect(facultyMirror).not.toBeNull();
    expect(facultyMirror!.city).toBe('طرابلس');

    // The SCIENTIFIC_DEPARTMENT mirror under the mirrored faculty.
    const deptMirror = await db().department.findUnique({ where: { orgUnitId: child.body.data.id } });
    expect(deptMirror).not.toBeNull();
    expect(deptMirror!.facultyId).toBe(facultyMirror!.id);

    const tree = await api('GET', '/api/v1/institutional/org-units/tree', undefined, auth);
    expect(tree.status).toBe(200);
    const root = tree.body.data.find((n: { unit: { id: string } }) => n.unit.id === facultyUnitId);
    expect(root).toBeDefined();
    expect(root.children).toHaveLength(1);

    const list = await api('GET', '/api/v1/institutional/org-units?type=FACULTY', undefined, auth);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.meta.total).toBe(1);
  });

  it('FACULTY requires city (the legacy mirror constraint)', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const res = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: 'كلية بلا مدينة', type: 'FACULTY',
    }, bearer(admin.id, Role.ADMIN, institution.id));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORG_UNIT_CITY_REQUIRED');
  });

  it('duplicate code within the institution is a 409', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const first = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة أ ${uniqueSuffix()}`, type: 'OFFICE', code: 'ADM-1',
    }, auth);
    expect(first.status).toBe(201);
    const dup = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة ب ${uniqueSuffix()}`, type: 'OFFICE', code: 'ADM-1',
    }, auth);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ORG_UNIT_CODE_TAKEN');
  });

  it('sibling nameAr duplication is a 409 (roots exempt — city-scoped legacy faculties)', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const parent = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الإدارة العامة ${uniqueSuffix()}`, type: 'GENERAL_ADMINISTRATION',
    }, auth);
    const name = `قسم الشؤون ${uniqueSuffix()}`;
    await api('POST', '/api/v1/institutional/org-units', {
      nameAr: name, type: 'ADMINISTRATIVE_DEPARTMENT', parentId: parent.body.data.id,
    }, auth);
    const dup = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: name, type: 'ADMINISTRATIVE_DEPARTMENT', parentId: parent.body.data.id,
    }, auth);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ORG_UNIT_DUPLICATE_NAME');
  });

  it('a cross-institution parent is a clean 404 (no existence leak)', async () => {
    const a = await seedAdminInstitution();
    const b = await seedAdminInstitution();
    const bUnit = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة مؤسسة ب ${uniqueSuffix()}`, type: 'OFFICE',
    }, bearer(b.admin.id, Role.ADMIN, b.institution.id));
    expect(bUnit.status).toBe(201);
    const res = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة مؤسسة أ ${uniqueSuffix()}`, type: 'OFFICE', parentId: bUnit.body.data.id,
    }, bearer(a.admin.id, Role.ADMIN, a.institution.id));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('re-parenting into own subtree is a cycle 409', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const root = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الجذر ${uniqueSuffix()}`, type: 'GENERAL_ADMINISTRATION',
    }, auth);
    const child = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الفرع ${uniqueSuffix()}`, type: 'OFFICE', parentId: root.body.data.id,
    }, auth);
    const cycle = await api('PATCH', `/api/v1/institutional/org-units/${root.body.data.id}`, {
      parentId: child.body.data.id,
    }, auth);
    expect(cycle.status).toBe(409);
    expect(cycle.body.error.code).toBe('ORG_UNIT_CYCLE');
  });

  it('dissolving a unit with active children is blocked', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const root = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الجذر ${uniqueSuffix()}`, type: 'GENERAL_ADMINISTRATION',
    }, auth);
    await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الفرع ${uniqueSuffix()}`, type: 'OFFICE', parentId: root.body.data.id,
    }, auth);
    const res = await api('POST', `/api/v1/institutional/org-units/${root.body.data.id}/status`, {
      status: 'DISSOLVED',
    }, auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORG_UNIT_HAS_ACTIVE_CHILDREN');
  });

  it('a member without the capability is 403; the audit row lands with the mutation', async () => {
    const { institution, admin, student } = await seedAdminInstitution();
    const denied = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: 'محاولة طالب', type: 'OFFICE',
    }, bearer(student.id, Role.STUDENT, institution.id));
    expect(denied.status).toBe(403);

    const before = await db().auditLog.count({ where: { institutionId: institution.id } });
    const created = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب ${uniqueSuffix()}`, type: 'OFFICE', code: `OF-${uniqueSuffix()}`,
    }, bearer(admin.id, Role.ADMIN, institution.id));
    expect(created.status).toBe(201);
    const audit = await db().auditLog.findFirst({
      where: { institutionId: institution.id, action: 'org_unit.create', resourceId: created.body.data.id },
    });
    expect(audit).not.toBeNull();
    expect(await db().auditLog.count({ where: { institutionId: institution.id } })).toBe(before + 1);
  });

  it('renaming a FACULTY unit mirrors to the legacy Faculty row', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const created = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية الهندسة ${uniqueSuffix()}`, type: 'FACULTY', city: 'مصراتة',
    }, auth);
    const renamed = await api('PATCH', `/api/v1/institutional/org-units/${created.body.data.id}`, {
      nameAr: `كلية الهندسة المعدلة ${uniqueSuffix()}`,
    }, auth);
    expect(renamed.status).toBe(200);
    const mirror = await db().faculty.findUnique({ where: { orgUnitId: created.body.data.id } });
    expect(mirror!.name).toBe(renamed.body.data.nameAr);
  });
});
