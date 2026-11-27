/**
 * sections — the T1–T5 building blocks for the inner public pages
 * (r369 slice B). Every block speaks the landing's grammar: the
 * circled-index kicker, the huge display head with ONE underlined
 * amber word, 22px cards, pill actions, the duotone glyphs.
 *
 * Templates (fixed in specs/01-inner-public-pages):
 *   T1 Article · T2 Hub · T3 Detail · T4 Showcase · T5 Focus
 */
import type { ReactNode } from 'react';
import { Glyph, type GlyphName } from '../../../icons';
import { useReveal } from '..';

/* ── the emphasised word: colour + the hand-drawn underline ── */
export function Em({ children }: { children: ReactNode }) {
  return (
    <span className="w369-em">
      {children}
      <svg className="w369-underline" viewBox="0 0 240 16" aria-hidden="true" preserveAspectRatio="none">
        <path d="M3 12 C60 4 150 3 237 9" fill="none" strokeWidth="5" strokeLinecap="round" stroke="var(--gold)" />
      </svg>
    </span>
  );
}

/* ── PageHead: every inner page opens with the same head ── */
export function PageHead({
  n,
  icon,
  kicker,
  title,
  lead,
  actions,
}: {
  n: string;
  icon: GlyphName;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="p369-head">
      <span className="w369-band-num" aria-hidden="true">{n}</span>
      <p className="w369-band-kicker"><Glyph name={icon} size={15} />{kicker}</p>
      <h1 className="w369-h2 p369-h1">{title}</h1>
      {lead ? <p className="w369-lead">{lead}</p> : null}
      {actions ? <div className="p369-head-actions">{actions}</div> : null}
    </header>
  );
}

/* ── FactChips: the pill fact row ── */

/* ── StateCard: the ONE honest loading/empty/error card ── */

/* ── Shimmer rows: token-correct loading placeholder (until slice E) ── */

/* ── DoorGrid: T2 cards linking onward ── */
export interface Door {
  to: string;
  icon: GlyphName;
  title: string;
  body: string;
  tint?: string;
}

/* ── ArticleBody: T1 prose in the world's voice ── */
export function ArticleSection({
  n,
  title,
  children,
}: {
  n: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="p369-article-sec" ref={ref}>
      <h2 className="p369-article-head">
        <span className="p369-article-num" aria-hidden="true">{n}</span>
        {title}
      </h2>
      <div className="p369-article-body">{children}</div>
    </section>
  );
}

/* ── BandSection: T4 showcase band (numbered, tinted, reveal-armed) ── */
export function BandSection({
  n,
  icon,
  kicker,
  title,
  body,
  tint,
  children,
}: {
  n: string;
  icon: GlyphName;
  kicker: string;
  title: ReactNode;
  body?: ReactNode;
  tint?: string;
  children?: ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="w369-band p369-band" data-tint={tint}>
      <div className="w369-band-head">
        <span className="w369-band-num" aria-hidden="true">{n}</span>
        <p className="w369-band-kicker"><Glyph name={icon} size={15} />{kicker}</p>
        <h2 className="w369-h2">{title}</h2>
        {body ? <p className="w369-body">{body}</p> : null}
      </div>
      {children ? <div className="w369-band-body" ref={ref}>{children}</div> : null}
    </section>
  );
}

/* ── FactRail: T3 the entity's facts beside its body ── */

