/**
 * r323 B5 — the public status surface. r342 t08 — split into TWO
 * endpoints with different jobs (the connectivity-honesty split):
 *
 *   · `GET /ping` — LIVENESS ONLY: answers 200 from the process itself,
 *     with ZERO database work. This is the mobile NetInfo probe's
 *     target (apps/mobile/src/lib/resilience/network.tsx): a periodic
 *     connectivity probe must not perform a DB round trip (the old
 *     /status probe ran `SELECT 1` on every reachability check), and a
 *     sleepy Neon must not read as «server down». 2xx = the API
 *     process is reachable — that is ALL it proves.
 *
 *   · `GET /status` — the pilot's «حالة المنصة» card + the min-version
 *     gate: DB latency (same 5s race as /health), the ACTIVE driver/mode
 *     names (never keys), the build id, the server time, and the
 *     minAppVersion/updateUrl pair. No secrets, no counts, no user data —
 *     «is it up, which mode is it in, and is the DB healthy?».
 *
 * Mount order (app.ts, verified r342): BOTH routes mount AFTER the global
 * API limiter (1000 req / 15 min / IP) and BEFORE the auth routers. The
 * old docblock here claimed «mounted BEFORE the global limiter» — that
 * was a lie against the source: app.ts applies `app.use('/api/v1',
 * globalRateLimiter)` first. The budget is ample for both jobs: the
 * mobile probe is change-driven (NetInfo fires on network transitions,
 * not on a timer), the keep-warm cron pings once, and the status card is
 * a single user-initiated read.
 */
import { Router } from 'express';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { buildIdFromEnv } from '../../lib/build-id.js';
import { RUNTIME_PDF_MAX_BYTES } from '../../lib/pdf-limits.js';
import { logger } from '../../logger.js';

const router = Router();

const BUILD_ID = buildIdFromEnv(env.RENDER_GIT_COMMIT ?? env.VERCEL_GIT_COMMIT_SHA ?? env.GIT_SHA);

/**
 * Liveness (r342 t08) — the DB-FREE half of the status surface.
 *
 * Contract: 200 + the standard `{ data: … }` envelope, always. No Prisma
 * call, no timer, no secrets — the handler is a pure synchronous JSON
 * response, so a completely dead database cannot change its verdict and
 * a flood cannot cost a DB round trip. The mobile reachability probe
 * (NetInfo reachabilityUrl) targets THIS route; /status stays the
 * health+metadata read.
 */
router.get('/ping', (_req, res) => {
  res.status(200).json({
    data: {
      ok: true,
      buildId: BUILD_ID,
      serverTime: new Date().toISOString(),
    },
  });
});

router.get('/status', async (_req, res) => {
  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;
  let dbOk = true;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('status timeout')), 5_000);
      }),
    ]);
  } catch (err) {
    dbOk = false;
    logger.warn({ err }, 'status: db ping failed');
  } finally {
    if (timer) clearTimeout(timer);
  }

  res.json({
    data: {
      ok: dbOk,
      db: { ok: dbOk, latencyMs: dbOk ? Date.now() - start : null },
      // Mode names only — never endpoints, keys, or counts.
      storageDriver: env.STORAGE_DRIVER,
      aiMode: env.AI_PROVIDER,
      mailProvider: env.MAIL_PROVIDER,
      buildId: BUILD_ID,
      serverTime: new Date().toISOString(),
      // Ω+2.0 — the host-honest PDF transfer ceiling (lib/pdf-limits.ts):
      // 4 MiB on Vercel (the platform's 4.5 MB function-body wall), the
      // full 20 MiB product cap elsewhere. Clients mirror this instead
      // of hardcoding (frontend pdfUpload.ts derives it from the
      // same-origin host; the mobile app from its API base).
      maxPdfUploadBytes: RUNTIME_PDF_MAX_BYTES,
      // r326 M0.7 — the mobile minimum-version gate: the native app
      // compares its semver on cold start; below minAppVersion it shows
      // the blocking «يلزم تحديث التطبيق» screen pointing at updateUrl.
      // Unset MIN_APP_VERSION = no gate (bare-clone/dev default).
      minAppVersion: env.MIN_APP_VERSION ?? null,
      updateUrl: env.APP_DOWNLOAD_URL ?? 'https://ulara.vercel.app/app',
    },
  });
});

export default router;
