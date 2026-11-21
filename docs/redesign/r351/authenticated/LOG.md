# r351 A2 — LOG (evidence journal)

Format: command → result → decision/commit. Numbers are measured, never copied.

## Session 1 — setup + Q0

- `git clone …ulara.git` → ok. `git rev-parse origin/main` →
  `35793f799929a2f9ace9cf69c40b641250c0122c` = task baseline ✓.
- `git worktree add ~/agent02/ulara-work -b r351/authenticated-web 35793f7…` →
  `HEAD is now at 35793f7` ✓ (branch `r351/authenticated-web`).
- Read: `frontend/src/lib/routes.ts` (105 routes), `lib/nav.ts` (5 role maps,
  STUDENT 31 / TEACHER 23 / ADMIN 12 / QUALITY 10 / OWNER 13 nav destinations),
  `App.tsx` (role-guarded route blocks), `scripts/verify.sh` (fast = tsc+vitest
  +build+bundle+css-ratchet+logo+a11y), `scripts/brand/zero-trace.sh` header
  (fragment-assembled patterns), `AGENTS.md` (npm only; commits `type(rNNN): …`).
- Read reference extraction `docs/redesign/r350/reference/REFERENCE.md`:
  paper white / ink #282828 / hairline #b3b3af / mono labels / accent #f15534.
  Barba transition = inset clip-path 0→50% (~0.6s power2.in) then 50→0%
  (~0.7s power2.out). Shell adaptation: calm hairlines, mono registers,
  ≤220ms overlay motion with the clip-path feel.
- Wrote `scripts/e2e/route-audit.mjs` (A2 instrument): every nav route ×
  {1440,1024,768,390} light + dashboards dark, metrics words/scrollHeight/
  h-overflow/taps<44/501s/fixed∩content overlaps. Port 5302.
  (runs pending: npm ci in progress)
