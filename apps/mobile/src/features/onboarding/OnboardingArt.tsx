/**
 * OnboardingArt — r360 integration seam (the A4 → A2 art handoff).
 *
 * A4 shipped a placeholder art entry (components/art/index.tsx) so the
 * onboarding surfaces compiled before A2's library landed. The r360
 * merge order retires it: the mobile art module entry is A2's
 * GENERATED index.ts, which exports the real plates (Onboarding1..4,
 * SplashMarkMotion). A4's consuming contract —
 * OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 }) — is preserved
 * here as a thin feature-level adapter, so onboarding.tsx keeps its
 * shape while rendering the real A2 illustrations with the live theme.
 */
import { useTheme } from "@/design/theme";
import { Onboarding1, Onboarding2, Onboarding3, Onboarding4 } from "@/components/art";

const ART_BY_INDEX = {
  1: Onboarding1,
  2: Onboarding2,
  3: Onboarding3,
  4: Onboarding4,
} as const;

export function OnboardingArt({ index }: { index: 1 | 2 | 3 | 4 }): React.ReactElement {
  const { name } = useTheme();
  const Art = ART_BY_INDEX[index] ?? Onboarding1;
  return <Art theme={name} />;
}
