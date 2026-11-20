/**
 * Scheduled-jobs HTTP surface (`GET /api/v1/jobs/daily`).
 *
 * The in-process setInterval ticker (backend/src/scheduler.ts) runs only
 * in the long-process entry (backend/src/index.ts — the classic single
 * web-service deployment). On a serverless platform there is no
 * long-lived process, so the platform's cron invokes this route instead:
 * vercel.json's `crons` entry hits it once a day carrying
 * `Authorization: Bearer <CRON_SECRET>`; CRON_SECRET is provisioned to
 * the SAME value as INTERNAL_SERVICE_TOKEN (one internal secret, two
 * transport shapes — the Bearer form the platform cron sends and the
 * x-internal-service-token header operators use). Fail-closed when the
 * token is unset: exactly the milestones service-token contract.
 *
 * r342 t13 (2026-11-19): the zu-sync university-facts sub-job was
 * RETIRED — the shared production database dropped the
 * SyncRun/UniversityFact tables upstream, so every nightly run of
 * that sub-job failed against a missing table (P2021, swallowed by the
 * never-reject contract). The daily job set is now ONE DB job, the
 * SAME one the in-process scheduler runs daily:
 *   1. runLoginEventRetentionSweep — LoginEvent telemetry pruning.
 * It is idempotent and never rejects by contract; the route always
 * answers with an honest per-job summary (200 — job failures are part
 * of the payload, not transport errors).
 *
 * PLUS (the 2026-11-12 login rescue): when ULARA_TEST_ACCOUNTS=1 — the
 * same switch the backend boot path reads (backend/src/index.ts) — the
 * daily run also performs the ensureTestAccounts heal (password →
 * TEST_PASSWORD, re-activate, unlock). Structural prevention: a manual
 * password rotation can never again silently outlive the documented
 * demo credentials — every environment that opted into test accounts
 * re-converges on them at least once a day. On demand, the operator
 * shape POST /api/v1/jobs/test-accounts (service token) runs the SAME
 * heal immediately.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { prisma } from '../../db.js';
import { runLoginEventRetentionSweep } from '../../scheduler.js';
import { AppError } from '../../lib/errors.js';

const router = Router();

/**
 * Cron/service-token auth middleware — the milestones guard's transport
 * twin: accepts EITHER `Authorization: Bearer <token>` (the shape the
 * platform cron sends) OR `x-internal-service-token: <token>` (the
 * operator shape). Both sides are SHA-256 hashed to fixed-length
 * digests before timingSafeEqual — the comparison is constant-time and
 * independent of either side's length. Fail-closed when
 * INTERNAL_SERVICE_TOKEN is unset.
 *
 * Exported for unit testing (the milestones serviceAuthMiddleware
 * precedent — fake req/next without booting a server).
 */
export function cronAuthMiddleware(
  req: { header(name: string): string | undefined },
  _res: unknown,
  next: (err?: unknown) => void,
): void {
  const expected = env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return next(AppError.forbidden('Service token required'));
  }
  const bearer = req.header('authorization');
  const presented = bearer?.startsWith('Bearer ')
    ? bearer.slice('Bearer '.length)
    : req.header('x-internal-service-token');
  if (!presented) {
    return next(AppError.forbidden('Service token required'));
  }
  try {
    const a = createHash('sha256').update(presented, 'utf8').digest();
    const b = createHash('sha256').update(expected, 'utf8').digest();
    if (!timingSafeEqual(a, b)) {
      return next(AppError.forbidden('Service token required'));
    }
    next();
  } catch {
    next(AppError.forbidden('Service token required'));
  }
}

/**
 * The test-account heal — gated by ULARA_TEST_ACCOUNTS=1 (the boot
 * path's switch). Never fatal: the daily summary carries the honest
 * result either way (the route family's contract).
 */
async function runTestAccountsEnsure(source: 'cron' | 'operator'): Promise<{
  ran: boolean;
  jobs?: number;
  reason?: string;
  error?: string;
}> {
  if (process.env.ULARA_TEST_ACCOUNTS !== '1') {
    return { ran: false, reason: 'ULARA_TEST_ACCOUNTS!=1' };
  }
  try {
    const { ensureTestAccounts } = await import('../../modules/auth/test-accounts.js');
    const jobs = await ensureTestAccounts(prisma);
    logger.info({ source, jobs }, '[jobs/test-accounts] ensure pass completed');
    return { ran: true, jobs };
  } catch (err) {
    // Non-fatal by contract — the summary reports it honestly.
    logger.error({ source, err: String(err) }, '[jobs/test-accounts] ensure pass FAILED');
    return { ran: false, reason: 'error', error: String(err).slice(0, 200) };
  }
}

router.get('/daily', cronAuthMiddleware as import('express').RequestHandler, async (_req, res, next) => {
  try {
    const startedAt = Date.now();
    // r342 t13: the sync sub-job was retired (the SyncRun table it wrote
    // no longer exists upstream); the retention sweep is the sole DB job.
    // The remaining pair still never rejects by contract — a failing
    // sweep reports { ran: false, reason: 'error' } inside the summary
    // while the route answers 200 (the route family's honest-summary
    // contract).
    const [retention, testAccounts] = await Promise.all([
      runLoginEventRetentionSweep('cron'),
      runTestAccountsEnsure('cron'),
    ]);
    const summary = {
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      retention: { ran: retention.ran, reason: retention.ran ? undefined : retention.reason },
      testAccounts,
    };
    logger.info(summary, '[jobs/daily] scheduled jobs completed');
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/jobs/test-accounts — the operator shape: run the
 * ensureTestAccounts heal NOW (service token). Same honest-summary
 * contract: 200 with ran:false + reason when the deployment has not
 * opted into test accounts (ULARA_TEST_ACCOUNTS!=1) or when the pass
 * failed — never a transport error for an honest no-op.
 */
router.post(
  '/test-accounts',
  cronAuthMiddleware as import('express').RequestHandler,
  async (_req, res, next) => {
    try {
      const result = await runTestAccountsEnsure('operator');
      res.json({ data: { ...result, ranAt: new Date().toISOString() } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
