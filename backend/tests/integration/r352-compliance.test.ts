/**
 * r352 DB integration — compliance: external accreditation, licenses,
 * inspections, findings + corrective actions, internal self-assessment
 * (the explicit-only QUALITY_INTERNAL_MANAGE gate), and evidence.
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

describe('r352 compliance', () => {
  it('accreditation lifecycle + program-scope validation', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const accreditation = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
    }, auth);
    expect(accreditation.status).toBe(201);
    // PENDING → GRANTED directly is illegal.
    const skip = await api('PATCH', `/api/v1/compliance/accreditations/${accreditation.body.data.id}`, { status: 'GRANTED' }, auth);
    expect(skip.status).toBe(409);
    await api('PATCH', `/api/v1/compliance/accreditations/${accreditation.body.data.id}`, { status: 'IN_REVIEW' }, auth);
    const granted = await api('PATCH', `/api/v1/compliance/accreditations/${accreditation.body.data.id}`, {
      status: 'GRANTED', decisionNumber: 'قرار الاعتماد 88', effectiveFrom: '2026-01-01', effectiveTo: '2031-01-01',
    }, auth);
    expect(granted.status).toBe(200);
    // PROGRAM scope with a foreign program id is rejected.
    const otherInstitution = await seedInstitution();
    const otherProgram = await db().program.create({
      data: { institutionId: otherInstitution.id, code: `X-${uniqueSuffix()}`, nameAr: 'برنامج غريب', kind: 'TECHNICAL' },
    });
    const badScope = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'PROGRAM', authorityCode: 'NATIONAL_QA_CENTER', scopeType: 'PROGRAM', programId: otherProgram.id,
    }, auth);
    expect(badScope.status).toBe(400);
    expect(badScope.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
  });

  it('inspection → finding → corrective action chain with severity and due dates', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const inspection = await api('POST', '/api/v1/compliance/inspections', {
      authorityCode: 'MINISTRY_HESR', kind: 'MINISTRY', scheduledAt: '2026-04-01T09:00:00Z',
    }, auth);
    expect(inspection.status).toBe(201);
    await api('PATCH', `/api/v1/compliance/inspections/${inspection.body.data.id}`, { status: 'IN_PROGRESS' }, auth);
    await api('PATCH', `/api/v1/compliance/inspections/${inspection.body.data.id}`, {
      status: 'COMPLETED', conductedAt: '2026-04-01T14:00:00Z', summary: 'زيارة دورية',
    }, auth);
    const finding = await api('POST', '/api/v1/compliance/findings', {
      severity: 'MAJOR', titleAr: 'نقص في سجلات الصيانة', inspectionId: inspection.body.data.id, dueDate: '2026-08-01',
    }, auth);
    expect(finding.status).toBe(201);
    const person = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مسؤول التصحيح', category: 'TECHNICIAN' }, auth);
    const plan = await api('POST', `/api/v1/compliance/findings/${finding.body.data.id}/corrective-actions`, {
      planText: 'استكمال السجلات وتحديث نظام الصيانة', ownerPersonId: person.body.data.id, targetDate: '2026-07-15',
    }, auth);
    expect(plan.status).toBe(201);
    const illegal = await api('PATCH', `/api/v1/compliance/corrective-actions/${plan.body.data.id}`, { status: 'VERIFIED' }, auth);
    expect(illegal.status).toBe(409);
    await api('PATCH', `/api/v1/compliance/corrective-actions/${plan.body.data.id}`, { status: 'IN_PROGRESS' }, auth);
    await api('PATCH', `/api/v1/compliance/corrective-actions/${plan.body.data.id}`, { status: 'COMPLETED' }, auth);
    const verified = await api('PATCH', `/api/v1/compliance/corrective-actions/${plan.body.data.id}`, {
      status: 'VERIFIED', verificationRef: 'تحقق 12',
    }, auth);
    expect(verified.status).toBe(200);
    await api('PATCH', `/api/v1/compliance/findings/${finding.body.data.id}`, { status: 'ACKNOWLEDGED' }, auth);
    await api('PATCH', `/api/v1/compliance/findings/${finding.body.data.id}`, { status: 'IN_REMEDIATION' }, auth);
    await api('PATCH', `/api/v1/compliance/findings/${finding.body.data.id}`, { status: 'RESOLVED' }, auth);
    const closed = await api('PATCH', `/api/v1/compliance/findings/${finding.body.data.id}`, { status: 'CLOSED' }, auth);
    expect(closed.status).toBe(200);
  });

  it('license records (technical license + operating permit) with lifecycle', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const license = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'TECHNICAL_LICENSE', authorityCode: 'NATIONAL_QA_CENTER',
      licenseNumber: `TL-${uniqueSuffix()}`, issuedAt: '2026-02-01', expiresAt: '2029-02-01',
    }, auth);
    expect(license.status).toBe(201);
    const activated = await api('PATCH', `/api/v1/compliance/licenses/${license.body.data.id}`, { status: 'ACTIVE' }, auth);
    expect(activated.status).toBe(200);
    const permit = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'OPERATING_PERMIT', authorityCode: 'MINISTRY_HESR', licenseNumber: `OP-${uniqueSuffix()}`,
    }, auth);
    expect(permit.status).toBe(201);
    const list = await api('GET', '/api/v1/compliance/licenses?kind=TECHNICAL_LICENSE', undefined, auth);
    expect(list.body.data).toHaveLength(1);
  });

  it('internal self-assessments need the explicit QUALITY_INTERNAL_MANAGE grant', async () => {
    const institution = await seedInstitution();
    const quality = await seedUser({ role: Role.QUALITY });
    await seedMembership(quality.id, institution.id, Role.QUALITY);
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const qualityAuth = bearer(quality.id, Role.QUALITY, institution.id);
    const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
    // QUALITY defaults do NOT include the write capability (D8).
    const denied = await api('POST', '/api/v1/compliance/self-assessments', {
      periodLabel: '2026-Q1',
    }, qualityAuth);
    expect(denied.status).toBe(403);
    // ADMIN defaults do NOT include it either.
    const deniedAdmin = await api('POST', '/api/v1/compliance/self-assessments', {
      periodLabel: '2026-Q1',
    }, adminAuth);
    expect(deniedAdmin.status).toBe(403);
    // The explicit UserPermission grant unlocks it (institution-scoped).
    await db().userPermission.create({
      data: {
        userId: quality.id, capability: 'QUALITY_INTERNAL_MANAGE',
        institutionId: institution.id, grant: true, reason: 'مكتب ضمان الجودة — منح صريح',
      },
    });
    const created = await api('POST', '/api/v1/compliance/self-assessments', {
      periodLabel: '2026-Q1', summary: 'التقييم الذاتي الأول',
    }, qualityAuth);
    expect(created.status).toBe(201);
    await api('PATCH', `/api/v1/compliance/self-assessments/${created.body.data.id}`, { status: 'SUBMITTED' }, qualityAuth);
    const approved = await api('PATCH', `/api/v1/compliance/self-assessments/${created.body.data.id}`, { status: 'UNDER_REVIEW' }, qualityAuth);
    expect(approved.status).toBe(200);
  });

  it('evidence attaches to in-institution owners only', async () => {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const accreditation = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
    }, auth);
    const evidence = await api('POST', '/api/v1/compliance/evidence', {
      ownerType: 'ExternalAccreditation', ownerId: accreditation.body.data.id,
      titleAr: 'تقرير الدراسة الذاتية', documentRef: 'SS-2026-01',
    }, auth);
    expect(evidence.status).toBe(201);
    const otherInstitution = await seedInstitution();
    const foreignAccreditation = await db().externalAccreditation.create({
      data: { institutionId: otherInstitution.id, authorityId: (await db().regulatoryAuthority.findUniqueOrThrow({ where: { code: 'NATIONAL_QA_CENTER' } })).id, type: 'INSTITUTIONAL' },
    });
    const foreign = await api('POST', '/api/v1/compliance/evidence', {
      ownerType: 'ExternalAccreditation', ownerId: foreignAccreditation.id, titleAr: 'دخيل',
    }, auth);
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.code).toBe('EVIDENCE_OWNER_INVALID');
  });
});
