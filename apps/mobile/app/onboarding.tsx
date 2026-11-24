import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/pressables";
import { Hairline } from "@/components/ui/surfaces";
import { T, MonoLabel } from "@/components/ui/text";
import { OnboardingArt } from "@/components/art";
import { onboardingScreens, ONBOARDING_SCREEN_COUNT } from "@/features/onboarding/onboardingContent";
import { useSession } from "@/auth/session";
import { post } from "@/api/client";
import { haptics } from "@/haptics";
import { requestAndRegisterPush, type PushPermissionState } from "@/lib/push";
import Animated from "react-native-reanimated";
import { fadeIn } from "@/motion/entrance";
import { useTheme } from "@/design/theme";

/**
 * /onboarding — r359 A4 (M2): the FIRST-RUN tour, four screens,
 * ROLE-AWARE (it runs AFTER login — the boot rule sends any user with
 * `onboardingCompletedAt == null` here before their role home), with
 * notification-permission PRIMING on screen 3 (the value-shown ask:
 * the user is looking at the category primer when the system dialog
 * fires — never a cold prompt at first open).
 *
 * Grammar: the flat drafting language — hairline progress rule, mono
 * `[02/04]` counter, paper ground, ONE royal action per screen, art in
 * A2's hairline-frame contract (components/art). A «تخطي» escape is
 * always reachable (a tour is an offer, never a wall). Screen changes
 * cross-fade with the ds entrance (no pager — a tap-driven tour is
 * deterministic on every device, emulator and RTL included).
 *
 * Completion: POST /me/onboarding/complete (idempotent server-side) →
 * the session user is stamped locally → router.replace("/") re-runs
 * the boot rule, which now resolves to the role home.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { palette: p } = useTheme();
  const user = useSession((s) => s.user);
  const [page, setPage] = useState(0);
  const [pushState, setPushState] = useState<PushPermissionState | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [completing, setCompleting] = useState(false);

  const screens = useMemo(() => onboardingScreens(user?.role ?? "STUDENT"), [user?.role]);
  const screen = screens[page]!;
  const isLast = page === ONBOARDING_SCREEN_COUNT - 1;

  const complete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    void haptics.notify?.("success");
    try {
      // Idempotent server-side; the local stamp lets the boot rule
      // resolve immediately even if the POST races a logout.
      await post("/me/onboarding/complete");
    } catch {
      /* best-effort: the tour completes regardless — the next login
       * re-offers it if the server never recorded the completion. */
    }
    if (user) {
      useSession.setState({ user: { ...user, onboardingCompletedAt: new Date().toISOString() } });
    }
    void qc.invalidateQueries({ queryKey: ["session", "me"] });
    router.replace("/");
  }, [completing, qc, router, user]);

  const goNext = useCallback(() => {
    if (isLast) {
      void complete();
      return;
    }
    void haptics.selection();
    setPage((n) => n + 1);
  }, [complete, isLast]);

  const enablePush = useCallback(async () => {
    if (enabling) return;
    setEnabling(true);
    try {
      const state = await requestAndRegisterPush();
      setPushState(state);
      void haptics.notify?.(state === "granted" ? "success" : "warning");
    } finally {
      setEnabling(false);
    }
  }, [enabling]);

  return (
    <Screen scroll={false} padded={false}>
      {/* top row: the skip escape (a tour is an offer) + the mono counter */}
      <View style={styles.topRow}>
        <MonoLabel>{`[${String(page + 1).padStart(2, "0")}/${String(ONBOARDING_SCREEN_COUNT).padStart(2, "0")}]`}</MonoLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تخطي المقدمة"
          testID="onboarding-skip"
          onPress={() => void complete()}
          hitSlop={12}
          style={styles.skip}
        >
          <T variant="body" color="secondary">
            تخطي
          </T>
        </Pressable>
      </View>

      {/* the hairline progress rule: one segment per screen, the royal
       * signal marks the covered ground — numbers + rules, no dots. */}
      <View style={styles.progressRow}>
        {screens.map((s, i) => (
          <View
            key={s.index}
            testID={`onboarding-progress-${i + 1}`}
            style={[styles.progressSeg, { backgroundColor: i <= page ? p.primary : p.border }]}
          />
        ))}
      </View>
      <Hairline />

      <Animated.View entering={fadeIn({ duration: 260 })} style={styles.page} key={page}>
        <View style={styles.artSeat}>
          <OnboardingArt index={screen.art} />
        </View>
        <View style={styles.copySeat}>
          <MonoLabel>{screen.kicker}</MonoLabel>
          <T variant="h1" weight="semibold" align="right" style={styles.title}>
            {screen.title}
          </T>
          <T variant="bodyLg" color="secondary" align="right" style={styles.body}>
            {screen.body}
          </T>
        </View>
      </Animated.View>

      {/* screen 3 carries the notification priming — the value-shown
       * ask (the user is reading the category primer at this moment). */}
      {screen.index === 3 ? (
        <View style={styles.pushSeat}>
          {pushState === null || pushState === "undetermined" ? (
            <Button
              label={enabling ? "جارٍ الطلب…" : "تفعيل الإشعارات"}
              kind="accent"
              small
              onPress={() => void enablePush()}
              loading={enabling}
              accessibilityLabel="تفعيل الإشعارات"
            />
          ) : (
            <T variant="body" color={pushState === "granted" ? "text" : "secondary"} align="right">
              {pushState === "granted"
                ? "تم التفعيل — ستصل إليك الإشعارات المهمة."
                : "لم تُفعَّل الإشعارات — يمكنك تفعيلها لاحقًا من الإعدادات."}
            </T>
          )}
        </View>
      ) : null}

      <Hairline />
      <View style={styles.footer}>
        <Button
          label={isLast ? "ابدأ الآن" : "التالي"}
          kind="primary"
          onPress={isLast ? () => void complete() : goNext}
          loading={completing && isLast}
          accessibilityLabel={isLast ? "ابدأ استخدام أُلارا" : "الشاشة التالية"}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 56,
  },
  skip: { paddingHorizontal: 12, paddingVertical: 12 },
  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingBottom: 10 },
  progressSeg: { flex: 1, height: 2 },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  artSeat: { flex: 1.05, justifyContent: "center", minHeight: 120 },
  copySeat: { flex: 1, gap: 12, justifyContent: "flex-start" },
  title: { fontSize: 32, lineHeight: 42 },
  body: { lineHeight: 30 },
  pushSeat: { paddingHorizontal: 24, paddingVertical: 12, alignItems: "flex-start" },
  footer: { flexDirection: "row", padding: 20, paddingBottom: 28 },
  cta: { flex: 1 },
});
