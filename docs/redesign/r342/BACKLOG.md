# R342 — Baseline Inventory & Engineering Backlog (machine-readable)

Baseline: `wip/r341-integration` @ `f6fa3ba` (r341 closed — see
`../r341/QUEUE.md`; decisive run 43465697203). The r342 mission brief
supplied the inventory; every finding below carries its evidence.

## Backlog

```yaml
- id: t08
  finding: "Connectivity semantics incomplete: the R341 model conflated device-offline with ULARA-unreachable (banner claimed «لا يوجد اتصال بالإنترنت» on any probe failure); the probe hit /status and cost a SELECT 1 per reachability check; onlineManager paused ALL queries whenever the probe failed while the device was otherwise online."
  evidence: "apps/mobile/src/lib/resilience/network.tsx (R341 state machine + banner copy); apps/mobile/src/lib/queryClient.ts (onlineManager bridge); backend status.routes.ts (DB-pinging probe target)"
  severity: high
  user_impact: "False offline claims + frozen queries on working connections; db-degraded state invisible"
  root_cause: "Single-boolean state model; probe target doubles as a DB health check; onlineManager driven by the probe line"
  owner: t08-agent
  dependencies: []
  acceptance: "Four honest dimensions; /ping DB-free probe target; onlineManager on the DEVICE line only; db-degraded from real API responses; deterministic tests for every state; the exact owner-prescribed Arabic strings"
  state: DONE
  closure: "wip/t08 → merged; 45-suite jest + backend vitest green (see HANDOFF.md)"
- id: t09
  finding: "mobile.yml dispatched EVERY manual run into eas-build AND the full Gradle release-APK android-smoke — an hour-scale native loop for ordinary JS-only validation (the owner's build-time complaint)."
  evidence: ".github/workflows/mobile.yml (r341 state): eas-build if 'workflow_dispatch || push' with unconditional build step on dispatch; android-smoke if 'push || workflow_dispatch' — both including JS-only contexts"
  severity: critical
  user_impact: "Every ordinary validation dispatch pays ~21 min Gradle + emulator + a queued EAS cloud build; CI minutes and EAS quota burn"
  root_cause: "One dispatch path with no lane selection; native-input detection only gated the push path's EAS build"
  owner: lead (.github/workflows is lead-only)
  dependencies: []
  acceptance: "Explicit lanes — fast (default, no native work), smoke-prebuilt (prebuilt dev-client + Metro-served current JS, zero Gradle, honest BLOCKED), native-build (only when native inputs moved or explicit), full (explicit only); push default loop free of the Gradle toll"
  state: DONE
  closure: "wip/t09 → merged; YAML + lane-matrix validated; first live CI exercise recorded in HANDOFF when it lands"
- id: t10
  finding: "Whole-app mobile scroll/interaction performance unmeasured: the R341 round fixed the three known nested-scroll traps (t04) but established no per-screen scroll inventory or FPS/frame measurements; the owner's complaint is application-wide."
  evidence: "r341 t04 fixed: admin papers peek, owner events peek, lecture transcript; no inventory exists for the other ~100 routes (dashboards, courses, lectures, exams, grades, research, messaging, notifications, search, tables, reports, forms, sheets)"
  severity: medium
  user_impact: "Unquantified scroll jank across the app's long screens on mid-range devices"
  root_cause: "No measurement program; fixes so far were defect-driven, not inventory-driven"
  owner: unassigned
  dependencies: [t09 (the prebuilt lane makes the emulator loop cheap)]
  acceptance: "Per-route scroll-container audit (who owns vertical scrolling, nesting, bottom-reachability, keyboard, sheet aftermath); measured JS/UI FPS on a consistent device+role+dataset; fixes with before/after numbers; no function removed to fake a win"
  state: OPEN
- id: t11
  finding: "The authenticated product review (wave 4) is open: route inventory per role (student/teacher/registrar/quality/owner) across web + mobile with per-route purpose/data/actions/states/permissions/a11y evidence."
  evidence: "frontend/src/App.tsx + lib/routes.ts; apps/mobile/app/** (112 routes per the render net); backend role enum + permissions"
  severity: high
  user_impact: "The owner's core complaint: the product's authenticated experience is not comprehensively verified"
  root_cause: "R341 covered 27 files (headers, register, footer, three scroll surfaces) — targeted, not comprehensive"
  owner: unassigned
  dependencies: [t09]
  acceptance: "Complete route inventory + per-role major-workflow verification + dead-button sweep + empty/loading/error consistency; documented per-route evidence"
  state: OPEN
- id: t12
  finding: "Backend/API correctness + security sweep (wave 6): auth/refresh/revocation, role permissions, tenant isolation, query performance, file authorization, error envelopes, rate limits — read-only audit + targeted fixes."
  evidence: "backend/src/** (r341 t07 spot-audited health/status only); 2026-11-23 platform round swept auth/refresh/revocation (existing belts), role permissions + tenant isolation (5 cross-tenant defects fixed with regression belts: findings programId IDOR, learners userId linkage, position-templates local variants, institutional-admin global capability overrides, lecture-video stream), file authorization (governance storage + lecture gate), rate limits (XFF re-probe closed); QUERY PERFORMANCE swept 2026-11-23 with measured evidence (see below) — no pathological query found; residuals documented and state stays OPEN for them"
  severity: medium
  user_impact: "Unknown residual correctness/security risk in changed surfaces"
  root_cause: "No comprehensive sweep this round"
  owner: unassigned
  dependencies: []
  acceptance: "No unmitigated critical/high finding in changed surfaces; documented evidence per area"
  state: OPEN
  closure: "query-performance sweep (2026-11-23, measured on a fresh disposable PostgreSQL at mid-size volume: 5,104 users / 5,000 profiles / 72 org units / 600 offerings / 15k enrollments / 5k papers / 20k watch events — harness in the PR41 review evidence): END-TO-END medians over the real booted backend — /colleges 5.2ms · /colleges/leaderboard 8.2ms · /auth/me 3.5ms · /me/permissions 3.4ms · /admin/users 13.2ms (q-search 19.9ms) · /admin/users/:id/permissions 7.6ms · /catalog/position-templates 2.5ms · /research/published 7.4ms · /research/search 10.3ms · /search/global 5.9ms · /me/dashboard 9.2ms · /me/materials 4.5ms; EXPLAIN (ANALYZE, BUFFERS) on the underlying shapes: permission machinery (UserPermission + UnitCapabilityGrant + membership re-verification) all index scans 0.009-0.014ms · /admin/users base 4.4ms (top-N heapsort) · research published 1.1ms (status bitmap) · research search 2.1ms + count 1.8ms · leaderboard group-bys 0.8-2.1ms full-scan aggregates · watch rollup 0.08ms. NO index added and NO query rewritten: nothing measured justified a change (every selective predicate already rides an index; the sorts are top-N over ≤5k rows). RESIDUALS kept OPEN honestly: (1) /admin/users?q and /research/search are ILIKE seq scans that grow O(rows) — 9ms and 2.1ms at 5k rows, fine at demo-to-mid scale, a decision point at ~100k+; (2) the ULARA migration chain does NOT carry the pre-ULARA lineage's trgm/GIN search indexes production has (orphan indexes per docs/deployment.md §2) — fresh deployments regress search acceleration that production accidentally enjoys; (3) /colleges/leaderboard's ~10 group-by full scans are constant-count but O(table) each — measured 2ms at 5k profiles, a decision point at ~50k+"
- id: t13
  finding: "PRODUCTION schema drift (the shared Neon DB): ULARA's baseline/code carried the zu-sync system (SyncRun/UniversityFact tables, SyncRunStatus enum) while the shared production database DROPPED them upstream (the pre-ULARA lineage r349, 2026-11-11) — every ULARA code path touching them answered P2021/HTTP 500."
  evidence: "empirical (2026-11-19): curl https://ulara.vercel.app/api/v1/university/facts → 500 INTERNAL (PUBLIC endpoint); authenticated owner@test.ly GET /api/v1/owner/system → 500 (the owner System page); /admin/sync family → 500; the nightly cron /jobs/daily sync sub-job failing silently (never-reject contract). Column-level diff: ulara schema expects SyncRun(11 cols)+UniversityFact(7 cols) — absent in DB; DB carries 14 extra pre-ULARA-era tables ulara never queries (harmless)."
  severity: critical
  user_impact: "Public 500s on the facts feed; the OWNER System page fully broken; the admin sync console broken; nightly cron sync sub-job silently failing"
  root_cause: "ULARA was squashed at the r336-era state (which still had the tables); the shared production DB continued with the pre-ULARA lineage which retired them (r349, data exported); the zu-sync feature is dead upstream — ULARA's copy is unconditionally broken against production"
  owner: lead (+ isolated subagent for the frontend half)
  dependencies: []
  acceptance: "The zu-sync family removed end-to-end (backend routes/scheduler/lib/prisma models + web admin/owner surfaces + nav/tests/docs); idempotent migration 0002 (DROP IF EXISTS — no-op on the established DB, consistent on fresh ones); no new dead buttons; backend + frontend suites green; the live DB's _prisma_migrations ledger reconciled with the baseline (resolve + deploy, non-destructive — the lineage's 49-row history preserved)"
  state: DONE
  closure: "wip/r341-integration (t13): backend vitest 92 files/1955 PASS, tsc PASS; frontend vitest 224 files/2834 PASS, tsc 0 errors; stylelint ratchet green; openapi regenerated (253 ops); BACKEND.md/AGENTS.md-adjacent docs updated; live-DB ledger reconcile recorded in HANDOFF wave 2"
```

