/**
 * R320 §C — `ensureTestAccounts()`: the idempotent upsert that keeps the
 * documented easy-login test accounts (`@test.ly` / `12345678`) present,
 * unlocked and attached to realistic profiles.
 *
 * Run semantics (the two entry points):
 *   1. `npm run db:seed` — ALWAYS: once after the full corpus body on a
 *      fresh install (so the corpus — which owns the rich academic demo
 *      data — creates the shared corpus accounts first and this pass
 *      only heals them + adds the extra jobs), and once BEFORE the
 *      r183 established-database early-return (a normal redeploy of an
 *      established DB performs zero writes — these accounts are the ONE
 *      explicit, deliberate exception, and they are the ONLY rows the
 *      exception touches).
 *   2. BACKEND BOOT with `ULARA_TEST_ACCOUNTS=1` (backend/src/index.ts)
 *      — the self-healing dev/ops path; guarded, non-fatal, logged.
 *
 * r352 FINAL CLOSURE (§5) — the production policy, enforced INSIDE the
 * ensure so every entry point (boot, the daily cron, the
 * /jobs/test-accounts operator route, db:seed, the operator script)
 * funnels through the same rule:
 *   - A PRODUCTION runtime NEVER creates, heals, re-activates, or
 *     password-resets the platform OWNER test account: a public,
 *     fixed-password identity must not hold platform-wide authority in
 *     production (no flag can override this — see §5.2/§5.4).
 *   - In a production runtime the NON-OWNER demo accounts are refused
 *     BY DEFAULT too (fail closed); the explicit operator opt-in
 *     `ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO=1` keeps them available ONLY
 *     because their data and permissions are bound to the designated
 *     demo institutions ('ulara-demo' / 'ulara-demo-2') and — since the
 *     §3 closure — every non-OWNER administrative path is DB-verified
 *     institution-scoped, so the demo flows cannot reach real tenant
 *     data (§5.7).
 *   - Full fixtures stay available in local development, disposable
 *     integration databases, and protected test environments
 *     (non-production runtimes; Vercel preview/development builds).
 *
 * Guarantees:
 *   - NEVER touches real users' data: every write is an upsert keyed by
 *     the fixed test email; no other row is read for update.
 *   - Resets the password hash (argon2, same as the seed), re-activates
 *     the account (isActive), clears the lockout state
 *     (failedLoginCount + lockedUntil) and heals the governance scope.
 *   - Attaches realistic Arabic profiles: memberships in the demo
 *     institutions, student profiles with reg numbers (allocated only
 *     when the account has none — never stealing a number another
 *     account owns), teacher profiles with the academic POSITION for
 *     the head/dean/vice-dean jobs, `scopeFacultyId` for the
 *     faculty-scoped registrar.
 *   - Enrolments for student accounts are BEST-EFFORT: when the demo
 *     institution already has course offerings (seeded DBs), each
 *     student is enrolled in up to two of them; on a bare boot-time
 *     skeleton (no corpus yet) the step is skipped and logged.
 *
 * Outbound mail: NONE is attempted anywhere in this flow — the backend
 * has no mail transport at all (no SMTP/nodemailer/resend provider is
 * configured or implemented; notifications are in-app DB rows only), so
 * nothing is sent for logins, lockouts or resets on any account.
 */
import { AcademicRank, PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../lib/password.js';
import { TEST_ACCOUNTS, TEST_PASSWORD } from './test-accounts.data.js';

// ── the r352 final-closure production policy (§5) ────────────────────

/**
 * A production runtime is:
 *   - any Vercel deployment EXCEPT the explicitly non-production ones
 *     (preview/development) — VERCEL_ENV missing or anything else on a
 *     Vercel host fails CLOSED as production (the same polarity the
 *     migration gate uses, mirrored);
 *   - or NODE_ENV=production anywhere else (the classic deployment).
 * Local dev (NODE_ENV=development/test/anything else) and CI runners
 * are non-production: full fixtures stay available there (§5.3).
 */
export function isProductionRuntime(): boolean {
  const vercel = process.env.VERCEL;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercel !== undefined && vercel !== '') {
    return !(vercelEnv === 'preview' || vercelEnv === 'development');
  }
  return process.env.NODE_ENV === 'production';
}

