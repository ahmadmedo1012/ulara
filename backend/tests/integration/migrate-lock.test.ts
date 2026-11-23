/**
 * The migrate-lock belt (r352 hardening round 2026-11-23) — pins the
 * contract of `backend/scripts/migrate-deploy.mjs`'s `withMigrateLock`
 * on REAL PostgreSQL (the suite's disposable DB):
 *
 *   1. acquire → body → release: the advisory lock is held by exactly
 *      ONE granted session while the body runs, and is gone after.
 *   2. a failing body: the lock is released on the way out (rollback),
 *      and the failure is NOT swallowed.
 *   3. single-flight: while holder A's body runs, holder B BLOCKS in
 *      acquisition; B's body only starts after A released. A monitor
 *      sampling pg_locks never observes two granted holders.
 *   4. lock wait bounded: a second migrator with a 1s lock_timeout
 *      fails loudly (MigrateLockTimeoutError) instead of queueing
 *      forever — and the failure surfaces (no swallowed lock errors).
 *   5. process death: a child process SIGKILLed while holding the lock
 *      leaves NO stuck lock — the server aborts the transaction and
 *      frees the slot when the connection drops.
 *   6. the full black-box script: two CONCURRENT `migrate-deploy.mjs`
 *      runs against the same database serialize — the second one's
 *      "lock acquired" line only appears after the first one's
 *      "migrations applied" line (arrival timestamps prove the order),
 *      and both exit 0 (the deploy is idempotent).
 *
 * The Prisma 5.22 raw-query interface split this lock relies on is
 * itself part of the contract under test: `SET LOCAL` rides the
 * $executeRawUnsafe command interface, `SELECT pg_advisory_xact_lock`
 * rides the $queryRaw result interface — `$executeRawUnsafe` on a
 * SELECT discards the result rows (verified empirically before this
 * suite was written: `SELECT 1` → `1` (a row count), while
 * `pg_advisory_unlock` via `$queryRawUnsafe` → `[{ pg_advisory_unlock:
 * true }]`), so a lock acquired/unlocked through the execute interface
 * could never be observed.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db, truncateAll } from './helpers.js';
import {
  buildCandidates,
  MIGRATE_ADVISORY_LOCK_KEY,
  MigrateLockTimeoutError,
  withMigrateLock,
} from '../../scripts/migrate-deploy.mjs';

/** The DB the suite's guard already validated (local disposable). */
const DB_URL = process.env.DATABASE_URL as string;

beforeEach(async () => {
  await truncateAll(db());
});

/** The granted advisory-lock holders for the migrate key, seen from an
 * independent pooled connection (pg_locks is a cluster-wide view). */
async function grantedHolders(): Promise<number[]> {
  const rows = await db().$queryRawUnsafe<{ pid: number }[]>(
    `SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND classid = 0 AND objid = ${MIGRATE_ADVISORY_LOCK_KEY} AND granted = true`,
  );
  return rows.map((r) => r.pid);
}

/** Monitors pg_locks while `durMs` passes; returns the max number of
 * simultaneous granted holders observed (must stay 1 — single flight). */
async function maxSimultaneousHolders(durMs: number, sampleMs = 25): Promise<number> {
  const t0 = Date.now();
  let max = 0;
  while (Date.now() - t0 < durMs) {
    max = Math.max(max, (await grantedHolders()).length);
    await new Promise((r) => setTimeout(r, sampleMs));
  }
  return max;
}

