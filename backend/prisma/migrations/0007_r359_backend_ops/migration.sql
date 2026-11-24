-- ════════════════════════════════════════════════════════════════
--  r359 A4 — BACKEND OPS: push receipts + preferences, email events,
--  verification tokens, idempotency records, search trgm coverage.
--
--  FULLY IDEMPOTENT BY DESIGN (D16): the production Neon database
--  carries a diverged lineage (pre-rebrand timestamped migrations +
--  r350–r357-era rows that are not in this repo). Every statement
--  below is guarded (IF NOT EXISTS / DO-block presence checks), so
--  this migration is safe to run against:
--    · a FRESH database (embedded PG, CI, a new Neon project);
--    · the PRODUCTION database (objects this repo does not know —
--      MailOutbox, MailSuppression, the per-category
--      NotificationPreference, EmailVerificationToken(usedAt) — are
--      never touched; this migration's models are RENAMED to avoid
--      collisions: UserNotificationPreference + EmailVerifyToken).
--  Names of overlapping trgm indexes deliberately match production's
--  existing ones (Course/Lecture/ResearchPaper/TrainingTrack) so the
--  IF NOT EXISTS guards no-op there and only the MISSING coverage is
--  added (Lecture.description, ResearchPaper.abstract,
--  TrainingTrack.summary, Program/OrganizationalUnit/InstitutionalPerson).
-- ════════════════════════════════════════════════════════════════

-- CreateEnum (guarded: DO block keeps re-runs green)
DO $$ BEGIN
  CREATE TYPE "PushReceiptStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailEventType" AS ENUM ('BOUNCE', 'COMPLAINT', 'DELIVERY', 'OPEN', 'SEND_SKIPPED_SUPPRESSED', 'SEND_FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum (guarded: only adds AUDIT_BROWSE when absent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'Capability' AND e.enumlabel = 'AUDIT_BROWSE') THEN
    ALTER TYPE "Capability" ADD VALUE 'AUDIT_BROWSE';
  END IF;
END $$;

-- AlterTable (guarded per column)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "emailBouncedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "emailComplainedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- CreateTable (all IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushUrgent" BOOLEAN NOT NULL DEFAULT true,
    "pushAcademic" BOOLEAN NOT NULL DEFAULT true,
    "pushSystem" BOOLEAN NOT NULL DEFAULT true,
    "pushSocial" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushDeliveryReceipt" (
    "id" TEXT NOT NULL,
    "pushDeviceId" TEXT NOT NULL,
    "notificationId" TEXT,
    "ticketId" TEXT,
    "status" "PushReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "errorDetail" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDeliveryReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "type" "EmailEventType" NOT NULL,
    "providerMessageId" TEXT,
    "detail" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailVerifyToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifyToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (all IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "UserNotificationPreference_emailDigest_idx" ON "UserNotificationPreference"("emailDigest");
CREATE INDEX IF NOT EXISTS "PushDeliveryReceipt_pushDeviceId_idx" ON "PushDeliveryReceipt"("pushDeviceId");
CREATE INDEX IF NOT EXISTS "PushDeliveryReceipt_status_createdAt_idx" ON "PushDeliveryReceipt"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailEvent_email_createdAt_idx" ON "EmailEvent"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailEvent_type_createdAt_idx" ON "EmailEvent"("type", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerifyToken_tokenHash_key" ON "EmailVerifyToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerifyToken_userId_idx" ON "EmailVerifyToken"("userId");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_userId_route_keyHash_key" ON "IdempotencyRecord"("userId", "route", "keyHash");

-- AddForeignKey (guarded by constraint-presence checks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserNotificationPreference_userId_fkey') THEN
    ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeliveryReceipt_pushDeviceId_fkey') THEN
    ALTER TABLE "PushDeliveryReceipt" ADD CONSTRAINT "PushDeliveryReceipt_pushDeviceId_fkey" FOREIGN KEY ("pushDeviceId") REFERENCES "PushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeliveryReceipt_notificationId_fkey') THEN
    ALTER TABLE "PushDeliveryReceipt" ADD CONSTRAINT "PushDeliveryReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailEvent_userId_fkey') THEN
    ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailVerifyToken_userId_fkey') THEN
    ALTER TABLE "EmailVerifyToken" ADD CONSTRAINT "EmailVerifyToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdempotencyRecord_userId_fkey') THEN
    ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
--  SEARCH PERFORMANCE — pg_trgm GIN coverage for every ILIKE'd
--  column in GET /search/global (the r342 t12 residual). Names of
--  the four indexes production already carries are IDENTICAL so the
--  guards no-op there; the missing coverage is added.
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Course offering search (name + code — the most-fired keystroke path).
CREATE INDEX IF NOT EXISTS "Course_name_trgm_idx" ON "Course" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_code_trgm_idx" ON "Course" USING gin ("code" gin_trgm_ops);
-- Lecture titles + descriptions.
CREATE INDEX IF NOT EXISTS "Lecture_title_trgm_idx" ON "Lecture" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Lecture_description_trgm_idx" ON "Lecture" USING gin ("description" gin_trgm_ops);
-- Research papers (title + abstract).
CREATE INDEX IF NOT EXISTS "ResearchPaper_title_trgm_idx" ON "ResearchPaper" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ResearchPaper_abstract_trgm_idx" ON "ResearchPaper" USING gin ("abstract" gin_trgm_ops);
-- Training tracks.
CREATE INDEX IF NOT EXISTS "TrainingTrack_title_trgm_idx" ON "TrainingTrack" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TrainingTrack_titleEn_trgm_idx" ON "TrainingTrack" USING gin ("titleEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TrainingTrack_summary_trgm_idx" ON "TrainingTrack" USING gin ("summary" gin_trgm_ops);
-- r352 institutional registers (the new search groups).
CREATE INDEX IF NOT EXISTS "Program_nameAr_trgm_idx" ON "Program" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Program_nameEn_trgm_idx" ON "Program" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Program_code_trgm_idx" ON "Program" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrganizationalUnit_nameAr_trgm_idx" ON "OrganizationalUnit" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrganizationalUnit_nameEn_trgm_idx" ON "OrganizationalUnit" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InstitutionalPerson_fullNameAr_trgm_idx" ON "InstitutionalPerson" USING gin ("fullNameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InstitutionalPerson_email_trgm_idx" ON "InstitutionalPerson" USING gin ("email" gin_trgm_ops);
