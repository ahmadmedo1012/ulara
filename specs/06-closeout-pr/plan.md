# Plan 06: close-out + the pull request

## Constitution check
- Zero-trace is the slice, not a step: the owner's out-of-band name
  is verified absent everywhere (code, docs, comments, commit bodies,
  branch metadata).
- Scope: repo-wide hygiene + docs + the PR. No feature work; a defect
  found here goes back to its slice or into the honest-gap list.

## Technical approach
- Dead-code sweep with the repo's own tooling (`scripts/deadcode`,
  branch-sweep) plus manual passes over styles and tests.
- Baselines: regenerate in ONE late commit after slices 01–05
  converge, so the diff tells the story once.
- Gate sweep scripted as one invocation list so the ledger paste is
  reproducible.
- Lighthouse on `/` against the production build locally; record the
  four scores and the two or three biggest opportunities honestly.
- PR body: from a template in this spec's directory; evidence index
  links the per-slice folders.

## Files in scope
- `scripts/brand/zero-trace.sh` (the owner-supplied name list),
  `docs/redesign/r369/LEDGER.md`, `DESIGN.md`, `README.md`,
  `CHANGELOG.md`, regenerated baselines, the PR itself.

## Research notes
- r368 close-out protocol (branch-only pushes, Draft PR, no merge)
  carries over verbatim until the owner's start signal says otherwise.
