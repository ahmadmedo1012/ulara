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

## r369-mat r2 — the fine detail pass

Details a reader never names but always feels:

- **The odometer was lying.** Each cell was `10%` of an indefinite-height
  strip, so the strip rendered 10× the frame and the visible row was the
  wrong digit (`14` painted as `41`). It is em-based now: cell 1em, frame
  1em, step `--dig` em. Verified: 8 taps → `22`, and `/30` after it.
- **Numerals are LTR runs.** A split counter inside an RTL box mirrors its
  halves; every split readout (odometer, wallet, slide counter, matrix %,
  streak total) is now `direction: ltr; unicode-bidi: isolate`.
- **Anchors clear the bar**: `scroll-margin-block-start: 96px` on every id
  and stage band, so a deep link no longer parks the heading under glass.
- **03 gained its matrix**: three courses whose mastery is computed FROM
  the counter above (30 points → 100/68/84%), so no figure on the page is
  invented twice.
- **04 gained provenance**: «كيف تُحتسب؟ واجب ٣ · اختبار ٤ · محاضرة ٢» and
  the source line — the number's origin is on the page.
- **05 gained its rules**: three lines (from the record, holidays not
  counted, one weekly digest — no night notifications).
- **06 gained the tier legend** (بذور ١–٥ · مسارات ٦–١٠ · منائر ١١–١٥ ·
  قمم ١٦–٢٠), and the badge's rays moved outside the ring so a 132px badge
  reads as a seal, not a wheel.
- **The showcase screens now say something**: seven mini screens built
  from the page's own primitives (dashboard, today, mastery, board,
  ladder, teacher, quality) instead of four skeleton bars.
- **Hero facts** became a 2×2 hairline plate; FAQ answers fade in; body
  copy uses `text-wrap: pretty`; the rewards row is three across so the
  third card leaves no hole.

Verified: tsc · build · bundle 828.4 KB gz (≤832) · tokens:check ·
raw-css · motion · colours --strict · icons · stylelint 0 errors ·
58 targeted tests · overlap audit 0 findings at 7 widths × 2 themes.

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

## SLICE 01 (local-upgrade) — the 13 public pages on T1–T5 — CLOSED

Scope correction honoured: /vision + /competitions are authenticated
AppShell surfaces, not public pages — they moved to slices 02/03.

- Kit: PublicShell (imports r369.css + r369-pages.css), sections.tsx
  (Em/PageHead/FactChips/StateCard/ShimmerRows/DoorGrid/ArticleSection/
  BandSection/FactRail), styles/landing/r369-pages.css (T1–T5 wrappers,
  lg-family re-skin, faq/cap/status/qr/captures, `.w369.p369` reveal
  states, T5 auth block).
- Pages: about, help, contact, 6× legal, 404, /app, campus (T4),
  capabilities (ArticleSections) — copy verbatim, logic untouched.
- Colleges funnel: guest chrome moved UP to CollegesLayout (App.tsx) —
  guests ride PublicShell around the Outlet; page-level wraps removed.
- Auth sheets (login/register/forgot/reset): PublicShell + p369-t5;
  drafting frame/marks/grain/auth-top retired; flow navigation moved to
  the in-column flowbar; logic, copy, demo table, consent line untouched.
  The warm T5 auth block lives in r369-pages.css with explicit resets
  (patterns.css base sheet is NOT .auth-shell-scoped — the 3-col cell
  grid, ruled borders, submit wipe pseudo and mono captions needed
  neutralizing; [NN] indices + TEXT·48PX captions hidden as retired
  drafting voice).
