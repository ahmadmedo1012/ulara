#!/usr/bin/env node
/**
 * Resilient `prisma migrate deploy` for Render → Neon → Vercel.
 *
 * Connection policy (the r352 hardening round 2026-11-23):
 *   - Migration targets are DIRECT connections ONLY:
 *       1. DIRECT_DATABASE_URL when the operator sets it (and it does not
 *          itself look like a pooler URL — a contradictory signal is
 *          refused, not trusted);
 *       2. a derived direct URL (the runtime pooler hostname with the
 *          `-pooler` marker stripped and pgbouncer params dropped);
 *       3. the runtime DATABASE_URL itself when it is already direct.
 *   - There is NO pooler fallback: a PgBouncer transaction-pooling URL
 *     cannot guarantee PostgreSQL session stability for the duration of
 *     the migration lock (PgBouncer documents session-level advisory
 *     locks as unsupported in transaction pooling), and `connection_limit=1`
 *     proves nothing about server-side session identity. When no direct
 *     candidate reaches the database the script FAILS SAFELY — it never
 *     proceeds to migrate without a properly protected lock.
 *
 * Lock (single-flight migrate):
 *   - `pg_advisory_xact_lock` INSIDE one Prisma interactive transaction.
 *     The interactive-transaction contract pins ONE connection for the
 *     whole callback, so lock + migration + verification ride one
 *     session — the lock cannot be lost to pool reconnects between
 *     statements (the pre-fix session-level design had no such
 *     guarantee). Transaction-scoped advisory locks are also the ONLY
 *     form guaranteed to be released: COMMIT/ROLLBACK — or the server
 *     aborting the transaction when the process dies — frees the lock,
 *     so a crashed build can never leave it stuck.
 *   - Prisma 5.22 raw-query contract (verified empirically against real
 *     PostgreSQL 16 + @prisma/client 5.22.0 — see
 *     backend/tests/integration/migrate-lock.test.ts): `SELECT ...`
 *     statements ride `$queryRawUnsafe` (they return result rows:
 *     `pg_advisory_unlock`'s boolean, `pg_locks` facts); `SET` commands
 *     ride `$executeRawUnsafe` (no result set). `$executeRawUnsafe` on a
 *     SELECT returns the affected-row count and DISCARDS the row data,
 *     so it can never observe lock state.
 *   - While the migrate subprocess runs, a keepalive query every 15s
 *     keeps the lock transaction provably alive (idle-in-transaction
 *     reapers, transparent pool replacement), and AFTER the subprocess
 *     the lock holder is re-verified through pg_locks — the script
 *     never reports migration success unless the lock was actually held
 *     for the whole run.
 *
 * Pipeline:
 *   1. Vercel belt: refuse to migrate anything but production builds.
 *   2. Build the direct-candidate list; for each: DNS + TCP + SELECT 1
 *      wake loop (Neon cold start). First candidate that responds wins.
 *   3. Run `prisma migrate deploy` against the winner, wrapped in the
 *      advisory-lock transaction.
 *
 * The running application still receives the original DATABASE_URL —
 * `process.env` is never mutated in the parent process.
 * Idempotent: once migrations are applied, subsequent runs are a no-op.
 */

import { execFile } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { promises as dns } from 'node:dns';
import net from 'node:net';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Timestamped deploy logs: the emit-time (per-line ISO timestamp) is
// what makes two CONCURRENT migrators' logs comparable — the
// single-flight proof in tests/integration/migrate-lock.test.ts pairs
// "acquired" vs "releasing" markers across processes by exactly these
// timestamps (pipe-arrival order can invert lines written milliseconds
// apart; the emitting processes' shared wall clock cannot).
const log = (...args) => console.log('[migrate-deploy]', new Date().toISOString(), ...args);

// ─── URL candidates (DIRECT ONLY — see the header) ────────────────

/** A URL that CANNOT vouch for a stable direct PostgreSQL session. */
function looksLikePooledUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return /-pooler\./.test(u.hostname) || u.searchParams.get('pgbouncer') === 'true';
  } catch {
    return false;
  }
}

