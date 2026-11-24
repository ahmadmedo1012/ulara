/**
 * boot.test.ts — pins the deterministic entry handoff
 * (`resolveEntryDestination`): the ONE rule `/` (cold start with a cached
 * session) and `/auth/login` (fresh login) share.
 */
import { resolveEntryDestination, type EntryUserLike } from "./boot";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  TEACHER: "/teacher/dashboard",
  ADMIN: "/admin/dashboard",
  QUALITY: "/quality/dashboard",
  OWNER: "/owner/dashboard",
};

const INST = { id: "inst-1" };
const user = (
  role: string,
  currentInstitution: { id: string } | null = INST,
): EntryUserLike => ({
  role,
  currentInstitution,
  // r359 A4: the fixture default is a COMPLETED tour (the field's
  // absence — older cached sessions — is treated as completed too).
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
});

describe("resolveEntryDestination — the boot/login handoff rule", () => {
  test("each role lands on its role home", () => {
    for (const role of Object.keys(ROLE_HOME)) {
      // OWNER is platform-level: no institution by design, still home.
      const u: EntryUserLike = role === "OWNER" ? { role, currentInstitution: null } : user(role);
      expect(resolveEntryDestination(u, null, ROLE_HOME)).toBe(ROLE_HOME[role]);
    }
  });

  test("unknown roles fall back to the student home", () => {
    expect(resolveEntryDestination(user("GHOST"), null, ROLE_HOME)).toBe("/student/dashboard");
  });

  test("?continue= wins only when the session can honor it", () => {
    // student with an active institution → honored
    expect(resolveEntryDestination(user("STUDENT"), "%2Fstudent%2Flibrary", ROLE_HOME)).toBe(
      "/student/library",
    );
    // OWNER (platform-level, no institution) → honored
    expect(
      resolveEntryDestination({ role: "OWNER", currentInstitution: null }, "/owner/users", ROLE_HOME),
    ).toBe("/owner/users");
    // student WITHOUT an institution context → the gate wins, continue is dropped
    expect(
      resolveEntryDestination(user("STUDENT", null), "/student/library", ROLE_HOME),
    ).toBe("/select-institution");
  });

  test("non-OWNER roles without an institution context hit the institution gate", () => {
    expect(resolveEntryDestination(user("STUDENT", null), null, ROLE_HOME)).toBe("/select-institution");
    expect(resolveEntryDestination(user("TEACHER", null), null, ROLE_HOME)).toBe("/select-institution");
    // OWNER never gates (platform-level by design)
    expect(resolveEntryDestination({ role: "OWNER", currentInstitution: null }, null, ROLE_HOME)).toBe(
      "/owner/dashboard",
    );
  });

  test("ADMIN without a context goes to its role home (RoleGate re-gates, no dead end)", () => {
    expect(resolveEntryDestination(user("ADMIN", null), null, ROLE_HOME)).toBe("/admin/dashboard");
  });

  // ── r359 A4 (M2): the first-run tour gate ──────────────────────────
  test("an EXPLICITLY null onboardingCompletedAt routes to /onboarding before anything else", () => {
    // with an institution context (would otherwise be the role home)
    expect(
      resolveEntryDestination({ ...user("STUDENT"), onboardingCompletedAt: null }, null, ROLE_HOME),
    ).toBe("/onboarding");
    // without one (would otherwise be /select-institution — the tour
    // needs no institution, it comes FIRST)
    expect(
      resolveEntryDestination(
        { ...user("STUDENT", null), onboardingCompletedAt: null },
        null,
        ROLE_HOME,
      ),
    ).toBe("/onboarding");
    // every role, OWNER included
    expect(
      resolveEntryDestination(
        { role: "OWNER", currentInstitution: null, onboardingCompletedAt: null },
        null,
        ROLE_HOME,
      ),
    ).toBe("/onboarding");
  });

  test("?continue= still wins over the tour when the session can honor it", () => {
    expect(
      resolveEntryDestination(
        { ...user("STUDENT"), onboardingCompletedAt: null },
        "%2Fstudent%2Flibrary",
        ROLE_HOME,
      ),
    ).toBe("/student/library");
  });

  test("a MISSING onboardingCompletedAt (older cached session) is treated as completed — no re-tour", () => {
    const legacy: EntryUserLike = { role: "STUDENT", currentInstitution: INST };
    expect(resolveEntryDestination(legacy, null, ROLE_HOME)).toBe(ROLE_HOME.STUDENT);
  });

  test("a blank continue param is ignored", () => {
    expect(resolveEntryDestination(user("STUDENT"), "", ROLE_HOME)).toBe("/student/dashboard");
  });
});
