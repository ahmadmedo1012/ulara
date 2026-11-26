# r366 — the screen map (the full route inventory)

Derived from `apps/mobile/app/**` by a full walk at `main` `d333d1a`. 133 route
files + 13 `_layout.tsx`. This is the capture contract: every row must have
light/dark, phone/tablet, portrait/landscape and font-scale evidence before
the round can call a screen done (the fidelity loop, §3).

## Route grammar and guards

- Role dirs are `Stack` shells whose first child is a `(tabs)` group — the
  group contributes no URL segment, so `/student/dashboard` ==
  `ulara://student/dashboard`. Detail screens are siblings of `(tabs)` and
  push over the persistent tab bar.
- Role checks live ONLY in section `_layout.tsx` via `<RoleGate allow={[...]}>`
  (`src/components/shell/RoleGate.tsx`): unauthenticated → `/auth`; wrong role
  → toast «هذه الصفحة غير متاحة لدور حسابك» + replace to `ROLE_HOME[role]`;
  multi-membership without context → `/select-institution`.
- Deep links: custom scheme **`ulara://`** only (no Universal/App Links yet —
  net-new `associatedDomains` / `intentFilters` work). Push taps deep-link
  in-app via `src/lib/push.tsx` → `safeDeepLink`.
- Entry rule `resolveEntryDestination` (`src/components/ui/boot.tsx`):
  `?continue=` (with context) → `/onboarding` if owed → `/select-institution`
  (non-OWNER/ADMIN, multi-membership) → role home.
- `AppRole = STUDENT | TEACHER | ADMIN | QUALITY | OWNER`; `ROLE_HOME` maps
  each to its dashboard. `/institution/*` is the shared cross-role workspace
  (ADMIN + QUALITY + OWNER).

## Tabs (one config: `src/components/shell/roleTabs.ts`, one bar: `RoleTabBar`)

| Role | Tabs |
|---|---|
| STUDENT | الرئيسية · مقرراتي · المساعد · الإشعارات (inbox badge) · حسابي |
| TEACHER | اللوحة · الجدول · الطلاب · التحليلات · حسابي |
| ADMIN | اللوحة · الكلّيات · الطلاب · الأساتذة · التقارير |
| QUALITY | اللوحة · المقررات · المناهج · التفاعل · التقارير |
| OWNER | اللوحة · المستخدمون · الحيّ · الإشعارات (inbox badge) · الحوكمة |

Immersive-hide policy (`src/components/shell/immersive.tsx`): the bar animates
off on `/student/lectures/[lectureId]`, `/student/online-exams/[templateId]`,
and while the keyboard is open on `/student/ai`.

## Shared / public (no role gate)

