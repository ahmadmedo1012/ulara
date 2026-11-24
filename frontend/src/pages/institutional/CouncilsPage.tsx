/**
 * r352 §F — councils & committees: the governance workspace. The list
 * route + the council detail (memberships, meetings, documents) and
 * the meeting detail route (agenda → attendance → resolutions →
 * minutes lifecycle) live in CouncilDetailPage.tsx. This file owns
 * the list + creation flow.
 */
import {
  useState, Plus, PageFrame,
  PageHeader, toast, Icon, serverError,
  InstConfirm, InstFilters, InstFormDialog,
  InstSelect, type InstField, type InstFormValues,
} from './scaffold';
/* R359 (W2-e): the governance register rides the sheet grammar — the
 * KpiBand facts + the framed COUNCILS register (the DataSheet with
 * flat sg-flag statuses, the council's own row linking to its file). */
import { Link, useNavigate } from 'react-router-dom';
import { KpiBand, SheetSection, DataSheet, type DataSheetColumn } from '../../components/patterns';
import { StatusFlag, rowToneFromStatus, InstStates } from '../../components/institutional/kit';
import { TablePaginationFooter } from '../admin/TablePaginationFooter';
import { useInstitutionScope } from '../../stores/auth.store';
import {
  useCouncils, useMyCapabilities, useOrgUnitTree, useInstActions} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  COUNCIL_STATUS_LABELS, COUNCIL_TYPE_LABELS,
} from '../../lib/institutional/labels';
import type { Council } from '../../lib/institutional/types';
import { activeUnitOptions } from '../../lib/institutional/orgUnitOptions';

const COUNCIL_UNIT: [string, string, string, string] = ['مجلس واحد', 'مجلسان', 'مجالس', 'مجلس'];

