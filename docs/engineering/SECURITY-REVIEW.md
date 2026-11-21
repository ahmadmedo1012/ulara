# Security review — ULARA

Review date: 2026-11-21. Baseline: `c62311a9122be736caf6089bb5c78d15f6239a62`.
Method: source tracing of the request path plus `npm audit` on the installed
lockfile. **No secret values were read, printed or copied into this document.**
No production credential was rotated, revoked or modified.

## 1. Confirmed controls (verified in code, not assumed)

| # | Control | Evidence | Status |
|---|---|---|---|
| S1 | CSP is explicit, not helmet-default | `backend/src/app.ts`: `helmet({ contentSecurityPolicy: { useDefaults: false, directives: {…} } })` — `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-src 'self'`, script-src limited to `'self'` + two sha256 hashes | confirmed |
| S2 | CSP pins cannot drift silently | `scripts/check-csp-hash.sh` re-hashes `frontend/index.html` inline scripts against the constants; ran green in this audit | confirmed |
| S3 | CORS is an allow-list and fails closed | `cors({ origin })` returns `cb(null, false)` for unknown origins (no headers, no 500) | confirmed |
| S4 | Refresh token is not JS-readable | `auth.routes.ts`: cookie `httpOnly: true`, `secure: env.cookieSecure`, `sameSite: 'strict'`, explicit `path` | confirmed |
| S5 | Credential endpoints are rate-limited | `rateLimit.ts`: auth 10 failures / 15 min / IP with `skipSuccessfulRequests`; global 1000 / 15 min / IP; `/health` 30 / min | confirmed |
| S6 | Password-change brute force is bounded per user | `changePasswordRateLimiter` keyed on the verified token identity, not the IP | confirmed |
| S7 | Machine-to-machine route uses constant-time auth | `jobs.routes.ts`: SHA-256 both sides then `timingSafeEqual`; fails closed when `INTERNAL_SERVICE_TOKEN` is unset | confirmed |
| S8 | Boot fails on missing/weak secrets | `env.ts`: Zod schema; both JWT secrets ≥32 chars and must differ; `STORAGE_DRIVER=s3` fails closed without credentials | confirmed |
| S9 | Request bodies are bounded | `express.json({ limit: '1mb' })`; parser errors mapped to 400/413 | confirmed |
| S10 | Uploads are type- and size-bounded | `files.routes.ts`: `express.raw({ type: 'application/pdf', limit: MAX_UPLOAD_PDF_BYTES })` + per-user quota projection | confirmed |
| S11 | Error responses do not leak internals | central error handler emits `{ error: { code, message } }` with `ErrorCode`; logger is server-side | confirmed by route review |
| S12 | `.env` is untracked, template is safe | `.gitignore` ignores `.env` variants; `.env.example` contains placeholders only | confirmed |

## 2. Dependency advisories

`npm audit --omit=dev` at the baseline reported six production advisories across
`body-parser`, `follow-redirects`, `qs`, `react-router`, `zod`.

| Advisory | Package | Action taken | Status |
|---|---|---|---|
| body-parser DoS family | `body-parser` 1.20.8 → 1.20.9 | compatible lockfile bump | resolved |
| `qs` array-limit DoS | `qs` 6.16.0 → 6.16.2 | compatible lockfile bump | resolved |
| `follow-redirects` leak | `follow-redirects` 1.16.1 | patched to 1.16.3 in the lockfile (`axios` stays: three suites import its types) | resolved |
| React Router open redirect / SSR constructor injection | `react-router-dom` 6.30.6 | **requires React Router 7** (breaking) | open — documented, not applied blindly |
| Zod memory exhaustion on oversized constrained collections | `zod` 3.23.8 | **requires Zod 4** (breaking across backend and frontend schemas) | open — documented |

Post-change `npm audit --omit=dev`: **3 vulnerabilities (2 moderate, 1 high)** —
only the two major-migration items above (router counts its transitive
`react-router`). The compatible advisories were cleared in this pass; only the two breaking migrations remain.

Why the two remaining ones were **not** force-upgraded: both are ecosystem-wide
breaking migrations (every Zod schema boundary in `backend/src` and
`frontend/src`, every route and auth redirect for the router) with no regression
coverage written yet; `npm audit fix --force` in this repository would produce a
large unreviewed behavioural change. They are scheduled work, not silently
deferred risks.

## 3. Risks accepted with a written rationale

1. **Access token persisted in `localStorage`** (`stores/auth.store.ts`).
   XSS-reachable, mitigated by the short TTL, the `httpOnly`/`strict` refresh
   cookie, and the strict `'self'`-only CSP with hashed inline scripts. Moving to
   cookie-only access tokens is a design change, not a bug fix, and is out of
   scope for a repository-engineering pass.
2. **`trust proxy = 1` makes IP-keyed limits spoofable when the app is directly
   exposed.** Already documented in `rateLimit.ts`; the per-user limiters are
   immune. The production platform topology (one appending proxy) is the
   assumption; direct exposure would weaken IP limiting.
3. **User-supplied PDFs are parsed.** Size and type are bounded and the parser is
   pinned; no sandboxing of `pdf-parse` is attempted. Treated as residual risk.

## 4. Repository-level security features (NOT verified here)

These live in GitHub settings and **cannot be confirmed from a checkout**. They
are not claimed as enabled:

- secret scanning / push protection,
- CodeQL or other code scanning,
- Dependabot **security** alerts (the new `.github/dependabot.yml` only schedules
  version-update PRs; alerting is a repository setting),
- branch protection rules and required checks.

Verify them in repository Settings before quoting them anywhere.

## 5. Supply-chain hardening applied

- **All 71 workflow `uses:` references are pinned to full commit SHAs** with the
  tag recorded in a trailing comment; the SHAs were resolved with
  `git ls-remote` against each action repository at audit time.
- `.github/dependabot.yml` now keeps those pins fresh (GitHub Actions, monthly)
  and opens grouped patch/minor npm PRs while excluding majors of
  React/React Router/Zod/Prisma/Expo from automation.
- Every workflow already declared least-privilege `permissions` blocks; the audit
  found no `write-all` and no `pull_request_target` usage.

## 6. Residual risk summary

| Risk | Severity | Owner action |
|---|---|---|
| Zod 4 migration pending (high advisory) | high | schedule migration round with schema regression tests |
| React Router 7 migration pending (2 moderate) | moderate | schedule with route/redirect e2e |
| localStorage access token | low–moderate | design decision; revisit with cookie-only sessions |
| GitHub security settings unverified | unknown | check Settings; enable what is appropriate |
| 14 ESLint hook-dependency warnings | low | triage per file; warnings are not errors and were not silenced |
