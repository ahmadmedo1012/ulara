/**
 * Session — authenticated identity, institution context, and role.
 * Mirrors frontend/src/stores/auth.store.ts semantics for the native app:
 *  - accessToken (15 min) + refresh cookie value persisted in SecureStore.
 *  - user JSON (non-secret profile) persisted in AsyncStorage under
 *    ula-mobile-user. Cache clearing happens at every session boundary.
 *
 * The ula-mobile-* key family is the ONLY spelling (the retired
 * pre-ULARA fallback was removed — dev-phase installs re-login once).
 *
 * R336 A1 (the post-login freeze hardening — three durable-session laws):
 *  1. setSession commits refreshCookie into STATE too. The old code only
 *     persisted it to SecureStore; the in-memory value the API bridge
 *     reads stayed null/stale, so every warm-session /auth/refresh was
 *     impossible (no Cookie header → 401 → forced logout ~15 min after
 *     login, mid-use).
 *  2. login/register/selectInstitution AWAIT the persistence writes
 *     (flushSessionPersistence) BEFORE the caller navigates. The old
 *     fire-and-forget writes raced router.replace: process death in
 *     that window silently lost the freshly authenticated session.
 *  3. hydrate never clobbers a newer session. A deep link straight into
 *     /auth/login at cold start can finish login while hydrate's
 *     SecureStore reads are still in flight; the old unconditional
 *     set() overwrote the fresh login with the stale pre-login reads
 *     (user → null → RoleGate bounced the user back to /auth — the
 *     "login didn't stick" freeze). A write-version guard now skips the
 *     stale snapshot, and the reads are BOUNDED so a hung Keychain read
 *     can never freeze the boot screen forever.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, setToken } from "@/lib/tokenStorage";
import { apiWithCookieCapture, post, registerAuthBridge, get as apiGet } from "@/api/client";
import type { AuthUser, SessionResponse } from "@/api/types";

const KEY_USER = "ula-mobile-user";
const KEY_ACCESS = "ula-mobile-access-token";
const KEY_REFRESH = "ula-mobile-refresh-cookie";
const KEY_INST = "ula-mobile-active-institution";

/** Bounded hydrate: storage normally settles in single-digit ms; a hung
 * Keychain/Keystore read must degrade to "guest" instead of freezing
 * the Boot screen forever (the honest, recoverable failure). */
const HYDRATE_TIMEOUT_MS = 5_000;

export interface SessionState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshCookie: string | null;
  activeInstitutionId: string | null;
  isHydrated: boolean;
  /** Bumped whenever the session is cleared, so the shell can redirect. */
  sessionEpoch: number;

  hydrate: () => Promise<void>;
  setSession: (user: AuthUser, accessToken: string, refreshCookie?: string | null) => void;
  applyUser: (user: AuthUser) => void;
  clearSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  selectInstitution: (institutionId: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  me: () => Promise<AuthUser | null>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "TEACHER";
  institutionId: string;
  facultyId?: string;
  departmentId?: string;
  universityId?: string;
  year?: number;
  specialty?: string;
  rank?: string;
  inviteCode?: string;
}

/**
 * The outstanding session-persistence work (tokens + profile cache).
 * setToken/AsyncStorage swallow their own errors — this promise NEVER
 * rejects; awaiting it only guarantees the writes have SETTLED, so
 * navigation after login can never outrun durability.
 */
let pendingPersistence: Promise<void> = Promise.resolve();

/** Await the outstanding persistence writes (login → navigate ordering). */
export function flushSessionPersistence(): Promise<void> {
  return pendingPersistence;
}

/**
 * Monotonic session-write version. Every state-writing action bumps it;
 * hydrate captures the value before its reads and ABANDONS a stale
 * snapshot if a session was established meanwhile (deep-link race).
 */
let sessionWriteVersion = 0;

function persistSession(
  accessToken: string | null,
  refreshCookie: string | null,
  user: AuthUser | null,
  institutionId: string | null,
): Promise<void> {
  pendingPersistence = Promise.all([
    setToken(KEY_ACCESS, accessToken),
    setToken(KEY_REFRESH, refreshCookie),
    user
      ? AsyncStorage.setItem(KEY_USER, JSON.stringify(user)).catch(() => undefined)
      : AsyncStorage.removeItem(KEY_USER).catch(() => undefined),
    institutionId
      ? AsyncStorage.setItem(KEY_INST, institutionId).catch(() => undefined)
      : AsyncStorage.removeItem(KEY_INST).catch(() => undefined),
  ]).then(() => undefined);
  return pendingPersistence;
}

