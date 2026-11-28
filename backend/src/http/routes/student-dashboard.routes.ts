import { Router } from 'express';
import { z } from 'zod';
import { AttemptStatus, Role, SubmissionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { AppError } from '../../lib/errors.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';
import { attendancePctFromStatusCounts } from '../../lib/risk.js';
import { tripoliDayDow } from '../../lib/dates.js';

/**
 * Student dashboard aggregate — Phase 7.
 *
 * One endpoint, one round-trip: greeting context, KPI numbers, term progress,
 * GPA, and a unified agenda combining (today/tomorrow schedule slots,
 * upcoming assignments, upcoming live sessions). Replaces the hardcoded
 * agenda + 92% attendance + 3.8 GPA placeholders that lived in the page.
 */
const router = Router();
router.use(authMiddleware);
// IMPORTANT: do NOT gate the whole router by role.
// The endpoints in this file are personal-data endpoints (/me/dashboard,
// /me/results, /me/materials, /me/lab-sessions). Each one handles a missing
// student profile gracefully (returns an empty/preview shape), so any
// authenticated user can hit them without a 403. The previous
// `requireRole(STUDENT, ADMIN, OWNER)` was producing 403s for TEACHER and
// QUALITY users whenever something — a notification dropdown probe, a
// query-cache prefetch, a stale tab — tried to read these endpoints.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Canonical attendance % (src/lib/risk.ts) ──────────────────────
// round(100 × (PRESENT + 0.5·LATE) / (PRESENT + LATE + ABSENT)) —
// LATE = half credit, EXCUSED excluded from the denominator, null when
// nothing is countable (the KPI renders "—"; the teacher-side risk
// math uses the neutral 100 empty state instead — different consumers,
// different convention, one source of truth in src/lib/risk.ts since
// the audit P2-20 consolidation). This used to be a deliberate
// route-local duplicate of teacher-dashboard's copy; re-exported here
// because tests/modules/dashboard-logic.test.ts imports this module's
// copy.
export { attendancePctFromStatusCounts };

/** Term anchors — fixed for now per the institutional academic calendar.
 *  Easy to swap to a database lookup once /admin/terms is wired.
 *  Pure (takes `now`) and exported for DB-free unit tests. */
export function currentTerm(now = new Date()): { code: string; startsAt: Date; endsAt: Date } {
  // Anchor: a generic two-semester cycle. The fall term runs Sep 10 –
  // Jan 15 (of the next calendar year), the spring term Feb 5 – Jun 15.
  const y = now.getFullYear();
  const fallStart = new Date(y, 8, 10);   // ~Sep 10
  const fallEnd = new Date(y + 1, 0, 15); // ~Jan 15
  const springStart = new Date(y, 1, 5);  // ~Feb 5
  const springEnd = new Date(y, 5, 15);   // ~Jun 15
  if (now >= fallStart && now <= fallEnd) {
    return { code: `${y}-FALL`, startsAt: fallStart, endsAt: fallEnd };
  }
  if (now >= springStart && now <= springEnd) {
    return { code: `${y}-SPRING`, startsAt: springStart, endsAt: springEnd };
  }
  // Off-cycle — return whichever term just ended (audit 11-d P2-1: the
  // old `now > fallEnd` test could never be true inside year y, so the
  // summer window fell through to a term that had ended ~5 months
  // earlier instead of the just-finished spring):
  //  · Jun 16 – Sep 9 (summer break) → this year's spring term
  //  · Jan 1 – Feb 4 (winter break)  → last year's fall term
  return now > springEnd
    ? { code: `${y}-SPRING`, startsAt: springStart, endsAt: springEnd }
    : { code: `${y - 1}-FALL`, startsAt: new Date(y - 1, 8, 10), endsAt: new Date(y, 0, 15) };
}

// ─── /me/results weighted rollup — pure fold, DB-free (audit 15-i TOP-2) ──
// The arithmetic below used to live inline in the handler; it is extracted
// so the student-transcript math is pinned by tests/modules/
// dashboard-logic.test.ts without a DB harness.

/** Prisma `Decimal` duck-type: the fold only needs `toString()` (the
 *  `Number(x.toString())` path Prisma Decimals require), which keeps the
 *  extracted function DB-free — plain numbers satisfy it too. */
export type DecimalLike = { toString(): string };

/** Structural subset of the `prisma.grade.findMany` rows the rollup reads. */
export interface GradeRollupRow {
  offeringId: string;
  kind: string;
  score: DecimalLike;
  maxScore: number;
  weight: number;
  feedback: string | null;
  offering: {
    term: string;
    course: { code: string; name: string; themeColor: string | null };
  };
}

/** Structural subset of the graded-submission rows the rollup reads. */
export interface GradedSubmissionRollupRow {
  grade: DecimalLike | null; // null defensively skipped (the where filters)
  assignment: {
    weight: number;
    maxScore: number;
    offeringId: string;
    offering: {
      term: string;
      course: { code: string; name: string; themeColor: string | null };
    };
  };
}

/** One course's weighted rollup — a `courses[]` row of /me/results. */
export interface CourseRollup {
  offeringId: string;
  term: string;
  courseCode: string;
  courseName: string;
  themeColor: string | null;
  gradePct: number | null;
  breakdown: Array<{ kind: string; score: number; maxScore: number; weight: number; feedback: string | null }>;
}

/**
 * Fold Grade rows + graded submissions into per-course weighted
 * percentages. Grade-table rows and graded submissions share one
 * arithmetic — score/maxScore as pct, weighted by the item's weight — and
 * a course graded only through submissions shows up instead of being
 * invisible (audit 11-d P1-6). `breakdown` stays Grade-table-only.
 * Courses sort by gradePct descending, nulls (weightTotal 0) last.
 */
export function rollupCourseGrades(
  gradeRows: readonly GradeRollupRow[],
  gradedSubs: readonly GradedSubmissionRollupRow[],
): CourseRollup[] {
  interface CourseRow {
    offeringId: string;
    term: string;
    courseCode: string;
    courseName: string;
    themeColor: string | null;
    weightedSum: number;
    weightTotal: number;
    breakdown: Array<{ kind: string; score: number; maxScore: number; weight: number; feedback: string | null }>;
  }
  const byOffering = new Map<string, CourseRow>();
  const rowFor = (
    offeringId: string,
    offering: GradeRollupRow['offering'],
  ): CourseRow => {
    let row = byOffering.get(offeringId);
    if (!row) {
      row = {
        offeringId,
        term: offering.term,
        courseCode: offering.course.code,
        courseName: offering.course.name,
        themeColor: offering.course.themeColor,
        weightedSum: 0,
        weightTotal: 0,
        breakdown: [],
      };
      byOffering.set(offeringId, row);
    }
    return row;
  };

  // Officially recorded Grade rows — each also lands in `breakdown`.
  // A maxScore ≤ 0 row contributes a 0 pct but still its weight — pinned
  // historical semantics (score/0 would be Infinity without the guard).
  for (const g of gradeRows) {
    const pct = g.maxScore > 0 ? (Number(g.score.toString()) / g.maxScore) * 100 : 0;
    const row = rowFor(g.offeringId, g.offering);
    row.weightedSum += pct * g.weight;
    row.weightTotal += g.weight;
    row.breakdown.push({
      kind: g.kind,
      score: Number(g.score.toString()),
      maxScore: g.maxScore,
      weight: g.weight,
      feedback: g.feedback,
    });
  }

  // Graded assignment submissions (audit 11-d P1-6) — folded with the
  // same arithmetic the Grade rows use, never into `breakdown`.
  for (const s of gradedSubs) {
    if (s.grade === null) continue; // defensive — the where already filters
    const pct = s.assignment.maxScore > 0
      ? (Number(s.grade.toString()) / s.assignment.maxScore) * 100
      : 0;
    const row = rowFor(s.assignment.offeringId, s.assignment.offering);
    row.weightedSum += pct * s.assignment.weight;
    row.weightTotal += s.assignment.weight;
  }

  return Array.from(byOffering.values()).map((r) => ({
    offeringId: r.offeringId,
    term: r.term,
    courseCode: r.courseCode,
    courseName: r.courseName,
    themeColor: r.themeColor,
    gradePct: r.weightTotal > 0 ? Math.round(r.weightedSum / r.weightTotal) : null,
    breakdown: r.breakdown,
  })).sort((a, b) => (b.gradePct ?? -1) - (a.gradePct ?? -1));
}

/** The `headline` object of /me/results — avg / highest / lowest over the
 *  graded (non-null gradePct) courses only; courseCount counts them all. */
export interface ResultsHeadline {
  avgGradePct: number | null;
  highest: { courseName: string; gradePct: number } | null;
  lowest: { courseName: string; gradePct: number } | null;
  courseCount: number;
}

/** Pure fold of `courses` → the /me/results headline. Null-gradePct
 *  courses (weightTotal 0) never reach avg/highest/lowest. */
export function resultsHeadline(courses: readonly CourseRollup[]): ResultsHeadline {
  const valid = courses.filter((c): c is CourseRollup & { gradePct: number } => c.gradePct !== null);
  const avg = valid.length > 0 ? Math.round(valid.reduce((a, c) => a + c.gradePct, 0) / valid.length) : null;
  const top = valid.length > 0 ? valid.reduce((a, c) => (c.gradePct > a.gradePct ? c : a)) : null;
  const low = valid.length > 0 ? valid.reduce((a, c) => (c.gradePct < a.gradePct ? c : a)) : null;
  return {
    avgGradePct: avg,
    highest: top ? { courseName: top.courseName, gradePct: top.gradePct } : null,
    lowest: low ? { courseName: low.courseName, gradePct: low.gradePct } : null,
    courseCount: courses.length,
  };
}

// ─── /me/results submission timeline (r164-e) — pure, DB-free ─────
// The assessment loop's student-side half: a submission's journey is
// submitted → awaiting grading → graded (score + feedback). The graded
// half already fed /me/results (recentAssignments); the awaiting half
// and the teacher's feedback had no read surface at all. Both mappers
// below are extracted + exported so tests/modules/dashboard-logic.test.ts
// pins them without a DB harness.

/**
 * Statuses of a submission still waiting on the teacher's grade — the
 * student-side mirror of the teacher queue's
 * PENDING_SUBMISSION_STATUSES (teacher-dashboard.routes.ts, r157/6A8):
 * the two ends of the loop count the SAME rows, so «بانتظار التقييم»
 * never means different things on each side of the loop. RETURNED /
 * DRAFT / GRADED are terminal or absent from the live state machine
 * (no route ever writes RETURNED — enum value only) and are
 * deliberately excluded.
 */
export const AWAITING_GRADE_STATUSES: readonly SubmissionStatus[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.LATE,
];

/** Structural subset of the graded-submission rows the recent feed reads. */
export interface RecentAssignmentFeedRow {
  id: string;
  grade: DecimalLike | null;
  feedback: string | null;
  submittedAt: Date;
  gradedAt: Date | null;
  assignment: {
    title: string;
    type: string;
    maxScore: number;
    offeringId: string;
  };
}

/** One graded row of the /me/results recentAssignments feed. */
export interface RecentAssignmentFeedItem {
  id: string;
  title: string;
  type: string;
  offeringId: string;
  /** Raw awarded score (Decimal → number) — the pct alone hid both the
   *  ceiling and the teacher's rubric. */
  grade: number | null;
  maxScore: number;
  gradePct: number;
  /** The teacher's grading feedback — never surfaced before r164-e. */
  feedback: string | null;
  /** When the student handed the work in (the timeline's step 1). */
  submittedAt: Date;
  gradedAt: Date | null;
}

/** Graded submissions → the recentAssignments feed (take bounded by the
 *  handler). Same gradePct arithmetic the rollup fold uses. */
export function recentAssignmentFeed(
  gradedSubs: readonly RecentAssignmentFeedRow[],
): RecentAssignmentFeedItem[] {
  return gradedSubs.map((s) => ({
    id: s.id,
    title: s.assignment.title,
    type: s.assignment.type,
    offeringId: s.assignment.offeringId,
    grade: s.grade === null ? null : Number(s.grade.toString()),
    maxScore: s.assignment.maxScore,
    gradePct: s.assignment.maxScore > 0 && s.grade !== null
      ? Math.round((Number(s.grade.toString()) / s.assignment.maxScore) * 100)
      : 0,
    feedback: s.feedback,
    submittedAt: s.submittedAt,
    gradedAt: s.gradedAt,
  }));
}

/** Structural subset of the awaiting-grading rows the pending feed reads.
 *  Named AWAITING_* (not PENDING_*) — teacher-dashboard.routes.ts already
 *  exports a PendingSubmissionFeedRow of its own (different shape), and a
 *  shared name would collide at every star-import site. */
export interface AwaitingSubmissionFeedRow {
  id: string;
  status: SubmissionStatus;
  submittedAt: Date;
  assignment: {
    title: string;
    type: string;
    offeringId: string;
    offering: { course: { code: string; name: string } };
  };
}

/** One awaiting-grading row of the /me/results pendingSubmissions feed. */
export interface AwaitingSubmissionFeedItem {
  id: string;
  title: string;
  type: string;
  offeringId: string;
  courseCode: string;
  courseName: string;
  status: SubmissionStatus;
  /** LATE rides as its own flag (the 16-B1 queue contract) so the FE
   *  chips the lateness without string-matching the title. */
  late: boolean;
  submittedAt: Date;
}

/** Awaiting-grading submissions → the pendingSubmissions feed (the
 *  timeline's middle step: submitted, awaiting the teacher's grade). */
export function pendingSubmissionFeed(
  rows: readonly AwaitingSubmissionFeedRow[],
): AwaitingSubmissionFeedItem[] {
  return rows.map((s) => ({
    id: s.id,
    title: s.assignment.title,
    type: s.assignment.type,
    offeringId: s.assignment.offeringId,
    courseCode: s.assignment.offering.course.code,
    courseName: s.assignment.offering.course.name,
    status: s.status,
    late: s.status === SubmissionStatus.LATE,
    submittedAt: s.submittedAt,
  }));
}

/**
 * r164-c — agenda exams: the fourth bucket of the /me/dashboard agenda.
 *
 * The agenda shipped classes + assignments + live, but exams — the only
 * other real deadline surface a student has — were invisible: a FINAL
 * closing tomorrow never appeared on the dashboard (the gap-matrix
 * "agenda misses exams" finding). The candidate set mirrors the
 * /exams/me scoping (PUBLISHED templates for the student's enrolled
 * offerings or their faculty, exams.routes.ts); THIS pure selector makes
 * the precise week-window + attemptability decision, DB-free and
 * exported for tests/modules/student-agenda-exams.test.ts.
 */
export type AgendaExamPhase = 'opens' | 'closes';

/** Does this attempt mean the exam is FINISHED for this student? SUBMITTED
 *  / GRADED always (the work is delivered); EXPIRED only for non-PRACTICE
 *  kinds — a finished practice attempt is retakeable and an IN_PROGRESS
 *  one is resumable (the D5 start contract), so neither is finished. */
export function examAttemptFinished(status: AttemptStatus, kind: string): boolean {
  return (
    status === AttemptStatus.SUBMITTED ||
    status === AttemptStatus.GRADED ||
    (status === AttemptStatus.EXPIRED && kind !== 'PRACTICE')
  );
}

/** Structural subset of the prisma.examTemplate rows the selector reads
 *  (the handler maps its findMany onto this shape). `finished` is folded
 *  by the CALLER from the student's attempts via examAttemptFinished
 *  (per attempt, OR-folded across attempts). */
export interface AgendaExamCandidate {
  id: string;
  title: string;
  kind: string;
  openAt: Date | null;
  closeAt: Date | null;
  courseName: string | null;
  courseCode: string | null;
  facultyName: string | null;
  finished: boolean;
}

/** One agenda.exams row on the wire (additive — existing consumers that
 *  only read classes/assignments/live are unaffected). `phase` tells the
 *  FE which label renders («يفتح» for a future openAt, «آخر موعد» for an
 *  open window's closeAt); `whenAt` is that milestone instant — never
 *  null, always inside [now, horizon], the FE agenda's whenMs key. */
export interface AgendaExamRow {
  id: string;
  title: string;
  kind: string;
  openAt: Date | null;
  closeAt: Date | null;
  whenAt: Date;
  phase: AgendaExamPhase;
  courseName: string | null;
  courseCode: string | null;
  facultyName: string | null;
}

/** Which PUBLISHED, still-actable exams have a milestone inside the week
 *  horizon. Rules (each pinned by a unit test):
 *   · finished exams never surface — there is nothing left to act on;
 *   · a window whose closeAt already passed is closed (mirrors the start
 *     route's «أغلق باب التسليم» guard) — skipped;
 *   · not-yet-open window → milestone = openAt (phase 'opens');
 *   · open window → milestone = closeAt (phase 'closes'); a window with
 *     NO closeAt is perpetually attemptable — no deadline event, so it
 *     never enters the agenda;
 *   · milestone beyond the horizon → skipped: the agenda stays a 7-day
 *     window exactly like the assignments bucket (dueAt ≤ horizon).
 * Sort: milestone ascending, id as the deterministic tiebreaker. */
export function selectAgendaExams(
  candidates: readonly AgendaExamCandidate[],
  now: Date,
  horizon: Date,
  take = 4,
): AgendaExamRow[] {
  const rows: AgendaExamRow[] = [];
  for (const c of candidates) {
    if (c.finished) continue;
    if (c.closeAt !== null && c.closeAt.getTime() < now.getTime()) continue;
    let phase: AgendaExamPhase;
    let when: Date;
    if (c.openAt !== null && c.openAt.getTime() > now.getTime()) {
      phase = 'opens';
      when = c.openAt;
    } else {
      if (c.closeAt === null) continue;
      phase = 'closes';
      when = c.closeAt;
    }
    if (when.getTime() > horizon.getTime()) continue;
    rows.push({
      id: c.id,
      title: c.title,
      kind: c.kind,
      openAt: c.openAt,
      closeAt: c.closeAt,
      whenAt: when,
      phase,
      courseName: c.courseName,
      courseCode: c.courseCode,
      facultyName: c.facultyName,
    });
  }
  return rows
    .sort((a, b) => a.whenAt.getTime() - b.whenAt.getTime() || a.id.localeCompare(b.id))
    .slice(0, take);
}

/**
 * GET /me/results — every grade the student has, rolled up per course
 * with a weighted percentage. Replaces the hardcoded 5-row RESULTS array
 * that lived in the frontend.
 *
 * Graded assignment submissions are folded into the same weighted rollup
 * (audit 11-d P1-6, read side): grading a submission only ever wrote the
 * Submission row, so teacher-graded assignment work was silently missing
 * from these numbers. `breakdown` stays Grade-table-only (officially
 * recorded kinds); recent graded submissions surface in recentAssignments.
 *
 * r164-e (assessment loop): recentAssignments now carries the full graded
 * row — score + maxScore + the teacher's feedback + the submission
 * timestamp — and a new pendingSubmissions feed surfaces the
 * awaiting-grading middle state (submitted → awaiting grading → graded)
 * so the loop is traceable from the student's side end to end. Both
 * additions are additive: pre-r164-e consumers keep compiling against
 * the old shape.
 */
/**
 * r370 — /me/results query contract (additive: the bare request is
 * byte-identical to the old one).
 *
 * The handler used to ship EVERY graded submission of the student with a
 * wide select (feedback, title, type, status, submittedAt) and then keep
 * 20 of them — the page grew with the student's whole academic history,
 * and there was no way to ask for the numbers alone.
 *
 *   mode=summary   headline + courses, and neither feed query runs
 *   recentLimit    rows in `recentAssignments` (0…100, default 20)
 *   recentCursor   opaque keyset cursor from `recentNextCursor`
 *
 * Unknown parameters are ignored on purpose (cache-busters must not turn
 * a read into a 400); a malformed cursor is a 400.
 */
export const meResultsQuerySchema = z.object({
  mode: z.enum(['full', 'summary']).default('full'),
  recentLimit: z.coerce.number().int().min(0).max(100).default(20),
  recentCursor: z.string().min(1).max(200).optional(),
});

export const RESULTS_DEFAULT_RECENT_LIMIT = 20;
export const RESULTS_MAX_RECENT_LIMIT = 100;

/** Keyset cursor over the feed's own ordering: (gradedAt desc, id desc).
 *  A cursor that only carried `gradedAt` would drop rows when two
 *  submissions share an instant. */
export function encodeResultsCursor(row: { gradedAt: Date | null; id: string }): string | null {
  // gradedAt is nullable in the schema (a legacy GRADED row may have none).
  // Such rows sort first under `DESC` and can never anchor a keyset.
  if (!row.gradedAt) return null;
  return Buffer.from(`${row.gradedAt.toISOString()}|${row.id}`, 'utf8').toString('base64url');
}

export function decodeResultsCursor(cursor: string): { gradedAt: Date; id: string } | null {
  const [iso, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || !iso || !id) return null;
  const gradedAt = new Date(iso);
  if (Number.isNaN(gradedAt.getTime())) return null;
  return { gradedAt, id };
}

/** The `recentAssignments` keyset predicate, or an empty object for page 1. */
export function resultsRecentWhere(
  base: Prisma.SubmissionWhereInput,
  cursor: { gradedAt: Date; id: string } | null,
): Prisma.SubmissionWhereInput {
  if (!cursor) return base;
  return {
    ...base,
    OR: [
      { gradedAt: { lt: cursor.gradedAt } },
      { gradedAt: cursor.gradedAt, id: { lt: cursor.id } },
    ],
  };
}

router.get('/me/results', validate(meResultsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { mode, recentLimit, recentCursor } = req.query as unknown as {
      mode: 'full' | 'summary';
      recentLimit: number;
      recentCursor?: string;
    };
    const cursor = recentCursor ? decodeResultsCursor(recentCursor) : null;
    if (recentCursor && !cursor) {
      throw AppError.badRequest('مؤشر الصفحة غير صالح');
    }
    const userId = req.user!.id;
    // r179 (phase-5): a STUDENT caller needs a DB-verified institution
    // context (403 INSTITUTION_CONTEXT_REQUIRED without one) and every
    // feed below is pinned to that institution through the
    // offering → course chain (a multi-institution student never sees
    // another institution's grades here).
    const studentInstitution =
      req.user!.role === Role.STUDENT
        ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
        : null;
    if (req.user!.role === Role.STUDENT && !studentInstitution) {
      throw institutionContextRequiredError();
    }
    const institutionFilter = studentInstitution
      ? { offering: { course: { institutionId: studentInstitution } } }
      : null;

    const grades = await prisma.grade.findMany({
      where: { studentId: userId, ...(institutionFilter ?? {}) },
      include: {
        offering: {
          select: {
            id: true, term: true,
            course: { select: { id: true, code: true, name: true, themeColor: true } },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Graded assignment submissions (audit 11-d P1-6) feed the weighted
    // rollup. r370: this query now selects ONLY the columns the fold reads
    // (grade + the assignment's weight/maxScore/offering) — the feed's
    // wide columns (feedback, title, type, status, submittedAt) moved to
    // their own bounded, pageable query below, so the rollup no longer
    // pays for bytes it throws away.
    const gradedSubs = await prisma.submission.findMany({
      where: {
        studentId: userId,
        status: SubmissionStatus.GRADED,
        grade: { not: null },
        ...(studentInstitution
          ? { assignment: { offering: { course: { institutionId: studentInstitution } } } }
          : {}),
      },
      select: {
        grade: true,
        assignment: {
          select: {
            weight: true, maxScore: true, offeringId: true,
            offering: { select: { term: true, course: { select: { code: true, name: true, themeColor: true } } } },
          },
        },
      },
    });

    const courses = rollupCourseGrades(grades, gradedSubs);

    // summary mode: the numbers alone. Neither feed query runs.
    if (mode === 'summary') {
      res.json({ data: { headline: resultsHeadline(courses), courses } });
      return;
    }

    const gradedWhere: Prisma.SubmissionWhereInput = {
      studentId: userId,
      status: SubmissionStatus.GRADED,
      grade: { not: null },
      ...(studentInstitution
        ? { assignment: { offering: { course: { institutionId: studentInstitution } } } }
        : {}),
    };

    // Secondary "what was just returned to me" feed — bounded and pageable
    // (r370). Default order/limit are exactly the old `slice(0, 20)`; the
    // awaiting-grading half runs here too so `mode=summary` skips both.
    const [recentSubs, awaitingSubs] = await Promise.all([
      recentLimit === 0
        ? Promise.resolve([])
        : prisma.submission.findMany({
            where: resultsRecentWhere(gradedWhere, cursor),
            orderBy: [{ gradedAt: 'desc' }, { id: 'desc' }],
            take: recentLimit,
            select: {
              id: true,
              gradedAt: true,
              submittedAt: true,
              grade: true,
              feedback: true,
              status: true,
              assignment: {
                select: {
                  title: true, type: true, weight: true, maxScore: true, offeringId: true,
                  offering: { select: { term: true, course: { select: { code: true, name: true, themeColor: true } } } },
                },
              },
            },
          }),
      prisma.submission.findMany({
        where: {
          studentId: userId,
          status: { in: [...AWAITING_GRADE_STATUSES] },
          ...(studentInstitution
            ? { assignment: { offering: { course: { institutionId: studentInstitution } } } }
            : {}),
        },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true, status: true, submittedAt: true,
          assignment: {
            select: {
              title: true, type: true, offeringId: true,
              offering: { select: { course: { select: { code: true, name: true } } } },
            },
          },
        },
      }),
    ]);
    const recentAssignments = recentAssignmentFeed(recentSubs);
    // A full page means there may be more; anything shorter is the tail.
    const last = recentSubs.length === recentLimit && recentLimit > 0
      ? recentSubs[recentSubs.length - 1]
      : null;

    res.json({
      data: {
        headline: resultsHeadline(courses),
        courses,
        recentAssignments,
        pendingSubmissions: pendingSubmissionFeed(awaitingSubs),
        recentNextCursor: last ? encodeResultsCursor(last) : null,
      },
    });
  } catch (e) { next(e); }
});

/**
 * GET /me/materials — every material across the student's active enrolments,
 * sorted by upload date. Backs the "Downloads" page.
 */
router.get('/me/materials', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // r179 (phase-5): a STUDENT caller needs a DB-verified institution
    // context (403 without one); the materials feed is pinned to it via
    // enrollment → offering → course.
    const studentInstitution =
      req.user!.role === Role.STUDENT
        ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
        : null;
    if (req.user!.role === Role.STUDENT && !studentInstitution) {
      throw institutionContextRequiredError();
    }
    const enrolments = await prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: 'active',
        ...(studentInstitution
          ? { offering: { course: { institutionId: studentInstitution } } }
          : {}),
      },
      select: { offeringId: true },
    });
    const offeringIds = enrolments.map((e) => e.offeringId);
    if (offeringIds.length === 0) {
      res.json({ data: [] });
      return;
    }

    const materials = await prisma.material.findMany({
      where: { offeringId: { in: offeringIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, name: true, type: true, url: true,
        sizeBytes: true, createdAt: true,
        offering: { select: { course: { select: { code: true, name: true } } } },
      },
    });
    res.json({
      data: materials.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        sizeBytes: Number(m.sizeBytes),
        createdAt: m.createdAt,
        course: m.offering.course,
      })),
    });
  } catch (e) { next(e); }
});