export interface TestAccountsRuntimePolicy {
  /** True when the runtime is production-shaped (see isProductionRuntime). */
  production: boolean;
  /**
   * The platform OWNER fixture (owner@test.ly — public password, no
   * membership, platform-wide authority) may be ensured here? NEVER in
   * a production runtime; no flag overrides this (§5.2/§5.4).
   */
  ownerAllowed: boolean;
  /**
   * The NON-OWNER demo accounts may be ensured here? In production
   * only behind the explicit operator opt-in (§5.7 — the designated
   * demo institutions); refused by default. Always true elsewhere.
   */
  demoAllowed: boolean;
  /** An operator-facing, secret-free explanation for the logs/summaries. */
  reason: string;
}

/** The single policy decision every entry point funnels through. */
export function testAccountsRuntimePolicy(): TestAccountsRuntimePolicy {
  if (!isProductionRuntime()) {
    return {
      production: false,
      ownerAllowed: true,
      demoAllowed: true,
      reason: 'non-production runtime — full test-account fixtures allowed',
    };
  }
  const demoOptIn = process.env.ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO === '1';
  return {
    production: true,
    ownerAllowed: false,
    demoAllowed: demoOptIn,
    reason: demoOptIn
      ? 'production runtime — the OWNER fixture is refused categorically; the designated-demo-institution accounts are kept by the explicit ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO=1 operator decision'
      : 'production runtime — test-account ensure refused (fail-closed); the explicit operator opt-in ULARA_TEST_ACCOUNTS_PRODUCTION_DEMO=1 keeps the designated-demo-institution accounts',
  };
}

/** Realistic Arabic profile data for each test account (keyed by email).
 * The six corpus-overlapping accounts reuse the seed's exact names so a
 * fresh `db:seed` (corpus body first, ensure second) produces ONE row
 * with the canonical name regardless of which pass created it. */
interface AccountProfileData {
  firstName: string;
  lastName: string;
  avatarInitials: string;
  avatarColor: string;
  /** Which demo workspace this account belongs to ('primary' | 'secondary') —
   * legacy internal keys (row-identity parity with the seed), Phase Ω. */
  institution: 'primary' | 'secondary';
  /** Reg-number candidates, tried in order, ONLY when allocating a new
   * StudentProfile (an existing profile is never renumbered). */
  regNumbers?: string[];
  year?: number;
  gpa?: number;
  totalXp?: number;
  level?: number;
  specialty?: string;
  rank?: AcademicRank;
}

