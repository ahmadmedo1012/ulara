<div dir="ltr">

# Ulara — University Operating System

> **Brand (one line, no image):** the Ulara U-vessel on a 32-unit grid —
> ONE rounded-cap ink stroke (an open vessel:
> `M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7`) with exactly ONE solid 4×4
> sienna cornerstone at (21,3) — «the university in one system»; paper
> `#F5F1E8`, ink `#262019`, burnt-sienna accent `#C43E16`, dark mode
> swaps via tokens (luminous ember `#FF6B3D`). Guide:
> `shared/brand.json` + `scripts/brand/ulara-kit.mjs`
> · spec page: `/__brand`.

**Arabic-primary README lives here: [`README.md`](README.md).** This file
is the English mirror for international readers and tooling.

**Ulara (أُلارا)** is an **independent** University Operating System
(Arabic-first). No official adoption or endorsement by any educational
institution exists — the platform is multi-institution: every
institution that joins builds its own faculties and courses from its own
data, and the demo data currently shown belongs to the labeled neutral
demo workspace («مساحة عمل أُلارا التجريبية») — clearly-marked synthetic
data modeling no university.

## What it is

One platform serving students, teachers, admins, the quality office and
the platform owner: flipped classrooms with embedded checkpoints, a
per-concept mastery matrix, a full research-papers workflow with inline
PDF annotations, Arabic-normalized cross-document library search, a
read-only quality-oversight sector, and DB-driven administration with a
capability-based governance model and a full audit log — all Arabic-RTL,
with a bespoke two-theme design system driven by one token set
(paper/ink with the single burnt-sienna signal — no gradients, no copper/gold
in the brand).

**Stack:** Express + TypeScript + Prisma 5 backend serving `/api/v1/*`
*and* the built React 18 + Vite SPA as one platform; PostgreSQL on Neon
(Frankfurt); deployed on **Vercel** (project `ulara` — serverless functions
in `fra1`, https://ulara.vercel.app, scheduled daily jobs via the platform
cron).

## Current state (honest)

| Item | State |
|---|---|
| Core features, all five roles | **Shipped** — 1970 frontend + 1783 backend unit tests green + 116 DB integration tests + 28 e2e journeys (2026-10-19, rounds r141–r189) |
| Design system | Documented in `DESIGN.md` — parity gate 190/190 green |
| AI assistant | **Mastery-aware chat with per-response engine attribution** — runs the in-process local engine by default (zero external calls); an OpenAI-compatible/OpenRouter provider activates only when `AI_PROVIDER`/`AI_API_KEY` are set in the deployment (the current production deployment has them unset → local engine; `/api/v1/ai/config` reports the live truth). The plagiarism scan stays a deterministic simulation, openly labeled; see `docs/02-features.md` |
| English i18n | Not implemented. Real E2E (28 Playwright journeys) and PDF file uploads (durable postgres storage, r175) **are shipped** — full list in `docs/16-decisions-and-limitations.md` |

## Documentation hub

The Arabic documentation hub: [`docs/README.md`](docs/README.md)
(numbered guides 01–16 + per-sector modules). Key references (English,
generated from code): [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md)
(222 endpoints), [`docs/DATABASE-REFERENCE.md`](docs/DATABASE-REFERENCE.md)
(79 models / 31 enums), [`docs/FRONTEND-REFERENCE.md`](docs/FRONTEND-REFERENCE.md),
[`docs/PROJECT-REFERENCE.md`](docs/PROJECT-REFERENCE.md),
[`docs/SECRETS-REFERENCE.md`](docs/SECRETS-REFERENCE.md).
AI agents must read [`AGENTS.md`](AGENTS.md) first.

## Quick start

Prereqs: **Node `>=20 <25`**, **npm**, a PostgreSQL (free Neon works).
Full guide: `docs/05-setup.md`.

```bash
git clone https://github.com/ahmadmedo1012/ulara && cd ulara
cp .env.example backend/.env       # fill DATABASE_URL + both JWT secrets
npm install
npm run db:migrate                 # apply schema
npm run db:seed                    # demo data

# two terminals:
npm run dev                        # backend :4000
npm run dev:web                    # frontend :5173 (proxies /api → :4000)
```

