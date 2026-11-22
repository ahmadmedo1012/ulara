/**
 * r352 — the institutional API client's wire contract: paths, params
 * and methods byte-matched against the backend agent's published
 * contract (docs/redesign/r352/institutional-backend/API-CONTRACT.md).
 * The transport seam (api.defaults.adapter) records every call — the
 * same pattern api-session.test.ts established.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { api, type ApiRequestConfig, type ApiResponse } from '../../src/lib/api';
import { queryClient } from '../../src/lib/queryClient';
import { useAuthStore } from '../../src/stores/auth.store';
import * as instApi from '../../src/lib/institutional/api';
import { cleanParams } from '../../src/lib/institutional/api';

/** Recorded request + the canned envelope the adapter answers with. */
const calls: Array<{ method?: string; url: string; params?: unknown; data?: unknown }> = [];

// The wire envelope is { data: T } — the helper's claim must match it
// (TS2322 otherwise: '{ data: T }' is not assignable to bare 'T').
function ok<T>(config: ApiRequestConfig, data: T): ApiResponse<{ data: T }> {
  return { data: { data }, status: 200, statusText: 'OK', headers: {}, config };
}

beforeEach(() => {
  calls.length = 0;
  useAuthStore.setState({ user: null, accessToken: null });
  queryClient.clear();
  api.defaults.adapter = (config) => {
    calls.push({
      method: config.method,
      url: config.url ?? '',
      params: config.params,
      data: config.data,
    });
    return Promise.resolve(ok(config, { echoed: true }));
  };
});

describe('r352 catalog endpoints (session-level, contract §1)', () => {
  it('calls the five catalog paths verbatim', async () => {
    await instApi.listInstitutionTypes();
    await instApi.listAuthorities();
    await instApi.listCredentialTypes();
    await instApi.listPositionTemplates();
    await instApi.listCriteriaSets();
    expect(calls.map((c) => c.url)).toEqual([
      '/catalog/institution-types',
      '/catalog/regulatory-authorities',
      '/catalog/credential-types',
      '/catalog/position-templates',
      '/catalog/accreditation-criteria-sets',
    ]);
    expect(calls.every((c) => c.method === 'get')).toBe(true);
  });
});

