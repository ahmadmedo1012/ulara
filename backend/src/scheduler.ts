import { prisma } from './db.js';
import { logger } from './logger.js';
// r359 A4 — push receipt settling, stale-device pruning, weekly digest.
import { checkPendingReceipts, sweepStaleDevices } from './modules/notifications/push.js';
import { runWeeklyDigest } from './modules/email/outbox.js';

/**
 * Lightweight in-process scheduler.
 *
 * Render's free tier is single-process, so a setInterval-based ticker
 * is sufficient and avoids adding a job-queue dependency. The ticker
 * runs one daily job:
 *  - LoginEvent retention: prunes login telemetry older than
 *    LOGIN_EVENT_RETENTION_DAYS (also boot + every 24h)
 * The job never throws into the timer callback — errors are captured
 * by the logger.
 *
 * r342 t13 (2026-11-19): the zu-sync university-facts job that also
 * lived here was RETIRED — the shared production database dropped the
 * SyncRun/UniversityFact tables upstream (the sync system was already
 * dead code there), so every scheduler tick that planned a sync failed
 * against a missing table (P2021). The whole feature family — the
 * scheduler job, the /admin/sync console, the public /university/facts
 * feed, the owner System sync card — was removed in the same change;
 * only the retention sweep remains, and this file's contract is now
 * exactly one job.
 *
 * In a multi-instance deployment, replace this with a proper cron
 * (e.g. Render Cron Job, BullMQ, or pg-boss with a leader lock).
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5_000;

/**
 * LoginEvent retention horizon (11-c hand-off: rows are never pruned
 * on their own, and the table is attacker-inflatable — every failed
 * login writes one, so a botnet can grow it without bound while
 * retaining PII: emails, IPs, user agents).
 *
 * 180 days deliberately exceeds the 30-day window read by
 * GET /owner/login-analytics — do NOT lower it below that window
 * plus a healthy margin, or the OWNER analytics page silently loses
 * its oldest days.
 */
export const LOGIN_EVENT_RETENTION_DAYS = 180;

/**
 * Upper bound on rows deleted per sweep statement. Batching keeps each
 * DELETE small (index-backed id IN (…) of at most this many ids) so the
 * first sweep against a large attacker-inflated backlog can never turn
 * into one giant lock-heavy transaction on Neon's free tier.
 */
export const LOGIN_EVENT_PRUNE_BATCH_SIZE = 5_000;

/**
 * Safety valve: stop after this many batches per sweep (currently
 * 200 × 5,000 = 1M rows/day). The next daily sweep continues where
 * this one stopped, so a backlog larger than the cap drains over
 * multiple days instead of monopolizing the database in one run.
 */
export const LOGIN_EVENT_PRUNE_MAX_BATCHES = 200;

let dailyTimer: NodeJS.Timeout | null = null;
let bootTimer: NodeJS.Timeout | null = null;
let retentionInProgress = false;

// ── LoginEvent retention (11-c hand-off) ────────────────────────────

/**
 * Minimal structural slice of the Prisma client — same pattern as
 * `lib/operational-alerts.ts`, keeps the prune unit-testable without
 * a database or module-level mocking.
 */
interface LoginEventRetentionClient {
  loginEvent: {
    findMany(args: {
      where: { createdAt: { lt: Date } };
      select: { id: true };
      take: number;
    }): Promise<Array<{ id: string }>>;
    deleteMany(args: { where: { id: { in: string[] } } }): Promise<{ count: number }>;
  };
}

export interface PruneLoginEventsResult {
  /** Rows strictly older than this instant were eligible for deletion. */
  cutoff: Date;
  /** Rows actually deleted by this sweep. */
  deleted: number;
  /** Number of find+delete batch statements executed. */
  batches: number;
  /** True when MAX_BATCHES was reached with rows still eligible — the backlog continues draining on the next sweep. */
  capped: boolean;
}

/**
 * Delete LoginEvent rows older than LOGIN_EVENT_RETENTION_DAYS, in
 * bounded batches (find ids by the `createdAt` index, then delete by
 * id list — Prisma's deleteMany has no `take`, so a single unconditional
 * deleteMany would be one huge transaction on the first run against an
 * attacker-inflated backlog).
 *
 * Pure with respect to its inputs (client + clock) — exported for unit
 * tests. Throws only if the client itself fails; the scheduler wrapper
 * below owns the never-throw contract.
 */
export async function pruneLoginEvents(
  client: LoginEventRetentionClient,
  now: Date = new Date(),
): Promise<PruneLoginEventsResult> {
  const cutoff = new Date(now.getTime() - LOGIN_EVENT_RETENTION_DAYS * ONE_DAY_MS);
  let deleted = 0;
  let batches = 0;
  let capped = false;

  while (true) {
    const rows = await client.loginEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: LOGIN_EVENT_PRUNE_BATCH_SIZE,
    });
    // Empty page — everything older than the cutoff is gone.
    if (rows.length === 0) break;

    const res = await client.loginEvent.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    deleted += res.count;
    batches += 1;

    // Short page — this batch drained the predicate for this sweep.
    if (rows.length < LOGIN_EVENT_PRUNE_BATCH_SIZE) break;
    // Full page deleted and the safety valve is tripped: eligible rows
    // may remain. The next sweep continues from exactly this cutoff.
    if (batches >= LOGIN_EVENT_PRUNE_MAX_BATCHES) {
      capped = true;
      break;
    }
  }

  return { cutoff, deleted, batches, capped };
}

