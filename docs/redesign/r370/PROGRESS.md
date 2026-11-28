# r370 round 2 — progress log

Base: `r370/hardening` merged with `origin/r369/new-identity` @ 4d2dd3eb (227 commits).
Every number below comes from a command run on this worktree, on the machine's
own hardware. Instruments are committed so they can be re-run:

- `backend/scripts/seed-load.mjs` — deterministic load dataset (PRNG seed fixed).
- `backend/scripts/explain-dashboards.mjs` — `EXPLAIN (ANALYZE, BUFFERS)` over the
  14 SQL shapes the dashboard / calendar / results handlers emit.

## STEP 0 — rebase onto the moved base, and the three "inherited" reds

Local Postgres: **available** (`@embedded-postgres/linux-x64` → initdb/pg_ctl in
`/tmp`, data dir `/tmp/pgdata`, port 5433). All 9 migrations applied.
Playwright: the packaged downloader refuses this distro
(`does not support chromium on ubuntu26.04-x64`), so `chrome-headless-shell`
158 was installed via `@puppeteer/browsers` and linked at the path Playwright
1.60 expects (`~/.cache/ms-playwright/chromium_headless_shell-1223/…`). The axe
a11y gate then ran for real (see the gate table at the end of this log).

| previously red | on the new base |
|---|---|
| parity export (55/201) | **PASS** — 201 token checks, 0 broken refs, 0 retired values |
| `r324-type-gate` (H1 clamp 38px) | **PASS** — 118 tests |
| stylelint ratchet (2 errors) | **still red** — now **4 errors, all `no-duplicate-selectors` in `frontend/src/styles/landing/r369.css`** (lines 349, 386, 1805, 2835). Landing CSS = the visual owner's zone; untouched here. |

AGENTS drift found on merge: §3 mirrored "866 KB" while the gate pins **878**
(r367 raise). §3/§5/§7 now point at the constant by reference (commit in the
merge batch), so the next raise cannot leave a stale number behind.

## Item 1 — indexes proved by plan (DONE)

**Spec.** Build a deterministic dataset large enough for the planner to choose
non-trivially, `ANALYZE`, run the exact SQL shapes, and add only the composite
indexes whose before/after plan proves a win — as a reversible migration.

**Dataset:** `LOAD_STUDENTS=1200` → 1,201 users, 4,800 enrollments, 96
assignments, **22,948 submissions**, **57,600 attendance records**, 36 exams,
72 lectures; 12 offerings across 4 teachers (a teacher owns 3 → the predicates
are selective, like production).

**Before (3 runs, plan+exec across the 14 statements):** 40.23 / 37.18 / 44.14 ms
(median 40.23).
**After (3 runs):** 21.59 / 20.58 / 22.95 ms (median **21.59**) → **−46.3%**.

Per statement (single run, same data):

| statement | before | after | plan change |
|---|---|---|---|
| teacher attendance all-time groupBy | 12.25 | 2.65 | seq scan of 57,600 records → index scan |
| teacher grades all-time groupBy | 5.76 | 2.01 | seq scan → index-only scan |
| teacher 6-week grades groupBy | 5.13 | 1.53 | seq scan + filter → bitmap |
| teacher pending-grading groupBy | 3.26 | 2.50 | seq scan → bitmap |
| every student-side statement | ≤ 0.41 | ≤ 0.41 | already indexed/bitmap |

Indexes added (`backend/prisma/migrations/0009_r370_dashboard_indexes`):
`Submission(assignmentId, status, grade)`, `Submission(status, gradedAt)`,
`AttendanceRecord(sessionId, status)`. Attribution runs (drop one, re-measure):
`Submission(status, gradedAt)` ≈ 7.7 ms of the win, `AttendanceRecord(sessionId,
status)` ≈ 6 ms, `Submission(assignmentId, status, grade)` ≈ 1.2 ms on its own
but it converts `grades.allTime` from seq scan to index-only (5.76 → 2.01 ms).

Candidates that did **not** earn an index: `Assignment(offeringId, dueAt)`
(student pending list stays 0.10 ms on the existing bitmap plan),
`ExamTemplate(status, closeAt)` (9 rows, 0.04 ms), `AttendanceRecord(studentId,
status)` (student attendance already 0.27 ms via the studentId index).
`teacher.feed.absenceAlerts` moved 5.03 → 6.67 ms in individual runs but varied
±1.5 ms across repeats — recorded as noise, not a win; no index claim made.

