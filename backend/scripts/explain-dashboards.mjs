#!/usr/bin/env node
/**
 * explain-dashboards.mjs — r370 query-plan instrument.
 *
 * Runs the EXACT SQL shapes the dashboard/calendar/results handlers emit
 * (Prisma compiles to these; the predicates and joins mirror the route
 * sources) through `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` against the
 * r370 constant load dataset (backend/scripts/seed-load.mjs), and prints one
 * line per statement: planning + execution ms.
 *
 *   DATABASE_URL=… node backend/scripts/explain-dashboards.mjs [--json]
 *
 * Read the numbers as *relative* before/after evidence on identical data
 * (same PRNG seed) and identical hardware — not as production latency.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const asJson = process.argv.includes('--json');

const SLUG = 'r370-load';

/** EXPLAIN (ANALYZE) actually executes the statement. */
async function explain(name, sql, params = []) {
  const rows = await prisma.$queryRawUnsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
    ...params,
  );
  const plan = rows[0]['QUERY PLAN'][0];
  return {
    name,
    planningMs: plan['Planning Time'],
    executionMs: plan['Execution Time'],
    totalMs: plan['Planning Time'] + plan['Execution Time'],
    seqScans: countNodes(plan.Plan, 'Seq Scan'),
    indexScans: countNodes(plan.Plan, 'Index Scan') + countNodes(plan.Plan, 'Index Only Scan'),
    bitmapScans: countNodes(plan.Plan, 'Bitmap Heap Scan'),
    rows: plan.Plan['Actual Rows'],
  };
}

function countNodes(node, type) {
  if (!node) return 0;
  let n = node['Node Type'] === type ? 1 : 0;
  for (const child of node.Plans ?? []) n += countNodes(child, type);
  return n;
}

