/**
 * r365-capture.e2e.ts — the r365 baseline/verification CAPTURE HARNESS.
 *
 * Not a behaviour test: it drives every authenticated route in
 * docs/redesign/r365/route-map.md through the hermetic fixtures
 * (installMockApi + seedSession via the shared e2e fixture) and saves
 * full-page screenshots for the side-by-side fidelity loop. Screenshots
 * land OUTSIDE the repo by default (R365_OUT) — evidence sheets, not
 * tree content.
 *
 * Opt-in only: skipped unless R365_CAPTURE=1 (never runs in CI/verify).
 * Knobs:
 *   R365_CAPTURE=1        enable
 *   R365_OUT=/home/z/r365-shots   output directory
 *   R365_SET=dash|matrix  dash = 5 role dashboards; matrix = the sweep
 *   R365_THEME=light|dark|both
 *   R365_VP=desktop|phone|both
 *   R365_GREP             extra grep filter forwarded to the runner
 */
import { test, expect } from './fixtures/e2e';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CAPTURE = process.env.R365_CAPTURE === '1';
const OUT = process.env.R365_OUT ?? '/home/z/r365-shots';
const SET = process.env.R365_SET ?? 'dash';
const THEMES = (process.env.R365_THEME ?? 'light') as 'light' | 'dark' | 'both';
const VPS = (process.env.R365_VP ?? 'desktop') as 'desktop' | 'phone' | 'both';

interface Shot {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';
  path: string;
  name: string;
}

const DASH: Shot[] = [
  { role: 'STUDENT', path: '/student/dashboard', name: 'student-dashboard' },
  { role: 'TEACHER', path: '/teacher/dashboard', name: 'teacher-dashboard' },
  { role: 'ADMIN', path: '/admin/dashboard', name: 'admin-dashboard' },
  { role: 'QUALITY', path: '/quality/dashboard', name: 'quality-dashboard' },
  { role: 'OWNER', path: '/owner/dashboard', name: 'owner-dashboard' },
];

