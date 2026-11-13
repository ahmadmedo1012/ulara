# R341 — Baseline Inventory & Engineering Backlog (machine-readable)

Baseline: main @ b4afffd717b3a8ab5ca69efca166b2457dc5b709 (2026-11-13).
Inventories: INV-1 (mobile), INV-2 (web), INV-3 (backend) — full reports in
this round's handoff log. Every finding below carries source evidence.

## Backlog

```yaml
- id: t01
  finding: "AppSheet-family bottom sheets mounted INSIDE vertical ScrollViews on 4 screens — the documented contract (sheet.tsx:50-52) demands screen-root siblings; the absolute-fill host (sheet.tsx:618-620) lands in scroll-content coordinate space, so the sheet fails to present. This is the android-smoke CI blocker: Maestro taps 'تسجيل الخروج' then 'خروج' is never found (run 43426779345, all 5 roles; hierarchy dump shows the settings page, no sheet)."
  evidence: "apps/mobile/app/settings.tsx:333 inside <Screen scroll>:144; apps/mobile/app/student/(tabs)/profile.tsx:432 inside ScrollBody:220; apps/mobile/app/teacher/live.tsx:337,424 inside Screen-scroll:243; apps/mobile/app/document/[filename].tsx:262,286 inside Screen-scroll:180; CI forensics artifact 14040323096"
  severity: critical
  user_impact: "Logout impossible on Android release builds from 3 of the affected seats; teacher live-session create broken; document share broken; CI red"
  root_cause: "Sheet host is absolutely positioned inside the ScrollView's content container"
  owner: t01-agent
  dependencies: []
  acceptance: "All 4 screens restructured so sheets are siblings of the scroller (outside it); unit tests pin the pattern; android-smoke journey passes in CI (lead-verified after push)"
- id: t02
  finding: "BootMark (splash handoff + every loading transition) is a hand-drawn non-canonical mark ('two converging squares + point') contradicting its own docblock claim; the native splash icon IS canonical, so every cold start visibly swaps logos at the same seat."
  evidence: "apps/mobile/src/components/ui/boot.tsx:105-171 vs apps/mobile/src/brand/mark.ts:41-47; app.config.ts:123-175"
  severity: high
  user_impact: "Perceived logo inconsistency/overlap at every app launch — matches owner complaint"
  root_cause: "BootMark predates the canonical brand system and was missed by the R336 B1 consolidation"
  owner: t02-agent
  dependencies: []
  acceptance: "Boot mark renders the canonical U-vessel + cornerstone geometry from brand/mark.ts (same source as the splash icon); no second figure; unit test pins parity"
- id: t03
  finding: "False offline banner: NetInfo's DEFAULT reachability probe (Google generate_204) decides isInternetReachable; a single false reading flips the app to offline (banner + paused queries). For the Libyan audience the Google probe itself can be unreachable while the app's own API is fine. No NetInfo.configure() exists anywhere."
  evidence: "apps/mobile/src/lib/resilience/network.tsx:51-58,83-85,151-171; grep: zero configure( matches; queryClient.ts:44 onlineManager bridge"
  severity: high
  user_impact: "Persistent false 'لا يوجد اتصال بالإنترنت' banner + paused queries on working connections"
  root_cause: "Library-default reachability URL + zero-debounce single-reading policy"
  owner: t03-agent
  dependencies: []
  acceptance: "Reachability probed against the app's own API base (/status); offline requires N (2) consecutive false readings; recovery immediate; optimistic null-state behavior preserved; unit tests pin the state machine"
- id: t04
  finding: "iOS nested-scroll gesture traps: fixed-height DataLists nested inside ScrollViews with nestedScrollEnabled (Android-only chaining) — inner list traps the scroll gesture on iOS, reading as 'awkward/slow scrolling' precisely on iPhone."
  evidence: "apps/mobile/app/admin/(tabs)/dashboard.tsx:115-141 (h=400); apps/mobile/app/owner/(tabs)/dashboard.tsx:193-201 (5×76); apps/mobile/app/student/lectures/[lectureId].tsx:885-907 (h=360)"
  severity: medium
  user_impact: "Awkward scrolling on the admin/owner dashboards and lecture transcript on iPhone — owner complaint"
  root_cause: "Bounded peek-lists implemented as nested virtualized lists"
  owner: t04-agent
  dependencies: []
  acceptance: "Peek-lists render as sliced static rows (no nested virtualization) with a 'view all' affordance where a full surface exists; transcript keeps its own scroll region but as the primary scroller of its section (no outer ScrollView wrapping)"
- id: t05
  finding: "Web brand inconsistencies: (a) RegisterPage carries no brand mark while Auth/Forgot/Reset all do; (b) Footer mixes raw <a href> (full page reloads) with router <Link> on SPA routes."
  evidence: "frontend/src/pages/auth/RegisterPage.tsx:324-342 vs AuthPage.tsx:310-312; Footer.tsx:130,206-214,234,237,243 vs :202-203,296-315"
  severity: medium
  user_impact: "Perceived logo/brand inconsistency on the signup funnel; reload flash on the highest-traffic public surface"
  root_cause: "Missed seats during brand consolidation; anchor drift"
  owner: t05-agent
  dependencies: []
  acceptance: "RegisterPage renders the same mark+«أُلارا» chip grammar as the other auth pages; footer SPA links use <Link>; existing e2e (r321 legal-row, funnel) still pass"
- id: t06
  finding: "Three competing page-header grammars in the authenticated web app (raw .page-header ×17 seats, primitives/PageHeader, patterns/PageHeader) — the most concrete source of the 'unsatisfactory visual hierarchy' complaint. Quality workspace hand-rolls all 9 seats."
  evidence: "frontend/src/pages/quality/QualityPages.tsx:343 raw markup; patterns.css:24 vs base.css:416/polish.css:673; OnlineExamsPages.tsx imports both families"
  severity: medium
  user_impact: "Inconsistent headers/hierarchy across role workspaces"
  root_cause: "Organic growth predating the promoted patterns kit"
  owner: t06-agent
  dependencies: []
  acceptance: "All 9 QualityPages seats use patterns/PageHeader; no raw .page-header markup remains in that file; lint/typecheck/e2e quality specs pass; visual diff reviewed"
- id: t07
  finding: "GET /health violates the platform envelope contract (bare {ok,...}, code DB_UNAVAILABLE not in the ErrorCode union) and health/status are unauthenticated rate-limit-free DB-pinging endpoints."
  evidence: "backend/src/app.ts:204-252 vs backend/src/lib/errors.ts:5-20; mount order app.ts:248-252"
  severity: medium
  user_impact: "Client code must special-case health; cheap flood keeps Neon awake (amplifies cold-start budget burn)"
  root_cause: "Health predates the envelope/error-code conventions"
  owner: t07-agent
  dependencies: []
  acceptance: "Health returns the standard envelope with DB_UNAVAILABLE added to the union (status code + shape backward-compatible where clients rely on them — verify consumers first); public DB-ping endpoints get a light rate limit"
```

