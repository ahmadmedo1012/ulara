/**
 * r352 — unit-scoped role grants (DECISIONS.md D5): additional
 * institutional responsibilities beyond the membership role, narrowed
 * to an org unit (or institution-wide).
 *
 * Mounted at '/api/v1' (see app.ts):
 *   GET  /me/unit-roles                     — institution context
 *   GET  /admin/users/:id/unit-roles        — ROLES_ASSIGN
 *   POST /admin/users/:id/unit-roles        — ROLES_ASSIGN
 *   POST /admin/unit-roles/:id/revoke       — ROLES_ASSIGN
 */
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireInstitution } from '../middleware/institution.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { unitRoleGrantCreateSchema } from '../../modules/r352/dto.js';

const router = Router();

// ── GET /me/unit-roles — the caller's active grants ───────────────
router.get('/me/unit-roles', authMiddleware, requireInstitution, async (req, res, next) => {
  try {
    const data = await prisma.unitRoleGrant.findMany({
      where: {
        userId: req.user!.id,
        institutionId: req.institution!.id,
        isActive: true,
      },
      include: { orgUnit: { select: { id: true, nameAr: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ── admin surface ──────────────────────────────────────────────────
router.use('/admin', authMiddleware, requireCapability('ROLES_ASSIGN'));

router.get('/admin/users/:id/unit-roles', async (req, res, next) => {
  try {
    const institutionId = typeof req.query.institutionId === 'string' ? req.query.institutionId : null;
    if (!institutionId) {
      throw AppError.badRequest('حدّد المؤسسة عبر institutionId لعرض منح الأدوار');
    }
    const data = await prisma.unitRoleGrant.findMany({
      where: { userId: req.params.id!, institutionId },
      include: {
        orgUnit: { select: { id: true, nameAr: true, type: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/admin/users/:id/unit-roles',
  validate(unitRoleGrantCreateSchema),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const input = req.body as z.infer<typeof unitRoleGrantCreateSchema>;
      // The actor must govern the target institution: either the
      // platform OWNER or an ADMIN/QUALITY member of it.
      if (actor.role !== 'OWNER') {
        const callerInstitution = actor.institutionId;
        if (!callerInstitution || callerInstitution !== input.institutionId) {
          throw new AppError(
            'USER_NOT_MEMBER',
            'لا تدير المؤسسة المستهدفة — لا يمكن منح أدوار فيها',
            403,
          );
        }
      }
      // Target must hold an ACTIVE membership in the institution
      // (a grant rides a real institutional standing).
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.params.id!,
          institutionId: input.institutionId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        throw new AppError(
          'USER_NOT_MEMBER',
          'المستخدم المستهدف ليس عضوًا نشطًا في المؤسسة المحددة',
          400,
        );
      }
      // OWNER is a platform role — the DTO's role enum already excludes
      // it (it can never be a unit grant; belt only).
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== input.institutionId) {
          throw new AppError(
            'UNIT_ROLE_UNIT_INVALID',
            'الوحدة التنظيمية المحددة لا تنتمي إلى المؤسسة المستهدفة',
            400,
          );
        }
      }
      // Pre-check the exact tuple: Postgres treats NULLs as distinct in
      // the composite unique, so institution-wide grants need the
      // app-level belt (D13 — service check, clean Arabic 409).
      const existingGrant = await prisma.unitRoleGrant.findFirst({
        where: {
          userId: req.params.id!,
          institutionId: input.institutionId,
          orgUnitId: input.orgUnitId ?? null,
          role: input.role,
        },
        select: { id: true },
      });
      if (existingGrant) {
        throw new AppError('UNIT_ROLE_EXISTS', 'توجد منحة مطابقة لهذا المستخدم بالفعل', 409);
      }
      const grant = await prisma.$transaction(async (tx) => {
        const created = await tx.unitRoleGrant.create({
          data: {
            userId: req.params.id!,
            institutionId: input.institutionId,
            orgUnitId: input.orgUnitId ?? null,
            role: input.role,
            reason: input.reason ?? null,
            grantedById: actor.id,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            institutionId: input.institutionId,
            action: 'unit_role.grant',
            resourceType: 'UnitRoleGrant',
            resourceId: created.id,
            metadata: {
              targetUserId: req.params.id!,
              role: input.role,
              orgUnitId: input.orgUnitId ?? null,
            },
          },
        });
        return created;
      });
      res.status(201).json({ data: grant });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('توجد منحة مطابقة لهذا المستخدم بالفعل'));
      }
      next(e);
    }
  },
);

router.post('/admin/unit-roles/:id/revoke', async (req, res, next) => {
  try {
    const actor = req.user!;
    const grant = await prisma.unitRoleGrant.findUnique({
      where: { id: req.params.id! },
      select: { id: true, institutionId: true, isActive: true, role: true, userId: true },
    });
    if (!grant) throw AppError.notFound('المنحة المطلوبة غير موجودة');
    if (actor.role !== 'OWNER') {
      const callerInstitution = actor.institutionId;
      if (!callerInstitution || callerInstitution !== grant.institutionId) {
        throw AppError.notFound('المنحة المطلوبة غير موجودة');
      }
    }
    if (!grant.isActive) throw AppError.conflict('المنحة ملغاة مسبقًا');
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.unitRoleGrant.update({
        where: { id: grant.id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          institutionId: grant.institutionId,
          action: 'unit_role.revoke',
          resourceType: 'UnitRoleGrant',
          resourceId: grant.id,
          metadata: { targetUserId: grant.userId, role: grant.role },
        },
      });
      return row;
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
