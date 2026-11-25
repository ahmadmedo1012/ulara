import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * StatLine — شريط أرقام مضغوط (عقد Agent S — r210).
 *
 * The calm replacement for KPI-card walls: one flat line of label-over-
 * value stats, no icon wells, no tiles. `tone` recolors the VALUE only
 * (labels stay muted — the hierarchy survives every theme). `to` turns
 * the stat into a full 44px+ link. Numbers arrive already formatted via
 * utils/numbers.ts (formatNum/formatInt) — this component never formats.
 *
 * r348 (the dashboards audit): two additive props —
 *  · `spread` distributes the stats across the sheet's full line
 *    (desktop band) instead of hugging the inline-start edge — a 1080px
 *    frame with four narrow stats left ~440px of dead paper at the
 *    inline-end (the «dead left half» the r347 audit measured on both
 *    role dashboards). Wrap-safe: mobile keeps the calm 2-per-row flow.
 *  · `item.empty` marks a not-yet datum (null / zero-with-no-rows): the
 *    value renders in the honest-empty register (body-size faint dash)
 *    instead of the bold display numeral — a big «—» at headline weight
 *    read as a broken number (r347 audit), the hint line already names
 *    the why («لا تقييمات بعد»).
 */
export type StatLineItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'signal';
  to?: string;
  /** r348: the datum isn't there yet — render the honest-empty register. */
  empty?: boolean;
};

const TONE_CLASS: Record<NonNullable<StatLineItem['tone']>, string> = {
  neutral: '',
  positive: ' positive',
  warning: ' warning',
  danger: ' danger',
  signal: ' signal',
};

export function StatLine({ items, spread, discloseHints = false }: { items: StatLineItem[]; spread?: boolean; discloseHints?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="pf-statline" data-spread={spread ? 'true' : undefined}>
      {items.map((item, i) => {
        const tone = discloseHints ? '' : TONE_CLASS[item.tone ?? 'neutral'];
        const reading = (
          <>
            <span className="pf-stat-label">{item.label}</span>
            <span className={`pf-stat-value${item.empty ? ' pf-stat-value--empty' : ''}`}>{item.value}</span>
          </>
        );
        // Keep both the metric and its value in the overview. An empty datum
        // always explains itself; a linked metric retains its single action.
        if (discloseHints && item.hint && !item.empty && !item.to && item.tone !== 'warning' && item.tone !== 'danger') {
          return (
            <details key={item.label} className={`pf-stat dash-disclosure${tone}`}>
              <summary>{reading}</summary>
              <span className="pf-stat-hint">{item.hint}</span>
            </details>
          );
        }
        const body = <>{reading}{item.hint !== undefined && <span className="pf-stat-hint">{item.hint}</span>}</>;
        return item.to !== undefined ? (
          <Link key={`${item.label}-${i}`} to={item.to} className={`pf-stat${tone}`}>
            {body}
          </Link>
        ) : (
          <div key={`${item.label}-${i}`} className={`pf-stat${tone}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
