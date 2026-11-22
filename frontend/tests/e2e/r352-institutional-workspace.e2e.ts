/**
 * r352-institutional-workspace.e2e.ts — the Institutional Operating
 * Workspace's hermetic journey: the real router, real hooks, real
 * stores, real render tree against the mock transport (the suite's
 * established pattern), only the /api/v1 wire is fixed.
 *
 * Journey pins (the golden cross-screen path):
 *  1. /institution boots with the ADMIN session and the institution
 *     context seeded — the rail renders the kind-aware section set
 *     and the masthead shows the institution's own kind.
 *  2. The organization tree renders the real hierarchy (faculty →
 *     scientific department) from GET /institutional/org-units/tree.
 *  3. The write affordance appears ONLY after /me/permissions answers
 *     with ORG_STRUCTURE_MANAGE (server-authoritative gating).
 *  4. A capability-less QUALITY session reads the same surface with
 *     zero write affordances (the deny path renders, not a redirect).
 *  5. Councils list → council detail → meeting detail walks the
 *     governance depth: memberships, agenda, minutes draft state.
 *
 * Fixtures mirror the backend contract's envelopes exactly
 * ({ data } / { data, meta }), field-for-field.
 */
import { test, expect } from './fixtures/e2e';
import {
  installStatefulApi, statefulOk, statefulJson,
} from './fixtures/mock-transport';
import type { Page } from '@playwright/test';

const NOW = '2026-11-22T08:00:00.000Z';

