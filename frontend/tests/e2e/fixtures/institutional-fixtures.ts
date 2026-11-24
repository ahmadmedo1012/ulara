/**
 * r355 — hermetic mock fixtures for the institutional domain (R352 routes).
 * Used by mock-transport.ts, e2e tests, and the surface capture harness.
 */

export const INSTITUTION_TYPES_CATALOG = [
  {
    id: 'it_1',
    code: 'UNIVERSITY',
    sector: 'HIGHER_EDUCATION_RESEARCH',
    nameAr: 'جامعة حكومية',
    nameEn: 'Public University',
    isIndependentLegalPersonality: true,
  },
  {
    id: 'it_2',
    code: 'HIGHER_INSTITUTE',
    sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL',
    nameAr: 'معهد عالٍ تقني',
    nameEn: 'Higher Technical Institute',
    isIndependentLegalPersonality: true,
  },
];

export const REGULATORY_AUTHORITIES_CATALOG = [
  {
    id: 'ra_1',
    code: 'MOE_HE',
    nameAr: 'وزارة التعليم العالي والبحث العلمي',
    nameEn: 'Ministry of Higher Education and Scientific Research',
    kind: 'MINISTRY',
  },
  {
    id: 'ra_2',
    code: 'NQAAC',
    nameAr: 'المركز الوطني لضمان جودة واعتماد المؤسسات التعليمية',
    nameEn: 'National Quality Assurance & Accreditation Center',
    kind: 'ACCREDITATION_BODY',
  },
];

export const CREDENTIAL_TYPES_CATALOG = [
  {
    id: 'ct_1',
    code: 'BACHELOR',
    nameAr: 'درجة البكالوريوس',
    nameEn: 'Bachelor Degree',
    level: 6,
    grantsProgression: true,
  },
  {
    id: 'ct_2',
    code: 'MASTER',
    nameAr: 'درجة الماجستير',
    nameEn: 'Master Degree',
    level: 7,
    grantsProgression: true,
  },
  {
    id: 'ct_3',
    code: 'DIPLOMA_HIGH',
    nameAr: 'الدبلوم العالي المهني',
    nameEn: 'Higher Professional Diploma',
    level: 5,
    grantsProgression: true,
  },
];

export const POSITION_TEMPLATES_CATALOG = [
  {
    id: 'pt_1',
    code: 'PRESIDENT',
    titleAr: 'رئيس الجامعة',
    titleEn: 'University President',
    category: 'EXECUTIVE',
    isLocalVariant: false,
    eligibleInstitutionTypeCodes: ['UNIVERSITY'],
  },
  {
    id: 'pt_2',
    code: 'DEAN',
    titleAr: 'عميد كلية',
    titleEn: 'Faculty Dean',
    category: 'ACADEMIC',
    isLocalVariant: false,
    eligibleInstitutionTypeCodes: ['UNIVERSITY'],
  },
  {
    id: 'pt_3',
    code: 'DEPARTMENT_HEAD',
    titleAr: 'رئيس قسم علمي',
    titleEn: 'Department Head',
    category: 'ACADEMIC',
    isLocalVariant: false,
    eligibleInstitutionTypeCodes: ['UNIVERSITY', 'HIGHER_INSTITUTE'],
  },
];

export const CRITERIA_SETS_CATALOG = [
  {
    id: 'cs_1',
    code: 'NQAAC_INST_2026',
    version: '2026.1',
    nameAr: 'معايير الاعتماد المؤسسي الوطني (الجامعات)',
    appliesTo: 'INSTITUTIONAL',
    authorityId: 'ra_2',
    isActive: true,
    items: [
      { id: 'ci_1', code: 'STD_1', titleAr: 'التخطيط الاستراتيجي والحوكمة' },
      { id: 'ci_2', code: 'STD_2', titleAr: 'البرامج الأكاديمية والتعليم والتعلم' },
      { id: 'ci_3', code: 'STD_3', titleAr: 'أعضاء هيئة التدريس والكوادر المساندة' },
    ],
  },
];

