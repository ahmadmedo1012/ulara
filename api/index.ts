/**
 * api/index.ts — the serverless entry for the whole ULARA platform.
 *
 * The Express application (backend/src/app.ts → createApp()) already
 * speaks the Node (req, res) handler signature, so it IS the function
 * handler. The long-process entry (backend/src/index.ts — listen +
 * in-process scheduler) is deliberately NOT used here: on a serverless
 * platform the daily jobs ride the platform cron instead
 * (vercel.json → /api/v1/jobs/daily, fail-closed service token), and
 * there is no port to bind.
 *
 * Path routing: vercel.json rewrites /api/(.*) → /api (this function)
 * with the original URL preserved, so Express routes /api/v1/* exactly
 * as in the single-service deployment; non-API paths are served by the
 * platform's static layer from frontend/dist (the vite build output —
 * see outputDirectory in vercel.json).
 *
 * Build order (vercel.json buildCommand): the backend tsc emit
 * (backend/dist) runs BEFORE function bundling, so this import always
 * resolves to the compiled application — no TS path remapping at edge
 * time. Prisma client generation also happens in the build command;
 * DATABASE_URL must point at the POOLED connection (PgBouncer) —
 * serverless functions must not hold dedicated connections.
 */
import { createApp } from '../backend/dist/app.js';

export default createApp();
