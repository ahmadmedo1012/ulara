/**
 * Backend unit test — `/me/results` paging + summary mode (r370, additive).
 *
 * Found: the handler loaded EVERY graded submission of the student with a
 * wide select (feedback, title, type, status, submittedAt) and kept 20 of
 * them. The page grew with the student's whole academic history and there
 * was no way to ask for the numbers alone or to page the feed.
 *
 * Fixed: the rollup query now selects only the columns the fold reads; the
 * feed is its own bounded query with a keyset cursor; `mode=summary` runs
 * neither feed query. The BARE request keeps the old response shape.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    membership: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
    submission: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import {
  RESULTS_DEFAULT_RECENT_LIMIT,
  RESULTS_MAX_RECENT_LIMIT,
  decodeResultsCursor,
  encodeResultsCursor,
  meResultsQuerySchema,
  resultsRecentWhere,
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

const STUDENT = 'ckxxxxxxxxxxxxxxxxxxxxst2';
const INSTITUTION = 'inst-r370-results';

const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const gradeFindMany = vi.mocked(prisma.grade.findMany);
const submissionFindMany = vi.mocked(prisma.submission.findMany);

const auth = `Bearer ${signAccessToken(STUDENT, Role.STUDENT, INSTITUTION)}`;

async function get(query = '') {
  const res = await fetch(`${baseUrl}/api/v1/me/results${query}`, {
    headers: { authorization: auth },
  });
  return { status: res.status, json: (await res.json()) as any };
}

/** A graded-submission row as the FEED select returns it. */
function sub(id: string, gradedAt: string | null) {
  return {
    id,
    gradedAt: gradedAt ? new Date(gradedAt) : null,
    submittedAt: new Date('2026-11-01T10:00:00.000Z'),
    grade: 18,
    feedback: 'جيد',
    status: 'GRADED',
    assignment: {
      title: `واجب ${id}`,
      type: 'HOMEWORK',
      weight: 10,
      maxScore: 20,
      offeringId: 'off-1',
      offering: { term: '2026-FALL', course: { code: 'MTH101', name: 'الجبر', themeColor: null } },
    },
  };
}

