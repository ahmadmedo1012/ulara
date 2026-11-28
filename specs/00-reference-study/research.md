# 00 — Reference study: the inspiration, taken apart

Source: the live site, fetched 2026-11-27, plus the branch's own
measurements (`docs/redesign/r369/measure/inspiration-1440.json`,
1440×~1000) and its captured frames (`measure/desktop-s00..s04`,
`desktop-f00..f11`, `phone-*`). Live re-verified in a cloud browser at
1265×720 CSS px: hero, scenes 03/05, language menu, FAQ, film dialog,
reel, finale. The reference's name never enters the tree (zero-trace);
this file lives in the planning bundle, not in the repo.

Its pitch: a kids' reward-chart app. "Stars today. Habits tomorrow."
ULARA borrows the grammar, not the audience. The owner has ruled:
university voice, no character on the public surface, the unit is
نقطة إتقان. Where the reference and the ruling disagree, the ruling
wins; those spots are marked RULING below.

---

## 1. Identity and palette

- Ground: warm cream, drifting peach-to-lavender radial washes that
  shift per scene; `theme-color #FFF7EC`. Night scenes (05 habits,
  finale) flip to a deep indigo-violet gradient with a twinkling
  starfield. ULARA's tokens already match this shape: `--bg #FBF6EC`
  light / `#14122B` dark, ink `#1E1A3C`, gold `#F29A1F` as the single
  reward signal, royal blue surviving only as info/link.
- Ink: deep indigo, near-black on cream.
- Accents: one amber/gold spent only on reward meaning (stars,
  streaks, unlocked states); one violet as the playful secondary
  (serif accents, buttons in the film, level tints).
- Coloured, soft, layered shadows on every floating card; nothing is
  a bare 1px hairline box. ULARA: 22px cards + soft double shadow,
  already in `world.css`.

## 2. Type

Measured at 1440 (branch instrument, real DOM values):

| element | size | leading | weight | tracking |
|---|---|---|---|---|
| h1 hero | 123px | 103px (0.84) | 820 | −7.14px |
| h2 section | 85px | 80px (0.94) | 800 | −4.25px |
| h2 variants | 72–75px | ~0.94 | 800 | −3.6 to −3.74px |
| pedagogy head | 46px | 46px | 800 | −1.84px |
| body | 17px | — | — | — |
| top bar | 76px tall | — | — | — |

The signature move: ONE emphasised word per headline set in an italic
serif and a warm colour ("Stars *Today.* Habits *Tomorrow.*",
"Progress you can *actually* see.", "Good to *know.*").
RULING: Arabic has no italic voice; ULARA emphasises with colour plus
a hand-drawn underline, never italics. ULARA caps h1 at 100px (Arabic
holds the headline in two lines there; 124px breaks it into four) and
holds leading at 1.02/1.06 so diacritics never clip. These are the
documented language exceptions, already in the LEDGER.

Kicker pattern: a small circled index (02, 03 …) plus an UPPERCASE
letter-spaced label ("STARS BECOME PROGRESS"). ULARA mirrors it with
Arabic stage labels (الإنجاز · الإتقان · التقدّم · الاعتماد · السلّم).

## 3. The scroll method (this is the heart of it)

- **Pinned narrative scenes.** Sections 02–06 are 2880–4140px tall at
  1440 with sticky inner stages; scrolling drives the scene's own
  progress: a counter rolls, a road fills, a constellation draws,
  phones swap. The visitor reads at their own speed and the story
  keeps moving. Document height 25,471px at 1440.
- **The collector.** A nav pill shows "N stars earned". Stars fly into
  it as you pass scene milestones ("Scroll to earn your first star",
  and the finale reads "You collected N stars on your way down here").
  It turns reading into playing and gives the whole page one through
  line. RULING: on ULARA this became the section index («القسم ٣ من ٦»)
  on the public page; the collectible framing stays available for
  in-product surfaces where the points are real (slice 03, 05).
- **The stage navigator.** A bottom-centre pill reads
  "Tasks → Stars → Progress → Rewards → Habits" with the current stage
  highlighted; it is both progress meter and anchor nav. ULARA already
  ships this as the five-stage navigator with the travelling amber
  pill (measured x 229 → 191 in RTL).
- **Reveals.** IntersectionObserver-armed, once-only, below the fold;
  staggered card settles (capped at six children in ULARA). rAF scroll
  reads, no scroll-jacking; native scroll always wins. Reduced motion
  and `hover: hover` are both probed with matchMedia and honoured.

## 4. Scene by scene