export const MY_INSTITUTION_PROFILE = {
  institution: {
    id: 'inst_ulara_demo',
    name: 'جامعة أُلارا الوطنية',
    nameEn: 'Ulara National University',
    slug: 'ulara-demo',
    status: 'ACTIVE',
    sector: 'HIGHER_EDUCATION_RESEARCH',
    ownership: 'PUBLIC',
    establishmentDecisionNumber: '2026/102',
    establishmentDecisionDate: '2026-01-15T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
    kind: {
      id: 'it_1',
      code: 'UNIVERSITY',
      nameAr: 'جامعة حكومية',
      nameEn: 'Public University',
      sector: 'HIGHER_EDUCATION_RESEARCH',
    },
    supervisingAuthority: {
      id: 'ra_1',
      code: 'MOE_HE',
      nameAr: 'وزارة التعليم العالي والبحث العلمي',
      nameEn: 'Ministry of Higher Education and Scientific Research',
    },
  },
};

export const MY_INSTITUTION_CAPABILITIES = [
  'ORG_STRUCTURE_MANAGE',
  'PEOPLE_MANAGE',
  'APPOINTMENTS_MANAGE',
  'UNIT_CAPABILITIES_ASSIGN',
  'COUNCILS_MANAGE',
  'PROGRAMS_MANAGE',
  'ACCREDITATION_MANAGE',
  'FACILITIES_MANAGE',
  'RESEARCH_PROJECTS_MANAGE',
];

export const INSTITUTION_ORG_TREE = [
  {
    id: 'unit_root',
    code: 'PRESIDENCY',
    nameAr: 'رئاسة الجامعة',
    nameEn: 'University Presidency',
    type: 'PRESIDENCY',
    parentId: null,
    children: [
      {
        id: 'unit_cs',
        code: 'FAC_IT',
        nameAr: 'كلية تقنية المعلومات',
        nameEn: 'Faculty of Information Technology',
        type: 'FACULTY',
        parentId: 'unit_root',
        children: [
          {
            id: 'unit_cs_dept',
            code: 'DEPT_SE',
            nameAr: 'قسم هندسة البرمجيات',
            nameEn: 'Department of Software Engineering',
            type: 'DEPARTMENT',
            parentId: 'unit_cs',
            children: [],
          },
        ],
      },
    ],
  },
];

type TreeSeat = { id: string; code: string; nameAr: string; type: string; parentId: string | null; children: TreeSeat[] };
type WireSeat = { unit: Omit<TreeSeat, 'children'> & { institutionId: string; status: string }; children: WireSeat[] };
function wireSeat({ children, ...unit }: TreeSeat): WireSeat {
  return { unit: { ...unit, institutionId: MY_INSTITUTION_PROFILE.institution.id, status: 'ACTIVE' }, children: children.map(wireSeat) };
}
export const INSTITUTION_WIRE_TREE = INSTITUTION_ORG_TREE.map(wireSeat);

