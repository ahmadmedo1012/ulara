#!/usr/bin/env bash
# scripts/vercel-build.sh — the Vercel build step (r352 hardening round
# 2026-11-23). The vercel.json `buildCommand` had grown past Vercel's
# 256-character schema limit (268 chars — every PR preview since the
# migration-gate commit failed BEFORE the build with
#   «The `vercel.json` schema validation failed … `buildCommand`
#    should NOT be longer than 256 characters»
# which is why the deploy log showed zero builds). The logic lives HERE
# now and `buildCommand` is just `bash scripts/vercel-build.sh`.
#
# Contract (unchanged from the inlined version):
#   1. Migrations run in the PRODUCTION build ONLY (VERCEL_ENV gate).
#      Preview/development builds never migrate — plus the belt inside
#      backend/scripts/migrate-deploy.mjs refuses Vercel non-production
#      environments even if this gate is ever rewired. The preview
#      DATABASE_URL is a separate env var scoped to a different Neon
#      project anyway (verified 2026-11-23 via the Vercel API).
#   2. Prisma client generation, then the frontend + backend builds.
#   3. The backend artifact must exist at the end — a build that
#      silently produced nothing is a failure, not a success.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "[vercel-build] production build — running migrations (migrate-deploy: direct candidates only + advisory lock)"
  npm --prefix backend run prisma:deploy
else
  echo "[vercel-build] ${VERCEL_ENV:-local} build — migrations are production-only; skipping migrate"
fi

npm --prefix backend run prisma:generate
npm run build -w frontend
npm run build -w backend

node -e "if(!require('fs').existsSync('backend/dist/app.js')){console.error('[vercel-build] backend/dist/app.js missing — build produced no artifact');process.exit(1)}"
echo "[vercel-build] done"