/**
 * GET /me/lab-sessions — student's lab session history with simple aggregates.
 */
router.get('/me/lab-sessions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // Counts come from count() queries — the old shape derived active/
    // completed/total from the take:50 slice, freezing `total` at 50 past
    // the 50th session (audit 11-d P1-9). `recent` only ever rendered 10
    // rows, so the fetch takes exactly 10.
    const [active, completed, recentSessions] = await Promise.all([
      prisma.labSession.count({ where: { userId, completedAt: null } }),
      prisma.labSession.count({ where: { userId, completedAt: { not: null } } }),
      prisma.labSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { lab: { select: { id: true, name: true } } },
      }),
    ]);
    res.json({
      data: {
        active,
        completed,
        total: active + completed,
        recent: recentSessions.map((s) => ({
          id: s.id,
          experimentName: s.experimentName,
          progressPct: s.progressPct,
          score: s.score ? Number(s.score.toString()) : null,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          lab: s.lab,
        })),
      },
    });
  } catch (e) { next(e); }
});

/**
 * r154d: body schema for POST /me/lab-sessions — a student records a
 * completed virtual-lab experiment. labId must be a cuid that resolves to
 * an existing VirtualLab; experimentName is the human title the runner
 * showed (3–200 chars). Exported for unit tests.
 */
