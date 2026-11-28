/**
 * r370 — the /status update policy: which build numbers mean "blocked"
 * and which mean "a newer build exists".
 *
 * Found (round-1 SPEC §C): `app.config.ts` shipped `version: "1.0.0"` and
 * no `android.versionCode`, so every APK was identical to the gate and
 * `/status`'s latest-version check could never fire. The build number is
 * now injected by CI — see `scripts/version-code.cjs` (the arithmetic,
 * required by app.config.ts at prebuild time).
 *
 * This module is the pure half: no React, no expo-constants, no DB, so the
 * gate decision is testable without a device or an emulator.
 */

/** Numeric comparison; null when either side is unknown (`-1|0|1|null`). */
export function compareBuildCodes(current: number | null, target: number | null): -1 | 0 | 1 | null {
  if (current === null || target === null) return null;
  if (current === target) return 0;
  return current < target ? -1 : 1;
}

/**
 * semver a.b.c comparison: -1 | 0 | 1 (tolerant of missing parts).
 * Moved here from updates.tsx (r370) so the policy is testable without
 * rendering React Native; updates.tsx re-exports it for its callers.
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x) || 0);
  const pb = b.split(".").map((x) => Number(x) || 0);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** The `/status` half of the policy — every field optional (bare clone). */
export interface VersionPolicy {
  minAppVersion?: string | null;
  latestAppVersion?: string | null;
  minVersionCode?: number | null;
  latestVersionCode?: number | null;
}

/** What the running binary can prove about itself. */
export interface RunningBuild {
  semver: string;
  code: number | null;
}

export interface UpdateDecision {
  /** Below the server floor → the blocking «يلزم تحديث التطبيق» screen. */
  blocked: boolean;
  /** Below the newest published build → the one-time non-blocking toast. */
  newer: boolean;
}

/**
 * Build numbers win whenever BOTH sides have one for that surface — a
 * native build is ordered by versionCode, not by a hand-typed string that
 * every build shares. Semver remains the fallback for web builds and for
 * servers that only publish the old pair.
 */
export function decideUpdate(current: RunningBuild, policy: VersionPolicy): UpdateDecision {
  const below = (
    targetCode: number | null | undefined,
    targetSemver: string | null | undefined,
  ): boolean => {
    const byCode = compareBuildCodes(current.code, targetCode ?? null);
    if (byCode !== null) return byCode < 0;
    if (!targetSemver) return false;
    return compareSemver(current.semver, targetSemver) < 0;
  };
  return {
    blocked: below(policy.minVersionCode, policy.minAppVersion),
    newer: below(policy.latestVersionCode, policy.latestAppVersion),
  };
}
