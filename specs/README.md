# r369 Spec Kit: the remaining rounds of «عالم أُلارا الدافئ»

Status: PLANNED, awaiting the owner's start signal. Nothing here is
implemented by this tree. Branch: `r369/new-identity` at `4382dd8`.
No merge, no push to main, no deploy until the owner says go.

This tree is the complete planning set for the work the r369 LEDGER
lists as NEXT (slices B through G), drawn after a full study of the
branch and of the reference `https://sparkle.ankatms.com` (scroll
method, patterns, shapes, motion, interactions, menus, everything).

## How to read this tree

Each numbered directory is one feature slice in the execution order
the LEDGER already fixed. Inside each:

- `spec.md` — what ships, what a visitor/user sees, measured facts,
  states, acceptance.
- `plan.md` — constitution check, technical approach, files in scope,
  capture/compare harness, phone/tablet strategy, research notes.
- `tasks.md` — ordered, checkboxed tasks; visual test first, then
  [P] slices, then the re-capture/critique loop.

`00-reference-study/research.md` is the shared grounding every slice
cites. It is the study the owner asked for: the reference taken apart
piece by piece, measured live, and mapped onto ULARA's ruling
(university voice, no character, mastery points).

## The constitution every slice inherits

Carried from the r368 harness and the r369 LEDGER; each plan.md lists
only what it adds or changes.

1. **Reference wins.** Where a standing rule blocks a reference-faithful
   result, change the rule with a one-line reason recorded in plan.md.
   The owner's maturity ruling (LEDGER `r369-mat`) is itself a rule
   change of this kind and outranks the reference where they disagree:
   no mascot on the public surface, no «نجوم» vocabulary, no confetti.
2. **Zero-trace.** Only "the reference" / "the inspiration" in any
   artifact. `bash scripts/brand/zero-trace.sh` before each commit.
   The reference's name is never written into the tree; the owner
   supplies it at close-out (slice 06).
3. **Visual test first.** Capture/compare sheet written and shown
   failing before the slice's code. Side-by-side sheets land in
   `docs/redesign/r369/evidence/<slice>/`.
4. **Floors.** `tsc` clean, behaviour tests green, `tokens:check`,
   `check:raw-css`, `check:colors --strict`, `check:motion-tokens`,
   `check:icons`, `check:csp-hash`, stylelint 0 errors, bundle
   ≤ 832 KB gz (current: 827.6), overlap audit 0 findings at
   7 widths × 2 themes, one global focus ring, reduced-motion fallbacks,
   44px hit floor on every interactive control.
5. **Arabic-first.** RTL, light and dark, phones composed not scaled,
   Arabic diacritics never clipped (h1 leading floor 1.02, section head
   1.06), one emphasised word per heading by colour + hand-drawn
   underline, never italics.
6. **Honest surface.** Every interactive number is real state with a
   text readout, not only colour. No gamification claim the platform
   does not compute. The unit is نقطة إتقان (`xp`), one name for one
   thing.
7. **Scope.** Public site, product shell, role pages, mobile design
   layer, effects. No new backend endpoints; gamification reads
   existing data only.

## The slices

| # | slice | LEDGER letter | what it closes |
|---|---|---|---|
| 00 | reference study | (grounding) | the shared measured truth |
| 01 | inner public pages | B | the 14 public routes on templates T1–T5 with real loading/empty/error states |
| 02 | product shell | C (part 1) | rail, top bar, mobile bar + More sheet, palette, notifications |
| 03 | role pages + gamification | C (part 2) | every role family re-shaped; XP/streak/levels wired to existing data |
| 04 | mobile apps | D | tokens, fonts, splash, ui re-skin, icon port, level/streak/badge views |
| 05 | effects + sound | E | mascot idle/blink (in-product only), `<Celebrate/>`, press springs, shimmer skeletons, sounds OFF by default |
| 06 | close-out + PR | F + G | zero-trace name, dead-code sweep, baselines, gate sweep, Lighthouse, docs, PR ready-not-merged |

## What is already landed (do not re-spec)

Phase 1–3 and the maturity pass: tokens + fonts (Baloo Bhaijaan 2 /
Readex Pro), `world.css` shape layer, the landing's numbered story
with the five-stage navigator, the interactive bands 02–08, the
section index, the finish layer, the instruments
(`capture.mjs` / `audit.mjs` / `verify.mjs` / `measure*.mjs`).
Verified state is in `docs/redesign/r369/LEDGER.md`.

## Open questions already resolved by study (none blocking)

- Templates T1–T5 were named in the LEDGER without definitions.
  Slice 01 fixes the definitions; see its spec.md §Templates.
- The LEDGER says "13 public pages" but lists 14 routes. Slice 01
  specs all 14; if the owner meant to exclude one, strike its section
  before the start signal, the tasks do not change shape.
- WebKit/iPhone e2e could not run locally under r368 (no webkit
  browser); slice 06 carries the Lighthouse + device pass and flags
  what stays unverified.
