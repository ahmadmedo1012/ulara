/**
 * api-fixtures — the payload corpus for the hermetic E2E suite
 * (r164-k / Agent K).
 *
 * Every object here mirrors the REAL wire contract the frontend
 * consumes:
 *   - envelope: `{ data: T }` on success, `{ error: { code, message } }`
 *     on failure (frontend/src/lib/api.ts → unwrap() reads
 *     `res.data.data`; backend lib/errors.ts authors the Arabic
 *     messages shown verbatim by authErrorView — D17-3);
 *   - shapes: copied from the consuming hooks
 *     (src/hooks/resources/{student,learning,exams,notifications}.ts +
 *     src/hooks/useAuth.ts) — field-for-field, no invented fields.
 *
 * Time discipline (no flaky timers):
 *   - All timestamps derive from FIXED_NOW, and the E2E test fixture
 *     freezes the page clock at FIXED_NOW (page.clock.setFixedTime) with
 *     timezoneId 'UTC'. timeAgoAr / formatDue / examWindowState read
 *     Date.now() — frozen — so relative strings («منذ ساعتين»,
 *     «بعد 3 أيام», 'open') are deterministic. useGreeting reads
 *     new Date().getHours() → 10 UTC → «صباح الخير», also frozen.
 *
 * The same corpus serves the DB-less surface-inventory capture
 * (tests/audit, AUDIT_API_MOCK=1) — one fixture source, two harnesses.
 */

import type { AppRole } from '../../../src/stores/auth.store';
// R320 §C — the documented TEST password comes from the single
// source of truth. NOTE: Playwright's TS loader cannot follow the
// repo-root shared/testAccounts.ts RE-EXPORT chain (it transpiles the
// shim to CJS and named exports vanish — verified empirically), so
// Playwright-consumed fixtures import the PHYSICAL table module
// directly; vite/vitest consumers use the @shared alias.
import { TEST_PASSWORD } from '../../../../backend/src/modules/auth/test-accounts.data';

/* ── frozen clock ──────────────────────────────────────────────── */

/** The instant every fixture timestamp is relative to (10:00 UTC). */
export const FIXED_NOW_ISO = '2026-03-15T10:00:00.000Z';
export const FIXED_NOW = Date.parse(FIXED_NOW_ISO);

/** ISO string `hours` from the frozen now (negative = past). */
export function iso(hoursFromNow: number): string {
  return new Date(FIXED_NOW + hoursFromNow * 3_600_000).toISOString();
}

/** Match-any-greeting regex — the four shipped Arabic greetings.
 * r166a: the 00:00–06:00 branch is «ليلة سعيدة» (was «سهرة سعيدة» —
 * a soirée, the wrong register for 2am). */
export const GREETING_RE = /(صباح الخير|مساء النور|مساء الخير|ليلة سعيدة)/;

/* ── users & sessions ──────────────────────────────────────────── */

export interface FixtureUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  avatarColor: string | null;
  avatarInitials: string | null;
  scopeFacultyId: string | null;
}

export const STUDENT_USER: FixtureUser = {
  id: 'usr_e2e_student',
  email: 'student@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'الزاوي',
  role: 'STUDENT',
  avatarColor: '#3b82f6',
  avatarInitials: 'أز',
  scopeFacultyId: null,
};

export const TEACHER_USER: FixtureUser = {
  id: 'usr_e2e_teacher',
  email: 'teacher@zu.edu.ly',
  firstName: 'ليلى',
  lastName: 'الفيتوري',
  role: 'TEACHER',
  avatarColor: '#8b5cf6',
  avatarInitials: 'لف',
  scopeFacultyId: null,
};

/**
 * The three staff roles exist ONLY for the DB-less surface sweep
 * (AUDIT_API_MOCK=1): the audit harness seeds one context per role so
 * guarded routes render inside the app. No journey spec uses them —
 * their pages have no fixture payloads and would 501 into honest
 * error/empty states (which is exactly what the sweep records).
 */
export const ADMIN_USER: FixtureUser = {
  id: 'usr_e2e_admin',
  email: 'admin@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'القرضابي',
  role: 'ADMIN',
  avatarColor: '#059669',
  avatarInitials: 'سق',
  scopeFacultyId: null,
};

export const QUALITY_USER: FixtureUser = {
  id: 'usr_e2e_quality',
  email: 'quality@zu.edu.ly',
  firstName: 'عائشة',
  lastName: 'الباروني',
  role: 'QUALITY',
  avatarColor: '#d97706',
  avatarInitials: 'عب',
  scopeFacultyId: null,
};

export const OWNER_USER: FixtureUser = {
  id: 'usr_e2e_owner',
  email: 'owner@zu.edu.ly',
  firstName: 'المدير',
  lastName: 'الأعلى',
  role: 'OWNER',
  avatarColor: '#dc2626',
  avatarInitials: 'مأ',
  scopeFacultyId: null,
};

/** One seeded user per guarded role (audit sweep, AUDIT_API_MOCK=1). */
export const ROLE_USERS: Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER', FixtureUser> = {
  STUDENT: STUDENT_USER,
  TEACHER: TEACHER_USER,
  ADMIN: ADMIN_USER,
  QUALITY: QUALITY_USER,
  OWNER: OWNER_USER,
};

/** The canonical TEST password (R320 §C) — imported from the shared
 * test-account table (repo-root shared/testAccounts.ts) so this
 * hermetic corpus can never drift from the documented value. A repo
 * fixture, not a secret. */
export const DEMO_PASSWORD = TEST_PASSWORD;

/** Credentials the mock transport accepts for a successful login. */
export const VALID_LOGIN = {
  email: STUDENT_USER.email,
  password: DEMO_PASSWORD,
} as const;

/** Lockout account: login answers 429 TOO_MANY_REQUESTS (A13 P2-1). */
export const LOCKED_EMAIL = 'locked@zu.edu.ly';

/** Wrong-password login the mock answers with 401 INVALID_CREDENTIALS. */
export const WRONG_LOGIN = { email: STUDENT_USER.email, password: 'wrong-password' } as const;

/** Error messages exactly as the backend authors them (lib/errors.ts). */
export const LOGIN_FAILED_MESSAGE = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
export const LOGIN_LOCKED_MESSAGE = 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة.';

/** GET /auth/me — MeProfileResponse (hooks/useAuth.ts useMe). */
export function meProfile(user: FixtureUser): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarInitials: user.avatarInitials,
    scopeFaculty: null,
    // 'SYSTEM' → useThemeProfileSync Case 3: the local choice stays
    // authoritative; no profile pull can flip the theme mid-test.
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: iso(-24 * 90),
    onboardingCompletedAt: iso(-24 * 30),
    firedMilestones: [],
    studentProfile: user.role === 'STUDENT' ? {
      universityId: '2023-11045',
      year: 3,
      facultyId: 'fac_e2e_eng',
      departmentId: 'dep_e2e_cs',
      faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' },
      department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
    } : null,
    teacherProfile: null,
  };
}

/** GET /me/profile — MyProfile (hooks/resources/student.ts). */
export const MY_PROFILE = {
  id: STUDENT_USER.id,
  email: STUDENT_USER.email,
  firstName: STUDENT_USER.firstName,
  lastName: STUDENT_USER.lastName,
  role: 'STUDENT' as AppRole,
  avatarColor: STUDENT_USER.avatarColor,
  avatarInitials: STUDENT_USER.avatarInitials,
  emailVerifiedAt: iso(-24 * 200),
  createdAt: iso(-24 * 700),
  student: {
    universityId: '2023-11045',
    year: 3,
    gpa: 3.42,
    totalXp: 1240,
    level: 7,
    faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة', nameEn: null },
    department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', nameEn: null },
  },
  teacher: null,
};

/* ── shared ids ────────────────────────────────────────────────── */

export const OFFERING_ID = 'offr_e2e_algorithms';
export const LECTURE_ID = 'lec_e2e_greedy';

/* ── student dashboard: GET /me/dashboard ──────────────────────── */

export const STUDENT_DASHBOARD = {
  profile: {
    year: 3,
    gpa: 3.42,
    totalXp: 1240,
    level: 7,
    facultyName: 'كلية الهندسة',
    departmentName: 'قسم علوم الحاسوب',
  },
  kpi: {
    courseCount: 4,
    attendancePct: 87,
    pendingAssignmentsCount: 2,
    totalXp: 1240,
    rank: 12,
    cohortSize: 180,
  },
  term: {
    code: '2026S',
    startsAt: iso(-24 * 42),
    endsAt: iso(24 * 70),
    progressPct: 45,
  },
  progress: {
    avgEnrollmentProgressPct: 58,
  },
  agenda: {
    classes: [
      {
        id: 'cls_e2e_1',
        offeringId: OFFERING_ID,
        courseName: 'مقدمة في الخوارزميات',
        courseCode: 'CS-201',
        startTime: '09:00',
        endTime: '10:30',
        room: 'قاعة A2',
        when: 'today' as const,
      },
      {
        id: 'cls_e2e_2',
        offeringId: 'offr_e2e_databases',
        courseName: 'قواعد البيانات المتقدمة',
        courseCode: 'CS-310',
        startTime: '11:00',
        endTime: '12:30',
        room: 'قاعة B1',
        when: 'tomorrow' as const,
      },
    ],
    assignments: [
      {
        id: 'asg_e2e_1',
        offeringId: OFFERING_ID,
        title: 'واجب الأسبوع الثالث',
        type: 'HOMEWORK' as const,
        dueAt: iso(24 * 3 + 0.5),
        courseName: 'مقدمة في الخوارزميات',
        courseCode: 'CS-201',
      },
    ],
    live: [],
  },
};

/* ── continue-learning: GET /me/resume ─────────────────────────── */

export const RESUME = {
  mode: 'continue' as const,
  progressPct: 62,
  watchedSec: 446,
  lecture: {
    id: LECTURE_ID,
    title: 'الخوارزميات الجشعة',
    durationSec: 720,
    ordinal: 2,
    course: {
      id: 'crs_e2e_algorithms',
      name: 'مقدمة في الخوارزميات',
      code: 'CS-201',
      themeColor: '#7c3aed',
    },
    offeringId: OFFERING_ID,
  },
};

/* ── enrollments: GET /enrollments/me ──────────────────────────── */