/** The ROLLUP select — no feedback/title/status/submittedAt. */
function rollupSub(grade: number) {
  return {
    grade,
    assignment: {
      weight: 10,
      maxScore: 20,
      offeringId: 'off-1',
      offering: { term: '2026-FALL', course: { code: 'MTH101', name: 'الجبر', themeColor: null } },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  membershipFindFirst.mockResolvedValue({ institutionId: INSTITUTION } as never);
  gradeFindMany.mockResolvedValue([] as never);
  submissionFindMany.mockResolvedValue([] as never);
});

// ── contract ──────────────────────────────────────────────────────────
describe('meResultsQuerySchema', () => {
  it('defaults the bare request to the old behaviour', () => {
    expect(meResultsQuerySchema.parse({})).toEqual({
      mode: 'full',
      recentLimit: RESULTS_DEFAULT_RECENT_LIMIT,
    });
    expect(RESULTS_DEFAULT_RECENT_LIMIT).toBe(20);
  });

  it('ignores unknown parameters (cache-busters must not 400 a read)', () => {
    expect(meResultsQuerySchema.parse({ _t: '123' }).mode).toBe('full');
  });

  it('bounds the page size and rejects a bad mode', () => {
    expect(meResultsQuerySchema.safeParse({ recentLimit: RESULTS_MAX_RECENT_LIMIT }).success).toBe(true);
    expect(meResultsQuerySchema.safeParse({ recentLimit: RESULTS_MAX_RECENT_LIMIT + 1 }).success).toBe(false);
    expect(meResultsQuerySchema.safeParse({ recentLimit: -1 }).success).toBe(false);
    expect(meResultsQuerySchema.safeParse({ mode: 'everything' }).success).toBe(false);
  });
});

describe('results keyset cursor', () => {
  const row = { gradedAt: new Date('2026-11-20T09:00:00.000Z'), id: 'sub-9' };

  it('round-trips the pair it is built from', () => {
    const decoded = decodeResultsCursor(encodeResultsCursor(row)!);
    expect(decoded).toEqual(row);
  });

  it('keeps the id, so rows sharing an instant are not dropped', () => {
    const predicate = resultsRecentWhere({ studentId: STUDENT }, row) as any;
    expect(predicate.OR).toEqual([
      { gradedAt: { lt: row.gradedAt } },
      { gradedAt: row.gradedAt, id: { lt: row.id } },
    ]);
  });

  it('returns the base filter untouched on page 1', () => {
    expect(resultsRecentWhere({ studentId: STUDENT }, null)).toEqual({ studentId: STUDENT });
  });

  it('refuses to anchor a page on a null gradedAt', () => {
    expect(encodeResultsCursor({ gradedAt: null, id: 'sub-1' })).toBeNull();
  });

  it('rejects malformed cursors instead of silently starting over', () => {
    expect(decodeResultsCursor('')).toBeNull();
    expect(decodeResultsCursor('not-base64|')).toBeNull();
    expect(decodeResultsCursor(Buffer.from('nope|id').toString('base64url'))).toBeNull();
    expect(decodeResultsCursor(Buffer.from('2026-11-20T09:00:00Z').toString('base64url'))).toBeNull();
  });
});

// ── route ─────────────────────────────────────────────────────────────
describe('GET /me/results', () => {
  it('keeps the old shape on the bare request', async () => {
    submissionFindMany.mockResolvedValue([rollupSub(18)] as never);
    const { status, json } = await get();
    expect(status).toBe(200);
    expect(Object.keys(json.data).sort()).toEqual([
      'courses',
      'headline',
      'pendingSubmissions',
      'recentAssignments',
      'recentNextCursor',
    ]);
    expect(json.data.recentNextCursor).toBeNull();
    // Two rollup/all-awaiting reads + the bounded feed.
    expect(submissionFindMany).toHaveBeenCalledTimes(3);
  });

  it('summary mode answers the numbers and runs neither feed query', async () => {
    submissionFindMany.mockResolvedValue([rollupSub(18)] as never);
    const { status, json } = await get('?mode=summary');
    expect(status).toBe(200);
    expect(Object.keys(json.data).sort()).toEqual(['courses', 'headline']);
    expect(submissionFindMany).toHaveBeenCalledTimes(1); // the rollup only
    const rollupArgs = submissionFindMany.mock.calls[0][0] as any;
    // The wide feed columns are NOT part of the rollup select any more.
    expect(rollupArgs.select.feedback).toBeUndefined();
    expect(rollupArgs.select.gradedAt).toBeUndefined();
    expect(rollupArgs.select.assignment.select.title).toBeUndefined();
    expect(rollupArgs.select.assignment.select.weight).toBe(true);
  });

  it('recentLimit=0 skips the feed query entirely', async () => {
    const { status, json } = await get('?recentLimit=0');
    expect(status).toBe(200);
    expect(json.data.recentAssignments).toEqual([]);
    expect(json.data.recentNextCursor).toBeNull();
    expect(submissionFindMany).toHaveBeenCalledTimes(2); // rollup + awaiting
  });

  it('pages the feed with the cursor and hands back the next one', async () => {
    const page = [sub('a', '2026-11-20T09:00:00.000Z'), sub('b', '2026-11-19T09:00:00.000Z')];
    submissionFindMany.mockImplementation((async (args: any) =>
      args?.take === 2 ? page : []) as never);

    const first = await get('?recentLimit=2');
    expect(first.json.data.recentAssignments).toHaveLength(2);
    const cursor = first.json.data.recentNextCursor as string;
    expect(typeof cursor).toBe('string');

    submissionFindMany.mockClear();
    const second = await get(`?recentLimit=2&recentCursor=${encodeURIComponent(cursor)}`);
    expect(second.status).toBe(200);
    const feedArgs = submissionFindMany.mock.calls.find((c) => (c[0] as any)?.take === 2)![0] as any;
    // Page 2 filters strictly BELOW the last row of page 1.
    expect(feedArgs.where.OR).toEqual([
      { gradedAt: { lt: new Date('2026-11-19T09:00:00.000Z') } },
      { gradedAt: new Date('2026-11-19T09:00:00.000Z'), id: { lt: 'b' } },
    ]);
  });

  it('400s on a malformed cursor and on an out-of-range limit', async () => {
    const badCursor = await get('?recentCursor=%%%');
    expect(badCursor.status).toBe(400);
    const badLimit = await get('?recentLimit=500');
    expect(badLimit.status).toBe(400);
    expect(submissionFindMany).not.toHaveBeenCalled();
  });
});
