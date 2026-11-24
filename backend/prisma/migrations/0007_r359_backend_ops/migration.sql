-- CreateEnum
CREATE TYPE "PushReceiptStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ERROR');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('BOUNCE', 'COMPLAINT', 'DELIVERY', 'OPEN', 'SEND_SKIPPED_SUPPRESSED', 'SEND_FAILED');

-- AlterEnum
ALTER TYPE "Capability" ADD VALUE 'AUDIT_BROWSE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailBouncedAt" TIMESTAMP(3),
ADD COLUMN     "emailComplainedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushUrgent" BOOLEAN NOT NULL DEFAULT true,
    "pushAcademic" BOOLEAN NOT NULL DEFAULT true,
    "pushSystem" BOOLEAN NOT NULL DEFAULT true,
    "pushSocial" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDeliveryReceipt" (
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

-- CreateTable
CREATE TABLE "EmailEvent" (
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

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
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

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_emailDigest_idx" ON "NotificationPreference"("emailDigest");

-- CreateIndex
CREATE INDEX "PushDeliveryReceipt_pushDeviceId_idx" ON "PushDeliveryReceipt"("pushDeviceId");

-- CreateIndex
CREATE INDEX "PushDeliveryReceipt_status_createdAt_idx" ON "PushDeliveryReceipt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailEvent_email_createdAt_idx" ON "EmailEvent"("email", "createdAt");

-- CreateIndex
CREATE INDEX "EmailEvent_type_createdAt_idx" ON "EmailEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_userId_route_keyHash_key" ON "IdempotencyRecord"("userId", "route", "keyHash");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDeliveryReceipt" ADD CONSTRAINT "PushDeliveryReceipt_pushDeviceId_fkey" FOREIGN KEY ("pushDeviceId") REFERENCES "PushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDeliveryReceipt" ADD CONSTRAINT "PushDeliveryReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ════════════════════════════════════════════════════════════════
--  r359 A4 — SEARCH PERFORMANCE (the r342 t12 residual: ILIKE seq
--  scans). pg_trgm GIN trigram indexes turn every '%q%' ILIKE in
--  GET /search/global (courses, lectures, papers, tracks + the new
--  programs / org-units / people groups) into an index scan instead
--  of a sequential table scan. Idempotent (IF NOT EXISTS everywhere);
--  the extension is on Neon's allowlist and ships in the embedded PG.
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
CREATE INDEX IF NOT EXISTS "TrainingTrack_summary_trgm_idx" ON "TrainingTrack" USING gin ("summary" gin_trgm_ops);
-- r352 institutional registers (the new search groups).
CREATE INDEX IF NOT EXISTS "Program_nameAr_trgm_idx" ON "Program" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Program_nameEn_trgm_idx" ON "Program" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Program_code_trgm_idx" ON "Program" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrganizationalUnit_nameAr_trgm_idx" ON "OrganizationalUnit" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrganizationalUnit_nameEn_trgm_idx" ON "OrganizationalUnit" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InstitutionalPerson_fullNameAr_trgm_idx" ON "InstitutionalPerson" USING gin ("fullNameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InstitutionalPerson_email_trgm_idx" ON "InstitutionalPerson" USING gin ("email" gin_trgm_ops);
