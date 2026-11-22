/**
 * r352 hardening (§4) — tenant-integrity guards for every relationship.
 *
 * The R352 data model uses simple foreign keys (no composite tenant
 * ownership constraints), so EVERY create/update that accepts an FK
 * from a request must prove the referenced record belongs to the
 * caller's ACTIVE institution (and to the correct parent / lifecycle
 * state where applicable). These helpers centralize that proof so the
 * route sweep cannot drift.
 *
 * Contract: every `assertSameInstitution*` helper throws a clean
 * AppError (400 INVALID_REF / 404 NOT_FOUND per the route's existing
 * error-code convention) — never leaking cross-tenant existence.
 */
import type { Capability, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * Prove an org unit exists AND belongs to the institution (404-shaped
 * refusal — never leak that the unit exists elsewhere).
 */
export async function assertOrgUnitInInstitution(orgUnitId: string, institutionId: string): Promise<void> {
  const unit = await prisma.organizationalUnit.findUnique({
    where: { id: orgUnitId },
    select: { institutionId: true, status: true },
  });
  if (!unit || unit.institutionId !== institutionId) {
    throw AppError.notFound('الوحدة التنظيمية المطلوبة غير موجودة');
  }
}

/** Prove an institutional person belongs to the institution. */
export async function assertPersonInInstitution(personId: string, institutionId: string): Promise<void> {
  const person = await prisma.institutionalPerson.findUnique({
    where: { id: personId },
    select: { institutionId: true, staffStatus: true },
  });
  if (!person || person.institutionId !== institutionId) {
    throw AppError.notFound('الشخص المؤسسي المطلوب غير موجود');
  }
}

/** Prove a program belongs to the institution. */
export async function assertProgramInInstitution(programId: string, institutionId: string): Promise<void> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { institutionId: true },
  });
  if (!program || program.institutionId !== institutionId) {
    throw AppError.notFound('البرنامج المطلوب غير موجود');
  }
}

/** Prove a learner profile belongs to the institution. */
export async function assertLearnerInInstitution(learnerProfileId: string, institutionId: string): Promise<void> {
  const learner = await prisma.learnerProfile.findUnique({
    where: { id: learnerProfileId },
    select: { institutionId: true },
  });
  if (!learner || learner.institutionId !== institutionId) {
    throw AppError.notFound('ملف المتعلم المطلوب غير موجود');
  }
}

/**
 * Prove a facility belongs to the institution AND is operational
 * (ACTIVE status — a dissolved/retired facility cannot host equipment
 * or reservations).
 */
export async function assertFacilityInInstitution(
  facilityId: string,
  institutionId: string,
  opts: { requireOperational?: boolean } = {},
): Promise<void> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { institutionId: true, status: true },
  });
  if (!facility || facility.institutionId !== institutionId) {
    throw AppError.notFound('المنشأة المطلوبة غير موجودة');
  }
  if (opts.requireOperational && facility.status !== 'ACTIVE') {
    throw new AppError(
      'FACILITY_NOT_OPERATIONAL',
      'المنشأة غير تشغيلية — لا يمكن استخدامها حاليًا',
      409,
    );
  }
}

/** Prove equipment belongs to the institution. */
export async function assertEquipmentInInstitution(equipmentId: string, institutionId: string): Promise<void> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { institutionId: true },
  });
  if (!equipment || equipment.institutionId !== institutionId) {
    throw AppError.notFound('المعدة المطلوبة غير موجودة');
  }
}

/** Prove a course belongs to the institution. */
export async function assertCourseInInstitution(courseId: string, institutionId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { institutionId: true },
  });
  if (!course || course.institutionId !== institutionId) {
    throw AppError.notFound('المقرر المطلوب غير موجود');
  }
}

/**
 * Prove a facility and an organizational unit are compatible: same
 * institution, and (when both carry an org-unit home) the facility's
 * unit must be the equipment unit or one of its ancestors.
 */
export async function assertFacilityUnitCompatible(
  facilityId: string,
  orgUnitId: string,
): Promise<void> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { orgUnitId: true },
  });
  if (!facility) throw AppError.notFound('المنشأة المطلوبة غير موجودة');
  if (facility.orgUnitId === null || facility.orgUnitId === orgUnitId) return;
  // Walk the unit's ancestors: the facility's unit must appear there.
  let cur: string | null = orgUnitId;
  for (let i = 0; i < 65 && cur !== null; i += 1) {
    const row: { parentId: string | null } | null = await prisma.organizationalUnit.findUnique({
      where: { id: cur },
      select: { parentId: true },
    });
    cur = row?.parentId ?? null;
    if (cur === facility.orgUnitId) return;
  }
  throw new AppError(
    'EQUIPMENT_FACILITY_UNIT_MISMATCH',
    'المنشأة المحددة لا تنتمي إلى الوحدة التنظيمية أو أحد فروعها',
    400,
  );
}