**Test accounts** (R320 §C — one easy account per job; the single source
of truth is `shared/testAccounts.ts`; `npm run db:seed` always ensures
them). Password for all: **`12345678`** — published TEST credentials
(development environment; never for production):

| Job | Email | Group |
|---|---|---|
| Student · second student (messages/community) | `student@test.ly` · `student2@test.ly` | التعليم |
| Teacher · department head · dean · vice dean | `teacher@test.ly` · `head@test.ly` · `dean@test.ly` · `vicedean@test.ly` | التعليم |
| University registrar · faculty registrar (faculty scope) · quality | `registrar@test.ly` · `faculty@test.ly` · `quality@test.ly` | الإدارة |
| Owner | `owner@test.ly` | النظام |

Plus two corpus accounts of the second demo institution (institution
isolation): `teacher2@test.ly` · `admin2@test.ly` (same password).

Log in as `student@test.ly` then `student2@test.ly` — the two
students share reg-number `UZ-2024-00001` on purpose and each sees only
their institution's courses (a foreign offering answers 403). Seeding is
an explicit operator step from `backend/` (see `docs/12-deployment.md`),
non-destructive on an established database (r180) — the one documented
exception being these `@test.ly` accounts (R320 §C; the boot-time ensure
can be enabled with `ULARA_TEST_ACCOUNTS=1` in the Vercel project
environment).

## Verify it yourself

```bash
npm run lint                          # ESLint — 0 errors
npm run typecheck                     # tsc — src + tests, both sides (no DB)
npm test                              # 1970 FE + 1783 BE (no DB; incl. 7 live S3 tests against s3rver) — npm run test:integration adds 116 DB tests on a local disposable database (14 cross-institution r179 isolation tests + 2 seed repeat-safety r182 tests among them)
node scripts/verify-parity-export.mjs # design-parity gate 190/190
bash scripts/check-csp-hash.sh        # CSP pin drift guard (now in CI)
# (validate:colleges retired with the fixed college catalogue in Phase Ω)
```

## Deploy on Vercel + Neon

The production stack: **Vercel** (project `ulara` — serverless functions
in `fra1`, https://ulara.vercel.app; the static SPA served from
`frontend/dist`, `/api/v1/*` through one Express serverless function, a
daily platform cron on `GET /api/v1/jobs/daily`) + **Neon PostgreSQL**
(project `ulara-production`, Frankfurt `aws-eu-central-1`, PG 16).
Deploy from the repo root:

```bash
npm ci
npx vercel deploy --prod --regions fra1
```

1. **Neon**: the pooled `-pooler` URL is `DATABASE_URL` for the serverless
   runtime; migrations + seed run from `backend/` against the direct URL
   (`DATABASE_URL=<direct> node scripts/migrate-deploy.mjs`).
2. **Vercel project env**: `DATABASE_URL` (pooled), both JWT secrets, and
   `INTERNAL_SERVICE_TOKEN` with `CRON_SECRET` set to the same value.
3. **After the first seed**: harden with `provision-owner.mjs` +
   `rotate-demo-passwords.mjs`, then verify the live deployment with
   `BASE_URL=https://ulara.vercel.app npm run smoke`.

Deploys ride the Vercel CLI today — GitHub auto-deploy needs the GitHub
login connection added to the Vercel account (the known manual step).
Details: `docs/12-deployment.md`.

## Environment variables (required only)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled string (`…-pooler.REGION.aws.neon.tech/…?sslmode=require&pgbouncer=true&connection_limit=1`) |
| `JWT_ACCESS_SECRET` | 64 bytes random hex — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a *different* 64-byte random hex |

Optional vars (`CORS_ORIGINS` — *replaces* the default list when set,
`INTERNAL_SERVICE_TOKEN`, `DIRECT_DATABASE_URL`, `PORT`): full table and
exact behavior in `docs/06-configuration.md`.

## License

Proprietary — see [`LICENSE`](LICENSE). Security reports: private
channels only, per [`SECURITY.md`](SECURITY.md).

</div>
