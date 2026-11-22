/**
 * r352 — the institutional people API (the 10 statutory staff
 * categories of Law 21/2023 Arts. 2 & 50).
 *
 * Mounted at '/api/v1/institutional' (people + appointments routers
 * share the prefix; no path collisions — boot-verified):
 *   GET/POST /people, GET/PATCH /people/:id, POST /people/:id/status
 *   GET       /people/:id/appointments (history — appointments router)
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
  peopleListSchema,
  personCreateSchema,
  personUpdateSchema,
  personStatusSchema,
} from '../../modules/r352/dto.js';

const router = Router();

router.use(authMiddleware, requireInstitution);

const personSelect = {
  id: true, institutionId: true, userId: true, staffNumber: true,
  fullNameAr: true, fullNameEn: true, category: true, primaryOrgUnitId: true,
  staffStatus: true, hiredAt: true, endedAt: true, email: true, phone: true,
  notes: true, createdAt: true, updatedAt: true,
} as const;

/** Validate that an org unit belongs to the caller's institution. */
async function requireOrgUnitInInstitution(institutionId: string, orgUnitId: string): Promise<void> {
  const unit = await prisma.organizationalUnit.findUnique({
    where: { id: orgUnitId },
    select: { institutionId: true },
  });
  if (!unit || unit.institutionId !== institutionId) {
    throw new AppError(
      'PERSON_UNIT_NOT_IN_INSTITUTION',
      'الوحدة التنظيمية المحددة لا تنتمي إلى مؤسستك',
      400,
    );
  }
}