export const INSTITUTION_PEOPLE_PAGE = {
  data: [
    {
      id: 'person_1',
      nationalId: '120010023456',
      fullNameAr: 'د. عبد السلام محمد القاضي',
      fullNameEn: 'Dr. Abdussalam M. Elkadi',
      email: 'a.elkadi@ulara.edu.ly',
      phone: '0912345678',
      status: 'ACTIVE',
      staffStatus: 'ACTIVE', category: 'ACADEMIC_STAFF',
      activeAppointmentsCount: 1,
    },
    {
      id: 'person_2',
      nationalId: '220020034567',
      fullNameAr: 'أ. فاطمة عمر الترهوني',
      fullNameEn: 'Fatima O. Al-Tarhuni',
      email: 'f.tarhuni@ulara.edu.ly',
      phone: '0923456789',
      status: 'ACTIVE',
      staffStatus: 'ACTIVE', category: 'ADMINISTRATIVE_STAFF',
      activeAppointmentsCount: 1,
    },
  ],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

export const INSTITUTION_POSITIONS_PAGE = {
  data: [
    {
      id: 'pos_inst_1',
      titleAr: 'عميد كلية تقنية المعلومات',
      templateCode: 'DEAN',
      category: 'ACADEMIC',
      orgUnit: { id: 'unit_cs', nameAr: 'كلية تقنية المعلومات' },
      incumbent: { id: 'person_1', fullNameAr: 'د. عبد السلام محمد القاضي' },
      status: 'FILLED',
      appointmentDecisionNumber: '2026/45',
      startDate: '2026-02-01',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_COUNCILS_PAGE = {
  data: [
    {
      id: 'council_1',
      code: 'UNIV_COUNCIL',
      nameAr: 'مجلس الجامعة الدائم',
      nameEn: 'University Permanent Council',
      type: 'UNIVERSITY_COUNCIL',
      status: 'ACTIVE',
      membersCount: 8,
      lastMeetingDate: '2026-11-10T10:00:00Z',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_PROGRAMS_PAGE = {
  data: [
    {
      id: 'prog_1',
      code: 'BS_SWE',
      nameAr: 'بكالوريوس هندسة البرمجيات الذكية',
      nameEn: 'B.Sc. in Intelligent Software Engineering',
      kind: 'ACADEMIC',
      orgUnit: { id: 'unit_cs', nameAr: 'كلية تقنية المعلومات' },
      durationMonths: 48,
      totalCreditHours: 136,
      status: 'ACTIVE',
      enrolledLearnersCount: 320,
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_TRAINING_PAGE = {
  data: [
    {
      id: 'trn_1',
      studentProfileId: 'lrn_1',
      student: { id: 'lrn_1', firstName: 'أحمد', lastName: 'الطرابلسي' },
      externalHost: 'شركة التقنية والاتصالات الوطنية',
      trainingTrack: 'تطوير النظم السحابية',
      status: 'ACTIVE',
      startsAt: '2026-09-01',
      endsAt: '2026-12-01',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_LEARNERS_PAGE = {
  data: [
    {
      id: 'lrn_1',
      category: 'STUDENT', learnerNumber: 'DEMO-1',
      nationalId: '120040011223',
      fullNameAr: 'أحمد محمود الطرابلسي',
      programNameAr: 'بكالوريوس هندسة البرمجيات الذكية',
      academicLevel: 'السنة الثالثة',
      status: 'ACTIVE',
      gpa: 3.82,
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_ACCREDITATION_PAGE = {
  data: [
    {
      id: 'acc_1',
      type: 'INTERNAL_SELF_ASSESSMENT',
      titleAr: 'التقييم الذاتي السنوي لكلية تقنية المعلومات 2026',
      criteriaSetCode: 'NQAAC_INST_2026',
      status: 'COMPLETED',
      scorePercent: 92.5,
      date: '2026-10-15',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_LICENSES_PAGE = {
  data: [
    {
      id: 'lic_1',
      licenseNumber: 'LIC-2026-LY-0092',
      issuingAuthority: 'وزارة التعليم العالي والبحث العلمي',
      titleAr: 'ترخيص تشغيل المقر الرئيسي والمختبرات التقنية',
      issuedAt: '2026-01-01',
      expiresAt: '2029-01-01',
      kind: 'OPERATING_PERMIT', status: 'ACTIVE',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_FACILITIES_PAGE = {
  data: [
    {
      id: 'fac_1',
      nameAr: 'مختبر الذكاء الاصطناعي وهندسة الحوسبة',
      code: 'LAB_AI_101',
      building: 'مبنى الخوارزمي',
      capacity: 35,
      type: 'LABORATORY', status: 'ACTIVE',
      equipmentCount: 35,
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

export const INSTITUTION_RESEARCH_PAGE = {
  data: [
    {
      id: 'res_proj_1',
      titleAr: 'تطوير النماذج التوليدية لمعالجة اللغة العربية واللهجات المغاربية',
      principalInvestigator: 'د. عبد السلام محمد القاضي',
      budget: 85000,
      currency: 'LYD',
      status: 'ACTIVE',
      startDate: '2026-03-01',
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};
