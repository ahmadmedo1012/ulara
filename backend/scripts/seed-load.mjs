#!/usr/bin/env node
/**
 * seed-load.mjs — the r370 plan-measurement dataset.
 *
 * Builds a DETERMINISTIC, realistic slice of one institution big enough for
 * PostgreSQL's planner to make non-trivial choices (≈23k rows across the
 * tables the dashboards read), so `EXPLAIN (ANALYZE, BUFFERS)` reflects
 * production shapes rather than 10-row toy plans.
 *
 *   DATABASE_URL=postgresql://ulara@127.0.0.1:5433/ulara node backend/scripts/seed-load.mjs
 *
 * Shape (fixed — the numbers below are the contract of this script):
 *   · 300 students (4 active enrollments each), 12 offerings, 12 courses
 *   · 8 assignments per offering (dueAt spread −21…+21 days)   → 96
 *   · 60% of the enrolled students submitted each assignment     → ~5,760
 *   · 12 attendance sessions per offering, one record per student → 14,400
 *   · 3 PUBLISHED exam templates per offering                    → 36
 *   · 6 lectures per offering, one Grade row per enrollment      → 1,200
 *
 * Idempotent by `--reset` (deletes only rows this script's own institution
 * owns — never a bare TRUNCATE). Safe against a dev DB only; it refuses to
 * run when NODE_ENV=production.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') {
  console.error('seed-load refuses to run at NODE_ENV=production');
  process.exit(1);
}

const SLUG = 'r370-load';
const STUDENTS = Number(process.env.LOAD_STUDENTS ?? 300);
const OFFERINGS = 12;
const ENROLL_PER_STUDENT = 4;
const ASSIGN_PER_OFFERING = 8;
const SESSIONS_PER_OFFERING = 12;
const LECTURES_PER_OFFERING = 6;
const EXAMS_PER_OFFERING = 3;
const SUBMIT_RATE = 0.6;

/** Deterministic PRNG (mulberry32) — same tree every run, so before/after
 *  plan comparisons see identical data. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(0x370_2026);
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

/** cuid-shaped id: the repo generates cuid() everywhere; keeping the shape
 *  means a future CHECK constraint cannot bite this fixture. */
const cuid = () => 'c' + randomUUID().replace(/-/g, '').slice(0, 24);

const DAY = 86_400_000;
const NOW = new Date('2026-11-27T09:00:00Z');

