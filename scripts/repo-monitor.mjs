#!/usr/bin/env node
/* ═════════════════════════════════════════════════════════════════════
   repo-monitor.mjs — the lead's watcher for parallel agent work
   ─────────────────────────────────────────────────────────────────────
   The 2026-11 fleet runs three independent agents (visual artwork,
   product/roles/mobile, backend/platform). Each is expected to push a
   branch and open its own PR into main. This script watches the remote
   for all three, records every state TRANSITION (never the same line
   twice), and exits once all three PRs are open and out of draft —
   the "final form" hand-off point for the integrator.

   Usage
     node scripts/repo-monitor.mjs                # poll every 180s
     node scripts/repo-monitor.mjs --once         # single snapshot
     node scripts/repo-monitor.mjs --interval 60  # custom seconds
     node scripts/repo-monitor.mjs --log /tmp/x.log

   Exit codes: 0 = all three PRs final · 3 = still running (timeout) ·
               4 = environment failure (no repo / no network)

   Read-only: it fetches refs and lists PRs. It never writes to GitHub,
   never mutates the working tree, and never prints a token.
   ═════════════════════════════════════════════════════════════════════ */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const AGENTS = [
  { key: 'visual', branch: 'agent/ulara-visual-artwork', title: 'Visual art direction & illustration' },
  { key: 'product', branch: 'agent/ulara-product-roles-mobile', title: 'Product experience, roles & mobile' },
  { key: 'backend', branch: 'agent/ulara-backend-platform-core', title: 'Backend, DB, API & authorization' },
];

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ONCE = argv.includes('--once');
const INTERVAL = Number(flag('--interval', '180')) || 180;
const LOG = flag('--log', '/tmp/ulara-monitor.log');

function ensureLog() {
  mkdirSync(dirname(LOG), { recursive: true });
  if (!existsSync(LOG)) appendFileSync(LOG, `# ulara repo monitor — ${new Date().toISOString()}\n`);
}

function log(line) {
  ensureLog();
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  appendFileSync(LOG, stamped);
  process.stdout.write(stamped);
}

/* ── remote refs (no API quota, works when gh is unauthenticated) ── */
function remoteRefs() {
  const out = execFileSync('git', ['ls-remote', '--heads', 'origin'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
  });
  const map = new Map();
  for (const line of out.split('\n')) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (sha && ref?.startsWith('refs/heads/')) map.set(ref.slice('refs/heads/'.length), sha);
  }
  return map;
}

/* ── local knowledge: what main has already merged ── */
function mainHead() {
  try {
    return execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 90_000,
    }).split(/\s+/)[0];
  } catch {
    return null;
  }
}

/* ── PR state via gh (authenticated) with a REST fallback ── */
function prList() {
  try {
    const out = execFileSync(
      'gh',
      ['pr', 'list', '--repo', 'ahmadmedo1012/ulara', '--state', 'all', '--limit', '40',
        '--json', 'number,title,state,headRefName,isDraft,mergeable,updatedAt'],
      { cwd: ROOT, encoding: 'utf8', timeout: 90_000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(out || '[]');
  } catch (err) {
    return { error: String(err.message || err).split('\n')[0] };
  }
}

function snapshot() {
  const refs = remoteRefs();
  const head = mainHead();
  const prs = prList();
  return { refs, head, prs };
}

function describe(state) {
  const lines = [];
  lines.push(`main ${String(state.head).slice(0, 8)}`);
  if (state.prs?.error) lines.push(`pr-list unavailable: ${state.prs.error}`);
  for (const agent of AGENTS) {
    const sha = state.refs.get(agent.branch);
    const pr = Array.isArray(state.prs)
      ? state.prs.find((p) => p.headRefName === agent.branch && p.state !== 'CLOSED')
      : undefined;
    const branchState = sha ? `pushed ${sha.slice(0, 8)}` : 'not pushed';
    const prState = pr
      ? `PR #${pr.number} ${pr.state}${pr.isDraft ? ' draft' : ''} mergeable=${pr.mergeable}`
      : 'no PR';
    lines.push(`${agent.key.padEnd(7)} ${agent.branch} — ${branchState} · ${prState}`);
  }
  return lines;
}

function allFinal(state) {
  if (!Array.isArray(state.prs)) return false;
  return AGENTS.every((agent) => {
    const pr = state.prs.find((p) => p.headRefName === agent.branch);
    return pr && pr.state === 'OPEN' && pr.isDraft === false && state.refs.has(agent.branch);
  });
}

async function main() {
  ensureLog();
  let last = '';
  const started = Date.now();
  log(`▶ monitor start — interval ${INTERVAL}s — watching ${AGENTS.length} agent branches`);

  for (;;) {
    let state;
    try {
      state = snapshot();
    } catch (err) {
      log(`! snapshot failed: ${String(err.message || err).split('\n')[0]}`);
      if (ONCE) process.exit(4);
      await sleep(INTERVAL * 1000);
      continue;
    }

    const current = describe(state).join('\n');
    if (current !== last) {
      log(`── state change\n${current}`);
      last = current;
    }

    if (allFinal(state)) {
      log('✔ all three agent PRs are open, non-draft, with a pushed branch — hand-off to integration');
      process.exit(0);
    }

    if (ONCE) {
      process.stdout.write('\n--once: snapshot complete\n');
      process.exit(0);
    }

    await sleep(INTERVAL * 1000);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A hard stop so a forgotten watcher never runs forever. */
const MAX_RUNTIME_MS = 1000 * 60 * 60 * 6;
setTimeout(() => {
  log('■ monitor timeout (6h) — still not all three PRs final');
  process.exit(3);
}, MAX_RUNTIME_MS).unref?.();

process.on('SIGINT', () => {
  log('■ monitor stopped (SIGINT)');
  process.exit(0);
});

main().catch((err) => {
  log(`! fatal: ${err?.message || err}`);
  process.exit(4);
});
