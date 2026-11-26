# r365 — route map (derived, never guessed)

Sources of truth (read, not assumed):
- `frontend/src/lib/routes.ts` — the path constants (R341 Y2 single source).
- `frontend/src/App.tsx` — the route table (lines 455–851) + lazy page imports.
- `frontend/src/lib/nav.ts` — `STUDENT_NAV / TEACHER_NAV / ADMIN_NAV / QUALITY_NAV / OWNER_NAV` and `NAV_BY_ROLE`.
- `frontend/src/lib/roleHome.ts` — `ROLE_HOME` per role.

Roles: `STUDENT`, `TEACHER`, `ADMIN`, `QUALITY`, `OWNER` (`AppRole` in `stores/auth.store.ts`). The institutional workspace (`/institution/**`) is a namespace reached from ADMIN, QUALITY and OWNER navs (it is not a role of its own).

Legend: ● = sidebar/nav item, ○ = reachable route not in the sidebar (in-page links, bell, URL), → = redirect.

## Shared (any-authenticated role)

| Route | Page | Notes |
|---|---|---|
| `/settings` | `SettingsPage` | ● in every role's «حسابي» group — security, sessions, notification prefs, email verification |
| `/achievements` | `AchievementsPage` | ● student («التطوير والتقدّم»), teacher (`/student/achievements` → here) |
| `/community` | `CommunityPage` | ● student + teacher + admin + quality; also shared page instance |
| `/competitions` + `/competitions/:id` | `CompetitionsIndexPage` / `CompetitionDetailPage` | ● student + teacher |
| `/training` , `/training/:slug` , `/training/:slug/lesson/:lessonId` | `TrainingCatalogPage` / `TrainingTrackPage` / `TrainingLessonPage` | ● student; `/student/training/**` → redirects here |
| `/colleges`, `/colleges/leaderboard`, `/colleges/:id` | `CollegesIndexPage` / `CollegesLeaderboardPage` / `CollegeDetailPage` | ● all five roles («كلّيّات الجامعة») |
| `/vision`, `/vision/:slug` | `VisionGalleryPage` / `VisionDetailPage` | ● all five roles («الابتكارات القادمة») |
| `/document/:filename` | `DocumentViewerPage` | ○ opened from governance/documents UIs |
| `/auth`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` | Auth pages | public (out of scope) |
| `/404`, `/500`, `/403`, `/maintenance`, `*` | error surfaces | shared; authenticated variants must match the product grammar |
| `/__design` | `DesignPage` | design-system showcase — must show every primitive in both themes + RTL |
| `/__brand`, `/__plates` | brand/plates internals | internal |

## STUDENT — home `/student/dashboard`

Sidebar groups (in order):
1. **الرئيسية**: `/student/dashboard` (لوحة التحكم) ●, `/student/schedule` (الجدول الدراسي) ●, `/student/calendar` (التقويم الأكاديمي) ●, `/student/courses` (مقرّراتي الدراسية) ●, `/student/catalog` (دليل المقررات) ●, `/student/results` (النتائج والتقييمات) ●
2. **التعلم الذكي**: `/student/matrix` (المصفوفة التعليمية) ●, `/student/online-exams` (الاختبارات الإلكترونية) ●, `/student/library` (المكتبة الإلكترونية) ●, `/student/research` (بحوثي العلمية) ●, `/student/ai` (المساعد الذكي, AI badge) ●
3. **المعامل والتقنيات** (collapsed): `/student/labs` ●, `/student/ar` ●, `/student/live` ●
4. **التطوير والتقدّم** (collapsed): `/training` ●, `/achievements` ●, `/student/gamification` ● (النقاط والمستويات), `/student/skills` ●, `/student/mooc` ●, `/student/webinars` ●
5. **المجتمع والفرص** (collapsed): `/community` ●, `/student/social` ●, `/colleges` ●, `/competitions` ●, `/student/jobs` ●
6. **حسابي**: `/student/profile` ●, `/student/messages` ●, `/student/alerts` ●, `/settings` ●
7. **خدمات الجامعة** (collapsed): `/student/payment` ●, `/student/university` ●, `/student/map` ●, `/student/downloads` ●, `/vision` ●

Non-sidebar routes: `/student/courses/:offeringId` (course detail), `/student/lectures/:lectureId` (lecture player — video/PDF/slides/notes/progress), `/student/online-exams/:id` (exam runner — timer, navigator, autosave, review), `/student/exams` → `/student/online-exams`, `/student/training/**` → `/training/**`, `/student/achievements` → `/achievements`, `/student/community` → `/community`, `/student/colleges` → `/colleges`.

## TEACHER — home `/teacher/dashboard`

1. **لوحة التدريس**: `/teacher/dashboard` ●, `/teacher/intelligence` (AI badge) ●, `/teacher/intelligence/:offeringId` ○ (class mastery detail), `/teacher/performance` ●, `/teacher/schedule` ●, `/teacher/attendance` ●, `/teacher/students` ●, `/teacher/materials` ●
2. **التقييم والتصحيح**: `/teacher/grades` ●, `/teacher/assignments` ●, `/teacher/exams` (بنك الأسئلة والاختبارات) ●, `/teacher/exams/:templateId` ○
3. **البحث والمحاضرة**: `/teacher/research` ●, `/teacher/live` ●, `/teacher/labs` ●, `/teacher/library` ●, `/teacher/ai` ●
4. **حسابي**: `/teacher/profile` ●, `/teacher/messages` ●, `/teacher/alerts` ●, `/teacher/community` (→ shared CommunityPage) ●, `/colleges` ●, `/competitions` ●, `/vision` ●, `/settings` ●

## ADMIN — home `/admin/dashboard`

1. **إدارة المؤسسة**: `/admin/dashboard` ●, `/institution` (مساحة العمل المؤسسية) ●, `/admin/teachers` ●, `/admin/faculties` ●, `/colleges` ●, `/admin/courses` ●
2. **النظام**: `/admin/students` ●, `/admin/digital` ●, `/admin/reports` ● (analysis folded in, `?trend=table`), `/admin/alerts` ●, `/admin/settings` ● (platform sheet), `/settings` ●, `/admin/community` ●, `/vision` ●

Non-sidebar: `/admin/permissions/:id` (permissions console), `/admin/analysis` → `/admin/reports`.

## QUALITY — home `/quality/dashboard`

1. **مركز ضمان الجودة**: `/institution` ● (read-only oversight), `/quality/dashboard` ●, `/quality/courses` ●, `/quality/professors` ●, `/quality/engagement` ●
2. **المراجعة والتقارير**: `/quality/exam-moderation` ●, `/quality/curriculum` ●, `/quality/reports` ●, `/quality/notifications` ●, `/quality/alerts` ● (QualityAlertsPage), `/quality/community` ●, `/colleges` ●, `/settings` ●, `/vision` ●

## OWNER — home `/owner/dashboard`

1. **لوحة المالك**: `/institution` ●, `/owner/dashboard` ●, `/owner/realtime` (LIVE badge) ●, `/owner/users` ●, `/owner/institutions` ●, `/owner/institutions/:slug` ○, `/owner/activity` ●
2. **المنصة**: `/owner/content` ●, `/owner/system` ●, `/owner/education` ●, `/colleges` ●
3. **المراقبة والتحليل**: `/owner/ai` ●, `/owner/notifications` ●, `/owner/alerts` ● (OwnerAlertsPage), `/owner/feedback` ●, `/settings` ●, `/owner/governance` ●, `/vision` ●

## Institutional workspace `/institution/**` (from ADMIN · QUALITY · OWNER)

`/institution` (overview) ●, `/institution/organization` ●, `/institution/people` ●, `/institution/people/:id` ○, `/institution/positions` ●, `/institution/appointments/:id` ○, `/institution/access` ●, `/institution/councils` ●, `/institution/councils/:id` ○, `/institution/councils/:id/meetings/:meetingId` ○, `/institution/programs` ●, `/institution/programs/:id` ○, `/institution/training` ●, `/institution/students` ●, `/institution/quality` ●, `/institution/licenses` ●, `/institution/facilities` ●, `/institution/facilities/:id` ○, `/institution/research` ●, `/institution/research/:id` ○, `/institution/audit` ●.

(The workspace has its own module rail — see the workspace shell; nav items listed here are the route inventory.)

## Capture matrix (P0 baseline)

Every authenticated route above × viewports (320, 390, 768, 1280, 1440, 1920) × themes (light, dark) × direction (RTL default, LTR sanity) × role fixtures from `frontend/tests/e2e/fixtures/api-fixtures.ts` (`ROLE_USERS`, `installMockApi`, `seedSession`, `sessionStorage['ulara-intro-skip']='1'`). Priority order for the fidelity loop: role dashboards → shared shell states → dense data screens (users/courses/gradebook/institution lists) → flows (exam runner, course player, assignment submission, authoring) → the long tail.
