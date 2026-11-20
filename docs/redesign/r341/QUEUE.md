# R341 — Recovery & Hardening Round (QUEUE)

> This round is created by the Engineering Director mission on 2026-11-13.
> Baseline `main`: `b4afffd717b3a8ab5ca69efca166b2457dc5b709` (matches the
> mission's observed SHA — no newer work exists; no open PRs or branches).
>
> NOTE: `AGENTS.md` already declares `docs/redesign/r341/` the current
> program, but the directory did not exist on `main` (stale reference — the
> last committed round was r336). This round materializes the documented
> structure so the doc and reality agree ("code wins over docs — fix the
> doc in the same change").

## Mission priorities (from the owner's defect reports + CI evidence)

| # | Defect | Status | Evidence so far |
|---|--------|--------|-----------------|
| Q1 | Mobile CI `android-smoke` fails — Maestro journey dies at the logout ConfirmSheet (`خروج` not found) for ALL 5 roles | ROOT-CAUSED → t01 | Run 43426779345: screen hierarchy at failing step shows the settings page, no sheet presented. `app/settings.tsx` mounts `ConfirmSheet` INSIDE `<Screen scroll>`'s ScrollView; `AppSheet`'s absolute-fill host must be a screen-root sibling (its own documented contract, `ui/sheet.tsx` header). |
| Q2 | iPhone post-login freeze | VERIFY previous fix (r336 G: CountUp worklet fix) + audit remaining worklet closures | t02 |
| Q3 | False offline banner | Investigate `src/lib/resilience/network.tsx` + api client retry semantics | t03 |
| Q4 | Mobile scrolling jank | Inventory all ScrollView/FlatList/nested scroll surfaces | t04 |
| Q5 | Logo overlap + footer competing mark | Verify commits e6b52fa/acef177 actually consolidated; audit all brand seats | t05 |
| Q6 | Authenticated web pages reorganization | Full route inventory + per-page audit | t06 |
| Q7 | Backend/API audit (permissions, health, error contracts) | Read-only audit | t07 |

## Queue

- [x] t01 — fix(mobile): settings ConfirmSheet mounting (Q1)
- [x] t02 — audit(mobile): worklet closure sweep + role journey verification (Q2)
- [x] t03 — fix(mobile): connectivity state machine honesty (Q3)
- [x] t04 — fix(mobile): scroll experience pass (Q4)
- [x] t05 — verify/fix(brand): canonical logo + footer (Q5)
- [x] t06 — improve(web): authenticated experience pass (Q6)
- [x] t07 — audit(backend): permissions + API contract spot-audit (Q7)

Tasks are created as `docs/redesign/r341/tasks/tNN-*.md` when staffed.
One worktree per task: `/home/z/wt/tNN`, branch `wip/tNN` (r341 law).

## Round state (2026-11-13, close of wave 2)

All seven tasks staffed, implemented, lead-reviewed, merged into
`wip/r341-integration`, and lead-verified (see HANDOFF.md for the full
gate record). Integration PR: ahmadmedo1012/ulara#1. Mobile workflow
(incl. android-smoke five-role emulator journey) dispatched on the
branch for journey-level evidence before merge.

## Round closure (2026-11-13, iteration 3 — the r342 lead records it)

R341 is **CLOSED** — the last open acceptance item (the Android runtime
verdict for the 28df896 root-provider fix, pending at iteration-2 doc
time) landed:

- **Mobile run 43465697203** (dispatched on `wip/r341-integration` @
  `28df896`, completed 2026-11-13T17:24:14Z): **ALL JOBS PASS** —
  mobile-gates ✓, android-smoke (emulator · five-role journey · logcat
  gate) ✓ — the full sequence every role survived: login → dashboard →
  three tabs → settings deep-link → **scroll to «تسجيل الخروج» → the
  ConfirmSheet «خروج» → confirmed → back at /auth** — crash gate clean.
  This is the empirical post-fix runtime evidence the iteration-2
  record was waiting for.
- Follow-up r342 work (the mission's next round) rides the same
  integration line: `docs/redesign/r342/` — see its QUEUE/HANDOFF.

Verification classification (the honest matrix, §2.4 of the mission):

| Level | Result |
|---|---|
| Source contract (t01 mounting test) | PASS |
| Jest rendering (mocked natives) | PASS |
| Android emulator runtime (release APK, five roles) | **PASS — run 43465697203** |
| Android release-variant behavior | PASS (the smoke APK IS a release-variant build with a throwaway keystore; store-signing behavior lives in android-apk.yml's own lanes) |
| Physical Android device | NOT TESTED |
| iOS runtime | BLOCKED (no simulator/device in the fleet) |
| Physical iPhone | NOT TESTED |

