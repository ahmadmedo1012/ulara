import Svg, { Path, Rect } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/design/theme";
import { MARK_VESSEL_PATH, MARK_CORNERSTONE, markStrokePx } from "@/brand/mark";
import { T } from "./text";

/**
 * The Ulara brand mark — geometry from src/brand/mark.ts (the U-vessel):
 * ONE round-capped ink stroke (two stems + the quadratic bowl) and the
 * sienna cornerstone square at the right stem's top.
 */
export function BrandMark({ size = 32, ink, orange }: { size?: number; ink?: string; orange?: string }) {
  const p = usePalette();
  const stroke = ink ?? p.text;
  const accent = orange ?? p.accent;
  // The web's non-scaling hairline (X11 optical ramp), reproduced in
  // viewBox units — same rendered px weight at every size.
  const sw = +((markStrokePx(size) * 32) / size).toFixed(3);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="شعار أُلارا">
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path
          d={MARK_VESSEL_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Rect
          x={MARK_CORNERSTONE.x}
          y={MARK_CORNERSTONE.y}
          width={MARK_CORNERSTONE.size}
          height={MARK_CORNERSTONE.size}
          fill={accent}
        />
      </Svg>
    </View>
  );
}

/** Wordmark row — mark + أُلارا word in display weight. */
export function BrandLockup({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <BrandMark size={size} />
      <T variant="h3" weight="bold">
        أُلارا
      </T>
    </View>
  );
}

/** Launch sheet: paper ground, mark, and the drafting frame corners. */
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
        <BrandMark size={72} />
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
