/**
 * mock-transport — a hermetic stand-in for the Express API, installed
 * at the Playwright transport layer (r164-k / Agent K).
 *
 * WHY page.route and not a local server: this sandbox (and any CI
 * runner without a seeded PostgreSQL) cannot boot the backend, but the
 * Vite dev server + the real built SPA are fully available. Installing
 * context.route on the /api/ glob fulfils every XHR the app makes BEFORE
 * it reaches the network (the /api vite proxy is never consulted), so
 * the specs exercise the real router, real hooks, real stores, real
 * render trees — only the transport is fixed.
 *
 * Contract fidelity:
 *   - responses use the real envelopes (`{ data }` / `{ error }`, see
 *     api-fixtures.ts) so axios + unwrap() + authErrorView behave
 *     exactly as against the live backend;
 *   - the login endpoint is DYNAMIC (success / 401 INVALID_CREDENTIALS
 *     / 429 TOO_MANY_REQUESTS lockout) and flips the transport's
 *     session role, so /auth/me answers for whoever just logged in;
 *   - every unmatched /api/** call answers 501 MOCK_NOT_IMPLEMENTED
 *     with a console line — a missing fixture is loud, never a silent
 *     success (the tests assert real rendered content, so a missing
 *     payload fails visibly rather than passing vacuously).
 *
 * The same installer powers the DB-less surface-inventory capture
 * (tests/audit/surface-inventory.spec.ts, AUDIT_API_MOCK=1).
 */
import type { BrowserContext, Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMIN_COURSES_PAGE,
  COLLEGES_LEADERBOARD,
  PUBLIC_INSTITUTIONS_FIXTURE,
  SYSTEM_STATUS_FIXTURE,
  ADMIN_FACULTIES,
  ADMIN_PAPERS_GRADED_PAGE,
  ADMIN_REPORTS,
  ADMIN_STATS,
  ADMIN_STUDENTS_PAGE,
  ADMIN_USERS_PAGE,
  ANNOUNCEMENT_FEED,
  AR_EXPERIENCES,
  CAMPUS_EVENT_ROWS,
  CLIENT_ERRORS_PAGE,
  COMPETITION_ROWS,
  DB_OFFERING_LECTURES,
  DIGITAL_METRICS,
  ENROLLMENTS,
  FACULTIES,
  FEEDBACK_PAGE,
  INVITE_ROWS,
  JOBS_PAYLOAD,
  LIBRARY_BOOKS,
  LIBRARY_RESEARCH,
  LECTURE_DETAIL,
  LIVE_SESSION_ROWS,
  LOCKED_EMAIL,
  LOGIN_FAILED_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  ME_GAPS,
  ME_MATRIX,
  ME_RESULTS,
  MESSAGES_PAGE,
  MOOC_COURSES,
  MODERATION_QUEUE,
  NOTIFICATION_PREFERENCES,
  AUDIT_LOGS_PAGE,
  RESEND_VERIFICATION_SENT,
  EXAM_TEMPLATE_ROWS,
  QUESTION_BANK_ROWS,
  QUESTION_CATEGORY_ROWS,
  MODERATION_TEMPLATES,
  MY_EXAMS,
  MY_LAB_STATS,
  MY_LOANS,
  MY_PROFILE,
  MY_RESEARCH,
  NOTIFICATIONS,
  OFFERING_ANALYTICS,
  OFFERING_FULL,
  OFFERING_GRADES,
  OFFERING_ID,
  OFFERING_LECTURES,
  OFFERING_STUDENTS,
  OWNER_ACTIVITY,
  OWNER_ALERTS,
  OWNER_AI_METRICS,
  OWNER_EDUCATION,
  OWNER_FEATURE_FLAGS,
  OWNER_GOVERNANCE,
  OWNER_INSTITUTIONS,
  OWNER_LOGIN_ANALYTICS,
  OWNER_REALTIME,
  OWNER_SETTINGS,
  OWNER_STATS,
  OWNER_SYSTEM,
  OWNER_USERS_PAGE,
  PAPER_ANNOTATIONS,
  PENDING_SUBMISSIONS,
  QUALITY_ALERTS,
  QUALITY_COURSES,
  QUALITY_CURRICULUM,
  QUALITY_ENGAGEMENT,
  QUALITY_OVERVIEW,
  QUALITY_PROFESSORS,
  RESEARCH_QUEUE,
  RESUME,
  SEARCH_RESULTS,
  SOCIAL_POSTS,
  STUDENT_DASHBOARD,
  STUDENT_MATERIALS,
  STUDENT_USER,
  TEACHER_ASSIGNMENTS,
  TEACHER_DASHBOARD,
  TEACHER_FULL_PROFILE,
  TEACHER_MATERIALS,
  TEACHER_OFFERINGS,
  TEACHER_RISKS,
  TEACHER_USER,
  TEMPLATE_ATTEMPTS,
  TRAINING_BADGES,
  TRAINING_CERTIFICATES,
  TRAINING_CATALOG,
  TRAINING_LEADERBOARD,
  TRAINING_ME_SUMMARY,
  UNREAD_COUNT,
  PUSH_DEVICES,
  USER_ACHIEVEMENTS,
  USER_SKILLS,
  VALID_LOGIN,
  VIRTUAL_LABS,
  XP_LEADERBOARD,
  meProfile,
  myPermissions,
  tinyPdfBytes,
  type FixtureUser,
} from './api-fixtures';
/* r351 AI-5 — the A3 marker block's corpus (one import, one block). */
import {
  AI_SERVICE_CONFIG,
  AI_CONVERSATIONS,
  AI_CONVERSATION_MESSAGES,
  AI_SERVICE_STATUS_LOCAL,
  AI_CONNECTION_CHECK_LOCAL,
} from './ai-fixtures';
import {
  INSTITUTION_TYPES_CATALOG,
  REGULATORY_AUTHORITIES_CATALOG,
  CREDENTIAL_TYPES_CATALOG,
  POSITION_TEMPLATES_CATALOG,
  CRITERIA_SETS_CATALOG,
  MY_INSTITUTION_PROFILE,
  MY_INSTITUTION_CAPABILITIES,
  INSTITUTION_ORG_TREE,
  INSTITUTION_PEOPLE_PAGE,
  INSTITUTION_POSITIONS_PAGE,
  INSTITUTION_COUNCILS_PAGE,
  INSTITUTION_PROGRAMS_PAGE,
  INSTITUTION_TRAINING_PAGE,
  INSTITUTION_LEARNERS_PAGE,
  INSTITUTION_ACCREDITATION_PAGE,
  INSTITUTION_LICENSES_PAGE,
  INSTITUTION_FACILITIES_PAGE,
  INSTITUTION_RESEARCH_PAGE,
} from './institutional-fixtures';

