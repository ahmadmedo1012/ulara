# Final implementation report — repository engineering pass

Date: 2026-11-21.
Phase 1 (audit + local work) and Phase 2 (integration into `main`, explicitly
authorized by the maintainer) are both recorded here.

## 1. Baseline and isolation

| Item | Value |
|---|---|
| `BASE_SHA` used for the audit (`origin/main` at Phase 1) | `c62311a9122be736caf6089bb5c78d15f6239a62` |
| Integration target (`origin/main` at Phase 2) | `647d044bf5f886fe22da1d23af2176a470baaace` |
| Worktree | `/home/rh2011/Projects/ULARA - اولارا/ulara-repository-engineering` |
| Branch | `chore/ulara-repository-engineering` |
| Main workspace | `/home/rh2011/Projects/ULARA - اولارا/ulara` — untouched; its pre-existing untracked file was preserved |

The historical `e89f137…` was an ancestor, not a tip, and was never used as a
baseline. The remote advanced twice while this work ran; both times the local
branch was fast-forwarded onto the new `origin/main` before continuing.

## 2. What changed

### 2.1 Test portability and determinism

1. **`r312-guest-reveal.test.tsx` / `r312-mobile-camera.test.tsx`** — replaced
   `dirname(new URL(import.meta.url).pathname)` with `fileURLToPath`, so CSS
   fixtures load from any worktree path (spaces, Arabic characters). Before the
   fix these suites could not read their fixtures on the prescribed worktree
   layout.
2. **`useScrollRestoration.test.tsx`** — removed real 20 ms sleeps and the
   `Storage.prototype` spy; content now resolves explicitly through `act()` and
   storage failure uses `vi.stubGlobal`. Every behavioural assertion is unchanged.

> **`r344-pixel-fill.test.ts` was investigated and deliberately NOT changed.**
> `main` was red there because `cta.css` had moved the CTA dissolve layers to
> `--z-cta-resolve-*` while the test pinned raw `-1` / `0` / `1`. The upstream
> fix (`647d044`) restored the literal seats in the CSS — the repository law is
> "reconcile the markup, never the tests". This branch therefore ships the
> untouched test and no competing contract.

### 2.2 Gate parity fix

`scripts/verify.sh` ran `npx vitest run` **without** `TZ=UTC`, while
`package.json` and CI use `TZ=UTC`. On a non-UTC machine the local gate failed
(timezone-dependent specs) while CI stayed green. The gate now pins `TZ=UTC`,
matching the documented and CI path. This is the one change that affects every
contributor's pre-push gate.

### 2.3 Dependencies

- **`axios` was investigated as an unused dependency and kept.** Three test
  files import its types (`AxiosError`, `AxiosResponse`); removing it broke
  `typecheck:tests` (TS2307 in three files) and the deadcode ratchet
  (`knip.unlisted 0 → 3`). It was removed, caught by CI, and restored — an
  evidence-based rejection, recorded rather than hidden.
- Lockfile carries compatible fixes: `body-parser` 1.20.9, `qs` 6.16.2 and
  `follow-redirects` 1.16.3 (patched instead of removed).
- `npm audit --omit=dev` after the change: **3 vulnerabilities (2 moderate,
  1 high)** — exactly the two breaking-major migrations (React Router 7, Zod 4)
  documented as scheduled work.
- Verified with `npm ci` (clean, exit 0), not only `npm install`.

### 2.4 CI/CD

- **71 workflow `uses:` references pinned to full commit SHAs** (tag kept as a
  trailing comment) across all nine workflows; SHAs resolved with `git ls-remote`
  at audit time. Zero unpinned references remain; every file parses as YAML.
- Added **`.github/dependabot.yml`**: grouped weekly patch/minor for the root
  workspace, monthly patch-only for `apps/mobile` (own lockfile), monthly GitHub
  Actions updates; majors of React/React Router/Zod/Prisma/Expo excluded.
- Added **`RELEASE.md`** — `deploy.yml` referenced `RELEASE.md §deploy automation`
  but the file did not exist. It now documents versioning, the release checklist,
  the three-secret deploy gate, smoke verification and rollback.

### 2.5 Documentation and standards