## Verified-fixed at baseline (no work — evidence recorded)

```yaml
- id: v1
  claim: "Post-login freeze (unsafe synchronous remote call from a Worklet)"
  verdict: PASS-at-source
  evidence: "b4afffd fix complete: CountUp formatFace is a module-scope worklet (CountUp.tsx:81-91); all 5 call sites data-only; full worklet sweep found ZERO remaining ordinary-JS-in-worklet closures; source-contract test pins it (CountUp.test.tsx:31-43). Residual iPhone freeze suspects (if any persist on device): t04 nested-list gesture traps, not worklets."
- id: v2
  claim: "Footer competing logo (web)"
  verdict: PASS
  evidence: "acef177 verified in source: MARK_PATHS/col3/.fo-mark fully removed; one canonical stacked Logo (Footer.tsx:119); no orbit drawing remains in frontend/src"
- id: v3
  claim: "Web boot logo overlap"
  verdict: PASS
  evidence: "Single-seat loaderOrchestrator state machine (loaderOrchestrator.ts:24-40); null guards on all seats; e2e pin tests/e2e/r323-loader-overlap.e2e.ts"
- id: v4
  claim: "Mobile logo consolidation"
  verdict: PASS-except-BootMark
  evidence: "e6b52fa consolidated all 7 <BrandMark> seats onto canonical <Logo> (INV-1 §6 table) — BootMark (t02) is the one remaining hand-authored mark"
```

## Orchestration decision (recorded honestly)

- Ruflo 3.77.0 probed: heavyweight Claude-Code-host orchestration platform;
  this host is not a Claude Code CLI host and the install/daemon strains the
  2-CPU/4 GB sandbox (npx --help did not complete in 90 s). Integration
  BLOCKED on host incompatibility — per the mission's own host-compatibility
  rule, orchestration uses THIS host's native isolated subagent mechanism
  (real agents, isolated worktrees, reviewable diffs, lead-verified gates).
- gstack: a Claude-Code skills repo — not applicable to this host.
- Native subagents: genuine isolated execution, every diff reviewed by the
  lead; counts reported honestly in the final handoff.
