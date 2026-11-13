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

/** Offline / DNS / server-unreachable normalization with an Arabic message. */
export const NETWORK_ERROR = "NETWORK";
const networkMessage = "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.";

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

async function parseEnvelope<T>(res: Response): Promise<T> {
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
  const obj = parsed as { error?: { code?: string; message?: string; details?: unknown }; data?: unknown } | null;
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
  if (obj !== null && typeof obj === "object" && "data" in obj) {
    return obj.data as T;
  }
  return obj as T;
}

/** Single-flight refresh — concurrent 401s share one /auth/refresh call. */
let refreshInFlight: Promise<boolean> | null = null;

/** A stalled /auth/refresh must never hang the single-flight promise
 * forever (every later 401 would await the same dead promise — the
 * frozen-app class). Bound it; on timeout the session degrades to
 * expiry + re-login instead of an indefinite spinner. */
const REFRESH_TIMEOUT_MS = 15_000;

async function tryRefresh(): Promise<boolean> {
  const bridge = authBridge;
  if (!bridge) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const cookie = bridge.getRefreshCookie();
      if (!cookie) return false;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `${REFRESH_COOKIE}=${cookie}` },
          body: "{}",
          signal: controller.signal,
        });
        if (!res.ok) return false;
        const data = await parseEnvelope<{ user: unknown; accessToken: string }>(res);
        const newCookie = extractRefreshCookie(res);
        bridge.onSessionUpdate({ user: data.user, accessToken: data.accessToken, refreshCookie: newCookie ?? cookie });
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
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
    if (res.status === 401 && !_isRetry && !path.startsWith("/auth/")) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return api<T>(path, { ...opts, _isRetry: true });
      }
      authBridge?.onSessionExpired();
      throw new ApiError("UNAUTHENTICATED", "انتهت صلاحية الجلسة — سجّل الدخول من جديد", 401);
    }
    return await parseEnvelope<T>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "انتهت مهلة الطلب — الخادم بطيء، أعد المحاولة", 0);
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
    const data = await parseEnvelope<T>(res);
    return { data, refreshCookie: extractRefreshCookie(res) };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "انتهت مهلة الطلب — الخادم بطيء، أعد المحاولة", 0);
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

/** Paginated GET returning rows + meta. */
export async function getPage<T>(path: string, query?: RequestOptions["query"]): Promise<Paginated<T>> {
  const direct = await api<{ data: T[]; meta: PageMeta }>(path, { method: "GET", query });
  if (direct && Array.isArray((direct as { data?: T[] }).data ?? undefined) && (direct as { meta?: PageMeta }).meta) {
    return direct as { data: T[]; meta: PageMeta };
  }
  // Some endpoints return bare arrays without meta.
  const rows = direct as unknown as T[];
  return {
    data: Array.isArray(rows) ? rows : [],
    meta: { page: 1, limit: 0, total: Array.isArray(rows) ? rows.length : 0, totalPages: 1 },
  };
}

/** Full URL for a relative file path (e.g. /api/v1/files/papers/x.pdf). */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/v1/")) return `${API_BASE}${path.slice("/api/v1".length)}`;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

export type { AppNotification };
