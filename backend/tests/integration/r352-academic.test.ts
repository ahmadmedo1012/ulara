/**
 * r352 DB integration — academic terms, programs, versions, courses,
 * program enrollments (with the student/trainee distinction), training
 * placements, and credential award/revoke.
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

/** An institution + ADMIN + a student profile (the legacy chain is required
 * for StudentProfile — see DECISIONS.md D9). */
async function seedAcademicWorld() {
  const institution = await seedInstitution();
  const admin = await seedUser({ role: Role.ADMIN });
  await seedMembership(admin.id, institution.id, Role.ADMIN);
  const studentUser = await seedUser({ role: Role.STUDENT });
  const studentMembership = await seedMembership(studentUser.id, institution.id, Role.STUDENT);
  const faculty = await db().faculty.create({
    data: { name: `كلية ${uniqueSuffix()}`, city: 'طرابلس', institutionId: institution.id },
  });
  const department = await db().department.create({
    data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
  });
  const studentProfile = await db().studentProfile.create({
    data: {
      userId: studentUser.id,
      membershipId: studentMembership.id,
      institutionId: institution.id,
      universityId: `S-${uniqueSuffix()}`,
      facultyId: faculty.id,
      departmentId: department.id,
      learnerCategory: 'STUDENT',
    },
  });
  const course = await db().course.create({
    data: {
      code: `CS${Math.floor(Math.random() * 900 + 100)}`,
      name: `مقرر ${uniqueSuffix()}`,
      institutionId: institution.id,
      departmentId: department.id,
    },
  });
  const auth = bearer(admin.id, Role.ADMIN, institution.id);
  return { institution, admin, auth, studentProfile, course, studentUser };
}

