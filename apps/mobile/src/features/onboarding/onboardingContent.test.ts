/**
 * onboardingContent.test — r359 A4 (M2): pins the tour's copy contract.
 */
import { onboardingScreens, ONBOARDING_SCREEN_COUNT } from "./onboardingContent";

describe("onboardingScreens (r359 M2)", () => {
  it("is exactly four screens with the stable indices and art keys", () => {
    const screens = onboardingScreens("STUDENT");
    expect(screens).toHaveLength(ONBOARDING_SCREEN_COUNT);
    expect(ONBOARDING_SCREEN_COUNT).toBe(4);
    expect(screens.map((s) => s.index)).toEqual([1, 2, 3, 4]);
    expect(screens.map((s) => s.art)).toEqual([1, 2, 3, 4]);
  });

  it("every screen carries non-empty Arabic title + body + kicker", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN", "QUALITY", "OWNER"]) {
      for (const s of onboardingScreens(role)) {
        expect(s.title.trim().length).toBeGreaterThan(2);
        expect(s.body.trim().length).toBeGreaterThan(20);
        expect(s.kicker.trim().length).toBeGreaterThan(2);
      }
    }
  });

  it("screen 2 is ROLE-AWARE (a different title per role)", () => {
    const titles = new Set(
      ["STUDENT", "TEACHER", "ADMIN", "QUALITY", "OWNER"].map(
        (r) => onboardingScreens(r)[1]!.title,
      ),
    );
    expect(titles.size).toBe(5);
  });

  it("screens 1/3/4 are role-free (the shared story)", () => {
    const student = onboardingScreens("STUDENT");
    const owner = onboardingScreens("OWNER");
    expect(student[0]!.title).toBe(owner[0]!.title);
    expect(student[2]!.title).toBe(owner[2]!.title);
    expect(student[3]!.title).toBe(owner[3]!.title);
  });

  it("unknown roles fall back to the student space (never a crash)", () => {
    const screens = onboardingScreens("GHOST");
    expect(screens[1]!.title).toBe(onboardingScreens("STUDENT")[1]!.title);
  });
});
