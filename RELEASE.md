# RELEASE.md — ULARA release management

> Companion to `docs/engineering/CI-CD-REVIEW.md`. This document describes the
> release process that the repository actually supports. It does not invent
> releases: the only published version is `1.0.0` (see `CHANGELOG.md`).

## 1. Versioning

- **Semantic Versioning** on the root `package.json` (`1.0.0`), which is the
  single version for the deployed product (backend + SPA ship together).
- `apps/mobile` versions independently through Expo/EAS and its own build lanes;
  mobile releases are not implied by a web version bump.
- Pre-1.1 work is recorded under `## Unreleased` in `CHANGELOG.md`; a version
  heading is added only when a release is cut.

## 2. Pre-release checklist

1. `git fetch origin main` and confirm you are releasing from the current tip.
2. Full gate set green: `bash scripts/verify.sh` (fast mode is **not** sufficient
   for a release).
3. Dependency audit triaged: `npm audit --omit=dev` — every remaining advisory
   either has no reachable path or is listed as accepted in
   `docs/engineering/SECURITY-REVIEW.md`.
4. `node scripts/check-bundle-size.mjs` within ceilings (770 / 92 / 110 KB gz).
5. Design gates green (CSP hash, tokens, icons, colours, raw CSS, parity).
6. `CHANGELOG.md` has an accurate entry for everything user-visible.
7. No secrets, `.env` files, or generated artifacts staged
   (`git status --porcelain`).

## 3. Cutting a release

```bash
# from a clean main
npm version --no-git-tag-version <major|minor|patch>   # updates package.json/lock
# move the Unreleased section into a dated version heading in CHANGELOG.md
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "ULARA vX.Y.Z"
git push origin main --follow-tags
```

Tags are annotated (`-a`) and immutable once pushed. Never move or force-push a
tag. No tag was created during the repository-engineering audit.

## 4. Deployment

- `deploy.yml` deploys `main` to Vercel (`fra1`) when `backend/**`,
  `frontend/**`, `api/**`, `shared/**`, `vercel.json` or the workflow itself
  changes.
- The workflow's **credential gate** requires three repository secrets —
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. If any is missing the job
  skips with a notice and stays green; nothing is deployed.
- Verification is a separate belt: `deploy-smoke.yml` polls `/api/v1/health`
  until the reported `buildId` matches the pushed SHA. A successful deploy
  receipt alone is not proof of a healthy release.
- Manual path (unchanged): `npx vercel deploy --prod --regions fra1`.

## 5. Rollback

1. **Application** — re-promote the previous known-good Vercel deployment
   (`vercel rollback` / dashboard). Because the SPA and API ship together, this
   also rolls back the API.
2. **Database** — migrations are forward-only. A release that needs a destructive
   schema change must be split: *expand* (additive, deployed first), then
   *contract* (removal, after the previous app version is out of rotation).
   Restoring from backup (`npm run db:backup` / `db:restore`) is a last resort
   and loses writes after the backup.
3. **Mobile** — OTA (EAS update) can revert the JS bundle; native build rollback
   means publishing the previous binary from the builds ledger.

## 6. Build metadata

- The health endpoint derives `buildId` from `RENDER_GIT_COMMIT` /
  `VERCEL_GIT_COMMIT_SHA` / `GIT_SHA` (`backend/src/lib/build-id.ts`) — never a
  hand-bumped constant, so "which commit is serving?" is always answerable.
- `npm run api:openapi` regenerates `docs/api/openapi.json`; run it before a
  release if routes changed and commit the diff.

## 7. Known release constraints

- Root `npm run build` runs `db:deploy` **and** `db:seed`; never use it against
  production. CI builds the workspaces directly for that reason.
- The seed script refuses `NODE_ENV=production` and wipes demo content — it is a
  demo-environment tool, not a release step.
