/**
 * r360 F4 — the audit-trail browser (r359 A4's backend surface, the
 * UI A3 could not build).
 *
 * GET /institutional/audit-logs — the institution-scoped trail, every
 * row written in-transaction by the r352 routers. The READ is
 * AUDIT_BROWSE-gated on the SERVER (ADMIN/QUALITY/OWNER defaults):
 * the nav hides the module for members without the grant, and a
 * direct deep-link renders the honest 403 state (never a fake wall).
 *
 * Honesty rules (the §D discipline, the workspace's own law):
 *  · The trail is READ-ONLY — the page owns zero write affordances.
 *  · Filters are the route's own contract: free text (q — action +
 *    resource), and the action exact-match field. The entity pair
 *    (entityType/entityId) rides the URL-driven deep links from the
 *    detail surfaces; this sheet keeps the two everyday filters.
 *  · Rows render server fields verbatim; the actor column carries
 *    the include's own name/email; ip + time ride the mono/​date
 *    registers.
 *  · The register speaks the sheet grammar (KpiBand + DataSheet +
 *    the family pagination footer + InstFilters, the workspace's own
 *    kit).
 */
import { useState } from 'react';
import { KpiBand, SheetSection, DataSheet, PageFrame, PageHeader, type DataSheetColumn } from '../../components/patterns';
import { TablePaginationFooter } from '../admin/TablePaginationFooter';
import { InstStates, InstFilters } from '../../components/institutional/kit';
import { useAuditLogs } from '../../hooks/institutional/queries';
import { formatDate } from '../../utils/numbers';
import type { AuditLogEntry } from '../../lib/institutional/types';

const AUDIT_UNIT: [string, string, string, string] = ['سجلًا', 'سجلين', 'سجلات', 'سجلًا'];

export function InstitutionAuditLogPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const logsQuery = useAuditLogs({
    q: search || undefined,
    action: action || undefined,
    page,
    limit: 20,
  });

  const rows = logsQuery.data?.data ?? [];
  const meta = logsQuery.data?.meta;

  const columns: DataSheetColumn<AuditLogEntry>[] = [
    {
      key: 'action',
      label: 'الإجراء',
      render: (r) => (
        <span className="sg-cell-stack">
          <bdi dir="ltr" className="font-mono sg-cell-title">{r.action}</bdi>
          {r.resourceType ? (
            <span className="sg-cell-sub font-mono">
              <bdi dir="ltr">{r.resourceType}{r.resourceId ? ` · ${r.resourceId}` : ''}</bdi>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'actor',
      label: 'الفاعل',
      render: (r) => (
        r.user ? (
          <span className="sg-cell-stack">
            <span>{`${r.user.firstName} ${r.user.lastName}`.trim()}</span>
            <span className="sg-cell-sub font-mono"><bdi dir="ltr">{r.user.email}</bdi></span>
          </span>
        ) : (
          <span className="sg-cell-sub">— النظام —</span>
        )
      ),
    },
    {
      key: 'ip',
      label: 'العنوان',
      mono: true,
      render: (r) => (r.ip ? <bdi dir="ltr" className="font-mono">{r.ip}</bdi> : '—'),
    },
    {
      key: 'at',
      label: 'الوقت',
      render: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="سجل التدقيق"
        eyebrow="مساحة العمل المؤسسية"
        description="كل كتابة مؤسسية كما سجّلتها الخدمة لحظة حدوثها — للفاعل، وعلى المورد، ومن أي عنوان. للقراءة فقط: صلاحية التصفّح (AUDIT_BROWSE) من الدور أو المنحة."
      />

      {/* R359 (W2-e) — the KPI band: the real counts from the paged
          envelope (the register's own meta, never client math). */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'TRAIL',
            label: 'إجمالي السجلات في نطاقك',
            value: meta?.total ?? 0,
            delta: 'كل الكتابات المؤسسية',
          },
          {
            index: '02',
            caption: 'PAGE',
            label: 'الصفحة الحالية',
            value: meta?.page ?? 1,
            delta: `من ${meta?.totalPages ?? 1}`,
          },
          {
            index: '03',
            caption: 'FILTER',
            label: 'عوامل التصفية',
            value: (search ? 1 : 0) + (action ? 1 : 0),
            delta: search || action ? 'التصفية مفعّلة' : 'بلا تصفية',
          },
        ]}
      />

      {/* The trail register: filters + states + DataSheet + the family
          pagination footer (the same InstStates contract owns the
          context gate, loading, error, empty — and the honest 403 wall
          for a member who deep-linked without the grant). */}
      <SheetSection index="01" caption="AUDIT TRAIL" title="سجل العمليات" pad="none">
        <div className="sg-pad-in">
          <InstFilters
            search={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            trailing={(
              <>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => { setAction(e.target.value.trim()); setPage(1); }}
                  placeholder="الإجراء بالضبط — مثل council.document.create"
                  aria-label="تصفية بالإجراء"
                  className="inst-action-input font-mono"
                  dir="ltr"
                />
                {(search || action) && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => { setSearch(''); setAction(''); setPage(1); }}
                  >
                    مسح التصفية
                  </button>
                )}
              </>
            )}
          />
        </div>
        <InstStates
          isLoading={logsQuery.isLoading}
          error={logsQuery.error}
          isEmpty={rows.length === 0}
          empty={(
            <div className="inst-state">
              <p className="inst-state-title">لا سجلات في هذا النطاق</p>
              <p className="inst-state-desc">
                {search || action
                  ? 'لا شيء يطابق تصفيتك — وسّعها أو امسحها.'
                  : 'السجل يبدأ من أول كتابة مؤسسية — الأحداث تتراكم هنا لحظة حدوثها.'}
              </p>
            </div>
          )}
        >
          <DataSheet
            caption="سجل التدقيق المؤسسي"
            columns={columns}
            rows={rows}
          />
        </InstStates>
        {meta && meta.totalPages > 1 && (
          <div className="sg-pad-in">
            <TablePaginationFooter
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              unit={AUDIT_UNIT}
              onPage={setPage}
            />
          </div>
        )}
      </SheetSection>
    </PageFrame>
  );
}
