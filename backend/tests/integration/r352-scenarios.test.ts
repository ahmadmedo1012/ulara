/**
 * r352 hardening DB integration — the MANDATORY acceptance scenarios
 * (task §15): technical/vocational institutions operating WITHOUT any
 * fabricated university hierarchy, through the REAL backend APIs.
 *
 *  Scenario B — technical college: COLLEGE unit seats its dean (§10.3),
 *               scientific departments + council + program + student.
 *  Scenario C — higher technical institute: director + academic
 *               departments + diploma pathway to award.
 *  Scenario E — vocational training center: training units and workshops
 *               ONLY (no Faculty, no Department anywhere), trainee →
 *               enrollment → practical placement → evaluation → award,
 *               then the statutory progression matrix (§12): the basic
 *               formation certificate opens intermediate institutes and
 *               nothing above; the vocational training certificate opens
 *               nothing.
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

/** A classified institution with an ADMIN and its auth header. */
async function seedWorld(kindCode: string) {
  const institution = await seedInstitution();
  await classifyInstitution(institution.id, kindCode);
  const admin = await seedUser({ role: Role.ADMIN });
  await seedMembership(admin.id, institution.id, Role.ADMIN);
  const auth = bearer(admin.id, Role.ADMIN, institution.id);
  return { institution, admin, auth };
}

/** Approve + activate a program (the enrollment lifecycle gate). */
async function activateProgram(programId: string, auth: Record<string, string>) {
  await api('PATCH', `/api/v1/academic/programs/${programId}`, { status: 'APPROVED' }, auth);
  await api('PATCH', `/api/v1/academic/programs/${programId}`, { status: 'ACTIVE' }, auth);
}

describe('scenario B — technical college (§10.3, §15-B)', () => {
  it('seats a dean on a COLLEGE unit without misclassifying it as a university faculty', async () => {
    const w = await seedWorld('TECHNICAL_COLLEGE');
    // The college unit — type COLLEGE, NOT FACULTY.
    const college = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `الكلية التقنية ${uniqueSuffix()}`, type: 'COLLEGE', city: 'طرابلس',
    }, w.auth);
    expect(college.status).toBe(201);
    expect(college.body.data.type).toBe('COLLEGE');
    // No legacy Faculty mirror exists for a technical college.
    const mirrors = await db().faculty.count({ where: { institutionId: w.institution.id } });
    expect(mirrors).toBe(0);
    // Scientific departments under the college.
    const dept = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `قسم تقنية المركبات ${uniqueSuffix()}`, type: 'SCIENTIFIC_DEPARTMENT', parentId: college.body.data.id,
    }, w.auth);
    expect(dept.status).toBe(201);
    // The dean + the scientific-affairs vice seat on the COLLEGE unit.
    const dean = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'عميد الكلية التقنية', category: 'ACADEMIC_STAFF' }, w.auth);
    const deanAppointment = await api('POST', '/api/v1/institutional/appointments', {
      personId: dean.body.data.id, positionCode: 'TECHNICAL_COLLEGE_DEAN', orgUnitId: college.body.data.id,
      startDate: '2026-02-01', decisionNumber: 'قرار-عميد-1',
    }, w.auth);
    expect(deanAppointment.status).toBe(201);
    const vice = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'وكيل الشؤون العلمية', category: 'ACADEMIC_STAFF' }, w.auth);
    const viceAppointment = await api('POST', '/api/v1/institutional/appointments', {
      personId: vice.body.data.id, positionCode: 'TECHNICAL_COLLEGE_ACADEMIC_AFFAIRS', orgUnitId: college.body.data.id,
      startDate: '2026-02-01',
    }, w.auth);
    expect(viceAppointment.status).toBe(201);
    // The technical scientific council.
    const council = await api('POST', '/api/v1/governance/councils', {
      nameAr: `المجلس العلمي ${uniqueSuffix()}`, type: 'SCIENTIFIC_COUNCIL', orgUnitId: college.body.data.id,
    }, w.auth);
    expect(council.status).toBe(201);
    // A technical program + a STUDENT learner enrolled.
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `TC-PRG-${uniqueSuffix()}`, nameAr: 'بكالوريوس تقني — تقنية المركبات', kind: 'TECHNICAL',
      credentialTypeCode: 'TECHNICAL_BACHELOR', orgUnitId: dept.body.data.id,
    }, w.auth);
    expect(program.status).toBe(201);
    const learner = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT', learnerNumber: `TC-${uniqueSuffix()}`, fullNameAr: 'طالب الكلية التقنية',
    }, w.auth);
    expect(learner.status).toBe(201);
    await activateProgram(program.body.data.id, w.auth);
    const enrollment = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: learner.body.data.id, programId: program.body.data.id,
    }, w.auth);
    expect(enrollment.status).toBe(201);
  });
});

