/**
 * Ulara API client — typed transport for https://ulara.vercel.app/api/v1.
 *
 * Backend contract (backend/src/app.ts + lib/errors.ts):
 *   success:   { data: T }            paginated: { data: T[], meta }
 *   error:     { error: { code, message, details? } }
 *   auth:      Authorization: Bearer <accessToken> (15-min JWT)
 *   refresh:   POST /auth/refresh with Cookie: ulara_refresh=<token>
 *              (httpOnly on web; the native client captures Set-Cookie and
 *               persists the value via SecureStore — no backend change needed).
 *
 * CORS: native requests carry no Origin header → allowed by the backend
 * allow-list policy (origin omitted ⇒ pass).
 */
import { AppNotification, PageMeta, Paginated } from "./types";
// r362 P1 — real-request evidence for the connectivity machine (see
// lib/resilience/serverLine). A probe is a synthetic request; the app's
// own traffic is the honest instrument for «the server is unreachable».
import { reportServerSignal } from "@/lib/resilience/serverLine";

export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  "https://ulara.vercel.app/api/v1";

/** The refresh cookie's name — the ONE spelling (the retired pre-ULARA
 * fallback was removed; dev-phase installs re-login once). */
const REFRESH_COOKIE = "ulara_refresh";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Offline / DNS / server-unreachable normalization with an Arabic message.
 * r342 t08 — the message claims ONLY what a transport failure proves:
 * the ULARA API could not be reached (never «تحقّق من اتصالك بالإنترنت» —
 * the evidence cannot distinguish a dead server from a dead network;
 * the connectivity layer owns that classification). */
export const NETWORK_ERROR = "NETWORK";
const networkMessage = "تعذّر الاتصال بخادم أُلارا حالياً — أعد المحاولة.";

export interface ApiAuthBridge {
  getAccessToken(): string | null;
  getRefreshCookie(): string | null;
  onSessionUpdate(payload: { user: unknown; accessToken: string; refreshCookie?: string | null }): void;
  onSessionExpired(): void;
}

let authBridge: ApiAuthBridge | null = null;
export function registerAuthBridge(bridge: ApiAuthBridge) {
  authBridge = bridge;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Raw body for binary payloads (PDF uploads). */
  rawBody?: ArrayBuffer | string;
  contentType?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  /** Auth-refresh retry is internal; guards one retry per request. */
  _isRetry?: boolean;
  _skipAuth?: boolean;
  /**
   * R353-2 §4 — paginated reads: return the WHOLE wire body
   * `{ data: T[], meta }` instead of unwrapping `data`, so `meta`
   * (total + totalPages) reaches the caller instead of being dropped
   * at the envelope seam. Default false: the ~90 pre-existing screens
   * keep the historical unwrap byte-for-byte (no blanket transport
   * behavior change — the regression boundary is getPaged consumers
   * only, all new).
   */
  paged?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

function extractRefreshCookie(res: Response): string | null {
  const raw =
    res.headers.get("set-cookie") ??
    (res.headers as unknown as Record<string, string>)["Set-Cookie"] ??
    "";
  if (!raw) return null;
  const header = Array.isArray(raw) ? raw.join("; ") : raw;
  const fresh = new RegExp(`${REFRESH_COOKIE}=([^;]+)`).exec(header);
  return fresh ? fresh[1] : null;
}

async function parseEnvelope<T>(res: Response, keepPaged = false): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new ApiError("BAD_JSON", text.slice(0, 200) || "استجابة غير صالحة", res.status);
      }
      throw new ApiError("BAD_JSON", "استجابة غير صالحة من الخادم", res.status, text.slice(0, 200));
    }
  }
  const obj = parsed as { error?: { code?: string; message?: string; details?: unknown }; data?: unknown; meta?: unknown } | null;
  if (!res.ok) {
    const code = obj?.error?.code ?? (res.status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR");
    const message = obj?.error?.message ?? `فشل الطلب (رمز ${res.status})`;
    throw new ApiError(code, message, res.status, obj?.error?.details);
  }
  // R327 A4 — unwrap the envelope by KEY PRESENCE, not truthiness:
  // `{ data: null }` must resolve to null. The old `obj?.data ?? obj`
  // returned the whole envelope (truthy!) for explicit data:null, so any
  // screen reading `q.data?.field.sub` crashed with "reading 'sub' of
  // undefined" — the post-login white-screen class on real devices
  // (e.g. /me/resume legitimately returns { data: null } for fresh users).
  //
  // R353-2 §4 — `paged: true` keeps a `{ data, meta }` body WHOLE (meta is
  // the pagination truth); key presence still decides, so `{ data: null }`
  // resolves to null either way.
  if (keepPaged && obj !== null && typeof obj === "object" && "data" in obj && "meta" in obj) {
    return obj as T;
  }
  if (obj !== null && typeof obj === "object" && "data" in obj) {
    return obj.data as T;
  }
  return obj as T;
}

