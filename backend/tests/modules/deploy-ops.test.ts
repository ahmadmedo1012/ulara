/**
 * Backend unit test — deployment reliability pins (r164-l).
 *
 * DB-free source-scan pins (the ai-provider technique — the file is the
 * contract). These are the deployment's OWN invariants, so a future edit
 * that unpins or drifts them fails HERE instead of failing silently in
 * production:
 *
 *  1. The repo's engines range (>=20 <25) is the deployment runtime
 *     contract (the serverless platform reads package.json engines) —
 *     and CI's env.NODE_VERSION sits INSIDE it exactly (a CI major that
 *     drifts outside the range recreates the "works in CI, breaks in
 *     production" gap the pin exists to close).
 *  2. The documented deployment invariants stay put on the current
 *     platform manifest (vercel.json): installCommand npm ci, the
 *     health surface /api/v1/health, and the server-UTC instants
 *     contract declared by backend/src/lib/dates.ts (the serverless
 *     runtime clock is UTC).
 *  3. The root package.json wires the post-deploy smoke script
 *     (`npm run smoke` → scripts/smoke-deploy.mjs).
 *  5. The smoke script stays dependency-free — every import must be a
 *     node: builtin (it runs in ops contexts where node_modules may be
 *     absent, like a bare checkout on a laptop).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercelSource = readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8');
const datesSource = readFileSync(new URL('../../src/lib/dates.ts', import.meta.url), 'utf8');
const ciSource = readFileSync(
  new URL('../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const rootPackage = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { engines?: { node?: string }; scripts?: Record<string, string> };
const smokeSource = readFileSync(
  new URL('../../../scripts/smoke-deploy.mjs', import.meta.url),
  'utf8',
);

// ─── Node runtime pin (engines ↔ CI) ─────────────────────────────

describe('node runtime pin — engines range vs CI (r164-l, re-anchored to the serverless platform)', () => {
  it("the repo declares an engines.node range (the platform's runtime contract)", () => {
    const engines = rootPackage.engines?.node ?? '';
    expect(engines.length).toBeGreaterThan(0);
  });

  it("CI's env.NODE_VERSION sits inside the engines range — no CI/production drift", () => {
    const ciPin = ciSource.match(/NODE_VERSION:\s*'(\d+)'/);
    expect(ciPin).not.toBeNull();
    const major = Number(ciPin?.[1]);
    const engines = rootPackage.engines?.node ?? '';
    // The range is documented as '>=20 <25' — parse the two bounds rather
    // than trust a literal, so an engines bump must consciously revisit
    // this pin together.
    const min = Number(engines.match(/>=\s*(\d+)/)?.[1] ?? NaN);
    const max = Number(engines.match(/<\s*(\d+)/)?.[1] ?? NaN);
    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(major).toBeGreaterThanOrEqual(min);
    expect(major).toBeLessThan(max);
  });
});

// ─── Documented deployment invariants (regression pins) ───────────

describe('vercel.json deployment invariants (the platform manifest)', () => {
  it('install command stays npm ci (devDependencies present for the build)', () => {
    expect(vercelSource).toContain('"installCommand": "npm ci"');
  });

  it('the /api rewrite keeps the Express surface under one function', () => {
    expect(vercelSource).toContain('"/api/(.*)"');
  });

  it('the post-deploy smoke still targets /api/v1/health (app.ts mounts it there)', () => {
    expect(smokeSource).toContain('/api/v1/health');
  });

  it('runtime clock stays UTC (attendance day-key model — dates.ts declares the contract)', () => {
    expect(datesSource).toContain('runtime clock is UTC');
  });
});

// ─── Post-deploy smoke script ─────────────────────────────────────

describe('smoke script wiring (r164-l)', () => {
  it("root package.json wires `npm run smoke` to scripts/smoke-deploy.mjs", () => {
    expect(rootPackage.scripts?.smoke).toBe('node scripts/smoke-deploy.mjs');
  });

  it('is dependency-free — every import is a node: builtin', () => {
    // The script must run on a bare node (ops laptop, cron box) where no
    // node_modules exist. It intentionally uses only globals (fetch,
    // AbortController, URL, process, console) — so zero imports is the
    // expected state; any import that DOES appear must be a node: builtin.
    const imports = [
      ...smokeSource.matchAll(/^\s*import\s+.*?from\s+'([^']+)'/gm),
    ]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    for (const specifier of imports) {
      expect(specifier.startsWith('node:')).toBe(true);
    }
    // Same rule for require() — no sneaking a dependency in that way.
    const requires = [...smokeSource.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    for (const specifier of requires) {
      expect(specifier.startsWith('node:')).toBe(true);
    }
  });

  it('defaults to the production origin and never embeds credentials', () => {
    expect(smokeSource).toContain('https://ulara.vercel.app');
    // Credentials arrive via SMOKE_* env vars only — no literals.
    expect(smokeSource).not.toMatch(/SMOKE_PASSWORD\s*=\s*['"][^'"]+['"]/);
    expect(smokeSource).not.toMatch(/Bearer\s+['"][A-Za-z0-9._-]{8,}['"]/);
  });
});
