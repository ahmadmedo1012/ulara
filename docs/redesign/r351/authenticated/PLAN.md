# r351 A2 — AUTHENTICATED WEB · PLAN

Branch `r351/authenticated-web` from `main`@`35793f7`. Slice A2: every post-login
web surface for every role (shell, sidebars, dialogs, skeletons). Owner goal:
match and surpass the reference's calm, hairline, mono-label, paper-white
language — with far less text.

## Work packages (in task order)

| WP | scope | status |
|---|---|---|
| Q0 | route-audit instrument + BASELINE.md + zero 501s (non-AI) | DONE (430 cells, 58 fixtures) |
| Q1 | shell: topbar ≤4 controls, single identity, sidebar tooltips, BottomNav ≤5, one overlay motion, FAB never covers content | DONE (controls 6→3, identity 2→1, FAB retired, 44px floors) |
| Q2 | hierarchy: one SectionHeader pattern, [0N] decision, bidi percent fix, tabular figures | DONE ([0N] retired; Num isolate; tabular verified) |
| Q3 | copy cut: ≥35% fewer words on >120-word screens, dashboards ≤180w | DONE for dashboards (180/177/180/173/165 frozen-clock) + university/vision (−35/−39%); partial on the long tail (settings −12%) — see HANDOFF |
| Q4 | one skeleton system (Skeleton/States/StripSkeletons/RouteProgress unified), CLS≈0 | DONE (Stage 1: PageSkeleton system unified) |
| Q5 | per-role polish to one grammar | PARTIAL (dashboards + the 44px row floor; the long tail rides Q3) — see HANDOFF |
| Q6 | small screens: 360–430 + 768/1024, no h-overflow, tap ≥44 | DONE (0 overflow @360–1440; 0 sub-44 on dashboards) |
| Q7 | route/nav organization | DEFERRED with reason (see note) |
| Q8 | a11y + r351-shell e2e pins | DONE (10/10 green; axe 19 ≤ floor S25/C0) |

## Q7 note
To be audited when Q7 starts: candidates for merging are near-duplicate hub
pages and deep-nested routes; every old path keeps a redirect (names are API
contract).

## Decisions (to be made once, then applied everywhere — logged here when made)

- **[0N] numerals**: DECIDED at Q2 — remove (teacher dashboard renders 02→01→03
  out of order; AI page 02,05,03 — sequential-in-DOM cannot be kept honest
  across filtered states; the reference uses no numbering, mono kickers carry
  the register).
- **Section header pattern**: `PageHeader` (h1) + `SectionHeader` (clearly
  subordinate, mono kicker optional, one hairline rule) in components/patterns.
- **Bidi**: numbers+units isolate via a `<bdi dir="ltr">` helper; percentages
  must render `100%`, never `%100`.
- **Skeletons**: ONE `Skeleton` primitive consumed by States/PageSkeleton/
  StripSkeletons; one shimmer; reduced-motion = static.

## Instruments (A2-owned)

- `scripts/e2e/route-audit.mjs` — full-matrix metrics (words, overflow, taps,
  501s, overlaps, runtime errors). Port 5302.
- `frontend/tests/e2e/r351-shell-chrome.e2e.ts` — pins: one identity, ≤4
  topbar controls, FAB non-overlap, tap floor, word budget, single h1.
