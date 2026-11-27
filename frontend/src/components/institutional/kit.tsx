/**
 * r352 — the institutional workspace's shared kit: the small pieces
 * every module composes, built ONLY on the platform's existing
 * primitives (States, TablePaginationFooter, Icon) and the patterns
 * family (PageFrame, PageHeader, FilterBar) — one visual language,
 * no second design system.
 *
 * Everything here renders real API states: loading / empty / error
 * / 403-with-capability-name / success. No decorative placeholders.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import { Search, X, ChevronDown } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '../primitives/States';
import { SheetEmpty, SheetSection, DataSheet, type DataSheetColumn } from '../patterns/Sheet';
import podiumScene from '../../assets/art-v2/podium-scene.webp';
import { TablePaginationFooter } from '../../pages/admin/TablePaginationFooter';
import { toneOf, type InstTone } from '../../lib/institutional/labels';
import { cycleFocusTrap } from '../../lib/focusTrap';
import type { Paged } from '../../lib/institutional/types';
import { useInstitutionScope, useAuthStore } from '../../stores/auth.store';
import '../../styles/institutional/workspace.css';

/** The server's own Arabic error message from the shared envelope —
 * the single extraction every page uses (the server is the
 * authority; this only reads its wording). */
export function serverError(err: unknown, fallback = 'تعذَّر إتمام العملية.'): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } } | undefined;
  return e?.response?.data?.error?.message ?? fallback;
}

/* ── StatusChip — ONE chip vocabulary (data-tone) ────────────────── */

function StatusChip({
  label, tone, title,
}: { label: string; tone?: InstTone; title?: string }) {
  return (
    <span className="inst-chip" data-tone={tone ?? 'muted'} title={title}>
      {label}
    </span>
  );
}

/** StatusChip from a raw enum value (label fn + tone mapping). */
export function EnumChip({
  value, labels, title,
}: { value: string | null | undefined; labels: Record<string, string>; title?: string }) {
  if (!value) return <span className="inst-chip" data-tone="muted">—</span>;
  return <StatusChip label={labels[value] ?? value} tone={toneOf(value)} title={title} />;
}

/* ── R359 (W2-e): the sheet-grammar status flag ────────────────────
 * The DataSheet registers speak the flat .sg-flag (r359-grammar.css)
 * — the colour law retires the inst-chip's tinted fills on the sheet
 * surfaces. One shared mapping so every workspace register renders
 * the same tone vocabulary (ok→positive, danger→danger, muted→quiet,
 * the in-flight/attention tones ride the neutral ink). */
export function StatusFlag({
  value, labels,
}: { value: string | null | undefined; labels: Record<string, string> }) {
  if (!value) return <span className="sg-flag" data-tone="quiet">—</span>;
  const tone = toneOf(value);
  const flagTone: 'positive' | 'danger' | 'quiet' | undefined =
    tone === 'ok' ? 'positive' : tone === 'danger' ? 'danger' : tone === 'muted' ? 'quiet' : undefined;
  return (
    <span className="sg-flag" data-tone={flagTone}>
      {labels[value] ?? value}
    </span>
  );
}

/** The row-tone bridge: the same InstTone vocabulary keyed to the
 * DataSheet's inline-start row pin. */
export function rowToneFromStatus(status: string | null | undefined): 'positive' | 'danger' | undefined {
  const tone = toneOf(status);
  return tone === 'ok' ? 'positive' : tone === 'danger' ? 'danger' : undefined;
}

/* ── the workspace states ───────────────────────────────────────── */

/** The honest no-institution-context state (contract §0: reads need
 * a verified membership → select an institution first). */