export const createLabSessionSchema = z.object({
  labId: z.string().cuid(),
  experimentName: z.string().trim().min(3).max(200),
}).strict();

/**
 * POST /me/lab-sessions — persist a completed lab experiment (r154d).
 *
 * The LabsPage runner used to call `setDone(true)` on the last step and
 * show «أحسنت! أكملت التجربة بنجاح» without ever writing a row — the
 * «تجارب مكتملة» KPI stayed at 0 forever. This endpoint creates the
 * LabSession the KPI already aggregates (GET /me/lab-sessions above).
 *
 * Redoing an experiment is legitimate (each completion is its own
 * session), so there is no dedupe — a per-user rate limiter (10/min)
 * bounds accidental double-clicks and client loops. progressPct is 100
 * and completedAt is now: the runner only reaches this endpoint after
 * stepping through every step of the experiment.
 */
router.post(
  '/me/lab-sessions',
  createRouteLimiter({ max: 10 }),
  validate(createLabSessionSchema),
  async (req, res, next) => {
    try {
      const { labId, experimentName } = req.body as z.infer<typeof createLabSessionSchema>;
      const lab = await prisma.virtualLab.findUnique({
        where: { id: labId },
        select: { id: true },
      });
      if (!lab) throw AppError.notFound('المعمل غير موجود');
      const session = await prisma.labSession.create({
        data: {
          labId,
          userId: req.user!.id,
          experimentName,
          progressPct: 100,
          completedAt: new Date(),
        },
        select: { id: true, completedAt: true },
      });
      res.status(201).json({ data: session });
    } catch (e) { next(e); }
  },
);

