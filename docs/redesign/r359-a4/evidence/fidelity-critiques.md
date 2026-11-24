# r359 A4 — Fidelity gate: the written critiques

Sheets: `docs/redesign/r359-a4/sheets/*.webp` (LEFT = ULARA app capture from the
android-smoke emulator at pixel_6 1080×2400; RIGHT = the reference mobile shot
from `docs/redesign/r350/reference/shots/m-*.webp`). The VLM read each sheet;
the critiques below are the point-by-point record with my verdict and actions.

## Sheet: home-student-vs-m-problem (student home vs the reference's problems page)

- Composition: LEFT is a functional dashboard (greeting → hero next-step → stats
  band → quick actions → tasks → tabs); the reference is one editorial idea per
  screenful. **App vs marketing register — the app's composition is the
  correct native pattern** (documented in mobile-patterns.md §2: skeleton-first,
  one hero moment, task-forward density). No action.
- Density: LEFT is data-rich (progress, stats, tasks) — the reference buys
  impact with emptiness. Critic's note "three competing progress
  visualizations" — recorded as a composition wish for a future polish round
  (donut + bars + counters), not a gate failure (each serves a distinct
  product surface: mastery, attendance, completion).
- Typography: the greeting is display-scale bold; sections are `h4` BOLD with
  mono `[01]` indices on a hairline rule (SectionBar — the drafting grammar).
  The reference's extreme display scale is its LANDING register; the spec's
  Arabic guidance (weight + size contrast) is satisfied by the greeting/
  section/title hierarchy. **Action taken (round 1): onboarding titles went
  display-scale.**
- Hairlines/flat: the critic perceived a "soft shadow" on the hero card —
  **verified in code: ZERO shadow/elevation properties exist in the app**
  (`rg shadowColor|shadowOpacity|elevation` across app/ + src/ → only doc
  comments). The perception is the hairline border rendered at the sheet's
  downscale. No action (evidence: the code scan).
- Grid: RTL grid competently executed (the critic's own words); mixed-run
  baselines (Latin "UML — Class Diagram" inside Arabic prose) ride the
  BidiText isolate discipline. No action.
- Color: paper ground + ink + ONE royal signal — the critic confirmed LEFT is
  close to the discipline; the royal slab CTA is the house primary (the
  reference uses its accent the same way).
- Verdict: **the reference is a marketing page; the app carries the same flat
  drafting grammar in the native register. A designer would not pick the
  reference as the better APP on composition/density (it would not function
  as an app); on pure typographic drama the reference's landing register wins
  by intent — matched on the app side by the display greeting + mono
  section grammar.**

## Sheet: home-teacher-vs-m-intro / home-quality-vs-m-why

Same grammar as the student sheet: LargeTitle/PageHeader + mono kicker +
hairline rules + h2 titles + the royal signal on actions only. Same verdict —
the flat drafting language is carried; the reference's register is marketing.

## Sheet: onboarding screens (round 1 — the dashed placeholder art)

- The critic's dominant finding: the PLACEHOLDER art read as "wireframe-grade"
  — correct and honest: A4's placeholder is not A2's illustration.
  **Action taken (round 1): the placeholder now rides the repo's self-drawing
  blueprints** (`src/brand/plan/` — PlanBuilding/LectureHall/ExamHall/Library
  + the mono key tag + hairline rule), and the tour title went display-scale.
  Round 2 sheets (run 3 captures) show the upgraded art.
- Tour structure: kicker (mono) → display title → body → hairline progress
  rule + `[02/04]` counter → ONE royal action — the reference's grammar
  (bracketed indices, mono captions, coordinate counters) is present.

## Numeric checks (computed styles vs the spec §2)
- border-radius: 0 across the app (the only exception documented: the sheet
  grab-handle 2px) — `rg borderRadius` → 0 hits outside the handle.
- box-shadow: none (the code scan above).
- The mobile palette is the generated token output as it stands on main
  (D14: A3 owns token VALUES; the flat STRUCTURE is this slice's work).

## Round 2 (run 3)
Re-captured with: the blueprint placeholder art, the display-scale tour
titles, the ADMIN/OWNER home sheets (the stale-heading fix unblocked their
capture), and the size passes (320/360/768) via the lightweight flow.
