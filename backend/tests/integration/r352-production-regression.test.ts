/**
 * r352 DB integration — THE 2026-11-23 production incident regression belt.
 *
 * Production (ulara.vercel.app, build a71d7d8a4524) served 500s on
 * GET /colleges?institution=ulara-demo (P2022 — the query selects every
 * Faculty scalar including the r352-only Faculty.orgUnitId), on
 * GET /auth/me (P2022 — getCurrentUser includes studentProfiles.faculty /
 * teacherProfiles.positionFaculty, the same missing column), on
 * GET /catalog/institution-types (P2021 — the whole InstitutionType table),
 * and on GET /me/permissions for ADMIN callers (P2021 — UnitCapabilityGrant).
 *
 * Root cause: no deploy path ran `prisma migrate deploy` — migrations
 * 0003–0005 never reached the production database while the code (and
 * every fresh CI database) had them. The deploy path is fixed (vercel.json
 * migrates production builds; migrate-deploy.mjs serializes builders with
 * an advisory lock; the post-deploy smoke walks these endpoints).
 *
 * THESE tests pin the contract against a MIGRATED database: each of the
 * exact production-failing queries must answer 200 with its documented
 * payload shape. A database that is behind the code fails here loudly —
 * the same drift can never again ship silently through this suite.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll } from './helpers.js';
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

describe('r352 production regression — the schema-drift 500 belt (2026-11-23)', () => {
  beforeEach(async () => {
    const institution = await seedInstitution();
    const faculty = await db().faculty.create({
      data: {
        institutionId: institution.id,
        name: 'كلية الانحدار الإنتاجي',
        nameEn: 'Production Regression College',
        city: 'طرابلس',
      },
    });
    const department = await db().department.create({
      data: { facultyId: faculty.id, name: 'قسم الانحدار' },
    });
    const student = await seedUser({ role: Role.STUDENT });
    const membership = await seedMembership(student.id, institution.id, Role.STUDENT);
    await db().studentProfile.create({
      data: {
        userId: student.id,
        membershipId: membership.id,
        institutionId: institution.id,
        universityId: 'REG-REG-1',
        facultyId: faculty.id,
        departmentId: department.id,
      },
    });
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    globalThis.__reg = { institution, faculty, department, student, membership, admin };
  });

  it('GET /colleges?institution=<slug> answers 200 with the faculty list (P2022 belt)', async () => {
    const w = globalThis.__reg as any;
    const res = await api('GET', `/api/v1/colleges?institution=${w.institution.slug}`, undefined, {});
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const row = res.body.data.find((f: { id: string }) => f.id === w.faculty.id);
    expect(row).toMatchObject({
      name: 'كلية الانحدار الإنتاجي',
      institution: { id: w.institution.id, slug: w.institution.slug },
      departmentCount: 1,
    });
  });

  it('GET /auth/me answers 200 with memberships + the scoped profiles (P2022 belt)', async () => {
    const w = globalThis.__reg as any;
    const res = await api(
      'GET',
      '/api/v1/auth/me',
      undefined,
      bearer(w.student.id, Role.STUDENT, w.institution.id),
    );
    expect(res.status).toBe(200);
    expect(res.body.data.memberships.length).toBe(1);
    expect(res.body.data.currentInstitution).toMatchObject({ id: w.institution.id });
    // studentProfile rides the CURRENT membership and its faculty include —
    // the exact Faculty-relation chain that 500'd in production.
    expect(res.body.data.studentProfile).toMatchObject({
      facultyId: w.faculty.id,
      departmentId: w.department.id,
    });
  });

  it('GET /catalog/institution-types answers 200 with SEEDED rows (P2021 belt)', async () => {
    const w = globalThis.__reg as any;
    const res = await api(
      'GET',
      '/api/v1/catalog/institution-types',
      undefined,
      bearer(w.admin.id, Role.ADMIN, w.institution.id),
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body.data.map((t: { code: string }) => t.code)).toContain('UNIVERSITY');
    expect(res.body.data[0]).toHaveProperty('legalBasis');
  });

  it('GET /me/permissions answers 200 for an ADMIN caller (P2021 UnitCapabilityGrant belt)', async () => {
    const w = globalThis.__reg as any;
    const res = await api(
      'GET',
      '/api/v1/me/permissions',
      undefined,
      bearer(w.admin.id, Role.ADMIN, w.institution.id),
    );
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
    expect(res.body.data.capabilities).toContain('ACCREDITATION_MANAGE');
    expect(res.body.data.roleDefaults).toContain('USERS_MANAGE');
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __reg: unknown;
}
