/**
 * r370 round 3 — the route-authorization CONTRACT.
 *
 * The audit instrument (`scripts/audit-routes.mjs`) prints a number; this
 * test makes the number binding. It runs the instrument against the tree and
 * fails when the shape of the API's authorization regresses:
 *
 *   1. the PUBLIC route set is exactly the allowlist below — a new
 *      unauthenticated endpoint cannot be added without editing this list
 *      (which is the review moment);
 *   2. no MUTATION is unguarded in all three layers (no auth, no declared
 *      role/capability, no handler capability, no caller reference);
 *   3. the privileged routers (owner, institution administration, the r352
 *      institutional surface, user administration, permissions) contain no
 *      unguarded mutation at all.
 *
 * Measuring beats reading: 389 routes is more than a reviewer will hold in
 * their head, and this is the only place the whole surface is asserted.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

interface RouteRow {
  file: string;
  method: string;
  path: string;
}

interface AuditJson {
  summary: {
    routes: number;
    public: number;
    authenticated: number;
    declaredGuarded: number;
    callerScopedOnly: number;
    unguarded: number;
    mutations: number;
    mutationsWithoutRouteLimiter: number;
  };
  flagged: RouteRow[];
  publicRoutes: RouteRow[];
}

function runAudit(): AuditJson {
  const out = execFileSync(process.execPath, ['scripts/audit-routes.mjs', '--json'], {
    cwd: BACKEND_ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(out) as AuditJson;
}

/**
 * Every endpoint reachable without a bearer token, spelled file:method:path.
 * Adding one is a security decision, so it has to be made HERE — that is the
 * whole point of the pin. (Auth flows are public by nature; the two others
 * carry their own hermetic guards: `webhooks` verifies a signature,
 * `client-errors` is a 10/hour IP-limited telemetry sink.)
 */
const PUBLIC_ROUTE_ALLOWLIST = new Set([
  'auth.routes.ts:POST:/register',
  'auth.routes.ts:POST:/login',
  'auth.routes.ts:POST:/refresh',
  'auth.routes.ts:POST:/logout',
  'auth.routes.ts:POST:/forgot-password',
  'auth.routes.ts:POST:/reset-password',
  'auth.routes.ts:POST:/verify-email',
  'client-error.routes.ts:POST:/client-errors',
  'colleges.routes.ts:GET:/colleges',
  'colleges.routes.ts:GET:/colleges/leaderboard',
  'colleges.routes.ts:GET:/colleges/:id',
  'invite.routes.ts:GET:/invites/:code/validate',
  'status.routes.ts:GET:/ping',
  'status.routes.ts:GET:/status',
  'webhooks.routes.ts:POST:/resend',
]);

/** Routers whose every mutation must carry a declared guard. */
const PRIVILEGED_ROUTERS = [
  'owner.routes.ts',
  'institution.routes.ts',
  'users.routes.ts',
  'permissions.routes.ts',
  'r352-institution.routes.ts',
  'r352-org-units.routes.ts',
  'r352-people.routes.ts',
  'r352-councils.routes.ts',
  'r352-academic.routes.ts',
  'r352-compliance.routes.ts',
  'r352-operations.routes.ts',
  'r352-audit.routes.ts',
  'r352-appointments.routes.ts',
  'r352-unit-capabilities.routes.ts',
  'admin-extras.routes.ts',
];

const key = (r: RouteRow) => `${r.file}:${r.method.toUpperCase()}:${r.path}`;

describe('route authorization contract (r370 C)', () => {
  const audit = runAudit();

  it('the public surface is exactly the pinned allowlist', () => {
    const actual = audit.publicRoutes.map(key).sort();
    const unexpected = actual.filter((k) => !PUBLIC_ROUTE_ALLOWLIST.has(k));
    const missing = [...PUBLIC_ROUTE_ALLOWLIST].filter((k) => !actual.includes(k));
    expect(unexpected, 'a NEW unauthenticated route appeared — is it intentional?').toEqual([]);
    expect(missing, 'a pinned public route is gone (allowlist is stale)').toEqual([]);
    expect(audit.summary.public).toBe(PUBLIC_ROUTE_ALLOWLIST.size);
  });

  it('no mutation is unguarded in every layer (auth, declared guard, handler guard, caller scope)', () => {
    expect(audit.flagged.map(key)).toEqual([]);
  });

  it('every privileged router guards all of its mutations', () => {
    const offenders = audit.flagged.filter((r) => PRIVILEGED_ROUTERS.includes(r.file)).map(key);
    expect(offenders).toEqual([]);
  });

  it('the inventory itself stays honest (it parses the whole surface)', () => {
    // A parser that silently stops matching would make the three assertions
    // above vacuous — pin the denominator too (45 route files at r370; the
    // floor, not an equality, so adding a route file is not a red build).
    expect(audit.summary.routes).toBeGreaterThan(350);
    expect(audit.summary.authenticated).toBeGreaterThan(300);
    expect(audit.summary.mutations).toBeGreaterThan(150);
    expect(audit.summary.declaredGuarded).toBeGreaterThan(150);
  });
});