| Path | Purpose |
|---|---|
| `/` | boot screen; redirects via `resolveEntryDestination` |
| `/onboarding` | 4-screen role-aware first-run tour; push priming; completes server-side |
| `/select-institution` | multi-institution context picker (searchable) |
| `/settings` | preferences, account, security (biometric lock), support, sessions |
| `/achievements` | badges grid, earned list, points leaderboard |
| `/search` | global search (courses, lectures, papers, training) |
| `/campus` | real product-captures gallery |
| `/community` | posts · announcements · events · study rooms |
| `/competitions`, `/competitions/[id]` | competitions list + detail («المشاركة» sheet) |
| `/colleges`, `/colleges/[id]`, `/colleges/leaderboard` | public registry + profile + inter-college board |
| `/about` · `/contact` · `/help` · `/legal/[doc]` · `/vision`, `/vision/[slug]` | identity, early-registration channel, FAQs, six policy sheets, concepts |
| `/training`, `/training/[slug]`, `/training/[slug]/lesson/[lessonId]` | self-development catalog + track + lesson runner |
| `/document/[filename]` | authenticated PDF viewer (`?ns=materials\|papers`) |
| `/report` | sheet-as-route «الإبلاغ عن مشكلة» (the only modal idiom in the app) |
| `/auth`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` | guest stack |

## STUDENT (`RoleGate allow=[STUDENT]`)

| Path | Purpose |
|---|---|
| `/student/dashboard` (tab) | «الخطوة التالية» hero, agenda, peeks |
| `/student/courses` (tab) | FlashList, list/grid toggle, RingProgress, FilterSheet |
| `/student/ai` (tab) | AI assistant (composer hides bar with keyboard) |
| `/student/alerts` (tab) | notifications inbox «بريدك» |
| `/student/profile` (tab) | identity + academic facts + preferences hub |
| `/student/assignments` | cross-course pending + submit sheet |
| `/student/calendar` | month calendar, TODAY emphasized |
| `/student/catalog` | course catalog (read-only, paged) |
| `/student/courses/[offeringId]` | course detail: lectures/materials/announcements |
| `/student/lectures/[lectureId]` | player (immersive): controls, checkpoints, captions, chapters |
| `/student/online-exams`, `/[templateId]` | exam center + runner (timer, autosave, immersive) |
| `/student/results` | per-course weighted grade rollup + share |
| `/student/schedule` | weekly schedule grouped by day |
| `/student/materials` | all materials ledger → authenticated PDF |
| `/student/library` | books + papers reader |
| `/student/research` | my papers: upload/scan flow, status chips |
| `/student/matrix` | mastery heatmap + gap remediation |
| `/student/skills` | measured skills (1–5 dots + %) |
| `/student/gamification` | XP/level orb, leaderboard, badges |
| `/student/social` | social feed |
| `/student/jobs` · `/student/mooc` · `/student/webinars` · `/student/live` · `/student/labs` · `/student/ar` · `/student/map` | opportunities, MOOCs, webinars, live, labs («قيد التطوير»), AR catalog, faculties directory |
| `/student/payment` | finances — honest «قيد التطوير» |
| `/student/messages` | shared DM inbox |

## TEACHER (`RoleGate allow=[TEACHER]`)

| Path | Purpose |
|---|---|
| `/teacher/dashboard` (tab) | hero stats, today's classes strip |
| `/teacher/schedule` (tab) | lectures by day + «اليوم» marker |
| `/teacher/students` (tab) | offering picker + roster (search, risk filter, per-student sheet) |
| `/teacher/intelligence` (tab) | at-risk panel + analytics + curriculum suggestion |
| `/teacher/profile` (tab) | academic profile + menu hub, 4-field self-edit |
| `/teacher/assignments` | grading queue + all assignments + create |
| `/teacher/attendance` | 4-state roll call per session |
| `/teacher/grades` | fast grading (one student at a time) |
| `/teacher/exams`, `/teacher/exams/[templateId]` | templates (clone/publish) + editor + manual grading |
| `/teacher/curriculum` | lecture/chapter/checkpoint authoring (links only) |
| `/teacher/live` | live-session management (create, START/END/CANCEL) |
| `/teacher/materials` | my materials + PDF upload / external link |
| `/teacher/research-review` | paper triage queue + review sheet |
| `/teacher/labs` | lab catalog + honest preview |
| `/teacher/ai` · `/teacher/alerts` · `/teacher/messages` | assistant, inbox, DMs |
| `/teacher/students/[offeringId]` | roster pinned to one offering |

## ADMIN (`RoleGate allow=[ADMIN]`)

| Path | Purpose |
|---|---|
| `/admin/dashboard` (tab) | hero students + tiles, papers peek |
| `/admin/faculties` (tab) | faculties & departments |
| `/admin/students` (tab) | roster (paged FlashList) |
| `/admin/teachers` (tab) | teachers roster |
| `/admin/reports` (tab) | institutional reports (honest unknown-JSON ledger) |
| `/admin/courses` | course CRUD + offerings |
| `/admin/invites` | invite codes console |
| `/admin/bulk-import` | CSV cohort intake preview → commit |
| `/admin/permissions/[id]` | per-user 17-capability matrix |
| `/admin/digital` | digital transformation + real `/health` probe |
| `/admin/alerts` · `/admin/feedback` | registrar inboxes |

## QUALITY (`RoleGate allow=[QUALITY]`)

| Path | Purpose |
|---|---|
| `/quality/dashboard` (tab) | hero students, attendance ring, tiles |
| `/quality/courses` (tab) · `/quality/curriculum` (tab) · `/quality/engagement` (tab) · `/quality/reports` (tab) | quality roster, curriculum review, engagement, composite reports |
| `/quality/professors` | professor evaluation |
| `/quality/exam-moderation` | exam moderation |
| `/quality/alerts` | operational alerts + personal inbox |

## OWNER (`RoleGate allow=[OWNER]`)

| Path | Purpose |
|---|---|
| `/owner/dashboard` (tab) | owner board + door into `/institution` |
| `/owner/users` (tab) | platform users (role pills, role/permission edits) |
| `/owner/realtime` (tab) | realtime ops board |
| `/owner/notifications` (tab) | personal notifications |
| `/owner/governance` (tab) | permission counters, signup growth, login analytics |
| `/owner/institutions`, `/[slug]` | institution register + context (rename, «تجهيز مسجل عام») |
| `/owner/alerts` · `/owner/feedback` · `/owner/activity` · `/owner/ai` · `/owner/content` · `/owner/education` · `/owner/system` | ops boards |

## INSTITUTION workspace (`RoleGate allow=[ADMIN,QUALITY,OWNER]`, no tabs)

`/institution` overview · `/organization` org tree · `/people`, `/people/[id]` ·
`/positions` · `/appointments/[id]` · `/councils`, `/councils/[id]`,
`/councils/[id]/meetings/[meetingId]` · `/programs`, `/programs/[id]` ·
`/students` · `/training` · `/quality` · `/licenses` · `/access` ·
`/facilities`, `/facilities/[id]` · `/research`, `/research/[id]`

> ⚠️ **Found defect (r366 P0):** the meeting-detail file reached `main` as
> `meetings/eetingId].tsx` (the `[m` was lost), so expo-router registered a
> static garbage route and every meeting-detail push from
> `councils/[id].tsx` dead-ends at `+not-found`. The rename to
> `[meetingId].tsx` lands on this branch (via the Git Data API — see the
> ledger's environment note).

## Capture coverage contract (the rig: `mobile-capture-r366.yml`)

- **Android** — per device leg: cold/warm start timings → PUBLIC sweep
  (logged out) → onboarding tour shots → per-role Maestro login journey +
  role route sweep → combos: light/dark × font 1.0/2.0 × portrait/landscape →
  320×568 small-phone pass (wm size) → one scroll recording → logcat.
  Devices: `pixel_5` (phone class), `nexus_10` (tablet) in `quick`;
  + `pixel_6_pro`, `pixel_fold`, `nexus_7_2013` in `full`.
- **iOS** — macos-26 Debug simulator build; iPhone SE-class (light + dark +
  accessibility XXXL + best-effort student journey vs live API), Pro
  Max-class, iPad; PUBLIC sweeps via `simctl openurl`.
- Route lists live in `apps/mobile/scripts/capture/routes-*.txt`; the sweep
  driver is `capture-deeplinks.sh` (pure `adb` deep links), the combo and
  per-device orchestrators are `capture-combo.sh` / `capture-device.sh`.
- **Deferred in the sweep** (need seeded ids wired): detail routes with
  params — `/student/courses/[offeringId]`, `/student/lectures/[lectureId]`,
  `/student/online-exams/[templateId]`, `/competitions/[id]`,
  `/training/[slug]/**`, `/colleges/[id]`, `/admin/permissions/[id]`,
  `/owner/institutions/[slug]`, `/institution/*/[id]` detail pages,
  `/document/[filename]`. They render today only via their list screens'
  taps; wiring real ids from the seed is the NEXT round's first item.

## Current state facts (this round's baseline)

- `orientation: "default"` from this branch (was `"portrait"` — the lock
  retires per the prime directive; capture legs prove every orientation).
- No tablet two-pane layout exists anywhere yet (`useWindowDimensions` is
  used only for font scale, sheet max-height, welcome art sizing).
- Loading/empty/error furniture already exists:
  `src/components/ui/states.tsx` (`Skeleton*`, `EmptyState`, `ErrorState`,
  `OfflineState`, `OfflineBanner`, `Refreshable`), `src/components/ui/boot.tsx`
  (`Boot`, `BootMark`, `InlineBusy`), `src/motion/Skeleton.tsx`, plus
  illustrated art (`src/components/art/`).
- Fonts are already the web's families (`IBMPlexSansArabic`,
  `Alexandria`, `GeistMono` via `@expo-google-fonts/*` + `expo-font`), loaded
  in `app/_layout.tsx` with the splash held until fonts+RTL+theme hydrate.
- Native dirs (`android/`, `ios/`) are gitignored — every build prebuilds in
  CI (the one recipe: `scripts/build-android-local.sh`).
