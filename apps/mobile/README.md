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

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:501879db6e18df38accb8ed406b4eff43770a73ee2b0a96270895ea29fddf54e -->

## Build and verify a native release

Pushes to `main` that change mobile sources or shared assets start the Android and iOS workflows. A maintainer with workflow dispatch access can also run them manually.

- [Android APK](../../.github/workflows/android-apk.yml) builds the QA artifact and publishes the signed [Android download](https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk). Compare the source SHA and signing certificate in the release body before distributing the file; the rolling release name alone does not identify a build.
- [iOS SideStore](../../.github/workflows/build-ios-sidestore.yml) uploads an unsigned IPA to the workflow run.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ce3ecb25cebd358dcfb0dfdc8254b2e0af86aa567570b3aae455e67ae388e0a7 -->

- [Mobile](../../.github/workflows/mobile.yml) lists source gates and emulator jobs separately. To verify a device build, open the five-role emulator job and its screenshots. A skipped job produces no device evidence, even when the overall workflow is green. The signed APK and SideStore IPA have separate build receipts.

<!-- /coderabbit-ai-generated:v1 -->

Ship application and dependency changes in a new native build. The status response carries `minAppVersion` (required update) and `latestAppVersion` (available update). For rollback and installation requirements see [the mobile runbook](../../docs/mobile.md).

## Synchronizing with main

Start from current `main`. After a backend change run `npm run typecheck`, `npm run contract-check`, and `npm run api:types` in `apps/mobile`; inspect the generated diff before publishing. Update [feature parity](docs/feature-parity.md) only for verified behavior.

<!-- /coderabbit-ai-generated:v1 -->

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
