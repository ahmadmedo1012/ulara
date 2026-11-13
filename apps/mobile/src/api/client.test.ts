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
import { api, apiWithCookieCapture, ApiError } from "./client";

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
