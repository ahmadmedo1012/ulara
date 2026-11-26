# r369 — LEDGER

One line per landed piece. The `NEXT:` line at the bottom is the
resume pointer — update it whenever work stops mid-flight.

## Landed

1. `shared/design-tokens.json` — full r369 re-key: cream/indigo/amber brand,
   warm ramp (light + indigo night), 10 tint families re-valued
   (violet/teal/coral/sky/leaf/royal/rose/amber-warning/dormant), 43 semantic
   seats both themes, radius ladder 8→36+pill, springy motion
   (one overshoot curve, 120/220/380/520/700), mobile type ladder raised.
2. `npm run tokens:build` — PASS (10 triads · 43 seats · both themes ·
   brand geometry byte-identical web ↔ RN). `tokens.generated.css` +
   `apps/mobile/src/design/tokens.generated.ts` regenerated.
3. `frontend/src/styles/tokens/tokens.css` — hand sheet re-keyed: Readex Pro
   body / Baloo Bhaijaan 2 display stacks; display ladder
   `d1 38→118 · d2 32→92 · d3 22→36 · st 28→56`; app ladder calmed
   (28→48); body 16→18; Arabic leading floors 1.12/1.16/1.28;
   `--fw-black 800` real; `--ease-out` non-overshoot decel added; soft
   shadow ladder + `--shadow-signal` (amber reward glow); `--elev-1..5`
   restored; 21 sheets' hard-coded `border-radius: 0` swept to `--r-md`.
4. `frontend/src/styles/fonts.css` — 18 @font-face rules: Baloo Bhaijaan 2
   (400/600/700/800) + Readex Pro (400/500/600/700), arabic+latin subsets,
   `font-display: swap`; Geist Mono kept for tabular numerals only.
   Alexandria / IBM Plex Sans Arabic / IBM Plex Mono deleted from
   `public/fonts`.
5. `frontend/index.html` — boot plate + `theme-color` metas re-pinned to
   `#FBF6EC` / `#14122B`; preloads re-pinned to the new LCP faces
   (Readex 400 arabic + Baloo 800 arabic).
6. `frontend/tests/unit/assets.test.ts` — face count 16 → 18 and the
   preload pins updated with the reason (the old pins encoded the retired
   font families).
7. `frontend/src/styles/world.css` — NEW shape/voice layer (overrides
   layer, imported last): 22px cards + soft double shadow, pill `.btn`
   with the inset-outline secondary, 14px fields + amber focus halo, pill
   chips/badges, rounded clipped tables with a tinted header band, pill
   nav rows with an `accent-soft` active state, bottom-sheet corners on
   phones, pill progress tracks, 3px focus ring.
8. `frontend/src/main.tsx` — `world.css` imported after `polish.css`.
9. `frontend/src/components/landing/r369/Mascot.tsx` — NEW original mascot
   «نجّوم», six poses, token colours, `useId` gradient, decorative by default.
10. `frontend/src/components/landing/r369/index.tsx` — the whole public
    story: nav (desktop + mobile), hero with a composed phone mockup,
    marquee, five numbered bands (stars/progress/rewards/habits/levels),
    roles, FAQ (native details/summary), CTA, footer, star jar (scroll
    counter), star-burst preloader.
11. `frontend/src/styles/landing/r369.css` — ONE sheet for that surface
    (warm washes, huge display type with the amber word + hand-drawn
    underline, soft cards, pill actions, marquee, phone mockup, streak
    row, 20-level grid, FAQ, CTA, footer, star jar, preloader, full
    reduced-motion end-states).
12. `frontend/src/pages/LandingPage.tsx` — rewritten composer: guest gate,
    intro gate (session flag preserved for the e2e fixtures), theme sync,
    skip link, funnel 5 register / 5 login intact.
13. `DESIGN.md` — new r369 canon installed at the top as the authority;
    older sections demoted to era history.

## Verified in this session

- `npm run tokens:build` → PASS, no drift.
- `tsc -b frontend` ran clean on the token/type changes (before the new
  landing files existed).
- `scripts/check-colors.sh` / `check-raw-css.sh` / `check-icons.sh` were
  READ but not run to green in this session — see "Not done".

## Not done (honest gaps)

- The retired landing tree (`components/landing/{hero,journey,chrome,cursor,plates,kernel,patterns,sections}`, `styles/landing/*` minus `r369.css`)
  is still on disk. It is no longer imported by `/`; deleting it is the
  cleanup batch (P7) and needs its own gate pass.
- Inner public pages and the logged-in product still carry their own
  section-level CSS; they inherit palette/type/shape from the tokens and
  `world.css` but were not individually re-composed.
- Gamification screens in the product (XP panel, streak widget, badge
  grid) are not wired — the landing presents the story, the product has
  the existing achievements/mastery/leaderboard surfaces. No endpoint was
  invented. This needs an owner decision on the achievement model.
- Sound (P5) not landed; the off-by-default contract is recorded in
  `PLAN.md`.
- Mobile (P6) consumes the regenerated token file only; its screens were
  not re-composed and no build was dispatched.
- The zero-trace gate was NOT extended with the inspiration's
  name/domain/maker: the brief does not state them and guessing a name to
  blocklist would be worse than leaving it out. **Owner decision needed.**
- Baselines (surface / a11y / stylelint ratchet / deadcode) were not
  regenerated — they are part of P7 and must follow the cleanup, not
  precede it.

NEXT: finish `npm ci`, run `tsc -b` + `vite build` + the three design
gates, fix what they find, then commit and push the foundation+landing
batch.
