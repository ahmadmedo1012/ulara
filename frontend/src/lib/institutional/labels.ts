/**
 * r352 — the Arabic label registry for the institutional workspace.
 *
 * ONE source of truth for every enum the institutional API returns.
 * Statutory NAMES (credential types, position templates, criteria
 * sets, authorities, institution kinds) are NEVER hardcoded here —
 * they arrive from the API catalogs and are rendered from that data
 * (see api.ts catalog fetchers); this registry only covers the fixed
 * ENUM vocabulary the contract itself defines.
 *
 * Legal wording follows the backend's LEGAL-MATRIX.md (Law 21/2023
 * م2/م50 staff categories, Law 9/2026 institution kinds, the National
 * Center's criteria vocabulary) — never invented policy.
 */
import type {
  AccreditationStatus, AccreditationType, AppointmentStatus, CouncilRole, CouncilStatus,
  CouncilType, CorrectiveStatus, CredentialStatus, EnrollmentStatus, EquipmentCondition,
  EquipmentStatus, EvidenceOwnerType, FacilityStatus, FacilityType, FindingSeverity,
  FindingStatus, InspectionKind, InspectionStatus, InstitutionSector, InstitutionStatusExt,
  LearnerCategory, LearnerStatus,
  LicenseKind, LicenseStatus, MeetingStatus, MinutesStatus, OrgUnitStatus, OrgUnitType,
  OwnershipType, PlacementStatus, PlatformRole, ProgramCourseKind, ProgramKind,
  ProgramStatus, ProgramVersionStatus, ResearchMemberRole, ResearchOutputType,
  ResearchStatus, ReservationStatus, ResolutionKind, ResolutionStatus, StaffCategory,
  StaffStatus, WorkOrderKind, WorkOrderStatus, IncidentKind, IncidentSeverity,
  AgendaItemStatus, AttendanceStatus,
} from './types';

type L<T extends string> = Record<T, string>;

/* ── institution classification ─────────────────────────────────── */

export const SECTOR_LABELS: L<InstitutionSector> = {
  HIGHER_EDUCATION_RESEARCH: 'التعليم العالي والبحث العلمي',
  TECHNICAL_VOCATIONAL_PROFESSIONAL: 'التعليم التقني والفني والمهني',
};

export const OWNERSHIP_LABELS: L<OwnershipType> = {
  PUBLIC: 'حكومية',
  PRIVATE: 'خاصة',
  OPEN: 'مفتوحة',
  MIXED: 'مختلطة',
  INTERNATIONAL: 'دولية',
  OTHER: 'أخرى',
};

/** Additive statuses (contract §2) — the two legacy values keep their
 * platform wording, the r352 rows use the legal wording. */
export const INSTITUTION_STATUS_LABELS: L<InstitutionStatusExt> = {
  ACTIVE: 'نشطة',
  SUSPENDED: 'موقوفة',
  PENDING_APPROVAL: 'قيد الموافقة',
  CLOSED: 'مغلقة',
  MERGED: 'مدمجة',
};

/* ── organizational units ───────────────────────────────────────── */

/** The 18 unit kinds (DATA-MODEL §2) — legal/natural Arabic names. */
export const ORG_UNIT_TYPE_LABELS: L<OrgUnitType> = {
  FACULTY: 'كلية تخصصية',
  COLLEGE: 'كلية',
  SCIENTIFIC_DEPARTMENT: 'قسم علمي',
  INSTITUTE: 'معهد',
  RESEARCH_CENTER: 'مركز بحوث',
  RESEARCH_UNIT: 'وحدة بحثية',
  GENERAL_ADMINISTRATION: 'إدارة عامة',
  OFFICE: 'مكتب',
  ADMINISTRATIVE_DEPARTMENT: 'دائرة إدارية',
  BRANCH: 'فرع',
  CAMPUS: 'مقر جامعي',
  TRAINING_UNIT: 'وحدة تدريب',
  LABORATORY: 'معمل',
  WORKSHOP: 'ورشة',
  DEANERY_OFFICE: 'مكتب العمادة',
  REGISTRAR_OFFICE: 'مكتب المسجلية',
  QA_OFFICE: 'مكتب ضمان الجودة',
  OTHER: 'وحدة أخرى معتمدة',
};

export const ORG_UNIT_STATUS_LABELS: L<OrgUnitStatus> = {
  ACTIVE: 'نشطة',
  INACTIVE: 'موقوفة',
  DISSOLVED: 'منحلة',
};

/* ── people ─────────────────────────────────────────────────────── */

