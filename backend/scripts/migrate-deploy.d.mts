/**
 * Typed surface for scripts/migrate-deploy.mjs (the migration deploy
 * script). The implementation is plain ESM JavaScript (it runs standalone
 * under `node` in build pipelines); this declaration gives the
 * integration belt (tests/integration/migrate-lock.test.ts) a checked
 * import of the lock contract.
 */

/** The advisory-lock key serializing migrators against one database. */
export declare const MIGRATE_ADVISORY_LOCK_KEY: number;

/** Default bound on the advisory-lock acquisition wait (seconds). */
export declare const MIGRATE_LOCK_TIMEOUT_SECONDS: number;

/** Default bound on the whole lock transaction (ms). */
export declare const MIGRATE_LOCK_TX_TIMEOUT_MS: number;

/** The migrate slot was busy longer than the lock wait allows — a stuck
 * in-flight migrate. Aborts the run (never a silent queue). */
export declare class MigrateLockTimeoutError extends Error {
  constructor(message: string);
}

/**
 * Run `fn` while holding the migrate advisory lock on `targetUrl`.
 * Lock + body + verification ride ONE Prisma interactive transaction
 * (one pinned PostgreSQL session); `pg_advisory_xact_lock` is
 * transaction-scoped — released at COMMIT/ROLLBACK and by the server
 * aborting the transaction when the process dies (no stuck locks).
 * Options: `lockTimeoutSeconds` (acquisition wait bound, default 300),
 * `txTimeoutMs` (whole-transaction bound, default 20 min).
 */
export declare function withMigrateLock(
  targetUrl: string,
  label: string,
  fn: () => Promise<unknown> | unknown,
  opts?: { lockTimeoutSeconds?: number; txTimeoutMs?: number },
): Promise<unknown>;