const ACCOUNT_PROFILES: Record<string, AccountProfileData> = {
  'student@test.ly': {
    firstName: 'أحمد', lastName: 'الزروق', avatarInitials: 'أح', avatarColor: '#4F8EF7',
    institution: 'primary', regNumbers: ['UZ-2024-00001', 'UZ-2025-00001'],
    year: 3, gpa: 3.4, totalXp: 2340, level: 7,
  },
  'student2@test.ly': {
    firstName: 'ليلى', lastName: 'المهدي', avatarInitials: 'لم', avatarColor: '#F06292',
    institution: 'secondary', regNumbers: ['UZ-2024-00001', 'AA-2025-00001'],
    year: 1,
  },
  'teacher@test.ly': {
    firstName: 'سالم', lastName: 'البوسيفي', avatarInitials: 'سب', avatarColor: '#3DD68C',
    institution: 'primary', specialty: 'علوم الحاسوب والذكاء الاصطناعي',
    rank: AcademicRank.ASSOCIATE_PROFESSOR,
  },
  'teacher2@test.ly': {
    firstName: 'خالد', lastName: 'الترابلسي', avatarInitials: 'خت', avatarColor: '#F5A623',
    institution: 'secondary', specialty: 'علوم الحاسوب',
    rank: AcademicRank.ASSISTANT_PROFESSOR,
  },
  'head@test.ly': {
    firstName: 'محمد', lastName: 'الشريف', avatarInitials: 'مش', avatarColor: '#0E7490',
    institution: 'primary', specialty: 'هندسة البرمجيات', rank: AcademicRank.PROFESSOR,
  },
  'dean@test.ly': {
    firstName: 'إبراهيم', lastName: 'الفيتوري', avatarInitials: 'إف', avatarColor: '#B45309',
    institution: 'primary', specialty: 'نظم المعلومات الإدارية', rank: AcademicRank.PROFESSOR,
  },
  'vicedean@test.ly': {
    firstName: 'آمال', lastName: 'بن عيسى', avatarInitials: 'آب', avatarColor: '#7C3AED',
    institution: 'primary', specialty: 'شبكات الحاسوب', rank: AcademicRank.PROFESSOR,
  },
  'registrar@test.ly': {
    /* R320 §B lockstep fix: the seed corpus (prisma/seed.ts, c1-RENAME)
       renamed this account's display name to the role's canonical name
       «المسجل العام» — this twin table still carried the retired
       pre-rename office name, so the FIRST ensure pass (which runs
       before the corpus in db:seed) created the production row with
       the dead name and no pass ever healed it (update touched only
       the password). The two sources now agree; the belt pins the
       lockstep. (R321 §A7: the stale literal retired from comments —
       the ledger scan owns the history.) */
    firstName: 'المسجل', lastName: 'العام', avatarInitials: 'مع', avatarColor: '#9B6FE8',
    institution: 'primary',
  },
  'faculty@test.ly': {
    firstName: 'خديجة', lastName: 'المرابط', avatarInitials: 'خم', avatarColor: '#2EC4B6',
    institution: 'primary',
  },
  'admin2@test.ly': {
    firstName: 'المسجل', lastName: 'العام', avatarInitials: 'مع', avatarColor: '#2EC4B6',
    institution: 'secondary',
  },
  'quality@test.ly': {
    firstName: 'ضمان', lastName: 'الجودة', avatarInitials: 'جو', avatarColor: '#D4A537',
    institution: 'primary',
  },
  'owner@test.ly': {
    firstName: 'مالك', lastName: 'المنصة', avatarInitials: 'مل', avatarColor: '#6B7280',
    institution: 'primary', // informational only — the owner NEVER gets a membership
  },
};

/** Ensure the demo skeleton exists (same natural keys as the seed body,
 * so fresh installs and bare boot-time skeletons converge on the same
 * rows the corpus seed would create). Phase Ω: neutral workspaces — the
 * faculty rows carry city 'افتراضي' (virtual workspaces, no campus/city
 * claim) and the first workspace's CS faculty matches the seed's
 * composite key exactly. */