/** StaffCategory — the statutory names (Law 21/2023 م2). */
export const STAFF_CATEGORY_LABELS: L<StaffCategory> = {
  ACADEMIC_STAFF: 'عضو هيئة تدريس',
  TEACHING_ASSISTANT: 'معيد',
  TRAINER: 'مدرب',
  ASSISTANT_TRAINER: 'مساعد مدرب',
  TEACHER: 'معلم',
  TECHNICAL_GUIDE: 'موجه فني',
  ADMINISTRATIVE_STAFF: 'موظف',
  TECHNICIAN: 'فني',
  PROFESSIONAL: 'مهني',
  OTHER: 'أخرى',
};

export const STAFF_STATUS_LABELS: L<StaffStatus> = {
  ACTIVE: 'نشط',
  ON_LEAVE: 'في إجازة',
  SUSPENDED: 'موقوف',
  ENDED: 'منتهي',
};

export const PLATFORM_ROLE_LABELS: L<PlatformRole> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إدارة المؤسسة',
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/* ── the generalized learner domain (Law 21/2023 م2) ─────────────── */

export const LEARNER_CATEGORY_LABELS: L<LearnerCategory> = {
  STUDENT: 'طالب',
  TRAINEE: 'متدرب',
};

export const LEARNER_STATUS_LABELS: L<LearnerStatus> = {
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  GRADUATED: 'متخرج',
  WITHDRAWN: 'منسحب',
  TRANSFERRED: 'منتقل',
};

/* ── the r352 capability keys (contract §0) — the grants surface and
   the Access page share this ONE vocabulary. */

export const CAPABILITY_LABELS: Record<string, string> = {
  ORG_STRUCTURE_MANAGE: 'إدارة الهيكل التنظيمي',
  PEOPLE_MANAGE: 'إدارة الأفراد',
  APPOINTMENTS_MANAGE: 'إدارة التعيينات',
  COUNCILS_MANAGE: 'إدارة المجالس واللجان',
  PROGRAMS_MANAGE: 'إدارة البرامج',
  CREDENTIALS_MANAGE: 'منح الشهادات وسحبها',
  ACCREDITATION_MANAGE: 'إدارة الاعتماد والتراخيص الخارجية',
  QUALITY_INTERNAL_MANAGE: 'إدارة التقييم الذاتي الداخلي',
  FACILITIES_MANAGE: 'إدارة المعامل والموارد',
  RESEARCH_PROJECTS_MANAGE: 'إدارة المشاريع البحثية',
  UNIT_CAPABILITIES_ASSIGN: 'منح صلاحيات النطاق',
};

/* ── appointments ───────────────────────────────────────────────── */

export const APPOINTMENT_STATUS_LABELS: L<AppointmentStatus> = {
  SCHEDULED: 'مجدول',
  ACTIVE: 'ساري',
  ENDED: 'منتهي',
  CANCELLED: 'ملغى',
};

/** PositionCategory (DATA-MODEL §4) — the template families. */
export const POSITION_CATEGORY_LABELS: Record<string, string> = {
  UNIVERSITY_LEADERSHIP: 'قيادة الجامعة',
  FACULTY_LEADERSHIP: 'قيادة الكلية',
  DEPARTMENT_LEADERSHIP: 'قيادة القسم العلمي',
  INSTITUTE_LEADERSHIP: 'قيادة المعهد',
  CENTER_LEADERSHIP: 'قيادة المركز',
  ADMINISTRATIVE_LEADERSHIP: 'القيادة الإدارية',
  TRAINING_LEADERSHIP: 'قيادة التدريب',
  BOARD_OFFICE: 'مكاتب القيادة',
  OTHER: 'أخرى',
};

/* ── councils & committees ──────────────────────────────────────── */

export const COUNCIL_TYPE_LABELS: L<CouncilType> = {
  UNIVERSITY_COUNCIL: 'مجلس الجامعة',
  FACULTY_COUNCIL: 'مجلس الكلية',
  DEPARTMENT_COUNCIL: 'مجلس القسم',
  SCIENTIFIC_COUNCIL: 'المجلس العلمي',
  INSTITUTE_COUNCIL: 'مجلس المعهد',
  DISCIPLINARY_COUNCIL: 'مجلس التأديب',
  STANDING_COMMITTEE: 'لجنة دائمة',
  OTHER: 'أخرى',
};

export const COUNCIL_STATUS_LABELS: L<CouncilStatus> = {
  ACTIVE: 'قائم',
  DISSOLVED: 'منحل',
  CANCELLED: 'ملغى',
};

