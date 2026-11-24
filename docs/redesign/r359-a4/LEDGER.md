# r359 · A4 — Mobile + Backend + CI — LEDGER

Agent A4 of 4. Branch `r359/a4-mobile-backend` (from `origin/main` @ `4fd2d13`).
Slice: `backend/**`, `apps/mobile/**` (minus A2 art), `.github/workflows/**`, `scripts/build-android-local.sh`, `docs/api/**`, `docs/mobile.md`, `docs/roadmap.md`, `docs/redesign/r359-a4/**`.

## Decisions (ambiguity → one line → continue)

| # | Decision |
|---|---|
| D1 | `mobile.yml` on main has NO `eas-ota` job and NO `EXPO_TOKEN` read (already retired in an earlier round). Remaining EAS dependencies removed here: root `.eas/` (EAS Workflows = cloud build service), `.easignore` (root+app), `apps/mobile/eas.json`, `expo-updates` (dep + config), commented `eas build` block in `scripts/build-android-local.sh`, EAS-story text in `apps/mobile/README.md` + `docs/mobile.md` + `docs/roadmap.md`. |
| D2 | Update story chosen: **release-by-new-build** (GitHub Actions native artifacts + in-app `MIN_APP_VERSION` check → `/app` → `releases/latest/download/ulara.apk`), per the r355 decision record. Documented in `docs/mobile.md`. No self-hosted update server. |
| D3 | `mobile-builds-ledger.yml` does NOT exist on main (prompt listed it as existing — verified absent; only stale mentions in AGENTS.md / CI-CD-REVIEW.md / RELEASE.md). Built new in this round as a small `workflow_run` collector (see `ci` section). |
| D4 | Push E2E: Expo push requires an `eas projectId` to mint push tokens (`getExpoPushTokenAsync`). EAS services are banned by the owner and no real projectId exists in the tree (zero-placeholder guard in `app.config.ts`). So: full client+server plumbing is shipped and proven by unit/integration tests with the Expo SDK mocked; live fan-out stays behind `PUSH_ENABLED=false` + needs the owner to register an Expo project id later. Recorded as the single external blocker; the stale feature-parity row is corrected to say exactly this. |
| D5 | Governance large-file upload: the D-6 raw-bytes routes shipped in R355; this round adds the **S3 presign path for large files** (≥15 MiB up to 500 MiB) with the existing honest 503 refusal for drivers without presigning, mirroring the lecture-video presign pattern. |
| D6 | `User.emailVerified` — verification flow added via `EmailVerificationToken` (no schema change to User; token model + `/auth/verify-email` + `/auth/resend-verification` + template). |
| D7 | Digest = weekly unread-notification digest (opt-in per user via notification preferences, default OFF), composed by the existing in-process scheduler, sent Sunday 18:00 UTC via Resend. Bounded: max 20 items, one email per user, failures never throw. |
| D8 | Bounce/complaint handling = `POST /webhooks/resend` with Resend `svix`-style HMAC signature verification (`RESEND_WEBHOOK_SECRET`), fail-closed 401 when unset. Events recorded on a new `EmailEvent` model; hard bounces + complaints mark `User.emailBouncedAt`/suppress sending. |
| D9 | Idempotency: new `IdempotencyRecord` model + middleware. Applied to side-effectful POSTs: announcements (notify fan-out), bulk-import commit, governance document upload, invites. Key = `Idempotency-Key` header (≤128 chars), scoped to user+route; replay returns the stored response. |
| D10 | Search coverage: extended `GET /search/global` with institution-scoped Program + OrganizationalUnit + InstitutionalPerson groups (capability/tenant-fenced exactly like the r352 routers). |
| D11 | Performance sweep: r342 residuals were ILIKE seq-scans + missing trgm/GIN. Migration `0007` adds `pg_trgm` + GIN trigram indexes on the live search columns (measured EXPLAIN before/after on a seeded local DB; numbers in evidence). |
| D12 | Audit-log browsing: kept OWNER `/owner/activity` (added filters) and added institution-scoped `GET /institutional/audit-logs` for ADMIN/QUALITY (capability `AUDIT_BROWSE` — granted to ADMIN+QUALITY+OWNER by default). |
| D13 | Keystore: all four `ANDROID_*` secrets already exist (set 2026-11-23, repo PUBLIC → no keystore material may ever be committed; not needed this round). Release lane proven by run. |
| D14 | Palette discipline: mobile consumes generated token outputs as they are on main (A3 owns token values). This round rebuilds mobile *structure/patterns* in the flat language; palette convergence happens at integration when A3's tokens land. |
| D15 | `docs/runbook.md`, `docs/deployment.md`, `docs/ops/LEDGER.md`, `AGENTS.md`, `docs/engineering/CI-CD-REVIEW.md`, `frontend/src/pages/AppDownloadPage.tsx` still carry EAS/OTA mentions → OUTSIDE my ownership; listed for the integrator at the bottom. |

## Status

Legend: ⏳ todo · 🔨 in progress · ✅ done (evidence linked) · ⚠ done with caveat

