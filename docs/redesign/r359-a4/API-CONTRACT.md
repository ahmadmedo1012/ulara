# r359 A4 — Backend API contract (the new surfaces)

Everything below is additive to the platform contract (envelope `{ data }` /
`{ data, meta }` / `{ error: { code, message } }`; pagination `page`/`limit≤100`
+ `q`; Arabic error messages; UPPER_SNAKE codes). The machine source of truth
remains `docs/api/openapi.json` (regenerated, +9 paths / +10 ops, purely
additive); mobile types regenerated (`apps/mobile` `api:types`, zero drift).

## Notifications & push

| Route | Auth | Notes |
|---|---|---|
| `GET /me/notification-preferences` | session | The effective set. No row = defaults: all four push categories ON, `emailDigest` false (fail-open to pre-r359 behavior). |
| `PUT /me/notification-preferences` | session | Body: any subset of `{ pushUrgent, pushAcademic, pushSystem, pushSocial, emailDigest }` (booleans, ≥1 field). Upserts the caller's row. The push fan-out consults these BEFORE any Expo traffic; the weekly digest reads `emailDigest`. |

The fan-out (`modules/notifications/push.ts`, `PUSH_ENABLED`-gated) now:
filters by category preferences; mints a `PENDING` `PushDeliveryReceipt` per
Expo ticket (linked to the notification row when callers pass the id map);
`checkPendingReceipts()` (scheduler, every 5 min) settles them against
Expo's receipt API and prunes `DeviceNotRegistered` devices;
`sweepStaleDevices()` (daily) removes devices unseen for 180d + receipts
older than 30d.

## Email

| Route | Auth | Notes |
|---|---|---|
| `POST /auth/verify-email` `{ token }` | public (rate-limited) | Outcomes: `verified` / `already_verified` (200); `invalid`/`expired` (400 with the Arabic reason). Tokens: sha256-hashed, single-use, 48h, newest-wins (a resend consumes the previous open token). |
| `POST /auth/resend-verification` | session (rate-limited) | Honest outcomes: `sent` / `already_verified` / `unavailable` (provider off or suppressed). |

`POST /auth/register` now fires the verification mail best-effort
(fire-and-forget — a mail outage never fails signup).

**Webhook** `POST /webhooks/resend` — the bounce/complaint channel:
svix-style HMAC (`svix-id`/`svix-timestamp`/`svix-signature: v1,<base64>`)
over the RAW body, timing-safe verified against `RESEND_WEBHOOK_SECRET`
(fail-closed 401 when unset — forging a bounce would silence a user's
mail). Replay window ±5 min. Events: `email.bounced` (hard →
`User.emailBouncedAt` + suppression), `email.complaint` (→
`emailComplainedAt`), `email.delivered`/`email.opened` (recorded only).
Every event writes an `EmailEvent` row (the auditable trail); unknown
types are recorded + 200-ACKed (never a 500 source). The outbox layer
skips suppressed addresses with an `EmailEvent(SEND_SKIPPED_SUPPRESSED)`
row; failures write `SEND_FAILED`.

Templates: `renderVerificationEmail` + `renderDigestEmail` join the reset
and invite templates — same email-safe RTL shell (inline styles, no
images). The weekly digest (opt-in via preferences, default OFF) runs
Sunday 18:00 UTC, ≤20 items, one mail per active opted-in user, never
throws.

## Governance documents (D-6 large files)

| Route | Auth | Notes |
|---|---|---|
| `POST /governance/documents/presign` | COUNCILS_MANAGE/ACCREDITATION_MANAGE or ADMIN/OWNER | Body `{ filename, sizeBytes, multipart? }`. PDF-only; 1–500 MiB (below 1 MiB use the raw route). **S3 drivers only** — the honest 503 elsewhere (the lecture-video law). Returns `{ mode: "single", key, url, headers }` or `{ mode: "multipart", key, uploadId, partSize, parts }` (15-min URLs). |
| `POST /governance/documents/complete` | same | Body `{ key, uploadId?, parts? }`. The tenant fence: the key must be `governance/<YOUR institution>/…` (EVIDENCE_OWNER_INVALID otherwise). Completes the multipart, HEADs the object (no key for absent bytes), audits, returns `{ key, sizeBytes, mimeType }` — the SAME shape as the raw route, so the metadata attach (`POST /governance/councils/:id/documents`) is identical for both paths. |

## Audit browsing

| Route | Auth | Notes |
|---|---|---|
| `GET /institutional/audit-logs` | AUDIT_BROWSE (ADMIN+QUALITY+OWNER defaults) + institution context | Filters: `q action entityType entityId actorId from to` + pagination. **Tenant fence**: the institution is the server-verified context — a client-supplied id never scopes the read. |
| `GET /owner/activity` | OWNER | Gains the same filter set (cross-tenant view unchanged). |

## Search

`GET /search/global` adds three groups — `programs`, `orgUnits`, `people` —
each: institution-fenced to the caller's VERIFIED context (fail-closed
without one), capability-gated like the register it opens
(PROGRAMS_MANAGE / ORG_STRUCTURE_MANAGE / PEOPLE_MANAGE — roles without
the surface see no rows), ≤5 hits, Arabic-fold re-verified in JS. The
capability resolution is fail-soft (a permission-layer error degrades to
no institutional rows; the four original groups keep answering).

## Bulk export

| Route | Auth | Notes |
|---|---|---|
| `GET /users/export?format=csv\|json&role=` | ADMIN/OWNER (3/min) | The SAME faculty-governance + institution scope as `GET /users`. ≤10,000 rows (`X-Export-Rows`; `X-Export-Truncated` when capped). CSV = UTF-8 WITH BOM (Excel renders Arabic correctly), columns: id,email,role,firstName,lastName,universityId,isActive,emailVerified,createdAt,memberships (`inst:role(;…)`). |

## Idempotency

Side-effectful POSTs honor `Idempotency-Key` (≤128 chars): `POST
/announcements`, `POST /users/bulk-import/commit`, `POST
/governance/documents/upload`. First request executes + stores the
response (status+body) scoped to (user, route, sha256(key)), 24h window;
a replay returns the stored response verbatim with
`Idempotency-Replayed: true`. Storage failures degrade to pass-through.

## Status

`GET /status` adds `latestAppVersion` (env `LATEST_APP_VERSION`) — the
release-by-new-build pair with `minAppVersion`: below min = the blocking
«يلزم تحديث التطبيق» screen; below latest = a ONE-TIME «يتوفر إصدار
جديد» toast. Unset = none (bare-clone default).

## Database (migration `0007_r359_backend_ops` — fully idempotent)

New models: `UserNotificationPreference` (one row per user; renamed to
avoid the production drift collision — see LEDGER D16), `PushDeliveryReceipt`,
`EmailEvent`, `EmailVerifyToken` (renamed), `IdempotencyRecord`; `User`
+`emailBouncedAt`/`emailComplainedAt`; Capability +`AUDIT_BROWSE`.
Search: pg_trgm GIN coverage for every ILIKE'd column (16 indexes; 6
deliberately share production's existing names → no-op guards; 10 new —
Lecture.description, ResearchPaper.abstract, TrainingTrack.summary,
Program/OrganizationalUnit/InstitutionalPerson registers). The
`r352-unit-capabilities` browsing gap (audit §I.5) closes with
`GET /admin/unit-capabilities?unitId=&userId=&includeSubtree=&page=&limit=`
(UNIT_CAPABILITIES_ASSIGN; unit tenant-verified; subtree walks the
ancestor chain).
