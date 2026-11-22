/**
 * r352 — compliance: external accreditation, operational licenses,
 * regulatory inspections, findings, corrective actions, internal
 * self-assessments, and evidence.
 *
 * Mounted at '/api/v1/compliance' (see app.ts).
 * External records (accreditation/licenses/inspections/findings/
 * corrective actions/evidence): ACCREDITATION_MANAGE.
 * Internal self-assessments: QUALITY_INTERNAL_MANAGE — granted to
 * NOBODY by default (DECISIONS.md D8): the QA office's workflow is
 * deliberately separate from both the QUALITY role's read-only
 * oversight and the National Center's external accreditation.
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
import { buildMeta } from '../../lib/pagination.js';
import {
  ACCREDITATION_TRANSITIONS, CORRECTIVE_ACTION_TRANSITIONS, FINDING_TRANSITIONS,
  INSPECTION_TRANSITIONS, LICENSE_TRANSITIONS, SELF_ASSESSMENT_TRANSITIONS,
  transitionAllowed,
} from '../../lib/lifecycle-rules.js';
import {
  accreditationListSchema, accreditationCreateSchema, accreditationUpdateSchema,
  licenseListSchema, licenseCreateSchema, licenseUpdateSchema,
  inspectionListSchema, inspectionCreateSchema, inspectionUpdateSchema,
  findingListSchema, findingCreateSchema, findingUpdateSchema,
  correctiveActionCreateSchema, correctiveActionUpdateSchema,
  selfAssessmentListSchema, selfAssessmentCreateSchema, selfAssessmentUpdateSchema,
  evidenceListSchema, evidenceCreateSchema,
} from '../../modules/r352/dto.js';

const router = Router();

router.use(authMiddleware, requireInstitution);

async function audit(
  tx: Prisma.TransactionClient,
  userId: string, institutionId: string, action: string,
  resourceType: string, resourceId: string, metadata: unknown,
) {
  await tx.auditLog.create({
    data: { userId, institutionId, action, resourceType, resourceId, metadata: metadata as object },
  });
}

/** Resolve the seeded authority by code (404 when unknown). */
async function requireAuthority(code: string) {
  const authority = await prisma.regulatoryAuthority.findUnique({
    where: { code }, select: { id: true },
  });
  if (!authority) throw AppError.notFound('الجهة الرقابية المحددة غير موجودة في الكتالوج');
  return authority;
}

/** Validate an accreditation/license scope target belongs to the institution. */
async function assertScopeTargets(
  institutionId: string,
  scopeType: 'INSTITUTION' | 'ORGANIZATIONAL_UNIT' | 'PROGRAM' | null | undefined,
  orgUnitId?: string | null,
  programId?: string | null,
): Promise<void> {
  if (scopeType === 'ORGANIZATIONAL_UNIT' && orgUnitId) {
    const unit = await prisma.organizationalUnit.findUnique({
      where: { id: orgUnitId }, select: { institutionId: true },
    });
    if (!unit || unit.institutionId !== institutionId) {
      throw new AppError('ACCREDITATION_SCOPE_INVALID', 'وحدة النطاق المحددة لا تنتمي إلى مؤسستك', 400);
    }
  }
  if (scopeType === 'PROGRAM' && programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId }, select: { institutionId: true },
    });
    if (!program || program.institutionId !== institutionId) {
      throw new AppError('ACCREDITATION_SCOPE_INVALID', 'برنامج النطاق المحدد لا ينتمي إلى مؤسستك', 400);
    }
  }
}

