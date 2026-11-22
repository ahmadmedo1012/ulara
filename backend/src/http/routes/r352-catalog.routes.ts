/**
 * r352 — public reference catalogs (seeded, legally grounded).
 *
 * Mounted at '/api/v1/catalog' (see app.ts — BEFORE the authed
 * broad-mount routers; these are read-only Bearer surfaces with no
 * institution context requirement):
 *   GET /catalog/institution-types
 *   GET /catalog/regulatory-authorities
 *   GET /catalog/credential-types
 *   GET /catalog/position-templates
 *   GET /catalog/accreditation-criteria-sets
 */
import { Router } from 'express';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/institution-types', async (_req, res, next) => {
  try {
    const data = await prisma.institutionType.findMany({
      include: { defaultAuthority: { select: { id: true, code: true, nameAr: true } } },
      orderBy: { sector: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/regulatory-authorities', async (_req, res, next) => {
  try {
    const data = await prisma.regulatoryAuthority.findMany({ orderBy: { code: 'asc' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/credential-types', async (_req, res, next) => {
  try {
    const data = await prisma.credentialType.findMany({ orderBy: { level: 'asc' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/position-templates', async (_req, res, next) => {
  try {
    const data = await prisma.positionTemplate.findMany({ orderBy: { code: 'asc' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/accreditation-criteria-sets', async (_req, res, next) => {
  try {
    const data = await prisma.accreditationCriteriaSet.findMany({
      include: {
        authority: { select: { id: true, code: true, nameAr: true } },
        items: { orderBy: { sortOrder: 'asc' }, select: { id: true, code: true, titleAr: true, description: true } },
      },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

export default router;
