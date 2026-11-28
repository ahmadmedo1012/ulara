#!/usr/bin/env node
/**
 * r370 item 7 — p50 / p95 for the five hottest reads, measured against the
 * seeded load database (backend/scripts/seed-load.mjs, LOAD_STUDENTS=1200).
 *
 * Why one server per endpoint: the app's honest global limiter is
 * 1000 req / 15 min / IP (rateLimit.ts), so a single process would turn a
 * 3000-request run into 429s. A fresh process per endpoint resets the
 * bucket and keeps the measurement clean; warm-up requests are excluded.
 *
 *   node scripts/load-hotspots.mjs --label after
 *   node scripts/load-hotspots.mjs --label before --drop-indexes
 *
 * Requires: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (the same
 * values the spawned server gets), and `npx autocannon` resolvable.
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const dropIndexes = args.includes('--drop-indexes');
const PORT = Number(process.env.PORT ?? 4100);
const BASE = `http://127.0.0.1:${PORT}`;
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS ?? 25);
const DURATION = Number(process.env.LOAD_DURATION ?? 30);
// The app's global limiter is 1000 req / 15 min / IP (real policy, never
// tuned for a benchmark). Each endpoint therefore fires a bounded 900
// requests on one fresh process — enough for a stable p95, inside the
// bucket, zero 429s.
const REQUESTS = Number(process.env.LOAD_REQUESTS ?? 900);

const IDX = [
  'Submission_assignmentId_status_grade_idx',
  'Submission_status_gradedAt_idx',
  'AttendanceRecord_sessionId_status_idx',
];

const prisma = new PrismaClient();

function sign(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, inst: user.institutionId, type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

async function users() {
  const student = await prisma.user.findFirst({
    where: { email: 'r370-load-s0222@load.test' },
    select: { id: true, role: true },
  });
  const teacher = await prisma.user.findFirst({
    where: { email: 'r370-load-t0@load.test' },
    select: { id: true, role: true },
  });
  const inst = await prisma.institution.findFirst({ where: { slug: 'r370-load' }, select: { id: true } });
  return {
    student: { ...student, institutionId: inst?.id ?? null },
    teacher: { ...teacher, institutionId: inst?.id ?? null },
  };
}

/** The previous process must release the port before the next one binds —
 *  a killed child can linger in the socket table for a moment. */
async function waitForPortFree(timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fetch(`${BASE}/api/v1/ping`, { signal: AbortSignal.timeout(500) });
    } catch {
      return; // connection refused → the port is free
    }
    await delay(150);
  }
}

async function waitForPing(proc, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(`server exited early (code ${proc.exitCode}): ${String(proc.__log ?? '').slice(-500)}`);
    }
    try {
      const res = await fetch(`${BASE}/api/v1/ping`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await delay(200);
  }
  throw new Error('server did not answer /ping within 30s');
}

function autocannon(url, token) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes', 'autocannon@7',
        '-j', '-c', String(CONNECTIONS), '-d', String(DURATION), '-a', String(REQUESTS),
        '-H', `authorization: Bearer ${token}`,
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`autocannon failed (${code}): ${err.slice(0, 400)}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`autocannon gave no JSON: ${out.slice(0, 200)}`));
      }
    });
  });
}

const ENDPOINTS = [
  { key: 'student.dashboard', path: '/api/v1/me/dashboard', who: 'student' },
  { key: 'teacher.dashboard', path: '/api/v1/teacher/dashboard', who: 'teacher' },
  { key: 'me.results', path: '/api/v1/me/results', who: 'student' },
  { key: 'me.results.summary', path: '/api/v1/me/results?mode=summary', who: 'student' },
  {
    key: 'me.calendar',
    path: '/api/v1/me/calendar?from=2026-01-01&to=2026-12-31',
    who: 'student',
  },
];

async function withServer(fn) {
  // Spawn node directly with the tsx loader: `npx tsx` forks a GRANDCHILD
  // that outlives a SIGTERM to the wrapper and keeps holding the port
  // (observed: EADDRINUSE on the next endpoint, whose requests then hit the
  // OLD server and its spent rate-limit bucket).
  const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  proc.__log = log;
  proc.stdout.on('data', (c) => {
    log += c;
    proc.__log = log;
  });
  proc.stderr.on('data', (c) => {
    log += c;
    proc.__log = log;
  });
  try {
    await waitForPing(proc);
    return await fn();
  } finally {
    proc.kill('SIGTERM');
    await new Promise((r) => {
      proc.on('exit', r);
      setTimeout(() => {
        proc.kill('SIGKILL');
        r();
      }, 5_000);
    });
    await waitForPortFree();
    if (process.env.LOAD_DEBUG) console.error(log.slice(-800));
  }
}

async function main() {
  if (dropIndexes) {
    for (const name of IDX) await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${name}"`);
    await prisma.$executeRawUnsafe('ANALYZE');
    console.log('(indexes dropped + ANALYZE)');
  } else {
    for (const name of IDX) {
      if (!name.includes('assignmentId_status_grade')) continue;
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${name}" ON "Submission" ("assignmentId","status","grade")`,
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "Submission_status_gradedAt_idx" ON "Submission"("status","gradedAt")',
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "AttendanceRecord_sessionId_status_idx" ON "AttendanceRecord"("sessionId","status")',
      );
    }
    await prisma.$executeRawUnsafe('ANALYZE');
  }

  const who = await users();
  console.log(
    `\n## ${label} — ${CONNECTIONS} connections, ${REQUESTS} requests per endpoint (fresh process each)\n`,
  );
  // autocannon reports p50/p75/p90/p97_5/p99 (it has no p95 column);
  // p97_5 is the nearest honest neighbour and is quoted as such.
  console.log('| endpoint | rps | p50 | p90 | p97.5 | p99 | non-2xx |');
  console.log('|---|---|---|---|---|---|---|');
  for (const ep of ENDPOINTS) {
    const token = sign(who[ep.who]);
    const result = await withServer(() => autocannon(`${BASE}${ep.path}`, token));
    const non2xx = result.non2xx ?? 0;
    console.log(
      `| ${ep.key} | ${Math.round(result.requests.average)} | ${result.latency.p50} ms | ${result.latency.p90} ms | ${result.latency.p97_5} ms | ${result.latency.p99} ms | ${non2xx} |`,
    );
    if (non2xx > 0) console.log(`  (non-2xx on ${ep.key}; check the limiter/auth)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
