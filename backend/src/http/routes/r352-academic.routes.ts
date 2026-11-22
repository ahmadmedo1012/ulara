/**
 * r352 — academic terms, programs, versions, program-courses,
 * program enrollments, training placements, and credentials.
 *
 * Mounted at '/api/v1/academic' (see app.ts). Writes need
 * PROGRAMS_MANAGE (terms/programs/versions/enrollments/placements) or
 * CREDENTIALS_MANAGE (award/revoke); reads need the institution
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
import {
  PROGRAM_ENROLLMENT_TRANSITIONS, PROGRAM_TRANSITIONS, PROGRAM_VERSION_TRANSITIONS,
  transitionAllowed,
} from '../../lib/lifecycle-rules.js';
import {
  termCreateSchema, programListSchema, programCreateSchema, programUpdateSchema,
  programVersionCreateSchema, programVersionUpdateSchema, programCourseCreateSchema,
  programEnrollmentListSchema, programEnrollmentCreateSchema, programEnrollmentStatusSchema,
  placementListSchema, placementCreateSchema, placementUpdateSchema,
  credentialListSchema, credentialAwardSchema, credentialRevokeSchema,
  learnerListSchema, learnerCreateSchema, learnerUpdateSchema,
} from '../../modules/r352/dto.js';
import { learnerCategoryCompatible, progressionAllowed } from '../../lib/learner-logic.js';

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

// ── terms ──────────────────────────────────────────────────────────
router.get('/terms', async (_req, res, next) => {
  try {
    const data = await prisma.academicTerm.findMany({
      where: { institutionId: _req.institution!.id },
      orderBy: { startsAt: 'desc' },
      take: 100,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/terms',
  requireCapability('PROGRAMS_MANAGE'),
  validate(termCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof termCreateSchema>;
      const term = await prisma.$transaction(async (tx) => {
        if (input.isCurrent) {
          // Single-current invariant (partial unique index backs this).
          await tx.academicTerm.updateMany({
            where: { institutionId, isCurrent: true },
            data: { isCurrent: false },
          });
        }
        const created = await tx.academicTerm.create({
          data: {
            institutionId,
            code: input.code,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
            isCurrent: input.isCurrent ?? false,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'term.create', 'AcademicTerm', created.id, { code: input.code });
        return created;
      });
      res.status(201).json({ data: term });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز الفصل الدراسي مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

// ── programs ───────────────────────────────────────────────────────
router.get('/programs', validate(programListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, kind, status, orgUnitId } = req.query as unknown as z.infer<typeof programListSchema>;
    const where: Prisma.ProgramWhereInput = {
      institutionId: req.institution!.id,
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
      ...(orgUnitId ? { orgUnitId } : {}),
      ...(q ? { OR: [{ nameAr: { contains: q } }, { nameEn: { contains: q } }, { code: { contains: q } }] } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.program.count({ where }),
      prisma.program.findMany({
        where,
        include: {
          credentialType: { select: { id: true, code: true, nameAr: true } },
          orgUnit: { select: { id: true, nameAr: true, type: true } },
          _count: { select: { versions: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...program }) => ({
        ...program, versionCount: _count.versions, enrollmentCount: _count.enrollments,
      })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/programs',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof programCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      let credentialTypeId: string | null = null;
      if (input.credentialTypeCode) {
        const ct = await prisma.credentialType.findUnique({
          where: { code: input.credentialTypeCode }, select: { id: true },
        });
        if (!ct) throw AppError.notFound('نوع المؤهل المحدد غير موجود في الكتالوج');
        credentialTypeId = ct.id;
      }
      const program = await prisma.$transaction(async (tx) => {
        const created = await tx.program.create({
          data: {
            institutionId,
            code: input.code,
            nameAr: input.nameAr,
            nameEn: input.nameEn ?? null,
            kind: input.kind,
            orgUnitId: input.orgUnitId ?? null,
            credentialTypeId,
            approvalRef: input.approvalRef ?? null,
            durationMonths: input.durationMonths ?? null,
            totalCreditHours: input.totalCreditHours ?? null,
            admissionRequirements: (input.admissionRequirements ?? undefined) as Prisma.InputJsonValue | undefined,
            progressionRules: (input.progressionRules ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program.create', 'Program', created.id, {
          code: input.code, kind: input.kind,
        });
        return created;
      });
      res.status(201).json({ data: program });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز البرنامج مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

/** Resolve a program in the caller's institution. */
async function requireProgram(institutionId: string, programId: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      institutionId: true,
      status: true,
      kind: true,
      credentialTypeId: true,
      institution: { select: { kind: { select: { code: true } } } },
    },
  });
  if (!program || program.institutionId !== institutionId) {
    throw AppError.notFound('البرنامج المطلوب غير موجود');
  }
  return program;
}

