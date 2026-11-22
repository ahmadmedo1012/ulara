/**
 * r352 — organizational-unit service: the structural backbone with the
 * legacy Faculty/Department write-through (DECISIONS.md D3).
 *
 * Invariants enforced here (DB trigger is the belt, these give the
 * clean Arabic envelopes):
 *  - parent belongs to the same institution (else ORG_UNIT_PARENT_*),
 *  - no cycles (ORG_UNIT_CYCLE),
 *  - sibling nameAr uniqueness under a parent (ORG_UNIT_DUPLICATE_NAME),
 *  - code uniqueness per institution (ORG_UNIT_CODE_TAKEN),
 *  - FACULTY-type units require `city` (legacy mirror constraint).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { wouldCreateCycle } from '../../lib/org-tree.js';
import { DEPARTMENT_MIRROR_TYPES, FACULTY_MIRROR_TYPES, type OrgUnitType } from '../../lib/org-unit-types.js';

type Tx = Prisma.TransactionClient;

/** Load the institution's units' parent map (for cycle checks). */
async function parentMap(client: Tx | PrismaClient, institutionId: string) {
  const rows = await client.organizationalUnit.findMany({
    where: { institutionId },
    select: { id: true, parentId: true },
  });
  return new Map(rows.map((r) => [r.id, r.parentId]));
}

/** Validate a parent assignment for a unit; throws the clean envelope. */
export async function assertValidParent(
  client: Tx | PrismaClient,
  institutionId: string,
  unitId: string | null,
  parentId: string | null,
): Promise<void> {
  if (parentId === null) return;
  if (unitId !== null && parentId === unitId) {
    throw new AppError('ORG_UNIT_CYCLE', 'لا يمكن أن تكون الوحدة أبًا لنفسها', 409);
  }
  const parent = await client.organizationalUnit.findUnique({
    where: { id: parentId },
    select: { id: true, institutionId: true, status: true },
  });
  if (!parent) {
    throw new AppError('ORG_UNIT_PARENT_MISSING', 'الوحدة الأب المحددة غير موجودة', 400);
  }
  if (parent.institutionId !== institutionId) {
    // Cross-institution parent: report as NOT FOUND for the caller's
    // institution — never leak that the id exists elsewhere.
    throw AppError.notFound('الوحدة الأب المحددة غير موجودة في مؤسستك');
  }
  const map = await parentMap(client, institutionId);
  if (wouldCreateCycle(unitId ?? '__new__', parentId, map)) {
    throw new AppError('ORG_UNIT_CYCLE', 'لا يمكن ربط الوحدة تحت فرعها التنظيمي — حلقة ممنوعة', 409);
  }
}

