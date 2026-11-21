# Architecture — ULARA (أُلارا)

> Describes the code as it exists at the audited baseline. Counts are measured
> from the tree, not remembered: `ls`, `grep`, and `find` commands are quoted
> next to each number so the document can be re-verified cheaply.

## 1. Deployment topology

One deployable unit, two processes in development:

```
browser ──► Vercel (fra1, ulara.vercel.app)
             ├── /api/*  ──► Express app (backend/src/app.ts)  ──► Neon PostgreSQL
             └── /*      ──► frontend/dist (Vite build, Arabic RTL SPA)
```

- Production runs the Express app as a serverless function (`api/` entry) and
  serves `frontend/dist` as static assets from the same origin. Same-origin
  serving is what makes the `'self'`-only CSP viable (§4).
- Local development is split: `npm run dev` (backend `:4000`, tsx watch) and
  `npm run dev:web` (Vite `:5173`, `/api` proxied to `:4000`).
- The mobile client (`apps/mobile`, Expo) is a separate consumer of the same
  HTTP API; it has its own lockfile and its own build lanes.

## 2. Repository layout and ownership

| Path | Responsibility | Verified size |
|---|---|---|
| `backend/src/http/routes/*.routes.ts` | HTTP surface: one router file per domain | 32 files |
| `backend/src/modules/*` | Domain services (auth, ai, institution, invites, live, milestones, notifications, onboarding, search, theme, users) | 11 directories |
| `backend/src/lib/` | Cross-cutting primitives: permissions, governance, storage drivers, errors, logging, PDF limits | — |
| `backend/prisma/schema.prisma` | Data model | 87 models, 3 migrations |
| `frontend/src/App.tsx` | Router shell, route table, guards, providers | — |
| `frontend/src/pages/**` | 14 page groups (student, teacher, admin, owner, quality, community, …) | — |
| `frontend/src/components/**` | Landing sections + plates, primitives, domain components | — |
| `frontend/src/styles/**` | Token sheets → motion → layers → base → per-feature → per-section landing sheets | — |
| `frontend/src/stores/` | Zustand stores: auth, theme, ui, onboarding | 4 |
| `frontend/src/lib/` | Transport (`api.ts`), routes (`routes.ts`), motion, formatting | — |
| `frontend/tests/` | unit (225 files), e2e (34 specs), r305 belt (8 specs), audit, ios, gallery | — |
| `backend/{src,tests}` | unit + contract + integration suites | 104 test files |
| `scripts/` | `verify.sh` and every static gate (`gates/`, `brand/`, `deadcode/`, `tokens/`) | — |

## 3. Backend layering

The request path is intentionally thin and uniform:

```
route file  →  module service  →  prisma (db.ts)
     │                │
     └── zod parse ───┴── AppError / error envelope
```

1. **Route** (`http/routes/*.routes.ts`) — declares the path, applies
   middleware (`authMiddleware`, `createRouteLimiter`, role guards), parses the
   body/query with Zod, delegates, and returns the envelope.
2. **Module** (`modules/*`) — pure-ish decision logic. Rules that must be
   tested without a database live here as functions the tests can call with
   mocked `db.js`.
3. **Data** (`prisma`) — the only layer that talks SQL. Transaction and lock
   behaviour is covered by the separate DB-integration suite
   (`backend/tests/integration`, disposable Postgres in CI).

Response contract: success is `{ data: … }`; failure is
`{ error: { code, message } }` with an `ErrorCode` from `lib/errors.ts`.
The full wire contract is `docs/api/openapi.json`, regenerated from the routes
with `npm run api:openapi`.

## 4. Security architecture (verified in code)

| Control | Where | Observed behaviour |
|---|---|---|
| Security headers | `backend/src/app.ts` (`helmet`) | explicit CSP with `useDefaults: false`: `default-src 'self'`, script-src limited to `'self'` + two sha256 pins (theme bootstrap, JSON-LD), `object-src 'none'`, `frame-src 'self'` |
| CORS | `app.ts` | allow-list from `CORS_ORIGINS`; unknown origins are answered *without* CORS headers (`cb(null,false)`) instead of throwing a 500 |
| Body limits | `app.ts` | JSON/urlencoded capped at 1 MB, mapped to 400/413 |
| Rate limiting | `http/middleware/rateLimit.ts` | global 1000 req/15 min/IP; auth 10 failed/15 min/IP; per-user limiter for password change; `/health` 30 req/min |
| Session | `http/routes/auth.routes.ts` | refresh token in an `httpOnly` cookie (`secure` in prod, `sameSite=strict`, scoped path); short-TTL access token sent as `Authorization: Bearer` |
| Secrets validation | `env.ts` | Zod-validated at boot; the two JWT secrets must be ≥32 chars and differ; `STORAGE_DRIVER=s3` fails closed without credentials |
| Cron/service auth | `http/routes/jobs.routes.ts` | constant-time SHA-256 comparison of `INTERNAL_SERVICE_TOKEN`; fails closed when unset |
| Uploads | `http/routes/files.routes.ts` | PDF-only raw body with an explicit byte ceiling (`lib/pdf-limits.ts` host-aware), plus a per-user storage quota projection |

## 5. Frontend architecture

- **Shell**: `App.tsx` owns routing, providers (QueryClient, theme, auth),
  lazy route boundaries and the guest/auth/role guards. Route strings are
  centralised in `frontend/src/lib/routes.ts` — the single source of truth.
- **Transport**: `frontend/src/lib/api.ts` is a native-fetch client with a
  single refresh path (401 → refresh cookie → replay). XHR is used only where
  upload progress is required.
- **State**: server state via TanStack Query (`hooks/resources/*`); local UI and
  session state via four Zustand stores. Auth state is persisted to
  `localStorage` (access token + user) with a versioned migration; the refresh
  token never touches JS.
- **Landing**: `pages/LandingPage.tsx` composes section seats; each section
  imports its own stylesheet. The current wave renders the isometric plate
  system (`components/landing/plates/*`, `kernel/Iso.tsx`) — an SVG geometry
  layer shared by hero, journey, product, and roles.
- **Design system**: tokens are generated (`shared/design-tokens.json` →
  `scripts/tokens/build.mjs` → `frontend/src/styles/tokens/tokens.generated.css`),
  and static gates reject raw colours, type, radius, spacing, motion values and
  non-Lucide icons.

## 6. Data model boundaries

- Multi-tenancy is institution-scoped: college/institution relations gate every
  scoped query, and the role/permission matrix lives in `backend/src/lib/permissions`.
- 87 models, 3 migrations, single baseline + additive rounds. Schema change
  procedure: edit `schema.prisma` → `npm run db:migrate` locally → commit the
  generated migration.
- `prisma/seed.ts` refuses to run at `NODE_ENV=production`.

## 7. Known structural risks

1. `App.tsx` and `GlobalSearch` are eager chunks; every new eager import costs
   entry weight directly against the 92 KB entry ceiling.
2. The landing's SVG geometry layer is large; shared primitives (`PlateTag`,
   `SeatLabel`) exist to keep it from duplicating.
3. `localStorage` token persistence is an accepted, documented trade-off; the
   mitigation is the short TTL + `httpOnly` refresh cookie + strict CSP.
4. The DB-integration suite is the only guard on transaction/lock behaviour and
   runs in its own CI job; keep it that way (`npm test` stays DB-free).
