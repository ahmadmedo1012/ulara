/**
 * r352 — pure appointment logic (lib/appointments-logic.ts).
 */
import { describe, expect, it } from 'vitest';
import {
  appointmentConflicts,
  appointmentDatesValid,
  positionEligibleForKind,
  scopeRequirementSatisfied,
  windowsOverlap,
  type AppointmentWindow,
} from '../../src/lib/appointments-logic';

const d = (iso: string) => new Date(iso);
const win = (over: Partial<AppointmentWindow> = {}): AppointmentWindow => ({
  startDate: d('2026-01-01'),
  endDate: d('2026-12-31'),
  status: 'ACTIVE',
  acting: false,
  ...over,
});

describe('appointmentDatesValid', () => {
  it('accepts start ≤ end and open-ended', () => {
    expect(appointmentDatesValid(d('2026-01-01'), d('2026-12-31'))).toBe(true);
    expect(appointmentDatesValid(d('2026-01-01'), null)).toBe(true);
    expect(appointmentDatesValid(d('2026-01-01'), d('2026-01-01'))).toBe(true);
  });
  it('rejects start > end', () => {
    expect(appointmentDatesValid(d('2026-12-31'), d('2026-01-01'))).toBe(false);
  });
});

describe('windowsOverlap', () => {
  it('detects overlap in both directions and treats null end as open', () => {
    expect(windowsOverlap(win(), win({ startDate: d('2026-06-01') }))).toBe(true);
    expect(windowsOverlap(win({ startDate: d('2026-06-01') }), win())).toBe(true);
    expect(windowsOverlap(win(), win({ startDate: d('2027-01-01') }))).toBe(false);
    expect(windowsOverlap(win({ endDate: null }), win({ startDate: d('2030-01-01') }))).toBe(true);
  });
  it('adjacent windows do not overlap', () => {
    expect(
      windowsOverlap(win({ endDate: d('2026-06-30') }), win({ startDate: d('2026-07-01') })),
    ).toBe(false);
  });
});

describe('appointmentConflicts (the substantive-seat invariant)', () => {
  it('a substantive live appointment conflicts with an overlapping one', () => {
    expect(appointmentConflicts([win()], win({ startDate: d('2026-02-01') }))).toBe(true);
  });
  it('ended/cancelled appointments never conflict', () => {
    expect(
      appointmentConflicts(
        [win({ status: 'ENDED' }), win({ status: 'CANCELLED' })],
        win(),
      ),
    ).toBe(false);
  });
  it('acting appointments coexist (تكليف بالنيابة)', () => {
    expect(appointmentConflicts([win()], win({ acting: true }))).toBe(false);
    expect(appointmentConflicts([win({ acting: true })], win())).toBe(false);
  });
  it('non-overlapping successor is fine', () => {
    expect(
      appointmentConflicts([win({ endDate: d('2026-06-30') })], win({ startDate: d('2026-07-01') })),
    ).toBe(false);
  });
});

describe('scopeRequirementSatisfied', () => {
  it('no requirement accepts any unit (or none)', () => {
    expect(scopeRequirementSatisfied(null, null)).toBe(true);
    expect(scopeRequirementSatisfied(null, 'FACULTY')).toBe(true);
  });
  it('a requirement demands exactly that unit type', () => {
    expect(scopeRequirementSatisfied('FACULTY', 'FACULTY')).toBe(true);
    expect(scopeRequirementSatisfied('FACULTY', 'SCIENTIFIC_DEPARTMENT')).toBe(false);
    expect(scopeRequirementSatisfied('FACULTY', null)).toBe(false);
  });
});

describe('positionEligibleForKind', () => {
  it('empty eligibility = all kinds (incl. unclassified)', () => {
    expect(positionEligibleForKind([], null)).toBe(true);
    expect(positionEligibleForKind([], 'HIGHER_TECHNICAL_INSTITUTE')).toBe(true);
  });
  it('explicit list gates the institution kind', () => {
    expect(positionEligibleForKind(['UNIVERSITY'], 'UNIVERSITY')).toBe(true);
    expect(positionEligibleForKind(['UNIVERSITY'], 'TECHNICAL_COLLEGE')).toBe(false);
    expect(positionEligibleForKind(['UNIVERSITY'], null)).toBe(false);
  });
});