export const ENROLLMENTS = [
  {
    id: 'enr_e2e_1',
    progressPct: 62,
    offering: {
      id: OFFERING_ID,
      room: 'قاعة A2',
      course: {
        id: 'crs_e2e_algorithms',
        code: 'CS-201',
        name: 'مقدمة في الخوارزميات',
        iconEmoji: '🧮',
        themeColor: '#7c3aed',
        credits: 3,
        department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      },
      teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
      schedule: [
        { id: 'sch_e2e_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: 'قاعة A2' },
      ],
    },
  },
  {
    id: 'enr_e2e_2',
    progressPct: 100,
    offering: {
      id: 'offr_e2e_databases',
      room: 'قاعة B1',
      course: {
        id: 'crs_e2e_databases',
        code: 'CS-310',
        name: 'قواعد البيانات المتقدمة',
        iconEmoji: '🗄️',
        themeColor: '#0ea5e9',
        credits: 3,
        department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      },
      teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
      schedule: [
        { id: 'sch_e2e_2', dayOfWeek: 2, startTime: '11:00', endTime: '12:30', room: 'قاعة B1' },
      ],
    },
  },
];

/* ── lectures ──────────────────────────────────────────────────── */

const LECTURES = [
  {
    id: 'lec_e2e_bigO',
    offeringId: OFFERING_ID,
    title: 'تحليل التعقيد الزمني',
    description: 'رمز O الكبير وأسوأ الحالات.',
    ordinal: 1,
    durationSec: 660,
    videoUrl: '/api/v1/media/lecture-bigo.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 20),
    _count: { chapters: 2, checkpoints: 0 },
    watchEvents: [{ watchedSec: 660, totalSec: 660, completed: true }],
  },
  {
    id: LECTURE_ID,
    offeringId: OFFERING_ID,
    title: 'الخوارزميات الجشعة',
    description: 'الاختيار الجشع والإثبات الصحيح.',
    ordinal: 2,
    durationSec: 720,
    videoUrl: '/api/v1/media/lecture-greedy.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 13),
    _count: { chapters: 2, checkpoints: 1 },
    watchEvents: [{ watchedSec: 446, totalSec: 720, completed: false }],
  },
];

/** GET /offerings/:id/lectures — Lecture[]. */
export const OFFERING_LECTURES = LECTURES;

/**
 * GET /offerings/offr_e2e_databases/lectures — the second enrollment's
 * offering (CoursesPage counts lectures per card): one completed
 * lecture, coherent with its progressPct: 100.
 */
export const DB_OFFERING_LECTURES = [
  {
    id: 'lec_e2e_sql',
    offeringId: 'offr_e2e_databases',
    title: 'استعلامات SQL المتقدمة',
    description: 'JOINs والفهارس.',
    ordinal: 1,
    durationSec: 690,
    videoUrl: '/api/v1/media/lecture-sql.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 30),
    _count: { chapters: 1, checkpoints: 0 },
    watchEvents: [{ watchedSec: 690, totalSec: 690, completed: true }],
  },
];

/** GET /offerings/:id/full — OfferingFull. */
export const OFFERING_FULL = {
  id: OFFERING_ID,
  term: '2026S',
  room: 'قاعة A2',
  course: {
    id: 'crs_e2e_algorithms',
    name: 'مقدمة في الخوارزميات',
    code: 'CS-201',
    iconEmoji: '🧮',
    themeColor: '#7c3aed',
    description: 'المقرّر التأسيسي لتحليل وتصميم الخوارزميات.',
    credits: 3,
    department: {
      id: 'dep_e2e_cs',
      name: 'قسم علوم الحاسوب',
      faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' },
    },
  },
  teacher: {
    id: TEACHER_USER.id,
    firstName: 'ليلى',
    lastName: 'الفيتوري',
    avatarInitials: 'لف',
    avatarColor: '#8b5cf6',
  },
  schedule: [
    { id: 'sch_e2e_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: 'قاعة A2' },
  ],
  materials: [
    {
      id: 'mat_e2e_1',
      name: 'مذكّرات الأسبوع الثالث.pdf',
      type: 'PDF',
      url: '/api/v1/files/mat_e2e_1.pdf',
      sizeBytes: '1048576',
      createdAt: iso(-24 * 6),
    },
  ],
  assignments: [
    {
      id: 'asg_e2e_1',
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK',
      dueAt: iso(24 * 3 + 0.5),
      weight: 10,
      maxScore: 20,
    },
  ],
  lectures: LECTURES,
  _count: { enrollments: 24 },
};

/** GET /lectures/:id — LectureDetail. */
export const LECTURE_DETAIL = {
  ...LECTURES[1],
  chapters: [
    { id: 'chp_e2e_1', title: 'مقدمة الخيار الجشع', startSec: 0, endSec: 240, ordinal: 1, conceptId: null, concept: null },
    { id: 'chp_e2e_2', title: 'أمثلة وتطبيقات', startSec: 240, endSec: 720, ordinal: 2, conceptId: null, concept: null },
  ],
  checkpoints: [
    {
      id: 'ckp_e2e_1',
      triggerSec: 300,
      question: 'متى يضمن الخيار الجشع الحل الأمثل؟',
      options: ['عندما تحقق المشكلة خاصية الاختيار الجشع', 'دائماً', 'عندما تكون البيانات مرتبة', 'لا يضمنها أبداً'],
      conceptId: null,
      answers: [],
    },
  ],
  offering: {
    id: OFFERING_ID,
    course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed' },
    teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
  },
};

/* ── online exams: GET /exams/me — MyExam[] ────────────────────── */

export const MY_EXAMS = [
  {
    id: 'exm_e2e_quiz3',
    title: 'اختبار قصير — الوحدة الثالثة',
    kind: 'QUIZ' as const,
    durationMin: 15,
    questionCount: 8,
    passingScore: 60,
    openAt: iso(-24 * 2),
    closeAt: iso(24 * 5),
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    facultyName: 'كلية الهندسة',
    myAttempt: null,
  },
  {
    id: 'exm_e2e_midterm',
    title: 'اختبار نصفي — الخوارزميات',
    kind: 'MIDTERM' as const,
    durationMin: 90,
    questionCount: 24,
    passingScore: 50,
    openAt: iso(-24 * 10),
    closeAt: iso(-24 * 9),
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    facultyName: 'كلية الهندسة',
    myAttempt: {
      id: 'att_e2e_midterm',
      status: 'GRADED',
      score: 82,
      maxScore: 100,
      submittedAt: iso(-24 * 10 + 2),
    },
  },
];

/* ── notifications ─────────────────────────────────────────────── */

export const NOTIFICATIONS = [
  {
    id: 'ntf_e2e_1',
    type: 'ACADEMIC' as const,
    title: 'تم نشر درجة الواجب الثاني',
    body: 'حصلت على 18 من 20 في واجب مادة مقدمة في الخوارزميات.',
    readAt: null,
    createdAt: iso(-2),
  },
  {
    id: 'ntf_e2e_2',
    type: 'URGENT' as const,
    title: 'تنبيه: اقتراب موعد اختبار نصفي',
    body: 'يفتح باب الاختبار النصفي خلال يومين.',
    readAt: null,
    createdAt: iso(-26),
  },
  {
    id: 'ntf_e2e_3',
    type: 'SYSTEM' as const,
    title: 'تحديث المنصة',
    body: null,
    readAt: iso(-1),
    createdAt: iso(-50),
  },
];

/** Unread count riding the notifications envelope meta. */
export const UNREAD_COUNT = 2;

/* ── push devices (r359 §5.5 — the notification-settings register) ──
 * The REAL wire shape of GET /me/push-devices (push.routes.ts r326
 * M2.6): the mobile app registers Expo tokens; the settings sheet
 * lists them + owns the unregister verb. Two devices exercise both
 * the ANDROID and IOS platform render paths (WEB rides the enum). */
export const PUSH_DEVICES = [
  {
    id: 'dev_e2e_android',
    platform: 'ANDROID' as const,
    appVersion: '1.4.0',
    lastSeenAt: iso(-3),
    createdAt: iso(-480),
  },
  {
    id: 'dev_e2e_ios',
    platform: 'IOS' as const,
    appVersion: '1.3.2',
    lastSeenAt: iso(-30),
    createdAt: iso(-2400),
  },
];

/* ── faculties: GET /faculties — Faculty[] (register form) ─────── */

export const FACULTIES = [
  {
    id: 'fac_e2e_eng',
    name: 'كلية الهندسة',
    iconEmoji: '⚙️',
    city: 'افتراضي',
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      { id: 'dep_e2e_civil', name: 'قسم الهندسة المدنية' },
    ],
  },
  {
    id: 'fac_e2e_med',
    name: 'كلية الطب البشري',
    iconEmoji: '🩺',
    city: 'افتراضي',
    departments: [{ id: 'dep_e2e_gen', name: 'قسم العلوم الأساسية' }],
  },
];

/* ── global search: GET /search/global?q=… — SearchResults ─────── */

export const SEARCH_RESULTS = {
  courses: [
    {
      id: 'crs_e2e_algorithms',
      title: 'مقدمة في الخوارزميات',
      subtitle: 'CS-201 · كلية الهندسة',
      iconEmoji: '🧮',
      themeColor: '#7c3aed',
      href: `/student/courses/${OFFERING_ID}`,
    },
  ],
  lectures: [
    {
      id: LECTURE_ID,
      title: 'الخوارزميات الجشعة',
      subtitle: 'المحاضرة 2 · مقدمة في الخوارزميات',
      iconEmoji: '🎬',
      themeColor: null,
      href: `/student/lectures/${LECTURE_ID}`,
    },
  ],
  papers: [],
  tracks: [],
};

/* ══════════════════════════════════════════════════════════════════
   r165h — additive rows for the staff/library/checkpoint journeys.
   Everything above this banner is the r164-k corpus, untouched.
   ══════════════════════════════════════════════════════════════════ */

/* ── training catalog: GET /training/catalog ──────────────────── */

/**
 * The dashboard's resume-hero fallback arm (r164c) reads this on every
 * student dashboard visit. The corpus ships NO tracks — honest: RESUME
 * always rides a lecture here, so the training arm never renders and an
 * empty list is the truthful payload (also what closes the loud-501
 * gap the integrated tree had for this route).
 */
export const TRAINING_CATALOG: unknown[] = [];

/* ── teacher grading loop (r165h) ───────────────────────────────── */

/** GET /teacher/me/assignments — TeacherAssignmentRow[]. */
export const TEACHER_ASSIGNMENTS = [
  {
    id: 'asg_e2e_teacher_1',
    title: 'واجب الأسبوع الثالث',
    type: 'HOMEWORK' as const,
    dueAt: iso(24 * 2),
    weight: 10,
    maxScore: 20,
    course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' },
    submissions: 2,
    enrolled: 24,
  },
];

/** The graded-row response of POST /submissions/:id/grade. */
export function gradedSubmission(id: string, grade: number, feedback?: string): Record<string, unknown> {
  return {
    id,
    assignmentId: 'asg_e2e_teacher_1',
    studentId: STUDENT_USER.id,
    status: 'GRADED' as const,
    grade,
    feedback: feedback ?? null,
    textAnswer: null,
    fileUrl: null,
    submittedAt: iso(-2),
    gradedAt: iso(0),
  };
}

/**
 * GET /teacher/me/pending-submissions — PendingSubmissionRow[] (2 rows:
 * one on-time, one LATE so the queue renders the «متأخر» chip and the
 * grading modal's «تقييم التالي» has a live next target). The teacher
 * spec serves it through a STATEFUL route so a landed grade drops its
 * row — the static corpus cannot express that.
 */
export const PENDING_SUBMISSIONS = [
  {
    id: 'sub_e2e_1',
    submittedAt: iso(-2),
    status: 'SUBMITTED' as const,
    textAnswer: 'برهان البنية الفرعية المثلى مع مثال على جدول الأنشطة.',
    fileUrl: null,
    student: { firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9' },
    assignment: {
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK' as const,
      maxScore: 20,
      dueAt: iso(24 * 2),
      offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
    },
  },
  {
    id: 'sub_e2e_2',
    submittedAt: iso(-26),
    status: 'LATE' as const,
    textAnswer: 'حلٌّ جزئي: العملية صحيحة لكن دون إثبات الاكتفاء بالاختيار المحلّي.',
    fileUrl: null,
    student: { firstName: 'سالم', lastName: 'قدّور', avatarInitials: 'سق', avatarColor: '#059669' },
    assignment: {
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK' as const,
      maxScore: 20,
      dueAt: iso(24 * 2),
      offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
    },
  },
];

/* ── admin courses + delete-dependency 409 (r165h) ─────────────── */

/** GET /admin/courses?page=1&limit=20 — the enveloped, paginated roster. */
export const ADMIN_COURSES = {
  data: [
    {
      id: 'crs_e2e_algorithms',
      code: 'CS-201',
      name: 'مقدمة في الخوارزميات',
      credits: 3,
      themeColor: '#7c3aed',
      faculty: 'كلية الهندسة',
      facultyEmoji: '⚙️',
      department: 'قسم علوم الحاسوب',
      departmentId: 'dep_e2e_cs',
      offeringCount: 2,
      conceptCount: 14,
      totalEnrollments: 64,
      totalLectures: 12,
      totalMaterials: 5,
      recentOfferings: [
        { id: OFFERING_ID, term: '2026S', enrollments: 24, lectures: 6, teacher: 'د. ليلى الفيتوري' },
      ],
    },
    {
      id: 'crs_e2e_ethics',
      code: 'PHIL-101',
      name: 'مدخل إلى الأخلاق',
      credits: 2,
      themeColor: null,
      faculty: 'كلية الآداب',
      facultyEmoji: null,
      department: 'قسم الفلسفة',
      departmentId: 'dep_e2e_phil',
      offeringCount: 0,
      conceptCount: 0,
      totalEnrollments: 0,
      totalLectures: 0,
      totalMaterials: 0,
      recentOfferings: [],
    },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

/**
 * DELETE /courses/:id on a course with live teaching offerings — the
 * backend's verbatim Arabic 409 (courses.routes.ts AppError.conflict).
 */
export const COURSE_DELETE_CONFLICT = {
  error: {
    code: 'CONFLICT',
    message: 'لا يمكن حذف المقرر: ما زالت له شُعب تدريسية مسجّلة',
  },
};

/* ── quality exam moderation (r165h) ───────────────────────────── */

/** GET /exams/moderation-queue — ModerationQueueItem[]. */
export const MODERATION_QUEUE = [
  {
    id: 'tpl_e2e_quiz4',
    title: 'اختبار قصير — الوحدة الرابعة',
    kind: 'QUIZ' as const,
    durationMin: 20,
    createdAt: iso(-30),
    offering: { course: { name: 'مقدمة في الخوارزميات' } },
    author: { firstName: 'ليلى', lastName: 'الفيتوري' },
    _count: { questions: 2 },
  },
  {
    id: 'tpl_e2e_final_net',
    title: 'اختبار نهائي — الشبكات',
    kind: 'FINAL' as const,
    durationMin: 90,
    createdAt: iso(-70),
    offering: null,
    author: { firstName: 'منير', lastName: 'الزروق' },
    _count: { questions: 1 },
  },
];

/** GET /exams/templates/tpl_e2e_quiz4 — ExamTemplateDetail (2 questions). */
export const MODERATION_TEMPLATE_QUIZ = {
  id: 'tpl_e2e_quiz4',
  title: 'اختبار قصير — الوحدة الرابعة',
  description: null,
  kind: 'QUIZ' as const,
  status: 'PENDING_REVIEW' as const,
  durationMin: 20,
  passingScore: 60,
  randomized: true,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: OFFERING_ID,
  facultyId: null,
  authorId: TEACHER_USER.id,
  createdAt: iso(-30),
  offering: { id: OFFERING_ID, teacherId: TEACHER_USER.id, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  faculty: null,
  author: { firstName: 'ليلى', lastName: 'الفيتوري' },
  moderatedBy: null,
  questions: [
    {
      id: 'tq_e2e_1',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'qst_e2e_1',
        type: 'MCQ' as const,
        prompt: 'ما التعقيد الزمني للبحث الثنائي في أسوأ الحالات؟',
        choices: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 0,
        difficulty: 'EASY' as const,
        points: 2,
        isApproved: true,
        moderationNote: null,
        tags: ['تحليل'],
        category: { title: 'تحليل التعقيد' },
      },
    },
    {
      id: 'tq_e2e_2',
      order: 2,
      pointsOverride: 3,
      question: {
        id: 'qst_e2e_2',
        type: 'SHORT' as const,
        prompt: 'عرّف خاصية البنية الفرعية المثلى مع مثال.',
        choices: null,
        correctAnswer: 'كل حلٍّ أمثل يحتوي حلولاً مثلى لمسائله الفرعية — مثل أقصر مسار في Graph.',
        difficulty: 'MEDIUM' as const,
        points: 2,
        isApproved: false,
        moderationNote: 'الصياغة تحتاج مثالاً أدقّ.',
        tags: [],
        category: null,
      },
    },
  ],
  _count: { attempts: 0 },
};

/** GET /exams/templates/tpl_e2e_final_net — ExamTemplateDetail (1 question). */
export const MODERATION_TEMPLATE_FINAL = {
  id: 'tpl_e2e_final_net',
  title: 'اختبار نهائي — الشبكات',
  description: 'نطاق الوحدات الخمس الأولى.',
  kind: 'FINAL' as const,
  status: 'PENDING_REVIEW' as const,
  durationMin: 90,
  passingScore: 50,
  randomized: false,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: null,
  facultyId: null,
  authorId: 'usr_e2e_munir',
  createdAt: iso(-70),
  offering: null,
  faculty: { name: 'كلية الهندسة' },
  author: { firstName: 'منير', lastName: 'الزروق' },
  moderatedBy: null,
  questions: [
    {
      id: 'tq_e2e_3',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'qst_e2e_3',
        type: 'TRUE_FALSE' as const,
        prompt: 'بروتوكول TCP يضمن تسليم الحزم بترتيب إرسالها.',
        choices: ['صح', 'خطأ'],
        correctAnswer: 0,
        difficulty: 'EASY' as const,
        points: 1,
        isApproved: true,
        moderationNote: null,
        tags: [],
        category: { title: 'أساسيات الشبكات' },
      },
    },
  ],
  _count: { attempts: 0 },
};

/** The templates the moderation preview serves, keyed by id. */
export const MODERATION_TEMPLATES: Record<string, unknown> = {
  tpl_e2e_quiz4: MODERATION_TEMPLATE_QUIZ,
  tpl_e2e_final_net: MODERATION_TEMPLATE_FINAL,
};

/* ── library borrow/return loop (r165h) ────────────────────────── */

/** GET /library/books — Book[] (one single-copy book so availability
 *  flips visibly on borrow/return; one multi-copy book). */
export const LIBRARY_BOOKS = [
  {
    id: 'bok_e2e_c',
    title: 'البرمجة بلغة C',
    author: 'د. عبد الرحمن الشريف',
    category: 'prog',
    iconEmoji: null,
    themeColor: '#7c3aed',
    rating: '4.6',
    totalCopies: 1,
    availableCopies: 1,
  },
  {
    id: 'bok_e2e_networks',
    title: 'شبكات الحاسوب: النظرية والتطبيق',
    author: 'د. هدى بن عامر',
    category: 'net',
    iconEmoji: null,
    themeColor: '#0ea5e9',
    rating: '4.2',
    totalCopies: 3,
    availableCopies: 3,
  },
];

/** GET /research/published — one published student paper. */
export const LIBRARY_RESEARCH = [
  {
    id: 'ppr_e2e_1',
    title: 'تحليل أداء الخوارزميات الجشعة في الجدولة',
    abstract: 'دراسة مقارنة لزمن التنفيذ على بيانات مرتّبة وعشوائية.',
    fileUrl: null,
    status: 'PUBLISHED' as const,
    plagiarismPct: 3,
    aiContentPct: 2,
    grade: 18,
    feedback: 'بحث متقن.',
    uploadedAt: iso(-24 * 40),
    scannedAt: iso(-24 * 39),
    gradedAt: iso(-24 * 30),
    publishedAt: iso(-24 * 28),
    student: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarInitials: 'أز', avatarColor: '#3b82f6' },
    reviewer: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  },
];

/** A fresh loan row as POST /library/loans answers it (no `book` on
 *  the wire — the page refetches GET /me/loans after invalidation). */
export function loanRow(bookId: string, status: 'ACTIVE' | 'RETURNED', borrowedHoursAgo: number): Record<string, unknown> {
  return {
    id: `loan_e2e_${bookId}`,
    bookId,
    status,
    borrowedAt: iso(-borrowedHoursAgo),
    dueAt: iso(24 * 14 - borrowedHoursAgo),
    returnedAt: status === 'RETURNED' ? iso(0) : null,
  };
}

/* ── checkpoint lecture (r165h) ────────────────────────────────── */

export const CHECKPOINT_LECTURE_ID = 'lec_e2e_interact';

/**
 * GET /lectures/lec_e2e_interact — a lecture whose single checkpoint
 * triggers at second 0: the player's checkpoint effect (currentSec ≥
 * triggerSec, evaluated the moment the payload lands) opens the quiz
 * deterministically without playback — the 1-second test clip can never
 * reach a later trigger. watchEvents are EMPTY (nothing completed, no
 * resume-seek) so the modal is the page's first meaningful event.
 */
export const CHECKPOINT_LECTURE = {
  id: CHECKPOINT_LECTURE_ID,
  offeringId: OFFERING_ID,
  title: 'تمارين تفاعلية على الجشع',
  description: 'أسئلة توقّف أثناء المشاهدة ترسّخ خاصية الاختيار الجشع.',
  ordinal: 3,
  durationSec: 720,
  videoUrl: '/api/v1/media/lecture-interact.mp4',
  posterUrl: null,
  createdAt: iso(-24 * 7),
  _count: { chapters: 2, checkpoints: 1 },
  watchEvents: [],
  chapters: [
    { id: 'chp_e2e_i1', title: 'مراجعة الخاصية', startSec: 0, endSec: 240, ordinal: 1, conceptId: null, concept: null },
    { id: 'chp_e2e_i2', title: 'تمارين محلولة', startSec: 240, endSec: 720, ordinal: 2, conceptId: null, concept: null },
  ],
  checkpoints: [
    {
      id: 'ckp_e2e_i1',
      triggerSec: 0,
      question: 'أيّ شرط يضمن أن الاختيار المحلّي الأمثل يقود إلى حلٍّ عامٍّ أمثل؟',
      options: [
        'خاصية الاختيار الجشع والبنية الفرعية المثلى معًا',
        'ترتيب المدخلات تصاعديًا',
        'صغر حجم المسألة',
        'لا يوجد شرط — يعمل دائمًا',
      ],
      conceptId: null,
      answers: [],
    },
  ],
  offering: {
    id: OFFERING_ID,
    course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed' },
    teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
  },
};

/** The lectures list including the checkpoint lecture (siblings/nav). */
export const OFFERING_LECTURES_WITH_CHECKPOINT = [
  ...OFFERING_LECTURES,
  {
    id: CHECKPOINT_LECTURE_ID,
    offeringId: OFFERING_ID,
    title: 'تمارين تفاعلية على الجشع',
    description: 'أسئلة توقّف أثناء المشاهدة ترسّخ خاصية الاختيار الجشع.',
    ordinal: 3,
    durationSec: 720,
    videoUrl: '/api/v1/media/lecture-interact.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 7),
    _count: { chapters: 2, checkpoints: 1 },
    watchEvents: [],
  },
];


/* ── OWNER: the platform dashboard's five feeds (r350 B1) ────────
 * The owner dashboard was audit-only in this corpus (no journey spec
 * rides OWNER), so role-shots hit loud 501s on /owner/* — logged,
 * not hidden, then closed with the shapes hooks/useOwner.ts declares.
 * Same FIXED_NOW clock as every other corpus timestamp. */

export const OWNER_STATS = {
  totalUsers: 1284,
  students: 1042,
  teachers: 137,
  admins: 41,
  quality: 17,
  owners: 2,
  totalCourses: 342,
  totalOfferings: 486,
  totalEnrollments: 5231,
  recentAuditLogs: 87,
};

export const OWNER_REALTIME = {
  activeSessions: 96,
  aiRequestsPerMin: 34,
  liveBroadcasts: 2,
  activeExams: 5,
};

export const OWNER_ALERTS = [
  {
    id: 'alr_e2e_queue',
    severity: 'warning',
    category: 'system',
    title: 'طابور البريد متأخّر',
    message: 'زمن الانتظار في طابور إشعارات البريد تجاوز خمس دقائق مرتين خلال الساعة الأخيرة.',
    metadata: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: iso(-0.05),
  },
  {
    id: 'alr_e2e_storage',
    severity: 'info',
    category: 'content',
    title: 'سعة تخزين المحاضرات',
    message: 'استهلاك تخزين الوسائط بلغ 71٪ من الحصة الحالية.',
    metadata: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: iso(-9),
  },
];

export const OWNER_ACTIVITY = {
  data: [
    { id: 'aud_e2e_1', action: 'USER_ROLE_CHANGED', resourceType: 'user', resourceId: 'usr_e2e_9', userId: 'usr_e2e_owner', metadata: { from: 'TEACHER', to: 'ADMIN' }, createdAt: iso(-11 / 60), user: { firstName: 'أمين', lastName: 'المنصّة', email: OWNER_USER.email } },
    { id: 'aud_e2e_2', action: 'FEATURE_FLAG_TOGGLED', resourceType: 'feature_flag', resourceId: 'flag_e2e_2', userId: 'usr_e2e_owner', metadata: { enabled: true }, createdAt: iso(-2), user: { firstName: 'أمين', lastName: 'المنصّة', email: OWNER_USER.email } },
    { id: 'aud_e2e_3', action: 'EXAM_PUBLISHED', resourceType: 'exam', resourceId: 'exam_e2e_4', userId: 'usr_e2e_teacher', metadata: null, createdAt: iso(-5), user: { firstName: 'سلمى', lastName: 'الهوني', email: TEACHER_USER.email } },
    { id: 'aud_e2e_4', action: 'COURSE_ARCHIVED', resourceType: 'course', resourceId: 'crs_e2e_old', userId: 'usr_e2e_admin', metadata: null, createdAt: iso(-26), user: { firstName: 'خالد', lastName: 'الدرسي', email: ADMIN_USER.email } },
    { id: 'aud_e2e_5', action: 'QUALITY_REVIEW_APPROVED', resourceType: 'course_review', resourceId: 'rev_e2e_7', userId: 'usr_e2e_quality', metadata: null, createdAt: iso(-30), user: { firstName: 'نورا', lastName: 'العابد', email: QUALITY_USER.email } },
    { id: 'aud_e2e_6', action: 'LOGIN_BACKOFF_CLEARED', resourceType: 'auth', resourceId: 'usr_e2e_9', userId: 'usr_e2e_admin', metadata: null, createdAt: iso(-2 * 24), user: { firstName: 'خالد', lastName: 'الدرسي', email: ADMIN_USER.email } },
    { id: 'aud_e2e_7', action: 'SETTINGS_UPDATED', resourceType: 'platform_setting', resourceId: 'set_e2e_smtp', userId: 'usr_e2e_owner', metadata: { key: 'smtp.host' }, createdAt: iso(-3 * 24), user: { firstName: 'أمين', lastName: 'المنصّة', email: OWNER_USER.email } },
    { id: 'aud_e2e_8', action: 'ENROLLMENT_WAVE_OPENED', resourceType: 'term', resourceId: 'term_e2e_2026s', userId: 'usr_e2e_admin', metadata: null, createdAt: iso(-4 * 24), user: { firstName: 'خالد', lastName: 'الدرسي', email: ADMIN_USER.email } },
  ],
  meta: { page: 1, limit: 8, total: 87, totalPages: 11 },
};

export const OWNER_EDUCATION = {
  totals: { totalCourses: 342, totalOfferings: 486, teachers: 137, avgEnrolment: 41 },
  byFaculty: [
    { name: 'كلية الهندسة', courseCount: 12 },
    { name: 'كلية العلوم', courseCount: 74 },
    { name: 'كلية الطب البشري', courseCount: 9 },
    { name: 'كلية الآداب', courseCount: 52 },
    { name: 'كلية الاقتصاد', courseCount: 52 },
  ],
  topCourses: [
    { code: 'CS-201', name: 'مقدمة في الخوارزميات', facultyName: 'كلية الهندسة', enrolled: 420 },
    { code: 'CS-101', name: 'أساسيات البرمجة', facultyName: 'كلية الهندسة', enrolled: 388 },
    { code: 'MED-110', name: 'التشريح العام', facultyName: 'كلية الطب البشري', enrolled: 312 },
    { code: 'SCI-205', name: 'الفيزياء العامة', facultyName: 'كلية العلوم', enrolled: 274 },
  ],
  workloadBuckets: { idle: 9, one: 31, two: 54, three: 29, fourPlus: 14 },
  attendanceTrend: [
    { month: 'يناير', attendancePct: 78, samples: 412 },
    { month: 'فبراير', attendancePct: 81, samples: 396 },
    { month: 'مارس', attendancePct: 76, samples: 184 },
  ],
};

/* ── TEACHER / ADMIN / QUALITY: the staff dashboards' feeds (r350 B1)
 * Same story as the owner block above: the corpus never covered the
 * staff dashboards (the journey specs ride student flows), so the
 * role-shots instrument hit loud 501s on /teacher/* /admin/*
 * /quality/*. Shapes = hooks/resources/teacher.ts, hooks/resources/
 * admin.ts, pages/quality/QualityPages.tsx. Numbers stay consistent
 * with OWNER_STATS (one platform, one truth). */

export const TEACHER_DASHBOARD = {
  kpi: { studentCount: 128, avgGradePct: 78.4, attendancePct: 83.2, needsReview: 6 },
  pendingGrading: [
    {
      assignmentId: 'asg_e2e_1',
      title: 'واجب الوحدة الثالثة — الأشجار الثنائية',
      type: 'HOMEWORK' as const,
      course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' },
      count: 9,
      oldestSubmittedAt: iso(-26),
      actionTo: '/teacher/assignments',
    },
    {
      assignmentId: 'asg_e2e_2',
      title: 'اختبار قصير — التعقيد الزمني',
      type: 'QUIZ' as const,
      course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' },
      count: 4,
      oldestSubmittedAt: iso(-9),
      actionTo: '/teacher/assignments',
    },
  ],
  trend: [
    { week: 'الأسبوع 1', avgGradePct: 74.2, attendancePct: 79.1 },
    { week: 'الأسبوع 2', avgGradePct: 75.8, attendancePct: 80.4 },
    { week: 'الأسبوع 3', avgGradePct: 77.1, attendancePct: 81.0 },
    { week: 'الأسبوع 4', avgGradePct: 76.4, attendancePct: 82.3 },
    { week: 'الأسبوع 5', avgGradePct: 78.0, attendancePct: 82.7 },
    { week: 'الأسبوع 6', avgGradePct: 78.4, attendancePct: 83.2 },
  ],
  feed: [
    { kind: 'submissions' as const, id: 'sub_e2e_1', author: { firstName: 'مراد', lastName: 'الفيتوري', avatarInitials: 'مف', avatarColor: '#0f766e' }, meta: 'CS-201 · الواجب 3', when: iso(-2), title: 'مراد الفيتوري سلّم «واجب الوحدة الثالثة»', actionTo: '/teacher/assignments', textAnswer: null, fileUrl: null },
    { kind: 'attendance' as const, id: 'att_e2e_1', author: null, meta: 'محاضرة اليوم 10:00', when: iso(-4), title: 'غياب محمود الشريف في المحاضرة الأخيرة', actionTo: '/teacher/students' },
    { kind: 'submissions' as const, id: 'sub_e2e_2', author: { firstName: 'أسماء', lastName: 'الورفلي', avatarInitials: 'أو', avatarColor: '#9a3412' }, meta: 'CS-201 · الاختبار القصير', when: iso(-6), title: 'أسماء الورفلي سلّمت «اختبار قصير» متأخرة', actionTo: '/teacher/assignments', late: true, textAnswer: 'الإجابة مرفقة كملف.', fileUrl: '/api/v1/media/lecture.mp4' },
    { kind: 'research' as const, id: 'res_e2e_1', author: { firstName: 'يوسف', lastName: 'الزاوي', avatarInitials: 'يز', avatarColor: '#6d28d9' }, meta: 'مقترح بحث', when: iso(-30), title: 'يوسف الزاوي قدّم مقترح «تحسين جدولة الفصول»', actionTo: '/teacher/research' },
  ],
};

export const TEACHER_OFFERINGS = [
  {
    id: 'offr_e2e_algorithms',
    term: '2026-ربيع',
    room: 'قاعة ب-204',
    capacity: 140,
    course: { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: '🧮', themeColor: '#7c3aed', credits: 3 },
    _count: { enrollments: 128, assignments: 6, lectures: 14, examTemplates: 2 },
    schedule: [
      { id: 'sch_e2e_1', dayOfWeek: 0, startTime: '10:00', endTime: '11:30', room: 'قاعة ب-204' },
      { id: 'sch_e2e_2', dayOfWeek: 2, startTime: '10:00', endTime: '11:30', room: 'قاعة ب-204' },
    ],
  },
  {
    id: 'offr_e2e_databases',
    term: '2026-ربيع',
    room: 'مختبر الحاسوب 2',
    capacity: 90,
    course: { id: 'crs_e2e_db', code: 'CS-310', name: 'قواعد البيانات', iconEmoji: '🗄️', themeColor: '#0f766e', credits: 3 },
    _count: { enrollments: 84, assignments: 4, lectures: 11, examTemplates: 1 },
    schedule: [{ id: 'sch_e2e_3', dayOfWeek: 1, startTime: '13:00', endTime: '14:30', room: 'مختبر الحاسوب 2' }],
  },
];

export const ADMIN_STATS = { totalStudents: 1042, totalTeachers: 137, totalCourses: 342, totalEnrollments: 5231 };

export const ADMIN_FACULTIES = [
  {
    id: 'fac_e2e_eng',
    name: 'كلية الهندسة',
    nameEn: 'Engineering',
    iconEmoji: '⚙️',
    city: 'طرابلس',
    departmentCount: 2,
    studentCount: 420,
    teacherCount: 28,
    courseCount: 12,
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', students: 260, teachers: 14, courses: 7 },
      { id: 'dep_e2e_civil', name: 'قسم الهندسة المدنية', students: 160, teachers: 14, courses: 5 },
    ],
  },
  {
    id: 'fac_e2e_med',
    name: 'كلية الطب البشري',
    nameEn: 'Medicine',
    iconEmoji: '🩺',
    city: 'طرابلس',
    departmentCount: 1,
    studentCount: 310,
    teacherCount: 19,
    courseCount: 9,
    departments: [{ id: 'dep_e2e_gen', name: 'قسم العلوم الأساسية', students: 310, teachers: 19, courses: 9 }],
  },
];

export const ADMIN_REPORTS = {
  headline: { totalPapers: 1846, publishedPapers: 1204, totalUsers: 1284, activeStudents: 964 },
  paperTrend: [
    { month: 'أكتوبر', submitted: 212, graded: 188, published: 154 },
    { month: 'نوفمبر', submitted: 264, graded: 231, published: 197 },
    { month: 'ديسمبر', submitted: 241, graded: 226, published: 203 },
    { month: 'يناير', submitted: 298, graded: 254, published: 221 },
    { month: 'فبراير', submitted: 312, graded: 268, published: 229 },
    { month: 'مارس', submitted: 187, graded: 132, published: 96 },
  ],
  topCourses: [
    { code: 'CS-201', name: 'مقدمة في الخوارزميات', enrollments: 420, lectures: 14 },
    { code: 'CS-101', name: 'أساسيات البرمجة', enrollments: 388, lectures: 16 },
    { code: 'MED-110', name: 'التشريح العام', enrollments: 312, lectures: 12 },
  ],
};

export const QUALITY_OVERVIEW = {
  users: { STUDENT: 1042, TEACHER: 137, ADMIN: 41, QUALITY: 17 },
  courses: 342,
  offerings: 486,
  lectures: 1904,
  attendance: { PRESENT: 4210, LATE: 512, ABSENT: 331, EXCUSED: 178 },
  papers: { UPLOADED: 96, SCANNING: 12, CHECKS_PASSED: 1204, CHECKS_FAILED: 38, GRADED: 418, PUBLISHED: 1204 },
};

export const QUALITY_ENGAGEMENT = {
  attendance: { presentRate: 79.7, lateRate: 9.7, absentRate: 6.3, total: 5231 },
  videos: { totalLectures: 1904, totalEvents: 38211, completionRate: 71.4, completedLectures: 1359 },
  enrollments: 5231,
  totalStudents: 1042,
  papersByStatus: { UPLOADED: 96, SCANNING: 12, CHECKS_PASSED: 1204, CHECKS_FAILED: 38, GRADED: 418, PUBLISHED: 1204 },
  weeklyActive: [612, 648, 655, 701, 738, 744, 790, 812, 856, 871, 902, 964],
  weeklyActiveEstimated: false,
};

export const QUALITY_ALERTS = {
  alerts: [
    { id: 'qal_e2e_1', severity: 'warning' as const, category: 'attendance' as const, title: 'انخفاض حضور قسم الهندسة المدنية', description: 'معدّل الحضور في قسم الهندسة المدنية نزل إلى 68٪ خلال أسبوعين.', occurredAt: iso(-5) },
    { id: 'qal_e2e_2', severity: 'critical' as const, category: 'plagiarism' as const, title: 'تشابه نصوص مرتفع في ورقة CS-310', description: 'فحص الانتحال رصد تشابهًا 61٪ بين ورقتين في قواعد البيانات.', occurredAt: iso(-11 / 60) },
    { id: 'qal_e2e_3', severity: 'info' as const, category: 'content' as const, title: 'محاضرات بلا ملخص مرفوع', description: 'أربع محاضرات في CS-201 بلا ملخص محاضرة بعد النشر.', occurredAt: iso(-26) },
    { id: 'qal_e2e_4', severity: 'warning' as const, category: 'content' as const, title: 'تأخر رفع أوراق التصحيح', description: 'أوراق اختبار «التعقيد الزمني» ما زالت بانتظار التصحيح منذ ٦ أيام.', occurredAt: iso(-6 * 24) },
  ],
  counts: { critical: 1, warning: 2, info: 1, total: 4 },
};

/* ── The last four corpus gaps the role-shots sweep measured ─────
 * /me/gaps + /me/results (student dashboard's mastery + grades arms),
 * /teacher/risks (the at-risk shortcuts), /admin/courses +
 * /admin/papers (the admin dashboard's catalog + graded counter).
 * Same law: shapes verbatim from the source hooks, honest values. */

export const ME_GAPS = [
  { conceptId: 'cpt_e2e_1', conceptName: 'البرمجة الديناميكية', courseId: 'crs_e2e_algorithms', courseName: 'مقدمة في الخوارزميات', courseColor: '#7c3aed', level: 1, recommendedLectureId: 'lec_e2e_greedy', recommendedLectureTitle: 'الخوارزميات الجشعة' },
  { conceptId: 'cpt_e2e_2', conceptName: 'التطبيع في قواعد البيانات', courseId: 'crs_e2e_db', courseName: 'قواعد البيانات', courseColor: '#0f766e', level: 2, recommendedLectureId: null, recommendedLectureTitle: null },
];

export const ME_RESULTS = {
  headline: {
    avgGradePct: 81.2,
    highest: { courseName: 'مقدمة في الخوارزميات', gradePct: 88 },
    lowest: { courseName: 'قواعد البيانات', gradePct: 74 },
    courseCount: 2,
  },
  courses: [
    {
      offeringId: 'offr_e2e_algorithms',
      term: '2026-ربيع',
      courseCode: 'CS-201',
      courseName: 'مقدمة في الخوارزميات',
      themeColor: '#7c3aed',
      gradePct: 88,
      breakdown: [
        { kind: 'HOMEWORK', score: 92, maxScore: 100, weight: 30, feedback: 'حلّ ممتاز — انتبه لتعقيد الحلول الفرعية.' },
        { kind: 'QUIZ', score: 84, maxScore: 100, weight: 20, feedback: null },
        { kind: 'EXAM', score: 86, maxScore: 100, weight: 50, feedback: null },
      ],
    },
    {
      offeringId: 'offr_e2e_databases',
      term: '2026-ربيع',
      courseCode: 'CS-310',
      courseName: 'قواعد البيانات',
      themeColor: '#0f766e',
      gradePct: 74,
      breakdown: [
        { kind: 'HOMEWORK', score: 78, maxScore: 100, weight: 30, feedback: 'الاستعلامات جيدة؛ راجع التطبيع.' },
        { kind: 'PROJECT', score: 70, maxScore: 100, weight: 30, feedback: null },
        { kind: 'EXAM', score: 74, maxScore: 100, weight: 40, feedback: null },
      ],
    },
  ],
  recentAssignments: [
    { id: 'asg_e2e_1', title: 'واجب الوحدة الثالثة — الأشجار الثنائية', type: 'HOMEWORK' as const, offeringId: 'offr_e2e_algorithms', gradePct: 92, gradedAt: iso(-30), grade: 92, maxScore: 100, feedback: 'حلّ ممتاز.', submittedAt: iso(-56) },
    { id: 'asg_e2e_2', title: 'اختبار قصير — التعقيد الزمني', type: 'QUIZ' as const, offeringId: 'offr_e2e_algorithms', gradePct: 84, gradedAt: iso(-9 * 24), grade: 84, maxScore: 100, feedback: null, submittedAt: iso(-9 * 24 - 2) },
  ],
  pendingSubmissions: [],
};

export const TEACHER_RISKS = [
  {
    offeringId: 'offr_e2e_algorithms',
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: '🧮',
    courseColor: '#7c3aed',
    studentId: 'usr_e2e_1',
    name: 'محمود الشريف',
    avatarInitials: 'مش',
    avatarColor: '#b91c1c',
    riskScore: 78,
    riskLevel: 'CRITICAL' as const,
    signals: ['غياب متكرر', 'درجات اختبارات منخفضة'],
    suggestion: 'خطة دعم أسبوعية + مراجعة الوحدتين الأولى والثانية',
  },
  {
    offeringId: 'offr_e2e_algorithms',
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: '🧮',
    courseColor: '#7c3aed',
    studentId: 'usr_e2e_2',
    name: 'ليلى بن عيسى',
    avatarInitials: 'لب',
    avatarColor: '#9a3412',
    riskScore: 52,
    riskLevel: 'AT_RISK' as const,
    signals: ['مشاهدة المحاضرات متقطعة'],
    suggestion: 'تذكير بمواعيد الحجز التعليمي',
  },
];

export const ADMIN_COURSES_PAGE = {
  data: [
    {
      id: 'crs_e2e_algorithms',
      code: 'CS-201',
      name: 'مقدمة في الخوارزميات',
      credits: 3,
      themeColor: '#7c3aed',
      faculty: 'كلية الهندسة',
      facultyEmoji: '⚙️',
      department: 'قسم علوم الحاسوب',
      departmentId: 'dep_e2e_cs',
      offeringCount: 3,
      conceptCount: 42,
      totalEnrollments: 420,
      totalLectures: 14,
      totalMaterials: 26,
      recentOfferings: [{ id: 'offr_e2e_algorithms', term: '2026-ربيع', enrollments: 128, lectures: 14, teacher: 'د. سلمى الهوني' }],
    },
    {
      id: 'crs_e2e_db',
      code: 'CS-310',
      name: 'قواعد البيانات',
      credits: 3,
      themeColor: '#0f766e',
      faculty: 'كلية الهندسة',
      facultyEmoji: '⚙️',
      department: 'قسم علوم الحاسوب',
      departmentId: 'dep_e2e_cs',
      offeringCount: 2,
      conceptCount: 31,
      totalEnrollments: 274,
      totalLectures: 11,
      totalMaterials: 18,
      recentOfferings: [{ id: 'offr_e2e_databases', term: '2026-ربيع', enrollments: 84, lectures: 11, teacher: 'د. سلمى الهوني' }],
    },
  ],
  meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

export const ADMIN_PAPERS_GRADED_PAGE = {
  data: [
    {
      id: 'pap_e2e_1',
      title: 'تحسين جدولة الفصول بالخوارزميات الجشعة',
      status: 'GRADED' as const,
      plagiarismPct: 6,
      aiContentPct: 2,
      uploadedAt: iso(-40),
      student: { id: 'usr_e2e_3', firstName: 'يوسف', lastName: 'الزاوي', avatarInitials: 'يز', avatarColor: '#6d28d9' },
      reviewer: { id: 'usr_e2e_teacher', firstName: 'سلمى', lastName: 'الهوني' },
      offering: { course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
    },
  ],
  meta: { page: 1, limit: 1, total: 418, totalPages: 418 },
};

/* ═══════════════════════════════════════════════════════════════════
   r351 A2 — the authenticated-route corpus closure (Q0).
   Every endpoint the route-audit sweep measured as a loud 501 on a
   non-AI authenticated surface, shaped field-for-field from the
   consuming hooks (the transcription table lives in
   docs/redesign/r351/authenticated/BASELINE.md). List endpoints carry
   1–3 realistic rows — enough for the surfaces to render real lists
   (and for word counts to be honest), never fabricating scale.
   ═══════════════════════════════════════════════════════════════════ */

/* ── permissions ────────────────────────────────────────────────── */

/** GET /me/permissions — MyPermissions (role-honest capability sets). */
export function myPermissions(role: AppRole): Record<string, unknown> {
  const BY_ROLE: Record<AppRole, string[]> = {
    STUDENT: ['EXAMS_TAKE', 'RESEARCH_PUBLISH'],
    TEACHER: ['RESEARCH_GRADE_OWN', 'EXAMS_AUTHOR', 'CURRICULUM_EDIT_OWN'],
    ADMIN: ['USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'ANNOUNCE_PLATFORM', 'COMPETITIONS_RUN', 'EVENTS_RUN'],
    QUALITY: ['QUALITY_VIEW', 'QUALITY_REPORT', 'EXAMS_MODERATE'],
    OWNER: ['USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'QUALITY_VIEW', 'EXAMS_MODERATE', 'ANNOUNCE_PLATFORM'],
  };
  return { role, capabilities: BY_ROLE[role], roleDefaults: BY_ROLE[role] };
}

/* ── community / social ─────────────────────────────────────────── */

/** GET /announcements/feed — AnnouncementRow[] (2 rows). */
export const ANNOUNCEMENT_FEED = [
  {
    id: 'ann_e2e_1',
    scope: 'PLATFORM' as const,
    scopeId: null,
    title: 'فتح باب التقديم لمنافسة الكلّيّات',
    body: 'التقديم متاح حتى نهاية الشهر عبر صفحة المسابقات.',
    pinned: true,
    publishedAt: iso(-5),
    iconEmoji: null,
    author: { firstName: 'سالم', lastName: 'القرضابي', avatarColor: null, avatarInitials: null, role: 'ADMIN' },
  },
  {
    id: 'ann_e2e_2',
    scope: 'FACULTY' as const,
    scopeId: 'fcl_e2e_1',
    title: 'ورشة عمل: مراجعة ما قبل الاختبارات',
    body: 'قاعة ٢، الطابق الأول.',
    pinned: false,
    publishedAt: iso(-30),
    iconEmoji: null,
    author: { firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: '#8b5cf6', avatarInitials: 'لف', role: 'TEACHER' },
  },
];

/** GET /competitions — CompetitionRow[] (2 rows). */
export const COMPETITION_ROWS = [
  {
    id: 'cmp_e2e_1',
    title: 'تحدي البرمجة التنافسية',
    description: 'ثلاث مسائل خلال ساعتين.',
    category: 'برمجة',
    prize: 'شهادة + نقاط خبرة',
    deadline: iso(24 * 6),
    status: 'OPEN' as const,
    iconEmoji: null,
    themeColor: '#f15534',
    organizer: { firstName: 'سالم', lastName: 'القرضابي', role: 'ADMIN' },
    _count: { entries: 12 },
  },
  {
    id: 'cmp_e2e_2',
    title: 'مسابقة أفضل بحث قصير',
    description: 'بحث من أربع صفحات في أي مقرّر.',
    category: 'بحث',
    prize: null,
    deadline: iso(-24 * 3),
    status: 'JUDGED' as const,
    iconEmoji: null,
    themeColor: null,
    organizer: { firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' },
    _count: { entries: 8 },
  },
];

/** GET /events — CampusEventRow[] (2 rows). */
export const CAMPUS_EVENT_ROWS = [
  {
    id: 'evt_e2e_1',
    title: 'لقاء الخريجين',
    description: 'سؤال وجواب حول سوق العمل.',
    location: 'قاعة المؤتمرات',
    startsAt: iso(48),
    endsAt: iso(51),
    capacity: 120,
    iconEmoji: null,
    themeColor: null,
    organizer: { firstName: 'سالم', lastName: 'القرضابي', role: 'ADMIN' },
    _count: { rsvps: 64 },
    myRsvp: null,
  },
  {
    id: 'evt_e2e_2',
    title: 'معمل مفتوح: قواعد البيانات',
    description: 'تدريب عملي.',
    location: 'المعمل ٣',
    startsAt: iso(-24),
    endsAt: iso(-22),
    capacity: 30,
    iconEmoji: null,
    themeColor: null,
    organizer: { firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' },
    _count: { rsvps: 28 },
    myRsvp: 'GOING' as const,
  },
];

/** GET /posts — Post[] (2 rows). */
export const SOCIAL_POSTS = [
  {
    id: 'pst_e2e_1',
    body: 'أنهيت مسار الخوارزميات الجشعة — المسألة الأخيرة كانت الأصعب.',
    hashtags: ['خوارزميات'],
    imageUrl: null,
    createdAt: iso(-3),
    author: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: '#3b82f6', avatarInitials: 'أز' },
    _count: { comments: 2, reactions: 5 },
    viewerReacted: false,
  },
  {
    id: 'pst_e2e_2',
    body: 'جلسة مراجعة مسائية غدًا في المكتبة.',
    hashtags: ['مراجعة'],
    imageUrl: null,
    createdAt: iso(-9),
    author: { id: 'usr_e2e_2', firstName: 'مروة', lastName: 'البراني', avatarColor: '#0ea5e9', avatarInitials: 'مر' },
    _count: { comments: 1, reactions: 3 },
    viewerReacted: true,
  },
];

/** GET /messages — the student/teacher inbox page (paginated + unread). */
export const MESSAGES_PAGE = {
  data: [
    {
      id: 'msg_e2e_1',
      body: 'تم تمديد مهلة الواجب الثالث يومًا واحدًا.',
      createdAt: iso(-2),
      fromUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: '#8b5cf6' },
      toUser: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: '#3b82f6' },
    },
    {
      id: 'msg_e2e_2',
      body: 'شكرًا — وصل الملف وسأراجعه اليوم.',
      createdAt: iso(-26),
      fromUser: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: '#3b82f6' },
      toUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: '#8b5cf6' },
    },
  ],
  meta: { total: 2, page: 1, limit: 30, totalPages: 1, unread: 1 },
};

/** GET /invites — InviteRow[] (1 row). */
export const INVITE_ROWS = [
  {
    id: 'inv_e2e_1',
    code: 'ALGO-2026-S',
    role: 'STUDENT' as const,
    offeringId: OFFERING_ID,
    departmentId: null,
    facultyId: 'fcl_e2e_1',
    expiresAt: iso(24 * 10),
    maxUses: 30,
    usedCount: 12,
    createdAt: iso(-24 * 5),
    offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
    department: null,
    faculty: { name: 'كلية الهندسة' },
  },
];

/* ── student learning surfaces ──────────────────────────────────── */

/** GET /live/sessions — LiveSessionRow[] (1 LIVE + 1 SCHEDULED). */
export const LIVE_SESSION_ROWS = [
  {
    id: 'liv_e2e_1',
    offeringId: OFFERING_ID,
    teacherId: TEACHER_USER.id,
    title: 'مراجعة الخوارزميات الجشعة',
    description: null,
    topic: 'مراجعة قبل الاختبار',
    scheduledAt: iso(-1),
    startedAt: iso(-0.5),
    endedAt: null,
    status: 'LIVE' as const,
    joinUrl: '/student/live',
    recordingUrl: null,
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: null, themeColor: '#7c3aed' } },
    teacher: { firstName: 'ليلى', lastName: 'الفيتوري', avatarInitials: 'لف', avatarColor: '#8b5cf6' },
  },
  {
    id: 'liv_e2e_2',
    offeringId: 'offr_e2e_databases',
    teacherId: TEACHER_USER.id,
    title: 'مقدمة في الاستعلامات',
    description: null,
    topic: null,
    scheduledAt: iso(24),
    startedAt: null,
    endedAt: null,
    status: 'SCHEDULED' as const,
    joinUrl: null,
    recordingUrl: null,
    offering: { id: 'offr_e2e_databases', course: { name: 'قواعد البيانات', code: 'CS-210', iconEmoji: null, themeColor: '#0ea5e9' } },
    teacher: { firstName: 'ليلى', lastName: 'الفيتوري', avatarInitials: 'لف', avatarColor: '#8b5cf6' },
  },
];

