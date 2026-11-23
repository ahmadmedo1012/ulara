/**
 * R353-2 §5 — THE INSTITUTION ISOLATION LAW (privacy, not cache taste).
 *
 * The defect being pinned: every institutional list query rode
 * `placeholderData: (prev) => prev`. TanStack's placeholder crosses
 * query keys BY DESIGN — the scope segment in the key does NOT protect
 * against it: while institution B's key loads, the screen painted
 * institution A's rows (and if B's request FAILED, A's rows stayed as
 * if they were the answer). The user-search key didn't even carry the
 * scope.
 *
 * The law under test:
 *  · sameScopePlaceholder keeps the previous page ONLY when the
 *    previous query's own scope segment (the LAST key segment —
 *    withScope appends it last) equals the CURRENT scope.
 *  · A scope switch → the previous data is dropped (undefined) → the
 *    honest loading state, never the previous institution's rows.
 *  · A filter/search change WITHIN the same scope → the previous page
 *    stays (the intended smoothness, now safe).
 *  · The user-search key is scope-scoped: results never carry across
 *    institutions.
 *  · Mutations invalidate the WHOLE ['inst'] family (a scope captured
 *    at render time can never strand the invalidation).
 */
import React, { act } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "@/auth/session";
import type { AuthUser, Paginated } from "@/api/types";
import type { Person } from "@/api/institutional";
import {
  sameScopePlaceholder, usePeoplePaged, useUserSearch, useUpdatePlacement,
} from "./queries";

/* ── the api modules are mocked at the seam — the hooks' real wiring runs ── */

const mockUsers = jest.fn();

jest.mock("@/api/admin", () => ({
  adminApi: { users: (...args: unknown[]) => mockUsers(...(args as [])) },
}));

jest.mock("@/api/institutional", () => ({
  institutionalApi: {
    listPeople: jest.fn(),
    getMyPermissions: jest.fn(),
    updatePlacement: jest.fn(),
  },
}));

/* eslint-disable import/first -- the seam import must sit below the
 * jest.mock factories (the jest hoisting contract; same pattern as
 * data.test.tsx). */
import { institutionalApi } from "@/api/institutional";

const listPeople = institutionalApi.listPeople as jest.Mock;


/* ── helpers ───────────────────────────────────────────────────────── */

function person(id: string, nameAr: string): Person {
  return {
    id, institutionId: "i", userId: null, staffNumber: null, fullNameAr: nameAr,
    fullNameEn: null, category: "ACADEMIC_STAFF", primaryOrgUnitId: null,
    staffStatus: "ACTIVE", hiredAt: null, endedAt: null, email: null, phone: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function paged(rows: Person[], total: number, totalPages: number): Paginated<Person> {
  return { data: rows, meta: { page: 1, limit: 20, total, totalPages } };
}

function makeUser(instId: string): AuthUser {
  return {
    id: "user-1",
    email: "admin@test.ly",
    role: "ADMIN",
    firstName: "إداري",
    lastName: "أُلارا",
    memberships: [
      { institutionId: "inst-a", name: "المؤسسة أ", slug: "a", role: "ADMIN", isActive: true },
      { institutionId: "inst-b", name: "المؤسسة ب", slug: "b", role: "ADMIN", isActive: true },
    ],
    currentInstitution: { id: instId, name: instId === "inst-a" ? "المؤسسة أ" : "المؤسسة ب", slug: instId === "inst-a" ? "a" : "b" },
    membershipRole: "ADMIN",
  } as AuthUser;
}

function setScope(instId: string) {
  act(() => {
    useSession.setState({ user: makeUser(instId), isHydrated: true });
  });
}

const mountedClients: QueryClient[] = [];

function hookClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  mountedClients.push(client);
  return client;
}

function hookWrapper(client: QueryClient) {
  function HookWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return HookWrapper;
}

/** A fetch promise the test controls (the slow-institution-B case). */
function controlled<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useSession.setState({
      user: null, accessToken: null, refreshCookie: null,
      activeInstitutionId: null, isHydrated: true, sessionEpoch: 0,
    });
  });
});