Rollout: the Prisma migration must run in a transaction (CONCURRENTLY is illegal
there), so the live-database path is `scripts/sql/r370-indexes-concurrent.sql`
(idempotent, one statement per transaction, safe to interrupt). Reversal is the
three `DROP INDEX IF EXISTS` lines in the migration header.

## Item 2 — `GET /me/calendar?from&to` (DONE, additive)

**Spec.** The calendar's month grid was built from `/me/dashboard`, whose
agenda is a deliberate 7-day window, so browsing any other month showed an
essentially empty sheet. Add a windowed read of the same four surfaces;
change nothing about `/me/dashboard`; no frontend edit.

**Contract** (`backend/src/http/routes/student-dashboard.routes.ts`, also in
`docs/api/openapi.json` → `/api/v1/me/calendar`, and in the regenerated
`apps/mobile/src/api/schema.generated.ts`):

| | |
|---|---|
| auth | bearer, any role; a STUDENT needs a DB-verified institution (403 `INSTITUTION_CONTEXT_REQUIRED`) |
| query | `from`, `to` — required ISO-8601 (a bare `YYYY-MM-DD` reads as UTC midnight); `to > from`; window ≤ 366 days; unknown params rejected |
| `assignments` | `{id, offeringId, title, type, dueAt, courseName, courseCode}` due ∈ `[from,to]`, `take 500` |
| `live` | `{id, offeringId, title, scheduledAt, status, courseName, courseCode}` scheduled ∈ `[from,to]`, `take 300` |
| `exams` | `{id, title, kind, openAt, closeAt, courseName?, courseCode?, facultyName?}` PUBLISHED **windows that overlap** `[from,to]` (offering ∪ faculty, as the dashboard does), `take 200` |
| `schedule` | `{id, offeringId, dayOfWeek, startTime, endTime, room, courseName, courseCode}` — recurring weekly slots, `take 500` |
| shape | `{ data: { from, to, assignments, live, exams, schedule } }`; empty enrollments → four empty arrays without touching the agenda tables |

**Evidence.** `backend/tests/modules/me-calendar.test.ts` — **17 tests, 17
passed** (schema/coercion/strictness, range guard incl. Invalid Date, the three
where-builders incl. exam overlap + faculty union, and 6 HTTP cases: 401, 403
fail-closed, 400 ×3, empty short-circuit, success shape with the window and the
`take` bounds asserted on the prisma call args).
Backend suite after the change: **2278 passed | 19 skipped**, `tsc --noEmit` 0.
OpenAPI regenerated deterministically (87 insertions, the new path + a count);
mobile `schema.generated.ts` regenerated from it (+78 lines, nothing else).
No frontend file touched — the view keeps composing from the old payload until
it is deliberately switched over.

## Item 3 — `/me/results` paging + summary mode (DONE, additive)

**Spec.** The handler loaded every graded submission of the student with a
wide select (feedback, title, type, status, submittedAt) and then kept 20;
the payload grew with the whole academic history and there was no way to ask
for the numbers alone or to page the feed. Old shape must keep working.

**Change.** Rollup query selects only the columns the fold reads; the feed is
its own bounded query ordered `(gradedAt desc, id desc)` with an opaque keyset
cursor; `mode=summary` returns `{headline, courses}` and runs neither feed
query; `recentLimit` (0–100, default 20) and `recentCursor` are new optional
params; unknown params are ignored (cache-busters must not 400 a read), a
malformed cursor is a 400. The bare request keeps all four old keys.

**Numbers** (16,099 graded rows on the load dataset, same Prisma client):

| select | time | payload | bytes/row |
|---|---|---|---|
| old (wide) | 723 ms | 6.05 MiB | 394 B |
| r370 (lean rollup) | 532 ms | 3.18 MiB | 207 B |

→ **−47.4% payload, −26% query time** for the same fold. Per-student the page
drops to `headline + courses + ≤20 feed rows` (`recentLimit=0` and `summary`
skip the two feed queries entirely).