router.get('/programs/:id', async (req, res, next) => {
  try {
    const program = await requireProgram(req.institution!.id, req.params.id!);
    const detail = await prisma.program.findUnique({
      where: { id: program.id },
      include: {
        credentialType: true,
        orgUnit: { select: { id: true, nameAr: true, type: true } },
        versions: {
          include: { _count: { select: { courses: true, enrollments: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/programs/:id',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const program = await requireProgram(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof programUpdateSchema>;
      if (input.status && input.status !== program.status) {
        if (!transitionAllowed(PROGRAM_TRANSITIONS, program.status as 'DRAFT', input.status)) {
          throw new AppError('PROGRAM_VERSION_INVALID_TRANSITION', 'انتقال حالة البرنامج غير مسموح', 409);
        }
      }
      let credentialTypeId: string | null | undefined;
      if (input.credentialTypeCode !== undefined) {
        if (input.credentialTypeCode === null) credentialTypeId = null;
        else {
          const ct = await prisma.credentialType.findUnique({
            where: { code: input.credentialTypeCode }, select: { id: true },
          });
          if (!ct) throw AppError.notFound('نوع المؤهل المحدد غير موجود في الكتالوج');
          credentialTypeId = ct.id;
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.program.update({
          where: { id: program.id },
          data: {
            ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.orgUnitId !== undefined ? { orgUnitId: input.orgUnitId } : {}),
            ...(credentialTypeId !== undefined ? { credentialTypeId } : {}),
            ...(input.approvalRef !== undefined ? { approvalRef: input.approvalRef } : {}),
            ...(input.durationMonths !== undefined ? { durationMonths: input.durationMonths } : {}),
            ...(input.totalCreditHours !== undefined ? { totalCreditHours: input.totalCreditHours } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.admissionRequirements !== undefined ? { admissionRequirements: input.admissionRequirements as Prisma.InputJsonValue } : {}),
            ...(input.progressionRules !== undefined ? { progressionRules: input.progressionRules as Prisma.InputJsonValue } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program.update', 'Program', program.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── versions ───────────────────────────────────────────────────────
router.post(
  '/programs/:id/versions',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programVersionCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const program = await requireProgram(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof programVersionCreateSchema>;
      const version = await prisma.$transaction(async (tx) => {
        const created = await tx.programVersion.create({
          data: {
            programId: program.id,
            label: input.label,
            effectiveFrom: input.effectiveFrom ?? null,
            approvalRef: input.approvalRef ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_version.create', 'ProgramVersion', created.id, {
          programId: program.id, label: input.label,
        });
        return created;
      });
      res.status(201).json({ data: version });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('تسمية الإصدار مستخدمة مسبقًا لهذا البرنامج'));
      }
      next(e);
    }
  },
);

/** Resolve a program version through its program's institution. */
async function requireVersion(institutionId: string, versionId: string) {
  const version = await prisma.programVersion.findUnique({
    where: { id: versionId },
    select: { id: true, programId: true, status: true, program: { select: { institutionId: true } } },
  });
  if (!version || version.program.institutionId !== institutionId) {
    throw AppError.notFound('إصدار البرنامج المطلوب غير موجود');
  }
  return version;
}

router.patch(
  '/program-versions/:id',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programVersionUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const version = await requireVersion(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof programVersionUpdateSchema>;
      if (input.status && input.status !== version.status) {
        if (!transitionAllowed(PROGRAM_VERSION_TRANSITIONS, version.status as 'DRAFT', input.status)) {
          throw new AppError('PROGRAM_VERSION_INVALID_TRANSITION', 'انتقال حالة إصدار البرنامج غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        // §6.4 — the single-ACTIVE check runs INSIDE the transaction;
        // the partial unique index (ProgramVersion_one_active_per_program_key)
        // is the concurrency invariant of record for racing activations.
        if (input.status === 'ACTIVE' && version.status !== 'ACTIVE') {
          const active = await tx.programVersion.findFirst({
            where: { programId: version.programId, status: 'ACTIVE', id: { not: version.id } },
            select: { id: true },
          });
          if (active) {
            throw new AppError('PROGRAM_VERSION_ACTIVE_EXISTS', 'يوجد إصدار نشط آخر للبرنامج — أحله إلى المتقاعد أولًا', 409);
          }
        }
        const row = await tx.programVersion.update({
          where: { id: version.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'APPROVED' ? { approvedAt: new Date() } : {}),
            ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
            ...(input.approvalRef !== undefined ? { approvalRef: input.approvalRef } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_version.update', 'ProgramVersion', version.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        typeof e.message === 'string' &&
        e.message.includes('ProgramVersion_one_active_per_program_key')
      ) {
        return next(
          new AppError('PROGRAM_VERSION_ACTIVE_EXISTS', 'يوجد إصدار نشط آخر للبرنامج — أحله إلى المتقاعد أولًا', 409),
        );
      }
      next(e);
    }
  },
);

router.get('/program-versions/:id/courses', async (req, res, next) => {
  try {
    const version = await requireVersion(req.institution!.id, req.params.id!);
    const data = await prisma.programCourse.findMany({
      where: { programVersionId: version.id },
      include: { course: { select: { id: true, code: true, name: true, nameEn: true, credits: true } } },
      orderBy: [{ termNo: 'asc' }, { kind: 'asc' }],
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/program-versions/:id/courses',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programCourseCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const version = await requireVersion(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof programCourseCreateSchema>;
      const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, institutionId: true },
      });
      if (!course || course.institutionId !== institutionId) {
        throw new AppError(
          'PROGRAM_COURSE_WRONG_INSTITUTION',
          'المقرر المحدد لا ينتمي إلى مؤسستك',
          400,
        );
      }
      const link = await prisma.$transaction(async (tx) => {
        const created = await tx.programCourse.create({
          data: {
            programVersionId: version.id,
            courseId: course.id,
            termNo: input.termNo ?? null,
            kind: input.kind ?? 'CORE',
            creditHours: input.creditHours ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_course.create', 'ProgramCourse', created.id, {
          versionId: version.id, courseId: course.id,
        });
        return created;
      });
      res.status(201).json({ data: link });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('المقرر مضاف مسبقًا إلى هذا الإصدار'));
      }
      next(e);
    }
  },
);

router.delete('/program-versions/:id/courses/:courseId', requireCapability('PROGRAMS_MANAGE'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const version = await requireVersion(institutionId, req.params.id!);
    const deleted = await prisma.$transaction(async (tx) => {
      const row = await tx.programCourse.findUnique({
        where: { programVersionId_courseId: { programVersionId: version.id, courseId: req.params.courseId! } },
        select: { id: true },
      });
      if (!row) throw AppError.notFound('المقرر غير مضاف إلى هذا الإصدار');
      await tx.programCourse.delete({ where: { id: row.id } });
      await audit(tx, req.user!.id, institutionId, 'program_course.delete', 'ProgramCourse', row.id, {
        versionId: version.id, courseId: req.params.courseId!,
      });
      return row;
    });
    res.json({ data: { ok: true, id: deleted.id } });
  } catch (e) {
    next(e);
  }
});

// ── learners (r352 hardening §5 — the generalized learner) ─────────
router.get('/learners', validate(learnerListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, category, status, orgUnitId } = req.query as unknown as z.infer<typeof learnerListSchema>;
    const where: Prisma.LearnerProfileWhereInput = {
      institutionId: req.institution!.id,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(orgUnitId ? { orgUnitId } : {}),
      ...(q
        ? {
            OR: [
              { fullNameAr: { contains: q } },
              { fullNameEn: { contains: q } },
              { learnerNumber: { contains: q } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.learnerProfile.count({ where }),
      prisma.learnerProfile.findMany({
        where,
        include: {
          orgUnit: { select: { id: true, nameAr: true, type: true } },
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
});

router.post(
  '/learners',
  requireCapability('PEOPLE_MANAGE'),
  validate(learnerCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof learnerCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      if (input.userId) {
        const linked = await prisma.learnerProfile.findUnique({
          where: { institutionId_userId: { institutionId, userId: input.userId } },
          select: { id: true },
        });
        if (linked) {
          throw new AppError('LEARNER_NUMBER_TAKEN', 'هذا الحساب مرتبط بمتعلم آخر في مؤسستك', 409);
        }
      }
      const learner = await prisma.$transaction(async (tx) => {
        const created = await tx.learnerProfile.create({
          data: {
            institutionId,
            category: input.category,
            learnerNumber: input.learnerNumber,
            fullNameAr: input.fullNameAr,
            fullNameEn: input.fullNameEn ?? null,
            gender: input.gender ?? null,
            birthDate: input.birthDate ?? null,
            nationality: input.nationality ?? null,
            nationalId: input.nationalId ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            address: input.address ?? null,
            orgUnitId: input.orgUnitId ?? null,
            userId: input.userId ?? null,
            notes: input.notes ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'learner.create', 'LearnerProfile', created.id, {
          category: input.category, learnerNumber: input.learnerNumber,
        });
        return created;
      });
      res.status(201).json({ data: learner });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رقم التسجيل مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.get('/learners/:id', async (req, res, next) => {
  try {
    const learner = await prisma.learnerProfile.findUnique({
      where: { id: req.params.id! },
      include: {
        orgUnit: { select: { id: true, nameAr: true, type: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { programEnrollments: true, trainingPlacements: true, awardedCredentials: true } },
      },
    });
    if (!learner || learner.institutionId !== req.institution!.id) {
      throw AppError.notFound('ملف المتعلم المطلوب غير موجود');
    }
    const { _count, ...row } = learner;
    res.json({
      data: {
        ...row,
        programEnrollmentCount: _count.programEnrollments,
        trainingPlacementCount: _count.trainingPlacements,
        awardedCredentialCount: _count.awardedCredentials,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/learners/:id',
  requireCapability('PEOPLE_MANAGE'),
  validate(learnerUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const learner = await prisma.learnerProfile.findUnique({
        where: { id: req.params.id! },
        select: { id: true, institutionId: true, status: true },
      });
      if (!learner || learner.institutionId !== institutionId) {
        throw AppError.notFound('ملف المتعلم المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof learnerUpdateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      if (input.userId) {
        const linked = await prisma.learnerProfile.findUnique({
          where: { institutionId_userId: { institutionId, userId: input.userId } },
          select: { id: true },
        });
        if (linked && linked.id !== learner.id) {
          throw new AppError('LEARNER_NUMBER_TAKEN', 'هذا الحساب مرتبط بمتعلم آخر في مؤسستك', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.learnerProfile.update({
          where: { id: learner.id },
          data: {
            ...(input.fullNameAr !== undefined ? { fullNameAr: input.fullNameAr } : {}),
            ...(input.fullNameEn !== undefined ? { fullNameEn: input.fullNameEn } : {}),
            ...(input.gender !== undefined ? { gender: input.gender } : {}),
            ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
            ...(input.nationality !== undefined ? { nationality: input.nationality } : {}),
            ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
            ...(input.email !== undefined ? { email: input.email } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.orgUnitId !== undefined ? { orgUnitId: input.orgUnitId } : {}),
            ...(input.userId !== undefined ? { userId: input.userId } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'learner.update', 'LearnerProfile', learner.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Resolve the canonical learner for a create request that accepts
 * EITHER learnerProfileId (new path) OR studentProfileId (legacy
 * bridge). The bridge auto-creates the LearnerProfile for legacy
 * student profiles that predate the hardening (defensive — the
 * migration backfills them, so this is a belt, not the norm).
 */
async function resolveLearnerForCreate(
  tx: Prisma.TransactionClient,
  institutionId: string,
  input: { learnerProfileId?: string; studentProfileId?: string },
): Promise<{ id: string; category: 'STUDENT' | 'TRAINEE' }> {
  if (input.learnerProfileId) {
    const learner = await tx.learnerProfile.findUnique({
      where: { id: input.learnerProfileId },
      select: { id: true, institutionId: true, category: true, status: true },
    });
    if (!learner || learner.institutionId !== institutionId) {
      throw new AppError('ENROLLMENT_PROFILE_WRONG_INSTITUTION', 'ملف المتعلم المحدد لا ينتمي إلى مؤسستك', 400);
    }
    if (learner.status !== 'ACTIVE') {
      throw new AppError('ENROLLMENT_PROFILE_WRONG_INSTITUTION', 'ملف المتعلم غير نشط في مؤسستك', 400);
    }
    return { id: learner.id, category: learner.category };
  }
  // Legacy bridge: StudentProfile → its linked LearnerProfile.
  const profile = await tx.studentProfile.findUnique({
    where: { id: input.studentProfileId! },
    select: {
      id: true,
      institutionId: true,
      learnerCategory: true,
      learnerProfileId: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!profile || profile.institutionId !== institutionId) {
    throw new AppError('ENROLLMENT_PROFILE_WRONG_INSTITUTION', 'الملف الطالب المحدد لا ينتمي إلى مؤسستك', 400);
  }
  if (profile.learnerProfileId) return { id: profile.learnerProfileId, category: profile.learnerCategory };
  const created = await tx.learnerProfile.create({
    data: {
      institutionId,
      userId: null,
      category: profile.learnerCategory,
      // Deterministic bridge number derived from the legacy universityId.
      learnerNumber: profile.user ? `SP-${profile.id.slice(-16)}` : `SP-${profile.id.slice(-16)}`,
      fullNameAr: profile.user ? `${profile.user.firstName} ${profile.user.lastName}` : `متعلم ${profile.id.slice(6)}`,
      email: profile.user?.email ?? null,
      notes: 'جسر تلقائي عند التسجيل عبر ملف الطالب القديم (r352 hardening §5)',
    },
  });
  await tx.studentProfile.update({
    where: { id: profile.id },
    data: { learnerProfileId: created.id },
  });
  return { id: created.id, category: created.category };
}

// ── program enrollments ────────────────────────────────────────────
router.get('/program-enrollments', validate(programEnrollmentListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, programId, learnerProfileId, studentProfileId, status } = req.query as unknown as z.infer<typeof programEnrollmentListSchema>;
    const where: Prisma.ProgramEnrollmentWhereInput = {
      program: { institutionId: req.institution!.id },
      ...(programId ? { programId } : {}),
      ...(learnerProfileId ? { learnerProfileId } : {}),
      ...(studentProfileId ? { studentProfileId } : {}),
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.programEnrollment.count({ where }),
      prisma.programEnrollment.findMany({
        where,
        include: {
          program: { select: { id: true, code: true, nameAr: true, kind: true } },
          programVersion: { select: { id: true, label: true, status: true } },
          learnerProfile: { select: { id: true, learnerNumber: true, fullNameAr: true, category: true } },
          studentProfile: { select: { id: true, universityId: true, learnerCategory: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { entryDate: 'desc' },
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
  '/program-enrollments',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programEnrollmentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof programEnrollmentCreateSchema>;
      const program = await requireProgram(institutionId, input.programId);
      if (program.status !== 'ACTIVE' && program.status !== 'APPROVED') {
        throw new AppError('PROGRAM_ENROLLMENT_INVALID_TRANSITION', 'التسجيل يتطلب برنامجًا معتمدًا أو نشطًا', 409);
      }
      if (input.programVersionId) {
        const version = await prisma.programVersion.findUnique({
          where: { id: input.programVersionId },
          select: { id: true, programId: true },
        });
        if (!version || version.programId !== program.id) {
          throw AppError.badRequest('الإصدار المحدد لا ينتمي إلى البرنامج المحدد');
        }
      }
      const enrollment = await prisma.$transaction(async (tx) => {
        const learner = await resolveLearnerForCreate(tx, institutionId, input);

        // §5 — legal learner/program compatibility (طالب ≠ متدرب).
        if (!learnerCategoryCompatible(learner.category, program.kind)) {
          throw new AppError(
            'LEARNER_ENROLLMENT_CATEGORY_MISMATCH',
            'فئة المتعلم (طالب/متدرب) غير متوافقة مع نوع البرنامج',
            400,
          );
        }

        // §12 — statutory admission prerequisites: when the program
        // awards a credential AND the learner already holds credentials,
        // at least one held credential must carry an ACTIVE progression
        // rule to this program's credential type (destination filters
        // honored). First-time learners have no prior credential to
        // progress from — allowed by definition.
        if (program.credentialTypeId) {
          const held = await tx.awardedCredential.findMany({
            where: {
              learnerProfileId: learner.id,
              status: { in: ['AWARDED'] },
            },
            select: { credentialTypeId: true },
          });
          if (held.length > 0) {
            const rules = await tx.credentialProgressionRule.findMany({
              where: { fromCredentialTypeId: { in: held.map((h) => h.credentialTypeId) } },
              select: {
                toCredentialTypeId: true,
                toInstitutionTypeCodes: true,
                toProgramKinds: true,
                isActive: true,
              },
            });
            const institutionTypeCode = program.institution?.kind?.code ?? null;
            const allowed = held.some((h) =>
              progressionAllowed(
                rules,
                h.credentialTypeId,
                program.credentialTypeId!,
                institutionTypeCode,
                program.kind,
              ),
            );
            if (!allowed) {
              throw new AppError(
                'PROGRESSION_NOT_ALLOWED',
                'مؤهلات المتعلم الحالية لا تسمح بالتسجيل في هذا البرنامج وفق مسارات الترقّي المقررة',
                409,
              );
            }
          }
        }

        const created = await tx.programEnrollment.create({
          data: {
            learnerProfileId: learner.id,
            studentProfileId: input.studentProfileId ?? null,
            programId: program.id,
            programVersionId: input.programVersionId ?? null,
            expectedCompletionAt: input.expectedCompletionAt ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_enrollment.create', 'ProgramEnrollment', created.id, {
          programId: program.id, learnerProfileId: learner.id,
        });
        return created;
      });
      res.status(201).json({ data: enrollment });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('المتعلم مسجل مسبقًا في هذا البرنامج'));
      }
      next(e);
    }
  },
);

router.post(
  '/program-enrollments/:id/status',
  requireCapability('PROGRAMS_MANAGE'),
  validate(programEnrollmentStatusSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const enrollment = await prisma.programEnrollment.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, program: { select: { institutionId: true } } },
      });
      if (!enrollment || enrollment.program.institutionId !== institutionId) {
        throw AppError.notFound('تسجيل البرنامج المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof programEnrollmentStatusSchema>;
      if (input.status !== enrollment.status) {
        if (!transitionAllowed(PROGRAM_ENROLLMENT_TRANSITIONS, enrollment.status as 'ACTIVE', input.status)) {
          throw new AppError('PROGRAM_ENROLLMENT_INVALID_TRANSITION', 'انتقال حالة تسجيل البرنامج غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: input.status,
            ...(input.completionAt !== undefined ? { completionAt: input.completionAt } : {}),
            ...(input.gpa !== undefined ? { gpa: input.gpa } : {}),
            ...(input.status === 'COMPLETED' || input.status === 'GRADUATED' ? { completionAt: input.completionAt ?? new Date() } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_enrollment.status', 'ProgramEnrollment', enrollment.id, { status: input.status });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── training placements ────────────────────────────────────────────
router.get('/training-placements', validate(placementListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, learnerProfileId, studentProfileId } = req.query as unknown as z.infer<typeof placementListSchema>;
    const where: Prisma.TrainingPlacementWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(learnerProfileId ? { learnerProfileId } : {}),
      ...(studentProfileId ? { studentProfileId } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.trainingPlacement.count({ where }),
      prisma.trainingPlacement.findMany({
        where,
        include: {
          learnerProfile: { select: { id: true, learnerNumber: true, fullNameAr: true, category: true } },
          programEnrollment: { select: { id: true, programId: true, status: true } },
          hostOrgUnit: { select: { id: true, nameAr: true, type: true } },
          supervisorPerson: { select: { id: true, fullNameAr: true } },
        },
        orderBy: { startsAt: 'desc' },
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
  '/training-placements',
  requireCapability('PROGRAMS_MANAGE'),
  validate(placementCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof placementCreateSchema>;
      if (input.hostOrgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.hostOrgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة المستضيفة غير موجودة في مؤسستك');
        }
      }
      if (input.supervisorPersonId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.supervisorPersonId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('المشرف المحدد غير موجود في مؤسستك');
        }
      }
      if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
        throw new AppError('RESERVATION_WINDOW_INVALID', 'تاريخ نهاية التدريب يسبق تاريخ بدئه', 400);
      }
      const placement = await prisma.$transaction(async (tx) => {
        const learner = await resolveLearnerForCreate(tx, institutionId, input);

        // §4.3 — a placement cannot reference another learner's
        // enrollment; the enrollment must belong to the same
        // institution AND the same learner.
        let enrollmentProgramId: string | null = null;
        if (input.programEnrollmentId) {
          const enrollment = await tx.programEnrollment.findUnique({
            where: { id: input.programEnrollmentId },
            select: {
              id: true,
              learnerProfileId: true,
              programId: true,
              status: true,
              program: { select: { institutionId: true, kind: true } },
            },
          });
          if (!enrollment || enrollment.program.institutionId !== institutionId) {
            throw AppError.notFound('تسجيل البرنامج المحدد غير موجود');
          }
          if (enrollment.learnerProfileId !== learner.id) {
            throw new AppError(
              'PLACEMENT_ENROLLMENT_MISMATCH',
              'تسجيل البرنامج المحدد لا يعود لهذا المتعلم',
              400,
            );
          }
          if (enrollment.status === 'WITHDRAWN' || enrollment.status === 'SUSPENDED') {
            throw new AppError(
              'PLACEMENT_ENROLLMENT_MISMATCH',
              'تسجيل البرنامج غير نشط — لا يمكن إنشاء تدريب عليه',
              409,
            );
          }
          // §4.3 — learner and enrollment categories compatible.
          if (!learnerCategoryCompatible(learner.category, enrollment.program.kind)) {
            throw new AppError(
              'LEARNER_ENROLLMENT_CATEGORY_MISMATCH',
              'فئة المتعلم (طالب/متدرب) غير متوافقة مع نوع برنامج التسجيل',
              400,
            );
          }
          enrollmentProgramId = enrollment.programId;
        }

        const created = await tx.trainingPlacement.create({
          data: {
            institutionId,
            learnerProfileId: learner.id,
            studentProfileId: input.studentProfileId ?? null,
            programEnrollmentId: input.programEnrollmentId ?? null,
            hostOrgUnitId: input.hostOrgUnitId ?? null,
            externalHost: input.externalHost ?? null,
            supervisorPersonId: input.supervisorPersonId ?? null,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'placement.create', 'TrainingPlacement', created.id, {
          learnerProfileId: learner.id,
          enrollmentProgramId,
        });
        return created;
      });
      res.status(201).json({ data: placement });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/training-placements/:id',
  requireCapability('PROGRAMS_MANAGE'),
  validate(placementUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const placement = await prisma.trainingPlacement.findUnique({
        where: { id: req.params.id! },
        select: { id: true, institutionId: true, startsAt: true },
      });
      if (!placement || placement.institutionId !== institutionId) {
        throw AppError.notFound('التدريب المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof placementUpdateSchema>;
      if (
        input.endsAt !== undefined &&
        input.endsAt !== null &&
        input.endsAt < placement.startsAt
      ) {
        throw new AppError('RESERVATION_WINDOW_INVALID', 'تاريخ نهاية التدريب يسبق تاريخ بدئه', 400);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.trainingPlacement.update({
          where: { id: placement.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
            ...(input.evaluationSummary !== undefined ? { evaluationSummary: input.evaluationSummary } : {}),
            ...(input.evaluationScore !== undefined ? { evaluationScore: input.evaluationScore } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'placement.update', 'TrainingPlacement', placement.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── credentials ────────────────────────────────────────────────────
router.get('/credentials', validate(credentialListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, learnerProfileId, studentProfileId, credentialTypeId, status } = req.query as unknown as z.infer<typeof credentialListSchema>;
    const where: Prisma.AwardedCredentialWhereInput = {
      institutionId: req.institution!.id,
      ...(learnerProfileId ? { learnerProfileId } : {}),
      ...(studentProfileId ? { studentProfileId } : {}),
      ...(credentialTypeId ? { credentialTypeId } : {}),
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.awardedCredential.count({ where }),
      prisma.awardedCredential.findMany({
        where,
        include: {
          credentialType: { select: { id: true, code: true, nameAr: true, level: true, grantsProgression: true } },
          program: { select: { id: true, code: true, nameAr: true } },
          learnerProfile: { select: { id: true, learnerNumber: true, fullNameAr: true, category: true } },
          studentProfile: { select: { id: true, universityId: true, learnerCategory: true, user: { select: { firstName: true, lastName: true } } } },
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
  '/credentials/award',
  requireCapability('CREDENTIALS_MANAGE'),
  validate(credentialAwardSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof credentialAwardSchema>;
      const credentialType = await prisma.credentialType.findUnique({
        where: { code: input.credentialTypeCode },
        select: { id: true },
      });
      if (!credentialType) throw AppError.notFound('نوع المؤهل المحدد غير موجود في الكتالوج');
      let program: { id: string; credentialTypeId: string | null; institutionId: string } | null = null;
      if (input.programId) {
        program = await prisma.program.findUnique({
          where: { id: input.programId },
          select: { id: true, credentialTypeId: true, institutionId: true },
        });
        if (!program || program.institutionId !== institutionId) {
          throw AppError.notFound('البرنامج المحدد غير موجود في مؤسستك');
        }
        // §4.4 — valid credential-to-program relationship: when the
        // program declares the credential it awards, the awarded type
        // must be exactly it.
        if (program.credentialTypeId && program.credentialTypeId !== credentialType.id) {
          throw new AppError(
            'CREDENTIAL_ENROLLMENT_MISMATCH',
            'نوع المؤهل لا يطابق المؤهل المقرر لهذا البرنامج',
            400,
          );
        }
      }
      const credential = await prisma.$transaction(async (tx) => {
        const learner = await resolveLearnerForCreate(tx, institutionId, input);

        // §4.4 — the enrollment must belong to the SAME learner and the
        // SAME program (when supplied), and must have reached a
        // completion/graduation state before a credential may be awarded.
        if (input.programEnrollmentId) {
          const enrollment = await tx.programEnrollment.findUnique({
            where: { id: input.programEnrollmentId },
            select: {
              id: true, learnerProfileId: true, programId: true, status: true,
              program: { select: { institutionId: true } },
            },
          });
          if (!enrollment || enrollment.program.institutionId !== institutionId) {
            throw AppError.notFound('تسجيل البرنامج المحدد غير موجود');
          }
          if (enrollment.learnerProfileId !== learner.id) {
            throw new AppError('CREDENTIAL_ENROLLMENT_MISMATCH', 'تسجيل البرنامج المحدد لا يعود لهذا المتعلم', 400);
          }
          if (input.programId && enrollment.programId !== input.programId) {
            throw new AppError('CREDENTIAL_ENROLLMENT_MISMATCH', 'تسجيل البرنامج المحدد لا يعود لهذا البرنامج', 400);
          }
          if (!program) {
            program = await tx.program.findUnique({
              where: { id: enrollment.programId },
              select: { id: true, credentialTypeId: true, institutionId: true },
            });
          }
          if (enrollment.status !== 'COMPLETED' && enrollment.status !== 'GRADUATED') {
            throw new AppError(
              'CREDENTIAL_ENROLLMENT_MISMATCH',
              'لا يُمنح المؤهل إلا بعد إتمام البرنامج أو تخرّج المتعلم',
              409,
            );
          }
        }

        // §4.4 — serial uniqueness inside the transaction (the DB
        // unique index is the concurrency belt).
        if (input.serialNumber) {
          const serialClash = await tx.awardedCredential.findFirst({
            where: { institutionId, serialNumber: input.serialNumber },
            select: { id: true },
          });
          if (serialClash) {
            throw new AppError('CREDENTIAL_SERIAL_TAKEN', 'الرقم التسلسلي مستخدم مسبقًا في مؤسستك', 409);
          }
        }

        const created = await tx.awardedCredential.create({
          data: {
            institutionId,
            learnerProfileId: learner.id,
            studentProfileId: input.studentProfileId ?? null,
            credentialTypeId: credentialType.id,
            programId: input.programId ?? null,
            programEnrollmentId: input.programEnrollmentId ?? null,
            decisionNumber: input.decisionNumber ?? null,
            decisionDate: input.decisionDate ?? null,
            conferredAt: input.conferredAt ?? new Date(),
            serialNumber: input.serialNumber ?? null,
            notes: input.notes ?? null,
            createdById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'credential.award', 'AwardedCredential', created.id, {
          credentialTypeCode: input.credentialTypeCode, learnerProfileId: learner.id,
        });
        return created;
      });
      res.status(201).json({ data: credential });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('الرقم التسلسلي مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.post(
  '/credentials/:id/revoke',
  requireCapability('CREDENTIALS_MANAGE'),
  validate(credentialRevokeSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const credential = await prisma.awardedCredential.findUnique({
        where: { id: req.params.id! },
        select: { id: true, institutionId: true, status: true },
      });
      if (!credential || credential.institutionId !== institutionId) {
        throw AppError.notFound('المؤهل المطلوب غير موجود');
      }
      if (credential.status === 'REVOKED') throw AppError.conflict('المؤهل ملغى مسبقًا');
      const input = req.body as z.infer<typeof credentialRevokeSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.awardedCredential.update({
          where: { id: credential.id },
          data: { status: 'REVOKED', ...(input.notes ? { notes: input.notes } : {}) },
        });
        await audit(tx, req.user!.id, institutionId, 'credential.revoke', 'AwardedCredential', credential.id, {
          notes: input.notes ?? null,
        });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
