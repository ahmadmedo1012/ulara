/**
 * Single, typed application error class.
 * The error handler middleware turns these into clean JSON responses.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TOO_MANY_REQUESTS'
  | 'INSTITUTION_CONTEXT_REQUIRED'
  | 'INSTITUTION_CONTEXT_INVALID'
  | 'REG_NUMBER_AMBIGUOUS'
  // r341 (INV-3 t07): /api/v1/health's 503 DB-failure body predates this
  // union — the code existed only as a string literal. First-class member
  // now, so client error mappers (the mobile ApiError switch, the FE
  // support-code chip) can parse it like every other code.
  | 'DB_UNAVAILABLE'
  // r352 — institutional-core codes (all 4xx, Arabic messages; the
  // handler maps them via AppError instances, never raw strings).
  | 'INSTITUTION_KIND_SECTOR_MISMATCH'
  | 'PARENT_CYCLE'
  | 'PARENT_SECTOR_MISMATCH'
  | 'ORG_UNIT_CODE_TAKEN'
  | 'ORG_UNIT_DUPLICATE_NAME'
  | 'ORG_UNIT_PARENT_SAME_INSTITUTION'
  | 'ORG_UNIT_PARENT_MISSING'
  | 'ORG_UNIT_CYCLE'
  | 'ORG_UNIT_HAS_ACTIVE_CHILDREN'
  | 'ORG_UNIT_CITY_REQUIRED'
  | 'PERSON_NUMBER_TAKEN'
  | 'PERSON_USER_ALREADY_LINKED'
  | 'PERSON_UNIT_NOT_IN_INSTITUTION'
  | 'APPOINTMENT_CONFLICT'
  | 'APPOINTMENT_UNIT_TYPE_REQUIRED'
  | 'APPOINTMENT_DATES_INVALID'
  | 'APPOINTMENT_POSITION_NOT_ELIGIBLE'
  | 'COUNCIL_MEMBERSHIP_ACTIVE_EXISTS'
  | 'ATTENDEE_NOT_MEMBER'
  | 'MEETING_SEQ_TAKEN'
  | 'MEETING_INVALID_TRANSITION'
  | 'RESOLUTION_INVALID_TRANSITION'
  | 'MINUTES_INVALID_TRANSITION'
  | 'TERM_CODE_TAKEN'
  | 'PROGRAM_CODE_TAKEN'
  | 'PROGRAM_VERSION_INVALID_TRANSITION'
  | 'PROGRAM_VERSION_ACTIVE_EXISTS'
  | 'PROGRAM_COURSE_WRONG_INSTITUTION'
  | 'PROGRAM_ENROLLMENT_EXISTS'
  | 'PROGRAM_ENROLLMENT_INVALID_TRANSITION'
  | 'ENROLLMENT_PROFILE_WRONG_INSTITUTION'
  | 'CREDENTIAL_SERIAL_TAKEN'
  | 'ACCREDITATION_SCOPE_INVALID'
  | 'ACCREDITATION_INVALID_TRANSITION'
  | 'LICENSE_INVALID_TRANSITION'
  | 'INSPECTION_INVALID_TRANSITION'
  | 'FINDING_INVALID_TRANSITION'
  | 'CORRECTIVE_ACTION_INVALID_TRANSITION'
  | 'SELF_ASSESSMENT_INVALID_TRANSITION'
  | 'EVIDENCE_OWNER_INVALID'
  | 'FACILITY_CODE_TAKEN'
  | 'EQUIPMENT_CODE_TAKEN'
  | 'WORK_ORDER_INVALID_TRANSITION'
  | 'RESERVATION_WINDOW_INVALID'
  | 'RESERVATION_OVERLAP'
  | 'RESEARCH_PROJECT_INVALID_TRANSITION'
  | 'PROJECT_MEMBER_EXISTS'
  | 'UNIT_ROLE_EXISTS'
  | 'UNIT_ROLE_UNIT_INVALID'
  | 'USER_NOT_MEMBER'
  // r352 hardening — scoped-authorization + tenant-integrity codes.
  | 'UNIT_GRANT_INSTITUTION_MISMATCH'
  | 'GRANT_EXCEEDS_AUTHORITY'
  | 'FACILITY_NOT_OPERATIONAL'
  | 'EQUIPMENT_FACILITY_UNIT_MISMATCH'
  | 'EVIDENCE_OWNER_TYPE_INVALID'
  | 'MINUTES_VERSION_IMMUTABLE'
  | 'MINUTES_VERSION_REQUIRED'
  | 'PROGRESSION_NOT_ALLOWED'
  | 'LEARNER_NUMBER_TAKEN'
  | 'LEARNER_ENROLLMENT_CATEGORY_MISMATCH'
  | 'PLACEMENT_ENROLLMENT_MISMATCH'
  | 'CREDENTIAL_ENROLLMENT_MISMATCH'
  | 'ORG_UNIT_TYPE_INVALID'
  | 'ORG_UNIT_TYPE_PARENT_INVALID'
  | 'ORG_UNIT_DEPTH_EXCEEDED'
  | 'INSTITUTION_AFFILIATION_DEPTH_EXCEEDED'
  | 'INTERNAL';

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  // Default messages are Arabic per D17-3 (message language policy):
  // UPPER_SNAKE codes stay English for the FE support-code chip; the
  // human-readable message is what toasts render. Keep them short, calm
  // and user-actionable — they surface verbatim in the UI.
  static badRequest(message = 'طلب غير صالح — تحقّق من البيانات المُرسلة', details?: unknown) {
    return new AppError('BAD_REQUEST', message, 400, details);
  }
  static unauthenticated(message = 'يلزم تسجيل الدخول للمتابعة') {
    return new AppError('UNAUTHENTICATED', message, 401);
  }
  static invalidCredentials(message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة') {
    return new AppError('INVALID_CREDENTIALS', message, 401);
  }
  static forbidden(message = 'لا تملك صلاحية تنفيذ هذا الإجراء') {
    return new AppError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'العنصر المطلوب غير موجود') {
    return new AppError('NOT_FOUND', message, 404);
  }
  static conflict(message = 'تعارض في البيانات — حدّث الصفحة ثم أعد المحاولة', details?: unknown) {
    return new AppError('CONFLICT', message, 409, details);
  }
  static tooMany(message = 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة') {
    return new AppError('TOO_MANY_REQUESTS', message, 429);
  }
  /**
   * Intentional server fault. Deliberately takes no `details` and its
   * message must stay client-safe: the error handler forwards AppError
   * payloads verbatim, so internals (stacks, SQL, file paths) belong
   * in the server log — the default matches the catch-all 500 text
   * exactly.
   */
  static internal(message = 'حدث خطأ غير متوقع — حاول مرة أخرى') {
    return new AppError('INTERNAL', message, 500);
  }
}
