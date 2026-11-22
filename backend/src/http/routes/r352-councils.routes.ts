/**
 * r352 — councils & committees (reusable governance domain), hardened.
 *
 * Mounted at '/api/v1/governance' (see app.ts):
 *   councils CRUD + memberships + meetings + attendance + agenda +
 *   resolutions + minutes (draft → approve → sign, REAL versioned
 *   history) + documents (real storage integration).
 *
 * r352 hardening:
 *   §3.2  scope policy — COUNCILS_MANAGE is checked AFTER the council
 *         is resolved: unit-scoped capability grants authorize councils
 *         that live inside their unit subtree; councils without a unit
 *         (institution-wide organs) require the institution-wide grant.
 *   §7.1  minutes have true revision history — a signed version is
 *         immutable (DB trigger belt), re-drafting an approved version
 *         mints versionNo + 1 and preserves every prior approval and
 *         signatory; GET returns the current version + full history.
 *   §7.2  Council.status is the CouncilStatus lifecycle (DISSOLVED).
 *   §7.3  attendance models MEMBER vs GUEST explicitly; MEMBER rows
 *         are verified against ACTIVE council memberships.
 *   §7.4  meetings list is paginated with the shared buildMeta shape.
 *   §9    documents attach a real BinaryObject (governance namespace,
 *         tenant-bound key) — fileUrl stays a deprecated external
 *         reference, never trusted as an upload; uploads and downloads
 *         are separate, authorized endpoints.
 */
import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireInstitution } from '../middleware/institution.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { buildMeta } from '../../lib/pagination.js';
import {
  COUNCIL_TRANSITIONS, MINUTES_TRANSITIONS, RESOLUTION_TRANSITIONS, transitionAllowed,
} from '../../lib/lifecycle-rules.js';
import { assertCapabilityForUnit, assertCapabilityIn } from '../../lib/permissions.js';
import { governanceKeyInstitution } from '../../lib/tenant-guards.js';
import {
  councilListSchema, councilCreateSchema, councilUpdateSchema,
  councilMembershipCreateSchema, councilMembershipEndSchema,
  meetingCreateSchema, meetingUpdateSchema, meetingListSchema, attendanceBulkSchema,
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
    select: { id: true, institutionId: true, status: true, orgUnitId: true },
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
      council: { select: { id: true, institutionId: true, orgUnitId: true } },
    },
  });
  if (!meeting || meeting.council.institutionId !== institutionId) {
    throw AppError.notFound('الاجتماع المطلوب غير موجود');
  }
  return meeting;
}

/**
 * §7.2 write floor: memberships and meetings may only be created on an
 * ACTIVE council — a DISSOLVED organ accepts no new operative records
 * (its history stays readable), a CANCELLED one is not operating either.
 */
