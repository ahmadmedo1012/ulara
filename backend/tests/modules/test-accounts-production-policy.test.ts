/**
 * r352 FINAL CLOSURE (§5) — the production test-account policy belt.
 *
 * The public test-account model (owner@test.ly / the published demo
 * password) must never hold platform-wide OWNER authority in a
 * PRODUCTION runtime, and no boot, cron, seed, or operator pass may
 * create/heal/re-activate it there. The policy lives INSIDE
 * modules/auth/test-accounts.ts so every entry point funnels through
 * the same decision.
 *
 * DB-free (the R320 §C precedent — a delegate-mock PrismaClient):
 *   1. the policy matrix (pure env decision — Vercel
 *      production/preview/development/missing-VERCEL_ENV, classic
 *      NODE_ENV=production, local dev, the demo opt-in);
 *   2. a PRODUCTION runtime performs ZERO writes (no skeleton, no
 *     upserts — returns 0);
 *   3. the demo opt-in keeps ONLY the designated-demo-institution
 *     accounts — the OWNER fixture is categorically refused (11
 *     upserts, never owner@test.ly).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'test-hash'),
}));

import {
  ensureTestAccounts,
  isProductionRuntime,
  testAccountsRuntimePolicy,
} from '../../src/modules/auth/test-accounts';

/** Snapshot/restore the env-shaping variables around each probe. */
const KEYS = ['NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO'] as const;
let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = {};
  for (const k of KEYS) snapshot[k] = process.env[k];
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO;
});
afterEach(() => {
  for (const k of KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe('r352 §5 — the production policy decision', () => {
  it('local development (no VERCEL, NODE_ENV unset/development): full fixtures allowed', () => {
    process.env.NODE_ENV = 'development';
    const policy = testAccountsRuntimePolicy();
    expect(policy.production).toBe(false);
    expect(policy.ownerAllowed).toBe(true);
    expect(policy.demoAllowed).toBe(true);
  });

  it('the disposable CI/test runtime (NODE_ENV=test): full fixtures allowed', () => {
    process.env.NODE_ENV = 'test';
    expect(isProductionRuntime()).toBe(false);
    const policy = testAccountsRuntimePolicy();
    expect(policy.ownerAllowed).toBe(true);
    expect(policy.demoAllowed).toBe(true);
  });

  it('classic production (NODE_ENV=production, no VERCEL): OWNER refused, demo refused by default', () => {
    process.env.NODE_ENV = 'production';
    expect(isProductionRuntime()).toBe(true);
    const policy = testAccountsRuntimePolicy();
    expect(policy.production).toBe(true);
    expect(policy.ownerAllowed).toBe(false);
    expect(policy.demoAllowed).toBe(false);
    // The reason names the explicit opt-in (secret-free).
    expect(policy.reason).toContain('ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO');
  });

  it('classic production + the demo opt-in: demo accounts allowed, OWNER STILL refused', () => {
    process.env.NODE_ENV = 'production';
    process.env.ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO = '1';
    const policy = testAccountsRuntimePolicy();
    expect(policy.production).toBe(true);
    expect(policy.ownerAllowed).toBe(false); // no flag overrides the OWNER refusal
    expect(policy.demoAllowed).toBe(true);
  });

  it('Vercel production (VERCEL=1 + VERCEL_ENV=production): refused', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    expect(isProductionRuntime()).toBe(true);
    expect(testAccountsRuntimePolicy().demoAllowed).toBe(false);
  });

  it('Vercel PREVIEW (protected test environment): full fixtures allowed', () => {
    process.env.NODE_ENV = 'production'; // Vercel sets this on previews too
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'preview';
    expect(isProductionRuntime()).toBe(false);
    const policy = testAccountsRuntimePolicy();
    expect(policy.ownerAllowed).toBe(true);
    expect(policy.demoAllowed).toBe(true);
  });

  it('Vercel DEVELOPMENT: full fixtures allowed', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'development';
    expect(isProductionRuntime()).toBe(false);
    expect(testAccountsRuntimePolicy().ownerAllowed).toBe(true);
  });

  it('VERCEL set but VERCEL_ENV MISSING fails CLOSED as production', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
    delete process.env.VERCEL_ENV;
    expect(isProductionRuntime()).toBe(true);
    expect(testAccountsRuntimePolicy().demoAllowed).toBe(false);
  });
});

