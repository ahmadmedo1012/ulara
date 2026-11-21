import type { ReactNode } from 'react';

/**
 * SectionBar — R319 §B2 · the dashboard's section title bar.
 *
 * The owner's second iPhone screenshot read «لوحة التحكم / اليوم /
 * مقرّراتك» as three giant equal-weight words in one screen. R319 seats
 * the page into the reference drafting-sheet grammar: every section below
 * the masthead opens with a section title bar —
 *
 *      اليوم ───────────────────────── 03
 *
 * — the Arabic title at the section register, a hairline rule filling
 * the remainder (the r305s-kicker's heading-and-divider-as-one-object
 * idea, carried forward), and quiet mono metadata at the end (counts
 * as data — the reference's `ALL [16]` register — never decoration).
 *
 * r351 A2 (Q2): the `[0N]` gutter index is RETIRED — the numerals
 * rendered out of DOM order on several dashboards (teacher 02→01→03,
 * the AI pages 02, 05, 03) and sequential-in-DOM could not be kept
 * honest across filtered states. The h2 + hairline + meta carry the
 * grammar alone.
 *
 * The h2 stays the section's semantic heading (the PageHeader contract:
 * one h1 per route, sections answer with h2s).
 */
export function SectionBar({
  title,
  meta,
  action,
  id,
}: {
  /** The Arabic section title (the section's h2). */
  title: string;
  /** Quiet trailing metadata — a mono count, a code. Data only. */
  meta?: ReactNode;
  /** Optional trailing action (a ghost link — never the page's accent CTA). */
  action?: ReactNode;
  /** Optional id for the h2 (aria-labelledby wiring). */
  id?: string;
}) {
  return (
    <div className="r319s-bar">
      <h2 className="r319s-bar-title" id={id}>
        {title}
      </h2>
      <span className="r319s-bar-rule" aria-hidden="true" />
      {meta !== undefined && <span className="r319s-bar-meta">{meta}</span>}
      {action !== undefined && <span className="r319s-bar-action">{action}</span>}
    </div>
  );
}

/**
 * Mono count for a SectionBar's meta end — the digits a sheet prints as
 * DATA (the reference's bracketed-count register), with the proper
 * countAr phrase kept for screen readers: sighted readers get the
 * tabular numeral, assistive tech gets «التزامات اليوم» in real Arabic
 * plural form (a bare `03` would read «صفر ثلاثة»).
 */
export function BarCount({ n, srLabel }: { n: number; srLabel: string }) {
  const safe = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return (
    <span className="r319s-bar-meta">
      <bdi className="r319s-mono r319s-count" dir="ltr" aria-hidden="true">
        {String(safe).padStart(2, '0')}
      </bdi>
      <span className="sr-only">{srLabel}</span>
    </span>
  );
}