async function main() {
  if (process.argv.includes('--reset')) {
    const existing = await prisma.institution.findUnique({ where: { slug: SLUG } });
    if (existing) {
      // Everything below hangs off the institution via explicit deletes in
      // dependency order — scoped, never a database-wide truncate.
      const offerings = await prisma.courseOffering.findMany({
        where: { course: { institutionId: existing.id } },
        select: { id: true },
      });
      const offeringIds = offerings.map((o) => o.id);
      await prisma.attendanceRecord.deleteMany({ where: { session: { offeringId: { in: offeringIds } } } });
      await prisma.attendanceSession.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.submission.deleteMany({ where: { assignment: { offeringId: { in: offeringIds } } } });
      await prisma.assignment.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.grade.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.examAttempt.deleteMany({ where: { template: { offeringId: { in: offeringIds } } } });
      await prisma.examTemplate.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.watchEvent.deleteMany({ where: { lecture: { offeringId: { in: offeringIds } } } });
      await prisma.lecture.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.scheduleSlot.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.enrollment.deleteMany({ where: { offeringId: { in: offeringIds } } });
      await prisma.courseOffering.deleteMany({ where: { id: { in: offeringIds } } });
      await prisma.course.deleteMany({ where: { institutionId: existing.id } });
      await prisma.studentProfile.deleteMany({ where: { institutionId: existing.id } });
      await prisma.membership.deleteMany({ where: { institutionId: existing.id } });
      await prisma.user.deleteMany({ where: { email: { startsWith: `${SLUG}-` } } });
      await prisma.department.deleteMany({ where: { faculty: { institutionId: existing.id } } });
      await prisma.faculty.deleteMany({ where: { institutionId: existing.id } });
      await prisma.institution.delete({ where: { id: existing.id } });
      console.log('reset: removed the previous r370-load institution');
    }
  }

  const institution = await prisma.institution.create({
    data: { name: 'مساحة قياس r370', nameEn: 'r370 load', slug: SLUG },
  });
  const faculty = await prisma.faculty.create({
    data: { name: 'كلية القياس', city: 'طرابلس', institutionId: institution.id },
  });
  const department = await prisma.department.create({
    data: { name: 'قسم القياس', facultyId: faculty.id },
  });

  // FOUR teachers, three offerings each: a real teacher owns a SLICE of the
  // catalogue, so `offeringId = ANY(…)` is selective — the predicate shape
  // the dashboards actually emit. One teacher owning everything would make
  // every plan a full scan and every index look useless.
  const teacherCount = 4;
  const teachers = [];
  for (let t = 0; t < teacherCount; t++) {
    const teacher = await prisma.user.create({
      data: {
        email: `${SLUG}-t${t}@load.test`,
        passwordHash: 'x',
        role: 'TEACHER',
        firstName: `أستاذ${t + 1}`,
        lastName: 'القياس',
      },
    });
    await prisma.membership.create({
      data: { userId: teacher.id, institutionId: institution.id, role: 'TEACHER' },
    });
    teachers.push(teacher);
  }

  const courses = await Promise.all(
    Array.from({ length: OFFERINGS }, (_, i) =>
      prisma.course.create({
        data: {
          code: `LD${String(i + 1).padStart(3, '0')}`,
          name: `مقرر القياس ${i + 1}`,
          credits: 3,
          institutionId: institution.id,
          departmentId: department.id,
        },
      }),
    ),
  );

  const offerings = await Promise.all(
    courses.map((course, i) =>
      prisma.courseOffering.create({
        data: { courseId: course.id, teacherId: teachers[i % teacherCount].id, term: '2026-FALL', capacity: 400 },
        select: { id: true, courseId: true },
      }),
    ),
  );

  // ── students ─────────────────────────────────────────────────────────
  const studentRows = Array.from({ length: STUDENTS }, (_, i) => ({
    id: cuid(),
    email: `${SLUG}-s${String(i).padStart(4, '0')}@load.test`,
  }));
  await prisma.user.createMany({
    data: studentRows.map((s, i) => ({
      id: s.id,
      email: s.email,
      passwordHash: 'x',
      role: 'STUDENT',
      firstName: `طالب${i + 1}`,
      lastName: 'القياس',
    })),
  });
  await prisma.membership.createMany({
    data: studentRows.map((s) => ({
      id: cuid(),
      userId: s.id,
      institutionId: institution.id,
      role: 'STUDENT',
    })),
  });
  const memberships = await prisma.membership.findMany({
    where: { institutionId: institution.id, role: 'STUDENT' },
    select: { id: true, userId: true },
  });
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m.id]));
  await prisma.studentProfile.createMany({
    data: studentRows.map((s, i) => ({
      id: cuid(),
      userId: s.id,
      membershipId: membershipByUser.get(s.id),
      institutionId: institution.id,
      universityId: `U${String(i).padStart(5, '0')}`,
      facultyId: faculty.id,
      departmentId: department.id,
      year: int(1, 4),
      gpa: '3.20',
      totalXp: int(0, 40_000),
      level: int(1, 20),
    })),
  });

  // ── enrollments: every student in 4 distinct offerings ───────────────
  const enrollments = [];
  for (const [si, s] of studentRows.entries()) {
    const start = si % OFFERINGS;
    for (let k = 0; k < ENROLL_PER_STUDENT; k++) {
      const offering = offerings[(start + k) % OFFERINGS];
      enrollments.push({
        id: cuid(),
        studentId: s.id,
        offeringId: offering.id,
        status: 'active',
        progressPct: int(0, 100),
      });
    }
  }
  await prisma.enrollment.createMany({ data: enrollments });
  const studentsByOffering = new Map();
  for (const e of enrollments) {
    const list = studentsByOffering.get(e.offeringId) ?? [];
    list.push(e.studentId);
    studentsByOffering.set(e.offeringId, list);
  }

  // ── assignments + submissions ────────────────────────────────────────
  const assignments = [];
  for (const offering of offerings) {
    for (let a = 0; a < ASSIGN_PER_OFFERING; a++) {
      assignments.push({
        id: cuid(),
        offeringId: offering.id,
        title: `تكليف ${a + 1}`,
        type: 'HOMEWORK',
        // −21…+21 days: half of them inside any 7-day agenda window.
        dueAt: new Date(NOW.getTime() + (int(-21, 21) * DAY)),
        weight: 10,
        maxScore: 100,
      });
    }
  }
  await prisma.assignment.createMany({ data: assignments });

  const submissions = [];
  for (const assignment of assignments) {
    const enrolled = studentsByOffering.get(assignment.offeringId) ?? [];
    for (const studentId of enrolled) {
      if (rand() > SUBMIT_RATE) continue;
      const graded = rand() < 0.7;
      const submittedAt = new Date(assignment.dueAt.getTime() + int(-5, 3) * DAY);
      submissions.push({
        id: cuid(),
        assignmentId: assignment.id,
        studentId,
        status: graded ? 'GRADED' : (submittedAt > assignment.dueAt ? 'LATE' : 'SUBMITTED'),
        grade: graded ? String(int(40, 100)) : null,
        submittedAt,
        gradedAt: graded ? new Date(submittedAt.getTime() + DAY) : null,
      });
    }
  }
  for (let i = 0; i < submissions.length; i += 2000) {
    await prisma.submission.createMany({ data: submissions.slice(i, i + 2000) });
  }

  // ── attendance: 12 sessions per offering, every enrolled student ─────
  const sessions = [];
  for (const offering of offerings) {
    for (let s = 0; s < SESSIONS_PER_OFFERING; s++) {
      sessions.push({
        id: cuid(),
        offeringId: offering.id,
        date: new Date(NOW.getTime() - (SESSIONS_PER_OFFERING - s) * 3 * DAY),
      });
    }
  }
  await prisma.attendanceSession.createMany({ data: sessions });

  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
  const records = [];
  for (const session of sessions) {
    for (const studentId of studentsByOffering.get(session.offeringId) ?? []) {
      records.push({ id: cuid(), sessionId: session.id, studentId, status: pick(statuses) });
    }
  }
  for (let i = 0; i < records.length; i += 4000) {
    await prisma.attendanceRecord.createMany({ data: records.slice(i, i + 4000) });
  }

  // ── exams, lectures, grades, schedule ────────────────────────────────
  const exams = [];
  for (const offering of offerings) {
    for (let e = 0; e < EXAMS_PER_OFFERING; e++) {
      exams.push({
        id: cuid(),
        offeringId: offering.id,
        title: `اختبار ${e + 1}`,
        kind: e === 0 ? 'QUIZ' : 'MIDTERM',
        status: 'PUBLISHED',
        authorId: teachers[0].id,
        openAt: new Date(NOW.getTime() + int(-3, 10) * DAY),
        closeAt: new Date(NOW.getTime() + int(4, 30) * DAY),
      });
    }
  }
  await prisma.examTemplate.createMany({ data: exams });

  const lectures = [];
  for (const offering of offerings) {
    for (let l = 0; l < LECTURES_PER_OFFERING; l++) {
      lectures.push({
        id: cuid(),
        offeringId: offering.id,
        title: `محاضرة ${l + 1}`,
        ordinal: l + 1,
        durationSec: 1800,
        videoUrl: 'https://example.test/v.mp4',
      });
    }
  }
  await prisma.lecture.createMany({ data: lectures });

  await prisma.grade.createMany({
    data: enrollments.map((e) => ({
      id: cuid(),
      offeringId: e.offeringId,
      studentId: e.studentId,
      kind: 'MIDTERM',
      score: String(int(35, 100)),
      maxScore: 100,
      weight: 30,
    })),
  });

  const counts = {
    users: await prisma.user.count({ where: { email: { startsWith: `${SLUG}-` } } }),
    enrollments: enrollments.length,
    assignments: assignments.length,
    submissions: submissions.length,
    attendanceRecords: records.length,
    exams: exams.length,
    lectures: lectures.length,
  };
  console.log(JSON.stringify(counts, null, 2));
  console.log(`SAMPLE_STUDENT_USER_ID=${studentRows[0].id}`);
  console.log(`SAMPLE_TEACHER_ID=${teachers[0].id}`);
  console.log(`SAMPLE_OFFERINGS=${offerings.filter((_, i) => i % 4 === 0).map((o) => o.id).join(',')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
