/**
 * r352 FINAL CLOSURE (§4) — the accreditation/license scope-reference
 * belt: EVERY non-null orgUnitId/programId is validated against the
 * caller's institution, independently of the scopeType label, and
 * contradictory scopeType/target-id combinations are rejected
 * explicitly at the DTO boundary.
 *
 * The pre-fix defect: assertScopeTargets() validated a target only
 * when its matching scopeType was selected — a foreign institution's
 * orgUnitId or programId rode an OMITTED (or mismatched) scopeType
 * straight into the persisted row, then leaked through the list
 * includes (the orgUnit/program relations).
 *
 * Every rejection is proven at the HTTP boundary AND against the
 * database: zero rows and zero audit entries survive a rejected write.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import {
  bearer,
  db,
  seedInstitution,
  seedMembership,
  seedUser,
  truncateAll,
  uniqueSuffix,
  unknownCuid,
} from './helpers.js';
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

describe('compliance scope references (§4) — accreditation + license creation', () => {
  beforeEach(async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const adminA = await seedUser({ role: Role.ADMIN, firstName: 'مدير أ' });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);
    // The self-assessment surface needs the explicit QUALITY_INTERNAL_MANAGE
    // grant (r352 D8 — no role default carries it); grant it institution-
    // scoped to A so the §4.7 criteriaSetId probes below exercise the
    // route itself.
    await db().userPermission.create({
      data: {
        userId: adminA.id, capability: 'QUALITY_INTERNAL_MANAGE',
        institutionId: instA.id, grant: true,
      },
    });
    const unitA = await db().organizationalUnit.create({
      data: { institutionId: instA.id, type: 'FACULTY', nameAr: 'كلية أ', code: `U-A-${uniqueSuffix()}` },
    });
    const unitB = await db().organizationalUnit.create({
      data: { institutionId: instB.id, type: 'FACULTY', nameAr: 'كلية ب', code: `U-B-${uniqueSuffix()}` },
    });
    const programA = await db().program.create({
      data: { institutionId: instA.id, code: `PA-${uniqueSuffix()}`, nameAr: 'برنامج أ', kind: 'TECHNICAL' },
    });
    const programB = await db().program.create({
      data: { institutionId: instB.id, code: `PB-${uniqueSuffix()}`, nameAr: 'برنامج ب', kind: 'TECHNICAL' },
    });
    globalThis.__scope = {
      instA,
      instB,
      auth: bearer(adminA.id, Role.ADMIN, instA.id),
      unitA,
      unitB,
      programA,
      programB,
    };
  });

  const accreditationsBefore = async () => db().externalAccreditation.count();
  const licensesBefore = async () => db().operationalLicense.count();
  const auditsBefore = async () => db().auditLog.count();

  // ── contradictory combinations are rejected at the DTO boundary ──

  it.each([
    ['local unit + no scopeType', { orgUnitId: 'unitA' }],
    ['foreign unit + no scopeType', { orgUnitId: 'unitB' }],
    ['local program + no scopeType', { programId: 'programA' }],
    ['foreign program + no scopeType', { programId: 'programB' }],
    ['scopeType=ORGANIZATIONAL_UNIT + local unit + foreign program', { scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: 'unitA', programId: 'programB' }],
    ['scopeType=PROGRAM + local program + foreign unit', { scopeType: 'PROGRAM', programId: 'programA', orgUnitId: 'unitB' }],
    ['scopeType=INSTITUTION + foreign unit', { scopeType: 'INSTITUTION', orgUnitId: 'unitB' }],
    ['scopeType=INSTITUTION + local program', { scopeType: 'INSTITUTION', programId: 'programA' }],
    ['both ids together (no scopeType)', { orgUnitId: 'unitA', programId: 'programA' }],
    ['scopeType=ORGANIZATIONAL_UNIT without a unit', { scopeType: 'ORGANIZATIONAL_UNIT' }],
    ['scopeType=PROGRAM without a program', { scopeType: 'PROGRAM' }],
  ])('accreditation: %s → 400 VALIDATION_ERROR, zero rows/audit entries', async (_label, fields) => {
    const w = globalThis.__scope as any;
    const resolve = (v: string) => (v.startsWith('unit') || v.startsWith('program') ? w[v].id : v);
    const body: Record<string, unknown> = { type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER' };
    for (const [k, v] of Object.entries(fields as Record<string, string>)) {
      body[k] = resolve(v);
    }
    const [rows0, audits0] = await Promise.all([accreditationsBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/accreditations', body, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await db().externalAccreditation.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  it.each([
    ['foreign unit + no scopeType', { orgUnitId: 'unitB' }],
    ['local program + no scopeType', { programId: 'programA' }],
    ['scopeType=PROGRAM + foreign program + foreign unit', { scopeType: 'PROGRAM', programId: 'programB', orgUnitId: 'unitB' }],
    ['scopeType=INSTITUTION + local unit', { scopeType: 'INSTITUTION', orgUnitId: 'unitA' }],
  ])('license: %s → 400 VALIDATION_ERROR, zero rows/audit entries', async (_label, fields) => {
    const w = globalThis.__scope as any;
    const resolve = (v: string) => (v.startsWith('unit') || v.startsWith('program') ? w[v].id : v);
    const body: Record<string, unknown> = { kind: 'TECHNICAL_LICENSE', authorityCode: 'NATIONAL_QA_CENTER' };
    for (const [k, v] of Object.entries(fields as Record<string, string>)) {
      body[k] = resolve(v);
    }
    const [rows0, audits0] = await Promise.all([licensesBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/licenses', body, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await db().operationalLicense.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  // ── invalid / nonexistent / malformed ids ─────────────────────────

  it.each([
    ['malformed (non-cuid) orgUnitId', 'not-a-cuid-at-all'],
    ['nonexistent (valid cuid) orgUnitId', 'cuid'],
  ])('accreditation: %s with matching scopeType → rejected, zero rows', async (_label, unitId) => {
    const w = globalThis.__scope as any;
    const id = unitId === 'cuid' ? unknownCuid() : unitId;
    const [rows0, audits0] = await Promise.all([accreditationsBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: id,
    }, w.auth);
    expect([400, 404]).toContain(res.status);
    expect(res.body.error.code).not.toBe('DB_UNAVAILABLE');
    expect(await db().externalAccreditation.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  // ── the tenant boundary at the route (matching scopeType, foreign id) ──

  it('accreditation: scopeType=ORGANIZATIONAL_UNIT + FOREIGN unit → 400 ACCREDITATION_SCOPE_INVALID, zero rows', async () => {
    const w = globalThis.__scope as any;
    const [rows0, audits0] = await Promise.all([accreditationsBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: w.unitB.id,
    }, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
    expect(await db().externalAccreditation.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  it('accreditation: scopeType=PROGRAM + FOREIGN program → 400 ACCREDITATION_SCOPE_INVALID, zero rows', async () => {
    const w = globalThis.__scope as any;
    const [rows0, audits0] = await Promise.all([accreditationsBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'PROGRAM', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'PROGRAM', programId: w.programB.id,
    }, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
    expect(await db().externalAccreditation.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  it('license: scopeType=ORGANIZATIONAL_UNIT + FOREIGN unit → 400 ACCREDITATION_SCOPE_INVALID, zero rows', async () => {
    const w = globalThis.__scope as any;
    const [rows0, audits0] = await Promise.all([licensesBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'TECHNICAL_LICENSE', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: w.unitB.id,
    }, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
    expect(await db().operationalLicense.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  it('license: scopeType=PROGRAM + FOREIGN program → 400 ACCREDITATION_SCOPE_INVALID, zero rows', async () => {
    const w = globalThis.__scope as any;
    const [rows0, audits0] = await Promise.all([licensesBefore(), auditsBefore()]);
    const res = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'OPERATING_PERMIT', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'PROGRAM', programId: w.programB.id,
    }, w.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
    expect(await db().operationalLicense.count()).toBe(rows0);
    expect(await db().auditLog.count()).toBe(audits0);
  });

  // ── the approved contract: valid combinations ─────────────────────

  it('accreditation: neither id supplied → 201, INSTITUTION scope (the default)', async () => {
    const w = globalThis.__scope as any;
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
    }, w.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.scopeType).toBe('INSTITUTION');
    expect(res.body.data.orgUnitId).toBe(null);
    expect(res.body.data.programId).toBe(null);
  });

  it('accreditation: scopeType=ORGANIZATIONAL_UNIT + LOCAL unit → 201, row bound to the unit', async () => {
    const w = globalThis.__scope as any;
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'INSTITUTIONAL', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: w.unitA.id,
    }, w.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.orgUnitId).toBe(w.unitA.id);
    // The list include resolves ONLY the institution's own relation —
    // a foreign relation can never be bound to a compliant record.
    const list = await api('GET', '/api/v1/compliance/accreditations', undefined, w.auth);
    expect(list.status).toBe(200);
    const withUnit = (list.body.data as { orgUnit: { id: string } | null }[]).find((r) => r.orgUnit);
    expect(withUnit!.orgUnit!.id).toBe(w.unitA.id);
  });

  it('accreditation: scopeType=PROGRAM + LOCAL program → 201, row bound to the program', async () => {
    const w = globalThis.__scope as any;
    const res = await api('POST', '/api/v1/compliance/accreditations', {
      type: 'PROGRAM', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'PROGRAM', programId: w.programA.id,
    }, w.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.programId).toBe(w.programA.id);
    expect(res.body.data.orgUnitId).toBe(null);
  });

  it('license: neither id supplied → 201; local unit with matching scopeType → 201', async () => {
    const w = globalThis.__scope as any;
    const bare = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'TECHNICAL_LICENSE', authorityCode: 'NATIONAL_QA_CENTER',
    }, w.auth);
    expect(bare.status).toBe(201);
    expect(bare.body.data.scopeType).toBe(null);
    expect(bare.body.data.orgUnitId).toBe(null);
    const scoped = await api('POST', '/api/v1/compliance/licenses', {
      kind: 'TECHNICAL_LICENSE', authorityCode: 'NATIONAL_QA_CENTER',
      scopeType: 'ORGANIZATIONAL_UNIT', orgUnitId: w.unitA.id,
    }, w.auth);
    expect(scoped.status).toBe(201);
    expect(scoped.body.data.orgUnitId).toBe(w.unitA.id);
    expect(scoped.body.data.scopeType).toBe('ORGANIZATIONAL_UNIT');
  });

  // ── the criteriaSetId global-catalog reference (§4.7 audit) ──────

  it('self-assessment: a nonexistent criteriaSetId fails as a clean 404, never a FK 500', async () => {
    const w = globalThis.__scope as any;
    const res = await api('POST', '/api/v1/compliance/self-assessments', {
      periodLabel: 'دورة 2026',
      criteriaSetId: unknownCuid(),
    }, w.auth);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('self-assessment: a real seeded criteriaSetId is citable (global catalog policy)', async () => {
    const w = globalThis.__scope as any;
    const set = await db().accreditationCriteriaSet.findFirst();
    expect(set).not.toBeNull();
    const res = await api('POST', '/api/v1/compliance/self-assessments', {
      periodLabel: 'دورة 2026',
      criteriaSetId: set!.id,
    }, w.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.criteriaSetId).toBe(set!.id);
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __scope: unknown;
}