/* ── envelope helpers (the real backend's shapes) ──────────────── */

function ok(data: unknown): Record<string, unknown> {
  return { data };
}

function fail(code: string, message: string): Record<string, unknown> {
  return { error: { code, message } };
}

/** Success envelope with pagination meta sibling (lib/pagination). */
function pageOf(rows: unknown[], extraMeta: Record<string, number>): Record<string, unknown> {
  return { data: rows, meta: { page: 1, total: rows.length, totalPages: 1, ...extraMeta } };
}

/* ── route table ───────────────────────────────────────────────── */

/**
 * The shared 1-second test clip (media/lecture.mp4, generated with
 * ffmpeg — a REAL playable MP4) served for every /media/ request so
 * the lecture player's <video> can load metadata. The specs assert
 * the player wiring (element + chapters), not playback quality.
 */
const LECTURE_MP4 = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'media/lecture.mp4'),
);
/* r351 A2: the same idea for the document viewer — one minimal valid
 * PDF (built with correct xref offsets), served for /files/*. */
const TINY_PDF = tinyPdfBytes();

/** A single mock route: method + path pattern + static payload. */
export interface MockRouteDef {
  method: string;
  /** e.g. '/lectures/:lectureId' — ':param' matches one segment. */
  path: string;
  /** Optional required query params (others are ignored). */
  query?: Record<string, string | number>;
  status?: number;
  /** Static JSON body (already enveloped by the caller). */
  json?: unknown;
  /** r351 A2: serve the tiny fixture PDF bytes (application/pdf). */
  pdf?: boolean;
}

