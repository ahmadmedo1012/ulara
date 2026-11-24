/**
 * components/art — the r359 ART CONTRACT (A2 supplies, A1/A3/A4 consume).
 *
 * A4 commits this PLACEHOLDER implementation so the consuming surfaces
 * (onboarding, launch moment) compile and render honestly today. The
 * placeholder is NOT an empty dashed box: it rides the repo's OWN
 * self-drawing blueprint language (`src/brand/plan/` — the same elevations
 * the Welcome and empty-state rooms already use), so every surface reads
 * as designed draftsmanship rather than wireframe. A2's real
 * illustrations (keys onboarding-1..4, SplashMarkMotion) replace these
 * interiors on the expected add/add conflict — the interface below is
 * the contract:
 *
 *   · OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 })
 *   · SplashMarkMotion({ size, done }: { size: number; done: () => void })
 *     — reduced-motion safe (≤1.2s mark + hairline draw).
 */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MonoLabel } from "@/components/ui/text";
import {
  PlanBuilding,
  PlanExamHall,
  PlanLectureHall,
  PlanLibrary,
} from "@/brand/plan";

/** The onboarding key → the repo blueprint that carries it until A2's
 * illustration lands (1 welcome → the facade; 2 your space → the lecture
 * hall; 3 notifications → the exam hall's vigilance; 4 start → the
 * library's calm). */
const PLAN_BY_INDEX: Record<1 | 2 | 3 | 4, React.ComponentType<React.ComponentProps<typeof PlanBuilding>> | null> = {
  1: PlanBuilding,
  2: PlanLectureHall,
  3: PlanExamHall,
  4: PlanLibrary,
};

export function OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 }): React.ReactElement {
  const Plan = PLAN_BY_INDEX[index] ?? PlanBuilding;
  return (
    <View style={styles.frame} accessibilityRole="image" accessibilityLabel={`لوحة الترحيب ${index}`}>
      {/* the blueprint plate fills the frame */}
      <View style={styles.plate}>
        <Plan width="100%" color="#1A1713" autoplay />
      </View>
      {/* the drafting corner tag: the A2 key this surface awaits — mono,
       * hairline-anchored, the placeholder's honest label */}
      <View style={styles.tagRow}>
        <MonoLabel>{`[onboarding-0${index}]`}</MonoLabel>
        <View style={styles.tagRule} />
      </View>
    </View>
  );
}

export function SplashMarkMotion({ size, done }: { size: number; done: () => void }): React.ReactElement {
  useEffect(() => {
    const t = setTimeout(done, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.markFrame, { width: size, height: size }]} accessibilityLabel="علامة أُلارا">
      <MonoLabel>[ulara]</MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 1.35 },
  plate: { flex: 1, alignItems: "center", justifyContent: "center" },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
  },
  tagRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#B3B3AF" },
  markFrame: { alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
});