// ─── r370 — GET /me/calendar: the WINDOWED agenda (additive) ─────────
//
// Why: /me/dashboard's agenda is deliberately a 7-DAY window (classes for
// today/tomorrow, assignments + live sessions inside `horizon`, exams
// inside the week). The student calendar then composed its MONTH grid from
// that payload, so browsing any other month showed an essentially empty
// sheet — the deadlines were in the database but never in the window.
//
// This endpoint answers the same four surfaces for an ARBITRARY range and
// changes nothing about /me/dashboard (no field, no default, no shape):
//   · assignments — due inside [from, to]
//   · live        — scheduled inside [from, to]
//   · exams       — PUBLISHED windows that OVERLAP [from, to] (an exam that
//                   opened in September and closes in December is visible
//                   in November), the same offering-or-faculty scope as
//                   /me/dashboard
//   · schedule    — the recurring weekly slots behind the month grid
//
// Bounds: the window is capped at CALENDAR_MAX_RANGE_DAYS and every
// collection has a documented `take`, so a client cannot turn the month
// browse into an unbounded read.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Largest window a single request may ask for (one full academic year). */
export const CALENDAR_MAX_RANGE_DAYS = 366;

/** Per-collection ceilings — a month of one student's life, not the school's. */
export const CALENDAR_TAKE = {
  assignments: 500,
  live: 300,
  exams: 200,
  schedule: 500,
} as const;

