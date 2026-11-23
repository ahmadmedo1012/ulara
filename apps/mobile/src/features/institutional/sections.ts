/**
 * r353 — the institutional workspace's section registry on mobile
 * (web components/institutional/modules.ts parity): the ONE place that
 * decides which sections exist, their routes, icons, labels and the
 * capability/kind gates.
 *
 *  · WRITE affordances inside every section are gated per-capability
 *    by the server's effective set (useMyCapabilities) — the UI never
 *    decides authorization, it only hides what the caller lacks.
 *  · READ visibility: institutional reads are context reads (any
 *    active member, contract §0). The only kind-rule is research
 *    (Law 21/2023 stages 1–2 carry no research mandate).
 */
import type { ComponentType } from "react";
import Network from "lucide-react-native/icons/network";
import Users from "lucide-react-native/icons/users";
import BadgeCheck from "lucide-react-native/icons/badge-check";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Landmark from "lucide-react-native/icons/landmark";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import Wrench from "lucide-react-native/icons/wrench";
import BookOpen from "lucide-react-native/icons/book-open";
import Award from "lucide-react-native/icons/award";
import FileCheck from "lucide-react-native/icons/file-check";
import FlaskConical from "lucide-react-native/icons/flask-conical";
import Microscope from "lucide-react-native/icons/microscope";

export interface InstSection {
  /** The route path under /institution (expo-router push target). */
  to: string;
  /** Nav label (Arabic) — byte-identical to the web rail. */
  label: string;
  /** One honest line of what the section shows on mobile today. */
  desc: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Capability that unlocks WRITE actions inside the module (reads
   * stay member-level). null = read-only module by contract. */
  manage: string | null;
  /** True when the institution's kind makes the module foreign. */
  foreignToKind?: (kindCode?: string | null) => boolean;
}

export const INST_SECTIONS: InstSection[] = [
  { to: "/institution/organization", label: "الهيكل التنظيمي", desc: "شجرة الوحدات: الكليات والأقسام والمعامل والمكاتب", icon: Network, manage: "ORG_STRUCTURE_MANAGE" },
  { to: "/institution/people", label: "الأفراد والكوادر", desc: "سجل الأفراد: هيئة التدريس والمدربون والموظفون", icon: Users, manage: "PEOPLE_MANAGE" },
  { to: "/institution/positions", label: "المناصب والتعيينات", desc: "التعيينات على المناصب القيادية وحالتها", icon: BadgeCheck, manage: "APPOINTMENTS_MANAGE" },
  { to: "/institution/access", label: "الصلاحيات والأدوار", desc: "قدراتك الفعلية ومنح الصلاحيات وسحبها", icon: ShieldCheck, manage: "UNIT_CAPABILITIES_ASSIGN" },
  { to: "/institution/councils", label: "المجالس واللجان", desc: "المجالس واللجنة واجتماعاتها ومحاضرها", icon: Landmark, manage: "COUNCILS_MANAGE" },
  { to: "/institution/programs", label: "البرامج والخطط", desc: "البرامج الأكاديمية والتقنية وإصداراتها", icon: GraduationCap, manage: "PROGRAMS_MANAGE" },
  { to: "/institution/training", label: "التدريب العملي", desc: "مواقع التدريب وتقييمها", icon: Wrench, manage: "PROGRAMS_MANAGE" },
  { to: "/institution/students", label: "الطلاب والمتدربون", desc: "سجل المتعلمين وتسجيلاتهم وشهاداتهم", icon: BookOpen, manage: "PROGRAMS_MANAGE" },
  { to: "/institution/quality", label: "الجودة والاعتماد", desc: "التقييم الذاتي والاعتمادات الخارجية", icon: Award, manage: "ACCREDITATION_MANAGE" },
  { to: "/institution/licenses", label: "التراخيص والتفتيش", desc: "التراخيص والتفتيش الرقابي والملاحظات", icon: FileCheck, manage: "ACCREDITATION_MANAGE" },
  { to: "/institution/facilities", label: "المعامل والموارد", desc: "المنشآت والمعدات والحجوزات", icon: FlaskConical, manage: "FACILITIES_MANAGE" },
  {
    to: "/institution/research",
    label: "البحث المؤسسي",
    desc: "المشاريع البحثية وفرقها ومخرجاتها",
    icon: Microscope,
    manage: "RESEARCH_PROJECTS_MANAGE",
    // Law 21/2023 Art. 4 stages 1–2 (intermediate institutes, formation
    // and vocational-training centers) carry no research mandate —
    // LEGAL-MATRIX.md §A.3.
    foreignToKind: (kind) =>
      kind === "INTERMEDIATE_TECHNICAL_INSTITUTE" || kind === "VOCATIONAL_TRAINING_CENTER",
  },
];

/** Sections the caller sees: kind-relevant rows only — capabilities
 *  gate the WRITE controls inside, not the read surface. */
export function visibleSections(kindCode: string | null | undefined): InstSection[] {
  return INST_SECTIONS.filter((s) => !s.foreignToKind?.(kindCode ?? null));
}

/** Why a deep-linked module is hidden — kind vs nothing-to-show. */
export function sectionHiddenReason(
  to: string,
  kindCode: string | null | undefined,
): string | null {
  const mod = INST_SECTIONS.find((s) => s.to === to);
  if (mod && mod.foreignToKind?.(kindCode ?? null)) {
    return "هذا القسم غير مفعّل لنوع مؤسستك — البحث المؤسسي من مهام قطاع التعليم العالي والبحث العلمي.";
  }
  return null;
}
