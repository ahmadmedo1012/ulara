/**
 * r352 DB integration — councils & committees: the full governance
 * flow (council → membership → meeting → attendance → agenda →
 * resolution → minutes DRAFT→APPROVED→SIGNED) with transition belts.
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

describe('r352 councils — the governance flow', () => {
  async function setup() {
    const institution = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const council = await api('POST', '/api/v1/governance/councils', {
      nameAr: `المجلس العلمي ${uniqueSuffix()}`, type: 'SCIENTIFIC_COUNCIL', legalBasis: 'قانون 21/2023 م28',
    }, auth);
    expect(council.status).toBe(201);
    const personA = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'الرئيس', category: 'ACADEMIC_STAFF' }, auth);
    const personB = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'العضو', category: 'ACADEMIC_STAFF' }, auth);
    const personC = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'أمين المجلس', category: 'ADMINISTRATIVE_STAFF' }, auth);
    return { institution, admin, auth, councilId: council.body.data.id as string, a: personA.body.data.id as string, b: personB.body.data.id as string, c: personC.body.data.id as string };
  }

  it('memberships: active-duplicate blocked, end + history', async () => {
    const s = await setup();
    const add = await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, {
      personId: s.a, role: 'CHAIR', startDate: '2026-01-01',
    }, s.auth);
    expect(add.status).toBe(201);
    const dup = await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, {
      personId: s.a, role: 'MEMBER', startDate: '2026-01-01',
    }, s.auth);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('COUNCIL_MEMBERSHIP_ACTIVE_EXISTS');
    const memberships = await db().councilMembership.findMany({ where: { councilId: s.councilId } });
    const ended = await api('POST', `/api/v1/governance/council-memberships/${memberships[0]!.id}/end`, { endDate: '2026-12-31' }, s.auth);
    expect(ended.status).toBe(200);
    const readd = await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, {
      personId: s.a, role: 'MEMBER', startDate: '2027-01-01',
    }, s.auth);
    expect(readd.status).toBe(201);
  });

  it('meeting → attendance → agenda → resolution → minutes, with belt checks', async () => {
    const s = await setup();
    await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, { personId: s.a, role: 'CHAIR', startDate: '2026-01-01' }, s.auth);
    await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, { personId: s.b, role: 'MEMBER', startDate: '2026-01-01' }, s.auth);
    await api('POST', `/api/v1/governance/councils/${s.councilId}/members`, { personId: s.c, role: 'SECRETARY', startDate: '2026-01-01' }, s.auth);

    const meeting = await api('POST', `/api/v1/governance/councils/${s.councilId}/meetings`, {
      scheduledAt: '2026-03-01T10:00:00Z', location: 'قاعة الاجتماعات', seqNumber: 1,
    }, s.auth);
    expect(meeting.status).toBe(201);
    const meetingId = meeting.body.data.id as string;
    const seqDup = await api('POST', `/api/v1/governance/councils/${s.councilId}/meetings`, {
      scheduledAt: '2026-04-01T10:00:00Z', seqNumber: 1,
    }, s.auth);
    expect(seqDup.status).toBe(409);

    // Attendance bulk upsert.
    const attendance = await api('POST', `/api/v1/governance/meetings/${meetingId}/attendance`, {
      records: [
        { personId: s.a, status: 'PRESENT' },
        { personId: s.b, status: 'ABSENT' },
        { personId: s.c, status: 'LATE' },
      ],
    }, s.auth);
    expect(attendance.status).toBe(200);
    expect(attendance.body.data).toHaveLength(3);

    // Agenda + resolution.
    const item = await api('POST', `/api/v1/governance/meetings/${meetingId}/agenda-items`, {
      orderNo: 1, titleAr: 'مناقشة الخطة السنوية',
    }, s.auth);
    expect(item.status).toBe(201);
    const resolution = await api('POST', `/api/v1/governance/meetings/${meetingId}/resolutions`, {
      agendaItemId: item.body.data.id, kind: 'RESOLUTION', textAr: 'يُعتمد…', dueDate: '2026-06-01', ownerPersonId: s.b,
    }, s.auth);
    expect(resolution.status).toBe(201);
    const illegal = await api('PATCH', `/api/v1/governance/resolutions/${resolution.body.data.id}`, { status: 'IMPLEMENTED' }, s.auth);
    expect(illegal.status).toBe(409);
    expect(illegal.body.error.code).toBe('RESOLUTION_INVALID_TRANSITION');
    const approved = await api('PATCH', `/api/v1/governance/resolutions/${resolution.body.data.id}`, { status: 'APPROVED' }, s.auth);
    expect(approved.status).toBe(200);
    const implemented = await api('PATCH', `/api/v1/governance/resolutions/${resolution.body.data.id}`, { status: 'IMPLEMENTED', completionRef: 'تنفيذ 45' }, s.auth);
    expect(implemented.status).toBe(200);

    // Minutes: hold the meeting first, then draft → approve → sign.
    const earlyMinutes = await api('PUT', `/api/v1/governance/meetings/${meetingId}/minutes`, { contentAr: 'محضر مبكر' }, s.auth);
    expect(earlyMinutes.status).toBe(409); // meeting not HELD yet
    await api('PATCH', `/api/v1/governance/meetings/${meetingId}`, { status: 'HELD' }, s.auth);
    const minutes = await api('PUT', `/api/v1/governance/meetings/${meetingId}/minutes`, { contentAr: 'محضر الاجتماع الأول…' }, s.auth);
    expect(minutes.status).toBe(200);
    expect(minutes.body.data.status).toBe('DRAFT');
    const signEarly = await api('POST', `/api/v1/governance/meetings/${meetingId}/minutes/sign`, { signedByPersonId: s.a }, s.auth);
    expect(signEarly.status).toBe(409);
    expect(signEarly.body.error.code).toBe('MINUTES_INVALID_TRANSITION');
    await api('POST', `/api/v1/governance/meetings/${meetingId}/minutes/approve`, { approvedByPersonId: s.c }, s.auth);
    const signed = await api('POST', `/api/v1/governance/meetings/${meetingId}/minutes/sign`, { signedByPersonId: s.a }, s.auth);
    expect(signed.status).toBe(200);
    expect(signed.body.data.status).toBe('SIGNED');
    // Signed minutes are immutable.
    const editSigned = await api('PUT', `/api/v1/governance/meetings/${meetingId}/minutes`, { contentAr: 'تعديل بعد التوقيع' }, s.auth);
    expect(editSigned.status).toBe(409);

    // Meeting detail carries everything; the flow is audited.
    const detail = await api('GET', `/api/v1/governance/meetings/${meetingId}`, undefined, s.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.attendance).toHaveLength(3);
    expect(detail.body.data.minutes.status).toBe('SIGNED');
    const auditCount = await db().auditLog.count({ where: { institutionId: s.institution.id, action: { startsWith: 'meeting.' } } });
    expect(auditCount).toBeGreaterThan(0);
  });

  it('council documents are metadata references; cross-council meeting rejected', async () => {
    const s = await setup();
    const doc = await api('POST', `/api/v1/governance/councils/${s.councilId}/documents`, {
      titleAr: 'الميثاق', fileUrl: 'https://example.org/charter.pdf',
    }, s.auth);
    expect(doc.status).toBe(201);
    const otherCouncil = await api('POST', '/api/v1/governance/councils', {
      nameAr: `مجلس آخر ${uniqueSuffix()}`, type: 'STANDING_COMMITTEE',
    }, s.auth);
    const meeting = await api('POST', `/api/v1/governance/councils/${otherCouncil.body.data.id}/meetings`, {
      scheduledAt: '2026-05-01T10:00:00Z',
    }, s.auth);
    const wrongMeeting = await api('POST', `/api/v1/governance/councils/${s.councilId}/documents`, {
      titleAr: 'وثيقة خطأ', meetingId: meeting.body.data.id,
    }, s.auth);
    expect(wrongMeeting.status).toBe(400);
  });
});
