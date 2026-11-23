# PR42 Phase 2 — the completion report (mobile + product integrity)

**Branch:** `agent/ulara-product-roles-mobile` · **PR:** #42 · **Base:** `main`
**Phase-1 review HEAD:** `f3674264ad379f10c8315fffb8d83067d5acce63`

Phase 2 turned the Phase-1 surfaces into production-grade truth: the
size-gate failure fixed without touching limits, every workspace
screen scrollable and fully paged, institution isolation pinned as a
privacy law, the API types audited against the REAL backend routes,
the bulk-import screen made honest about the server's actual
behavior, and behavioral suites proving each of those claims.

---

## 1. The size gate (the immediate priority) — GREEN, no limit raised

**The failure at the Phase-1 HEAD:** `councils-820-dark.png` > 500KB
(rule 1), `docs/` at 66,543KB > 40,960KB (rule 2), the change adding
30,886KB > 5,120KB (rule 3).

**Root cause:** the r352 visual-capture belt is a dev instrument that
writes its full 104-frame matrix as full-size PNGs (~31MB) into
`docs/…/screenshots/`. The Phase-1 re-run (with the route-transition
fixed) regenerated every frame with real content and committed them.

**The fix (rules as-are, allowlist untouched):**
- Every one of the 104 captures re-encoded as **WebP q85, full
  dimensions** (the repo already ships WebP in
  `frontend/public/media/illustrations/r342/*`): 30,835KB → **3,094KB
  (10%)**, max file 58KB. The full matrix stays as evidence — nothing
  deleted, no quality step that harms text readability.
- `.gitignore` now ignores the belt's raw PNG output in that directory
  (root cause: future belt runs can never dirty the tree with ~31MB).
- `docs/…/screenshots/README.md` documents the format decision and
  the regeneration path.
- Verified: `bash scripts/gates/size-gate.sh` with
  `SIZE_GATE_BASE=$(git rev-parse origin/main)`:
  rule 1 ok · rule 2 ok — 38,807KB ≤ 40,960KB · rule 3 ok — 3,150KB ≤
  5,120KB. **GREEN.**

## 2. Scrolling — every workspace screen reaches its last element

The Phase-1 screens rendered list bodies inside plain `View`s —
anything past the fold was unreachable. All 19 screens rebuilt on the
house laws:

- **List registers** (`people`, `positions`, `councils`, `programs`,
  `facilities`, `training`, `students`, `quality`, `licenses`,
  `research`): `<Screen scroll={false}>` + fixed header + `DataList`
  as THE scroller (FlashList v2 native / FlatList web). No nested
  ScrollView anywhere.
- **Detail pages** (`people/[id]`, `appointments/[id]`,
  `programs/[id]`, `facilities/[id]`, `organization`,
  `institution` index, the access screen, the meeting record): `Screen
  scroll` — one scroller, header + back always visible (StackHeader).
- **Register-bearing detail pages** (council detail, research detail):
  the register (meetings / outputs) is the page's own paged DataList;
  the masthead + team ride the fixed header / ListHeader — the
  §3C structure, no nested scroller.

**Not run (honest):** real-device scroll physics / FlashList
recycling / keyboard-avoidance — no emulator or device exists in
this sandbox. What IS verified: the screens render (the render net),
the lists are DataList-mounted with bounded content (jest), and the
house Screen keeps safe areas + `keyboardShouldPersistTaps="handled"`
for the forms. Device verification stays an open checklist item —
recorded in feature-parity.md, never claimed as passed.

## 3. Pagination — no first-page caps, totals are the server's word

**Root cause fixed:** `parseEnvelope` unwrapped `{ data, meta }` →
rows-only (meta dropped at the seam), and `getPage` then FABRICATED
`totalPages: 1`. Every list looked like a one-page list forever.

- `client.ts`: a `paged` read option keeps the `{ data, meta }` body
  whole (default off — the ~90 pre-existing screens keep the
  historical unwrap byte-for-byte; no blanket transport change).
- `getPage` is now honest: wire meta preserved; bare arrays
  normalize to a truthful no-more-pages meta.
