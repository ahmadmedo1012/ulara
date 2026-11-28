/**
 * r370 — the Android build number: the ONE place the arithmetic lives.
 *
 * Why a plain CommonJS file outside src/: Expo transpiles `app.config.ts`
 * to `app.config.js` and `require`s it during `prebuild` — a relative
 * TypeScript import there dies with "Cannot find module './src/lib/
 * app-version'" (verified against the real loader: expo config failed
 * before this file existed). Metro bundles src/, so the JS policy in
 * src/lib/app-version.ts can import from here too, and a Node/jest test
 * can require it directly.
 *
 *   versionCode = CHANNEL_BASE[channel] + github.run_number
 *
 * A workflow's run number never repeats, so a channel's builds are
 * strictly increasing; the disjoint bases keep the three lanes from
 * outranking each other (a QA or dev-client binary can never claim to be
 * newer than a release build of the same run).
 */

const BUILD_CHANNELS = ["release", "qa", "devclient"];

/** 1M+ release, 2M+ QA, 3M+ dev-client (Android's ceiling is 2.1B). */
const CHANNEL_BASE = {
  release: 1000000,
  qa: 2000000,
  devclient: 3000000,
};

/** A bare clone / a local `expo run:android` with no CI env. */
const BARE_CLONE_VERSION_CODE = 1;

function isBuildChannel(value) {
  return typeof value === "string" && BUILD_CHANNELS.includes(value);
}

/**
 * The monotonic value itself. Throws on a non-positive / non-integer run
 * number: a build that cannot prove its ordering must fail loudly at
 * config time, never ship a duplicate versionCode.
 */
function buildVersionCode(channel, runNumber) {
  if (!Number.isInteger(runNumber) || runNumber <= 0) {
    throw new Error(
      `ULARA_VERSION_CODE must be a positive integer run number, got ${String(runNumber)}`,
    );
  }
  return CHANNEL_BASE[channel] + runNumber;
}

/**
 * app.config.ts entry point. `rawRun` is the raw env value (GitHub's
 * `github.run_number`); the channel is the lane that produced the binary.
 * No run number = a local/bare build (code 1), never an error — a
 * developer must be able to prebuild offline.
 */
function resolveVersionCode(rawChannel, rawRun) {
  if (rawRun === undefined || String(rawRun).trim() === "") return BARE_CLONE_VERSION_CODE;
  const run = Number(String(rawRun).trim());
  const channel = isBuildChannel(rawChannel) ? rawChannel : "release";
  return buildVersionCode(channel, run);
}

module.exports = {
  BUILD_CHANNELS,
  CHANNEL_BASE,
  BARE_CLONE_VERSION_CODE,
  isBuildChannel,
  buildVersionCode,
  resolveVersionCode,
};