/** GET /labs — VirtualLab[] (2 rows). */
export const VIRTUAL_LABS = [
  { id: 'lab_e2e_1', name: 'معمل الخوارزميات المرئيّ', platform: 'web', category: 'خوارزميات', iconEmoji: null, totalExperiments: 6, themeColor: '#7c3aed' },
  { id: 'lab_e2e_2', name: 'معمل الشبكات المحاكى', platform: 'web', category: 'شبكات', iconEmoji: null, totalExperiments: 4, themeColor: '#0ea5e9' },
];

/** GET /ar-experiences — ArExperience[] (2 rows). */
export const AR_EXPERIENCES = [
  { id: 'arx_e2e_1', title: 'جولة معمل الدوائر', subject: 'إلكترونيات', type: 'VR' as const, iconEmoji: null, themeColor: null, description: 'تجول في المعمل وافحص المكوّنات.' },
  { id: 'arx_e2e_2', title: 'تشريح المحرّك الكهربائي', subject: 'آلات كهربائية', type: 'AR' as const, iconEmoji: null, themeColor: null, description: 'طبّق المكوّنات على النموذج الحقيقي.' },
];

/** GET /me/lab-sessions — MyLabStats. */
export const MY_LAB_STATS = {
  active: 1,
  completed: 2,
  total: 3,
  recent: [
    { id: 'lbs_e2e_1', experimentName: 'أقصر مسار — ديكسترا', progressPct: 60, score: null, startedAt: iso(-24), completedAt: null, lab: { id: 'lab_e2e_1', name: 'معمل الخوارزميات المرئيّ' } },
  ],
};

