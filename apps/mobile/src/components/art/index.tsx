/**
 * components/art — the r359 ART CONTRACT (A2 supplies, A1/A3/A4 consume).
 *
 * A4 commits this PLACEHOLDER implementation so the consuming surfaces
 * (onboarding, launch moment) compile and render honestly today: each
 * key renders the flat drafting placeholder — a hairline frame with
 * the mono key label — never a broken import or an empty box. The
 * integrator takes A2's real illustrations on the expected add/add
 * conflict (the interface below is the contract).
 *
 * Interface (stable):
 *   · OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 }) — the four
 *     first-run onboarding illustrations (keys onboarding-1..4).
 *   · SplashMarkMotion({ size, done }: { size: number; done: () => void })
 *     — the ≤1.2s launch brand moment (mark + hairline draw), already
 *     reduced-motion safe (the placeholder honors it too).
 */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MonoLabel } from "@/components/ui/text";
import { Hairline } from "@/components/ui/surfaces";

export function OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 }): React.ReactElement {
  return (
    <View style={styles.frame} accessibilityRole="image" accessibilityLabel={`لوحة الترحيب ${index}`}>
      <Hairline />
      <View style={styles.inner}>
        {/* The drafting placeholder: a mono key label in a hairline
         * frame — A2's illustration replaces this whole interior. */}
        <MonoLabel>{`[onboarding-0${index}]`}</MonoLabel>
      </View>
      <Hairline />
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
  frame: { width: "100%", aspectRatio: 1.35, justifyContent: "center" },
  inner: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed" },
  markFrame: { alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
});