function ContextRequiredState() {
  /* R359 (A3 · the dead-region repair): the «choose an institution»
   * dead end becomes a designed sheet state with a REAL action —
   * memberships exist → point at the topbar switcher with the sheet's
   * own register; no memberships at all → the OWNER gets the create
   * CTA, everyone else gets the honest ask-your-owner note. */
  const memberships = useAuthStore((s) => s.memberships);
  const role = useAuthStore((s) => s.user?.role ?? null);
  if (memberships && memberships.length > 0) {
    return (
      <div className="inst-state">
        <SheetEmpty
          code="NO CONTEXT"
          title="اختر مؤسستك أولاً"
          desc="مساحة العمل المؤسسية تعمل داخل سياق مؤسسة محددة — افتح مبدّل المؤسسات في الشريط العلوي ثم عُد إلى هنا."
          art={podiumScene}
        />
      </div>
    );
  }
  const isOwner = role === 'OWNER';
  return (
    <div className="inst-state">
      <SheetEmpty
        code="NO INSTITUTION"
        title={isOwner ? 'لم تُنشأ مؤسسات بعد' : 'لا عضوية مؤسسية لحسابك'}
        desc={
          isOwner
            ? 'أنشئ المؤسسة الأولى من لوحة المالك — المؤسسات، ثم اربط مديريها وحدودها التنظيمية.'
            : 'حسابك غير مرتبط بأي مؤسسة حالياً. يربط مالك المنصّة الحسابات بالمؤسسات عند إنشائها.'
        }
        action={
          isOwner ? (
            <Link className="btn primary sm" to="/owner/institutions">إنشاء مؤسسة من لوحة المالك</Link>
          ) : undefined
        }
      />
    </div>
  );
}

/** The workspace's gate for module sections hidden by kind policy. */
export function ModuleHiddenState({ reason }: { reason: string }) {
  return (
    <div className="inst-state">
      <EmptyState title="هذا القسم غير متاح لمؤسستك" description={reason} />
    </div>
  );
}

/** List state wrapper: skeleton / error / empty / rows. */
export function InstStates({
  isLoading, error, isEmpty, empty, children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  empty?: ReactNode;
  children: ReactNode;
}) {
  const scope = useInstitutionScope();
  if (scope === null) return <ContextRequiredState />;
  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) return <ErrorState error={error} />;
  if (isEmpty) return <div className="inst-state">{empty ?? <EmptyState />}</div>;
  return <>{children}</>;
}

/* ── the workspace table ────────────────────────────────────────── */

export interface InstColumn<Row> {
  /** Column header (th scope=col). */
  head: string;
  /** Cell renderer; receive data-label automatically on mobile. */
  cell: (row: Row) => ReactNode;
  /** Optional fixed width hint (CSS ch units appended by the caller). */
  width?: number;
  /** Column header only — hide on mobile stacking (decorative). */
  mobileHidden?: boolean;
  /** R359 final · W3 — the sheet registers: mono micro-text (codes),
   * numeric (tabular LTR numerals) and the row's inline-start tone pin. */
  mono?: boolean;
  numeric?: boolean;
  tone?: (row: Row) => 'positive' | 'warning' | 'danger' | 'signal' | undefined;
}

/** InstColumn → DataSheetColumn (the R359 final bridge: the whole
 * workspace's list anatomy rides the sheet-grammar DataSheet — mono
 * head, hairline rows, row pins, hover fill, labelled cards ≤640px —
 * with the callers' column configs untouched). */
function toSheetColumns<Row>(columns: Array<InstColumn<Row>>): Array<DataSheetColumn<Row>> {
  return columns.map((c) => ({
    key: c.head,
    label: c.head,
    mono: c.mono,
    numeric: c.numeric,
    noLabel: c.mobileHidden,
    render: c.cell,
  }));
}

/**
 * The one table anatomy every list uses (R359 final · W3: the sheet-
 * grammar DataSheet — the .table/.tbl-stack register it rode from
 * r352 to r358 is retired with the grammar law; onRowClick survives
 * as the row's button register with Enter/Space support).
 */
