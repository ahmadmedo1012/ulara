/**
 * r370 — the /status update decision (the policy half).
 *
 * The gate had no test at all: `useVersionGate` compared `version: "1.0.0"`
 * — a constant every APK shares — so the floor could never fire on a real
 * device and nothing guarded that. These tests pin the precedence rule
 * (build numbers over semver when both are known) and the fail-open
 * behaviour on an old server / bare clone.
 *
 * The build-number ARITHMETIC lives in scripts/version-code.cjs (required
 * by app.config.ts at prebuild time) and is covered by
 * src/lib/version-code.test.ts.
 */
import { compareBuildCodes, compareSemver, decideUpdate } from "./app-version";

describe("compareBuildCodes", () => {
  it("orders numbers and refuses to guess when a side is unknown", () => {
    expect(compareBuildCodes(2, 1)).toBe(1);
    expect(compareBuildCodes(1, 2)).toBe(-1);
    expect(compareBuildCodes(2, 2)).toBe(0);
    expect(compareBuildCodes(null, 2)).toBeNull();
    expect(compareBuildCodes(2, null)).toBeNull();
  });
});

describe("compareSemver", () => {
  it("compares the three numeric parts and tolerates missing ones", () => {
    expect(compareSemver("1.0.1", "1.0.0")).toBe(1);
    expect(compareSemver("1.0.0", "1.2.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.0", "1.0.0")).toBe(0);
  });
});

describe("decideUpdate", () => {
  const running = { semver: "1.0.0", code: 1_000_042 };

  it("blocks a build below the numeric floor even when its semver string matches", () => {
    // The old failure mode: every APK said "1.0.0", so a semver floor of
    // 1.0.0 could never block an outdated binary.
    expect(decideUpdate(running, { minVersionCode: 1_000_043, minAppVersion: "1.0.0" }))
      .toEqual({ blocked: true, newer: false });
  });

  it("does not block a build at or above the floor", () => {
    expect(decideUpdate(running, { minVersionCode: 1_000_042 }).blocked).toBe(false);
    expect(decideUpdate(running, { minVersionCode: 1_000_001 }).blocked).toBe(false);
  });

  it("suggests the newest published build", () => {
    expect(decideUpdate(running, { latestVersionCode: 1_000_100, latestAppVersion: "1.0.0" }).newer)
      .toBe(true);
    expect(decideUpdate(running, { latestVersionCode: 1_000_042 }).newer).toBe(false);
  });

  it("falls back to semver when the server publishes no build number (old server)", () => {
    const web = { semver: "0.9.0", code: null };
    expect(decideUpdate(web, { minAppVersion: "1.0.0" }).blocked).toBe(true);
    expect(decideUpdate(web, { latestAppVersion: "1.0.0" }).newer).toBe(true);
    expect(decideUpdate({ semver: "1.0.0", code: null }, { minAppVersion: "1.0.0" }).blocked).toBe(false);
  });

  it("does nothing when the server publishes no policy at all (bare clone)", () => {
    expect(decideUpdate(running, {})).toEqual({ blocked: false, newer: false });
    expect(decideUpdate({ semver: "0.0.0", code: null }, { minAppVersion: null, latestAppVersion: null }))
      .toEqual({ blocked: false, newer: false });
  });

  it("prefers the build number over a contradicting semver", () => {
    // Server says min semver 1.0.0 (the app "meets" it) but the numeric
    // floor is higher: the native ordering is authoritative.
    const decision = decideUpdate(
      { semver: "1.0.0", code: 1_000_042 },
      { minAppVersion: "1.0.0", minVersionCode: 1_000_500 },
    );
    expect(decision.blocked).toBe(true);
  });
});
