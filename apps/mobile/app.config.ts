import type { ExpoConfig } from "expo/config";

/**
 * أُلارا — Ulara mobile (Expo / React Native).
 *
 * Brand: the ULARA system — paper #F5F1E8 · ink #262019 · sienna #C43E16.
 * The API base URL is public configuration (EXPO_PUBLIC_API_BASE_URL);
 * secrets never belong in this file or in the app bundle.
 */

/* ── Ω 1-B (D3) — the S3 placeholder guard ────────────────────────────
 *
 * extra.eas.projectId is still the zero placeholder: the NEW EAS project
 * does not exist (`eas init` pending — docs/RELEASE.md §"OTA re-activation",
 * the owner runbook). A u.expo.dev URL that points at a nonexistent
 * project makes every fresh device build run its ON_LOAD update check
 * against an endpoint that can never answer — a boot-time crash suspect
 * (S3) that NOBODY has ever observed, because no workflow has ever run
 * the app on an emulator with a logcat attached (that machine is
 * mobile.yml `android-smoke`, this program's 1-B deliverable).
 *
 * Until a real project id exists, the config OMITS the expo-updates plugin
 * entry and the `updates` block entirely — the native build then embeds no
 * update manifest to check at boot. expo-updates stays installed (the JS
 * side, src/lib/updates.tsx, fails soft by design); reactCompiler stays ON
 * (S1 — its confirmation is exactly the android-smoke job). The guard
 * lifts as soon as a real id arrives: either set EXPO_PUBLIC_EAS_PROJECT_ID
 * at build time, or replace the ONE placeholder literal in EAS_PROJECT_ID
 * below with the id `eas init` prints (docs/RELEASE.md runbook step 1) —
 * everything (updates.url, the plugin entry, extra.eas.projectId) follows
 * that single literal, restoring the pre-guard behavior for a real project.
 */
const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "00000000-0000-0000-0000-000000000000";
const EAS_PROJECT_PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
const hasRealEasProject = EAS_PROJECT_ID !== EAS_PROJECT_PLACEHOLDER;

/* The expo-updates surfaces for a REAL project id (both omitted from the
 * config below while the placeholder is in place — see the S3 guard block
 * above). Typed as a mutable tuple so the conditional spread satisfies
 * ExpoConfig["plugins"] without `as const` friction. */
const easUpdatesPlugin: [string, { url: string }] = [
  "expo-updates",
  { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
];
const easUpdatesBlock = {
  url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  checkAutomatically: "ON_LOAD" as const,
  fallbackToCacheTimeout: 0,
};

const config: ExpoConfig = {
  name: "أُلارا",
  slug: "ulara",
  version: "1.0.0",
  scheme: "ulara",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  description: "أُلارا — نظام تشغيل الجامعة (تطبيق الجوال الرسمي)",
  backgroundColor: "#F5F1E8",
  primaryColor: "#C43E16",
  ios: {
    bundleIdentifier: "ly.ulara.app",
    supportsTablet: true,
    infoPlist: {
      CFBundleDisplayName: "أُلارا",
      CFBundleLocalizations: ["ar"],
      CFBundleDevelopmentRegion: "ar",
      SupportsRTL: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "ly.ulara.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-foreground.png",
      backgroundImage: "./assets/images/adaptive-background.png",
      monochromeImage: "./assets/images/adaptive-monochrome.png",
    },
    // T-50 (P1-d): Android 14+ predictive back — the app has ZERO
    // BackHandler.preventDefault() calls (grep-verified), so enabling the
    // gesture is safe: sheets/dialogs close with the system cross-activity
    // back animation. Takes effect with the next EAS/gradle build (T-51
    // owns the build + fingerprint bump; OTA alone cannot ship this flag).
    predictiveBackGestureEnabled: true,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F5F1E8",
        dark: { backgroundColor: "#262019" },
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
      },
    ],
    ["expo-secure-store", {}],
    // R327 C3 — the push notification icon (the brand's white silhouette)
    // + the sienna accent for the Android status-bar tint.
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#C43E16",
      },
    ],
    // R340 T-M5 (LR-001) — expo-navigation-bar for Android gesture-handle
    // contrast under enforced edge-to-edge: `enforceContrast` keeps the OS's
    // translucent scrim behind the gesture handle / 3-button bar so it never
    // sits on low-contrast content in dark mode. The concrete bar STYLE is
    // derived at runtime from the effective app theme (src/design/navbar.tsx
    // → AppNavigationBar in app/_layout.tsx); this plugin entry covers the
    // pre-JS cold-boot moment. NEW NATIVE DEP → new fingerprint → needs a
    // new binary build (local gradle path: scripts/build-android-local.sh,
    // docs/mobile/ANDROID-LOCAL.md); OTA alone cannot ship this.
    ["expo-navigation-bar", { enforceContrast: true }],
    ["expo-document-picker", { iCloudDirectoryEnabled: false }],
    "expo-video",
    // R327 C3 — the biometric app-lock (cold-start gate). D3: the
    // FaceID prompt in Arabic (the plugin's default is English).
    [
      "expo-local-authentication",
      { faceIDPermission: "يستخدم التطبيق Face ID للتحقق من هويتك عند فتح التطبيق." },
    ],
    // R326 M0.5 — real OTA: the project's update endpoint, not a username
    // placeholder. runtimeVersion uses the fingerprint policy so any native
    // dependency/plugin/config change produces a new binary+update pairing.
    // Ω 1-B (D3): the entry itself is GUARDED — it only ships when a real
    // project id is resolved (see the S3 guard block at the top of this
    // file); with the zero placeholder it is omitted entirely.
    ...(hasRealEasProject ? [easUpdatesPlugin] : []),
  ],
  // Ω 1-B (D3): the `updates` block ships only with a real project id —
  // with the zero placeholder it is omitted entirely (a fake u.expo.dev
  // URL can crash the ON_LOAD update check at boot; see the S3 guard
  // block at the top of this file).
  ...(hasRealEasProject ? { updates: easUpdatesBlock } : {}),
  runtimeVersion: {
    policy: "fingerprint",
  },
  experiments: {
    typedRoutes: true,
    // R327 C5 — reactCompiler ON: the M1.3 crash suspect (reanimated ×
    // compiler) left the tree in C4, and the 87-warning purity ratchet is
    // at zero (every set-state-in-effect / purity / immutability finding
    // fixed by refactor, not suppression). With the plugin on: tsc 0 ·
    // jest 726/726 · export green (4.51 MB, −27% vs the R327-open
    // baseline). D2 fresh device builds are the confirmation step; the
    // rollback is this one flag.
    reactCompiler: true,
  },
  extra: {
    // Public configuration — safe to inline. The default targets the deployed
    // production API at all times so a bare clone works out of the box.
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://ulara.vercel.app/api/v1",
    eas: {
      // Single source of truth: the resolved EAS_PROJECT_ID (env override,
      // else the placeholder literal). With no real project the id stays the
      // zero placeholder exactly as before (D3 changes nothing else); with a
      // real id every updates surface — updates.url, the expo-updates plugin
      // entry and this projectId — follows the one literal above.
      projectId: EAS_PROJECT_ID,
    },
  },
};

export default config;
