/**
 * r352-visual-capture.e2e.ts — the workspace's visual verification
 * pass: real screenshots at the four pinned viewports in both themes
 * (the task's required visual matrix), plus the 360px horizontal-
 * overflow assertion on every section.
 *
 * NOT part of the CI e2e suite — a capture instrument; screenshots
 * land in docs/redesign/r352/institutional-frontend/screenshots/.
 */
import { test as base, expect } from './fixtures/e2e';
import { installStatefulApi, statefulOk, statefulJson } from './fixtures/mock-transport';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/redesign/r352/institutional-frontend/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const NOW = '2026-11-22T08:00:00.000Z';

const INSTITUTION = {
  institution: {
    id: 'inst-r352-e2e', name: 'الكلية التقنية الوسطى', nameEn: 'Middle Technical College',
    slug: 'mtc', status: 'ACTIVE', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL',
    kind: { id: 'k-1', code: 'TECHNICAL_COLLEGE', nameAr: 'كلية تقنية' },
    ownership: 'PUBLIC',
    supervisingAuthority: { id: 'a-1', code: 'QA-LY', nameAr: 'المركز الوطني لضمان الجودة واعتماد المؤسسات التعليمية والتدريبية' },
    establishmentDecisionNumber: 'قرار مجلس الوزراء 512/2019',
    establishmentDecisionDate: '2019-03-10',
    parentId: null, createdAt: NOW, updatedAt: NOW,
  },
};

const EMPTY_PAGED = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

// noUncheckedIndexedAccess: the referenced rows are NAMED constants
// (byte-identical object graph) so the route fixtures below never
// index into possibly-undefined arrays.
const CS_UNIT = {
  id: 'unit-cs', institutionId: 'i', parentId: 'unit-deanery', code: 'CS',
  nameAr: 'قسم تقنية المعلومات والشبكات', nameEn: 'IT & Networks', type: 'SCIENTIFIC_DEPARTMENT',
  status: 'ACTIVE', sortOrder: 1, location: 'مبنى ب', contactEmail: null, contactPhone: null,
  createdAt: NOW, updatedAt: NOW, children: [],
};
const ADMIN_UNIT = {
  id: 'unit-admin', institutionId: 'i', parentId: 'unit-deanery', code: 'ADM',
  nameAr: 'الإدارة العامة للشؤون الإدارية والمالية', nameEn: null,
  type: 'GENERAL_ADMINISTRATION', status: 'ACTIVE', sortOrder: 2, location: null,
  contactEmail: null, contactPhone: null, createdAt: NOW, updatedAt: NOW, children: [],
};
const LAB_UNIT = {
  id: 'unit-lab', institutionId: 'i', parentId: 'unit-deanery', code: 'LAB1',
  nameAr: 'معمل الشبكات والاتصالات المتقدم', nameEn: null, type: 'LABORATORY',
  status: 'ACTIVE', sortOrder: 3, location: 'مبنى ج — الطابق الأول', contactEmail: null,
  contactPhone: null, createdAt: NOW, updatedAt: NOW, children: [],
};
const WORKSHOP_UNIT = {
  id: 'unit-workshop', institutionId: 'i', parentId: 'unit-deanery', code: 'W1',
  nameAr: 'ورشة التكييف والتبريد', nameEn: null, type: 'WORKSHOP', status: 'ACTIVE',
  sortOrder: 4, location: null, contactEmail: null, contactPhone: null,
  createdAt: NOW, updatedAt: NOW, children: [],
};
const DEANERY = {
  id: 'unit-deanery', institutionId: 'i', parentId: null, code: 'DEANERY',
  nameAr: 'عمادة الكلية التقنية الوسطى', nameEn: null, type: 'OFFICE', status: 'ACTIVE',
  sortOrder: 1, location: 'طرابلس — المقر الرئيسي', contactEmail: 'deanery@mtc.edu.ly',
  contactPhone: null, createdAt: NOW, updatedAt: NOW,
  children: [CS_UNIT, ADMIN_UNIT, LAB_UNIT, WORKSHOP_UNIT],
};
const TREE = [DEANERY];

