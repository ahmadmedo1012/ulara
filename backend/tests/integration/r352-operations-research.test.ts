/**
 * r352 DB integration — physical facilities, equipment with program
 * links, work orders, reservations (overlap belt), safety incidents,
 * and institutional research projects/outputs.
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

describe('r352 operations (facilities & equipment)', () => {
  async function setup() {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const workshop = await api('POST', '/api/v1/operations/facilities', {
      nameAr: `ورشة الكهرباء ${uniqueSuffix()}`, type: 'WORKSHOP', code: `WS-${uniqueSuffix()}`, capacity: 24,
    }, auth);
    expect(workshop.status).toBe(201);
    return { institution, admin, auth, workshopId: workshop.body.data.id as string };
  }

  it('facility + equipment + program link + work order chain', async () => {
    const s = await setup();
    const technician = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'الفني المرزمي', category: 'TECHNICIAN' }, s.auth);
    const equipment = await api('POST', '/api/v1/operations/equipment', {
      nameAr: 'مخرطة CNC', code: `EQ-${uniqueSuffix()}`, facilityId: s.workshopId,
      serialNumber: `SN-${uniqueSuffix()}`, responsiblePersonId: technician.body.data.id,
      condition: 'GOOD', value: 120000,
    }, s.auth);
    expect(equipment.status).toBe(201);
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `MFG-${uniqueSuffix()}`, nameAr: 'دبلوم التصنيع الرقمي', kind: 'TECHNICAL',
      credentialTypeCode: 'HIGHER_TECHNICAL_DIPLOMA',
    }, s.auth);
    const link = await api('POST', `/api/v1/operations/equipment/${equipment.body.data.id}/programs`, {
      programId: program.body.data.id,
    }, s.auth);
    expect(link.status).toBe(201);
    const workOrder = await api('POST', '/api/v1/operations/work-orders', {
      titleAr: 'صيانة دورية للمخرطة', kind: 'PREVENTIVE', equipmentId: equipment.body.data.id,
      scheduledDate: '2026-05-01', assignedPersonId: technician.body.data.id,
    }, s.auth);
    expect(workOrder.status).toBe(201);
    await api('PATCH', `/api/v1/operations/work-orders/${workOrder.body.data.id}`, { status: 'IN_PROGRESS' }, s.auth);
    const completed = await api('PATCH', `/api/v1/operations/work-orders/${workOrder.body.data.id}`, {
      status: 'COMPLETED', cost: 850,
    }, s.auth);
    expect(completed.status).toBe(200);
    const linkedPrograms = await db().equipmentProgramSupport.count({ where: { equipmentId: equipment.body.data.id } });
    expect(linkedPrograms).toBe(1);
  });

  it('reservation overlap belt + window validation', async () => {
    const s = await setup();
    const r1 = await api('POST', '/api/v1/operations/reservations', {
      facilityId: s.workshopId, purpose: 'تدريب الفوج أ', startsAt: '2026-06-01T08:00:00Z', endsAt: '2026-06-01T11:00:00Z',
    }, s.auth);
    expect(r1.status).toBe(201);
    const overlap = await api('POST', '/api/v1/operations/reservations', {
      facilityId: s.workshopId, purpose: 'تدريب الفوج ب', startsAt: '2026-06-01T10:00:00Z', endsAt: '2026-06-01T12:00:00Z',
    }, s.auth);
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('RESERVATION_OVERLAP');
    const invalidWindow = await api('POST', '/api/v1/operations/reservations', {
      facilityId: s.workshopId, purpose: 'نافذة معكوسة', startsAt: '2026-06-02T12:00:00Z', endsAt: '2026-06-02T08:00:00Z',
    }, s.auth);
    expect(invalidWindow.status).toBe(400);
    expect(invalidWindow.body.error.code).toBe('RESERVATION_WINDOW_INVALID');
    // After rejecting the first reservation, its window frees up.
    await api('PATCH', `/api/v1/operations/reservations/${r1.body.data.id}`, { status: 'REJECTED' }, s.auth);
    const afterReject = await api('POST', '/api/v1/operations/reservations', {
      facilityId: s.workshopId, purpose: 'تدريب الفوج ب', startsAt: '2026-06-01T10:00:00Z', endsAt: '2026-06-01T12:00:00Z',
    }, s.auth);
    expect(afterReject.status).toBe(201);
  });

  it('safety incidents record and resolve', async () => {
    const s = await setup();
    const incident = await api('POST', '/api/v1/operations/safety-incidents', {
      kind: 'INCIDENT', severity: 'MAJOR', titleAr: 'إصابة أثناء التدريب', facilityId: s.workshopId, occurredAt: '2026-06-15T09:30:00Z',
    }, s.auth);
    expect(incident.status).toBe(201);
    const resolved = await api('PATCH', `/api/v1/operations/safety-incidents/${incident.body.data.id}`, {
      status: 'RESOLVED', resolutionNotes: 'تمت المعالجة وتحديث إجراءات السلامة', resolvedAt: '2026-06-20',
    }, s.auth);
    expect(resolved.status).toBe(200);
  });
});

describe('r352 research projects', () => {
  it('project lifecycle + members + output bridging to the student-paper workflow', async () => {
    const institution = await seedInstitution();
    // §11: RESEARCH_CENTER units require the HIGHER_EDUCATION_RESEARCH sector.
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const center = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `مركز أبحاث الطاقة ${uniqueSuffix()}`, type: 'RESEARCH_CENTER',
    }, auth);
    const pi = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'الباحث الرئيس', category: 'ACADEMIC_STAFF' }, auth);
    const project = await api('POST', '/api/v1/research-projects', {
      titleAr: 'تقنيات الطاقة الشمسية في البيئة الليبية', code: `RES-${uniqueSuffix()}`,
      orgUnitId: center.body.data.id, principalInvestigatorId: pi.body.data.id, startsAt: '2026-03-01',
    }, auth);
    expect(project.status).toBe(201);
    const skip = await api('PATCH', `/api/v1/research-projects/${project.body.data.id}`, { status: 'ACTIVE' }, auth);
    expect(skip.status).toBe(409);
    await api('PATCH', `/api/v1/research-projects/${project.body.data.id}`, { status: 'APPROVED' }, auth);
    await api('PATCH', `/api/v1/research-projects/${project.body.data.id}`, { status: 'ACTIVE' }, auth);
    const member = await api('POST', `/api/v1/research-projects/${project.body.data.id}/members`, {
      personId: pi.body.data.id, role: 'CO_INVESTIGATOR', allocationPct: 40,
    }, auth);
    expect(member.status).toBe(201);
    // A student research paper from the EXISTING workflow bridges in.
    const student = await seedUser({ role: Role.STUDENT });
    const paper = await db().researchPaper.create({
      data: { studentId: student.id, institutionId: institution.id, title: 'ورقة الطالب' },
    });
    const output = await api('POST', '/api/v1/research-outputs', {
      type: 'PUBLICATION', title: 'منشور مبدئي', projectId: project.body.data.id, personId: pi.body.data.id, researchPaperId: paper.id,
    }, auth);
    expect(output.status).toBe(201);
    const detail = await api('GET', `/api/v1/research-projects/${project.body.data.id}`, undefined, auth);
    expect(detail.body.data.members).toHaveLength(1);
    expect(detail.body.data.outputs[0].researchPaper.id).toBe(paper.id);
  });
});

describe('r363 P6 — the facilityId slice filter (audit #3)', () => {
  it('work-orders and safety-incidents read their own facility slice', async () => {
    const s = await setup();
    const lab = await api('POST', '/api/v1/operations/facilities', {
      nameAr: `مختبر الدوائر ${uniqueSuffix()}`, type: 'LAB', code: `LB-${uniqueSuffix()}`, capacity: 12,
    }, s.auth);
    expect(lab.status).toBe(201);

    const woWorkshop = await api('POST', '/api/v1/operations/work-orders', {
      titleAr: 'أمر في الورشة', kind: 'PREVENTIVE', facilityId: s.workshopId,
    }, s.auth);
    const woLab = await api('POST', '/api/v1/operations/work-orders', {
      titleAr: 'أمر في المختبر', kind: 'CORRECTIVE', facilityId: lab.body.data.id,
    }, s.auth);
    expect(woWorkshop.status).toBe(201);
    expect(woLab.status).toBe(201);

    const slice = await api('GET', `/api/v1/operations/work-orders?facilityId=${s.workshopId}`, undefined, s.auth);
    expect(slice.status).toBe(200);
    expect(slice.body.data).toHaveLength(1);
    expect(slice.body.data[0].facility.id).toBe(s.workshopId);

    const unfiltered = await api('GET', '/api/v1/operations/work-orders', undefined, s.auth);
    expect(unfiltered.body.data).toHaveLength(2);

    const empty = await api('GET', `/api/v1/operations/work-orders?facilityId=cuidnotmatching`, undefined, s.auth);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toHaveLength(0);

    const bad = await api('GET', '/api/v1/operations/work-orders?facilityId=not-a-cuid', undefined, s.auth);
    expect(bad.status).toBe(400);

    const incident = await api('POST', '/api/v1/operations/safety-incidents', {
      kind: 'INCIDENT', titleAr: 'حادثة في الورشة', facilityId: s.workshopId, occurredAt: '2026-05-02T09:00:00Z',
    }, s.auth);
    expect(incident.status).toBe(201);
    const incidentSlice = await api('GET', `/api/v1/operations/safety-incidents?facilityId=${s.workshopId}`, undefined, s.auth);
    expect(incidentSlice.body.data).toHaveLength(1);
    expect(incidentSlice.body.data[0].facility.id).toBe(s.workshopId);
    const incidentEmpty = await api('GET', `/api/v1/operations/safety-incidents?facilityId=${lab.body.data.id}`, undefined, s.auth);
    expect(incidentEmpty.body.data).toHaveLength(0);
  });
});
