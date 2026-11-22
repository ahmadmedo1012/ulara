/**
 * r352 hardening unit tests — the pure learner-domain logic (§5, §12):
 * the Law 21/2023 Art. 2 category/program compatibility matrix and the
 * explicit credential-progression decision over the rule catalog.
 */
import { describe, expect, it } from 'vitest';
import {
  learnerCategoryCompatible,
  progressionAllowed,
  type ProgressionRuleFacts,
} from '../../src/lib/learner-logic';

describe('learnerCategoryCompatible — Law 21/2023 Art. 2 (طالب ≠ متدرب)', () => {
  it('STUDENT enrolls in formal education programs', () => {
    expect(learnerCategoryCompatible('STUDENT', 'ACADEMIC')).toBe(true);
    expect(learnerCategoryCompatible('STUDENT', 'TECHNICAL')).toBe(true);
    expect(learnerCategoryCompatible('STUDENT', 'PROFESSIONAL')).toBe(true);
  });

  it('STUDENT cannot enroll in the vocational formation/training paths', () => {
    expect(learnerCategoryCompatible('STUDENT', 'BASIC_FORMATION')).toBe(false);
    expect(learnerCategoryCompatible('STUDENT', 'VOCATIONAL_TRAINING')).toBe(false);
  });

  it('TRAINEE enrolls in the open and limited training paths only', () => {
    expect(learnerCategoryCompatible('TRAINEE', 'BASIC_FORMATION')).toBe(true);
    expect(learnerCategoryCompatible('TRAINEE', 'VOCATIONAL_TRAINING')).toBe(true);
    expect(learnerCategoryCompatible('TRAINEE', 'ACADEMIC')).toBe(false);
    expect(learnerCategoryCompatible('TRAINEE', 'TECHNICAL')).toBe(false);
    expect(learnerCategoryCompatible('TRAINEE', 'PROFESSIONAL')).toBe(false);
  });
});

describe('progressionAllowed — the explicit rule catalog is the law (§12)', () => {
  const to = (toCredentialTypeId: string, extra: Partial<ProgressionRuleFacts> = {}): ProgressionRuleFacts => ({
    toCredentialTypeId,
    toInstitutionTypeCodes: [],
    toProgramKinds: [],
    isActive: true,
    ...extra,
  });

  it('no rule → no progression (the absence of a row IS the prohibition)', () => {
    expect(progressionAllowed([], 'from-1', 'to-1', null, 'TECHNICAL')).toBe(false);
  });

  it('an inactive rule does not authorize', () => {
    expect(
      progressionAllowed([to('to-1', { isActive: false })], 'from-1', 'to-1', null, 'TECHNICAL'),
    ).toBe(false);
  });

  it('a matching active rule authorizes', () => {
    expect(progressionAllowed([to('to-1')], 'from-1', 'to-1', null, 'TECHNICAL')).toBe(true);
  });

  it('a rule for a DIFFERENT destination credential does not authorize', () => {
    expect(progressionAllowed([to('to-other')], 'from-1', 'to-1', null, 'TECHNICAL')).toBe(false);
  });

  it('institution-type constraints are honored (empty destination type code fails a constrained rule)', () => {
    const constrained = [to('to-1', { toInstitutionTypeCodes: ['INTERMEDIATE_TECHNICAL_INSTITUTE'] })];
    expect(progressionAllowed(constrained, 'from-1', 'to-1', 'INTERMEDIATE_TECHNICAL_INSTITUTE', 'TECHNICAL')).toBe(true);
    expect(progressionAllowed(constrained, 'from-1', 'to-1', 'HIGHER_TECHNICAL_INSTITUTE', 'TECHNICAL')).toBe(false);
    expect(progressionAllowed(constrained, 'from-1', 'to-1', null, 'TECHNICAL')).toBe(false);
  });

  it('program-kind constraints are honored', () => {
    const constrained = [to('to-1', { toProgramKinds: ['TECHNICAL'] })];
    expect(progressionAllowed(constrained, 'from-1', 'to-1', null, 'TECHNICAL')).toBe(true);
    expect(progressionAllowed(constrained, 'from-1', 'to-1', null, 'ACADEMIC')).toBe(false);
  });
});