const PEOPLE = {
  data: [
    { id: 'p-1', institutionId: 'i', userId: null, staffNumber: 'T-101', fullNameAr: 'أ.د. سالم محمد العميد', fullNameEn: 'Salim Al-Ameed', category: 'ACADEMIC_STAFF', primaryOrgUnitId: 'unit-deanery', staffStatus: 'ACTIVE', hiredAt: '2012-09-01', endedAt: null, email: 's.alameed@mtc.edu.ly', phone: null, createdAt: NOW, updatedAt: NOW },
    { id: 'p-2', institutionId: 'i', userId: null, staffNumber: 'T-102', fullNameAr: 'م. ليلى عبدالسلام الفيتوري', fullNameEn: null, category: 'TRAINER', primaryOrgUnitId: 'unit-lab', staffStatus: 'ACTIVE', hiredAt: '2018-02-01', endedAt: null, email: null, phone: null, createdAt: NOW, updatedAt: NOW },
    { id: 'p-3', institutionId: 'i', userId: null, staffNumber: 'A-201', fullNameAr: 'أ. خالد المبروك الدرسي', fullNameEn: null, category: 'ADMINISTRATIVE_STAFF', primaryOrgUnitId: 'unit-admin', staffStatus: 'ACTIVE', hiredAt: '2015-06-15', endedAt: null, email: null, phone: null, createdAt: NOW, updatedAt: NOW },
    { id: 'p-4', institutionId: 'i', userId: null, staffNumber: 'T-103', fullNameAr: 'أ. نجاة إبراهيم الوافي', fullNameEn: null, category: 'TECHNICAL_GUIDE', primaryOrgUnitId: 'unit-workshop', staffStatus: 'ON_LEAVE', hiredAt: '2019-10-01', endedAt: null, email: null, phone: null, createdAt: NOW, updatedAt: NOW },
  ],
  meta: { page: 1, limit: 20, total: 4, totalPages: 1 },
};

