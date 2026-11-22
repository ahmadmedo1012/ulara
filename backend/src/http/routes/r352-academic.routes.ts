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
    select: { id: true, institutionId: true, status: true },
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
        if (input.status === 'ACTIVE') {
          const active = await prisma.programVersion.findFirst({
            where: { programId: version.programId, status: 'ACTIVE', id: { not: version.id } },
            select: { id: true },
          });
          if (active) {
            throw new AppError('PROGRAM_VERSION_ACTIVE_EXISTS', 'يوجد إصدار نشط آخر للبرنامج — أحله إلى المتقاعد أولًا', 409);
          }
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
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

// ── program enrollments ────────────────────────────────────────────
router.get('/program-enrollments', validate(programEnrollmentListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, programId, studentProfileId, status } = req.query as unknown as z.infer<typeof programEnrollmentListSchema>;
    const where: Prisma.ProgramEnrollmentWhereInput = {
      program: { institutionId: req.institution!.id },
      ...(programId ? { programId } : {}),
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
      const profile = await prisma.studentProfile.findUnique({
        where: { id: input.studentProfileId },
        select: { id: true, institutionId: true },
      });
      if (!profile || profile.institutionId !== institutionId) {
        throw new AppError(
          'ENROLLMENT_PROFILE_WRONG_INSTITUTION',
          'الملف الطالب المحدد لا ينتمي إلى مؤسستك',
          400,
        );
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
        const created = await tx.programEnrollment.create({
          data: {
            studentProfileId: profile.id,
            programId: program.id,
            programVersionId: input.programVersionId ?? null,
            expectedCompletionAt: input.expectedCompletionAt ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'program_enrollment.create', 'ProgramEnrollment', created.id, {
          programId: program.id, studentProfileId: profile.id,
        });
        return created;
      });
      res.status(201).json({ data: enrollment });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('الطالب مسجل مسبقًا في هذا البرنامج'));
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
    const { page, limit, status, studentProfileId } = req.query as unknown as z.infer<typeof placementListSchema>;
    const where: Prisma.TrainingPlacementWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(studentProfileId ? { studentProfileId } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.trainingPlacement.count({ where }),
      prisma.trainingPlacement.findMany({
        where,
        include: {
          studentProfile: { select: { id: true, universityId: true, user: { select: { firstName: true, lastName: true } } } },
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
      const profile = await prisma.studentProfile.findUnique({
        where: { id: input.studentProfileId },
        select: { id: true, institutionId: true },
      });
      if (!profile || profile.institutionId !== institutionId) {
        throw new AppError('ENROLLMENT_PROFILE_WRONG_INSTITUTION', 'الملف الطالب المحدد لا ينتمي إلى مؤسستك', 400);
      }
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
      const placement = await prisma.$transaction(async (tx) => {
        const created = await tx.trainingPlacement.create({
          data: {
            institutionId,
            studentProfileId: profile.id,
            programEnrollmentId: input.programEnrollmentId ?? null,
            hostOrgUnitId: input.hostOrgUnitId ?? null,
            externalHost: input.externalHost ?? null,
            supervisorPersonId: input.supervisorPersonId ?? null,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'placement.create', 'TrainingPlacement', created.id, {
          studentProfileId: profile.id,
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
        select: { id: true, institutionId: true },
      });
      if (!placement || placement.institutionId !== institutionId) {
        throw AppError.notFound('التدريب المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof placementUpdateSchema>;
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
    const { page, limit, studentProfileId, credentialTypeId, status } = req.query as unknown as z.infer<typeof credentialListSchema>;
    const where: Prisma.AwardedCredentialWhereInput = {
      institutionId: req.institution!.id,
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
          studentProfile: { select: { id: true, universityId: true, user: { select: { firstName: true, lastName: true } } } },
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
      const profile = await prisma.studentProfile.findUnique({
        where: { id: input.studentProfileId },
        select: { id: true, institutionId: true },
      });
      if (!profile || profile.institutionId !== institutionId) {
        throw new AppError('ENROLLMENT_PROFILE_WRONG_INSTITUTION', 'الملف الطالب المحدد لا ينتمي إلى مؤسستك', 400);
      }
      const credentialType = await prisma.credentialType.findUnique({
        where: { code: input.credentialTypeCode },
        select: { id: true },
      });
      if (!credentialType) throw AppError.notFound('نوع المؤهل المحدد غير موجود في الكتالوج');
      if (input.programId) await requireProgram(institutionId, input.programId);
      if (input.serialNumber) {
        const serialClash = await prisma.awardedCredential.findFirst({
          where: { institutionId, serialNumber: input.serialNumber },
          select: { id: true },
        });
        if (serialClash) {
          throw new AppError('CREDENTIAL_SERIAL_TAKEN', 'الرقم التسلسلي مستخدم مسبقًا في مؤسستك', 409);
        }
      }
      if (input.programEnrollmentId) {
        const enrollment = await prisma.programEnrollment.findUnique({
          where: { id: input.programEnrollmentId },
          select: { id: true, program: { select: { institutionId: true } } },
        });
        if (!enrollment || enrollment.program.institutionId !== institutionId) {
          throw AppError.notFound('تسجيل البرنامج المحدد غير موجود');
        }
      }
      const credential = await prisma.$transaction(async (tx) => {
        const created = await tx.awardedCredential.create({
          data: {
            institutionId,
            studentProfileId: profile.id,
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
          credentialTypeCode: input.credentialTypeCode, studentProfileId: profile.id,
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
