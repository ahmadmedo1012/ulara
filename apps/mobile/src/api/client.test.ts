/**
 * R336 A2 — the transport timeout + envelope contracts.
 *
 *  · apiWithCookieCapture carries the LOGIN/REGISTER journey; it gets
 *    the same AbortController + timeout discipline as api(). A stalled
 *    POST /auth/login used to leave the submit spinner running forever
 *    — the literal freeze-at-login class. It must reject with a TIMEOUT
 *    ApiError (Arabic message) instead.
 *  · parseEnvelope's R327 A4 key-presence unwrap ({ data: null } →
 *    null) is pinned here too — the historical post-login white-screen.
 */
import { api, apiWithCookieCapture, ApiError, registerAuthBridge, __clientInternals } from "./client";

function textResponse(body: unknown, headers: Record<string, string | null> = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("R336 A2 — apiWithCookieCapture timeout discipline", () => {
  it("rejects with a TIMEOUT ApiError when the request stalls (no infinite spinner)", async () => {
    // A fetch that NEVER settles but honors the abort signal — the
    // production behavior the old transport never guarded against.
    (globalThis.fetch as jest.Mock).mockImplementationOnce(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    const err: ApiError = await apiWithCookieCapture("/auth/login", {
      method: "POST",
      body: { email: "x@test.ly", password: "y" },
      _skipAuth: true,
      timeoutMs: 60,
    }).then(
      () => {
        throw new Error("expected a TIMEOUT rejection");
      },
      (e) => e,
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("TIMEOUT");
    expect(err.status).toBe(0);
    expect(err.message).toContain("مهلة");
  });

  it("still captures the refresh cookie on success", async () => {
    (globalThis.fetch as jest.Mock).mockImplementationOnce(async () =>
      textResponse(
        { data: { user: { id: "u1" }, accessToken: "at-1" } },
        { "set-cookie": "ulara_refresh=capture-me; Path=/api/v1/auth; HttpOnly" },
      ),
    );
    const { data, refreshCookie } = await apiWithCookieCapture<{ user: { id: string }; accessToken: string }>(
      "/auth/login",
      { method: "POST", body: {}, _skipAuth: true },
    );
    expect(data.user.id).toBe("u1");
    expect(refreshCookie).toBe("capture-me");
  });
});

describe("r362 P1 — a FAILED REFRESH must never end the session", () => {
  const bridge = {
    getAccessToken: () => "at-old",
    getRefreshCookie: () => "cookie-1",
    onSessionUpdate: jest.fn(),
    onSessionExpired: jest.fn(),
  };

  beforeEach(() => {
    __clientInternals.reset();
    // No background recovery timers inside a unit test (the ladder is
    // covered by its own case with a driven clock below).
    __clientInternals.setRetryLadder([]);
    jest.clearAllMocks();
    registerAuthBridge(bridge);
  });

  afterEach(() => {
    __clientInternals.reset();
  });

  function apiThenRefresh(refresh: () => Promise<unknown>) {
    let call = 0;
    (globalThis.fetch as jest.Mock).mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          text: async () => JSON.stringify({ error: { code: "TOKEN_EXPIRED", message: "x" } }),
        };
      }
      return refresh();
    });
  }

  function httpFailure(status: number, code: string) {
    return Promise.resolve({
      ok: false,
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify({ error: { code, message: "x" } }),
    });
  }

  const transientCases: [string, () => Promise<unknown>][] = [
    ["a network error", () => Promise.reject(new TypeError("Network request failed"))],
    ["a 15s abort", () => Promise.reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))],
    ["a 503 while the function cold-starts", () => httpFailure(503, "DB_UNAVAILABLE")],
    ["the rate limiter's 429", () => httpFailure(429, "RATE_LIMITED")],
    ["an unparseable 2xx body", () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => "<html>proxy interstitial</html>",
      })],
  ];

  it.each(transientCases)(
    "keeps the session on %s during refresh",
    async (_label, refresh) => {
      apiThenRefresh(refresh as () => Promise<unknown>);
      const err: ApiError = await api("/student/dashboard").then(
        () => {
          throw new Error("expected a rejection");
        },
        (e: ApiError) => e,
      );
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("SESSION_UNVERIFIED");
      expect(err.status).toBe(0);
      // THE LAW: the session is never cleared on a transient refresh failure.
      expect(bridge.onSessionExpired).not.toHaveBeenCalled();
      expect(__clientInternals.isSessionUnverified()).toBe(true);
    },
  );

  it("ends the session on a DEFINITIVE refusal (401 invalid refresh)", async () => {
    apiThenRefresh(() => httpFailure(401, "UNAUTHENTICATED"));
    const err: ApiError = await api("/student/dashboard").then(
      () => {
        throw new Error("expected a rejection");
      },
      (e: ApiError) => e,
    );
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.status).toBe(401);
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
    expect(__clientInternals.isSessionUnverified()).toBe(false);
  });

  it("ends the session on a 403 revocation", async () => {
    apiThenRefresh(() => httpFailure(403, "FORBIDDEN"));
    await expect(api("/student/dashboard")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("a transient failure followed by a good refresh recovers without user action", async () => {
    __clientInternals.setRetryLadder([0]);
    let call = 0;
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          text: async () => JSON.stringify({ error: { code: "TOKEN_EXPIRED", message: "x" } }),
        };
      }
      if (String(url).includes("/auth/refresh") && call === 2) {
        return Promise.reject(new TypeError("Network request failed"));
      }
      return textResponse(
        { data: { user: { id: "u1" }, accessToken: "at-new" } },
        { "set-cookie": "ulara_refresh=cookie-2; Path=/api/v1/auth" },
      );
    });
    await expect(api("/student/dashboard")).rejects.toMatchObject({ code: "SESSION_UNVERIFIED" });
    expect(__clientInternals.isSessionUnverified()).toBe(true);
    // The ladder (delay 0) re-attempts on its own.
    await new Promise((r) => setTimeout(r, 20));
    expect(__clientInternals.isSessionUnverified()).toBe(false);
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
    expect(bridge.onSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "at-new", refreshCookie: "cookie-2" }),
    );
  });
});

describe("R327 A4 — the { data: null } envelope unwrap (regression pin)", () => {
  it("resolves { data: null } to null — never the whole envelope", async () => {
    (globalThis.fetch as jest.Mock).mockImplementationOnce(async () => textResponse({ data: null }));
    const out = await api<{ resume: unknown } | null>("/me/resume");
    expect(out).toBeNull();
  });

  it("unwraps a populated payload normally", async () => {
    (globalThis.fetch as jest.Mock).mockImplementationOnce(async () =>
      textResponse({ data: { ok: true, list: [1, 2] } }),
    );
    const out = await api<{ ok: boolean; list: number[] }>("/me/dashboard");
    expect(out).toEqual({ ok: true, list: [1, 2] });
  });

  it("surfaces the backend error envelope as an ApiError", async () => {
    (globalThis.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "انتهت صلاحية الجلسة" } }),
    }));
    const err: ApiError = await api("/auth/me").then(
      () => {
        throw new Error("expected a rejection");
      },
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.status).toBe(401);
  });
});
