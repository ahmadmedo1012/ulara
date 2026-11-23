/**
 * The effective-capabilities scope belt (r352 hardening round
 * 2026-11-23) — pins GET /admin/users/:id/permissions so `effective`
 * and `overrides` always agree on the caller's DB-VERIFIED institution
 * context:
 *
 * The pre-fix payload computed `effective` with NO institution context
 * while the `overrides` listing was already filtered to global + the
 * caller's institution — the two halves disagreed (institution-scoped
 * grants appeared in the listing but never in the computation, and
 * UnitCapabilityGrant rows were invisible without a context too).
 *
 * Semantics pinned here (mirrors the route's documented contract):
 *   - ADMIN/QUALITY caller → the DB-verified context: effective = role
 *     defaults ∪ RolePermission ∪ global + same-institution
 *     UserPermission grants ∪ institution-WIDE UnitCapabilityGrants —
 *     minus revokes (deny precedence). Unit-scoped grants NEVER count
 *     (they authorize unit-targeted checks only). overrides = global +
 *     same-institution rows only.
 *   - OWNER without a context → the contextless platform slice: role
 *     defaults ∪ RolePermission ∪ global UserPermission rows only.
 *     overrides = the full cross-tenant trail. The response reports
 *     contextInstitutionId: null.
 *   - a cross-institution target (member of another institution only)
 *     → 404 (existence never leaks); a contextless ADMIN → 403
 *     INSTITUTION_CONTEXT_REQUIRED.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Capability, Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import {
  bearer,
  db,
  seedInstitution,
  seedMembership,
  seedUser,
  truncateAll,
} from './helpers.js';

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
});

const api = async (method: string, path: string, auth: Record<string, string>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth },
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('GET /admin/users/:id/permissions — effective matches the caller context', () => {
  beforeEach(async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const adminA = await seedUser({ role: Role.ADMIN, firstName: 'مدير أ' });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);
    // QUALITY caller — oversight role with NO default ROLES_ASSIGN; a
    // platform-global UserPermission grant makes the inspection legal.
    const qualityA = await seedUser({ role: Role.QUALITY, firstName: 'جودة أ' });
    await seedMembership(qualityA.id, instA.id, Role.QUALITY);
    await db().userPermission.create({
      data: { userId: qualityA.id, capability: 'ROLES_ASSIGN', grant: true, institutionId: null },
    });
    const owner = await seedUser({ role: Role.OWNER, firstName: 'المالك' });
    // Contextless ADMIN (no membership anywhere) — the 403 probe.
    const homelessAdmin = await seedUser({ role: Role.ADMIN, firstName: 'بلا سياق' });
    // The TARGET: a STUDENT member of BOTH institutions.
    const target = await seedUser({ role: Role.STUDENT, firstName: 'الهدف' });
    await seedMembership(target.id, instA.id, Role.STUDENT);
    await seedMembership(target.id, instB.id, Role.STUDENT);
    // A cross-institution-only user (member of B only).
    const foreignOnly = await seedUser({ role: Role.STUDENT, firstName: 'أجنبي' });
    await seedMembership(foreignOnly.id, instB.id, Role.STUDENT);

    // Overrides planted on the target — one per scope:
    //   global grant + global revoke (deny precedence),
    //   an A-scoped grant (the caller's institution),
    //   a B-scoped grant (a FOREIGN institution — must never surface).
    await db().userPermission.create({
      data: { userId: target.id, capability: 'QUALITY_VIEW', grant: true, institutionId: null },
    });
    await db().userPermission.create({
      data: { userId: target.id, capability: 'EXAMS_TAKE', grant: false, institutionId: null },
    });
    await db().userPermission.create({
      data: { userId: target.id, capability: 'QUALITY_INTERNAL_MANAGE', grant: true, institutionId: instA.id },
    });
    await db().userPermission.create({
      data: { userId: target.id, capability: 'RESEARCH_PUBLISH', grant: true, institutionId: instB.id },
    });
    // Unit-capability grants in A: institution-WIDE (counts) vs
    // unit-SCOPED (never counts — unit grants authorize unit-targeted
    // checks only, not institution-wide operations).
    const unit = await db().organizationalUnit.create({
      data: { institutionId: instA.id, type: 'FACULTY', nameAr: 'كلية الحساب', code: 'F-EFF' },
    });
    await db().unitCapabilityGrant.create({
      data: { userId: target.id, institutionId: instA.id, capability: 'PEOPLE_MANAGE', orgUnitId: null },
    });
    await db().unitCapabilityGrant.create({
      data: { userId: target.id, institutionId: instA.id, capability: 'PROGRAMS_MANAGE', orgUnitId: unit.id },
    });

    globalThis.__eff = {
      instA,
      instB,
      adminA,
      qualityA,
      adminAAuth: bearer(adminA.id, Role.ADMIN, instA.id),
      qualityAAuth: bearer(qualityA.id, Role.QUALITY, instA.id),
      ownerAuth: bearer(owner.id, Role.OWNER, null),
      homelessAdminAuth: bearer(homelessAdmin.id, Role.ADMIN, null),
      target,
      foreignOnly,
    };
  });

  it('ADMIN: effective = defaults ∪ global+institution grants ∪ institution-wide unit grants − revokes', async () => {
    const w = globalThis.__eff as any;
    const res = await api('GET', `/api/v1/admin/users/${w.target.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(200);
    const { effective, overrides, contextInstitutionId } = res.body.data;
    expect(contextInstitutionId).toBe(w.instA.id);
    expect(new Set(effective)).toEqual(
      new Set([
        'QUALITY_VIEW',              // global grant
        'QUALITY_INTERNAL_MANAGE',    // A-scoped UserPermission grant
        'PEOPLE_MANAGE',             // institution-WIDE UnitCapabilityGrant in A
      ]),
    );
    // deny precedence: the STUDENT default EXAMS_TAKE is globally revoked
    expect(effective).not.toContain('EXAMS_TAKE');
    // unit-SCOPED grant never counts as institution-wide
    expect(effective).not.toContain('PROGRAMS_MANAGE');
    // the foreign institution's scoped grant never surfaces
    expect(effective).not.toContain('RESEARCH_PUBLISH');
    // overrides listing = global rows + A rows ONLY — never the B row
    const listedCapabilities = overrides.map((o: { capability: Capability; institutionId: string | null }) => ({
      capability: o.capability,
      institutionId: o.institutionId,
    }));
    expect(listedCapabilities).toContainEqual({ capability: 'QUALITY_VIEW', institutionId: null });
    expect(listedCapabilities).toContainEqual({ capability: 'EXAMS_TAKE', institutionId: null });
    expect(listedCapabilities).toContainEqual({ capability: 'QUALITY_INTERNAL_MANAGE', institutionId: w.instA.id });
    expect(listedCapabilities).not.toContainEqual({ capability: 'RESEARCH_PUBLISH', institutionId: w.instB.id });
    // every granting override the response lists IS reflected in effective
    // (the two halves of the payload agree)
    for (const o of overrides as Array<{ capability: string; grant: boolean; institutionId: string | null }>) {
      if (o.grant) expect(effective).toContain(o.capability);
      else expect(effective).not.toContain(o.capability);
    }
  });

  it('QUALITY caller (oversight, granted ROLES_ASSIGN globally): the same context-honest computation', async () => {
    const w = globalThis.__eff as any;
    const res = await api('GET', `/api/v1/admin/users/${w.target.id}/permissions`, w.qualityAAuth);
    expect(res.status).toBe(200);
    const { effective, contextInstitutionId } = res.body.data;
    expect(contextInstitutionId).toBe(w.instA.id);
    expect(new Set(effective)).toEqual(
      new Set(['QUALITY_VIEW', 'QUALITY_INTERNAL_MANAGE', 'PEOPLE_MANAGE']),
    );
    expect(effective).not.toContain('EXAMS_TAKE');
    expect(effective).not.toContain('RESEARCH_PUBLISH');
    expect(effective).not.toContain('PROGRAMS_MANAGE');
  });

  it('OWNER without an institution context: the contextless platform slice + the full cross-tenant trail', async () => {
    const w = globalThis.__eff as any;
    const res = await api('GET', `/api/v1/admin/users/${w.target.id}/permissions`, w.ownerAuth);
    expect(res.status).toBe(200);
    const { effective, overrides, contextInstitutionId } = res.body.data;
    // OWNER's contextless slice: STUDENT defaults − global revoke + global
    // grant. NO institution-scoped grant, NO unit grant of any kind.
    expect(contextInstitutionId).toBe(null);
    expect(new Set(effective)).toEqual(new Set(['QUALITY_VIEW']));
    // the overrides listing keeps the FULL cross-tenant trail (all four rows)
    expect(overrides).toHaveLength(4);
    const caps = overrides.map((o: { capability: string }) => o.capability).sort();
    expect(caps).toEqual(
      ['EXAMS_TAKE', 'QUALITY_INTERNAL_MANAGE', 'QUALITY_VIEW', 'RESEARCH_PUBLISH'].sort(),
    );
  });

  it('a contextless ADMIN is refused (403 INSTITUTION_CONTEXT_REQUIRED) — no unscoped inspection', async () => {
    const w = globalThis.__eff as any;
    const res = await api('GET', `/api/v1/admin/users/${w.target.id}/permissions`, w.homelessAdminAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('a cross-institution target (member of B only) 404s for A\'s admin — existence never leaks', async () => {
    const w = globalThis.__eff as any;
    const res = await api('GET', `/api/v1/admin/users/${w.foreignOnly.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(404);
  });

  it('a forged/stale inst claim (membership in A revoked) is refused (403 INSTITUTION_CONTEXT_INVALID)', async () => {
    const w = globalThis.__eff as any;
    // Revoke the caller's membership in A, keeping the token's inst claim.
    await db().membership.updateMany({
      where: { userId: w.adminA.id, institutionId: w.instA.id, isActive: true },
      data: { isActive: false },
    });
    const res = await api('GET', `/api/v1/admin/users/${w.target.id}/permissions`, w.adminAAuth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __eff: unknown;
}
