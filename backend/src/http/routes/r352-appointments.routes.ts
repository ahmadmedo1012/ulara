/**
 * r352 — position appointments (leadership with full history).
 *
 * Mounted at '/api/v1/institutional' (shared prefix; no collisions):
 *   GET  /appointments            — paginated
 *   POST /appointments            — APPOINTMENTS_MANAGE
 *   GET  /appointments/:id        — detail
 *   POST /appointments/:id/end    — APPOINTMENTS_MANAGE
 *   POST /appointments/:id/cancel — APPOINTMENTS_MANAGE
 *   GET  /people/:id/appointments — one person's full history
 *
 * A position NEVER changes the holder's academic rank or platform
 * role (DECISIONS.md D4) — the models are deliberately unlinked.
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
  appointmentConflicts,
  appointmentDatesValid,
  positionEligibleForKind,
  type AppointmentWindow,
} from '../../lib/appointments-logic.js';
import {
  appointmentListSchema,
  appointmentCreateSchema,
  appointmentEndSchema,
  appointmentCancelSchema,
} from '../../modules/r352/dto.js';

const router = Router();

router.use(authMiddleware, requireInstitution);

const appointmentSelect = {
  id: true, institutionId: true, personId: true, positionId: true,
  orgUnitId: true, appointedByAuthority: true, decisionNumber: true,
  decisionDate: true, startDate: true, endDate: true, termMonths: true,
  status: true, acting: true, supersededById: true, notes: true,
  createdAt: true, updatedAt: true,
} as const;

router.get('/appointments', validate(appointmentListSchema, 'query'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const { page, limit, status, personId, orgUnitId, positionId } = req.query as unknown as z.infer<typeof appointmentListSchema>;
    const where: Prisma.PositionAppointmentWhereInput = {
      institutionId,
      ...(status ? { status } : {}),
      ...(personId ? { personId } : {}),
      ...(orgUnitId ? { orgUnitId } : {}),
      ...(positionId ? { positionId } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.positionAppointment.count({ where }),
      prisma.positionAppointment.findMany({
        where,
        select: {
          ...appointmentSelect,
          person: { select: { id: true, fullNameAr: true, category: true } },
          position: { select: { id: true, code: true, titleAr: true, titleEn: true, category: true } },
          orgUnit: { select: { id: true, nameAr: true, type: true } },
        },
        orderBy: { startDate: 'desc' },
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
  '/appointments',
  requireCapability('APPOINTMENTS_MANAGE'),
  validate(appointmentCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof appointmentCreateSchema>;
      if (!appointmentDatesValid(input.startDate, input.endDate ?? null)) {
        throw new AppError('APPOINTMENT_DATES_INVALID', 'تاريخ بدء التعيين لا يمكن أن يكون بعد تاريخ انتهائه', 400);
      }
      const person = await prisma.institutionalPerson.findUnique({
        where: { id: input.personId },
        select: { id: true, institutionId: true },
      });
      if (!person || person.institutionId !== institutionId) {
        throw AppError.notFound('السجل الشخصي المحدد غير موجود في مؤسستك');
      }
      const position = await prisma.positionTemplate.findUnique({
        where: { code: input.positionCode },
        select: {
          id: true, code: true, scopeRequirement: true, allowedUnitTypes: true,
          eligibleInstitutionTypeCodes: true,
          isLocalVariant: true, institutionId: true,
        },
      });
      if (!position || (position.isLocalVariant && position.institutionId !== institutionId)) {
        throw AppError.notFound('المسمى القيادي المحدد غير متاح لمؤسستك');
      }
      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { kindId: true, kind: { select: { code: true } } },
      });
      if (
        !positionEligibleForKind(
          position.eligibleInstitutionTypeCodes,
          institution?.kind?.code ?? null,
        )
      ) {
        throw new AppError(
          'APPOINTMENT_POSITION_NOT_ELIGIBLE',
          'هذا المسمى القيادي غير مخصص لنوع مؤسستك',
          409,
        );
      }
      let unitType: string | null = null;
      if (input.orgUnitId) {
        const unit = await prisma.organizationalUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { id: true, type: true, institutionId: true },
        });
        if (!unit || unit.institutionId !== institutionId) {
          throw AppError.notFound('الوحدة التنظيمية المحددة غير موجودة في مؤسستك');
        }
        unitType = unit.type;
      }
      const allowedUnitTypes: readonly string[] =
        position.allowedUnitTypes.length > 0 ? position.allowedUnitTypes : (
          position.scopeRequirement ? [position.scopeRequirement] : []
        );
      if (allowedUnitTypes.length > 0 && (unitType === null || !allowedUnitTypes.includes(unitType))) {
        throw new AppError(
          'APPOINTMENT_UNIT_TYPE_REQUIRED',
          'هذا المسمى يتطلب وحدة تنظيمية من نوع معين (راجع شرط المسمى)',
          400,
        );
      }
      const next: AppointmentWindow = {
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        status: 'ACTIVE',
        acting: input.acting ?? false,
      };
      const appointment = await prisma.$transaction(async (tx) => {
        // §6.2 — the substantive-seat check runs INSIDE the transaction,
        // scoped by institutionId (a global position template shared by
        // two institutions must not block the other's appointment), and
        // an advisory lock on the seat serializes racing creates.
        // orgUnitId is nullable so an exclusion constraint cannot express
        // the institution-wide seat (NULL ≠ NULL in gist) — this lock +
        // in-transaction re-check is the documented strategy.
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          `ulara_appointment_seat:${institutionId}:${position.id}:${input.orgUnitId ?? 'ALL'}`,
        );
        const existing = await tx.positionAppointment.findMany({
          where: {
            institutionId,
            positionId: position.id,
            ...(input.orgUnitId ? { orgUnitId: input.orgUnitId } : { orgUnitId: null }),
            status: { in: ['SCHEDULED', 'ACTIVE'] },
          },
          select: { startDate: true, endDate: true, status: true, acting: true },
        });
        if (appointmentConflicts(existing, next)) {
          throw new AppError(
            'APPOINTMENT_CONFLICT',
            'يوجد تعيين قائم لنفس المسمى في نفس الوحدة — أنهِه أولًا أو اجعل الجديد بالنيابة',
            409,
          );
        }
        const created = await tx.positionAppointment.create({
          data: {
            institutionId,
            personId: person.id,
            positionId: position.id,
            orgUnitId: input.orgUnitId ?? null,
            appointedByAuthority: input.appointedByAuthority ?? null,
            decisionNumber: input.decisionNumber ?? null,
            decisionDate: input.decisionDate ?? null,
            startDate: input.startDate,
            endDate: input.endDate ?? null,
            termMonths: input.termMonths ?? null,
            status: input.startDate.getTime() > Date.now() ? 'SCHEDULED' : 'ACTIVE',
            acting: input.acting ?? false,
            notes: input.notes ?? null,
            createdById: req.user!.id,
          },
          select: appointmentSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'appointment.create',
            resourceType: 'PositionAppointment',
            resourceId: created.id,
            metadata: {
              personId: person.id, positionCode: position.code,
              orgUnitId: input.orgUnitId ?? null, acting: input.acting ?? false,
            },
          },
        });
        return created;
      });
      res.status(201).json({ data: appointment });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(
          AppError.conflict('يوجد تعيين قائم لنفس المسمى في نفس الوحدة — أنهِه أولًا أو اجعل الجديد بالنيابة'),
        );
      }
      next(e);
    }
  },
);

/** Resolve an appointment in the caller's institution. */
async function requireAppointment(institutionId: string, id: string) {
  const appointment = await prisma.positionAppointment.findUnique({
    where: { id },
    select: { ...appointmentSelect, institutionId: true },
  });
  if (!appointment || appointment.institutionId !== institutionId) {
    throw AppError.notFound('التعيين المطلوب غير موجود');
  }
  return appointment;
}

