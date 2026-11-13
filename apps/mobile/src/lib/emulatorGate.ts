/**
 * The emulator entrance gate (2026-11-13 — android-smoke forensics).
 *
 * MEASURED LIVE (run 43342633592, the pixel_6/google_apis profile; and
 * run 43357920033's predecessor on the default AVD): on software-rendered
 * emulators, Reanimated DELAYED entering animations strand content at
 * opacity 0 — the first entrance fires, every staggered follow-up never
 * starts. The Welcome rendered its eyebrow while «ابدأ الآن» stayed
 * invisible through 30s of scrolling, 10/10 journeys.
 *
 * The honest split: CI smoke on an emulator proves the FUNCTIONAL journey
 * (login → dashboard → tabs → logout); the motion design is proven by the
 * unit/render-net belts and real devices. So on a NON-PHYSICAL device the
 * entrances gate OFF — exactly like prefers-reduced-motion.
 *
 * Detection: expo-device's Device.isDevice is false on every Android
 * emulator profile (it reads Build.FINGERPRINT / PRODUCT hardware
 * markers). Deterministic, no maintenance, no CI-only flags to thread
 * through the release build.
 */
import * as Device from "expo-device";

/** Module-lifetime: the device profile never changes while the app runs. */
const EMULATOR = Device.isDevice === false;

export function isEmulatorEntranceDisabled(): boolean {
  return EMULATOR;
}
