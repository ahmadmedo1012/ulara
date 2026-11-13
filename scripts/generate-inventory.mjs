#!/usr/bin/env node
/**
 * generate-inventory.mjs — the authoritative route + feature inventory
 * (directive Ω+2 §2.3).
 *
 * Produces docs/INVENTORY.md from SOURCE, never from memory:
 *   · web routes      — frontend/src/App.tsx <Route path="…"> (page +
 *                       redirect routes, element names)
 *   · mobile routes   — apps/mobile/app/** file routes (expo-router)
 *   · backend mounts  — backend/src/app.ts app.use(...) mount table +
 *                       per-file route counts (same regex family as
 *                       apps/mobile/scripts/contract-check.mjs)
 *   · data models     — prisma/schema.prisma model blocks
 *   · curated tables  — public claims / simulated capabilities point at
 *                       apps/mobile/docs/feature-parity.md (the
 *                       maintained parity matrix) instead of duplicating
 *
 * Dependency-free (node:fs only). Run from the repo root:
 *   node scripts/generate-inventory.mjs
 * CI keeps this fresh: docs/INVENTORY.md carries the generator's own
 * fingerprint — regenerate and diff.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const stamp = new Date().toISOString().slice(0, 10);

/* ── 1. Web routes (frontend/src/App.tsx + lib/routes.ts) ───────── */

function webRoutes() {
  const src = read('frontend/src/App.tsx');
  // Resolve the ROUTES map (the single source of truth for shared paths).
  const routesSrc = read('frontend/src/lib/routes.ts');
  const ROUTES = {};
  let rm;
  const routesRe = /(?:^|\n)\s{2}(\w+):\s+'([^']+)'/g;
  while ((rm = routesRe.exec(routesSrc))) ROUTES[rm[1]] = rm[2];

  const resolve = (p) => {
    const mm = p.match(/^\{?ROUTES\.(\w+)\}?$/);
    if (mm) return ROUTES[mm[1]] ?? p;
    return p.replace(/^"|"$/g, '');
  };

  const routes = [];
  const redirects = [];
  // Multi-line tolerant: <Route path=X element={<Y />} /> and Navigate twins.
  const re = /<Route\s+path=(?:\{(ROUTES\.\w+)\}|"([^"]+)")\s*element=\{<\s*(\w+)/g;
  let m;
  while ((m = re.exec(src))) {
    const path = resolve(m[1] ? `{${m[1]}}` : `"${m[2]}"`);
    if (m[3] === 'Navigate') continue; // redirects counted separately below
    routes.push({ path, element: m[3] });
  }
  const reNav = /<Route\s+path=(?:\{(ROUTES\.\w+)\}|"([^"]+)")\s*element=\{<Navigate/g;
  while ((m = reNav.exec(src))) {
    redirects.push(resolve(m[1] ? `{${m[1]}}` : `"${m[2]}"`));
  }
  return { routes, redirects, total: routes.length + redirects.length, constants: Object.keys(ROUTES).length };
}

/* ── 2. Mobile routes (apps/mobile/app/**) ────────────────────────── */

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !/_layout\./.test(name)) out.push(p);
  }
  return out;
}