/** Exported for the integration belt — the DIRECT-ONLY candidate policy
 * is safety-critical (a pooler fallback would migrate without a
 * lock-guaranteed session), so the policy itself is pinned by
 * tests/integration/migrate-lock.test.ts. */
export function buildCandidates() {
  const runtimeUrl = process.env.DATABASE_URL?.trim();
  if (!runtimeUrl) {
    throw new Error('DATABASE_URL is required for database deployment.');
  }

  let runtimeParsed;
  try {
    runtimeParsed = new URL(runtimeUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }
  if (!/^postgres(?:ql)?:$/.test(runtimeParsed.protocol)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol "${runtimeParsed.protocol}". Expected postgresql:// or postgres://.`,
    );
  }

  const candidates = [];
  const runtimeIsPooled = looksLikePooledUrl(runtimeUrl);

  // 1. DIRECT_DATABASE_URL — the operator's explicit direct declaration.
  //    A value that itself carries a pooler marker contradicts the
  //    declaration: refuse it as a migration target (fail-closed), don't
  //    "trust" the contradictory signal.
  const configuredDirect = process.env.DIRECT_DATABASE_URL?.trim();
  if (configuredDirect) {
    if (looksLikePooledUrl(configuredDirect)) {
      log('⛔ DIRECT_DATABASE_URL carries a pooler marker (-pooler host or pgbouncer=true).');
      log('   A pooled URL cannot guarantee session stability for the migrate lock.');
      log('   Set a DIRECT (non-pooler) URL — or unset DIRECT_DATABASE_URL to use the derived direct candidate.');
    } else {
      candidates.push({ url: configuredDirect, label: 'DIRECT_DATABASE_URL' });
    }
  }

  // 2. Derived direct URL — strip the `-pooler` marker, drop the
  //    pgbouncer-only params. Long connect_timeout: Neon cold start can
  //    take 20-30s.
  if (/-pooler\./.test(runtimeParsed.hostname)) {
    const derived = new URL(runtimeUrl);
    derived.hostname = derived.hostname.replace(/-pooler(?=\.|$)/, '');
    derived.searchParams.delete('pgbouncer');
    derived.searchParams.delete('connection_limit');
    derived.searchParams.delete('pool_timeout');
    derived.searchParams.set('connect_timeout', '30');
    candidates.push({ url: derived.toString(), label: 'derived direct (stripped -pooler)' });
  }

  // 3. The runtime URL itself when it is already direct.
  if (!runtimeIsPooled) {
    const asIs = new URL(runtimeUrl);
    asIs.searchParams.delete('pgbouncer');
    asIs.searchParams.set('connect_timeout', '30');
    candidates.push({ url: asIs.toString(), label: 'DATABASE_URL (already direct)' });
  }

  return { runtimeUrl, candidates, runtimeIsPooled };
}

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch {
    return '<invalid-url>';
  }
}

function parseHostPort(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return { host: u.hostname, port: Number(u.port) || 5432 };
  } catch {
    return { host: '', port: 5432 };
  }
}

// ─── DNS + TCP diagnostics ──────────────────────────────────────
//   Before we even try Prisma, do a raw DNS lookup and TCP connect
//   test. This tells us:
//     - DNS resolves? (catches misconfigured DATABASE_URL hostname)
//     - TCP connects? (catches firewall / suspended Neon / network issues)
//   Prisma's error message is generic ("Can't reach database server")
//   — these diagnostics tell us WHY.

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

async function diagDns(hostname) {
  // An IP literal needs no resolution — c-ares would refuse it
  // (ENOTFOUND on e.g. 127.0.0.1), which must not disqualify a valid
  // direct candidate.
  if (IPV4_LITERAL.test(hostname)) {
    return { ok: true, ips: [hostname] };
  }
  try {
    const records = await dns.resolve4(hostname);
    return { ok: true, ips: records };
  } catch (err) {
    return { ok: false, error: err.code || err.message };
  }
}

