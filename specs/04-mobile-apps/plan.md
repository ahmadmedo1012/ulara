# Plan 04: the mobile apps

## Constitution check
- Reference wins within app idiom: native navigation patterns stay;
  the world's shape, type, colour and icons arrive whole.
- Zero-trace; visual test first (failing device captures before code).
- Floors per README, adapted: app typecheck + tests + tokens:check.
- Arabic-first RTL, both themes.
- Scope: `apps/mobile/src/design/*`, `apps/mobile/src/components/ui/*`,
  splash/boot assets, the gamification views. No screen re-composition,
  no backend work.

## Technical approach
- Fonts: bundle the woff2/ttf subsets the repo already vendors for
  web; wire through the app's font loading; remove retired faces.
- Skin pass component by component in `components/ui/*` reading the
  generated tokens only (no hard-coded values; the raw-value gate
  applies in spirit; record any necessary exception with a reason).
- Icon port: map the 46 glyphs to the app's icon component API; keep
  names identical to web so docs and audits stay single-source.
- Gamification views read the same existing data contracts as web.

## Files in scope
- `apps/mobile/src/design/*`, `apps/mobile/src/components/ui/*`,
  splash/boot config and assets, the gamification screens.

## Rules to change (with reason)
- None expected; platform-required deviations (e.g. splash plate
  rules) recorded here with a one-line reason.

## Capture/compare harness
- Device-frame captures (iOS + Android where runnable) scripted into
  evidence/04-mobile/; comparison is consistency with the web world,
  not pixel fidelity to the reference (which has no native app page).

## Research notes
- specs/00 §1 palette, §2 type, §6 motion; LEDGER P6 note (tokens
  consumed, screens not re-composed).
