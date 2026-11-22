/**
 * r352 — pure appointment logic (DB-free, unit-testable).
 */
import type { OrgUnitType } from './org-unit-types.js';

export interface AppointmentWindow {
  startDate: Date;
  endDate: Date | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  acting: boolean;
}

/** Dates valid: start <= end when end present. */
export function appointmentDatesValid(startDate: Date, endDate: Date | null): boolean {
  if (!endDate) return true;
  return startDate.getTime() <= endDate.getTime();
}

/** Do two appointment windows overlap in time? (Null end = open.) */
export function windowsOverlap(a: AppointmentWindow, b: AppointmentWindow): boolean {
  const aStart = a.startDate.getTime();
  const bStart = b.startDate.getTime();
  const aEnd = a.endDate ? a.endDate.getTime() : Number.POSITIVE_INFINITY;
  const bEnd = b.endDate ? b.endDate.getTime() : Number.POSITIVE_INFINITY;
  return aStart < bEnd && bStart < aEnd;
}

/** Would a new substantive (non-acting) appointment conflict with an
 * existing one? Conflict = overlapping window AND both substantive AND
 * both live (SCHEDULED/ACTIVE) — the same (position, unit) seat.
 * Acting appointments never conflict (تكليف بالنيابة coexists). */
export function appointmentConflicts(
  existing: readonly AppointmentWindow[],
  next: AppointmentWindow,
): boolean {
  if (next.acting) return false;
  return existing.some(
    (e) =>
      !e.acting &&
      (e.status === 'SCHEDULED' || e.status === 'ACTIVE') &&
      windowsOverlap(e, next),
  );
}

/** Does the org unit satisfy the template's scope requirement? */
export function scopeRequirementSatisfied(
  scopeRequirement: OrgUnitType | null,
  unitType: string | null,
): boolean {
  if (!scopeRequirement) return true;
  return unitType === scopeRequirement;
}

/** Is the template eligible for this institution kind? (Empty
 * eligibility list = all kinds.) */
export function positionEligibleForKind(
  eligibleInstitutionTypeCodes: readonly string[],
  institutionTypeCode: string | null,
): boolean {
  if (eligibleInstitutionTypeCodes.length === 0) return true;
  if (!institutionTypeCode) return false; // unclassified institution — only all-kind templates
  return eligibleInstitutionTypeCodes.includes(institutionTypeCode);
}