function mobileRoutes() {
  const base = join(REPO, 'apps/mobile/app');
  if (!existsSync(base)) return [];
  return walk(base)
    .map((p) => relative(base, p).replace(/\\/g, '/'))
    .map((p) =>
      p
        .replace(/index\.tsx?$/, '')
        .replace(/\.tsx?$/, '')
        .replace(/\((tabs|student|teacher|admin|quality|owner)\//g, '($1)/')
    )
    .map((p) => (p === '' ? '/' : `/${p.replace(/\[([^\]]+)\]/g, ':$1')}`))
    .sort();
}

/* ── 3. Backend mounts + per-file route counts ────────────────────── */

function backendGroups() {
  const appSrc = read('backend/src/app.ts');
  const mounts = [];
  const re = /app\.use\(\s*'([^']+)',\s*(\w+)\s*\)/g;
  let m;
  while ((m = re.exec(appSrc))) mounts.push({ prefix: m[1], router: m[2] });
  // Count route registrations per router file (contract-check family).
  const routesDir = join(REPO, 'backend/src/http/routes');
  const fileOf = {};
  for (const f of readdirSync(routesDir)) {
    if (!f.endsWith('.routes.ts')) continue;
    const src = readFileSync(join(routesDir, f), 'utf8');
    const count = (src.match(/\b\w*[Rr]outer\.(get|post|patch|put|delete|all)\s*\(/g) || []).length;
    fileOf[f.replace('.routes.ts', '')] = count;
  }
  const modulesDir = join(REPO, 'backend/src/modules');
  let moduleCount = 0;
  for (const f of readdirSync(modulesDir)) {
    if (statSync(join(modulesDir, f)).isFile() && f.endsWith('.ts') && !f.includes('.test.')) moduleCount++;
  }
  // Total registered: count every registration in every routes file.
  let total = 0;
  for (const c of Object.values(fileOf)) total += c;
  return { mounts, fileCounts: fileOf, totalRegistrations: total, moduleFiles: moduleCount };
}

/* ── 4. Prisma models ─────────────────────────────────────────────── */

function prismaModels() {
  const schema = read('backend/prisma/schema.prisma');
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
  const enums = [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]);
  return { models, enums };
}

/* ── 5. Compose ───────────────────────────────────────────────────── */

const web = webRoutes();
const mob = mobileRoutes();
const be = backendGroups();
const prisma = prismaModels();

const byFirstSegment = (routes) => {
  const groups = {};
  for (const r of routes) {
    const seg = (r.path.split('/')[1] || '(root)') || '(root)';
    (groups[seg] ||= []).push(r);
  }
  return groups;
};
const webGroups = byFirstSegment(web.routes);

let md = `# INVENTORY — the authoritative route + feature map

> GENERATED by \`scripts/generate-inventory.mjs\` on ${stamp} — never edit by
> hand; regenerate and diff. Sources: \`frontend/src/App.tsx\` (web routes),
> \`apps/mobile/app/**\` (expo-router), \`backend/src/app.ts\` mount table +
> \`backend/src/http/routes/*\` registrations, \`backend/prisma/schema.prisma\`.
> Feature-status truth (implemented / simulated / blocked): the maintained
> matrix in \`apps/mobile/docs/feature-parity.md\` + the disclosures in
> \`docs/RELEASE.md\`.

## Totals

| Surface | Count |
|---|---|
| Web routes (pages) | ${web.routes.length} |
| Web redirects | ${web.redirects.length} |
| Web ROUTES constants resolved | ${web.constants} |
| Mobile routes (expo-router) | ${mob.length} |
| Backend mount points | ${be.mounts.length} |
| Backend route registrations | ${be.totalRegistrations} |
| Prisma models | ${prisma.models.length} |
| Prisma enums | ${prisma.enums.length} |

## Web routes by area (${web.routes.length} pages)

`;

for (const [seg, routes] of Object.entries(webGroups).sort()) {
  md += `### /${seg === '(root)' ? '' : seg}\n\n`;
  md += '| Route | Page component |\n|---|---|\n';
  for (const r of routes.sort((a, b) => a.path.localeCompare(b.path))) {
    md += `| \`${r.path}\` | ${r.element} |\n`;
  }
  md += '\n';
}

md += `## Mobile routes (${mob.length})

\`\`\`
${mob.join('\n')}
\`\`\`

## Backend mount table (${be.mounts.length} mounts → ${be.totalRegistrations} registrations)

| Mount | Router |
|---|---|
`;
for (const r of be.mounts.sort((a, b) => a.prefix.localeCompare(b.prefix))) {
  md += `| \`${r.prefix}\` | ${r.router} |\n`;
}

md += `
### Route registrations per file

| File | Registrations |
|---|---|
`;
const files = Object.entries(be.fileCounts).sort((a, b) => b[1] - a[1]);
for (const [f, c] of files) md += `| \`${f}.routes.ts\` | ${c} |\n`;

md += `
## Prisma models (${prisma.models.length})

${prisma.models.map((m) => `\`${m}\``).join(' · ')}

### Enums (${prisma.enums.length})

${prisma.enums.map((m) => `\`${m}\``).join(' · ')}

## The five platform roles

| Role | Web home | Mobile home | Backend guards |
|---|---|---|---|
| STUDENT | \`/student\` | \`(tabs)/dashboard\` (student stack) | \`requireRole(Role.STUDENT)\` |
| TEACHER | \`/teacher\` | \`(tabs)/dashboard\` (teacher stack) | \`requireRole(Role.TEACHER, …)\` |
| ADMIN (المسجل العام) | \`/admin\` | \`(tabs)/dashboard\` (admin stack) | institution-scoped admin guards |
| QUALITY | \`/quality\` | \`(tabs)/dashboard\` (quality stack) | \`requireRole(Role.QUALITY)\` |
| OWNER | \`/owner\` | \`(tabs)/dashboard\` (owner stack) | \`requireRole(Role.OWNER)\` |

## Simulated / limited capabilities (honesty ledger)

Maintained where the truth lives — do not duplicate here:

- **Mobile parity + per-feature status**: \`apps/mobile/docs/feature-parity.md\`
  (⚠️ = simulated-with-disclosure, 🔗 = external blocker, 🧩 = device-verification pending)
- **Simulated surfaces**: plagiarism/AI scan (deterministic percentages,
  «محاكاة» labels), curriculum suggestions (template simulation), virtual-lab
  experiment runner (client-side script), AI assistant in \`local\` mode
  (template composer — provider badge always honest)
- **Storage transfer limits**: \`docs/RELEASE.md\` §Storage & file transfer
  (4 MiB Vercel / 20 MiB self-hosted; video needs S3 driver)
- **OTA / distribution truth**: \`docs/RELEASE.md\` §OTA re-activation
`;

const out = join(REPO, 'docs/INVENTORY.md');
writeFileSync(out, md);
console.log(`INVENTORY.md written: ${web.routes.length} web pages, ${mob.length} mobile routes, ${be.totalRegistrations} backend registrations, ${prisma.models.length} models`);
