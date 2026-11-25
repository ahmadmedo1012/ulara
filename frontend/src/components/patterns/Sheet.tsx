import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Reveal } from '../motion/Reveal';
import { CountIn } from '../motion/CountIn';
import { formatInt } from '../../utils/numbers';

/* ═══════════════════════════════════════════════════════════════════
   R359 (A3) — THE SHEET GRAMMAR patterns.
   ─────────────────────────────────────────────────────────────────────
   The authenticated product's page grammar, translated from the
   reference's drawing-sheet language (full contract in
   styles/shared/r359-grammar.css):

     SheetSection   the framed block — hairline frame + registration
                    crosses + `[nn]` mono index + Latin mono caption +
                    the Arabic title + an aside slot on the rule.
     KpiBand        the hairline-divided metrics strip (huge mono
                    numerals, count-in, deltas in the ONE signal).
     DataSheet      the dense hairline table (mono numerics, sticky
                    mono head, labelled cards ≤640px).
     CalloutTag     the royal square pin + label (annotation marker).
     CoordReadout   the live mono X/Y scroll instrument.
     SheetEmpty     the hairline placeholder frame (empty/error).

   Honesty laws (the r351 lesson): indices are ALWAYS explicit strings
   the page passes — never auto-numbered, never derived from array
   position, so filtering/reordering can never lie. Numbers arrive as
   numbers (the band formats + counts them) or pre-formatted strings
   (rendered verbatim, no count). Latin micro-labels are REAL
   classifications (sheet codes, column keys), never decoration.
   ═══════════════════════════════════════════════════════════════════ */

/* ── SheetSection ─────────────────────────────────────────────────── */

export function SheetSection({
  index,
  caption,
  title,
  desc,
  aside,
  children,
  size,
  pad = 'default',
  reveal = true,
  className,
  id,
}: {
  /** The bracketed mono index — an EXPLICIT string ('01'), never derived. */
  index?: string;
  /** Latin mono micro-caption over the title (a real classification). */
  caption?: string;
  /** The Arabic section title (h2/h3 by size). */
  title?: ReactNode;
  /** Optional Arabic explainer under the title (the head's second line). */
  desc?: ReactNode;
  /** Actions slot on the head rule. */
  aside?: ReactNode;
  children: ReactNode;
  /** lg = the in-page band scale (app-h2); default = the frame scale (app-h3). */
  size?: 'lg';
  /** Body padding register. */
  pad?: 'default' | 'none' | 'tight';
  /** Arm the settle + draw-in reveal (default on). */
  reveal?: boolean;
  className?: string;
  id?: string;
}) {
  const cls = [
    'sg-section',
    size === 'lg' ? 'sg-section--lg' : '',
    pad === 'none' ? 'sg-section--pad-none' : '',
    pad === 'tight' ? 'sg-section--pad-tight' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      <i className="sg-reg sg-reg--tl" aria-hidden="true" />
      <i className="sg-reg sg-reg--tr" aria-hidden="true" />
      <i className="sg-reg sg-reg--bl" aria-hidden="true" />
      <i className="sg-reg sg-reg--br" aria-hidden="true" />
      {(title !== undefined || caption !== undefined || aside !== undefined || desc !== undefined) && (
        <header className="sg-head">
          <div className="sg-head-main">
            {index !== undefined && <span className="sg-index" aria-hidden="true">[{index}]</span>}
            <div>
              {caption !== undefined && <span className="sg-caption">{caption}</span>}
              {title !== undefined && <h2 className="sg-title">{title}</h2>}
              {desc !== undefined && <p className="sg-desc">{desc}</p>}
            </div>
          </div>
          {aside !== undefined && <div className="sg-aside">{aside}</div>}
        </header>
      )}
      <div className="sg-body">{children}</div>
    </>
  );
  if (!reveal) {
    return (
      <section id={id} className={cls}>
        {inner}
      </section>
    );
  }
  /* the sanctioned one-shot belt drives data-revealed; the grammar's
   * draw rule + settle key off it (r359-grammar.css §1/§8). */
  return (
    <Reveal as="section" id={id} className={cls} distance="small">
      {inner}
    </Reveal>
  );
}

/* ── KpiBand ──────────────────────────────────────────────────────── */

export type KpiTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'signal';

