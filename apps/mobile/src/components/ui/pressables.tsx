import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { haptics } from "@/haptics";
import { useTheme } from "@/design/theme";
import { radius, sp, touchFloor } from "@/design/tokens";
import { T } from "./text";

import { InlineBusy, useStableFlag } from "./boot";
export type ButtonKind = "primary" | "accent" | "ghost" | "danger" | "plain";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * r369 slice 04 — the pill register: every button is a full-radius
 * pill (the warm identity's action shape). primary = the indigo slab
 * (cream label), accent = the luminous pill in dark, danger = the rose
 * family (never the accent), ghost = the inset-outline secondary
 * (1.5px rule ring, transparent fill). Loading never double-submits;
 * 44px touch floor (styles.base minHeight clamps the small 36 height).
 */
export function Button({
  label,
  onPress,
  kind = "primary",
  loading = false,
  disabled = false,
  small = false,
  icon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { name, palette: p, tones } = useTheme();
  const busy = loading || disabled;
  // R327 B2: a busy flash shorter than 300ms reads as a glitch — hold it.
  const showBusy = useStableFlag(loading, 300);
  const height = small ? 36 : 48;
  /* 2026: danger rides the rose family with its own theme-flip label
   * (light #C62828 fill + white 5.62:1 · dark #FF7A70 + #262019 6.35:1)
   * — never the accent, which is the royal signal now. */
  const bg =
    kind === "primary" ? p.primary : kind === "accent" ? p.accent : kind === "danger" ? tones.rose.ink : "transparent";
  const fg =
    kind === "primary" ? p.primaryFg : kind === "accent" ? p.accentFg : kind === "danger" ? p.dangerFg : p.text;
  /* pressed: the accent deepens to its hover tier; light danger deepens
   * to the rose deep tier (dark keeps its ink — no deeper night-red rung
   * exists; the press feedback rides the opacity dip below). */
  const pressedBg =
    kind === "danger" ? (name === "light" ? tones.rose.deep : tones.rose.ink) : p.accentHover;
  /* pressed label (primary/accent): the hover tier is dark in BOTH
   * themes (#1B30B0 light · #4C63F0 dark), so the pressed royal slab
   * takes its WHITE hover label — the accentHoverFg contract
   * (10.02:1 · 4.83:1). The resting dark label #262019 would read
   * 3.34:1 on the #4C63F0 press fill — the pairing the 2026 audit
   * fixed for the web hover states, now honored on press here too. */
  const pressedFg = kind === "primary" || kind === "accent" ? p.accentHoverFg : fg;
  const border = kind === "ghost" ? p.rule : "transparent";
  // r369: the ghost's inset outline reads at 1.5px — the hairline was
  // the drawing-sheet era's ring; the warm identity's secondary is a
  // visible inset outline (spec 04: "pill with the inset-outline secondary").
  const borderWidth = kind === "ghost" ? 1.5 : StyleSheet.hairlineWidth;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => {
        if (busy) return;
        // R334 review-3 T1 — through the gated, throttled module (kill-switch + spam guard)
        haptics.impact("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: kind === "ghost" ? (pressed ? p.surfaceHover : "transparent") : pressed ? pressedBg : bg,
          borderRadius: radius.full,
          borderWidth,
          borderColor: border,
          opacity: disabled && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {({ pressed }) =>
        showBusy ? (
          <InlineBusy size={12} color={kind === "ghost" ? p.text : pressed ? pressedFg : fg} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            {icon}
            <T
              variant={small ? "sm" : "body"}
              weight="bold"
              style={{ color: pressed ? pressedFg : fg }}
            >
              {label}
            </T>
          </View>
        )
      }
    </Pressable>
  );
}

/** Square icon-only pressable (44px floor). Icons carry their own colour. */
export function IconButton({
  children,
  onPress,
  label,
  accessibilityLabel,
  style,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => {
        // R334 review-3 T1 — through the gated, throttled module (kill-switch + spam guard)
        haptics.impact("light");
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: touchFloor,
          height: touchFloor,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.55 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: sp[16],
    minHeight: touchFloor,
  },
});
