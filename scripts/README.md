# scripts/ — index

The gate set every agent runs before pushing: **`bash scripts/verify.sh`** (or `--fast`).
Nothing reaches main without it (R335/R336 lesson — twice red from unverified merges).

| path | what it does | when |
|---|---|---|
| `verify.sh` | the ONE local gate set: tsc, vitest, build+bundle gate, stylelint+CSS-ratchet (`gates/stylelint-gate.sh`), design gates, lint, scoped e2e. `--fast` = tsc+vitest+bundle+stylelint-ratchet. `--specs <stems>` scopes the e2e leg | before every push |
| `gates/stylelint-gate.sh` (+ `stylelint-baseline.json`) | R339 T-30 CSS ratchet: stylelint errors + `!important` / raw-z-index / raw-hex counts vs the committed baseline — counts only go DOWN | verify.sh (both modes) |
| `gates/css-counts.mjs` / `gates/css-coverage.mjs` | CSS line/sheet budget counts + selector coverage probe (summary lands in `docs/design/css-coverage.json`) | manual |
| `deadcode/check.sh` (`knip.json`, `jscpd.json`, `baseline.json`) | dead-code / duplication / circular-dep ratchet (knip + jscpd + depcruise) vs baseline; `--update` re-pins measured improvements in the same commit | deadcode.yml CI + manual |
| `check-bundle-size.mjs` | gz ceilings: total ≤770 KB (r339 restored r337's 777), entry ≤92, pdf ≤110 (pinned; raise only with documented reason in the file header) | CI Build + verify.sh |
| `check-icons.sh` / `check-colors.sh --strict` / `check-raw-css.sh --strict` / `check-motion-tokens.sh` / `check-csp-hash.sh` | design gates: icon discipline, no raw colours, no raw type/radius/spacing, motion tokens, CSP pin | CI design-gates + verify.sh |
| `tokens/build.mjs --check` | generated-token drift (web CSS + mobile TS vs shared/design-tokens.json) | CI + verify.sh |
| `verify-parity-export.mjs` | parity export gate | CI + verify.sh |
| `smoke-deploy.mjs` | post-deploy smoke | deploy |
| `db-backup.mjs` / `db-restore.mjs` | Neon snapshot ops | manual |
