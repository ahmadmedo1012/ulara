/**
 * R336 A1 — THE SESSION DURABILITY CONTRACT.
 *
 * The owner-observed post-login failures on iPhone traced to three
 * session-layer defects; this suite pins every one of them:
 *
 *  1. setSession must commit refreshCookie into STATE. The old code only
 *     persisted it to SecureStore — the in-memory value the API bridge
 *     reads stayed null/stale, so warm-session /auth/refresh was
 *     impossible → 401 → forced logout ~15 min after login.
 *  2. login/register must AWAIT token persistence before resolving —
 *     the caller router.replace()s the moment login resolves; navigation
 *     can never outrun durability (process death in that window used to
 *     silently lose the freshly authenticated session).
 *  3. hydrate must never clobber a session established while its reads
 *     were in flight (the deep-link login race) and must never hang
 *     forever on a stalled SecureStore read.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useSession, flushSessionPersistence } from "./session";
import type { AuthUser } from "@/api/types";

function makeUser(id = "fresh-user"): AuthUser {
  return {
    id,
    email: "student@test.ly",
    role: "STUDENT",
    firstName: "تجربة",
    lastName: "أُلارا",
    memberships: [
      { institutionId: "inst-1", name: "الجامعة التجريبية", slug: "test-university", role: "STUDENT", isActive: true },
    ],
    currentInstitution: { id: "inst-1", name: "الجامعة التجريبية", slug: "test-university" },
    membershipRole: "STUDENT",
  };
}

/** A login response carrying a fresh refresh cookie. */
function mockLoginResponse(cookie = "fresh-cookie-1", user = makeUser(), accessToken = "fresh-at") {
  (globalThis.fetch as jest.Mock).mockImplementationOnce(async () => ({
    ok: true,
    status: 200,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "set-cookie" ? `ulara_refresh=${cookie}; Path=/api/v1/auth; HttpOnly` : null,
    },
    text: async () => JSON.stringify({ data: { user, accessToken } }),
  }));
}

function resetStore() {
  useSession.setState({
    user: null,
    accessToken: null,
    refreshCookie: null,
    activeInstitutionId: null,
    isHydrated: false,
    sessionEpoch: 0,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
  resetStore();
});

describe("R336 A1 — setSession commits the refresh cookie into state", () => {
  it("login stores the fresh refresh cookie in state AND SecureStore (the warm-session refresh regression)", async () => {
    mockLoginResponse("cookie-from-login");
    const user = await useSession.getState().login("student@test.ly", "12345678");
    expect(user.id).toBe("fresh-user");
    // STATE — the half the old bug dropped (the API bridge reads THIS):
    expect(useSession.getState().refreshCookie).toBe("cookie-from-login");
    expect(useSession.getState().accessToken).toBe("fresh-at");
    // STORAGE — the half that always worked:
    await flushSessionPersistence();
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith("ula-mobile-refresh-cookie", "cookie-from-login");
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith("ula-mobile-access-token", "fresh-at");
  });

  it("a second login (re-login without logout) replaces the previous account's cookie", async () => {
    mockLoginResponse("first-cookie");
    await useSession.getState().login("student@test.ly", "12345678");
    expect(useSession.getState().refreshCookie).toBe("first-cookie");

    mockLoginResponse("second-cookie", makeUser("second-user"), "second-at");
    await useSession.getState().login("other@test.ly", "12345678");
    expect(useSession.getState().refreshCookie).toBe("second-cookie");
    expect(useSession.getState().user?.id).toBe("second-user");
  });

  it("setSession with no cookie argument keeps the previous cookie (refresh-bridge semantics)", () => {
    useSession.setState({ refreshCookie: "kept-cookie" });
    useSession.getState().setSession(makeUser(), "new-at");
    expect(useSession.getState().refreshCookie).toBe("kept-cookie");
    expect(useSession.getState().accessToken).toBe("new-at");
  });

  it("clearSession nulls every session field and bumps the epoch", async () => {
    mockLoginResponse();
    await useSession.getState().login("student@test.ly", "12345678");
    const epochBefore = useSession.getState().sessionEpoch;
    await useSession.getState().clearSession();
    expect(useSession.getState().user).toBeNull();
    expect(useSession.getState().accessToken).toBeNull();
    expect(useSession.getState().refreshCookie).toBeNull();
    expect(useSession.getState().activeInstitutionId).toBeNull();
    expect(useSession.getState().sessionEpoch).toBe(epochBefore + 1);
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalledWith("ula-mobile-refresh-cookie");
  });
});

describe("R336 A1 — login awaits persistence before resolving", () => {
  it("login does not resolve while the token write is still in flight (navigation cannot outrun durability)", async () => {
    let releaseStore: (() => void) | null = null;
    jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key: string) => {
      if (key === "ula-mobile-access-token") {
        await new Promise<void>((resolve) => {
          releaseStore = resolve;
        });
      }
    });
    mockLoginResponse();

    let resolved = false;
    const loginPromise = useSession
      .getState()
      .login("student@test.ly", "12345678")
      .then((u) => {
        resolved = true;
        return u;
      });

    // Let the login response + setSession + the in-flight write settle
    // through the microtask queue — login must STILL be unresolved.
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(resolved).toBe(false);
    // State is already committed (the UI never waits on storage):
    expect(useSession.getState().user?.id).toBe("fresh-user");

    releaseStore!();
    const user = await loginPromise;
    expect(resolved).toBe(true);
    expect(user.id).toBe("fresh-user");
  });
});

