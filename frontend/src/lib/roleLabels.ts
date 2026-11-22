/**
 * roleLabels — the ONE frontend source of truth for the Arabic display
 * names of the five AppRoles (R320 §B, task c1-RENAME).
 *
 * r352 §D7 (the institutional core correction): the ADMIN role's label
 * is «إدارة المؤسسة» — the institutional-administration ACCESS
 * CATEGORY — separated from the actual job title «المسجل العام», which
 * is a seeded university PositionTemplate (REGISTRAR_GENERAL), never a
 * system role. The role holds broader administrative capabilities than
 * the registrar-general office. Technical identifiers
 * (Role.ADMIN, /admin/* URLs, DB values, JWT claims, CSS classes, test
 * ids) are UNCHANGED; only the human-facing label moved.
 *
 * The other four roles keep their established wording (17-a2 / 15-j
 * P1-8 person-noun lineage: QUALITY is «أخصائي جودة», a person — not
 * the function «جودة»).
 *
 * BACKEND TWIN: `backend/src/lib/roleLabels.ts` carries the SAME map so
 * backend messages/exports can never drift from the UI. The two maps
 * are belt-locked equal (backend/src/lib/__tests__/roleLabels.test.ts
 * reads this file as its source) — change them TOGETHER. The r320
 * rename ledger predated the 1.0 squash; the r352 decision record
 * (docs/redesign/r352/institutional-backend/DECISIONS.md §D7) carries
 * the justification for this correction.
 */
import type { AppRole } from '../stores/auth.store';

/** Arabic display name per role — role chips, badges, pickers, messages. */
export const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  // The institutional-administration access category — NOT the job
  // title «المسجل العام» (a PositionTemplate of the university kind;
  // r352 §D7 twin-locked with the backend map).
  ADMIN: 'إدارة المؤسسة',
  // A person, not the function — «جودة» read as a role chip under a
  // user's name is not a person (15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/** Role chip label — the single lookup every surface should consume. */
export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

/** Arabic dashboard title per role (the h1 / breadcrumb root / tab
 * title of each role's home surface — ADMIN: «لوحة إدارة المؤسسة»). */
const ROLE_DASHBOARD_LABELS: Record<AppRole, string> = {
  STUDENT: 'لوحة التحكم',
  TEACHER: 'لوحة الأستاذ',
  ADMIN: 'لوحة إدارة المؤسسة',
  QUALITY: 'لوحة الجودة',
  OWNER: 'لوحة التحكم الرئيسية',
};

/** The role's dashboard title (ADMIN: «لوحة إدارة المؤسسة»). */
export function roleDashboardLabel(role: AppRole): string {
  return ROLE_DASHBOARD_LABELS[role];
}