function assertCouncilActive(status: string): void {
  if (status !== 'ACTIVE') {
    throw new AppError(
      'COUNCIL_NOT_ACTIVE',
      'المجلس غير نشط — لا يمكن إضافة أعضاء أو اجتماعات لمجلس محلول أو ملغى',
      409,
    );
  }
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

/**
 * §3.2 scope policy for every councils write: when the council has an
 * org-unit home, a unit-scoped COUNCILS_MANAGE grant covering that unit
 * (or an ancestor) authorizes the write; an institution-wide organ
 * requires the institution-wide capability. OWNER passes either way.
 */
async function assertCouncilsManageForUnit(
  userId: string,
  role: Role,
  institutionId: string,
  orgUnitId: string | null,
): Promise<void> {
  if (orgUnitId) {
    await assertCapabilityForUnit(userId, role, institutionId, orgUnitId, 'COUNCILS_MANAGE');
  } else {
    await assertCapabilityIn(userId, role, institutionId, 'COUNCILS_MANAGE');
  }
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
      // §3.2: the scope policy runs against the council's own unit.
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, input.orgUnitId ?? null);
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
  validate(councilUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof councilUpdateSchema>;
      // D16 lifecycle: the organ's status rides COUNCIL_TRANSITIONS —
      // DISSOLVED is terminal (a successor is a new council), CANCELLED
      // is clerically reversible (the INSPECTION/CORRECTIVE precedent).
      if (input.status !== undefined && input.status !== council.status) {
        if (!transitionAllowed(COUNCIL_TRANSITIONS, council.status as 'ACTIVE', input.status)) {
          throw new AppError(
            'COUNCIL_INVALID_TRANSITION',
            'انتقال حالة المجلس غير مسموح',
            409,
          );
        }
      }
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      // §3.2: the effective scope is the TARGET unit when re-homing,
      // else the council's current unit.
      const effectiveUnit = input.orgUnitId !== undefined ? (input.orgUnitId ?? null) : council.orgUnitId;
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, effectiveUnit);
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
            ...(input.orgUnitId !== undefined ? { orgUnitId: input.orgUnitId } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'DISSOLVED' ? { dissolvedAt: new Date() } : {}),
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
  validate(councilMembershipCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, council.orgUnitId);
      const input = req.body as z.infer<typeof councilMembershipCreateSchema>;
      assertCouncilActive(council.status);
      await requirePersonInInstitution(institutionId, input.personId);
      if (input.startDate && input.endDate && input.endDate < input.startDate) {
        throw new AppError('APPOINTMENT_DATES_INVALID', 'تاريخ نهاية العضوية يسبق تاريخ بدئها', 400);
      }
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
  validate(councilMembershipEndSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const membership = await prisma.councilMembership.findUnique({
        where: { id: req.params.id! },
        select: { id: true, councilId: true, council: { select: { institutionId: true, orgUnitId: true } } },
      });
      if (!membership || membership.council.institutionId !== institutionId) {
        throw AppError.notFound('العضوية المطلوبة غير موجودة');
      }
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, membership.council.orgUnitId);
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
// §7.4 — paginated with the shared meta shape (was: unbounded take 200).
router.get('/councils/:id/meetings', validate(meetingListSchema, 'query'), async (req, res, next) => {
  try {
    const council = await requireCouncil(req.institution!.id, req.params.id!);
    const { page, limit } = req.query as unknown as z.infer<typeof meetingListSchema>;
    const where = { councilId: council.id };
    const [total, data] = await Promise.all([
      prisma.councilMeeting.count({ where }),
      prisma.councilMeeting.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
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
  '/councils/:id/meetings',
  validate(meetingCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, council.orgUnitId);
      assertCouncilActive(council.status);
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
        minutes: { where: { isCurrent: true }, take: 1 },
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
  validate(meetingUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
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
  validate(attendanceBulkSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
      const input = req.body as z.infer<typeof attendanceBulkSchema>;
      for (const record of input.records) {
        await requirePersonInInstitution(institutionId, record.personId);
        // §7.3 — MEMBER attendance must map to an ACTIVE council
        // membership of THIS council; GUEST attendance is the documented
        // external-participant path (person-institution integrity above).
        if (record.attendeeKind === 'MEMBER') {
          const membership = await prisma.councilMembership.findFirst({
            where: {
              councilId: meeting.councilId,
              personId: record.personId,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
          if (!membership) {
            throw new AppError(
              'ATTENDEE_NOT_MEMBER',
              'تسجيل حضور كعضو يتطلب عضوية نشطة في المجلس — سجّله كضيف إن كان مشاركًا خارجيًا',
              400,
            );
          }
        }
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
                attendeeKind: record.attendeeKind,
                recordedById: req.user!.id,
              },
              update: { status: record.status, attendeeKind: record.attendeeKind, recordedById: req.user!.id },
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
  validate(agendaItemCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
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
  validate(agendaItemUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const item = await prisma.meetingAgendaItem.findUnique({
        where: { id: req.params.id! },
        select: { id: true, meetingId: true, meeting: { select: { council: { select: { institutionId: true, orgUnitId: true } } } } },
      });
      if (!item || item.meeting.council.institutionId !== institutionId) {
        throw AppError.notFound('بند جدول الأعمال غير موجود');
      }
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, item.meeting.council.orgUnitId);
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
  validate(resolutionCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
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
  validate(resolutionUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const resolution = await prisma.councilResolution.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, meeting: { select: { council: { select: { institutionId: true, orgUnitId: true } } } } },
      });
      if (!resolution || resolution.meeting.council.institutionId !== institutionId) {
        throw AppError.notFound('القرار المطلوب غير موجود');
      }
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, resolution.meeting.council.orgUnitId);
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

// ── minutes (§7.1 — real versioned history) ────────────────────────

/** The current version row of a meeting (null when none was drafted). */
async function currentMinutes(meetingId: string) {
  return prisma.meetingMinutes.findFirst({
    where: { meetingId, isCurrent: true },
    orderBy: { versionNo: 'desc' },
  });
}

/** GET current version + full history. */
router.get('/meetings/:id/minutes', async (req, res, next) => {
  try {
    const meeting = await requireMeeting(req.institution!.id, req.params.id!);
    const [current, versions] = await Promise.all([
      currentMinutes(meeting.id),
      prisma.meetingMinutes.findMany({
        where: { meetingId: meeting.id },
        orderBy: { versionNo: 'desc' },
      }),
    ]);
    res.json({ data: current, meta: { versions, versionCount: versions.length } });
  } catch (e) {
    next(e);
  }
});

/** GET the full version history (explicit endpoint for auditors). */
router.get('/meetings/:id/minutes/history', async (req, res, next) => {
  try {
    const meeting = await requireMeeting(req.institution!.id, req.params.id!);
    const versions = await prisma.meetingMinutes.findMany({
      where: { meetingId: meeting.id },
      orderBy: { versionNo: 'desc' },
    });
    res.json({ data: versions, meta: { versionCount: versions.length } });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT (draft) — the versioning contract:
 *   • no minutes yet            → create version 1 (DRAFT, current)
 *   • current is DRAFT          → update its content in place
 *   • current is APPROVED       → mint versionNo + 1 as the new DRAFT
 *                                 current; the approved version keeps
 *                                 its content, approver and status
 *   • current is SIGNED         → 409 (immutable; a signed version is
 *                                 history — a NEW draft may only be
 *                                 minted after it, which this route
 *                                 also permits, creating version + 1)
 * The DB trigger (ulara_minutes_immutable) is the belt of record; this
 * route is the deliberate path. The version sequence is minted inside
 * the transaction (MAX(versionNo) + 1) — the partial unique index on
 * (meetingId) WHERE isCurrent guarantees a single current version even
 * under racing drafts.
 */
router.put(
  '/meetings/:id/minutes',
  validate(minutesUpsertSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
      if (meeting.status !== 'HELD') {
        throw new AppError('MINUTES_INVALID_TRANSITION', 'محضر الاجتماع يُحرَّر بعد انعقاد الاجتماع', 409);
      }
      const input = req.body as z.infer<typeof minutesUpsertSchema>;
      const minutes = await prisma.$transaction(async (tx) => {
        const current = await tx.meetingMinutes.findFirst({
          where: { meetingId: meeting.id, isCurrent: true },
          orderBy: { versionNo: 'desc' },
        });
        if (!current) {
          const created = await tx.meetingMinutes.create({
            data: { meetingId: meeting.id, versionNo: 1, isCurrent: true, contentAr: input.contentAr },
          });
          await audit(tx, req.user!.id, institutionId, 'minutes.draft', 'MeetingMinutes', created.id, {
            meetingId: meeting.id, versionNo: 1,
          });
          return created;
        }
        if (current.status === 'DRAFT') {
          const updated = await tx.meetingMinutes.update({
            where: { id: current.id },
            data: { contentAr: input.contentAr },
          });
          await audit(tx, req.user!.id, institutionId, 'minutes.draft', 'MeetingMinutes', current.id, {
            meetingId: meeting.id, versionNo: current.versionNo,
          });
          return updated;
        }
        // APPROVED or SIGNED current → the history row keeps its state;
        // a NEW draft revision becomes the current version.
        const maxVersion = await tx.meetingMinutes.findFirst({
          where: { meetingId: meeting.id },
          orderBy: { versionNo: 'desc' },
          select: { versionNo: true },
        });
        const nextVersionNo = (maxVersion?.versionNo ?? 0) + 1;
        await tx.meetingMinutes.update({
          where: { id: current.id },
          data: { isCurrent: false },
        });
        const created = await tx.meetingMinutes.create({
          data: {
            meetingId: meeting.id,
            versionNo: nextVersionNo,
            isCurrent: true,
            contentAr: input.contentAr,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'minutes.revise', 'MeetingMinutes', created.id, {
          meetingId: meeting.id,
          versionNo: nextVersionNo,
          supersedesVersionNo: current.versionNo,
          supersedesStatus: current.status,
        });
        return created;
      });
      res.json({ data: minutes });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('تعارض في إصدار المحضر — أعد المحاولة'));
      }
      // The immutability trigger surfacing through Prisma → the clean
      // Arabic envelope (the route is the deliberate path; this is the
      // belt for direct-mutation attempts).
      if (e instanceof Error && e.message.includes('MINUTES_')) {
        return next(
          new AppError('MINUTES_VERSION_IMMUTABLE', 'الإصدار المعتمد/الموقّع غير قابل للتعديل — أنشئ إصدارًا جديدًا', 409),
        );
      }
      next(e);
    }
  },
);

router.post(
  '/meetings/:id/minutes/approve',
  validate(minutesApproveSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
      const input = req.body as z.infer<typeof minutesApproveSchema>;
      await requirePersonInInstitution(institutionId, input.approvedByPersonId);
      const minutes = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingMinutes.findFirst({
          where: { meetingId: meeting.id, isCurrent: true },
          orderBy: { versionNo: 'desc' },
        });
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
          versionNo: row.versionNo,
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
  validate(minutesSignSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const meeting = await requireMeeting(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, meeting.council.orgUnitId);
      const input = req.body as z.infer<typeof minutesSignSchema>;
      await requirePersonInInstitution(institutionId, input.signedByPersonId);
      const minutes = await prisma.$transaction(async (tx) => {
        const row = await tx.meetingMinutes.findFirst({
          where: { meetingId: meeting.id, isCurrent: true },
          orderBy: { versionNo: 'desc' },
        });
        if (!row) throw AppError.notFound('لا يوجد محضر لهذا الاجتماع بعد');
        if (!transitionAllowed(MINUTES_TRANSITIONS, row.status as 'DRAFT', 'SIGNED')) {
          throw new AppError('MINUTES_INVALID_TRANSITION', 'التوقيع يتطلب محضرًا معتمدًا', 409);
        }
        const updated = await tx.meetingMinutes.update({
          where: { id: row.id },
          data: { status: 'SIGNED', signedAt: new Date(), signedByPersonId: input.signedByPersonId },
        });
        await audit(tx, req.user!.id, institutionId, 'minutes.sign', 'MeetingMinutes', row.id, {
          versionNo: row.versionNo,
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

// ── documents (§9 — real storage integration) ──────────────────────
router.post(
  '/councils/:id/documents',
  validate(councilDocumentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const council = await requireCouncil(institutionId, req.params.id!);
      await assertCouncilsManageForUnit(req.user!.id, req.user!.role, institutionId, council.orgUnitId);
      const input = req.body as z.infer<typeof councilDocumentCreateSchema>;
      if (input.meetingId) {
        const meeting = await requireMeeting(institutionId, input.meetingId);
        if (meeting.councilId !== council.id) {
          throw AppError.badRequest('الاجتماع المحدد لا ينتمي إلى هذا المجلس');
        }
      }
      // §9: a binaryObject reference must be a governance-namespace key
      // bound to THIS institution — arbitrary URLs are never trusted.
      if (input.binaryObjectId && governanceKeyInstitution(input.binaryObjectId) !== institutionId) {
        throw new AppError(
          'EVIDENCE_OWNER_INVALID',
          'الملف المرفق لا ينتمي إلى مساحة تخزين مؤسستك',
          400,
        );
      }
      const document = await prisma.$transaction(async (tx) => {
        const created = await tx.councilDocument.create({
          data: {
            councilId: council.id,
            meetingId: input.meetingId ?? null,
            titleAr: input.titleAr,
            binaryObjectId: input.binaryObjectId ?? null,
            fileUrl: input.fileUrl ?? null,
            kind: input.kind ?? null,
            notes: input.notes ?? null,
            uploadedById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'council.document.create', 'CouncilDocument', created.id, {
          councilId: council.id, titleAr: input.titleAr, binaryObjectId: input.binaryObjectId ?? null,
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