async function diagTcp(host, port, { timeoutMs = 10_000 } = {}) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port }, () => {
      sock.end();
      resolve({ ok: true, ms: 0 });
    });
    sock.setTimeout(timeoutMs);
    sock.on('timeout', () => {
      sock.destroy(new Error('TCP timeout'));
    });
    sock.on('error', (err) => {
      resolve({ ok: false, error: err.code || err.message });
    });
  });
}

// ─── Error classification ──────────────────────────────────────

const PERMANENT_PRISMA_CODES = new Set(['P1003', 'P1004', 'P1010']);
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P1018']);

const PERMANENT_ERROR_PATTERNS = [
  /password authentication failed/i,
  /no password supplied/i,
  /database .* does not exist/i,
  /role .* does not exist/i,
  /SSL connection.*required/i,
  /certificate verify failed/i,
  /hostname\/IP does not match certificate/i,
];

const TRANSIENT_ERROR_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /EPIPE/i,
  /EAI_AGAIN/i,
  /server closed the connection unexpectedly/i,
  /terminating connection/i,
  /connection.*timed out/i,
];

/** The migrate slot was busy longer than the lock wait allows — a
 * stuck in-flight migrate. Failing loudly (no retries) is the contract:
 * queueing silently behind it hides a hung build. */
export class MigrateLockTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MigrateLockTimeoutError';
  }
}