- All 22 institutional list functions ride `getPaged`; all list
  screens ride `usePagedList` (page 1, limit 20, meta-driven
  `totalPages`) with the footer loader, load-more error + retry, and
  pull-to-refresh (DataList's own wiring).
- Totals show `«N معروضاً من TOTAL وفق سجل المؤسسة»` from
  `meta.total`; segmented registers (students/quality/licenses)
  label each tab with the server's total.

**Pinned by:** `src/api/institutional.test.ts` (the paged contract
per family + the getPage honesty), the existing `usePagedList`
accumulation/retry suites, and the screen-level requests
(`page=1&limit=20` + the «من 47» total line) in
`src/features/institutional/screens.test.tsx`.

## 4. Institution isolation — a privacy law, now enforced and tested

**The defect:** every institutional list rode
`placeholderData: (prev) => prev`. TanStack's placeholder crosses
query keys BY DESIGN — the scope segment in the key did NOT protect
against it: while institution B's key loaded (or failed), the screen
painted institution A's rows. The user-search key didn't even carry
the scope. Nothing purged the query cache (or its PERSISTED copy) at
login/logout boundaries.

**The fix:**
- `sameScopePlaceholder` (exported from the queries module): the
  previous page is kept ONLY when the previous query's own scope
  segment (withScope appends it LAST) equals the current scope — a
  membership switch shows the honest loading state; a failure shows
  the error state, never A's rows. Every institutional paged hook
  and the user-search ride it; `usePagedList` gained a
  `placeholderData` passthrough so institution callers can opt into
  the guard (default unchanged for platform-level lists).
- `useUserSearch`: the key carries the scope + the guard; the access
  screen's whole search/selection state (query, applied query,
  selected user, capability/unit/reason picks) resets on scope
  change.
- Session boundaries: `clearSession` (logout/expiry) AND
  `setSession` with a DIFFERENT user id purge the query cache AND
  the persisted AsyncStorage copy; same-user refresh keeps the warm
  cache. `select-institution` already cleared on switch.
- Mutations invalidate the WHOLE `['inst']` family (a scope captured
  at render time can never strand an invalidation).

**Pinned by:** `src/features/institutional/queries.test.tsx` (the
privacy law with a slow-institution-B harness: no A rows while B
loads; B's failure never serves A's rows; same-scope search keeps
rows; user-search re-keys with scope; whole-family invalidation) and
`src/auth/session-boundary.test.ts` (the purge at each boundary,
including the same-user no-purge case).

## 5. Roles, capabilities, and the no-context state

- The mobile gate (`RoleGate allow={ADMIN, QUALITY, OWNER}`) is
  byte-identical to the sanctioned WEB route gate
  (`frontend/src/App.tsx`: `ProtectedRoute allow={['ADMIN','OWNER','QUALITY']}`).
  The API-CONTRACT's §0 «any active member» language describes the
  server's read scoping, not a wider product gate — decision recorded
  in feature-parity.md §7. No STUDENT/TEACHER widening, no narrowing.
- Every write affordance gates on `useMyCapabilities` — the server's
  effective set (grant/revoke: UNIT_CAPABILITIES_ASSIGN; training
  evaluation: PROGRAMS_MANAGE; facility booking: FACILITIES_MANAGE).
  The grant form states its scope («على المؤسسة كاملة» vs «نطاق:
  الوحدة (شجرة الوحدة)») and blocks self-grants.
- The layout renders the honest no-context state for an allowed
  role with ZERO active memberships («لم تُحدَّد مؤسسة في هذه
  الجلسة… هذا يختلف عن «مؤسسة فارغة»») instead of eternal
  skeletons behind disabled queries. Multi-membership users are
  routed to /select-institution by the RoleGate (pre-existing).

## 6. The deep-link kind rule (research)

`/institution/research` and `/institution/research/:id` now apply the
kind rule AT THE ROUTE: for INTERMEDIATE_TECHNICAL_INSTITUTE /
VOCATIONAL_TRAINING_CENTER contexts (Law 21/2023 stages 1–2, LEGAL-
MATRIX §A.3) they render the web-parity explanatory state and fire
NO research reads (the paged/detail hooks stay disabled until the
profile resolves the kind). Pinned in screens.test.tsx (both routes,
with the api mock asserting zero research calls + the honest copy).

## 7. The API type audit (§8) — the wire is the truth

Every type in `src/api/institutional.ts` was re-derived from the REAL
route handlers (`backend/src/http/routes/r352-*.ts` selects/includes),
not from API-CONTRACT.md prose. The confirmed conflicts fixed:

