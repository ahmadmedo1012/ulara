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
import { Icon } from '../Icon';
import { Search, X, Loader2, ChevronDown } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '../primitives/States';
import { TablePaginationFooter } from '../../pages/admin/TablePaginationFooter';
import { toneOf, type InstTone } from '../../lib/institutional/labels';
import type { Paged } from '../../lib/institutional/types';
import { useInstitutionScope } from '../../stores/auth.store';
import '../../styles/institutional/workspace.css';

/** The server's own Arabic error message from the shared envelope —
 * the single extraction every page uses (the server is the
 * authority; this only reads its wording). */
export function serverError(err: unknown, fallback = 'تعذَّر إتمام العملية.'): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } } | undefined;
  return e?.response?.data?.error?.message ?? fallback;
}

/* ── StatusChip — ONE chip vocabulary (data-tone) ────────────────── */

export function StatusChip({
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

/* ── the workspace states ───────────────────────────────────────── */

/** The honest no-institution-context state (contract §0: reads need
 * a verified membership → select an institution first). */
export function ContextRequiredState() {
  return (
    <div className="inst-state">
      <EmptyState
        title="اختر مؤسستك أولاً"
        description="مساحة العمل المؤسسية تعمل داخل سياق مؤسسة محددة — اختر مؤسستك من أعلى الصفحة ثم عُد إلى هنا."
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
}

/**
 * The one table anatomy every list uses: .table-wrap > table.table
 * .tbl-stack (the platform's table system — responsive stacking via
 * data-label), sticky-header-free, hairline rows.
 */
export function InstTable<Row>({
  rows, columns, rowKey, onRowClick, ariaLabel, dense,
}: {
  rows: Row[];
  columns: Array<InstColumn<Row>>;
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  ariaLabel: string;
  dense?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className={`table tbl-stack${dense ? ' inst-table-dense' : ''}`} aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col">{c.head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'inst-row-click' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
              } : undefined}
              aria-disabled={undefined}
            >
              {columns.map((c, i) => (
                <td key={i} data-label={c.mobileHidden ? undefined : c.head}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <TablePaginationFooter
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          unit={unit}
          onPage={onPage}
        />
      )}
    </>
  );
}

/* ── the section header used inside detail pages ────────────────── */

export function InstSection({
  title, actions, children, description,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="inst-section">
      <header className="inst-section-head">
        <h3 className="inst-section-title">{title}</h3>
        {actions}
      </header>
      {description && <p className="inst-section-desc">{description}</p>}
      {children}
    </section>
  );
}

/* ── key/value detail rows ──────────────────────────────────────── */

export function DetailList({ items }: {
  items: Array<{ label: string; value: ReactNode }>;
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

  // Reset whenever the dialog (re)opens with a fresh field set.
  useEffect(() => {
    if (open) {
      setValues(initial);
      setClientError(null);
      // Focus the first control — keyboard users land inside the dialog.
      const t = setTimeout(() => firstInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, initial]);

  // Escape closes; focus stays trapped enough for the modal contract
  // (role=dialog aria-modal, tab cycles the two focusable poles).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
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
              {busy && <Icon icon={Loader2} size={14} className="motion-spinner" />}
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
            {busy && <Icon icon={Loader2} size={14} className="motion-spinner" />}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ── the empty-tab content ──────────────────────────────────────── */

export function InstEmptyRows({ title, description }: { title: string; description?: string }) {
  return (
    <div className="inst-state">
      <EmptyState title={title} description={description} />
    </div>
  );
}
