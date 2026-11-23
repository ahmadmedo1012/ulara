/**
 * r353 — the Arabic label registry for the institutional workspace on
 * mobile (web lib/institutional/labels.ts parity): ONE source of truth
 * for every enum the institutional API returns. Statutory NAMES
 * (credential types, position templates, criteria sets, authorities,
 * institution kinds) are NEVER hardcoded here — they arrive from the API
 * catalogs and render from that data; this registry only covers the
 * fixed ENUM vocabulary the contract itself defines. Legal wording
 * follows the backend's LEGAL-MATRIX.md — never invented policy.
 */
import type { StatusToneName } from "@/design/tokens";

type L<T extends string> = Record<T, string>;

/* ── institution classification ─────────────────────────────────── */

export const SECTOR_LABELS: L<string> = {
  HIGHER_EDUCATION_RESEARCH: "التعليم العالي والبحث العلمي",
  TECHNICAL_VOCATIONAL_PROFESSIONAL: "التعليم التقني والفني والمهني",
};

export const OWNERSHIP_LABELS: L<string> = {
  PUBLIC: "حكومية",
  PRIVATE: "خاصة",
  OPEN: "مفتوحة",
  MIXED: "مختلطة",
  INTERNATIONAL: "دولية",
  OTHER: "أخرى",
};

export const INSTITUTION_STATUS_LABELS: L<string> = {
  ACTIVE: "نشطة",
  SUSPENDED: "موقوفة",
  PENDING_APPROVAL: "قيد الموافقة",
  CLOSED: "مغلقة",
  MERGED: "مدمجة",
};

/* ── organizational units ───────────────────────────────────────── */

export const ORG_UNIT_TYPE_LABELS: L<string> = {
  FACULTY: "كلية تخصصية",
  COLLEGE: "كلية",
  SCIENTIFIC_DEPARTMENT: "قسم علمي",
  INSTITUTE: "معهد",
  RESEARCH_CENTER: "مركز بحوث",
  RESEARCH_UNIT: "وحدة بحثية",
  GENERAL_ADMINISTRATION: "إدارة عامة",
  OFFICE: "مكتب",
  ADMINISTRATIVE_DEPARTMENT: "دائرة إدارية",
  BRANCH: "فرع",
  CAMPUS: "مقر جامعي",
  TRAINING_UNIT: "وحدة تدريب",
  LABORATORY: "معمل",
  WORKSHOP: "ورشة",
  DEANERY_OFFICE: "مكتب العمادة",
  REGISTRAR_OFFICE: "مكتب المسجلية",
  QA_OFFICE: "مكتب ضمان الجودة",
  OTHER: "وحدة أخرى معتمدة",
};

export const ORG_UNIT_STATUS_LABELS: L<string> = {
  ACTIVE: "نشطة",
  INACTIVE: "موقوفة",
  DISSOLVED: "منحلة",
};

/* ── people ─────────────────────────────────────────────────────── */

export const STAFF_CATEGORY_LABELS: L<string> = {
  ACADEMIC_STAFF: "عضو هيئة تدريس",
  TEACHING_ASSISTANT: "معيد",
  TRAINER: "مدرب",
  ASSISTANT_TRAINER: "مساعد مدرب",
  TEACHER: "معلم",
  TECHNICAL_GUIDE: "موجه فني",
  ADMINISTRATIVE_STAFF: "موظف",
  TECHNICIAN: "فني",
  PROFESSIONAL: "مهني",
  OTHER: "أخرى",
};

export const STAFF_STATUS_LABELS: L<string> = {
  ACTIVE: "نشط",
  ON_LEAVE: "في إجازة",
  SUSPENDED: "موقوف",
  ENDED: "منتهي",
};

export const PLATFORM_ROLE_LABELS: L<string> = {
  STUDENT: "طالب",
  TEACHER: "أستاذ",
  ADMIN: "إدارة المؤسسة",
  QUALITY: "أخصائي جودة",
  OWNER: "مالك المنصة",
};

export const LEARNER_CATEGORY_LABELS: L<string> = {
  STUDENT: "طالب",
  TRAINEE: "متدرب",
};

export const LEARNER_STATUS_LABELS: L<string> = {
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  GRADUATED: "متخرج",
  WITHDRAWN: "منسحب",
  TRANSFERRED: "منتقل",
};

/* ── the r352 capability keys (contract §0) — the ONE vocabulary the
   grants surface and the Access screen share. ──────────────────── */

