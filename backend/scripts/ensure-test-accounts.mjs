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
 * Guards: NODE_ENV=production without --yes is refused; DATABASE_URL
 * only ever printed redacted (db-ops-lib redactUrl).
 */
import { PrismaClient } from '@prisma/client';
import { ensureTestAccounts } from '../dist/modules/auth/test-accounts.js';
import { redactUrl, requireYesInProduction } from '../../scripts/db-ops-lib.mjs';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
requireYesInProduction(yes);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (the operator secret IS the authorization).');
  process.exit(1);
}
console.log(`ensure-test-accounts → ${redactUrl(process.env.DATABASE_URL)}${yes ? ' [execute]' : ' [dry-run: nothing without --yes]'}`);
if (!yes) {
  console.log('Dry-run: re-run with --yes to upsert the 12 @test.ly accounts (password → TEST_PASSWORD).');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const jobs = await ensureTestAccounts(prisma);
  console.log(`OK — ensured ${jobs} test accounts (password reset, active, unlocked).`);
} catch (err) {
  console.error('FAILED:', err?.message ?? err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
