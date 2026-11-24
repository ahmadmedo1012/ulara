# r359 A4 — Mobile native patterns (the round's pattern study)

Branch `r359/a4-mobile-backend`. The native half of this round shipped the
notification-preferences seat + push client reconciliation and refreshed the
mobile docs. This file is the pattern study behind those surfaces: which
native-app patterns ULARA mobile commits to, and how each maps onto the ds
visual language. Read with `LEDGER.md` (work packages) and
`apps/mobile/docs/feature-parity.md` (per-feature status).

**Applied this round:** the settings `[06] الإشعارات` group is the study's
direct artifact — Notion's grouped-ledger settings seating, Revolut's
optimistic toggles, Apple's Switch + 44px floor, the reference's royal-track
discipline (one accent on the ON state, hairline ledger rows, `[06]` mono
index), and Google's outcome-mapped haptics + queued toast on failure.

## 1. What we studied

One line per source — the pattern adopted, nothing else imported:

- **Duolingo** — gamification without carnival: XP counters, tier orbs and
  streak-style stats stay ink-on-paper (`CountUp`, `KpiCard`, `tierColors`);
  progress celebrates through number and weight, never confetti.
- **Notion** — settings as quiet grouped ledgers: one control per row, muted
  group headers, no boxed one-per-setting cards (the r341 settings regroup;
  this round's `[06] الإشعارات` seat follows the same rhythm).
- **Revolut** — toggles answer instantly: optimistic flips confirmed by the
  server, rollback + toast on failure (r359 preference switches; social
  likes; grade saves). A spinner-then-flip toggle reads as broken.
- **Airbnb** — skeleton-first, never blank: every wait shows the shape of the
  content it becomes, and every empty state explains why it is empty and what
  will fill it.
- **Apple first-party (HIG)** — large titles that collapse into a compact bar
  (`LargeTitleScreen`), safe-area discipline at every shell edge, 44pt touch
  floors, `Switch` for boolean preferences, sheets that rise from the bottom
  edge and never ride scroll content.
- **Google first-party (Material guidance)** — pull-to-refresh wherever a
  list can be stale, ONE visible snackbar with the rest queued (the toast
  queue), error states that always carry recovery, haptics mapped to
  outcomes rather than to every pixel.

## 2. Patterns adopted

| Pattern | Where it lives |
|---|---|
| Tab bar with active indicator + badge | `components/shell/TabBar.tsx` — one royal dot springs to the active tab; the unread badge pops with `useUnreadCount` |
| Large-title collapsing headers | `components/shell/LargeTitleScreen.tsx` — mono kicker + h1 in scroll content, compact-bar seat crossfades; UI-thread only |
| Pull-to-refresh everywhere | `Refreshable` / `DataList` / `LargeTitleScreen` — one accent tint app-wide |
| Optimistic mutations with rollback | `useMutation` + `qc.setQueryData`: social likes, teacher grades, r359 notification preferences (field-scoped rollback — a failed toggle never clobbers a concurrent one) |
| Skeleton-first, never blank | `Skeleton` / `SkeletonList` on every first load; `DataList` tri-state (skeleton → error+retry → empty) |
| Empty states with illustration | `EmptyState` + the four blueprint rooms (`brand/plan/*`): exam hall, library, lecture hall, building |
| Error boundaries with recovery | `components/ErrorBoundary.tsx` (root + per role): Arabic fallback, retry/exit, reports to `/client-errors` |
| Offline banner | `OfflineBanner` + `lib/resilience/*`: cached reads, writes blocked honestly |
| Haptics on key actions | `src/haptics.ts` — ONE gated, throttled door (kill-switch, per-kind cooldowns, platform honesty); selection ticks on controls, outcome notifications on mutations |
| Bottom sheets | `components/ui/sheet.tsx` (@gorhom/bottom-sheet v5, lazily mounted): confirmations, option pickers, composers — always a sibling of the scroller, never scroll content |
| 44px touch floors | `touchFloor` token (44): `Button`, `IconButton`, `Segmented` segments, `LedgerRow` (48); the r359 preference `Switch` rides a 44px `Pressable` wrapper because the native frame is ~31px tall |
| Safe areas | `react-native-safe-area-context` insets at every shell edge: top bar, tab bar (home indicator), stacked screens |

## 3. The reference's visual language → mobile components

The retired reference site's grammar (DESIGN.md §0–§1 — paper grounds, ink
hierarchy, hairlines, radius 0, zero shadows, mono drafting labels, ONE royal
signal) maps onto the mobile kit with no mobile-only dialect:

