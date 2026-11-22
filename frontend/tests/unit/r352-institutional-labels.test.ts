/**
 * r352 — the institutional label registry's coverage pin: every enum
 * value the contract defines must carry an Arabic label, and the tone
 * vocabulary must stay total (unknown values read as muted, never
 * crash, never invent).
 */
import { describe, expect, it } from 'vitest';
import * as L from '../../src/lib/institutional/labels';
import type {
  AccreditationStatus, AppointmentStatus, CouncilType, EquipmentStatus, FindingStatus,
  InstitutionStatusExt, LicenseKind, MeetingStatus, OrgUnitType, ProgramKind,
  ResearchStatus, StaffCategory, StaffStatus, WorkOrderStatus,
} from '../../src/lib/institutional/types';

/** The contract's own enum value lists (DATA-MODEL.md) — the registry
 * must cover each one with a NON-EMPTY distinct Arabic label. */
const ENUMS: Array<[string, string[], Record<string, string>]> = [
  ['OrgUnitType (18)', [
    'FACULTY', 'COLLEGE', 'SCIENTIFIC_DEPARTMENT', 'INSTITUTE', 'RESEARCH_CENTER',
    'RESEARCH_UNIT', 'GENERAL_ADMINISTRATION', 'OFFICE', 'ADMINISTRATIVE_DEPARTMENT',
    'BRANCH', 'CAMPUS', 'TRAINING_UNIT', 'LABORATORY', 'WORKSHOP', 'DEANERY_OFFICE',
    'REGISTRAR_OFFICE', 'QA_OFFICE', 'OTHER',
  ] as OrgUnitType[], L.ORG_UNIT_TYPE_LABELS],
  ['StaffCategory (10, Law 21/2023 م2)', [
    'ACADEMIC_STAFF', 'TEACHING_ASSISTANT', 'TRAINER', 'ASSISTANT_TRAINER', 'TEACHER',
    'TECHNICAL_GUIDE', 'ADMINISTRATIVE_STAFF', 'TECHNICIAN', 'PROFESSIONAL', 'OTHER',
  ] as StaffCategory[], L.STAFF_CATEGORY_LABELS],
  ['InstitutionStatusExt (additive)', [
    'ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'CLOSED', 'MERGED',
  ] as InstitutionStatusExt[], L.INSTITUTION_STATUS_LABELS],
  ['AppointmentStatus', ['SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'] as AppointmentStatus[], L.APPOINTMENT_STATUS_LABELS],
  ['CouncilType (8)', [
    'UNIVERSITY_COUNCIL', 'FACULTY_COUNCIL', 'DEPARTMENT_COUNCIL', 'SCIENTIFIC_COUNCIL',
    'INSTITUTE_COUNCIL', 'DISCIPLINARY_COUNCIL', 'STANDING_COMMITTEE', 'OTHER',
  ] as CouncilType[], L.COUNCIL_TYPE_LABELS],
  ['MeetingStatus', ['SCHEDULED', 'HELD', 'CANCELLED'] as MeetingStatus[], L.MEETING_STATUS_LABELS],
  ['ProgramKind', ['ACADEMIC', 'TECHNICAL', 'PROFESSIONAL', 'VOCATIONAL_TRAINING', 'BASIC_FORMATION'] as ProgramKind[], L.PROGRAM_KIND_LABELS],
  ['LicenseKind', ['TECHNICAL_LICENSE', 'OPERATING_PERMIT', 'ESTABLISHMENT_DECISION', 'OTHER'] as LicenseKind[], L.LICENSE_KIND_LABELS],
  ['AccreditationStatus (10)', [
    'PENDING', 'IN_REVIEW', 'GRANTED', 'CONDITIONAL', 'RENEWED', 'SUSPENDED',
    'REVOKED', 'EXPIRED', 'WITHDRAWN',
  ] as AccreditationStatus[], L.ACCREDITATION_STATUS_LABELS],
  ['FindingStatus (6)', ['OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISPUTED', 'CLOSED'] as FindingStatus[], L.FINDING_STATUS_LABELS],
  ['EquipmentStatus (5)', ['IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED', 'LOST'] as EquipmentStatus[], L.EQUIPMENT_STATUS_LABELS],
  ['WorkOrderStatus', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as WorkOrderStatus[], L.WORK_ORDER_STATUS_LABELS],
  ['ResearchStatus (6)', ['PROPOSED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED'] as ResearchStatus[], L.RESEARCH_STATUS_LABELS],
  ['StaffStatus', ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'ENDED'] as StaffStatus[], L.STAFF_STATUS_LABELS],
];

describe('r352 institutional label registry — total enum coverage', () => {
  for (const [name, values, labels] of ENUMS) {
    it(`${name}: every value carries a non-empty Arabic label`, () => {
      for (const v of values) {
        const label = labels[v];
        expect(label, `${name}.${v} must be labelled`).toBeTruthy();
        expect(label!.trim()).not.toBe('');
      }
      // no extra invented keys beyond the contract's values
      expect(Object.keys(labels).sort()).toEqual([...values].sort());
    });
  }

  it('keeps the statutory staff-category wording (Law 21/2023 م2)', () => {
    expect(L.STAFF_CATEGORY_LABELS.ACADEMIC_STAFF).toBe('عضو هيئة تدريس');
    expect(L.STAFF_CATEGORY_LABELS.TEACHING_ASSISTANT).toBe('معيد');
    expect(L.STAFF_CATEGORY_LABELS.TECHNICAL_GUIDE).toBe('موجه فني');
  });

  it('keeps the TVET license vocabulary (الترخيص الفني / إذن المزاولة)', () => {
    expect(L.LICENSE_KIND_LABELS.TECHNICAL_LICENSE).toBe('ترخيص فني');
    expect(L.LICENSE_KIND_LABELS.OPERATING_PERMIT).toBe('إذن مزاولة');
  });
});

describe('r352 tone vocabulary — one chip grammar, fail-safe', () => {
  it('maps the healthy/adverse poles to distinct tones', () => {
    expect(L.toneOf('ACTIVE')).toBe('ok');
    expect(L.toneOf('GRANTED')).toBe('ok');
    expect(L.toneOf('REVOKED')).toBe('danger');
    expect(L.toneOf('CRITICAL')).toBe('danger');
    expect(L.toneOf('PENDING')).toBe('info');
    expect(L.toneOf('SUSPENDED')).toBe('warn');
    expect(L.toneOf('ENDED')).toBe('muted');
  });

  it('reads unknown or missing values as muted — never throws, never invents', () => {
    expect(L.toneOf('SOMETHING_NEW')).toBe('muted');
    expect(L.toneOf(null)).toBe('muted');
    expect(L.toneOf(undefined)).toBe('muted');
    expect(L.toneOf('')).toBe('muted');
  });
});
