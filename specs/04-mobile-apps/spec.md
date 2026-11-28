# Feature Spec 04: the mobile apps (LEDGER slice D)

Status: Clarified by study. Source of truth: the study (specs/00),
`apps/mobile/src/design/*` (tokens.generated.ts already regenerated),
`apps/mobile/src/components/ui/*`.

## What a user feels on the phone

The apps open into the same warm world: cream/night grounds from the
regenerated tokens, Baloo Bhaijaan 2 display and Readex Pro body,
22px cards, pill actions, the duotone icon language, and one amber
reward signal. The splash, the empty states and the gamification views
(level, streak, badges) carry the identity deliberately; the working
screens stay calm and dense.

## The pieces

- **Tokens + fonts.** Consume `tokens.generated.ts` (already emitted);
  ship the two font families in the app bundles with the same
  arabic+latin subsets; delete the retired faces.
- **Splash + boot.** The boot plate re-pinned to the new ground and
  the new display face; app icons/splash per platform rules.
- **UI re-skin.** `components/ui/*` re-shaped: buttons pill with the
  inset-outline secondary, cards 22px with the soft shadow, fields
  14px, chips pill, sheets bottom-rounded, focus/pressed states from
  the motion tokens (the springy overshoot for presses).
- **Icon port.** The 46 duotone glyphs ported to the app's icon
  component (one grid, same names), replacing legacy marks.
- **Gamification views.** Level ladder (the generated 20 badges),
  streak week, and the نقاط إتقان readouts rendered from the same
  existing data the web reads; university voice.

## Measured facts to honour

- Same token values as web (the generated file is the contract;
  `tokens:check` guards drift).
- Hit areas ≥ 44px; type floors as the app already holds; leading
  floors so Arabic ascenders/diacritics never clip.

## States and motion

- Loading shimmer, honest empty states, retry errors, in app idiom.
- Press springs from motion tokens; reduced-motion honoured through
  the OS setting.

## Honesty gates

- Same rule as web: gamification numbers only from existing data;
  nothing mocked. Screens not re-composed beyond the skin (LEDGER);
  where a screen begs for composition, note it in the ledger as a
  follow-up instead of expanding scope.

## Acceptance

- Side-by-side captures (device frames) of: splash, one auth screen,
  one dashboard, one list, gamification views, in light and dark,
  Arabic RTL, with critique lines.
- `tokens:check` green; app typecheck/tests green; icon inventory
  complete (no legacy mark left).