async function ensureSkeleton(prisma: PrismaClient) {
  const primary = await prisma.institution.upsert({
    where: { slug: 'ulara-demo' },
    update: { name: 'مساحة عمل أُلارا التجريبية', nameEn: 'Ulara Experimental Workspace', status: 'ACTIVE' },
    create: {
      id: 'inst-ulara-showcase',
      name: 'مساحة عمل أُلارا التجريبية',
      nameEn: 'Ulara Experimental Workspace',
      slug: 'ulara-demo',
      status: 'ACTIVE',
    },
  });
  const secondary = await prisma.institution.upsert({
    where: { slug: 'ulara-demo-2' },
    update: { name: 'مساحة عمل تجريبية ثانية', nameEn: 'A Second Experimental Workspace', status: 'ACTIVE' },
    create: {
      name: 'مساحة عمل تجريبية ثانية',
      nameEn: 'A Second Experimental Workspace',
      slug: 'ulara-demo-2',
      status: 'ACTIVE',
    },
  });
  const primaryItFaculty = await prisma.faculty.upsert({
    where: {
      institutionId_name_city: { institutionId: primary.id, name: 'كلية علوم الحاسوب', city: 'افتراضي' },
    },
    create: {
      name: 'كلية علوم الحاسوب', nameEn: 'Computer Science', iconEmoji: '💻',
      city: 'افتراضي', institutionId: primary.id,
    },
    update: {},
  });
  const aaFaculty = await prisma.faculty.upsert({
    where: {
      institutionId_name_city: { institutionId: secondary.id, name: 'كلية تقنية المعلومات', city: 'افتراضي' },
    },
    create: {
      name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻',
      city: 'افتراضي', institutionId: secondary.id,
    },
    update: {},
  });
  const primaryCsDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: primaryItFaculty.id, name: 'علوم الحاسوب' } },
    create: { name: 'علوم الحاسوب', nameEn: 'Computer Science', facultyId: primaryItFaculty.id },
    update: {},
  });
  const aaCsDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: aaFaculty.id, name: 'علوم الحاسوب' } },
    create: { name: 'علوم الحاسوب', nameEn: 'Computer Science', facultyId: aaFaculty.id },
    update: {},
  });
  return {
    primary, secondary,
    primaryItFaculty, aaFaculty,
    primaryCsDept, aaCsDept,
  };
}

/** Allocate the first FREE reg number in the institution (never steals
 * an existing profile's number — institution-scoped uniqueness). */