export const COUNCIL_ROLE_LABELS: L<CouncilRole> = {
  CHAIR: 'رئيس',
  DEPUTY_CHAIR: 'نائب الرئيس',
  SECRETARY: 'أمين المجلس',
  MEMBER: 'عضو',
  OBSERVER: 'مراقب',
};

export const MEMBERSHIP_STATUS_LABELS: L<'ACTIVE' | 'ENDED' | 'CANCELLED'> = {
  ACTIVE: 'سارية',
  ENDED: 'منتهية',
  CANCELLED: 'ملغاة',
};

export const MEETING_STATUS_LABELS: L<MeetingStatus> = {
  SCHEDULED: 'مجدول',
  HELD: 'منعقد',
  CANCELLED: 'ملغى',
};

export const AGENDA_STATUS_LABELS: L<AgendaItemStatus> = {
  OPEN: 'معروض',
  DISCUSSED: 'تمت مناقشته',
  DEFERRED: 'مؤجل',
  CLOSED: 'مغلق',
};

export const ATTENDANCE_LABELS: L<AttendanceStatus> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  EXCUSED: 'بعذر',
  LATE: 'متأخر',
};

export const RESOLUTION_KIND_LABELS: L<ResolutionKind> = {
  RESOLUTION: 'قرار',
  RECOMMENDATION: 'توصية',
  FOLLOW_UP_ACTION: 'إجراء متابعة',
};

export const RESOLUTION_STATUS_LABELS: L<ResolutionStatus> = {
  DRAFT: 'مسودة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  IMPLEMENTED: 'منفَّذ',
  ARCHIVED: 'مؤرشف',
};

export const MINUTES_STATUS_LABELS: L<MinutesStatus> = {
  DRAFT: 'مسودة',
  APPROVED: 'معتمد',
  SIGNED: 'موقَّع',
};

/* ── programs ───────────────────────────────────────────────────── */

export const PROGRAM_KIND_LABELS: L<ProgramKind> = {
  ACADEMIC: 'أكاديمي',
  TECHNICAL: 'تقني',
  PROFESSIONAL: 'مهني',
  VOCATIONAL_TRAINING: 'تدريب مهني',
  BASIC_FORMATION: 'تكوين أساسي',
};

export const PROGRAM_STATUS_LABELS: L<ProgramStatus> = {
  DRAFT: 'مسودة',
  APPROVED: 'معتمد',
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  CLOSED: 'مغلق',
};

export const VERSION_STATUS_LABELS: L<ProgramVersionStatus> = {
  DRAFT: 'مسودة',
  APPROVED: 'معتمدة',
  ACTIVE: 'سارية',
  RETIRED: 'متقاعدة',
};

export const PROGRAM_COURSE_KIND_LABELS: L<ProgramCourseKind> = {
  CORE: 'إجباري',
  ELECTIVE: 'اختياري',
  PRACTICUM: 'تدريب عملي',
  CAPSTONE: 'مشروع تخرج',
  SUPPORTING: 'داعم',
};

export const ENROLLMENT_STATUS_LABELS: L<EnrollmentStatus> = {
  CANDIDATE: 'مرشح',
  ACTIVE: 'نشط',
  ON_LEAVE: 'مجمد',
  WITHDRAWN: 'منسحب',
  SUSPENDED: 'موقوف',
  COMPLETED: 'مكتمل',
  GRADUATED: 'متخرج',
};

export const PLACEMENT_STATUS_LABELS: L<PlacementStatus> = {
  PLANNED: 'مخطط',
  ACTIVE: 'جارٍ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
  TERMINATED: 'موقوف',
};

export const CREDENTIAL_STATUS_LABELS: L<CredentialStatus> = {
  AWARDED: 'ممنوحة',
  REVOKED: 'مسحوبة',
  SUSPENDED: 'موقوفة',
};

/* ── compliance ─────────────────────────────────────────────────── */

export const ACCREDITATION_TYPE_LABELS: L<AccreditationType> = {
  INSTITUTIONAL: 'مؤسسي',
  PROGRAM: 'برامجي',
};

export const ACCREDITATION_SCOPE_LABELS: L<'INSTITUTION' | 'ORGANIZATIONAL_UNIT' | 'PROGRAM'> = {
  INSTITUTION: 'المؤسسة',
  ORGANIZATIONAL_UNIT: 'وحدة تنظيمية',
  PROGRAM: 'برنامج',
};