export function InstTable<Row>({
  rows, columns, onRowClick, ariaLabel, dense,
}: {
  rows: Row[];
  columns: Array<InstColumn<Row>>;
  /** Kept for the r352 call-site contract (the DataSheet keys rows
   * by index; identity rides the page's query cache). */
  rowKey?: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  ariaLabel: string;
  dense?: boolean;
}) {
  /* one tone fn per table (the FIRST column that declares one owns the
   * row pin; tone is a row property, not a column one). */
  const tone = columns.find((c) => c.tone)?.tone;
  const sheetColumns = useMemo(() => toSheetColumns(columns), [columns]);
  return (
    <DataSheet
      caption={ariaLabel}
      columns={sheetColumns}
      rows={rows}
      rowTone={tone ? (row) => tone(row) : undefined}
      onRowClick={onRowClick}
      className={dense ? 'inst-table-dense' : undefined}
    />
  );
}

/* ── list + pagination composition ──────────────────────────────── */

/** The standard paged-list section: states + table + footer. */
export function InstPagedTable<Row>({
  query, columns, rowKey, onRowClick, ariaLabel, empty, unit, onPage, dense,
}: {
  query: { data?: Paged<Row>; isLoading: boolean; error: unknown };
  columns: Array<InstColumn<Row>>;
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  ariaLabel: string;
  empty?: ReactNode;
  /** countAr noun forms [one, two, few, many]. */
  unit: [string, string, string, string];
  onPage: (page: number) => void;
  dense?: boolean;
}) {
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  return (
    <>
      <InstStates
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={rows.length === 0}
        empty={empty}
      >
        <InstTable
          rows={rows}
          columns={columns}
          rowKey={rowKey}
          onRowClick={onRowClick}
          ariaLabel={ariaLabel}
          dense={dense}
        />
      </InstStates>
      {meta && meta.totalPages > 1 && (
        /* R359 final · W3: the footer rides the sheet's own padded
         * register (hairline rule over the table's last row). */
        <div className="sg-pad-in">
          <TablePaginationFooter
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            unit={unit}
            onPage={onPage}
          />
        </div>
      )}
    </>
  );
}

/* ── the section header used inside detail pages ────────────────── */

/**
 * R359 final · W3: InstSection IS the sheet grammar now — a thin
 * wrapper over SheetSection (hairline frame + registration crosses +
 * the draw-in rule) so every detail page that composes it speaks the
 * same language as the recomposed fleet. `index`/`caption` are
 * optional additions; the old call sites keep working (the frame is
 * the upgrade they get for free).
 */
export function InstSection({
  title, actions, children, description, index, caption, pad,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** The bracketed mono index — explicit, page-authored ('01'). */
  index?: string;
  /** Latin mono micro-caption over the title (a real classification). */
  caption?: string;
  /** Body padding register (tables ride pad='none'). */
  pad?: 'none' | 'tight';
}) {
  return (
    <SheetSection
      index={index}
      caption={caption}
      title={title}
      desc={description}
      aside={actions}
      pad={pad}
    >
      {children}
    </SheetSection>
  );
}

/* ── key/value detail rows ──────────────────────────────────────── */

