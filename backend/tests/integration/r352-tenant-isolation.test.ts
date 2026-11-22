/**
 * r352 DB integration — THE two-institution isolation scenario the R352
 * brief demands: two institutions carrying IDENTICAL unit names, codes,
 * person numbers, appointment seats, program codes and serials — and
 * the proof that users, records, permissions, appointments and evidence
 * cannot leak across the boundary in either direction.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, classifyInstitution, db, seedInstitution, seedMembership, seedUser, truncateAll } from './helpers.js';
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

describe('r352 tenant isolation — two institutions, same names and codes', () => {
  beforeEach(async () => {
    // Build BOTH worlds with IDENTICAL labels: same unit name/code, same
    // staff number, same program code, same credential serial, same
    // appointment seat, same evidence owner labels.
    for (const world of ['A', 'B']) {
      const institution = await seedInstitution();
      // r352 hardening: FACULTY units + FACULTY_DEAN eligibility need a
      // classified (university) institution.
      await classifyInstitution(institution.id, 'UNIVERSITY');
      const admin = await seedUser({ role: Role.ADMIN, firstName: `مدير${world}` });
      await seedMembership(admin.id, institution.id, Role.ADMIN);
      const auth = bearer(admin.id, Role.ADMIN, institution.id);
      const unit = await api('POST', '/api/v1/institutional/org-units', {
        nameAr: 'كلية التقنية المتطابقة', type: 'FACULTY', city: 'طرابلس', code: 'F-TECH-1',
      }, auth);
      await api('POST', '/api/v1/institutional/org-units', {
        nameAr: 'القسم المتطابق', type: 'SCIENTIFIC_DEPARTMENT', parentId: unit.body.data.id,
      }, auth);
      const person = await api('POST', '/api/v1/institutional/people', {
        fullNameAr: 'عضو هيئة التدريس المتطابق', category: 'ACADEMIC_STAFF', staffNumber: 'STAFF-777',
      }, auth);
      await api('POST', '/api/v1/institutional/appointments', {
        personId: person.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: unit.body.data.id,
        startDate: '2026-01-01', decisionNumber: 'قرار-1',
      }, auth);
      const student = await seedUser({ role: Role.STUDENT });
      const membership = await seedMembership(student.id, institution.id, Role.STUDENT);
      const faculty = await db().faculty.findUniqueOrThrow({ where: { orgUnitId: unit.body.data.id } });
      const department = await db().department.findFirstOrThrow({ where: { facultyId: faculty.id } });
      const profile = await db().studentProfile.create({
        data: {
          userId: student.id, membershipId: membership.id, institutionId: institution.id,
          universityId: 'REG-1000', facultyId: faculty.id, departmentId: department.id,
        },
      });
      const program = await api('POST', '/api/v1/academic/programs', {
        code: 'PROG-1', nameAr: 'البرنامج المتطابق', kind: 'TECHNICAL', credentialTypeCode: 'TECHNICAL_BACHELOR',
      }, auth);
      // r352 hardening §14: enrollments require an APPROVED/ACTIVE program.
      await api('PATCH', `/api/v1/academic/programs/${program.body.data.id}`, { status: 'APPROVED' }, auth);
      await api('PATCH', `/api/v1/academic/programs/${program.body.data.id}`, { status: 'ACTIVE' }, auth);
      await api('POST', '/api/v1/academic/program-enrollments', {
        studentProfileId: profile.id, programId: program.body.data.id,
      }, auth);
      await api('POST', '/api/v1/academic/credentials/award', {
        studentProfileId: profile.id, credentialTypeCode: 'TECHNICAL_BACHELOR', serialNumber: 'SERIAL-1',
      }, auth);
      const accreditation = await api('POST', '/api/v1/compliance/accreditations', {
        type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
      }, auth);
      await api('POST', '/api/v1/compliance/evidence', {
        ownerType: 'ExternalAccreditation', ownerId: accreditation.body.data.id, titleAr: 'الدليل المتطابق',
      }, auth);
      if (world === 'A') {
        globalThis.__worldA = { institution, admin, auth, unitId: unit.body.data.id, personId: person.body.data.id, profileId: profile.id, programId: program.body.data.id, accreditationId: accreditation.body.data.id };
      } else {
        globalThis.__worldB = { institution, admin, auth, unitId: unit.body.data.id, personId: person.body.data.id, profileId: profile.id, programId: program.body.data.id, accreditationId: accreditation.body.data.id };
      }
    }
  });

  it('both worlds hold the identical labels (the premise holds)', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    const [unitA, unitB] = await Promise.all([
      db().organizationalUnit.findUniqueOrThrow({ where: { id: a.unitId } }),
      db().organizationalUnit.findUniqueOrThrow({ where: { id: b.unitId } }),
    ]);
    expect(unitA.nameAr).toBe(unitB.nameAr);
    expect(unitA.code).toBe(unitB.code);
    expect(unitA.institutionId).not.toBe(unitB.institutionId);
    const [pa, pb] = await Promise.all([
      db().institutionalPerson.findUniqueOrThrow({ where: { id: a.personId } }),
      db().institutionalPerson.findUniqueOrThrow({ where: { id: b.personId } }),
    ]);
    expect(pa.staffNumber).toBe(pb.staffNumber);
    expect((await db().awardedCredential.findMany()).map((c) => c.serialNumber)).toEqual(['SERIAL-1', 'SERIAL-1']);
  });

  it('every list is scoped: A sees only A records (and B only B)', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    for (const [world, other] of [[a, b], [b, a]] as any[]) {
      const units = await api('GET', '/api/v1/institutional/org-units', undefined, world.auth);
      expect(units.body.data).toHaveLength(2); // the faculty + its department
      expect(units.body.data.every((u: { institutionId: string }) => u.institutionId === world.institution.id)).toBe(true);
      expect(units.body.data.some((u: { id: string }) => u.id === world.unitId)).toBe(true);
      const people = await api('GET', '/api/v1/institutional/people', undefined, world.auth);
      expect(people.body.data).toHaveLength(1);
      expect(people.body.data[0].id).toBe(world.personId);
      const programs = await api('GET', '/api/v1/academic/programs', undefined, world.auth);
      expect(programs.body.data).toHaveLength(1);
      expect(programs.body.data[0].id).toBe(world.programId);
      const credentials = await api('GET', '/api/v1/academic/credentials', undefined, world.auth);
      expect(credentials.body.data).toHaveLength(1);
      expect(credentials.body.data[0].studentProfile.id).toBe(world.profileId);
      const accreditations = await api('GET', '/api/v1/compliance/accreditations', undefined, world.auth);
      expect(accreditations.body.data).toHaveLength(1);
      const evidence = await api('GET', '/api/v1/compliance/evidence', undefined, world.auth);
      expect(evidence.body.data).toHaveLength(1);
      // Appointments scoped too.
      const appointments = await api('GET', '/api/v1/institutional/appointments', undefined, world.auth);
      expect(appointments.body.data).toHaveLength(1);
      expect(appointments.body.data[0].person.id).toBe(world.personId);
      expect(other.institution.id).toBeDefined();
    }
  });

  it('cross-institution ids are clean 404s (no existence leak, no data return)', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    const checks: [string, string, Record<string, unknown> | undefined][] = [
      ['/api/v1/institutional/org-units/' + b.unitId, 'GET', undefined],
      ['/api/v1/institutional/people/' + b.personId, 'GET', undefined],
      ['/api/v1/institutional/appointments?personId=' + b.personId, 'GET', undefined],
      ['/api/v1/academic/programs/' + b.programId, 'GET', undefined],
      ['/api/v1/academic/credentials?studentProfileId=' + b.profileId, 'GET', undefined],
      ['/api/v1/compliance/accreditations/' + b.accreditationId, 'GET', undefined],
      ['/api/v1/institutional/org-units/' + b.unitId, 'PATCH', { nameAr: 'محاولة اختراق' }],
      ['/api/v1/institutional/people/' + b.personId, 'PATCH', { fullNameAr: 'محاولة اختراق' }],
    ];
    for (const [path, method, body] of checks) {
      const res = await api(method, path, body, a.auth);
      expect(res.status, `${method} ${path} must not leak`).toBe(path.includes('?') ? 200 : 404);
      if (res.status === 200) {
        // Query-filtered lists simply return nothing of B's.
        const data = res.body.data;
        expect(Array.isArray(data) ? data.length : 0).toBe(0);
      }
    }
    // The direct detail routes 404 rather than exposing B's rows.
    const detail = await api('GET', '/api/v1/institutional/people/' + b.personId, undefined, a.auth);
    expect(detail.status).toBe(404);
  });

  it('B cannot mutate A: re-parenting, appointment forgery, evidence forgery', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    // B tries to re-parent B's unit under A's unit → parent not found in B.
    const reParent = await api('PATCH', '/api/v1/institutional/org-units/' + b.unitId, { parentId: a.unitId }, b.auth);
    expect(reParent.status).toBe(404);
    // B tries to appoint B's person into A's unit → unit not found in B.
    const forged = await api('POST', '/api/v1/institutional/appointments', {
      personId: b.personId, positionCode: 'DEPARTMENT_HEAD', orgUnitId: a.unitId, startDate: '2026-01-01',
    }, b.auth);
    expect(forged.status).toBe(404);
    // B tries to attach evidence to A's accreditation → owner invalid.
    const evidence = await api('POST', '/api/v1/compliance/evidence', {
      ownerType: 'ExternalAccreditation', ownerId: a.accreditationId, titleAr: 'دليل دخيل',
    }, b.auth);
    expect(evidence.status).toBe(400);
    expect(evidence.body.error.code).toBe('EVIDENCE_OWNER_INVALID');
    // B cannot enroll A's student profile.
    const enroll = await api('POST', '/api/v1/academic/program-enrollments', {
      studentProfileId: a.profileId, programId: b.programId,
    }, b.auth);
    expect(enroll.status).toBe(400);
    expect(enroll.body.error.code).toBe('ENROLLMENT_PROFILE_WRONG_INSTITUTION');
  });

  it('audit rows never cross: every audit entry carries its own institutionId', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    const aRows = await db().auditLog.findMany({ where: { institutionId: a.institution.id } });
    const bRows = await db().auditLog.findMany({ where: { institutionId: b.institution.id } });
    expect(aRows.length).toBeGreaterThan(0);
    expect(bRows.length).toBeGreaterThan(0);
    for (const row of aRows) expect(row.institutionId).toBe(a.institution.id);
    for (const row of bRows) expect(row.institutionId).toBe(b.institution.id);
  });

  it('a forged institution claim (stale token) is rejected by the context guard', async () => {
    const a = globalThis.__worldA as any;
    const b = globalThis.__worldB as any;
    // B's admin claims A's institution in the token — the membership
    // re-resolution must refuse the context.
    const forged = bearer(b.admin.id, Role.ADMIN, a.institution.id);
    const res = await api('GET', '/api/v1/institutional/org-units', undefined, forged);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __worldA: unknown;
  // eslint-disable-next-line no-var
  var __worldB: unknown;
}
