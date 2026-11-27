import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PublicShell } from '../../components/landing/r369/pages/PublicShell';
import { PageHead } from '../../components/landing/r369/pages/sections';
// r369 slice B — the sheet rides the warm world: PublicShell chrome
// (the landing's nav + footer), the kit's PageHead, and the T1 article
// grammar. The lg-* names stay as the API the nine pages and their
// tests already speak; their LOOK is re-keyed in legal.css to tokens +
// world shapes (22px cards, circled numbers, no hairline drafting
// frame, no mono-bracket indices, no grain). The public chunk never
// imports the student kit (components/student).
import '../../styles/legal.css';

/** The canonical public URL every page's canonical/OG:url derives from
 * (index.html:33 — the one absolute base the site declares). */
const CANONICAL_BASE = 'https://ulara.vercel.app';

/* ═══ useLegalMeta — per-page head metadata ══════════════════════════
 *
 * The guest document sheets own their head tags the way the auth pages
 * own their tab title (usePageTitle): on mount, the page's description
 * lands on <meta name="description">, its path on the canonical link
 * and og:url, its title on og:title and the tab — and EVERY previous
 * value is restored on unmount, so route changes chain cleanly exactly
 * like the title does (the landing's platform description must come
 * back when a visitor leaves a policy sheet). SSR/jsdom-safe: every
 * access is guarded. */

function setMeta(selector: string, attr: string, value: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const previous = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return previous;
}

export function useLegalMeta(opts: {
  /** The page's Arabic title (the tab context, usePageTitle's contract). */
  title: string;
  /** The page's own path — canonical + og:url derive the absolute URL. */
  path: string;
  /** The honest one-line description (its own words, never the landing's). */
  description: string;
}): void {
  const { title, path, description } = opts;
  usePageTitle(title);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const canonical = `${CANONICAL_BASE}${path}`;
    const prevDescription = setMeta('meta[name="description"]', 'content', description);
    const prevCanonical = setMeta('link[rel="canonical"]', 'href', canonical);
    const prevOgTitle = setMeta('meta[property="og:title"]', 'content', title);
    const prevOgUrl = setMeta('meta[property="og:url"]', 'content', canonical);
    return () => {
      if (typeof document === 'undefined') return;
      if (prevDescription !== null) {
        setMeta('meta[name="description"]', 'content', prevDescription);
      }
      if (prevCanonical !== null) {
        setMeta('link[rel="canonical"]', 'href', prevCanonical);
      }
      if (prevOgTitle !== null) {
        setMeta('meta[property="og:title"]', 'content', prevOgTitle);
      }
      if (prevOgUrl !== null) {
        setMeta('meta[property="og:url"]', 'content', prevOgUrl);
      }
    };
  }, [title, path, description]);
}

/* ═══ The shell ══════════════════════════════════════════════════════ */

/**
 * LegalSheet — the public document shell, r369 slice B: the warm
 * world's PublicShell chrome (nav + footer + theme control) around a
 * POLICY DOCUMENT on the T1 article grammar — the kit's PageHead
 * (circled index, display head, lede, pill actions), then the circled
 * section bars, world-card cells, and the honest colophon with the
 * آخر تحديث stamp. Everything the nine public pages share; the page
 * components own only their words. The R320–R341 drafting grammar
 * (frame, grain, mono brackets, hairline cells) is retired.
 */
export function LegalSheet({
  title,
  lede,
  updated,
  children,
}: {
  /** The page's ONE h1 (Arabic, no tashkeel). */
  title: ReactNode;
  /** The one-paragraph lede under the h1. */
  lede: ReactNode;
  /** The آخر تحديث date (LEGAL_UPDATED — one stamp for the whole suite). */
  updated: string;
  children: ReactNode;
}) {
  /* r369 — the T1 article: PublicShell chrome, the kit's head, then the
     numbered sections as world cards. Same words, same colophon, same
     stamp; the drafting frame is retired. */
  return (
    <PublicShell>
      <div className="lg p369-t1">
        <PageHead
          n="01"
          icon="shield"
          kicker="وثيقة سياسة"
          title={title}
          lead={lede}
          actions={(
            <>
              <Link to="/contact" className="w369-btn w369-btn-primary">قناة التواصل</Link>
              <Link to="/" className="w369-btn w369-btn-ghost">الصفحة الرئيسية</Link>
            </>
          )}
        />

        {children}

        <footer className="lg-colophon">
          <p className="lg-colophon-line">منصّة مستقلّة · بيانات العرض اصطناعية بالكامل</p>
          <p className="lg-colophon-stamp">
            آخر تحديث: <span className="lg-mono" dir="ltr">{updated}</span>
          </p>
        </footer>
      </div>
    </PublicShell>
  );
}

/**
 * LegalSectionBar — the policy sheet's numbered heading on the pattern
 * library's section seat (pf-section-header): a strong opening hairline
 * + the mono `[nn]` index (LTR, decorative — the Arabic title carries
 * the meaning) + the section title. The §B2 student SectionBar's
 * register in the PUBLIC sheet's own classes — the public chunk must
 * never import the student kit.
 */
export function LegalSectionBar({
  index,
  title,
  id,
}: {
  /** 1-based — rendered zero-padded 01, 02… */
  index: number;
  title: string;
  /** Optional anchor id (aria-labelledby wiring). */
  id?: string;
}) {
  /* r369 — the circled number replaces the mono-bracket index (the
     drafting grammar is retired); still LTR and decorative, the Arabic
     title still carries the meaning. */
  return (
    <h2 className="lg-bar p369-article-head" id={id}>
      <span className="lg-bar-index p369-article-num" dir="ltr" aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <span className="lg-bar-title">{title}</span>
    </h2>
  );
}

/**
 * LegalCell — one hairline-ruled block: the document's basic container
 * (radius 0, 1px rule, no shadow — the r313 ladder). Sections compose
 * their paragraphs, lists and tables inside cells.
 */
export function LegalCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `lg-cell ${className}` : 'lg-cell'}>
      {children}
    </div>
  );
}

/**
 * PendingTag — the honest `[يُستكمل قبل الإطلاق]` marker: every legal
 * fact the owner hasn't decided yet is VISIBLE but tasteful (mono,
 * muted ink, never hidden and never guessed) and mirrored as a row in
 * docs/redesign/r320/LEGAL-TODO.md — the audit trail the pages and the
 * TODO file can never drift apart (LEGAL-TODO §3 rules 1 + 5).
 */
export function PendingTag() {
  return <span className="lg-pending">[يُستكمل قبل الإطلاق]</span>;
}

/**
 * CodeRun — a Latin/technical run inside Arabic prose (storage keys,
 * cookie names, routes, TTL values): dir=ltr mono, wrapped in <bdi> so
 * the surrounding sentence's bidi flow is never punctured (the R319
 * mono-run contract).
 */
export function CodeRun({ children }: { children: string }) {
  return (
    <bdi className="lg-code lg-mono" dir="ltr">
      {children}
    </bdi>
  );
}