/**
 * Query contract: `from` and `to` are required ISO-8601 instants (a plain
 * `YYYY-MM-DD` is accepted and read as UTC midnight — the calendar's civil
 * keys are built client-side). Anything unparseable is a 400.
 */
export const calendarQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .strict();

/**
 * Window validation, separated from the route so the rules are testable
 * without HTTP: parseable, `to > from`, and at most CALENDAR_MAX_RANGE_DAYS.
 * Returns null when the window is legal (the message is user-facing Arabic
 * copy — D17-3 — with the numbers left for the FE to localise).
 */
export function calendarRangeError(from: Date, to: Date): string | null {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'صيغة التاريخ غير صالحة';
  }
  if (to.getTime() <= from.getTime()) {
    return 'نهاية النطاق يجب أن تكون بعد بدايته';
  }
  if (to.getTime() - from.getTime() > CALENDAR_MAX_RANGE_DAYS * DAY_MS) {
    return `أقصى نطاق للتقويم ${CALENDAR_MAX_RANGE_DAYS} يوم`;
  }
  return null;
}

/** Assignments due inside the window, for the student's offerings. */
export function calendarAssignmentWhere(
  offeringIds: readonly string[],
  from: Date,
  to: Date,
): Prisma.AssignmentWhereInput {
  return { offeringId: { in: [...offeringIds] }, dueAt: { gte: from, lte: to } };
}