async function main() {
  const institution = await prisma.institution.findUnique({ where: { slug: SLUG } });
  if (!institution) throw new Error('load dataset missing — run backend/scripts/seed-load.mjs first');

  // The heavy student: the first seeded user of the load institution.
  const student = await prisma.user.findFirst({
    where: { email: { startsWith: `${SLUG}-s0000` } },
    select: { id: true },
  });
  // ONE teacher's slice (4 of 12 offerings) — the dashboard's real predicate.
  const teacher = await prisma.user.findFirst({
    where: { email: `${SLUG}-t0@load.test` },
    select: { id: true },
  });
  const offerings = await prisma.courseOffering.findMany({
    where: { teacherId: teacher.id },
    select: { id: true },
  });
  const offeringIds = offerings.map((o) => o.id);
  const sqlOfferingList = `(${offeringIds.map((_, i) => `$${i + 1}`).join(',')})`;

  const S = [];
  // ── student dashboard ────────────────────────────────────────────────
  S.push(await explain(
    'student.dashboard.profile',
    `SELECT sp.id FROM "StudentProfile" sp
       JOIN "Membership" m ON m.id = sp."membershipId"
      WHERE sp."userId" = $1 AND sp."institutionId" = $2 AND m."isActive" = true
      ORDER BY sp."createdAt" ASC LIMIT 1`,
    [student.id, institution.id],
  ));
  S.push(await explain(
    'student.dashboard.enrollments',
    `SELECT e.id, e."progressPct" FROM "Enrollment" e
       JOIN "CourseOffering" o ON o.id = e."offeringId"
       JOIN "Course" c ON c.id = o."courseId"
      WHERE e."studentId" = $1 AND e.status = 'active' AND c."institutionId" = $2`,
    [student.id, institution.id],
  ));
  S.push(await explain(
    'student.dashboard.pendingAssignments.list',
    `SELECT a.id FROM "Assignment" a
      WHERE a."offeringId" = ANY($1::text[])
        AND a."dueAt" >= now() AND a."dueAt" <= now() + interval '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM "Submission" s
           WHERE s."assignmentId" = a.id AND s."studentId" = $2
             AND s.status IN ('SUBMITTED','LATE','GRADED','RETURNED'))
      ORDER BY a."dueAt" ASC LIMIT 6`,
    [offeringIds, student.id],
  ));
  S.push(await explain(
    'student.dashboard.pendingAssignments.count',
    `SELECT count(*) FROM "Assignment" a
      WHERE a."offeringId" = ANY($1::text[])
        AND a."dueAt" >= now() AND a."dueAt" <= now() + interval '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM "Submission" s
           WHERE s."assignmentId" = a.id AND s."studentId" = $2
             AND s.status IN ('SUBMITTED','LATE','GRADED','RETURNED'))`,
    [offeringIds, student.id],
  ));
  S.push(await explain(
    'student.dashboard.attendance',
    `SELECT status, count(*) FROM "AttendanceRecord" WHERE "studentId" = $1 GROUP BY status`,
    [student.id],
  ));
  S.push(await explain(
    'student.dashboard.exams',
    `SELECT e.id FROM "ExamTemplate" e
      WHERE e.status = 'PUBLISHED'
        AND (e."offeringId" = ANY($1::text[]) OR e."facultyId" = $2)
        AND (e."closeAt" IS NULL OR e."closeAt" >= now())
      ORDER BY e."createdAt" DESC`,
    [offeringIds, await prisma.faculty.findFirst({ where: { institutionId: institution.id }, select: { id: true } }).then((f) => f.id)],
  ));
  // ── teacher dashboard ────────────────────────────────────────────────
  S.push(await explain(
    'teacher.dashboard.students',
    `SELECT "studentId", count(*) FROM "Enrollment"
      WHERE "offeringId" = ANY($1::text[]) AND status = 'active' GROUP BY "studentId"`,
    [offeringIds],
  ));
  S.push(await explain(
    'teacher.dashboard.grades.allTime',
    `SELECT s."assignmentId", sum(s.grade), count(*)
       FROM "Submission" s JOIN "Assignment" a ON a.id = s."assignmentId"
      WHERE a."offeringId" = ANY($1::text[]) AND s.status = 'GRADED' AND s.grade IS NOT NULL
      GROUP BY s."assignmentId"`,
    [offeringIds],
  ));
  S.push(await explain(
    'teacher.dashboard.grades.week',
    `SELECT s."assignmentId", sum(s.grade), count(*)
       FROM "Submission" s JOIN "Assignment" a ON a.id = s."assignmentId"
      WHERE a."offeringId" = ANY($1::text[]) AND s.status = 'GRADED' AND s.grade IS NOT NULL
        AND s."gradedAt" >= now() - interval '7 days' AND s."gradedAt" < now()
      GROUP BY s."assignmentId"`,
    [offeringIds],
  ));
  S.push(await explain(
    'teacher.dashboard.attendance.allTime',
    `SELECT r.status, count(*)
       FROM "AttendanceRecord" r JOIN "AttendanceSession" x ON x.id = r."sessionId"
      WHERE x."offeringId" = ANY($1::text[]) GROUP BY r.status`,
    [offeringIds],
  ));
  S.push(await explain(
    'teacher.dashboard.pending.groups',
    `SELECT s."assignmentId", count(*), min(s."submittedAt")
       FROM "Submission" s JOIN "Assignment" a ON a.id = s."assignmentId"
      WHERE a."offeringId" = ANY($1::text[]) AND s.status IN ('SUBMITTED','LATE')
      GROUP BY s."assignmentId"`,
    [offeringIds],
  ));
  S.push(await explain(
    'teacher.feed.absenceAlerts',
    `SELECT r."studentId", count(*)
       FROM "AttendanceRecord" r JOIN "AttendanceSession" x ON x.id = r."sessionId"
      WHERE x."offeringId" = ANY($1::text[]) AND x.date >= now() - interval '30 days' AND r.status = 'ABSENT'
      GROUP BY r."studentId" HAVING count(*) >= 3 ORDER BY count(*) DESC LIMIT 4`,
    [offeringIds],
  ));
  // ── /me/results ──────────────────────────────────────────────────────
  S.push(await explain(
    'results.grades',
    `SELECT g.id FROM "Grade" g JOIN "CourseOffering" o ON o.id = g."offeringId"
       JOIN "Course" c ON c.id = o."courseId"
      WHERE g."studentId" = $1 AND c."institutionId" = $2 ORDER BY g."recordedAt" DESC`,
    [student.id, institution.id],
  ));
  S.push(await explain(
    'results.gradedSubmissions',
    `SELECT s.id FROM "Submission" s JOIN "Assignment" a ON a.id = s."assignmentId"
       JOIN "CourseOffering" o ON o.id = a."offeringId" JOIN "Course" c ON c.id = o."courseId"
      WHERE s."studentId" = $1 AND s.status = 'GRADED' AND s.grade IS NOT NULL
        AND c."institutionId" = $2 ORDER BY s."gradedAt" DESC`,
    [student.id, institution.id],
  ));

  if (asJson) {
    console.log(JSON.stringify({ teacherId: teacher.id, studentId: student.id, statements: S }, null, 2));
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(pad('statement', 44) + pad('exec ms', 10) + pad('plan ms', 9) + pad('seq', 5) + pad('idx', 5) + pad('bitmap', 8) + 'rows');
    for (const s of S) {
      console.log(
        pad(s.name, 44) + pad(s.executionMs.toFixed(2), 10) + pad(s.planningMs.toFixed(2), 9) +
        pad(s.seqScans, 5) + pad(s.indexScans, 5) + pad(s.bitmapScans, 8) + s.rows,
      );
    }
    const total = S.reduce((a, s) => a + s.totalMs, 0);
    console.log(`\nTOTAL (plan+exec, all statements): ${total.toFixed(2)} ms · ${S.length} statements`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