**Evidence.** `backend/tests/modules/me-results-paging.test.ts` — **13 tests,
13 passed** (defaults, unknown-param tolerance, bounds, cursor round-trip,
shared-instant tie-break, null-gradedAt refusal, malformed cursors, old shape,
summary mode's single query, `recentLimit=0`, page-2 predicate, 400s).
The r164-e source pins in `dashboard-logic.test.ts` were re-pinned to the new
structure and **strengthened**: the feed must carry `feedback`/`submittedAt`,
the rollup must not (83/83 in that file). Backend suite: **2291 passed | 19
skipped**, `tsc` 0. OpenAPI now documents the three query params; mobile types
regenerated.

## Item 4 — Android `versionCode` from CI + the /status comparison (DONE)

**Spec.** Every APK shipped `versionCode 1` and `version: "1.0.0"` (no
`android.versionCode` in `app.config.ts`), so Android refused to install a
newer build over an older one and the `/status` gate compared a constant —
it could never fire. Inject a monotonic value from CI and make the gate
compare what actually orders native builds.

**Change.**
`versionCode = CHANNEL_BASE[channel] + github.run_number`, with disjoint
per-lane bases (release 1,000,000 · qa 2,000,000 · devclient 3,000,000) so a
channel is strictly increasing and the lanes never outrank each other.
The arithmetic lives in `apps/mobile/scripts/version-code.cjs` — plain CJS
on purpose: **Expo's config loader `require`s the transpiled
`app.config.js` during prebuild and cannot resolve a relative TS import**
(found by running `npx expo config` against the real loader, which failed
with `Cannot find module './src/lib/app-version'` before the split).
`app.config.ts` reads `ULARA_BUILD_CHANNEL` + `ULARA_VERSION_CODE`; the APK
lanes (`android-apk.yml` QA + release) and the dev-client lane
(`mobile.yml`) set them from `github.run_number`. No env (local prebuild) =
`versionCode 1`, never an error.
`src/lib/app-version.ts` holds the pure decision (`decideUpdate`): the
**versionCode wins whenever both sides have one**, semver is the fallback
for old servers; `updates.tsx` now uses it for both the blocking floor and
the "new build" toast, and `/status` publishes `minVersionCode` /
`latestVersionCode` (env `MIN_VERSION_CODE` / `LATEST_VERSION_CODE`, unset
→ null → no gate).

**Verified with the real Expo loader** (`npx expo config --type public`):

| env | version | versionCode |
|---|---|---|
| `ULARA_BUILD_CHANNEL=qa ULARA_VERSION_CODE=4242` | 1.0.0 | **2,004,242** |
| none (bare clone / local prebuild) | 1.0.0 | **1** |

**Evidence.** `apps/mobile/src/lib/version-code.test.ts` — **8 tests**
(monotonicity, lane disjointness, 32-bit ceiling, fail-loud run numbers,
bare-clone default, channel mapping, unknown channel) and
`apps/mobile/src/lib/app-version.test.ts` — **8 tests** (numeric ordering,
null sides, the "blocks a 1.0.0 build below a numeric floor" case the old
gate could never catch, semver fallback, bare clone, code-over-semver
precedence). Mobile: `tsc` 0, jest **1544 passed / 59 suites**, eslint 0 on
the touched files. Backend: `tests/http/status-versions.test.ts` — **5
tests** (shape, null when unset, semver pair kept, DB ping unchanged);
suite **2296 passed | 19 skipped**, `tsc` 0. `docs/mobile.md` §6 documents
the CI contract. Not run: a real Gradle build (no Android SDK here) — the
config output above is the executable proof that the number reaches the
manifest input.

## Item 6 — backend resilience (DONE, honest scope)

**Spec.** Look at body-buffer capture cost, socket timeouts, graceful
shutdown, health/readiness, error codes, idempotency, rate-limit edges and
migration safety; fix what the code proves wrong, with tests.

**Found / fixed.**

1. **Raw-body capture on every request.** `express.json({ verify })` did
   `req.rawBody = Buffer.from(buf)` for EVERY request, while only
   `POST /api/v1/webhooks/resend` reads those bytes. Now gated by
   `shouldCaptureRawBody` (webhook prefix only) and it stores the parser's
   own `buf` — no second allocation. **Measured honestly:** the copy was not
   a throughput problem — `scripts/measure-rawbody.mjs` (400 × 1 MiB bodies,
   one keep-alive socket) gives 333 ms with capture vs 362 ms gated, i.e.
   inside run-to-run noise (±10%). The win is retention: one extra body per
   in-flight request eliminated, 400 MiB of copies per 400 requests.
2. **Socket budgets were implicit** (Node: headersTimeout 60 s,
   requestTimeout 300 s). Now explicit in `index.ts`: headers 20 s,
   request 60 s, keep-alive 65 s, `maxRequestsPerSocket` 1000 — a stalled
   upload can no longer pin a socket for five minutes. Graceful shutdown was
   already correct (SIGTERM/SIGINT → `stopScheduler` →
   `closeIdleConnections` → `$disconnect` → exit, 10 s force-exit); pinned
   by test so it cannot regress.
3. **Idempotency was already built** (`IdempotencyRecord`, 24 h retention,
   `Idempotency-Replayed: true`) but not mounted on the two writes a mobile
   client retries: `POST …/assignments/:id/submit` and
   `POST /submissions/:id/grade`. Both now run `idempotencyMiddleware()`
   before the role gate. No header = behaviour unchanged.
4. **Already sound, pinned not changed:** `/health` (503 + `DB_UNAVAILABLE`
   on a 5 s DB timeout, 30/min limiter), `/ping` (DB-free liveness),
   `errorHandler` (AppError codes, ZodError → `VALIDATION_ERROR`, Prisma
   P2002 → `CONFLICT`, no stack leak, 5xx raise an operational alert),
   `trust proxy = 1`, and express-rate-limit 7.4.1 (its MemoryStore prunes
   expired keys — no unbounded map).

**Not done, with the reason.** *Full* per-route idempotency (exam starts,
enrolment writes) — the middleware is DB-backed and per-route, so extending
it is mechanical but touches routes this round did not otherwise open; and
`express-rate-limit`'s IPv6 keying helper (`ipKeyGenerator`) landed in 7.5,
so the per-IP limiters stay as they are until the dependency round that owns
that bump. Migration safety stays where it already is: `prisma migrate
deploy` in CI plus the CONCURRENTLY script from item 1.

**Evidence.** `backend/tests/modules/resilience-r370.test.ts` — **11 tests**
(gate true/false matrix incl. look-alikes and query strings, "no Buffer.from
copy" source pin, the three timeouts + proxy-window ordering, shutdown pin,
idempotency mounted before the role gate on both writes, and 3 live-app
cases: JSON still parses to a validation 400, 1.2 MB → 413, webhook without
a signature → 400/401 never 500). Suite after: **2307 passed | 19 skipped**,
`tsc` 0.

## Item 7 — load test, p50/p90/p97.5/p99 (DONE)

**Spec.** A repeatable load script for the five hottest reads, with real
percentiles and a before/after that means something.

**Harness** `backend/scripts/load-hotspots.mjs` (autocannon 7 via npx, no
dependency added): one FRESH server process per endpoint — the app's real
global limiter is 1000 req / 15 min / IP and must not be tuned away for a
benchmark, so each endpoint fires a bounded 900 requests on 25 connections
(0 non-2xx in both runs). autocannon has no p95 column; p97.5 is quoted as
the nearest neighbour. Found while building it: `npx tsx src/index.ts`
forks a grandchild that survives a SIGTERM to the wrapper and keeps the
port (EADDRINUSE + a next endpoint hitting the OLD server's spent bucket) —
the script now spawns `node --import tsx` directly.

**Before / after, same machine, same seeded data (1,200 students, 22,948
submissions, 57,600 attendance rows), same code, only the three item-1
indexes dropped for the "before" run:**

| endpoint | before rps · p50 | after rps · p50 | after p90 · p97.5 · p99 |
|---|---|---|---|
| teacher.dashboard | 69 · **338 ms** | 129 · **166 ms** | 186 · 210 · 215 ms |
| student.dashboard | 300 · 72 ms | 300 · 71 ms | 86 · 118 · 146 ms |
| me.results | 300 · 58 ms | 300 · 58 ms | 68 · 85 · 99 ms |
| me.results?mode=summary | 450 · 48 ms | 450 · 47 ms | 55 · 75 · 81 ms |
| me.calendar (1-year window) | 300 · 64 ms | 300 · 62 ms | 76 · 85 · 147 ms |

→ the index set is worth **+87% throughput and −51% p50** on the one endpoint
it targets, and nothing regressed. `me.results?mode=summary` sustains 1.5×
the rps of the full read at 3 ms lower p50 (item 3's win, seen end to end).
Indexes were re-created and `ANALYZE`d after the "before" run; the EXPLAIN
instrument is back at 20.96 ms total.

Reproduce: `cd backend && node scripts/load-hotspots.mjs --label after`
(`--drop-indexes` for the before run; needs `DATABASE_URL`, both JWT
secrets, and the seeded DB).

## Item 9 — frontend data layer outside the landing (DONE for the real gap)

**Spec.** Query keys, prefetch on route intent, request dedupe, abort on
navigation, optimistic updates — measured, not assumed.

**Found.** `lib/api.ts` supports `signal` completely (AbortController wired
into fetch and `xhr.abort()`), but **not one hook forwarded TanStack Query's
per-query signal**: cancelling a query on navigation left the HTTP request
running, its body parsed and discarded. On a slow network that is the
request holding the browser's connection pool while the next screen waits.
Query keys were already consistent (`withInstitutionScope` appends the scope
segment so prefix invalidations keep matching), `onMutate` optimistic
updates exist in 10 modules, and structural sharing/dedupe come from the
shared client.

**Change.** Every single-line read in `hooks/resources/student.ts` (8) and
`hooks/resources/notifications.ts` (3) now passes `{ signal }` into
`api.get` — dashboard, resume, results, materials, enrolments, matrix, gaps,
profile, notifications, push devices, preferences.

**Evidence.** `frontend/tests/unit/query-abort-signal.test.tsx` — **3 tests**
(real hooks, real QueryClient): the signal reaches `api.get`, it is live
before unmount, and it is **aborted after unmount** for
`useStudentDashboard`, `useStudentResults` and `useNotifications`.
Frontend suite: **3018 passed / 247 suites** (TZ=UTC), `tsc` 0, eslint 0 on
the touched files.

**Not done, deliberately.** *Prefetch on route intent* — no honest target
without a trace to prove which navigation pays for it (a hover prefetch on a
first visit costs bytes, not time); the abort fix already removes the
wasted-request half of the problem. *Optimistic updates* already exist where
the UI needs them (10 modules with `onMutate`); adding more without a
specific jank report would be guessing.

## Item 8 — mobile crash-safety, lists, CI build reproducibility (DONE what is provable)

**Spec.** Crash safety, offline queue, retry/backoff, slow network, long
lists, startup, build reproducibility ×2, and a workflow review — without
running any secret and without losing Latin digits / the Arabic-Indic
option / the leaderboard.

**Audited as already sound (evidence, not vibes).**
* Root `ErrorBoundary scope="root"` wraps the app (`app/_layout.tsx:180`),
  plus `src/lib/resilience/network.tsx` for connectivity.
* Offline queue `src/lib/resilience/queue.ts`: AsyncStorage-persisted,
  stable `${attemptId}:${questionId}` ids (re-answering replaces — newest
  wins, matching the server's per-question semantics), FIFO by
  `enqueuedAt`, permanent failures dropped *and reported* via `shouldDrop`,
  attempts/lastError recorded. Bounded by construction: one item per
  question, not one per tap.
* Lists: 4 `FlatList` consumers with 13 virtualization props
  (`initialNumToRender` / `maxToRenderPerBatch` / `windowSize` /
  `removeClippedSubviews`); no unbounded `.map()` list found in the mobile
  tree.
* Version code reproducibility: item 4 (`CHANNEL_BASE + github.run_number`)
  — the same commit on the same channel can never produce a lower code.
* PR lanes install with `npm ci` from the lockfile and read no secrets; the
  signing lanes are dispatch-only.

**Fixed (two real CI defects, both cost every run).**
1. `mobile.yml` native-build lane: the Gradle cache key was
   `android-devclient-…` but `restore-keys` was `android-smoke-` — the
   retired workflow's family. A step can never restore a cache it wrote, so
   every native-build run paid a COLD Gradle. Restore prefix now matches the
   key family, and `apps/mobile/package.json` joined the hash (a
   dependency add/remove that leaves the lock untouched still changes what
   Gradle resolves).
2. `build-ios-sidestore.yml` ran `pod install` with **no cache at all**.
   Added a CocoaPods **download** cache only (`~/Library/Caches/CocoaPods`,
   never `ios/Pods` — the native project is generated by prebuild, so a
   cached Pods dir would fight the fingerprint), keyed on
   package.json + package-lock.json + app.config.ts. A miss is exactly the
   old behaviour.
Both files re-parsed with a YAML loader (`workflows parse OK`).

**Not done, and why.** On-device startup time, memory across a long list,
and any iOS build: this machine has no Android SDK, no emulator and no
Xcode/macOS, and installing them is out of scope (the SDK download alone is
several GB) — so the Gradle and Xcode lanes are reviewed statically, not
run. Mobile suite unchanged at 1544 passed / 59 suites.

## Item 10 — repo health: the gate document that lies (DONE, scoped)

**Spec.** Accurate setup docs and a CONTRIBUTING whose gate commands are the
ones CI actually runs.

**Found in `CONTRIBUTING.md` (all stale, all now fixed).**
* The bundle ceiling was stated as **770 KB gz** in two places; the real
  ceiling is **878 KB** (`AGENTS.md` §3 `LIMIT_TOTAL_KB`, and the current
  build is 852.6 KB gz — so the document described a gate that fails on a
  green tree).
* "current round: R341" and a branch-naming rule (`wip/<task>`) that no
  longer matches the round branches actually in use (`r370/hardening`).
* The gates table listed a `npm test` that hides the single most common
  local trap: **five frontend tests are timezone-sensitive** and fail on a
  UTC+2 machine while CI (UTC) is green. It never mentioned the mobile
  suite at all.

**Change.** The gates table now carries the exact command, the environment
(`TZ=UTC`, enforced by `frontend/package.json`'s test script), and the last
measured count for each gate: frontend **3018/247**, backend **2307/19**,
mobile **1544/59**, parity export PASS (201), the stylelint ratchet's four
remaining `no-duplicate-selectors` in `styles/landing/r369.css`, and the
878 KB ceiling. A timezone warning sits directly under the table.

**Not done, and why.** Sharding the frontend test job: it would rename the
`Test (frontend)` status check, which is what branch protection keys on —
that needs the owner's confirmation of the protection rules, not a unilateral
edit. Dead-code removal "the ratchet allows" and duplicated-helper merging:
both are repo-wide sweeps with no measurement behind them in this round;
doing them blind is how a hardening pass turns into churn.

## Step 0 again — the base moved 7 more commits during r370

`origin/r369/new-identity` advanced from `0e6d46b`… to `87a25cf3` (+7
commits, landing only: the sticky band scenes, 164 lines of
`styles/landing/r369.css`, one r305 e2e, the a11y gate). Merged clean into
`r370/hardening` (`f838950d`, 4 files, no conflict). Re-ran every gate that
the merge could touch, on the merged head:

| gate | result |
|---|---|
| frontend suite (TZ=UTC) | **3018 passed / 247 suites** |
| backend suite | **2307 passed / 19 skipped** |
| backend `tsc --noEmit` | **0** |
| parity export | **PASS** (201 checks, 0 broken var(), 0 retired values) |
| bundle gate (`scripts/check-bundle-size.mjs`) | **PASS** — 830.4 KB gz total (ceiling 878), entry 48.0 (≤92), pdf 95.4 (≤110) |
| stylelint ratchet | **RED — 6 `no-duplicate-selectors`, all in `styles/landing/r369.css`** |

The stylelint red is **inherited from the landing branch, not from r370**:
the file is byte-identical to `origin/r369/new-identity` (`git diff` on it is
empty) and its last three commits are the visual round's. Exact offenders
for a one-pass fix by the owner: `.w369-hero` (349 vs 333), `.w369-hero-art`
(386 vs 376), `.w369-road-stop::after` (1805 vs 1784), `.w369-hero::before`
(2835 vs 350), `.w369-band:not([data-scene='night']):not(#stars)::before`
(3229 vs 3184), `.w369-roles` (3288 vs 1105). Everything else about the
ratchet improved (`rawZIndex` 72→51, `rawHex` 25→24, `importantDeclarations`
and `files` unchanged) — the baseline is pinned at 0 errors, so the six
duplicates are the whole breach.

# r370 — round 3

## A. base re-merged, every gate re-run (exact counts)

`origin/r369/new-identity` had moved one more commit (`947d842a` — the
handoff/showcase/principles/roles headline scenes) → merged clean (`28805553`,
3 files). All gates re-run **sequentially** (three suites in parallel on a
2-CPU box produced phantom failures — see the note at the end):

| gate | result |
|---|---|
| backend `tsc --noEmit` | **0 errors** |
| backend suite | **2311 passed / 19 skipped / 0 failed** |
| frontend `tsc --noEmit` | **0 errors** |
| frontend suite (TZ=UTC) | **3018 passed / 247 suites / 0 failed** |
| mobile suite | **1544 passed / 59 suites** |
| parity export | **PASS** (201 checks, 0 broken var(), 0 retired) |
| bundle gate | **PASS** — 830.4 KB gz total (≤878), entry 48.0 (≤92), pdf 95.4 (≤110) |
| stylelint ratchet | **RED — 6 `no-duplicate-selectors`, all `styles/landing/r369.css`** (owner is fixing; untouched by r370) |
| dead-code (knip) | unused files **49 → 1** (see E) |

## B. real browser performance (not just backend)

New instruments: `frontend/scripts/report-route-js.mjs` (per-route weight from
the actual build) and `frontend/scripts/measure-web-vitals.mjs` (headless
Chromium against the production build served by the real Express server, 390×844,
5 cold runs each, LCP from the browser's own PerformanceObserver, optional CDP
Slow-4G + 4× CPU).

**Weight** (gzip -9 of the emitted files):

| | JS | CSS | total |
|---|---|---|---|
| **BOOT** (index.html preloads) | 126.1 KB | 51.9 KB | **178.0 KB** to paint anything |
| / (landing) | +1.6 KB route chunk | | 179.6 KB |
| TeacherPages | +19.9 | | 197.9 KB |
| OwnerPages | +28.0 | | 206.0 KB |
| charts route | +64.9 | | 242.8 KB |
| pdf route | +96.3 | | 274.3 KB |
| app total | 830.4 KB | 100.9 KB | 931.4 KB (179 chunks) |

**LCP** (chromium, production build behind the real server):

| route | unthrottled LCP | Slow-4G + 4× CPU | DCL (throttled) | requests | JS | CSS |
|---|---|---|---|---|---|---|
| `/` | 180 ms | **2340 ms** | 1462 ms | 20 | 129.8 KB | 52.8 KB |
| `/auth` | 40 ms | 336 ms | 1451 ms | 26 | 164.5 KB | 52.8 KB |
| `/about` | 40 ms | 324 ms | 1440 ms | 23 | 141.8 KB | 54.1 KB |

**Finding for the landing owner** (I may not edit `styles/landing/` or
`components/landing/r369`): the landing's LCP is **7× the auth page's on the
same bundle and the same CPU throttle** (2340 ms vs 336 ms) while shipping
*less* JS (129.8 vs 164.5 KB) — so the cost is not bytes, it is the hero being
revealed after JS (entrance/motion gating). An LCP element that paints before
hydration is the single biggest landing perf win available.

**WebKit: impossible on this machine.** `npx playwright install webkit` fails
with `ERROR: Playwright does not support webkit on ubuntu26.04-x64` (both the
pinned and the latest Playwright). Chromium headless shell 1255 was installed
and drives both instruments.

## C. security audit — route permissions, limits, uploads, sessions

`backend/scripts/audit-routes.mjs` parses all 45 route files and classifies
every handler by the authorization actually in front of it (transport auth /
service token, declared `requireRole`/`requireCapability` incl. aliases,
handler-level `assertCapability*`, caller-scoped query).

**Measured:** 389 routes · **15 public** (3.9%) · 374 authenticated · **191
declared role/capability-guarded** · 129 caller-scoped · 208 mutations ·
**0 mutations authenticated but unguarded in every layer**.

`backend/tests/contract/route-authz.test.ts` (4 tests) makes it binding: the
public set is an explicit 15-entry allowlist (a new unauthenticated route is a
red build), zero unguarded mutations, zero in the 15 privileged routers, plus a
denominator floor so the assertions cannot go vacuous.

Hand-audited and sound (evidence in the commit): password reset (sha-256 at
rest, single-use `updateMany` claim, 30-min TTL, one generic refusal),
refresh-token rotation + per-session revocation scoped to `req.user.id`,
credential limiters (login/register/refresh/verify 10 failed/15 min;
forgot-password 10/15 min per IP **and** 3/15 min per submitted email;
change-password per user), PDF uploads (magic bytes + active-content scan +
size cap), video presign (server-minted key, extension allowlist, role-gated,
HEAD-verified on complete), no mass-assignment, no unverified
body-supplied `institutionId`. **No exploitable gap found** — the durable
output is the instrument + the contract.

## D. the five timezone tests are fixed, not documented away

They were UTC-instant fixtures whose calendar-day meaning only survived on a
UTC runner (a 23:59Z "yesterday" row is *tomorrow* at UTC+02:00). Fixtures are
now built from LOCAL calendar components; assertions unchanged. **50 tests pass
with `TZ` unset (this box is EET +0200) and the full 3018-test suite is green
without `TZ=UTC`.**

## E. dead code by measurement only

knip (pinned 5.88.1) reported **49 unused files, 19 unused exports, 215 unused
types, 0 unused deps**. 45 of the 49 are the r359 art library that
`PlatesPage` consumes via `import.meta.glob('../illustrations/r359/*.tsx')` — a
pattern the analyzer cannot see; `public/sw.js` is registered by the browser;
two were the new perf scripts. All declared in `knip.json`, so the honest count
is **1**: `src/data/testimonials.config.ts`, which is **copy** and therefore not
mine to delete. The one genuinely dead module,
`src/lib/paperStatus.ts` (`PAPER_STATUS_TONE`, zero importers, referenced only
by two comments), is deleted. Baseline re-pinned in the same commit
(unusedFiles 47 → 1, unusedExportTypes 220 → 215).

## F. mobile — what is verifiable without a device

`npx tsc --noEmit` **0 errors**; jest **1544 passed / 59 suites**; and a real
production JS export succeeds for **both** platforms — Android Hermes bundle
**7.9 MB** (`.hbc`) + 38 assets, total export 8.8 MB; iOS export also
completes. That proves the JS graph, the Metro/Hermes transform and the app
config resolve — the part of a build that breaks without a device.

**Not verifiable here (no Android SDK, no emulator, no Xcode/macOS):** Gradle
APK build, signing, iOS archive, on-device startup time, list memory under
scrolling, slow-network behaviour on a real radio. Installed SDK/Xcode would
not change the JS side measured above.

## Note — three suites in parallel lie on this 2-CPU box

Running backend + frontend + mobile vitest/jest simultaneously produced a
phantom `r324-type-gate` failure and 13 phantom mobile failures (and dropped 6
frontend files). Re-run alone, everything is green. Measured numbers must come
from one suite at a time.

## Item 5 — dependency majors (branch `r370/deps`, DONE, not merged)

**Spec.** Clear the 3 production audit findings (zod high, react-router
moderate ×2) behind a separate branch with a full test pass, and drop `axios`
from production dependencies if only types used it.

**Found.** `axios` had **zero runtime imports** in `frontend/src` — `lib/api.ts`
moved to native `fetch` in r338 and kept only the response shape; the sole
users were 3 test files importing `AxiosError`/`AxiosResponse` types. zod 4
was *already* proven in the monorepo (`apps/mobile` runs ^4.6.7). The
frontend's `@hookform/resolvers@3.10` only speaks zod 3, which is why the
first bump left 13 validation tests silently passing no errors.

**Change (all on `r370/deps`, branched from the r370 head).**
- `axios` removed; the 3 tests declare a structural `HttpError`/envelope
  type instead (no axios types, no casts beyond what they already had).
- `zod` 3.23.8/3.25.76 → **4.6.7** (frontend + backend).
- `react-router-dom` 6.30.6 → **7.18.7**.
- `@hookform/resolvers` 3.10 → **5.9.2** + `react-hook-form` 7.54.2 →
  **7.92.0**: resolvers 5 is the first line that understands zod 4.
- The two coerced-field forms are typed with the three RHF generics
  (`z.input` values / `z.output` transformed) — zod 4 models a coerced
  field's input as `unknown`, and a cast would have hidden that.

**Numbers.**

| gate | before | after |
|---|---|---|
| `npm audit --omit=dev` (frontend) | 3 findings (zod high, react-router moderate ×2) | **0 vulnerabilities** |
| `npm audit --omit=dev` (backend) | zod high | **0 vulnerabilities** |
| backend suite | 2296 passed / 19 skipped | **2296 passed / 19 skipped** (on zod 4) |
| frontend suite (TZ=UTC) | 3015 tests | **3015 passed / 246 suites** |
| frontend `tsc --noEmit` | 0 | 0 |
| frontend build + bundle gate | 828.4 KB gz | **852.6 KB gz** (ceiling 878) |

**Not merged** (`r370/deps` is pushed separately, as asked): `react-router-dom`
7 renames nothing this tree uses (`Link`, `useParams`, `useSearchParams`,
`useNavigate`, `useLocation`, `MemoryRouter`, `Routes`), but it is a major on
the app shell — the owner's landing work owns `src/pages/LandingPage.tsx` and
the shell, so the merge decision is theirs, not a silent one. 5 frontend
tests are **timezone-sensitive** (`formatTime`, `groupMessagesByDay`,
`isoToLocalInputValue`): they pass under `TZ=UTC` (the CI default) and fail on
this machine's UTC+2 — pre-existing, unrelated to the bump, recorded rather
than "fixed" by editing expectations.