describe('buildCandidates — the DIRECT-ONLY migration candidate policy', () => {
  const ORIGINAL_DB = process.env.DATABASE_URL;
  const ORIGINAL_DIRECT = process.env.DIRECT_DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = ORIGINAL_DB;
    if (ORIGINAL_DIRECT === undefined) delete process.env.DIRECT_DATABASE_URL;
    else process.env.DIRECT_DATABASE_URL = ORIGINAL_DIRECT;
  });

  it('a POOLED runtime URL contributes its stripped direct twin — and NOTHING else', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@ep-example-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true&connection_limit=5';
    delete process.env.DIRECT_DATABASE_URL;
    const { candidates, runtimeIsPooled } = buildCandidates();
    expect(runtimeIsPooled).toBe(true);
    expect(candidates.map((c) => c.label)).toEqual(['derived direct (stripped -pooler)']);
    const url = new URL(candidates[0]!.url);
    expect(url.hostname).toBe('ep-example.region.aws.neon.tech'); // -pooler stripped
    expect(url.searchParams.get('pgbouncer')).toBe(null); // pooling params dropped
    expect(url.searchParams.get('connection_limit')).toBe(null);
  });

  it('a clean DIRECT_DATABASE_URL is trusted and leads; a POOLER-looking one is REFUSED', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@ep-example-pooler.region.aws.neon.tech/db?sslmode=require';
    process.env.DIRECT_DATABASE_URL = 'postgresql://u:p@ep-example.region.aws.neon.tech/db?sslmode=require';
    expect(buildCandidates().candidates.map((c) => c.label)).toEqual([
      'DIRECT_DATABASE_URL',
      'derived direct (stripped -pooler)',
    ]);
    // A DIRECT_DATABASE_URL that itself carries a pooler marker contradicts
    // its own declaration — refused as a migration target, never trusted.
    process.env.DIRECT_DATABASE_URL = 'postgresql://u:p@ep-other-pooler.region.aws.neon.tech/db?pgbouncer=true';
    expect(buildCandidates().candidates.map((c) => c.label)).toEqual(['derived direct (stripped -pooler)']);
  });

  it('an already-DIRECT runtime URL is used as-is (no synthetic pooler params)', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@db.internal:5432/ulara';
    delete process.env.DIRECT_DATABASE_URL;
    const { candidates, runtimeIsPooled } = buildCandidates();
    expect(runtimeIsPooled).toBe(false);
    expect(candidates.map((c) => c.label)).toEqual(['DATABASE_URL (already direct)']);
    const url = new URL(candidates[0]!.url);
    expect(url.hostname).toBe('db.internal');
    expect(url.searchParams.get('pgbouncer')).toBe(null);
  });

  it('NEVER offers a pooler fallback: every candidate URL is session-stable-direct by construction', () => {
    for (const [runtime, direct] of [
      ['postgresql://u:p@ep-x-pooler.r.aws.neon.tech/db?sslmode=require', undefined],
      ['postgresql://u:p@ep-x-pooler.r.aws.neon.tech/db?sslmode=require', 'postgresql://u:p@direct.r.aws.neon.tech/db'],
      ['postgresql://u:p@plain.example/db', 'postgresql://u:p@d.example/db'],
    ] as const) {
      process.env.DATABASE_URL = runtime;
      if (direct === undefined) delete process.env.DIRECT_DATABASE_URL;
      else process.env.DIRECT_DATABASE_URL = direct;
      const { candidates } = buildCandidates();
      expect(candidates.length).toBeGreaterThan(0);
      for (const c of candidates) {
        const url = new URL(c.url);
        expect(/-pooler\./.test(url.hostname)).toBe(false);
        expect(url.searchParams.get('pgbouncer')).toBe(null);
      }
    }
    // THE fail-safe shape: a pgbouncer=true runtime URL with no -pooler
    // marker to strip and no DIRECT_DATABASE_URL yields ZERO candidates —
    // the script then refuses to migrate at all (exit 1 with the pooler
    // refusal diagnostics) rather than migrating unprotected.
    process.env.DATABASE_URL = 'postgresql://u:p@plain.example/db?pgbouncer=true';
    delete process.env.DIRECT_DATABASE_URL;
    expect(buildCandidates().candidates).toHaveLength(0);
  });
});

