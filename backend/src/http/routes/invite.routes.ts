import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { consumeInvite, createInvite, listInvites, revokeInvite, validateInvitePublic } from '../../modules/invites/service.js';
import { prisma } from '../../db.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';
import { institutionContextRequiredError } from '../../lib/profile-scoping.js';
import { AppError } from '../../lib/errors.js';

/**
 * r323 B3.1 — invite codes (the B3.1 bulk-import remainder).
 *
 *   POST   /invites        — teacher (own offering) / admin / owner
 *   GET    /invites        — the caller's codes + live counts
 *   DELETE /invites/:id    — the creator (owner bypasses)
 *   GET    /invites/:code  — PUBLIC pre-submit validation for the
 *                            register page (scope label + honest verdict)
 *   POST   /invites/redeem — post-registration consume (enroll + count)
 *
 * Mounted at /api/v1. The register route consumes the code AFTER
 * registerUser; this redeem endpoint is the honest seam the auth
 * router calls so the consume logic lives in ONE place.
 */

const router = Router();

const createBody = z.object({
  role: z.enum(['STUDENT', 'TEACHER']),
  offeringId: z.string().min(6).optional(),
  departmentId: z.string().min(6).optional(),
  facultyId: z.string().min(6).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90),
  maxUses: z.coerce.number().int().min(1).max(500),
});

router.post(
  '/invites',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createBody),
  async (req, res, next) => {
    try {
      /* r342 t14 (security sweep — the institution boundary): an
       * ADMIN's verified institution must OWN the target offering —
       * pre-fix, an ADMIN could mint a code scoped to a FOREIGN
       * institution's offering (the service checked TEACHER ownership
       * only), a cross-tenant write primitive whose redeemed code then
       * enrolled foreign-institution students. TEACHER rows stay
       * ownership-pinned by the service; OWNER mints platform-wide. */
      if (req.user!.role === Role.ADMIN && (req.body as { offeringId?: string }).offeringId) {
        const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
        if (!scope) throw institutionContextRequiredError();
        const offering = await prisma.courseOffering.findUnique({
          where: { id: (req.body as { offeringId: string }).offeringId },
          select: { course: { select: { institutionId: true } } },
        });
        // Existence-hidden 404 — the platform-wide convention for
        // cross-tenant ids (foreign offering == does not exist FOR YOU).
        if (!offering || offering.course.institutionId !== scope) {
          throw AppError.notFound('المقرر غير موجود');
        }
      }
      const invite = await createInvite(req.user!.id, req.body as never);
      res.status(201).json({ data: invite });
    } catch (e) { next(e); }
  },
);

router.get('/invites', authMiddleware, async (req, res, next) => {
  try {
    const invites = await listInvites(req.user!.id);
    res.json({ data: invites });
  } catch (e) { next(e); }
});

router.delete('/invites/:id', authMiddleware, async (req, res, next) => {
  try {
    await revokeInvite(req.params.id!, req.user!.id, req.user!.role);
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/invites/:code/validate', async (req, res, next) => {
  try {
    const roleQ = req.query.role;
    const role = typeof roleQ === 'string' && roleQ === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const data = await validateInvitePublic(req.params.code!, role);
    res.json({ data });
  } catch (e) { next(e); }
});

/** The redeem — the register flow calls it right after account creation
 * (the auth router's register handler with an inviteCode in the body).
 * Authenticated because the account must exist to be enrolled. */
router.post('/invites/redeem', authMiddleware, validate(z.object({ code: z.string().min(4).max(16) })), async (req, res, next) => {
  try {
    const { code } = req.body as { code: string };
    const result = await consumeInvite(code, req.user!.id);
    res.json({ data: result });
  } catch (e) { next(e); }
});

export default router;