export function DetailList({ items }: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
}) {
  return (
    <dl className="inst-detail">
      {items.map((it, i) => (
        <div className="inst-detail-row" key={i}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? <span className="inst-na">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── the search + select filter bar ─────────────────────────────── */

export function InstFilters({
  search, onSearch, children, trailing,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="inst-filters" role="search">
      {onSearch && (
        <div className="inst-search">
          <Icon icon={Search} size={14} />
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ابحث…"
            aria-label="بحث"
            maxLength={120}
          />
        </div>
      )}
      {children}
      {trailing}
    </div>
  );
}

/** The native select, styled once (44px floor). */
export function InstSelect({
  value, onChange, options, ariaLabel, anyLabel, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  /** First "no filter" option label — omit for a plain select. */
  anyLabel?: string;
  className?: string;
}) {
  return (
    <div className={`inst-select${className ? ` ${className}` : ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {anyLabel !== undefined && <option value="">{anyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon icon={ChevronDown} size={14} className="inst-select-caret" />
    </div>
  );
}

/* ── the form dialog (config-driven) ────────────────────────────── */

export type InstField =
  | { kind: 'text'; name: string; label: string; required?: boolean; placeholder?: string; maxLength?: number; hint?: string }
  | { kind: 'textarea'; name: string; label: string; required?: boolean; rows?: number; placeholder?: string; maxLength?: number; hint?: string }
  | { kind: 'number'; name: string; label: string; required?: boolean; min?: number; max?: number; step?: number; placeholder?: string; hint?: string }
  | { kind: 'date'; name: string; label: string; required?: boolean; placeholder?: string; hint?: string }
  | { kind: 'select'; name: string; label: string; required?: boolean; options: Array<{ value: string; label: string }>; hint?: string; placeholder?: string }
  | { kind: 'checkbox'; name: string; label: string; required?: boolean; hint?: string };

export type InstFormValues = Record<string, string | number | boolean | undefined>;

/**
 * The workspace's one dialog form: renders the field config, keeps
 * controlled state, enforces required/date-order client checks with
 * Arabic messages, and surfaces the SERVER's own 400/409 Arabic
 * errors verbatim (backend is the authority — the client only
 * catches the obvious before the round-trip).
 */
export function InstFormDialog({
  open, title, fields, submitLabel = 'حفظ', onCancel, onSubmit, busy, serverError, description, wide, onFieldChange, initialValues,
}: {
  open: boolean;
  title: string;
  description?: string;
  fields: InstField[];
  submitLabel?: string;
  onCancel: () => void;
  /** Receives the values; return an Arabic error string to keep the
   * dialog open (or throw — the caller's mutation handles it). */
  onSubmit: (values: InstFormValues) => Promise<string | void> | string | void;
  busy?: boolean;
  serverError?: string | null;
  wide?: boolean;
  /** Live field-change bridge (e.g. a choice that re-computes another
   * field's options). */
  onFieldChange?: (name: string, value: string | number | boolean) => void;
  /** Pre-fill values (edit flows). */
  initialValues?: InstFormValues;
}) {
  const initial = useMemo(() => {
    const v: InstFormValues = {};
    for (const f of fields) {
      v[f.name] = f.kind === 'checkbox' ? false : '';
    }
    return { ...v, ...initialValues };
  }, [fields, initialValues]);

  const [values, setValues] = useState<InstFormValues>(initial);
  const [clientError, setClientError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLElement | null>(null);
  // The element that owned focus before the dialog opened — restored
  // on close (the WAI-ARIA dialog contract; keyboard users land back
  // where they came from instead of the document start).
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Reset whenever the dialog (re)opens with a fresh field set.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setValues(initial);
      setClientError(null);
      // Focus the first control — keyboard users land inside the dialog.
      const t = setTimeout(() => firstInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    const restore = restoreFocusRef.current;
    if (restore && document.contains(restore)) restore.focus();
    return undefined;
  }, [open, initial]);

  // Escape closes; Tab is TRAPPED inside the dialog (the platform's
  // overlay contract — the modal owns the keyboard until it closes).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
        return;
      }
      cycleFocusTrap(dialogRef.current, e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const set = (name: string, v: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    onFieldChange?.(name, v);
  };

  const validate = (): string | null => {
    for (const f of fields) {
      if (f.kind !== 'checkbox' && f.required) {
        const v = values[f.name];
        if (v === undefined || v === '') return `«${f.label}» مطلوب.`;
      }
    }
    // Date order: any *_from ≤ any paired *_to on the same stem.
    for (const f of fields) {
      if (f.kind === 'date' && f.name.endsWith('From')) {
        const to = values[f.name.replace(/From$/, 'To')];
        const from = values[f.name];
        if (from && to && String(from) > String(to)) {
          return 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.';
        }
      }
      if (f.kind === 'date' && f.name === 'startDate') {
        const to = values.endDate;
        const from = values.startDate;
        if (from && to && String(from) > String(to)) {
          return 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.';
        }
      }
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setClientError(err); return; }
    // Strip empty strings → undefined so optional fields stay absent.
    const cleaned: InstFormValues = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.kind === 'checkbox') cleaned[f.name] = v ?? false;
      else if (v !== '' && v !== undefined) cleaned[f.name] = v;
    }
    const serverMsg = await onSubmit(cleaned);
    if (typeof serverMsg === 'string' && serverMsg) setClientError(serverMsg);
  };

  const errorText = clientError ?? serverError ?? null;

  return (
    <div
      className="inst-dialog-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        className={`inst-dialog${wide ? ' inst-dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="inst-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="inst-dialog-close" onClick={onCancel} aria-label="إغلاق">
            <Icon icon={X} size={16} />
          </button>
        </header>
        {description && <p className="inst-dialog-desc">{description}</p>}
        <form
          className="inst-form"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          {fields.map((f, i) => {
            const common = { id: `inst-f-${f.name}` };
            if (f.kind === 'checkbox') {
              return (
                <label key={f.name} className="inst-check" htmlFor={common.id}>
                  <input
                    ref={i === 0 ? (el) => { if (el) firstInputRef.current = el; } : undefined}
                    {...common}
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={(e) => set(f.name, e.target.checked)}
                  />
                  <span>{f.label}</span>
                </label>
              );
            }
            return (
              <div key={f.name} className="inst-field">
                <label htmlFor={common.id}>
                  {f.label}
                  {f.required && <span className="inst-req" aria-hidden="true"> *</span>}
                </label>
                {f.kind === 'textarea' ? (
                  <textarea
                    ref={i === 0 ? (el) => { if (el) firstInputRef.current = el; } : undefined}
                    {...common}
                    rows={f.rows ?? 3}
                    value={String(values[f.name] ?? '')}
                    placeholder={f.placeholder}
                    maxLength={f.maxLength ?? 2000}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                ) : f.kind === 'select' ? (
                  <select
                    ref={i === 0 ? (el) => { if (el) firstInputRef.current = el; } : undefined}
                    {...common}
                    value={String(values[f.name] ?? '')}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    <option value="">{f.placeholder ?? '— اختر —'}</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    ref={i === 0 ? (el) => { if (el) firstInputRef.current = el; } : undefined}
                    {...common}
                    type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
                    value={String(values[f.name] ?? '')}
                    placeholder={f.placeholder}
                    maxLength={f.kind === 'text' ? (f.maxLength ?? 200) : undefined}
                    min={f.kind === 'number' ? f.min : undefined}
                    max={f.kind === 'number' ? f.max : undefined}
                    step={f.kind === 'number' ? f.step : undefined}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
                {f.hint && <p className="inst-hint">{f.hint}</p>}
              </div>
            );
          })}
          {errorText && (
            <p className="inst-form-error" role="alert">
              {errorText}
            </p>
          )}
          <footer className="inst-dialog-actions">
            <button type="button" className="btn ghost sm" onClick={onCancel}>إلغاء</button>
            <button type="submit" className="btn primary sm" disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
              {submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* ── the confirm action ─────────────────────────────────────────── */

export function InstConfirm({
  open, title, description, confirmLabel = 'تأكيد', danger, onConfirm, onCancel, busy,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  // Focus restore: the opener element re-takes focus on close (the
  // alertdialog contract; InstFormDialog owns the full Tab trap).
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      return undefined;
    }
    const restore = restoreFocusRef.current;
    if (restore && document.contains(restore)) restore.focus();
    return undefined;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="inst-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="inst-dialog inst-dialog-sm" role="alertdialog" aria-modal="true" aria-label={title}>
        <header className="inst-dialog-head"><h2>{title}</h2></header>
        {description && <p className="inst-dialog-desc">{description}</p>}
        <footer className="inst-dialog-actions">
          <button type="button" className="btn ghost sm" onClick={onCancel}>إلغاء</button>
          <button
            type="button"
            className={`btn sm ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
