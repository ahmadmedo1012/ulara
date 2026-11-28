/**
 * Backend unit test — `GET /me/calendar` (r370, additive).
 *
 * The student calendar used to build its month grid out of /me/dashboard's
 * 7-day agenda, so every month except this week rendered an empty sheet.
 * The new endpoint answers the same four surfaces for an ARBITRARY window;
 * /me/dashboard is untouched (its own suite still pins the old shape).
 *
 * Two layers, both DB-free, following enrollments-scope.test.ts:
 *  1. the pure window builders + range guard exported from the route
 *     module — the actual query contract;
 *  2. the REAL app (createApp, ephemeral port) with prisma mocked and JWTs
 *     signed via signAccessToken: unauthorized scoping, the 400 contract,
 *     the empty-enrollment short circuit, and the success shape.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    membership: { findFirst: vi.fn() },
    enrollment: { findMany: vi.fn() },
    studentProfile: { findFirst: vi.fn() },
    assignment: { findMany: vi.fn() },
    liveSession: { findMany: vi.fn() },
    examTemplate: { findMany: vi.fn() },
    scheduleSlot: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  // Defensive: non-calendar modules in the app graph import withRetry.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import {
  CALENDAR_MAX_RANGE_DAYS,
  CALENDAR_TAKE,
  calendarAssignmentWhere,
  calendarExamWhere,
  calendarLiveWhere,
  calendarQuerySchema,
  calendarRangeError,
} from '../../src/http/routes/student-dashboard.routes.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const STUDENT = 'ckxxxxxxxxxxxxxxxxxxxxst1';
const INSTITUTION = 'inst-r370-calendar';
const OFFERING = 'ckxxxxxxxxxxxxxxxxxxxxof1';
const FACULTY = 'faculty-r370-calendar';

const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const enrollmentFindMany = vi.mocked(prisma.enrollment.findMany);
const profileFindFirst = vi.mocked(prisma.studentProfile.findFirst);
const assignmentFindMany = vi.mocked(prisma.assignment.findMany);
const liveFindMany = vi.mocked(prisma.liveSession.findMany);
const examFindMany = vi.mocked(prisma.examTemplate.findMany);
const slotFindMany = vi.mocked(prisma.scheduleSlot.findMany);

function token(institutionId: string | null, role: Role = Role.STUDENT): string {
  return `Bearer ${signAccessToken(STUDENT, role, institutionId)}`;
}

async function get(query: string, auth = token(INSTITUTION)) {
  const res = await fetch(`${baseUrl}/api/v1/me/calendar?${query}`, {
    headers: { authorization: auth },
  });
  return { status: res.status, json: (await res.json()) as any };
}

const ISO = (d: string) => new Date(`${d}T00:00:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
  membershipFindFirst.mockResolvedValue({ institutionId: INSTITUTION } as never);
  profileFindFirst.mockResolvedValue({ facultyId: FACULTY } as never);
  enrollmentFindMany.mockResolvedValue([{ offeringId: OFFERING }] as never);
  assignmentFindMany.mockResolvedValue([] as never);
  liveFindMany.mockResolvedValue([] as never);
  examFindMany.mockResolvedValue([] as never);
  slotFindMany.mockResolvedValue([] as never);
});

// ── the query contract ────────────────────────────────────────────────
describe('calendarQuerySchema', () => {
  it('accepts a plain civil date and coerces it to UTC midnight', () => {
    const parsed = calendarQuerySchema.parse({ from: '2026-09-01', to: '2026-09-30' });
    expect(parsed.from.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(parsed.to.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  it('accepts full ISO instants', () => {
    const parsed = calendarQuerySchema.parse({
      from: '2026-09-01T08:30:00.000Z',
      to: '2026-09-01T10:00:00.000Z',
    });
    expect(parsed.from.toISOString()).toBe('2026-09-01T08:30:00.000Z');
  });

  it('requires both bounds', () => {
    expect(calendarQuerySchema.safeParse({ from: '2026-09-01' }).success).toBe(false);
    expect(calendarQuerySchema.safeParse({ to: '2026-09-01' }).success).toBe(false);
  });

  it('rejects an unparseable date and unknown parameters', () => {
    expect(calendarQuerySchema.safeParse({ from: 'nope', to: '2026-09-01' }).success).toBe(false);
    expect(
      calendarQuerySchema.safeParse({ from: '2026-09-01', to: '2026-09-02', take: 1 }).success,
    ).toBe(false);
  });
});

describe('calendarRangeError', () => {
  it('accepts a window of exactly the maximum length', () => {
    const from = ISO('2026-01-01');
    const to = new Date(from.getTime() + CALENDAR_MAX_RANGE_DAYS * 86_400_000);
    expect(calendarRangeError(from, to)).toBeNull();
  });

  it('rejects an inverted or empty window', () => {
    expect(calendarRangeError(ISO('2026-09-30'), ISO('2026-09-01'))).not.toBeNull();
    expect(calendarRangeError(ISO('2026-09-01'), ISO('2026-09-01'))).not.toBeNull();
  });

  it('rejects a window longer than one academic year', () => {
    const from = ISO('2026-01-01');
    const to = new Date(from.getTime() + (CALENDAR_MAX_RANGE_DAYS + 1) * 86_400_000);
    expect(calendarRangeError(from, to)).toContain(String(CALENDAR_MAX_RANGE_DAYS));
  });

  it('rejects an Invalid Date instead of passing NaN comparisons', () => {
    expect(calendarRangeError(new Date('nope'), ISO('2026-09-01'))).not.toBeNull();
  });
});

describe('window builders', () => {
  const from = ISO('2026-09-01');
  const to = ISO('2026-09-30');

  it('scopes assignments and live sessions to the offering slice and the window', () => {
    expect(calendarAssignmentWhere([OFFERING], from, to)).toEqual({
      offeringId: { in: [OFFERING] },
      dueAt: { gte: from, lte: to },
    });
    expect(calendarLiveWhere([OFFERING], from, to)).toEqual({
      offeringId: { in: [OFFERING] },
      scheduledAt: { gte: from, lte: to },
    });
  });

  it('matches exams whose window OVERLAPS the range, not only those opening in it', () => {
    const where = calendarExamWhere([OFFERING], FACULTY, from, to) as any;
    expect(where.status).toBe('PUBLISHED');
    // Window overlap: opened at/before `to` AND closes at/after `from`.
    expect(where.AND[1]).toEqual({ OR: [{ openAt: null }, { openAt: { lte: to } }] });
    expect(where.AND[2]).toEqual({ OR: [{ closeAt: null }, { closeAt: { gte: from } }] });
    // Offering union faculty-wide templates, as /me/dashboard does.
    expect(where.AND[0].OR).toEqual([{ offeringId: { in: [OFFERING] } }, { facultyId: FACULTY }]);
  });

  it('omits the faculty union when the caller has no faculty', () => {
    const where = calendarExamWhere([OFFERING], null, from, to) as any;
    expect(where.AND[0].OR).toEqual([{ offeringId: { in: [OFFERING] } }]);
  });
});

// ── the route ─────────────────────────────────────────────────────────
describe('GET /me/calendar', () => {
  it('is authenticated', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/calendar?from=2026-09-01&to=2026-09-30`);
    expect(res.status).toBe(401);
  });

  it('requires a verified institution for a STUDENT (fail closed)', async () => {
    const { status, json } = await get('from=2026-09-01&to=2026-09-30', token(null));
    expect(status).toBe(403);
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(enrollmentFindMany).not.toHaveBeenCalled();
  });

  it('400s on a missing bound and on an inverted range', async () => {
    expect((await get('from=2026-09-01')).status).toBe(400);
    const inverted = await get('from=2026-09-30&to=2026-09-01');
    expect(inverted.status).toBe(400);
    expect(assignmentFindMany).not.toHaveBeenCalled();
  });

  it('400s on a range longer than the cap', async () => {
    const { status } = await get('from=2024-01-01&to=2026-01-01');
    expect(status).toBe(400);
  });

  it('returns empty collections without touching the agenda tables when nothing is enrolled', async () => {
    enrollmentFindMany.mockResolvedValue([] as never);
    const { status, json } = await get('from=2026-09-01&to=2026-09-30');
    expect(status).toBe(200);
    expect(json.data).toMatchObject({ assignments: [], live: [], exams: [], schedule: [] });
    expect(assignmentFindMany).not.toHaveBeenCalled();
    expect(examFindMany).not.toHaveBeenCalled();
  });

  it('answers the four surfaces for the requested window, bounded', async () => {
    assignmentFindMany.mockResolvedValue([
      {
        id: 'a1', offeringId: OFFERING, title: 'واجب ٣', type: 'HOMEWORK',
        dueAt: ISO('2026-09-12'),
        offering: { course: { name: 'الجبر', code: 'MTH101' } },
      },
    ] as never);
    liveFindMany.mockResolvedValue([
      {
        id: 'l1', offeringId: OFFERING, title: 'مراجعة', scheduledAt: ISO('2026-09-15'),
        status: 'SCHEDULED', offering: { course: { name: 'الجبر', code: 'MTH101' } },
      },
    ] as never);
    examFindMany.mockResolvedValue([
      {
        id: 'e1', title: 'اختبار نصفي', kind: 'MIDTERM',
        openAt: ISO('2026-08-20'), closeAt: ISO('2026-10-05'),
        offering: { course: { name: 'الجبر', code: 'MTH101' } }, faculty: { name: 'كلية العلوم' },
      },
    ] as never);
    slotFindMany.mockResolvedValue([
      {
        id: 's1', offeringId: OFFERING, dayOfWeek: 3, startTime: '09:00', endTime: '10:30',
        room: 'قاعة ٤', offering: { course: { name: 'الجبر', code: 'MTH101' } },
      },
    ] as never);

    const { status, json } = await get('from=2026-09-01&to=2026-09-30');
    expect(status).toBe(200);
    expect(json.data.from).toBe('2026-09-01T00:00:00.000Z');
    expect(json.data.to).toBe('2026-09-30T00:00:00.000Z');
    expect(json.data.assignments).toEqual([
      {
        id: 'a1', offeringId: OFFERING, title: 'واجب ٣', type: 'HOMEWORK',
        dueAt: '2026-09-12T00:00:00.000Z', courseName: 'الجبر', courseCode: 'MTH101',
      },
    ]);
    expect(json.data.live[0]).toMatchObject({ id: 'l1', status: 'SCHEDULED', courseCode: 'MTH101' });
    expect(json.data.exams[0]).toMatchObject({
      id: 'e1', kind: 'MIDTERM', courseName: 'الجبر', facultyName: 'كلية العلوم',
    });
    expect(json.data.schedule[0]).toMatchObject({ id: 's1', dayOfWeek: 3, room: 'قاعة ٤' });

    // The window reached the database, and every collection is capped.
    const assignmentArgs = assignmentFindMany.mock.calls[0][0] as any;
    expect(assignmentArgs.where.dueAt).toEqual({ gte: ISO('2026-09-01'), lte: ISO('2026-09-30') });
    expect(assignmentArgs.take).toBe(CALENDAR_TAKE.assignments);
    expect((liveFindMany.mock.calls[0][0] as any).take).toBe(CALENDAR_TAKE.live);
    expect((examFindMany.mock.calls[0][0] as any).take).toBe(CALENDAR_TAKE.exams);
    expect((slotFindMany.mock.calls[0][0] as any).take).toBe(CALENDAR_TAKE.schedule);
    // Enrollments were pinned to the verified institution.
    const enrollmentArgs = enrollmentFindMany.mock.calls[0][0] as any;
    expect(enrollmentArgs.where.offering.course.institutionId).toBe(INSTITUTION);
  });
});
