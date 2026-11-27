# Feature Spec 06: close-out + the pull request (LEDGER slices F + G)

Status: Clarified. Source of truth: the LEDGER's F/G lines, the gate
scripts, the r368 close-out protocol.

## What ships

The round ends verifiably clean:

- **Zero-trace with the real name.** The owner supplies the
  inspiration's name out of band; `scripts/brand/zero-trace.sh`
  confirms it appears nowhere in the tree. The name is never committed.
- **Dead-code sweep.** Retired sheets, orphan modules, stale pins and
  probes removed; the sweep is shown in the diff, not just claimed.
- **Baselines regenerated once**, late, in one commit, after every
  visual slice has converged.
- **The full gate sweep in one run:** tsc, build, bundle ≤ 832 KB gz,
  tokens:check, raw-css --strict, colors --strict, motion tokens,
  icons, csp-hash, stylelint, vitest full suite, zero-trace, overlap
  audit 0 findings at 7 widths × 2 themes, plus the e2e suites with
  the pre-existing failures re-confirmed against a clean main
  worktree (the r368 protocol: a failure only counts when it is not
  already main's).
- **Lighthouse on `/`** (performance, accessibility, best practices)
  recorded in the ledger; mobile perf re-measured.
- **Docs:** DESIGN.md current-canon section completed, README/
  CHANGELOG lines, the LEDGER closed with the final numbers.
- **The PR** `r369/new-identity → main` opened as READY (not draft),
  description carrying the ledger's final state, the honest-gap list,
  and the evidence index. **Not merged.** The merge is the owner's
  act, on their signal.

## Known carry-overs to restate in the PR

- Pre-existing main failures (from the r368 sweep, re-verify at
  close-out): r311 route yield, r325 map-clip ×2, r352 attach PDF,
  r353 reduced-motion PIXEL-visible, r354 ×4, r305 focus-keyboard
  "first Tab" (partial count).
- WebKit/iPhone e2e: never run locally (no webkit browser); the PR
  says so plainly and lists what substitutes (chromium-iphone 8/8
  under r368, the audit matrix).
- Any honest gaps slices 03/05 recorded (data the surface needs but
  cannot get without backend work).

## Acceptance

- One comment-thread on the PR per slice linking its evidence sheets
  and critique lines.
- The gate sweep output pasted into the ledger verbatim.
- The PR is ready-for-review with everything above; merge withheld.
