-- r370 — the dashboard/attendance/results index set.
--
-- Measured before/after on the r370 constant load dataset
-- (backend/scripts/seed-load.mjs, LOAD_STUDENTS=1200 → 22,948 submissions,
-- 57,600 attendance records, 12 offerings across 4 teachers) with
-- backend/scripts/explain-dashboards.mjs:
--
--   14 dashboard/calendar/results statements, plan+exec median:
--     without these indexes  40.23 ms   (runs 40.23 / 37.18 / 44.14)
--     with them              21.59 ms   (runs 21.59 / 20.58 / 22.95)
--   per statement, the wins are all on the teacher surface:
--     attendance all-time groupBy   12.25 → 2.65 ms   (seq scan → index scan)
--     grades all-time groupBy        5.76 → 2.01 ms   (seq scan → index-only scan)
--     6-week grades groupBy          5.13 → 1.53 ms   (seq scan + filter → bitmap)
--     pending-grading groupBy        3.26 → 2.50 ms
--
-- Each index exists because a plan proved it: the teacher endpoints filter a
-- SLICE of offerings then aggregate the whole child table, and without these
-- keys PostgreSQL hash-joins a sequential scan of every submission and every
-- attendance record in the institution.
--
-- NOTE ON LOCKING: Prisma runs each migration inside a transaction, where
-- CREATE INDEX CONCURRENTLY is illegal. For a large existing database, run
-- scripts/sql/r370-indexes-concurrent.sql (idempotent, one statement per
-- transaction) instead of relying on this file's build-time path.
--
-- Reversal (safe, no data change):
--   DROP INDEX IF EXISTS "Submission_assignmentId_status_grade_idx";
--   DROP INDEX IF EXISTS "Submission_status_gradedAt_idx";
--   DROP INDEX IF EXISTS "AttendanceRecord_sessionId_status_idx";

CREATE INDEX IF NOT EXISTS "Submission_assignmentId_status_grade_idx"
  ON "Submission" ("assignmentId", "status", "grade");

CREATE INDEX IF NOT EXISTS "Submission_status_gradedAt_idx"
  ON "Submission" ("status", "gradedAt");

CREATE INDEX IF NOT EXISTS "AttendanceRecord_sessionId_status_idx"
  ON "AttendanceRecord" ("sessionId", "status");
