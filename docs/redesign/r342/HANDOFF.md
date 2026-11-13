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
