// R335 P0-7 — deep per-weight imports, not the package barrels. The barrels
// `require()` EVERY weight's .ttf so Metro ships them all even though
// fontMap below is the only consumer. Same disease as the lucide barrel
// (codemod-lucide-direct.mjs); this is the font-side cure: only the nine
// weights the ds system actually uses ride the bundle.
//
// r369 slice 04 — the warm identity's faces REPLACE the retired pair:
// body = Readex Pro (the web's body, same arabic+latin coverage), brand/
// display = Baloo Bhaijaan 2 (the web's display). The fontMap KEYS are
// unchanged ("Body-Regular"…) so every consumer + the type contract keep
// working; IBM Plex Sans Arabic + Alexandria are DELETED from the bundle.
// The brand WORDMARK (brand/wordmark.generated.ts) is untouched — the web
// kept its Plex-shaped wordmark through r369 too (a fixed brand asset,
// not a text style).
import { ReadexPro_400Regular } from "@expo-google-fonts/readex-pro/400Regular";
import { ReadexPro_500Medium } from "@expo-google-fonts/readex-pro/500Medium";
import { ReadexPro_600SemiBold } from "@expo-google-fonts/readex-pro/600SemiBold";
import { ReadexPro_700Bold } from "@expo-google-fonts/readex-pro/700Bold";
import { BalooBhaijaan2_500Medium } from "@expo-google-fonts/baloo-bhaijaan-2/500Medium";
import { BalooBhaijaan2_600SemiBold } from "@expo-google-fonts/baloo-bhaijaan-2/600SemiBold";
import { BalooBhaijaan2_700Bold } from "@expo-google-fonts/baloo-bhaijaan-2/700Bold";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono/400Regular";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono/500Medium";

/**
 * ds typography — Arabic-first.
 * Body: Readex Pro (readable everything). Brand/display: Baloo Bhaijaan 2.
 * Mono: Geist Mono for technical drafting labels.
 * Weights are the only hierarchy rungs (no tracking, no uppercase).
 */
export const fontMap = {
  "Body-Regular": ReadexPro_400Regular,
  "Body-Medium": ReadexPro_500Medium,
  "Body-SemiBold": ReadexPro_600SemiBold,
  "Body-Bold": ReadexPro_700Bold,
  "Display-Medium": BalooBhaijaan2_500Medium,
  "Display-SemiBold": BalooBhaijaan2_600SemiBold,
  "Display-Bold": BalooBhaijaan2_700Bold,
  "Mono-Regular": GeistMono_400Regular,
  "Mono-Medium": GeistMono_500Medium,
} as const;

export type FontFamily = keyof typeof fontMap;

export const fonts = {
  body: "Body-Regular",
  bodyMedium: "Body-Medium",
  bodySemiBold: "Body-SemiBold",
  bodyBold: "Body-Bold",
  display: "Display-SemiBold",
  displayMedium: "Display-Medium",
  displayBold: "Display-Bold",
  mono: "Mono-Regular",
  monoMedium: "Mono-Medium",
} as const;
