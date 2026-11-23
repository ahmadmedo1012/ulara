/**
 * r352 FINAL CLOSURE (§11) — the lecture-video REAL-BYTES belt.
 *
 * The r342 t14 belt (lecture-video-access.test.ts) proved the serving
 * gate through absent-object 404s; this belt stages a REAL stored
 * object (STORAGE_DRIVER=postgres — the bytes live as BYTEA rows in
 * the disposable database) and proves the BYTES themselves:
 *   - the authorized caller actually receives them (200 + exact byte
 *     equality, plus a single-range 206 + exact slice + Content-Range);
 *   - an unauthorized caller NEVER receives them — a 403/404 that
 *     carries an error envelope, never a byte of the object;
 *   - TWO institutions: the cross-institution probes cover the
 *     oversight bypass (a foreign ADMIN/QUALITY whose per-row guard
 *     passes assertOfferingAccess) — pinned to the §6 boundary fix
 *     (assertOfferingInCallerInstitution): foreign oversight 404s
 *     (existence never leaks), contextless oversight fails closed.
 *
 * Import discipline (same as postgres-storage-driver.test.ts): env.ts
 * snapshots process.env at import time and getStorage() memoizes the
 * driver — STORAGE_DRIVER=postgres is set BEFORE any src module load;
 * all src/helpers imports are DYNAMIC.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

// The driver selection — read by env.ts BEFORE any src import below.
process.env.STORAGE_DRIVER = 'postgres';

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');
type StorageModule = typeof import('../../src/lib/storage.js');

let helpers: Helpers;
let prisma: DbModule['prisma'];
let getStorage: StorageModule['getStorage'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;

beforeAll(async () => {
  helpers = await import('./helpers.js');
  const appModule: AppModule = await import('../../src/app.js');
  const dbModule: DbModule = await import('../../src/db.js');
  const storageModule: StorageModule = await import('../../src/lib/storage.js');
  prisma = dbModule.prisma;
  getStorage = storageModule.getStorage;
  server = appModule.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  delete process.env.STORAGE_DRIVER;
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/** Recognizable non-utf8-safe bytes — equality failures name the slice. */
const LECTURE_BYTES = Buffer.concat([
  Buffer.from('%MP4-r352-real-bytes-proof \u00ff\u00fe\u0001\u0002\n', 'latin1'),
  Buffer.alloc(8192, 0x5a),
]);