/** Live sessions scheduled inside the window (cancelled ones included —
 *  the calendar is a record of the month, not a to-do list). */
export function calendarLiveWhere(
  offeringIds: readonly string[],
  from: Date,
  to: Date,
): Prisma.LiveSessionWhereInput {
  return { offeringId: { in: [...offeringIds] }, scheduledAt: { gte: from, lte: to } };
}

/**
 * Published exam windows that OVERLAP the range: the window opened before
 * the range ends AND (it has no close, or it closes after the range
 * starts). A not-yet-open exam is included — its `openAt` is a real event
 * inside a future month. Faculty-wide templates join the union exactly as
 * they do on /me/dashboard.
 */
export function calendarExamWhere(
  offeringIds: readonly string[],
  facultyId: string | null,
  from: Date,
  to: Date,
): Prisma.ExamTemplateWhereInput {
  return {
    status: 'PUBLISHED',
    AND: [
      {
        OR: [
          { offeringId: { in: [...offeringIds] } },
          ...(facultyId ? [{ facultyId }] : []),
        ],
      },
      { OR: [{ openAt: null }, { openAt: { lte: to } }] },
      { OR: [{ closeAt: null }, { closeAt: { gte: from } }] },
    ],
  };
}

router.get(
  '/me/calendar',
  validate(calendarQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { from, to } = req.query as unknown as { from: Date; to: Date };
      const rangeError = calendarRangeError(from, to);
      if (rangeError) throw AppError.badRequest(rangeError);

      const userId = req.user!.id;
      // Same scoping law as every other /me feed: a STUDENT needs a
      // DB-verified institution context; the offerings are pinned to it.
      const institution = await resolveCallerInstitutionScope(
        req.user!.id,
        req.user!.institutionId,
      );
      if (req.user!.role === Role.STUDENT && !institution) {
        throw institutionContextRequiredError();
      }

      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId: userId,
          status: 'active',
          ...(institution
            ? { offering: { course: { institutionId: institution } } }
            : {}),
        },
        select: { offeringId: true },
      });
      const offeringIds = enrollments.map((e) => e.offeringId);
      if (offeringIds.length === 0) {
        res.json({
          data: { from, to, assignments: [], live: [], exams: [], schedule: [] },
        });
        return;
      }

      const profile = institution
        ? await prisma.studentProfile.findFirst({
            where: {
              userId,
              institutionId: institution,
              membership: { isActive: true },
            },
            select: { facultyId: true },
          })
        : null;

      const [assignments, live, exams, schedule] = await Promise.all([
        prisma.assignment.findMany({
          where: calendarAssignmentWhere(offeringIds, from, to),
          orderBy: { dueAt: 'asc' },
          take: CALENDAR_TAKE.assignments,
          select: {
            id: true, title: true, type: true, dueAt: true, offeringId: true,
            offering: { select: { course: { select: { name: true, code: true } } } },
          },
        }),
        prisma.liveSession.findMany({
          where: calendarLiveWhere(offeringIds, from, to),
          orderBy: { scheduledAt: 'asc' },
          take: CALENDAR_TAKE.live,
          select: {
            id: true, title: true, scheduledAt: true, status: true, offeringId: true,
            offering: { select: { course: { select: { name: true, code: true } } } },
          },
        }),
        prisma.examTemplate.findMany({
          where: calendarExamWhere(offeringIds, profile?.facultyId ?? null, from, to),
          orderBy: { openAt: 'asc' },
          take: CALENDAR_TAKE.exams,
          select: {
            id: true, title: true, kind: true, openAt: true, closeAt: true,
            offering: { select: { course: { select: { name: true, code: true } } } },
            faculty: { select: { name: true } },
          },
        }),
        prisma.scheduleSlot.findMany({
          where: { offeringId: { in: offeringIds } },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          take: CALENDAR_TAKE.schedule,
          select: {
            id: true, dayOfWeek: true, startTime: true, endTime: true, room: true,
            offeringId: true,
            offering: { select: { course: { select: { name: true, code: true } } } },
          },
        }),
      ]);

      res.json({
        data: {
          from,
          to,
          assignments: assignments.map((a) => ({
            id: a.id,
            offeringId: a.offeringId,
            title: a.title,
            type: a.type,
            dueAt: a.dueAt,
            courseName: a.offering.course.name,
            courseCode: a.offering.course.code,
          })),
          live: live.map((l) => ({
            id: l.id,
            offeringId: l.offeringId,
            title: l.title,
            scheduledAt: l.scheduledAt,
            status: l.status,
            courseName: l.offering.course.name,
            courseCode: l.offering.course.code,
          })),
          exams: exams.map((e) => ({
            id: e.id,
            title: e.title,
            kind: e.kind,
            openAt: e.openAt,
            closeAt: e.closeAt,
            courseName: e.offering?.course.name ?? null,
            courseCode: e.offering?.course.code ?? null,
            facultyName: e.faculty?.name ?? null,
          })),
          schedule: schedule.map((s) => ({
            id: s.id,
            offeringId: s.offeringId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            courseName: s.offering.course.name,
            courseCode: s.offering.course.code,
          })),
        },
      });
    } catch (e) { next(e); }
  },
);

