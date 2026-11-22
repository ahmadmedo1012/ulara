/**
 * r352 — the unified organizational-unit API.
 *
 * Mounted at '/api/v1/institutional' (see app.ts):
 *   GET    /org-units            — institution context (paginated)
 *   GET    /org-units/tree       — institution context
 *   POST   /org-units            — ORG_STRUCTURE_MANAGE
 *   GET    /org-units/:id        — institution context (+ ancestors)
 *   PATCH  /org-units/:id        — ORG_STRUCTURE_MANAGE
 *   POST   /org-units/:id/status — ORG_STRUCTURE_MANAGE
 *
 * Every mutation writes an AuditLog row inside the same transaction
 * (the institution.routes.ts governance pattern) and mirrors
 * FACULTY/SCIENTIFIC_DEPARTMENT units into the legacy tables.
 */
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireInstitution } from '../middleware/institution.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { buildMeta } from '../../lib/pagination.js';
import { buildTree } from '../../lib/org-tree.js';
import { assertCapabilityForUnit, assertCapabilityIn } from '../../lib/permissions.js';
import {
  orgUnitListSchema,
  orgUnitCreateSchema,
  orgUnitUpdateSchema,
  orgUnitStatusSchema,
} from '../../modules/r352/dto.js';
import {
  assertCodeFree,
  assertSiblingNameFree,
  assertValidParent,
  requireOrgUnit,
  syncLegacyMirrors,
} from '../../modules/r352/org-units.service.js';

const router = Router();

// Whole router: authenticated + verified institution context.
router.use(authMiddleware, requireInstitution);

/**
 * Unit-aware ORG_STRUCTURE_MANAGE check: institution-wide grants pass
 * anywhere; unit-scoped grants (UnitRoleGrant) pass only when the
 * action's target unit is the grant's unit or a descendant of it (a
 * faculty-scoped grant covers the faculty's departments — D5).
 */
async function assertStructureCapability(
  user: { id: string; role: import('@prisma/client').Role },
  institutionId: string,
  targetUnitId: string | null,
): Promise<void> {
  if (targetUnitId) {
    await assertCapabilityForUnit(user.id, user.role, institutionId, targetUnitId, 'ORG_STRUCTURE_MANAGE');
  } else {
    await assertCapabilityIn(user.id, user.role, institutionId, 'ORG_STRUCTURE_MANAGE');
  }
}

const unitSelect = {
  id: true, institutionId: true, parentId: true, code: true, nameAr: true,
  nameEn: true, type: true, status: true, sortOrder: true, location: true,
  contactEmail: true, contactPhone: true, establishedAt: true, dissolvedAt: true,
  createdAt: true, updatedAt: true,
} as const;

