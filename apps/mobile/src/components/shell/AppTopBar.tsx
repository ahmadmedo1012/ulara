import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { router } from "expo-router";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Bell from "lucide-react-native/icons/bell";
import Search from "lucide-react-native/icons/search";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Logo } from "@/brand";
import { latn } from "@/lib/format";
import { useUnreadCount } from "@/hooks/useNotifications";
import { COLLAPSE } from "./collapse";

/**
 * AppTopBar — the compact role-shell header (R334 3-a policy):
 * brand · title · search · bell.
 *
 * The identity block (user name + institution chip + avatar → /settings)
 * lived here since R331 and crowded every tab screen; identity/institution
 * now live in Profile (حسابي — the identity card is that tab's hero) and
 * /settings stays reachable from the Profile menu + the report card. The
 * prop contract is unchanged (`alertsPath`) — all ~30 tab screens compile
 * untouched.
 *
 * "back/menu" seat: there is no drawer in this app (the shell is
 * tab-based); pushed screens get their back affordance from StackHeader.
 *
 * r351 N2 — the COLLAPSING SEAT (optional, backward-compatible): when a
 * LargeTitleScreen drives this bar (collapsedTitle + collapseProgress),
 * the brand-word seat crossfades «أُلارا» → the screen title as the
 * large title collapses (opacity-only; geometry from shell/collapse.ts).
 * The ~30 screens that mount AppTopBar bare compile and render unchanged
 * (no collapsedTitle → the plain brand word, exactly as before). The two
 * stacked seat labels are BOTH exposed to screen readers at rest — an
 * honest breadcrumb (app name, then screen name), not hidden chrome; the
 * in-scroll driven opacity flip cannot be mirrored into a11y traits
 * without JS-thread work inside the gesture, which the motion contract
 * forbids.
 */
export function AppTopBar({
  alertsPath,
  collapsedTitle,
  collapseProgress,
}: {
  alertsPath: string;
  /** r351 N2 — what the seat crossfades to when the large title collapses. */
  collapsedTitle?: string;
  /** r351 N2 — the scroll-driven collapse progress (from LargeTitleScreen). */
  collapseProgress?: SharedValue<number>;
}) {
  const p = usePalette();
  const { data: unread = 0 } = useUnreadCount();

  /* r351 N2 — the seat crossfade. Plain Math.* over captured CONSTANTS
   * (worklet-safe; no captured functions — the CountUp R336 rule). At
   * rest (progress 0) the brand word is fully visible and the collapsed
   * title fully transparent; the windows come from shell/collapse.ts. */
  const brandSeatStyle = useAnimatedStyle(() => {
    const t = (collapseProgress?.value ?? 0) / COLLAPSE.threshold;
    const opacity = Math.max(
      0,
      Math.min(1, (COLLAPSE.seatOut[1] - t) / (COLLAPSE.seatOut[1] - COLLAPSE.seatOut[0])),
    );
    return { opacity };
  });
  const titleSeatStyle = useAnimatedStyle(() => {
    const t = (collapseProgress?.value ?? 0) / COLLAPSE.threshold;
    const opacity = Math.max(
      0,
      Math.min(1, (t - COLLAPSE.seatIn[0]) / (COLLAPSE.seatIn[1] - COLLAPSE.seatIn[0])),
    );
    return { opacity };
  });

  return (
    <View
      style={{
        paddingHorizontal: sp[16],
        paddingTop: sp[8],
        paddingBottom: sp[8],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        backgroundColor: p.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        minHeight: 52,
      }}
    >
      <Logo variant="mark" size={26} />
      {collapsedTitle ? (
        /* r351 N2 — the crossfade seat: one slot, two stacked labels. */
        <View style={{ flex: 1, height: "100%" }}>
          <Animated.View style={[styles.seatFill, brandSeatStyle]} pointerEvents="none">
            <T variant="h4" weight="bold" numberOfLines={1}>
              أُلارا
            </T>
          </Animated.View>
          <Animated.View style={[styles.seatFill, titleSeatStyle]} pointerEvents="none">
            <T variant="h4" weight="bold" numberOfLines={1}>
              {collapsedTitle}
            </T>
          </Animated.View>
        </View>
      ) : (
        <T variant="h4" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
          أُلارا
        </T>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="البحث"
        onPress={() => router.push("/search")}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Search size={20} color={p.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `الإشعارات — ${latn(unread)} غير مقروءة` : "الإشعارات"}
        onPress={() => router.push(alertsPath as never)}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <View>
          <Bell size={20} color={p.text} />
          {unread > 0 ? (
            <View
              accessibilityElementsHidden
              style={{
                position: "absolute",
                top: -2,
                start: 12,
                minWidth: 16,
                height: 16,
                // Square — the ds radius ruling (the tab-bar badge and the
                // Badge chip are square; this pill was the lone round badge).
                backgroundColor: p.accent,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <T variant="xs" style={{ color: p.accentFg }}>
                {unread > 99 ? "99+" : latn(unread)}
              </T>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

/**
 * StackHeader — back arrow (RTL: points right) + drafting title.
 * The pushed-screen header (compact policy: back · title · right action).
 * The large-title collapse lives in LargeTitleScreen (r351 N2) — the
 * in-screen header over a scroll body; pushed screens keep this compact
 * chrome; see docs/mobile/screens/shell.md.
 */
export function StackHeader({
  title,
  kicker,
  right,
  onBack,
}: {
  title: string;
  kicker?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        backgroundColor: p.surface,
        paddingHorizontal: sp[8],
        paddingTop: sp[4],
        paddingBottom: sp[8],
        minHeight: 52,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => (onBack ? onBack() : router.back())}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <ArrowRight size={22} color={p.text} />
      </Pressable>
      <View style={{ flex: 1, gap: 0 }}>
        {kicker ? (
          <T variant="xs" color="muted" numberOfLines={1}>
            {kicker}
          </T>
        ) : null}
        <T variant="h4" weight="bold" numberOfLines={1}>
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  /* r351 N2 — the crossfade seat's two stacked fills (see AppTopBar). */
  seatFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    justifyContent: "center",
  },
});
