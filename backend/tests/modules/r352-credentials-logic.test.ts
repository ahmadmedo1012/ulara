/**
 * r352 — credential progression rules (Law 21/2023 Arts. 4, 5, 26, 38).
 */
import { describe, expect, it } from 'vitest';
import { CREDENTIAL_CATALOG, canProgressTo, credentialFacts } from '../../src/lib/credentials-logic';

const f = (code: string) => {
  const facts = credentialFacts(code);
  expect(facts, `${code} must be in the catalog`).not.toBeNull();
  return facts!;
};

describe('the statutory catalog', () => {
  it('carries the ten legal qualification types', () => {
    expect(CREDENTIAL_CATALOG.map((c) => c.code).sort()).toEqual([
      'BASIC_FORMATION_CERT', 'HIGHER_TECHNICAL_DIPLOMA', 'HIGH_LICENSE_MASTERS',
      'INTERMEDIATE_TECHNICAL_DIPLOMA', 'MEDICAL_BOARD_CERT', 'OTHER',
      'PRECISE_LICENSE_DOCTORATE', 'SPECIALIZED_PROFESSIONAL_DIPLOMA',
      'TECHNICAL_BACHELOR', 'VOCATIONAL_TRAINING_CERT',
    ]);
  });
  it('levels form a strict ladder within each progression tier', () => {
    expect(f('BASIC_FORMATION_CERT').level).toBeLessThan(f('INTERMEDIATE_TECHNICAL_DIPLOMA').level);
    expect(f('INTERMEDIATE_TECHNICAL_DIPLOMA').level).toBeLessThan(f('TECHNICAL_BACHELOR').level);
    expect(f('TECHNICAL_BACHELOR').level).toBeLessThan(f('HIGH_LICENSE_MASTERS').level);
    expect(f('HIGH_LICENSE_MASTERS').level).toBeLessThan(f('PRECISE_LICENSE_DOCTORATE').level);
  });
});

describe('canProgressTo (the legal progression matrix)', () => {
  it('م38: the vocational-training certificate (المسار المحدود) never progresses', () => {
    expect(canProgressTo(f('VOCATIONAL_TRAINING_CERT'), f('INTERMEDIATE_TECHNICAL_DIPLOMA'))).toBe(false);
    expect(canProgressTo(f('VOCATIONAL_TRAINING_CERT'), f('BASIC_FORMATION_CERT'))).toBe(false);
  });
  it('م38: the basic-formation certificate (المسار المفتوح) may enter intermediate institutes', () => {
    expect(canProgressTo(f('BASIC_FORMATION_CERT'), f('INTERMEDIATE_TECHNICAL_DIPLOMA'))).toBe(true);
  });
  it('م26: the specialized professional diploma never progresses', () => {
    expect(canProgressTo(f('SPECIALIZED_PROFESSIONAL_DIPLOMA'), f('HIGHER_TECHNICAL_DIPLOMA'))).toBe(false);
    expect(canProgressTo(f('SPECIALIZED_PROFESSIONAL_DIPLOMA'), f('TECHNICAL_BACHELOR'))).toBe(false);
  });
  it('م4: the technical ladder climbs', () => {
    expect(canProgressTo(f('INTERMEDIATE_TECHNICAL_DIPLOMA'), f('TECHNICAL_BACHELOR'))).toBe(true);
    expect(canProgressTo(f('INTERMEDIATE_TECHNICAL_DIPLOMA'), f('HIGHER_TECHNICAL_DIPLOMA'))).toBe(true);
    expect(canProgressTo(f('HIGHER_TECHNICAL_DIPLOMA'), f('HIGH_LICENSE_MASTERS'))).toBe(true);
  });
  it('never progresses downward', () => {
    expect(canProgressTo(f('TECHNICAL_BACHELOR'), f('INTERMEDIATE_TECHNICAL_DIPLOMA'))).toBe(false);
    expect(canProgressTo(f('HIGH_LICENSE_MASTERS'), f('BASIC_FORMATION_CERT'))).toBe(false);
  });
});