const MATRIX: Shot[] = [
  // student
  { role: 'STUDENT', path: '/student/courses', name: 'student-courses' },
  { role: 'STUDENT', path: '/student/results', name: 'student-results' },
  { role: 'STUDENT', path: '/student/online-exams', name: 'student-online-exams' },
  { role: 'STUDENT', path: '/student/matrix', name: 'student-matrix' },
  { role: 'STUDENT', path: '/student/schedule', name: 'student-schedule' },
  { role: 'STUDENT', path: '/student/calendar', name: 'student-calendar' },
  { role: 'STUDENT', path: '/student/library', name: 'student-library' },
  { role: 'STUDENT', path: '/student/research', name: 'student-research' },
  { role: 'STUDENT', path: '/student/ai', name: 'student-ai' },
  { role: 'STUDENT', path: '/student/labs', name: 'student-labs' },
  { role: 'STUDENT', path: '/student/live', name: 'student-live' },
  { role: 'STUDENT', path: '/student/catalog', name: 'student-catalog' },
  { role: 'STUDENT', path: '/student/gamification', name: 'student-gamification' },
  { role: 'STUDENT', path: '/student/skills', name: 'student-skills' },
  { role: 'STUDENT', path: '/student/mooc', name: 'student-mooc' },
  { role: 'STUDENT', path: '/student/webinars', name: 'student-webinars' },
  { role: 'STUDENT', path: '/student/social', name: 'student-social' },
  { role: 'STUDENT', path: '/student/jobs', name: 'student-jobs' },
  { role: 'STUDENT', path: '/student/profile', name: 'student-profile' },
  { role: 'STUDENT', path: '/student/messages', name: 'student-messages' },
  { role: 'STUDENT', path: '/student/alerts', name: 'student-alerts' },
  { role: 'STUDENT', path: '/student/payment', name: 'student-payment' },
  { role: 'STUDENT', path: '/student/university', name: 'student-university' },
  { role: 'STUDENT', path: '/student/map', name: 'student-map' },
  { role: 'STUDENT', path: '/student/downloads', name: 'student-downloads' },
  { role: 'STUDENT', path: '/student/ar', name: 'student-ar' },
  // shared (student boot)
  { role: 'STUDENT', path: '/settings', name: 'shared-settings' },
  { role: 'STUDENT', path: '/community', name: 'shared-community' },
  { role: 'STUDENT', path: '/competitions', name: 'shared-competitions' },
  { role: 'STUDENT', path: '/training', name: 'shared-training' },
  { role: 'STUDENT', path: '/colleges', name: 'shared-colleges' },
  { role: 'STUDENT', path: '/achievements', name: 'shared-achievements' },
  { role: 'STUDENT', path: '/vision', name: 'shared-vision' },
  // teacher
  { role: 'TEACHER', path: '/teacher/intelligence', name: 'teacher-intelligence' },
  { role: 'TEACHER', path: '/teacher/performance', name: 'teacher-performance' },
  { role: 'TEACHER', path: '/teacher/schedule', name: 'teacher-schedule' },
  { role: 'TEACHER', path: '/teacher/attendance', name: 'teacher-attendance' },
  { role: 'TEACHER', path: '/teacher/students', name: 'teacher-students' },
  { role: 'TEACHER', path: '/teacher/materials', name: 'teacher-materials' },
  { role: 'TEACHER', path: '/teacher/grades', name: 'teacher-grades' },
  { role: 'TEACHER', path: '/teacher/assignments', name: 'teacher-assignments' },
  { role: 'TEACHER', path: '/teacher/exams', name: 'teacher-exams' },
  { role: 'TEACHER', path: '/teacher/research', name: 'teacher-research' },
  { role: 'TEACHER', path: '/teacher/live', name: 'teacher-live' },
  { role: 'TEACHER', path: '/teacher/labs', name: 'teacher-labs' },
  { role: 'TEACHER', path: '/teacher/library', name: 'teacher-library' },
  { role: 'TEACHER', path: '/teacher/ai', name: 'teacher-ai' },
  { role: 'TEACHER', path: '/teacher/profile', name: 'teacher-profile' },
  { role: 'TEACHER', path: '/teacher/messages', name: 'teacher-messages' },
  { role: 'TEACHER', path: '/teacher/alerts', name: 'teacher-alerts' },
  // admin
  { role: 'ADMIN', path: '/admin/students', name: 'admin-students' },
  { role: 'ADMIN', path: '/admin/teachers', name: 'admin-teachers' },
  { role: 'ADMIN', path: '/admin/faculties', name: 'admin-faculties' },
  { role: 'ADMIN', path: '/admin/courses', name: 'admin-courses' },
  { role: 'ADMIN', path: '/admin/reports', name: 'admin-reports' },
  { role: 'ADMIN', path: '/admin/digital', name: 'admin-digital' },
  { role: 'ADMIN', path: '/admin/settings', name: 'admin-settings' },
  { role: 'ADMIN', path: '/admin/alerts', name: 'admin-alerts' },
  // quality
  { role: 'QUALITY', path: '/quality/courses', name: 'quality-courses' },
  { role: 'QUALITY', path: '/quality/professors', name: 'quality-professors' },
  { role: 'QUALITY', path: '/quality/engagement', name: 'quality-engagement' },
  { role: 'QUALITY', path: '/quality/exam-moderation', name: 'quality-exam-moderation' },
  { role: 'QUALITY', path: '/quality/curriculum', name: 'quality-curriculum' },
  { role: 'QUALITY', path: '/quality/reports', name: 'quality-reports' },
  { role: 'QUALITY', path: '/quality/alerts', name: 'quality-alerts' },
  // owner
  { role: 'OWNER', path: '/owner/users', name: 'owner-users' },
  { role: 'OWNER', path: '/owner/institutions', name: 'owner-institutions' },
  { role: 'OWNER', path: '/owner/realtime', name: 'owner-realtime' },
  { role: 'OWNER', path: '/owner/activity', name: 'owner-activity' },
  { role: 'OWNER', path: '/owner/content', name: 'owner-content' },
  { role: 'OWNER', path: '/owner/system', name: 'owner-system' },
  { role: 'OWNER', path: '/owner/education', name: 'owner-education' },
  { role: 'OWNER', path: '/owner/ai', name: 'owner-ai' },
  { role: 'OWNER', path: '/owner/alerts', name: 'owner-alerts' },
  { role: 'OWNER', path: '/owner/feedback', name: 'owner-feedback' },
  { role: 'OWNER', path: '/owner/governance', name: 'owner-governance' },
  // institution workspace (owner boots it)
  { role: 'OWNER', path: '/institution', name: 'inst-overview' },
  { role: 'OWNER', path: '/institution/organization', name: 'inst-organization' },
  { role: 'OWNER', path: '/institution/people', name: 'inst-people' },
  { role: 'OWNER', path: '/institution/positions', name: 'inst-positions' },
  { role: 'OWNER', path: '/institution/access', name: 'inst-access' },
  { role: 'OWNER', path: '/institution/councils', name: 'inst-councils' },
  { role: 'OWNER', path: '/institution/programs', name: 'inst-programs' },
  { role: 'OWNER', path: '/institution/training', name: 'inst-training' },
  { role: 'OWNER', path: '/institution/students', name: 'inst-students' },
  { role: 'OWNER', path: '/institution/quality', name: 'inst-quality' },
  { role: 'OWNER', path: '/institution/licenses', name: 'inst-licenses' },
  { role: 'OWNER', path: '/institution/facilities', name: 'inst-facilities' },
  { role: 'OWNER', path: '/institution/research', name: 'inst-research' },
  { role: 'OWNER', path: '/institution/audit', name: 'inst-audit' },
];

