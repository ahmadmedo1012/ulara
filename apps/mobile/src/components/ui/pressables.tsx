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
import { sp, touchFloor } from "@/design/tokens";
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
 * ds buttons: the royal slab (primary — #2540D9 light / #8AA0FF dark
 * via the shared tokens), the royal fill (accent), the red destructive
 * fill (danger — the rose family, NOT the accent: 2026 fixes the
 * danger ≡ accent coupling of the sienna era), hairline ghost.
 * Loading never double-submits; 44px touch floor.
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
  const border = kind === "ghost" ? p.rule : "transparent";
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
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: border,
          opacity: disabled && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {showBusy ? (
        <InlineBusy size={12} color={kind === "ghost" ? p.text : fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          {icon}
          <T
            variant={small ? "sm" : "body"}
            weight="bold"
            style={{ color: fg }}
          >
            {label}
          </T>
        </View>
      )}
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