/**
 * Result of a guarded retention sweep attempt.
 * `ran: false` means this tick was skipped (overlap) or failed (error —
 * already logged here, never rethrown).
 */
export type RetentionSweepOutcome =
  | { ran: true; result: PruneLoginEventsResult }
  | { ran: false; reason: 'overlap' | 'error' };

/**
 * Scheduler-facing wrapper around pruneLoginEvents. The overlap-guard
 * discipline: a sweep still in flight skips the next tick instead of
 * stacking a second one on the same connection pool.
 *
 * Never rejects — a failing sweep is logged and reported as
 * `{ ran: false, reason: 'error' }` so the timer callback can fire it
 * with a plain `void` call (no unhandled-rejection risk).
 */
export async function runLoginEventRetentionSweep(label: string): Promise<RetentionSweepOutcome> {
  if (retentionInProgress) {
    logger.warn({ label }, '[scheduler] previous retention sweep still running — skipping this tick');
    return { ran: false, reason: 'overlap' };
  }
  retentionInProgress = true;
  try {
    const result = await pruneLoginEvents(prisma);
    if (result.deleted > 0 || result.capped) {
      logger.info(
        {
          label,
          deleted: result.deleted,
          batches: result.batches,
          capped: result.capped,
          cutoff: result.cutoff,
        },
        '[scheduler] login-event retention sweep complete',
      );
    }
    if (result.capped) {
      logger.warn(
        { label, batches: result.batches },
        '[scheduler] login-event retention sweep hit its batch cap — the remaining backlog drains on the next sweep',
      );
    }
    return { ran: true, result };
  } catch (err) {
    // Best-effort job: telemetry pruning must never take the process
    // down, and the next tick retries naturally.
    logger.error({ err, label }, '[scheduler] login-event retention sweep failed');
    return { ran: false, reason: 'error' };
  } finally {
    retentionInProgress = false;
  }
}

// ── r359 A4 — the ops ticker (receipts every 5 min; the daily tick
// gains the device sweep; the hourly tick gates the weekly digest) ──

let opsTimer: NodeJS.Timeout | null = null;
let hourlyTimer: NodeJS.Timeout | null = null;
let digestWeekStamp = '';

/** The digest runs Sunday 18:00–19:00 UTC (Africa/Tripoli 20:00 local);
 * the stamp prevents double-firing inside the window. */
function weekStamp(now: Date): string {
  return `${now.getUTCFullYear()}-W${Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 1)) / 604800000,
  )}`;
}

async function runOpsTick(label: string): Promise<void> {
  try {
    const receipts = await checkPendingReceipts(prisma);
    if (receipts.checked > 0) {
      logger.info({ label, ...receipts }, '[scheduler] push receipt check complete');
    }
  } catch (err) {
    logger.warn({ err, label }, '[scheduler] push receipt check failed');
  }
}

export function startScheduler() {
  // Initial run after boot, once the server is responsive. Retention
  // also runs on boot: on Render's free tier the process is restarted
  // (or cold-started) far more often than a 24h interval elapses, so
  // the boot tick is the one that fires most reliably. The job is
  // cheap and idempotent in the steady state.
  // runLoginEventRetentionSweep never rejects by contract; the void
  // call keeps a failing boot callback from surfacing as an unhandled
  // promise rejection.
  bootTimer = setTimeout(() => {
    void runLoginEventRetentionSweep('initial');
  }, BOOT_DELAY_MS);

  // Recurring daily run (same never-reject contract). r359 A4: the
  // daily tick ALSO prunes stale push devices (180d) + old receipts.
  dailyTimer = setInterval(() => {
    void runLoginEventRetentionSweep('daily');
    void sweepStaleDevices(prisma).catch((err) => {
      logger.warn({ err }, '[scheduler] stale-device sweep failed');
    });
  }, ONE_DAY_MS);

  // r359 A4 — the ops ticker: settle Expo push receipts every 5 minutes.
  opsTimer = setInterval(() => {
    void runOpsTick('ops');
  }, 5 * 60 * 1000);

  // r359 A4 — the hourly gate for the weekly digest (Sunday 18:00 UTC).
  hourlyTimer = setInterval(() => {
    const now = new Date();
    if (now.getUTCDay() !== 0 || now.getUTCHours() !== 18) return;
    const stamp = weekStamp(now);
    if (digestWeekStamp === stamp) return;
    digestWeekStamp = stamp;
    void runWeeklyDigest(prisma, now)
      .then((out) => logger.info({ ...out }, '[scheduler] weekly digest complete'))
      .catch((err) => logger.warn({ err }, '[scheduler] weekly digest failed'));
  }, 60 * 60 * 1000);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
  if (typeof opsTimer.unref === 'function') opsTimer.unref();
  if (typeof hourlyTimer.unref === 'function') hourlyTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
  if (opsTimer) { clearInterval(opsTimer); opsTimer = null; }
  if (hourlyTimer) { clearInterval(hourlyTimer); hourlyTimer = null; }
}