describe('r352 academic programs', () => {
  it('term uniqueness + single-current invariant', async () => {
    const { auth } = await seedAcademicWorld();
    const t1 = await api('POST', '/api/v1/academic/terms', { code: '2026-FALL', startsAt: '2026-09-01', isCurrent: true }, auth);
    expect(t1.status).toBe(201);
    const dup = await api('POST', '/api/v1/academic/terms', { code: '2026-FALL', startsAt: '2027-01-01' }, auth);
    expect(dup.status).toBe(409);
    await api('POST', '/api/v1/academic/terms', { code: '2027-SPRING', startsAt: '2027-02-01', isCurrent: true }, auth);
    const current = await db().academicTerm.findMany({ where: { isCurrent: true } });
    expect(current).toHaveLength(1);
    expect(current[0]!.code).toBe('2027-SPRING');
  });

  it('program → version → courses, with the single-ACTIVE-version belt', async () => {
    const w = await seedAcademicWorld();
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `PRG-${uniqueSuffix()}`, nameAr: 'بكالوريوس تقني معلوماتية', kind: 'TECHNICAL',
      credentialTypeCode: 'TECHNICAL_BACHELOR', durationMonths: 48,
    }, w.auth);
    expect(program.status).toBe(201);
    const v1 = await api('POST', `/api/v1/academic/programs/${program.body.data.id}/versions`, { label: 'v1-2026' }, w.auth);
    expect(v1.status).toBe(201);
    // DRAFT → ACTIVE directly is illegal.
    const skip = await api('PATCH', `/api/v1/academic/program-versions/${v1.body.data.id}`, { status: 'ACTIVE' }, w.auth);
    expect(skip.status).toBe(409);
    await api('PATCH', `/api/v1/academic/program-versions/${v1.body.data.id}`, { status: 'APPROVED' }, w.auth);
    await api('PATCH', `/api/v1/academic/program-versions/${v1.body.data.id}`, { status: 'ACTIVE' }, w.auth);
    const v2 = await api('POST', `/api/v1/academic/programs/${program.body.data.id}/versions`, { label: 'v2-2028' }, w.auth);
    await api('PATCH', `/api/v1/academic/program-versions/${v2.body.data.id}`, { status: 'APPROVED' }, w.auth);
    const secondActive = await api('PATCH', `/api/v1/academic/program-versions/${v2.body.data.id}`, { status: 'ACTIVE' }, w.auth);
    expect(secondActive.status).toBe(409);
    expect(secondActive.body.error.code).toBe('PROGRAM_VERSION_ACTIVE_EXISTS');
    // Courses link into the version.
    const link = await api('POST', `/api/v1/academic/program-versions/${v1.body.data.id}/courses`, {
      courseId: w.course.id, termNo: 1, kind: 'CORE', creditHours: 3,
    }, w.auth);
    expect(link.status).toBe(201);
    const list = await api('GET', `/api/v1/academic/program-versions/${v1.body.data.id}/courses`, undefined, w.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].course.id).toBe(w.course.id);
  });

  it('program enrollment transitions + the learner-category distinction', async () => {
    const w = await seedAcademicWorld();
    // A TRAINEE profile (متدرب) in a training program.
    const traineeUser = await seedUser({ role: Role.STUDENT });
    const traineeMembership = await seedMembership(traineeUser.id, w.institution.id, Role.STUDENT);
    const traineeProfile = await db().studentProfile.create({
      data: {
        userId: traineeUser.id, membershipId: traineeMembership.id,
        institutionId: w.institution.id, universityId: `TR-${uniqueSuffix()}`,
        facultyId: (await db().faculty.findFirstOrThrow({ where: { institutionId: w.institution.id } })).id,
        departmentId: (await db().department.findFirstOrThrow({ where: { faculty: { institutionId: w.institution.id } } })).id,
        learnerCategory: 'TRAINEE',
      },
    });
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `VOC-${uniqueSuffix()}`, nameAr: 'تدريب مهني — المسار المحدود', kind: 'VOCATIONAL_TRAINING',
      credentialTypeCode: 'VOCATIONAL_TRAINING_CERT', durationMonths: 6,
    }, w.auth);
    expect(program.status).toBe(201);
    // r352 hardening §14: enrollment requires an APPROVED/ACTIVE program
    // (a DRAFT program is not a valid enrollment target).
    await api('PATCH', `/api/v1/academic/programs/${program.body.data.id}`, { status: 'APPROVED' }, w.auth);
    await api('PATCH', `/api/v1/academic/programs/${program.body.data.id}`, { status: 'ACTIVE' }, w.auth);
    const enrollment = await api('POST', '/api/v1/academic/program-enrollments', {
      studentProfileId: traineeProfile.id, programId: program.body.data.id,
    }, w.auth);
    expect(enrollment.status).toBe(201);
    const dup = await api('POST', '/api/v1/academic/program-enrollments', {
      studentProfileId: traineeProfile.id, programId: program.body.data.id,
    }, w.auth);
    expect(dup.status).toBe(409);
    // CANDIDATE → GRADUATED directly is illegal.
    const skip = await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'GRADUATED' }, w.auth);
    expect(skip.status).toBe(409);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'ACTIVE' }, w.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'COMPLETED' }, w.auth);
    const graduated = await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'GRADUATED' }, w.auth);
    expect(graduated.status).toBe(200);
    // The two learner categories coexist and stay distinct.
    const categories = await db().studentProfile.groupBy({ by: ['learnerCategory'], where: { institutionId: w.institution.id } });
    expect(categories.map((c) => c.learnerCategory).sort()).toEqual(['STUDENT', 'TRAINEE']);
  });

  it('credential award + serial uniqueness + revoke', async () => {
    const w = await seedAcademicWorld();
    const serial = `SER-${uniqueSuffix()}`;
    const award = await api('POST', '/api/v1/academic/credentials/award', {
      studentProfileId: w.studentProfile.id, credentialTypeCode: 'TECHNICAL_BACHELOR',
      decisionNumber: 'قرار 55', serialNumber: serial, conferredAt: '2026-07-01',
    }, w.auth);
    expect(award.status).toBe(201);
    const dupSerial = await api('POST', '/api/v1/academic/credentials/award', {
      studentProfileId: w.studentProfile.id, credentialTypeCode: 'OTHER', serialNumber: serial,
    }, w.auth);
    expect(dupSerial.status).toBe(409);
    expect(dupSerial.body.error.code).toBe('CREDENTIAL_SERIAL_TAKEN');
    const list = await api('GET', `/api/v1/academic/credentials?studentProfileId=${w.studentProfile.id}`, undefined, w.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].credentialType.code).toBe('TECHNICAL_BACHELOR');
    expect(list.body.data[0].credentialType.grantsProgression).toBe(true);
    const revoked = await api('POST', `/api/v1/academic/credentials/${award.body.data.id}/revoke`, { notes: 'خطأ في الإصدار' }, w.auth);
    expect(revoked.status).toBe(200);
    expect(revoked.body.data.status).toBe('REVOKED');
    const audit = await db().auditLog.findFirst({ where: { action: 'credential.revoke' } });
    expect(audit).not.toBeNull();
  });

  it('training placements land with supervisor + host unit', async () => {
    const w = await seedAcademicWorld();
    const unit = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `ورشة ${uniqueSuffix()}`, type: 'WORKSHOP',
    }, w.auth);
    const person = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'المشرف', category: 'TRAINER' }, w.auth);
    const placement = await api('POST', '/api/v1/academic/training-placements', {
      studentProfileId: w.studentProfile.id, hostOrgUnitId: unit.body.data.id,
      supervisorPersonId: person.body.data.id, startsAt: '2026-06-01', endsAt: '2026-08-31',
    }, w.auth);
    expect(placement.status).toBe(201);
    const completed = await api('PATCH', `/api/v1/academic/training-placements/${placement.body.data.id}`, {
      status: 'COMPLETED', evaluationSummary: 'أداء ممتاز', evaluationScore: 92.5,
    }, w.auth);
    expect(completed.status).toBe(200);
    expect(String(completed.body.data.evaluationScore)).toBe('92.5');
  });
});