- id: t14
  finding: "Backend/API security sweep (the mission's t12 wave): adversarial audit surfaced a verified-live CRITICAL (forgot-password devInbox returned the raw reset token for owner@test.ly to unauthenticated callers in production), a HIGH cross-institution PII leak (the research archive + paper search + global-search paper hits listed every tenant's papers), and a MEDIUM cross-tenant write primitive (invite codes for foreign institutions' offerings, redeemed regardless of the redeemer's institution)."
  evidence: "curl POST /api/v1/auth/forgot-password {owner@test.ly} on ulara.vercel.app returned data.devInbox.url with the live token (verified 2026-11-19, then rotated); learning.routes /research/published + /research/search where{status:PUBLISHED} with no institutionId (payload: student names/grade/feedback/plagiarismPct); invites/service createInvite (TEACHER ownership checked, ADMIN's institution NOT); auth.service registerUser + consumeInvite enroll by offeringId with no institution relationship check"
  severity: critical
  user_impact: "Unauthenticated full-platform takeover primitive (reset-token oracle); cross-institution academic PII disclosure; cross-tenant enrollment writes"
  root_cause: "The devInbox dev convenience shipped to NODE_ENV=production; the research archive was written before the institution-scoping law (r179/phase-5) and never re-audited; the invite family predates the same law"
  owner: lead
  dependencies: []
  acceptance: "devInbox gated to non-production; the research archive family institution-scoped to the caller's VERIFIED context (OWNER platform-wide); the invite family institution-bound on create/register/redeem; suites green"
  state: DONE
  closure: "wip/r341-integration (t14): backend tsc 0, vitest 92 files/1955 PASS, eslint 0 errors; 2026-11-23 update — lecture-video serving gate CLOSED 2026-11-23 (assertOfferingAccess matrix, lecture-video-access.test.ts); feedback inbox institution column CLOSED (migration 0006 + scoped inbox, feedback-institution-scope.test.ts); XFF re-probe CLOSED (live probe: varying spoofed XFF never evaded the auth limiter on Vercel — IP keys are platform-inserted); token claim staleness remains accepted (≤15 min)"

## Orchestration decision (recorded honestly)

Same as r341: Ruflo/gstack remain host-incompatible for this fleet
(evidence recorded in `../r341/BACKLOG.md`); orchestration uses this
host's native isolated subagent mechanism — real agents, isolated
worktrees (`/home/z/wt/tNN`), reviewable diffs, lead-verified gates.
Concurrency stays within the fleet limit (≤4 active).
