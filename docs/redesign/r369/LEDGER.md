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

## SLICE 04 — mobile apps (batches A–F) — WIP

- Batch A (d3abf96, 013a8ac): fonts — Readex Pro body 4 weights + Baloo Bhaijaan 2 display 3 weights via @expo-google-fonts deep imports (Plex/Alexandria uninstalled; fontMap KEYS unchanged so no call-site edits). ErrorBoundary/updates.tsx raw postscript names (a never-registered fallback bug) -> registered keys. semantic.test.ts + type.test.ts re-keyed (body 14/21; the >=1.5 leading floor kept by lineHeight 20->21 in type.ts + text.tsx). Motion presets re-keyed to the r369 ladder (120/220/380/520/700, dsEase [0.34,1.56,0.64,1]). Logo/BootMark cornerstone -> indigo #1E1A3C (the web mark's collapsed var(--accent) seat); tone=ink brand constant #1A1713 unchanged.
- Batch B (1741b0f, 579e987): the generator (scripts/tokens/build.mjs) now emits the full radius ladder (8/10/14/18/22/28/36/full + `none`=xs back-compat alias for 3 Assistant.tsx call sites). Pill buttons (radius.full) + ghost 1.5px inset outline; Card 22px + soft indigo-tinted shadow (elevation 3/6); fields 14px corners (5 boxed controls); sheets 28px top corners (both families + sheet field 14px); KpiCard 22px + Baloo display values; ProgressBar pill track.
- Batch C (06b229c): 58-glyph duotone port — src/components/ui/glyphs.ts (path data byte-identical to web) + Glyph.tsx (react-native-svg, accent 18% alpha duotone, color-only, decorative default) + glyphs.test.ts (58 names, byte-parity reads the web source, anchor-in-1..23 contract mirroring the web's REAL rule) + barrel export.
- Batch D (6cd19ea): gamification — components/gamification/LevelBadge.tsx RN port (byte-identical geometry: rays 3->7, halo tier>=2, tick tier 3; paint leaf->mint ink, sky->sky ink, violet->lavender ink, amber->goldInk, locked->textFaint). app/student/gamification.tsx: metallic tier orb + tierOrbInk RETIRED -> LevelBadge (level clamped 1..20, locked when null); new «سلّم المستويات» section (20 rungs, 18% wrap cells, earned tier-inked, current = surfaceHover + bold accentInk name, locked muted) with the derivation disclosed («التصنيف مشتق من مستواك»). HONESTY GAP (carried): the mobile payload has level+totalXp ONLY (no pctIntoLevel/toNext/streak anywhere) -> no progress bar, no streak row; honest absence, never faked.
- Batch E (63273a8 + fix below): Button rides the press spring (usePressSpring: 120ms outCubic down-beat + springs.snappy release, reduced-motion no-op). IconButton unchanged.
- Batch F (aecc217): BRAND ASSETS re-keyed — the app icon, adaptive set, both splash PNGs, favicon and shared/brand/mark.svg still carried the retired royal cornerstone #2540D9 and old paper #F5F1E8. scripts/brand/build-app-icons.mjs: cornerstone #1E1A3C, paper -> cream #FBF6EC; build-splash-dark.mjs: vessel stroke = dark text #F7F1E6, cornerstone = dark accent #A8A2E6; app.config.ts splash grounds -> #FBF6EC light / #14122B dark (indigo-night --bg). All PNGs regenerated; both --check gates byte-identical under tokens:check. Both splash previews verified visually. SPEC CONFLICT RESOLVED: spec 04's «wordmark and loading state share the indigo field» vs the r369 web decision retiring the indigo boot ground (polish.css r172a comment: --ln-ink aliases var(--bg) in both themes, ONE ground from the first styled frame). Followed the web canon (cream first frame); the spec line is superseded here.
- Heading face (aecc217): text.tsx mapped weight=bold to bodyBold for EVERY variant, so Baloo never reached headings. display/h1-h4 now ride Baloo weights (matching the web .pf-page-title -> var(--font-display) semibold); body rungs stay Readex; fonts.ts gains displayMedium.
- BUG FOUND BY EVIDENCE (fixed this slice): batch E wrapped Button in reanimated's createAnimatedComponent(Pressable) with a FUNCTION style — reanimated/RNW drops the whole style array, so the web export rendered an invisible 21px transparent button (jest's reanimated mock masked it). Restructured: plain Pressable frame + inner Animated.View carrying the chrome + spring (the PressableScale pattern). DOM probe: 48px slab, bg #1E1A3C; auth-login capture verified.
- Evidence: capture-mobile.mjs (port 5391, seeds ula-mobile-user/institution/theme, mocks /api/** {data:null}) -> evidence/04-mobile-apps/mobile-{dashboard,list-courses,gamification,auth-login,splash}-390{,-dark}.png — 10 cells, 0 console errors, ALL verified visually: dashboard (Baloo heads, 22px tiles, honest empty states; the [02] «حصص اليوم وغدًا» index is hidden with zero data — the numbers are fixed section identities, not a sequence), courses (duotone toggle/empty state, honest zero count), gamification (ladder both themes), auth (indigo/lavender pill both themes), the «splash» cell actually captures the UNAUTHENTICATED WELCOME screen (redirect) — blueprint illustration, cream/indigo-night grounds, pill CTA — better evidence than a boot flash; the native boot grounds are covered by the app.config.ts + splash PNG verification above.
- Gates: tsc clean; full suite 4/4 shards 1517/1517; tokens:check green (incl. both brand byte-checks); no emulator -> expo web export + captures are the honest proxy (r351 precedent).

### Close-out — SLICE 04 CLOSED (6:44 EET)

- Commits on r369/local-upgrade: d3abf96, 013a8ac, 1741b0f, 579e987, 06b229c, 6cd19ea, 63273a8, aecc217 + the Button-structure fix and this evidence/LEDGER pass.
- All six spec areas landed: fonts, re-skin, icons, gamification, press feedback, brand assets. Known gaps (accepted): no emulator-level verification (web export proxy); mobile payload honesty gaps above; «splash» cell = welcome screen.

## SLICE 05 — effects + sound (batches A–D) — CLOSED

- Batch A (2391e9d): `<Celebrate/>` — the ONE shared celebration moment, direct-import (the motion barrel is pinned by tests/motion/Skeleton.test.tsx). +N rise (the landing's w369-gain recipe: 6px → crest −4px → away) over a halo-pulsing gold dot, ~0.64s of token motion under the 1.2s ceiling, settle timer 1100ms, RM = the static fact line with no timer, ONE polite live-region announcement, focus never stolen. Seat: GamificationPage — fires only when the training payload reports a level ABOVE the remembered one (localStorage `ula-level:<userId>`; first visit records silently — inventing a celebration would be a lie; a level drop updates silently). 4 vitest cases.
- Batch B (9302d6a): نجّوم in product empty states — the spec's ONE in-product seat ruling (never grading/recording flows). EmptyMascot wraps the landing Mascot (new additive `m369-eyes-open` hook); CSS §9: idle bob 3.6s (ambient-slow) + a 240ms blink inside a 6s ambient-drift loop, both dead under RM. Seats: gamification «لا إنجازات بعد» (think) + notifications «لا توجد إشعارات بعد» (rest). 39/39 affected tests.
- Batch C — AUDIT (no code) + ONE REAL DEFECT FIXED: web press springs + shimmer already canonical (R313 register, r150b skeleton-shimmer on --motion-duration-skeleton; mobile spring = slice 04 batch E). BUT the evidence probe (press-cdp.mjs, CDP matched-styles) caught the r341/D6 hover nudge (chrome.css §10, unlayered `translateX(-.1875rem)`) beating the layered press register: a held press on .btn.accent/.btn.primary is always also a hover on fine pointers, so the spring NEVER showed on the two CTA variants. Fixed with an :active twin in the same sheet (press wins while pressed, nudge resumes on release; same --press-scale register). Probe after: +30ms mid-spring 0.9687 → +200ms exactly 0.97.
- Batch D (15ec247): UI sounds — the reference contract verbatim: default OFF, one Settings toggle, remembered, never autoplays, fully muted under RM or data-saver. Three tiny synthesized mp3s in public/sounds (tap 0.1s/854B, confirm 0.29s/1951B, milestone 0.5s/3205B — public/, never bundled; an Audio object exists only after an opted-in play, and flipping off pauses + drops the players). lib/sound.ts owns the contract. Seats: tap = .btn presses via ONE delegated AppShell listener (links/nav stay silent — the tap belongs to actions), confirm = toast.success, milestone = Celebrate firing. Settings gains «الصوت» [02] as an honest client-local pressed-pill row (no server field exists — a server-settled mutation would be a lie); sections 02-07 renumber to 03-08; r320 seven-sections pin re-keyed to eight with a comment. sound.test.ts 6 cases.
- Tests: sound 6/6 · r320 settings 12/12 · toast+AppShell 55/55 · MorePages+routes 35/35; tsc clean; build green (sounds stay out of the bundle by construction).
- Gates: tokens:check · raw-css · motion · csp-hash · colors --strict · icons · zero-trace PASS. Pre-existing debt untouched (final-commit pass, parent 3:45:29): gate:size RED (36MB measure PNGs), 2 whole-tree stylelint duplicate-rule errors.
- Evidence (evidence/05-effects-sound/, capture-effects.mjs — port 5310, mocked /training/me level 2→4 SILVER, honest empty achievements): celebrate-rise + celebrate {light,dark} (the +2 rise mid-flight and fully risen, «مستوى جديد — طريق» — level 4's name IS «طريق» in LEVEL_NAMES), celebrate-rm (halo-animation=none), mascot {light,dark,rm} (think star over «لا إنجازات بعد», idle=g369-mascot-idle / none under RM), press-active (held :active measured 0.97), shimmer {light,dark} (44 skeletons mid-loop, API stalled), settings-sound-light (the toggle, default-pressed=false). 0 console errors in every cell; all frames verified visually. Sound itself has no pixel — its contract is proven by sound.test.ts + the Settings seat.
- Critique honesty: the celebrate moment is transient by design (1.1s) — evidence catches it twice inside the window; the mock tier enum is UPPERCASE (a lowercase 'silver' mock briefly rendered «undefined» in an early frame — capture harness bug, not app code; the real API sends the enum).

### Close-out — SLICE 05 CLOSED (7:16 EET)

- Commits on r369/local-upgrade: 2391e9d (A), 9302d6a (B), 15ec247 (D), + this fix/evidence/LEDGER pass (C's finding + close).
- All four spec areas landed: one celebration primitive, mascot in product empty states, press/shimmer audit (+ the hover-mask fix), sounds OFF-by-default. Debt riding forward: pre-existing gate:size + stylelint (final-commit pass); slice-06's dead .auth-shell sheets.

## SLICE 06 — close-out (dead-code, baselines, gates, Lighthouse, docs) — CLOSED

Commits on r369/local-upgrade: bd73c0f (dead-code sweep) · 0f399d2 (parent-approved hygiene: 219 evidence PNGs recompressed 125.3→51.0MB + 2 stylelint duplicate-rule errors fixed) · 3b98f3b (web mark + favicon re-keyed to the indigo cornerstone; r323 pins 18/18) · 436e16a (audit baseline re-promoted) · b0707fe (landing aria-hidden-focus fix) · this docs close.

### 1. Dead-code sweep (bd73c0f) — shown in the diff
- errors.css AUTH section retired (−251 lines) + patterns.css .auth-shell rule + 4 auth-page imports and stale comments; the AuthPage-alignment r359-grammar describe retired with a re-key comment. Proof: evidence/06-closeout/auth-{login,register}-{light,dark}.png render identical, 0 console errors. Tests: alignment 11/11, auth+register 38/38, type gate 118/118.

### 2. Baselines regenerated once, late, in one commit (436e16a)
- surface-baseline.json re-promoted: 72 cells (12 BASELINE_ROUTES × 3 viewports × 2 themes), captured in CI's mock mode (AUDIT_API_MOCK=1, vite preview :4173, chunked runs merged by route/theme/viewport). Harness re-keys in the same commit (one-cycle convention): KNOWN_DURATIONS_MS +220/380 −200/400 (retired); COLOR_SAMPLES probes + h1.w369-h1, h1.p369-h1, .w369-lead, .w369-band, .w369-progress-card.
- Drift vs the promoted baseline: CLEAN (72 captures) under CI's AUDIT_FCP_RATIO=4. CAVEAT: under the strict local default ratio 5, five fcp notes remain on dark-1280 cells (620–832ms) — the hardware axis, not a regression; CI's ratio is the gate of record.

### 3. Lighthouse on / (vite preview :4173, mobile default profile = the spec's mobile re-measure)
- performance 73 (FCP 2.0s · LCP 3.4s · TBT 700ms · CLS 0 · SI 2.0s · TTI 3.6s) · accessibility 92 → **96** after the fix below · best-practices 100.
- FIXED — aria-hidden-focus (b0707fe): the handoff demo CTA (.w369-mini-cta) stayed focusable while its phone was aria-hidden in student mode. It now disables when hidden; teacher mode unchanged. Verified: the audit passes, landing tests 11/11, tsc clean.
- HONEST GAPS (recorded, not silently changed — both need an owner/design decision):
  a. .w369-band-kicker — gold-ink #A8620A on cream = 4.41:1 vs AA 4.5 (misses by 0.09). The canon token itself; darkening it re-keys every gold-ink text on both platforms.
  b. landing phone-mock mini text — computed #938b7c = the canon --text-muted #62625F (5.63:1, AA-pass) seen through the back phone's deliberate composition opacity (~0.7) over the white screen. A decorative demonstration effect, not a token defect; undimming or exempting it is a design call.

### 4. Overlap audit — 0 findings
- audit-authed.mjs (the S4 four-defect probe) on 6 authed routes — student dashboard · today · alerts · calendar · courses · online-exams — × 7 widths (320/360/390/768/1024/1440/1920) × both themes: «clean at every width, both themes», 0 findings on every cell.

### 5. The full gate sweep (verbatim, this tree, this run)
- npx tsc --noEmit → clean
- npm run build → ✓ built in 12.96s
- node scripts/check-bundle-size.mjs → PASS — الأوزان داخل الأسقف المثبَّتة (إجمالي 832.6 KB gz، الدخول 47.6 KB، pdf 95.7 KB). [Ceiling of record is the pinned 866 (R360-F1); slice 05's head measured 828.4 — the +4.2 KB gz is slices 05-06 feature weight: Celebrate, mascot seats, sounds settings row.]
- npm run tokens:check → brand: mark/lockups/wordmark byte-identical web ↔ RN (green)
- npm run check:raw-css → PASS: 0 finding(s) across 262 tsx file(s)
- npm run check:colors → OK: no raw color literals outside the sanctioned zones (26 inline-allow suppressions)
- npm run check:motion-tokens → OK
- npm run check:icons → OK (Lucide-only discipline)
- npm run check:csp-hash → OK json-ld pinned in app.ts + mirrored in vercel.json
- stylelint-gate → ✓ ratchet green (rawHex 25 → 24); whole-tree stylelint 0 errors (0f399d2)
- scripts/brand/zero-trace.sh → PASS with the placeholder name — the REAL-name run waits on the owner (supplied out of band, never committed; asked 7:32, pending)
- vitest full: 6/6 shards 3004/3004 (7:37–7:42); post-b0707fe delta: landing 11/11 + tsc (7:56). Mobile jest full: 4/4 shards 1517/1517.
- PRE-EXISTING (not this round's): gate:size rule 2 RED — docs/ tracked 114MB > 58MB budget; already exceeded at the branch base (101.4MB) before r369 began; the hygiene pass cut docs/ 183→116MB. Rule 3 (per-change growth) is green.

### 6. Royal-remnant audit (parent 7:42:26 — recorded with file + reason, behaviour unchanged)
- src/brand/mark.ts — header comments still narrate the r323 royal cornerstone/paper; the PAINT rides var(--accent), which r369 re-keys to the indigo cornerstone (evidence: slice-01/04 captures + 3b98f3b). Stale comment only; the file sits beside the r323 byte-pins, so the refresh is deferred, zero behaviour.
- src/brand/Logo.tsx (tone="royal" slot) + src/pages/BrandPage.tsx:131 — the literal-royal tone's ONLY consumer is the /__brand showcase, labelled «استعمال نادر». A deliberate brand-history exhibit, not product chrome. Kept.
- src/styles/tokens/tokens.css:663-676, 972-980 (@layer tokens) — old-era hand blocks declaring royal as --accent/role-accent; tokens.css imports AFTER tokens.generated.css (main.tsx 42→43), and the r369 canon seats live later in the cascade (generated + the hand file's own r369 seats, e.g. --text-muted #62625F at :1492) — the r369 values win; these are overridden era layers. Untangling which hand seats remain load-bearing is its own round (colors gate sanctions the zone).
- src/styles/tokens/tokens.css:1248-1251 (@media print) — «print rides the royal seat»: print/PDF surfaces keep royal --accent #2540D9 intentionally per the old comment. Flagged for an owner decision (print identity: royal vs the indigo canon); untouched.
- src/styles/unified-parity.css:423,459 — the parity sheet (deliberately NOT imported by the app; an internal verification surface) keeps --c-royal family (the canon's info/link tint, names preserved for mobile statusTones) + a scoped --accent #2540D9 of its own era grammar. Zero product reach.
- src/lib/chartTheme.ts:263,270 — REVIEWED, NOT A REMNANT: series 1 = #2540D9 mirrors --chart-1 and is the r369 canon's --info seat (charts are informational). Canon, kept.

### 7. Carry-overs restated for the PR
- Pre-existing main e2e failures (r368 sweep list, dated): r311 route yield · r325 map-clip ×2 · r352 attach PDF · r353 reduced-motion PIXEL-visible · r354 ×4 · r305 focus-keyboard «first Tab» (partial). RESIDUAL: the r368 protocol's clean-main-worktree re-confirm was NOT re-run at this close-out (time); the list carries r368's dated evidence + per-slice local runs that matched it.
- WebKit/iPhone e2e never run locally (no webkit browser); substitutes: chromium-iphone 8/8 under r368 + the audit matrix above.
- Data honesty (slices 03/05): no streak data in any payload → no streak UI anywhere; the mobile payload carries level+totalXp only → no progress bar / toNext on mobile; first-visit level baseline records silently, never a faked celebration. Sounds are client-local (no server field exists; the Settings row says so).

### Close-out — SLICE 06 CLOSED (8:08 EET)
- All spec-06 local steps landed: sweep, baselines, gate sweep, Lighthouse (+ the a11y fix), overlap audit 0, DESIGN.md canon completed (§6-§9: authed world, mascot seat, effects+sound, mobile parity), CHANGELOG r369 entry, this LEDGER close.
- OPEN (owner/parent): the zero-trace real name; the 2 contrast decisions (gold-ink kicker, phone-mock dimming); the print-royal decision; the PR r369/new-identity → main opened READY but NOT merged — the merge is the owner's act, on their signal. Nothing pushed; all work on r369/local-upgrade.

## ROUND 2 — re-compare against the live reference (started 10:02 EET, user Telegram 24730228)

Branch r369/local-upgrade only; nothing pushed; origin/r369/new-identity still 0e6d46b at start.

### Reference inventory (sparkle.ankatms.com sitemap, English)
Home, /support/, /privacy/, /guides/reward-chart-for-kids/, /tools/reward-chart/, /impressum/ (+ localized trees). Home = 10 bands: hero · tasks · progress road · wishes · habits (night) · family · in-action reel · pedagogy · FAQ · finale. Ours maps 1:1 (hero, 02-06, handoff, showcase, principles, roles, FAQ, CTA); our counterparts for inner pages: /help·/contact (support), /legal/privacy, /about·/campus (guide), /legal/* (impressum). The reference's interactive reward-chart TOOL has no educational-platform equivalent (a family chore tool is not our product); not ported.

### Gap list (viewport-by-viewport, 1440, home)
1. Per-scene ambient grounds (reference: peach/sky/blush washes per band; ours: flat cream) — CLOSED this round (b9c2cba: feathered tint wash, tokens only, both themes).
2. Scroll-pinned scenes / floating particles / 3D character hero — the reference's character art is a different product's mascot; ours is نجّوم by canon (off public hero by r369 ruling). Not ported by design.
3. Reward cards fan (tilted deck) and the road path — OPEN, candidate for next batch.
4. Inner pages not yet compared page-by-page — OPEN.

### Round 2 additions (pushed at 25cd207) and ROUND 3 (started 14:13 EET, user Telegram 25478022)
- Round 2 closed: band scene wash (b9c2cba), indigo footer ground (7d3dc25, also re-keyed two lagging pins: r177 favicon cornerstone, drift fixture rungs), reward-card fan (25cd207). Pushed origin/r369/new-identity 0e6d46b -> 25cd207, fast-forward.
- Round 3 batch 1 — THE MASTERY ROAD (the reference's "progress you can actually see" road, in our unit): band 03's meter gains one winding lane from start to the course certificate. Fill, moving marker and the 10/20/30 milestone stops all read the SAME value as the counter (nothing invented). Geometry is read off the SVG path (getPointAtLength), % positioned so it scales; reads right-to-left under RTL; static under reduced motion; decorative (aria-hidden) because the counter and rows carry the information. Verified light 1440 + dark 390, 2 values, 0 console errors, no horizontal overflow; overlap audit on / at 7 widths x 2 themes: 0 findings; landing+r3xx groups 726/726; bundle 832.7 KB gz.
- Round 3 batch 2 — THE PINNED SCENE (the reference pins each scene's sticky 100svh stage while a tall track scrolls): done for the ONE band whose content is scroll-driven, 03 (#stars). >=900px and motion allowed only (query mirrored in index.tsx PINNED_Q): band ~190svh, head + meter sticky under the bar, counter/road/matrix follow the band's own travel (0 at bar contact, 30 at exit). Measured: meter top stays 88px across 5 scroll positions; counter reads 15 at the midpoint; 390px and reduced-motion keep the normal flow (meter top moves 80->100 / scrolls away). 0 overflow. Not pinned by design: bands 02/04/05/06 (static content; pinning them would add scroll length without adding meaning — recorded, not a gap). Drift on `/` vs the promoted baseline: clean (6 captures, CI ratio). Overlap audit `/`: 0 findings. Landing+r3xx 726/726. Bundle 832.9 KB gz.
- Main merge follow-up (drift): after merging main, the drift gate on 12 baseline routes (72 captures, mock mode, AUDIT_FCP_RATIO=4) found (1) /student/results: the StatLine labels on the deep ink band read the unremapped --text-secondary seat (2.85:1 light, 1.36:1 dark) — fixed by re-deriving --text-secondary on .r305s-band--deep (85/15 mix, same as --text-subtle); (2) /student/dashboard coverage floor: main's r365 grammar renamed the sampled classes — baseline re-promoted from the fresh merged capture (the gate's own documented procedure), after which drift is clean across all 72 captures. Overlap-audit tool fixed to use real line boxes and skip closed details (two false positives, /help and /about).
- Round 3 batch 3 — P4 product sweep (slice, 28 cells) on the merged build: 6 P1 found, all fixed. Landing @390: carousel dots 26px -> 44px hit boxes (dot art unchanged), footer + legal links min 44px wide; student courses act-now verb 36px -> 44px at <=640 (r369-app §7's dense in-table 36px outranked the floor: the verb is a standalone CTA on the phone); axe contrast: .topbar-xp 4.32 -> 5.29:1 and the two tinted-band kickers 4.41 -> ~5.1:1 (gold-ink mixed 85-88% toward ink, token seats unchanged — this closes the earlier "gold-ink kicker 4.41" open item locally without changing --gold-ink). The sweep now records class names and axe targets. Inner pages vs the reference's support/privacy/guide/impressum: compared, ours at parity or richer; the reference's mint contact callout is not ported (it would duplicate the contact buttons; honest: we have no public email).