export interface KpiItem {
  /** The bracketed mono index — explicit, page-authored. */
  index?: string;
  /** Latin mono caption (real classification: COURSES / GPA / …). */
  caption?: string;
  /** The Arabic label under the numeral. */
  label: string;
  /** A number counts in formatted; a string renders verbatim. */
  value: number | string;
  /** Optional unit appended to the numeral (٪ / مقرر). */
  unit?: string;
  /** The delta line (mono, tone-colored). */
  delta?: string;
  deltaTone?: KpiTone;
  tone?: KpiTone;
  /** Marks a not-yet datum — the honest-empty register. */
  empty?: boolean;
  /** Turns the cell into a full-cell link. */
  to?: string;
  xl?: boolean;
}

const DELTA_TONE: Record<KpiTone, string | undefined> = {
  neutral: undefined,
  positive: 'positive',
  warning: 'warning',
  danger: 'danger',
  signal: 'signal',
};

function KpiCell({ item }: { item: KpiItem }) {
  /* '%' joins tight (80%); real-word units keep the space (6 مقرر). */
  const unitSep = item.unit === '%' ? '' : ' ';
  const valueNode =
    typeof item.value === 'number' ? (
      <>
        <CountIn value={item.value} />
        {item.unit ? `${unitSep}${item.unit}` : ''}
      </>
    ) : (
      <>
        {item.value}
        {item.unit ? `${unitSep}${item.unit}` : ''}
      </>
    );
  const body = (
    <>
      {(item.index !== undefined || item.caption !== undefined) && (
        <span className="sg-kpi-top">
          {item.index !== undefined && <span className="sg-index">[{item.index}]</span>}
          {item.caption !== undefined && <span className="sg-label">{item.caption}</span>}
        </span>
      )}
      <span className="sg-kpi-value">{item.empty ? '—' : valueNode}</span>
      <span className="sg-kpi-label">{item.label}</span>
      {item.delta !== undefined && (
        <span className="sg-kpi-delta" data-tone={DELTA_TONE[item.deltaTone ?? 'neutral']}>
          {item.delta}
        </span>
      )}
    </>
  );
  return item.to !== undefined ? (
    <Link to={item.to} role="listitem" className="sg-kpi" data-empty={item.empty ? 'true' : undefined} data-size={item.xl ? 'xl' : undefined}>
      {body}
    </Link>
  ) : (
    <div role="listitem" className="sg-kpi" data-empty={item.empty ? 'true' : undefined} data-size={item.xl ? 'xl' : undefined}>
      {body}
    </div>
  );
}

export function KpiBand({ items, className }: { items: KpiItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`sg-kpis${className ? ` ${className}` : ''}`} role="list" aria-label="مؤشرات">
      {items.map((item, i) => (
        <KpiCell item={item} key={`${item.label}-${i}`} />
      ))}
    </div>
  );
}

/* ── DataSheet ────────────────────────────────────────────────────── */

export interface DataSheetColumn<Row> {
  key: string;
  label: string;
  /** mono numeric register (tabular, LTR isolate). */
  numeric?: boolean;
  /** mono micro-text register. */
  mono?: boolean;
  /** hide this column's label on the mobile cards (e.g. arrow cell). */
  noLabel?: boolean;
  render: (row: Row, index: number) => ReactNode;
}

