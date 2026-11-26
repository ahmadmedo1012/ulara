# r368 Spec Kit setup

- CLI: specify-cli 1.4.5 from PyPI via `uv tool install specify-cli` (PATH: `~/.local/bin`).
- Init: `specify init --here --force --non-interactive --integration copilot --script sh` (integration key `copilot`; skills land in `.github/skills/`, invoked as `/speckit-<name>`; agents without native loading read the SKILL.md and execute it).
- Core commands: constitution, specify, clarify, plan, tasks, analyze, checklist, implement, converge.
- First-party extensions installed: `bug` (bug-assess, bug-fix, bug-test: regressions found by the loop), `assess` (intake, research, define, shape, decide: risky art or performance decisions), `github` (taskstoissues: task to issue).
- Deviations: the `git` branching extension is NOT installed (all work stays on `r368/speckit-public-match`); feature folders are created manually under `specs/NN-slug/`. `.specify/` is tracked (root `.gitignore` entry replaced; machine-local files stay ignored via `.specify/.gitignore`). No community add-on installed (none audited needed).
- Constitution: `.specify/memory/constitution.md`.
- Re-run capture/compare: see each `specs/NN-slug/quickstart.md`.
