/**
 * R326 M1.3(e) — RTL direction, applied safely.
 *
 * `I18nManager.forceRTL(true)` at module scope only takes effect on the NEXT
 * native launch. The r326 fix drove ONE controlled `Updates.reloadAsync()`
 * on first-ever launch so the baked direction went live immediately.
 *
 * ULARA takeover (run 43257920033 + 43290031426 forensics): the JS-only
 * reload WEDGES react-native-reanimated layout animations on Android
 * release builds — every `entering={}`-wrapped container (the Welcome's
 * brand row, title stack, CTA, footer — 60 seats across 18 files) stays at
 * its initial opacity-0 state after the reload, while core-Animated and
 * SVG content renders fine. The five-role journey's screenshots show the
 * Welcome with the plan drawing visible and ALL text absent; the
 * accessibility tree carries zero text nodes. A mirrored (LTR) first
 * session is a far better failure mode than an invisible one, so the
 * reload is RETIRED: the direction applies on the user's next natural
 * launch (the pre-r326 behaviour), and the module-scope forceRTL calls
 * keep baking the preference.
 */
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ula.rtl.applied.v1";

/**
 * Returns true when the caller should hold the splash (never in the
 * current design — kept for the call-site's contract).
 */
export async function ensureRTL(): Promise<boolean> {
  try {
    if (I18nManager.isRTL) {
      await AsyncStorage.setItem(KEY, "1").catch(() => undefined);
      return false;
    }
    // Already baked by a previous session (or the retired r326 flow)?
    const done = await AsyncStorage.getItem(KEY).catch(() => null);
    if (done === null) {
      // First-ever launch in an LTR process: bake the preference now; the
      // direction goes live on the NEXT natural launch. NO reload — see
      // the module header.
      await AsyncStorage.setItem(KEY, "1").catch(() => undefined);
    }
    return false;
  } catch {
    return false;
  }
}
