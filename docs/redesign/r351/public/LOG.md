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
