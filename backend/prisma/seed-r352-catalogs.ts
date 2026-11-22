/**
 * r352 — seeded reference catalogs + legacy appointment backfill.
 *
 * Additive, idempotent upserts (create-only; re-runs are no-ops). Run
 * by prisma/seed.ts on every seed AND standalone via:
 *   tsx prisma/seed-r352-catalogs.ts
 *
 * Legal grounding: docs/redesign/r352/institutional-backend/LEGAL-MATRIX.md
 * (Law 9/2026, Law 10/2026, Law 21/2023, Law 2/2018 + 4/2020, National
 * Center criteria titles fetched from qaa.ly).
 */
import type { PrismaClient } from '@prisma/client';
import { CREDENTIAL_CATALOG } from '../src/lib/credentials-logic.js';

export interface R352CatalogCounts {
  authorities: number;
  institutionTypes: number;
  credentialTypes: number;
  positionTemplates: number;
  criteriaSets: number;
  criteriaItems: number;
  backfilledAppointments: number;
}

// ── Regulatory authorities ──────────────────────────────────────────
const AUTHORITIES = [
  { code: 'MINISTRY_HESR', nameAr: 'وزارة التعليم العالي والبحث العلمي', nameEn: 'Ministry of Higher Education & Scientific Research', kind: 'MINISTRY' },
  { code: 'NATIONAL_QA_CENTER', nameAr: 'المركز الوطني لضمان جودة واعتماد المؤسسات التعليمية والتدريبية', nameEn: 'National Center for Quality Assurance & Accreditation', kind: 'NATIONAL_CENTER' },
  { code: 'TECHNICAL_ACADEMY', nameAr: 'الأكاديمية الوطنية للتعليم التقني', nameEn: 'National Academy for Technical Education', kind: 'ACADEMY' },
  { code: 'MINISTRY_EDUCATION', nameAr: 'وزارة التعليم', nameEn: 'Ministry of Education', kind: 'MINISTRY' },
  { code: 'MINISTRY_LABOR', nameAr: 'وزارة العمل', nameEn: 'Ministry of Labour', kind: 'MINISTRY' },
  { code: 'OTHER_AUTHORITY', nameAr: 'جهة أخرى', nameEn: 'Other authority', kind: 'OTHER' },
] as const;