router.get('/people', validate(peopleListSchema, 'query'), async (req, res, next) => {
  try {
    const institutionId = req.institution!.id;
    const { page, limit, q, category, status, orgUnitId } = req.query as unknown as z.infer<typeof peopleListSchema>;
    const where: Prisma.InstitutionalPersonWhereInput = {
      institutionId,
      ...(category ? { category } : {}),
      ...(status ? { staffStatus: status } : {}),
      ...(orgUnitId ? { primaryOrgUnitId: orgUnitId } : {}),
      ...(q
        ? {
            OR: [
              { fullNameAr: { contains: q } },
              { fullNameEn: { contains: q } },
              { staffNumber: { contains: q } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.institutionalPerson.count({ where }),
      prisma.institutionalPerson.findMany({
        where,
        select: personSelect,
        orderBy: { fullNameAr: 'asc' },
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
  '/people',
  requireCapability('PEOPLE_MANAGE'),
  validate(personCreateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const input = req.body as z.infer<typeof personCreateSchema>;
      if (input.primaryOrgUnitId) {
        await requireOrgUnitInInstitution(institutionId, input.primaryOrgUnitId);
      }
      if (input.userId) {
        const linked = await prisma.institutionalPerson.findUnique({
          where: { institutionId_userId: { institutionId, userId: input.userId } },
          select: { id: true },
        });
        if (linked) {
          throw new AppError(
            'PERSON_USER_ALREADY_LINKED',
            'هذا المستخدم مرتبط مسبقًا بسجل شخص في مؤسستك',
            409,
          );
        }
        // Link integrity (the §3.2 rule the grant surface already enforces):
        // the account must be an ACTIVE member of THIS institution — never
        // a foreign user, never a dangling id (this also keeps the FK
        // violation path unreachable; unknown ids fail as a clean 400).
        const membership = await prisma.membership.findFirst({
          where: {
            userId: input.userId,
            institutionId,
            isActive: true,
            institution: { status: 'ACTIVE' },
          },
          select: { id: true },
        });
        if (!membership) {
          throw new AppError(
            'USER_NOT_MEMBER',
            'لا يمكن ربط السجل الشخصي بمستخدم ليس عضوًا نشطًا في هذه المؤسسة',
            400,
          );
        }
      }
      const person = await prisma.$transaction(async (tx) => {
        const created = await tx.institutionalPerson.create({
          data: {
            institutionId,
            fullNameAr: input.fullNameAr,
            fullNameEn: input.fullNameEn ?? null,
            category: input.category,
            staffNumber: input.staffNumber ?? null,
            userId: input.userId ?? null,
            primaryOrgUnitId: input.primaryOrgUnitId ?? null,
            hiredAt: input.hiredAt ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            notes: input.notes ?? null,
          },
          select: personSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'person.create',
            resourceType: 'InstitutionalPerson',
            resourceId: created.id,
            metadata: { fullNameAr: created.fullNameAr, category: created.category },
          },
        });
        return created;
      });
      res.status(201).json({ data: person });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رقم الموظف مرتبط مسبقًا بشخص آخر في مؤسستك'));
      }
      next(e);
    }
  },
);

/** Resolve a person inside the caller's institution (404 otherwise). */
async function requirePerson(institutionId: string, personId: string) {
  const person = await prisma.institutionalPerson.findUnique({
    where: { id: personId },
    select: { ...personSelect, institutionId: true },
  });
  if (!person || person.institutionId !== institutionId) {
    throw AppError.notFound('السجل الشخصي المطلوب غير موجود');
  }
  return person;
}

router.get('/people/:id', async (req, res, next) => {
  try {
    const person = await requirePerson(req.institution!.id, req.params.id!);
    const [appointments, unitCapabilityGrants] = await Promise.all([
      prisma.positionAppointment.findMany({
        where: { personId: person.id, status: { in: ['SCHEDULED', 'ACTIVE'] } },
        select: {
          id: true, positionId: true, orgUnitId: true, startDate: true,
          endDate: true, status: true, acting: true,
          position: { select: { id: true, code: true, titleAr: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 20,
      }),
      person.userId
        ? prisma.unitCapabilityGrant.findMany({
            where: { userId: person.userId, institutionId: person.institutionId, isActive: true },
            select: { id: true, capability: true, orgUnitId: true, reason: true },
          })
        : Promise.resolve([]),
    ]);
    res.json({ data: { person, appointments, unitCapabilityGrants } });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/people/:id',
  requireCapability('PEOPLE_MANAGE'),
  validate(personUpdateSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requirePerson(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof personUpdateSchema>;
      if (input.primaryOrgUnitId) {
        await requireOrgUnitInInstitution(institutionId, input.primaryOrgUnitId);
      }
      const person = await prisma.$transaction(async (tx) => {
        const updated = await tx.institutionalPerson.update({
          where: { id: existing.id },
          data: {
            ...(input.fullNameAr !== undefined ? { fullNameAr: input.fullNameAr } : {}),
            ...(input.fullNameEn !== undefined ? { fullNameEn: input.fullNameEn } : {}),
            ...(input.category !== undefined ? { category: input.category } : {}),
            ...(input.staffNumber !== undefined ? { staffNumber: input.staffNumber } : {}),
            ...(input.primaryOrgUnitId !== undefined ? { primaryOrgUnitId: input.primaryOrgUnitId } : {}),
            ...(input.hiredAt !== undefined ? { hiredAt: input.hiredAt } : {}),
            ...(input.email !== undefined ? { email: input.email } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
          select: personSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'person.update',
            resourceType: 'InstitutionalPerson',
            resourceId: existing.id,
            metadata: { changes: input },
          },
        });
        return updated;
      });
      res.json({ data: person });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return next(AppError.conflict('رقم الموظف مرتبط مسبقًا بشخص آخر في مؤسستك'));
      }
      next(e);
    }
  },
);

router.post(
  '/people/:id/status',
  requireCapability('PEOPLE_MANAGE'),
  validate(personStatusSchema),
  async (req, res, next) => {
    try {
      const institutionId = req.institution!.id;
      const existing = await requirePerson(institutionId, req.params.id!);
      const input = req.body as z.infer<typeof personStatusSchema>;
      const person = await prisma.$transaction(async (tx) => {
        const updated = await tx.institutionalPerson.update({
          where: { id: existing.id },
          data: {
            staffStatus: input.status,
            ...(input.status === 'ENDED' && input.endedAt ? { endedAt: input.endedAt } : {}),
          },
          select: personSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            institutionId,
            action: 'person.status',
            resourceType: 'InstitutionalPerson',
            resourceId: existing.id,
            metadata: { status: input.status },
          },
        });
        return updated;
      });
      res.json({ data: person });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
export { requirePerson };