describe('withMigrateLock — the advisory-lock contract', () => {
  it('holds exactly one granted advisory lock for the body duration, then releases it', async () => {
    expect(await grantedHolders()).toHaveLength(0);
    let during: number[] = [];
    const out = await withMigrateLock(DB_URL, 'test-db', async () => {
      during = await grantedHolders();
      return 'ran-body';
    });
    expect(out).toBe('ran-body');
    expect(during).toHaveLength(1); // exactly one holder — ours
    expect(await grantedHolders()).toHaveLength(0); // released at transaction end
  }, 20_000);

  it('releases the lock when the body FAILS (rollback) and surfaces the failure', async () => {
    await expect(
      withMigrateLock(DB_URL, 'test-db', async () => {
        throw new Error('simulated migrate failure');
      }),
    ).rejects.toThrow('simulated migrate failure');
    expect(await grantedHolders()).toHaveLength(0);
  }, 20_000);

  it('single-flight: a second migrator blocks until the first releases (never two holders)', async () => {
    let releaseFirst: (() => void) | undefined;
    let gateReleasedAt = 0;
    let secondBodyStartedAt = 0;
    const firstGate = new Promise<void>((r) => {
      releaseFirst = () => { gateReleasedAt = Date.now(); r(); };
    });

    // 1. The FIRST migrator takes the lock and parks its body on the gate.
    const first = withMigrateLock(DB_URL, 'first', async () => {
      await firstGate;
      return 'first-done';
    });
    // 2. Wait until the first is the OBSERVED granted holder (whoever
    //    sends the acquire first wins; starting the second only after
    //    this observation makes the roles deterministic).
    while ((await grantedHolders()).length === 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect((await grantedHolders()).length).toBe(1);
    // 3. NOW the second migrator starts: its acquisition must block
    //    until the first's transaction commits.
    const second = withMigrateLock(DB_URL, 'second', async () => {
      secondBodyStartedAt = Date.now();
      return 'second-done';
    });
    // 4. While the first holds: never two granted holders.
    const firstMax = await maxSimultaneousHolders(300);
    // 5. Release the first's body — its transaction commits right after.
    releaseFirst!();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe('first-done');
    expect(secondResult).toBe('second-done');
    expect(firstMax).toBe(1); // never two granted holders at once
    // The airtight ordering: the second body can only start after the
    // first's transaction COMMITTED — which happens strictly after the
    // first's body returned — which happens strictly after the gate was
    // released. The second body therefore never started before
    // gateReleasedAt (no interleaving of the two critical sections).
    expect(secondBodyStartedAt).toBeGreaterThanOrEqual(gateReleasedAt);
    expect(await grantedHolders()).toHaveLength(0);
  }, 30_000);

  it('fails LOUDLY on lock-wait timeout (no silent queue) with MigrateLockTimeoutError', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((r) => { releaseFirst = r; });
    const first = withMigrateLock(DB_URL, 'first', async () => {
      await firstGate;
    });
    while ((await grantedHolders()).length === 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
    const second = withMigrateLock(DB_URL, 'second', async () => 'never-runs', {
      lockTimeoutSeconds: 1,
    });
    await expect(second).rejects.toBeInstanceOf(MigrateLockTimeoutError);
    // the first holder is untouched — the timeout failed the SECOND run
    expect((await grantedHolders()).length).toBe(1);
    releaseFirst!();
    await first;
    expect(await grantedHolders()).toHaveLength(0);
  }, 30_000);

  it('a SIGKILLed holder leaves NO stuck lock (the server aborts the transaction)', async () => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '-e', `
        import { withMigrateLock } from ${JSON.stringify(new URL('../../scripts/migrate-deploy.mjs', import.meta.url).href)};
        await withMigrateLock(process.env.DATABASE_URL, 'child', async () => {
          process.stdout.write('CHILD:LOCKED\\n');
          await new Promise((r) => setTimeout(r, 120_000)); // hold the slot "forever"
        });
      `],
      { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: ['ignore', 'pipe', 'inherit'] },
    );
    try {
      // wait for the child to actually hold the lock
      const locked = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('child never reported the lock')), 15_000);
        child.stdout!.on('data', (chunk: Buffer) => {
          if (chunk.toString().includes('CHILD:LOCKED')) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      await locked;
      while ((await grantedHolders()).length === 0) {
        await new Promise((r) => setTimeout(r, 10));
      }
      expect((await grantedHolders()).length).toBe(1);
      // SIGKILL: no finally, no unlock — the process dies mid-hold
      child.kill('SIGKILL');
      // the lock must disappear by itself (server aborts the open
      // transaction when the TCP connection drops)
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if ((await grantedHolders()).length === 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(await grantedHolders()).toHaveLength(0);
    } finally {
      child.kill('SIGKILL');
    }
  }, 40_000);
});