1. **Hero.** Eyebrow pill ("A reward-chart app for families and
   groups"), the huge two-line headline with serif accents, one
   sentence, three CTA tiers (App Store badge, "See how it works ↓",
   "Watch the film 0:30" with a violet play disc), a four-fact trust
   row, and a composed phone mockup wrapped in floating chips
   (streak "5 day streak", avatar "Noor 93", "Next level Pathfinder",
   family reward card "Unlocked for tonight!"). The phone is
   INTERACTIVE: tappable task rows with states, and a nudge chip
   "Your turn — tap a task". A character stands beside the phone
   (RULING: no character on ULARA's public page; ULARA's hero phone
   shows an initial chip and a real date).
2. **02 Tasks become stars.** Five tappable task cards with icon,
   name, one-line description, duration chip and star cost; taps fire
   a six-spark burst and advance a weekly goal bar with ticks
   (ULARA: burst reduced to one `+N` rise line; counter `0/5` and an
   honest «أكملت هدف الأسبوع»).
3. **03 Stars become progress.** A perspective road with a waypoint
   card ("Luca's weekly goal / 30 stars / Reached!"), a big rolling
   `/30` counter, threshold messages, milestone list.
4. **04 Progress becomes rewards.** Reward cards with star costs, an
   18-pip wallet, locked → unlocked states; "0 / 18 Unlocked!" reads
   in text.
5. **05 Rewards become habits** (night). A constellation of 20 level
   nodes joined by dotted paths, a level card ("Level 1 of 20 /
   Spark / 0 stars"), a streak week row (Mon–Sun, "Seven in a row is
   a streak"), the character meditating (RULING: out).
6. **06 Together.** Two phones, kid view / parent-PIN view toggle, and
   a four-step approval flow (finish → appears in Control → one tap →
   stars land) with live status text.
7. **07 The real app (reel).** A fan of phone screenshots sliding as a
   7-slide carousel (01/07 counter, arrows, dots, keyboard), a giant
   outlined brand watermark behind, "Watch the film" top right. ULARA
   ships this as the showcase carousel beside a phone frame.
8. **Pedagogy.** "A helpful start — not the whole strategy", four
   numbered principles. ULARA's 08 principles band mirrors it with
   claims /legal/privacy really makes.
9. **FAQ.** "Good to know." Accordion cards, one open at a time, plus
   icon becoming ×, 7 questions (ULARA grew 5 → 7: class data
   visibility, account deletion).
10. **Finale** (night). The headline repeated, one App Store CTA, the
    collector's total, the character pointing (RULING: out; ULARA
    closes with a hairline frame and one ghost mark). Footer: brand
    line, a legal link row, a free-printable link, a 10-language row.

## 5. Chrome and menus (the full list)

- **Top bar (76px, floats):** logo pill (mark + wordmark) · centre
  collector pill · language menu · sound toggle · primary pill CTA.
- **Language menu:** round flag button opening a dark rounded panel;
  ten rows (flag + native name), a small gold check on the active one.
  Closes on outside click and on selection. ULARA is Arabic-first;
  the analogous control is the theme control already shipped (S1).
- **Sound toggle:** speaker icon, OFF by default; every sound is
  opt-in. Slice 05 adopts exactly this contract with a Settings
  opt-in.
- **Film dialog:** a phone-shaped (≈9:19.5) modal video, blurred
  backdrop, × top right, native controls, 0:29 long. ULARA's tour is
  a real in-page four-beat dialog instead of a video file (already
  landed); the modal grammar (blur, ×, focus trap, Esc) is the part
  to reuse anywhere else a dialog appears.
- **Skip to content** first focusable; real anchors with
  `scroll-margin` under the sticky bar.

## 6. Motion catalogue (29 keyframes observed)

Ambient: `bob`, `drift-a/b`, `twinkle-glow`, `flicker`, `pulse`,
`pulse-ring`, `spin`. Character: `girl-idle/hop/pop/out/shadow`.
Feedback: `pop-in`, `rise`, `hop`, `nudge`, `ripple`, `halo-flash`,
`hud-bump`, `hud-count`, `pill-bump`, `pill-glow`, `ring-bump`.
Entrances: `char-in/out`, `phone-in`, `film-in`, `logo-glow`, `draw`
(SVG stroke). Feel: springy overshoot on small UI, slow ease on
scenes; nothing springs larger than ±10px except entrances. ULARA
keeps one overshoot curve in tokens; press springs and `<Celebrate/>`
are slice 05.

## 7. Assets

Self-hosted SVG icon language (ball, bed, book, calendar, cap, check,
chevron, clock, flame, fork, gift, home, list, lock, moon, note,
palette, pencil, play, shield, star …), duotone, one grid. ULARA
already ships 46 duotone glyphs on one grid (S1) plus 20 level badges
generated from one rule (rays 3→7, four ink tiers) instead of twenty
assets. Photos: child avatars (RULING: out), webp characters (RULING:
out).

## 8. Accessibility and honesty (worth copying)

- Every interactive number also reads in text (`0 / 18 Unlocked!`,
  `Level 1 of 20`, `01/07`).
- Buttons are buttons (`aria-pressed` on task toggles), the approval
  flow announces on a `role="status"` line, the carousel is keyboard
  complete.
- No dark patterns: sound off by default, no autoplay with sound, no
  fake countdowns, privacy claims enumerated and short.
- Offline/local-first claims are written as plain facts. ULARA's
  equivalent honesty rule: no gamification claim the platform does
  not compute.

## 9. What ULARA deliberately does NOT take (the ruling, restated)

- The child character and the smiling-star mascot (public surface).
- The «نجوم» vocabulary; the unit is نقطة إتقان.
- The confetti burst; one `+N` rise line confirms a recorded entry.
- The collector-as-toy framing on the public page; it is a section
  index there, and real only where the data is real (product).
- The italic serif accent; Arabic takes colour + hand underline.
- 123px h1; Arabic takes 100px with 1.02 leading.
