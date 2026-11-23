/**
 * R353-2 §5 — the session-boundary cache purge (the login/logout/expiry
 * leg of the institution-isolation law).
 *
 * The query cache AND its persisted AsyncStorage copy must never
 * outlive the session that fetched them: another account logging in
 * on the same device would otherwise hydrate the previous user's —
 * and the previous institution's — data cold-start fresh. select-
 * institution already cleared on switch; this closes the remaining
 * boundaries:
 *   · clearSession (logout / expiry) → memory + persisted cache die;
 *   · setSession with a DIFFERENT user id (fresh login as another
 *     account) → same purge;
 *   · setSession with the SAME user id (token refresh) → the warm
 *     cache survives (no needless offline-refetch).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "./session";
import type { AuthUser } from "@/api/types";

const mockClear = jest.fn();
const mockRemoveClient = jest.fn();

jest.mock("@/lib/queryClient", () => ({
  // lazily dereferenced — the factory runs before the const initializes
  queryClient: { clear: (...args: unknown[]) => mockClear(...(args as [])) },
}));

jest.mock("@/lib/resilience/persistence", () => ({
  queryCachePersister: { removeClient: (...args: unknown[]) => mockRemoveClient(...(args as [])) },
}));

function makeUser(id: string): AuthUser {
  return {
    id,
    email: `${id}@test.ly`,
    role: "ADMIN",
    firstName: "إداري",
    lastName: "أُلارا",
    memberships: [
      { institutionId: "inst-1", name: "المؤسسة أ", slug: "a", role: "ADMIN", isActive: true },
    ],
    currentInstitution: { id: "inst-1", name: "المؤسسة أ", slug: "a" },
    membershipRole: "ADMIN",
  } as AuthUser;
}

beforeEach(() => {
  jest.clearAllMocks();
  // the persister contract resolves void — the purge awaits it.
  mockRemoveClient.mockResolvedValue(undefined);
  useSession.setState({
    user: null, accessToken: null, refreshCookie: null,
    activeInstitutionId: null, isHydrated: true, sessionEpoch: 0,
  });
  void AsyncStorage;
});

describe("session boundaries — the cached server state dies with its session", () => {
  it("clearSession (logout/expiry) purges the query cache AND its persisted copy", async () => {
    useSession.setState({ user: makeUser("u-1") });
    await useSession.getState().clearSession();

    expect(useSession.getState().user).toBeNull();
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mockRemoveClient).toHaveBeenCalledTimes(1);
  });

  it("a DIFFERENT account establishing a session purges the previous cache", () => {
    useSession.setState({ user: makeUser("u-1") });
    useSession.getState().setSession(makeUser("u-2"), "at-2", "rc-2");
    expect(useSession.getState().user?.id).toBe("u-2");
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mockRemoveClient).toHaveBeenCalledTimes(1);
  });

  it("the SAME user refreshing their session keeps the warm cache (no purge)", () => {
    useSession.setState({ user: makeUser("u-1") });
    useSession.getState().setSession(makeUser("u-1"), "at-fresh", "rc-fresh");
    expect(useSession.getState().user?.id).toBe("u-1");
    expect(useSession.getState().accessToken).toBe("at-fresh");
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockRemoveClient).not.toHaveBeenCalled();
  });

  it("the FIRST login (no previous session) does not purge (nothing to leak)", () => {
    useSession.setState({ user: null });
    useSession.getState().setSession(makeUser("u-1"), "at-1", "rc-1");
    expect(mockClear).not.toHaveBeenCalled();
  });
});