/** Single-flight refresh — concurrent 401s share one /auth/refresh call. */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** A stalled /auth/refresh must never hang the single-flight promise
 * forever (every later 401 would await the same dead promise — the
 * frozen-app class). Bound it; on timeout the session degrades to
 * expiry + re-login instead of an indefinite spinner. */
const REFRESH_TIMEOUT_MS = 15_000;

/**
 * r362 P1 — THE REFRESH-FAILURE CLASSIFICATION (the constant sign-out
 * cure).
 *
 * The old transport answered a single boolean, so every way a refresh
 * can fail collapsed into «session over»: a DNS blip, a 15s abort, a
 * 503 while a Vercel function cold-starts, the auth rate limiter's 429
 * — all of them ran `onSessionExpired()` and wiped SecureStore. On a
 * Libyan mobile link that is the everyday case, not the exception: the
 * user was signed out for having bad signal.
 *
 * A failed refresh says ONE of two things, and they are not the same:
 *
 *   · DEFINITIVE — the endpoint itself refused the token (401/403 from
 *     `/auth/refresh`), or there is no refresh cookie left to send.
 *     Only this ends the session; the server has spoken about the
 *     credential, not about the network.
 *   · TRANSIENT — a thrown fetch (offline / DNS / TLS), an AbortError
 *     (the 15s budget), a 5xx (cold start, deploy in flight), a 429
 *     (`authRateLimiter`), or an unparseable 2xx body. The token may
 *     still be perfectly valid; the session is KEPT, the caller gets a
 *     recoverable error, and a bounded backoff ladder re-attempts the
 *     refresh on its own (plus on foreground / NetInfo regain via
 *     `retrySessionRefresh`).
 */
export type RefreshOutcome = { ok: true } | { ok: false; definitive: boolean };

/** The only statuses that mean «this refresh token is not valid». */
function isDefinitiveRefreshRefusal(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * The session is kept but its access token could not be re-minted yet
 * (a transient refresh failure). Screens surface it as a retryable
 * state; NOTHING is cleared. Module-scope so the recovery ladder and
 * the foreground/regain hook agree on whether work is outstanding.
 */
let sessionUnverified = false;

async function tryRefresh(): Promise<RefreshOutcome> {
  const bridge = authBridge;
  if (!bridge) return { ok: false, definitive: false };
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshOutcome> => {
      const cookie = bridge.getRefreshCookie();
      // No cookie at all: there is no credential to renew with. This is
      // the one non-HTTP definitive answer.
      if (!cookie) return { ok: false, definitive: true };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `${REFRESH_COOKIE}=${cookie}` },
          body: "{}",
          signal: controller.signal,
        });
        // A response arrived — the server is reachable, whatever it said.
        reportServerSignal("reachable");
        if (!res.ok) {
          // 401/403 = the endpoint refused the token (definitive).
          // 5xx/429/anything else = the endpoint could not answer
          // (transient) — the session survives.
          return { ok: false, definitive: isDefinitiveRefreshRefusal(res.status) };
        }
        const data = await parseEnvelope<{ user: unknown; accessToken: string }>(res);
        const newCookie = extractRefreshCookie(res);
        // Rotation: the server always sets a fresh cookie; the OLD value
        // is the fallback only when the response carried none (a
        // proxy stripping Set-Cookie must not strand the next refresh).
        bridge.onSessionUpdate({ user: data.user, accessToken: data.accessToken, refreshCookie: newCookie ?? cookie });
        return { ok: true };
      } catch {
        // Offline, DNS, TLS, abort, bad body — never proof about the token.
        reportServerSignal("unreachable");
        return { ok: false, definitive: false };
      } finally {
        clearTimeout(timer);
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/* ── the bounded recovery ladder (r362 P1) ───────────────────────────── */

/** Re-attempt delays after a TRANSIENT refresh failure, then stop. The
 *  ladder is the «it will fix itself» half of the promise the banner
 *  makes; it never runs for a definitive refusal (nothing to retry). */
let retryLadder: readonly number[] = [1_500, 4_000, 10_000];
let retryStep = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearSessionRefreshRetry(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryStep = 0;
}

function scheduleSessionRefreshRetry(): void {
  if (retryTimer !== null) return; // one in flight is enough
  const delay = retryLadder[retryStep];
  if (delay === undefined) return; // ladder exhausted — leave it to the caller
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    retryStep += 1;
    const outcome = await tryRefresh();
    if (outcome.ok) {
      sessionUnverified = false;
      retryStep = 0;
      return;
    }
    if (outcome.definitive) {
      sessionUnverified = false;
      retryStep = 0;
      authBridge?.onSessionExpired();
      return;
    }
    scheduleSessionRefreshRetry();
  }, delay);
  // A recovery timer must never hold a Node/jest process open.
  (retryTimer as unknown as { unref?: () => void }).unref?.();
}

