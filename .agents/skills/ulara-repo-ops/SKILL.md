---
name: ulara-repo-ops
description: Operating rules for changing the ULARA repository — isolated worktrees, the gate matrix, hard ceilings, ownership zones and failure triage. Use at the start of any task that edits this repo.
---

# ULARA repo operations

`AGENTS.md` is the contract; this skill is the short operational path an agent
needs before touching files. Read `AGENTS.md` for the full rules.

## 1. Isolate first

- One worktree per task; never edit a shared working tree or switch its branch.
- Branch naming: `wip/<task>` for programme rounds, `feat/…`, `fix/…`,
  `chore/…` otherwise.
- Worktree paths may contain spaces and Arabic characters — never build file
  paths from `new URL(import.meta.url).pathname` (use `fileURLToPath`).
- Do not push, force-push, tag, merge or deploy unless the task explicitly says so.

## 2. Know the ceilings (never raise them)

| Gate | Ceiling / rule |
|---|---|
| Bundle (`scripts/check-bundle-size.mjs`) | total ≤ 770 KB gz, entry ≤ 92 KB, pdf ≤ 110 KB — all chunks, async included |
| Design gates | tokens only: no raw colour/type/radius/spacing/motion; Lucide icons via `Icon.tsx`; CSP hash must match `frontend/index.html` |
| CSS ratchet | stylelint errors and raw-value counts may only go down |
| Tests | tests are law — reconcile implementation, never weaken an assertion |

## 3. Run the right checks

```bash
# fast loop while working
cd frontend && TZ=UTC npx vitest run tests/unit/<file>          # focused
cd backend  && npx vitest run src/modules/<file>.test.ts        # focused

# before handing work over
npm run lint && npm run typecheck
npm test                                                       # both workspaces, DB-free
npm --prefix frontend run build && node scripts/check-bundle-size.mjs
bash scripts/verify.sh --fast                                  # full local matrix (lead only full run)
```

Do not run root `npm run build` (it migrates and seeds a database) and never run
`db:seed`/migrations against production.

## 4. Stay in your lane

- Landing sections own `components/landing/**` + their `styles/landing/<x>.css`;
  `.github/workflows`, ceilings and baselines are lead-only unless the task says
  otherwise.
- Route strings come from `frontend/src/lib/routes.ts`; API shapes from backend
  routes + `docs/api/openapi.json`. No cosmetic renames of routes/fields/models.

## 5. Failure triage order

1. Reproduce with the narrowest failing test and read the assertion.
2. Decide whether the code or the *contract assertion* is wrong — a deliberate
   implementation change (e.g. a raw value moving to a scoped token variable)
   updates the assertion **and keeps the invariant checked**.
3. Fix the cause, rerun only the failing check, then the full relevant suite.
4. Report exactly what ran, what passed, and what could not run.