describe('r352 §11 — lecture-video bytes (two institutions, real stored object)', () => {
  beforeEach(async () => {
    const { seedInstitution, seedMembership, seedUser, bearer } = helpers;
    const instA = await seedInstitution();
    const instB = await seedInstitution();

    // ── institution A: the owning teaching chain ──────────────────
    const teacherA = await seedUser({ role: Role.TEACHER, firstName: 'أستاذ أ' });
    await seedMembership(teacherA.id, instA.id, Role.TEACHER);
    const enrolledA = await seedUser({ role: Role.STUDENT, firstName: 'مسجل أ' });
    await seedMembership(enrolledA.id, instA.id, Role.STUDENT);
    const strangerA = await seedUser({ role: Role.STUDENT, firstName: 'غريب أ' });
    await seedMembership(strangerA.id, instA.id, Role.STUDENT);
    const qualityA = await seedUser({ role: Role.QUALITY, firstName: 'جودة أ' });
    await seedMembership(qualityA.id, instA.id, Role.QUALITY);
    const adminA = await seedUser({ role: Role.ADMIN, firstName: 'مدير أ' });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);

    // ── institution B: the foreign tenant probes ──────────────────
    const adminB = await seedUser({ role: Role.ADMIN, firstName: 'مدير ب' });
    await seedMembership(adminB.id, instB.id, Role.ADMIN);
    const qualityB = await seedUser({ role: Role.QUALITY, firstName: 'جودة ب' });
    await seedMembership(qualityB.id, instB.id, Role.QUALITY);
    const studentB = await seedUser({ role: Role.STUDENT, firstName: 'طالب ب' });
    await seedMembership(studentB.id, instB.id, Role.STUDENT);
    const teacherB = await seedUser({ role: Role.TEACHER, firstName: 'أستاذ ب' });
    await seedMembership(teacherB.id, instB.id, Role.TEACHER);

    // The OWNER (platform-wide file oversight by the shared contract).
    const owner = await seedUser({ role: Role.OWNER, firstName: 'المالك' });

    // Institution A's teaching chain → the offering that owns the lecture.
    const facultyA = await prisma.faculty.create({
      data: { name: 'كلية بايتات أ', city: 'طرابلس', institutionId: instA.id },
    });
    const departmentA = await prisma.department.create({
      data: { name: 'قسم بايتات أ', facultyId: facultyA.id },
    });
    const courseA = await prisma.course.create({
      data: {
        code: `VB-A-${Math.floor(Math.random() * 1e6)}`,
        name: 'بايتات أ',
        departmentId: departmentA.id,
        institutionId: instA.id,
      },
    });
    const offeringA = await prisma.courseOffering.create({
      data: { courseId: courseA.id, teacherId: teacherA.id, term: '2026-SPRING' },
    });
    await prisma.enrollment.create({
      data: { studentId: enrolledA.id, offeringId: offeringA.id, status: 'active' },
    });
    // Institution B's own offering + enrollment (the foreign caller has a
    // legitimate enrollment SOMEWHERE — just never in institution A).
    const facultyB = await prisma.faculty.create({
      data: { name: 'كلية بايتات ب', city: 'بنغازي', institutionId: instB.id },
    });
    const departmentB = await prisma.department.create({
      data: { name: 'قسم بايتات ب', facultyId: facultyB.id },
    });
    const courseB = await prisma.course.create({
      data: {
        code: `VB-B-${Math.floor(Math.random() * 1e6)}`,
        name: 'بايتات ب',
        departmentId: departmentB.id,
        institutionId: instB.id,
      },
    });
    const offeringB = await prisma.courseOffering.create({
      data: { courseId: courseB.id, teacherId: teacherB.id, term: '2026-SPRING' },
    });
    await prisma.enrollment.create({
      data: { studentId: studentB.id, offeringId: offeringB.id, status: 'active' },
    });

    // ── the REAL stored object: bytes in the disposable database ──
    const filename = `c${'ab5f3e91'.repeat(4)}.mp4`;
    const key = `lectures/${filename}`;
    await getStorage().put(key, LECTURE_BYTES);
    // The bytes really are durable in the DB (not process memory):
    const stat = await getStorage().stat(key);
    expect(stat).not.toBeNull();
    expect(stat!.size).toBe(LECTURE_BYTES.length);

    await prisma.lecture.create({
      data: {
        offeringId: offeringA.id,
        title: 'محاضرة البايتات الحقيقية',
        ordinal: 1,
        durationSec: 600,
        videoUrl: `/api/v1/files/lectures/${filename}`,
      },
    });

    globalThis.__vb = {
      instA,
      instB,
      teacherA,
      enrolledA,
      strangerA,
      qualityA,
      adminA,
      adminB,
      qualityB,
      studentB,
      teacherB,
      owner,
      offeringA,
      filename,
      teacherAAuth: bearer(teacherA.id, Role.TEACHER, instA.id),
      enrolledAAuth: bearer(enrolledA.id, Role.STUDENT, instA.id),
      strangerAAuth: bearer(strangerA.id, Role.STUDENT, instA.id),
      qualityAAuth: bearer(qualityA.id, Role.QUALITY, instA.id),
      adminAAuth: bearer(adminA.id, Role.ADMIN, instA.id),
      adminAContextlessAuth: bearer(adminA.id, Role.ADMIN, null),
      adminBAuth: bearer(adminB.id, Role.ADMIN, instB.id),
      qualityBAuth: bearer(qualityB.id, Role.QUALITY, instB.id),
      studentBAuth: bearer(studentB.id, Role.STUDENT, instB.id),
      teacherBAuth: bearer(teacherB.id, Role.TEACHER, instB.id),
      ownerAuth: bearer(owner.id, Role.OWNER, null),
    };
  });

  /** Raw GET returning the raw body (bytes may be binary). */
  const rawGet = async (path: string, auth: Record<string, string>, range?: string) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { ...auth, ...(range ? { Range: range } : {}) },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf, headers: res.headers };
  };

  const expectBytes = (buf: Buffer) => expect(buf.equals(LECTURE_BYTES)).toBe(true);

  // ── the authorized callers DO receive the real bytes ────────────

  it('the actively-enrolled STUDENT of the owning institution receives the exact bytes', async () => {
    const w = globalThis.__vb as any;
    const { status, buf, headers } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.enrolledAAuth);
    expect(status).toBe(200);
    expectBytes(buf);
    expect(headers.get('content-type')).toBe('video/mp4');
    expect(headers.get('accept-ranges')).toBe('bytes');
  });

  it('the offering\u2019s TEACHER receives the exact bytes', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.teacherAAuth);
    expect(status).toBe(200);
    expectBytes(buf);
  });

  it('QUALITY oversight of the SAME institution receives the exact bytes (read-only oversight)', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.qualityAAuth);
    expect(status).toBe(200);
    expectBytes(buf);
  });

  it('ADMIN oversight of the SAME institution receives the exact bytes', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.adminAAuth);
    expect(status).toBe(200);
    expectBytes(buf);
  });

  it('the platform OWNER (contextless) keeps the platform-wide file oversight', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.ownerAuth);
    expect(status).toBe(200);
    expectBytes(buf);
  });

  it('a single-range request returns 206 + the EXACT slice + Content-Range (enrolled student)', async () => {
    const w = globalThis.__vb as any;
    const { status, buf, headers } = await rawGet(
      `/api/v1/files/lectures/${w.filename}`,
      w.enrolledAAuth,
      'bytes=8-15',
    );
    expect(status).toBe(206);
    expect(buf.equals(LECTURE_BYTES.subarray(8, 16))).toBe(true);
    expect(headers.get('content-range')).toBe(`bytes 8-15/${LECTURE_BYTES.length}`);
    expect(headers.get('content-length')).toBe('8');
  });

  // ── the unauthorized callers NEVER receive the bytes ────────────

  it('a same-institution STUDENT with no enrollment is 403 — an error envelope, never a byte', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.strangerAAuth);
    expect(status).toBe(403);
    expect(buf.length).toBeLessThan(LECTURE_BYTES.length);
    expect(JSON.parse(buf.toString('utf8')).error.code).toBe('FORBIDDEN');
  });

  it('a foreign-institution STUDENT (legitimately enrolled in ITS OWN offering) is 403 — cross-tenant bytes never', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.studentBAuth);
    expect(status).toBe(403);
    expect(buf.length).toBeLessThan(LECTURE_BYTES.length);
    expect(JSON.parse(buf.toString('utf8')).error.code).toBe('FORBIDDEN');
  });

  it('a foreign-institution TEACHER is 403 — does not teach the owning offering', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.teacherBAuth);
    expect(status).toBe(403);
    expect(buf.length).toBeLessThan(LECTURE_BYTES.length);
  });

  it('a foreign-institution ADMIN (the §6 oversight-bypass probe) 404s — existence never leaks, bytes never', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.adminBAuth);
    // The pre-fix defect: assertOfferingAccess BYPASSES per-row checks
    // for ADMIN, and the route had no institution boundary — the
    // foreign admin streamed the full bytes. The §6 fix pins the
    // boundary: 404 (read mode — no existence leak).
    expect(status).toBe(404);
    expect(buf.length).toBeLessThan(LECTURE_BYTES.length);
    expect(JSON.parse(buf.toString('utf8')).error.code).toBe('NOT_FOUND');
  });

  it('a foreign-institution QUALITY oversight 404s — the same boundary', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.qualityBAuth);
    expect(status).toBe(404);
    expect(buf.length).toBeLessThan(LECTURE_BYTES.length);
  });

  it('a contextless ADMIN fails closed (403 INSTITUTION_CONTEXT_REQUIRED) before any storage touch', async () => {
    const w = globalThis.__vb as any;
    const { status, buf } = await rawGet(`/api/v1/files/lectures/${w.filename}`, w.adminAContextlessAuth);
    expect(status).toBe(403);
    expect(JSON.parse(buf.toString('utf8')).error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __vb: unknown;
}