/** Build the standard route table for the seeded session role. */
export function standardRoutes(): MockRouteDef[] {
  return [
    { method: 'GET', path: '/health', json: ok({ status: 'ok' }) },
    { method: 'GET', path: '/auth/me', json: ok(meProfile(STUDENT_USER)) },
    { method: 'POST', path: '/auth/logout', json: ok({ ok: true }) },
    { method: 'POST', path: '/auth/register', json: ok({ user: STUDENT_USER, accessToken: 'e2e-token' }) },
    { method: 'GET', path: '/faculties', json: ok(FACULTIES) },
    /* r164 integration: the public college gallery (/colleges) — records
     * match the identity bridge (name|city exact) so the real
     * reconciliation + identity accents render. */
    { method: 'GET', path: '/colleges', json: ok([
      { id: 'clg_e2e_eng', name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: null, city: 'افتراضي', departmentCount: 3, studentCount: 420, teacherCount: 28, courseCount: 12 },
      { id: 'clg_e2e_sci', name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: null, city: 'افتراضي', departmentCount: 2, studentCount: 310, teacherCount: 19, courseCount: 9 },
      { id: 'clg_e2e_arts', name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: null, city: 'افتراضي', departmentCount: 2, studentCount: 260, teacherCount: 15, courseCount: 7 },
    ]) },

    { method: 'GET', path: '/me/dashboard', json: ok(STUDENT_DASHBOARD) },
    { method: 'GET', path: '/me/resume', json: ok(RESUME) },
    { method: 'GET', path: '/me/profile', json: ok(MY_PROFILE) },
    { method: 'PUT', path: '/me/theme', json: ok({ ok: true }) },
    { method: 'POST', path: '/me/onboarding/complete', json: ok({ onboardingCompletedAt: new Date(0).toISOString() }) },

    { method: 'GET', path: '/enrollments/me', json: ok(ENROLLMENTS) },
    { method: 'GET', path: `/offerings/${OFFERING_ID}/full`, json: ok(OFFERING_FULL) },
    { method: 'GET', path: `/offerings/${OFFERING_ID}/lectures`, json: ok(OFFERING_LECTURES) },
    { method: 'GET', path: '/offerings/offr_e2e_databases/lectures', json: ok(DB_OFFERING_LECTURES) },
    { method: 'GET', path: '/lectures/:lectureId', json: ok(LECTURE_DETAIL) },
    { method: 'POST', path: '/lectures/:lectureId/watch', json: ok({ completed: false, watchedSec: 10, totalSec: 720 }) },
    { method: 'POST', path: '/lectures/:lectureId/checkpoints/:checkpointId/answer', json: ok({ correct: true, correctIndex: 0 }) },

    { method: 'GET', path: '/exams/me', json: ok(MY_EXAMS) },

    // Notifications: one route serves both the unread poll
    // (?limit=1 reads meta.unread) and the 50-item panel list.
    { method: 'GET', path: '/notifications', json: pageOf(NOTIFICATIONS, { unread: UNREAD_COUNT, limit: 50 }) },
    { method: 'PATCH', path: '/notifications/:id/read', json: ok({ ok: true }) },
    { method: 'POST', path: '/notifications/read-all', json: ok({ updated: UNREAD_COUNT }) },
    /* r359 §5.5 — the settings sheet's device register: the list the
     * backend serves today + the unregister verb (scoped to the caller).
     * Registration itself happens from the mobile app — never here. */
    { method: 'GET', path: '/me/push-devices', json: ok(PUSH_DEVICES) },
    { method: 'DELETE', path: '/me/push-devices/:id', json: ok({ ok: true }) },

    { method: 'GET', path: '/search/global', json: ok(SEARCH_RESULTS) },

    /* r165h: r164c's resume-hero fallback arm reads the training
     * catalog on every student dashboard visit — the integrated tree
     * left it 501-ing (a silent loud-501 regression the r164k claim
     * predated). The honest corpus ships NO training tracks: the
     * dashboard's primary resume card always wins (RESUME rides a
     * lecture), so the training arm never renders — an empty list is
     * the truthful payload, not a stub. */
    { method: 'GET', path: '/training/catalog', json: ok(TRAINING_CATALOG) },

    /* r350 B1: the owner platform dashboard's five feeds — the corpus
     * was audit-only for OWNER, so the role-shots instrument hit loud
     * 501s on /owner/* (logged in the r350 LOG, then closed here with
     * the shapes hooks/useOwner.ts declares). The activity route rides
     * the RAW paginated body ({data,meta} — pageOf shape): the hook
     * returns axios res.data verbatim, so ok() would double-wrap and
     * the dashboard's events.map would crash (measured). */
    { method: 'GET', path: '/owner/stats', json: ok(OWNER_STATS) },
    { method: 'GET', path: '/owner/realtime', json: ok(OWNER_REALTIME) },
    { method: 'GET', path: '/owner/alerts', json: ok(OWNER_ALERTS) },
    { method: 'GET', path: '/owner/activity', json: OWNER_ACTIVITY },
    { method: 'GET', path: '/owner/education', json: ok(OWNER_EDUCATION) },

    /* r350 B1: the staff dashboards (teacher / admin / quality) — same
     * corpus-gap closure as the owner block, same shapes as the source
     * hooks. All enveloped (their hooks unwrap). */
    { method: 'GET', path: '/teacher/dashboard', json: ok(TEACHER_DASHBOARD) },
    { method: 'GET', path: '/teacher/me/offerings', json: ok(TEACHER_OFFERINGS) },
    { method: 'GET', path: '/admin/stats', json: ok(ADMIN_STATS) },
    { method: 'GET', path: '/admin/faculties', json: ok(ADMIN_FACULTIES) },
    { method: 'GET', path: '/admin/reports', json: ok(ADMIN_REPORTS) },
    { method: 'GET', path: '/quality/overview', json: ok(QUALITY_OVERVIEW) },
    { method: 'GET', path: '/quality/engagement', json: ok(QUALITY_ENGAGEMENT) },
    { method: 'GET', path: '/quality/alerts', json: ok(QUALITY_ALERTS) },

    /* r350 B1 — the last four gaps the sweep measured: the student
     * dashboard's mastery + grades arms, the teacher's at-risk
     * shortcuts, and the admin dashboard's catalog + graded counter.
     * Paginated bodies ride RAW ({data,meta}), like /owner/activity.
     * SCOPE NOTE (review D3): these two match ANY query string and
     * serve the dashboard-shaped page — journey specs that page/filter
     * beyond this shape must install their own stateful overrides
     * (installStatefulApi), exactly like any other single-shape seat. */
    { method: 'GET', path: '/me/gaps', json: ok(ME_GAPS) },
    { method: 'GET', path: '/me/results', json: ok(ME_RESULTS) },
    { method: 'GET', path: '/teacher/risks', json: ok(TEACHER_RISKS) },
    { method: 'GET', path: '/admin/courses', json: ADMIN_COURSES_PAGE },
    { method: 'GET', path: '/admin/papers', json: ADMIN_PAPERS_GRADED_PAGE },

    /* ═══ r351 A2 (Q0) — the authenticated-route corpus closure ═══
     * Every endpoint the route-audit sweep measured as a loud 501 on
     * a non-AI authenticated surface. Shapes transcribed from the
     * consuming hooks (the table: docs/redesign/r351/authenticated/
     * BASELINE.md). Paginated bodies ride RAW ({data,meta}) exactly
     * like /owner/activity; enveloped ones ride ok(). */
    // permissions + identity
    /* r360 F3 — /me/permissions moved to the dynamic block below: the
     * static table hardcoded the STUDENT answer for EVERY session, so
     * capability-gated honest walls (teacher exams' EXAMS_AUTHOR) fired
     * on pages the seeded role actually holds. Role-honest now. */
    // community / social
    { method: 'GET', path: '/announcements/feed', json: ok(ANNOUNCEMENT_FEED) },
    { method: 'GET', path: '/competitions', json: ok(COMPETITION_ROWS) },
    { method: 'GET', path: '/events', json: ok(CAMPUS_EVENT_ROWS) },
    { method: 'GET', path: '/posts', json: ok(SOCIAL_POSTS) },
    { method: 'GET', path: '/messages', json: MESSAGES_PAGE },
    { method: 'GET', path: '/invites', json: ok(INVITE_ROWS) },
    // student learning surfaces
    { method: 'GET', path: '/live/sessions', json: ok(LIVE_SESSION_ROWS) },
    { method: 'GET', path: '/labs', json: ok(VIRTUAL_LABS) },
    { method: 'GET', path: '/ar-experiences', json: ok(AR_EXPERIENCES) },
    { method: 'GET', path: '/me/lab-sessions', json: ok(MY_LAB_STATS) },
    { method: 'GET', path: '/me/matrix', json: ok(ME_MATRIX) },
    { method: 'GET', path: '/me/skills', json: ok(USER_SKILLS) },
    { method: 'GET', path: '/me/research', json: ok(MY_RESEARCH) },
    { method: 'GET', path: '/me/materials', json: ok(STUDENT_MATERIALS) },
    { method: 'GET', path: '/me/loans', json: ok(MY_LOANS) },
    { method: 'GET', path: '/library/books', json: { data: LIBRARY_BOOKS, meta: { page: 1, limit: 24, total: LIBRARY_BOOKS.length, totalPages: 1 } } },
    { method: 'GET', path: '/research/published', json: ok(LIBRARY_RESEARCH) },
    { method: 'GET', path: '/mooc', json: ok(MOOC_COURSES) },
    { method: 'GET', path: '/jobs', json: JOBS_PAYLOAD },
    // training / gamification
    { method: 'GET', path: '/training/me', json: ok(TRAINING_ME_SUMMARY) },
    { method: 'GET', path: '/training/me/badges', json: ok(TRAINING_BADGES) },
    { method: 'GET', path: '/training/me/certificates', json: ok(TRAINING_CERTIFICATES) },
    { method: 'GET', path: '/training/leaderboard', json: ok(TRAINING_LEADERBOARD) },
    { method: 'GET', path: '/leaderboard', json: ok(XP_LEADERBOARD) },
    { method: 'GET', path: '/me/achievements', json: ok(USER_ACHIEVEMENTS) },
    // teacher surfaces
    { method: 'GET', path: '/teacher/me/assignments', json: ok(TEACHER_ASSIGNMENTS) },
    { method: 'GET', path: '/teacher/me/pending-submissions', json: ok(PENDING_SUBMISSIONS) },
    { method: 'GET', path: '/teacher/me/materials', json: ok(TEACHER_MATERIALS) },
    { method: 'GET', path: '/me/teacher-profile', json: ok(TEACHER_FULL_PROFILE) },
    { method: 'GET', path: '/teacher/offerings/:offeringId/students', json: ok(OFFERING_STUDENTS) },
    { method: 'GET', path: '/teacher/offerings/:offeringId/analytics', json: ok(OFFERING_ANALYTICS) },
    { method: 'GET', path: '/offerings/:offeringId/grades', json: ok(OFFERING_GRADES) },
    { method: 'GET', path: '/research/queue', json: ok(RESEARCH_QUEUE) },
    // exams (moderation + authoring detail + the r360 F5 authoring list)
    { method: 'GET', path: '/exams/moderation-queue', json: ok(MODERATION_QUEUE) },
    { method: 'GET', path: '/exams/templates', json: ok(EXAM_TEMPLATE_ROWS) },
    { method: 'GET', path: '/question-bank', json: ok(QUESTION_BANK_ROWS) },
    { method: 'GET', path: '/question-bank/categories', json: ok(QUESTION_CATEGORY_ROWS) },
    { method: 'GET', path: '/exams/templates/tpl_e2e_quiz4', json: ok(MODERATION_TEMPLATES.tpl_e2e_quiz4) },
    { method: 'GET', path: '/exams/templates/tpl_e2e_final_net', json: ok(MODERATION_TEMPLATES.tpl_e2e_final_net) },
    { method: 'GET', path: '/exams/templates/:templateId/attempts', json: ok(TEMPLATE_ATTEMPTS) },
    { method: 'GET', path: '/research/:paperId/annotations', json: ok(PAPER_ANNOTATIONS) },
    // admin / registrar
    { method: 'GET', path: '/admin/users', json: ADMIN_USERS_PAGE },
    { method: 'GET', path: '/admin/students', json: ADMIN_STUDENTS_PAGE },
    { method: 'GET', path: '/admin/digital', json: ok(DIGITAL_METRICS) },
    // quality
    { method: 'GET', path: '/quality/courses', json: QUALITY_COURSES },
    { method: 'GET', path: '/quality/professors', json: QUALITY_PROFESSORS },
    { method: 'GET', path: '/quality/curriculum', json: ok(QUALITY_CURRICULUM) },
    // owner
    { method: 'GET', path: '/owner/institutions', json: ok(OWNER_INSTITUTIONS) },
    { method: 'GET', path: '/owner/users', json: OWNER_USERS_PAGE },
    { method: 'GET', path: '/owner/feature-flags', json: ok(OWNER_FEATURE_FLAGS) },
    { method: 'GET', path: '/owner/settings', json: ok(OWNER_SETTINGS) },
    { method: 'GET', path: '/owner/system', json: ok(OWNER_SYSTEM) },
    { method: 'GET', path: '/owner/ai-metrics', json: ok(OWNER_AI_METRICS) },
    { method: 'GET', path: '/owner/governance', json: ok(OWNER_GOVERNANCE) },
    { method: 'GET', path: '/owner/login-analytics', json: ok(OWNER_LOGIN_ANALYTICS) },
    // feedback inbox (r323 B3.6)
    { method: 'GET', path: '/feedback', json: FEEDBACK_PAGE },
    { method: 'GET', path: '/client-errors', json: CLIENT_ERRORS_PAGE },
    // POST write-loops the shell surfaces fire (accepted, stateless)
    { method: 'POST', path: '/feedback', json: ok({ id: 'fbk_e2e_new', ok: true }) },
    { method: 'POST', path: '/client-errors', status: 201, json: ok({ ok: true }) },
    // the document viewer's file stream — a real (tiny) PDF for
    // /files/papers/* and /files/materials/*
    { method: 'GET', path: '/files/papers/:filename', pdf: true },
    { method: 'GET', path: '/files/materials/:filename', pdf: true },

    // ── Institutional & Catalogs (R352/R355) ─────────────────────
    { method: 'GET', path: '/colleges/leaderboard', json: ok(COLLEGES_LEADERBOARD) },
    { method: 'GET', path: '/colleges/leaderboard', json: ok(COLLEGES_LEADERBOARD) },
    { method: 'GET', path: '/institutions', json: ok(PUBLIC_INSTITUTIONS_FIXTURE) },
    { method: 'GET', path: '/status', json: ok(SYSTEM_STATUS_FIXTURE) },
    { method: 'GET', path: '/catalog/institution-types', json: ok(INSTITUTION_TYPES_CATALOG) },
    { method: 'GET', path: '/catalog/regulatory-authorities', json: ok(REGULATORY_AUTHORITIES_CATALOG) },
    { method: 'GET', path: '/catalog/credential-types', json: ok(CREDENTIAL_TYPES_CATALOG) },
    { method: 'GET', path: '/catalog/position-templates', json: ok(POSITION_TEMPLATES_CATALOG) },
    { method: 'GET', path: '/catalog/accreditation-criteria-sets', json: ok(CRITERIA_SETS_CATALOG) },
    { method: 'GET', path: '/institutions/me/profile', json: ok(MY_INSTITUTION_PROFILE) },
    { method: 'GET', path: '/me/capabilities', json: ok(MY_INSTITUTION_CAPABILITIES) },
    { method: 'GET', path: '/institutional/org-units', json: {
      data: INSTITUTION_ORG_TREE, meta: { page: 1, limit: 1, total: INSTITUTION_ORG_TREE.length, totalPages: 1 },
    } },
    { method: 'GET', path: '/institution/org-units/tree', json: ok(INSTITUTION_ORG_TREE) },
    { method: 'GET', path: '/institutional/people', json: INSTITUTION_PEOPLE_PAGE },
    { method: 'GET', path: '/institutional/appointments', json: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } } },
    { method: 'GET', path: '/institution/positions', json: INSTITUTION_POSITIONS_PAGE },
    { method: 'GET', path: '/governance/councils', json: INSTITUTION_COUNCILS_PAGE },
    { method: 'GET', path: '/institution/programs', json: INSTITUTION_PROGRAMS_PAGE },
    { method: 'GET', path: '/institution/training', json: INSTITUTION_TRAINING_PAGE },
    { method: 'GET', path: '/institution/learners', json: INSTITUTION_LEARNERS_PAGE },
    { method: 'GET', path: '/institution/accreditation', json: INSTITUTION_ACCREDITATION_PAGE },
    { method: 'GET', path: '/compliance/licenses', json: INSTITUTION_LICENSES_PAGE },
    { method: 'GET', path: '/institution/facilities', json: INSTITUTION_FACILITIES_PAGE },
    { method: 'GET', path: '/institution/research-projects', json: INSTITUTION_RESEARCH_PAGE },
    /* ── r360 F4 — the settings register's own corpus (prefs GET +
     * resend POST; the PUT is per-journey stateful, exactly like the
     * other mutating journeys). */
    { method: 'GET', path: '/me/notification-preferences', json: ok(NOTIFICATION_PREFERENCES) },
    /* r360 F4 — the audit browser's read (the scan's ADMIN/QUALITY/OWNER
     * sessions hold AUDIT_BROWSE by the role-honest permissions). */
    { method: 'GET', path: '/institutional/audit-logs', json: AUDIT_LOGS_PAGE },
    { method: 'POST', path: '/auth/resend-verification', json: ok(RESEND_VERIFICATION_SENT) },

    // ── AI fixtures (A3) ──────────────────────────────────────────
    /* ── AI fixtures (A3) ─────────────────────────────────────────
     * r351 AI-5: the assistant family's hermetic corpus (see
     * ai-fixtures.ts). One delimited block at the end of the route
     * table — nothing else in this file is A3's. */
    { method: 'GET', path: '/ai/config', json: ok(AI_SERVICE_CONFIG) },
    { method: 'GET', path: '/ai/conversations', json: ok(AI_CONVERSATIONS) },
    { method: 'GET', path: '/ai/conversations/conv_fix_1/messages', json: ok(AI_CONVERSATION_MESSAGES) },
    { method: 'GET', path: '/ai/status', json: ok(AI_SERVICE_STATUS_LOCAL) },
    { method: 'POST', path: '/ai/status/check', json: ok(AI_CONNECTION_CHECK_LOCAL) },
    /* POST /ai/chat answers 501 here ON PURPOSE: the chat transport is
     * per-journey stateful (the wire body and the SSE/JSON grammar are
     * what the journey pins) — the ai-assistant spec installs its own
     * stateful handler, exactly like every other mutating journey. */
    /* ── end AI fixtures (A3) ────────────────────────────────── */
  ];
}

