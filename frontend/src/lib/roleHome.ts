import { ROUTES } from './routes';
import type { AppRole } from '../stores/auth.store';

/* r360 F1 — ROLE_HOME moved OUT of lib/nav.ts (its birth module).
 * nav.ts statically imports the lucide icon registry (NAV_BY_ROLE's
 * menu icons — ~110KB of code the public routes never mount), and the
 * route guards (ProtectedRoute, App.tsx's HomeRedirect) need ONLY this
 * tiny string map. Keeping the map in nav.ts forced the whole icon
 * registry into the ENTRY chunk for every public boot. nav.ts
 * re-exports this module's export so every existing importer is
 * unchanged — the map's single source of truth moves, its consumers
 * do not. */
export const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: ROUTES.studentDashboard,
  TEACHER: ROUTES.teacherDashboard,
  ADMIN: ROUTES.adminDashboard,
  QUALITY: ROUTES.qualityDashboard,
  OWNER: ROUTES.ownerDashboard,
};
