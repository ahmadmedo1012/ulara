# Repository audit — ULARA

Audit date: 2026-11-21.
Baseline (`BASE_SHA`): `c62311a9122be736caf6089bb5c78d15f6239a62` (`origin/main`
after `git fetch`). The previously quoted `e89f137…` was stale and was not used.
Isolated worktree: `…/ulara-repository-engineering`, branch
`chore/ulara-repository-engineering`.

Every row below was reproduced with a command on this machine. Numbers are
measured, not copied from earlier rounds.

## High

| # | Finding | Evidence | Action | Status |
|---|---|---|---|---|
| H1 | **`main` was red on its own CI contract.** `frontend/tests/unit/r344-pixel-fill.test.ts` asserted the raw literals (`z-index: -1`, `z-index: 1`) while `styles/landing/cta.css` had moved those three layers onto scoped variables (`--z-cta-resolve-under/-fill/-face`). | Reproduced by stashing the local edit and running the pristine file: `npx vitest run tests/unit/r344-pixel-fill.test.ts` → exit 1 (`AssertionError … z-index: -1`). | **Resolved upstream during integration** (`647d044`): the CSS returned to the pinned literal seats, per the repo law "reconcile the markup, never the tests". This branch therefore leaves the r344 test untouched — no competing contract. | **resolved (upstream)** |
| H2 | Production advisories in the lockfile: `body-parser`, `qs`, `follow-redirects`. | `npm audit --omit=dev`. | Compatible lockfile bumps for `body-parser` 1.20.9 and `qs` 6.16.2; `follow-redirects` removed with its only consumer. | **resolved** (3 advisories remain, both breaking-major) |
| H3 | Zod 3 advisory (`<4.6.6`, memory exhaustion on oversized constrained collections). | `npm audit --omit=dev` (high). | Requires Zod 4 — breaking across every request schema on both sides. Not force-installed. | **open** — scheduled migration, `SECURITY-REVIEW.md §2` |
| H4 | React Router 6 advisories (open redirect via backslash; SSR `deserializeErrors` injection). SPA-only usage makes the SSR vector unreachable, the redirect vector relevant. | `npm audit --omit=dev` (2 moderate). | Requires React Router 7 — breaking across routes, guards and auth redirects. | **open** — scheduled migration |

## Medium

| # | Finding | Evidence | Action | Status |
|---|---|---|---|---|
| M1 | Tests broke in any worktree whose path contains a space or non-ASCII characters (the prescribed `wt/<task-id>` layout plus this Arabic-named project directory). `dirname(new URL(import.meta.url).pathname)` leaves `%20`/percent-encoding in the path. | `r312-guest-reveal` / `r312-mobile-camera` failed to read their CSS fixtures before the fix. | Switched both to `fileURLToPath(import.meta.url)`; 12 + 12 tests now read fixtures correctly. | **resolved** |
| M2 | Two scroll-restoration cases depended on real 20 ms timers (`sleep(40)`), a classic flake source under CI load; the "throwing storage" case spied on global `Storage.prototype`. | `useScrollRestoration.test.tsx` before/after diff. | Fixtures now resolve content explicitly through `act()`; storage failure uses `vi.stubGlobal` + `vi.unstubAllGlobals`. Assertions unchanged. | **resolved** |
| M3 | Suspected unused dependency `axios` in `frontend/package.json` (the runtime transport is native `fetch`; only comments mention it in `src/`). | A wider grep over `frontend/tests` shows three type-only imports (`AxiosError` ×2, `AxiosResponse` ×1). Removing it produced `TS2307` in `typecheck:tests` and `knip.unlisted 0 → 3` in CI. | **Rejected on evidence:** `axios` restored; its transitive `follow-redirects` pinned to the patched 1.16.3 in the lockfile. Recorded so the next pass does not repeat the removal. | **closed — not a defect** |
| M4 | All 71 workflow `uses:` references tracked mutable major tags (`@v4`, `@v2`). | `grep "uses:" .github/workflows/*.yml`. | Pinned to full commit SHAs resolved via `git ls-remote`, tag kept as a trailing comment; zero unpinned references remain; YAML re-parsed. | **resolved** |
| M5 | `deploy.yml` referenced `RELEASE.md §deploy automation`; no such file existed. | `grep -rl "RELEASE.md"` → only the workflow. | Added `RELEASE.md` documenting versioning, release checklist, deploy credential gate, smoke verification and rollback. | **resolved** |
| M6 | No automated dependency-update policy despite a hand-pinned workflow surface. | `.github/dependabot.yml` absent. | Added grouped Dependabot config (npm root + mobile + GitHub Actions) with majors of contract-critical packages excluded. | **resolved** |
| M7 | 14 ESLint `react-hooks/exhaustive-deps` warnings in teacher/college/owner pages. | `npm run lint` → 0 errors, 14 warnings. | Not silenced. Each needs a render-dependency trace; touching them blind risks behaviour change in pages with no focused regression test. | **open** — triaged, documented |

## Low / informational

| # | Finding | Evidence | Action | Status |
|---|---|---|---|---|
| L1 | `.env.example` documents the full variable surface as comments; the three required keys are the only active lines. Verified complete against `env.ts` (33 schema keys, no undocumented required variable). | Programmatic key diff. | No change needed; documented in `ARCHITECTURE.md §4` / `SECURITY-REVIEW.md`. | verified |
| L2 | Repository security features (secret scanning, code scanning, branch protection) cannot be inferred from a checkout. | GitHub settings are out of band. | Explicitly listed as **unverified** in `SECURITY-REVIEW.md §4`; not claimed as enabled. | documented |
| L3 | Air-gapped DB integration, Playwright e2e and mobile lanes cannot run in this local pass without a disposable Postgres/browser matrix. | Not executed. | Reported as not run, never as passed. | documented |
| L4 | `apps/mobile` carries its own lockfile and is not covered by root `npm ci`; root `npm audit` says nothing about it. | `apps/mobile/package-lock.json`. | Dependabot now watches that directory; auditing it locally was out of scope for this pass. | open (scoped) |
| L5 | Known landing responsive concerns (mobile hero label crowding, journey cropping, Why panels, FAQ, footer) are investigation targets in `docs/redesign/r347/HANDOFF.md`, not confirmed defects. | Handoff log + plate architecture review. | No layout code changed: this pass preserves the R346/R347 isometric system. Source review found no new overflow class; **visual verification was not performed in this pass**, so these remain unconfirmed rather than "fixed". | open (visual QA) |

## Areas reviewed, no finding

- npm workspace topology and lockfile reproducibility (`npm ci` → exit 0).
- Backend layering (route → module → prisma), error envelope, Zod validation at
  route boundaries.
- Auth/session design, cookie flags, rate limiting, cron constant-time auth,
  upload limits (see `SECURITY-REVIEW.md`).
- CSP + hashed inline scripts, CORS allow-list, body limits.
- Design-token generation and every static design gate.
- Bundle ceilings: measured 752.9 KB gz total, 63.3 KB entry, 95.4 KB pdf.
- Root docs (`README`, `README.en`, `CONTRIBUTING`, `SECURITY`, `AGENTS`,
  `CHANGELOG`, `.editorconfig`, `.gitignore`, issue/PR templates) — present and
  consistent with behaviour; `CHANGELOG` received an `Unreleased` entry.