/* ── login handler (dynamic) ───────────────────────────────────── */

/**
 * The login endpoint is answered from the request body so specs can
 * drive success / wrong-password / lockout through the real form.
 * A successful login flips `sessionRole` — subsequent /auth/me calls
 * answer for the logged-in user, exactly like the live backend.
 */
async function handleLogin(route: Route, session: { user: FixtureUser | null }): Promise<void> {
  // request.postDataJSON() is synchronous in Playwright and throws on
  // an empty/non-JSON body — it never returns a promise, so no .catch.
  const body = readPostJson(route);
  const email = body.email;
  const password = body.password;

  if (email === LOCKED_EMAIL) {
    await fulfillJson(route, 429, fail('TOO_MANY_REQUESTS', LOGIN_LOCKED_MESSAGE));
    return;
  }
  if (email === VALID_LOGIN.email && password === VALID_LOGIN.password) {
    session.user = STUDENT_USER;
    await fulfillJson(route, 200, ok({ user: STUDENT_USER, accessToken: 'e2e-token-student' }));
    return;
  }
  await fulfillJson(route, 401, fail('INVALID_CREDENTIALS', LOGIN_FAILED_MESSAGE));
}

/* ── matching ──────────────────────────────────────────────────── */

/** Synchronous request-body JSON reader (throws on empty/non-JSON). */
function readPostJson(route: Route): { email?: string; password?: string } {
  try {
    const data = route.request().postDataJSON();
    return data && typeof data === 'object' ? (data as { email?: string; password?: string }) : {};
  } catch {
    return {};
  }
}

