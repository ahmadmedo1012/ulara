/**
 * R334 2-a — CountUp: the animated number (KPI counters, XP, scores).
 *
 * Platform split (the robust RN + web approach):
 *   · native — the UI-thread TextInput trick: the shared progress drives a
 *     derived string, pushed to the `text` prop of an uncontrolled
 *     Animated TextInput via useAnimatedProps. Zero JS-thread frames.
 *   · web — react-native-web's TextInput has no `text` native prop, so the
 *     same derived value mirrors through state via useAnimatedReaction +
 *     runOnJS (reanimated on web drives updates from the same frame loop,
 *     so fidelity is identical — there is no separate UI thread there).
 *
 * Reduced motion → instant: a plain Text at the final value, no hooks
 * churn, no animation.
 *
 * R336 G — THE POST-LOGIN FREEZE FIX (worklet discipline):
 * The old design shaped output through a `formatter` PROP — a plain JS
 * function captured and CALLED inside the useDerivedValue worklet. On
 * reanimated 4 / react-native-worklets that is a synchronous REMOTE call
 * from the UI runtime, which is forbidden: it raises
 *   "[Worklets] Tried to synchronously call a Remote Function" →
 *   ReactNoCrashSoftException → the ReactHost TEARS DOWN the context —
 * the process stays alive rendering a blank, frozen screen, with NO
 * crash signature in logcat (the soft exception matches none of the
 * FATAL/JS-Error/SIGABRT/Invariant greps). CountUp is the KPI cell on
 * every role dashboard, so EVERY role froze exactly at first dashboard
 * render after login — the owner's device symptom, root-caused on the
 * android-smoke emulator (run 43419376264 forensics: the exception
 * lands at the login-submit → dashboard-mount instant).
 *
 * The face is DATA now: `numerals` ('latin' | 'arabic-indic') + `suffix`
 * are captured primitives, and ONE module-scope 'worklet' function does
 * the shaping on the UI thread. The formatter prop is retired.
 */
import { useEffect, useState } from "react";
import {
  Platform,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import type { ComponentType } from "react";
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { durations, easings } from "./presets";

/**
 * RN's TextInput type has no `text` prop, but the native component accepts
 * one — that's the documented reanimated UI-thread text trick. Typing the
 * animated wrapper with it keeps useAnimatedProps fully checked instead of
 * casting the value at the JSX site.
 */
type AnimatedTextInputProps = TextInputProps & { text?: string };

const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput as unknown as ComponentType<AnimatedTextInputProps>,
);

/** The numeral faces CountUp can render. */
export type CountUpNumerals = "latin" | "arabic-indic";

/** Arabic-Indic digit table — data (safe to capture in the worklet). */
const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * The ONE face-shaper — a WORKLET (module scope, 'worklet' directive) so
 * useDerivedValue can call it ON THE UI RUNTIME. Pure digit mapping +
 * suffix concat — exactly what lib/format's Intl-free transform does on
 * the JS side (Hermes Intl is engine-dependent — the R326 rule), with no
 * captured-function calls anywhere.
 */
const formatFace = (n: number, numerals: CountUpNumerals, suffix: string): string => {
  "worklet";
  const digits = String(Math.round(n));
  if (numerals !== "arabic-indic") return digits + suffix;
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    const d = digits.charCodeAt(i) - 48;
    out += d >= 0 && d <= 9 ? ARABIC_INDIC[d] : digits[i];
  }
  return out + suffix;
};

/**
 * Input-neutralizing defaults — a bare TextInput carries intrinsic
 * padding/border/background AND an intrinsic width that overflows narrow
 * stat cells on RN-web at wide layouts (R334 review finding on the 768dp
 * capture). Merged BEFORE the caller's style so it stays overridable.
 */
const inputBaseStyle: TextStyle = {
  padding: 0,
  borderWidth: 0,
  backgroundColor: "transparent",
  textAlign: "center",
  width: "100%",
};

export interface CountUpProps {
  /** the number to count to (changes re-animate from the current value). */
  value: number;
  /** animation duration in ms (default 650 — durations.countUp). */
  duration?: number;
  /** the numeral face: 'latin' (default) or 'arabic-indic' — data, not a
   *  function (R336 G: captured functions are remote calls on the UI
   *  runtime — see the header). */
  numerals?: CountUpNumerals;
  /** appended after the shaped number (e.g. '%' — the rates face). */
  suffix?: string;
  style?: StyleProp<TextStyle>;
  /** announced to screen readers — defaults to the FINAL formatted value,
   *  so a11y users never sit through the count. */
  accessibilityLabel?: string;
  testID?: string;
}

export function CountUp({
  value,
  duration = durations.countUp,
  numerals = "latin",
  suffix = "",
  style,
  accessibilityLabel,
  testID,
}: CountUpProps) {
  const reduced = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = value; // instant set
    } else {
      progress.value = withTiming(value, { duration, easing: easings.ds });
    }
  }, [value, duration, reduced, progress]);

  const text = useDerivedValue(() => formatFace(progress.value, numerals, suffix));

  // web mirror — native never enters this path (prepare returns null there)
  const shouldMirror = Platform.OS === "web";
  const [mirror, setMirror] = useState(() => formatFace(0, numerals, suffix));
  useAnimatedReaction(
    () => (shouldMirror ? text.value : null),
    (next, prev) => {
      if (next != null && next !== prev) {
        runOnJS(setMirror)(next);
      }
    },
  );

  // native — UI-thread text updates through the animated `text` prop.
  // (Declared unconditionally — the render branches below may early-return.)
  const animatedProps = useAnimatedProps<AnimatedTextInputProps>(() => ({
    text: text.value,
  }));

  /** JS-side shaping (labels + reduced motion + the web seed) — the same
   * digits math as the worklet, for the non-animated seats. */
  const shape = (n: number): string => {
    const digits = String(Math.round(n));
    if (numerals !== "arabic-indic") return digits + suffix;
    let out = "";
    for (let i = 0; i < digits.length; i += 1) {
      const d = digits.charCodeAt(i) - 48;
      out += d >= 0 && d <= 9 ? ARABIC_INDIC[d] : digits[i];
    }
    return out + suffix;
  };
  const label = accessibilityLabel ?? shape(value);

  if (reduced) {
    // reduced motion → the final value, immediately
    return (
      <Text testID={testID} accessibilityLabel={label} style={style}>
        {shape(value)}
      </Text>
    );
  }

  if (shouldMirror) {
    return (
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        editable={false}
        pointerEvents="none"
        value={mirror}
        style={[inputBaseStyle, style]}
      />
    );
  }

  const inputProps: TextInputProps = {
    testID,
    accessibilityLabel: label,
    editable: false,
    pointerEvents: "none",
    style: [inputBaseStyle, style],
  };

  return (
    <AnimatedTextInput
      {...inputProps}
      defaultValue={shape(0)}
      animatedProps={animatedProps}
    />
  );
}
