import { Router } from 'express';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import {
  forgotPasswordEmailRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  changePasswordRateLimiter,
  authRateLimiter,
} from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  selectInstitutionSchema,
} from '../../modules/auth/auth.dto.js';
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
  selectInstitution,
} from '../../modules/auth/auth.service.js';
// P6 — session ledger surface (list + per-session revoke).
import { listUserSessions, revokeSessionForOwner } from '../../modules/auth/sessions.js';
import { requestPasswordReset, resetPassword, TOKEN_TTL_MS } from '../../modules/auth/password-reset.service.js';
import { isTestAccountEmail } from '../../modules/auth/test-accounts.data.js';
import { mailConfig, renderResetEmail, sendMail } from '../../lib/mail.js';
import { parseDurationMs, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import { emailLogRef } from '../../lib/privacy.js';
// r359 A4 — the email verification flow (single-use 48h tokens).
import { consumeVerificationToken, issueVerificationEmail } from '../../modules/email/outbox.js';
import { z } from 'zod';

/** The reset email's stated lifetime in minutes (mirrors TOKEN_TTL_MS). */
const MAIL_TTL_MINUTES = Math.round(TOKEN_TTL_MS / 60_000);

const router = Router();

/**
 * The refresh cookie: `ulara_refresh` — the ONE spelling (the retired
 * pre-ULARA fallback branch was removed; dev-phase clients re-login
 * once). Login/register/refresh/select-institution/change-password SET
 * only this name (httpOnly, secure in prod, sameSite strict, path
 * /api/v1/auth, maxAge = jwtRefreshTtl).
 */
const REFRESH_COOKIE = 'ulara_refresh';

// Derived from the SAME string jsonwebtoken signs the refresh token with
// (env.jwtRefreshTtl) — the cookie must die with its token, not before
// (stranded valid tokens) or after (client keeps shipping dead tokens).
// Previously a second, hardcoded 7d copy lived here (audit 11-a P2-10).
const REFRESH_COOKIE_MAX_AGE_MS = parseDurationMs(env.jwtRefreshTtl);

const setRefreshCookie = (res: import('express').Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

router.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    setRefreshCookie(res, refreshToken);
    // r359 A4 — verification mail rides the registration (best-effort,
    // fire-and-forget: a mail outage must never fail the signup).
    if (env.APP_ORIGIN) {
      void issueVerificationEmail(prisma, user.id, env.APP_ORIGIN).catch(() => undefined);
    }
    res.status(201).json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {

    // IP + UA feed the LoginEvent telemetry rows (/owner/login-analytics).
    // institutionSlug (optional) disambiguates reg-numbers registered in
    // several institutions (r178).
    const { user, accessToken, refreshToken } = await loginUser(
      req.body.email,
      req.body.password,
      { ip: req.ip, userAgent: req.header('user-agent') },
      req.body.institutionSlug,
    );

    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

/**
 * r178: pick the institution context for the session (multi-membership
 * users). Verifies an ACTIVE membership in an ACTIVE institution
 * server-side, then mints fresh tokens carrying the `inst` claim + the
 * full user payload (same shape as login). Same refresh version —
 * selecting an institution is not a revocation event (D3 untouched).
 */
router.post(
  '/select-institution',
  authMiddleware,
  authRateLimiter,
  validate(selectInstitutionSchema),
  async (req, res, next) => {
    try {
      const { user, accessToken, refreshToken } = await selectInstitution(
        req.user!.id,
        req.body.institutionId,
        {
          ip: req.ip,
          userAgent: req.header('user-agent'),
          // P6 — the presented cookie lets the mint keep the device's
          // session-row identity (one row per device, not one per select).
          refreshToken: req.cookies?.[REFRESH_COOKIE],
        },
      );
      setRefreshCookie(res, refreshToken);
      res.json({ data: { user, accessToken } });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Password change for the authenticated user.
 *
 * - argon2-verifies the CURRENT password first (never trust a live
 *   session alone — shared machines),
 * - enforces the shared password policy (same schema as register),
 * - updates the hash and bumps tokenVersion in ONE atomic conditional
 *   write (D3 revocation event): every OTHER device's refresh cookie
 *   dies, while this device seamlessly continues on the fresh tokens
 *   issued below (cookie rotated + new access token returned).
 *
 * Brute-force guard (r170c): changePasswordRateLimiter — 10 FAILED
 * attempts / 15 min keyed per USER (authMiddleware runs first, so the
 * key is the token identity). It replaces the IP-keyed authRateLimiter
 * here: this route's brute-force scenario is a stolen access token
 * guessing the current password, and a per-IP cap is the weaker bound
 * (fan-out / shared edge IPs) — see middleware/rateLimit.ts. The login
 * lockout counters intentionally stay untouched (auth.service.ts).
 */
router.post(
  '/change-password',
  authMiddleware,
  changePasswordRateLimiter,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { user, accessToken, refreshToken } = await changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword,
      );
      setRefreshCookie(res, refreshToken);
      res.json({ data: { user, accessToken } });
    } catch (e) {
      next(e);
    }
  },
);

// Refresh gets the same strict limiter as login/register (audit 11-c
// P2-4): legitimate clients refresh at most once per access-TTL per
// device and successful refreshes are skipped by the limiter, so only
// replay/brute-force attempts against the cookie are ever counted.
router.post('/refresh', authRateLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] || '';
    if (!token) throw AppError.unauthenticated('جلسة غير صالحة — سجّل الدخول من جديد');
    const { user, accessToken, refreshToken } = await refreshTokens(token, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

/**
 * Logout must work with EITHER credential:
 *  - a valid access token (normal case), or
 *  - just the refresh cookie (access token expired — the exact moment a
 *    user is most likely to click "logout"). The old hard authMiddleware
 *    401'd them and left the refresh cookie live for up to 7 more days.
 *
 * We clear the cookie unconditionally and revoke the refresh token
 * whenever it is parseable; unparseable tokens are ignored (the cookie
 * is being cleared anyway).
 */
router.post('/logout', optionalAuthMiddleware, async (req, res, _next) => {
  // Revoke via access-token identity if present...
  if (req.user) {
    try {
      await logoutUser(req.user.id);
    } catch {
      // Revoke is best-effort — the cookie clear below is the guarantee.
    }
  } else {
    // ...otherwise try to revoke via the refresh cookie.
    const token = req.cookies?.[REFRESH_COOKIE] || '';
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await logoutUser(payload.sub);
      } catch {
        // Expired / tampered / rotated refresh token — nothing to revoke.
      }
    }
  }
  // Clear the cookie — the one name that is ever set.
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).end();
});

/**
 * R320 §D (PAGES-GAP §5) — step 1 of the forgot-password flow.
 *
 * NO USER ENUMERATION: the 200 envelope is byte-identical whether the
 * email is registered or not (the service burns equal crypto + a
 * same-shape DB visit on the unknown path; the generic Arabic copy
 * never wavers). The dev-inbox link below is the ONE deliberate,
 * documented exception-shape — and it can only ever confirm what the
 * login panel already publishes.
 *
 * Delivery reality (verified: zero mail-provider code/dependencies in
 * the repo — see LEGAL-TODO.md rows 7/8): NO email is sent, by anyone,
 * today. Rather than pretend otherwise:
 *  - @test.ly addresses (the BOARD §C documented demo accounts,
 *    test-accounts.data.ts — their emails are ALREADY public in the
 *    login panel's demo list) AND ONLY when the account actually
 *    exists: the response carries `devInbox: { mode: 'test', url }` —
 *    the reset link itself, honestly labelled as test-mode. The @test.ly
 *    gate means this can never leak a real user's reset link; the
 *    exists-gate means an unknown @test.ly address answers link-less,
 *    same as every unknown address.
 *  - every other domain (known or unknown): generic 200, event logged
 *    server-side, and the PAGE copy states plainly that email delivery
 *    is not configured yet ([يُستكمل قبل الإطلاق] — LEGAL-TODO rows
 *    7/8). No code path silently fakes a send.
 *
 * Limiter stack: forgotPasswordRateLimiter (10/15min per IP, counts
 * EVERY request — the endpoint has no failure signal to skip on) THEN
 * forgotPasswordEmailRateLimiter (3/15min per submitted email — bounds
 * inbox-flooding per address across all source IPs).
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  forgotPasswordEmailRateLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const email = req.body.email as string;
      const token = await requestPasswordReset(email);

      const data: { message: string; devInbox?: { mode: 'test'; url: string } } = {
        message: 'إذا كان البريد مسجلًا فستصلك رسالة خلال دقائق',
      };
      /* r342 t14 (security sweep — the empirically verified leak):
       * the devInbox reset link is DEV/TEST-ONLY. In production this
       * response handed the RAW reset token to any unauthenticated
       * caller who knew a documented @test.ly address (owner@test.ly
       * included — a full platform-takeover primitive while
       * mailProvider=none). NODE_ENV=production (every real deploy)
       * now gets the same generic envelope as every other address;
       * local dev (NODE_ENV=development/test) keeps the honest
       * dev-inbox link the demo workflow relies on. */
      if (token && isTestAccountEmail(email) && env.NODE_ENV !== 'production') {
        // Test-mode link — @test.ly demo accounts only (reasoning in the
        // route docblock above). Origin comes from the requesting web
        // app itself (the browser always sends Origin on cross-origin
        // POSTs — dev Vite → API), validated to http(s) shape so a
        // garbage header can never reach the URL; the default is the
        // Vite dev port for direct curl-style callers.
        const rawOrigin =
          typeof req.headers.origin === 'string' && /^https?:\/\/[^/]+/.test(req.headers.origin)
            ? req.headers.origin
            : 'http://localhost:5173';
        const origin = rawOrigin.replace(/\/+$/, '');
        data.devInbox = {
          mode: 'test',
          url: `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`,
        };
      }
      /* r323 B3.2 — the REAL delivery path: when a mail provider is
       * configured (MAIL_PROVIDER=resend|brevo + MAIL_API_KEY), the
       * token emails to ANY registered address through the brand RTL
       * template. none-mode (the default) stays exactly as documented
       * above — a provider refusal lands in the server log and the
       * response stays the SAME generic 200 (never a leaky error). */
      if (token !== null && mailConfig.provider !== 'none') {
        const rawOrigin =
          typeof req.headers.origin === 'string' && /^https?:\/\/[^/]+/.test(req.headers.origin)
            ? req.headers.origin
            : (env.APP_ORIGIN ?? 'http://localhost:5173');
        const resetUrl = `${rawOrigin.replace(/\/+$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
        const mail = renderResetEmail(resetUrl, MAIL_TTL_MINUTES);
        const sent = await sendMail(mailConfig, { to: email, ...mail });
        // r370 (privacy): pseudonymous reference, never the raw address.
        if (!sent) logger.warn({ emailRef: emailLogRef(email) }, 'forgot-password: mail send failed — generic response kept');
      }
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * R320 §D (PAGES-GAP §5) — step 2: consume the token, set the new
 * password. Unknown / expired / used tokens all answer the SAME generic
 * Arabic refusal (no token-oracle — an attacker cannot distinguish a
 * once-valid-now-spent link from a never-existed one), and the service
 * does the rest atomically (single-use CAS claim, real password policy,
 * argon2 + tokenVersion bump + lockout counters in ONE conditional
 * write — see password-reset.service.ts). failed-only per-IP limiter:
 * the brute-force shape here is token guessing, so misses count and a
 * successful reset is free.
 */
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await resetPassword(req.body.token, req.body.password);
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

// ── r359 A4 — email verification ────────────────────────────────────
// POST /auth/verify-email { token } — PUBLIC (the mail link opens on
// any device/browser; no session assumed). Honest 200s: verified /
// already_verified; 400 with the reason for invalid/expired tokens.
const verifyEmailSchema = z
  .object({ token: z.string().trim().min(20).max(200) })
  .strict();
router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), async (req, res, next) => {
  try {
    const outcome = await consumeVerificationToken(prisma, (req.body as { token: string }).token);
    if (outcome === 'invalid' || outcome === 'expired') {
      throw AppError.badRequest(
        outcome === 'expired'
          ? 'انتهت صلاحية رابط التأكيد — أعد إرسال الرسالة من داخل التطبيق'
          : 'رابط التأكيد غير صالح — تأكد من نسخه كاملًا أو أعد الإرسال',
      );
    }
    res.json({ data: { status: outcome } });
  } catch (e) {
    next(e);
  }
});

// POST /auth/resend-verification — authenticated; rate-limited by the
// shared auth limiter (10/15min/IP). Honest outcomes, never a leak:
// already-verified users get the same 200 as a sent mail.
router.post('/resend-verification', authMiddleware, authRateLimiter, async (req, res, next) => {
  try {
    if (!env.APP_ORIGIN) {
      throw AppError.badRequest('قناة البريد غير مهيأة على هذا الخادم');
    }
    const outcome = await issueVerificationEmail(prisma, req.user!.id, env.APP_ORIGIN);
    res.json({
      data: {
        status:
          outcome === 'sent' ? 'sent' :
          outcome === 'already_verified' ? 'already_verified' :
          outcome === 'skipped_suppressed' ? 'unavailable' :
          'unavailable',
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // r178: /me resolves the membership context for the token's `inst`
    // claim (null = no context yet — client must select-institution).
    const user = await getCurrentUser(req.user!.id, req.user!.institutionId);
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

// ── P6 — session surface: list + per-session revocation ────────────

/**
 * GET /auth/sessions — the caller's ACTIVE sessions: one row per
 * device lineage (id, createdAt, lastUsedAt, userAgent, ip, current).
 *
 * DESIGN DECISION — how "current" is resolved: the access token is a
 * stateless HS256 JWT whose claims are sub/role/inst/type — there is
 * NO jti and no session identity in it, so the bearer token alone
 * cannot name a session row. The refresh cookie, however, rides EVERY
 * /api/v1/auth request (path-scoped), and its sha-256 hash IS the
 * UserSession row's identity — so the row matching the presented
 * cookie's hash is flagged current. No cookie (or no matching row) →
 * nothing is flagged (honest: e.g. the D3 bump has already killed
 * this device's lineage).
 *
 * Liveness is revokedAt IS NULL **and** tokenVersionSnapshot = the
 * user's CURRENT tokenVersion: the D3 global revocation events
 * (logout/password change/role change/deactivation) bump only the
 * user-level counter — the snapshot comparison hides their victims
 * here without those call sites ever touching the session table.
 */
router.get('/sessions', authMiddleware, async (req, res, next) => {
  try {
    const sessions = await listUserSessions(req.user!.id, req.cookies?.[REFRESH_COOKIE]);
    res.json({ data: sessions });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /auth/sessions/:id — revoke ONE of the caller's sessions.
 *
 * DESIGN DECISION (the D3 nuance): this deliberately does NOT bump
 * tokenVersion. The version is ONE user-level counter shared by every
 * device — bumping it here would kill the user's OTHER sessions within
 * one access-TTL, exactly the forced-logout bug D3 exists to prevent
 * (rotation.ts). Per-session revocation works because the refresh
 * route treats the session ROW as the source of truth: before issuing
 * it checks the presented hash's row, and a revokedAt row never mints
 * tokens again. The other devices keep sliding, untouched.
 *
 * Consequence (documented, intended): the revoked device's cookie is a
 * DEAD credential. If that device presents it again at /auth/refresh,
 * the reuse detector fires — all sessions revoked + tokenVersion
 * bumped (the standard theft response). A legitimately recovered
 * device must re-LOGIN (a fresh login opens a fresh lineage), never
 * replay the revoked cookie.
 *
 * When the deleted row IS the caller's own (matched by the refresh
 * cookie's hash, the same identity rule as GET /auth/sessions), the
 * response also CLEARS the refresh cookie: the caller's next refresh
 * becomes a plain "no session" 401 instead of a replay of a revoked
 * credential — deleting your current session is a clean single-device
 * logout that leaves the other devices alive.
 *
 * Ownership is enforced with a 404-shaped no-existence-leak: a foreign
 * id and a missing id answer identically (NOT_FOUND envelope).
 */
router.delete('/sessions/:id', authMiddleware, async (req, res, next) => {
  try {
    const { status, current } = await revokeSessionForOwner(
      req.user!.id,
      req.params.id!,
      req.cookies?.[REFRESH_COOKIE],
    );
    if (current) {
      // The caller revoked its own lineage — clear the now-dead cookie
      // so its next refresh is a plain reauth, not a theft replay.
      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    }
    res.json({ data: { ok: true, revoked: status, current } });
  } catch (e) {
    next(e);
  }
});

export default router;