describe('r352 institution-scoped paths (contract §2–§11)', () => {
  it('builds the org-unit family exactly (list/tree/create/get/patch/status)', async () => {
    await instApi.listOrgUnits({ type: 'FACULTY', q: 'قسم', page: 2, limit: 20 });
    await instApi.getOrgUnitTree();
    await instApi.createOrgUnit({ nameAr: 'كلية الحاسب', type: 'FACULTY', city: 'طرابلس' });
    await instApi.getOrgUnit('unit-1');
    await instApi.updateOrgUnit('unit-1', { nameAr: 'كلية الهندسة' });
    await instApi.setOrgUnitStatus('unit-1', 'DISSOLVED', '2026-01-01');

    expect(calls[0]).toMatchObject({ method: 'get', url: '/institutional/org-units' });
    expect(calls[0]!.params).toEqual({ type: 'FACULTY', q: 'قسم', page: 2, limit: 20 });
    expect(calls[1]!.url).toBe('/institutional/org-units/tree');
    expect(calls[2]).toMatchObject({ method: 'post', url: '/institutional/org-units' });
    expect(calls[2]!.data).toEqual({ nameAr: 'كلية الحاسب', type: 'FACULTY', city: 'طرابلس' });
    expect(calls[3]!.url).toBe('/institutional/org-units/unit-1');
    expect(calls[4]).toMatchObject({ method: 'patch', url: '/institutional/org-units/unit-1' });
    expect(calls[5]).toMatchObject({
      method: 'post', url: '/institutional/org-units/unit-1/status',
      data: { status: 'DISSOLVED', dissolvedAt: '2026-01-01' },
    });
  });

  it('builds the governance family exactly (councils/meetings/minutes lifecycle)', async () => {
    await instApi.listCouncils({ type: 'SCIENTIFIC_COUNCIL' });
    await instApi.getCouncil('c-1');
    await instApi.addCouncilMember('c-1', {
      personId: 'p-1', role: 'CHAIR', startDate: '2026-01-01',
    });
    await instApi.listMeetings('c-1');
    await instApi.getMeeting('m-1');
    await instApi.saveAttendance('m-1', [{ personId: 'p-1', status: 'PRESENT' }]);
    await instApi.getMinutes('m-1');
    await instApi.saveMinutes('m-1', 'نص المحضر');
    await instApi.approveMinutes('m-1', 'p-2');
    await instApi.signMinutes('m-1', 'p-3');

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /governance/councils',
      'get /governance/councils/c-1',
      'post /governance/councils/c-1/members',
      'get /governance/councils/c-1/meetings',
      'get /governance/meetings/m-1',
      'post /governance/meetings/m-1/attendance',
      'get /governance/meetings/m-1/minutes',
      'put /governance/meetings/m-1/minutes',
      'post /governance/meetings/m-1/minutes/approve',
      'post /governance/meetings/m-1/minutes/sign',
    ]);
    expect(calls[5]!.data).toEqual({ records: [{ personId: 'p-1', status: 'PRESENT' }] });
    expect(calls[7]!.data).toEqual({ contentAr: 'نص المحضر' });
    expect(calls[8]!.data).toEqual({ approvedByPersonId: 'p-2' });
  });

  it('builds the academic family exactly (programs/versions/courses/enrollments/credentials)', async () => {
    await instApi.listPrograms({ kind: 'TECHNICAL' });
    await instApi.createProgramVersion('pr-1', { label: 'خطة 2027' });
    await instApi.listVersionCourses('v-1');
    await instApi.addVersionCourse('v-1', { courseId: 'c-1', kind: 'CORE' });
    await instApi.removeVersionCourse('v-1', 'c-1');
    await instApi.listEnrollments({ programId: 'pr-1' });
    await instApi.setEnrollmentStatus('e-1', 'GRADUATED', '2026-06-01');
    // cf23cc689: the learner register is the generalized profile — the
    // credential family keys on learnerProfileId (the student profile is
    // one member), matching the backend contract.
    await instApi.listCredentials({ learnerProfileId: 's-1' });
    await instApi.awardCredential({
      learnerProfileId: 's-1', credentialTypeCode: 'TECHNICAL_BACHELOR',
    });
    await instApi.revokeCredential('cr-1', 'بقرار');

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /academic/programs',
      'post /academic/programs/pr-1/versions',
      'get /academic/program-versions/v-1/courses',
      'post /academic/program-versions/v-1/courses',
      'delete /academic/program-versions/v-1/courses/c-1',
      'get /academic/program-enrollments',
      'post /academic/program-enrollments/e-1/status',
      'get /academic/credentials',
      'post /academic/credentials/award',
      'post /academic/credentials/cr-1/revoke',
    ]);
    expect(calls[6]!.data).toEqual({ status: 'GRADUATED', completionAt: '2026-06-01' });
  });

  it('builds the compliance family exactly (accreditations/licenses/inspections/findings/evidence)', async () => {
    await instApi.listAccreditations({ type: 'INSTITUTIONAL' });
    await instApi.createLicense({ kind: 'OPERATING_PERMIT', authorityCode: 'QA-LY' });
    await instApi.updateInspection('i-1', { status: 'COMPLETED' });
    await instApi.addCorrectiveAction('f-1', { planText: 'خطة' });
    await instApi.listSelfAssessments({});
    await instApi.createEvidence({
      ownerType: 'ACCREDITATION', ownerId: 'a-1', titleAr: 'تقرير',
    });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /compliance/accreditations',
      'post /compliance/licenses',
      'patch /compliance/inspections/i-1',
      'post /compliance/findings/f-1/corrective-actions',
      'get /compliance/self-assessments',
      'post /compliance/evidence',
    ]);
  });

  it('builds the operations + research families exactly', async () => {
    await instApi.listFacilities({ type: 'WORKSHOP' });
    await instApi.linkEquipmentProgram('eq-1', { programId: 'pr-1' });
    await instApi.listWorkOrders({});
    await instApi.createReservation({
      facilityId: 'f-1', purpose: 'تدريب', startsAt: '2026-01-01', endsAt: '2026-01-02',
    });
    await instApi.listSafetyIncidents({});
    await instApi.listResearchProjects({});
    await instApi.addResearchMember('rp-1', { personId: 'p-1', role: 'RESEARCHER' });
    await instApi.removeResearchMember('rp-1', 'p-1');
    await instApi.createResearchOutput({ type: 'PATENT', title: 'براءة' });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /operations/facilities',
      'post /operations/equipment/eq-1/programs',
      'get /operations/work-orders',
      'post /operations/reservations',
      'get /operations/safety-incidents',
      'get /research-projects',
      'post /research-projects/rp-1/members',
      'delete /research-projects/rp-1/members/p-1',
      'post /research-outputs',
    ]);
  });

  it('builds the permissions family exactly (contract §12 — the hardened capability surface)', async () => {
    await instApi.getMyPermissions();
    await instApi.getMyUnitCapabilities();
    await instApi.listUserUnitCapabilities('u-1', 'inst-1');
    await instApi.grantUnitCapability('u-1', {
      institutionId: 'inst-1', capability: 'QUALITY_INTERNAL_MANAGE', orgUnitId: 'unit-1', reason: 'تفويض مؤقت',
    });
    await instApi.revokeUnitCapability('g-1');

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /me/permissions',
      'get /me/unit-capabilities',
      'get /admin/users/u-1/unit-capabilities',
      'post /admin/users/u-1/unit-capabilities',
      'post /admin/unit-capabilities/g-1/revoke',
    ]);
    expect(calls[2]!.params).toEqual({ institutionId: 'inst-1' });
    expect(calls[3]!.data).toEqual({
      institutionId: 'inst-1', capability: 'QUALITY_INTERNAL_MANAGE', orgUnitId: 'unit-1', reason: 'تفويض مؤقت',
    });
  });
});

describe('cleanParams — the wire stays clean', () => {
  it('drops undefined/null/empty values and keeps the rest', () => {
    expect(cleanParams({
      q: 'بحث', type: undefined, status: '', page: 3, limit: 20, orgUnitId: null,
    })).toEqual({ q: 'بحث', page: 3, limit: 20 });
  });
});