export const CAPABILITY_LABELS: Record<string, string> = {
  ORG_STRUCTURE_MANAGE: "إدارة الهيكل التنظيمي",
  PEOPLE_MANAGE: "إدارة الأفراد",
  APPOINTMENTS_MANAGE: "إدارة التعيينات",
  COUNCILS_MANAGE: "إدارة المجالس واللجان",
  PROGRAMS_MANAGE: "إدارة البرامج",
  CREDENTIALS_MANAGE: "منح الشهادات وسحبها",
  ACCREDITATION_MANAGE: "إدارة الاعتماد والتراخيص الخارجية",
  QUALITY_INTERNAL_MANAGE: "إدارة التقييم الذاتي الداخلي",
  FACILITIES_MANAGE: "إدارة المعامل والموارد",
  RESEARCH_PROJECTS_MANAGE: "إدارة المشاريع البحثية",
  UNIT_CAPABILITIES_ASSIGN: "منح صلاحيات النطاق",
};

/* ── appointments ───────────────────────────────────────────────── */

export const APPOINTMENT_STATUS_LABELS: L<string> = {
  SCHEDULED: "مجدول",
  ACTIVE: "ساري",
  ENDED: "منتهي",
  CANCELLED: "ملغى",
};

/** PositionCategory (DATA-MODEL §4) — the template families. */
export const POSITION_CATEGORY_LABELS: L<string> = {
  UNIVERSITY_LEADERSHIP: "قيادة الجامعة",
  FACULTY_LEADERSHIP: "قيادة الكلية",
  DEPARTMENT_LEADERSHIP: "قيادة القسم العلمي",
  INSTITUTE_LEADERSHIP: "قيادة المعهد",
  CENTER_LEADERSHIP: "قيادة المركز",
  ADMINISTRATIVE_LEADERSHIP: "القيادة الإدارية",
  TRAINING_LEADERSHIP: "قيادة التدريب",
  BOARD_OFFICE: "مكاتب القيادة",
  OTHER: "أخرى",
};

/* ── councils & committees ──────────────────────────────────────── */

export const COUNCIL_TYPE_LABELS: L<string> = {
  UNIVERSITY_COUNCIL: "مجلس الجامعة",
  FACULTY_COUNCIL: "مجلس الكلية",
  DEPARTMENT_COUNCIL: "مجلس القسم",
  SCIENTIFIC_COUNCIL: "المجلس العلمي",
  INSTITUTE_COUNCIL: "مجلس المعهد",
  DISCIPLINARY_COUNCIL: "مجلس التأديب",
  STANDING_COMMITTEE: "لجنة دائمة",
  OTHER: "أخرى",
};

export const COUNCIL_STATUS_LABELS: L<string> = {
  ACTIVE: "قائم",
  DISSOLVED: "منحل",
  CANCELLED: "ملغى",
};

export const COUNCIL_ROLE_LABELS: L<string> = {
  CHAIR: "رئيس",
  DEPUTY_CHAIR: "نائب الرئيس",
  SECRETARY: "أمين المجلس",
  MEMBER: "عضو",
  OBSERVER: "مراقب",
};

export const MEMBERSHIP_STATUS_LABELS: L<string> = {
  ACTIVE: "سارية",
  ENDED: "منتهية",
  CANCELLED: "ملغاة",
};

export const MEETING_STATUS_LABELS: L<string> = {
  SCHEDULED: "مجدول",
  HELD: "منعقد",
  CANCELLED: "ملغى",
};

export const AGENDA_STATUS_LABELS: L<string> = {
  OPEN: "معروض",
  DISCUSSED: "تمت مناقشته",
  DEFERRED: "مؤجل",
  CLOSED: "مغلق",
};

export const ATTENDANCE_LABELS: L<string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  EXCUSED: "بعذر",
  LATE: "متأخر",
};

export const RESOLUTION_KIND_LABELS: L<string> = {
  RESOLUTION: "قرار",
  RECOMMENDATION: "توصية",
  FOLLOW_UP_ACTION: "إجراء متابعة",
};

export const RESOLUTION_STATUS_LABELS: L<string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  IMPLEMENTED: "منفَّذ",
  ARCHIVED: "مؤرشف",
};

export const MINUTES_STATUS_LABELS: L<string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمد",
  SIGNED: "موقَّع",
};

/* ── programs ─────────────────────────────────────────────────────── */

export const PROGRAM_KIND_LABELS: L<string> = {
  ACADEMIC: "أكاديمي",
  TECHNICAL: "تقني",
  PROFESSIONAL: "مهني",
  VOCATIONAL_TRAINING: "تدريب مهني",
  BASIC_FORMATION: "تكوين أساسي",
};

export const PROGRAM_STATUS_LABELS: L<string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمد",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  CLOSED: "مغلق",
};

