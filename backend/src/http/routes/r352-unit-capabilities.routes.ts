/**
 * r352 hardening — unit-scoped CAPABILITY grants (§3.1 + §3.2).
 *
 * Replaces the pre-hardening unit-role surface: a grant is ONE explicit
 * capability scoped to an org unit (or the institution) — never a role
 * bundle. The §3.1 cross-institution read defect is closed: the
 * institution context is the SERVER-VERIFIED one (requireInstitution
 * re-resolves the caller's ACTIVE membership in an ACTIVE institution
 * on every request); a client-supplied institutionId can never scope
 * the read, and the OWNER path re-verifies the target institution
 * before reading.
 *
 * Mounted at '/api/v1' (see app.ts):
 *   GET  /me/unit-capabilities                    — caller's active grants
 *   GET  /admin/users/:id/unit-capabilities       — UNIT_CAPABILITIES_ASSIGN
 *   POST /admin/users/:id/unit-capabilities       — UNIT_CAPABILITIES_ASSIGN
 *   POST /admin/unit-capabilities/:id/revoke      — UNIT_CAPABILITIES_ASSIGN
 *
 * Semantics (DECISIONS.md D5-hardened):
 *   - non-OWNER callers operate ONLY inside their verified active
 *     institution (the query parameter is ignored for them);
 *   - OWNER may administer any institution but its existence and the
 *     target user's membership are still verified;
 *   - the target user must hold an ACTIVE membership in the institution
 *     (§3.2 rule 11);
 *   - the actor may not grant a capability they do not hold with
 *     authority over the target scope (§3.2 rule 8);
 *   - OWNER is a platform identity — it is not a Capability and can
 *     never appear in a grant row;
 *   - revocation sets isActive=false + revokedAt immediately — there is
 *     no grant cache, so the next capability check sees the change.
 */
import { Router, type RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireInstitution } from '../middleware/institution.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertCapabilityForUnit, assertCapabilityIn, callerAuthorityCoversUnit } from '../../lib/permissions.js';
import { assertOrgUnitInInstitution } from '../../lib/tenant-guards.js';
import { isPrismaWriteConflictOrDeadlock } from '../../lib/prisma-errors.js';
import { unitCapabilityGrantCreateSchema } from '../../modules/r352/dto.js';

const router = Router();