/** Sibling-name uniqueness (per parent, non-dissolved). */
async function assertSiblingNameFree(
  client: Tx | PrismaClient,
  institutionId: string,
  parentId: string | null,
  nameAr: string,
  excludeUnitId?: string,
): Promise<void> {
  const clash = await client.organizationalUnit.findFirst({
    where: {
      institutionId,
      parentId,
      nameAr,
      status: { not: 'DISSOLVED' },
      ...(excludeUnitId ? { id: { not: excludeUnitId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    throw new AppError(
      'ORG_UNIT_DUPLICATE_NAME',
      'توجد وحدة بنفس الاسم تحت نفس الأب — اختر اسمًا آخر',
      409,
    );
  }
}

/** Assert a code is free within the institution. */
export async function assertCodeFree(
  client: Tx | PrismaClient,
  institutionId: string,
  code: string | null,
  excludeUnitId?: string,
): Promise<void> {
  if (!code) return;
  const clash = await client.organizationalUnit.findFirst({
    where: { institutionId, code, ...(excludeUnitId ? { id: { not: excludeUnitId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new AppError('ORG_UNIT_CODE_TAKEN', 'رمز الوحدة مستخدم مسبقًا في مؤسستك', 409);
  }
}

/** Resolve an org unit inside the caller's institution (404 otherwise). */
export async function requireOrgUnit(
  client: Tx | PrismaClient,
  institutionId: string,
  unitId: string,
): Promise<{ id: string; type: string; parentId: string | null; status: string; nameAr: string; nameEn: string | null; code: string | null }> {
  const unit = await client.organizationalUnit.findUnique({
    where: { id: unitId },
    select: { id: true, type: true, parentId: true, status: true, nameAr: true, nameEn: true, code: true, institutionId: true },
  });
  if (!unit || unit.institutionId !== institutionId) {
    throw AppError.notFound('الوحدة التنظيمية غير موجودة');
  }
  return unit;
}

// ── Legacy write-through (DECISIONS.md D3) ─────────────────────────

/** Create the mirror OrganizationalUnit for a legacy Faculty row
 * (inside the caller's transaction) and link both sides. */
export async function ensureOrgUnitForFaculty(
  tx: Tx,
  faculty: { id: string; institutionId: string; name: string; nameEn: string | null; city: string },
): Promise<string> {
  const existing = await tx.organizationalUnit.findUnique({
    where: { id: `ou-f-${faculty.id}` },
    select: { id: true },
  });
  const unitId = existing?.id ?? `ou-f-${faculty.id}`;
  if (!existing) {
    await tx.organizationalUnit.create({
      data: {
        id: unitId,
        institutionId: faculty.institutionId,
        type: 'FACULTY',
        nameAr: faculty.name,
        nameEn: faculty.nameEn,
        location: faculty.city,
      },
    });
  }
  await tx.faculty.update({ where: { id: faculty.id }, data: { orgUnitId: unitId } });
  return unitId;
}

/** Create the mirror OrganizationalUnit for a legacy Department row.
 * `institutionId` is passed explicitly (the faculty's chain already
 * resolved it) — no second lookup, no fragile assertion. */
export async function ensureOrgUnitForDepartment(
  tx: Tx,
  department: { id: string; facultyId: string; name: string; nameEn: string | null },
  facultyOrgUnitId: string,
  institutionId: string,
): Promise<string> {
  const existing = await tx.organizationalUnit.findUnique({
    where: { id: `ou-d-${department.id}` },
    select: { id: true },
  });
  const unitId = existing?.id ?? `ou-d-${department.id}`;
  if (!existing) {
    await tx.organizationalUnit.create({
      data: {
        id: unitId,
        institutionId,
        parentId: facultyOrgUnitId,
        type: 'SCIENTIFIC_DEPARTMENT',
        nameAr: department.name,
        nameEn: department.nameEn,
      },
    });
  }
  await tx.department.update({ where: { id: department.id }, data: { orgUnitId: unitId } });
  return unitId;
}

/**
 * §11 — the controlled type-catalog gate. A unit type is valid for the
 * institution only when an ACTIVE definition exists globally OR as a
 * local type OF THIS institution, the institution's sector and kind
 * match the definition's eligibility, and (when creating under a
 * parent) the parent's type is allowed by the definition.
 */
export async function assertUnitTypeAllowed(
  client: Tx | PrismaClient,
  institutionId: string,
  type: string,
  parentType: string | null,
): Promise<void> {
  const institution = await client.institution.findUnique({
    where: { id: institutionId },
    select: {
      sector: true,
      kind: { select: { code: true } },
    },
  });
  const definition = await client.orgUnitTypeDefinition.findFirst({
    where: {
      code: type,
      isActive: true,
      OR: [{ isLocal: false }, { isLocal: true, institutionId }],
    },
  });
  if (!definition) {
    throw new AppError(
      'ORG_UNIT_TYPE_INVALID',
      'نوع الوحدة التنظيمية غير معرّف في الفهرس — راجع أنواع الوحدات المتاحة',
      400,
    );
  }
  if (
    definition.eligibleSectors.length > 0 &&
    (!institution?.sector || !definition.eligibleSectors.includes(institution.sector))
  ) {
    throw new AppError(
      'ORG_UNIT_TYPE_INVALID',
      'نوع الوحدة التنظيمية غير متاح لقطاع مؤسستك',
      400,
    );
  }
  if (
    definition.eligibleInstitutionTypeCodes.length > 0 &&
    (!institution?.kind?.code ||
      !definition.eligibleInstitutionTypeCodes.includes(institution.kind.code))
  ) {
    throw new AppError(
      'ORG_UNIT_TYPE_INVALID',
      'نوع الوحدة التنظيمية غير متاح لنوع مؤسستك',
      400,
    );
  }
  if (definition.allowedParentCodes.length > 0) {
    if (parentType === null || !definition.allowedParentCodes.includes(parentType)) {
      throw new AppError(
        'ORG_UNIT_TYPE_PARENT_INVALID',
        'نوع الوحدة التنظيمية لا يصلح تحت هذا النوع من الوحدة الأب',
        400,
      );
    }
  }
}

/**
 * §6.5 — map the database trigger's structural exceptions to their clean
 * Arabic envelopes. The trigger (ulara_org_unit_check_parent) is the
 * invariant of record; Prisma surfaces its RAISE EXCEPTION text through
 * the error message, which this mapper interprets.
 */
export function mapOrgUnitTriggerError(e: unknown): AppError | null {
  if (!(e instanceof Error)) return null;
  const message = e.message;
  if (message.includes('ORG_UNIT_CYCLE')) {
    return new AppError('ORG_UNIT_CYCLE', 'لا يمكن ربط الوحدة تحت فرعها التنظيمي — حلقة ممنوعة', 409);
  }
  if (message.includes('ORG_UNIT_CORRUPT_CYCLE')) {
    return new AppError('ORG_UNIT_CYCLE', 'اكتُشفت حلقة فاسدة في الشجرة — راجع بنية الوحدات', 409);
  }
  if (message.includes('ORG_UNIT_DEPTH_EXCEEDED')) {
    return new AppError('ORG_UNIT_DEPTH_EXCEEDED', 'عمق الشجرة التنظيمية تجاوز الحد المقرر (64 مستوى)', 409);
  }
  if (message.includes('ORG_UNIT_PARENT_SAME_INSTITUTION')) {
    return AppError.notFound('الوحدة الأب المحددة غير موجودة في مؤسستك');
  }
  if (message.includes('ORG_UNIT_PARENT_MISSING')) {
    return new AppError('ORG_UNIT_PARENT_MISSING', 'الوحدة الأب المحددة غير موجودة', 400);
  }
  return null;
}

/** Mirror an org-unit create/update into the legacy tables when the
 * type warrants it (FACULTY → Faculty, SCIENTIFIC_DEPARTMENT →
 * Department). Runs INSIDE the caller's transaction. */
export async function syncLegacyMirrors(
  tx: Tx,
  unit: {
    id: string;
    institutionId: string;
    type: string;
    nameAr: string;
    nameEn: string | null;
    code: string | null;
    parentId: string | null;
    location: string | null;
  },
  city?: string,
): Promise<void> {
  if (FACULTY_MIRROR_TYPES.includes(unit.type as OrgUnitType)) {
    const mirror = await tx.faculty.findUnique({ where: { orgUnitId: unit.id } });
    if (mirror) {
      await tx.faculty.update({
        where: { id: mirror.id },
        data: {
          name: unit.nameAr,
          ...(unit.nameEn !== undefined ? { nameEn: unit.nameEn } : {}),
          ...(city !== undefined ? { city } : {}),
        },
      });
    } else {
      // The legacy unique is (institutionId, name, city).
      const effectiveCity = city ?? unit.location ?? 'غير محدد';
      const clash = await tx.faculty.findFirst({
        where: { institutionId: unit.institutionId, name: unit.nameAr, city: effectiveCity },
        select: { id: true },
      });
      if (clash) {
        await tx.faculty.update({ where: { id: clash.id }, data: { orgUnitId: unit.id } });
      } else {
        await tx.faculty.create({
          data: {
            name: unit.nameAr,
            nameEn: unit.nameEn,
            city: effectiveCity,
            institutionId: unit.institutionId,
            orgUnitId: unit.id,
          },
        });
      }
    }
    return;
  }
  if (DEPARTMENT_MIRROR_TYPES.includes(unit.type as OrgUnitType)) {
    const mirror = await tx.department.findUnique({ where: { orgUnitId: unit.id } });
    if (mirror) {
      await tx.department.update({
        where: { id: mirror.id },
        data: { name: unit.nameAr, ...(unit.nameEn !== undefined ? { nameEn: unit.nameEn } : {}) },
      });
      return;
    }
    if (!unit.parentId) return; // a department mirror needs a faculty parent
    const parentFaculty = await tx.faculty.findUnique({ where: { orgUnitId: unit.parentId } });
    if (!parentFaculty) return;
    const clash = await tx.department.findFirst({
      where: { facultyId: parentFaculty.id, name: unit.nameAr },
      select: { id: true },
    });
    if (clash) {
      await tx.department.update({ where: { id: clash.id }, data: { orgUnitId: unit.id } });
    } else {
      await tx.department.create({
        data: {
          name: unit.nameAr,
          nameEn: unit.nameEn,
          facultyId: parentFaculty.id,
          orgUnitId: unit.id,
        },
      });
    }
  }
}

export { assertSiblingNameFree };