export const ACCREDITATION_STATUS_LABELS: L<AccreditationStatus> = {
  PENDING: 'قيد التقديم',
  IN_REVIEW: 'قيد المراجعة',
  GRANTED: 'ممنوح',
  CONDITIONAL: 'مشروط',
  RENEWED: 'مُجدد',
  SUSPENDED: 'موقوف',
  REVOKED: 'ملغى',
  EXPIRED: 'منتهي',
  WITHDRAWN: 'مسحوب',
};

export const LICENSE_KIND_LABELS: L<LicenseKind> = {
  TECHNICAL_LICENSE: 'ترخيص فني',
  OPERATING_PERMIT: 'إذن مزاولة',
  ESTABLISHMENT_DECISION: 'قرار إنشاء',
  OTHER: 'أخرى',
};

export const LICENSE_STATUS_LABELS: L<LicenseStatus> = {
  PENDING: 'قيد الإصدار',
  ACTIVE: 'ساري',
  RENEWED: 'مُجدد',
  SUSPENDED: 'موقوف',
  REVOKED: 'ملغى',
  EXPIRED: 'منتهي',
};

export const INSPECTION_KIND_LABELS: L<InspectionKind> = {
  MINISTRY: 'تفتيش وزاري',
  REGULATOR: 'تفتيش جهة رقابية',
  SAFETY: 'تفتيش سلامة',
  TECHNICAL: 'تفتيش فني',
  OTHER: 'أخرى',
};

export const INSPECTION_STATUS_LABELS: L<InspectionStatus> = {
  SCHEDULED: 'مجدول',
  IN_PROGRESS: 'جارٍ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export const FINDING_SEVERITY_LABELS: L<FindingSeverity> = {
  MINOR: 'بسيطة',
  MAJOR: 'جسيمة',
  CRITICAL: 'حرجة',
};

export const FINDING_STATUS_LABELS: L<FindingStatus> = {
  OPEN: 'مفتوحة',
  ACKNOWLEDGED: 'مُقرّ بها',
  IN_REMEDIATION: 'قيد المعالجة',
  RESOLVED: 'معالجة',
  DISPUTED: 'مُعترض عليها',
  CLOSED: 'مغلقة',
};

export const CORRECTIVE_STATUS_LABELS: L<CorrectiveStatus> = {
  PLANNED: 'مخطط',
  IN_PROGRESS: 'جارٍ',
  COMPLETED: 'منجز',
  VERIFIED: 'مُتحقق منه',
  CANCELLED: 'ملغى',
};

export const SELF_ASSESSMENT_STATUS_LABELS: L<'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ARCHIVED'> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مُقدمة',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'معتمدة',
  ARCHIVED: 'مؤرشفة',
};

export const EVIDENCE_OWNER_LABELS: L<EvidenceOwnerType> = {
  SELF_ASSESSMENT: 'تقييم ذاتي',
  ACCREDITATION: 'اعتماد',
  LICENSE: 'ترخيص',
  INSPECTION: 'تفتيش',
  FINDING: 'ملاحظة',
  CORRECTIVE_ACTION: 'إجراء تصحيحي',
  PROGRAM: 'برنامج',
  ORGANIZATIONAL_UNIT: 'وحدة تنظيمية',
  INSTITUTION: 'المؤسسة',
};

/* ── facilities & equipment ─────────────────────────────────────── */

export const FACILITY_TYPE_LABELS: L<FacilityType> = {
  LABORATORY: 'معمل',
  WORKSHOP: 'ورشة',
  CLASSROOM: 'قاعة دراسية',
  PRACTICAL_TRAINING_FACILITY: 'منشأة تدريب عملي',
  LECTURE_HALL: 'قاعة محاضرات',
  OTHER: 'أخرى',
};

export const FACILITY_STATUS_LABELS: L<FacilityStatus> = {
  ACTIVE: 'متاح',
  UNDER_MAINTENANCE: 'قيد الصيانة',
  CLOSED: 'مغلق',
  DECOMMISSIONED: 'مستبعد من الخدمة',
};

export const EQUIPMENT_CONDITION_LABELS: L<EquipmentCondition> = {
  NEW: 'جديد',
  GOOD: 'جيد',
  FAIR: 'مقبول',
  POOR: 'متدهور',
  BROKEN: 'معطل',
};

export const EQUIPMENT_STATUS_LABELS: L<EquipmentStatus> = {
  IN_SERVICE: 'في الخدمة',
  UNDER_MAINTENANCE: 'قيد الصيانة',
  OUT_OF_SERVICE: 'خارج الخدمة',
  DECOMMISSIONED: 'مستبعد',
  LOST: 'مفقود',
};

