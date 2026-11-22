# r350 HANDOFF — session 2 (2026-11-21)

Read `PLAN.md` first (phase table), `LOG.md` (evidence journal), then this file.

## Repo state at handoff

- `main` = `7870e07` (pushed; CI status: see the run on that SHA — size gate,
  deadcode, zero-trace-content all repaired this session; the ONLY known red is
  zero-trace's HISTORY scan, one commit message, owner decision #2).
- Branch `owner-decision/auth-panel-hide` (LOCAL ONLY, `06a7d9c`): the §8 patch.
  Also exported: `/home/z/ulara-auth-panel-hide.patch` (6.5KB, applies with
  `git am`).
- Working tree clean on `main`.

## What session 2 did (see LOG for evidence)

1. B1 finished: `scripts/e2e/role-shots.mjs` (the hermetic 5-role sweep instrument)
   + 16 fixture endpoints (all role dashboards were 501-ing loudly; the owner
   dashboard HARD-CRASHED — fixed) + 10 clean cells + DSF-2 shots in `shots/`.
2. B2 part 1: /app 438→210, settings 316→238, student/university 298→259 words.
3. CI repairs: test-tree typecheck (one-title fallout), zero-trace rename
   (`refsite-*` fixture rename + content scrub), size gate (rule 2 raise 30→40MB +
   27 shots quantized, docs 33.3→19.0MB), deadcode re-pin (jscpd 259→256).
4. §8 patch prepared (UNPUSHED, per the brief).
5. B7 docs: CHANGELOG r350 section, PLAN.md, this file, AGENTS.md §7 amendment
   (owner rule 4 — replication allowed, the NAME stays retired, product-code
   verbatim reuse stays banned).

## How to resume (next session's first moves)

1. Poll CI on `7870e07` — expect green except zero-trace history scan.
2. B3 route inventory: `frontend/src/App.tsx` + `src/lib/nav.ts` — merge
   near-duplicates, redirect orphans, exercise every route with the fixture
   transport (`role-shots.mjs` pattern; unmatched endpoints → LOG, not hide).
3. B4: read `reference/REFERENCE.md` (all measured: tokens, preloader ≈4.35s
   counter + ≈6.9s exit, journey 13,255px @1440, CSS-sticky scenes — ZERO GSAP
   pins, ink filter constants, barba clip-path curve). Measure the CURRENT
   landing at the same scroll offsets (wheel-step — Lenis blocks scrollTo),
   diff against the recorded data, then close gaps largest-first. The house
   engine stays unless a gap needs the reference's exact tool.
4. B5/B6 audits ride the same sweep (skeleton unification seats are listed in
   the brief §6; 44px tap floor + 360px overflow are assertable in one
   playwright pass reusing `role-shots.mjs`'s matrix).

## Instruments this session leaves behind

- `scripts/e2e/role-shots.mjs` — 5 roles × themes × viewports, hermetic, word
  counts + console/request-error separation (dev-audit noise never counted as
  runtime errors).
- The fixture corpus (api-fixtures.ts + mock-transport.ts) now covers EVERY
  role dashboard — journey specs for staff roles can now be written hermetically.
- `tmp-*` probes were removed; nothing scratch remains in the tree.