- Test re-keys (all recorded in comments): App-routes guest-shell pin,
  landing-funnel 404 way-back (warm buttons, t5-scoped queries),
  AuthPage-alignment landmarks (w369-nav + ONE main#main + auth-bottom),
  r183-B8 skip-link pins (contract now read from PublicShell source).
- OPEN DEBT to slice 06: the dead `.auth-shell` sheets (patterns.css
  auth block + errors.css AUTH section) still ship and AuthPage-alignment
  still text-pins some of that dead CSS — deletion + pin re-key belongs
  to the close-out sweep. Polish backlog: capabilities §03 Em underline
  spans wide on wrap; campus BandSection 02 body placement.
- Gates: tsc clean · build ✓ · stylelint clean on the r369 sheets ·
  tokens:check / raw-css / colors --strict / motion / icons / csp-hash
  PASS · full unit suite green across all 6 shards (591+447+549+462+527
  +419) · captures verified at 1440+390 for every slice-01 route
  (docs/redesign/r369/evidence/01-inner-pages/slice01/). Known
  pre-existing at HEAD: gate:size RED (36MB measure PNGs from 4382dd8 —
  compress at final commit, owner-approved), stylelint whole-tree 2
  duplicate-rule errors (world.css/tokens.css — fix at close-out).

## SLICE 02 — the product shell (in progress)

### Batch 1 — rail + topbar + mobile dock (2026-11-27)
- New sheet `frontend/src/styles/landing/r369-shell.css` (scoped
  `.has-shell`, unlayered, imported LAST in AppShell.tsx after
  indicators.css). Rail rows are full-radius pills; the active row is
  the stage-pill amber (color-mix gold 18%, gold-ink icon, bold ink
  label). Retired: the charcoal nav-fill wipe + 2px accent tick
  (::before content:none) + the world.css r368 lavender accent-soft
  twin (beaten by setting `background`/`color` directly — the
  --_bg/--_fg pair alone lost to world.css's direct paint, found via
  computed-style probe). Hover/press = soft gold wash (8%/12%).
  Mobile dock: active destination reads gold-ink bold, its 2px top
  rule retired (notifications.css R319 twin).
- Topbar.tsx: new `StudentXpChip` — the honest «نقاط إتقان» collector.
  Student-only structural gate (same precedent as StudentScopeChip);
  reads useStudentDashboard → kpi.totalXp (the EXISTING /me/dashboard
  query the dashboard + gamification pages share — no new endpoint);
  counted Arabic forms via lib/format countAr; links to
  /student/gamification; hides on query error; renders «0 نقطة إتقان»
  honestly at zero; a quiet aria-hidden pill while loading; hidden
  ≤920px by CSS. STREAK DELIBERATELY ABSENT: no streak field exists
  anywhere in the frontend data model (checked hooks/resources/*,
  TrainingPages, MorePages, GamificationPage) — painting one would
  lie. If a streak API lands later it earns its own chip row.
- Test re-keys (recorded per slice protocol): Sidebar-Topbar.test.tsx
  and Topbar-alertsPath.test.tsx gained a `hooks/resources/student`
  stub (the chip's query) next to the existing useMyProfile stub —
  harness-only change, comments in place. New pin file
  Topbar-xp-chip.test.tsx (7 pins: student-only, counted forms,
  honest zero, hides on error, routes to gamification, inert loading).
- Evidence: docs/redesign/r369/evidence/02-product-shell/batch1/
  shell-{1440,820,390}[-dark].png + probe-1440-{rail,chip}.png
  (computed-style probe: activeBg = gold 18% color-mix, chip =
  gold 12% / gold-ink text; all six captures visually verified).
- Gates: tsc clean · build ✓ · stylelint clean on r369-shell.css ·
  tokens:check / raw-css / colors --strict / motion / icons / csp-hash
  PASS · 171 targeted shell/chip unit tests green across 11 files
  (incl. nav-active-vocabulary, r305 shell states/cluster/css
  contracts, r162, r168a, skiplink — no re-key needed beyond the two
  harness stubs above).

### Batch 2 — the panels (2026-11-27)
- Command palette (GlobalSearch): 22px panel (r-xs → --r-xl), pill
  rows (r-sm → --r-full), selected row = the amber pill (gold 18% +
  gold-ink icon); the R313 2px accent rule ::before retired. Hover
  stays the quiet surface step (r305 conservation: the signal belongs
  to the committed cursor row).
- Notifications panel: 22px corner. UNREAD HONESTY FIX — both swept
  owners of .notif-item-dot died as dead twins (polish.css:606 +
  notifications.css:203 comments admit it), so unread rendered as
  nothing but a hover tint. The dot is RESTORED in the one amber,
  paired with a bold ink title: a text state plus the dot, never
  colour alone (spec). The unread hover tint re-keys accent → gold.
  SCOPE NOTE: the whole panel tree portals to document.body (anchored
  primitive), so this section scopes to .notification-panel, never
  .has-shell — the batch-2 capture proved the .has-shell variants
  matched nothing.
- More sheet (mobile sidebar drawer): kept a SIDE sheet — the drawer
  already owns the close grammar (× + Esc via overlay stack + focus
  management) and the slice's measured facts forbid shell reflow.
  Earned: 22px world corners on the free edge (RTL-safe inline-end),
  grouped pill rows (R319 hairline-separated square cells retired),
  and the mono [NN] gutter counter retired (the drafting grammar's
  instrument voice leaves the product).
- Evidence: docs/redesign/r369/evidence/02-product-shell/batch2/
  palette-1440[-dark].png, notif-{1440,390}[-dark].png,
  drawer-390[-dark].png — all visually verified (mocked /search/global
  + /notifications; probe-panels.mjs kept at repo root for re-runs).
- Gates: build ✓ · stylelint clean · tokens:check / raw-css /
  colors --strict / motion / icons / csp-hash PASS · 91 targeted shell
  tests green (nav-active-vocabulary, r305/r325 css contracts, r305
  states, r168a a11y, Sidebar-Topbar) — no re-keys needed.

### Close-out — SLICE 02 CLOSED (2026-11-27)
- Full unit suite: all 6 shards green (594+447+534+467+530+430 =
  3002 tests, 243 files) after the slice-02 changes.
- Overlap audit: new authed variant docs/redesign/r369/audit-authed.mjs
  (seeds ula-auth + ulara-theme v2 persists, audits /student/dashboard
  at the same 7 widths × 2 themes). Two audit fixes landed with it:
  a fixed layer no longer "covers" its OWN children, and text rects
  clip to their scrollport (the sidebar's opaque sticky footer
  produced a false text-over-text on labels scrolled beneath it).
  Result: 0 findings.
- Real fix the audit caught: the sidebar theme toggle's options were
  30×28 — under the 44px hit floor. r369-shell.css §7 raises them to
  44×44 min (verified in close/shell-1440.png).
- Evidence: evidence/02-product-shell/close/shell-{1440,390}.png.
- Deferred: none new. (Slice-01 debt — dead .auth-shell sheets +
  AuthPage-alignment text-pins — still rides to slice 06.)

## SLICE 03 — role pages + the gamification layer (in progress)

### Batch A — the shared world re-shape (2026-11-27)
- New sheet `frontend/src/styles/landing/r369-app.css` (scoped
  `.has-shell`, unlayered, imported last in AppShell.tsx). ONE sheet
  re-shapes all 47 page files that compose from the r359 .sg
  instrument family (student/teacher/admin/quality/owner/
  institutional trees all consume it via patterns/Sheet.tsx).
- §0 the elevation ladder returns: tokens.css's r369 double-shadow
  values re-declared under .has-shell (the R313 flat override zeroed
  them for the product). Every existing .card lights up without a
  single edited rule — .card already read var(--shadow-card).
- §1 cards answer the hand: lift 3px + deeper shadow + gold border
  tint on hover (fine-pointer guarded) — the landing's exact grammar.
- §2 .sg-section becomes a warm card (22px, surface, shadow, overflow
  clip); the reveal draw-in hairline, registration crosses and the
  head's bottom rule retire.
- §3 the mono instruments retire: .sg-index, .sg-caption, and the
  KPI's .sg-label caption seat. .sg-label is NOT hidden wholesale —
  it carries real content elsewhere (sg-empty sheet codes, MonoLabel
  Arabic counts in teacher pages).
- §4 the KPI band un-rules (cell hairlines gone); numerals take the
  display face (Baloo, tabular kept).
- §5 fields → 14px (r-md); tables rounded — a .table-wrap inside an
  sg-section loses its own border (the card clips it), standalone
  wraps keep 18px.
- Verified: student courses (KPI band + list card), gamification
  (honest error cells + warm card), teacher dashboard (dark rail) at
  1440/820/390 × light/dark in evidence/03-role-pages/batch-a/.
- Gates: tsc · build · stylelint · tokens:check · raw-css ·
  colors --strict · motion · icons · csp-hash PASS · 88 .sg-adjacent
  unit tests green (CoursesPage-summary, R305-courses-ds,
  R305-supplemental-ds, r305a7 lib/res, QualityPages-rosters) — no
  re-keys.

## SLICE 03 — batch B (gamification ladder) — WIP

- LevelBadge generator extracted to `src/components/gamification/LevelBadge.tsx` — byte-identical geometry to the landing's badge (rays 3→7, leaf/sky/violet/amber tiers), exporting LEVEL_NAMES (20 Arabic names) + LEVEL_TIER_GROUPS (بذور/مسارات/منائر/قمم). Product class prefix .g369-badge-*; the landing keeps .w369-badge-*.
- GamificationPage: new framed section «سلّم المستويات» (index 01) ahead of the two R359 lists. The readout (level name, tier group + real TIER_LABEL tier, pctIntoLevel bar in var(--gold), «متبقّي X نقطة» via pointsAr) and the 20-rung ladder (data-earned/data-current/aria-current) are driven ONLY by useTrainingMe — never a mock rung. Level >20 clamps to a fully-lit ladder with the real number kept in the readout.
- Honest states: training.isError renders SheetEmpty + retry AND the fully locked ladder (the error copy promises the ladder, so it renders); no level yet → «لم يبدأ المسار بعد» + locked ladder.
- HONESTY GAP (carried): no streak field exists in any payload the app reads (verified hooks/resources/*, slice 02 finding) → no streak row renders. If a streak API lands, add the row then.
- r369-app.css §6: .g369-badge-* ladder + progress styles under .has-shell (twin of r369.css:2228-37+2775). §7: 44px touch floor for .btn.sm in the shell (audit finding: page-head CTAs + retries measured 36px at every width); in-table row actions keep the dense 36px register.
- Icon gate: `frontend/src/components/gamification/` added to check-icons.sh's documented allowlist — the generated badge is bespoke achievement symbology (same category as the landing's allowlisted twin + the brand mark), NOT UI iconography.
- Re-keys: R305-supplemental-ds.test.tsx — the framed-section titles pin now expects «سلّم المستويات» first; change recorded in a test comment.
- Evidence: evidence/03-role-pages/batch-b/ — 6 route cells + capture-ladder.mjs element shots (ladder-{1440,390}{,-dark}.png, 20 rungs verified, RTL order, locked state legible both themes).
- Gates: tokens:check · raw-css · motion · csp-hash · colors --strict · zero-trace · icons PASS; tsc + build + stylelint clean; R305 + gamification suites 24/24; overlap audit-authed on /student/gamification → 0 findings, all widths, both themes.

### Close-out — SLICE 03 CLOSED (5:55 EET)

- Batch A (r369-app.css §0-§5: shadow ladder re-declared, card hover lift, sg-section 22px warm cards, retired sg-index/caption/kpi-top labels, KPI hairlines off + display-font values, 14px fields) — commit dddd570.
- Batch B (gamification ladder, this file's batch-B entry above) — commits cf86ec1 + 0d8f778.
- FULL SUITE after the .btn.sm touch floor: 6/6 shards, 3002/3002 tests green. The floor broke nothing app-wide.
- Gates: tokens:check · raw-css · motion · csp-hash · colors --strict · zero-trace · icons PASS; tsc + build + stylelint (changed files) clean; overlap audit-authed on /student/gamification → 0 findings, all widths, both themes. Pre-existing debt untouched: gate:size RED (36MB measure PNGs from 4382dd8) + 2 whole-tree stylelint duplicate-rule errors (world.css/tokens.css) — both approved for the final-commit pass (parent 3:45:29).
- Known cosmetic gap (accepted): batch-a evidence lacks the 820-dark cells; batch-b has all cells. Not blocking: the 820 layout is covered by batch-a light + batch-b dark evidence.
