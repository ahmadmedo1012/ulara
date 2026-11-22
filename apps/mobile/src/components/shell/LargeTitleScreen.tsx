/**
 * r351 N2 — LargeTitleScreen: the collapsing large-title header.
 *
 * THE PATTERN (the owner's N2 ask, the iOS large-title grammar on this
 * app's drafting language): a large title (mono kicker + h1) sits at the
 * head of the SCROLL CONTENT and scrolls with it; above it, the fixed
 * compact bar (AppTopBar) keeps its persistent actions (mark · search ·
 * bell) while its brand-word seat crossfades «أُلارا» → the screen
 * title as the large title collapses (geometry: shell/collapse.ts).
 *
 * CONTRACTS:
 *   · UI-thread only — one scroll handler writes a shared value; every
 *     driven style is opacity/translateY via Math.* arithmetic over the
 *     captured COLLAPSE constants (no captured functions — the CountUp
 *     R336 remote-call freeze rule; no interpolate() — its jest mock is
 *     a NOOP and would hollow the rest-state pins).
 *   · Reduced motion (AccessibilityInfo via useReduceMotion): the
 *     title's upward DRIFT is dropped; the opacity crossfade stays
 *     (opacity-only degradation — the app's B2 motion rule).
 *   · One-title law: the screen carries ONE title — the large one in
 *     content; the bar seat is the same words, smaller, not a second
 *     heading. Kicker is a mono micro-label (≤ 3 words).
 *   · The bar NEVER unmounts and its actions never move — only the
 *     seat crossfades (calm chrome; the tab-bar never-recompose
 *     contract's sibling rule).
 *   · Pull-to-refresh rides when the screen passes refreshing/onRefresh
 *     (same accent tint as ScrollBody/DataList).
 *
 * HONESTY: pinned under jest at REST (progress 0 — the large title
 * fully visible, the collapsed seat transparent) + the pure clamp in
 * collapse.ts. The scrolled-through values are UI-thread work and stay
 * device-UNVERIFIED from this sandbox (no emulator).
 */
import { type ReactNode } from "react";
import { RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { T, MonoLabel } from "@/components/ui/text";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { AppTopBar } from "./AppTopBar";
import { COLLAPSE } from "./collapse";

export interface LargeTitleScreenProps {
  /** The large title — the screen's ONE heading (h1, in scroll content). */
  title: string;
  /** Mono micro-label above the title (≤ 3 words — institution, state). */
  kicker?: string;
  /** What the bar seat crossfades to when collapsed (default: the title). */
  barTitle?: string;
  /** The role's alerts route — forwarded to the bar's bell. */
  alertsPath: string;
  /** Pull-to-refresh (same accent tint as ScrollBody/DataList). */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Horizontal padding for the scroll content (default true). */
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function LargeTitleScreen({
  title,
  kicker,
  barTitle,
  alertsPath,
  refreshing,
  onRefresh,
  padded = true,
  contentContainerStyle,
  children,
}: LargeTitleScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();

  /* ONE scroll write; every consumer reads the shared value on the UI
   * thread. scrollEventThrottle 16 = one write per frame, not per event
   * burst. */
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
    },
  });

  /* The large title: opacity fades to gone at titleFadeAt × threshold;
   * the upward drift (full motion only) adds the parallax release.
   * Math.* over captured CONSTANTS — worklet-safe (see docblock). */
  const titleStyle = useAnimatedStyle(() => {
    const t = y.value / COLLAPSE.threshold;
    const opacity = Math.max(
      0,
      Math.min(1, (COLLAPSE.titleFadeAt - t) / COLLAPSE.titleFadeAt),
    );
    const translateY = reduced ? 0 : -COLLAPSE.drift * Math.min(1, t);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <AppStatusBar />
      <AppTopBar alertsPath={alertsPath} collapsedTitle={barTitle ?? title} collapseProgress={y} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.accent} colors={[p.accent]} />
          ) : undefined
        }
        contentContainerStyle={[
          styles.body,
          padded && styles.pad,
          { paddingBottom: insets.bottom + sp[24] },
          contentContainerStyle,
        ]}
      >
        <Animated.View style={[styles.head, titleStyle]}>
          {kicker ? <MonoLabel>{kicker}</MonoLabel> : null}
          <T variant="h1" weight="bold">
            {title}
          </T>
        </Animated.View>
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, gap: sp[16] },
  pad: { paddingHorizontal: sp[20] },
  head: { gap: sp[6], paddingTop: sp[12], paddingBottom: sp[4] },
});
