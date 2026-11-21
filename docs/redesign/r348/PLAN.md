# R348 — PLAN (the dashboards' audit residuals retire)

## The mandate

The r347 handoff carried four honest residuals. This round owns the three
that are ours (the mail-domain verification stays the owner's
dashboard action; the WebKit + DB-integration lanes stay CI-only):

1. the teacher hero's dead left half at 1440,
2. the empty-stat «—» treatment reading broken,
3. the student dashboard's layout seams,
4. the icon-rail's visual rhythm (grouping consistency).

Every change landed on the REAL repo's main first-by-first (the owner's
live-project law), one wave per commit, gates before every push.

## Wave A — the pattern-level fixes (`cbd0c6a` + `8672228`)

- **StatLine spread + honest-empty register** (patterns, CONTRACT-additive):
  `spread` distributes the stats across the sheet's FULL line on the
  desktop band — four narrow stats on the 1080px frame hugged the
  inline-start edge and left ~440px of dead paper at the inline-end on
  BOTH role dashboards. `item.empty` drops a not-yet datum («—») to the
  body-size faint register instead of the bold display numeral that read
  as a broken number; the hint line carries the why.
- **The ruler numerals' seat** — TWO-layer root cause, closed honestly:
  the first attempt dropped `dir="ltr"` and the live re-verification
  STILL measured the overflow (x=1237 vs band edge 1224). The deeper
  truth: the numerals were `<bdi>` elements, and a bdi AUTO-RESOLVES its
  direction from content — digit-only text has no strong character, so
  the isolate falls back to LTR and the element's OWN logical inset kept
  mapping to the physical LEFT while the ticks/fill mapped RIGHT. The
  fix is the element itself: a plain `<span>` inherits the sheet's RTL.
  Live-measured after: «0» flush at the fill origin (right), middles
  centered ON their ticks (25 → 997.5 vs tick 997.25), «100» inside at
  the track's left end — 807px clear of the band edge.
- **The semester ruler's W-head** (student kit): same class of bug —
  dir="ltr" seated it mirrored off the fill's end; the RTL seat rides
  the fill end with the clamp's 52px reservation keeping it inside.

## Wave B — the teacher hero fills with real data (`bac79a9`)

The audit measured the header's inline-end zone holding ONE chip
(x=144..283) while the text block sat at x=918..1224 — ~600px of paper
between. The actions strip now seats the ONE next commitment of today
beside the follow-up chip («التالية اليوم» / «جارٍ الآن» + course + mono
time run — `td-hero-next`, §A tqd- family, ember only for the live
phase). An empty day renders no block — nothing is fabricated. The
offerings query hoists into the page component (react-query dedupes with
TodayLectures' — still ONE request). The StatLine joins wave A's
registers. Test reconciliation (r162 law): the today-strip time
assertion scopes INTO the strip's own section — a STRONGER pin, nothing
loosened.

## Wave C — the student layout's measured seams (`9dccbad`)

- The deep hero's instrument rows uncap: `.dash-resume-progress` /
  `.dash-resume-segments` retire the authored 420px seat — the band
  spans the 1080px frame while its ruler hugged 420px, leaving a ~400px
  ink void between the text column and the CTA (live-measured). The
  drafting ruler reads BETTER wide — the [01] semester ruler above it
  already spans the full frame.
- The momentum StatLine joins spread + honest-empty (the student's own
  «dead half» measured ~750px).

## Wave D — the collapsed icon-rail's rhythm heals (`7f94e98`)

The footer theme toggle carried its segmented-track well (--surface-2
ground + hairline border + inset) INTO the 72px rail — the loudest block
in the icon stream, reading as a foreign fourth nav group (the rail's
groups are otherwise uniform: 1px --rule hairlines, 8px/8px padding,
measured). The well retires on the collapsed rail only; the is-active
thumb drops its boxed cell for the ink step — the same register the
active nav row speaks since R313. Drawer + expanded sidebar keep the
segmented track untouched; the topbar's theme seat keeps the control
reachable everywhere the rail isn't.

## Gates (all measured this round)

- `verify.sh --fast` PASS: tsc 0 · vitest full · bundle **757.0/770 KB
  gz** (entry 63.8, pdf 95.7) · css ratchet (52) · logo · a11y 0-above-
  floor.
- Design gates: raw-css --strict PASS · colors --strict PASS ·
  motion-tokens PASS. stylelint ratchet green (38 / rawZIndex 72 — both
  at their ratcheted-down baselines). eslint 0 errors.
- E2E (chromium, the symlink fallback per AGENTS.md §8):
  r319-dashboard-material **13/13** (the ruler pins ride it) ·
  r319-shell-chrome **10/10** (the rail chrome rides it) ·
  r319-student-pages-a **4/4** · r305-shell-ds **27/28 in-bundle** with
  the scroll-restore case passing solo 2/2 (the test's own comment
  documents the 2-CPU load flake — d6ac9b7's CI evidence covers it).
- Unit pins re-run per wave: 56/56 · 30/30 · 43/43 · 33/33.
- Live browser verification (agent-browser, 1440 + 390): the teacher
  hero's strip + the spread statline, the student ruler's seats, the
  momentum spread, the flat rail — all measured on the rendered page;
  zero horizontal overflow at 390.

## Honest residuals (carried forward)

- The deadcode ratchet (knip/jscpd/depcruise) runs in CI only — the
  sandbox lacks the global analyzers; the diff adds no files/exports
  and jscpd ignores comments, so the baseline holds by construction.
  CI (deadcode.yml) is the verifier of record.
- The mail domain verification stays the owner-dashboard action at
  resend.com/domains (unchanged since r344/r345 — send-only key).
- WebKit + DB-integration lanes run in CI only (sandbox limits).
