-- 0002_retire_zu_sync — r342 t13 (2026-11-19).
--
-- The zu-sync university-facts system (UniversityFact + SyncRun tables +
-- the SyncRunStatus enum) is RETIRED from ULARA: the shared production
-- database dropped these tables upstream (r349, 2026-11-11 — "the dead
-- pre-tick sync system" / "the deleted-for-good 25-universities feature",
-- data exported before the drop), so every remaining ULARA code path
-- touching them failed with P2021:
--   · GET /api/v1/university/facts (PUBLIC)   → HTTP 500
--   · GET /api/v1/owner/system               → HTTP 500 (owner System page)
--   · GET /api/v1/admin/sync + POST /admin/sync/trigger → P2021
--   · the nightly /api/v1/jobs/daily sync sub-job (silently failing)
--
-- This migration is IDEMPOTENT by construction:
--   · On the ESTABLISHED production database it is a NO-OP — the tables
--     and the enum are already gone.
--   · On FRESH databases (CI's disposable Postgres, new environments)
--     where 0001_ulara_baseline created them, it removes the retired
--     tables so the physical schema matches the Prisma schema exactly.
--
-- Nothing else is touched. Non-destructive to every other table (the
-- established database's extra madarek-era tables — AiTelemetry,
-- StudentDocument, MailOutbox, etc. — are NOT dropped: they are absent
-- from ULARA's Prisma schema but present in the shared database; Prisma
-- simply does not query them).
DROP TABLE IF EXISTS "SyncRun";
DROP TABLE IF EXISTS "UniversityFact";
DROP TYPE IF EXISTS "SyncRunStatus";