describe('r352 §5 — ensureTestAccounts enforces the policy (zero writes)', () => {
  /** The delegate-mock client (the R320 §C harness shape); every model
   * method is a vi.fn() so ANY write attempt is visible to the belt. */
  function makePrisma(): PrismaClient & {
    _spies: { userUpsert: ReturnType<typeof vi.fn>; institutionUpsert: ReturnType<typeof vi.fn> };
  } {
    const userUpsert = vi.fn(async (args: { where: { email: string } }) => ({
      id: `u-${args.where.email}`,
      email: args.where.email,
    }));
    const institutionUpsert = vi.fn(async (args: { where: { slug: string } }) => ({
      id: `inst-${args.where.slug}`,
    }));
    const prisma = {
      institution: { upsert: institutionUpsert },
      faculty: {
        upsert: vi.fn(async (args: { where: { institutionId_name_city: object } }) => ({
          id: `fac-${JSON.stringify(args.where).length}`,
        })),
      },
      department: {
        upsert: vi.fn(async (args: { where: object }) => ({ id: `dep-${JSON.stringify(args.where).length}` })),
      },
      user: {
        upsert: userUpsert,
        findUniqueOrThrow: vi.fn(async (args: { where: { email: string } }) => ({
          id: `u-${args.where.email}`,
        })),
      },
      membership: {
        upsert: vi.fn(async (args: { where: { userId_institutionId: { userId: string; institutionId: string } } }) => ({
          id: `mem-${args.where.userId_institutionId.userId}`,
        })),
      },
      studentProfile: {
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'sp-1' })),
      },
      teacherProfile: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'tp-1' })),
        update: vi.fn(async () => ({ id: 'tp-1' })),
      },
      courseOffering: { findMany: vi.fn(async () => []) },
      enrollment: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    } as unknown as PrismaClient;
    return Object.assign(prisma, { _spies: { userUpsert, institutionUpsert } });
  }

  it('a PRODUCTION runtime performs ZERO writes — no skeleton, no upserts, returns 0', async () => {
    process.env.NODE_ENV = 'production';
    const prisma = makePrisma();
    const ensured = await ensureTestAccounts(prisma);
    expect(ensured).toBe(0);
    expect(prisma._spies.userUpsert).not.toHaveBeenCalled();
    expect(prisma._spies.institutionUpsert).not.toHaveBeenCalled();
  });

  it('Vercel production performs ZERO writes even with NODE_ENV unset', async () => {
    process.env.NODE_ENV = 'development';
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    const prisma = makePrisma();
    expect(await ensureTestAccounts(prisma)).toBe(0);
    expect(prisma._spies.userUpsert).not.toHaveBeenCalled();
  });

  it('the demo opt-in keeps ONLY the designated-demo accounts — the OWNER fixture is categorically refused', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO = '1';
    const prisma = makePrisma();
    const ensured = await ensureTestAccounts(prisma);
    // 12 documented jobs minus the OWNER fixture.
    expect(ensured).toBe(11);
    const calls = prisma._spies.userUpsert.mock.calls as unknown as Array<
      [{ where: { email: string } }]
    >;
    const emails = calls.map(([args]) => args.where.email);
    expect(emails).not.toContain('owner@test.ly');
    expect(emails).toContain('student@test.ly');
    expect(emails).toContain('admin2@test.ly');
    expect(emails).toContain('quality@test.ly');
  });

  it('a non-production runtime still ensures the FULL table (the fixtures stay available)', async () => {
    process.env.NODE_ENV = 'development';
    const prisma = makePrisma();
    const ensured = await ensureTestAccounts(prisma);
    expect(ensured).toBe(12);
    const emails = (prisma._spies.userUpsert.mock.calls as unknown as Array<[{ where: { email: string } }]>)
      .map(([args]) => args.where.email);
    expect(emails).toContain('owner@test.ly');
  });
});