/** GET /me/matrix — MatrixCourse[] (1 course, 3 concepts). */
export const ME_MATRIX = [
  {
    courseId: 'crs_e2e_algorithms',
    courseCode: 'CS-201',
    courseName: 'مقدمة في الخوارزميات',
    themeColor: '#7c3aed',
    offeringId: OFFERING_ID,
    concepts: [
      { id: 'cpt_e2e_1', name: 'تحليل التعقيد', level: 3, attempts: 4 },
      { id: 'cpt_e2e_2', name: 'الخوارزميات الجشعة', level: 2, attempts: 3 },
      { id: 'cpt_e2e_3', name: 'البرمجة الديناميكية', level: 0, attempts: 1 },
    ],
  },
];

/** GET /me/skills — UserSkill[] (3 rows). */
export const USER_SKILLS = [
  { level: 3, progressPct: 72, skill: { id: 'skl_e2e_1', name: 'تحليل الخوارزميات', category: 'خوارزميات', icon: null } },
  { level: 2, progressPct: 45, skill: { id: 'skl_e2e_2', name: 'كتابة التقارير الفنية', category: 'تواصل', icon: null } },
  { level: 1, progressPct: 20, skill: { id: 'skl_e2e_3', name: 'استعلامات SQL', category: 'بيانات', icon: null } },
];

