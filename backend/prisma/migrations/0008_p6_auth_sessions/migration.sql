-- ════════════════════════════════════════════════════════════════
--  P6 — UserSession: session listing + per-session revocation +
--  refresh-token reuse detection (closes the documented deferral at
--  backend/src/modules/auth/auth.service.ts).
--
--  ADDITIVE ONLY (migrations never destructive) and FULLY IDEMPOTENT
--  (the 0007_r359_backend_ops style): CREATE TABLE IF NOT EXISTS,
--  IF NOT EXISTS index guards and a DO-block-guarded FK, so this is
--  safe against a FRESH database (CI's db:deploy) AND against the
--  production Neon lineage. No existing object is read, altered or
--  dropped; existing refresh sessions keep working untouched (their
--  cookies are ADOPTED into this table at their next refresh).
--
--  Design (D3 coexistence — backend/src/modules/auth/rotation.ts is
--  the binding policy; see the UserSession model comment):
--   · one row per device session lineage; the refresh token is stored
--     ONLY as its sha-256 hex digest — never the token itself;
--   · a NORMAL refresh rolls the row (hash → the newly minted token,
--     lastUsedAt/ip/userAgent stamped) and NEVER bumps tokenVersion;
--   · tokenVersionSnapshot pins the user's tokenVersion at mint so
--     the sessions list hides rows killed by the D3 global bumps
--     (logout / password change / role change / deactivation)
--     without those call sites touching this table;
--   · DELETE /auth/sessions/:id sets revokedAt ONLY (no version bump
--     — revoking one session must not kill the others); replaying a
--     revoked cookie at /auth/refresh is treated as theft: reusedAt
--     stamped, all of the user's rows revoked, tokenVersion bumped
--     atomically (the documented reuse-detection response).
-- ════════════════════════════════════════════════════════════════

-- CreateTable (guarded: IF NOT EXISTS keeps re-runs green)
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "tokenVersionSnapshot" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "reusedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex / CreateUniqueIndex (all IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_userId_lastUsedAt_idx" ON "UserSession"("userId", "lastUsedAt");

-- AddForeignKey (guarded: DO block keeps re-runs green)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserSession_userId_fkey') THEN
    ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
