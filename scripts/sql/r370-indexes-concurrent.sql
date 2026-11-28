-- r370 — concurrent production rollout of the dashboard index set.
--
-- The Prisma migration (prisma/migrations/0009_r370_dashboard_indexes) runs
-- inside a transaction, so it CANNOT use CONCURRENTLY; on an empty CI
-- database that is fine, on a live table it would hold a write lock for the
-- duration of the build. This file is the operator path for a live database:
-- one statement per connection/transaction, no lock on writes.
--
--   psql "$DIRECT_DATABASE_URL" -f scripts/sql/r370-indexes-concurrent.sql
--
-- Idempotent (IF NOT EXISTS), safe to re-run, and safe to interrupt — a
-- cancelled CONCURRENTLY build leaves only an INVALID index, which the next
-- run drops and rebuilds.

DROP INDEX CONCURRENTLY IF EXISTS "Submission_assignmentId_status_grade_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Submission_assignmentId_status_grade_idx"
  ON "Submission" ("assignmentId", "status", "grade");

DROP INDEX CONCURRENTLY IF EXISTS "Submission_status_gradedAt_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Submission_status_gradedAt_idx"
  ON "Submission" ("status", "gradedAt");

DROP INDEX CONCURRENTLY IF EXISTS "AttendanceRecord_sessionId_status_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AttendanceRecord_sessionId_status_idx"
  ON "AttendanceRecord" ("sessionId", "status");
