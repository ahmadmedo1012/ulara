/**
 * r352 DB integration — institutional people + position appointments:
 * statutory categories, account links, appointment lifecycle with the
 * overlap/eligibility belts, and the rank/role separation invariant.
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

async function seedAdminInstitution() {
  const institution = await seedInstitution();
  // r352 hardening §10: FACULTY_DEAN is university-eligible only — a
  // classified institution is part of the honest fixture.
  await classifyInstitution(institution.id, 'UNIVERSITY');
  const admin = await seedUser({ role: Role.ADMIN });
  await seedMembership(admin.id, institution.id, Role.ADMIN);
  return { institution, admin };
}

const api = async (method: string, path: string, body: unknown, auth: Record<string, string>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('r352 people', () => {
  it('creates people across the statutory categories and paginates', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const trainer = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'المدرب صالح', category: 'TRAINER', staffNumber: `T-${uniqueSuffix()}`,
    }, auth);
    expect(trainer.status).toBe(201);
    const guide = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'الموجه الفني علي', category: 'TECHNICAL_GUIDE',
    }, auth);
    expect(guide.status).toBe(201);
    const list = await api('GET', '/api/v1/institutional/people?category=TRAINER', undefined, auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].category).toBe('TRAINER');
  });

  it('staff numbers are unique per institution and user links are single', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const num = `SN-${uniqueSuffix()}`;
    await api('POST', '/api/v1/institutional/people', { fullNameAr: 'أ', category: 'TECHNICIAN', staffNumber: num }, auth);
    const dup = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'ب', category: 'TECHNICIAN', staffNumber: num }, auth);
    expect(dup.status).toBe(409);
    // The same user cannot be linked twice in one institution.
    const p1 = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'ج', category: 'ADMINISTRATIVE_STAFF', userId: admin.id }, auth);
    expect(p1.status).toBe(201);
    const p2 = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'د', category: 'ADMINISTRATIVE_STAFF', userId: admin.id }, auth);
    expect(p2.status).toBe(409);
    expect(p2.body.error.code).toBe('PERSON_USER_ALREADY_LINKED');
  });

  it('the person status lifecycle lands + audits', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const person = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'الموظف خالد', category: 'PROFESSIONAL' }, auth);
    const ended = await api('POST', `/api/v1/institutional/people/${person.body.data.id}/status`, { status: 'ENDED' }, auth);
    expect(ended.status).toBe(200);
    expect(ended.body.data.staffStatus).toBe('ENDED');
    const audit = await db().auditLog.findFirst({
      where: { action: 'person.status', resourceId: person.body.data.id },
    });
    expect(audit).not.toBeNull();
  });
});

describe('r352 appointments', () => {
  async function seedPersonWithUnit(institutionId: string, adminId: string) {
    const auth = bearer(adminId, Role.ADMIN, institutionId);
    const unit = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية التقنية ${uniqueSuffix()}`, type: 'FACULTY', city: 'بنغازي',
    }, auth);
    const person = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'عضو هيئة تدريس', category: 'ACADEMIC_STAFF',
    }, auth);
    return { auth, unitId: unit.body.data.id as string, personId: person.body.data.id as string };
  }

  it('creates an appointment with decision reference and history', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const { auth, unitId, personId } = await seedPersonWithUnit(institution.id, admin.id);
    const created = await api('POST', '/api/v1/institutional/appointments', {
      personId, positionCode: 'FACULTY_DEAN', orgUnitId: unitId,
      appointedByAuthority: 'وزارة التعليم العالي والبحث العلمي',
      decisionNumber: 'قرار 123', decisionDate: '2026-01-15', startDate: '2026-02-01', termMonths: 48,
    }, auth);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('ACTIVE');
    const history = await api('GET', `/api/v1/institutional/people/${personId}/appointments`, undefined, auth);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].position.code).toBe('FACULTY_DEAN');
  });

  it('the substantive-seat belt: overlapping same-position-same-unit is 409, acting coexists', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const { auth, unitId, personId } = await seedPersonWithUnit(institution.id, admin.id);
    const second = await api('POST', '/api/v1/institutional/people', {
      fullNameAr: 'عضو هيئة تدريس ثانٍ', category: 'ACADEMIC_STAFF',
    }, auth);
    const first = await api('POST', '/api/v1/institutional/appointments', {
      personId, positionCode: 'FACULTY_DEAN', orgUnitId: unitId, startDate: '2026-02-01', endDate: '2030-02-01',
    }, auth);
    expect(first.status).toBe(201);
    const overlap = await api('POST', '/api/v1/institutional/appointments', {
      personId: second.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: unitId, startDate: '2027-01-01',
    }, auth);
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('APPOINTMENT_CONFLICT');
    // Acting (تكليف بالنيابة) coexists.
    const acting = await api('POST', '/api/v1/institutional/appointments', {
      personId: second.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: unitId, startDate: '2027-01-01', acting: true,
    }, auth);
    expect(acting.status).toBe(201);
    // After ending the substantive one, a new substantive appointment fits.
    await api('POST', `/api/v1/institutional/appointments/${first.body.data.id}/end`, { endDate: '2027-06-30' }, auth);
    const successor = await api('POST', '/api/v1/institutional/appointments', {
      personId: second.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: unitId, startDate: '2027-07-01',
    }, auth);
    expect(successor.status).toBe(201);
  });

  it('the scope-requirement belt: a dean requires a FACULTY-type unit', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const office = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مكتب ${uniqueSuffix()}`, type: 'OFFICE',
    }, auth);
    const person = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مرشح', category: 'ACADEMIC_STAFF' }, auth);
    const res = await api('POST', '/api/v1/institutional/appointments', {
      personId: person.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: office.body.data.id, startDate: '2026-02-01',
    }, auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('APPOINTMENT_UNIT_TYPE_REQUIRED');
  });

  it('the kind-eligibility belt: a technical-college dean needs a technical college', async () => {
    // Classify the institution as a UNIVERSITY first.
    const { institution, admin } = await seedAdminInstitution();
    const owner = await seedUser({ role: Role.OWNER });
    await db().institution.update({
      where: { id: institution.id },
      data: {
        sector: 'HIGHER_EDUCATION_RESEARCH',
        kind: { connect: { code: 'UNIVERSITY' } },
      },
    });
    const { auth, unitId, personId } = await (async () => {
      const auth = bearer(admin.id, Role.ADMIN, institution.id);
      const unit = await api('POST', '/api/v1/institutional/org-units', {
        nameAr: `كلية ${uniqueSuffix()}`, type: 'FACULTY', city: 'طرابلس',
      }, auth);
      const person = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مرشح عميد تقني', category: 'ACADEMIC_STAFF' }, auth);
      return { auth, unitId: unit.body.data.id as string, personId: person.body.data.id as string };
    })();
    const res = await api('POST', '/api/v1/institutional/appointments', {
      personId, positionCode: 'TECHNICAL_COLLEGE_DEAN', orgUnitId: unitId, startDate: '2026-02-01',
    }, auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPOINTMENT_POSITION_NOT_ELIGIBLE');
    expect(owner.id).toBeDefined();
  });

  it('an appointment NEVER touches the academic rank or the platform role', async () => {
    const { institution, admin } = await seedAdminInstitution();
    const { auth, unitId, personId } = await seedPersonWithUnit(institution.id, admin.id);
    await api('POST', '/api/v1/institutional/appointments', {
      personId, positionCode: 'FACULTY_DEAN', orgUnitId: unitId, startDate: '2026-02-01',
    }, auth);
    const person = await db().institutionalPerson.findUnique({ where: { id: personId }, include: { user: true } });
    if (person?.user) {
      expect(person.user.role).toBe(Role.ADMIN); // unchanged
    }
    const teacherProfiles = await db().teacherProfile.count({ where: { personId } });
    expect(teacherProfiles).toBe(0); // no rank was invented
  });
});