export function DataSheet<Row>({
  columns,
  rows,
  caption,
  rowTone,
  rowTo,
  onRowClick,
  empty,
  loading,
  className,
}: {
  columns: DataSheetColumn<Row>[];
  rows: Row[];
  /** The table's accessible caption (Arabic). */
  caption: string;
  /** Row tone → the inline-start pin colour. */
  rowTone?: (row: Row, index: number) => KpiTone | undefined;
  /** Row link target — makes rows clickable with the arrow register. */
  rowTo?: (row: Row, index: number) => string | undefined;
  /** R359 final · W3 — click handler (the workspace's dialog-opening
   * rows): the clickable + cursor register without a navigation. */
  onRowClick?: (row: Row, index: number) => void;
  empty?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className="sg-sheet-wrap" aria-busy="true">
        <table className="sg-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, r) => (
              <tr key={r}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className="pat-skeleton" style={{ display: 'inline-block', inlineSize: '60%', blockSize: '0.9em' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (rows.length === 0) {
    return <>{empty ?? <SheetEmpty title="لا بيانات بعد" desc="ستظهر السجلات هنا فور توفرها." />}</>;
  }
  const clickable = rowTo !== undefined || onRowClick !== undefined;
  return (
    <div className={`sg-sheet-wrap${className ? ` ${className}` : ''}`} role="region" aria-label={caption} tabIndex={0}>
      <table className="sg-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-hidden="true" style={{ inlineSize: '1rem' }} />
            {columns.map((c) => (
              /* R359 final: a noLabel column (actions/pin cells) renders an
               * aria-hidden empty th — axe's empty-table-header rule
               * otherwise flags the screen-reader-empty header cell. */
              <th
                key={c.key}
                scope="col"
                aria-hidden={c.noLabel || c.label === '' ? 'true' : undefined}
              >
                {c.label}
              </th>
            ))}
            {clickable && <th scope="col" aria-hidden="true" style={{ inlineSize: '1rem' }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const tone = rowTone?.(row, i);
            const to = rowTo?.(row, i);
            const cells = (
              <>
                <td className="sg-no-label" aria-hidden="true">
                  <span className="sg-row-pin" />
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.noLabel ? '' : c.label}
                    className={`${c.numeric ? 'sg-num' : ''} ${c.mono ? 'sg-mono' : ''} ${c.noLabel ? 'sg-no-label' : ''}`.trim() || undefined}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
                {clickable && (
                  <td className="sg-no-label sg-num" aria-hidden="true">
                    <span className="sg-row-go">
                      <ArrowLeft size={14} aria-hidden="true" />
                    </span>
                  </td>
                )}
              </>
            );
            if (to !== undefined) {
              return (
                <tr key={i} data-tone={tone} data-clickable="true">
                  {cells}
                </tr>
              );
            }
            if (onRowClick !== undefined) {
              /* the workspace's dialog-opening rows: button semantics on
               * the row (Enter/Space), cursor + hover registers via
               * [data-clickable] — no fake anchor; the accessible name
               * is the row's own content. */
              return (
                <tr
                  key={i}
                  data-tone={tone}
                  data-clickable="true"
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick(row, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(row, i);
                    }
                  }}
                >
                  {cells}
                </tr>
              );
            }
            return (
              <tr key={i} data-tone={tone}>
                {cells}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── CalloutTag ───────────────────────────────────────────────────── */

export function CalloutTag({
  pin,
  children,
  tone,
}: {
  /** The pin's mono content — a digit or a short code. */
  pin: string;
  children: ReactNode;
  tone?: 'signal' | 'neutral' | 'positive';
}) {
  return (
    <span className="sg-tag" data-tone={tone}>
      <span className="sg-tag-pin" aria-hidden="true">
        {pin}
      </span>
      <span>{children}</span>
    </span>
  );
}

/* ── CoordReadout ─────────────────────────────────────────────────── */

export function CoordReadout() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const raf = useRef(0);
  useEffect(() => {
    /* `.content` is the app's ONE scroll container (the body never
     * scrolls — layout.css); the instrument reads ITS offset. Falls
     * back to window for non-shell mounts (e.g. /__design). */
    const scroller =
      (document.querySelector<HTMLElement>('.has-shell .content') as HTMLElement | null) ??
      (document.querySelector<HTMLElement>('.content') as HTMLElement | null);
    let queued = false;
    const read = () => {
      queued = false;
      const x = Math.round(scroller?.scrollLeft ?? window.scrollX ?? 0);
      const y = Math.round(scroller?.scrollTop ?? window.scrollY ?? 0);
      setPos((p) => (p.x === x && p.y === y ? p : { x, y }));
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf.current = requestAnimationFrame(read);
    };
    (scroller ?? window).addEventListener('scroll', onScroll, { passive: true });
    read();
    return () => {
      (scroller ?? window).removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);
  const fmt = (n: number) => String(Math.min(Math.abs(n), 9999)).padStart(4, '0');
  return (
    <div className="sg-coords" aria-hidden="true">
      X:{fmt(pos.x)}PX / Y:{fmt(pos.y)}PX
    </div>
  );
}

/* ── SheetEmpty ───────────────────────────────────────────────────── */

export function SheetEmpty({
  title,
  desc,
  action,
  code,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
  /** Optional mono sheet-code (NO-DATA / ERROR / …). */
  code?: string;
}) {
  return (
    <div className="sg-empty">
      <div className="sg-empty-frame">
        <i className="sg-reg sg-reg--tl" aria-hidden="true" />
        <i className="sg-reg sg-reg--tr" aria-hidden="true" />
        <i className="sg-reg sg-reg--bl" aria-hidden="true" />
        <i className="sg-reg sg-reg--br" aria-hidden="true" />
        {code !== undefined && <span className="sg-label">{code}</span>}
      </div>
      <p className="sg-empty-title">{title}</p>
      {desc !== undefined && <p className="sg-empty-desc">{desc}</p>}
      {action !== undefined && <div>{action}</div>}
    </div>
  );
}

/* ── MonoLabel ────────────────────────────────────────────────────── */

export function MonoLabel({ children }: { children: ReactNode }) {
  return <span className="sg-label">{children}</span>;
}

/* ── helpers ──────────────────────────────────────────────────────── */

export { formatInt };
