# r370 — Hardening pass (areas A–E)

Branch `r370/hardening`, cut from `origin/r369/new-identity` (0e6d46b) in an
isolated worktree. The r369 visual/landing work continues in parallel; this
round owns **backend correctness, non-landing smoothness, mobile build
hygiene, repo health and security/privacy** — never the landing page, global
CSS/tokens, copy, e2e or r305 pins.

Method: spec → plan → smallest fix → test → measure. Every number below was
measured on this branch's tree, not quoted from an earlier round.

## A. Backend — API contracts, correctness, payloads

**Spec.** Every dashboard/calendar read must (1) agree with the write paths
that feed it, (2) answer in a bounded number of round trips, (3) validate its
inputs at the edge and (4) never leak or mis-scope another tenant's rows.

**Audited (read, not changed):** `student-dashboard.routes.ts`,
`teacher-dashboard.routes.ts`, `submissions.routes.ts`, `feedback.routes.ts`,
`client-error.routes.ts`, the auth middleware pair, `rateLimit.ts`,
`errorHandler.ts`, `validate.ts`, `pagination.ts`, `prisma/schema.prisma`.

**Found + fixed**

| # | Finding | Evidence | Fix |
|---|---|---|---|
| A1 | Student `/me/dashboard` excluded `SUBMITTED/GRADED/RETURNED` but not `LATE` from the pending-assignments predicate, while `submissions.routes.ts` writes `LATE` for anything past `dueAt`. A late submission stayed on «التزامات اليوم» and inflated `pendingAssignmentsCount` for the rest of the week. | `submissionStatusFor()` writes LATE; `PENDING_SUBMISSION_STATUSES` (teacher side) counts LATE as handed-in. | `HANDED_IN_SUBMISSION_STATUSES` (one definition, exported) + `pendingAssignmentsWhere()` pure builder. Pinned by 5 tests in `dashboard-logic.test.ts`. |
| A2 | Teacher `/dashboard` resolved each flagged student's last absence with its own `attendanceRecord.findFirst` inside a `Promise.all` — one extra round trip per alert row (4 max). | Source + counts. | One bounded `findMany` + pure `foldLatestAbsenceDates`; 4 → 1 query. Pinned by 3 tests (including a fake-client call-count assertion: `['findMany']`, never `findFirst`). |

**Found, deliberately not fixed (with reasons)**

- **Missing composite indexes.** The hottest predicates are
  `Assignment(offeringId IN, dueAt BETWEEN)`,
  `Submission(assignmentId, status, gradedAt range)`,
  `AttendanceRecord(studentId, status)` and `ExamTemplate(status, closeAt(≥ now))`.
  The schema has single-column indexes on the first key of each. Adding
  composites is a migration + write-cost decision that cannot be *measured*
  here (no local Postgres in this sandbox — `tools/boot-pg.sh` needs the
  embedded binaries, which are not installed), and the AGENTS law forbids
  claiming a speedup without a measurement. Recorded as a follow-up with the
  exact query shapes above.
- **`/me/results` is unbounded.** It loads every Grade row and every graded
  Submission for the student to fold a weighted rollup. Correct, but O(history).
  A `take` would silently change transcript math, so it needs a contract
  decision (e.g. aggregate in SQL), not a hardening patch.
- **`app.ts` captures a raw-body Buffer for every request** (for the Resend
  HMAC webhook) — one allocation per request for one route. Scoping it to
  `/api/v1/webhooks` is safe but unmeasurable at this scale; noted, not changed.
- **`feedback.routes.ts` pagination** looked unvalidated (`Number(req.query.limit)`)
  but is in fact behind `validate(paginationSchema, 'query')`, which coerces,
  requires a positive int and caps `limit` at 100 — no bug.

## B. Frontend smoothness outside the landing page

**Spec.** Measure the built app first; change only what a number justifies;
never touch the landing page, tokens or global CSS.

**Measured baseline** (`npm run build -w frontend` + `node scripts/check-bundle-size.mjs`):
182 JS chunks, 2675.4 KB raw; **total 828.4 KB gz** (gate ceiling 866),
**entry 29.5 KB gz** (≤ 92), **pdf worker 95.4 KB gz** (≤ 110).
Heaviest: pdf 95.4 · charts 64.9 · react 52.3 · entry 29.5 · OwnerPages 28.1 · AppShell 22.2.