### CI
- ⏳ C1 Remove every EAS service dependency (see D1) — workflows, scripts, app config, docs
- ⏳ C2 Update story documented in `docs/mobile.md` (release-by-new-build, D2)
- ⏳ C3 `mobile-builds-ledger.yml` created + green (D3)
- ⏳ C4 `android-apk.yml` QA lane green (run URL)
- ⏳ C5 `android-apk.yml` release lane green — signed APK on `latest` release (URL checked)
- ⏳ C6 `build-ios-sidestore.yml` green — SideStore IPA artifact
- ⏳ C7 `mobile.yml` green (dispatched lane, no EAS step anywhere)
- ⏳ C8 android-smoke extended: screenshots of launch/onboarding/each role home at two sizes (+320px), crash gate, artifacts

### Backend
- ⏳ B1 Schema/migration `0007`: `NotificationPreference`, `PushDeliveryReceipt`, `EmailEvent`, `EmailVerificationToken`, `IdempotencyRecord`, search indexes (D6–D11)
- ⏳ B2 Push server: delivery receipts (Expo receipt check + persist), stale-device pruning sweeper (lastSeenAt), category preferences wired into every `fanOutPush` call
- ⏳ B3 Email: verification flow + Arabic RTL template, weekly digest template + scheduler job
- ⏳ B4 Resend bounce/complaint webhook + sending suppression
- ⏳ B5 Governance large-file presign upload/complete (S3 drivers only, honest refusal elsewhere) + tests
- ⏳ B6 Audit-log browsing: `/institutional/audit-logs` (ADMIN/QUALITY, tenant-scoped) + `/owner/activity` filters + tests
- ⏳ B7 Unit-scoped capability-grant browsing endpoint (r352 audit §I.5) + tests
- ⏳ B8 Bulk export: `GET /users/export` (ADMIN/OWNER, CSV/JSON, async-safe size caps) + tests
- ⏳ B9 Search coverage: programs, org-units, institutional people (D10) + tests
- ⏳ B10 Idempotency middleware on announcement/bulk-import/invite/governance-upload POSTs + tests
- ⏳ B11 Performance sweep: EXPLAIN before/after for search queries (evidence), indexes in `0007`
- ⏳ B12 OpenAPI regen (`npm run api:openapi`) + mobile `api:types` regen, zero drift
- ⏳ B13 Migrations: Neon backup branch → verify on branch copy → apply to production → `/api/v1/status` + smoke after

### Mobile
- ⏳ M1 Launch: splash light/dark (exists) + brand moment ≤1.2s (mark + hairline draw, shortened on repeat, reduced-motion safe) + fonts/session gate (exists) → skeletons
- ⏳ M2 First-run onboarding: 4 screens, role-aware, art via `components/art` placeholder contract, notification permission priming
- ⏳ M3 Push client: token-rotation listener, badge clear on read, `safeDeepLink` on tap; unregister on logout (exists)
- ⏳ M4 Flat-language rebuild pass on `components/ui/*` + `components/shell/*` (structure/patterns per D14)
- ⏳ M5 All-sizes pass: 320/360/390/412/768/1024 + landscape + 200% font + RTL (CI screenshots + code audit)
- ⏳ M6 Performance: cold-start numbers from emulator (`am start -W`), FlashList audit, memoised rows, image caching audit
- ⏳ M7 Docs: feature-parity refresh (stale push row + others), push-backend-proposal header, useNotifications comment, `mobile-patterns.md`

### Gates
- ⏳ G1 Backend `typecheck` + `typecheck:tests` green
- ⏳ G2 Backend `npm test` (TZ=UTC) green + `test:integration` green (local PG)
- ⏳ G3 Mobile `typecheck` + `npm test` green; `contract-check` + `tokens:check` + `api:types` drift zero
- ⏳ G4 `scripts/verify.sh` green for owned parts
- ⏳ G5 Zero-trace (non-history) green; secret scan green
- ⏳ G6 Fidelity sheets: mobile screenshots vs reference mobile shots + written critique (VLM read)

## Evidence index (`docs/redesign/r359-a4/evidence/`)
(populated as items land)

## For the integrator (outside my slice — do NOT touch by me)
- `docs/runbook.md:17,87` + `docs/deployment.md` §OTA + `docs/ops/LEDGER.md:50` + `AGENTS.md` (EAS/OTA/`EXPO_TOKEN` mentions) — reconcile with the release-by-new-build story.
- `docs/engineering/CI-CD-REVIEW.md` — stale rows (mobile-builds-ledger, deadcode triggers, size-gate docs MB).
- `frontend/src/pages/AppDownloadPage.tsx:35` — comment mentions future EXPO_TOKEN/EAS project (A1 owns).
- r352 doc set (`docs/redesign/r352/institutional-backend/PLAN.md:77`, `HANDOFF.md:172`, `DECISIONS.md:163`, `POST-IMPLEMENTATION-AUDIT.md:190`) — D-6 DEFERRED texts are stale vs R355 implementation (pre-existing inconsistency; my B5 supersedes both with the presign path).
- Token wishes for A3: none beyond main's current outputs (D14).
- Regenerate after merge: `docs/api/openapi.json` (from my final sources), `apps/mobile/src/api/schema.generated.ts` (`npm run api:types`), mobile lockfile only if I added deps (I did not plan to).