const INSTITUTION = {
  institution: {
    id: 'inst-r352-e2e',
    name: 'الكلية التقنية الوسطى',
    nameEn: 'Middle Technical College',
    slug: 'mtc',
    status: 'ACTIVE',
    sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL',
    kind: { id: 'k-1', code: 'TECHNICAL_COLLEGE', nameAr: 'كلية تقنية' },
    ownership: 'PUBLIC',
    supervisingAuthority: { id: 'a-1', code: 'QA-LY', nameAr: 'المركز الوطني لضمان الجودة' },
    establishmentDecisionNumber: 'قرار 512/2019',
    establishmentDecisionDate: '2019-03-10',
    parentId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
};

const PROFILE_PAGE = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const TREE_PARTS = (() => {
  // noUncheckedIndexedAccess: the referenced rows are NAMED constants
  // (byte-identical object graph) so the route fixtures below never
  // index into possibly-undefined arrays.
  const CS_UNIT = {
    id: 'unit-cs',
    institutionId: 'inst-r352-e2e',
    parentId: 'unit-deanery',
    code: 'CS',
    nameAr: 'قسم تقنية الحاسب',
    nameEn: null,
    type: 'SCIENTIFIC_DEPARTMENT',
    status: 'ACTIVE',
    sortOrder: 1,
    location: null,
    contactEmail: null,
    contactPhone: null,
    createdAt: NOW,
    updatedAt: NOW,
    children: [],
  };
  const LAB_UNIT = {
    id: 'unit-lab',
    institutionId: 'inst-r352-e2e',
    parentId: 'unit-deanery',
    code: 'LAB1',
    nameAr: 'معمل الشبكات',
    nameEn: null,
    type: 'LABORATORY',
    status: 'ACTIVE',
    sortOrder: 2,
    location: null,
    contactEmail: null,
    contactPhone: null,
    createdAt: NOW,
    updatedAt: NOW,
    children: [],
  };
  const DEANERY = {
    id: 'unit-deanery',
    institutionId: 'inst-r352-e2e',
    parentId: null,
    code: 'DEANERY',
    nameAr: 'عمادة الكلية',
    nameEn: null,
    type: 'OFFICE',
    status: 'ACTIVE',
    sortOrder: 1,
    location: 'طرابلس',
    contactEmail: null,
    contactPhone: null,
    createdAt: NOW,
    updatedAt: NOW,
    children: [CS_UNIT, LAB_UNIT],
  };
  return { TREE: [DEANERY], CS_UNIT, DEANERY };
})();
const { TREE, CS_UNIT, DEANERY } = TREE_PARTS;

const COUNCILS_PAGE = {
  data: [
    {
      id: 'council-sci',
      institutionId: 'inst-r352-e2e',
      orgUnitId: null,
      code: 'SCI',
      nameAr: 'المجلس العلمي للكلية',
      nameEn: null,
      type: 'SCIENTIFIC_COUNCIL',
      legalBasis: 'قانون 21/2023 م20',
      charterRef: null,
      establishedAt: '2020-01-01',
      dissolvedAt: null,
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const COUNCIL_DETAIL = {
  ...COUNCILS_PAGE.data[0],
  memberships: [
    {
      id: 'cm-1', councilId: 'council-sci', personId: 'p-dean',
      role: 'CHAIR', startDate: '2024-01-01', endDate: null,
      decisionRef: 'تكليف 3/2024', status: 'ACTIVE',
      person: { id: 'p-dean', fullNameAr: 'د. سالم العميد' },
    },
    {
      id: 'cm-2', councilId: 'council-sci', personId: 'p-sec',
      role: 'SECRETARY', startDate: '2024-01-01', endDate: null,
      decisionRef: null, status: 'ACTIVE',
      person: { id: 'p-sec', fullNameAr: 'أ. فاطمة الأمينة' },
    },
  ],
};

const MEETINGS = [
  {
    id: 'meeting-1', councilId: 'council-sci', seqNumber: 4,
    scheduledAt: '2026-11-20T10:00:00.000Z', location: 'قاعة المجلس',
    status: 'HELD', agendaSummary: 'مناقشة خطط 2027', createdAt: NOW, updatedAt: NOW,
  },
];

const MEETING_DETAIL = {
  meeting: MEETINGS[0],
  agendaItems: [
    { id: 'ag-1', meetingId: 'meeting-1', orderNo: 1, titleAr: 'خطط 2027 المقترحة', description: null, status: 'DISCUSSED' },
  ],
  attendance: [
    { id: 'at-1', meetingId: 'meeting-1', personId: 'p-dean', status: 'PRESENT', person: { id: 'p-dean', fullNameAr: 'د. سالم العميد' } },
  ],
  resolutions: [
    {
      id: 'res-1', meetingId: 'meeting-1', agendaItemId: 'ag-1', number: '1/2026',
      kind: 'RESOLUTION', textAr: 'اعتماد خطة 2027 بعد التعديلات', status: 'APPROVED',
      approvedAt: NOW, dueDate: null, ownerPersonId: null, completionRef: null, completedAt: null,
    },
  ],
  minutes: {
    id: 'min-1', meetingId: 'meeting-1', versionNo: 1,
    contentAr: 'افتُتح الاجتماع بحضور الأعضاء…', status: 'DRAFT',
    approvedAt: null, approvedByPersonId: null, signedAt: null, signedByPersonId: null,
  },
};

const PEOPLE_PAGE = {
  data: [
    {
      id: 'p-dean', institutionId: 'inst-r352-e2e', userId: null, staffNumber: '101',
      fullNameAr: 'د. سالم العميد', fullNameEn: null, category: 'ACADEMIC_STAFF',
      primaryOrgUnitId: 'unit-deanery', staffStatus: 'ACTIVE', hiredAt: '2015-09-01',
      endedAt: null, email: null, phone: null, createdAt: NOW, updatedAt: NOW,
    },
    {
      id: 'p-trainer', institutionId: 'inst-r352-e2e', userId: null, staffNumber: '102',
      fullNameAr: 'م. ليلى المدربة', fullNameEn: null, category: 'TRAINER',
      primaryOrgUnitId: 'unit-lab', staffStatus: 'ACTIVE', hiredAt: '2019-02-01',
      endedAt: null, email: null, phone: null, createdAt: NOW, updatedAt: NOW,
    },
  ],
  meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
};


/** Rewrites the seeded `ula-auth` with the r352 institution context
 * (memberships + currentInstitution) — the workspace's queries are
 * scope-gated, so the journey needs a selected institution. */
async function seedInstitutionContext(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('ula-auth');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state: Record<string, unknown>; version: number };
      // v1 shape — a v0 payload would run the store's migration which
      // resets the institution context to the honest contextless state
      parsed.version = 1;
      parsed.state.memberships = [{
        institutionId: 'inst-r352-e2e',
        name: 'الكلية التقنية الوسطى',
        nameEn: null,
        slug: 'mtc',
        role: 'ADMIN',
        isActive: true,
      }];
      parsed.state.currentInstitution = {
        id: 'inst-r352-e2e', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc',
      };
      parsed.state.membershipRole = 'ADMIN';
      localStorage.setItem('ula-auth', JSON.stringify(parsed));
    } catch { /* storage unavailable — guest fallback */ }
  });
}