**Audited, no change required:** route-level lazy boundaries (`App.tsx` — every
page is a `lazy()` chunk, AppShell itself lazy since r360), query defaults
(30 s stale, 5 min gc, 5xx-only retry), per-hook `staleTime`/`keepPreviousData`,
`serverWake`'s interval (cleared when the last request settles), and the
listener/observer cleanup in the shell components (Sidebar, GlobalSearch,
CursorManager, useScrollRestoration) — all balanced.

**Found, not changed (product/visual decisions):**
- The student calendar composes its month grid from `/me/dashboard`, whose
  agenda is a **7-day window** (assignments, live sessions) plus the unbounded
  exam list. Browsing a month therefore shows only the current week's
  assignments/live sessions. Fixing it means a new windowed contract
  (`?from&to`) and touches the calendar's payload design — out of a hardening
  round's mandate.
- `/me/results` is fetched by the dashboard only to draw the `GradeBars`
  instrument; that is the heaviest student query on the busiest student page.
  A dedicated lightweight distribution field is a backend contract change.

## C. Mobile (iOS + Android) — build hygiene

**Spec.** A mobile change must be validated on its branch, without secrets,
without queueing a native build. Versioning and signing must be honest.

**Fixed:** `mobile.yml` now triggers on `pull_request` (paths: `apps/mobile/**`,
`shared/**`, the workflow). The lane normalizer maps any non-push,
non-dispatch event to `fast`; `native-build-devclient`,
`android-smoke-prebuilt` and `android-smoke` remain gated on native intent /
explicit lanes, so a PR can never queue Gradle, an emulator or a signing key.
Lane A needs no secret at all (typecheck · expo lint · contract-check ·
generated-drift · jest · export · bundle budget) — safe for forks.

**Found, not fixed:**
- **Android `versionCode` is static.** `app.config.ts` sets `version: "1.0.0"`
  and no `android.versionCode`, so every APK ships the same versionCode and
  the same version string. `/status`'s latest-version gate compares that
  string, so it can never see a new build. The honest fix is a monotonic
  versionCode injected by CI (`github.run_number` → app.config env), which
  needs a real Android build to verify — not available in this sandbox.
- `frontend`'s `axios` dependency is unused at runtime (only test fixtures
  import its types); removing it means rewriting those type imports and
  refreshing the lockfile — deferred to an explicit dependency round.

## D. Repo health

- `npm audit --omit=dev`: 3 findings — `zod` (high, GHSA-mrhx-c7xc-m3w5,
  fixed only in zod 4.x) and `react-router`/`react-router-dom` (moderate,
  open-redirect + SSR hydration, fixed only in v7). Both fixes are semver
  majors against a 3.x/6.x tree; recorded, not forced. The zod issue is a
  memory-exhaustion vector on oversized constrained collections, bounded here
  by the 1 MB body cap. Dev-tree audit: 13 findings, 2 critical (test tooling).
- Documentation drift found: `AGENTS.md` §5/§7 still quote the 815 KB ceiling
  while `scripts/check-bundle-size.mjs` pins 866 KB (measured 828.4 today).
  Fixed to point at the gate constants instead of restating a number.

## E. Security & privacy

**Checked:** CORS is an explicit allow-list (no wildcard, credentials on),
helmet CSP is a complete `useDefaults:false` policy with pinned inline-script
hashes, global + auth + per-route rate limits exist (per-user keying where an
identity exists), webhooks fail closed on HMAC, uploads sit behind the storage
abstraction with guard tests, and `logger` redacts secrets by path.

**Fixed:** three auth log sites wrote **raw email addresses**
(`password reset requested for unknown email`, `token minted`,
`mail send failed`). The forgot-password flow deliberately answers a
byte-identical 200 for known and unknown addresses; the log undid that
no-oracle guarantee in the artifact that is copied and retained most freely.
Logs now carry `emailRef: email:sha256:<12>` — stable for correlation, no
address. Pinned by `privacy-log-redaction.test.ts` (helper + a source scan
over both files).
