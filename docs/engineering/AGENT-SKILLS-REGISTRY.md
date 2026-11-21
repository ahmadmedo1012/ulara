# Agent skills registry — ULARA

Host Hermes: **v0.21.7+160.g6c853ab.dirty (2026.9.24)**, install method `git`,
install directory `/home/rh2011/.hermes/hermes-agent`. Discovery used the
installed CLI only (`hermes skills list`, `hermes skills search`,
`hermes skills inspect`).

## 1. Decision summary

**No third-party skill was installed during this audit.** The repository already
carries a stronger, machine-enforced equivalent of every requested capability
(`scripts/verify.sh` + the gate scripts), and the installed Hermes environment
already exposes the relevant workflows. Installing community skills would add
agent-side surface without adding a repository control, and the host config
belongs to the user — this audit must not rewrite it (`AGENTS.md` §7,
task §2 "Never overwrite existing Hermes configuration").

The requested capabilities map as follows.

| Requested capability | Available source (evaluated) | How it was applied here |
|---|---|---|
| `repo-audit` | builtin/local `system-audit-optimization`, `graphify-codebase-index`; hub `git-repo-auditor` (clawhub, community) | Applied directly: repository inventory, dependency and CI audit, evidence table in `REPOSITORY-AUDIT.md`. The hub skill was **inspected, not installed** (see §3). |
| `code-review` | builtin `sdlc-review` | Applied to every diff in this pass (source tracing, not filename guessing). |
| `refactoring` | repo rules in `AGENTS.md` §3/§6 | Applied as "smallest change that removes the evidence"; no speculative rewrites. |
| `testing` | builtin `verification-before-completion`, `test-driven-development` | Applied: failing-contract reproduction (`r344`) before any change, then targeted suite, then full suites — the upstream fix landed differently, so the local test edit was withdrawn during integration. |
| `code-documentation` | builtin `architecture-diagram`, `design-md` (not needed) | Applied as prose reference under `docs/engineering/`. |
| `dependency-hygiene` | Hub `dependency-audit` family (skills.sh, community) | Applied with `npm audit`, import tracing, unused-package removal (`axios`), compatible lockfile bumps. No skill needed. |
| `security-review` | local `system-hardening`, builtin `sdlc-review` | Applied manually against the request path; see `SECURITY-REVIEW.md`. |
| `ci-cd` | builtin `sdlc-review` | Applied: SHA pinning, Dependabot, workflow review. |
| `repo-standardization` | repo `CONTRIBUTING.md` + root docs | Applied: `RELEASE.md`, engineering docs, project skill. |
| `release-management` | none installed | Documented from the actual deploy topology in `RELEASE.md`. |

## 2. Installed environment (relevant subset, unmodified)

| Skill | Source / trust | Relevance |
|---|---|---|
| `sdlc-review` | builtin | Review workflow: requirements → design → tests → risk |
| `verification-before-completion` | builtin | "Run the check, quote the output" discipline |
| `test-driven-development` | builtin | Reproduce the failure before fixing |
| `system-audit-optimization` | local | Repository dashboards/health |
| `graphify-codebase-index` | local | Dependency/import mapping |
| `system-hardening` | local | Host/repo hardening checklist |
| `frontend-design`, `impeccable` | local | Design-system review (not exercised: no visual redesign authorised) |

## 3. Third-party evaluation record

| Candidate | Origin | Assessment | Decision |
|---|---|---|---|
| `@derick001/git-repo-auditor` (clawhub) | community, `skill-factory` | Inspected `SKILL.md` preview: requires `git` + `python3`, scans for secrets/large files. Overlaps the repo's own `size-gate`/`zero-trace` gates and adds an unaudited scan script. | not installed |
| `dependency-audit` family (skills.sh) | community, multiple unrelated authors | Several near-identical entries with no maintained upstream or licence metadata visible in the index listing; `npm audit` + `npm ci` already cover the need deterministically. | not installed |
| Superpowers / Vercel agent-skills | maintained upstreams | Reputable, but their guidance (TDD, review, React performance) is already encoded as binding rules in `AGENTS.md` and enforced by gates. Adopting them would duplicate rules, not add coverage. | not installed |

Security checks applied to each candidate before any install decision: origin,
trust tier, licence visibility, required binaries, presence of destructive
commands, network access, and overlap with existing controls. None was installed,
so no configuration file was modified.

## 4. Project-local skill

Because ULARA has a genuinely recurring, repository-specific workflow that no
global skill covers — *how to make a change without tripping the ceilings,
ownership rules and gate set* — one project skill was added:

- `.agents/skills/ulara-repo-ops/SKILL.md` — worktree isolation, the gate
  matrix, ceilings, ownership zones, and the failure-triage order.

Project skills under `.agents/skills/<name>/SKILL.md` are discovered by
path-based agent skill loaders (`SKILL.md` with YAML front matter) and are
scoped to this repository only; they never modify the global Hermes registry.

## 5. Rules for future skill adoption

1. Inspect the full source before install; reject anything that executes
   unreviewed network or filesystem operations.
2. Prefer a gate script in `scripts/` over an agent-side skill when the rule can
   be enforced mechanically — machine enforcement beats prompt guidance.
3. Never version a skill into the repository that duplicates `AGENTS.md`.
4. Record every adoption in this file with source, version/commit, and the
   security assessment.
