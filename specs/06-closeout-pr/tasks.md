# Tasks 06: close-out + the pull request

- [ ] T001 Receive the inspiration's name from the owner out of band; extend `zero-trace.sh`'s list; run it: 0 hits (commit nothing containing the name).
- [ ] T010 Dead-code sweep: retired sheets, orphan modules, stale pins, probes; diff shown in the PR.
- [ ] T011 Regenerate baselines in one late commit after slices 01–05 converge.
- [ ] T020 Full gate sweep in one run; output pasted into the ledger verbatim: tsc, build, bundle, tokens:check, raw-css --strict, colors --strict, motion, icons, csp-hash, stylelint, vitest, zero-trace, overlap audit, e2e with pre-existing failures re-confirmed against clean main.
- [ ] T021 Lighthouse on `/` (production build) + mobile perf re-measure; numbers and top opportunities into the ledger.
- [ ] T022 Docs: DESIGN.md canon completed, README/CHANGELOG lines, LEDGER closed with final numbers and the honest-gap list.
- [ ] T030 Open PR `r369/new-identity → main` as READY (not draft): final state, honest gaps, evidence index, per-slice evidence comments. DO NOT MERGE.
- [ ] T900 Report to the owner: the PR link, the sweep numbers, what stayed unverified (webkit, any gaps), and wait for the merge signal.
