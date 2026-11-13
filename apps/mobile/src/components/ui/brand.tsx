import { StyleSheet, View } from "react-native";
import { usePalette } from "@/design/theme";
import { Logo } from "@/brand";
import { T } from "./text";

/**
 * brand.tsx — the mobile brand SEAT components.
 *
 * R336 B1 (brand unification): the competing <BrandMark>/<BrandLockup>
 * renderers are RETIRED. They duplicated the canonical Logo's geometry
 * (hardcoded viewBox, a second copy of the X11 stroke-ramp math, a
 * divergent a11y label, raw-hex color overrides) while the canonical
 * RN <Logo> (src/brand/Logo.tsx — byte-identical geometry to the web,
 * enforced by tokens:check) had zero production call-sites.
 *
 * Every former BrandMark seat now renders <Logo variant="mark"> — ONE
 * renderer per platform, from the ONE geometry source. What remains
 * here are legitimate CHROME seats (not logo renderers):
 *  · LaunchSheet — the transition/splash sheet: Logo mark + drafting
 *    frame corners + label. The drafting ticks are chrome, not a mark.
 */
export function LaunchSheet({ label }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <View
        style={{
          padding: 40,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          position: "relative",
        }}
      >
        <Logo variant="mark" size={72} testID="launch-sheet-mark" />
        <View style={{ position: "absolute", top: -1, right: -1, width: 8, height: 8, backgroundColor: p.accent }} />
        <View style={{ position: "absolute", bottom: -1, left: -1, width: 8, height: 8, backgroundColor: p.accent }} />
      </View>
      <T variant="h3" weight="bold">
        {label ?? "أُلارا"}
      </T>
      <T variant="sm" color="muted">
        نظام تشغيل الجامعة
      </T>
    </View>
  );
}
