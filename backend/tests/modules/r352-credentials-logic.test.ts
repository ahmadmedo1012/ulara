/**
 * r352 — credential progression rules (Law 21/2023 Arts. 4, 5, 26, 38).
 * The numeric-level helper was retired with the integration-audit
 * dead-code paydown — the ladder semantics are enforced (and pinned
 * end-to-end) through the seeded CredentialProgressionRule rows in the
 * integration suite (tests/integration/r352-scenarios.test.ts §12).
 */
import { describe, expect, it } from 'vitest';
import { CREDENTIAL_CATALOG, credentialFacts } from '../../src/lib/credentials-logic';

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

