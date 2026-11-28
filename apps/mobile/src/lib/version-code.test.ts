/**
 * r370 — the Android build-number arithmetic (scripts/version-code.cjs).
 *
 * Found: `app.config.ts` shipped no `android.versionCode`, so every APK
 * was `1` — Android refuses to install a build whose versionCode is not
 * greater than the installed one, and /status could not tell builds apart.
 * The fix injects `github.run_number` through the channel base. This file
 * pins monotonicity, lane disjointness and the fail-loud input rule.
 *
 * The module is plain CommonJS because Expo's config loader requires it
 * from app.config.js at prebuild time (a relative TS import does not
 * resolve there) — hence `require`, exactly as app.config.ts does.
 */
const {
  BARE_CLONE_VERSION_CODE,
  CHANNEL_BASE,
  buildVersionCode,
  isBuildChannel,
  resolveVersionCode,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require("../../scripts/version-code.cjs") as {
  BARE_CLONE_VERSION_CODE: number;
  CHANNEL_BASE: Record<"release" | "qa" | "devclient", number>;
  buildVersionCode: (channel: "release" | "qa" | "devclient", run: number) => number;
  isBuildChannel: (v: unknown) => boolean;
  resolveVersionCode: (channel?: string, run?: string) => number;
};

describe("buildVersionCode", () => {
  it("is monotonic in the run number inside a channel", () => {
    const a = buildVersionCode("release", 41);
    const b = buildVersionCode("release", 42);
    expect(b).toBe(a + 1);
    expect(b).toBeGreaterThan(a);
  });

  it("keeps the three lanes disjoint so a QA binary never outranks a release", () => {
    expect(buildVersionCode("qa", 1)).toBeGreaterThan(buildVersionCode("release", 9_999));
    expect(buildVersionCode("devclient", 1)).toBeGreaterThan(buildVersionCode("qa", 9_999));
  });

  it("stays a positive 32-bit int (Android's ceiling is 2,100,000,000)", () => {
    for (const channel of ["release", "qa", "devclient"] as const) {
      const code = buildVersionCode(channel, 999_999);
      expect(Number.isInteger(code)).toBe(true);
      expect(code).toBeGreaterThan(0);
      expect(code).toBeLessThan(2_100_000_000);
    }
  });

  it("refuses a run number that cannot order builds", () => {
    expect(() => buildVersionCode("release", 0)).toThrow();
    expect(() => buildVersionCode("release", -3)).toThrow();
    expect(() => buildVersionCode("release", 1.5)).toThrow();
    expect(() => buildVersionCode("release", Number.NaN)).toThrow();
  });
});

describe("resolveVersionCode (app.config.ts entry point)", () => {
  it("defaults to the bare-clone value when CI provides nothing", () => {
    expect(resolveVersionCode(undefined, undefined)).toBe(BARE_CLONE_VERSION_CODE);
    expect(resolveVersionCode("release", "")).toBe(BARE_CLONE_VERSION_CODE);
    expect(resolveVersionCode("release", "  ")).toBe(BARE_CLONE_VERSION_CODE);
    expect(BARE_CLONE_VERSION_CODE).toBe(1);
  });

  it("maps the run number through the channel base", () => {
    expect(resolveVersionCode("release", "123")).toBe(CHANNEL_BASE.release + 123);
    expect(resolveVersionCode("qa", "123")).toBe(CHANNEL_BASE.qa + 123);
    expect(resolveVersionCode("devclient", "123")).toBe(CHANNEL_BASE.devclient + 123);
  });

  it("treats an unknown channel as release rather than bumping into another lane", () => {
    expect(resolveVersionCode("nightly", "7")).toBe(CHANNEL_BASE.release + 7);
    expect(resolveVersionCode(undefined, "7")).toBe(CHANNEL_BASE.release + 7);
  });
});

describe("isBuildChannel", () => {
  it("accepts exactly the three lanes", () => {
    expect(isBuildChannel("release")).toBe(true);
    expect(isBuildChannel("qa")).toBe(true);
    expect(isBuildChannel("devclient")).toBe(true);
    expect(isBuildChannel("Release")).toBe(false);
    expect(isBuildChannel(undefined)).toBe(false);
    expect(isBuildChannel(3)).toBe(false);
  });
});
