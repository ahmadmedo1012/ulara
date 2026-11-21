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

> **r351 session-2 correction (instrument bug found + fixed):** the first
> pass navigated the dashboard cells to the group root `/<role>/`, which
> the exported web bundle resolves to the manifest's first match — for
> STUDENT that was `/student/ai` (the alphabetically first file), so the
> "dashboard" rows below were silently the AI screen (byte-identical
> PNGs under two names; the old admin "dashboard 136" was actually
> reports). The committed instrument now navigates the EXPLICIT tab path
> (`/<role>/dashboard` — the deep-link contract). The re-measure below
> is what the dashboards actually render (minimal fixtures = the static
> copy + empty states, i.e. exactly the N4 surface).

| role | screen | words (before → after N2/N4) | overflowX | verdict |
|---|---|---|---|---|
| STUDENT | dashboard | 26 | 0 | the collapsing-title hero (greeting + institution kicker); calm |
| TEACHER | dashboard | 130 → **78** (−40%) | 0 | 5 empty-state explainer sentences + the chart subline cut; titles + CTAs kept |
| ADMIN | dashboard | 51 | 0 | lean (the explainer subtitle retired with the large title) |
| QUALITY | dashboard | 12 | 0 | lean («قراءة فقط» rides as the mono kicker) |
| OWNER | dashboard | 89 → **37** (−58%) | 0 | 7 menu explainer sublines + the footer hint paragraph cut |
| ADMIN | reports | **136** | 0 | data-bound (honest-JSON ledger of the reports payload) — copy already lean |
| STUDENT | results | **95** | 0 | data-bound (course cards + breakdown ledgers); kicker cut 9→4 words |
| QUALITY | engagement | **92** | 0 | data-bound (attendance/videos/enrollment ledgers); copy already lean |
| STUDENT | ai | 64 | 0 | OK |
| STUDENT | matrix | 65 | 0 | OK |
| STUDENT | courses | 42 | 0 | OK |
| TEACHER | students | 25 | 0 | OK |
| TEACHER | grades | 39 | 0 | OK |
| TEACHER | attendance | 6 | 0 | OK |
| OWNER | governance | 29 | 0 | OK |
| ADMIN | faculties/teachers | 22–26 | 0 | OK |
| QUALITY | courses | 18 | 0 | OK |

**Final sweep state (46 cells, both viewports): 0 overflowX, 0 capture
errors, 0 screens above 80 words.**

## Verdicts per work package

- **N4 (copy cut)**: ZERO screens above 80 words remain (the corrected
  re-measure: teacher 130→78, owner 89→37; every cut listed in the table).
  The >80-word screens that remain data-bound (admin reports 136, student
  results 95, quality engagement 92) carry meaningful statuses — the §9
  law's own exception. `NOT MEASURED`: populated-state word counts beyond
  the corpus's data volume.
- **N1 (design language)**: the paper/ink/sienna system, hairlines, mono
  micro-labels are r350-era and hold. r351 adds the **boot sequence**
  (`BootStrip`: mono counter 0→100% on the ds ease + the mark's own
  X/Y coordinate readout, ≤1.2s, warm-start skip, reduced-motion static,
  4 new pins).
- **N2 (motion)**: staggered entrances (`useStaggerEntrance`) + PressableScale
  + the ONE loader vocabulary (BootMark converging) already shipped; r351
  session-2 adds the named missing piece — the **collapsing large-title
  header** (`LargeTitleScreen` + the AppTopBar crossfade seat, geometry in
  `shell/collapse.ts`): the large title (mono kicker + h1) scrolls with the
  content while the fixed bar's brand-word seat crossfades to the screen
  title (opacity-only; reduced-motion drops the drift). Applied to all five
  role dashboards. 10 new pins (rest state + pure clamp + the R336
  worklet-discipline source contract). The animated values themselves are
  UI-thread work — `device-UNVERIFIED` (RN-web cannot show the native
  threads).
- **N3 (navigation)**: audited at r350 — route names unchanged (deep links
  are contract), zero needless merges found; unchanged.
- **N5 (forms/lists/states)**: r350's DataList/ChipGroup/empty/error
  unification holds across the captured screens (0 error states in the
  corpus pass, skeletons observed in pass A).

## What RN-web cannot show (`NOT MEASURED` on device)

Native haptics, safe-area insets under real notches, Android edge-to-edge +
predictive back, iOS sheet physics, the 60fps UI-thread character of the
reanimated/Animated work, the NATIVE splash → BootStrip cross-fade timing.