// ── GET /org-units — paginated listing ───────────────────────────
router.get('/org-units', validate(orgUnitListSchema, 'query'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const { page, limit, q, type, status, parentId } = req.query as unknown as z.infer<typeof orgUnitListSchema>;
    const where: Prisma.OrganizationalUnitWhereInput = {
      institutionId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(q
        ? {
            OR: [
              { nameAr: { contains: q } },
              { nameEn: { contains: q } },
              { code: { contains: q } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.organizationalUnit.count({ where }),
      prisma.organizationalUnit.findMany({
        where,
        select: unitSelect,
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

// ── GET /org-units/tree — the nested structure ───────────────────
router.get('/org-units/tree', async (req, res, next) => {
  try {
    const rows = await prisma.organizationalUnit.findMany({
      where: { institutionId: req.institution!.id, status: { not: 'DISSOLVED' } },
      select: unitSelect,
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });
    res.json({ data: buildTree(rows) });
  } catch (e) {
    next(e);
  }
});

// ── POST /org-units — create (mirrors faculty/department when typed) ──
router.post(
  '/org-units',
  validate(orgUnitCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof orgUnitCreateSchema>;
      await assertStructureCapability(req.user!, institutionId, input.parentId ?? null);
      if ((input.type === 'FACULTY' || input.type === 'COLLEGE') && !input.city) {
        throw new AppError(
          'ORG_UNIT_CITY_REQUIRED',
          'المدينة مطلوبة لوحدة من نوع كلية (قيد الجدول القديم)',
          400,
        );
      }
      await assertValidParent(prisma, institutionId, null, input.parentId ?? null);
      await assertCodeFree(prisma, institutionId, input.code ?? null);
      await assertSiblingNameFree(prisma, institutionId, input.parentId ?? null, input.nameAr);
      const unit = await prisma.$transaction(async (tx) => {
        const created = await tx.organizationalUnit.create({
          data: {
            institutionId,
            parentId: input.parentId ?? null,
            code: input.code ?? null,
            nameAr: input.nameAr,
            nameEn: input.nameEn ?? null,
            type: input.type,
            sortOrder: input.sortOrder ?? 0,
            location: input.city ?? input.location ?? null,
            contactEmail: input.contactEmail ?? null,
            contactPhone: input.contactPhone ?? null,
            establishedAt: input.establishedAt ?? null,
          },
          select: unitSelect,
        });
        await syncLegacyMirrors(tx, created, input.city);
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'org_unit.create',
            resourceType: 'OrganizationalUnit',
            resourceId: created.id,
            metadata: { nameAr: created.nameAr, type: created.type, parentId: created.parentId },
          },
        });
        return created;
      });
      res.status(201).json({ data: unit });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز الوحدة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

// ── GET /org-units/:id — detail + ancestor chain ─────────────────
router.get('/org-units/:id', async (req, res, next) => {
  try {
    const unit = await requireOrgUnit(prisma, req.institution!.id, req.params.id!);
    const ancestors: typeof unit[] = [];
    let cur = unit.parentId;
    for (let i = 0; i < 32 && cur; i += 1) {
      const row = await prisma.organizationalUnit.findUnique({
        where: { id: cur },
        select: { ...unitSelect, institutionId: true },
      });
      if (!row || row.institutionId !== req.institution!.id) break;
      ancestors.push(row);
      cur = row.parentId;
    }
    res.json({ data: { unit, ancestors } });
  } catch (e) {
    next(e);
  }
});

// ── PATCH /org-units/:id — update (re-parent, rename, mirror) ────
router.patch(
  '/org-units/:id',
  validate(orgUnitUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireOrgUnit(prisma, institutionId, req.params.id!);
      await assertStructureCapability(req.user!, institutionId, existing.id);
      const input = req.body as z.infer<typeof orgUnitUpdateSchema>;
      if (input.parentId !== undefined) {
        await assertValidParent(prisma, institutionId, existing.id, input.parentId ?? null);
      }
      if (input.code !== undefined && input.code !== null) {
        await assertCodeFree(prisma, institutionId, input.code, existing.id);
      }
      if (input.nameAr !== undefined && input.nameAr !== existing.nameAr) {
        const effectiveParent = input.parentId !== undefined ? input.parentId ?? null : existing.parentId;
        await assertSiblingNameFree(prisma, institutionId, effectiveParent, input.nameAr, existing.id);
      }
      const unit = await prisma.$transaction(async (tx) => {
        const updated = await tx.organizationalUnit.update({
          where: { id: existing.id },
          data: {
            ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
            ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          },
          select: unitSelect,
        });
        await syncLegacyMirrors(tx, updated, input.city);
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'org_unit.update',
            resourceType: 'OrganizationalUnit',
            resourceId: existing.id,
            metadata: { changes: input },
          },
        });
        return updated;
      });
      res.json({ data: unit });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز الوحدة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

// ── POST /org-units/:id/status — lifecycle ───────────────────────
router.post(
  '/org-units/:id/status',
  validate(orgUnitStatusSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireOrgUnit(prisma, institutionId, req.params.id!);
      await assertStructureCapability(req.user!, institutionId, existing.id);
      const input = req.body as z.infer<typeof orgUnitStatusSchema>;
      if (input.status === 'DISSOLVED') {
        const activeChildren = await prisma.organizationalUnit.count({
          where: { parentId: existing.id, status: { not: 'DISSOLVED' } },
        });
        if (activeChildren > 0) {
          throw new AppError(
            'ORG_UNIT_HAS_ACTIVE_CHILDREN',
            'لا يمكن حل الوحدة قبل حل أو نقل وحداتها الفرعية النشطة',
            409,
          );
        }
      }
      const unit = await prisma.$transaction(async (tx) => {
        const updated = await tx.organizationalUnit.update({
          where: { id: existing.id },
          data: {
            status: input.status,
            ...(input.status === 'DISSOLVED' && input.dissolvedAt ? { dissolvedAt: input.dissolvedAt } : {}),
            ...(input.status === 'ACTIVE' ? { dissolvedAt: null } : {}),
          },
          select: unitSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'org_unit.status',
            resourceType: 'OrganizationalUnit',
            resourceId: existing.id,
            metadata: { status: input.status },
          },
        });
        return updated;
      });
      res.json({ data: unit });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
