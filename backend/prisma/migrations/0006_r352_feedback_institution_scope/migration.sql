-- r352 backend hardening #3 — the feedback inbox gains its institution
-- column (the open r342 t14 backlog item: the OWNER/ADMIN inbox was not
-- institution-scoped).
--
-- PilotFeedback rows are stamped with the submitter's DB-verified
-- institution at send time (NULL = platform-scope: a contextless token
-- or an unverified claim). The ADMIN/QUALITY inbox is pinned to the
-- caller's own institution's rows; the platform OWNER keeps the
-- cross-tenant view. Purely additive: existing rows stay NULL — they
-- predate the stamp and remain OWNER-scope exactly as before.

-- AlterTable
ALTER TABLE "PilotFeedback" ADD COLUMN     "institutionId" TEXT;

-- CreateIndex
CREATE INDEX "PilotFeedback_institutionId_idx" ON "PilotFeedback"("institutionId");

-- AddForeignKey
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
