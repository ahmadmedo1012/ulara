# r351 — A1 PUBLIC EXPERIENCE — LOG

| # | step | command | result | commit |
|---|---|---|---|---|
| 1 | P0 gap matrix | `node p0-capture.mjs` (1440+390 @ ref offsets) | landing **14,637px/1440** vs ref 13,255 (+10.4%) · **12,457px/390** vs ref 10,613 (+17.4%) · words **1038** · overflow 0/0 · console 0 | `535c01a` |

**zero-trace note (P0):** the gate exits 1 on the BASE commit too (identical output on
`main`): pre-existing content traces in `CHANGELOG.md`, `docs/redesign/r350/HANDOFF.md`,
`docs/redesign/r350/LOG.md` + two git-history rows — the documented red r350 shipped with
(main's own final row records it). Files outside A1 ownership (`CHANGELOG.md` — NOBODY
edits; r350 docs — not mine). A1 adds zero new traces; every A1 push re-runs the gate and
compares against the base state.
| 2 | P1 hero rebuild | `vite build` + Playwright 1440/390/dark/RM shots | H1 **95px @1440** (was 46.7) leading the fold · lead 1 sentence (was 2) · ONE CTA (roll+fill wipe; login secondary retired to masthead) · stage decluttered (labels/coords/scalebar hidden, deco cards removed) · hero 915px · 390 overflow 0 | pending |
| 3 | P2 preloader | `node pl-probe.mjs` (in-page sampler) + shots/p2/ | counter curve fast→45 @~1.0s · slow→60 @~1.5s · fast→92 → 100 @~2.4s · exit ~3.75s (honest window intact — r309 belt 27✓ + r323 27✓) · X:/Y: readout live · ruler+4 plus marks · boot ledger 10 rows progress-locked | pending |
| 4 | P3+P6 heights+copy | `node mr*.mjs` (in-view instruments) + verify --fast + landing e2e | **1440: 12,737 real / 12,853 fresh ≤ 13,255 ✓** · **390: 11,882 real (target 10,613, +12%)** · words **793 @1440 (1038→−23.6%)** · ov 0 · sections: st 723=ref ✓ pm 743=ref ✓ pr 712≈ref ✓ rl 886≤ref ✓ cta 768≈ref ✓ footer 840 · contain-intrinsic re-pin (wy 2488→1317, cta 1164→768) · honesty pins restored (r168b/r306) | pending |
| 5 | P4 ink/lens/cursor/route | shots/p4/ + lens probe | route transition = the measured open arc (inset 50%→0, 0.7s power2.out) on the keyed remount, close-leg CSS seat ready for A2 · statement courtyard rides the shared displacement filter (§5 constants verbatim) · footer pointer-lens fill (own design, radial mask, RM-hidden) · SheetCursor velocity trail already ships (26-pt canvas) | pending |
| 6 | P5 audit+perf | `r351-public-audit.e2e.ts` (15✓) + PerformanceObserver census | masthead+journey: 0 text collisions, 0 clipped captions @1440/1024/768/390/360; ov 0 · long tasks: **1440 0 · 390@1× 0** · 390@4×: 12 tasks 52–65ms (=13–16ms @1×, inside the 16.7ms frame budget; profile: the scrub drivers' style writes on the iso sheet — the reference's own 41-trigger class of work) · fix shipped: journey phone retires the zone-name labels (the «ميدان التدريب» × panel-title collision the belt found) | pending |