function pathSegments(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/** Matches and captures `:param` segments; null = no match. */
function matchPath(pattern: string[], actual: string[]): Record<string, string> | null {
  if (pattern.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    const a = actual[i]!;
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

/* ── installer ─────────────────────────────────────────────────── */

export interface InstallMockApiOptions {
  /** Session user answering /auth/me before any login (null = guest). */
  sessionUser?: FixtureUser | null;
  selectedInstitution?: boolean;
  /** Per-test routes; matched BEFORE the standard table. */
  overrides?: MockRouteDef[];
  /** Replace the standard table entirely (default: standardRoutes()). */
  routes?: MockRouteDef[];
}

/**
 * Installs the mock transport on a BrowserContext (all pages) or a
 * single Page. Returns the mutable session (post-login role flips).
 */
export async function installMockApi(
  target: BrowserContext | Page,
  options: InstallMockApiOptions = {},
): Promise<void> {
  const session = { user: options.sessionUser ?? null };
  const overrideRoutes = options.overrides ?? [];
  const baseRoutes = options.routes ?? standardRoutes();
  // /auth/me is dynamic: it must answer for the session user (seeded
  // OR just-logged-in), so it never comes from the static tables.
  const staticRoutes = [...overrideRoutes, ...baseRoutes].filter(
    (r) => !(r.method === 'GET' && r.path === '/auth/me'),
  );

  await target.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());

    // Only paths under /api/v1 are ours; anything else /api-ish still
    // falls through to the 501 below (loud, never silent).
    const apiMatch = url.pathname.match(/^\/api(?:\/v1)?(\/.*)$/);
    const apiPath = apiMatch ? apiMatch[1]! : url.pathname;
    const segments = pathSegments(apiPath);

    // Dynamic auth endpoints.
    if (method === 'POST' && url.pathname.endsWith('/auth/login')) {
      await handleLogin(route, session);
      return;
    }
    if (method === 'GET' && url.pathname.endsWith('/auth/me')) {
      if (session.user) {
        await fulfillJson(route, 200, ok({ ...meProfile(session.user), ...(options.selectedInstitution ? institutionContext(session.user) : {}) }));
      } else {
        await fulfillJson(route, 401, fail('UNAUTHENTICATED', 'جلسة غير صالحة'));
      }
      return;
    }
    /* r360 F3 — role-honest permissions: the answer follows the LIVE
     * session (seeded or just-logged-in), exactly like /auth/me. The
     * honest walls (teacher exams' EXAMS_AUTHOR band) then render only
     * for roles that truly lack the grant. */
    if (method === 'GET' && (apiPath === '/me/permissions' || url.pathname.endsWith('/me/permissions'))) {
      const role = (session.user?.role ?? 'STUDENT') as Parameters<typeof myPermissions>[0];
      await fulfillJson(route, 200, ok(myPermissions(role)));
      return;
    }
    if (method === 'POST' && url.pathname.endsWith('/auth/refresh')) {
      // A refresh only fires after a non-auth 401 — none of the mocks
      // produce one, but answer honestly if something asks.
      await fulfillJson(route, 401, fail('SESSION_EXPIRED', 'انتهت صلاحية الجلسة'));
      return;
    }

    // Lecture media: the shared test clip (see LECTURE_MP4).
    if (method === 'GET' && segments[0] === 'media') {
      await route.fulfill({ status: 200, contentType: 'video/mp4', body: LECTURE_MP4 });
      return;
    }

    // Static tables (overrides first).
    for (const def of staticRoutes) {
      if (def.method.toUpperCase() !== method) continue;
      const params = matchPath(pathSegments(def.path), segments);
      if (params === null) continue;
      let queryOk = true;
      for (const [key, value] of Object.entries(def.query ?? {})) {
        if (url.searchParams.get(key) !== String(value)) {
          queryOk = false;
          break;
        }
      }
      if (!queryOk) continue;
      /* r351 A2: the document viewer's file stream — real (tiny) PDF
       * bytes instead of JSON. */
      if (def.pdf) {
        await route.fulfill({
          status: def.status ?? 200,
          contentType: 'application/pdf',
          body: TINY_PDF,
        });
        return;
      }
      await fulfillJson(route, def.status ?? 200, def.json ?? ok(null));
      return;
    }

    // Loud 501: a missing fixture must never read as a silent success.
    console.error(
      `[mock-transport] no fixture for ${method} ${url.pathname}${url.search} — answering 501`,
    );
    await fulfillJson(
      route,
      501,
      fail('MOCK_NOT_IMPLEMENTED', `mock transport has no fixture for ${method} ${url.pathname}`),
    );
  });
}

