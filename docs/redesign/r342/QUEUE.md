# R342 — Product Engineering Round (QUEUE)

> Opened 2026-11-13 by the continuation mission (the owner's r341 closeout
> + r342 product-engineering brief). R341 is CLOSED (its Android runtime
> verdict landed — see `../r341/QUEUE.md` closure + HANDOFF iteration 3;
> the decisive run is **43465697203**, all five roles through the settings
> scroll → logout ConfirmSheet → back at /auth, crash gate clean).
> The r342 round rides the SAME integration line: `wip/r341-integration`
> → PR ahmadmedo1012/ulara#1 (the mission's own instruction: keep PR #1
> as the primary integration line).

## Mission priorities (from the owner's r342 brief)

| # | Priority | Status | Owner |
|---|----------|--------|-------|
| P1 | Mobile workflow lanes — an ordinary JS/UI change must never pay the hour-scale native loop | **t09 DONE** (fast / smoke-prebuilt / native-build / full) | lead |
| P2 | Connectivity semantics — the four honest dimensions (device / internet-unprobed / ULARA API / ULARA DB) | **t08 DONE** (model + /ping + tests) | t08-agent |
| P3 | Whole-app mobile scroll/interaction performance inventory | OPEN (backlog — needs emulator/device measurement) | unassigned |
| P4 | Complete authenticated product (all five role workspaces, web + mobile) | OPEN (backlog — the wave-4 program) | unassigned |
| P5 | Backend/API correctness sweep, security audit | OPEN (backlog) | unassigned |

## Queue

- [x] t08 — fix(mobile+backend): connectivity honesty finished — the
      four-dimension split (`/ping` liveness, DEVICE-line onlineManager,
      reportDbHealth wiring, honest banner copy). Branch `wip/t08`,
      merged after lead review.
- [x] t09 — ci(mobile): the lane contract (fast / smoke-prebuilt /
      native-build / full; fingerprint-keyed dev-client artifact; honest
      BLOCKED). Branch `wip/t09`, merged after lead review.
- [x] t13 — fix(backend+web): PRODUCTION schema-drift retirement — the
      zu-sync system (SyncRun/UniversityFact) lived in ULARA's code
      while the shared Neon production DB had DROPPED its tables
      upstream (r349, madarek lineage): every code path touching them
      answered P2021 (empirically: PUBLIC `GET /university/facts` →
      HTTP 500; `GET /owner/system` → HTTP 500 — the owner System page;
      `/admin/sync` family → 500; the nightly `/jobs/daily` sync
      sub-job failing silently). Retired the whole feature family —
      routes, scheduler job, lib, prisma models, admin/owner web
      surfaces — with idempotent migration `0002_retire_zu_sync`
      (DROP IF EXISTS: no-op on the established DB, consistent on fresh
      ones). Directly on `wip/r341-integration` (lead-owned; frontend
      half executed by an isolated subagent, lead-integrated).

Tasks are created as `docs/redesign/r342/tasks/tNN-*.md` when staffed.
One worktree per task: `/home/z/wt/tNN`, branch `wip/tNN` (the r341
law continues — tNN numbering continues from r341's t01..t07; t13
ran directly on the integration line under the lead's ownership —
the change crosses schema/routes/web/tests and was integrated as
one atomic unit).

## Round state (2026-11-13, wave 1 closed)

t08 + t09 implemented, lead-verified locally (the smallest sufficient
gates per the validation budget), merged into `wip/r341-integration`.
CI lanes t09 is validated at YAML + lane-matrix level; the lanes'
first live CI exercise happens on the next dispatch/push (the honest
runtime confirmation — recorded here when it lands).

## Round state (2026-11-19, wave 2 — the takeover mission)

The full-project takeover mission (Madarek suspended — see the
mission record) resumed this round on `wip/r341-integration`. t13
(the production P2021 family) implemented + verified: backend
tsc PASS · backend vitest **92 files / 1955 tests PASS** · frontend
agent verification: tsc (app + tests) 0 errors · frontend vitest
**224 files / 2834 tests PASS** · stylelint ratchet green. The live-DB
ledger reconciliation (baseline 0001 resolve + deploy) is recorded
in HANDOFF (wave 2).
