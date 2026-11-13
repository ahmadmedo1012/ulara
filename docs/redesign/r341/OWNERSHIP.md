# R341 — OWNERSHIP (binding per-task file contracts)

One worktree per task (`/home/z/wt/<task-id>`, branch `wip/<task-id>`).
Own ONLY the files your task names. Everything else is a merge block.
Shared instruments (`scripts/conformance/run.mjs`, gates, ceilings,
`.github/workflows`) are lead-only — no task touches them.

| Task | Track | Exclusive file ownership |
|------|-------|--------------------------|
| t01 | mobile | `apps/mobile/app/settings.tsx`, `apps/mobile/app/student/(tabs)/profile.tsx`, `apps/mobile/app/teacher/live.tsx`, `apps/mobile/app/document/[filename].tsx`, `apps/mobile/src/components/ui/sheet.test.tsx` (append-only regression cases) |
| t02 | mobile | `apps/mobile/src/components/ui/boot.tsx`, `apps/mobile/src/components/ui/boot.test.tsx` (if present, else create) |
| t03 | mobile | `apps/mobile/src/lib/resilience/network.tsx`, `apps/mobile/src/lib/resilience/network.test.tsx` (if present, else create) |
| t04 | mobile | `apps/mobile/app/admin/(tabs)/dashboard.tsx`, `apps/mobile/app/owner/(tabs)/dashboard.tsx`, `apps/mobile/app/student/lectures/[lectureId].tsx` |
| t05 | web | `frontend/src/pages/auth/RegisterPage.tsx`, `frontend/src/components/landing/sections/Footer.tsx` |
| t06 | web | `frontend/src/pages/quality/QualityPages.tsx` |
| t07 | backend | `backend/src/app.ts` (health block only), `backend/src/lib/errors.ts` (code union only), `backend/tests/http/health.test.ts` (if present, else create) |
| governance (lead) | docs | `docs/redesign/r341/**` |

## Conflicts resolved at assignment time

- t01 vs t04: both touch mobile app files, zero overlap — safe parallel.
- t02/t03: disjoint files — safe parallel.
- t05/t06: disjoint files — safe parallel.
- No task touches: `package-lock.json`s, `prisma/schema.prisma`,
  `.github/workflows`, `scripts/conformance/**`, token sheets.
