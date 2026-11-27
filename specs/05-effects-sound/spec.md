# Feature Spec 05: effects + sound (LEDGER slice E)

Status: Clarified by study. Source of truth: the study (specs/00 §6
motion, §5 sound toggle), the landed finish layer, the LEDGER's E
line.

## What ships

The last layer of life, in the product's measured voice:

- **Mascot idle/blink (in-product only).** The star character stays
  OFF the public surface (the ruling); inside the product it may
  appear in empty states with a slow idle and an occasional blink,
  never during tasks, never in flows that grade or record.
- **`<Celebrate/>`.** One shared celebration component for real
  achievements the app already records (level up, streak milestone,
  goal reached): a short, once-only moment using the `+N` rise line
  and the halo/pulse grammar; reduced-motion renders it as a static
  line of text; it never fires for invented events.
- **Press springs.** Buttons, chips and cards answer presses with the
  token's overshoot curve at small scale (≤ ±4px / 1.02 scale), web
  and app.
- **Shimmer skeletons.** One shimmer component in world shapes
  replacing every ad-hoc placeholder from slices 01–03.
- **UI sounds, OFF by default.** A small sound set (tap, confirm,
  milestone) behind a Settings opt-in, mirroring the reference's
  contract: default silent, one toggle, remembered, never autoplay
  with sound, muted entirely under reduced-motion or data-saver.

## Measured facts to honour

- Motion durations/eases from tokens only; the check:motion-tokens
  gate stays green; no raw cubic-beziers in sheets.
- Celebration length ≤ 1.2s; idle loop slow (≥ 3s) and transform-only.
- Sound files tiny (≤ ~20 KB each), lazily loaded only after opt-in.

## States and a11y

- Every effect has a reduced-motion static form; every sound has
  silence; `<Celebrate/>` announces once on a polite live region and
  never steals focus.

## Acceptance

- Sheets/recordings: celebrate firing on a real event, mascot idle in
  an empty state, press spring, shimmer, in light and dark; critique
  lines.
- Gates: motion tokens, raw CSS, bundle (sound assets lazily chunked),
  zero console errors; reduced-motion sweep shows static forms.
