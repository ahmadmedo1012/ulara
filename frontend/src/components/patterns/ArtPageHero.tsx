/* ArtPageHero — r364 P4 · the public pages' architectural hero imagery.
 *
 * Every page a visitor can reach before logging in carries the art
 * system v2's imagery (mission P4): the same flat-shape kit, the same
 * duotone/plan grammar as the landing, seated in ONE shared band so
 * the type scale, hairlines and spacing stay the sheet's own.
 *
 * Variants:
 *  · scene  — the DuotoneScene stage (ink/duotone scene + flat shapes)
 *  · plan   — the PlanPlate thick-wall plan under its title bar
 *
 * Usage (per page, under the pf-page-header):
 *   <ArtPageHero scene={podiumScene} alt="…" caption="…" note="…" />
 *   <ArtPageHero plan="plan-campus" title="مخطط الحرم الجامعي" />
 */
import { DuotoneScene } from '../landing/plates/DuotoneScene';
import { PlanPlate, type PlanId } from '../landing/plates/PlanPlate';

export function ArtPageHeroScene({
  src,
  alt,
  caption,
  note,
}: {
  src: string;
  alt: string;
  caption?: string;
  note?: string;
}) {
  return (
    <div className="pg-art-hero">
      <DuotoneScene src={src} alt={alt} variant="stage" caption={caption} note={note} />
    </div>
  );
}

export function ArtPageHeroPlan({
  plan,
  title,
  scale,
  date,
  rev,
  dark,
}: {
  plan: PlanId;
  title: string;
  scale?: string;
  date?: string;
  rev?: string;
  dark?: { header: string; rows: string[] };
}) {
  return (
    <div className="pg-art-hero pg-art-hero-plan">
      {dark ? (
        <div className="pg-plan-checked">
          <PlanPlate plan={plan} title={title} scale={scale} date={date} rev={rev} />
          <aside className="dark-card" aria-label={dark.header}>
            <span className="dark-card-head fo-mono" dir="rtl">{dark.header}</span>
            <ul className="dark-card-rows">
              {dark.rows.map((r) => (
                <li key={r} className="dark-card-row fo-mono">{r}</li>
              ))}
            </ul>
          </aside>
        </div>
      ) : (
        <PlanPlate plan={plan} title={title} scale={scale} date={date} rev={rev} />
      )}
    </div>
  );
}