/**
 * Statuses that mean the student HAS handed the work in — the complement
 * of «pending». DRAFT is deliberately absent: a draft is not delivered,
 * so it keeps the assignment on the agenda.
 *
 * r370: LATE was missing. submissions.routes.ts writes LATE (not
 * SUBMITTED) for anything handed in after `dueAt` (submissionStatusFor),
 * so a late submission stayed invisible to this filter: the assignment
 * kept sitting in «التزامات اليوم» and inflated
 * kpi.pendingAssignmentsCount for the rest of the week, telling the
 * student to hand in work they had already delivered. The teacher side
 * has counted LATE as handed-in since r157 (PENDING_SUBMISSION_STATUSES
 * — the two ends of the loop must agree on what «submitted» means).
 */
export const HANDED_IN_SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.LATE,
  SubmissionStatus.GRADED,
  SubmissionStatus.RETURNED,
];

/**
 * The dashboard's pending-assignments predicate: due inside [now, horizon]
 * on one of the student's offerings, with no handed-in submission from
 * them. One predicate feeds BOTH the agenda list (take: 6) and the
 * uncapped KPI count — they can never disagree (audit 11-d P1-8).
 * Exported pure so the status set is pinned by a DB-free test.
 */
export function pendingAssignmentsWhere(
  offeringIds: readonly string[],
  studentId: string,
  now: Date,
  horizon: Date,
): Prisma.AssignmentWhereInput {
  return {
    offeringId: { in: [...offeringIds] },
    dueAt: { gte: now, lte: horizon },
    submissions: {
      none: {
        studentId,
        status: { in: [...HANDED_IN_SUBMISSION_STATUSES] },
      },
    },
  };
}

