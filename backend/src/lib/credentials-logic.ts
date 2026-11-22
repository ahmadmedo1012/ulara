/**
 * r352 — pure credential progression rules (Law 21/2023 Arts. 4, 5, 26, 38).
 */
export interface CredentialTypeFacts {
  code: string;
  level: number;
  grantsProgression: boolean;
}

/**
 * May a holder of `from` progress into a program awarding `to`?
 * Law 21/2023: شهادة التكوين الأساسي may enter intermediate technical
 * institutes; الدبلوم الفني المتوسط may enter higher technical
 * education; the vocational-training certificate and the specialized
 * professional diploma explicitly do NOT allow further study; higher
 * tiers ladder by level.
 */
export function canProgressTo(from: CredentialTypeFacts, to: CredentialTypeFacts): boolean {
  if (!from.grantsProgression) return false;
  return to.level > from.level;
}

/** The seeded statutory catalog (single source for seed.ts and tests).
 * Levels order the ladder; legalBasis cites the article. */
export const CREDENTIAL_CATALOG: readonly CredentialTypeFacts[] = [
  { code: 'VOCATIONAL_TRAINING_CERT', level: 1, grantsProgression: false }, // م38 المسار المحدود
  { code: 'BASIC_FORMATION_CERT', level: 1, grantsProgression: true }, // م38 المسار المفتوح → معاهد متوسطة
  { code: 'INTERMEDIATE_TECHNICAL_DIPLOMA', level: 2, grantsProgression: true }, // م4(2) → تقني عالٍ
  { code: 'SPECIALIZED_PROFESSIONAL_DIPLOMA', level: 3, grantsProgression: false }, // م26 — لا تسمح بمواصلة الدراسة
  { code: 'HIGHER_TECHNICAL_DIPLOMA', level: 3, grantsProgression: true }, // م26/م4(3)
  { code: 'TECHNICAL_BACHELOR', level: 4, grantsProgression: true }, // م4(3)
  { code: 'HIGH_LICENSE_MASTERS', level: 5, grantsProgression: true }, // م4(4) الإجازة العالية
  { code: 'PRECISE_LICENSE_DOCTORATE', level: 6, grantsProgression: false }, // م4(4) الإجازة الدقيقة
  { code: 'MEDICAL_BOARD_CERT', level: 6, grantsProgression: false }, // قانون 9/2026 م33 مكرر — تعادل الدكتوراه
  { code: 'OTHER', level: 0, grantsProgression: false }, // بقرار مجلس الوزراء — م5
];

/** Map a credential code to its facts (null when unknown). */
export function credentialFacts(code: string): CredentialTypeFacts | null {
  return CREDENTIAL_CATALOG.find((c) => c.code === code) ?? null;
}