- `docs/engineering/ARCHITECTURE.md`, `ENGINEERING-STANDARDS.md`,
  `REPOSITORY-AUDIT.md`, `SECURITY-REVIEW.md`, `CI-CD-REVIEW.md`,
  `AGENT-SKILLS-REGISTRY.md`, this report — measured references (counts, paths
  and commands quoted from the tree).
- `CHANGELOG.md` — `Unreleased` section in the repository's Arabic-first style.
- `.agents/skills/ulara-repo-ops/SKILL.md` — one project-local skill (worktree
  isolation, gate matrix, ceilings, triage order). `.gitignore` gained a narrow
  exception (`.agents/*` + `!.agents/skills/**`) so shared skills are trackable
  while other local agent state stays ignored.
- No Hermes configuration was modified and no third-party skill was installed
  (evaluated and rejected with reasons in `AGENT-SKILLS-REGISTRY.md`).

### 2.6 Product/design preservation

No product source, landing section, plate, isometric geometry, motion or layout
CSS was modified. The r346/r347 visual system and the r344 CTA structure are
exactly as the remote team left them. The known responsive concerns (mobile hero
labels, journey cropping, Why panels, FAQ, footer) were **not** visually
re-verified here, so no layout was changed for them — see
`REPOSITORY-AUDIT.md` L5.

## 3. Validation — exact commands and results

Run in the worktree at `647d044` + this change set.

| Command | Result |
|---|---|
| `npm ci --no-audit --no-fund` | exit 0 |
| `npm run lint` | exit 0 — 0 errors, 14 `react-hooks/exhaustive-deps` warnings (pre-existing, not silenced) |
| `npm run typecheck` (src + tests, both workspaces) | exit 0 |
| `TZ=UTC npm --prefix frontend run test` | exit 0 — **240 files, 2987 tests passed** |
| `npm --prefix backend run test` | exit 0 — **93 files (1 skipped), 1955 passed, 19 skipped** |
| `npm --prefix backend run build` | exit 0 |
| `npm --prefix frontend run build` | exit 0 |
| `node scripts/check-bundle-size.mjs` | PASS — 752.9 KB gz total / 63.3 entry / 95.4 pdf (ceilings 770 / 92 / 110) |
| `check-csp-hash.sh`, `tokens/build.mjs --check`, `check-icons.sh`, `check-motion-tokens.sh`, `check-colors.sh --strict`, `check-raw-css.sh --strict`, `verify-parity-export.mjs` | all exit 0 |
| `bash scripts/verify.sh --fast` | **PASS** — tsc, vitest 2987, bundle, CSS ratchet, logo gate, a11y gate |
| YAML parse of all workflows + `dependabot.yml` | PASS |
| `npm audit --omit=dev` | 3 vulnerabilities (2 moderate, 1 high) — the two documented major migrations |

### Not executed (reported as not run, never as passed)

- Playwright e2e belts (`test:e2e`, `test:r305`, `ios-webkit`).
- DB-integration suite (`test:integration`) — needs a disposable Postgres.
- Mobile workflows and GitHub-hosted jobs (CI status is reported separately
  after the push).
- Browser-based visual/responsive inspection.

## 4. Remaining issues

1. **Zod 4 migration** (high advisory) — every request schema on both sides.
2. **React Router 7 migration** (2 moderate advisories) — routes, guards, auth redirects.
3. **14 ESLint hook-dependency warnings** — triaged, not silenced.
4. **`apps/mobile` audit** — separate lockfile, outside the root audit.
5. **Repository security settings** (secret scanning, code scanning, branch
   protection) — unverified; check GitHub Settings.
6. **Landing responsive QA** — open investigation, no code changed.
7. **`localStorage` access token** — accepted risk with documented mitigations.

## 5. Change set

Modified: 9 workflow files, `.gitignore`, `CHANGELOG.md`, `package-lock.json`,
`scripts/verify.sh`, 3 frontend unit tests, and one upstream plan line (a
zero-trace leak). `frontend/package.json` is unchanged after the axios round-trip.
Added: `RELEASE.md`, `.github/dependabot.yml`, `docs/engineering/*` (7 files),
`.agents/skills/ulara-repo-ops/SKILL.md`.

Integration: fast-forwarded onto `647d044`, re-validated, committed and pushed to
`main` on explicit maintainer authorization. The resulting commit and the CI
status are recorded in the handover message accompanying this push.