async function allocateRegNumber(
  prisma: PrismaClient,
  institutionId: string,
  candidates: readonly string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    const taken = await prisma.studentProfile.findUnique({
      where: { institutionId_universityId: { institutionId, universityId: candidate } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

/** Best-effort: enrol a student in up to `max` of the institution's
 * existing offerings (the corpus seed owns the rich offerings; on a
 * bare skeleton there are none and the pass is skipped). */
async function ensureEnrolments(
  prisma: PrismaClient,
  studentId: string,
  institutionId: string,
  max: number,
): Promise<number> {
  const offerings = await prisma.courseOffering.findMany({
    where: { course: { institutionId } },
    select: { id: true },
    take: max,
    orderBy: { createdAt: 'asc' },
  });
  let created = 0;
  for (const offering of offerings) {
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId, offeringId: offering.id } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.enrollment.create({
        data: { studentId, offeringId: offering.id, status: 'active' },
      });
      created += 1;
    }
  }
  return created;
}

/**
 * The idempotent test-account ensure. Returns the number of accounts
 * the pass actually ensured (created or healed) — 0 when the r352
 * production policy refused the runtime (every entry point — boot,
 * cron, the operator route, db:seed, the operator script — funnels
 * through that same decision). Throws on infrastructure errors
 * (callers decide fatality: the seed lets it fail the run; the boot
 * path catches and logs).
 */
export async function ensureTestAccounts(prisma: PrismaClient): Promise<number> {
  // r352 final closure (§5): the production policy is enforced HERE —
  // no entry point can bypass it. A production runtime never creates,
  // heals, re-activates or password-resets owner@test.ly (a public
  // fixed-password identity must not hold platform-wide authority), and
  // the non-OWNER demo accounts stay behind the explicit operator
  // opt-in. Every non-production runtime keeps the full fixtures.
  const policy = testAccountsRuntimePolicy();
  if (!policy.demoAllowed) {
    // Production, no opt-in: zero writes — a previous OWNER fixture can
    // never be silently reactivated by a later boot, cron, or seed.
    return 0;
  }
  const skeleton = await ensureSkeleton(prisma);
  const passwordHash = await hashPassword(TEST_PASSWORD);

  let ensured = 0;
  for (const account of TEST_ACCOUNTS) {
    // The OWNER fixture is categorically refused in a production
    // runtime — even with the demo opt-in (§5.2/§5.4: no flag overrides
    // the public-password platform-OWNER prohibition).
    if (!policy.ownerAllowed && account.role === Role.OWNER) {
      continue;
    }
    const profile = ACCOUNT_PROFILES[account.email];
    if (!profile) continue; // unknown account — the table and profiles must stay in lockstep

    const institution =
      profile.institution === 'secondary' ? skeleton.secondary : skeleton.primary;
    const faculty = profile.institution === 'secondary' ? skeleton.aaFaculty : skeleton.primaryItFaculty;
    const department = profile.institution === 'secondary' ? skeleton.aaCsDept : skeleton.primaryCsDept;

    // ── user: create-or-heal by the fixed test email ──────────────
    // The heal (update) branch converges the row on the canonical
    // profile — display name included. These are OUR @test.ly accounts
    // (isTestAccountEmail is the marker); no real user's name can be
    // touched here, and a row created by an older table version (the
    // production pre-rename-name drift) self-heals on the next
    // db:seed / boot ensure instead of living forever.
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarInitials: profile.avatarInitials,
        avatarColor: profile.avatarColor,
        // Governance scope is part of the account's documented contract:
        // faculty-scoped for `scoped`, university-wide (NULL) otherwise.
        scopeFacultyId: account.scoped ? skeleton.primaryItFaculty.id : null,
      },
      create: {
        email: account.email,
        passwordHash,
        role: account.role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarInitials: profile.avatarInitials,
        avatarColor: profile.avatarColor,
        emailVerifiedAt: new Date(),
        scopeFacultyId: account.scoped ? skeleton.primaryItFaculty.id : null,
      },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: account.email },
      select: { id: true },
    });

    // ── membership (the platform OWNER deliberately has NONE) ─────
    let membershipId: string | null = null;
    if (account.role !== Role.OWNER) {
      const membership = await prisma.membership.upsert({
        where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
        update: { role: account.role, isActive: true },
        create: { userId: user.id, institutionId: institution.id, role: account.role, isActive: true },
      });
      membershipId = membership.id;
    }

    // ── academic profiles ─────────────────────────────────────────
    if (account.role === Role.STUDENT && membershipId) {
      const existing = await prisma.studentProfile.findFirst({
        where: { userId: user.id, institutionId: institution.id },
        select: { id: true },
      });
      if (!existing) {
        const regNumber = await allocateRegNumber(
          prisma,
          institution.id,
          profile.regNumbers ?? [],
        );
        if (regNumber) {
          await prisma.studentProfile.create({
            data: {
              userId: user.id,
              membershipId,
              institutionId: institution.id,
              universityId: regNumber,
              facultyId: faculty.id,
              departmentId: department.id,
              ...(profile.year !== undefined ? { year: profile.year } : {}),
              ...(profile.gpa !== undefined ? { gpa: profile.gpa } : {}),
              ...(profile.totalXp !== undefined ? { totalXp: profile.totalXp } : {}),
              ...(profile.level !== undefined ? { level: profile.level } : {}),
            },
          });
        }
      }
      // Best-effort enrolments (skipped silently on a bare skeleton).
      await ensureEnrolments(prisma, user.id, institution.id, 2);
    }

    if (account.role === Role.TEACHER && membershipId) {
      const existing = await prisma.teacherProfile.findFirst({
        where: { userId: user.id, membership: { institutionId: institution.id } },
        select: { id: true },
      });
      if (!existing) {
        await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            membershipId,
            specialty: profile.specialty ?? 'علوم الحاسوب',
            rank: profile.rank ?? AcademicRank.LECTURER,
            departmentId: department.id,
            // The leadership appointment IS the job (رئيس قسم/عميد/نائب
            // عميد ride the TEACHER role + TeacherProfile.position).
            ...(account.position ? { position: account.position } : {}),
          },
        });
      } else if (account.position) {
        // Heal positional drift on re-runs (the job table is the truth).
        await prisma.teacherProfile.update({
          where: { id: existing.id },
          data: { position: account.position },
        });
      }
    }

    ensured += 1;
  }

  return ensured;
}
