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
  evidence: "backend/src/** (r341 t07 spot-audited health/status only)"
  severity: medium
  user_impact: "Unknown residual correctness/security risk in changed surfaces"
  root_cause: "No comprehensive sweep this round"
  owner: unassigned
  dependencies: []
  acceptance: "No unmitigated critical/high finding in changed surfaces; documented evidence per area"
  state: OPEN
```

## Orchestration decision (recorded honestly)

Same as r341: Ruflo/gstack remain host-incompatible for this fleet
(evidence recorded in `../r341/BACKLOG.md`); orchestration uses this
host's native isolated subagent mechanism — real agents, isolated
worktrees (`/home/z/wt/tNN`), reviewable diffs, lead-verified gates.
Concurrency stays within the fleet limit (≤4 active).
