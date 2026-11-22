/**
 * r352 §6.3 — the deadlock-shape regression lock for the shared
 * Prisma race-loser predicate.
 *
 * CI run 45055598165 (2026-11-22, post-PR#39) proved that Prisma 5.22
 * escapes a PostgreSQL deadlock (SQLSTATE 40P01) raised INSIDE an
 * interactive transaction as `PrismaClientUnknownRequestError` whose
 * message embeds the raw connector dump — NOT as
 * `PrismaClientKnownRequestError` P2034. The first hardening pass keyed
 * on P2034, so §6.3's racing loser answered 500 instead of 409.
 *
 * These cases pin the exact CI-witnessed message (redacted to the
 * markers the predicate reads) plus the shapes that must stay FALSE:
 * a unique violation (P2002 — mapped by its own branches) and an
 * ordinary error never masquerade as a deadlock.
 */
import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { isPrismaWriteConflictOrDeadlock } from '../prisma-errors.js';

const ciWitnessedDeadlock = new Prisma.PrismaClientUnknownRequestError(
  'Invalid `tx.facilityReservation.create()` invocation in\n' +
    'src/http/routes/r352-operations.routes.ts:617:54\n' +
    'Error occurred during query execution:\n' +
    'ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "40P01", ' +
    'message: "deadlock detected", severity: "ERROR", detail: Some("Process 298 waits for ShareLock on ' +
    'transaction 11047; blocked by process 297.\\nProcess 297 waits for ShareLock on transaction 11048; ' +
    'blocked by process 298."), column: None, hint: Some("See server log for query details.") }), ' +
    'transient: false })',
  { clientVersion: '5.22.0' },
);

describe('isPrismaWriteConflictOrDeadlock', () => {
  it('matches the CI-witnessed 40P01 UnknownRequestError dump (the §6.3 regression)', () => {
    expect(isPrismaWriteConflictOrDeadlock(ciWitnessedDeadlock)).toBe(true);
  });

  it('matches a KnownRequestError P2034 (engine-attributed write conflict)', () => {
    const e = new Prisma.PrismaClientKnownRequestError('Transaction failed due to a write conflict or a deadlock', {
      code: 'P2034',
      clientVersion: '5.22.0',
      meta: { message: 'Transaction failed due to a write conflict or a deadlock' },
    });
    expect(isPrismaWriteConflictOrDeadlock(e)).toBe(true);
  });

  it('matches a serialization_failure dump escaped as Unknown', () => {
    const e = new Prisma.PrismaClientUnknownRequestError(
      'Error occurred during query execution:\n' +
        'ConnectorError(ConnectorError { kind: QueryError(PostgresError { code: "40001", ' +
        'message: "could not serialize access due to concurrent update" }) })',
      { clientVersion: '5.22.0' },
    );
    expect(isPrismaWriteConflictOrDeadlock(e)).toBe(true);
  });

  it('does NOT swallow a unique violation (P2002 has its own mapping branches)', () => {
    const e = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`programId`)', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['programId'] },
    });
    expect(isPrismaWriteConflictOrDeadlock(e)).toBe(false);
  });

  it('does NOT swallow non-Prisma errors', () => {
    expect(isPrismaWriteConflictOrDeadlock(new Error('deadlock detected'))).toBe(false);
    expect(isPrismaWriteConflictOrDeadlock(new Prisma.PrismaClientUnknownRequestError('relation does not exist', {
      clientVersion: '5.22.0',
    }))).toBe(false);
  });
});
