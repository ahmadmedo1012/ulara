# r354 — INTEGRATION LOG (the three agent PRs → `main`)

> Owner's local integrator, 2026-11-23. Every line is a command that ran and its
> result. Base: `main` = `a71d7d8`. Everything below is on `main` and pushed.

## 0. Pre-flight

| check | command | result |
|---|---|---|
| branches | `gh api repos/…/branches` | `main a71d7d8`, `agent/ulara-visual-artwork 97875f9`, `agent/ulara-product-roles-mobile 0b87c80`, `agent/ulara-backend-platform-core 05baf6a` |
| PRs | `gh pr list --state open` | #40 / #41 / #42 all `MERGEABLE`, all non-draft |
| overlap | `comm -12` of each pair of branch file lists | **0 files** touched by more than one branch; **0** shared with the local wip branch |
| trial merge | `git worktree add ../ulara-trial origin/main` + three `git merge --no-ff` | **0 conflicts**, 454 files, +15824/−1174 |
| prod DB state | `npx prisma migrate status` (read-only, pooler URL) | «Database schema is up to date» — 5 migrations applied, so r352's 0003/0004/0005 are already live and the only pending migration is #41's additive `0006` |

## 1. M1 — PR #42 (route-transition P0 + mobile workspace)

```
git merge --no-ff origin/agent/ulara-product-roles-mobile   → ca25b1f
TZ=UTC bash scripts/verify.sh --specs r353-route-transition,r309-recovery
  tsc ✓ · vitest 3062 passed ✓ · build+bundle ✓ · css ratchet ✓ · logo ✓
  a11y ✓ · design gates 7/7 ✓ · lint ✓ · e2e ✗ (r309 fresh-entry: 1906ms < 2000ms floor)
npm --prefix backend run test        → 2161 passed / 19 skipped, exit 0
apps/mobile: tsc ✓ · contract-check ✓ · tokens ✓
```

The one red was the **pre-existing** preloader timing defect (a real bug: the
entrance clock released before its own 2000ms floor). Fixed in `4ad17a0`
(`RELEASE_MARGIN_MS`/`RELEASE_EXIT_MS`), after which the same spec is green.

## 2. M3 — docs diet (own commit, before the visual PR)

```
magick <png> -strip -resize '1600x1600>' -quality 82  →  .webp
132 files converted, 1 kept (WebP was not smaller), 21.1MB saved
docs/ tracked 36537KB → 17148KB        → 6803176
```

Report prose that named a converted shot now names the `.webp`; no report, no
measurement and no markdown target was removed.

Rule 3 of the size gate summed every touched file, so the shrinking tree read as
“+9MB”: it now compares the tracked docs total against the base (`45128d4`).
Measured after: `rule 2 17148KB ≤ 40960KB`, `rule 3 0KB`.

## 3. M2 — PR #41 (backend/platform core)

```
git merge --no-ff origin/agent/ulara-backend-platform-core  → 1bf4bd4
npm --prefix backend run typecheck / typecheck:tests        → exit 0
npm run lint                                               → exit 0
npm --prefix backend run test                              → 2177 passed / 19 skipped
npm run api:openapi + git diff docs/api/openapi.json       → only the generatedAt stamp; reverted
apps/mobile: npm run api:types + git diff                  → no drift
```

`vercel.json` now calls `bash scripts/vercel-build.sh`, which runs
`prisma:deploy` **only** when `VERCEL_ENV=production` (advisory lock, direct
candidates only). The production build after this merge is the first live run.

## 4. M4 — PR #40 (visual round)

```
git merge --no-ff origin/agent/ulara-visual-artwork          → 645c5f5
TZ=UTC bash scripts/verify.sh --specs r353-route-transition,r354-final,r309-recovery
  → ALL GREEN (EXIT=0)
node scripts/check-bundle-size.mjs  → 808.1 / 815 KB gz (entry 64.5/92, pdf 95.4/110)
bash scripts/gates/size-gate.sh     → rules 1–3 green (docs 21042KB)
bash scripts/brand/zero-trace.sh    → content ✓ names ✓ history ✖ (two r350 commits — owner decision G2)
```

## 5. CSS diet + ratchet

`.jt-anno` (plus its three seats, the 1024 override, the two child rules and the
stage-4/5 reveal) had **no markup consumer** — JourneyScene.tsx retired in
r353. Removed from `journey.css` together with the stale “stays on disk for
rollback” comment. Measured after: `stylelint-gate: rawZIndex 71 → 70`,
ratchet green; bundle 808.0 KB gz.

## 6. Cleanup

```
gh pr close 42 (comment on 40/41/42)     → #40 MERGED, #41 MERGED, #42 CLOSED
git push origin --delete agent/ulara-{visual-artwork,product-roles-mobile,backend-platform-core}
git ls-remote --heads origin             → refs/heads/main only
```

## 7. Production (measured, 2026-11-23 10:55Z)

Production serves **`buildId: 09b352ffb76f`** — the integration commit
`09b352ffb76fc48a863414d071e6a2a697b0f9a3`.

| route | code |
|---|---|
| `/api/v1/status` | 200 (`db.ok: true`, `aiMode: openai`) |
| `/api/v1/health` | 200 |
| `/api/v1/colleges?institution=ulara-demo` | 200 |
| `/api/v1/colleges/leaderboard` | 200 |
| `/api/v1/institutions` | 200 |
| `/api/v1/auth/me` (no token) | 401 |
| `/api/v1/catalog/institution-types` (no token) | 401 |

Migration `0006_r352_feedback_institution_scope` finished at
`2026-11-23T10:48:58Z` in the production build — the first live run of
`scripts/vercel-build.sh`'s production branch (`prisma:deploy`, advisory
lock, direct candidates only). `_prisma_migrations` order confirmed:
`0006` → `0005` → `0004`.

## 8. Known red / NOT MEASURED

- **Zero-trace history**: red on `main` before this integration and after it, on
  the same two r350 commit subjects. No new trace was added (content + names
  halves green on every commit above). Owner decision G2.
- **Mobile on a device**: no device here; the mobile gates (tsc, contract,
  tokens) are green, `NOT MEASURED` for real-device behaviour.
- **WebKit/iOS**: CI owns it; PR runs were green.
- **DB integration suite**: CI owns the disposable-Postgres run (PR runs green);
  not run locally.
