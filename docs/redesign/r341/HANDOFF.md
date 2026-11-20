# R341 — HANDOFF (wave log)

## Wave 1 — critical reliability + brand (merged, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t01 sheet mounting (4 screens; the android-smoke CI blocker) | general-purpose | wip/t01 | 4086d77 · 1ffab46 · d984107 · 4b694d2 · 4b22851 | MERGED a625827 |
| t02 BootMark canonical mark | general-purpose | wip/t02 | 46dca1b (+ lead revision 8b9bb2d — logo-gate §3 reconciliation: brand barrel MarkLayers exports; geometry pins moved to src/brand/layers.test.tsx) | MERGED 46a49d3 |
| t03 connectivity honesty (own-API probe + 2-reading debounce) | general-purpose | wip/t03 | f7c514c · 4b7533e (incl. justified update of the pre-existing __tests__/network.test.tsx that pinned the single-reading bug) | MERGED 5da22db |
| t05 web brand (RegisterPage mark chip + 16 footer anchors → Link) | general-purpose | wip/t05 | f5e1dc8 · f72504d | MERGED e9e3a0a |

## Wave 2 — UX + web experience + backend (merged, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t04 iOS nested-scroll traps (admin papers peek, owner events peek, lecture transcript restructure) | general-purpose | wip/t04 | 2ed8c7f · 6712a30 · 6f329b6 | MERGED c5ccffa |
| t06 quality headers → patterns/PageHeader (9 seats) | general-purpose | wip/t06 | b6ef392 · 2eb19a2 · e1512ff · ccbe162 | MERGED 9a36744 |
| t07 /health envelope + DB_UNAVAILABLE union + scoped 30/min/IP limiter (hybrid additive envelope — consumer-census-driven) | general-purpose | wip/t07 | 242cff9 | MERGED 86e72db |

## Lead verification (integration branch wip/r341-integration @ 8b9bb2d)

| Gate | Result |
|------|--------|
| `scripts/verify.sh --fast` | **FAST PASS** — tsc ✓ · vitest **2989 passed** ✓ · vite build + bundle gate ✓ (**755.4 KB gz total ≤ 770 ceiling**, entry 63.8 ≤ 92, pdf 95.7 ≤ 110) · stylelint+CSS ratchet ✓ · logo gate ✓ · axe a11y ✓ (0 above floor) |
| Mobile `tsc --noEmit` | PASS |
| Mobile full jest | **45 suites / 1228 tests PASS** |
| Mobile lint | 0 errors (15 pre-existing warnings, byte-identical to baseline) |
| Mobile contract-check | PASS (0 drift) |
| Backend tsc | PASS |
| Backend vitest | **95 files / 2014 tests PASS** (1 contract file DB-gated skip, by design) |
| Root eslint (frontend+backend) | 0 errors |
| Playwright e2e (quality-moderation, r319-auth-stack, r305-shell-ds, r309-recovery, r308-landing-instruments) | see final report |

## Honest limits of local verification

- The Android emulator journey (Maestro five-role smoke) runs ONLY in
  GitHub Actions (no Android SDK on this sandbox). t01's fix is
  source-verified + unit-pinned; the CI run on the pushed branch is the
  journey-level evidence.
- iOS: no simulator/device on this sandbox — iOS-side claims are
  source-level only (worklet audit clean, nested-scroll traps removed,
  sheet mounting fixed). NOT TESTED on a physical iPhone.
- `expo export` (part of CI's Mobile gates) not run locally (disk/CPU
  budget); CI will run it.

## Iteration 2 — the t01 first cut regressed the settings scroll; root-provider fix (28df896)

**Evidence loop**: the dispatched android-smoke run (43455712122) on the
wave-2 integration moved the failure point: all five roles now passed
login, dashboard, three tabs, the settings deep-link and its title assert
— then died scrolling to «تسجيل الخروج» (12+ center swipes, page never
left scroll position 0; hierarchy + VLM screenshot: clean page, no
overlay, no banner, no keyboard; touches delivered per logcat). On main
this scroll worked and the failure was later (the «خروج» confirm never
presenting).

**Root-cause analysis**: t01's hoist moved the per-sheet
GestureHandlerRootView + BottomSheetModalProvider host chain (an
absolute-fill overlay) from inside the ScrollView to a full-screen
sibling — the only structural delta vs main at that screen. The native
interaction of that host chain with the sibling scroller kills the
scroll gesture on Android.

**Fix (28df896)**: the per-sheet local providers are RETIRED from
AppSheet — sheets bind to the app-root providers (GestureHandlerRootView
+ RootSheetModalProvider, mounted in _layout since R334 3-a). The portal
hosts in root coordinates (above the navigator) — the original
presentation bug AND the scroll regression are both structurally
impossible now. This is the hoist sheet.tsx's own R334 docblock
recommended. Jest unaffected (both packages are mocked in the suites);
the t01 mounting-contract source test keeps its teeth.

**Verification of the fix**: tsc 0 · full mobile jest 45 suites / 1228
tests PASS · lint 0 errors with warning sites byte-identical to main.
The android-smoke journey re-dispatched on 28df896 for the empirical
verdict (pending at doc time — recorded below when it lands).

## Iteration 3 — the empirical verdict + round closure (r342 lead, 2026-11-13)

**The re-dispatched run PASSED.** Mobile run **43465697203**
(`wip/r341-integration` @ `28df896`, completed 2026-11-13T17:24:14Z):

- mobile-gates: PASS (tsc · lint · contract · drift · render net · both
  exports · bundle budget)
- EAS Build: skipped (native=false — a JS+docs change; no cloud build
  queued)
- **android-smoke: PASS** — emulator + Maestro five-role journey: every
  role completed login → dashboard → three tabs → settings deep-link →
  **scroll to «تسجيل الخروج» (the exact step that died in run
  43455712122) → the ConfirmSheet «خروج» → confirmed → back at /auth**;
  logcat crash gate clean; forensics artifact uploaded.
- EAS Update: skipped (dispatch context).

The t01 regression story is closed end-to-end: the first cut (per-sheet
hosts hoisted to screen level) broke the settings scroller (run
43455712122, root-caused); the root-provider fix (28df896) is verified
at runtime on the emulator for all five roles. R341's Android runtime
acceptance — the one item keeping the round open — is satisfied.
The verification-classification matrix lives in QUEUE.md's closure
section. Physical-device and iOS rows stay honest (NOT TESTED /
BLOCKED).

R341 is CLOSED. The follow-up round (r342 — CI lanes + connectivity
dimensions + the wider product work) is documented under
`docs/redesign/r342/` and rides the same integration line (PR #1).
