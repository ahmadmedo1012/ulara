/**
 * r369 slice 03 — the level ladder's badge generator, extracted from
 * the landing (components/landing/r369/index.tsx «LevelBadge», the
 * 06 ladder section) so the product's gamification surface can draw
 * the SAME twenty badges the reference promises. Geometry is
 * byte-identical to the landing's generator — one rule, twenty
 * badges, no borrowed assets. Styles: the .g369-badge-* family lives
 * in styles/landing/r369-app.css §6 (the landing keeps its own
 * .w369-badge-* twin; the two never share a tree).
 */

export const LEVEL_NAMES = [
  'بذرة', 'برعمة', 'خطوة', 'طريق', 'مصباح', 'فجر', 'شمس', 'مدار', 'قمر', 'نجم',
  'كوكبة', 'سماء', 'قوس', 'منارة', 'برج', 'قلعة', 'أفق', 'قمّة', 'تاج', 'المعلّم',
] as const;

export const LEVEL_TIER_GROUPS = ['بذور', 'مسارات', 'منائر', 'قمم'] as const;

export function LevelBadge({ level, size = 40 }: { level: number; size?: number }) {
  const tier = Math.floor(level / 5);            // 0..3
  const rays = 3 + (level % 5);                  // 3..7
  /* rays are ticks OUTSIDE the ring: r 18 → 21.5. They mark the level's
   * place in its tier without drawing a wheel across the badge. */
  const rail = Array.from({ length: rays }).map((_, i) => {
    const a = (Math.PI * 2 * i) / rays - Math.PI / 2;
    const x1 = 24 + Math.cos(a) * 18;
    const y1 = 24 + Math.sin(a) * 18;
    const x2 = 24 + Math.cos(a) * 21.5;
    const y2 = 24 + Math.sin(a) * 21.5;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
  const marks = ['leaf', 'sky', 'violet', 'amber'] as const;
  return (
    <svg
      className="g369-badge-svg" width={size} height={size} viewBox="0 0 48 48"
      data-tier={marks[tier]} aria-hidden="true" focusable="false"
    >
      {rail}
      <circle cx="24" cy="24" r="14.5" className="g369-badge-ring" />
      <circle cx="24" cy="24" r="10.5" className="g369-badge-inner" />
      {tier >= 2 && <circle cx="24" cy="24" r="20" className="g369-badge-halo" />}
      <circle cx="24" cy="24" r={tier === 0 ? 3.4 : tier === 1 ? 4.2 : tier === 2 ? 5 : 5.6} className="g369-badge-core" />
      {tier === 3 && <path d="M18 24.5 22.5 29 31 19.5" className="g369-badge-tick" />}
    </svg>
  );
}
