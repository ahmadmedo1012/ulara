/**
 * r352 DB integration — the cross-tenant WRITE belt for the isolation
 * fixes landed with the 2026-11-23 platform round:
 *
 *   1. POST /compliance/findings must institution-check programId (and
 *      orgUnitId) per-field — the pre-fix call derived the scope type from
 *      orgUnitId only, so a foreign institution's programId was persisted
 *      unvalidated and then leaked through the findings list's program
 *      include (cross-tenant IDOR: write + read leak).
 *   2. POST/PATCH /academic/learners must require the linked userId to be
 *      an ACTIVE member of the caller's institution (USER_NOT_MEMBER) —
 *      a learner row carries nationalId/PII and must never bind to a
 *      foreign or non-member account.
 *   3. GET /catalog/position-templates must serve global templates plus
 *      the caller's OWN institution variants only — local variants of
 *      another institution are private catalog rows.
 *   4. POST /admin/users/:id/permissions from an institutional ADMIN must
 *      write an INSTITUTION-SCOPED override (their verified context), not
 *      a platform-global one — the pre-fix NULL-institutionId write minted
 *      capabilities effective in EVERY institution the target held
 *      memberships in.
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
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('r352 cross-tenant writes — the isolation-fix belt', () => {
  beforeEach(async () => {
    const worlds: Record<'A' | 'B', any> = { A: {}, B: {} };
    for (const key of ['A', 'B'] as const) {
      const institution = await seedInstitution();
      await classifyInstitution(institution.id, 'UNIVERSITY');
      const admin = await seedUser({ role: Role.ADMIN, firstName: `مدير${key}` });
      await seedMembership(admin.id, institution.id, Role.ADMIN);
      const auth = bearer(admin.id, Role.ADMIN, institution.id);
      const unit = await api('POST', '/api/v1/institutional/org-units', {
        nameAr: `كلية العزل${key}`, type: 'FACULTY', city: 'طرابلس', code: `F-ISO-${key}`,
      }, auth);
      const program = await api('POST', '/api/v1/academic/programs', {
        code: `PROG-${key}`, nameAr: `برنامج العزل${key}`, kind: 'TECHNICAL', credentialTypeCode: 'TECHNICAL_BACHELOR',
      }, auth);
      // A member-of-one user (the USER_NOT_MEMBER probe target for the OTHER world).
      const member = await seedUser({ role: Role.STUDENT, firstName: `عضو${key}` });
      await seedMembership(member.id, institution.id, Role.STUDENT);
      // A local position-template variant PRIVATE to this world.
      await db().positionTemplate.create({
        data: {
          code: `LOCAL_TEMPL_${key}`,
          titleAr: `قالب محلي${key}`,
          category: 'DEPARTMENT_LEADERSHIP',
          isLocalVariant: true,
          institutionId: institution.id,
        },
      });
      worlds[key] = {
        institution, admin, auth, unitId: unit.body.data.id,
        programId: program.body.data.id, member, memberAuth: bearer(member.id, Role.STUDENT, institution.id),
      };
    }
    // The cross-membership escalation probe target: a user that is a member
    // of BOTH worlds (the pre-fix global override was effective in both).
    const dual = await seedUser({ role: Role.STUDENT, firstName: 'ثنائي' });
    await seedMembership(dual.id, worlds.A.institution.id, Role.STUDENT);
    await seedMembership(dual.id, worlds.B.institution.id, Role.STUDENT);
    globalThis.__iso = { ...worlds, dual };
  });

  it('POST /compliance/findings REJECTS a foreign programId (the IDOR fix)', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', '/api/v1/compliance/findings', {
      severity: 'MAJOR',
      titleAr: 'ملاحظة عابرة للمؤسسات',
      programId: w.B.programId,
    }, w.A.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
    expect(await db().complianceFinding.count({ where: { titleAr: 'ملاحظة عابرة للمؤسسات' } })).toBe(0);
  });

  it('POST /compliance/findings REJECTS a foreign orgUnitId (still scoped after the rewrite)', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', '/api/v1/compliance/findings', {
      severity: 'MINOR',
      titleAr: 'ملاحظة وحدة أجنبية',
      orgUnitId: w.B.unitId,
    }, w.A.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ACCREDITATION_SCOPE_INVALID');
  });

  it('POST /compliance/findings ACCEPTS the own-institution programId and stores it', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', '/api/v1/compliance/findings', {
      severity: 'MAJOR',
      titleAr: 'ملاحظة داخلية',
      programId: w.A.programId,
    }, w.A.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.programId).toBe(w.A.programId);
    expect(await db().complianceFinding.findFirstOrThrow({
      where: { titleAr: 'ملاحظة داخلية' },
    })).toMatchObject({ institutionId: w.A.institution.id, programId: w.A.programId });
  });

  it('POST /academic/learners REJECTS a userId that is not an ACTIVE member (USER_NOT_MEMBER)', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT',
      learnerNumber: 'LRN-ISO-1',
      fullNameAr: 'متعلم العزل',
      userId: w.B.member.id,
    }, w.A.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_NOT_MEMBER');
    expect(await db().learnerProfile.count({ where: { learnerNumber: 'LRN-ISO-1' } })).toBe(0);
  });

  it('POST /academic/learners ACCEPTS a same-institution member userId', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT',
      learnerNumber: 'LRN-ISO-2',
      fullNameAr: 'متعلم داخلي',
      userId: w.A.member.id,
    }, w.A.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(w.A.member.id);
  });

  it('PATCH /academic/learners REJECTS re-linking to a foreign member', async () => {
    const w = globalThis.__iso as any;
    const created = await api('POST', '/api/v1/academic/learners', {
      category: 'STUDENT',
      learnerNumber: 'LRN-ISO-3',
      fullNameAr: 'متعلم إعادة الربط',
      userId: w.A.member.id,
    }, w.A.auth);
    expect(created.status).toBe(201);
    const res = await api('PATCH', `/api/v1/academic/learners/${created.body.data.id}`, {
      userId: w.B.member.id,
    }, w.A.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_NOT_MEMBER');
  });

  it('GET /catalog/position-templates never shows another institution local variants', async () => {
    const w = globalThis.__iso as any;
    for (const [who, expectB] of [
      [w.A.auth, false],
      [w.B.auth, true],
      [bearer(w.A.member.id, Role.STUDENT, null), false],
    ] as const) {
      const res = await api('GET', '/api/v1/catalog/position-templates', undefined, who);
      expect(res.status).toBe(200);
      const codes = res.body.data.map((t: { code: string }) => t.code);
      expect(codes).toContain('FACULTY_DEAN'); // a global template is always served
      expect(codes.includes('LOCAL_TEMPL_B')).toBe(expectB);
    }
  });

  it('an institutional ADMIN capability override lands INSTITUTION-SCOPED, not platform-global', async () => {
    const w = globalThis.__iso as any;
    const res = await api('POST', `/api/v1/admin/users/${w.dual.id}/permissions`, {
      capability: 'QUALITY_INTERNAL_MANAGE',
      grant: true,
      reason: 'عزل المؤسسات',
    }, w.A.auth);
    expect(res.status).toBe(200);
    const row = await db().userPermission.findFirstOrThrow({
      where: { userId: w.dual.id, capability: 'QUALITY_INTERNAL_MANAGE' },
    });
    expect(row.institutionId).toBe(w.A.institution.id);

    // Effective ONLY inside institution A — never in B (the pre-fix write
    // minted a platform-global grant effective in every membership).
    const { getEffectiveCapabilities } = await import('../../src/lib/permissions.js');
    const effectiveA = await getEffectiveCapabilities(w.dual.id, Role.STUDENT, w.A.institution.id);
    const effectiveB = await getEffectiveCapabilities(w.dual.id, Role.STUDENT, w.B.institution.id);
    const effectiveContextless = await getEffectiveCapabilities(w.dual.id, Role.STUDENT, null);
    expect(Array.from(effectiveA)).toContain('QUALITY_INTERNAL_MANAGE');
    expect(Array.from(effectiveB)).not.toContain('QUALITY_INTERNAL_MANAGE');
    expect(Array.from(effectiveContextless)).not.toContain('QUALITY_INTERNAL_MANAGE');
  });

  it('removal (grant=null) by the institutional admin deletes ONLY their scoped row', async () => {
    const w = globalThis.__iso as any;
    await api('POST', `/api/v1/admin/users/${w.dual.id}/permissions`, {
      capability: 'QUALITY_INTERNAL_MANAGE', grant: true,
    }, w.A.auth);
    // A global row from the platform OWNER side, plus a B-scoped row —
    // neither may be touched by the A admin's removal.
    await db().userPermission.create({
      data: {
        userId: w.dual.id, capability: 'QUALITY_INTERNAL_MANAGE', grant: false,
        institutionId: null, grantedById: w.A.admin.id,
      },
    });
    const remove = await api('POST', `/api/v1/admin/users/${w.dual.id}/permissions`, {
      capability: 'QUALITY_INTERNAL_MANAGE', grant: null,
    }, w.A.auth);
    expect(remove.status).toBe(200);
    const remaining = await db().userPermission.findMany({
      where: { userId: w.dual.id, capability: 'QUALITY_INTERNAL_MANAGE' },
    });
    // The A-scoped row is gone; the platform-global row survives untouched.
    expect(remaining.filter((r) => r.institutionId === w.A.institution.id)).toHaveLength(0);
    expect(remaining.filter((r) => r.institutionId === null)).toHaveLength(1);
  });

  it('the override listing is scope-honest: no foreign-institution rows', async () => {
    const w = globalThis.__iso as any;
    await db().userPermission.create({
      data: {
        userId: w.dual.id, capability: 'FACILITIES_MANAGE', grant: true,
        institutionId: w.B.institution.id, grantedById: w.B.admin.id,
      },
    });
    const res = await api('GET', `/api/v1/admin/users/${w.dual.id}/permissions`, undefined, w.A.auth);
    expect(res.status).toBe(200);
    const scoped = res.body.data.overrides as { institutionId: string | null }[];
    expect(scoped.some((o) => o.institutionId === w.B.institution.id)).toBe(false);
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __iso: unknown;
}
