/**
 * Prisma error-shape predicates for race losers.
 *
 * WHY THIS EXISTS (CI evidence, run 45055598165, 2026-11-22): Prisma 5.22
 * does NOT surface a PostgreSQL deadlock (SQLSTATE 40P01) inside an
 * interactive `prisma.$transaction(async (tx) => …)` as
 * `PrismaClientKnownRequestError` code `P2034` — the documented mapping
 * only fires for errors Prisma's engine attributes to its own transaction
 * manager. A 40P01 raised on a statement INSIDE the callback escapes as
 * `PrismaClientUnknownRequestError` whose message embeds the connector
 * dump: `ConnectorError(… QueryError(PostgresError { code: "40P01",
 * message: "deadlock detected", … }))`. The r352 §6.3 catch in the first
 * hardening pass keyed on `P2034` and therefore never matched — the racing
 * loser kept answering 500 (test: r352-concurrency.test.ts §6.3,
 * "expected 500 to be 409").
 *
 * The predicate below accepts BOTH shapes so the mapping survives Prisma
 * version drift in either direction:
 *   1. `PrismaClientKnownRequestError` with `code === 'P2034'`
 *      (write conflict / deadlock as attributed by the engine), and
 *   2. `PrismaClientUnknownRequestError` whose message carries the raw
 *      `40P01` / `deadlock detected` dump (Prisma 5.22 behaviour, proven
 *      above), or `40001` / `could not serialize access` for
 *      serialization failures that escape the same way.
 *
 * ROUTES USING THIS: when the ONLY contended resource inside the
 * transaction is the concurrency invariant itself (a unique/exclusion
 * index on the row being written), a deadlock between two racing writers
 * IS the race resolving — the victim may honestly receive the same 4xx
 * the sequential loser gets. Do NOT use this helper to mask deadlocks in
 * transactions with unrelated lock footprints; those are 500s and belong
 * in the log.
 */
import { Prisma } from '@prisma/client';

const DEADLOCK_MARKERS: readonly RegExp[] = [
  /code:\s*"?40P01"?/, // ConnectorError dump — quoted in some Prisma builds
  /deadlock detected/i,
  /code:\s*"?40001"?/, // serialization_failure escaping as Unknown
  /could not serialize access due to (concurrent update|read\/write dependencies)/i,
];

export function isPrismaWriteConflictOrDeadlock(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Prisma.PrismaClientUnknownRequestError)) {
    return false;
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
    return true;
  }
  const message = typeof e.message === 'string' ? e.message : '';
  return DEADLOCK_MARKERS.some((marker) => marker.test(message));
}