function classifyError(err) {
  if (err instanceof MigrateLockTimeoutError) {
    return { kind: 'permanent', message: err.message };
  }
  if (err?.code && typeof err.code === 'string') {
    if (PERMANENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'permanent', message: `[${err.code}] ${err.message ?? ''}` };
    }
    if (TRANSIENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'transient', message: `[${err.code}] ${err.message ?? ''}` };
    }
  }

  const msg = String(err?.message ?? err?.toString?.() ?? err);
  if (PERMANENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'permanent', message: msg };
  }
  if (TRANSIENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'transient', message: msg };
  }

  if (/can't reach database server/i.test(msg)) {
    const hostMatch = msg.match(/at\s+[`'"]?(.+?):(\d+)[`'"]?/);
    if (hostMatch) {
      const host = hostMatch[1].replace(/[`'"\[\]]/g, '');
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
        return { kind: 'permanent', message: `${msg} (loopback host — config error, will not retry)` };
      }
    }
    return { kind: 'transient', message: msg };
  }

  return { kind: 'transient', message: msg };
}

// ─── Probe a single candidate ──────────────────────────────────

async function probeCandidate({ url, label }, { wakeAttempts = 8, delayMs = 5000 } = {}) {
  const { host, port } = parseHostPort(url);

  // ── DNS diagnostic ─────────────────────────────────────────────
  log(`\n▶ ${label}`);
  log(`  URL: ${redactUrl(url)}`);
  log(`  DNS lookup for ${host}...`);
  const dnsResult = await diagDns(host);
  if (dnsResult.ok) {
    log(`  ✅ DNS resolved: ${dnsResult.ips.join(', ')}`);
  } else {
    log(`  ❌ DNS failed: ${dnsResult.error}`);
    log(`  ⛔ Skipping this candidate — DNS resolution failed.`);
    return false;
  }

  // ── TCP diagnostic ─────────────────────────────────────────────
  log(`  TCP connect to ${host}:${port}...`);
  const tcpResult = await diagTcp(host, port, { timeoutMs: 15_000 });
  if (tcpResult.ok) {
    log(`  ✅ TCP connect succeeded`);
  } else {
    log(`  ❌ TCP connect failed: ${tcpResult.error}`);
    log(`  ⛔ Skipping this candidate — TCP connection refused/unreachable.`);
    log(`     Possible causes:`);
    log(`       - Neon project is suspended (revive in Neon dashboard)`);
    log(`       - Neon IP allow-list excludes the build host's egress IP`);
    log(`       - Network/firewall block between the build host and Neon`);
    log(`       - Neon project was deleted or renamed`);
    return false;
  }

  // ── Prisma SELECT 1 wake loop ──────────────────────────────────
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  try {
    for (let i = 1; i <= wakeAttempts; i++) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        log(`  ✅ DB awake (SELECT 1 succeeded, attempt ${i}/${wakeAttempts})`);
        return true;
      } catch (err) {
        const cls = classifyError(err);
        log(`  ⏳ wake attempt ${i}/${wakeAttempts} failed [${cls.kind}]: ${cls.message}`);
        if (cls.kind === 'permanent') {
          log(`  ⛔ permanent error — skipping this candidate.`);
          return false;
        }
        if (i < wakeAttempts) {
          await sleep(delayMs);
        }
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
  return false;
}

// ─── Run migrate ────────────────────────────────────────────────

function resolvePrismaBinary() {
  const candidates = [
    path.resolve(__dirname, '..', 'node_modules', '.bin', 'prisma'),
    path.resolve(__dirname, '..', '..', 'node_modules', '.bin', 'prisma'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// Resolve the backend package root (where prisma/schema.prisma lives).
// __dirname is backend/scripts/, so backend/ is one level up.
const BACKEND_ROOT = path.resolve(__dirname, '..');

/** The advisory-lock key serializing migrators against one database.
 * Arbitrary but stable — every migrator (Vercel production build,
 * manual `prisma:deploy`, deploy.yml CLI path) uses the same constant. */
export const MIGRATE_ADVISORY_LOCK_KEY = 920240766;

export const MIGRATE_LOCK_TIMEOUT_SECONDS = 300;
export const MIGRATE_LOCK_TX_TIMEOUT_MS = 20 * 60_000;
const MIGRATE_LOCK_KEEPALIVE_MS = 15_000;

function coerceLockTimeoutSeconds(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 3600) {
    throw new Error(`lockTimeoutSeconds must be an integer in [1, 3600] — got ${JSON.stringify(value)}`);
  }
  return n;
}

/**
 * Run `fn` while holding the migrate advisory lock on `targetUrl`.
 *
 * Contract (proven by backend/tests/integration/migrate-lock.test.ts):
 *   - lock + body + verification all ride ONE Prisma interactive
 *     transaction = ONE pinned PostgreSQL session;
 *   - `pg_advisory_xact_lock` (transaction-scoped) — released by
 *     COMMIT/ROLLBACK and by the server aborting the transaction when
 *     the process/connection dies (no stuck locks, ever);
 *   - the lock wait is bounded by `lock_timeout` (a MigrateLockTimeoutError
 *     aborts the run — never a silent queue);
 *   - a keepalive query every 15s while the body runs keeps the
 *     transaction provably live;
 *   - after the body completes, pg_locks is re-checked: the migration
 *     result is only returned when the lock was held for the whole run
 *     — a lost lock NEVER reports success.
 *
 * Exported for the integration belt; `fn` receives nothing and may
 * return a value (passed through on success).
 */
export async function withMigrateLock(targetUrl, label, fn, opts = {}) {
  if (typeof fn !== 'function') throw new Error('withMigrateLock(fn) must be a function');
  const lockTimeoutSeconds = coerceLockTimeoutSeconds(
    opts.lockTimeoutSeconds ?? MIGRATE_LOCK_TIMEOUT_SECONDS,
  );
  const txTimeoutMs = opts.txTimeoutMs ?? MIGRATE_LOCK_TX_TIMEOUT_MS;

  const url = new URL(targetUrl);
  // One connection is enough: the interactive transaction pins it for
  // the whole lock window.
  url.searchParams.set('connection_limit', '1');
  const lockClient = new PrismaClient({
    datasources: { db: { url: url.toString() } },
    log: ['error'],
  });
  log(`🔒 acquiring migrate advisory lock on ${label} (key ${MIGRATE_ADVISORY_LOCK_KEY}, wait ≤ ${lockTimeoutSeconds}s)...`);
  try {
    return await lockClient.$transaction(async (tx) => {
      // Prisma 5.22 raw-query contract (verified empirically — see the
      // file header): SET is a command with NO result set → the execute
      // interface. SET LOCAL scopes the timeout to THIS transaction.
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${lockTimeoutSeconds}s'`);
      // SELECT returns result rows → the query interface. The bare form
      // `SELECT pg_advisory_xact_lock(K)` is UNUSABLE with $queryRaw —
      // Prisma 5.22 fails with «Failed to deserialize column of type
      // 'void'» — so the lock rides a TYPED carrier row: the statement
      // BLOCKS until the lock is granted (bounded above by lock_timeout)
      // and then returns exactly one row. A lock wait that exceeds the
      // bound raises the raw "canceling statement due to lock timeout"
      // error — surfaced as MigrateLockTimeoutError below.
      try {
        const granted = await tx.$queryRawUnsafe(
          `SELECT 1 AS acquired FROM (SELECT pg_advisory_xact_lock(${MIGRATE_ADVISORY_LOCK_KEY})) carrier`,
        );
        if (!Array.isArray(granted) || granted.length !== 1) {
          throw new Error('migrate lock acquisition returned no grant row — refusing to proceed');
        }
      } catch (err) {
        if (/lock_timeout|lock timeout/i.test(String(err?.message ?? err))) {
          throw new MigrateLockTimeoutError(
            `another migrate holds the advisory lock (key ${MIGRATE_ADVISORY_LOCK_KEY}) after ${lockTimeoutSeconds}s — refusing to queue silently behind a possibly-stuck build`,
          );
        }
        throw err;
      }
      log('🔒 advisory lock acquired — this build owns the migrate slot.');
      // Keepalive: the body (prisma migrate deploy subprocess) can take
      // minutes; a query every 15s keeps the lock transaction provably
      // alive (idle-in-transaction reapers / transparent pool
      // replacement). Errors here are surfaced by the post-body probe.
      const keepalive = setInterval(() => {
        tx.$queryRawUnsafe('SELECT 1').catch(() => {});
      }, MIGRATE_LOCK_KEEPALIVE_MS);
      let out;
      try {
        out = await fn();
        // Liveness + ownership proof: OUR transaction must still be the
        // granted holder of the advisory lock. If the session died
        // mid-run the query itself throws (Prisma never transparently
        // reconnects inside an interactive transaction); if the lock
        // vanished any other way `held` is 0. Either way the migration
        // result is discarded — success is never reported for a run
        // whose lock was not actually held throughout.
        const [probe] = await tx.$queryRawUnsafe(
          `SELECT count(*)::int AS held FROM pg_locks WHERE locktype = 'advisory' AND classid = 0 AND objid = ${MIGRATE_ADVISORY_LOCK_KEY} AND granted = true AND pid = pg_backend_pid()`,
        );
        if (!probe || probe.held !== 1) {
          throw new Error(
            `migrate-lock lost mid-run (pg_locks reports ${probe?.held ?? 'no'} holder(s) for key ${MIGRATE_ADVISORY_LOCK_KEY}) — the migrate ran WITHOUT single-flight protection`,
          );
        }
      } finally {
        clearInterval(keepalive);
      }
      log('🔒 lock verified held for the whole migrate — releasing (transaction end).');
      return out;
    }, { timeout: txTimeoutMs, maxWait: 60_000 });
  } finally {
    await lockClient.$disconnect().catch(() => {});
  }
}

async function runMigrate(targetUrl, label, { attempts = 3, delayMs = 5000, stepTimeoutMs = 180_000 } = {}) {
  const prismaBin = resolvePrismaBinary();
  // Always pass --schema explicitly so cwd doesn't matter. This makes
  // the script work whether it's invoked from backend/, repo root,
  // or any other directory (Render build runs it from backend/ but
  // local dev may run it from elsewhere).
  const schemaPath = path.join(BACKEND_ROOT, 'prisma', 'schema.prisma');
  const cmd = prismaBin
    ? [prismaBin, 'migrate', 'deploy', '--schema', schemaPath]
    : ['prisma', 'migrate', 'deploy', '--schema', schemaPath];

  if (!prismaBin) {
    log('⚠️  Local prisma binary not found; falling back to `npx prisma`.');
  }
  log(`   schema: ${schemaPath}`);

  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    log(`🚀 migrate deploy via ${label} (attempt ${i}/${attempts})`);
    try {
      await withMigrateLock(targetUrl, label, () =>
        execFileAsync(cmd[0], cmd.slice(1), {
          stdio: 'inherit',
          timeout: stepTimeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          cwd: BACKEND_ROOT,
          env: {
            ...process.env,
            DATABASE_URL: targetUrl,
            DIRECT_DATABASE_URL: targetUrl,
          },
        }));
      log('✅ migrations applied');
      return;
    } catch (err) {
      lastErr = err;
      const cls = classifyError(err);
      log(`❌ migrate attempt ${i}/${attempts} failed [${cls.kind}]: ${cls.message}`);

      if (cls.kind === 'permanent') {
        log('⛔ Permanent migration error — aborting retry loop.');
        throw err;
      }
      if (i < attempts) {
        log(`   retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  // Vercel belt (defense in depth for the VERCEL_ENV=production gate
  // in the build script): a preview/development build must never run
  // migrations — the migrate path is production-only. If a future
  // rewiring ever reaches this point on a non-production Vercel
  // deployment, fail closed instead of migrating.
  if (process.env.VERCEL && process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    log(`⛔ refusing to migrate a Vercel ${process.env.VERCEL_ENV} build — migrations run in the production build only.`);
    process.exit(1);
  }

  const { runtimeUrl, candidates, runtimeIsPooled } = buildCandidates();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`runtime DB: ${redactUrl(runtimeUrl)}`);
  log(`migration candidates (${candidates.length}, direct connections only):`);
  for (const c of candidates) log(`  - ${c.label}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let winner = null;
  for (const c of candidates) {
    const ok = await probeCandidate(c);
    if (ok) {
      winner = c;
      break;
    }
  }

  if (!winner) {
    log('\n💥 No DIRECT migration candidate reached the database.');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('DIAGNOSTICS SUMMARY:');
    log(runtimeIsPooled
      ? '  DATABASE_URL is a POOLED URL (PgBouncer transaction pooling). The migration path deliberately has NO pooler fallback:'
      : '  Every direct candidate failed DNS / TCP / SELECT 1.');
    if (runtimeIsPooled) {
      log('  session-level stability cannot be guaranteed through transaction pooling, and');
      log('  a migrate without a properly protected lock is refused (fail-safe).');
      log('');
      log('ACTION REQUIRED:');
      log('  1. Set DIRECT_DATABASE_URL (the non-pooler hostname from your Neon/PG');
      log('     connection details) in the deployment environment, OR');
      log('  2. let the script derive it automatically: keep DATABASE_URL as the');
      log('     pooled runtime URL — the "-pooler" hostname suffix is stripped to');
      log('     reach the direct endpoint (verify the direct endpoint is reachable');
      log('     from the build host — IP allow-lists / firewall must permit it).');
      log('');
      log('SUPPORTED migration connections: direct PostgreSQL URLs (or a pooled');
      log('runtime URL whose direct twin is reachable). UNSUPPORTED: PgBouncer');
      log('transaction-pooling URLs as migration targets (no session stability).');
    } else {
      log('');
      log('ACTION REQUIRED:');
      log('  - Check the database is up / DNS / firewall / credentials.');
    }
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }

  log(`\n✅ selected migration DB: ${winner.label}`);
  await runMigrate(winner.url, winner.label);

  process.exit(0);
}

// Run main only when executed directly (node scripts/migrate-deploy.mjs
// / npm run prisma:deploy) — NOT when imported by the integration belt.
const invokedPath = process.argv[1]
  ? pathToFileURL(realpathSync(process.argv[1].toString())).href
  : null;
if (invokedPath === pathToFileURL(realpathSync(__filename)).href) {
  main().catch((err) => {
    log('💥 deploy failed:', err?.message ?? err);
    process.exit(1);
  });
}
