/**
 * r352 — lifecycle transition tables (lib/lifecycle-rules.ts): legal
 * moves allowed, illegal moves rejected, for every status-bearing
 * institutional entity.
 */
import { describe, expect, it } from 'vitest';
import {
  ACCREDITATION_TRANSITIONS, COUNCIL_TRANSITIONS, CORRECTIVE_ACTION_TRANSITIONS, FINDING_TRANSITIONS,
  INSPECTION_TRANSITIONS, LICENSE_TRANSITIONS, MINUTES_TRANSITIONS,
  PROGRAM_ENROLLMENT_TRANSITIONS, PROGRAM_TRANSITIONS, PROGRAM_VERSION_TRANSITIONS,
  RESERVATION_TRANSITIONS, RESOLUTION_TRANSITIONS, RESEARCH_PROJECT_TRANSITIONS,
  SELF_ASSESSMENT_TRANSITIONS, WORK_ORDER_TRANSITIONS, transitionAllowed,
} from '../../src/lib/lifecycle-rules';

const cases = <S extends string>(table: Partial<Record<S, readonly S[]>>, legal: [S, S][], illegal: [S, S][]) => {
  for (const [from, to] of legal) {
    it(`${from} → ${to} is legal`, () => {
      expect(transitionAllowed(table, from, to)).toBe(true);
    });
  }
  for (const [from, to] of illegal) {
    it(`${from} → ${to} is rejected`, () => {
      expect(transitionAllowed(table, from, to)).toBe(false);
    });
  }
};

describe('accreditation lifecycle', () => {
  cases(
    ACCREDITATION_TRANSITIONS,
    [
      ['PENDING', 'IN_REVIEW'], ['IN_REVIEW', 'GRANTED'], ['IN_REVIEW', 'CONDITIONAL'],
      ['IN_REVIEW', 'REJECTED'], ['GRANTED', 'RENEWED'], ['GRANTED', 'SUSPENDED'],
      ['SUSPENDED', 'GRANTED'], ['EXPIRED', 'IN_REVIEW'], ['GRANTED', 'EXPIRED'],
    ],
    [
      ['PENDING', 'GRANTED'], ['PENDING', 'REVOKED'], ['REVOKED', 'IN_REVIEW'],
      ['WITHDRAWN', 'IN_REVIEW'], ['GRANTED', 'PENDING'],
    ],
  );
});

describe('license lifecycle', () => {
  cases(
    LICENSE_TRANSITIONS,
    [['PENDING', 'ACTIVE'], ['ACTIVE', 'RENEWED'], ['ACTIVE', 'SUSPENDED'], ['SUSPENDED', 'ACTIVE'], ['EXPIRED', 'ACTIVE']],
    [['PENDING', 'RENEWED'], ['REVOKED', 'ACTIVE'], ['ACTIVE', 'PENDING']],
  );
});