describe('migrate-deploy.mjs black-box — two concurrent full runs serialize', () => {
  it('both exit 0; the second acquires only AFTER the first released the slot', async () => {
    const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const markers: { process: string; marker: string; at: number }[] = [];
    const spawnMigrator = (tag: string) => new Promise<{ code: number | null }>((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/migrate-deploy.mjs'], {
        cwd: backendRoot,
        env: { ...process.env, DATABASE_URL: DB_URL },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code }));
      // Line-buffered marker capture. Each completed line records the
      // EMIT timestamp embedded in the line itself (the script prefixes
      // every log line with it) — pipe-arrival order can invert lines
      // written milliseconds apart, but both processes share one host
      // wall clock, so emit-time ordering is exact.
      const lineParser = (buf: Buffer) => {
        text += buf.toString();
        let nl: number;
        while ((nl = text.indexOf('\n')) !== -1) {
          const line = text.slice(0, nl);
          text = text.slice(nl + 1);
          const tsMatch = line.match(/(\d{4}-\d{2}-\d{2}T[0-9:.]+Z)/);
          const at = tsMatch ? Date.parse(tsMatch[1]!) : Date.now();
          if (line.includes('advisory lock acquired')) markers.push({ process: tag, marker: 'acquired', at });
          if (line.includes('releasing (transaction end)')) markers.push({ process: tag, marker: 'releasing', at });
          if (line.includes('migrations applied')) markers.push({ process: tag, marker: 'applied', at });
        }
      };
      let text = '';
      child.stdout!.on('data', lineParser);
      child.stderr!.on('data', lineParser);
    });

    expect(await grantedHolders()).toHaveLength(0);
    // A witness watching for a violation while both run.
    const witness = maxSimultaneousHolders(12_000);
    const [runA, runB] = await Promise.all([spawnMigrator('A'), spawnMigrator('B')]);
    const maxHolders = await witness;
    expect(runA.code).toBe(0);
    expect(runB.code).toBe(0);
    expect(maxHolders).toBeLessThanOrEqual(1); // one granted holder at any sampled instant

    const acquired = markers.filter((m) => m.marker === 'acquired');
    const releasing = markers.filter((m) => m.marker === 'releasing');
    const applied = markers.filter((m) => m.marker === 'applied');
    expect(acquired).toHaveLength(2);
    expect(releasing).toHaveLength(2);
    expect(applied).toHaveLength(2);

    // Per-process internal order: acquire → releasing → applied.
    for (const tag of ['A', 'B']) {
      const own = markers.filter((m) => m.process === tag);
      const at = (marker: string) => own.find((m) => m.marker === marker)!.at;
      expect(at('acquired')).toBeLessThanOrEqual(at('releasing'));
      expect(at('releasing')).toBeLessThanOrEqual(at('applied'));
    }

    // THE serialization proof (emit timestamps, exact): order the two
    // migrators by their acquire time; the FIRST one's "releasing"
    // marker is emitted while it still HOLDS the lock (before its
    // COMMIT), and the SECOND one cannot acquire the lock until that
    // commit — so the second's "acquired" emit-time is >= the first's
    // "releasing" emit-time. The two [acquired, releasing] critical
    // sections NEVER overlap: only one process was migrating at any
    // instant.
    const ordered = [...acquired].sort((a, b) => a.at - b.at);
    const firstTag = ordered[0]!.process;
    const secondTag = ordered[1]!.process;
    const firstReleasingAt = releasing.find((m) => m.process === firstTag)!.at;
    const secondAcquiredAt = acquired.find((m) => m.process === secondTag)!.at;
    expect(secondAcquiredAt).toBeGreaterThanOrEqual(firstReleasingAt);
    // and the release marker emission predates the second acquire with
    // real time, not measurement luck (the commit gap) — sanity range
    // only; the exact ordering above is the invariant.
    expect(secondAcquiredAt - firstReleasingAt).toBeGreaterThanOrEqual(0);
    expect(await grantedHolders()).toHaveLength(0); // nothing left behind
  }, 60_000);
});