describe('scenario C — higher technical institute (§15-C)', () => {
  it('runs the diploma pathway: director, departments, council, enrollment, graduation, award', async () => {
    const w = await seedWorld('HIGHER_TECHNICAL_INSTITUTE');
    // The institute director (institution-wide appointment).
    const director = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مدير المعهد التقني العالي', category: 'ACADEMIC_STAFF' }, w.auth);
    const appointment = await api('POST', '/api/v1/institutional/appointments', {
      personId: director.body.data.id, positionCode: 'HIGHER_INSTITUTE_DIRECTOR', startDate: '2026-01-01',
    }, w.auth);
    expect(appointment.status).toBe(201);
    // Academic departments + the scientific council.
    const dept = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `قسم الحاسوب ${uniqueSuffix()}`, type: 'SCIENTIFIC_DEPARTMENT',
    }, w.auth);
    expect(dept.status).toBe(201);
    const council = await api('POST', '/api/v1/governance/councils', {
      nameAr: `المجلس العلمي بالمعهد ${uniqueSuffix()}`, type: 'SCIENTIFIC_COUNCIL',
    }, w.auth);
    expect(council.status).toBe(201);
    // The higher technical diploma program.
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `HTI-PRG-${uniqueSuffix()}`, nameAr: 'الدبلوم التقني العالي — حاسوب', kind: 'TECHNICAL',
      credentialTypeCode: 'HIGHER_TECHNICAL_DIPLOMA', orgUnitId: dept.body.data.id,
    }, w.auth);
    expect(program.status).toBe(201);
    const learner = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT', learnerNumber: `HTI-${uniqueSuffix()}`, fullNameAr: 'طالب المعهد العالي',
    }, w.auth);
    await activateProgram(program.body.data.id, w.auth);
    const enrollment = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: learner.body.data.id, programId: program.body.data.id,
    }, w.auth);
    expect(enrollment.status).toBe(201);
    // Enrollment lifecycle to graduation, then the award.
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'ACTIVE' }, w.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'COMPLETED' }, w.auth);
    const graduated = await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'GRADUATED' }, w.auth);
    expect(graduated.status).toBe(200);
    const award = await api('POST', '/api/v1/academic/credentials/award', {
      learnerProfileId: learner.body.data.id, credentialTypeCode: 'HIGHER_TECHNICAL_DIPLOMA',
      programId: program.body.data.id, programEnrollmentId: enrollment.body.data.id,
      serialNumber: `HTI-SER-${uniqueSuffix()}`,
    }, w.auth);
    expect(award.status).toBe(201);
    expect(award.body.data.learnerProfileId).toBe(learner.body.data.id);
    // Awarding before completion is impossible (§4.4): a fresh learner
    // with a live enrollment is refused.
    const learner2 = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT', learnerNumber: `HTI2-${uniqueSuffix()}`, fullNameAr: 'طالب لم يتخرج',
    }, w.auth);
    const enrollment2 = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: learner2.body.data.id, programId: program.body.data.id,
    }, w.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment2.body.data.id}/status`, { status: 'ACTIVE' }, w.auth);
    const premature = await api('POST', '/api/v1/academic/credentials/award', {
      learnerProfileId: learner2.body.data.id, credentialTypeCode: 'HIGHER_TECHNICAL_DIPLOMA',
      programEnrollmentId: enrollment2.body.data.id,
    }, w.auth);
    expect(premature.status).toBe(409);
    expect(premature.body.error.code).toBe('CREDENTIAL_ENROLLMENT_MISMATCH');
  });
});

describe('scenario E — vocational training center (§5, §15-E)', () => {
  it('trains and certifies a trainee with NO Faculty and NO Department anywhere', async () => {
    const w = await seedWorld('VOCATIONAL_TRAINING_CENTER');
    // Training units and workshops ONLY.
    const trainingUnit = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `وحدة تدريب الكهرباء ${uniqueSuffix()}`, type: 'TRAINING_UNIT',
    }, w.auth);
    expect(trainingUnit.status).toBe(201);
    const workshop = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `ورشة الأسلاك ${uniqueSuffix()}`, type: 'WORKSHOP', parentId: trainingUnit.body.data.id,
    }, w.auth);
    expect(workshop.status).toBe(201);
    // The proof of the premise: zero faculties, zero departments.
    expect(await db().faculty.count({ where: { institutionId: w.institution.id } })).toBe(0);
    expect(await db().department.count({ where: { faculty: { institutionId: w.institution.id } } })).toBe(0);
    // Director + deputy (institution-wide appointments).
    const director = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مدير مركز التكوين والتدريب', category: 'TRAINER' }, w.auth);
    const directorAppointment = await api('POST', '/api/v1/institutional/appointments', {
      personId: director.body.data.id, positionCode: 'TRAINING_CENTER_DIRECTOR', startDate: '2026-01-01',
    }, w.auth);
    expect(directorAppointment.status).toBe(201);
    const deputy = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'نائب مدير المركز', category: 'TRAINER' }, w.auth);
    const deputyAppointment = await api('POST', '/api/v1/institutional/appointments', {
      personId: deputy.body.data.id, positionCode: 'TRAINING_CENTER_DEPUTY', startDate: '2026-01-01',
    }, w.auth);
    expect(deputyAppointment.status).toBe(201);
    // The open basic-formation path (المسار المفتوح).
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `VTC-BF-${uniqueSuffix()}`, nameAr: 'التكوين الأساسي — كهرباء المباني', kind: 'BASIC_FORMATION',
      credentialTypeCode: 'BASIC_FORMATION_CERT', orgUnitId: trainingUnit.body.data.id, durationMonths: 12,
    }, w.auth);
    expect(program.status).toBe(201);
    // A TRAINEE learner — the generalized domain, no student profile.
    const trainee = await api('POST', '/api/v1/academic/learners', {
      category: 'TRAINEE', learnerNumber: `VTC-${uniqueSuffix()}`, fullNameAr: 'المتدرب مفتاح',
      orgUnitId: trainingUnit.body.data.id,
    }, w.auth);
    expect(trainee.status).toBe(201);
    // A TRAINEE cannot enroll in a STUDENT-shaped (TECHNICAL) program.
    const technicalProgram = await api('POST', '/api/v1/academic/programs', {
      code: `VTC-TX-${uniqueSuffix()}`, nameAr: 'برنامج تقني (للطالبين)', kind: 'TECHNICAL',
      credentialTypeCode: 'TECHNICAL_BACHELOR',
    }, w.auth);
    await activateProgram(technicalProgram.body.data.id, w.auth);
    const wrongCategory = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: trainee.body.data.id, programId: technicalProgram.body.data.id,
    }, w.auth);
    expect(wrongCategory.status).toBe(400);
    expect(wrongCategory.body.error.code).toBe('LEARNER_ENROLLMENT_CATEGORY_MISMATCH');
    // The practical placement: host workshop + supervisor trainer.
    await activateProgram(program.body.data.id, w.auth);
    const enrollment = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: trainee.body.data.id, programId: program.body.data.id,
    }, w.auth);
    expect(enrollment.status).toBe(201);
    const placement = await api('POST', '/api/v1/academic/training-placements', {
      learnerProfileId: trainee.body.data.id, programEnrollmentId: enrollment.body.data.id,
      hostOrgUnitId: workshop.body.data.id, supervisorPersonId: deputy.body.data.id,
      startsAt: '2026-03-01', endsAt: '2026-06-30',
    }, w.auth);
    expect(placement.status).toBe(201);
    // Evaluation → completion → the statutory qualification.
    const evaluated = await api('PATCH', `/api/v1/academic/training-placements/${placement.body.data.id}`, {
      status: 'COMPLETED', evaluationSummary: 'أتقن تمديدات الأسلاك', evaluationScore: 88,
    }, w.auth);
    expect(evaluated.status).toBe(200);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'ACTIVE' }, w.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${enrollment.body.data.id}/status`, { status: 'COMPLETED' }, w.auth);
    const award = await api('POST', '/api/v1/academic/credentials/award', {
      learnerProfileId: trainee.body.data.id, credentialTypeCode: 'BASIC_FORMATION_CERT',
      programId: program.body.data.id, programEnrollmentId: enrollment.body.data.id,
      serialNumber: `VTC-SER-${uniqueSuffix()}`,
    }, w.auth);
    expect(award.status).toBe(201);
    expect(award.body.data.status).toBe('AWARDED');
  });

  it('§12 — the progression matrix: basic formation opens intermediate only; vocational training opens nothing', async () => {
    // The shared national id links the person across institutions (the
    // registry pattern: a training-center trainee becomes an institute
    // STUDENT; the institute verifies their elsewhere-minted credential).
    const nationalId = `NID-${uniqueSuffix()}`;
    // World 1: the training center mints the credentials.
    const vtc = await seedWorld('VOCATIONAL_TRAINING_CENTER');
    const trainee = await api('POST', '/api/v1/academic/learners', {
      category: 'TRAINEE', learnerNumber: `P1-${uniqueSuffix()}`, fullNameAr: 'متدرب المسار المفتوح',
      nationalId,
    }, vtc.auth);
    const openPath = await api('POST', '/api/v1/academic/programs', {
      code: `BF-${uniqueSuffix()}`, nameAr: 'تكوين أساسي', kind: 'BASIC_FORMATION',
      credentialTypeCode: 'BASIC_FORMATION_CERT',
    }, vtc.auth);
    await activateProgram(openPath.body.data.id, vtc.auth);
    const openEnrollment = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: trainee.body.data.id, programId: openPath.body.data.id,
    }, vtc.auth);
    expect(openEnrollment.status).toBe(201);
    await api('POST', `/api/v1/academic/program-enrollments/${openEnrollment.body.data.id}/status`, { status: 'ACTIVE' }, vtc.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${openEnrollment.body.data.id}/status`, { status: 'COMPLETED' }, vtc.auth);
    await api('POST', `/api/v1/academic/program-enrollments/${openEnrollment.body.data.id}/status`, { status: 'GRADUATED' }, vtc.auth);
    await api('POST', '/api/v1/academic/credentials/award', {
      learnerProfileId: trainee.body.data.id, credentialTypeCode: 'BASIC_FORMATION_CERT',
      programEnrollmentId: openEnrollment.body.data.id,
    }, vtc.auth);
    // A trainee holding the LIMITED-path certificate (شهادة التدريب المهني).
    const limitedNationalId = `NID-${uniqueSuffix()}`;
    const limited = await api('POST', '/api/v1/academic/learners', {
      category: 'TRAINEE', learnerNumber: `P2-${uniqueSuffix()}`, fullNameAr: 'متدرب المسار المحدود',
      nationalId: limitedNationalId,
    }, vtc.auth);
    await db().awardedCredential.create({
      data: {
        institutionId: vtc.institution.id,
        learnerProfileId: limited.body.data.id,
        credentialTypeId: (await db().credentialType.findUniqueOrThrow({ where: { code: 'VOCATIONAL_TRAINING_CERT' } })).id,
        status: 'AWARDED',
      },
    });

    // World 2: an intermediate technical institute with diploma programs.
    const iti = await seedWorld('INTERMEDIATE_TECHNICAL_INSTITUTE');
    const intermediateDiploma = await api('POST', '/api/v1/academic/programs', {
      code: `ITI-D-${uniqueSuffix()}`, nameAr: 'دبلوم فني متوسط — كهرباء', kind: 'TECHNICAL',
      credentialTypeCode: 'INTERMEDIATE_TECHNICAL_DIPLOMA',
    }, iti.auth);
    await activateProgram(intermediateDiploma.body.data.id, iti.auth);
    const higherDiploma = await api('POST', '/api/v1/academic/programs', {
      code: `ITI-H-${uniqueSuffix()}`, nameAr: 'دبلوم تقني عالٍ — كهرباء', kind: 'TECHNICAL',
      credentialTypeCode: 'HIGHER_TECHNICAL_DIPLOMA',
    }, iti.auth);
    await activateProgram(higherDiploma.body.data.id, iti.auth);

    // The same person registers at the institute as a STUDENT (a
    // trainee at the center, a student at the institute — Law 21/2023
    // Art. 2), carrying the SAME national id.
    const itiStudent = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT', learnerNumber: `ITI-S-${uniqueSuffix()}`, fullNameAr: 'متدرب سابق — طالب معهد الآن',
      nationalId,
    }, iti.auth);
    // §12 positive: the basic-formation certificate admits the holder
    // to the intermediate diploma (م38 → م4(2)).
    const admitted = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: itiStudent.body.data.id, programId: intermediateDiploma.body.data.id,
    }, iti.auth);
    expect(admitted.status).toBe(201);

    // §12 negative: the SAME certificate does not jump straight to the
    // higher diploma (no rule — the ladder goes through the
    // intermediate diploma).
    const skipped = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: itiStudent.body.data.id, programId: higherDiploma.body.data.id,
    }, iti.auth);
    expect(skipped.status).toBe(409);
    expect(skipped.body.error.code).toBe('PROGRESSION_NOT_ALLOWED');

    // §12 negative: the vocational-training certificate (المسار
    // المحدود) opens NOTHING (م38 — لا تسمح بمواصلة الدراسة).
    const itiLimitedStudent = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT', learnerNumber: `ITI-L-${uniqueSuffix()}`, fullNameAr: 'حامل شهادة تدريب مهني',
      nationalId: limitedNationalId,
    }, iti.auth);
    const blocked = await api('POST', '/api/v1/academic/program-enrollments', {
      learnerProfileId: itiLimitedStudent.body.data.id, programId: intermediateDiploma.body.data.id,
    }, iti.auth);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PROGRESSION_NOT_ALLOWED');
  });
});
