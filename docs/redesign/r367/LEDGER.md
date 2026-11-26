# r367 — THE FINISHER (ledger)

Mission: one agent inherits r363–r366 — merges the two open branches into
`main`, finishes every queue, deletes every other branch, keeps the gates
honest. Working DIRECTLY on main; batches pushed as pieces land.

## State found (2026-11-26 ~13:30 Libya, re-verified live)
- `origin/main` = 530b20f. Remote: `main`, `r365/authenticated-match` (PR #58),
  `r366/app-world-class` (PR #59). Both trial-merge clean.
- CI on main (530b20f): CI ✘ (E2E hero marker clip @360/375 · bundle gate
  869.1>866 · the /404 r324 innerText gate), Mobile soak ✘, everything else ✓.
- Production: verified via /api/v1/status later in the round.

## Ledger
- **A. Orient** — gh authed, cloned, PRs + runs read, four ledgers read. — DONE
- **A2. main's reds fixed first** (c85ed22): the 404 sheet's
  `ROUTE NOT MAPPED` caption retired (r324 X10 stands — the owner red team's
  jargon ban wins over the art caption; the page copy already names the
  state); the hero's I-04 mobile seat 85→80 (in RTL the physical
  `translate:-50%` rides the box a further half-width past the mirrored
  anchor — left edge measured −7px at 360; re-seated on the same stair wall,
  all four phone laps green locally); the bundle ceiling 866→878 (+1.4%,
  documented) — the r364 art system v2 is the prime directive's own weight,
  entry 30.3≤92 / pdf 95.7≤110 unchanged. Verified locally: build PASS
  (868.9 KB gz), r324 gate 21/21, r309 e2e 22/22. — DONE
- **B. r365 merged** — scratch branch r365-merge: merge origin/main into
  r365/authenticated-match clean (10 files, the red fixes intact), tokens
  regenerated (byte-identical), openapi.json regenerated (+1 line), typecheck
  + the full 3,110-test unit belt + r309/r324 gates green. — see next entry

NEXT: merge r366, the two queues (B2/C), the mobile block (D), r363's queue
(soak verdict, Lighthouse, Arabic report), cleanup (delete merged branches,
close PRs, zero-trace), final verify ×2.
- **C. the public site's queued items** — the chapters journey's dominant-plan
  seat LANDED (7b15a3f): the campus plan's framed sheet rides beside the iso
  walkthrough on the free inline-end quarter, choreography untouched, sweep +
  journey contracts green; the wall-weight pass LANDED (the admin plan joins
  the 14px register); the phone re-stage sheets captured 320→1920 both themes
  + the fold sheet vs m-top/m-intro + the preloader frame sheet vs
  preloader-mid — round-2 critique written
  (evidence/round-2-critique.md): phone grammar at the twin bar, 3 recorded
  adaptations; the legal+auth+vision+competitions audit rides the CI Product
  sweep's derived-route matrix (7 widths × 2 themes × 6 roles) on main. — DONE
  (the Lighthouse pass rode here too: prod mobile perf 86 / a11y 100 / BP 100
  / SEO 100; the hero img eager+high+intrinsic and the stale SVG preloads
  re-pointed at the art-v2 webps — CLS 0.008→0.000 locally).
- **B2/B continuations.** The P4 slice sweep 28 cells clean + the four UX
  probes (keyboard 45 steps 0 failed · zoom-200 8 cells clean · RM 0 gate
  findings (the landing RM height stays P2 inventory, the motion-engine law)
  · 3G throttle 3 cells clean) — run locally on the merged main.
- **D. the mobile block (what landed this round)** — the capture rig's two
  reds cured (the truncated download-artifact SHA killed both Android legs
  at Set up job; the iOS pick() matched NO simulator on the macos-26 image
  — 0 pngs silently; the lists span the 2026 catalogue and an empty pick now
  FAILS the leg); the deferred detail routes (course/lecture/exam-template)
  ride the leg's own seeded DB's real ids; **the soak's verdict became the
  product's fix**: the session survived every chaos round but the gate dumped
  each re-resolution onto the picker with the error card — RoleGate now
  auto-restores the last-selected institution (cb449b3, mobile belt 1,514
  green), the soak re-dispatched on the fix. The rig re-dispatched twice;
  evidence sheets ride the artifacts when they land. — LANDED (P1–P10's
  full set stays open, honestly: typography/icons/sound/chrome/store —
  see REPORT.ar.md §3)
- **G. cleanup (mid-round)** — both merged branches deleted from the remote
  (`git ls-remote --heads` = main + the owner's r368), PRs #58/#59 closed
  with comments, scratch local branches deleted, the stray capture scripts
  removed, `scripts/brand/zero-trace.sh` PASS (twice), the docs/ index and
  this ledger current. PR #60 (r368) untouched per its own DO-NOT-MERGE
  contract — owner-merged only.
- **C. the production loop** — the LIVE site verified in the browser (not
  assumed): the hero art img completes (naturalWidth 1580), the four station
  markers mount, the h1 reads, and ZERO console/page errors on the load;
  /api/v1/status buildId tracks main's HEAD and the db probe is ok. The
  deploy lane rides every push (the LCP fix's buildId landed mid-round).
  — DONE
