# r369 — LEDGER

One line per landed piece. The `## phase 2 — landed

- **S0 debt cleared**: the retired landing tree + 24 sheets + 8 orphan
  modules deleted; 10 look-pins retired; the contracts worth keeping
  (brand neutrality/integrity, truthfulness, legal nine-link row,
  independence paragraph, type ladder, CTA token discipline, focus
  language, nav register + destinations) re-pinned onto the live surface.
- **S1 icon language**: 46 duotone glyphs on one grid; the landing and the
  theme control speak it; CSS-only micro-motion; `/__design` sheet.
- **S2 scroll engine**: one passive rAF reader → nav rail + continuous
  star jar; real anchors with `scroll-margin` under the sticky bar.
- **S3 reveals inverted**: visible by default, armed only below the fold,
  once-only, print/hash safe, staggered card settle.
- **S4 layering**: one z ladder in tokens; every landing layer on a rung;
  44px hit floor on nav/brand/skip/theme control.
- **Instruments**: capture.mjs (headless Chrome channel), audit.mjs (7
  widths × 2 themes → 0 findings), verify.mjs (scroll + anchor probe).

Verified: tsc clean · build clean · bundle 822.9 KB gz (≤832) · tokens:check
· raw-css --strict · colors --strict · motion tokens · icons · csp · zero-
trace · **vitest 241 files / 2995 tests green** · overlap audit 0 findings.

## phase 3 — the match (in progress)

Measured first: `measure.mjs` + `measure-quick.mjs` produce
`measure/inspiration-1440.json` (real values, no site text stored) —
hero band 908px tall with 84/64 padding, h1 123px at 0.84 leading with
−7.14px tracking, h2 85px, body 17px, bar 76px, document 25 471px tall.

- **0 · chrome**: the flat link row became a five-step STAGE navigator
  (المهام · النجوم · التقدّم · المكافآت · العادات) whose amber pill
  travels to the active step from scroll (measured: pill x 229 → 191 in
  RTL as the reader reaches band 03), each 44px.
- **1 · hero**: display ladder re-keyed to the measured 124px cap;
  leading set to 1.02 (the inspiration's 0.84 clips Arabic marks — this
  is the documented language exception); hero band is viewport-tall with
  the measured 84px top rhythm; phone grew to 430px with a dark bezel, a
  status row and a clipped inner screen; CTA row is now three tiers
  (primary · login · «شاهد الجولة · ٠:٣٠»), the tour being a real in-page
  four-beat dialog (task → star → progress → reward) rather than a video
  file; trust row is four facts; the scroll cue asks for the first star.
  Side-by-side: `evidence/match/hero-1440-sbs.jpg`.

Verified: tsc · build · bundle 824.2 KB gz (≤832) · gates · 41 targeted
tests · overlap audit 0 findings at 7 widths × 2 themes.

NEXT (phase 3):
1. Market bands 02–06 to the measured construction: the tappable «اليوم»
   list with star burst and 0/5 counter, the rolling `/30` digit counter,
   reward cards with costs + 0/18 fill + Sat–Fri dots, the 20-level ladder
   with picker, the four hand-off steps + the two-phone (student/teacher)
   toggle with the six trust chips.
2. Showcase: marquee strip + the 7-slide carousel with 01/07 counter.
3. Principles / privacy / organisations / FAQ (7) / final CTA with the
   collected-stars total.
4. Public pages on the same grammar (about, help, contact, app, legal,
   colleges, campus, capabilities, vision, competitions, auth, 404).
5. Baselines regeneration in one late commit.
