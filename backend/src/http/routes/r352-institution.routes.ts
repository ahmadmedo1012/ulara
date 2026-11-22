/**
 * r352 — institution classification surfaces.
 *
 * Mounted at '/api/v1' (see app.ts — BEFORE the authed broad-mount
 * routers, next to institution.routes.ts; no path collisions with it:
 * this router declares /institutions/me/profile and
 * /owner/institutions/:id/classification only):
 *   GET   /institutions/me/profile     — institution context
 *   PATCH /owner/institutions/:id/classification — OWNER
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireInstitution } from '../middleware/institution.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { institutionClassificationSchema } from '../../modules/r352/dto.js';

const router = Router();

// ── GET /institutions/me/profile — the caller's institution, classified ──
router.get('/institutions/me/profile', authMiddleware, requireInstitution, async (req, res, next) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.institution!.id },
      select: {
        id: true, name: true, nameEn: true, slug: true, status: true,
        sector: true, ownership: true,
        establishmentDecisionNumber: true, establishmentDecisionDate: true,
        parentInstitutionId: true, createdAt: true, updatedAt: true,
        kind: { select: { id: true, code: true, nameAr: true, nameEn: true, sector: true } },
        supervisingAuthority: { select: { id: true, code: true, nameAr: true, nameEn: true } },
        parentInstitution: { select: { id: true, name: true, slug: true } },
      },
    });
    res.json({ data: { institution } });
  } catch (e) {
    next(e);
  }
});

// ── PATCH /owner/institutions/:id/classification — OWNER ──────────
router.patch(
  '/owner/institutions/:id/classification',
  authMiddleware,
  requireRole(Role.OWNER),
  validate(institutionClassificationSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const input = req.body as z.infer<typeof institutionClassificationSchema>;
      const existing = await prisma.institution.findUnique({
        where: { id },
        select: { id: true, sector: true, kindId: true, parentInstitutionId: true },
      });
      if (!existing) throw AppError.notFound('المؤسسة غير موجودة');

      let kindId: string | null | undefined;
      if (input.kindCode !== undefined) {
        if (input.kindCode === null) kindId = null;
        else {
          const kind = await prisma.institutionType.findUnique({
            where: { code: input.kindCode },
            select: { id: true, sector: true },
          });
          if (!kind) throw AppError.notFound('نوع المؤسسة المحدد غير موجود في الكتالوج');
          kindId = kind.id;
        }
      }
      // Kind ↔ sector consistency: the NEW kind's sector must match the
      // NEW sector (or the existing one when sector is not being changed).
      const effectiveSector: string | undefined =
        input.sector ?? (kindId !== undefined ? undefined : (existing.sector ?? undefined));
      if (kindId !== undefined && kindId !== null) {
        const kind = await prisma.institutionType.findUnique({
          where: { id: kindId },
          select: { sector: true },
        });
        const sectorForCheck: string | null = input.sector ?? existing.sector;
        if (kind && sectorForCheck && kind.sector !== sectorForCheck) {
          throw new AppError(
            'INSTITUTION_KIND_SECTOR_MISMATCH',
            'نوع المؤسسة المحدد لا ينتمي إلى القطاع المحدد للمؤسسة',
            409,
          );
        }
      }
      if (effectiveSector !== undefined && kindId === undefined && existing.kindId) {
        // Sector change without kind change: existing kind must match.
        const kind = await prisma.institutionType.findUnique({
          where: { id: existing.kindId },
          select: { sector: true },
        });
        if (kind && kind.sector !== effectiveSector) {
          throw new AppError(
            'INSTITUTION_KIND_SECTOR_MISMATCH',
            'قطاع المؤسسة لا يطابق نوعها الحالي — غيّر النوع مع القطاع',
            409,
          );
        }
      }
      let supervisingAuthorityId: string | null | undefined;
      if (input.supervisingAuthorityCode !== undefined) {
        if (input.supervisingAuthorityCode === null) supervisingAuthorityId = null;
        else {
          const authority = await prisma.regulatoryAuthority.findUnique({
            where: { code: input.supervisingAuthorityCode },
            select: { id: true },
          });
          if (!authority) throw AppError.notFound('الجهة الرقابية المحددة غير موجودة في الكتالوج');
          supervisingAuthorityId = authority.id;
        }
      }
      if (input.parentInstitutionId !== undefined && input.parentInstitutionId !== null) {
        if (input.parentInstitutionId === id) {
          throw new AppError('PARENT_CYCLE', 'المؤسسة لا يمكن أن تكون تابعة لنفسها', 409);
        }
        const parent = await prisma.institution.findUnique({
          where: { id: input.parentInstitutionId },
          select: { id: true, sector: true },
        });
        if (!parent) throw AppError.notFound('المؤسسة الأم المحددة غير موجودة');
        const newSector = input.sector ?? existing.sector;
        if (newSector && parent.sector && parent.sector !== newSector) {
          throw new AppError(
            'PARENT_SECTOR_MISMATCH',
            'المؤسسة الأم تنتمي إلى قطاع مختلف — التبعية العابرة للقطاعات ممنوعة',
            409,
          );
        }
        // Cycle check (bounded walk).
        let cur: string | null = parent.id;
        for (let i = 0; i < 32 && cur; i += 1) {
          if (cur === id) {
            throw new AppError('PARENT_CYCLE', 'لا يمكن ربط المؤسسة تحت سلسلة تعود إليها', 409);
          }
          const row: { parentInstitutionId: string | null } | null = await prisma.institution.findUnique({
            where: { id: cur },
            select: { parentInstitutionId: true },
          });
          cur = row?.parentInstitutionId ?? null;
        }
      }

      await prisma.$transaction(async (tx) => {
        const updated = await tx.institution.update({
          where: { id },
          data: {
            ...(input.sector !== undefined ? { sector: input.sector } : {}),
            ...(kindId !== undefined ? { kindId } : {}),
            ...(input.ownership !== undefined ? { ownership: input.ownership } : {}),
            ...(supervisingAuthorityId !== undefined ? { supervisingAuthorityId } : {}),
            ...(input.establishmentDecisionNumber !== undefined ? { establishmentDecisionNumber: input.establishmentDecisionNumber } : {}),
            ...(input.establishmentDecisionDate !== undefined ? { establishmentDecisionDate: input.establishmentDecisionDate } : {}),
            ...(input.parentInstitutionId !== undefined ? { parentInstitutionId: input.parentInstitutionId } : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId: id,
            action: 'institution.classification.update',
            resourceType: 'Institution',
            resourceId: id,
            metadata: { changes: input },
          },
        });
        return updated;
      });
      // Respond with the classified projection (relations included).
      const classified = await prisma.institution.findUnique({
        where: { id },
        select: {
          id: true, name: true, nameEn: true, slug: true, status: true,
          sector: true, ownership: true,
          establishmentDecisionNumber: true, establishmentDecisionDate: true,
          parentInstitutionId: true, createdAt: true, updatedAt: true,
          kind: { select: { id: true, code: true, nameAr: true, nameEn: true, sector: true } },
          supervisingAuthority: { select: { id: true, code: true, nameAr: true, nameEn: true } },
          parentInstitution: { select: { id: true, name: true, slug: true } },
        },
      });
      res.json({ data: { institution: classified } });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
