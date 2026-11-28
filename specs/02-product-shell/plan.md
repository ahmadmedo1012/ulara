# Plan 02: the product shell

## Constitution check
- Reference wins: shell chrome takes the landing's warm grammar; old
  shell sheets give way where they fight it.
- Zero-trace; visual test first (failing shell sheets before code).
- Floors per README; bundle stays ≤ 832 KB gz by retiring the sheets
  this replaces.
- Arabic-first RTL, both themes, phones composed.
- Scope: `frontend/src/components/layout/**`,
  `frontend/src/styles/{app,layout,components,patterns}/**` as they
  touch the shell; the role pages themselves are slice 03.

## Technical approach
- Re-shape, do not re-write: the shell keeps its component tree and
  behaviour; the world arrives through tokens plus one additive sheet
  `frontend/src/styles/shell-r369.css` for what tokens cannot reach
  (rail pill rows, sheet corners, palette rows). No new component
  names beyond `RailRow`, `MoreSheet`, `PointsChip` if extraction
  earns it.
- `PointsChip` reads the same store/selector the gamification page
  uses; it subscribes, it does not fetch anew.
- The More sheet reuses the landing dialog's focus-trap/Esc utility.

## Files in scope
- `frontend/src/components/layout/` (rail, top bar, mobile bar,
  palette, notifications).
- `frontend/src/styles/app.css`, `layout/`, `components/` shell
  sections; new `shell-r369.css`.
- Shared: the dialog/focus utility from the landing tree.

## Rules to change (with reason)
- None expected; if a role-page rule blocks a shell change, record it
  here with its one-line reason before touching it.

## Capture/compare harness
- `capture.mjs` against authenticated test accounts (one per role
  where the shell differs); sheets to evidence/02-shell/.
- Comparison target: the study's chrome grammar (§5), adapted; no
  pixel target exists (the reference has no logged-in product), so the
  critique judges consistency with the landing, not fidelity to a shot.

## Phone/tablet strategy
- Bottom bar at <768, More sheet bottom-anchored; collapsed rail
  768–1279; full rail ≥1280. Compose, do not scale.

## Research notes
- specs/00 §5 (chrome grammar), §6 (motion), §8 (honesty).