/**
 * The ComplianceEvidence owner whitelist (§8): the polymorphic
 * ownerType/ownerId pair is validated against exactly these tables,
 * each proven to belong to the caller's institution. A string owner ID
 * can never bypass tenant scoping.
 */
const EVIDENCE_OWNER_TABLES = [
  'ExternalAccreditation',
  'CorrectiveActionPlan',
  'InternalSelfAssessment',
  'RegulatoryInspection',
  'OperationalLicense',
] as const;

export type EvidenceOwnerType = (typeof EVIDENCE_OWNER_TABLES)[number];

export function isEvidenceOwnerType(v: string): v is EvidenceOwnerType {
  return (EVIDENCE_OWNER_TABLES as readonly string[]).includes(v);
}

/** Prove the evidence owner record exists and belongs to the institution. */
export async function assertEvidenceOwnerInInstitution(
  ownerType: string,
  ownerId: string,
  institutionId: string,
): Promise<void> {
  if (!isEvidenceOwnerType(ownerType)) {
    throw new AppError(
      'EVIDENCE_OWNER_TYPE_INVALID',
      'نوع كيان الأدلة غير مدعوم',
      400,
    );
  }
  let resolved: string | null = null;
  if (ownerType === 'ExternalAccreditation') {
    const row = await prisma.externalAccreditation.findUnique({
      where: { id: ownerId },
      select: { institutionId: true },
    });
    resolved = row?.institutionId ?? null;
  } else if (ownerType === 'CorrectiveActionPlan') {
    // No direct institution column — the plan rides its finding.
    const row = await prisma.correctiveActionPlan.findUnique({
      where: { id: ownerId },
      select: { finding: { select: { institutionId: true } } },
    });
    resolved = row?.finding.institutionId ?? null;
  } else if (ownerType === 'InternalSelfAssessment') {
    const row = await prisma.internalSelfAssessment.findUnique({
      where: { id: ownerId },
      select: { institutionId: true },
    });
    resolved = row?.institutionId ?? null;
  } else if (ownerType === 'RegulatoryInspection') {
    const row = await prisma.regulatoryInspection.findUnique({
      where: { id: ownerId },
      select: { institutionId: true },
    });
    resolved = row?.institutionId ?? null;
  } else {
    const row = await prisma.operationalLicense.findUnique({
      where: { id: ownerId },
      select: { institutionId: true },
    });
    resolved = row?.institutionId ?? null;
  }
  if (resolved === null || resolved !== institutionId) {
    throw AppError.notFound('كيان الأدلة المطلوب غير موجود');
  }
}

/**
 * Prove a BinaryObject storage key belongs to the caller's governance
 * uploads: keys under the governance namespace embed the institution id
 * (see lib/storage.ts buildGovernanceKey) — a foreign institution's
 * (or another namespace's) key is refused without leaking its bytes.
 */
export function governanceKeyInstitution(key: string): string | null {
  // governance/<institutionId>/<uuid>.<ext>
  const match = /^governance\/([^/]+)\/[A-Za-z0-9._-]+$/.exec(key);
  return match && match[1] !== undefined ? match[1] : null;
}

/**
 * §3.2 rule 8 belt for grant routes: the actor must hold `capability`
 * with authority over the target scope. OWNER passes by definition.
 */
export async function assertActorMayGrantCapability(
  actorId: string,
  actorRole: Role,
  institutionId: string,
  capability: Capability,
  targetOrgUnitId: string | null,
): Promise<void> {
  if (actorRole === 'OWNER') return;
  const { callerAuthorityCoversUnit } = await import('./permissions.js');
  const covers = await callerAuthorityCoversUnit(
    actorId,
    actorRole,
    institutionId,
    capability,
    targetOrgUnitId,
  );
  if (!covers) {
    throw new AppError(
      'GRANT_EXCEEDS_AUTHORITY',
      'لا يمكنك منح قدرة تتجاوز صلاحيتك على النطاق المستهدف',
      403,
    );
  }
}