describe('inspection lifecycle', () => {
  cases(
    INSPECTION_TRANSITIONS,
    [['SCHEDULED', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETED'], ['SCHEDULED', 'CANCELLED'], ['CANCELLED', 'SCHEDULED']],
    [['COMPLETED', 'IN_PROGRESS'], ['SCHEDULED', 'COMPLETED'], ['COMPLETED', 'CANCELLED']],
  );
});

describe('finding lifecycle', () => {
  cases(
    FINDING_TRANSITIONS,
    [['OPEN', 'ACKNOWLEDGED'], ['ACKNOWLEDGED', 'IN_REMEDIATION'], ['IN_REMEDIATION', 'RESOLVED'], ['RESOLVED', 'CLOSED'], ['OPEN', 'DISPUTED']],
    [['OPEN', 'RESOLVED'], ['CLOSED', 'OPEN'], ['IN_REMEDIATION', 'CLOSED']],
  );
});

describe('corrective action lifecycle', () => {
  cases(
    CORRECTIVE_ACTION_TRANSITIONS,
    [['PLANNED', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETED'], ['COMPLETED', 'VERIFIED'], ['PLANNED', 'CANCELLED']],
    [['PLANNED', 'COMPLETED'], ['VERIFIED', 'IN_PROGRESS'], ['COMPLETED', 'PLANNED']],
  );
});

describe('self-assessment lifecycle', () => {
  cases(
    SELF_ASSESSMENT_TRANSITIONS,
    [['DRAFT', 'SUBMITTED'], ['SUBMITTED', 'UNDER_REVIEW'], ['UNDER_REVIEW', 'APPROVED'], ['APPROVED', 'ARCHIVED'], ['SUBMITTED', 'DRAFT']],
    [['DRAFT', 'APPROVED'], ['ARCHIVED', 'DRAFT'], ['APPROVED', 'SUBMITTED']],
  );
});

describe('resolution lifecycle', () => {
  cases(
    RESOLUTION_TRANSITIONS,
    [['DRAFT', 'APPROVED'], ['DRAFT', 'REJECTED'], ['APPROVED', 'IMPLEMENTED'], ['IMPLEMENTED', 'ARCHIVED']],
    [['DRAFT', 'IMPLEMENTED'], ['REJECTED', 'APPROVED'], ['ARCHIVED', 'APPROVED']],
  );
});

describe('minutes lifecycle (draft → approve → sign)', () => {
  cases(
    MINUTES_TRANSITIONS,
    [['DRAFT', 'APPROVED'], ['APPROVED', 'SIGNED']],
    [['DRAFT', 'SIGNED'], ['SIGNED', 'DRAFT'], ['APPROVED', 'DRAFT']],
  );
});

describe('program lifecycle', () => {
  cases(
    PROGRAM_TRANSITIONS,
    [['DRAFT', 'APPROVED'], ['APPROVED', 'ACTIVE'], ['ACTIVE', 'SUSPENDED'], ['SUSPENDED', 'ACTIVE'], ['ACTIVE', 'CLOSED'], ['SUSPENDED', 'CLOSED']],
    [['DRAFT', 'ACTIVE'], ['CLOSED', 'DRAFT'], ['CLOSED', 'APPROVED']],
  );
});

describe('program version lifecycle', () => {
  cases(
    PROGRAM_VERSION_TRANSITIONS,
    [['DRAFT', 'APPROVED'], ['APPROVED', 'ACTIVE'], ['ACTIVE', 'RETIRED'], ['DRAFT', 'RETIRED']],
    [['DRAFT', 'ACTIVE'], ['RETIRED', 'ACTIVE'], ['ACTIVE', 'DRAFT']],
  );
});

describe('program enrollment lifecycle', () => {
  cases(
    PROGRAM_ENROLLMENT_TRANSITIONS,
    [['CANDIDATE', 'ACTIVE'], ['ACTIVE', 'ON_LEAVE'], ['ON_LEAVE', 'ACTIVE'], ['ACTIVE', 'GRADUATED'], ['COMPLETED', 'GRADUATED'], ['SUSPENDED', 'ACTIVE']],
    [['CANDIDATE', 'GRADUATED'], ['WITHDRAWN', 'ACTIVE'], ['GRADUATED', 'ACTIVE'], ['ACTIVE', 'CANDIDATE']],
  );
});

describe('work order lifecycle', () => {
  cases(
    WORK_ORDER_TRANSITIONS,
    [['OPEN', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETED'], ['OPEN', 'CANCELLED'], ['CANCELLED', 'OPEN']],
    [['OPEN', 'COMPLETED'], ['COMPLETED', 'CANCELLED']],
  );
});

describe('reservation lifecycle', () => {
  cases(
    RESERVATION_TRANSITIONS,
    [['REQUESTED', 'APPROVED'], ['REQUESTED', 'REJECTED'], ['APPROVED', 'COMPLETED'], ['APPROVED', 'CANCELLED']],
    [['REQUESTED', 'COMPLETED'], ['REJECTED', 'APPROVED'], ['COMPLETED', 'REQUESTED']],
  );
});

describe('research project lifecycle', () => {
  cases(
    RESEARCH_PROJECT_TRANSITIONS,
    [['PROPOSED', 'APPROVED'], ['APPROVED', 'ACTIVE'], ['ACTIVE', 'SUSPENDED'], ['SUSPENDED', 'ACTIVE'], ['ACTIVE', 'COMPLETED'], ['PROPOSED', 'TERMINATED']],
    [['PROPOSED', 'ACTIVE'], ['COMPLETED', 'ACTIVE'], ['TERMINATED', 'PROPOSED']],
  );
});

describe('council (organ) lifecycle — D16', () => {
  cases(
    COUNCIL_TRANSITIONS,
    [['ACTIVE', 'DISSOLVED'], ['ACTIVE', 'CANCELLED'], ['CANCELLED', 'ACTIVE']],
    [
      // DISSOLVED is the legal terminal state: a successor is a NEW
      // council, never a reactivation (integration hardening 2026-11-22).
      ['DISSOLVED', 'ACTIVE'], ['DISSOLVED', 'CANCELLED'], ['ACTIVE', 'ACTIVE'],
    ],
  );
});
