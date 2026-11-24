# CI/CD review — ULARA

Reviewed: all nine workflows in `.github/workflows/` plus `deploy.yml` /
`deploy-smoke.yml`. Findings are from reading the workflow sources and running
the same gates locally; GitHub-side settings were **not** inspected.

## 1. Current pipeline shape

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:389e32fc052994331d57c430ab4a4e204e17ff1288b6843dfb5937401a0861ff -->

| Workflow | Trigger | Jobs | Notes |
|---|---|---|---|
| `ci.yml` | push (any branch), PR, dispatch | `zero-trace`, `lint`, `typecheck`, `build`, `test-frontend`, `test-backend`, `db-integration`, `e2e`, `ios-webkit`, `design-gates`, `surface-drift` | the main matrix; `contents: read`; per-ref concurrency cancels stale runs |
| `size-gate.yml` | push, PR, dispatch | `size-gate` | file ≤500 KB, `docs/` ≤58 MiB, push adds ≤5 MB |
| `deploy.yml` | push to `main` (path-filtered), dispatch | `deploy` | Vercel CLI `--prod --regions fra1`, credential gate skips green when secrets are absent |
| `deploy-smoke.yml` | after deploy | smoke | polls the live buildId until it equals the pushed SHA |
| `mobile.yml` | mobile paths | devclient/full lanes | emulator + artifacts |
| `android-apk.yml` | mobile paths/dispatch | QA + signed release | |
| `build-ios-sidestore.yml` | mobile paths on main / dispatch | sidestore IPA | |
| `mobile-builds-ledger.yml` | mobile builds | ledger | |
| `deadcode.yml` | push/PR/dispatch | knip + jscpd ratchet | |

<!-- /coderabbit-ai-generated:v1 -->

Strengths observed: least-privilege `permissions` everywhere, explicit
`timeout-minutes` on every job, `concurrency` groups (and `cancel-in-progress:
false` for the production deploy, which is correct), `ubuntu-24.04` pinning with
the Playwright/ubuntu-26.04 rationale recorded inline, failure-only artifact
uploads with retention, and a deploy that refuses to run without its three
secrets rather than failing loudly or deploying partially.

## 2. Changes made in this pass

1. **Pinned every third-party action to a full commit SHA** — 71 references
   across the nine workflows, each with the original tag in a trailing comment.
   SHAs were resolved with `git ls-remote` at audit time:
   `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`,
   `actions/upload-artifact@v4`, `actions/download-artifact@v4`,
   `actions/setup-java@v4`, `actions/github-script@v7`,
   `reactivecircus/android-emulator-runner@v2`. Zero unpinned `uses:` remain,
   and all nine files still parse as YAML.
2. **Added `.github/dependabot.yml`** — grouped weekly patch/minor PRs for the
   root workspace, monthly patch-only for `apps/mobile` (own lockfile), monthly
   GitHub Actions updates so the new SHA pins stay current. Majors of
   React/React Router/Zod/Prisma/Expo are excluded from automation.
3. **Fixed a dangling documentation reference**: `deploy.yml` points at
   `RELEASE.md §deploy automation`, which did not exist. `RELEASE.md` now exists
   at the repository root and documents the credential gate, smoke verification
   and rollback.

## 3. Findings not changed (with reasons)

| Finding | Severity | Why not changed |
|---|---|---|
| `ci.yml` runs `npm ci` independently in 8 jobs (~8 installs per push) | low | Caching (`setup-node` `cache: 'npm'`) already covers the download; sharing `node_modules` via artifacts is slower and fragile. Not worth the risk to a green matrix. |
| `size-gate.yml` and `ci.yml` both trigger on every push, so workflow count per push is 2+ | informational | The size gate is seconds and dependency-free; merging it into `ci.yml` would remove its independence (it must fail even when the build job is broken). |
| `surface-drift` job has `timeout-minutes: 25` while others run 15–20 | informational | Measured job length, not an oversight. |
| `ios-webkit` is push-only | intentional | Documented cost decision (heaviest browser install). |
| No `concurrency` block in `deploy-smoke.yml` | low | It is a verification poller; duplicate runs are harmless. |
| No CodeQL workflow | medium | Enabling code scanning is a repository setting + product decision; not invented here. Tracked in `SECURITY-REVIEW.md §4`. |
| Advisory-only jobs (`deadcode`) use ratchets | good | Ratchets must keep moving down; no change. |

## 4. Validation performed

- YAML parse of all nine workflows after the pinning rewrite: **PASS**.
- `grep` for any `uses:` without a 40-hex SHA: **none**.
- Local equivalence of the gates that were practical without a database or
  browser: lint, typecheck, frontend/backend unit suites, builds, bundle gate,
  CSP/token/icon/motion/colour/raw-CSS/parity gates, CSS stylelint ratchet —
  all executed in this audit (results in `FINAL-IMPLEMENTATION-REPORT.md`).
- **Not run locally:** e2e/Playwright belts, the DB-integration suite, mobile
  workflows, and any GitHub-hosted job. These remain CI-only evidence.

## 5. Deployment safety notes

- `deploy.yml` fires only on `main` and only for paths that can change the
  deployed app; it cannot be triggered from a pull request.
- `deploy-smoke.yml` compares the live buildId with the pushed SHA, so a
  successful deploy receipt is not treated as proof of a serving build.
- Rollback: Vercel retains previous deployments; `RELEASE.md` documents
  re-promoting the last known-good deployment. Database migrations are
  forward-only (Prisma `migrate deploy`), so destructive schema steps must be
  split into expand/contract releases.
