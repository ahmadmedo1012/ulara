/**
 * r352 DB integration — migration & seed backfill correctness +
 * idempotency: every legacy Faculty/Department has its mirrored unit,
 * legacy TeacherProfile leadership produced appointment rows, the
 * catalogs are complete, and re-running the seed changes nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AcademicPosition, Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { db, seedInstitution, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';
import { backfillLegacyAppointments, backfillOrgUnitsFromLegacy, ensureR352Catalogs } from '../../prisma/seed-r352-catalogs.js';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
beforeEach(async () => {
  await truncateAll(db());
});

describe('r352 migration & seed backfills', () => {
  it('legacy faculties/departments get mirrored org units (idempotent)', async () => {
    const institution = await seedInstitution();
    const faculty = await db().faculty.create({
      data: { name: `كلية التراث ${uniqueSuffix()}`, city: 'سبها', institutionId: institution.id },
    });
    const department = await db().department.create({
      data: { name: `قسم التراث ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    const first = await backfillOrgUnitsFromLegacy(db());
    expect(first.faculties).toBe(1);
    expect(first.departments).toBe(1);
    const linkedFaculty = await db().faculty.findUniqueOrThrow({ where: { id: faculty.id } });
    expect(linkedFaculty.orgUnitId).not.toBeNull();
    const unit = await db().organizationalUnit.findUniqueOrThrow({ where: { id: linkedFaculty.orgUnitId! } });
    expect(unit.type).toBe('FACULTY');
    expect(unit.institutionId).toBe(institution.id);
    const linkedDept = await db().department.findUniqueOrThrow({ where: { id: department.id } });
    const deptUnit = await db().organizationalUnit.findUniqueOrThrow({ where: { id: linkedDept.orgUnitId! } });
    expect(deptUnit.type).toBe('SCIENTIFIC_DEPARTMENT');
    expect(deptUnit.parentId).toBe(unit.id); // nested under the faculty's unit
    // Idempotent: nothing changes on the second pass.
    const second = await backfillOrgUnitsFromLegacy(db());
    expect(second.faculties).toBe(1);
    expect(second.departments).toBe(1);
    const count = await db().organizationalUnit.count();
    await backfillOrgUnitsFromLegacy(db());
    expect(await db().organizationalUnit.count()).toBe(count);
  });

  it('legacy TeacherProfile leadership backfills to appointments (idempotent)', async () => {
    const institution = await seedInstitution();
    const teacher = await seedUser({ role: Role.TEACHER });
    const membership = await seedMembership(teacher.id, institution.id, Role.TEACHER);
    const department = await db().department.create({
      data: { name: `قسم القيادة ${uniqueSuffix()}`, facultyId: (await db().faculty.create({ data: { name: `كلية القيادة ${uniqueSuffix()}`, city: 'الزاوية', institutionId: institution.id } })).id },
    });
    const profile = await db().teacherProfile.create({
      data: {
        userId: teacher.id, membershipId: membership.id, specialty: 'هندسة',
        departmentId: department.id, position: AcademicPosition.DEPARTMENT_HEAD,
        appointedAt: new Date('2025-09-01'),
      },
    });
    await ensureR352Catalogs(db());
    await backfillOrgUnitsFromLegacy(db());
    const created = await backfillLegacyAppointments(db());
    expect(created).toBe(1);
    const appointment = await db().positionAppointment.findUniqueOrThrow({
      where: { id: `pa-legacy-${profile.id}` },
      include: { position: true },
    });
    expect(appointment.position.code).toBe('DEPARTMENT_HEAD');
    expect(appointment.status).toBe('ACTIVE');
    expect(appointment.personId).not.toBeNull();
    // The person row is linked back to the teacher profile.
    const linked = await db().teacherProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect(linked.personId).toBe(appointment.personId);
    // Idempotent.
    expect(await backfillLegacyAppointments(db())).toBe(0);
  });

  it('the seeded catalogs are complete and re-runs are stable', async () => {
    await ensureR352Catalogs(db());
    const snapshot = async () => ({
      authorities: await db().regulatoryAuthority.count(),
      institutionTypes: await db().institutionType.count(),
      credentialTypes: await db().credentialType.count(),
      positionTemplates: await db().positionTemplate.count(),
      criteriaSets: await db().accreditationCriteriaSet.count(),
      criteriaItems: await db().accreditationCriteriaItem.count(),
    });
    const before = await snapshot();
    expect(before.authorities).toBe(6);
    expect(before.institutionTypes).toBe(10); // LEGAL-MATRIX §A
    expect(before.credentialTypes).toBe(10); // Law 21/2023 م5 + 9/2026
    expect(before.positionTemplates).toBeGreaterThanOrEqual(18);
    expect(before.criteriaSets).toBe(2);
    expect(before.criteriaItems).toBe(17); // 9 institutional + 8 program standards
    // Sector split: 5 HE kinds, 5 TVET kinds.
    const heCount = await db().institutionType.count({ where: { sector: 'HIGHER_EDUCATION_RESEARCH' } });
    const tvetCount = await db().institutionType.count({ where: { sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' } });
    expect(heCount).toBe(5);
    expect(tvetCount).toBe(5);
    // Re-run: zero drift.
    await ensureR352Catalogs(db());
    expect(await snapshot()).toEqual(before);
  });
});
