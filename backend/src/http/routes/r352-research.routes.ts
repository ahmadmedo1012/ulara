/**
 * r352 — institutional research projects, members, and outputs.
 * The existing student ResearchPaper workflow is untouched; outputs
 * may bridge to it via researchPaperId.
 *
 * Mounted at '/api/v1/research-projects' + '/research-outputs' (see
 * app.ts — the router mounts at '/api/v1' and declares both prefixes).
 * Writes need RESEARCH_PROJECTS_MANAGE; reads need the institution
 * context.
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
import { RESEARCH_PROJECT_TRANSITIONS, transitionAllowed } from '../../lib/lifecycle-rules.js';
import {
  researchProjectListSchema, researchProjectCreateSchema, researchProjectUpdateSchema,
  researchMemberCreateSchema, researchOutputListSchema, researchOutputCreateSchema,
} from '../../modules/r352/dto.js';

const router = Router();

// Scoped to THIS router's paths: the router mounts at the /api/v1 root
// (see app.ts), so a path-less use() would run for every later-mounted
// router's requests too — blocking legitimate contextless callers
// (e.g. OWNER) from unrelated admin surfaces.
router.use(['/research-projects', '/research-outputs'], authMiddleware, requireInstitution);

async function audit(
  tx: Prisma.TransactionClient,
  userId: string, institutionId: string, action: string,
  resourceType: string, resourceId: string, metadata: unknown,
) {
  await tx.auditLog.create({
    data: { userId, institutionId, action, resourceType, resourceId, metadata: metadata as object },
  });
}

async function requireProject(institutionId: string, id: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!project || project.institutionId !== institutionId) {
    throw AppError.notFound('المشروع البحثي المطلوب غير موجود');
  }
  return project;
}

// LEGAL-MATRIX §A.3 [M] — Law 21/2023 stage-1/2 institution kinds carry no
// research mandate (their charter is TVET delivery, stages 1–2). The
// institutional workspace's module registry hides the research domain for
// these kinds; the same rule is enforced HERE server-side so the API can
// never contradict the UI's legal claim. Confidence note: §A.3's stage
// mapping is medium-confidence (official-summary interpretation); the kind
// codes are the single place to adjust if the catalog later grows a
// per-kind research flag.
const RESEARCH_FOREIGN_KIND_CODES = new Set(['INTERMEDIATE_TECHNICAL_INSTITUTE', 'VOCATIONAL_TRAINING_CENTER']);

async function assertResearchApplicableToKind(institutionId: string): Promise<void> {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { kind: { select: { code: true } } },
  });
  if (institution?.kind && RESEARCH_FOREIGN_KIND_CODES.has(institution.kind.code)) {
    throw new AppError(
      'RESEARCH_NOT_APPLICABLE',
      'النشاط البحثي لا ينطبق على نوع مؤسستك (المعاهد التقنية المتوسطة ومراكز التدريب المهني — قانون 21/2023، المرحلتان 1-2)',
      403,
    );
  }
}

router.get('/research-projects', validate(researchProjectListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, status } = req.query as unknown as z.infer<typeof researchProjectListSchema>;
    const where: Prisma.ResearchProjectWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ titleAr: { contains: q } }, { titleEn: { contains: q } }, { code: { contains: q } }] } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.researchProject.count({ where }),
      prisma.researchProject.findMany({
        where,
        include: {
          orgUnit: { select: { id: true, nameAr: true, type: true } },
          principalInvestigator: { select: { id: true, fullNameAr: true } },
          _count: { select: { members: true, outputs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...row }) => ({ ...row, memberCount: _count.members, outputCount: _count.outputs })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/research-projects',
  requireCapability('RESEARCH_PROJECTS_MANAGE'),
  validate(researchProjectCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      // §A.3 kind gate — runs BEFORE any validation/transaction work.
      await assertResearchApplicableToKind(institutionId);
      const input = req.body as z.infer<typeof researchProjectCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة البحثية المحددة غير موجودة في مؤسستك');
        }
      }
      if (input.principalInvestigatorId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.principalInvestigatorId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('الباحث الرئيس المحدد غير موجود في مؤسستك');
        }
      }
      const project = await prisma.$transaction(async (tx) => {
        const created = await tx.researchProject.create({
          data: {
            institutionId,
            titleAr: input.titleAr,
            titleEn: input.titleEn ?? null,
            code: input.code ?? null,
            orgUnitId: input.orgUnitId ?? null,
            field: input.field ?? null,
            principalInvestigatorId: input.principalInvestigatorId ?? null,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            fundingSource: input.fundingSource ?? null,
            ...(input.budget !== undefined ? { budget: input.budget } : {}),
            ethicsApprovalRef: input.ethicsApprovalRef ?? null,
            approvalRef: input.approvalRef ?? null,
            notes: input.notes ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'research_project.create', 'ResearchProject', created.id, {
          titleAr: input.titleAr,
        });
        return created;
      });
      res.status(201).json({ data: project });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المشروع مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.get('/research-projects/:id', async (req, res, next) => {
  try {
    const project = await requireProject(req.institution!.id, req.params.id!);
    const detail = await prisma.researchProject.findUnique({
      where: { id: project.id },
      include: {
        orgUnit: { select: { id: true, nameAr: true, type: true } },
        principalInvestigator: { select: { id: true, fullNameAr: true, category: true } },
        members: {
          include: { person: { select: { id: true, fullNameAr: true, category: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        outputs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { researchPaper: { select: { id: true, title: true, status: true } } },
        },
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/research-projects/:id',
  requireCapability('RESEARCH_PROJECTS_MANAGE'),
  validate(researchProjectUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      await assertResearchApplicableToKind(institutionId);
      const project = await requireProject(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof researchProjectUpdateSchema>;
      // §4.5 — a newly supplied principal investigator is validated
      // BEFORE persisting: the person must belong to the same institution.
      if (input.principalInvestigatorId !== undefined && input.principalInvestigatorId !== null) {
        const investigator = await prisma.institutionalPerson.findUnique({
          where: { id: input.principalInvestigatorId },
          select: { institutionId: true },
        });
        if (!investigator || investigator.institutionId !== institutionId) {
          throw AppError.notFound('الباحث الرئيسي المحدد غير موجود في مؤسستك');
        }
      }
      if (input.status && input.status !== project.status) {
        if (!transitionAllowed(RESEARCH_PROJECT_TRANSITIONS, project.status as 'PROPOSED', input.status)) {
          throw new AppError('RESEARCH_PROJECT_INVALID_TRANSITION', 'انتقال حالة المشروع البحثي غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.researchProject.update({
          where: { id: project.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.titleEn !== undefined ? { titleEn: input.titleEn } : {}),
            ...(input.field !== undefined ? { field: input.field } : {}),
            ...(input.principalInvestigatorId !== undefined ? { principalInvestigatorId: input.principalInvestigatorId } : {}),
            ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
            ...(input.fundingSource !== undefined ? { fundingSource: input.fundingSource } : {}),
            ...(input.budget !== undefined ? { budget: input.budget } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'research_project.update', 'ResearchProject', project.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/research-projects/:id/members',
  requireCapability('RESEARCH_PROJECTS_MANAGE'),
  validate(researchMemberCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      await assertResearchApplicableToKind(institutionId);
      const project = await requireProject(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof researchMemberCreateSchema>;
      const person = await prisma.institutionalPerson.findUnique({
        where: { id: input.personId }, select: { id: true, institutionId: true },
      });
      if (!person || person.institutionId !== institutionId) {
        throw AppError.notFound('الباحث المحدد غير موجود في مؤسستك');
      }
      const member = await prisma.$transaction(async (tx) => {
        const created = await tx.researchProjectMember.create({
          data: {
            projectId: project.id,
            personId: person.id,
            role: input.role,
            allocationPct: input.allocationPct ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'research_member.create', 'ResearchProjectMember', created.id, {
          projectId: project.id, personId: person.id,
        });
        return created;
      });
      res.status(201).json({ data: member });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('الباحث عضو في المشروع مسبقًا'));
      }
      next(e);
    }
  },
);

router.delete('/research-projects/:id/members/:personId', requireCapability('RESEARCH_PROJECTS_MANAGE'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    await assertResearchApplicableToKind(institutionId);
    const project = await requireProject(institutionId, req.params.id!);
    await prisma.$transaction(async (tx) => {
      const removed = await tx.researchProjectMember.deleteMany({
        where: { projectId: project.id, personId: req.params.personId! },
      });
      if (removed.count === 0) throw AppError.notFound('العضو المحدد ليس في هذا المشروع');
      await audit(tx, req.user!.id, institutionId, 'research_member.remove', 'ResearchProject', project.id, {
        personId: req.params.personId!,
      });
    });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

// ── outputs ────────────────────────────────────────────────────────
router.get('/research-outputs', validate(researchOutputListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, projectId, type } = req.query as unknown as z.infer<typeof researchOutputListSchema>;
    const where: Prisma.ResearchOutputWhereInput = {
      institutionId: req.institution!.id,
      ...(projectId ? { projectId } : {}),
      ...(type ? { type } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { doi: { contains: q } }] } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.researchOutput.count({ where }),
      prisma.researchOutput.findMany({
        where,
        include: {
          project: { select: { id: true, titleAr: true, code: true } },
          person: { select: { id: true, fullNameAr: true } },
          researchPaper: { select: { id: true, title: true, status: true } },
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
  '/research-outputs',
  requireCapability('RESEARCH_PROJECTS_MANAGE'),
  validate(researchOutputCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      await assertResearchApplicableToKind(institutionId);
      const input = req.body as z.infer<typeof researchOutputCreateSchema>;
      if (input.projectId) await requireProject(institutionId, input.projectId);
      if (input.personId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.personId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('الباحث المحدد غير موجود في مؤسستك');
        }
      }
      if (input.researchPaperId) {
        const paper = await prisma.researchPaper.findUnique({
          where: { id: input.researchPaperId }, select: { institutionId: true },
        });
        if (!paper || paper.institutionId !== institutionId) {
          throw AppError.notFound('الورقة البحثية المحددة لا تنتمي إلى مؤسستك');
        }
      }
      const output = await prisma.$transaction(async (tx) => {
        const created = await tx.researchOutput.create({
          data: {
            institutionId,
            type: input.type,
            title: input.title,
            projectId: input.projectId ?? null,
            personId: input.personId ?? null,
            referenceUrl: input.referenceUrl ?? null,
            doi: input.doi ?? null,
            publishedAt: input.publishedAt ?? null,
            notes: input.notes ?? null,
            researchPaperId: input.researchPaperId ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'research_output.create', 'ResearchOutput', created.id, {
          type: input.type, title: input.title,
        });
        return created;
      });
      res.status(201).json({ data: output });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
