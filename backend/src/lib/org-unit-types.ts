/**
 * r352 — the organizational-unit type vocabulary.
 *
 * Stored as a plain string column (not a Prisma enum) so operators can
 * extend unit types without migrations; THIS table is the controlled
 * vocabulary the service validates against (see DATA-MODEL.md §2 —
 * 18 types covering faculties, scientific departments, institutes,
 * research centers/units, general administrations, offices, branches,
 * campuses, training units, labs and workshops).
 */
export const ORG_UNIT_TYPES = [
  'FACULTY',
  'COLLEGE',
  'SCIENTIFIC_DEPARTMENT',
  'INSTITUTE',
  'RESEARCH_CENTER',
  'RESEARCH_UNIT',
  'GENERAL_ADMINISTRATION',
  'OFFICE',
  'ADMINISTRATIVE_DEPARTMENT',
  'BRANCH',
  'CAMPUS',
  'TRAINING_UNIT',
  'LABORATORY',
  'WORKSHOP',
  'DEANERY_OFFICE',
  'REGISTRAR_OFFICE',
  'QA_OFFICE',
  'OTHER',
] as const;

export type OrgUnitType = (typeof ORG_UNIT_TYPES)[number];

export const isOrgUnitType = (v: string): v is OrgUnitType =>
  (ORG_UNIT_TYPES as readonly string[]).includes(v);

/** Unit types that mirror to the legacy Faculty table. */
export const FACULTY_MIRROR_TYPES: readonly OrgUnitType[] = ['FACULTY'];
/** Unit types that mirror to the legacy Department table. */
export const DEPARTMENT_MIRROR_TYPES: readonly OrgUnitType[] = ['SCIENTIFIC_DEPARTMENT'];