/* ── stateful routes (r165h) ───────────────────────────────────── */

/**
 * A page-level mock route whose handler owns MUTABLE state — the write
 * loops the journey suite grew to pin (grade a submission → it leaves
 * the queue; borrow a book → a loan row appears; approve a template →
 * it leaves the moderation queue) need reads that REFLECT earlier
 * writes, which the static tables cannot express. A handler may also
 * serve a purely static payload — specs with 2+ extra routes ride THIS
 * installer instead of `apiOverrides` (see the tuple warning on the
 * e2e fixture's apiOverrides option).
 *
 * Registered on the PAGE after the context transport, so a matching
 * request hits this handler first (Playwright consults routes in
 * reverse registration order); a method mismatch falls back to the
 * context transport so every other /api/ call keeps its fixture. The
 * handler also sees the request body — specs pin not just the rendered
 * result but the exact wire payload the journey produced.
 */
export interface StatefulMockRoute {
  /** HTTP method this route owns; anything else falls through. */
  method: string;
  /** page.route glob for the FULL request URL (query strings count). */
  pattern: string;
  /** Answers the request; free to read/mutate captured state. */
  fulfill: (ctx: { route: Route; url: URL }) => Promise<void> | void;
}

/** Install stateful routes on a page — call BEFORE page.goto. */
export async function installStatefulApi(
  page: Page,
  routes: StatefulMockRoute[],
): Promise<void> {
  for (const def of routes) {
    await page.route(def.pattern, async (route) => {
      if (route.request().method().toUpperCase() !== def.method.toUpperCase()) {
        // Not ours — the context-level mock transport answers next.
        await route.fallback();
        return;
      }
      await def.fulfill({ route, url: new URL(route.request().url()) });
    });
  }
}