router.get('/appointments/:id', async (req, res, next) => {
  try {
    const appointment = await requireAppointment(req.institution!.id, req.params.id!);
    const detail = await prisma.positionAppointment.findUnique({
      where: { id: appointment.id },
      select: {
        ...appointmentSelect,
        person: { select: { id: true, fullNameAr: true, fullNameEn: true, category: true } },
        position: { select: { id: true, code: true, titleAr: true, titleEn: true, category: true, scopeRequirement: true } },
        orgUnit: { select: { id: true, nameAr: true, type: true } },
      },
    });
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/appointments/:id/end',
  requireCapability('APPOINTMENTS_MANAGE'),
  validate(appointmentEndSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireAppointment(institutionId, req.params.id!);
      if (existing.status === 'ENDED' || existing.status === 'CANCELLED') {
        throw AppError.conflict('التعيين منتهٍ أو ملغى مسبقًا');
      }
      const input = req.body as z.infer<typeof appointmentEndSchema>;
      const appointment = await prisma.$transaction(async (tx) => {
        const updated = await tx.positionAppointment.update({
          where: { id: existing.id },
          data: {
            status: 'ENDED',
            endDate: input.endDate,
            ...(input.notes ? { notes: input.notes } : {}),
          },
          select: appointmentSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'appointment.end',
            resourceType: 'PositionAppointment',
            resourceId: existing.id,
            metadata: { endDate: input.endDate.toISOString() },
          },
        });
        return updated;
      });
      res.json({ data: appointment });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/appointments/:id/cancel',
  requireCapability('APPOINTMENTS_MANAGE'),
  validate(appointmentCancelSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requireAppointment(institutionId, req.params.id!);
      if (existing.status === 'CANCELLED') {
        throw AppError.conflict('التعيين ملغى مسبقًا');
      }
      const input = req.body as z.infer<typeof appointmentCancelSchema>;
      const appointment = await prisma.$transaction(async (tx) => {
        const updated = await tx.positionAppointment.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED', ...(input.notes ? { notes: input.notes } : {}) },
          select: appointmentSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'appointment.cancel',
            resourceType: 'PositionAppointment',
            resourceId: existing.id,
            metadata: { notes: input.notes ?? null },
          },
        });
        return updated;
      });
      res.json({ data: appointment });
    } catch (e) {
      next(e);
    }
  },
);

// One person's full appointment history.
router.get('/people/:id/appointments', async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const person = await prisma.institutionalPerson.findUnique({
      where: { id: req.params.id! },
      select: { id: true, institutionId: true },
    });
    if (!person || person.institutionId !== institutionId) {
      throw AppError.notFound('السجل الشخصي المطلوب غير موجود');
    }
    const data = await prisma.positionAppointment.findMany({
      where: { personId: person.id },
      select: {
        ...appointmentSelect,
        position: { select: { id: true, code: true, titleAr: true, titleEn: true } },
        orgUnit: { select: { id: true, nameAr: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

export default router;
