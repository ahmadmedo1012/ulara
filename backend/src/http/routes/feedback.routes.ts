import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { AppError } from '../../lib/errors.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { canTransitionStatus, screenshotOk, type FeedbackStatus } from '../../modules/feedback/core.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';

/**
 * r323 B3.6 — the pilot feedback loop.
 *
 *   POST  /feedback      — the floating widget (any signed-in user;
 *                          5 / hour — a pilot tap, not a firehose)
 *   GET   /feedback      — the registrar/owner inbox (status filter +
 *                          pagination)
 *   PATCH /feedback/:id  — the status grammar (core.ts): open →
 *                          triage → fixed | dismissed (terminal)
 */

const router = Router();

const consoleEntrySchema = z.object({
  t: z.number().int().nonnegative(),
  text: z.string().max(500),
});

const createBody = z
  .object({
    kind: z.enum(['BUG', 'IDEA']),
    note: z.string().trim().min(10, 'الوصف قصير جدًا — 10 أحرف على الأقل').max(2000),
    route: z.string().trim().max(300).optional(),
    console: z.array(consoleEntrySchema).max(20).optional(),
    screenshot: z.string().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.screenshot !== undefined && !screenshotOk(b.screenshot)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['screenshot'], message: 'اللقطة غير صالحة أو أكبر من الحد' });
    }
  });

router.post(
  '/feedback',
  authMiddleware,
  createRouteLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  validate(createBody),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createBody>;
      // r352 hardening #3 (r342 t14): stamp the submitter's DB-verified
      // institution — the token's inst claim is only metadata, so it is
      // confirmed against an ACTIVE membership before it lands in the
      // row. A contextless token (or an unverified claim) files a
      // platform-scope row (NULL) — visible to the OWNER inbox only.
      let institutionId: string | null = null;
      if (req.user!.institutionId) {
        const membership = await prisma.membership.findFirst({
          where: {
            userId: req.user!.id,
            institutionId: req.user!.institutionId,
            isActive: true,
            institution: { status: 'ACTIVE' },
          },
          select: { id: true },
        });
        institutionId = membership ? req.user!.institutionId : null;
      }
      const created = await prisma.pilotFeedback.create({
        data: {
          userId: req.user!.id,
          institutionId,
          kind: body.kind,
          role: req.user!.role,
          route: body.route ?? null,
          userAgent: (req.headers['user-agent'] ?? '').slice(0, 300) || null,
          console: body.console ? (body.console as never) : undefined,
          note: body.note,
          screenshot: body.screenshot ?? null,
        },
        select: { id: true, createdAt: true },
      });
      logger.info({ feedbackId: created.id, kind: body.kind, userId: req.user!.id }, 'feedback: filed');
      res.status(201).json({ data: created });
    } catch (e) { next(e); }
  },
);

router.get(
  '/feedback',
  authMiddleware,
  requireRole(Role.ADMIN, Role.QUALITY, Role.OWNER),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 50);
      const status = typeof req.query.status === 'string' ? req.query.status : null;
      // r352 hardening #3 (r342 t14): the institutional inbox is scoped —
      // an ADMIN/QUALITY caller MUST hold a DB-verified institution
      // context (403 without one) and sees ONLY their institution's rows;
      // the platform OWNER keeps the cross-tenant view (the platform-scope
      // NULL rows included — they have no institution to belong to).
      const callerInstitution =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
      if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !callerInstitution) {
        throw institutionContextRequiredError();
      }
      const where = {
        ...(status && ['open', 'triage', 'fixed', 'dismissed'].includes(status) ? { status } : {}),
        ...(callerInstitution ? { institutionId: callerInstitution } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.pilotFeedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        }),
        prisma.pilotFeedback.count({ where }),
      ]);
      res.json({ data: rows, meta: buildMeta(page, limit, total) });
    } catch (e) { next(e); }
  },
);

const patchBody = z.object({ status: z.enum(['open', 'triage', 'fixed', 'dismissed']) }).strict();

router.patch(
  '/feedback/:id',
  authMiddleware,
  requireRole(Role.ADMIN, Role.QUALITY, Role.OWNER),
  validate(patchBody),
  async (req, res, next) => {
    try {
      // r352 hardening #3: the status grammar runs on the caller's OWN
      // rows — an institutional ADMIN/QUALITY may not touch another
      // institution's (or the platform-scope) feedback; the platform
      // OWNER governs all of it. Foreign ids fail closed as 404 (never
      // leak existence).
      const callerInstitution =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
      if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !callerInstitution) {
        throw institutionContextRequiredError();
      }
      const row = await prisma.pilotFeedback.findUnique({
        where: { id: req.params.id! },
        select: { status: true, institutionId: true },
      });
      if (
        !row ||
        (callerInstitution ? row.institutionId !== callerInstitution : false)
      ) throw AppError.notFound('التقرير غير موجود');
      if (!canTransitionStatus(row.status as FeedbackStatus, (req.body as z.infer<typeof patchBody>).status)) {
        throw AppError.conflict('لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية');
      }
      const updated = await prisma.pilotFeedback.update({
        where: { id: req.params.id! },
        data: { status: (req.body as z.infer<typeof patchBody>).status },
        select: { id: true, status: true },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

export default router;