describe("R336 A1 — hydrate never clobbers a fresher session, never hangs", () => {
  it("a login completed during hydrate's reads WINS (the deep-link race)", async () => {
    // Storage returns a STALE pre-login snapshot — but slowly.
    const staleUser = makeUser("stale-user");
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => {
      if (key === "ula-mobile-access-token") {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return "stale-at";
      }
      if (key === "ula-mobile-refresh-cookie") return "stale-cookie";
      return null;
    });
    const getItemSpy = jest.spyOn(AsyncStorage, "getItem").mockImplementation(async (key: string) => {
      if (key === "ula-mobile-user") {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return JSON.stringify(staleUser);
      }
      return null;
    });

    const hydratePromise = useSession.getState().hydrate();
    // While hydrate's reads are in flight, a deep-link login completes:
    mockLoginResponse("deep-link-cookie", makeUser("fresh-user"), "fresh-at");
    await useSession.getState().login("student@test.ly", "12345678");
    expect(useSession.getState().user?.id).toBe("fresh-user");

    await hydratePromise;
    // The stale snapshot must NOT have overwritten the fresh session:
    expect(useSession.getState().user?.id).toBe("fresh-user");
    expect(useSession.getState().accessToken).toBe("fresh-at");
    expect(useSession.getState().refreshCookie).toBe("deep-link-cookie");
    getItemSpy.mockRestore();
  });

  it("a hung SecureStore read degrades to guest instead of freezing the boot (bounded hydrate)", async () => {
    jest.useFakeTimers();
    try {
      // The read NEVER settles — the old hydrate awaited it forever.
      jest.mocked(SecureStore.getItemAsync).mockImplementation(
        async () => new Promise<never>(() => undefined),
      );
      const hydratePromise = useSession.getState().hydrate();
      jest.advanceTimersByTime(5_000);
      await hydratePromise;
      expect(useSession.getState().isHydrated).toBe(true);
      expect(useSession.getState().user).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("with no stored session, hydrate lands guest + hydrated", async () => {
    await useSession.getState().hydrate();
    expect(useSession.getState().isHydrated).toBe(true);
    expect(useSession.getState().user).toBeNull();
    expect(useSession.getState().accessToken).toBeNull();
  });

  it("a stored session restores tokens + user from storage", async () => {
    const storedUser = makeUser("restored-user");
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => {
      if (key === "ula-mobile-access-token") return "restored-at";
      if (key === "ula-mobile-refresh-cookie") return "restored-cookie";
      return null;
    });
    const getItemSpy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async (key: string) =>
        key === "ula-mobile-user" ? JSON.stringify(storedUser) : null,
      );
    await useSession.getState().hydrate();
    expect(useSession.getState().isHydrated).toBe(true);
    expect(useSession.getState().user?.id).toBe("restored-user");
    expect(useSession.getState().accessToken).toBe("restored-at");
    expect(useSession.getState().refreshCookie).toBe("restored-cookie");
    getItemSpy.mockRestore();
  });
});
