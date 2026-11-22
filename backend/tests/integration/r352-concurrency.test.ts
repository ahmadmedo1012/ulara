/**
 * r352 hardening DB integration — the CONCURRENCY invariants (task §6):
 * racing requests against the database-level belts. Application
 * pre-checks alone cannot survive two simultaneous writes; these tests
 * fire real parallel transactions against the disposable Postgres and
 * prove exactly one winner.
 *
 *  §6.1 — two simultaneous institution-wide capability grants → one 201,
 *          one 409 (partial unique index).
 *  §6.3 — two simultaneous overlapping facility reservations → one 201,
 *          one 409 (btree_gist exclusion constraint).
 *  §6.4 — two simultaneous program-version activations → one 200, one
 *          409 (partial unique index).
 *  §6.2 — two simultaneous substantive appointments on the same seat →
 *          one 201, one 409 (advisory-lock-serialized in-transaction
 *          re-check).
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

/** Narrow settled results to their fulfilled values. */
function fulfilled<T>(results: PromiseSettledResult<T>[]): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value);
}

describe('r352 concurrency belts (§6)', () => {
  it('§6.1 — two simultaneous institution-wide grants: exactly one wins', async () => {
    const institution = await seedInstitution();
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const adminAuth = bearer(admin.id, Role.ADMIN, institution.id);
    const member = await seedUser({ role: Role.STUDENT });
    await seedMembership(member.id, institution.id, Role.STUDENT);

    const attempts = await Promise.allSettled([
      api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
        institutionId: institution.id, capability: 'PEOPLE_MANAGE',
      }, adminAuth),
      api('POST', `/api/v1/admin/users/${member.id}/unit-capabilities`, {
        institutionId: institution.id, capability: 'PEOPLE_MANAGE',
      }, adminAuth),
    ]);
    const statuses = fulfilled(attempts).map((r) => r.status);
    expect(statuses).toHaveLength(2);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    // Exactly ONE active grant row exists.
    const grants = await db().unitCapabilityGrant.count({
      where: { userId: member.id, institutionId: institution.id, capability: 'PEOPLE_MANAGE', isActive: true },
    });
    expect(grants).toBe(1);
  });

  it('§6.3 — two simultaneous overlapping reservations: exactly one wins', async () => {
    const institution = await seedInstitution();
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const facility = await api('POST', '/api/v1/operations/facilities', {
      nameAr: `ورشة السباق ${uniqueSuffix()}`, type: 'WORKSHOP',
    }, auth);
    expect(facility.status).toBe(201);

    const attempts = await Promise.allSettled([
      api('POST', '/api/v1/operations/reservations', {
        facilityId: facility.body.data.id, purpose: 'حجز أول',
        startsAt: '2026-07-01T09:00:00Z', endsAt: '2026-07-01T11:00:00Z',
      }, auth),
      api('POST', '/api/v1/operations/reservations', {
        facilityId: facility.body.data.id, purpose: 'حجز ثانٍ متداخل',
        startsAt: '2026-07-01T10:00:00Z', endsAt: '2026-07-01T12:00:00Z',
      }, auth),
    ]);
    const statuses = fulfilled(attempts).map((r) => r.status);
    expect(statuses).toHaveLength(2);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    const losers = fulfilled(attempts).filter((r) => r.status !== 201);
    expect(losers).toHaveLength(1);
    expect(losers[0]!.status).toBe(409);
    expect(losers[0]!.body.error.code).toBe('RESERVATION_OVERLAP');
    // Exactly ONE live reservation exists for the facility.
    const live = await db().facilityReservation.count({
      where: { facilityId: facility.body.data.id, status: { in: ['REQUESTED', 'APPROVED'] } },
    });
    expect(live).toBe(1);
  });

  it('§6.3b — a forced SQLSTATE-40P01 deadlock loser still answers the honest 409', async () => {
    // CI run 45055598165 (post-PR#39) witnessed the §6.3 race resolve
    // as a genuine deadlock: each INSERT's exclusion-constraint check
    // waits on the other's uncommitted range → PG aborts one with
    // 40P01 → Prisma 5.22 escapes it as PrismaClientUnknownRequestError
    // (NOT Known/P2034) → the first mapping keyed on P2034 never fired
    // and the loser answered 500. Interleaving that exact race from
    // outside is timing luck, so this test FORCES the 40P01 shape: a
    // BEFORE INSERT trigger walks the two requests into a real
    // advisory-lock cycle (A: L1→L2, B: L2→L1) with a short hold so
    // both first-locks are taken before either asks for the second.
    // The loser must still get 409 RESERVATION_OVERLAP — never a 500.
    const institution = await seedInstitution();
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const facility = await api('POST', '/api/v1/operations/facilities', {
      nameAr: `ورشة الجمود ${uniqueSuffix()}`, type: 'WORKSHOP',
    }, auth);
    expect(facility.status).toBe(201);

    await db().$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ulara_deadlock_probe() RETURNS trigger AS $fn$
      BEGIN
        IF NEW.purpose = 'probe-40p01-a' THEN
          PERFORM pg_advisory_xact_lock(990001);
          PERFORM pg_sleep(0.3);
          PERFORM pg_advisory_xact_lock(990002);
        ELSIF NEW.purpose = 'probe-40p01-b' THEN
          PERFORM pg_advisory_xact_lock(990002);
          PERFORM pg_sleep(0.3);
          PERFORM pg_advisory_xact_lock(990001);
        END IF;
        RETURN NEW;
      END
      $fn$ LANGUAGE plpgsql`);
    await db().$executeRawUnsafe('DROP TRIGGER IF EXISTS ulara_deadlock_probe ON "FacilityReservation"');
    await db().$executeRawUnsafe(
      'CREATE TRIGGER ulara_deadlock_probe BEFORE INSERT ON "FacilityReservation" FOR EACH ROW EXECUTE FUNCTION ulara_deadlock_probe()');

    try {
      const attempts = await Promise.allSettled([
        api('POST', '/api/v1/operations/reservations', {
          facilityId: facility.body.data.id, purpose: 'probe-40p01-a',
          startsAt: '2026-07-01T09:00:00Z', endsAt: '2026-07-01T11:00:00Z',
        }, auth),
        api('POST', '/api/v1/operations/reservations', {
          facilityId: facility.body.data.id, purpose: 'probe-40p01-b',
          startsAt: '2026-07-01T10:00:00Z', endsAt: '2026-07-01T12:00:00Z',
        }, auth),
      ]);
      const statuses = fulfilled(attempts).map((r) => r.status);
      expect(statuses).toHaveLength(2);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      const losers = fulfilled(attempts).filter((r) => r.status !== 201);
      expect(losers).toHaveLength(1);
      expect(losers[0]!.status).toBe(409);
      expect(losers[0]!.body.error.code).toBe('RESERVATION_OVERLAP');
      const live = await db().facilityReservation.count({
        where: { facilityId: facility.body.data.id, status: { in: ['REQUESTED', 'APPROVED'] } },
      });
      expect(live).toBe(1);
    } finally {
      await db().$executeRawUnsafe('DROP TRIGGER IF EXISTS ulara_deadlock_probe ON "FacilityReservation"');
      await db().$executeRawUnsafe('DROP FUNCTION IF EXISTS ulara_deadlock_probe()');
    }
  });

  it('§6.4 — two simultaneous version activations: exactly one wins', async () => {
    const institution = await seedInstitution();
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const program = await api('POST', '/api/v1/academic/programs', {
      code: `CC-${uniqueSuffix()}`, nameAr: 'برنامج السباق', kind: 'TECHNICAL',
      credentialTypeCode: 'TECHNICAL_BACHELOR',
    }, auth);
    const v1 = await api('POST', `/api/v1/academic/programs/${program.body.data.id}/versions`, { label: 'v1' }, auth);
    const v2 = await api('POST', `/api/v1/academic/programs/${program.body.data.id}/versions`, { label: 'v2' }, auth);
    await api('PATCH', `/api/v1/academic/program-versions/${v1.body.data.id}`, { status: 'APPROVED' }, auth);
    await api('PATCH', `/api/v1/academic/program-versions/${v2.body.data.id}`, { status: 'APPROVED' }, auth);

    const attempts = await Promise.allSettled([
      api('PATCH', `/api/v1/academic/program-versions/${v1.body.data.id}`, { status: 'ACTIVE' }, auth),
      api('PATCH', `/api/v1/academic/program-versions/${v2.body.data.id}`, { status: 'ACTIVE' }, auth),
    ]);
    const statuses = fulfilled(attempts).map((r) => r.status);
    expect(statuses).toHaveLength(2);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    const active = await db().programVersion.count({
      where: { programId: program.body.data.id, status: 'ACTIVE' },
    });
    expect(active).toBe(1);
  });

  it('§6.2 — two simultaneous substantive appointments on the same seat: exactly one wins', async () => {
    const institution = await seedInstitution();
    await classifyInstitution(institution.id, 'UNIVERSITY');
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, institution.id, Role.ADMIN);
    const auth = bearer(admin.id, Role.ADMIN, institution.id);
    const faculty = await api('POST', '/api/v1/institutional/org-units', {
      nameAr: `كلية السباق ${uniqueSuffix()}`, type: 'FACULTY', city: 'طرابلس',
    }, auth);
    const personA = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مرشح أول', category: 'ACADEMIC_STAFF' }, auth);
    const personB = await api('POST', '/api/v1/institutional/people', { fullNameAr: 'مرشح ثانٍ', category: 'ACADEMIC_STAFF' }, auth);

    const attempts = await Promise.allSettled([
      api('POST', '/api/v1/institutional/appointments', {
        personId: personA.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: faculty.body.data.id,
        startDate: '2026-02-01',
      }, auth),
      api('POST', '/api/v1/institutional/appointments', {
        personId: personB.body.data.id, positionCode: 'FACULTY_DEAN', orgUnitId: faculty.body.data.id,
        startDate: '2026-02-01',
      }, auth),
    ]);
    const statuses = fulfilled(attempts).map((r) => r.status);
    expect(statuses).toHaveLength(2);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    const seat = await db().positionAppointment.count({
      where: {
        institutionId: institution.id,
        position: { code: 'FACULTY_DEAN' },
        orgUnitId: faculty.body.data.id,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        acting: false,
      },
    });
    expect(seat).toBe(1);
  });
});