export const VERSION_STATUS_LABELS: L<string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمدة",
  ACTIVE: "سارية",
  RETIRED: "متقاعدة",
};

export const PROGRAM_COURSE_KIND_LABELS: L<string> = {
  CORE: "إجباري",
  ELECTIVE: "اختياري",
  PRACTICUM: "تدريب عملي",
  CAPSTONE: "مشروع تخرج",
  SUPPORTING: "داعم",
};

export const ENROLLMENT_STATUS_LABELS: L<string> = {
  CANDIDATE: "مرشح",
  ACTIVE: "نشط",
  ON_LEAVE: "مجمد",
  WITHDRAWN: "منسحب",
  SUSPENDED: "موقوف",
  COMPLETED: "مكتمل",
  GRADUATED: "متخرج",
};

export const PLACEMENT_STATUS_LABELS: L<string> = {
  PLANNED: "مخطط",
  ACTIVE: "جارٍ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  TERMINATED: "موقوف",
};

export const CREDENTIAL_STATUS_LABELS: L<string> = {
  AWARDED: "ممنوحة",
  REVOKED: "مسحوبة",
  SUSPENDED: "موقوفة",
};

/* ── compliance ──────────────────────────────────────────────────── */

export const ACCREDITATION_TYPE_LABELS: L<string> = {
  INSTITUTIONAL: "مؤسسي",
  PROGRAM: "برامجي",
};

export const ACCREDITATION_STATUS_LABELS: L<string> = {
  PENDING: "قيد التقديم",
  IN_REVIEW: "قيد المراجعة",
  GRANTED: "ممنوح",
  CONDITIONAL: "مشروط",
  RENEWED: "مُجدد",
  SUSPENDED: "موقوف",
  REVOKED: "ملغى",
  EXPIRED: "منتهي",
  WITHDRAWN: "مسحوب",
};

export const LICENSE_KIND_LABELS: L<string> = {
  TECHNICAL_LICENSE: "ترخيص فني",
  OPERATING_PERMIT: "إذن مزاولة",
  ESTABLISHMENT_DECISION: "قرار إنشاء",
  OTHER: "أخرى",
};

export const LICENSE_STATUS_LABELS: L<string> = {
  PENDING: "قيد الإصدار",
  ACTIVE: "ساري",
  RENEWED: "مُجدد",
  SUSPENDED: "موقوف",
  REVOKED: "ملغى",
  EXPIRED: "منتهي",
};

export const INSPECTION_KIND_LABELS: L<string> = {
  MINISTRY: "تفتيش وزاري",
  REGULATOR: "تفتيش جهة رقابية",
  SAFETY: "تفتيش سلامة",
  TECHNICAL: "تفتيش فني",
  OTHER: "أخرى",
};

export const INSPECTION_STATUS_LABELS: L<string> = {
  SCHEDULED: "مجدول",
  IN_PROGRESS: "جارٍ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
};

export const FINDING_SEVERITY_LABELS: L<string> = {
  MINOR: "بسيطة",
  MAJOR: "جسيمة",
  CRITICAL: "حرجة",
};

export const FINDING_STATUS_LABELS: L<string> = {
  OPEN: "مفتوحة",
  ACKNOWLEDGED: "مُقرّ بها",
  IN_REMEDIATION: "قيد المعالجة",
  RESOLVED: "معالجة",
  DISPUTED: "مُعترض عليها",
  CLOSED: "مغلقة",
};

export const SELF_ASSESSMENT_STATUS_LABELS: L<string> = {
  DRAFT: "مسودة",
  SUBMITTED: "مُقدمة",
  UNDER_REVIEW: "قيد المراجعة",
  APPROVED: "معتمدة",
  ARCHIVED: "مؤرشفة",
};

/* ── facilities & equipment ───────────────────────────────────── */

export const FACILITY_TYPE_LABELS: L<string> = {
  LABORATORY: "معمل",
  WORKSHOP: "ورشة",
  CLASSROOM: "قاعة دراسية",
  PRACTICAL_TRAINING_FACILITY: "منشأة تدريب عملي",
  LECTURE_HALL: "قاعة محاضرات",
  OTHER: "أخرى",
};

export const FACILITY_STATUS_LABELS: L<string> = {
  ACTIVE: "متاح",
  UNDER_MAINTENANCE: "قيد الصيانة",
  CLOSED: "مغلق",
  DECOMMISSIONED: "مستبعد من الخدمة",
};

export const EQUIPMENT_CONDITION_LABELS: L<string> = {
  NEW: "جديد",
  GOOD: "جيد",
  FAIR: "مقبول",
  POOR: "متدهور",
  BROKEN: "معطل",
};

