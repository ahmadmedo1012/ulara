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

- **A · the interactive bands (02–08)**: every band now does something
  real and shows its state in text, not only in colour.
  · 02 — the «اليوم» list: five tappable tasks (`aria-pressed`), a 6-spark
    burst that cleans itself, `0/5` counter, `+N نجمة اليوم`, a 25-star
    weekly bar with ticks at 5/15/25 and an honest «أكملت هدف الأسبوع».
  · 03 — the `/30` counter rolls on scroll AND on tap; four threshold
    messages with the mascot's pose swapping; the milestone list fills.
  · 04 — reward cards with star costs, an 18-pip wallet, and the
    locked → unlocked state driven by the wallet.
  · 05 — the 20-level ladder with a picker, «المستوى N من ٢٠», and twenty
    DIFFERENT badge drawings generated from one rule (rays 3→7, four
    tiers of ink) instead of twenty assets.
  · 06 — the four hand-off steps plus the student/teacher two-phone
    toggle and a real approval flow (idle → sent → approved) with a
    `role="status"` line.
  · showcase — the 7-slide carousel (01/07, keyboard arrows, dots,
    prev/next) beside a phone frame.
  · 08 — four principles whose claims are the ones /legal/privacy really
    makes, a trust strip, and three audience doors; the finale now says
    «جمعت N من ٦ نجوم وأنت تقرأ» from the same scroll count as the jar.
  · FAQ grew 5 → 7 (who sees your class data; deleting your account).

Verified for A: tsc · build · bundle 828.3 KB gz (≤832) · tokens:check ·
raw-css · motion · colours · icons · csp · zero-trace · 17 targeted tests ·
a headless behaviour pass (tap 3 tasks → 3 / +12؛ untap → 2؛ the counter
crosses a threshold؛ 6 stars unlocks 1 reward؛ level 12 reads سماء؛ the
approval reaches «معتمد»؛ the carousel reads 02/07) with zero console
errors · overlap audit 0 findings at 7 widths × 2 themes.

## r369-mat — the maturity pass (owner ruling: university, not a game)

The surface was still telling a children's story in a product's clothes.
This pass changes the voice and the finish, not the facts:

- **Vocabulary** — «نجوم/نجمة» is gone from the public surface. The unit
  is **نقطة إتقان**, because that is what the product already computes
  (`xp`): one name for one thing, and no reward-shaped claim the platform
  does not make. Stage labels became الإنجاز · الإتقان · التقدّم · الاعتماد ·
  السلّم; the rewards band now reads «والتقدّم؟ **يُوثَّق**» (a badge, a
  course position, a certificate), and the habits band reads «والانتظام
  **لا الضغط**».
- **The character left the page.** The mascot (a smiling star) is no
  longer on the public surface at all; the hero phone shows an initial
  chip and a real date, the meter shows the number it earned, and the
  finale is a hairline frame with one ghost mark. The component stays in
  the tree for in-product empty states only.
- **The confetti left too.** The six-spark burst became one `+N` line
  that rises and fades: a product confirms a recorded entry.
- **The star jar became a section index** («القسم ٣ من ٦»), which is the
  honest thing it always was — a position in the argument.
- **Type** — the h1 takes 100px (not the measured 124): Arabic carries
  the same headline in two lines at that size, and four broken lines at
  124 is not "matching", it is a translation failure. The section head
  takes the measured 85px cap at 1.06 leading (the reference runs 0.94;
  Arabic keep sits at 1.06 so diacritics never clip).
- **Rhythm** — bands alternate sides, start-aligned, with 96–176px
  padding instead of 176–320, so a section is dense because of content,
  not because of air.
- **Finish layer** — pointer-parallax on the hero art (±10px, fine
  pointers, transform only), a 72px hairline grid behind the hero at 3%
  ink, cards that lift 3px on hover with a deeper shadow and a gold
  border tint, staggered reveals capped at six children, an elastic stage
  pill, the marquee pausing on hover, and one global focus ring (this
  sheet declares none — r172a owns it).

Verified: tsc · build · bundle 827.6 KB gz (≤832) · tokens:check ·
raw-css --strict · motion · colours --strict · icons · stylelint 0
errors · 145 targeted tests · zero console errors at 1440 and 390 ·
overlap audit 0 findings at 7 widths × 2 themes.

NEXT (still open, in the order the brief asked for):
- **B — the 13 public pages** on templates T1–T5 (about, help, contact,
  app, legal, colleges/leaderboard/detail, campus, capabilities, vision,
  competitions, auth, 404) with the real loading/empty/error states.
- **C — the logged-in web**: shell (rail, top bar, mobile bar + More
  sheet, palette, notifications), primitives, every role's pages, and the
  gamification layer wired to existing data only.
- **D — the two apps**: tokens, fonts and splash in `apps/mobile`, the
  re-skinned `components/ui/*`, the icon port, level/streak/badge views.
- **E — effects + sound** beyond what A already ships (mascot idle/blink,
  `<Celebrate/>`, press springs, shimmer skeletons, UI sounds OFF by
  default with a Settings opt-in).
- **F — close-out**: the inspiration's name in `zero-trace.sh` (it was
  never written into the tree, by design — the owner must supply it),
  dead-code sweep, baseline regeneration in one late commit, the full
  gate sweep, Lighthouse on `/`, DESIGN.md / README / CHANGELOG.
- **G — the pull request** `r369/new-identity → main` (ready, not merged).
