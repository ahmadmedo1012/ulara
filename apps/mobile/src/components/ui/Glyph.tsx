import { useMemo } from "react";
import Svg, { Path } from "react-native-svg";
import { GLYPHS, type GlyphDef, type GlyphName } from "./glyphs";

/**
 * <Glyph name="star" size={20} color={p.text} /> — the r369 duotone icon
 * language on RN (react-native-svg). The accent layer paints `color` at
 * 18% alpha behind the 2px stroke layer: one colour in, both themes right.
 * Decorative by default (accessibilityElementsHidden) — the call site
 * names the control when the glyph IS the control.
 */
export function Glyph({
  name,
  size = 20,
  color,
  accessibilityLabel,
}: {
  name: GlyphName;
  size?: number;
  color: string;
  accessibilityLabel?: string;
}) {
  const g = GLYPHS[name] as GlyphDef;
  const paths = useMemo(() => g.stroke, [g]);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
    >
      {g.accent ? <Path d={g.accent} fill={color} opacity={0.18} /> : null}
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