router.get('/me/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const term = currentTerm();
    const now = new Date();
    const horizon = new Date(now.getTime() + WEEK_MS);

    // ── Profile + active enrollments ─────────────────────────
    // r179 (phase-5): the profile is per-membership — resolved in the
    // caller's DB-VERIFIED institution context; a STUDENT without a
    // context gets 403 INSTITUTION_CONTEXT_REQUIRED (their academic
    // record is institution-scoped). Non-students keep the graceful
    // preview shell below (with a valid context their rare profile
    // still resolves; without one no profile is guessed).
    const callerInstitution = await resolveCallerInstitutionScope(
      req.user!.id,
      req.user!.institutionId,
    );
    if (req.user!.role === Role.STUDENT && !callerInstitution) {
      throw institutionContextRequiredError();
    }
    const [profile, enrollments] = await Promise.all([
      prisma.studentProfile.findFirst({
        where: callerInstitution
          ? { userId, institutionId: callerInstitution, membership: { isActive: true } }
          : { id: { in: [] } },
        orderBy: { createdAt: 'asc' },
        select: {
          gpa: true, totalXp: true, level: true, year: true, facultyId: true,
          faculty: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: {
          studentId: userId,
          status: 'active',
          ...(callerInstitution
            ? { offering: { course: { institutionId: callerInstitution } } }
            : {}),
        },
        select: {
          id: true,
          progressPct: true,
          offering: {
            select: {
              id: true,
              term: true,
              course: { select: { id: true, code: true, name: true, themeColor: true } },
              schedule: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true } },
            },
          },
        },
      }),
    ]);

    // Non-students (TEACHER / ADMIN / OWNER / QUALITY) can hit this endpoint
    // without a student profile of their own (previewing the dashboard layout
    // or hit by a stale tab / cache prefetch). Return a graceful empty-shell
    // response instead of a 404 — the frontend renders an empty-state inside
    // the dashboard rather than the global error page.
    if (!profile) {
      const role = req.user!.role;
      if (role !== Role.STUDENT) {
        res.json({
          data: {
            preview: true,
            profile: null,
            kpi: { courseCount: 0, attendancePct: null, pendingAssignmentsCount: 0, totalXp: 0, level: 0, rank: 0, cohortSize: 0 },
            term: { code: term.code, startsAt: term.startsAt, endsAt: term.endsAt, progressPct: 0 },
            progress: { avgEnrollmentProgressPct: 0 },
            agenda: { classes: [], assignments: [], live: [], exams: [] },
          },
        });
        return;
      }
      throw AppError.notFound('لا يوجد ملف أكاديمي للطالب');
    }

    const offeringIds = enrollments.map((e) => e.offering.id);
    const courseCount = enrollments.length;
    // Progress truth (premium-polish P0-2): the average must only span
    // offerings that actually have lectures — an offering with nothing to
    // watch can never progress, so including it turns «متوسط تقدّمك» into
    // a number permanently dragged toward zero no matter how much the
    // student watches (the frozen-seed era hid this by lying 60% flat).
    const lectureCounts = await prisma.lecture.groupBy({
      by: ['offeringId'],
      where: { offeringId: { in: offeringIds } },
      _count: { _all: true },
    });
    const lectureCountByOffering = new Map(
      lectureCounts.map((r) => [r.offeringId, r._count._all]),
    );
    const measurableEnrollments = enrollments.filter(
      (e) => (lectureCountByOffering.get(e.offering.id) ?? 0) > 0,
    );
    const avgProgressPct = measurableEnrollments.length
      ? Math.round(measurableEnrollments.reduce((s, e) => s + e.progressPct, 0) / measurableEnrollments.length)
      : 0;

    // ── Attendance % (whole-history; one groupBy per status) ──
    const attByStatus = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId: userId },
      _count: { status: true },
    });
    const attendancePct = attendancePctFromStatusCounts(
      attByStatus.map((g) => ({ status: g.status, count: g._count.status })),
    );

    // ── Pending assignments — due within the week, not yet submitted ──
    // One predicate feeds BOTH the agenda list (take: 6) and the uncapped
    // KPI count — the count used to be `list.length`, so a student with 9
    // assignments due this week saw "6" on the KPI card (audit 11-d P1-8).
    // Exclude assignments the student has already handed in — LATE
    // included (r370): late work IS delivered work.
    const pendingWhere = pendingAssignmentsWhere(offeringIds, userId, now, horizon);
    const [upcomingAssignments, pendingAssignmentsCount] = await Promise.all([
      prisma.assignment.findMany({
        where: pendingWhere,
        orderBy: { dueAt: 'asc' },
        take: 6,
        select: {
          id: true, title: true, type: true, dueAt: true,
          // offeringId lets the frontend submit directly
          // (POST /offerings/:offeringId/assignments/:id/submit) without
          // the per-offering assignment useQueries round-trips.
          offeringId: true,
          offering: { select: { course: { select: { name: true, code: true } } } },
        },
      }),
      prisma.assignment.count({ where: pendingWhere }),
    ]);

    // ── Upcoming live sessions for enrolled offerings ─────────
    const upcomingLive = await prisma.liveSession.findMany({
      where: {
        offeringId: { in: offeringIds },
        scheduledAt: { gte: now, lte: horizon },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 4,
      select: {
        id: true, title: true, scheduledAt: true, status: true, offeringId: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
      },
    });

    // ── r164-c: upcoming exams (agenda bucket #4) ────────────
    // Candidate set = the /exams/me scoping (PUBLISHED templates for the
    // student's enrolled offerings OR their faculty), coarse-prefiltered
    // to "not yet closed". The precise week-window + attemptability
    // decision is selectAgendaExams above (pure, unit-tested).
    const upcomingExamTemplates = await prisma.examTemplate.findMany({
      where: {
        status: 'PUBLISHED',
        AND: [
          {
            OR: [
              { offeringId: { in: offeringIds } },
              ...(profile.facultyId ? [{ facultyId: profile.facultyId }] : []),
            ],
          },
          // Window still actable at all — a closeAt in the past is the
          // start route's «أغلق باب التسليم» refusal; closeAt null = no
          // deadline (the selector below drops those: no event).
          { OR: [{ closeAt: null }, { closeAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, kind: true, openAt: true, closeAt: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
        faculty: { select: { name: true } },
      },
    });
    // The student's attempts on those templates — folded to the
    // "finished" flag (SUBMITTED / GRADED always; EXPIRED for
    // non-PRACTICE kinds — see AgendaExamCandidate.finished).
    const templateKindById = new Map(upcomingExamTemplates.map((t) => [t.id, t.kind]));
    const myExamAttempts = upcomingExamTemplates.length
      ? await prisma.examAttempt.findMany({
          where: { studentId: userId, templateId: { in: [...templateKindById.keys()] } },
          select: { templateId: true, status: true },
        })
      : [];
    const finishedExamTemplateIds = new Set<string>();
    for (const a of myExamAttempts) {
      if (examAttemptFinished(a.status, templateKindById.get(a.templateId) ?? '')) {
        finishedExamTemplateIds.add(a.templateId);
      }
    }
    const agendaExamRows = selectAgendaExams(
      upcomingExamTemplates.map((t) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        openAt: t.openAt,
        closeAt: t.closeAt,
        courseName: t.offering?.course.name ?? null,
        courseCode: t.offering?.course.code ?? null,
        facultyName: t.faculty?.name ?? null,
        finished: finishedExamTemplateIds.has(t.id),
      })),
      now,
      horizon,
    );

    // ── Today / tomorrow class slots from schedule ────────────
    // Audience calendar (audit 15-h P1-2): the «اليوم/غداً» labels must
    // follow the Libyan civil day (Africa/Tripoli, UTC+2), not the
    // server's UTC day — between 00:00 and 02:00 Tripoli time the UTC
    // weekday still points at yesterday and the agenda would label
    // yesterday's slots «اليوم».
    const todayDow = tripoliDayDow(now);
    const tomorrowDow = (todayDow + 1) % 7;
    const todayClasses: Array<{ id: string; offeringId: string; courseName: string; courseCode: string; startTime: string; endTime: string; room: string | null; when: 'today' | 'tomorrow' }> = [];
    for (const e of enrollments) {
      for (const slot of e.offering.schedule) {
        if (slot.dayOfWeek === todayDow || slot.dayOfWeek === tomorrowDow) {
          todayClasses.push({
            id: slot.id,
            offeringId: e.offering.id,
            courseName: e.offering.course.name,
            courseCode: e.offering.course.code,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
            when: slot.dayOfWeek === todayDow ? 'today' : 'tomorrow',
          });
        }
      }
    }
    todayClasses.sort((a, b) =>
      a.when === b.when ? a.startTime.localeCompare(b.startTime) : a.when === 'today' ? -1 : 1,
    );

    // ── XP rank within faculty (for "place X in your batch") ──
    // Two indexed counts instead of loading every profile in the faculty
    // to filter in JS (audit 11-d P1-11). Same semantics as before:
    // rank = number of peers strictly ahead + 1.
    const [peersAhead, cohortSize] = await Promise.all([
      prisma.studentProfile.count({
        where: { facultyId: profile.facultyId, totalXp: { gt: profile.totalXp } },
      }),
      prisma.studentProfile.count({ where: { facultyId: profile.facultyId } }),
    ]);
    const rank = peersAhead + 1;

    // ── Term progress fraction ────────────────────────────────
    const termTotalMs = term.endsAt.getTime() - term.startsAt.getTime();
    const elapsedMs = Math.max(0, Math.min(termTotalMs, now.getTime() - term.startsAt.getTime()));
    const termProgressPct = termTotalMs > 0 ? Math.round((elapsedMs / termTotalMs) * 100) : 0;

    res.json({
      data: {
        profile: {
          year: profile.year,
          gpa: Number(profile.gpa.toString()),
          totalXp: profile.totalXp,
          level: profile.level,
          facultyName: profile.faculty?.name ?? null,
          departmentName: profile.department?.name ?? null,
        },
        kpi: {
          courseCount,
          attendancePct,
          pendingAssignmentsCount,
          totalXp: profile.totalXp,
          rank,
          cohortSize,
        },
        term: {
          code: term.code,
          startsAt: term.startsAt,
          endsAt: term.endsAt,
          progressPct: termProgressPct,
        },
        progress: {
          avgEnrollmentProgressPct: avgProgressPct,
        },
        agenda: {
          classes: todayClasses,
          assignments: upcomingAssignments.map((a) => ({
            id: a.id,
            offeringId: a.offeringId,
            title: a.title,
            type: a.type,
            dueAt: a.dueAt,
            courseName: a.offering.course.name,
            courseCode: a.offering.course.code,
          })),
          live: upcomingLive,
          // r164-c: the fourth agenda bucket — still-actable exams with a
          // milestone inside the week (additive; see selectAgendaExams).
          exams: agendaExamRows,
        },
      },
    });
  } catch (e) { next(e); }
});

export default router;
