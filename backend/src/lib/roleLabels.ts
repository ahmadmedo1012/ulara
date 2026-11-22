/**
 * roleLabels — the BACKEND twin of `frontend/src/lib/roleLabels.ts`
 * (R320 §B, task c1-RENAME): the Arabic display names of the five
 * roles, shared by backend messages/exports so the API's human-facing
 * Arabic can never drift from the UI's role labels.
 *
 * r352 (institutional core): the ADMIN role's label is CORRECTED from
 * «المسجل العام» to «إدارة المؤسسة» — the institutional-administration
 * ACCESS CATEGORY, separated from the actual job title المسجل العام
 * (which is a PositionTemplate of the university kind now, not a
 * system role; the role holds broader administrative capabilities than
 * the registrar-general office). Technical identifiers (the `Role`
 * enum, DB values, JWT claims, /admin/* URLs) are UNCHANGED.
 *
 * FRONTEND TWIN: `frontend/src/lib/roleLabels.ts` must carry the SAME
 * map (the r352 handoff names this as the frontend agent's task). The
 * twin-belt tests stay ACTIVE and are expected-red until the mirror
 * lands — that is the designed coordination signal, never a bug.
 */
import { Role } from '@prisma/client';

/** Arabic display name per role — messages, exports, audit copy. */
export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إدارة المؤسسة',
  // A person, not the function — «جودة» read as a role chip under a
  // user's name is not a person (15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/** Role label lookup (ADMIN → «إدارة المؤسسة»). */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Indefinite forms for copy that counts or appoints the role's
 * holders (حساب إدارة مؤسسة جديد). */
export const ROLE_LABEL_INDEFINITE: Partial<Record<Role, string>> = {
  ADMIN: 'إدارة مؤسسة',
};

/** Plural forms for copy that addresses the role's holders
 * (oblique «إدارات المؤسسات»). */
export const ROLE_LABEL_PLURAL_OBLIQUE: Partial<Record<Role, string>> = {
  ADMIN: 'إدارات المؤسسات',
};