| Defect (Phase-1 types) | The wire (verified from the route) |
|---|---|
| `Person.displayName / status` | `fullNameAr / staffStatus` (personSelect) |
| `getPerson: PersonDetail extends Person` | `{ person, appointments, unitCapabilityGrants }` aggregate |
| `getOrgUnit: OrgUnit` | `{ unit, ancestors }` |
| `Council.memberCount / formedAt / decisionRef` | `membershipCount / meetingCount / establishedAt / charterRef` |
| `MeetingDetail.minutes` as OBJECT | the route's one-to-many include — an ARRAY of ≤1 row, read as `minutes[0]` |
| `AwardedCredential.awardedAt / revokedAt` | `conferredAt` (no revokedAt on the wire) |
| `ProgramEnrollment.enrolledAt / learnerProfile` | `entryDate` + `learnerProfile` AND `studentProfile` relations (both models in transition) |
| `TrainingPlacement.learnerProfile.displayName / supervisor` | `learnerProfile.fullNameAr` / `supervisorPerson.fullNameAr` |
| `LearnerProfileRow.displayName / universityId` | `fullNameAr / learnerNumber` |
| Inspections lacking findings count | `findingCount` (_count projection) |
| Equipment lacking counts | `programLinkCount / workOrderCount` |
| (gap) facilities incidents | `GET /operations/safety-incidents` added (web parity) |

**Pinned by:** `src/api/institutional.test.ts` — 21 transport contract
tests: the exact method + path + query + body per family (people paged
+ Arabic `q` encoding, tree unwrap, org-unit detail, meetings path,
PATCH placement body, POST reservation body + the 409 overlap error,
grant/revoke paths + bodies, getPage honesty, `{ data: null }`, the
403 envelope). `npm run contract-check`: **no drift** (every consumed
endpoint registered by backend source). Backend/OpenAPI untouched.

## 8. Bulk import — honest about what the server actually does

The backend creates the VALID rows in one transaction and SKIPS the
invalid ones, returning `created / sheet / skipped`. The screen now:

- says exactly that (the «الدفعة كاملة أو لا شيء» claim removed;
  the false «لن يستطيع الطلاب تغييرها قبل أول دخول» claim removed —
  no such backend rule exists);
- marks preview rows «سيُنشأ» / «سيُتخطى» with the per-row server reason;
- invalidates the preview the instant the CSV or institution context
  changes (derived staleness — no effect, no stale commit);
- shows ONE explicit confirmation with the EXACT counts before the
  commit fires; inputs lock while in flight;
- surfaces a TIMEOUT as the AMBIGUOUS outcome («قد تكون الدفعة
  نُفذت — أعد العرض المسبق») — never a silent re-send;
- renders the SERVER's created/skipped, not the plan's expectation;
- delivers temp passwords as one-time screen state (never
  AsyncStorage/query cache/logs) via the platform Share sheet +
  selectable text; «قائمة الكتيبة» reworded to «قائمة دفعة الطلاب»;
- the unreachable OWNER branch removed (`/admin` is ADMIN-gated in
  the app; the OWNER console doesn't ship this surface — documented).

**Pinned by:** `src/test/bulk-import.test.tsx` (6 behavioral tests:
copy honesty, skipped-row reasons, preview invalidation, the confirm
gate with exact counts, server-word results, the ambiguous-timeout
no-re-fire).

## 9. Booking + evaluation validation

- The reservation form composes date + optional time into an ISO
  instant in the DEVICE's timezone (explicit, never ambiguous text),
  validates end > start client-side, and surfaces the server's own
  409/400 words (RESERVATION_OVERLAP / FACILITY_NOT_OPERATIONAL /
  RESERVATION_WINDOW_INVALID) — no fake success.
- Training evaluation keeps the 0–100 score gate (server schema
  agrees); mutations invalidate the whole ['inst'] family.

## 10. Gates

- `apps/mobile`: `tsc --noEmit` clean · `expo lint` 0 errors (16
  warnings, all pre-existing in files outside this round's diff) ·
  jest **52 suites / 1434 tests green** (Phase-1 baseline 1388 → +46
  behavioral tests) · `contract-check` no drift.
- Repo: size-gate GREEN (§1). `frontend/**` untouched — the
  PageTransition pixel-proof + reduced-motion suite from Phase 1
  ride as committed (verified: zero frontend changes in this round's
  diff).
- Android/iOS device runs: **Not run** (no emulator/device in the
  sandbox) — stated as such, never as passed.

## 11. What did NOT land (and the honest reasons)

- Real-device verification (scroll physics, recycling, keyboard) —
  no device/emulator exists in this sandbox.
- The web workspaces' authoring CRUD on mobile (create/edit org
  units, people, appointments, councils, programs…) — web-first by
  scope; mobile reads + the three field writes. Follow-up work.
- Server-side facility filtering for work orders / safety incidents
  (the contract's filters are status/equipmentId only) — the facility
  page mirrors the web's client-side filter of the loaded page and
  labels it.
- The three known server 500s on `main` (`/auth/me`,
  `/catalog/institution-types`, `/colleges`) are backend-owned;
  nothing in this branch hides or rewrites their surface.