/** Fulfill a stateful route with a RAW pre-enveloped body (e.g. a
 *  paginated payload whose meta rides as a SIBLING of data). */
export async function statefulJson(route: Route, status: number, body: unknown): Promise<void> {
  await fulfillJson(route, status, body);
}

/** Fulfill a stateful route with the success envelope ({ data }). */
export async function statefulOk(route: Route, data: unknown): Promise<void> {
  await statefulJson(route, 200, ok(data));
}

/** Fulfill a stateful route with an error envelope (any status). */
export async function statefulFail(
  route: Route,
  status: number,
  code: string,
  message: string,
): Promise<void> {
  await statefulJson(route, status, fail(code, message));
}

/* ── auth-state bootstrapping (the real store substrate) ────────── */

/**
 * localStorage payload exactly as zustand's persist middleware writes
 * it for `ula-auth` (stores/auth.store.ts — safeSessionStorage
 * JSON.stringify's { state, version }). Seeding this BEFORE any app
 * script boots the app fully signed-in, reload-style.
 */
function institutionContext(user: FixtureUser) {
  const { id, name, nameEn, slug } = MY_INSTITUTION_PROFILE.institution;
  return {
    currentInstitution: { id, name, nameEn, slug },
    membershipRole: user.role,
    memberships: [{ institutionId: id, name, nameEn, slug, role: user.role, isActive: true }],
  };
}
export function authStorageJson(user: FixtureUser, token: string, selectedInstitution = false): string {
  return JSON.stringify({ state: { user, accessToken: token, ...(selectedInstitution ? institutionContext(user) : {}) }, version: selectedInstitution ? 1 : 0 });
}

