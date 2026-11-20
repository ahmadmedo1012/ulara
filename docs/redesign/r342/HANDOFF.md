# R342 — HANDOFF (wave log)

## Wave 1 — CI efficiency + connectivity honesty (merged, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t08 connectivity four-dimension split (mobile network model + backend /ping + tests) | general-purpose | wip/t08 | c0d8381 | MERGED (lead-reviewed) |
| t09 mobile workflow lanes (fast / smoke-prebuilt / native-build / full) | lead (integration owner — .github/workflows is lead-only per AGENTS.md §4) | wip/t09 | 5249dde | MERGED |

## Lead verification (on the merged tree, per the validation budget —
the smallest test that proves each change; the full fast gate runs
once at integration)

| Gate | Result |
|------|--------|
| Mobile `tsc --noEmit` | PASS (0 errors) |
| Mobile full jest | **45 suites / 1247 tests PASS** (was 1228 at r341 close: +19 pins from t08 — the four-dimension net, the query-cache db-health wiring, and the retired-banner-copy updates in the older `__tests__` suite) |
| Mobile `expo lint` | 0 errors, 16 warnings — all pre-existing sites (sheet.tsx `styles`, Assistant `model`, lecture-player `setState`-in-effect class…); **zero warnings in t08 files** |
| Mobile `contract-check` | PASS — 0 drift (203 consumed / 255 registered) |
| Backend `tsc --noEmit` | PASS (0 errors) |
| Backend vitest (ping + health + rate-limit-envelope + deploy-ops + health-build-id suites) | **17 + 8 = 25 tests PASS** (t08's `tests/http/ping.test.ts` + the neighboring status/health surfaces re-run green) |
| Workflow YAML (t09) | `yaml.safe_load` parse PASS; job graph = detect / mobile-gates / eas-ota / native-build-devclient / eas-build / android-smoke-prebuilt / android-smoke; dispatch input `lane` (choice, default `fast`) + preserved `platforms`/`profile` |
| Workflow lane matrix (t09) | simulated all six event/lane combinations against the contract table (see the t09 commit body): fast dispatch queues NOTHING native; smoke-prebuilt never compiles; native-build only on native inputs or explicit request; full only explicit; JS-only push = gates + OTA + prebuilt smoke |

## What t08 changed (the honest model)

Dimensions (a state claims only what its evidence proves):

1. **Device interface** — NetInfo `isConnected` (hard, immediate):
   banner «لا يوجد اتصال بالشبكة».
2. **General internet** — deliberately UNPROBED (the third-party probe
   class is retired; no state may claim «الإنترنت مقطوع»).
3. **ULARA API** — NetInfo reachability now targets **`GET /ping`**, the
   NEW DB-free liveness route (`backend/src/http/routes/status.routes.ts`):
   the R341 probe hit `/status` and cost a `SELECT 1` per reachability
   check, and a degraded DB could flip it. Two consecutive failures
   (the R341 debounce is preserved): «تعذّر الاتصال بخادم أُلارا حالياً».
4. **ULARA DB health** — from REAL API responses only: the mobile
   query cache's `onError`/`onSuccess` feed `reportDbHealth()`
   (`apps/mobile/src/lib/queryClient.ts` → `network.tsx`'s
   `mergeDbHealth`): DB_UNAVAILABLE → «الخدمة متاحة جزئياً، وبعض
   البيانات غير متوفرة»; any successful read clears it. The liveness
   probe can never see the database.

Semantics fixes:

- **`onlineManager` follows the DEVICE line only** — a dead ULARA on a
  live link keeps queries RUNNING (transport errors ride the existing
  3-retry exponential backoff + jitter) instead of a false global
  pause. The exam answer-queue gate (`isOnline` = device ∧ probe)
  keeps its send-ability semantics.
- The pure machine gained `mergeDbHealth` (pure, referentially stable);
  `nextConnState` phases: `internetUnknown | internetAvailable |
  deviceDisconnected | ularaServerUnavailable | databaseDegraded`
  (+ the banner's derived recovery flash «عاد الاتصال بالخدمة»).
- A returned link with a pending probe claims `internetUnknown` —
  never a stale `deviceDisconnected`.
- `client.ts` transport errors stop claiming internet problems
  («تعذّر الاتصال بخادم أُلارا حالياً — أعد المحاولة.»; TIMEOUT →
  «انتهت مهلة الطلب — حاول مجدداً»). HTTP 401/403/404/429/500 were
  already NEVER translated to NETWORK (only genuine transport
  failures) — verified, unchanged.
- Backend: `/ping` answers 200 from the process with zero Prisma work
  (dead-DB-immune; flood costs no DB round trip); `/status` keeps the
  health+metadata job (DB latency, modes, minAppVersion gate). The
  `status.routes.ts` docblock's mount-order LIE («mounted BEFORE the
  global limiter») is corrected against the real `app.ts` order (both
  routes sit AFTER the global limiter, before the auth routers).

## What t09 changed (the lane contract)

`mobile.yml` — the r341-era behavior queued `eas-build` AND the full
Gradle release-APK android-smoke on EVERY manual dispatch (any intent,
JS-only included — the owner's complaint). The r342 contract:

- **`fast` (DEFAULT dispatch)**: mobile-gates only — never EAS, Gradle,
  an APK, an emulator, a release build.
- **`smoke-prebuilt`**: the SAME five-role Maestro journey on the
  API-34 emulator against the REAL local stack, running on a
  PREBUILT dev-client APK matched by a NATIVE FINGERPRINT
  (hashFiles: package(-lock).json, app.config.ts, eas.json, assets/,
  plugins/, shared/, the build recipe, the workflow itself), with the
  CURRENT JavaScript served LIVE from the checkout by Metro (a debug
  build embeds NO app JS — staleness is structurally impossible;
  `adb reverse tcp:8081 tcp:8081`; metro.log rides the forensics).
  ZERO Gradle. A missing artifact = honest BLOCKED (red + the exact
  fingerprint + the remedy: dispatch native-build once) — never a
  silent rebuild.
- **`native-build`**: builds + records the reusable artifacts — the
  local Gradle dev-client APK (debug-signed, fingerprint-keyed
  `actions/cache` + per-run upload + MANIFEST) and the EAS cloud cut.
  Only on native-affecting pushes or explicit request.
- **`full`**: the ORIGINAL android-smoke machine unchanged (full
  release Gradle APK, throwaway keystore, logcat crash gate) — explicit
  dispatch only.
- **Push to main (JS-only)**: gates + OTA + prebuilt smoke (cache;
  miss → BLOCKED). Native-affecting push: + devclient build + EAS.
  The ~21-minute Gradle toll leaves the default loop.
- `eas-build`'s native-input detection moved to the new `detect` plan
  job (one place, summary-visible); its dispatch behavior is now
  lane-gated instead of unconditional.
- android-apk.yml (QA/release split, signing identity) is UNTOUCHED —
  its security model is preserved exactly.

## Honest limits of wave-1 verification

- The t09 lanes are YAML- and matrix-validated; their FIRST LIVE CI
  exercise is the next push/dispatch (the dev-client/Metro choreography
  of smoke-prebuilt is the standard Expo CI pattern — `adb reverse` +
  `expo start --dev-client` — and is CI-validated on first run; the
  record lands here when that run exists).
- The t08 model is source-verified (45-suite jest + backend vitest);
  its on-device behavior across real Wi-Fi/cellular/server-down/db-down
  scenarios remains the runtime acceptance a fleet emulator/device
  session would provide — NOT TESTED on hardware here.
- Physical Android/iOS device rows: NOT TESTED (no hardware in the
  fleet — same honesty as r341).

## Next waves (the open backlog — the owner's wave plan)

- Wave 3: whole-app scroll/interaction inventory + measurements
  (requires emulator/device time; the prebuilt lane now makes the
  emulator loop cheap enough to iterate).
- Wave 4: the complete authenticated product review (route inventory
  per role, web + mobile).
- Wave 5–6: cross-platform visual consistency; backend/security sweep.
- Wave 8: independent adversarial review of everything above.

## Wave 2 — the takeover mission: production schema-drift retirement (2026-11-19, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t13 zu-sync retirement (backend: routes/scheduler/lib/prisma + migration 0002; web: admin sync console + owner System sync card + nav/route/tests) | lead + isolated subagent (frontend half) | wip/r341-integration | (this wave's commit) | MERGED (single atomic integration commit — the change crosses schema/routes/web/tests) |

### The defect (empirical, production)

- `GET https://ulara.vercel.app/api/v1/university/facts` → **HTTP 500** (`{"code":"INTERNAL"}`) — a PUBLIC endpoint.
- Authenticated `owner@test.ly` → `GET /api/v1/owner/system` → **HTTP 500** — the OWNER System page's data path.
- `/admin/sync` + `/admin/sync/trigger` → 500; the AdminPages dashboard ActionStrip also queried `/admin/sync` (a hidden fourth consumer found by the frontend agent's search).
- The nightly Vercel cron (`/api/v1/jobs/daily`) sync sub-job failed silently every night (the never-reject contract swallowed the P2021).

Root cause: the shared Neon production DB dropped `SyncRun`/`UniversityFact` upstream (pre-ULARA r349 — "the dead pre-tick sync system", data exported before the drop) while ULARA's code still carried the full feature. Column-level drift audit: those two tables were the ONLY ulara-expected structures absent from the live DB (no column-level gaps anywhere else; the DB's 14 extra pre-ULARA-era tables are never queried by ulara — harmless).

### Lead verification (the smallest sufficient gates; full suites at integration)

| Gate | Result |
|------|--------|
| Backend `tsc --noEmit` | PASS (0 errors) |
| Backend vitest (FULL suite) | **92 files / 1955 tests PASS** (deleted 5 pure-zu-sync suites: scheduler-guard, scheduler-institution, sync-routes-scope, zu-sync-run, sync-institution-isolation; updated owner-schemas/owner-system-storage/owner-alerts-counts/scheduler-retention + two-institution-regression header) |
| Prisma validate + generate (schema without the two models) | PASS |
| Frontend agent: `tsc -b` + `tsc -p tsconfig.test.json` | 0 errors |
| Frontend vitest (FULL suite, agent-run) | **224 files / 2834 tests PASS** |
| stylelint gate | green (errors 45 → 36, ratchet down — consistent with removing a dead surface) |
| OpenAPI regeneration | 253 operations (the three retired paths gone from the generated table) |
| Backend lint (eslint backend/src) | 0 errors |

### The live-DB ledger reconciliation (non-destructive, recorded in the wave commit)

- `_prisma_migrations` had the pre-ULARA lineage's 49 granular rows and NO row for `0001_ulara_baseline` (the baseline's own doc note expected a ledger swap that never ran). A naive `prisma migrate deploy` from this repo would have tried to apply 0001 against existing tables.
- Action: `prisma migrate resolve --applied 0001_ulara_baseline` (records the baseline; the lineage's 49 rows PRESERVED) then `prisma migrate deploy` (applies `0002_retire_zu_sync` — a verified no-op on the established DB). `prisma migrate deploy` from this repo is now a clean no-op going forward.

## Wave 3 — the security sweep t14 (2026-11-19, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t14 backend/API security fixes (devInbox gate · research archive isolation · invite institution boundary · serverless JWT seatbelt) | lead (audit by an isolated adversarial-review subagent) | wip/r341-integration | (this wave's commit) | MERGED |

### Findings fixed (each verified at the code level; the first verified LIVE on production before fixing)

1. **CRITICAL — the forgot-password reset-token oracle (verified live)**: `POST /api/v1/auth/forgot-password` with a documented `@test.ly` address returned `data.devInbox.url` containing the RAW reset token — unauthenticated, owner@test.ly included, under mailProvider=none. Fixed: the devInbox link is now gated to `NODE_ENV !== 'production'` (local dev keeps the honest dev-inbox). The exposed token was rotated immediately after verification.
2. **HIGH — the research archive's cross-institution PII**: `/research/published`, `/research/search` and the `/search/global` paper candidates listed every tenant's published papers — student names, grades, reviewer feedback, plagiarism/AI scores, and extracted-text snippets — while the file-bytes gate already 404s foreign papers (incoherent listing + PII). Fixed: all three surfaces are institution-scoped to the caller's VERIFIED context (resolveCallerInstitutionScope; OWNER keeps the platform-wide oversight view; a contextless caller gets no paper rows — fail-closed).
3. **MEDIUM — the invite family's institution boundary**: an ADMIN could mint a code scoped to a FOREIGN institution's offering; register + redeem created ACTIVE enrollments with no institution-relationship check (unlocking the foreign institution's content). Fixed: ADMIN create now verifies offering-institution ownership (existence-hidden 404 for foreign ids); registerUser rejects codes whose offering belongs to another institution than the one being registered into; consumeInvite requires the redeemer to hold an ACTIVE membership in the offering's institution.
4. **LOW — the JWT identical-secrets seatbelt** now also runs on the serverless entry (api/index.ts), not just the long-process entry.

### Honest backlog (NOT fixed this wave — the audit's remaining findings)

- Lecture-video serving route authorization (unguessable server-minted cuid filenames mitigate; the proper gate mirrors the materials route — next wave candidate).
- Feedback inbox is platform-wide for institution-scoped ADMIN/QUALITY (needs an additive `institutionId` column + migration — schema change deliberately deferred out of this wave).
- Access-token claims stay trusted up to 15 min after role change/deactivation (the standard short-TTL JWT tradeoff — documented as accepted).
- The XFF limiter trust-topology probe should be re-run against the Vercel deployment (rate-limit bypass requires a topology that forwards client XFF verbatim).

### Gates

| Gate | Result |
|------|--------|
| Backend `tsc --noEmit` | PASS (0 errors) |
| Backend vitest (FULL suite) | **92 files / 1955 tests PASS** |
| eslint (frontend/src + backend/src) | **0 errors** (14 pre-existing warnings) |

## Wave 4 — mobile parity for t13 + the gates record (2026-11-19, lead-verified)

| Task | Agent type | Branch | Commits | State |
|------|-----------|--------|---------|-------|
| t13-mobile: the zu-sync retirement on the app (dead admin sync console + student university-facts screen deleted; client functions + governance label kit removed; generated schema reconciled) | isolated subagent (no local mobile deps — CI-verified) | wip/r341-integration | f80d644 · 69ab892 · a59a310 | MERGED |

### What the mobile wave found beyond the brief

- A THIRD consumer of the removed `/owner/system` `sync` block: the mobile owner System screen's «آخر مزامنة» row (removed).
- The mobile `/student/university` screen called the retired facts route RAW (bypassing the typed client) — deleted with its profile menu row.
- The contract-check consumer regex also parses retirement COMMENTS — a note quoting the removed call verbatim drifted the gate (reworded).
- The canonical `openapi-typescript@7.13.0` regen ALSO surfaced pre-existing drift from wave 1: the t08 `/ping` path had never been regen'd into the mobile schema (now reconciled: three retired paths out, `/ping` in).

### CI evidence (the takeover session)

| Run | Result |
|------|--------|
| Size gate + deadcode (every pushed SHA incl. a59a310) | **success** |
| Mobile `fast` lane on a59a310 (typecheck · expo lint · contract-check · generated-drift · jest render net · expo export ×2 · bundle budget) | **success** (after the two honest gate catches above — the lanes did their job) |
| Zero-trace (brand gate) | **PASS locally + in CI** — the first t13 push leaked retired identity names into docs/comments; CI caught it, the tree was scrubbed and the two commits rewritten (history clean) |
| Full CI matrix on the final SHA | recorded at close (the run in flight at doc-commit time) |

### Live verification (local stack against the REAL production Neon DB)

- Backend booted on :4000 against Neon: `/api/v1/health` → `{"ok":true,"dbLatencyMs":369}`.
- Owner journey (browser): quick-login → dashboard → System page **renders with real data** (service status, alerts, activity, storage truth — the page that answered HTTP 500 in production before t13).
- Student journey (browser): quick-login → honest contextless states (institution chooser + the server's Arabic «حدّد المؤسسة أولًا») → institution selection (`POST /auth/select-institution` 200) → library papers tab shows **3 published papers, institution-scoped** — exactly the three rows the t14-scoped API returns.
- API-level: `/research/published` with verified context → 200 + 3 papers; contextless → honest 403; `/admin/sync` → 404; `/university/facts` → auth-gated; production-code-path devInbox → absent in production mode, present in development mode.

## Wave 5 — R342-final: the homepage integration (the composite release)

| Task | Agent type | Branch | State |
|------|-----------|--------|-------|
| t15 the homepage composite: PRs #7 (art direction) + #8 (editorial scenes) + #9 (scroll choreography) integrated, repaired, refined, released | lead (integration owner) | wip/homepage-final | the composite PR |

### The integration decisions

- The three branches were file-disjoint (verified: zero path overlap) —
  merged whole into `wip/homepage-final` off `origin/main` @161e88f,
  one integration merge commit per branch with the decisions recorded
  in each message. The original PRs stay open until the composite
  lands, then close as superseded.
- The five-station HeroInspect contract is the product law (cp/ex/lc/
  mg/rr — real capabilities anchored to the plate's drawn features);
  the r309/r308/r309-prod belts re-pinned deliberately with STRONGER
  assertions (all-10-pairs card layout, keyboard parity for the new
  seats, four phone laps 360/375/390/430).
- The motion architecture is ONE system again: the shared conductor
  clock drives Lenis, the house scrubTimeline (new,
  `lib/motion/scrubTimeline.ts`) drives the journey scrub, and GSAP is
  RETIRED from the stack (−45.2 KB gz measured; the 770 KB ceiling
  restored at 753.6). The engine/engineSync seams are deleted.
- AGENTS.md's conformance-instrument sections are corrected to the
  truth: `scripts/conformance/` never landed in this repo (verified
  across full git history). No conformance numbers exist to cite.

### The repaired regressions (all three PRs' CI reds)

| Gate | The failure | The fix |
|---|---|---|
| size-gate | header-onhide evidence 823KB > 500KB | 256-color quantization → 405KB (visually lossless; no allowlist entry) |
| knip | 66/50/227 vs 63/48/226 | HeroInkWindow + HeroChrome + HeroGrid deleted (superseded, zero consumers) with their 467-line census CSS tail; ElevationArt/CampusVariant un-exported; CAPTURE_LECTURE_CHECKPOINT_2X removed (consumed directly now) — 63/48/226 exact |
| E2E r309/r308/r311 | 5-station contract, lc clipping at 360/390, .pl-progress/.pl-cross missing | the phone crop's root cause fixed (TWO caps defeated the authored crop: base.css's media guard + the hero seat's block cap → symmetric ±10% bleed at 120%); the 44px targets clamped into the visible window by the mapping; loader chrome + registration cross re-seated; RELEASE_FLOOR re-pinned 2.0s |
| bundle | 800.0 KB > 770 | the house scrub engine replaces GSAP → 753.6 KB |
| jscpd | 261 → 266 combined | preloader mono-row merge + the .lp-tag pattern extraction → 260 (re-pinned) |

### The lead's verification (the merged tree, this branch)

| Gate | Result |
|---|---|
| `bash scripts/verify.sh` | ALL GREEN (tsc · vitest **2977 passed** · build+bundle **753.6/770** · css ratchet · logo · a11y 0-over-floor · 7 design gates · lint · e2e 29/29) |
| Full e2e (`tests/e2e`, e2e + chromium-iphone projects) | **158 passed** |
| r305 suite | **76 passed** |
| Backend vitest (full) | PASS (exit 0) |
| Typechecks (both sides, src + tests) | PASS |
| Surface drift (mock mode, CI's env) | **clean across 72 captures** |
| size-gate / zero-trace / deadcode | GREEN / PASS / baseline (jscpd improved) |
| Journey scrub live probe | forward+reverse state-EXACT at 1440 + 390 (stage machine, ghosts, plaques, camera) |
| Visual QA (20-plate evidence set) | `docs/redesign/r342/integration-evidence/` — one real defect found+fixed (the statement twin mask); tashkeel verified intact |

### Honest limits

- WebKit + DB-integration lanes run in CI only (not installable/available
  in this sandbox); production Neon was never touched.
- The five-station decision, the GSAP retirement and the AGENTS.md
  conformance correction are documented product/architecture changes —
  each with its measured evidence in the composite PR.