afterEach(async () => {
  // absorb TanStack's notifyManager flush timers inside act AND kill
  // the per-test clients so their timers never leak into the next test
  // (the overlapping-act pollution class under RNTL 14).
  for (const client of mountedClients) client.clear();
  mountedClients.length = 0;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

/* ── the placeholder guard itself ─────────────────────────────────── */

describe("sameScopePlaceholder — the guard function", () => {
  it("keeps the previous page ONLY when the previous key's scope segment matches", () => {
    const prev = { page: "A-data" } as never;
    const guard = sameScopePlaceholder("inst-a");
    expect(guard(prev, { queryKey: ["inst", "people", "list", {}, "inst-a"] })).toBe(prev);
    expect(guard(prev, { queryKey: ["inst", "people", "list", {}, "inst-b"] })).toBeUndefined();
    expect(guard(undefined, { queryKey: ["inst", "people", "list", {}, "inst-a"] })).toBeUndefined();
    expect(guard(prev, undefined)).toBeUndefined();
  });
});

/* ── the full law through the real hook ──────────────────────────── */

describe("usePeoplePaged — institution isolation across a scope switch", () => {
  it("NEVER paints institution A's rows under institution B while B loads (the privacy law)", async () => {
    const aRows = [person("a-1", "أحمد المؤسسة أ")];
    const slowB = controlled<Paginated<Person>>();

    // Institution A loads fine.
    listPeople.mockReturnValueOnce(Promise.resolve(paged(aRows, 1, 1)));
    setScope("inst-a");
    const client = hookClient();
    const { result, rerender } = await renderHook(
      ({ q }: { q?: string }) => usePeoplePaged({ q }),
      { wrapper: hookWrapper(client), initialProps: {} },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((p) => p.id)).toEqual(["a-1"]);

    // Switch to institution B whose network is slow (never resolves yet).
    listPeople.mockReturnValueOnce(slowB.promise);
    act(() => setScope("inst-b"));
    rerender({});

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    // THE LAW: no rows at all — not institution A's rows "temporarily".
    expect(result.current.items).toEqual([]);

    // B finally answers — its own rows, and only its own.
    act(() => slowB.resolve(paged([person("b-1", "ليلى المؤسسة ب")], 1, 1)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((p) => p.id)).toEqual(["b-1"]);
  });

  it("B's FAILURE never serves A's rows as the answer", async () => {
    const aRows = [person("a-1", "أحمد المؤسسة أ")];
    listPeople.mockReturnValueOnce(Promise.resolve(paged(aRows, 1, 1)));
    setScope("inst-a");
    const { result } = await renderHook(
      () => usePeoplePaged({}),
      { wrapper: hookWrapper(hookClient()) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((p) => p.id)).toEqual(["a-1"]);

    // B's request fails outright (the 403 class: membership revoked).
    listPeople.mockReturnValueOnce(
      Promise.reject(new Error("INSTITUTION_CONTEXT_REQUIRED")),
    );
    act(() => setScope("inst-b"));
    const { result: result2 } = await renderHook(
      () => usePeoplePaged({}),
      { wrapper: hookWrapper(hookClient()) },
    );
    await waitFor(() => expect(result2.current.isError).toBe(true));
    // No A rows smuggled in as the failed answer — the error state is
    // the truth, and the cache for A's key stays untouched for its OWN
    // next legitimate mount.
    expect(result2.current.items).toEqual([]);
    expect(listPeople).toHaveBeenLastCalledWith({ q: undefined, page: 1, limit: 20 });
  });

  it("a SEARCH change within the SAME scope keeps the previous rows (the intended smoothness)", async () => {
    const rows = [person("a-1", "أحمد")];
    listPeople.mockReturnValueOnce(Promise.resolve(paged(rows, 1, 1)));
    setScope("inst-a");
    const client = hookClient();
    const { result, rerender } = await renderHook(
      ({ q }: { q?: string }) => usePeoplePaged({ q }),
      { wrapper: hookWrapper(client), initialProps: { q: "أحمد" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Same scope, new search term, slow network — previous rows stay.
    const slowSearch = controlled<Paginated<Person>>();
    listPeople.mockReturnValueOnce(slowSearch.promise);
    rerender({ q: "سالم" });
    // The new key's fetch is in flight; the previous rows stay on
    // screen (the intended smoothness — same scope, so it is safe).
    await waitFor(() => expect(result.current.query.isFetching).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items.map((p) => p.id)).toEqual(["a-1"]);

    act(() => slowSearch.resolve(paged([], 0, 0)));
    await waitFor(() => expect(result.current.items).toEqual([]));
  });
});

/* ── the user search — scope-scoped key + guard ───────────────────── */

describe("useUserSearch — the access screen's search is institution-scoped", () => {
  it("re-keys with the scope: results never carry across institutions", async () => {
    const aResults = [{ id: "u-a", email: "a@x.ly", firstName: "أ", lastName: "أ", role: "STUDENT" }];
    mockUsers.mockReturnValueOnce(
      Promise.resolve({ data: aResults, meta: { page: 1, limit: 10, total: 1, totalPages: 1 } }),
    );

    setScope("inst-a");
    const client = hookClient();
    const { result, rerender } = await renderHook(
      ({ q }: { q: string }) => useUserSearch(q, true),
      { wrapper: hookWrapper(client), initialProps: { q: "أحمد" } },
    );
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    // the request itself carried the search + limit (the seam the screen rides)
    expect(mockUsers).toHaveBeenCalledWith({ q: "أحمد", limit: 10 });

    // Switch to B: the search key changed (scope segment) and the
    // previous results must NOT surface while B loads.
    const slowB = controlled<{ data: unknown[]; meta: unknown }>();
    mockUsers.mockReturnValueOnce(slowB.promise);
    act(() => setScope("inst-b"));
    rerender({ q: "أحمد" });
    await waitFor(() => expect(result.current.results).toEqual([]));
    expect(result.current.isLoading).toBe(true);
  });
});

/* ── mutations invalidate the whole family ────────────────────────── */

describe("useUpdatePlacement — whole-family invalidation", () => {
  it("invalidates ['inst'] (scope captured at render can never strand it)", async () => {
    (institutionalApi.updatePlacement as jest.Mock).mockResolvedValueOnce({ id: "p-1" });
    const client = hookClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = await renderHook(
      () => useUpdatePlacement(),
      { wrapper: hookWrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync({ id: "p-1", evaluationScore: 90 });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inst"] });
  });
});
