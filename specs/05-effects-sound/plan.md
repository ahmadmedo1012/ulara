# Plan 05: effects + sound

## Constitution check
- The ruling wins over the reference: no mascot on public pages;
  celebration confirms recorded events only; sound is opt-in.
- Zero-trace; visual test first (recordings/sheets shown failing).
- Floors per README; motion-tokens gate is the hard wall.
- Scope: `frontend/src/components/{gamification,ui}/`, a new
  `effects/` home, Settings (the sound opt-in), apps/mobile mirrors
  where the platform allows.

## Technical approach
- `frontend/src/components/effects/`: `Celebrate.tsx`, `Shimmer.tsx`,
  `usePressSpring`, `Mascot.tsx` moved here from the landing tree
  (public tree keeps none of it).
- Sound: `sounds/` lazily imported after the Settings opt-in; a tiny
  `useSound` hook that is a no-op until enabled; the toggle lives in
  Settings and persists.
- Swap slices 01–03 placeholders to `Shimmer` (mechanical sweep).

## Files in scope
- New `frontend/src/components/effects/*`; `Mascot.tsx` relocated;
  Settings sound toggle; `apps/mobile` mirrors for celebrate/springs.

## Rules to change (with reason)
- Mascot leaves the public component tree entirely (the ruling said
  "stays in the tree for in-product empty states"; relocating it to
  `effects/` makes that physically true).

## Capture/compare harness
- Frame sequences (`ffmpeg -vf fps=12`) for celebrate/springs; stills
  for shimmer/mascot; evidence/05-effects/.

## Research notes
- specs/00 §6 (the 29-keyframe catalogue and which feelings to keep),
  §5 (the sound-toggle contract).
