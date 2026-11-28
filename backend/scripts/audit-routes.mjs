#!/usr/bin/env node
/**
 * scripts/audit-routes.mjs — r370 round 3, the route-permission inventory.
 *
 * Every Express handler in `src/http/routes/*.ts` is parsed and classified by
 * the authorization ACTUALLY in front of it, in three layers:
 *
 *   1. transport  — `authMiddleware` (router-level `router.use(…)` or inline)
 *                   or a service-token guard (`cronAuthMiddleware`, …);
 *   2. declared   — `requireRole(…)` / `requireCapability(…)` as middleware
 *                   (inline, or via a `const x = requireCapability(…)` alias);
 *   3. handler    — `assertCapability*` / `assertCan*` inside the handler, or a
 *                   caller-scoped query (`req.user`, `userId` from the token).
 *
 * The point is a NUMBER, not an opinion, and the honest denominator: a route
 * is "unguarded" only when none of the three layers applies. Dependency-free
 * (the route DSL is regular enough), so it runs in CI as a report.
 *
 * Usage: node scripts/audit-routes.mjs [--json] [--flag-unguarded]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(HERE, '..', 'src', 'http', 'routes');
const MUTATING = new Set(['post', 'put', 'patch', 'delete']);
const ROUTE_RE = /router\.(get|post|put|patch|delete)\s*\(/g;
const SERVICE_TOKEN_RE = /cronAuthMiddleware|serviceAuthMiddleware|requireServiceToken|requireInternalService/;
const HANDLER_GUARD_RE = /assertCapability|assertCapabilityIn|assertCapabilityForUnit|assertCan[A-Z]|requirePermission\(|assertMember|assertOwner/;

function balancedCall(text, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return { call: text.slice(startIndex, i + 1), end: i + 1 };
    }
  }
  return { call: text.slice(startIndex), end: text.length };
}

function rolesOf(text) {
  const roles = [];
  for (const m of text.matchAll(/requireRole\s*\(([^)]*)\)/g)) {
    for (const r of m[1].matchAll(/Role\.([A-Z_]+)|'([A-Z_]+)'|"([A-Z_]+)"/g)) {
      roles.push(r[1] ?? r[2] ?? r[3]);
    }
  }
  return [...new Set(roles)];
}

const files = readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const routes = [];

for (const file of files) {
  const text = readFileSync(join(ROUTES_DIR, file), 'utf8');

  // Aliases: `const canX = requireCapability('X')` / `const adminOnly = requireRole(…)`.
  const aliasCaps = new Set();
  const aliasRoles = new Set();
  for (const m of text.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*requireCapability\s*\(/g)) aliasCaps.add(m[1]);
  for (const m of text.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*requireRole\s*\(/g)) aliasRoles.add(m[1]);

  const routerUse = [...text.matchAll(/router\.use\s*\(/g)].map((m) => balancedCall(text, m.index + m[0].length - 1).call);
  const routerUseText = routerUse.join('\n');
  const routerAuth = /authMiddleware/.test(routerUseText) || SERVICE_TOKEN_RE.test(routerUseText);
  const routerService = SERVICE_TOKEN_RE.test(routerUseText);
  const routerLimiter = /createRouteLimiter/.test(routerUseText);
  const routerRoles = rolesOf(routerUseText);

  ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = ROUTE_RE.exec(text)) !== null) {
    const method = m[1];
    const { call, end } = balancedCall(text, m.index + m[0].length - 1);
    const pathMatch = call.match(/^\s*\(\s*(['"`])(.*?)\1/);
    const path = pathMatch ? pathMatch[2] : '(dynamic)';
    const argsText = pathMatch ? call.slice(call.indexOf(pathMatch[0]) + pathMatch[0].length) : call;

    const inlineAuth = /authMiddleware/.test(argsText) || SERVICE_TOKEN_RE.test(argsText);
    const inlineRoles = rolesOf(argsText);
    const aliasRoleUsed = [...aliasRoles].filter((a) => new RegExp(`\\b${a}\\b`).test(argsText));
    const declaredCap = /requireCapability\s*\(/.test(argsText) ||
      [...aliasCaps].some((a) => new RegExp(`\\b${a}\\b`).test(argsText));

    // The handler is INSIDE the router.X(…) call (the outer paren closes after
    // the handler body), so the guard/ownership search runs over the call.
    const handlerCap = HANDLER_GUARD_RE.test(call);
    const callerScoped = /\breq\.user\b|\buserId\b|\bcurrentUser\b/.test(call);
    const nextIdx = end;

    routes.push({
      file,
      method,
      path,
      auth: routerAuth || inlineAuth,
      serviceToken: routerService || SERVICE_TOKEN_RE.test(argsText),
      roles: inlineRoles.length ? inlineRoles : routerRoles,
      roleAliasUsed: aliasRoleUsed,
      capability: declaredCap || handlerCap,
      capabilityDeclared: declaredCap,
      capabilityInHandler: handlerCap,
      callerScoped,
      limiter: routerLimiter || /createRouteLimiter\s*\(|\bLimiter\b/.test(argsText),
      mutation: MUTATING.has(method),
    });
    ROUTE_RE.lastIndex = nextIdx;
  }
}

const declaredGuarded = (r) => r.roles.length > 0 || r.roleAliasUsed.length > 0 || r.capability;
const flagged = (r) => r.mutation && r.auth && !declaredGuarded(r) && !r.capabilityInHandler && !r.callerScoped && !r.serviceToken;

const summary = {
  files: files.length,
  routes: routes.length,
  public: routes.filter((r) => !r.auth).length,
  authenticated: routes.filter((r) => r.auth).length,
  declaredGuarded: routes.filter((r) => r.auth && declaredGuarded(r)).length,
  handlerGuarded: routes.filter((r) => r.auth && !declaredGuarded(r) && r.capabilityInHandler).length,
  callerScopedOnly: routes.filter((r) => r.auth && !declaredGuarded(r) && !r.capabilityInHandler && r.callerScoped).length,
  unguarded: routes.filter(flagged).length,
  mutations: routes.filter((r) => r.mutation).length,
  mutationsWithoutRouteLimiter: routes.filter((r) => r.mutation && !r.limiter).length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, flagged: routes.filter(flagged), publicRoutes: routes.filter((r) => !r.auth) }, null, 2));
  process.exit(0);
}

const pct = (n) => `${((n / summary.routes) * 100).toFixed(1)}%`;
console.log('## route permission inventory\n');
console.log(`files: ${summary.files} · routes: ${summary.routes}`);
console.log(`  public (no auth, no service token):        ${summary.public} (${pct(summary.public)})`);
console.log(`  authenticated / service-token:             ${summary.authenticated} (${pct(summary.authenticated)})`);
console.log(`    ├─ declared role/capability middleware:  ${summary.declaredGuarded}`);
console.log(`    ├─ capability asserted in the handler:   ${summary.handlerGuarded}`);
console.log(`    └─ caller-scoped query only:             ${summary.callerScopedOnly}`);
console.log(`  mutations:                                 ${summary.mutations}`);
console.log(`  UNGUARDED mutations (all three layers off): ${summary.unguarded}`);
console.log(`  mutations without a route limiter:          ${summary.mutationsWithoutRouteLimiter}\n`);

const fmt = (r) => `  ${r.method.toUpperCase().padEnd(6)} ${r.path}  [${r.file}]`;
if (process.argv.includes('--flag-unguarded') && summary.unguarded) {
  console.log(`### unguarded mutations (${summary.unguarded})`);
  for (const r of routes.filter(flagged)) console.log(fmt(r));
  console.log('');
}
const publicRoutes = routes.filter((r) => !r.auth);
if (publicRoutes.length) {
  console.log(`### public routes (${publicRoutes.length})`);
  for (const r of publicRoutes) console.log(fmt(r));
}
