/**
 * The catalog institution-context belt (r352 hardening round
 * 2026-11-23) — pins GET /catalog/position-templates' context
 * resolution to the DB-VERIFIED membership (resolveCallerInstitutionScope),
 * never the bare JWT `inst` claim (authMiddleware only verifies the
 * signature — the claim itself must be re-resolved):
 *
 *   - ACTIVE membership in an ACTIVE institution → global templates
 *     PLUS that institution's local variants (never a foreign one);
 *   - no context claim → global templates only;
 *   - a REVOKED membership with the claim still in the token → 403
 *     INSTITUTION_CONTEXT_INVALID (an invalid context is loud, never
 *     silently downgraded to "no context");
 *   - a SUSPENDED institution → 403 INSTITUTION_CONTEXT_INVALID;
 *   - a claim naming a nonexistent institution → 403
 *     INSTITUTION_CONTEXT_INVALID.
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

const api = async (path: string, auth: Record<string, string>) => {
  const res = await fetch(`${baseUrl}${path}`, { headers: { ...auth } });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('GET /catalog/position-templates — DB-verified institution context', () => {
  beforeEach(async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const adminA = await seedUser({ role: Role.ADMIN, firstName: 'مدير أ' });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);
    const contextlessStudent = await seedUser({ role: Role.STUDENT, firstName: 'بلا سياق' });
    // Each institution gets ONE private local variant.
    for (const [inst, code] of [
      [instA, 'LOCAL_TEMPL_A'],
      [instB, 'LOCAL_TEMPL_B'],
    ] as const) {
      await db().positionTemplate.create({
        data: {
          code,
          titleAr: `قالب محلي ${code}`,
          category: 'DEPARTMENT_LEADERSHIP',
          isLocalVariant: true,
          institutionId: inst.id,
        },
      });
    }
    globalThis.__cat = { instA, instB, adminA, contextlessStudent };
  });

  it('ACTIVE membership: global + own-institution local variants; the foreign variant never appears', async () => {
    const w = globalThis.__cat as any;
    const res = await api('/api/v1/catalog/position-templates', bearer(w.adminA.id, Role.ADMIN, w.instA.id));
    expect(res.status).toBe(200);
    const codes: string[] = res.body.data.map((t: { code: string }) => t.code);
    expect(codes).toContain('FACULTY_DEAN'); // a global template is always served
    expect(codes).toContain('LOCAL_TEMPL_A'); // the caller's own institution variant
    expect(codes).not.toContain('LOCAL_TEMPL_B'); // the foreign institution's variant NEVER
    // every local variant row served belongs to the caller's institution
    for (const t of res.body.data as Array<{ isLocalVariant: boolean; institutionId: string | null }>) {
      if (t.isLocalVariant) expect(t.institutionId).toBe(w.instA.id);
    }
  });

  it('NO context claim: global templates only — no institution\'s local variants', async () => {
    const w = globalThis.__cat as any;
    const res = await api('/api/v1/catalog/position-templates', bearer(w.contextlessStudent.id, Role.STUDENT, null));
    expect(res.status).toBe(200);
    const codes: string[] = res.body.data.map((t: { code: string }) => t.code);
    expect(codes).toContain('FACULTY_DEAN');
    expect(codes).not.toContain('LOCAL_TEMPL_A');
    expect(codes).not.toContain('LOCAL_TEMPL_B');
  });

  it('REVOKED membership with the claim still in the token → 403 INSTITUTION_CONTEXT_INVALID (loud, not silent)', async () => {
    const w = globalThis.__cat as any;
    await db().membership.updateMany({
      where: { userId: w.adminA.id, institutionId: w.instA.id, isActive: true },
      data: { isActive: false },
    });
    const res = await api('/api/v1/catalog/position-templates', bearer(w.adminA.id, Role.ADMIN, w.instA.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
    expect(res.body.data).toBeUndefined();
  });

  it('SUSPENDED institution → 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const w = globalThis.__cat as any;
    await db().institution.update({
      where: { id: w.instA.id },
      data: { status: 'SUSPENDED' },
    });
    const res = await api('/api/v1/catalog/position-templates', bearer(w.adminA.id, Role.ADMIN, w.instA.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });

  it('a claim naming a NONEXISTENT institution → 403 INSTITUTION_CONTEXT_INVALID (never global-with-locals)', async () => {
    const w = globalThis.__cat as any;
    const forged = unknownCuid();
    const res = await api('/api/v1/catalog/position-templates', bearer(w.contextlessStudent.id, Role.STUDENT, forged));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __cat: unknown;
}