export const WORK_ORDER_KIND_LABELS: L<WorkOrderKind> = {
  PREVENTIVE: 'وقائية',
  CORRECTIVE: 'تصحيحية',
  SAFETY_INSPECTION: 'تفتيش سلامة',
  INSTALLATION: 'تركيب',
  OTHER: 'أخرى',
};

export const WORK_ORDER_STATUS_LABELS: L<WorkOrderStatus> = {
  OPEN: 'مفتوح',
  IN_PROGRESS: 'جارٍ',
  COMPLETED: 'منجز',
  CANCELLED: 'ملغى',
};

export const RESERVATION_STATUS_LABELS: L<ReservationStatus> = {
  REQUESTED: 'مطلوب',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
  COMPLETED: 'مكتمل',
};

export const INCIDENT_KIND_LABELS: L<IncidentKind> = {
  INCIDENT: 'حادث',
  INSPECTION: 'تفتيش سلامة',
};

export const INCIDENT_SEVERITY_LABELS: L<IncidentSeverity> = {
  MINOR: 'بسيط',
  MAJOR: 'جسيم',
  CRITICAL: 'حرج',
};

/* ── research ───────────────────────────────────────────────────── */

export const RESEARCH_STATUS_LABELS: L<ResearchStatus> = {
  PROPOSED: 'مقترح',
  APPROVED: 'معتمد',
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  COMPLETED: 'مكتمل',
  TERMINATED: 'منتهي',
};

export const RESEARCH_MEMBER_ROLE_LABELS: L<ResearchMemberRole> = {
  PRINCIPAL_INVESTIGATOR: 'باحث رئيس',
  CO_INVESTIGATOR: 'باحث مشارك',
  RESEARCHER: 'باحث',
  RESEARCH_ASSISTANT: 'مساعد بحث',
  COLLABORATOR: 'متعاون',
  TECHNICIAN: 'فني',
};

export const RESEARCH_OUTPUT_LABELS: L<ResearchOutputType> = {
  PUBLICATION: 'نشرة علمية',
  PATENT: 'براءة اختراع',
  PROTOTYPE: 'نموذج أولي',
  APPLIED_PRODUCT: 'منتج تطبيقي',
  TECHNICAL_REPORT: 'تقرير فني',
};

/* ── tone mapping (one chip vocabulary, data-tone) ───────────────── */

/** The workspace's single status-chip tone vocabulary — every status
 * maps to exactly one tone so screens read consistently. */
export type InstTone = 'ok' | 'info' | 'warn' | 'danger' | 'muted';

const TONE: Record<string, InstTone> = {
  // lifecycle "healthy" states
  ACTIVE: 'ok', GRANTED: 'ok', APPROVED: 'ok', SIGNED: 'ok', COMPLETED: 'ok',
  VERIFIED: 'ok', IN_SERVICE: 'ok', AWARDED: 'ok', PRESENT: 'ok', RESOLVED: 'ok',
  RENEWED: 'ok', GRADUATED: 'ok', IMPLEMENTED: 'ok', IMPLEMENTED_OK: 'ok', GOOD: 'ok',
  // in-flight / neutral
  PENDING: 'info', SCHEDULED: 'info', DRAFT: 'info', IN_REVIEW: 'info', REQUESTED: 'info',
  CANDIDATE: 'info', PLANNED: 'info', PROPOSED: 'info', SUBMITTED: 'info', UNDER_REVIEW: 'info',
  IN_PROGRESS: 'info', OPEN: 'info', ON_LEAVE: 'info', CONDITIONAL: 'warn', IN_REMEDIATION: 'warn',
  // attention
  PENDING_APPROVAL: 'warn', SUSPENDED: 'warn', EXPIRED: 'warn', FAIR: 'warn', LATE: 'warn',
  DEFERRED: 'warn', DISPUTED: 'warn', ACKNOWLEDGED: 'warn', UNDER_MAINTENANCE: 'warn',
  // adverse
  REVOKED: 'danger', REJECTED: 'danger', CANCELLED: 'danger', CLOSED: 'danger',
  WITHDRAWN: 'danger', ENDED: 'muted', DISSOLVED: 'muted', RETIRED: 'muted',
  ARCHIVED: 'muted', DECOMMISSIONED: 'muted', OUT_OF_SERVICE: 'danger', LOST: 'danger',
  BROKEN: 'danger', POOR: 'warn', ABSENT: 'danger', MINOR: 'warn', MAJOR: 'danger',
  CRITICAL: 'danger', TERMINATED: 'danger',
};

/** Tone for any status/enum value — unknown values read as muted. */
export function toneOf(value: string | null | undefined): InstTone {
  if (!value) return 'muted';
  return TONE[value] ?? 'muted';
}
