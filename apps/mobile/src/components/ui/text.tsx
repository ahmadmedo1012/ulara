import { type ReactNode } from "react";
import { Text, useWindowDimensions, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { usePalette, useStatusTones } from "@/design/theme";
import { fonts } from "@/design/fonts";
import { type } from "@/design/tokens";
import { ltrText } from "@/design/type";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "bodyLg"
  | "body"
  | "sm"
  | "xs"
  | "mono"
  | "monoSm";

export type TextColorRole =
  | "text"
  | "secondary"
  | "muted"
  | "faint"
  | "accentInk"
  | "accent"
  | "onPrimary"
  | "onAccent"
  | "gold"
  | "danger"
  | "inherit";

const sizes: Record<TextVariant, TextStyle> = {
  display: { fontSize: type.display, lineHeight: 46 },
  h1: { fontSize: type.h1, lineHeight: 40 },
  h2: { fontSize: type.h2, lineHeight: 32 },
  h3: { fontSize: type.h3, lineHeight: 28 },
  h4: { fontSize: type.h4, lineHeight: 24 },
  bodyLg: { fontSize: type.bodyLg, lineHeight: 24 },
  body: { fontSize: type.body, lineHeight: 20 },
  sm: { fontSize: type.sm, lineHeight: 18 },
  xs: { fontSize: type.xs, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: type.body, lineHeight: 20 },
  monoSm: { fontFamily: fonts.mono, fontSize: type.xs, lineHeight: 16 },
};

export interface TProps extends TextProps {
  variant?: TextVariant;
  color?: TextColorRole;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "auto" | "left" | "right" | "center";
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * r362 P4 — FONT-SCALE-AWARE LINE HEIGHT (the 200 % text-size cure).
 *
 * React Native scales `fontSize` with the OS font-size setting
 * (`allowFontScaling` is on by default) but `lineHeight` is an absolute dp
 * value that does NOT scale. At 200 % the glyphs doubled while the line box
 * stayed put: lines collided, and text overflowed the box it was measured
 * in — the emulator capture at font_scale=2.0 showed the welcome headline
 * climbing into the illustration and the paragraph running off the edge.
 *
 * The fix keeps the scale honest instead of capping accessibility: the line
 * box follows the same font scale, and it never drops below the house
 * Arabic floor `1.35 × fontSize` at that scale (the same rule the web sheet
 * enforces). At fontScale 1 this returns the variant UNCHANGED, byte for
 * byte — the whole designed type scale is untouched at normal size.
 *
 * Only `lineHeight` is set here: adding `fontSize` would be scaled AGAIN by
 * RN and double the text.
 */
export function scaleLineHeight(base: TextStyle, fontScale: number): TextStyle {
  if (!Number.isFinite(fontScale) || fontScale <= 1) return base;
  const fontSize = base.fontSize ?? 0;
  const lineHeight = base.lineHeight ?? Math.round(fontSize * 1.35);
  const scaledFs = fontSize * fontScale;
  return {
    ...base,
    lineHeight: Math.ceil(Math.max(lineHeight * fontScale, scaledFs * 1.35)),
  };
}

export function T({ variant = "body", color = "text", weight, align, style, ...rest }: TProps) {
  const p = usePalette();
  const tones = useStatusTones();
  // Re-renders when the reader changes the OS text size.
  const { fontScale } = useWindowDimensions();
  const colorValue =
    color === "inherit"
      ? undefined
      : {
          text: p.text,
          secondary: p.textSecondary,
          muted: p.textMuted,
          faint: p.textFaint,
          accentInk: p.accentInk,
          accent: p.accent,
          onPrimary: p.primaryFg,
          onAccent: p.accentFg,
          gold: p.goldInk,
          danger: tones.rose.deep,
        }[color];
  const weightFamily =
    variant === "mono" || variant === "monoSm"
      ? weight === "medium"
        ? fonts.monoMedium
        : fonts.mono
      : weight === "bold"
        ? fonts.bodyBold
        : weight === "semibold"
          ? fonts.bodySemiBold
          : weight === "medium"
            ? fonts.bodyMedium
            : variant === "display"
              ? fonts.display
              : undefined;
  const variantStyle = scaleLineHeight(sizes[variant], fontScale);
  const family: TextStyle = weightFamily
    ? { fontFamily: weightFamily }
    : variant === "display"
      ? { fontFamily: fonts.display }
      : {};
  return (
    <Text
      {...rest}
      style={[
        variantStyle,
        family,
        colorValue ? { color: colorValue } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
    />
  );
}

/** Mono drafting label — [01] index style, Latin, LTR. */
export function MonoLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return (
    <Text style={[sizes.monoSm, { fontFamily: fonts.mono, color: p.textFaint, textAlign: "left" }, style]}>
      {children}
    </Text>
  );
}

/**
 * BidiText — mixed-direction isolation for Arabic prose carrying Latin runs
 * (review-2 P0-1, reclassified P1 · T-50).
 *
 * The Unicode bidi algorithm orders INLINE Latin/digit runs inside RTL prose
 * correctly (the type.ts policy), but a Latin run at a string BOUNDARY drags
 * its neighboring neutrals («·», «—», «.») across the direction switch and
 * flips their placement on Android — «د. سلام · SE301» renders its dot on
 * the wrong side, «مخططات UML — Use Case» swaps its dash. BidiText keeps
 * the copy byte-identical and seats each Latin fragment in its own nested
 * <Text> with `ltrText` (the documented LTR-island pattern from
 * design/type.ts): a strong-LTR island the RTL paragraph cannot reorder
 * against. Digit-only runs (times, percentages) carry no strong direction
 * and are deliberately left inline.
 *
 * Non-string children pass through untouched — safe around any <T> slot.
 */
export function BidiText({ children, ...rest }: TProps) {
  return <T {...rest}>{typeof children === "string" ? isolateLatinRuns(children) : children}</T>;
}

/** Latin fragment: starts with a letter, may carry codes/emails/URLs inside. */
const LATIN_RUN = /[A-Za-z][A-Za-z0-9@._:/+#&%-]*/g;

/** Split a string into prose + isolated Latin islands (keys stable per index). */
export function isolateLatinRuns(input: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of input.matchAll(LATIN_RUN)) {
    const at = match.index ?? 0;
    if (at > last) out.push(input.slice(last, at));
    out.push(
      <Text key={`lat-${at}`} style={ltrText}>
        {match[0]}
      </Text>,
    );
    last = at + match[0].length;
  }
  if (last < input.length) out.push(input.slice(last));
  return out;
}
