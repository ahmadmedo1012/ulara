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
