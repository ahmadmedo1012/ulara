/**
 * r326 M2.6 — Expo push device registration (additive; the contract from
 * apps/mobile/docs/push-backend-proposal.md, implemented verbatim).
 *
 *   POST   /me/push-devices      — upsert by expoToken (re-registrations
 *                                  after reinstall dedupe naturally)
 *   GET    /me/push-devices      — the caller's devices (masked token)
 *   DELETE /me/push-devices/:id  — unregister (call on logout; a handed-
 *                                  over phone must not keep pushing)
 *
 * All three require auth; tokens are scoped to the caller; the send path
 * (Expo fan-out) is gated separately by PUSH_ENABLED and lands with the
 * client wiring — registration alone changes nothing for the web.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../modules/notifications/preferences.js';

const router = Router();
router.use(authMiddleware);

const upsertBody = z
  .object({
    expoToken: z.string().trim().min(20).max(200),
    platform: z.enum(['ANDROID', 'IOS', 'WEB']),
    appVersion: z.string().max(40).optional(),
  })
  .strict();

router.post('/me/push-devices', validate(upsertBody), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof upsertBody>;
    const device = await prisma.pushDevice.upsert({
      where: { expoToken: b.expoToken },
      create: {
        userId: req.user!.id,
        expoToken: b.expoToken,
        platform: b.platform,
        appVersion: b.appVersion ?? null,
      },
      update: {
        // A reinstall re-registers the same token for a possibly different
        // account — the latest registrant owns the device row.
        userId: req.user!.id,
        platform: b.platform,
        appVersion: b.appVersion ?? null,
        lastSeenAt: new Date(),
      },
    });
    res.status(201).json({ data: { id: device.id, platform: device.platform } });
  } catch (e) {
    next(e);
  }
});

router.get('/me/push-devices', async (req, res, next) => {
  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId: req.user!.id },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, platform: true, appVersion: true, lastSeenAt: true, createdAt: true },
    });
    res.json({ data: devices });
  } catch (e) {
    next(e);
  }
});

router.delete('/me/push-devices/:id', async (req, res, next) => {
  try {
    const device = await prisma.pushDevice.findUnique({ where: { id: req.params.id! } });
    if (!device || device.userId !== req.user!.id) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
      return;
    }
    await prisma.pushDevice.delete({ where: { id: device.id } });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;

// ── r359 A4 — notification preferences ──────────────────────────────
//   GET /me/notification-preferences — the effective set (defaults when
//                                    no row exists — fail-open to the
//                                    pre-r359 behavior)
//   PUT /me/notification-preferences — upsert the caller's own row
//
// The push fan-out consults these BEFORE any Expo traffic; the weekly
// email digest reads emailDigest (opt-in, default false).
const preferenceBody = z
  .object({
    pushUrgent: z.boolean().optional(),
    pushAcademic: z.boolean().optional(),
    pushSystem: z.boolean().optional(),
    pushSocial: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some(Boolean), {
    message: 'أرسل تفضيلًا واحدًا على الأقل',
  });

router.get('/me/notification-preferences', async (req, res, next) => {
  try {
    const row = await prisma.userNotificationPreference.findUnique({
      where: { userId: req.user!.id },
    });
    res.json({
      data:
        row ?? {
          userId: req.user!.id,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        },
    });
  } catch (e) {
    next(e);
  }
});

router.put('/me/notification-preferences', validate(preferenceBody), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof preferenceBody>;
    const row = await prisma.userNotificationPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...b },
      update: { ...b },
    });
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
});
