import Svg, { Circle, Line, Path } from "react-native-svg";
import { statusTones, ds } from "@/design/tokens";
import { useTheme } from "@/design/theme";

/**
 * r369 slice 04 — the level ladder's badge generator, RN port of the
 * web's components/gamification/LevelBadge.tsx (itself the byte-identical
 * extract of the landing's rule). Geometry is identical: rays 3→7 tick
 * OUTSIDE the ring (r 18 → 21.5), tier marks leaf/sky/violet/amber, the
 * dashed halo from tier 2, the surface-ink tick on the top tier.
 * Paint: the mobile tone families stand in for the web's CSS vars —
 * leaf → mint ink, sky → sky ink, violet → lavender ink, amber → goldInk.
 */

export const LEVEL_NAMES = [
  "بذرة", "برعمة", "خطوة", "طريق", "مصباح", "فجر", "شمس", "مدار", "قمر", "نجم",
  "كوكبة", "سماء", "قوس", "منارة", "برج", "قلعة", "أفق", "قمّة", "تاج", "المعلّم",
] as const;

export const LEVEL_TIER_GROUPS = ["بذور", "مسارات", "منائر", "قمم"] as const;

export function LevelBadge({
  level,
  size = 40,
  locked = false,
}: {
  /** 0-based (level 0 = بذرة, the first rung). */
  level: number;
  size?: number;
  /** locked rungs mute to the faint ink, tier ink suppressed (the web cell rule). */
  locked?: boolean;
}) {
  const { name } = useTheme();
  const tones = statusTones[name];
  const tier = Math.floor(level / 5); // 0..3
  const rays = 3 + (level % 5); // 3..7
  const ink = locked
    ? ds[name].textFaint
    : tier === 0
      ? tones.mint.ink
      : tier === 1
        ? tones.sky.ink
        : tier === 2
          ? tones.lavender.ink
          : ds[name].goldInk;
  const surface = ds[name].surface;
  const rail = Array.from({ length: rays }).map((_, i) => {
    const a = (Math.PI * 2 * i) / rays - Math.PI / 2;
    return (
      <Line
        key={i}
        x1={24 + Math.cos(a) * 18}
        y1={24 + Math.sin(a) * 18}
        x2={24 + Math.cos(a) * 21.5}
        y2={24 + Math.sin(a) * 21.5}
        stroke={ink}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.85}
      />
    );
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rail}
      <Circle cx={24} cy={24} r={14.5} fill={ink} fillOpacity={0.12} stroke={ink} strokeWidth={1.6} />
      <Circle cx={24} cy={24} r={10.5} fill="none" stroke={ink} strokeWidth={0.7} opacity={0.35} />
      {tier >= 2 && (
        <Circle cx={24} cy={24} r={20} fill="none" stroke={ink} strokeWidth={0.8} strokeDasharray="3 4" opacity={0.55} />
      )}
      <Circle cx={24} cy={24} r={tier === 0 ? 3.4 : tier === 1 ? 4.2 : tier === 2 ? 5 : 5.6} fill={ink} />
      {tier === 3 && (
        <Path d="M18 24.5 22.5 29 31 19.5" fill="none" stroke={surface} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
