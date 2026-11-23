/**
 * r342 t14 — the lecture-video serving gate (closed 2026-11-23).
 *
 * GET /files/lectures/:filename rides the SAME course-level access
 * matrix as every other offering content (assertOfferingAccess):
 * ADMIN/OWNER oversight, the teacher who teaches the offering,
 * actively-enrolled STUDENTs, QUALITY read-only oversight. Before the
 * gate ANY authenticated user of ANY institution could stream ANY
 * lecture whose URL they learned — the minted unguessable key was the
 * only barrier.
 *
 * These tests exercise the gate WITHOUT storage bytes: the
 * authorized-caller path reaches storage.stat and answers the honest
 * 404 FILE_NOT_FOUND for an absent object (the gate PASSED), while the
 * unauthorized caller is stopped with 403 BEFORE any storage lookup.
 * An orphan key (no owning Lecture row) is never streamable by anyone —
 * not even ADMIN.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll } from './helpers.js';

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
  const res = await fetch(`${baseUrl}${path}`, { method, headers: auth });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
};

describe('r342 t14 — the lecture-video serving gate', () => {
  beforeEach(async () => {
    const institution = await seedInstitution();
    const teacher = await seedUser({ role: Role.TEACHER });
    const enrolledStudent = await seedUser({ role: Role.STUDENT });
    const strangerStudent = await seedUser({ role: Role.STUDENT });
    const qualityUser = await seedUser({ role: Role.QUALITY });
    const admin = await seedUser({ role: Role.ADMIN });
    for (const [u, r] of [
      [teacher, Role.TEACHER], [enrolledStudent, Role.STUDENT],
      [strangerStudent, Role.STUDENT], [qualityUser, Role.QUALITY], [admin, Role.ADMIN],
    ] as const) {
      await seedMembership(u.id, institution.id, r as Role);
    }
    const faculty = await db().faculty.create({
      data: { name: 'كلية بوابة الفيديو', city: 'طرابلس', institutionId: institution.id },
    });
    const department = await db().department.create({
      data: { name: 'قسم بوابة الفيديو', facultyId: faculty.id },
    });
    const course = await db().course.create({
      data: {
        code: `VG-${Math.floor(Math.random() * 1e6)}`,
        name: 'بوابة الفيديو',
        departmentId: department.id,
        institutionId: institution.id,
      },
    });
    const offering = await db().courseOffering.create({
      data: { courseId: course.id, teacherId: teacher.id, term: '2026-SPRING' },
    });
    await db().enrollment.create({
      data: { studentId: enrolledStudent.id, offeringId: offering.id, status: 'active' },
    });
    // The minted-key shape the serving route accepts: c + 32 hex chars + .mp4.
    const stem = `c${'a1b2c3d4'.repeat(4)}`;
    const filename = `${stem}.mp4`;
    await db().lecture.create({
      data: {
        offeringId: offering.id,
        title: 'محاضرة البوابة',
        ordinal: 1,
        durationSec: 600,
        videoUrl: `/api/v1/files/lectures/${filename}`,
      },
    });
    globalThis.__vg = {
      institution, teacher, enrolledStudent, strangerStudent, qualityUser, admin, offering, filename,
      orphanFilename: `c${'9f8e7d6c'.repeat(4)}.mp4`,
    };
  });

  it('an actively-enrolled STUDENT passes the gate (honest 404 for the absent object)', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.filename}`, bearer(w.enrolledStudent.id, Role.STUDENT, w.institution.id));
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('الملف');
  });

  it('a STUDENT with no enrollment in the offering is 403 — before any storage touch', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.filename}`, bearer(w.strangerStudent.id, Role.STUDENT, w.institution.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('the offering\u2019s TEACHER passes the gate', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.filename}`, bearer(w.teacher.id, Role.TEACHER, w.institution.id));
    expect(res.status).toBe(404); // gate passed; object absent in the test driver
  });

  it('QUALITY (read-only oversight) passes the gate', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.filename}`, bearer(w.qualityUser.id, Role.QUALITY, w.institution.id));
    expect(res.status).toBe(404);
  });

  it('ADMIN oversight passes the gate', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.filename}`, bearer(w.admin.id, Role.ADMIN, w.institution.id));
    expect(res.status).toBe(404);
  });

  it('an orphan key (no owning Lecture row) is streamable by NOBODY — not even ADMIN', async () => {
    const w = globalThis.__vg as any;
    const res = await api('GET', `/api/v1/files/lectures/${w.orphanFilename}`, bearer(w.admin.id, Role.ADMIN, w.institution.id));
    expect(res.status).toBe(404);
  });

  it('a malformed filename never reaches the gate (400 shape guard)', async () => {
    const w = globalThis.__vg as any;
    // Percent-encoded dot segments: fetch would normalize literal '../..'
    // in the URL, but the ENCODED form reaches express, which decodes the
    // param to '../../etc/passwd.mp4' — exactly the traversal shape the
    // shape guard exists to catch before any lookup.
    const res = await api('GET', '/api/v1/files/lectures/%2e%2e%2f%2e%2e%2fetc%2fpasswd.mp4', bearer(w.admin.id, Role.ADMIN, w.institution.id));
    expect(res.status).toBe(400);
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __vg: unknown;
}
