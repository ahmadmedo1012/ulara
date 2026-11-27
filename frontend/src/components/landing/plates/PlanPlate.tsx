/* PlanPlate + DarkCard — r364 P1/P2 · the thick-wall plan plates and
 * the dark info cards (the reference's use-case grammar, measured in
 * docs/redesign/r350/reference shots: shot-usecase, shot-platform-1):
 *
 *  · PlanPlate — an ORIGINAL thick-wall plan (scripts/art/plans-v2.mjs:
 *    filled-ink walls, door swings, furniture, dimension strings,
 *    door tags, Arabic room tags, royal callout squares) under a
 *    TITLE BAR: the plan's Arabic name + the spec strip (SCALE · DATE
 *    · REV in mono) + the stamp glyph — the measured title-bar
 *    construction (title left, spec cells right, hairline frame).
 *  · DarkCard — the ink slab info card (the reference's CHECKING… /
 *    LEARNED PATTERN cards): mono header + hairline rows on the ink
 *    ground, riding the plan's corner.
 *
 * All paints flow the grammar seats (ink/paper/hairline/royal) — see
 * styles/landing/art-v2.css for the kit's CSS.
 */
export type PlanId =
  | 'plan-lecture-hall'
  | 'plan-library'
  | 'plan-laboratory'
  | 'plan-exam-hall'
  | 'plan-admin'
  | 'plan-campus';

const PLAN_SRCS: Record<PlanId, string> = {
  'plan-lecture-hall': new URL('../../../assets/art-v2/plans/plan-lecture-hall.svg', import.meta.url).href,
  'plan-library': new URL('../../../assets/art-v2/plans/plan-library.svg', import.meta.url).href,
  'plan-laboratory': new URL('../../../assets/art-v2/plans/plan-laboratory.svg', import.meta.url).href,
  'plan-exam-hall': new URL('../../../assets/art-v2/plans/plan-exam-hall.svg', import.meta.url).href,
  'plan-admin': new URL('../../../assets/art-v2/plans/plan-admin.svg', import.meta.url).href,
  'plan-campus': new URL('../../../assets/art-v2/plans/plan-campus.svg', import.meta.url).href,
};

export function PlanPlate({
  plan,
  title,
  scale = '1:100',
  date = '2026',
  rev = 'A',
  className,
}: {
  plan: PlanId;
  title: string;
  scale?: string;
  date?: string;
  rev?: string;
  className?: string;
}) {
  return (
    <figure className={`plan-plate ${className ?? ''}`}>
      <img className="plan-plate-art" src={PLAN_SRCS[plan]} alt={title} loading="lazy" decoding="async" />
      <figcaption className="plan-titlebar">
        <span className="plan-title">{title}</span>
        <span className="plan-spec fo-mono" dir="ltr">
          <span className="plan-spec-cell"><b>SCALE</b>{scale}</span>
          <span className="plan-spec-cell"><b>DATE</b>{date}</span>
          <span className="plan-spec-cell"><b>REV</b>{rev}</span>
          <span className="plan-stamp" aria-hidden="true">
            <svg viewBox="0 0 20 20"><path d="M4 4h12M4 10h12M4 16h8" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/* the ink slab info card — mono header + hairline rows. `variant`
 * picks the content voice: "checking" (the audit run) or "learned"
 * (the pattern the platform keeps). */