const GRANT_INCLUDE = {
  orgUnit: { select: { id: true, nameAr: true, type: true } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

// ── GET /me/unit-capabilities — the caller's active grants ────────
router.get('/me/unit-capabilities', authMiddleware, requireInstitution, async (req, res, next) => {
  try {
    const data = await prisma.unitCapabilityGrant.findMany({
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
// §3.2 scope policy: BROWSING grants is an institution-wide operation
// (the router-level gate below covers GET). GRANTING/REVOKING is
// scope-aware — the write routes check UNIT_CAPABILITIES_ASSIGN at the
// grant's own scope (unit subtree or institution-wide) inside their
// handlers, so a faculty-scoped grant administrator can operate within
// their subtree without holding the institution-wide capability.
const requireInstitutionUnlessOwner: RequestHandler = (req, _res, next) => {
  if (req.user?.role === 'OWNER') return next();
  return requireInstitution(req, _res, next);
};

router.use('/admin', authMiddleware);

/**
 * Resolve the institution the admin request may operate on. For a
 * non-OWNER caller this is EXACTLY the server-verified institution
 * context (a client-provided institutionId is ignored — §3.1). OWNER
 * may pass an explicit institutionId, which is then verified to exist
 * and be ACTIVE.
 */
function resolveAdminInstitutionScope(req: {
  user?: { id: string; role: string; institutionId: string | null };
  institution?: { id: string } | null;
  query: { institutionId?: unknown };
}): { institutionId: string; explicit: boolean } | null {
  const actor = req.user!;
  if (actor.role !== 'OWNER') {
    // Non-OWNER: only the verified context, never a query parameter.
    return req.institution ? { institutionId: req.institution.id, explicit: false } : null;
  }
  const requested = typeof req.query.institutionId === 'string' ? req.query.institutionId : null;
  if (!requested) {
    return req.institution ? { institutionId: req.institution.id, explicit: false } : null;
  }
  return { institutionId: requested, explicit: true };
}

/** OWNER cross-institution administration: verify the target exists + ACTIVE. */
async function assertOwnerTargetInstitution(institutionId: string): Promise<void> {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { status: true },
  });
  if (!institution || institution.status !== 'ACTIVE') {
    throw AppError.notFound('المؤسسة المطلوبة غير موجودة');
  }
}

// §3.2 scope policy: BROWSING grants is an institution-wide operation —
// the router-level capability gate + the verified context apply (OWNER
// may pass an explicit verified institutionId instead).
router.get(
  '/admin/users/:id/unit-capabilities',
  requireCapability('UNIT_CAPABILITIES_ASSIGN'),
  requireInstitutionUnlessOwner,
  async (req, res, next) => {
  try {
    const scope = resolveAdminInstitutionScope(req);
    if (!scope) {
      throw new AppError(
        'INSTITUTION_CONTEXT_REQUIRED',
        'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
        403,
      );
    }
    if (scope.explicit) await assertOwnerTargetInstitution(scope.institutionId);
    const data = await prisma.unitCapabilityGrant.findMany({
      where: { userId: req.params.id!, institutionId: scope.institutionId },
      include: GRANT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
  },
);

router.post(
  '/admin/users/:id/unit-capabilities',
  requireInstitutionUnlessOwner,
  validate(unitCapabilityGrantCreateSchema),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const input = req.body as z.infer<typeof unitCapabilityGrantCreateSchema>;

      // §3.1: the grant's institution is the SERVER-VERIFIED context for
      // every non-OWNER caller. OWNER may target another institution,
      // verified below — but the DTO's institutionId is otherwise IGNORED
      // (kept in the contract for OWNER tooling only).
      const scope = resolveAdminInstitutionScope(req);
      if (!scope) {
        throw new AppError(
          'INSTITUTION_CONTEXT_REQUIRED',
          'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
          403,
        );
      }
      if (scope.explicit && input.institutionId !== scope.institutionId) {
        throw new AppError(
          'UNIT_GRANT_INSTITUTION_MISMATCH',
          'معرّف المؤسسة في الطلب لا يطابق سياق الإدارة الحالي',
          400,
        );
      }
      const institutionId = scope.institutionId;
      if (scope.explicit) await assertOwnerTargetInstitution(institutionId);

      // §3.2 scope policy: the ACTOR must hold UNIT_CAPABILITIES_ASSIGN
      // at the grant's own scope — a faculty-scoped grant administrator
      // can grant within their subtree; an institution-wide grant needs
      // the institution-wide capability.
      if (actor.role !== 'OWNER') {
        if (input.orgUnitId) {
          await assertCapabilityForUnit(actor.id, actor.role, institutionId, input.orgUnitId, 'UNIT_CAPABILITIES_ASSIGN');
        } else {
          await assertCapabilityIn(actor.id, actor.role, institutionId, 'UNIT_CAPABILITIES_ASSIGN');
        }
      }

      // §3.2 rule 11: the target must hold an ACTIVE membership in the
      // institution (a grant rides a real institutional standing).
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.params.id!,
          institutionId,
          isActive: true,
          institution: { status: 'ACTIVE' },
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

      // Unit scope integrity: the unit belongs to the SAME institution.
      if (input.orgUnitId) {
        await assertOrgUnitInInstitution(input.orgUnitId, institutionId);
      }

      // §3.2 rule 8: the actor may not grant a capability exceeding
      // their own authority over the target scope (OWNER exempt).
      if (actor.role !== 'OWNER') {
        const covers = await callerAuthorityCoversUnit(
          actor.id,
          actor.role,
          institutionId,
          input.capability,
          input.orgUnitId ?? null,
        );
        if (!covers) {
          throw new AppError(
            'GRANT_EXCEEDS_AUTHORITY',
            'لا يمكنك منح قدرة تتجاوز صلاحيتك على النطاق المستهدف',
            403,
          );
        }
      }

      // Pre-check the exact tuple inside the coming transaction; the
      // partial unique index (orgUnitId IS NULL AND isActive) is the
      // concurrency belt — P2002 below still maps to the Arabic 409.
      const existingGrant = await prisma.unitCapabilityGrant.findFirst({
        where: {
          userId: req.params.id!,
          institutionId,
          orgUnitId: input.orgUnitId ?? null,
          capability: input.capability,
          isActive: true,
        },
        select: { id: true },
      });
      if (existingGrant) {
        throw AppError.conflict('توجد منحة مطابقة لهذا المستخدم بالفعل');
      }
      const grant = await prisma.$transaction(async (tx) => {
        const created = await tx.unitCapabilityGrant.create({
          data: {
            userId: req.params.id!,
            institutionId,
            orgUnitId: input.orgUnitId ?? null,
            capability: input.capability,
            reason: input.reason ?? null,
            grantedById: actor.id,
          },
          include: GRANT_INCLUDE,
        });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            institutionId,
            action: 'unit_capability.grant',
            resourceType: 'UnitCapabilityGrant',
            resourceId: created.id,
            metadata: {
              targetUserId: req.params.id!,
              capability: input.capability,
              orgUnitId: input.orgUnitId ?? null,
            },
          },
        });
        return created;
      });
      res.status(201).json({ data: grant });
    } catch (e) {
      // §6.1 — racing grants: the partial unique index
      // (orgUnitId IS NULL AND isActive) answers P2002, but the same
      // race can deadlock the two transactions (SQLSTATE 40P01 —
      // escaped by Prisma 5.22 as UnknownRequestError with the raw
      // connector dump, see lib/prisma-errors.ts). Here the only
      // contended resource is that unique index, so the deadlock
      // loser gets the same Arabic 409, never a 500.
      if (
        (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') ||
        isPrismaWriteConflictOrDeadlock(e)
      ) {
        return next(AppError.conflict('توجد منحة مطابقة لهذا المستخدم بالفعل'));
      }
      next(e);
    }
  },
);

router.post('/admin/unit-capabilities/:id/revoke', requireInstitutionUnlessOwner, async (req, res, next) => {
  try {
    const actor = req.user!;
    const grant = await prisma.unitCapabilityGrant.findUnique({
      where: { id: req.params.id! },
      select: { id: true, institutionId: true, isActive: true, capability: true, userId: true, orgUnitId: true },
    });
    if (!grant) throw AppError.notFound('المنحة المطلوبة غير موجودة');

    // §3.1: a non-OWNER caller can only revoke inside their verified
    // institution — a foreign grant reads as absent (no existence leak).
    // OWNER may revoke across institutions; the grant row itself is the
    // resource whose validity was proven above.
    if (actor.role !== 'OWNER') {
      if (!req.institution || req.institution.id !== grant.institutionId) {
        throw AppError.notFound('المنحة المطلوبة غير موجودة');
      }
    }
    if (!grant.isActive) throw AppError.conflict('المنحة ملغاة مسبقًا');

    // §3.2 scope policy mirrored on revoke: UNIT_CAPABILITIES_ASSIGN at
    // the grant's own scope.
    if (actor.role !== 'OWNER') {
      if (grant.orgUnitId) {
        await assertCapabilityForUnit(actor.id, actor.role, grant.institutionId, grant.orgUnitId, 'UNIT_CAPABILITIES_ASSIGN');
      } else {
        await assertCapabilityIn(actor.id, actor.role, grant.institutionId, 'UNIT_CAPABILITIES_ASSIGN');
      }
    }

    // §3.2 rule 8 mirrored on revoke: the actor must hold the revoked
    // capability's authority over the grant's scope.
    if (actor.role !== 'OWNER') {
      const covers = await callerAuthorityCoversUnit(
        actor.id,
        actor.role,
        grant.institutionId,
        grant.capability,
        grant.orgUnitId,
      );
      if (!covers) {
        throw new AppError(
          'GRANT_EXCEEDS_AUTHORITY',
          'لا يمكنك إلغاء منحة قدرة لا تملك سلطتها على نطاقها',
          403,
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.unitCapabilityGrant.update({
        where: { id: grant.id },
        data: { isActive: false, revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          institutionId: grant.institutionId,
          action: 'unit_capability.revoke',
          resourceType: 'UnitCapabilityGrant',
          resourceId: grant.id,
          metadata: { targetUserId: grant.userId, capability: grant.capability },
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