/**
 * Foreground / NetInfo-regain entry point (r362 P1): re-attempt the
 * refresh ONLY while a transient failure left the session unverified —
 * a healthy session must never be rotated gratuitously. Returns whether
 * the session is freshly verified. Cheap and idempotent: safe to call
 * from every AppState `active` and every connectivity regain.
 */
export async function retrySessionRefresh(): Promise<boolean> {
  const bridge = authBridge;
  if (!bridge || !sessionUnverified) return false;
  clearSessionRefreshRetry();
  const outcome = await tryRefresh();
  if (outcome.ok) {
    sessionUnverified = false;
    return true;
  }
  if (outcome.definitive) {
    sessionUnverified = false;
    bridge.onSessionExpired();
    return false;
  }
  scheduleSessionRefreshRetry();
  return false;
}

/** True while the session is kept but its access token is not renewed yet. */
export function isSessionUnverified(): boolean {
  return sessionUnverified;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, rawBody, contentType, query, timeoutMs = 20_000, _isRetry, _skipAuth } = opts;
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {};
  if (rawBody === undefined && body !== undefined) headers["Content-Type"] = "application/json";
  if (contentType) headers["Content-Type"] = contentType;
  const token = authBridge?.getAccessToken();
  if (token && !_skipAuth) headers["Authorization"] = `Bearer ${token}`;
  // Replay the refresh cookie on auth-family requests (login/refresh benefit;
  // harmless elsewhere, and refresh REQUIRES it).
  const refreshCookie = authBridge?.getRefreshCookie();
  if (refreshCookie) headers["Cookie"] = `${REFRESH_COOKIE}=${refreshCookie}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    reportServerSignal("reachable");
    if (res.status === 401 && !_isRetry && !path.startsWith("/auth/")) {
      const outcome = await tryRefresh();
      if (outcome.ok) {
        sessionUnverified = false;
        clearSessionRefreshRetry();
        return api<T>(path, { ...opts, _isRetry: true });
      }
      if (outcome.definitive) {
        // The server refused the credential — the session is really over.
        sessionUnverified = false;
        clearSessionRefreshRetry();
        authBridge?.onSessionExpired();
        throw new ApiError("UNAUTHENTICATED", "انتهت صلاحية الجلسة — سجّل الدخول من جديد", 401);
      }
      // r362 P1 — TRANSIENT: the session is KEPT. Never call
      // onSessionExpired here: a flaky link is not a logout. Surface a
      // recoverable error and let the backoff ladder (plus foreground /
      // NetInfo regain) re-attempt the refresh without user action.
      sessionUnverified = true;
      scheduleSessionRefreshRetry();
      throw new ApiError(
        "SESSION_UNVERIFIED",
        "تعذّر تجديد الجلسة مؤقتاً — سيُعاد المحاولة تلقائياً عند عودة الاتصال.",
        0,
      );
    }
    return await parseEnvelope<T>(res, opts.paged ?? false);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Transport failure: the only evidence that may feed the server line.
    reportServerSignal("unreachable");
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "انتهت مهلة الطلب — حاول مجدداً", 0);
    }
    throw new ApiError(NETWORK_ERROR, networkMessage, 0);
  } finally {
    // R327 A4: the timeout timer MUST be cleared — it was leaking a live
    // 20s handle (and the AbortController) on every request.
    clearTimeout(timer);
  }
}

/**
 * Capture a fresh refresh cookie from a session-establishing response.
 *
 * R336 A2: this transport carries the LOGIN/REGISTER journey, so it gets
 * the SAME AbortController + timeout discipline as api() — a stalled
 * POST /auth/login used to leave the submit button spinning forever
 * (no timeout escape, the literal freeze-at-login class). The dead
 * 401 fall-through block is retired with it.
 */
export async function apiWithCookieCapture<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; refreshCookie: string | null }> {
  const { timeoutMs = 20_000 } = opts;
  const url = buildUrl(path, opts.query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {};
  if (opts.rawBody === undefined && opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.contentType) headers["Content-Type"] = opts.contentType;
  const token = authBridge?.getAccessToken();
  if (token && !opts._skipAuth) headers["Authorization"] = `Bearer ${token}`;
  const cookie = authBridge?.getRefreshCookie();
  if (cookie) headers["Cookie"] = `${REFRESH_COOKIE}=${cookie}`;
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.rawBody !== undefined ? opts.rawBody : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    reportServerSignal("reachable");
    const data = await parseEnvelope<T>(res);
    return { data, refreshCookie: extractRefreshCookie(res) };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    reportServerSignal("unreachable");
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "انتهت مهلة الطلب — حاول مجدداً", 0);
    }
    throw new ApiError(NETWORK_ERROR, networkMessage, 0);
  } finally {
    clearTimeout(timer);
  }
}

export const get = <T>(path: string, query?: RequestOptions["query"]) => api<T>(path, { method: "GET", query });
export const post = <T>(path: string, body?: unknown, extra?: Partial<RequestOptions>) =>
  api<T>(path, { method: "POST", body, ...extra });
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });
export const put = <T>(path: string, body?: unknown) => api<T>(path, { method: "PUT", body });
export const del = <T>(path: string, body?: unknown) => api<T>(path, { method: "DELETE", body });

/** R353-2 §4 — the paginated GET the institutional family rides: keeps
 *  `{ data, meta }` whole (see getPage). */
export const getPaged = <T>(path: string, query?: RequestOptions["query"]) =>
  api<Paginated<T>>(path, { method: "GET", query, paged: true });

/** Paginated GET returning rows + meta.
 *  R353-2 §4 — the honest shape: `paged: true` preserves the wire's
 *  `{ data, meta }` body, so meta.total/totalPages reach usePagedList
 *  instead of the old FABRICATED `{ totalPages: 1 }` (the first-page
 *  cap class — a paginated endpoint answered through the plain
 *  unwrap looked like a one-page list forever). Non-paginated bodies
 *  (bare arrays, `{ data: null }`) still normalize to rows + a
 *  no-more-pages meta. */
export async function getPage<T>(path: string, query?: RequestOptions["query"]): Promise<Paginated<T>> {
  const body = await api<{ data: T[]; meta: PageMeta }>(path, { method: "GET", query, paged: true });
  if (
    body !== null &&
    typeof body === "object" &&
    Array.isArray((body as { data?: unknown }).data) &&
    (body as { meta?: unknown }).meta
  ) {
    return body as { data: T[]; meta: PageMeta };
  }
  // Some endpoints return bare arrays (or `{ data: null }`) with no meta.
  const rows = Array.isArray(body) ? body : [];
  return {
    data: rows,
    meta: { page: 1, limit: 0, total: rows.length, totalPages: 1 },
  };
}

/**
 * Test-only seams (the `__networkInternals` pattern) — NOTHING here is
 * used by app code. Lets a suite restore the module's first-import
 * state (bridge, single-flight, recovery ladder) between cases.
 */
export const __clientInternals = {
  isSessionUnverified: (): boolean => sessionUnverified,
  setRetryLadder(ladder: readonly number[]): void {
    retryLadder = ladder;
  },
  clearRetry(): void {
    clearSessionRefreshRetry();
  },
  reset(): void {
    clearSessionRefreshRetry();
    authBridge = null;
    refreshInFlight = null;
    sessionUnverified = false;
    retryLadder = [1_500, 4_000, 10_000];
  },
};

/** Full URL for a relative file path (e.g. /api/v1/files/papers/x.pdf). */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/v1/")) return `${API_BASE}${path.slice("/api/v1".length)}`;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

export type { AppNotification };
