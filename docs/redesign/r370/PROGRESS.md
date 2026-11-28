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
