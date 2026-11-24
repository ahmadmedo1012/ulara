/**
 * r359 A4 — institution-scoped audit-log browsing.
 *
 * Mounted at '/api/v1/institutional' (see app.ts):
 *   GET /institutional/audit-logs?page&limit&q&action&entityType&entityId&actorId&from&to
 *
 *  · Capability: AUDIT_BROWSE (ADMIN + QUALITY + OWNER by default —
 *    r359 permission defaults; explicit grants work as always).
 *  · Tenant fence: the institution is the SERVER-VERIFIED context
 *    (requireInstitution re-resolves the ACTIVE membership every
 *    request). A client-supplied institutionId can never scope the
 *    read. The OWNER cross-tenant trail stays on GET /owner/activity.
 *  · Filters are all optional and composable; pagination + meta follow
 *    the platform convention (page/limit ≤100, newest first).
 *  · The actor's name/email is included for the trail UI; metadata is
 *    returned as stored (written in-transaction by every r352 router).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireInstitution } from '../middleware/institution.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';

const router = Router();

const auditListSchema = paginationSchema.extend({
  action: z.string().trim().min(1).max(120).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
  entityId: z.string().trim().min(1).max(120).optional(),
  actorId: z.string().trim().min(1).max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

router.get(
  '/audit-logs',
  authMiddleware,
  requireInstitution,
  requireCapability('AUDIT_BROWSE'),
  validate(auditListSchema),
  async (req, res, next) => {
    try {
      const { page, limit, q, action, entityType, entityId, actorId, from, to } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        action?: string;
        entityType?: string;
        entityId?: string;
        actorId?: string;
        from?: Date;
        to?: Date;
      };

      const where = {
        // ── the tenant fence: the verified context, nothing else ──
        institutionId: req.institution!.id,
        // r360 F4: the QUERY contract keeps A4's entityType/entityId
        // names (the FE + docs already speak them) but the MODEL's
        // columns are resourceType/resourceId (schema.prisma's AuditLog)
        // — the hermetic tests' prisma mock masked the key mismatch,
        // a live q/filter read threw "Unknown argument entityType".
        ...(action ? { action } : {}),
        ...(entityType ? { resourceType: entityType } : {}),
        ...(entityId ? { resourceId: entityId } : {}),
        ...(actorId ? { userId: actorId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { action: { contains: q, mode: 'insensitive' as const } },
                { resourceType: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [total, data] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