export function InstitutionCouncilsPage() {
  const navigate = useNavigate();
  const scope = useInstitutionScope();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('COUNCILS_MANAGE') ?? false;

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const councilsQuery = useCouncils({ type: type || undefined, status: status || undefined, page, limit: 20 });
  const treeQuery = useOrgUnitTree();
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Council | null>(null);

  const mutations = useInstActions(['councils'], {
    create: (i: Parameters<typeof instApi.createCouncil>[0]) => instApi.createCouncil(i),
    // D16 lifecycle: DISSOLVED is terminal (a successor is a NEW council);
    // CANCELLED is clerically reversible. The dissolved/cancelled rows stay
    // in the list — the historical record is the point.
    setStatus: (i: { id: string; status: 'ACTIVE' | 'DISSOLVED' | 'CANCELLED' }) =>
      instApi.updateCouncil(i.id, { status: i.status }),
  });

  const unitOptions = activeUnitOptions(treeQuery.data);

  const fields: InstField[] = [
    { kind: 'text', name: 'nameAr', label: 'اسم المجلس/اللجنة', required: true, maxLength: 160 },
    {
      kind: 'select', name: 'type', label: 'النوع', required: true,
      options: Object.entries(COUNCIL_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'select', name: 'orgUnitId', label: 'الوحدة المرتبطة', options: unitOptions },
    { kind: 'text', name: 'code', label: 'الرمز', maxLength: 40 },
    { kind: 'text', name: 'legalBasis', label: 'السند القانوني', maxLength: 200 },
    { kind: 'text', name: 'charterRef', label: 'مرجع اللائحة/الميثاق', maxLength: 120 },
    { kind: 'date', name: 'establishedAt', label: 'تاريخ الإنشاء' },
  ];

  const submit = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      const created = await mutations.create({
        nameAr: values.nameAr as string,
        type: values.type as never,
        orgUnitId: values.orgUnitId as string | undefined,
        code: values.code as string | undefined,
        legalBasis: values.legalBasis as string | undefined,
        charterRef: values.charterRef as string | undefined,
        establishedAt: values.establishedAt as string | undefined,
      });
      toast.success('أُنشئ المجلس');
      setFormOpen(false);
      navigate(`/institution/councils/${created.id}`);
    } catch (err) {
      return serverError(err, 'تعذَّر إنشاء المجلس.');
    } finally {
      setBusy(false);
    }
  };

  const applyTransition = async () => {
    if (!transitionTarget) return;
    setBusy(true);
    try {
      await mutations.setStatus({ id: transitionTarget.id, status: transitionStatus });
      toast.success(transitionStatus === 'DISSOLVED' ? 'حُلّ المجلس — بقي في السجل التاريخي' : transitionStatus === 'CANCELLED' ? 'أُلغي المجلس (إجراء كتابي — قابل للتراجع)' : 'أُعيد تفعيل المجلس');
      setTransitionTarget(null);
    } catch (err) {
      toast.error(serverError(err, 'تعذّر تغيير حالة المجلس.'));
    } finally {
      setBusy(false);
    }
  };

  /** The D16-legal transitions for the row's current state. */
  const transitionsOf = (c: Council): Array<{ to: 'ACTIVE' | 'DISSOLVED' | 'CANCELLED'; label: string; danger?: boolean }> => {
    if (c.status === 'ACTIVE') {
      return [
        { to: 'DISSOLVED', label: 'حلّ', danger: true },
        { to: 'CANCELLED', label: 'إلغاء كتابي' },
      ];
    }
    if (c.status === 'CANCELLED') return [{ to: 'ACTIVE', label: 'إعادة تفعيل' }];
    return []; // DISSOLVED is terminal — the successor is a new council
  };

  const [transitionStatus, setTransitionStatus] = useState<'ACTIVE' | 'DISSOLVED' | 'CANCELLED'>('DISSOLVED');

  /* R359 (W2-e) — the register columns: the council's name is the row's
   * link to its file, the type rides the sub line, statuses ride the
   * flat flag, the legal basis is the mono datum. */
  const columns: DataSheetColumn<Council>[] = [
    {
      key: 'name',
      label: 'المجلس',
      render: (c) => (
        <Link to={`/institution/councils/${c.id}`} className="sg-cell-title">{c.nameAr}</Link>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      render: (c) => (
        <span className="sg-cell-stack">
          <span>{COUNCIL_TYPE_LABELS[c.type]}</span>
          {c.legalBasis && <span className="sg-cell-sub">{c.legalBasis}</span>}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (c) => <StatusFlag value={c.status} labels={COUNCIL_STATUS_LABELS} />,
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (c) => {
        const moves = canManage ? transitionsOf(c) : [];
        return moves.length > 0 ? (
          <span className="inst-actions">
            {moves.map((m) => (
              <button
                key={m.to}
                type="button"
                className={`btn ghost sm${m.danger ? ' danger' : ''}`}
                disabled={busy}
                onClick={() => {
                  setTransitionStatus(m.to);
                  setTransitionTarget(c);
                }}
              >
                {m.label}
              </button>
            ))}
          </span>
        ) : (
          <span className="inst-na">—</span>
        );
      },
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="المجالس واللجان"
        eyebrow="مساحة العمل المؤسسية"
        description="مجالس الجامعة والكليات والأقسام والمجالس العلمية ومجالس التأديب واللجان الدائمة — بالنصاب، والاجتماعات، والمحاضر، والقرارات، والمتابعة."
        meta={canManage ? (
          <button type="button" className="btn primary sm" onClick={() => setFormOpen(true)}>
            <Icon icon={Plus} size={14} /> مجلس جديد
          </button>
        ) : null}
      />

      {/* R359 (W2-e) — the KPI band: the real counts from the paged
          payload + the unit options the creation form offers. */}
      {scope !== null && (
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'COUNCILS',
              label: 'المجالس واللجان (الاستعلام الحالي)',
              value: councilsQuery.data?.meta.total ?? 0,
              empty: councilsQuery.data == null,
            },
            {
              index: '02',
              caption: 'RESULTS',
              label: 'نتائج الصفحة الحاليّة',
              value: councilsQuery.data?.data.length ?? 0,
              empty: councilsQuery.data == null,
            },
            {
              index: '03',
              caption: 'ORG UNITS',
              label: 'الوحدات التنظيمية النشطة',
              value: activeUnitOptions(treeQuery.data).length,
              empty: treeQuery.data == null,
            },
          ]}
        />
      )}

      <InstFilters>
        <InstSelect
          ariaLabel="تصفية بالنوع"
          anyLabel="كل الأنواع"
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          options={Object.entries(COUNCIL_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <InstSelect
          ariaLabel="تصفية بالحالة"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(COUNCIL_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      {/* R359 (W2-e) — the framed register (states + DataSheet + the
          family pagination footer). */}
      <SheetSection index="01" caption="COUNCILS" title="سجلّ المجالس واللجان" pad="none">
        <InstStates
          isLoading={councilsQuery.isLoading}
          error={councilsQuery.error}
          isEmpty={(councilsQuery.data?.data ?? []).length === 0}
        >
          <DataSheet
            caption="سجلّ المجالس واللجان"
            columns={columns}
            rows={councilsQuery.data?.data ?? []}
            rowTone={(c) => rowToneFromStatus(c.status)}
          />
        </InstStates>
        {councilsQuery.data && councilsQuery.data.meta.totalPages > 1 && (
          <div className="sg-pad-in">
            <TablePaginationFooter
              page={councilsQuery.data.meta.page}
              totalPages={councilsQuery.data.meta.totalPages}
              total={councilsQuery.data.meta.total}
              unit={COUNCIL_UNIT}
              onPage={setPage}
            />
          </div>
        )}
      </SheetSection>

      <InstFormDialog
        open={formOpen}
        title="إنشاء مجلس أو لجنة"
        fields={fields}
        submitLabel="إنشاء"
        busy={busy}
        onCancel={() => setFormOpen(false)}
        onSubmit={submit}
      />

      <InstConfirm
        open={transitionTarget !== null}
        title={transitionStatus === 'DISSOLVED'
          ? `حلّ «${transitionTarget?.nameAr ?? ''}»`
          : transitionStatus === 'CANCELLED'
            ? `إلغاء «${transitionTarget?.nameAr ?? ''}» (إجراء كتابي)`
            : `إعادة تفعيل «${transitionTarget?.nameAr ?? ''}»`}
        description={transitionStatus === 'DISSOLVED'
          ? 'الحلّ نهائي (D16) — يبقى المجلس في السجل التاريخي؛ الخَلَف مجلسٌ جديد يُنشأ بقرار.'
          : transitionStatus === 'CANCELLED'
            ? 'الإلغاء الكتابي قابل للتراجع (إعادة التفعيل)، بعكس الحلّ.'
            : 'يُعاد المجلس إلى الحالة القائمة.'}
        danger={transitionStatus === 'DISSOLVED'}
        confirmLabel={transitionStatus === 'DISSOLVED' ? 'حلّ المجلس' : transitionStatus === 'CANCELLED' ? 'إلغاء' : 'إعادة التفعيل'}
        busy={busy}
        onConfirm={applyTransition}
        onCancel={() => setTransitionTarget(null)}
      />
    </PageFrame>
  );
}