/** GET /me/research — ResearchPaper[] (2 rows). */
export const MY_RESEARCH = [
  {
    id: 'ppr_e2e_mine_1',
    title: 'مقارنة استراتيجيات التخزين المؤقت',
    abstract: 'قياس زمن الاستجابة مع ثلاث استراتيجيات.',
    fileUrl: null,
    status: 'GRADED' as const,
    plagiarismPct: 4,
    aiContentPct: 1,
    grade: 17,
    feedback: 'منهجية واضحة.',
    uploadedAt: iso(-24 * 12),
    scannedAt: iso(-24 * 11),
    gradedAt: iso(-24 * 8),
    publishedAt: null,
    student: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarInitials: 'أز', avatarColor: '#3b82f6' },
    reviewer: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  },
  {
    id: 'ppr_e2e_mine_2',
    title: 'أثر الفهرسة على أداء الاستعلام',
    abstract: null,
    fileUrl: null,
    status: 'UPLOADED' as const,
    plagiarismPct: null,
    aiContentPct: null,
    grade: null,
    feedback: null,
    uploadedAt: iso(-4),
    scannedAt: null,
    gradedAt: null,
    publishedAt: null,
    student: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarInitials: 'أز', avatarColor: '#3b82f6' },
    reviewer: null,
    offering: { id: 'offr_e2e_databases', course: { name: 'قواعد البيانات', code: 'CS-210' } },
  },
];