/** The full institutional wire the journey touches. `caps` switches
 * the /me/permissions answer (the deny path reuses the same routes). */
async function installInstitutionalApi(page: Page, caps: string[]) {
  await seedInstitutionContext(page);
  return installStatefulApi(page, [
    {
      // r178: /auth/me re-resolves the session WITH the institution
      // context — the boot refresher would otherwise reset the seeded
      // context to the contextless default.
      method: 'GET',
      pattern: '**/api/v1/auth/me',
      fulfill: (ctx) => statefulOk(ctx.route, {
        id: 'usr_e2e_admin',
        email: 'admin@zu.edu.ly',
        firstName: 'سالم',
        lastName: 'القرضابي',
        role: 'ADMIN',
        avatarColor: '#059669',
        avatarInitials: 'سق',
        scopeFacultyId: null,
        themePreference: 'SYSTEM',
        themePreferenceUpdatedAt: NOW,
        onboardingCompletedAt: NOW,
        firedMilestones: [],
        memberships: [{
          institutionId: 'inst-r352-e2e',
          name: 'الكلية التقنية الوسطى',
          nameEn: null,
          slug: 'mtc',
          role: 'ADMIN',
          isActive: true,
        }],
        currentInstitution: {
          id: 'inst-r352-e2e', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc',
        },
        membershipRole: 'ADMIN',
      }),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutions/me/profile',
      fulfill: (ctx) => statefulOk(ctx.route, INSTITUTION),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/me/permissions',
      fulfill: (ctx) => statefulOk(ctx.route, {
        role: 'ADMIN', capabilities: caps, roleDefaults: caps, membershipRole: 'ADMIN',
      }),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutional/org-units/tree',
      fulfill: (ctx) => statefulOk(ctx.route, TREE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutional/org-units/unit-cs',
      fulfill: (ctx) => statefulOk(ctx.route, {
        unit: CS_UNIT,
        ancestors: [DEANERY],
      }),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutional/org-units?**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutional/org-units',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/institutional/people?**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PEOPLE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/governance/councils?**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, COUNCILS_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/governance/councils/council-sci',
      fulfill: (ctx) => statefulOk(ctx.route, COUNCIL_DETAIL),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/governance/councils/council-sci/meetings',
      fulfill: (ctx) => statefulOk(ctx.route, MEETINGS),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/governance/meetings/meeting-1',
      fulfill: (ctx) => statefulOk(ctx.route, MEETING_DETAIL),
    },
    // every other institutional read the rail pages fire answers empty
    {
      method: 'GET',
      pattern: '**/api/v1/compliance/**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/operations/**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/academic/**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/research-projects?**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/research-outputs?**',
      fulfill: (ctx) => statefulJson(ctx.route, 200, PROFILE_PAGE),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/me/unit-capabilities',
      fulfill: (ctx) => statefulOk(ctx.route, []),
    },
    {
      method: 'GET',
      pattern: '**/api/v1/catalog/**',
      fulfill: (ctx) => statefulOk(ctx.route, []),
    },
  ]);
}

test.use({ e2eRole: 'ADMIN' });

test.describe('r352 — the institutional workspace journey (hermetic)', () => {
  test('the workspace boots with the kind-aware rail and the institution masthead', async ({ page }) => {
    await installInstitutionalApi(page, ['ORG_STRUCTURE_MANAGE']);
    await page.goto('/institution');

    // the masthead names the institution's KIND (from the profile) —
    // never product branding
    await expect(page.getByText('كلية تقنية', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'نظرة عامة على المؤسسة' })).toBeVisible();

    // the rail carries the full section set for a technical college
    const rail = page.getByRole('navigation', { name: 'أقسام مساحة العمل المؤسسية' });
    for (const label of ['الهيكل التنظيمي', 'الأفراد والكوادر', 'المجالس واللجان', 'البحث المؤسسي']) {
      await expect(rail.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('the organization tree renders the real hierarchy and the unit detail', async ({ page }) => {
    await installInstitutionalApi(page, ['ORG_STRUCTURE_MANAGE']);
    await page.goto('/institution/organization');

    await expect(page.getByRole('heading', { name: 'الهيكل التنظيمي' })).toBeVisible();
    await expect(page.getByRole('tree', { name: 'شجرة الوحدات التنظيمية' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'طي عمادة الكلية' })).toBeVisible();

    // the write affordance is present (the capability IS granted)
    await expect(page.getByRole('button', { name: /وحدة جديدة/ })).toBeVisible();

    // select the department → the detail panel with its ancestors path
    await page.locator('.inst-tree-node').filter({ hasText: 'قسم تقنية الحاسب' }).click();
    await expect(page.locator('.inst-crumb', { hasText: 'عمادة الكلية' })).toBeVisible();
  });

  test('a capability-less session reads the same surface with zero write affordances', async ({ page }) => {
    await installInstitutionalApi(page, []);
    await page.goto('/institution/organization');

    await expect(page.getByRole('heading', { name: 'الهيكل التنظيمي' })).toBeVisible();
    await expect(page.getByRole('tree', { name: 'شجرة الوحدات التنظيمية' })).toBeVisible();
    // no create button — the server's capability set is the authority
    await expect(page.getByRole('button', { name: /وحدة جديدة/ })).toHaveCount(0);
  });

  test('the governance depth: councils → council → meeting with its minutes draft', async ({ page }) => {
    await installInstitutionalApi(page, ['COUNCILS_MANAGE']);
    await page.goto('/institution/councils');

    await expect(page.getByRole('table', { name: 'قائمة المجالس واللجان' })).toBeVisible();
    await expect(page.getByText('المجلس العلمي للكلية')).toBeVisible();

    // → council detail
    await page.getByRole('row').filter({ hasText: 'المجلس العلمي للكلية' }).click();
    await expect(page.getByText('د. سالم العميد').first()).toBeVisible();
    await expect(page.getByText('أ. فاطمة الأمينة').first()).toBeVisible();

    // → meeting detail (the numbered section grammar)
    await page.getByRole('row').filter({ hasText: 'قاعة المجلس' }).click();
    await expect(page.getByText('١ · التحضير — جدول الأعمال')).toBeVisible();
    await expect(page.getByText('خطط 2027 المقترحة')).toBeVisible();
    await expect(page.getByText('اعتماد خطة 2027 بعد التعديلات')).toBeVisible();
    // the minutes draft renders read-only with its DRAFT chip
    await expect(page.getByText('افتُتح الاجتماع بحضور الأعضاء…')).toBeVisible();
  });

  test('a server 403 on the profile surfaces the honest permission panel (backend is authoritative)', async ({ page }) => {
    // the base session stays healthy; ONLY the profile endpoint refuses
    await installInstitutionalApi(page, []);
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/institutions/me/profile',
        fulfill: (ctx) => statefulJson(ctx.route, 403, {
          error: { code: 'FORBIDDEN', message: 'لا تملك صلاحية الوصول للمؤسسة المحددة' },
        }),
      },
    ]);
    await page.goto('/institution');
    await expect(page.getByText('لا تملك صلاحية الوصول').first()).toBeVisible();
  });
});