/** localStorage payload for `ulara-theme` (theme.store.ts v2). */
export function themeStorageJson(mode: 'light' | 'dark'): string {
  return JSON.stringify({ state: { mode, modeUpdatedAt: 0 }, version: 2 });
}

/**
 * Seeds the auth store (and optionally a theme) via init script —
 * runs before any app module on every navigation in the context.
 * ONE-SHOT: a seed only writes when its key is ABSENT, so a reload
 * AFTER an in-test mutation (theme toggle, login) keeps what the app
 * itself persisted — an unconditional re-seed on every load would
 * erase it. A null user seeds only the theme (guest + persisted theme).
 */
export async function seedSession(
  target: BrowserContext | Page,
  user: FixtureUser | null,
  opts: { selectedInstitution?: boolean; token?: string; theme?: 'light' | 'dark' } = {},
): Promise<void> {
  const authJson = user ? authStorageJson(user, opts.token ?? 'e2e-token-student', opts.selectedInstitution) : null;
  const themeJson = opts.theme ? themeStorageJson(opts.theme) : null;
  await target.addInitScript(
    ([auth, theme]) => {
      if (auth) {
        try {
          if (localStorage.getItem('ula-auth') === null) {
            localStorage.setItem('ula-auth', auth);
          }
        } catch { /* storage unavailable — app falls back to guest */ }
      }
      if (theme) {
        try {
          if (localStorage.getItem('ulara-theme') === null) {
            localStorage.setItem('ulara-theme', theme);
          }
        } catch { /* same probe-guard story as the auth store */ }
      }
    },
    [authJson, themeJson] as const,
  );
}

export { STUDENT_USER, TEACHER_USER };
