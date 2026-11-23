#!/usr/bin/env node
/**
 * ensure-test-accounts — operator-side one-shot `ensureTestAccounts()`
 * (the r166c rotate-demo-passwords / provision-owner invocation family).
 *
 * Purpose: run the REAL compiled ensure pass (dist/modules/auth/
 * test-accounts.js — the same function db:seed and the ULARA_TEST_ACCOUNTS=1
 * boot path call) against the DATABASE_URL the operator already holds.
 * Idempotent upserts keyed by the fixed @test.ly emails: resets the
 * password to TEST_PASSWORD, re-activates, clears lockout, heals names,
 * memberships, academic profiles and best-effort enrolments.
 *
 * Usage (from the backend workspace — needs `npm run build -w backend`
 * first so dist/ exists):
 *   DATABASE_URL=… node scripts/ensure-test-accounts.mjs            # dry-run info
 *   DATABASE_URL=… node scripts/ensure-test-accounts.mjs --yes      # execute
 *
 * Guards:
 *   - NODE_ENV=production without --yes is refused.
 *   - r352 FINAL CLOSURE (§5): in a PRODUCTION runtime the ensure is
 *     refused by the in-module policy — the public-password OWNER
 *     fixture is never created/healed/re-activated (no flag overrides
 *     that), and the NON-OWNER demo accounts require the explicit
 *     ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO=1 operator opt-in. The script
 *     prints the policy decision (secret-free) instead of writing.
 *   - DATABASE_URL only ever printed redacted (db-ops-lib redactUrl).
 */
import { PrismaClient } from '@prisma/client';
import { ensureTestAccounts, testAccountsRuntimePolicy } from '../dist/modules/auth/test-accounts.js';
import { redactUrl, requireYesInProduction } from '../../scripts/db-ops-lib.mjs';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
requireYesInProduction(yes);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (the operator secret IS the authorization).');
  process.exit(1);
}

// The r352 §5 production policy — the SAME decision the module itself
// enforces; printed here so the operator sees the refusal before any
// connection work happens.
const policy = testAccountsRuntimePolicy();
console.log(`ensure-test-accounts → ${redactUrl(process.env.DATABASE_URL)}${yes ? ' [execute]' : ' [dry-run: nothing without --yes]'}`);
console.log(`policy: ${JSON.stringify({ production: policy.production, ownerAllowed: policy.ownerAllowed, demoAllowed: policy.demoAllowed })} — ${policy.reason}`);

if (!policy.demoAllowed) {
  // Production, no opt-in: refuse — zero writes, exit non-zero so CI/operator
  // wrappers see the refusal (the deliberate opt-in is the only path on).
  console.error('REFUSED: production runtime without ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO=1 — the public-password OWNER fixture is never ensured in production (r352 §5).');
  process.exit(2);
}

if (!yes) {
  console.log('Dry-run: re-run with --yes to upsert the @test.ly accounts (password → TEST_PASSWORD).');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const jobs = await ensureTestAccounts(prisma);
  const ownerRefused = !policy.ownerAllowed;
  console.log(`OK — ensured ${jobs} test accounts${ownerRefused ? ' (the OWNER fixture is categorically refused in production — skipped)' : ''}.`);
} catch (err) {
  console.error('FAILED:', err?.message ?? err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