| Reference value | Mobile seat |
|---|---|
| Warm paper grounds, graphite ink | the generated palette (`ds.light/dark`, from `shared/design-tokens.json`) behind every component — never raw hex in screens |
| Ink hierarchy via weight + size | `T` (variants + weight ramp; Arabic has no uppercase, so weight carries hierarchy — no letter-spacing) |
| Mono bracketed micro-labels `[01]` | `MonoLabel` — settings group headers ([01]…[06]), screen kickers, drafting metadata rows |
| Hairlines, radius 0, zero shadows | `Hairline`, `RowList`/`LedgerRow` (`StyleSheet.hairlineWidth` separators), `Card` = surface + hairline frame, flat by construction |
| One royal signal, spent with restraint | `p.accent` on: the active tab dot + filled icon, `Segmented`'s active slab, the primary `Button`, the preference `Switch` track when ON — never on passive text, never decoration |
| Fields as ruled instruments | `Field`/`SecretField` — hairline inputs that focus to ink, errors in the rose family (never the royal); `SelectField` rows open bottom sheets |
| The precision voice (counters, metadata) | `CountUp` numerals, `StatLine` label·value rows, `KpiCard` hairline slabs |

## 4. Motion character

Two registers, deliberately split (the `motion/presets.ts` contract: springs
for interaction, timings for state):

- **Native interaction physics — springs.** Anything the user's finger owns:
  press feedback (`PressableScale`, the snappy spring), the tab indicator
  dot, badge pop, sheet drag and settle, the immersive tab-bar hide.
  Physical parameters (mass/damping/stiffness) — the feel must not change
  with travel distance.
- **The reference's precision character — timed reveals.** Anything the
  system reveals: entrances and staggers (`motion/entrance.ts`, 240ms rhythm
  + 60ms steps on the single ds curve), counters (`CountUp`, 650ms), the
  skeleton shimmer, the large-title collapse crossfade. Timed, exact, calm —
  the drafting-instrument voice, not the casino voice.

Both registers degrade under reduced motion (`useReduceMotion`): springs →
instant, reveals → opacity-only or static; entrances are additionally gated
off on software-rendered emulators (the android-smoke forensics — delayed
enterings strand content at opacity 0 there).

## 5. Verified vs to-verify

**Verified in this sandbox (jest, 52 suites / 1434 tests green; typecheck +
lint clean; contract-check / api:types / tokens zero drift):** component
contracts (tab-dot offset math, LargeTitleScreen rest state, CountUp worklet
discipline, sheet host mounting order, toast queue), every route mounting
under every transport-failure mode (render + poisoned nets), the r359
preference group's optimistic/rollback path, the Switch a11y contract
(single switch role per row, testIDs `pref-push-*` / `pref-email-digest`).

**To verify on a real device (no native device in this sandbox):** spring
feel (dot travel, sheet detents, PressableScale), the large-title collapse
across its full scroll range, Switch touch targets + RTL placement at 200%
font scale, haptic intensities per platform, safe-area behavior on
notched/cutout layouts, and the preference toggles against the live API
(routes exist; LIVE push itself stays behind the owner's Expo project id —
see `apps/mobile/docs/feature-parity.md` §1).