// ── external accreditations ────────────────────────────────────────
router.get('/accreditations', validate(accreditationListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, type } = req.query as unknown as z.infer<typeof accreditationListSchema>;
    const where: Prisma.ExternalAccreditationWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.externalAccreditation.count({ where }),
      prisma.externalAccreditation.findMany({
        where,
        include: {
          authority: { select: { id: true, code: true, nameAr: true } },
          criteriaSet: { select: { id: true, code: true, version: true, nameAr: true } },
          orgUnit: { select: { id: true, nameAr: true } },
          program: { select: { id: true, code: true, nameAr: true } },
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
});

router.post(
  '/accreditations',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(accreditationCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof accreditationCreateSchema>;
      const authority = await requireAuthority(input.authorityCode);
      await assertScopeTargets(institutionId, input.scopeType, input.orgUnitId, input.programId);
      if (input.criteriaSetId) {
        const set = await prisma.accreditationCriteriaSet.findUnique({
          where: { id: input.criteriaSetId }, select: { id: true },
        });
        if (!set) throw AppError.notFound('مجموعة المعايير المحددة غير موجودة');
      }
      const accreditation = await prisma.$transaction(async (tx) => {
        const created = await tx.externalAccreditation.create({
          data: {
            institutionId,
            scopeType: input.scopeType ?? 'INSTITUTION',
            orgUnitId: input.orgUnitId ?? null,
            programId: input.programId ?? null,
            authorityId: authority.id,
            type: input.type,
            decisionNumber: input.decisionNumber ?? null,
            decisionDate: input.decisionDate ?? null,
            effectiveFrom: input.effectiveFrom ?? null,
            effectiveTo: input.effectiveTo ?? null,
            criteriaSetId: input.criteriaSetId ?? null,
            reportRef: input.reportRef ?? null,
            notes: input.notes ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'accreditation.create', 'ExternalAccreditation', created.id, {
          type: input.type, authorityCode: input.authorityCode,
        });
        return created;
      });
      res.status(201).json({ data: accreditation });
    } catch (e) {
      next(e);
    }
  },
);

async function requireAccreditation(institutionId: string, id: string) {
  const row = await prisma.externalAccreditation.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!row || row.institutionId !== institutionId) {
    throw AppError.notFound('سجل الاعتماد المطلوب غير موجود');
  }
  return row;
}

router.patch(
  '/accreditations/:id',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(accreditationUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireAccreditation(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof accreditationUpdateSchema>;
      if (input.status && input.status !== existing.status) {
        if (!transitionAllowed(ACCREDITATION_TRANSITIONS, existing.status as 'PENDING', input.status)) {
          throw new AppError('ACCREDITATION_INVALID_TRANSITION', 'انتقال حالة الاعتماد غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.externalAccreditation.update({
          where: { id: existing.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.decisionNumber !== undefined ? { decisionNumber: input.decisionNumber } : {}),
            ...(input.decisionDate !== undefined ? { decisionDate: input.decisionDate } : {}),
            ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
            ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}),
            ...(input.reportRef !== undefined ? { reportRef: input.reportRef } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'accreditation.update', 'ExternalAccreditation', existing.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── operational licenses ───────────────────────────────────────────
router.get('/licenses', validate(licenseListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, kind } = req.query as unknown as z.infer<typeof licenseListSchema>;
    const where: Prisma.OperationalLicenseWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.operationalLicense.count({ where }),
      prisma.operationalLicense.findMany({
        where,
        include: {
          authority: { select: { id: true, code: true, nameAr: true } },
          orgUnit: { select: { id: true, nameAr: true } },
          program: { select: { id: true, code: true, nameAr: true } },
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
});

router.post(
  '/licenses',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(licenseCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof licenseCreateSchema>;
      const authority = await requireAuthority(input.authorityCode);
      await assertScopeTargets(institutionId, input.scopeType, input.orgUnitId, input.programId);
      const license = await prisma.$transaction(async (tx) => {
        const created = await tx.operationalLicense.create({
          data: {
            institutionId,
            authorityId: authority.id,
            kind: input.kind,
            licenseNumber: input.licenseNumber ?? null,
            scopeType: input.scopeType ?? null,
            orgUnitId: input.orgUnitId ?? null,
            programId: input.programId ?? null,
            issuedAt: input.issuedAt ?? null,
            expiresAt: input.expiresAt ?? null,
            conditions: input.conditions ?? null,
            documentRef: input.documentRef ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'license.create', 'OperationalLicense', created.id, {
          kind: input.kind, authorityCode: input.authorityCode,
        });
        return created;
      });
      res.status(201).json({ data: license });
    } catch (e) {
      next(e);
    }
  },
);

async function requireLicense(institutionId: string, id: string) {
  const row = await prisma.operationalLicense.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!row || row.institutionId !== institutionId) {
    throw AppError.notFound('سجل الترخيص المطلوب غير موجود');
  }
  return row;
}

router.patch(
  '/licenses/:id',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(licenseUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireLicense(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof licenseUpdateSchema>;
      if (input.status && input.status !== existing.status) {
        if (!transitionAllowed(LICENSE_TRANSITIONS, existing.status as 'PENDING', input.status)) {
          throw new AppError('LICENSE_INVALID_TRANSITION', 'انتقال حالة الترخيص غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.operationalLicense.update({
          where: { id: existing.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
            ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt } : {}),
            ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
            ...(input.conditions !== undefined ? { conditions: input.conditions } : {}),
            ...(input.documentRef !== undefined ? { documentRef: input.documentRef } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'license.update', 'OperationalLicense', existing.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── inspections ────────────────────────────────────────────────────
router.get('/inspections', validate(inspectionListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof inspectionListSchema>;
    const where: Prisma.RegulatoryInspectionWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.regulatoryInspection.count({ where }),
      prisma.regulatoryInspection.findMany({
        where,
        include: {
          authority: { select: { id: true, code: true, nameAr: true } },
          orgUnit: { select: { id: true, nameAr: true } },
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...row }) => ({ ...row, findingCount: _count.findings })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/inspections',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(inspectionCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof inspectionCreateSchema>;
      const authority = await requireAuthority(input.authorityCode);
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      const inspection = await prisma.$transaction(async (tx) => {
        const created = await tx.regulatoryInspection.create({
          data: {
            institutionId,
            authorityId: authority.id,
            kind: input.kind,
            orgUnitId: input.orgUnitId ?? null,
            scheduledAt: input.scheduledAt ?? null,
            reportRef: input.reportRef ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'inspection.create', 'RegulatoryInspection', created.id, {
          kind: input.kind, authorityCode: input.authorityCode,
        });
        return created;
      });
      res.status(201).json({ data: inspection });
    } catch (e) {
      next(e);
    }
  },
);

async function requireInspection(institutionId: string, id: string) {
  const row = await prisma.regulatoryInspection.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!row || row.institutionId !== institutionId) {
    throw AppError.notFound('زيارة التفتيش المطلوبة غير موجودة');
  }
  return row;
}

router.patch(
  '/inspections/:id',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(inspectionUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireInspection(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof inspectionUpdateSchema>;
      if (input.status && input.status !== existing.status) {
        if (!transitionAllowed(INSPECTION_TRANSITIONS, existing.status as 'SCHEDULED', input.status)) {
          throw new AppError('INSPECTION_INVALID_TRANSITION', 'انتقال حالة التفتيش غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.regulatoryInspection.update({
          where: { id: existing.id },
          data: {
            ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
            ...(input.conductedAt !== undefined ? { conductedAt: input.conductedAt } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.summary !== undefined ? { summary: input.summary } : {}),
            ...(input.reportRef !== undefined ? { reportRef: input.reportRef } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'inspection.update', 'RegulatoryInspection', existing.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── findings + corrective actions ──────────────────────────────────
router.get('/findings', validate(findingListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, severity } = req.query as unknown as z.infer<typeof findingListSchema>;
    const where: Prisma.ComplianceFindingWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.complianceFinding.count({ where }),
      prisma.complianceFinding.findMany({
        where,
        include: {
          inspection: { select: { id: true, kind: true, conductedAt: true } },
          externalAccreditation: { select: { id: true, type: true, status: true } },
          orgUnit: { select: { id: true, nameAr: true } },
          program: { select: { id: true, code: true, nameAr: true } },
          correctiveActions: true,
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
});

router.post(
  '/findings',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(findingCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof findingCreateSchema>;
      if (input.inspectionId) await requireInspection(institutionId, input.inspectionId);
      if (input.externalAccreditationId) await requireAccreditation(institutionId, input.externalAccreditationId);
      await assertScopeTargets(institutionId, input.orgUnitId ? 'ORGANIZATIONAL_UNIT' : null, input.orgUnitId, input.programId);
      const finding = await prisma.$transaction(async (tx) => {
        const created = await tx.complianceFinding.create({
          data: {
            institutionId,
            inspectionId: input.inspectionId ?? null,
            externalAccreditationId: input.externalAccreditationId ?? null,
            orgUnitId: input.orgUnitId ?? null,
            programId: input.programId ?? null,
            severity: input.severity,
            titleAr: input.titleAr,
            description: input.description ?? null,
            legalReference: input.legalReference ?? null,
            dueDate: input.dueDate ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'finding.create', 'ComplianceFinding', created.id, {
          severity: input.severity, titleAr: input.titleAr,
        });
        return created;
      });
      res.status(201).json({ data: finding });
    } catch (e) {
      next(e);
    }
  },
);

async function requireFinding(institutionId: string, id: string) {
  const row = await prisma.complianceFinding.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!row || row.institutionId !== institutionId) {
    throw AppError.notFound('الملاحظة المطلوبة غير موجودة');
  }
  return row;
}

router.patch(
  '/findings/:id',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(findingUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireFinding(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof findingUpdateSchema>;
      if (input.status && input.status !== existing.status) {
        if (!transitionAllowed(FINDING_TRANSITIONS, existing.status as 'OPEN', input.status)) {
          throw new AppError('FINDING_INVALID_TRANSITION', 'انتقال حالة الملاحظة غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.complianceFinding.update({
          where: { id: existing.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
            ...(input.status === 'CLOSED' ? { closedAt: new Date() } : {}),
            ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'finding.update', 'ComplianceFinding', existing.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/findings/:id/corrective-actions',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(correctiveActionCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const finding = await requireFinding(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof correctiveActionCreateSchema>;
      if (input.ownerPersonId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.ownerPersonId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('المسؤول المحدد غير موجود في مؤسستك');
        }
      }
      const plan = await prisma.$transaction(async (tx) => {
        const created = await tx.correctiveActionPlan.create({
          data: {
            findingId: finding.id,
            ownerPersonId: input.ownerPersonId ?? null,
            planText: input.planText,
            targetDate: input.targetDate ?? null,
            approvedById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'corrective_action.create', 'CorrectiveActionPlan', created.id, {
          findingId: finding.id,
        });
        return created;
      });
      res.status(201).json({ data: plan });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/corrective-actions/:id',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(correctiveActionUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const plan = await prisma.correctiveActionPlan.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, finding: { select: { institutionId: true } } },
      });
      if (!plan || plan.finding.institutionId !== institutionId) {
        throw AppError.notFound('خطة التصحيح المطلوبة غير موجودة');
      }
      const input = req.body as z.infer<typeof correctiveActionUpdateSchema>;
      if (input.status && input.status !== plan.status) {
        if (!transitionAllowed(CORRECTIVE_ACTION_TRANSITIONS, plan.status as 'PLANNED', input.status)) {
          throw new AppError('CORRECTIVE_ACTION_INVALID_TRANSITION', 'انتقال حالة خطة التصحيح غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.correctiveActionPlan.update({
          where: { id: plan.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'COMPLETED' ? { completedAt: input.completedAt ?? new Date() } : {}),
            ...(input.verificationRef !== undefined ? { verificationRef: input.verificationRef } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'corrective_action.update', 'CorrectiveActionPlan', plan.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── internal self-assessments (QUALITY_INTERNAL_MANAGE) ───────────
router.get('/self-assessments', validate(selfAssessmentListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof selfAssessmentListSchema>;
    const where: Prisma.InternalSelfAssessmentWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.internalSelfAssessment.count({ where }),
      prisma.internalSelfAssessment.findMany({
        where,
        include: {
          orgUnit: { select: { id: true, nameAr: true } },
          criteriaSet: { select: { id: true, code: true, version: true, nameAr: true } },
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
});

router.post(
  '/self-assessments',
  requireCapability('QUALITY_INTERNAL_MANAGE'),
  validate(selfAssessmentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof selfAssessmentCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      const assessment = await prisma.$transaction(async (tx) => {
        const created = await tx.internalSelfAssessment.create({
          data: {
            institutionId,
            periodLabel: input.periodLabel,
            orgUnitId: input.orgUnitId ?? null,
            criteriaSetId: input.criteriaSetId ?? null,
            summary: input.summary ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'self_assessment.create', 'InternalSelfAssessment', created.id, {
          periodLabel: input.periodLabel,
        });
        return created;
      });
      res.status(201).json({ data: assessment });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/self-assessments/:id',
  requireCapability('QUALITY_INTERNAL_MANAGE'),
  validate(selfAssessmentUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const assessment = await prisma.internalSelfAssessment.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, institutionId: true },
      });
      if (!assessment || assessment.institutionId !== institutionId) {
        throw AppError.notFound('التقييم الذاتي المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof selfAssessmentUpdateSchema>;
      if (input.status && input.status !== assessment.status) {
        if (!transitionAllowed(SELF_ASSESSMENT_TRANSITIONS, assessment.status as 'DRAFT', input.status)) {
          throw new AppError('SELF_ASSESSMENT_INVALID_TRANSITION', 'انتقال حالة التقييم الذاتي غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.internalSelfAssessment.update({
          where: { id: assessment.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
            ...(input.status === 'APPROVED' ? { approvedAt: new Date() } : {}),
            ...(input.summary !== undefined ? { summary: input.summary } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'self_assessment.update', 'InternalSelfAssessment', assessment.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── evidence ───────────────────────────────────────────────────────
router.get('/evidence', validate(evidenceListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, ownerType, ownerId } = req.query as unknown as z.infer<typeof evidenceListSchema>;
    const where: Prisma.ComplianceEvidenceWhereInput = {
      institutionId: req.institution!.id,
      ...(ownerType ? { ownerType } : {}),
      ...(ownerId ? { ownerId } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.complianceEvidence.count({ where }),
      prisma.complianceEvidence.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/evidence',
  requireCapability('ACCREDITATION_MANAGE'),
  validate(evidenceCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof evidenceCreateSchema>;
      // The owning record must exist AND belong to the caller's institution.
      const ownerOk = await (async () => {
        switch (input.ownerType) {
          case 'ExternalAccreditation':
            return (await prisma.externalAccreditation.count({ where: { id: input.ownerId, institutionId } })) > 0;
          case 'CorrectiveActionPlan':
            return (
              await prisma.correctiveActionPlan.count({
                where: { id: input.ownerId, finding: { institutionId } },
              })
            ) > 0;
          case 'InternalSelfAssessment':
            return (await prisma.internalSelfAssessment.count({ where: { id: input.ownerId, institutionId } })) > 0;
          case 'RegulatoryInspection':
            return (await prisma.regulatoryInspection.count({ where: { id: input.ownerId, institutionId } })) > 0;
          case 'OperationalLicense':
            return (await prisma.operationalLicense.count({ where: { id: input.ownerId, institutionId } })) > 0;
          default:
            return false;
        }
      })();
      if (!ownerOk) {
        throw new AppError('EVIDENCE_OWNER_INVALID', 'السجل المالك للأدلة غير موجود في مؤسستك', 400);
      }
      const evidence = await prisma.$transaction(async (tx) => {
        const created = await tx.complianceEvidence.create({
          data: {
            institutionId,
            ownerType: input.ownerType,
            ownerId: input.ownerId,
            titleAr: input.titleAr,
            documentRef: input.documentRef ?? null,
            fileUrl: input.fileUrl ?? null,
            description: input.description ?? null,
            uploadedById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'evidence.create', 'ComplianceEvidence', created.id, {
          ownerType: input.ownerType, ownerId: input.ownerId,
        });
        return created;
      });
      res.status(201).json({ data: evidence });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