const SHOTS = SET === 'matrix' ? MATRIX : DASH;

const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
};

test.skip(!CAPTURE, 'r365 capture harness — opt-in via R365_CAPTURE=1');

const themeList = THEMES === 'both' ? (['light', 'dark'] as const) : ([THEMES] as const);
const vpList = VPS === 'both' ? (['desktop', 'phone'] as const) : ([VPS] as const);

const roles = [...new Set(SHOTS.map((s) => s.role))];

for (const role of roles) {
  for (const vp of vpList) {
    for (const theme of themeList) {
      test.describe(`r365 capture ${role} ${vp} ${theme}`, () => {
        test.use({
          e2eRole: role,
          viewport: VIEWPORTS[vp],
          colorScheme: theme === 'dark' ? 'dark' : 'light',
          themeSeed: theme === 'dark' ? 'dark' : 'light',
          // reveals render their FINAL state immediately — capture the
          // settled truth, never a mid-reveal frame
          reducedMotion: 'reduce',
        });

        for (const shot of SHOTS.filter((s) => s.role === role)) {
          test(`${shot.name} ${vp} ${theme}`, async ({ page }) => {
            test.setTimeout(45_000);
            const dir = join(OUT, `${vp}-${theme}`);
            mkdirSync(dir, { recursive: true });
            await page.goto(shot.path);
            await page.waitForLoadState('networkidle');
            // settle: fonts, reveals, charts idle-warm
            await page.waitForTimeout(1100);
            await page.screenshot({
              path: join(dir, `${shot.name}.png`),
              fullPage: true,
              animations: 'disabled',
            });
            const pathName = new URL(shot.path, 'http://x').pathname.split('?')[0];
            expect(page.url().split('?')[0]).toContain(pathName.split('/').slice(0, 3).join('/'));
          });
        }
      });
    }
  }
}
