/**
 * R334 B8 — queryClient defaults: the retry/backoff contract (3 retries,
 * transient-only, exponential + jitter; mutations zero) and the preserved
 * pre-R334 options. Uses requireActual: the global test setup mocks
 * @/lib/queryClient for the route render-net; this suite needs the REAL
 * module.
 * R342 t08 — the db-health line: the cache's onError/onSuccess feed
 * reportDbHealth (DB_UNAVAILABLE → degraded; success → healthy) — pinned
 * by spying the network module's inlet while driving real queries.
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { ApiError, NETWORK_ERROR } from "@/api/client";
import * as network from "@/lib/resilience/network";

const {
  queryClient,
  isTransientError,
  queryRetryDelay,
  MAX_QUERY_RETRIES,
} = jest.requireActual("@/lib/queryClient") as typeof import("@/lib/queryClient");

const transient = new ApiError(NETWORK_ERROR, "تعذّر الاتصال بالخادم", 0);
const serverError = new ApiError("HTTP_ERROR", "خطأ في الخادم", 503);
const unauthorized = new ApiError("UNAUTHENTICATED", "انتهت صلاحية الجلسة", 401);
const validation = new ApiError("VALIDATION", "بيانات غير صالحة", 422);

describe("retry predicate (transient only)", () => {
  it("retries network / timeout / 5xx", () => {
    expect(isTransientError(transient)).toBe(true);
    expect(isTransientError(new ApiError("TIMEOUT", "مهلة", 0))).toBe(true);
    expect(isTransientError(serverError)).toBe(true);
  });

  it("fails fast on 4xx answers and non-API errors", () => {
    expect(isTransientError(unauthorized)).toBe(false);
    expect(isTransientError(validation)).toBe(false);
    expect(isTransientError(new Error("boom"))).toBe(false);
  });
});

describe("query defaults", () => {
  const queries = queryClient.getDefaultOptions().queries;

  it("allows exactly MAX_QUERY_RETRIES (3) retries, transient-only", () => {
    const retry = queries?.retry as (failureCount: number, error: unknown) => boolean;
    expect(MAX_QUERY_RETRIES).toBe(3);
    expect(retry(0, transient)).toBe(true);
    expect(retry(2, transient)).toBe(true);
    expect(retry(3, transient)).toBe(false); // one over the budget
    expect(retry(0, unauthorized)).toBe(false);
    expect(retry(0, validation)).toBe(false);
    expect(retry(0, new Error("boom"))).toBe(false);
  });

  it("backs off exponentially with jitter, capped at 30s", () => {
    expect(queryRetryDelay(0)).toBeGreaterThanOrEqual(1000);
    expect(queryRetryDelay(0)).toBeLessThan(1250);
    expect(queryRetryDelay(1)).toBeGreaterThanOrEqual(2000);
    expect(queryRetryDelay(1)).toBeLessThan(2250);
    expect(queryRetryDelay(2)).toBeGreaterThanOrEqual(4000);
    expect(queryRetryDelay(2)).toBeLessThan(4250);
    expect(queryRetryDelay(9)).toBeLessThanOrEqual(30_250);
    expect(queries?.retryDelay).toBe(queryRetryDelay);
  });

  it("keeps every pre-R334 option identical", () => {
    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });
});

/* ── R342 t08: the db-health line (cache onError/onSuccess → reportDbHealth) ── */

describe("query cache db-health wiring (r342 t08)", () => {
  let reportDbHealthSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    reportDbHealthSpy = jest.spyOn(network, "reportDbHealth");
  });

  afterEach(() => {
    reportDbHealthSpy.mockRestore();
    queryClient.clear();
  });

  it("a DB_UNAVAILABLE query error marks the db degraded", async () => {
    const dbDown = new ApiError("DB_UNAVAILABLE", "Database unavailable", 503);
    await expect(
      queryClient.fetchQuery({
        queryKey: ["db-health-pin", "err"],
        queryFn: () => Promise.reject(dbDown),
        retry: false,
      }),
    ).rejects.toBe(dbDown);
    expect(reportDbHealthSpy).toHaveBeenCalledWith(false);
  });

  it("a NON-db error never touches the db line (no false degradation)", async () => {
    const plain = new ApiError("HTTP_ERROR", "خطأ", 500);
    await expect(
      queryClient.fetchQuery({
        queryKey: ["db-health-pin", "err2"],
        queryFn: () => Promise.reject(plain),
        retry: false,
      }),
    ).rejects.toBe(plain);
    expect(reportDbHealthSpy).not.toHaveBeenCalledWith(false);
  });

  it("a successful query read is the health signal — clears degradation", async () => {
    await queryClient.fetchQuery({
      queryKey: ["db-health-pin", "ok"],
      queryFn: () => Promise.resolve({ fine: true }),
    });
    expect(reportDbHealthSpy).toHaveBeenCalledWith(true);
  });
});
