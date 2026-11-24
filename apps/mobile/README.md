# Ulara Mobile — أُلارا

Native Arabic-first (RTL) mobile app for the Ulara education platform,
built with **Expo SDK 58 / React Native 0.88.1 / expo-router / TypeScript**,
wired to the live production API.

```
API   https://ulara.vercel.app/api/v1
App   ly.ulara.app · slug ulara
Push Expo project id — pending (EXPO_PUBLIC_PUSH_PROJECT_ID; zero placeholder until the owner registers one — push stays honestly unavailable)
```

## Quick start

```bash
cd apps/mobile
npm ci                 # independent lockfile — NOT part of the root workspace
npm run start          # Expo dev server (dev-client build on device/emulator)
npm run typecheck      # tsc --noEmit (strict)
npm run lint           # expo lint
npm run contract-check # static API-parity gate vs ../../backend source
```

`.env` (all values are public config — no secrets ever live in the bundle):

```
EXPO_PUBLIC_API_BASE_URL=https://ulara.vercel.app/api/v1
```

## Where things live

| Area | Location |
|---|---|
| Routes (file-based, deep-linkable) | `app/**` — `app/(role)/**` role homes, `app/student/**`, `app/teacher/**`, `app/admin/**`, `app/quality/**`, `app/owner/**`, public pages at the root |
| Typed API layer (one file per backend family) | `src/api/*.ts` — `client.ts` is the transport (Bearer + manual `ulara_refresh` cookie replay + single-flight refresh + normalized Arabic errors) |
| Auth & institution context | `src/auth/session.ts` (Zustand + SecureStore) |
| Design system | `src/design/{tokens,fonts,theme}.tsx` + primitives in `src/components/ui/**` (FROZEN — see `docs/CONTRACTS.md`) |
| App chrome | `src/components/shell/**` (top bars, tabs, feedback sheet host) |
| Feature surfaces | `src/features/**` (ai, messages, notifications, student, teacher, governance…) |
| Hooks | `src/hooks/**` (institution scope, notifications, query helpers) |
| Format utils (RTL digits, Africa/Tripoli dates) | `src/lib/format.ts` — every user-facing number goes through `latn()/num()/pct()` |
| Icons & splash | `assets/images/**` — regenerate from the brand mark via `npm run icons` |
| Docs | `docs/feature-parity.md` (the acceptance matrix), `docs/CONTRACTS.md` (agent file ownership), `docs/push-backend-proposal.md` |

## Roles & institution context

Five platform roles (STUDENT, TEACHER, ADMIN, QUALITY, OWNER) plus academic
positions (dean, associate dean, department head). `useSession()` exposes
the active institution; **every institution-scoped TanStack Query key is
suffixed via `useInstitutionScope()`** so switching institution never serves
cross-context caches. Route groups under `app/**` mirror the web paths so
`ulara://` deep links resolve to the same destinations as web routes.

## Backend contract

- Success `{ data, meta? }` · errors `{ error: { code, message, details? } }`
- `POST /auth/login|register|select-institution` respond with
  `Set-Cookie: ulara_refresh=…` — the native client captures the value and
  replays it manually (httpOnly is a browser constraint, not a transport one).
- Access tokens are 15-min JWTs; refresh is single-flight; logout, password
  change, and reset bump `tokenVersion` → hard session clear on the client.

**Drift gate:** `npm run contract-check` statically extracts every endpoint the
app consumes and every route the backend source registers, then diffs them
(method + path, parameter-name agnostic). It caught 7 real drifts on its first
run (notifications path, theme verb, chapter mutations, a nonexistent
`GET /admin/users/:id`) — run it in CI or before any merge touching
`src/api/**` or `backend/src/http/routes/**`.

## Builds & updates — Actions-native; release-by-new-build (r359)

Native builds are GitHub-Actions-only (the owner's binding requirement —
`eas build` is retired from this repo's pipeline):

- **QA APK + signed release APK** → `.github/workflows/android-apk.yml`
  (the signed rolling-`latest` release APK:
  https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk)
- **iOS sidestore IPA (unsigned)** → `.github/workflows/build-ios-sidestore.yml`
- **dev-client / smoke lanes** → `.github/workflows/mobile.yml`
  (expo prebuild + Gradle on Actions runners)

EAS is RETIRED (r359 A4): no `eas build`, no `eas update`, no `eas.json`,
no `EXPO_TOKEN`, no OTA layer. Every change — JS or native — ships as a
NEW NATIVE BUILD from the GitHub-Actions lanes above
(release-by-new-build; docs/mobile.md §7). The in-app update story is
the `/status` version pair: `minAppVersion` blocks builds below the
floor (the «يلزم تحديث التطبيق» screen), `latestAppVersion` shows a
one-time «يتوفر إصدار جديد» toast that points at the download page.

| Change | Delivery |
|---|---|
| JS/TS screens, styles, API wiring | **new build — run the Actions workflows above** |
| New native module / `app.config.ts` plugin, icon, splash, permissions | **new build — run the Actions workflows above** |
| `expo-notifications` wiring (client shipped; needs an Expo push project id) | **new build — run the Actions workflows above** |

## Synchronizing with `origin/main`

The website evolves continuously. Isolation rules:

1. `git fetch origin main` and merge into `feat/mobile-expo` — the merge is
   safe by construction because the mobile app owns `apps/mobile/**` and the
   web owns everything else; resolve conflicts **without** reverting upstream
   web/backend changes.
2. Re-run `npm run typecheck && npm run contract-check` in `apps/mobile`
   — the contract gate flags any endpoint/verb the backend removed or moved.
3. Check `docs/feature-parity.md` rows for features the backend changed and
   update statuses honestly (✅ / 🧩 / 🔗 / ⚠️ / 🚫 — never upgrade a status
   without evidence).
4. Ship every reconciliation — JS-only or native — as a new build via the
   GitHub-Actions workflows (android-apk.yml) before the production
   channel moves (r359: no OTA layer anymore).

## Honest limits (current)

- Remote push: the client side is live (permission ask → Expo token →
  `POST /me/push-devices`; `src/lib/push.tsx`) and the backend owns the
  device model (`PushDevice`, `/me/push-devices`, fan-out module gated
  by `PUSH_ENABLED` — **dark by default**). Until the flag lights in
  the deployment, notifications ride the in-app inbox only;
  `docs/push-backend-proposal.md` keeps the rollout history.
- The AI assistant's "suggest" surfaces are the backend's own template
  simulation, disclosed in-app as «محاكاة».
- PDF review annotation parity is read/annotate via the built-in viewer;
  drawing-grade ink parity remains a web capability.
