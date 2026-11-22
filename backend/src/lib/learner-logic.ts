/**
 * r352 hardening (§5, §12) — pure learner-domain logic (DB-free,
 * unit-testable): category/program compatibility per Law 21/2023
 * Art. 2 (طالب ≠ متدرب) and the explicit credential-progression
 * decision over the CredentialProgressionRule catalog.
 */
import type { LearnerCategory, ProgramKind } from '@prisma/client';

/**
 * Law 21/2023 Art. 2 — the legal learner/program compatibility matrix:
 *  - STUDENT (طالب): formal education programs (university, technical
 *    college, higher/intermediate technical institute).
 *  - TRAINEE (متدرب): vocational formation and training paths (the
 *    open basic-formation path and the limited vocational-training
 *    path, Art. 38).
 */
export function learnerCategoryCompatible(
  category: LearnerCategory,
  programKind: ProgramKind,
): boolean {
  // [M]-interpretation (LEGAL-MATRIX §C): the statute names STUDENT and
  // TRAINEE (م2) and ties program kinds to the TVET stages (م4/م38);
  // the STUDENT↔PROFESSIONAL pairing below is a design reading — the
  // matrix gives no explicit learner category for Art. 26 professional
  // diplomas. Documented here so the inference stays visible.
  if (category === 'STUDENT') {
    return programKind === 'ACADEMIC' || programKind === 'TECHNICAL' || programKind === 'PROFESSIONAL';
  }
  return programKind === 'VOCATIONAL_TRAINING' || programKind === 'BASIC_FORMATION';
}

/** The shape of a progression rule row the pure decision consumes. */
export interface ProgressionRuleFacts {
  toCredentialTypeId: string;
  toInstitutionTypeCodes: string[];
  toProgramKinds: string[];
  isActive: boolean;
}

/**
 * §12 — may a holder of `fromCredentialTypeId` be admitted into a
 * program awarding `toCredentialTypeId` in `toInstitutionTypeCode` of
 * kind `toProgramKind`? Decision inputs:
 *   1. an ACTIVE rule must exist for exactly this (from → to) pair
 *      (the rules list is pre-filtered to the from-side by the caller);
 *   2. when the rule constrains destination institution types, the
 *      destination's type code must be in the list;
 *   3. when the rule constrains destination program kinds, the
 *      destination's kind must be in the list.
 * No numeric-level inference anywhere — the rule catalog IS the law.
 */
export function progressionAllowed(
  rules: readonly ProgressionRuleFacts[],
  _fromCredentialTypeId: string,
  toCredentialTypeId: string,
  toInstitutionTypeCode: string | null,
  toProgramKind: ProgramKind,
): boolean {
  return rules.some((rule) => {
    if (!rule.isActive) return false;
    if (rule.toCredentialTypeId !== toCredentialTypeId) return false;
    if (
      rule.toInstitutionTypeCodes.length > 0 &&
      (toInstitutionTypeCode === null || !rule.toInstitutionTypeCodes.includes(toInstitutionTypeCode))
    ) {
      return false;
    }
    if (rule.toProgramKinds.length > 0 && !rule.toProgramKinds.includes(toProgramKind)) {
      return false;
    }
    return true;
  });
}
