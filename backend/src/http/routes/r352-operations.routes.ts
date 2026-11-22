/**
 * r352 — physical facilities & equipment (NOT the virtual-labs
 * feature): facilities, equipment with program/criteria links,
 * maintenance work orders, reservations, safety incidents.
 *
 * Mounted at '/api/v1/operations' (see app.ts). Writes need
 * FACILITIES_MANAGE; reads need the institution context.
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
import { RESERVATION_TRANSITIONS, WORK_ORDER_TRANSITIONS, transitionAllowed } from '../../lib/lifecycle-rules.js';
import {
  facilityListSchema, facilityCreateSchema, facilityUpdateSchema,
  equipmentListSchema, equipmentCreateSchema, equipmentUpdateSchema,
  equipmentProgramLinkSchema, workOrderListSchema, workOrderCreateSchema,
  workOrderUpdateSchema, reservationListSchema, reservationCreateSchema,
  reservationUpdateSchema, safetyIncidentListSchema, safetyIncidentCreateSchema,
  safetyIncidentUpdateSchema,
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

async function requireFacility(institutionId: string, id: string) {
  const facility = await prisma.facility.findUnique({
    where: { id }, select: { id: true, institutionId: true, status: true },
  });
  if (!facility || facility.institutionId !== institutionId) {
    throw AppError.notFound('المنشأة المطلوبة غير موجودة');
  }
  return facility;
}

async function requireEquipment(institutionId: string, id: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id }, select: { id: true, institutionId: true, facilityId: true, orgUnitId: true },
  });
  if (!equipment || equipment.institutionId !== institutionId) {
    throw AppError.notFound('المعدة المطلوبة غير موجودة');
  }
  return equipment;
}

// ── facilities ─────────────────────────────────────────────────────
router.get('/facilities', validate(facilityListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, type, status } = req.query as unknown as z.infer<typeof facilityListSchema>;
    const where: Prisma.FacilityWhereInput = {
      institutionId: req.institution!.id,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ nameAr: { contains: q } }, { nameEn: { contains: q } }, { code: { contains: q } }] } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.facility.count({ where }),
      prisma.facility.findMany({
        where,
        include: {
          orgUnit: { select: { id: true, nameAr: true, type: true } },
          _count: { select: { equipment: true, reservations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...row }) => ({ ...row, equipmentCount: _count.equipment, reservationCount: _count.reservations })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/facilities',
  requireCapability('FACILITIES_MANAGE'),
  validate(facilityCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof facilityCreateSchema>;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      const facility = await prisma.$transaction(async (tx) => {
        const created = await tx.facility.create({
          data: {
            institutionId,
            nameAr: input.nameAr,
            nameEn: input.nameEn ?? null,
            type: input.type,
            code: input.code ?? null,
            orgUnitId: input.orgUnitId ?? null,
            building: input.building ?? null,
            room: input.room ?? null,
            capacity: input.capacity ?? null,
            safetyNotes: input.safetyNotes ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'facility.create', 'Facility', created.id, {
          nameAr: input.nameAr, type: input.type,
        });
        return created;
      });
      res.status(201).json({ data: facility });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المنشأة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.get('/facilities/:id', async (req, res, next) => {
  try {
    const facility = await requireFacility(req.institution!.id, req.params.id!);
    const detail = await prisma.facility.findUnique({
      where: { id: facility.id },
      include: {
        orgUnit: { select: { id: true, nameAr: true, type: true } },
        _count: { select: { equipment: true, workOrders: true, incidents: true } },
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/facilities/:id',
  requireCapability('FACILITIES_MANAGE'),
  validate(facilityUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const facility = await requireFacility(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof facilityUpdateSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.facility.update({
          where: { id: facility.id },
          data: {
            ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.orgUnitId !== undefined ? { orgUnitId: input.orgUnitId } : {}),
            ...(input.building !== undefined ? { building: input.building } : {}),
            ...(input.room !== undefined ? { room: input.room } : {}),
            ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
            ...(input.safetyNotes !== undefined ? { safetyNotes: input.safetyNotes } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'facility.update', 'Facility', facility.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المنشأة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

// ── equipment ──────────────────────────────────────────────────────
router.get('/equipment', validate(equipmentListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, status, facilityId } = req.query as unknown as z.infer<typeof equipmentListSchema>;
    const where: Prisma.EquipmentWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(facilityId ? { facilityId } : {}),
      ...(q
        ? {
            OR: [
              { nameAr: { contains: q } }, { nameEn: { contains: q } },
              { code: { contains: q } }, { serialNumber: { contains: q } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        include: {
          facility: { select: { id: true, nameAr: true, type: true } },
          orgUnit: { select: { id: true, nameAr: true, type: true } },
          responsiblePerson: { select: { id: true, fullNameAr: true } },
          _count: { select: { programLinks: true, workOrders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      data: data.map(({ _count, ...row }) => ({ ...row, programLinkCount: _count.programLinks, workOrderCount: _count.workOrders })),
      meta: buildMeta(page, limit, total),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/equipment',
  requireCapability('FACILITIES_MANAGE'),
  validate(equipmentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof equipmentCreateSchema>;
      if (input.facilityId) await requireFacility(institutionId, input.facilityId);
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId }, select: { institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
      }
      if (input.responsiblePersonId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.responsiblePersonId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('الفني المسؤول المحدد غير موجود في مؤسستك');
        }
      }
      const equipment = await prisma.$transaction(async (tx) => {
        const created = await tx.equipment.create({
          data: {
            institutionId,
            nameAr: input.nameAr,
            nameEn: input.nameEn ?? null,
            code: input.code ?? null,
            facilityId: input.facilityId ?? null,
            orgUnitId: input.orgUnitId ?? null,
            category: input.category ?? null,
            serialNumber: input.serialNumber ?? null,
            acquiredAt: input.acquiredAt ?? null,
            ...(input.value !== undefined ? { value: input.value } : {}),
            condition: input.condition ?? 'GOOD',
            status: input.status ?? 'IN_SERVICE',
            responsiblePersonId: input.responsiblePersonId ?? null,
            notes: input.notes ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'equipment.create', 'Equipment', created.id, {
          nameAr: input.nameAr,
        });
        return created;
      });
      res.status(201).json({ data: equipment });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المعدة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

router.patch(
  '/equipment/:id',
  requireCapability('FACILITIES_MANAGE'),
  validate(equipmentUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const equipment = await requireEquipment(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof equipmentUpdateSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.equipment.update({
          where: { id: equipment.id },
          data: {
            ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.facilityId !== undefined ? { facilityId: input.facilityId } : {}),
            ...(input.orgUnitId !== undefined ? { orgUnitId: input.orgUnitId } : {}),
            ...(input.category !== undefined ? { category: input.category } : {}),
            ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
            ...(input.acquiredAt !== undefined ? { acquiredAt: input.acquiredAt } : {}),
            ...(input.value !== undefined ? { value: input.value } : {}),
            ...(input.condition !== undefined ? { condition: input.condition } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.responsiblePersonId !== undefined ? { responsiblePersonId: input.responsiblePersonId } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'equipment.update', 'Equipment', equipment.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رمز المعدة مستخدم مسبقًا في مؤسستك'));
      }
      next(e);
    }
  },
);

// ── equipment ↔ program/criteria links ────────────────────────────
router.post(
  '/equipment/:id/programs',
  requireCapability('FACILITIES_MANAGE'),
  validate(equipmentProgramLinkSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const equipment = await requireEquipment(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof equipmentProgramLinkSchema>;
      const program = await prisma.program.findUnique({
        where: { id: input.programId },
        select: { id: true, institutionId: true },
      });
      if (!program || program.institutionId !== institutionId) {
        throw AppError.notFound('البرنامج المحدد غير موجود في مؤسستك');
      }
      if (input.criteriaItemId) {
        const item = await prisma.accreditationCriteriaItem.findUnique({
          where: { id: input.criteriaItemId }, select: { id: true },
        });
        if (!item) throw AppError.notFound('بند المعيار المحدد غير موجود');
      }
      const link = await prisma.$transaction(async (tx) => {
        const created = await tx.equipmentProgramSupport.upsert({
          where: { equipmentId_programId: { equipmentId: equipment.id, programId: program.id } },
          create: {
            equipmentId: equipment.id,
            programId: program.id,
            criteriaItemId: input.criteriaItemId ?? null,
          },
          update: { criteriaItemId: input.criteriaItemId ?? null },
        });
        await audit(tx, req.user!.id, institutionId, 'equipment.program_link', 'Equipment', equipment.id, {
          programId: program.id,
        });
        return created;
      });
      res.status(201).json({ data: link });
    } catch (e) {
      next(e);
    }
  },
);

router.delete('/equipment/:id/programs/:programId', requireCapability('FACILITIES_MANAGE'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const equipment = await requireEquipment(institutionId, req.params.id!);
    await prisma.$transaction(async (tx) => {
      await tx.equipmentProgramSupport.deleteMany({
        where: { equipmentId: equipment.id, programId: req.params.programId! },
      });
      await audit(tx, req.user!.id, institutionId, 'equipment.program_unlink', 'Equipment', equipment.id, {
        programId: req.params.programId!,
      });
    });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

// ── work orders ────────────────────────────────────────────────────
router.get('/work-orders', validate(workOrderListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, equipmentId } = req.query as unknown as z.infer<typeof workOrderListSchema>;
    const where: Prisma.MaintenanceWorkOrderWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
      ...(equipmentId ? { equipmentId } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.maintenanceWorkOrder.count({ where }),
      prisma.maintenanceWorkOrder.findMany({
        where,
        include: {
          facility: { select: { id: true, nameAr: true } },
          equipment: { select: { id: true, nameAr: true, code: true } },
          assignedPerson: { select: { id: true, fullNameAr: true } },
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
  '/work-orders',
  requireCapability('FACILITIES_MANAGE'),
  validate(workOrderCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof workOrderCreateSchema>;
      if (input.facilityId) await requireFacility(institutionId, input.facilityId);
      if (input.equipmentId) await requireEquipment(institutionId, input.equipmentId);
      if (input.assignedPersonId) {
        const person = await prisma.institutionalPerson.findUnique({
          where: { id: input.assignedPersonId }, select: { institutionId: true },
        });
        if (!person || person.institutionId !== institutionId) {
          throw AppError.notFound('الفني المكلف غير موجود في مؤسستك');
        }
      }
      const workOrder = await prisma.$transaction(async (tx) => {
        const created = await tx.maintenanceWorkOrder.create({
          data: {
            institutionId,
            titleAr: input.titleAr,
            kind: input.kind,
            facilityId: input.facilityId ?? null,
            equipmentId: input.equipmentId ?? null,
            description: input.description ?? null,
            scheduledDate: input.scheduledDate ?? null,
            assignedPersonId: input.assignedPersonId ?? null,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'work_order.create', 'MaintenanceWorkOrder', created.id, {
          titleAr: input.titleAr, kind: input.kind,
        });
        return created;
      });
      res.status(201).json({ data: workOrder });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/work-orders/:id',
  requireCapability('FACILITIES_MANAGE'),
  validate(workOrderUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const workOrder = await prisma.maintenanceWorkOrder.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, institutionId: true },
      });
      if (!workOrder || workOrder.institutionId !== institutionId) {
        throw AppError.notFound('أمر العمل المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof workOrderUpdateSchema>;
      if (input.status && input.status !== workOrder.status) {
        if (!transitionAllowed(WORK_ORDER_TRANSITIONS, workOrder.status as 'OPEN', input.status)) {
          throw new AppError('WORK_ORDER_INVALID_TRANSITION', 'انتقال حالة أمر العمل غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.maintenanceWorkOrder.update({
          where: { id: workOrder.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.status === 'COMPLETED' ? { completedAt: input.completedAt ?? new Date() } : {}),
            ...(input.cost !== undefined ? { cost: input.cost } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'work_order.update', 'MaintenanceWorkOrder', workOrder.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── reservations ───────────────────────────────────────────────────
router.get('/reservations', validate(reservationListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, facilityId, status } = req.query as unknown as z.infer<typeof reservationListSchema>;
    const where: Prisma.FacilityReservationWhereInput = {
      institutionId: req.institution!.id,
      ...(facilityId ? { facilityId } : {}),
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.facilityReservation.count({ where }),
      prisma.facilityReservation.findMany({
        where,
        include: { facility: { select: { id: true, nameAr: true, type: true } } },
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
  '/reservations',
  requireCapability('FACILITIES_MANAGE'),
  validate(reservationCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof reservationCreateSchema>;
      const facility = await requireFacility(institutionId, input.facilityId);
      if (input.endsAt.getTime() <= input.startsAt.getTime()) {
        throw new AppError('RESERVATION_WINDOW_INVALID', 'نهاية الحجز يجب أن تكون بعد بدايته', 400);
      }
      // Overlap guard: any live (REQUESTED/APPROVED) reservation of the
      // same facility overlapping the requested window.
      const overlapping = await prisma.facilityReservation.findFirst({
        where: {
          facilityId: facility.id,
          status: { in: ['REQUESTED', 'APPROVED'] },
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new AppError('RESERVATION_OVERLAP', 'توجد حجوزات متداخلة لهذه المنشأة في الفترة المطلوبة', 409);
      }
      const reservation = await prisma.$transaction(async (tx) => {
        const created = await tx.facilityReservation.create({
          data: {
            institutionId,
            facilityId: facility.id,
            orgUnitId: input.orgUnitId ?? null,
            requestedById: req.user!.id,
            purpose: input.purpose,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'reservation.create', 'FacilityReservation', created.id, {
          facilityId: facility.id,
        });
        return created;
      });
      res.status(201).json({ data: reservation });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/reservations/:id',
  requireCapability('FACILITIES_MANAGE'),
  validate(reservationUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const reservation = await prisma.facilityReservation.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, institutionId: true },
      });
      if (!reservation || reservation.institutionId !== institutionId) {
        throw AppError.notFound('الحجز المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof reservationUpdateSchema>;
      if (input.status && input.status !== reservation.status) {
        if (!transitionAllowed(RESERVATION_TRANSITIONS, reservation.status as 'REQUESTED', input.status)) {
          throw new AppError('RESERVATION_OVERLAP', 'انتقال حالة الحجز غير مسموح', 409);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.facilityReservation.update({
          where: { id: reservation.id },
          data: {
            ...(input.status !== undefined ? { status: input.status, decidedById: req.user!.id, decidedAt: new Date() } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'reservation.update', 'FacilityReservation', reservation.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── safety incidents ───────────────────────────────────────────────
router.get('/safety-incidents', validate(safetyIncidentListSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof safetyIncidentListSchema>;
    const where: Prisma.SafetyIncidentWhereInput = {
      institutionId: req.institution!.id,
      ...(status ? { status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.safetyIncident.count({ where }),
      prisma.safetyIncident.findMany({
        where,
        include: {
          facility: { select: { id: true, nameAr: true } },
          equipment: { select: { id: true, nameAr: true, code: true } },
        },
        orderBy: { occurredAt: 'desc' },
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
  '/safety-incidents',
  requireCapability('FACILITIES_MANAGE'),
  validate(safetyIncidentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof safetyIncidentCreateSchema>;
      if (input.facilityId) await requireFacility(institutionId, input.facilityId);
      if (input.equipmentId) await requireEquipment(institutionId, input.equipmentId);
      const incident = await prisma.$transaction(async (tx) => {
        const created = await tx.safetyIncident.create({
          data: {
            institutionId,
            kind: input.kind,
            severity: input.severity ?? null,
            titleAr: input.titleAr,
            description: input.description ?? null,
            facilityId: input.facilityId ?? null,
            equipmentId: input.equipmentId ?? null,
            occurredAt: input.occurredAt,
            reportedById: req.user!.id,
          },
        });
        await audit(tx, req.user!.id, institutionId, 'safety_incident.create', 'SafetyIncident', created.id, {
          kind: input.kind, titleAr: input.titleAr,
        });
        return created;
      });
      res.status(201).json({ data: incident });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/safety-incidents/:id',
  requireCapability('FACILITIES_MANAGE'),
  validate(safetyIncidentUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const incident = await prisma.safetyIncident.findUnique({
        where: { id: req.params.id! },
        select: { id: true, institutionId: true },
      });
      if (!incident || incident.institutionId !== institutionId) {
        throw AppError.notFound('الحادث المطلوب غير موجود');
      }
      const input = req.body as z.infer<typeof safetyIncidentUpdateSchema>;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.safetyIncident.update({
          where: { id: incident.id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.resolutionNotes !== undefined ? { resolutionNotes: input.resolutionNotes } : {}),
            ...(input.resolvedAt !== undefined ? { resolvedAt: input.resolvedAt } : {}),
          },
        });
        await audit(tx, req.user!.id, institutionId, 'safety_incident.update', 'SafetyIncident', incident.id, { changes: input });
        return row;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