export const EQUIPMENT_STATUS_LABELS: L<string> = {
  IN_SERVICE: "في الخدمة",
  UNDER_MAINTENANCE: "قيد الصيانة",
  OUT_OF_SERVICE: "خارج الخدمة",
  DECOMMISSIONED: "مستبعد",
  LOST: "مفقود",
};

export const WORK_ORDER_KIND_LABELS: L<string> = {
  PREVENTIVE: "وقائية",
  CORRECTIVE: "تصحيحية",
  SAFETY_INSPECTION: "تفتيش سلامة",
  INSTALLATION: "تركيب",
  OTHER: "أخرى",
};

export const WORK_ORDER_STATUS_LABELS: L<string> = {
  OPEN: "مفتوح",
  IN_PROGRESS: "جارٍ",
  COMPLETED: "منجز",
  CANCELLED: "ملغى",
};

export const RESERVATION_STATUS_LABELS: L<string> = {
  REQUESTED: "مطلوب",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
  COMPLETED: "مكتمل",
};

/* ── research ───────────────────────────────────────────────────── */

export const RESEARCH_STATUS_LABELS: L<string> = {
  PROPOSED: "مقترح",
  APPROVED: "معتمد",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  COMPLETED: "مكتمل",
  TERMINATED: "منتهي",
};

export const RESEARCH_MEMBER_ROLE_LABELS: L<string> = {
  PRINCIPAL_INVESTIGATOR: "باحث رئيس",
  CO_INVESTIGATOR: "باحث مشارك",
  RESEARCHER: "باحث",
  RESEARCH_ASSISTANT: "مساعد بحث",
  COLLABORATOR: "متعاون",
  TECHNICIAN: "فني",
};

export const RESEARCH_OUTPUT_LABELS: L<string> = {
  PUBLICATION: "نشرة علمية",
  PATENT: "براءة اختراع",
  PROTOTYPE: "نموذج أولي",
  APPLIED_PRODUCT: "منتج تطبيقي",
  TECHNICAL_REPORT: "تقرير فني",
};

/* ── tone mapping (one chip vocabulary → the kit's Badge tones) ── */

/** The workspace's single status-chip tone vocabulary (web toneOf →
 *  the mobile kit's StatusToneName) — every status maps to exactly one
 *  tone so screens read consistently. */
const TONE: Record<string, StatusToneName> = {
  // lifecycle "healthy" states
  ACTIVE: "mint", GRANTED: "mint", APPROVED: "mint", SIGNED: "mint", COMPLETED: "mint",
  VERIFIED: "mint", IN_SERVICE: "mint", AWARDED: "mint", PRESENT: "mint", RESOLVED: "mint",
  RENEWED: "mint", GRADUATED: "mint", IMPLEMENTED: "mint", GOOD: "mint",
  // in-flight / neutral
  PENDING: "sky", SCHEDULED: "sky", DRAFT: "sky", IN_REVIEW: "sky", REQUESTED: "sky",
  CANDIDATE: "sky", PLANNED: "sky", PROPOSED: "sky", SUBMITTED: "sky", UNDER_REVIEW: "sky",
  IN_PROGRESS: "sky", OPEN: "sky", ON_LEAVE: "sky",
  // attention
  CONDITIONAL: "yellow", IN_REMEDIATION: "yellow", PENDING_APPROVAL: "yellow", SUSPENDED: "yellow",
  EXPIRED: "yellow", FAIR: "yellow", LATE: "yellow", DEFERRED: "yellow", DISPUTED: "yellow",
  ACKNOWLEDGED: "yellow", UNDER_MAINTENANCE: "yellow", MINOR: "yellow", POOR: "yellow",
  // adverse
  REVOKED: "rose", REJECTED: "rose", CANCELLED: "rose", CLOSED: "rose", WITHDRAWN: "rose",
  OUT_OF_SERVICE: "rose", LOST: "rose", BROKEN: "rose", ABSENT: "rose", MAJOR: "rose",
  CRITICAL: "rose", TERMINATED: "rose",
  // retired / muted
  ENDED: "grey", DISSOLVED: "grey", RETIRED: "grey", ARCHIVED: "grey",
  DECOMMISSIONED: "grey",
};

/** Kit Badge tone for any status/enum value — unknown values read grey. */
export function toneOf(value: string | null | undefined): StatusToneName {
  if (!value) return "grey";
  return TONE[value] ?? "grey";
}

/** Label from a registry — unknown values render the raw enum (honest,
 *  never a fabricated Arabic guess). */
export function labelOf(labels: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return labels[value] ?? value;
}
