# Engineering standards — ULARA

> These standards restate what the repository already enforces, plus the rules
> this audit applied. Where a rule is machine-enforced, the enforcing gate is
> named; where it is a convention, it is marked as such.

## 1. Toolchain

| Item | Value | Enforced by |
|---|---|---|
| Package manager | npm workspaces (`backend`, `frontend`) | `package-lock.json` is committed; no pnpm/yarn |
| Node | `>=20 <25`, CI pins 22 | `engines` + `scripts/warn-node-env.mjs` preinstall |
| Language | TypeScript (strict) both sides | `npm run typecheck` (src **and** tests) |
| Lint | ESLint flat config | `npm run lint` — 0 errors required; warnings tolerated and tracked |
| CSS | Stylelint 16 + CSS ratchet | `scripts/gates/stylelint-gate.sh` |
| Tests | Vitest (jsdom for the SPA), Playwright for e2e | `npm test`, `npm --prefix frontend run test:e2e` |

Arrow-function components, `.js` extensions on backend relative imports (NodeNext),
and logical CSS properties are the prevailing conventions; follow the file you touch.

## 2. Change discipline

1. **One worktree per task.** Never edit a shared working tree; never switch
   branches under another agent.
2. **Tests are law.** Never delete a test, weaken an assertion, or skip a suite
   to make a change green. When an implementation contract deliberately changes
   (for example a raw `z-index: -1` becoming `var(--z-cta-resolve-under)` with
   the same computed value), update the *contract assertion* and assert the new
   invariant explicitly — never by deleting the check.
3. **No ceiling raises.** Bundle (770 KB total / 92 KB entry / 110 KB pdf), design
   gates, CSS ratchets and dead-code thresholds move only in the safe direction,
   in the same change that justifies them.
4. **Verify before claiming.** Run the gate and quote its actual output. A
   compile is not a test; a green subset is not a green suite.
5. **Small, reversible steps.** Prefer the smallest change that removes the
   evidenced defect. No cosmetic renames of routes, fields or models — those are
   API contract.

## 3. Code

- **Backend**: route → module → prisma. Validation at the route boundary with
  Zod; domain decisions in DB-free functions; errors via `AppError`/`ErrorCode`;
  never leak stack traces or provider payloads to the client.
- **Frontend**: server state in TanStack Query, client state in Zustand, route
  strings only from `lib/routes.ts`. New imports must respect the entry-chunk
  budget; heavy pages stay lazy.
- **CSS**: tokens only. Section-scoped variables for measured deviations, never
  ad-hoc edits to global tokens. RTL is the default direction — use logical
  properties; letter-spacing 0; Arabic line-height floor `max(dsLh, 1.35×fs)`.
- **Accessibility**: keyboard reachability, focus-visible, labelled controls and
  live-region announcements are contract, guarded by the e2e/a11y belts.

## 4. Testing strategy

| Layer | Tool | Scope | Runtime |
|---|---|---|---|
| Unit (frontend) | Vitest + jsdom + Testing Library | components, hooks, stores, static contract pins | DB-free |
| Unit (backend) | Vitest | modules, middleware, route handlers with mocked `db.js` | DB-free |
| Contract | Vitest snapshot | `backend/tests/contract` — additive-only wire fields | DB-free |
| Integration | Vitest + Postgres | transactions, locks, unique constraints (`test:integration`) | disposable DB |
| E2E | Playwright, hermetic fixtures | 34 journey specs + the r305 QA belt | no backend, no network |
| Visual/audit | Playwright + axe | surface inventory drift, a11y gate, pixel belts | build output |

Rules: a bug fix lands with the test that fails without it. Fixtures must be
deterministic — prefer explicit resolvers/`act()` over sleeps, and portable
paths (`fileURLToPath`, not `new URL(...).pathname`) so worktrees with spaces or
Arabic characters work.

## 5. Dependencies

- Direct dependencies are intentional and few; a new one needs a stated reason
  the codebase cannot satisfy.
- Unused direct dependencies are removed (this audit removed `axios`, which had
  zero imports after the native-fetch migration and carried the only
  `follow-redirects` advisory).
- Security fixes inside a semver range are applied via the lockfile; breaking
  majors (React Router 7, Zod 4) need a migration plan with regression coverage.
- Lockfile changes must be reproducible: verify with `npm ci`, not `npm install`.
- Dependabot (`.github/dependabot.yml`) opens grouped patch/minor PRs; majors of
  React/React Router/Zod/Prisma/Expo are excluded from automation by design.

## 6. Security

- Secrets live only in `.env` (untracked) or platform settings. `.env.example`
  documents the full variable surface with placeholders only.
- Every new endpoint: authenticate, authorise at the resource boundary, validate
  input, rate-limit if it is credential- or cost-bearing, and return the standard
  error envelope.
- No production credentials are rotated, printed or copied during engineering
  work. Repository security features (secret scanning, code scanning, push
  protection) are verified in GitHub settings — never assumed from a checkout.

## 7. Documentation

- `AGENTS.md` is the operational contract; `docs/engineering/` is the engineering
  reference (architecture, standards, audit, security, CI/CD, release).
- Documentation states measured behaviour. When code and docs disagree, fix the
  doc in the same change.
- Do not add a document that restates another one; link instead.

## 8. Commits and branches

`type(scope): subject` (`feat|fix|docs|chore|test|refactor|perf|ci|…`), enforced
by `.githooks/commit-msg`. Branches: `wip/<task>` for programme rounds,
`feat/…`, `fix/…`, `chore/…` otherwise. No force-push, ever.
