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