/** GET /me/materials — StudentMaterial[] (2 rows). */
export const STUDENT_MATERIALS = [
  { id: 'mat_e2e_1', name: 'شرح الخوارزميات الجشعة.pdf', type: 'PDF' as const, url: '/api/v1/files/materials/greedy-notes.pdf', sizeBytes: 812_544, createdAt: iso(-24 * 3), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
  { id: 'mat_e2e_2', name: 'تمارين الوحدة الرابعة.docx', type: 'DOC' as const, url: '/api/v1/files/materials/unit4-exercises.docx', sizeBytes: 41_984, createdAt: iso(-24), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
];

/** GET /me/loans — MyLoan[] (1 ACTIVE row). */
export const MY_LOANS = [
  {
    id: 'loan_e2e_1',
    bookId: 'bok_e2e_c',
    status: 'ACTIVE' as const,
    borrowedAt: iso(-24 * 6),
    dueAt: iso(24 * 8),
    returnedAt: null,
    book: { id: 'bok_e2e_c', title: 'البرمجة بلغة C', author: 'د. عبد الرحمن الشريف', category: 'prog' },
  },
];

/** GET /mooc — MoocCourse[] (2 rows). */
export const MOOC_COURSES = [
  { id: 'moc_e2e_1', title: 'الخوارزميات: التصميم والتحليل', organization: 'جامعة ستانفورد', iconEmoji: null, category: 'خوارزميات', durationHours: 28, level: 'متوسط', rating: '4.8', enrolled: 320, hasCertificate: true, jobReady: false, externalUrl: null },
  { id: 'moc_e2e_2', title: 'أساسيات علم البيانات', organization: 'منصة مفتوحة', iconEmoji: null, category: 'بيانات', durationHours: 40, level: 'مبتدئ', rating: '4.5', enrolled: 210, hasCertificate: true, jobReady: true, externalUrl: null },
];

/** GET /jobs — JobsPayload ({data, meta, appliedJobIds}). */
export const JOBS_PAYLOAD = {
  data: [
    { id: 'job_e2e_1', title: 'مطوّر واجهات — تدريب صيفي', company: 'شركة ليبيانا للتقنية', location: 'طرابلس', type: 'INTERNSHIP' as const, salary: null, category: 'تطوير ويب', iconEmoji: null, postedAt: iso(-24 * 2) },
    { id: 'job_e2e_2', title: 'محلّل بيانات', company: 'مكتب الإحصاء', location: 'بنغازي', type: 'FULL_TIME' as const, salary: 'حسب الخبرة', category: 'بيانات', iconEmoji: null, postedAt: iso(-24 * 6) },
  ],
  meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
  appliedJobIds: ['job_e2e_2'],
};

/* ── training / gamification ────────────────────────────────────── */

/** GET /training/me — TrainingMeSummary. */
export const TRAINING_ME_SUMMARY = {
  points: 1240,
  level: { level: 4, tier: 'GOLD' as const, toNext: 260, pctIntoLevel: 65 },
  badgeCount: 6,
  certificateCount: 1,
  tracksEnrolled: 1,
  tracksCompleted: 1,
  recentBadges: [
    { slug: 'first-track', title: 'أول مسار مكتمل', iconEmoji: null, rarity: 'COMMON' as const, earnedAt: iso(-24 * 9) },
  ],
};

/** GET /training/me/badges — UserBadgeRow[] (3 rows, 2 earned). */
export const TRAINING_BADGES = [
  { slug: 'first-track', title: 'أول مسار مكتمل', description: 'أكملت مسارًا تدريبيًا كاملًا.', iconEmoji: null, themeColor: null, rarity: 'COMMON' as const, earnedAt: iso(-24 * 9), isEarned: true },
  { slug: 'night-owl', title: 'المثابر', description: 'عشر دروس في أسبوع.', iconEmoji: null, themeColor: null, rarity: 'RARE' as const, earnedAt: iso(-24 * 4), isEarned: true },
  { slug: 'deep-diver', title: 'الغوّاص', description: 'أنجز كل تجارب المعمل.', iconEmoji: null, themeColor: null, rarity: 'EPIC' as const, earnedAt: null, isEarned: false },
];

/** GET /training/me/certificates — TrainingCertificate[] (1 row). */
export const TRAINING_CERTIFICATES = [
  { id: 'crt_e2e_1', title: 'أساسيات الخوارزميات', issuer: 'مركز التطوير', issuedAt: iso(-24 * 9), hours: 12, status: 'COMPLETED' as const, trackSlug: null, iconEmoji: null, themeColor: null },
];

/** GET /training/leaderboard — LeaderboardRow[] (3 rows). */
export const TRAINING_LEADERBOARD = [
  { rank: 1, userId: 'usr_e2e_2', name: 'مروة البراني', avatarColor: '#0ea5e9', avatarInitials: 'مر', points: 1810, level: { level: 5, tier: 'GOLD' as const, toNext: 190, pctIntoLevel: 81 } },
  { rank: 2, userId: 'usr_e2e_student', name: 'أحمد الزاوي', avatarColor: '#3b82f6', avatarInitials: 'أز', points: 1240, level: { level: 4, tier: 'GOLD' as const, toNext: 260, pctIntoLevel: 65 } },
  { rank: 3, userId: 'usr_e2e_3', name: 'يوسف الزاوي', avatarColor: '#6d28d9', avatarInitials: 'يز', points: 980, level: { level: 3, tier: 'SILVER' as const, toNext: 320, pctIntoLevel: 36 } },
];

/** GET /leaderboard — LeaderEntry[] (3 rows, the colleges XP board). */
export const XP_LEADERBOARD = [
  { id: 'usr_e2e_2', firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9', totalXp: 1810, level: 5 },
  { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarInitials: 'أز', avatarColor: '#3b82f6', totalXp: 1240, level: 4 },
  { id: 'usr_e2e_3', firstName: 'يوسف', lastName: 'الزاوي', avatarInitials: 'يز', avatarColor: '#6d28d9', totalXp: 980, level: 3 },
];

/** GET /me/achievements — UserAchievement[] (2 rows). */
export const USER_ACHIEVEMENTS = [
  { unlockedAt: iso(-24 * 9), achievement: { id: 'ach_e2e_1', name: 'أول مسار', description: 'أكملت مسارًا تدريبيًا', icon: null, xp: 50 } },
  { unlockedAt: iso(-24 * 2), achievement: { id: 'ach_e2e_2', name: 'سلسلة أسبوع', description: 'سبعة أيام متتالية', icon: null, xp: 30 } },
];

/* ── teacher surfaces ───────────────────────────────────────────── */

/** GET /teacher/me/materials — TeacherMaterial[] (2 rows). */
export const TEACHER_MATERIALS = [
  { id: 'tmat_e2e_1', name: 'محاضرة الجشع — الشرائح.pptx', type: 'PPT' as const, url: '/api/v1/files/materials/greedy-slides.pptx', sizeBytes: 1_468_006, downloads: 18, views: 40, createdAt: iso(-24 * 4), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
  { id: 'tmat_e2e_2', name: 'ورقة تمارين ٤.pdf', type: 'PDF' as const, url: '/api/v1/files/materials/sheet4.pdf', sizeBytes: 302_080, downloads: 12, views: 33, createdAt: iso(-24 * 2), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
];

/** GET /me/teacher-profile — TeacherFullProfile. */
export const TEACHER_FULL_PROFILE = {
  userId: TEACHER_USER.id,
  name: 'ليلى الفيتوري',
  firstName: 'ليلى',
  lastName: 'الفيتوري',
  email: TEACHER_USER.email,
  avatarColor: TEACHER_USER.avatarColor,
  avatarInitials: TEACHER_USER.avatarInitials,
  specialty: 'خوارزميات وهندسة برمجيات',
  rank: 'أستاذ مشارك',
  bio: null,
  degreeLevel: 'PHD' as const,
  yearsExperience: 12,
  certifications: [{ title: 'PMP', issuer: 'PMI', year: 2019 }],
  publications: [{ title: 'جدولة المهام في الأنظمة الموزّعة', venue: 'مجلة الهندسة', year: 2023, url: undefined }],
  awards: [],
  profileImageUrl: null,
  officeLocation: 'مبنى ٤ — مكتب 212',
  officeHours: 'الأحد والثلاثاء ١٠–١٢',
  websiteUrl: null,
  subjectKeywords: ['خوارزميات', 'هندسة برمجيات'],
  verifiedAt: iso(-24 * 200),
  department: 'علوم الحاسوب',
  faculty: 'كلية الهندسة',
  courses: [
    { offeringId: OFFERING_ID, code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: null, themeColor: '#7c3aed', credits: 3, enrolled: 24, term: 'ربيع 2026' },
  ],
  workload: { courseCount: 1, totalCredits: 3, totalEnrolled: 24 },
};

/** GET /teacher/offerings/:id/students — TeacherStudentRow[] (3 rows). */
export const OFFERING_STUDENTS = [
  { studentId: 'usr_e2e_student', name: 'أحمد الزاوي', universityId: '2026001', avatarInitials: 'أز', avatarColor: '#3b82f6', attendancePct: 92, absences: 1, lateCount: 1, avgGrade: 84, watchPct: 78, riskScore: 12, riskLevel: 'OK' as const, signals: [], suggestion: 'مستوى ثابت.' },
  { studentId: 'usr_e2e_2', name: 'مروة البراني', universityId: '2026002', avatarInitials: 'مر', avatarColor: '#0ea5e9', attendancePct: 74, absences: 4, lateCount: 2, avgGrade: 66, watchPct: 41, riskScore: 58, riskLevel: 'WATCH' as const, signals: ['غياب متكرر'], suggestion: 'تنبيه ودّي قبل الاختبار.' },
  { studentId: 'usr_e2e_3', name: 'يوسف الزاوي', universityId: '2026003', avatarInitials: 'يز', avatarColor: '#6d28d9', attendancePct: 48, absences: 9, lateCount: 4, avgGrade: 41, watchPct: 12, riskScore: 86, riskLevel: 'AT_RISK' as const, signals: ['غياب مرتفع', 'تدني الدرجات'], suggestion: 'خطة علاجية عاجلة.' },
];

/** GET /teacher/offerings/:id/analytics — OfferingAnalytics. */
export const OFFERING_ANALYTICS = {
  enrolled: 24,
  totalSessions: 12,
  overallAttendance: 81,
  avgGrade: 72,
  passRate: 78,
  assignmentCount: 4,
  examCount: 2,
};

/** GET /offerings/:id/grades — OfferingGradeWireRow[] (score is the
 *  prisma-Decimal wire string; the hook normalizes to number). */
export const OFFERING_GRADES = [
  { id: 'grd_e2e_1', offeringId: OFFERING_ID, studentId: 'usr_e2e_student', kind: 'MIDTERM' as const, score: '17', maxScore: 20, weight: 30, feedback: null, recordedAt: iso(-24 * 10), student: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي' } },
  { id: 'grd_e2e_2', offeringId: OFFERING_ID, studentId: 'usr_e2e_2', kind: 'MIDTERM' as const, score: '12', maxScore: 20, weight: 30, feedback: 'راجع الأشجار', recordedAt: iso(-24 * 10), student: { id: 'usr_e2e_2', firstName: 'مروة', lastName: 'البراني' } },
];

/** GET /research/queue — ResearchPaper[] (2 rows awaiting action). */
export const RESEARCH_QUEUE = [
  {
    id: 'ppr_e2e_q_1',
    title: 'تحسين جدولة الفصول بالخوارزميات الجشعة',
    abstract: 'مقارنة ثلاث استراتيجيات جدولة.',
    fileUrl: null,
    status: 'CHECKS_PASSED' as const,
    plagiarismPct: 6,
    aiContentPct: 2,
    grade: null,
    feedback: null,
    uploadedAt: iso(-24 * 3),
    scannedAt: iso(-24 * 2),
    gradedAt: null,
    publishedAt: null,
    student: { id: 'usr_e2e_3', firstName: 'يوسف', lastName: 'الزاوي', avatarInitials: 'يز', avatarColor: '#6d28d9', email: 'yusuf@zu.edu.ly' },
    reviewer: null,
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  },
  {
    id: 'ppr_e2e_q_2',
    title: 'قياس زمن الاستجابة في قواعد البيانات الموزّعة',
    abstract: null,
    fileUrl: null,
    status: 'SCANNING' as const,
    plagiarismPct: null,
    aiContentPct: null,
    grade: null,
    feedback: null,
    uploadedAt: iso(-6),
    scannedAt: null,
    gradedAt: null,
    publishedAt: null,
    student: { id: 'usr_e2e_2', firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9', email: 'marwa@zu.edu.ly' },
    reviewer: null,
    offering: { id: 'offr_e2e_databases', course: { name: 'قواعد البيانات', code: 'CS-210' } },
  },
];

/* ── admin / registrar ──────────────────────────────────────────── */

/** GET /admin/users — AdminUsersPage (paginated, 3 rows). */
export const ADMIN_USERS_PAGE = {
  data: [
    { id: 'usr_e2e_student', email: 'student@zu.edu.ly', firstName: 'أحمد', lastName: 'الزاوي', role: 'STUDENT' as const, avatarColor: '#3b82f6', avatarInitials: 'أز', isActive: true, createdAt: iso(-24 * 90) },
    { id: 'usr_e2e_teacher', email: 'teacher@zu.edu.ly', firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' as const, avatarColor: '#8b5cf6', avatarInitials: 'لف', isActive: true, createdAt: iso(-24 * 400) },
    { id: 'usr_e2e_9', email: 'former@zu.edu.ly', firstName: 'خالد', lastName: 'المبروك', role: 'STUDENT' as const, avatarColor: null, avatarInitials: 'خم', isActive: false, createdAt: iso(-24 * 600) },
  ],
  meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
};

/** GET /admin/students — AdminStudentsPage (paginated, 2 rows). */
export const ADMIN_STUDENTS_PAGE = {
  data: [
    { id: 'usr_e2e_student', email: 'student@zu.edu.ly', firstName: 'أحمد', lastName: 'الزاوي', isActive: true, avatarColor: '#3b82f6', avatarInitials: 'أز', createdAt: iso(-24 * 90), studentProfile: { universityId: '2026001', year: 2, gpa: '3.4', totalXp: 1240, level: 4, faculty: { id: 'fcl_e2e_1', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_1', name: 'علوم الحاسوب' } } },
    { id: 'usr_e2e_2', email: 'marwa@zu.edu.ly', firstName: 'مروة', lastName: 'البراني', isActive: true, avatarColor: '#0ea5e9', avatarInitials: 'مر', createdAt: iso(-24 * 120), studentProfile: { universityId: '2026002', year: 3, gpa: 2.9, totalXp: 1810, level: 5, faculty: { id: 'fcl_e2e_1', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_1', name: 'علوم الحاسوب' } } },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

/** GET /admin/digital — DigitalMetrics. */
export const DIGITAL_METRICS = {
  totalUsers: 1284,
  activeUsers: 812,
  adoptionPct: 63,
  onlineExams: 46,
  examAttempts: 1205,
  labSessions: 310,
  moocEnrollments: 190,
  researchPapers: 74,
  liveSessions: 28,
  materialsUploaded: 640,
};

/* ── quality ────────────────────────────────────────────────────── */

/** GET /quality/courses — QualityRosterEnvelope<QualityCourse>. */
export const QUALITY_COURSES = {
  data: [
    { id: 'offr_e2e_algorithms', term: 'ربيع 2026', course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed' }, teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { enrollments: 24, lectures: 12, materials: 9, assignments: 4 }, metrics: { attendanceRate: 81, completionRate: 74 } },
    { id: 'offr_e2e_databases', term: 'ربيع 2026', course: { id: 'crs_e2e_databases', name: 'قواعد البيانات', code: 'CS-210', themeColor: '#0ea5e9' }, teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { enrollments: 19, lectures: 10, materials: 7, assignments: 3 }, metrics: { attendanceRate: 69, completionRate: 58 } },
  ],
  meta: { total: 2 },
};

/** GET /quality/professors — QualityRosterEnvelope<ProfessorRow>. */
export const QUALITY_PROFESSORS = {
  data: [
    { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري', avatarInitials: 'لف', avatarColor: '#8b5cf6', rank: 'أستاذ مشارك', specialty: 'خوارزميات', faculty: 'كلية الهندسة', department: 'علوم الحاسوب', offerings: 2, totals: { enrollments: 43, materials: 16, lectures: 22, assignments: 7, attendance: 76 }, satisfaction: 88, satisfactionEstimated: false, responseHours: 6, responseHoursEstimated: false, compliance: 92 },
  ],
  meta: { total: 1 },
};

/** GET /quality/curriculum — FacultyTree[]. */
export const QUALITY_CURRICULUM = [
  {
    id: 'fcl_e2e_1',
    name: 'كلية الهندسة',
    iconEmoji: null,
    departments: [
      {
        id: 'dep_e2e_1',
        name: 'علوم الحاسوب',
        courses: [
          { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed', offerings: [{ id: OFFERING_ID, term: 'ربيع 2026', _count: { lectures: 12, materials: 9, assignments: 4, enrollments: 24 } }], _count: { offerings: 1, concepts: 14 } },
        ],
      },
    ],
  },
];

/* ── owner ──────────────────────────────────────────────────────── */

/** GET /owner/institutions — OwnerInstitution[] (1 row). */
export const OWNER_INSTITUTIONS = [
  {
    id: 'ins_e2e_1',
    name: 'مساحة عمل أُلارا التجريبية',
    nameEn: 'Ulara Demo Workspace',
    slug: 'ulara-demo',
    status: 'ACTIVE' as const,
    createdAt: iso(-24 * 365),
    updatedAt: iso(-24 * 30),
    activeMembershipCount: 5,
    facultyCount: 1,
    admins: [{ userId: ADMIN_USER.id, email: ADMIN_USER.email, firstName: 'سالم', lastName: 'القرضابي', membershipId: 'mbsh_e2e_1', isActive: true }],
  },
];

/** GET /owner/users — OwnerUsersPage (paginated, 3 rows). */
export const OWNER_USERS_PAGE = {
  data: [
    { id: 'usr_e2e_student', email: 'student@zu.edu.ly', firstName: 'أحمد', lastName: 'الزاوي', role: 'STUDENT', avatarColor: '#3b82f6', avatarInitials: 'أز', isActive: true, createdAt: iso(-24 * 90), memberships: [{ institution: { id: 'ins_e2e_1', name: 'مساحة عمل أُلارا التجريبية', slug: 'ulara-demo', status: 'ACTIVE' as const } }] },
    { id: 'usr_e2e_teacher', email: 'teacher@zu.edu.ly', firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER', avatarColor: '#8b5cf6', avatarInitials: 'لف', isActive: true, createdAt: iso(-24 * 400), memberships: [{ institution: { id: 'ins_e2e_1', name: 'مساحة عمل أُلارا التجريبية', slug: 'ulara-demo', status: 'ACTIVE' as const } }] },
    { id: 'usr_e2e_quality', email: 'quality@zu.edu.ly', firstName: 'عائشة', lastName: 'الباروني', role: 'QUALITY', avatarColor: '#d97706', avatarInitials: 'عب', isActive: true, createdAt: iso(-24 * 200), memberships: [{ institution: { id: 'ins_e2e_1', name: 'مساحة عمل أُلارا التجريبية', slug: 'ulara-demo', status: 'ACTIVE' as const } }] },
  ],
  meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
};

/** GET /owner/feature-flags — FeatureFlag[] (2 rows). */
export const OWNER_FEATURE_FLAGS = [
  { id: 'ffg_e2e_1', slug: 'ai-assistant', name: 'المساعد الذكي', description: null, enabled: true, category: 'ai', updatedAt: iso(-24 * 14), updatedBy: OWNER_USER.id },
  { id: 'ffg_e2e_2', slug: 'community-posts', name: 'منشورات المجتمع', description: null, enabled: false, category: 'community', updatedAt: iso(-24 * 60), updatedBy: null },
];

/** GET /owner/settings — PlatformSetting[] (2 rows). */
export const OWNER_SETTINGS = [
  { id: 'pst_e2e_1', key: 'platform.name', value: 'أُلارا', category: 'brand', updatedAt: iso(-24 * 90), updatedBy: null },
  { id: 'pst_e2e_2', key: 'maintenance.enabled', value: 'false', category: 'ops', updatedAt: iso(-24 * 2), updatedBy: OWNER_USER.id },
];

/** GET /owner/system — OwnerSystem. */
export const OWNER_SYSTEM = {
  alerts: {
    open: [
      { id: 'alr_e2e_1', severity: 'warning', category: 'storage', title: 'اقتراب سقف التخزين', message: '٧٨٪ من السقف مستخدم.', createdAt: iso(-24), metadata: null },
    ],
    openCount: 1,
    criticalCount: 0,
  },
  activity: { recentEventsLast7Days: 214 },
  storage: { driver: 'local', persistent: false },
};

/** GET /owner/ai-metrics — AiMetrics. */
export const OWNER_AI_METRICS = {
  totalRequests: 1042,
  totalTokens: 812_400,
  successRate: 96,
  avgLatencyMs: 820,
  byFeature: [
    { feature: 'assistant', count: 720, tokens: 601_000 },
    { feature: 'exam-gen', count: 322, tokens: 211_400 },
  ],
  trend: [
    { date: iso(-24 * 6).slice(0, 10), count: 118 },
    { date: iso(-24 * 5).slice(0, 10), count: 141 },
    { date: iso(-24 * 4).slice(0, 10), count: 132 },
    { date: iso(-24 * 3).slice(0, 10), count: 158 },
    { date: iso(-24 * 2).slice(0, 10), count: 190 },
    { date: iso(-24).slice(0, 10), count: 165 },
    { date: FIXED_NOW_ISO.slice(0, 10), count: 138 },
  ],
};

/** GET /owner/governance — GovernanceMetrics. */
export const OWNER_GOVERNANCE = {
  permissionChanges: 12,
  roleChanges: 4,
  newUsersThisMonth: 36,
  weeklyGrowth: [
    { week: iso(-24 * 28).slice(0, 10), count: 5 },
    { week: iso(-24 * 21).slice(0, 10), count: 8 },
    { week: iso(-24 * 14).slice(0, 10), count: 11 },
    { week: iso(-24 * 7).slice(0, 10), count: 12 },
  ],
};

/** GET /owner/login-analytics — LoginAnalytics. */
export const OWNER_LOGIN_ANALYTICS = {
  total: 2140,
  successCount: 1980,
  failureCount: 160,
  daily: [
    { date: iso(-24 * 2).slice(0, 10), success: 92, failure: 6 },
    { date: iso(-24).slice(0, 10), success: 104, failure: 9 },
    { date: FIXED_NOW_ISO.slice(0, 10), success: 88, failure: 5 },
  ],
  topReasons: [{ reason: 'INVALID_CREDENTIALS', count: 141 }],
};

/* ── feedback inbox (r323 B3.6) ─────────────────────────────────── */

/** GET /feedback — the registrar/owner inbox page (paginated). */
export const FEEDBACK_PAGE = {
  data: [
    {
      id: 'fbk_e2e_1',
      kind: 'BUG' as const,
      role: 'STUDENT',
      route: '/student/matrix',
      userAgent: 'Chrome/148',
      console: null,
      note: 'نسبة الإتقان تظهر معكوسة عند العرض.',
      screenshot: null,
      status: 'open' as const,
      createdAt: iso(-8),
      user: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', role: 'STUDENT' },
    },
    {
      id: 'fbk_e2e_2',
      kind: 'IDEA' as const,
      role: 'TEACHER',
      route: '/teacher/grades',
      userAgent: null,
      console: null,
      note: 'تصدير الدرجات بصيغة جدول.',
      screenshot: null,
      status: 'triage' as const,
      createdAt: iso(-24 * 2),
      user: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' },
    },
  ],
  meta: { total: 2, totalPages: 1, page: 1 },
};

/** GET /client-errors — the crash/error half of the inbox. */
export const CLIENT_ERRORS_PAGE = {
  data: [
    {
      id: 'cer_e2e_1',
      kind: 'js_error' as const,
      message: 'Cannot read properties of undefined (reading \'map\')',
      stack: null,
      route: '/student/gamification',
      role: 'STUDENT',
      breadcrumbs: null,
      appVersion: null,
      updateId: null,
      runtimeVersion: null,
      deviceModel: null,
      osName: 'Android',
      osVersion: '14',
      reviewedAt: null,
      createdAt: iso(-30),
      user: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', email: 'student@zu.edu.ly' },
    },
  ],
  meta: { total: 1, totalPages: 1, page: 1, unreviewed: 1 },
};

/* ── the document viewer's file stream ──────────────────────────── */

/** A minimal, valid one-page PDF built with correct xref offsets so
 *  pdf.js parses it without recovery mode. The page is blank — the
 *  viewer fixture needs structure, not content. */
export function tinyPdfBytes(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 770 Td (ulara fixture) Tj ET\nendstream',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

/** GET /research/:paperId/annotations — PaperAnnotation[] (1 row). */
export const PAPER_ANNOTATIONS = [
  {
    id: 'ant_e2e_1',
    paperId: 'ppr_e2e_q_1',
    page: 2,
    comment: 'وضّح مقاييس المقارنة هنا.',
    color: null,
    createdAt: iso(-20),
    author: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' as const, avatarColor: '#8b5cf6', avatarInitials: 'لف' },
  },
];

/** GET /exams/templates/:id/attempts — ExamAttemptRow[] (2 rows). */
export const TEMPLATE_ATTEMPTS = [
  {
    id: 'att_e2e_1',
    studentId: 'usr_e2e_student',
    studentName: 'أحمد الزاوي',
    status: 'SUBMITTED' as const,
    startedAt: iso(-26),
    submittedAt: iso(-25),
    score: null,
    maxScore: 20,
    pendingReview: 1,
    pendingAnswers: [
      { answerId: 'ans_e2e_1', questionId: 'qst_e2e_1', prompt: 'متى يضمن الخيار الجشع الحل الأمثل؟', type: 'SHORT' as const, points: 5, studentAnswer: 'عند تحقّق خاصية الاختيار الجشع والبنية الفرعية المثلى.' },
    ],
  },
  {
    id: 'att_e2e_2',
    studentId: 'usr_e2e_2',
    studentName: 'مروة البراني',
    status: 'GRADED' as const,
    startedAt: iso(-50),
    submittedAt: iso(-49),
    score: 17,
    maxScore: 20,
    pendingReview: 0,
    pendingAnswers: [],
  },
];
