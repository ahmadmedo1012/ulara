# r351 N0 — NATIVE_AUDIT (the RN-web proxy measurement)

Sandbox: no iOS simulator / Android emulator ( Expo MCP sim tools absent).
`device-UNVERIFIED`: all on-device rendering, haptics, native transitions,
safe-area insets under the real OS chrome.

**Instrument** (committed): `apps/mobile/scripts/capture-web.mjs` —
`expo export --platform web` → static server → Playwright at 390×844 +
820×1180, mobile session seeded (`ula-mobile-user` +
`ula-mobile-active-institution` in localStorage — AsyncStorage's web seat),
API mocked. Two passes:

- **Pass A (committed instrument, minimal fixtures)**: 46 cells, 0 errors,
  0 horizontal overflow. JSON: `capture-web.json`.
- **Pass B (web corpus-backed, temp spec)**: the same backend fixtures the
  web e2e suite rides — populated dashboards. Findings below.

## Measured (390px, populated corpus)

| role | screen | words | overflowX | verdict |
|---|---|---|---|---|
| ADMIN | dashboard | **136** | 0 | data-bound (metric labels + papers peek + ledger rows) — the one explanatory hint cut (r351 N4) |
| ADMIN | reports | **136** | 0 | data-bound (honest-JSON ledger of the reports payload) — copy already lean |
| STUDENT | results | **95** | 0 | data-bound (course cards + breakdown ledgers); kicker cut 9→4 words |
| QUALITY | engagement | **92** | 0 | data-bound (attendance/videos/enrollment ledgers); copy already lean |
| STUDENT | dashboard | 64 | 0 | OK |
| STUDENT | ai | 64 | 0 | OK |
| STUDENT | matrix | 65 | 0 | OK |
| STUDENT | courses | 42 | 0 | OK |
| TEACHER | students | 25 | 0 | OK |
| TEACHER | grades | 39 | 0 | OK |
| TEACHER | attendance | 6 | 0 | OK |
| OWNER | governance | 29 | 0 | OK |
| ADMIN | faculties/teachers | 22–26 | 0 | OK |
| QUALITY | dashboard/courses | 18 | 0 | OK |

## Verdicts per work package

- **N4 (copy cut)**: ZERO screens carry >80 words of EXPLANATION — the
  >80-word screens are data-bound (meaningful statuses, the §9 law's own
  exception). The r350 sweep's ~40-screen cut holds; r351 adds the admin
  hero-hint + results-kicker cuts. `NOT MEASURED`: populated-state word
  counts beyond the corpus's data volume.
- **N1 (design language)**: the paper/ink/sienna system, hairlines, mono
  micro-labels are r350-era and hold. r351 adds the **boot sequence**
  (`BootStrip`: mono counter 0→100% on the ds ease + the mark's own
  X/Y coordinate readout, ≤1.2s, warm-start skip, reduced-motion static,
  4 new pins).
- **N2 (motion)**: staggered entrances (`useStaggerEntrance`) + PressableScale
  + the ONE loader vocabulary (BootMark converging) already ship; the r351
  audit found no measured gap on the captured screens (RN-web cannot show
  the native threads — `device-UNVERIFIED`).
- **N3 (navigation)**: audited at r350 — route names unchanged (deep links
  are contract), zero needless merges found; unchanged.
- **N5 (forms/lists/states)**: r350's DataList/ChipGroup/empty/error
  unification holds across the captured screens (0 error states in the
  corpus pass, skeletons observed in pass A).

## What RN-web cannot show (`NOT MEASURED` on device)

Native haptics, safe-area insets under real notches, Android edge-to-edge +
predictive back, iOS sheet physics, the 60fps UI-thread character of the
reanimated/Animated work, the NATIVE splash → BootStrip cross-fade timing.
