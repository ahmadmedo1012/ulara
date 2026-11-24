# Remote push notifications — additive backend proposal

**Status: ✅ implemented — this document is kept as the design record.**
r326/r327 shipped the proposal verbatim: the `PushDevice` model, the three
`/me/push-devices` routes, and the client wiring (`src/lib/push.tsx`). r359 A4
completed the send path: Expo **delivery receipts** (ticket check +
`PushDeliveryReceipt` rows), **per-user category preferences**
(`GET/PUT /me/notification-preferences`, consulted before every fan-out), and
the **stale-device pruning** sweeper (180d `lastSeenAt`). The remaining steps
are OWNER configuration, not code: live fan-out stays dark behind
`PUSH_ENABLED=false` until an Expo push project id is registered and set as
`EXPO_PUBLIC_PUSH_PROJECT_ID` (see `docs/mobile.md` §7 + roadmap item 3).
Nothing here changes any existing web API behavior.

## Why the inbox is REST-polled today

`GET /notifications` (me.routes.ts) powers both the web bell and the mobile
in-app inbox. The mobile app polls it exactly like the web client
(`src/hooks/useNotifications.ts`, 60 s unread cadence). Remote push is a native
*enhancement*, not a replacement.

## Proposed backend addition (smallest viable surface)

### 1. Schema (Prisma, additive)

```prisma
model PushDevice {
  id          String   @id @default(cuid())
  userId      String
  platform    String   // "ANDROID" | "IOS"
  expoToken   String   @unique // Expo push token (ExponentPushToken[...])
  appVersion  String?
  lastSeenAt  DateTime  @default(now())
  createdAt   DateTime  @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 2. Routes (authenticated, additive — `backend/src/http/routes/push.routes.ts`)

| Method | Path | Contract |
|---|---|---|
| `POST` | `/me/push-devices` | body `{ expoToken, platform, appVersion? }` — upsert by token; deduplicates re-registration after reinstalls |
| `GET` | `/me/push-devices` | the caller's registered devices (id, masked token, platform, lastSeenAt) |
| `DELETE` | `/me/push-devices/:id` | remove a device (call on logout — mirrors the web session-boundary cache-clear discipline) |

Mount after `meRoutes`: `app.use('/api/v1', pushRoutes)`. All three require the
global `authMiddleware`; no role gates; tokens are scoped to the caller.

### 3. Sending (server side)

Wherever the backend already writes a `Notification` row (the single source of
the inbox), fan out the same payload via Expo's push API
(`POST https://exp.host/--/api/v2/push/send`):

- Fire-and-forget with an async queue/`setImmediate` — never block the request.
- Payload = `{ title, body, data: { kind, link } }` where `link` reuses the
  exact in-app path the inbox notification already carries (the mobile deep
  links `ulara://<path>` mirror web routes, so one `link` serves both).
- Handle Expo receipts: drop tokens that come back `DeviceNotRegistered`
  (delete the `PushDevice` row) and respect `MessageRateLimit`.
- A `PUSH_ENABLED` env flag keeps the whole path dark until the project is
  created on the Expo dashboard — zero behavior change when unset.

### 4. Security/privacy notes

- Tokens are per-device secrets; never logged (same discipline as the mobile
  SecureStore access/refresh tokens).
- Ownership is enforced by requiring auth on every route — no cross-user reads.
- `lastSeenAt` lets a small cron prune devices inactive > 180 days.

## Client-side plan once the backend ships

1. On sign-in (after `select-institution` resolves), call
   `Notifications.getDevicePushTokenAsync()` inside a gated helper
   (`src/lib/push.ts`) and POST it to `/me/push-devices`.
2. Android 13+ requires the runtime `POST_NOTIFICATIONS` permission — request
   on first role-home, honoring "don't ask again" without blocking the app.
3. Foreground: render the existing in-app toast surface; background/tap:
   `Notifications.getLastNotificationResponseAsync()` → resolve the `link`
   through the same safe-path deep-link guard the inbox uses.
4. On logout/session-expiry: DELETE all of the user's registered devices
   (or at minimum unregister this device) so a handed-over phone never
   receives the previous owner's pushes.

## What is explicitly NOT claimed

- No store credentials (FCM/APNs) are configured on the Expo account yet, so
  **no end-to-end push delivery has been demonstrated.**
- The historical caveat that sat here — "a design + contract, not deployed
  code" — is retired: the model, routes, receipts, category preferences and
  pruning are implemented (r326/r327 + r359 A4). Only the owner's Expo push
  project id + `PUSH_ENABLED` stand between this code and live delivery.
