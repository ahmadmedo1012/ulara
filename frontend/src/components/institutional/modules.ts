/**
 * r352 — the institutional workspace's module registry: the ONE
 * place that decides which sections exist, their routes, icons,
 * labels and the capability/kind gates that render them.
 *
 * Gating rules (product decisions documented in HANDOFF.md):
 *  · WRITE actions inside every module are gated per-capability by
 *    the server's effective set (useMyCapabilities) — the UI never
 *    decides authorization, it only hides/disables what the returned
 *    capability set says the caller lacks.
 *  · READ visibility: institutional reads are context reads (any
 *    active member) per contract §0, so every section renders for
 *    every member of an institution EXCEPT where the institution's
 *    own kind makes the domain structurally foreign. The only
 *    kind-rule here is research (Law 9/2026 puts البحث العلمي in the
 *    higher-education sector's mandate; Law 21/2023 stages 1–2 —
 *    intermediate institutes and formation/vocational centers — carry
 *    no research mandate), sourced from the backend's LEGAL-MATRIX.md
 *    §A. Everything else is capability-driven only.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Network, Users, BadgeCheck, ShieldCheck, Landmark, GraduationCap,
  Wrench, BookOpen, Award, FileCheck2, FlaskConical, Microscope, ScrollText,
} from 'lucide-react';
import type { InstCapability, InstitutionProfile } from '../../lib/institutional/types';

interface InstModule {
  /** The route path under /institution. */
  to: string;
  /** Nav label (Arabic). */
  label: string;
  icon: LucideIcon;
  /** Capability that unlocks WRITE actions inside the module (reads
   * stay member-level). null = read-only module by contract. */
  manage: InstCapability | null;
  /** r360 F4 — when the module's READ itself is a gated oversight
   * surface (the server refuses without the capability), the nav hides
   * it for members who lack the grant. Undefined = the module's read
   * is a context read (the registry's default law). */
  readCapability?: InstCapability;
  /** True when the institution's kind makes the module foreign
   * (function, not array —keeps the rule next to its reason). */
  foreignToKind?: (kindCode?: string | null) => boolean;
}

export const INST_MODULES: InstModule[] = [
  { to: '/institution', label: 'نظرة عامة', icon: LayoutDashboard, manage: null },
  { to: '/institution/organization', label: 'الهيكل التنظيمي', icon: Network, manage: 'ORG_STRUCTURE_MANAGE' },
  { to: '/institution/people', label: 'الأفراد والكوادر', icon: Users, manage: 'PEOPLE_MANAGE' },
  { to: '/institution/positions', label: 'المناصب والتعيينات', icon: BadgeCheck, manage: 'APPOINTMENTS_MANAGE' },
  { to: '/institution/access', label: 'الصلاحيات والأدوار', icon: ShieldCheck, manage: 'UNIT_CAPABILITIES_ASSIGN' },
  { to: '/institution/councils', label: 'المجالس واللجان', icon: Landmark, manage: 'COUNCILS_MANAGE' },
  { to: '/institution/programs', label: 'البرامج والخطط', icon: GraduationCap, manage: 'PROGRAMS_MANAGE' },
  { to: '/institution/training', label: 'التدريب العملي', icon: Wrench, manage: 'PROGRAMS_MANAGE' },
  { to: '/institution/students', label: 'الطلاب والمتدربون', icon: BookOpen, manage: 'PROGRAMS_MANAGE' },
  { to: '/institution/quality', label: 'الجودة والاعتماد', icon: Award, manage: 'ACCREDITATION_MANAGE' },
  { to: '/institution/licenses', label: 'التراخيص والتفتيش', icon: FileCheck2, manage: 'ACCREDITATION_MANAGE' },
  { to: '/institution/facilities', label: 'المعامل والموارد', icon: FlaskConical, manage: 'FACILITIES_MANAGE' },
  {
    to: '/institution/research', label: 'البحث المؤسسي', icon: Microscope, manage: 'RESEARCH_PROJECTS_MANAGE',
    // Law 21/2023 Art. 4 stages 1–2 (intermediate institutes, formation
    // and vocational-training centers) carry no research mandate — the
    // module is foreign to those kinds. LEGAL-MATRIX.md §A.3.
    foreignToKind: (kind) =>
      kind === 'INTERMEDIATE_TECHNICAL_INSTITUTE' || kind === 'VOCATIONAL_TRAINING_CENTER',
  },
  /* r360 F4 — the oversight trail browser (r359 A4's
   * GET /institutional/audit-logs). The READ is capability-gated on
   * the server (AUDIT_BROWSE — ADMIN/QUALITY/OWNER defaults): the nav
   * hides it for members without the grant instead of deep-linking
   * them into a 403 wall. */
  { to: '/institution/audit', label: 'سجل التدقيق', icon: ScrollText, manage: null, readCapability: 'AUDIT_BROWSE' },
];

/** The credential award/revoke write gate (students module owns the
 * credentials tab but the capability is its own). */
export const CREDENTIALS_CAPABILITY: InstCapability = 'CREDENTIALS_MANAGE';
/** Internal-QA self-assessment writes (quality module) — nobody by
 * default; explicit grant only (contract §0). */
export const QUALITY_INTERNAL_CAPABILITY: InstCapability = 'QUALITY_INTERNAL_MANAGE';

/** Sections the caller sees: kind-relevant rows only — capabilities
 * gate the WRITE controls inside, not the read surface; the ONE
 * read-gated module (audit) additionally requires its oversight
 * capability when a capability reader is supplied. The reader is
 * optional so kind-only callers (tests, deep links) keep the
 * pre-audit behaviour for the thirteen context modules. */
export function visibleModules(
  profile: InstitutionProfile | null | undefined,
  capabilities?: { has: (cap: string) => boolean } | null,
): InstModule[] {
  const kind = profile?.kind?.code ?? null;
  return INST_MODULES.filter((m) =>
    !m.foreignToKind?.(kind) &&
    (m.readCapability === undefined || !capabilities || capabilities.has(m.readCapability)));
}

/** Why a deep-linked module is hidden — kind vs nothing-to-show. */
export function moduleHiddenReason(
  path: string,
  profile: InstitutionProfile | null | undefined,
): string | null {
  const kind = profile?.kind?.code ?? null;
  const mod = INST_MODULES.find((m) => m.to === path);
  if (mod && mod.foreignToKind?.(kind)) {
    return 'هذا القسم غير مفعّل لنوع مؤسستك — البحث المؤسسي من مهام قطاع التعليم العالي والبحث العلمي.';
  }
  return null;
}