/** Legacy token-only persistence (kept for the bridge's narrow writes). */
function persistTokens(accessToken: string | null, refreshCookie: string | null): Promise<void> {
  pendingPersistence = Promise.all([
    setToken(KEY_ACCESS, accessToken),
    setToken(KEY_REFRESH, refreshCookie),
  ]).then(() => undefined);
  return pendingPersistence;
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshCookie: null,
  activeInstitutionId: null,
  isHydrated: false,
  sessionEpoch: 0,

  hydrate: async () => {
    const versionAtStart = sessionWriteVersion;
    try {
      const reads = Promise.all([
        getToken(KEY_ACCESS),
        getToken(KEY_REFRESH),
        AsyncStorage.getItem(KEY_USER),
        AsyncStorage.getItem(KEY_INST),
      ]);
      // Bound the reads: a hung SecureStore/Keychain promise must never
      // keep isHydrated false forever (Boot screen with no escape).
      let hangTimer: ReturnType<typeof setTimeout> | undefined;
      const bounded = await Promise.race([
        reads,
        new Promise<null>((resolve) => {
          hangTimer = setTimeout(() => resolve(null), HYDRATE_TIMEOUT_MS);
        }),
      ]);
      if (hangTimer !== undefined) clearTimeout(hangTimer);
      if (!bounded) {
        // Storage hung: degrade to guest (isHydrated so the router can
        // act) rather than freeze. The user re-authenticates.
        set({ isHydrated: true });
        return;
      }
      // A session was established while these reads were in flight
      // (deep-link → login at cold start): the fresh session WINS —
      // never clobber it with the stale pre-login snapshot.
      if (versionAtStart !== sessionWriteVersion) {
        set({ isHydrated: true });
        return;
      }
      const [accessToken, refreshCookie, userJson, instId] = bounded;
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
      set({
        accessToken,
        refreshCookie,
        user,
        activeInstitutionId: user?.currentInstitution?.id ?? instId ?? null,
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setSession: (user, accessToken, refreshCookie) => {
    const prev = get();
    const effectiveCookie = refreshCookie ?? prev.refreshCookie;
    const effectiveInst = user.currentInstitution?.id ?? prev.activeInstitutionId;
    sessionWriteVersion++;
    void persistSession(accessToken, effectiveCookie, user, effectiveInst);
    // STATE carries the cookie too — the API bridge reads it for the
    // refresh Cookie header (the R336 A1 fix: warm-session refresh).
    set({ user, accessToken, refreshCookie: effectiveCookie, activeInstitutionId: effectiveInst });
  },

  applyUser: (user) => {
    sessionWriteVersion++;
    const activeInstitutionId = user.currentInstitution?.id ?? get().activeInstitutionId;
    void persistSession(get().accessToken, get().refreshCookie, user, activeInstitutionId);
    set({ user, activeInstitutionId });
  },

  clearSession: async () => {
    sessionWriteVersion++;
    await persistSession(null, null, null, null);
    set((s) => ({
      user: null,
      accessToken: null,
      refreshCookie: null,
      activeInstitutionId: null,
      sessionEpoch: s.sessionEpoch + 1,
    }));
  },

  login: async (email, password) => {
    const { data, refreshCookie } = await apiWithCookieCapture<SessionResponse>("/auth/login", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password },
      _skipAuth: true,
    });
    get().setSession(data.user, data.accessToken, refreshCookie);
    // Durability BEFORE navigation: the caller router.replace()s as soon
    // as we resolve — the tokens must already be in SecureStore so a
    // process death in that window cannot lose the session.
    await flushSessionPersistence();
    return data.user;
  },

  register: async (payload) => {
    const { data, refreshCookie } = await apiWithCookieCapture<SessionResponse>("/auth/register", {
      method: "POST",
      body: payload,
      _skipAuth: true,
    });
    get().setSession(data.user, data.accessToken, refreshCookie);
    await flushSessionPersistence();
    return data.user;
  },

  selectInstitution: async (institutionId) => {
    const { data, refreshCookie } = await apiWithCookieCapture<SessionResponse>("/auth/select-institution", {
      method: "POST",
      body: { institutionId },
    });
    get().setSession(data.user, data.accessToken, refreshCookie ?? undefined);
    set({ activeInstitutionId: institutionId });
    await persistTokens(get().accessToken, get().refreshCookie).then(() =>
      AsyncStorage.setItem(KEY_INST, institutionId).catch(() => undefined),
    );
    return data.user;
  },

  logout: async () => {
    try {
      await post<void>("/auth/logout");
    } catch {
      // Best-effort server revoke; local clear still runs (mirrors web).
    }
    await get().clearSession();
  },

  me: async () => {
    const user = await apiGet<AuthUser>("/auth/me");
    get().applyUser(user);
    return user;
  },
}));

registerAuthBridge({
  getAccessToken: () => useSession.getState().accessToken,
  getRefreshCookie: () => useSession.getState().refreshCookie,
  onSessionUpdate: ({ user, accessToken, refreshCookie }) => {
    useSession.getState().setSession(user as AuthUser, accessToken, refreshCookie ?? undefined);
  },
  onSessionExpired: () => {
    useSession.getState().clearSession();
  },
});

/** Role helpers (belt-locked with frontend/src/lib/roleLabels.ts). */
export const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  TEACHER: "/teacher/dashboard",
  ADMIN: "/admin/dashboard",
  QUALITY: "/quality/dashboard",
  OWNER: "/owner/dashboard",
};

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "طالب",
  TEACHER: "أستاذ",
  ADMIN: "المسجل العام",
  QUALITY: "أخصائي جودة",
  OWNER: "مالك المنصة",
};

export const POSITION_LABELS: Record<string, string> = {
  DEAN: "عميد",
  ASSOCIATE_DEAN: "وكيل عميد",
  DEPARTMENT_HEAD: "رئيس قسم",
};

export const RANK_LABELS: Record<string, string> = {
  LECTURER: "محاضر",
  ASSISTANT_PROFESSOR: "أستاذ مساعد",
  ASSOCIATE_PROFESSOR: "أستاذ مشارك",
  PROFESSOR: "أستاذ",
};
