/**
 * r352 — councils & committees (reusable governance domain).
 *
 * Mounted at '/api/v1/governance' (see app.ts):
 *   councils CRUD + memberships + meetings + attendance + agenda +
 *   resolutions + minutes (draft → approve → sign) + documents.
 * Writes need COUNCILS_MANAGE; reads need the institution context.
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
import { MINUTES_TRANSITIONS, RESOLUTION_TRANSITIONS, transitionAllowed } from '../../lib/lifecycle-rules.js';
import {
  councilListSchema, councilCreateSchema, councilUpdateSchema,
  councilMembershipCreateSchema, councilMembershipEndSchema,
  meetingCreateSchema, meetingUpdateSchema, attendanceBulkSchema,
  agendaItemCreateSchema, agendaItemUpdateSchema,
  resolutionCreateSchema, resolutionUpdateSchema,
  minutesUpsertSchema, minutesApproveSchema, minutesSignSchema,
  councilDocumentCreateSchema,
} from '../../modules/r352/dto.js';

const router = Router();

router.use(authMiddleware, requireInstitution);

// ── helpers ────────────────────────────────────────────────────────
async function requireCouncil(institutionId: string, councilId: string) {
  const council = await prisma.council.findUnique({
    where: { id: councilId },
    select: { id: true, institutionId: true, status: true },
  });
  if (!council || council.institutionId !== institutionId) {
    throw AppError.notFound('المجلس المطلوب غير موجود');
  }
  return council;
}

async function requireMeeting(institutionId: string, meetingId: string) {
  const meeting = await prisma.councilMeeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true, councilId: true, status: true, scheduledAt: true,
      council: { select: { id: true, institutionId: true } },
    },
  });
  if (!meeting || meeting.council.institutionId !== institutionId) {
    throw AppError.notFound('الاجتماع المطلوب غير موجود');
  }
  return meeting;
}

async function requirePersonInInstitution(institutionId: string, personId: string) {
  const person = await prisma.institutionalPerson.findUnique({
    where: { id: personId },
    select: { id: true, institutionId: true },
  });
  if (!person || person.institutionId !== institutionId) {
    throw AppError.notFound('السجل الشخصي المحدد غير موجود في مؤسستك');
  }
  return person;
}

async function audit(
  tx: Prisma.TransactionClient,
  userId: string, institutionId: string, action: string,
  resourceType: string, resourceId: string, metadata: unknown,
) {
  await tx.auditLog.create({
    data: { userId, institutionId, action, resourceType, resourceId, metadata: metadata as object },
  });
}

// ── councils ───────────────────────────────────────────────────────
router.get('/councils', validate(councilListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, type, status } = req.query as unknown as z.infer<typeof councilListSchema>;
    const where: Prisma.CouncilWhereInput = {
      institutionId: req.institution!.id,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ nameAr: { contains: q } }, { nameEn: { contains: q } }] } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.council.count({ where }),
      prisma.council.findMany({
        where,
        include: { _count: { select: { memberships: true, meetings: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...council }) => ({
        ...council,
        membershipCount: _count.memberships,
        meetingCount: _count.meetings,
      })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/councils',
  requireCapability('COUNCILS_MANAGE'),
  validate(councilCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof councilCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      const council = await prisma.$transaction(async (tx) => {
        const created = await tx.council.create({
          data: {
            institutionId,
            nameAr: input.nameAr,
            nameEn: input.nameEn ?? null,
            type: input.type,
            orgUnitId: input.orgUnitId ?? null,
            code: input.code ?? null,
            legalBasis: input.legalBasis ?? null,
            charterRef: input.charterRef ?? null,
            establishedAt: input.establishedAt ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'council.create', 'Council', created.id, {
          nameAr: created.nameAr, type: created.type,
        });
        return created;
      });
      res.status(201).json({ data: council });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المجلس مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.get('/councils/:id', async (req, res, next) => {
  try {
    const council = await requireCouncil(req.institution!.id, req.params.id!);
    const detail = await prisma.council.findUnique({
      where: { id: council.id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { person: { select: { id: true, fullNameAr: true, category: true } } },
          orderBy: [{ role: 'asc' }, { startDate: 'asc' }],
        },
        orgUnit: { select: { id: true, nameAr: true, type: true } },
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/councils/:id',
  requireCapability('COUNCILS_MANAGE'),
  validate(councilUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof councilUpdateSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.council.update({
          where: { id: council.id },
          data: {
            ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.legalBasis !== undefined ? { legalBasis: input.legalBasis } : {}),
            ...(input.charterRef !== undefined ? { charterRef: input.charterRef } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'ENDED' ? { dissolvedAt: new Date() } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'council.update', 'Council', council.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── memberships ────────────────────────────────────────────────────
router.post(
  '/councils/:id/members',
  requireCapability('COUNCILS_MANAGE'),
  validate(councilMembershipCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof councilMembershipCreateSchema>;
      await requirePersonInInstitution(institutionId, input.personId);
      const active = await prisma.councilMembership.findFirst({
        where: { councilId: council.id, personId: input.personId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (active) {
        throw new AppError(
          'COUNCIL_MEMBERSHIP_ACTIVE_EXISTS',
          'هذا الشخص عضو نشط في المجلس مسبقًا — أنهِ عضويته الحالية أولًا',
          409,
        );
      }
      const membership = await prisma.$transaction(async (tx) => {
        const created = await tx.councilMembership.create({
          data: {
            councilId: council.id,
            personId: input.personId,
            role: input.role,
            startDate: input.startDate,
            endDate: input.endDate ?? null,
            decisionRef: input.decisionRef ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'council.membership.create', 'CouncilMembership', created.id, {
          councilId: council.id, personId: input.personId, role: input.role,
        });
        return created;
      });
      res.status(201).json({ data: membership });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/council-memberships/:id/end',
  requireCapability('COUNCILS_MANAGE'),
  validate(councilMembershipEndSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const membership = await prisma.councilMembership.findUnique({
        where: { id: req.params.id! },
        select: { id: true, councilId: true, council: { select: { institutionId: true } } },
      });
      if (!membership || membership.council.institutionId !== institutionId) {
        throw AppError.notFound('العضوية المطلوبة غير موجودة');
      }
      const input = req.body as z.infer<typeof councilMembershipEndSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.councilMembership.update({
          where: { id: membership.id },
          data: { status: 'ENDED', endDate: input.endDate },
        });
        await audit(tx, req.user!.id, institutionId, 'council.membership.end', 'CouncilMembership', membership.id, {
          reason: input.reason ?? null,
        });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── meetings ───────────────────────────────────────────────────────
router.get('/councils/:id/meetings', async (req, res, next) => {
  try {
    const council = await requireCouncil(req.institution!.id, req.params.id!);
    const data = await prisma.councilMeeting.findMany({
      where: { councilId: council.id },
      orderBy: { scheduledAt: 'desc' },
      take: 200,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/councils/:id/meetings',
  requireCapability('COUNCILS_MANAGE'),
  validate(meetingCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof meetingCreateSchema>;
      if (input.seqNumber) {
        const clash = await prisma.councilMeeting.findUnique({
          where: { councilId_seqNumber: { councilId: council.id, seqNumber: input.seqNumber } },
          select: { id: true },
        });
        if (clash) throw new AppError('MEETING_SEQ_TAKEN', 'رقم الاجتماع مستخدم مسبقًا لهذا المجلس', 409);
      }
      const meeting = await prisma.$transaction(async (tx) => {
        const created = await tx.councilMeeting.create({
          data: {
            councilId: council.id,
            scheduledAt: input.scheduledAt,
            location: input.location ?? null,
            seqNumber: input.seqNumber ?? null,
            agendaSummary: input.agendaSummary ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'meeting.create', 'CouncilMeeting', created.id, {
          councilId: council.id, scheduledAt: input.scheduledAt.toISOString(),
        });
        return created;
      });
      res.status(201).json({ data: meeting });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رقم الاجتماع مستخدم مسبقًا لهذا المجلس'));
      }
      next(e);
    }
  },
);

router.get('/meetings/:id', async (req, res, next) => {
  try {
    const meeting = await requireMeeting(req.institution!.id, req.params.id!);
    const detail = await prisma.councilMeeting.findUnique({
      where: { id: meeting.id },
      include: {
        attendance: {
          include: { person: { select: { id: true, fullNameAr: true, category: true } } },
        },
        agendaItems: { orderBy: { orderNo: 'asc' } },
        resolutions: true,
        minutes: true,
        documents: true,
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/meetings/:id',
  requireCapability('COUNCILS_MANAGE'),
  validate(meetingUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof meetingUpdateSchema>;
      if (input.status && input.status !== meeting.status) {
        const legal =
          (meeting.status === 'SCHEDULED' && (input.status === 'HELD' || input.status === 'CANCELLED')) ||
          (meeting.status === 'CANCELLED' && input.status === 'SCHEDULED');
        if (!legal) {
          throw new AppError('MEETING_INVALID_TRANSITION', 'انتقال حالة الاجتماع غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.councilMeeting.update({
          where: { id: meeting.id },
          data: {
            ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.agendaSummary !== undefined ? { agendaSummary: input.agendaSummary } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'meeting.update', 'CouncilMeeting', meeting.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── attendance (bulk upsert) ───────────────────────────────────────
router.post(
  '/meetings/:id/attendance',
  requireCapability('COUNCILS_MANAGE'),
  validate(attendanceBulkSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof attendanceBulkSchema>;
      for (const record of input.records) {
        await requirePersonInInstitution(institutionId, record.personId);
      }
      const rows = await prisma.$transaction(async (tx) => {
        const written = [];
        for (const record of input.records) {
          written.push(
            await tx.meetingAttendance.upsert({
              where: { meetingId_personId: { meetingId: meeting.id, personId: record.personId } },
              create: {
                meetingId: meeting.id,
                personId: record.personId,
                status: record.status,
                recordedById: req.user!.id,
              },
              update: { status: record.status, recordedById: req.user!.id },
            }),
          );
        }
        await audit(tx, req.user!.id, institutionId, 'meeting.attendance', 'CouncilMeeting', meeting.id, {
          count: input.records.length,
        });
        return written;
      });
      res.json({ data: rows });
    } catch (e) {
      next(e);
    }
  },
);

// ── agenda items ───────────────────────────────────────────────────
router.post(
  '/meetings/:id/agenda-items',
  requireCapability('COUNCILS_MANAGE'),
  validate(agendaItemCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof agendaItemCreateSchema>;
      const item = await prisma.$transaction(async (tx) => {
        const created = await tx.meetingAgendaItem.create({
          data: {
            meetingId: meeting.id,
            orderNo: input.orderNo,
            titleAr: input.titleAr,
            description: input.description ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'agenda_item.create', 'MeetingAgendaItem', created.id, {
          meetingId: meeting.id, orderNo: input.orderNo,
        });
        return created;
      });
      res.status(201).json({ data: item });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رقم بند جدول الأعمال مستخدم مسبقًا لهذا الاجتماع'));
      }
      next(e);
    }
  },
);

router.patch(
  '/agenda-items/:id',
  requireCapability('COUNCILS_MANAGE'),
  validate(agendaItemUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const item = await prisma.meetingAgendaItem.findUnique({
        where: { id: req.params.id! },
        select: { id: true, meetingId: true, meeting: { select: { council: { select: { institutionId: true } } } } },
      });
      if (!item || item.meeting.council.institutionId !== institutionId) {
        throw AppError.notFound('بند جدول الأعمال غير موجود');
      }
      const input = req.body as z.infer<typeof agendaItemUpdateSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingAgendaItem.update({
          where: { id: item.id },
          data: {
            ...(input.titleAr !== undefined ? { titleAr: input.titleAr } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.orderNo !== undefined ? { orderNo: input.orderNo } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'agenda_item.update', 'MeetingAgendaItem', item.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── resolutions ────────────────────────────────────────────────────
router.post(
  '/meetings/:id/resolutions',
  requireCapability('COUNCILS_MANAGE'),
  validate(resolutionCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof resolutionCreateSchema>;
      if (input.ownerPersonId) await requirePersonInInstitution(institutionId, input.ownerPersonId);
      if (input.agendaItemId) {
        const item = await prisma.meetingAgendaItem.findUnique({
          where: { id: input.agendaItemId },
          select: { meetingId: true },
        });
        if (!item || item.meetingId !== meeting.id) {
          throw AppError.badRequest('بند جدول الأعمال المحدد لا ينتمي إلى هذا الاجتماع');
        }
      }
      const resolution = await prisma.$transaction(async (tx) => {
        const created = await tx.councilResolution.create({
          data: {
            meetingId: meeting.id,
            agendaItemId: input.agendaItemId ?? null,
            number: input.number ?? null,
            kind: input.kind,
            textAr: input.textAr,
            dueDate: input.dueDate ?? null,
            ownerPersonId: input.ownerPersonId ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'resolution.create', 'CouncilResolution', created.id, {
          meetingId: meeting.id, kind: input.kind,
        });
        return created;
      });
      res.status(201).json({ data: resolution });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/resolutions/:id',
  requireCapability('COUNCILS_MANAGE'),
  validate(resolutionUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const resolution = await prisma.councilResolution.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, meeting: { select: { council: { select: { institutionId: true } } } } },
      });
      if (!resolution || resolution.meeting.council.institutionId !== institutionId) {
        throw AppError.notFound('القرار المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof resolutionUpdateSchema>;
      if (input.status && input.status !== resolution.status) {
        if (!transitionAllowed(RESOLUTION_TRANSITIONS, resolution.status as 'DRAFT', input.status)) {
          throw new AppError('RESOLUTION_INVALID_TRANSITION', 'انتقال حالة القرار غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.councilResolution.update({
          where: { id: resolution.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'APPROVED' ? { approvedAt: input.approvedAt ?? new Date() } : {}),
            ...(input.status === 'IMPLEMENTED' ? { completedAt: input.completedAt ?? new Date() } : {}),
            ...(input.completionRef !== undefined ? { completionRef: input.completionRef } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'resolution.update', 'CouncilResolution', resolution.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── minutes ────────────────────────────────────────────────────────
router.get('/meetings/:id/minutes', async (req, res, next) => {
  try {
    const meeting = await requireMeeting(req.institution!.id, req.params.id!);
    const minutes = await prisma.meetingMinutes.findUnique({ where: { meetingId: meeting.id } });
    res.json({ data: minutes });
  } catch (e) {
    next(e);
  }
});

router.put(
  '/meetings/:id/minutes',
  requireCapability('COUNCILS_MANAGE'),
  validate(minutesUpsertSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      if (meeting.status !== 'HELD') {
        throw new AppError('MINUTES_INVALID_TRANSITION', 'محضر الاجتماع يُحرَّر بعد انعقاد الاجتماع', 409);
      }
      const input = req.body as z.infer<typeof minutesUpsertSchema>;
      // Signed minutes are immutable; approved-but-unsigned re-draft.
      const existingMinutes = await prisma.meetingMinutes.findUnique({
        where: { meetingId: meeting.id },
        select: { id: true, status: true },
      });
      if (existingMinutes?.status === 'SIGNED') {
        throw new AppError('MINUTES_INVALID_TRANSITION', 'المحضر الموقّع غير قابل للتعديل', 409);
      }
      const minutes = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingMinutes.upsert({
          where: { meetingId: meeting.id },
          create: { meetingId: meeting.id, contentAr: input.contentAr },
          update: { contentAr: input.contentAr, status: 'DRAFT' },
        });
        await audit(tx, req.user!.id, institutionId, 'minutes.draft', 'MeetingMinutes', row.id, {});
        return row;
      });
      res.json({ data: minutes });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/meetings/:id/minutes/approve',
  requireCapability('COUNCILS_MANAGE'),
  validate(minutesApproveSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof minutesApproveSchema>;
      await requirePersonInInstitution(institutionId, input.approvedByPersonId);
      const minutes = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingMinutes.findUnique({ where: { meetingId: meeting.id } });
        if (!row) throw AppError.notFound('لا يوجد محضر لهذا الاجتماع بعد');
        if (!transitionAllowed(MINUTES_TRANSITIONS, row.status as 'DRAFT', 'APPROVED')) {
          throw new AppError('MINUTES_INVALID_TRANSITION', 'لا يمكن اعتماد هذا المحضر في حالته الحالية', 409);
        }
        const updated = await tx.meetingMinutes.update({
          where: { id: row.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedByPersonId: input.approvedByPersonId,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'minutes.approve', 'MeetingMinutes', row.id, {
          approvedByPersonId: input.approvedByPersonId,
        });
        return updated;
      });
      res.json({ data: minutes });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/meetings/:id/minutes/sign',
  requireCapability('COUNCILS_MANAGE'),
  validate(minutesSignSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof minutesSignSchema>;
      await requirePersonInInstitution(institutionId, input.signedByPersonId);
      const minutes = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingMinutes.findUnique({ where: { meetingId: meeting.id } });
        if (!row) throw AppError.notFound('لا يوجد محضر لهذا الاجتماع بعد');
        if (!transitionAllowed(MINUTES_TRANSITIONS, row.status as 'DRAFT', 'SIGNED')) {
          throw new AppError('MINUTES_INVALID_TRANSITION', 'التوقيع يتطلب محضرًا معتمدًا', 409);
        }
        const updated = await tx.meetingMinutes.update({
          where: { id: row.id },
          data: { status: 'SIGNED', signedAt: new Date(), signedByPersonId: input.signedByPersonId },
        });
        await audit(tx, req.user!.id, institutionId, 'minutes.sign', 'MeetingMinutes', row.id, {
          signedByPersonId: input.signedByPersonId,
        });
        return updated;
      });
      res.json({ data: minutes });
    } catch (e) {
      next(e);
    }
  },
);

// ── documents (metadata references — DECISIONS.md D12) ────────────
router.post(
  '/councils/:id/documents',
  requireCapability('COUNCILS_MANAGE'),
  validate(councilDocumentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof councilDocumentCreateSchema>;
      if (input.meetingId) {
        const meeting = await requireMeeting(institutionId, input.meetingId);
        if (meeting.councilId !== council.id) {
          throw AppError.badRequest('الاجتماع المحدد لا ينتمي إلى هذا المجلس');
        }
      }
      const document = await prisma.$transaction(async (tx) => {
        const created = await tx.councilDocument.create({
          data: {
            councilId: council.id,
            meetingId: input.meetingId ?? null,
            titleAr: input.titleAr,
            fileUrl: input.fileUrl ?? null,
            kind: input.kind ?? null,
            notes: input.notes ?? null,
            uploadedById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'council.document.create', 'CouncilDocument', created.id, {
          councilId: council.id, titleAr: input.titleAr,
        });
        return created;
      });
      res.status(201).json({ data: document });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