const COUNCILS = {
  data: [
    { id: 'c-1', institutionId: 'i', orgUnitId: null, code: 'SCI', nameAr: 'المجلس العلمي للكلية', nameEn: null, type: 'SCIENTIFIC_COUNCIL', legalBasis: 'قانون 21/2023 م20', charterRef: 'لائحة المجالس 2021', establishedAt: '2020-01-15', dissolvedAt: null, status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: 'c-2', institutionId: 'i', orgUnitId: null, code: 'DISC', nameAr: 'مجلس التأديب', nameEn: null, type: 'DISCIPLINARY_COUNCIL', legalBasis: 'اللائحة الداخلية لمعاهد التقنية العليا — الفصل التأديبي', charterRef: null, establishedAt: '2021-03-01', dissolvedAt: null, status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

const LICENSES = {
  data: [
    { id: 'l-1', institutionId: 'i', authorityId: 'a-1', kind: 'TECHNICAL_LICENSE', licenseNumber: 'TL-2019-512', scopeType: 'INSTITUTION', orgUnitId: null, programId: null, issuedAt: '2019-05-01', expiresAt: '2027-05-01', status: 'ACTIVE', conditions: 'التزام بمعايير المركز الوطني في كل دورة مراجعة', documentRef: null, notes: null, authority: { id: 'a-1', code: 'QA-LY', nameAr: 'المركز الوطني لضمان الجودة' } },
    { id: 'l-2', institutionId: 'i', authorityId: 'a-1', kind: 'OPERATING_PERMIT', licenseNumber: 'OP-2024-118', scopeType: 'INSTITUTION', orgUnitId: null, programId: null, issuedAt: '2024-01-10', expiresAt: '2026-12-31', status: 'RENEWED', conditions: null, documentRef: null, notes: null, authority: { id: 'a-1', code: 'QA-LY', nameAr: 'المركز الوطني لضمان الجودة' } },
  ],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

const CAPS = [
  'ORG_STRUCTURE_MANAGE', 'PEOPLE_MANAGE', 'APPOINTMENTS_MANAGE', 'COUNCILS_MANAGE',
  'PROGRAMS_MANAGE', 'CREDENTIALS_MANAGE', 'ACCREDITATION_MANAGE', 'FACILITIES_MANAGE',
  'RESEARCH_PROJECTS_MANAGE', 'UNIT_CAPABILITIES_ASSIGN',
];

async function installFullApi(page: import('@playwright/test').Page) {
  // widen the fixture's ADMIN session with the r352 institution context
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('ula-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.version = 1;
        parsed.state.memberships = [{ institutionId: 'i', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc', role: 'ADMIN', isActive: true }];
        parsed.state.currentInstitution = { id: 'i', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc' };
        parsed.state.membershipRole = 'ADMIN';
        localStorage.setItem('ula-auth', JSON.stringify(parsed));
      }
    } catch { /* guest fallback */ }
  });
  await installStatefulApi(page, [
    {
      method: 'GET', pattern: '**/api/v1/auth/me',
      fulfill: (ctx) => statefulOk(ctx.route, {
        id: 'u1', email: 'admin@mtc.edu.ly', firstName: 'سالم', lastName: 'القرضابي',
        role: 'ADMIN', avatarColor: '#059669', avatarInitials: 'سق', scopeFacultyId: null,
        themePreference: 'SYSTEM', themePreferenceUpdatedAt: NOW, onboardingCompletedAt: NOW,
        firedMilestones: [],
        memberships: [{ institutionId: 'i', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc', role: 'ADMIN', isActive: true }],
        currentInstitution: { id: 'i', name: 'الكلية التقنية الوسطى', nameEn: null, slug: 'mtc' },
        membershipRole: 'ADMIN',
      }),
    },
    { method: 'GET', pattern: '**/api/v1/institutions/me/profile', fulfill: (ctx) => statefulOk(ctx.route, INSTITUTION) },
    { method: 'GET', pattern: '**/api/v1/me/permissions', fulfill: (ctx) => statefulOk(ctx.route, { role: 'ADMIN', capabilities: CAPS, roleDefaults: CAPS, membershipRole: 'ADMIN' }) },
    { method: 'GET', pattern: '**/api/v1/me/unit-capabilities', fulfill: (ctx) => statefulOk(ctx.route, []) },
    { method: 'GET', pattern: '**/api/v1/institutional/org-units/tree', fulfill: (ctx) => statefulOk(ctx.route, TREE) },
    { method: 'GET', pattern: '**/api/v1/institutional/org-units/unit-cs', fulfill: (ctx) => statefulOk(ctx.route, { unit: CS_UNIT, ancestors: [DEANERY] }) },
    { method: 'GET', pattern: '**/api/v1/institutional/org-units?**', fulfill: (ctx) => statefulJson(ctx.route, 200, { data: DEANERY.children, meta: { page: 1, limit: 20, total: 4, totalPages: 1 } }) },
    { method: 'GET', pattern: '**/api/v1/institutional/people?**', fulfill: (ctx) => statefulJson(ctx.route, 200, PEOPLE) },
    { method: 'GET', pattern: '**/api/v1/governance/councils?**', fulfill: (ctx) => statefulJson(ctx.route, 200, COUNCILS) },
    { method: 'GET', pattern: '**/api/v1/compliance/licenses?**', fulfill: (ctx) => statefulJson(ctx.route, 200, LICENSES) },
    { method: 'GET', pattern: '**/api/v1/catalog/institution-types', fulfill: (ctx) => statefulOk(ctx.route, [
      { id: 't1', code: 'TECHNICAL_COLLEGE', sector: 'TECHNICAL_VOCATIONAL_PROFESSIONAL', nameAr: 'كلية تقنية', nameEn: 'Technical College', isIndependentLegalPersonality: true, legalBasis: 'قانون 21/2023', defaultAuthorityId: 'a-1' },
    ]) },
    { method: 'GET', pattern: '**/api/v1/catalog/regulatory-authorities', fulfill: (ctx) => statefulOk(ctx.route, [
      { id: 'a-1', code: 'QA-LY', nameAr: 'المركز الوطني لضمان الجودة واعتماد المؤسسات التعليمية والتدريبية', nameEn: 'QAA', kind: 'ACCREDITATION' },
    ]) },
    { method: 'GET', pattern: '**/api/v1/catalog/credential-types', fulfill: (ctx) => statefulOk(ctx.route, [
      { id: 'ct-1', code: 'VOCATIONAL_TRAINING_CERT', nameAr: 'شهادة التدريب المهني', nameEn: null, level: 1, grantsProgression: false, legalBasis: 'قانون 21/2023 م5' },
      { id: 'ct-2', code: 'INTERMEDIATE_TECHNICAL_DIPLOMA', nameAr: 'الدبلوم الفني المتوسط', nameEn: null, level: 2, grantsProgression: true, legalBasis: 'قانون 21/2023 م5' },
      { id: 'ct-3', code: 'HIGHER_TECHNICAL_DIPLOMA', nameAr: 'الدبلوم التقني العالي', nameEn: null, level: 3, grantsProgression: true, legalBasis: 'قانون 21/2023 م5' },
      { id: 'ct-4', code: 'TECHNICAL_BACHELOR', nameAr: 'البكالوريوس التقني', nameEn: null, level: 4, grantsProgression: true, legalBasis: 'قانون 21/2023 م5' },
    ]) },
    { method: 'GET', pattern: '**/api/v1/catalog/position-templates', fulfill: (ctx) => statefulOk(ctx.route, [
      { id: 'pt-1', code: 'TECH_COLLEGE_DEAN', titleAr: 'عميد الكلية التقنية', titleEn: null, category: 'FACULTY_LEADERSHIP', scopeRequirement: null, eligibleInstitutionTypeCodes: ['TECHNICAL_COLLEGE'], isLocalVariant: false, institutionId: null },
      { id: 'pt-2', code: 'DEPT_HEAD', titleAr: 'رئيس قسم علمي', titleEn: null, category: 'DEPARTMENT_LEADERSHIP', scopeRequirement: 'SCIENTIFIC_DEPARTMENT', eligibleInstitutionTypeCodes: [], isLocalVariant: false, institutionId: null },
    ]) },
    { method: 'GET', pattern: '**/api/v1/catalog/accreditation-criteria-sets', fulfill: (ctx) => statefulOk(ctx.route, [
      { id: 'cs-1', code: 'NC-INST', version: '2026', nameAr: 'معايير الاعتماد المؤسسي لمؤسسات التعليم التقني', appliesTo: 'INSTITUTIONAL', authorityId: 'a-1', isActive: true, items: [
        { id: 'ci-1', code: 'S1', titleAr: 'التخطيط' }, { id: 'ci-2', code: 'S2', titleAr: 'القيادة والحوكمة' },
        { id: 'ci-3', code: 'S3', titleAr: 'البرامج التعليمية والتدريبية' }, { id: 'ci-4', code: 'S4', titleAr: 'هيئة التدريس والمدربين' },
      ] },
    ]) },
    // the remaining module reads answer empty (their own screenshots show the honest empty states)
    { method: 'GET', pattern: '**/api/v1/academic/**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
    { method: 'GET', pattern: '**/api/v1/compliance/**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
    { method: 'GET', pattern: '**/api/v1/operations/**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
    { method: 'GET', pattern: '**/api/v1/research-projects?**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
    { method: 'GET', pattern: '**/api/v1/research-outputs?**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
    { method: 'GET', pattern: '**/api/v1/institutional/appointments?**', fulfill: (ctx) => statefulJson(ctx.route, 200, EMPTY_PAGED) },
  ]);
}

const SECTIONS: Array<[string, string]> = [
  ['overview', '/institution'],
  ['organization', '/institution/organization'],
  ['people', '/institution/people'],
  ['positions', '/institution/positions'],
  ['access', '/institution/access'],
  ['councils', '/institution/councils'],
  ['programs', '/institution/programs'],
  ['training', '/institution/training'],
  ['students', '/institution/students'],
  ['quality', '/institution/quality'],
  ['licenses', '/institution/licenses'],
  ['facilities', '/institution/facilities'],
  ['research', '/institution/research'],
];

const VIEWPORTS: Array<[string, { width: number; height: number }]> = [
  ['1440', { width: 1440, height: 900 }],
  ['820', { width: 820, height: 1180 }],
  ['390', { width: 390, height: 844 }],
  ['360', { width: 360, height: 780 }],
];

base.describe('r352 visual capture (dev instrument — not CI)', () => {
  // One suite per (viewport, theme): the fixture provides the hermetic
  // transport (every non-institutional call answered — nothing hangs),
  // the ADMIN session and the seeded theme.
  function captureSuite(width: string, vp: { width: number; height: number }, theme: 'light' | 'dark') {
    base.describe(`${width}px ${theme}`, () => {
      base.use({ e2eRole: 'ADMIN', viewport: vp, themeSeed: theme });
      base.setTimeout(300_000);
      base('every section', async ({ page }) => {
        await installFullApi(page);
        for (const [name, route] of SECTIONS) {
          await page.goto(route);
          // paint-settle: fonts.ready + two rAF ticks + a beat —
          // headless compositing can otherwise race the first paint
          // after a route mount (measured: intermittent blank frames).
          await page.evaluate(() =>
            (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(
              () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))),
            ) ?? Promise.resolve());
          await page.waitForTimeout(450);
          await page.screenshot({
            path: path.join(OUT, `${name}-${width}-${theme}.png`),
            fullPage: width === '1440',
          });
          if (width === '360' || width === '390') {
            const overflow = await page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(overflow, `${name} @${width} must not overflow horizontally`).toBeLessThanOrEqual(0);
          }
        }
      });
    });
  }

  for (const [width, vp] of VIEWPORTS) {
    captureSuite(width, vp, 'light');
    captureSuite(width, vp, 'dark');
  }
});