// ── Institution types (LEGAL-MATRIX §A) ────────────────────────────
const INSTITUTION_TYPES = [
  { code: 'UNIVERSITY', sector: 'HIGHER_EDUCATION_RESEARCH' as const, nameAr: 'جامعة', nameEn: 'University', isIndependentLegalPersonality: true, legalBasis: 'قانون 2/2018 بشأن الجامعات (المعدَّل بقانوني 4/2020 و9/2026)', defaultAuthorityCode: 'MINISTRY_HESR' },
  { code: 'GRADUATE_ACADEMY', sector: 'HIGHER_EDUCATION_RESEARCH' as const, nameAr: 'أكاديمية دراسات عليا', nameEn: 'Graduate academy', isIndependentLegalPersonality: true, legalBasis: 'قانون 4/2020 م1', defaultAuthorityCode: 'MINISTRY_HESR' },
  { code: 'RESEARCH_AUTHORITY', sector: 'HIGHER_EDUCATION_RESEARCH' as const, nameAr: 'هيئة بحثية', nameEn: 'Research authority', isIndependentLegalPersonality: true, legalBasis: 'قانون 9/2026 م1', defaultAuthorityCode: 'MINISTRY_HESR' },
  { code: 'INDEPENDENT_RESEARCH_CENTER', sector: 'HIGHER_EDUCATION_RESEARCH' as const, nameAr: 'مركز أبحاث مستقل', nameEn: 'Independent research center', isIndependentLegalPersonality: true, legalBasis: 'قانون 9/2026 م1', defaultAuthorityCode: 'MINISTRY_HESR' },
  { code: 'MEDICAL_SPECIALIZATIONS_BOARD', sector: 'HIGHER_EDUCATION_RESEARCH' as const, nameAr: 'مجلس التخصصات الطبية', nameEn: 'Medical Specializations Board', isIndependentLegalPersonality: true, legalBasis: 'قانون 9/2026 م33 مكرر', defaultAuthorityCode: 'MINISTRY_HESR' },
  { code: 'TECHNICAL_ACADEMY', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' as const, nameAr: 'أكاديمية التعليم التقني', nameEn: 'Technical education academy', isIndependentLegalPersonality: true, legalBasis: 'قانون 21/2023', defaultAuthorityCode: 'TECHNICAL_ACADEMY' },
  { code: 'TECHNICAL_COLLEGE', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' as const, nameAr: 'كلية تقنية', nameEn: 'Technical college', isIndependentLegalPersonality: true, legalBasis: 'قانون 21/2023 م12، م24', defaultAuthorityCode: 'TECHNICAL_ACADEMY' },
  { code: 'HIGHER_TECHNICAL_INSTITUTE', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' as const, nameAr: 'معهد تقني عالٍ', nameEn: 'Higher technical institute', isIndependentLegalPersonality: true, legalBasis: 'قانون 21/2023 م12، م32', defaultAuthorityCode: 'TECHNICAL_ACADEMY' },
  { code: 'INTERMEDIATE_TECHNICAL_INSTITUTE', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' as const, nameAr: 'معهد فني متوسط', nameEn: 'Intermediate technical institute', isIndependentLegalPersonality: false, legalBasis: 'قانون 21/2023 م12', defaultAuthorityCode: 'TECHNICAL_ACADEMY' },
  { code: 'VOCATIONAL_TRAINING_CENTER', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL' as const, nameAr: 'مركز تكوين وتدريب مهني', nameEn: 'Vocational training center', isIndependentLegalPersonality: false, legalBasis: 'قانون 21/2023 م12، م38-41', defaultAuthorityCode: 'TECHNICAL_ACADEMY' },
] as const;

// ── Position templates (LEGAL-MATRIX §D) ───────────────────────────
// scopeRequirement = required OrgUnitType; eligibleInstitutionTypeCodes
// empty = all kinds.
const POSITION_TEMPLATES = [
  // University leadership (Law 2/2018 + 4/2020).
  { code: 'UNIVERSITY_PRESIDENT', titleAr: 'رئيس الجامعة', titleEn: 'University president', category: 'UNIVERSITY_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['UNIVERSITY'], legalBasis: 'قانون 2/2018 م16؛ قانون 4/2020 م15' },
  { code: 'UNIVERSITY_VICE_PRESIDENT', titleAr: 'وكيل الجامعة', titleEn: 'University vice-president', category: 'UNIVERSITY_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['UNIVERSITY'], legalBasis: 'قانون 2/2018 م18' },
  { code: 'SECRETARY_GENERAL', titleAr: 'الأمين العام / الكاتب العام', titleEn: 'Secretary general', category: 'ADMINISTRATIVE_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 2/2018 م20؛ قانون 4/2020 م19' },
  { code: 'REGISTRAR_GENERAL', titleAr: 'المسجل العام', titleEn: 'Registrar general', category: 'ADMINISTRATIVE_LEADERSHIP' as const, scopeRequirement: 'REGISTRAR_OFFICE', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 2/2018 م13، م21؛ قانون 4/2020 م12، م20' },
  // Faculty/department leadership.
  { code: 'FACULTY_DEAN', titleAr: 'عميد الكلية', titleEn: 'Dean', category: 'FACULTY_LEADERSHIP' as const, scopeRequirement: 'FACULTY', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 9/2026 م25 (النسخة المعدَّلة لم25 من قانون 4/2020)' },
  { code: 'TECHNICAL_COLLEGE_DEAN', titleAr: 'عميد الكلية التقنية', titleEn: 'Technical college dean', category: 'FACULTY_LEADERSHIP' as const, scopeRequirement: 'FACULTY', eligibleInstitutionTypeCodes: ['TECHNICAL_COLLEGE'], legalBasis: 'قانون 21/2023 م19، م22' },
  { code: 'FACULTY_ASSOCIATE_DEAN', titleAr: 'وكيل الكلية / وكيل الشؤون العلمية', titleEn: 'Associate dean / VP for academic affairs', category: 'FACULTY_LEADERSHIP' as const, scopeRequirement: 'FACULTY', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 4/2020 م27؛ قانون 21/2023 م19، م27' },
  { code: 'DEPARTMENT_HEAD', titleAr: 'رئيس القسم العلمي', titleEn: 'Head of scientific department', category: 'DEPARTMENT_LEADERSHIP' as const, scopeRequirement: 'SCIENTIFIC_DEPARTMENT', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 4/2020 م32' },
  // Institute leadership (Law 21/2023).
  { code: 'HIGHER_INSTITUTE_DIRECTOR', titleAr: 'مدير المعهد العالي التقني', titleEn: 'Higher technical institute director', category: 'INSTITUTE_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['HIGHER_TECHNICAL_INSTITUTE'], legalBasis: 'قانون 21/2023 م27، م30' },
  { code: 'HIGHER_INSTITUTE_ACADEMIC_AFFAIRS', titleAr: 'وكيل الشؤون العلمية بالمعهد العالي', titleEn: 'Institute VP for academic affairs', category: 'INSTITUTE_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['HIGHER_TECHNICAL_INSTITUTE'], legalBasis: 'قانون 21/2023 م27' },
  { code: 'INTERMEDIATE_INSTITUTE_DIRECTOR', titleAr: 'مدير المعهد المتوسط', titleEn: 'Intermediate institute director', category: 'INSTITUTE_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['INTERMEDIATE_TECHNICAL_INSTITUTE'], legalBasis: 'قانون 21/2023 م35، م36' },
  { code: 'INTERMEDIATE_INSTITUTE_DEPUTY', titleAr: 'نائب مدير المعهد المتوسط', titleEn: 'Intermediate institute deputy director', category: 'INSTITUTE_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['INTERMEDIATE_TECHNICAL_INSTITUTE'], legalBasis: 'قانون 21/2023 م35' },
  // Training centers (Law 21/2023).
  { code: 'TRAINING_CENTER_DIRECTOR', titleAr: 'مدير المركز', titleEn: 'Training center director', category: 'TRAINING_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['VOCATIONAL_TRAINING_CENTER'], legalBasis: 'قانون 21/2023 م39، م40' },
  { code: 'TRAINING_CENTER_DEPUTY', titleAr: 'نائب مدير المركز', titleEn: 'Training center deputy director', category: 'TRAINING_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['VOCATIONAL_TRAINING_CENTER'], legalBasis: 'قانون 21/2023 م39' },
  { code: 'CHIEF_TECHNICAL_GUIDE', titleAr: 'الموجه الفني الأول', titleEn: 'Chief technical guide', category: 'TRAINING_LEADERSHIP' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['INTERMEDIATE_TECHNICAL_INSTITUTE', 'VOCATIONAL_TRAINING_CENTER'], legalBasis: 'قانون 21/2023 م37، م41' },
  // Research + QA offices.
  { code: 'RESEARCH_CENTER_DIRECTOR', titleAr: 'مدير مركز البحوث', titleEn: 'Research center director', category: 'CENTER_LEADERSHIP' as const, scopeRequirement: 'RESEARCH_CENTER', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 9/2026 م1' },
  { code: 'QA_OFFICE_DIRECTOR', titleAr: 'مدير مكتب ضمان الجودة', titleEn: 'QA office director', category: 'CENTER_LEADERSHIP' as const, scopeRequirement: 'QA_OFFICE', eligibleInstitutionTypeCodes: [], legalBasis: 'قانون 2/2018 م13 (عضوية ضمان الجودة بمجلس الجامعة)' },
  { code: 'MEDICAL_BOARD_CHAIR', titleAr: 'رئيس مجلس التخصصات الطبية', titleEn: 'Medical board chair', category: 'BOARD_OFFICE' as const, scopeRequirement: null, eligibleInstitutionTypeCodes: ['MEDICAL_SPECIALIZATIONS_BOARD'], legalBasis: 'قانون 9/2026 م33 مكرر' },
] as const;

// ── Accreditation criteria sets (National Center, qaa.ly) ─────────
// Standard TITLES as published (معايير اعتماد مؤسسات التعليم التقني —
// الصادرة عن المركز الوطني): 9 institutional + 8 program standards.
// Titles only — no invented indicator text (LEGAL-MATRIX §B).
const INSTITUTIONAL_STANDARDS = [
  'التخطيط', 'القيادة والحوكمة', 'البرامج التعليمية والتدريبية',
  'هيئة التدريس والمدربين', 'المرافق وخدمات الدعم التعليمية والتدريبية',
  'الشؤون الطلابية', 'البحث العلمي', 'خدمة المجتمع والبيئة',
  'ضمان الجودة والتحسين المستمر',
];
const PROGRAM_STANDARDS = [
  'التخطيط والتنظيم الإداري', 'البرامج التعليمية والتدريبية',
  'هيئة التدريس والمدربين', 'المرافق وخدمات الدعم التعليمية والتدريبية',
  'الشؤون الطلابية', 'البحث العلمي', 'خدمة المجتمع',
  'ضمان الجودة والتحسين المستمر',
];

/** Seed every r352 catalog — additive upserts, safe to re-run. */
export async function ensureR352Catalogs(prisma: PrismaClient): Promise<R352CatalogCounts> {
  // 1. Authorities.
  for (const a of AUTHORITIES) {
    await prisma.regulatoryAuthority.upsert({
      where: { code: a.code },
      create: { code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, kind: a.kind },
      update: { nameAr: a.nameAr, nameEn: a.nameEn, kind: a.kind },
    });
  }
  // 2. Institution types (link default authority).
  const authorityIds = new Map(
    (await prisma.regulatoryAuthority.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]),
  );
  for (const t of INSTITUTION_TYPES) {
    await prisma.institutionType.upsert({
      where: { code: t.code },
      create: {
        code: t.code, sector: t.sector, nameAr: t.nameAr, nameEn: t.nameEn,
        isIndependentLegalPersonality: t.isIndependentLegalPersonality,
        legalBasis: t.legalBasis,
        defaultAuthorityId: authorityIds.get(t.defaultAuthorityCode) ?? null,
      },
      update: {
        sector: t.sector, nameAr: t.nameAr, nameEn: t.nameEn,
        isIndependentLegalPersonality: t.isIndependentLegalPersonality,
        legalBasis: t.legalBasis,
        defaultAuthorityId: authorityIds.get(t.defaultAuthorityCode) ?? null,
      },
    });
  }
  // 3. Credential types (single source: credentials-logic.ts).
  const credentialArNames: Record<string, string> = {
    VOCATIONAL_TRAINING_CERT: 'شهادة التدريب المهني',
    BASIC_FORMATION_CERT: 'شهادة التكوين الأساسي',
    INTERMEDIATE_TECHNICAL_DIPLOMA: 'الدبلوم الفني المتوسط',
    SPECIALIZED_PROFESSIONAL_DIPLOMA: 'الدبلوم المهني التخصصي',
    HIGHER_TECHNICAL_DIPLOMA: 'الدبلوم التقني العالي',
    TECHNICAL_BACHELOR: 'البكالوريوس التقني',
    HIGH_LICENSE_MASTERS: 'الإجازة العالية (الماجستير)',
    PRECISE_LICENSE_DOCTORATE: 'الإجازة الدقيقة (الدكتوراه)',
    MEDICAL_BOARD_CERT: 'شهادة مجلس التخصصات الطبية',
    OTHER: 'مؤهل آخر بقرار مجلس الوزراء',
  };
  const credentialBasis: Record<string, string> = {
    VOCATIONAL_TRAINING_CERT: 'قانون 21/2023 م5، م38 (المسار المحدود — لا تسمح بمواصلة الدراسة)',
    BASIC_FORMATION_CERT: 'قانون 21/2023 م5، م38 (المسار المفتوح — تؤهل للمعاهد المتوسطة)',
    INTERMEDIATE_TECHNICAL_DIPLOMA: 'قانون 21/2023 م4(2)، م5',
    SPECIALIZED_PROFESSIONAL_DIPLOMA: 'قانون 21/2023 م26 (شهادة مهنية لا تسمح بمواصلة الدراسة)',
    HIGHER_TECHNICAL_DIPLOMA: 'قانون 21/2023 م26، م4(3)',
    TECHNICAL_BACHELOR: 'قانون 21/2023 م4(3)، م5',
    HIGH_LICENSE_MASTERS: 'قانون 21/2023 م4(4)، م5',
    PRECISE_LICENSE_DOCTORATE: 'قانون 21/2023 م4(4)، م5',
    MEDICAL_BOARD_CERT: 'قانون 9/2026 م33 مكرر (تُعادل درجة الإجازة الدقيقة الدكتوراه)',
    OTHER: 'قانون 21/2023 م5 (بقرار من مجلس الوزراء)',
  };
  for (const c of CREDENTIAL_CATALOG) {
    await prisma.credentialType.upsert({
      where: { code: c.code },
      create: {
        code: c.code, nameAr: credentialArNames[c.code] ?? c.code,
        level: c.level, grantsProgression: c.grantsProgression,
        legalBasis: credentialBasis[c.code] ?? null,
      },
      update: {
        nameAr: credentialArNames[c.code] ?? c.code,
        level: c.level, grantsProgression: c.grantsProgression,
        legalBasis: credentialBasis[c.code] ?? null,
      },
    });
  }
  // 4. Position templates.
  for (const t of POSITION_TEMPLATES) {
    await prisma.positionTemplate.upsert({
      where: { code: t.code },
      create: {
        code: t.code, titleAr: t.titleAr, titleEn: t.titleEn, category: t.category,
        scopeRequirement: t.scopeRequirement,
        eligibleInstitutionTypeCodes: [...t.eligibleInstitutionTypeCodes],
        isLocalVariant: false,
        notes: t.legalBasis,
      },
      update: {
        titleAr: t.titleAr, titleEn: t.titleEn, category: t.category,
        scopeRequirement: t.scopeRequirement,
        eligibleInstitutionTypeCodes: [...t.eligibleInstitutionTypeCodes],
        notes: t.legalBasis,
      },
    });
  }
  // 5. Criteria sets (institutional + program standard titles).
  const qaCenter = authorityIds.get('NATIONAL_QA_CENTER')!;
  const ensureSet = async (code: string, nameAr: string, appliesTo: 'INSTITUTIONAL' | 'PROGRAM', titles: string[]) => {
    const version = '2024';
    const set = await prisma.accreditationCriteriaSet.upsert({
      where: { code_version: { code, version } },
      create: {
        code, version, nameAr, appliesTo,
        authorityId: qaCenter,
        publishedRef: 'معايير اعتماد مؤسسات التعليم التقني — المركز الوطني لضمان الجودة والاعتماد',
      },
      update: { nameAr, authorityId: qaCenter },
    });
    let i = 0;
    for (const title of titles) {
      i += 1;
      await prisma.accreditationCriteriaItem.upsert({
        where: { criteriaSetId_code: { criteriaSetId: set.id, code: `${code}-${String(i).padStart(2, '0')}` } },
        create: { criteriaSetId: set.id, code: `${code}-${String(i).padStart(2, '0')}`, titleAr: title, sortOrder: i },
        update: { titleAr: title, sortOrder: i },
      });
    }
    return set;
  };
  await ensureSet('QA-TECH-INST', 'معايير الاعتماد المؤسسي لمؤسسات التعليم التقني', 'INSTITUTIONAL', INSTITUTIONAL_STANDARDS);
  await ensureSet('QA-TECH-PROG', 'معايير الاعتماد البرامجي لمؤسسات التعليم التقني', 'PROGRAM', PROGRAM_STANDARDS);
  return {
    authorities: AUTHORITIES.length,
    institutionTypes: INSTITUTION_TYPES.length,
    credentialTypes: CREDENTIAL_CATALOG.length,
    positionTemplates: POSITION_TEMPLATES.length,
    criteriaSets: 2,
    criteriaItems: INSTITUTIONAL_STANDARDS.length + PROGRAM_STANDARDS.length,
    backfilledAppointments: 0,
  };
}

/**
 * Backfill PositionAppointment rows from legacy TeacherProfile.position
 * values (DEAN/ASSOCIATE_DEAN/DEPARTMENT_HEAD) — the catalog-dependent
 * half of the r352 migration (DECISIONS.md D11): deterministic ids make
 * it idempotent. Also ensures the person rows the appointments need.
 */
export async function backfillLegacyAppointments(prisma: PrismaClient): Promise<number> {
  const legacy = await prisma.teacherProfile.findMany({
    where: { position: { not: null } },
    select: {
      id: true, userId: true, membershipId: true, position: true,
      positionFacultyId: true, positionDepartmentId: true,
      appointedAt: true, termEndsAt: true,
      membership: { select: { institutionId: true } },
    },
    take: 5000,
  });
  let created = 0;
  for (const tp of legacy) {
    if (!tp.position || !tp.membership) continue;
    const positionCode =
      tp.position === 'DEAN' ? 'FACULTY_DEAN'
      : tp.position === 'ASSOCIATE_DEAN' ? 'FACULTY_ASSOCIATE_DEAN'
      : 'DEPARTMENT_HEAD';
    const template = await prisma.positionTemplate.findUnique({
      where: { code: positionCode },
      select: { id: true },
    });
    if (!template) continue; // catalogs not seeded yet — next run picks it up
    // Ensure the person row (deterministic id).
    const personId = `ip-tp-${tp.id}`;
    await prisma.institutionalPerson.upsert({
      where: { id: personId },
      create: {
        id: personId,
        institutionId: tp.membership.institutionId,
        userId: tp.userId,
        fullNameAr: '',
        category: 'ACADEMIC_STAFF',
      },
      update: {},
    });
    if (!tp.userId) {
      await prisma.institutionalPerson.update({ where: { id: personId }, data: { userId: null } });
    }
    await prisma.teacherProfile.update({ where: { id: tp.id }, data: { personId } });
    // Resolve the org unit for the appointment.
    let orgUnitId: string | null = null;
    if (positionCode === 'DEPARTMENT_HEAD' && tp.positionDepartmentId) {
      const department = await prisma.department.findUnique({
        where: { id: tp.positionDepartmentId },
        select: { orgUnitId: true },
      });
      orgUnitId = department?.orgUnitId ?? null;
    } else if (tp.positionFacultyId) {
      const faculty = await prisma.faculty.findUnique({
        where: { id: tp.positionFacultyId },
        select: { orgUnitId: true },
      });
      orgUnitId = faculty?.orgUnitId ?? null;
    }
    const existing = await prisma.positionAppointment.findUnique({
      where: { id: `pa-legacy-${tp.id}` },
      select: { id: true },
    });
    if (!existing) {
      await prisma.positionAppointment.create({
        data: {
          id: `pa-legacy-${tp.id}`,
          institutionId: tp.membership.institutionId,
          personId,
          positionId: template.id,
          orgUnitId,
          startDate: tp.appointedAt ?? new Date(),
          endDate: tp.termEndsAt ?? null,
          status: 'ACTIVE',
          acting: false,
          notes: 'ترحيل تلقائي من خانة القيادة القديمة في ملف الأستاذ (r352 backfill)',
        },
      });
      created += 1;
    }
  }
  return created;
}

/**
 * Backfill OrganizationalUnit mirrors for legacy Faculty/Department rows
 * created OUTSIDE the API write-through (this seed, older deployments).
 * The migration 0003 backfill covers migration-time rows; this pass is
 * the idempotent catch-up — the same guarded SQL, safe to re-run.
 */
export async function backfillOrgUnitsFromLegacy(prisma: PrismaClient): Promise<{ faculties: number; departments: number }> {
  await prisma.$executeRaw`INSERT INTO "OrganizationalUnit" ("id", "institutionId", "parentId", "code", "nameAr", "nameEn", "type", "status", "sortOrder", "location", "createdAt", "updatedAt")
    SELECT 'ou-f-' || f."id", f."institutionId", NULL, NULL, f."name", f."nameEn", 'FACULTY', 'ACTIVE', 0, f."city", now(), now()
    FROM "Faculty" f
    WHERE NOT EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-f-' || f."id")`;
  await prisma.$executeRaw`UPDATE "Faculty" f SET "orgUnitId" = 'ou-f-' || f."id"
    WHERE f."orgUnitId" IS NULL AND EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-f-' || f."id")`;
  await prisma.$executeRaw`INSERT INTO "OrganizationalUnit" ("id", "institutionId", "parentId", "code", "nameAr", "nameEn", "type", "status", "sortOrder", "createdAt", "updatedAt")
    SELECT 'ou-d-' || d."id", f."institutionId", 'ou-f-' || d."facultyId", NULL, d."name", d."nameEn", 'SCIENTIFIC_DEPARTMENT', 'ACTIVE', 0, now(), now()
    FROM "Department" d JOIN "Faculty" f ON f."id" = d."facultyId"
    WHERE NOT EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-d-' || d."id")`;
  await prisma.$executeRaw`UPDATE "Department" d SET "orgUnitId" = 'ou-d-' || d."id"
    WHERE d."orgUnitId" IS NULL AND EXISTS (SELECT 1 FROM "OrganizationalUnit" ou WHERE ou."id" = 'ou-d-' || d."id")`;
  const faculties = await prisma.faculty.count({ where: { orgUnitId: { not: null } } });
  const departments = await prisma.department.count({ where: { orgUnitId: { not: null } } });
  return { faculties, departments };
}
