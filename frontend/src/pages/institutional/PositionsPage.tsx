/**
 * r352 §D — positions & appointments: the statutory position catalog
 * (rendered from /catalog/position-templates — the official titles,
 * never "Administrator" for everything) + the appointment workflows
 * (create / end / cancel, holder, unit scope, authority, decision
 * refs, term dates). The legal/institutional title stays visually
 * separate from academic rank and platform role.
 */
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { serverError,
  DetailList, EnumChip, InstFilters, InstFormDialog, InstPagedTable, InstSection,
  InstSelect, InstStates, type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useAppointments, useMyCapabilities, useMyInstitutionProfile,
  useOrgUnitTree, usePeople, usePositionTemplates, useInstActions} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  APPOINTMENT_STATUS_LABELS, ORG_UNIT_TYPE_LABELS, POSITION_CATEGORY_LABELS,
} from '../../lib/institutional/labels';
import type { Appointment, PositionTemplateRow } from '../../lib/institutional/types';
import { flattenUnits } from './PeoplePage';

const APPT_UNIT: [string, string, string, string] = ['تعيين واحد', 'تعيينان', 'تعيينات', 'تعيين'];

export function InstitutionPositionsPage() {
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('APPOINTMENTS_MANAGE') ?? false;
  const profileQuery = useMyInstitutionProfile();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const appointmentsQuery = useAppointments({ status: status || undefined, page, limit: 20 });

  const templatesQuery = usePositionTemplates();
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const treeQuery = useOrgUnitTree();
  const mutations = useInstActions(['appointments'], {
    create: (i: Parameters<typeof instApi.createAppointment>[0]) => instApi.createAppointment(i),
    end: (i: { id: string; endDate?: string; notes?: string }) => instApi.endAppointment(i.id, i),
    cancel: (i: { id: string; notes?: string }) => instApi.cancelAppointment(i.id, i.notes),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endTarget, setEndTarget] = useState<Appointment | null>(null);

  const kindCode = profileQuery.data?.kind?.code ?? null;

  /** Eligible templates for THIS institution kind (contract §5: the
   * server validates eligibility; the UI mirrors it for honest
   * options, and the server stays the authority). */
  const eligibleTemplates = useMemo(
    () => (templatesQuery.data ?? []).filter(
      (t) => t.eligibleInstitutionTypeCodes.length === 0
        || t.eligibleInstitutionTypeCodes.includes(kindCode ?? ''),
    ),
    [templatesQuery.data, kindCode],
  );

  const peopleOptions = (peopleQuery.data?.data ?? []).map((p) => ({
    value: p.id, label: p.fullNameAr,
  }));

  /** scopeRequirement (contract): the chosen unit must satisfy the
   * template's required unit type — the UI filters to valid units,
   * the server enforces (400 APPOINTMENT_UNIT_TYPE_REQUIRED). */
  const unitOptionsFor = (templateCode: string) => {
    const tpl = (templatesQuery.data ?? []).find((t) => t.code === templateCode);
    const units = treeQuery.data ? flattenUnits(treeQuery.data) : [];
    return units
      .filter((u) => u.status === 'ACTIVE')
      .filter((u) => !tpl?.scopeRequirement || u.type === tpl.scopeRequirement)
      .map((u) => ({ value: u.id, label: `${ORG_UNIT_TYPE_LABELS[u.type]} — ${u.nameAr}` }));
  };

  const [templateChoice, setTemplateChoice] = useState('');
  const template = (templatesQuery.data ?? []).find((t) => t.code === templateChoice);
  const unitOptions = unitOptionsFor(templateChoice);

  const apptFields: InstField[] = [
    { kind: 'select', name: 'personId', label: 'الفرد (شاغل المنصب)', required: true, options: peopleOptions },
    {
      kind: 'select', name: 'positionCode', label: 'المنصب', required: true,
      options: eligibleTemplates.map((t) => ({ value: t.code, label: t.titleAr })),
      hint: template?.scopeRequirement
        ? `هذا المنصب يتطلب وحدة من نوع: ${ORG_UNIT_TYPE_LABELS[template.scopeRequirement]}.`
        : 'المناصب المعروضة مؤهلة لنوع مؤسستك حسب الدليل.',
    },
    { kind: 'select', name: 'orgUnitId', label: 'الوحدة (نطاق التعيين)', options: unitOptions },
    { kind: 'text', name: 'appointedByAuthority', label: 'جهة التعيين', maxLength: 120, hint: 'مثال: وزارة التعليم العالي، مجلس الجامعة.' },
    { kind: 'text', name: 'decisionNumber', label: 'رقم القرار', maxLength: 80 },
    { kind: 'date', name: 'decisionDate', label: 'تاريخ القرار' },
    { kind: 'date', name: 'startDate', label: 'تاريخ بدء المباشرة', required: true },
    { kind: 'date', name: 'endDate', label: 'تاريخ الانتهاء (اختياري)' },
    { kind: 'number', name: 'termMonths', label: 'مدة النيابة (بالأشهر)', min: 1, max: 96, hint: 'اختياري — للمناصب ذات المدة القانونية.' },
    { kind: 'checkbox', name: 'acting', label: 'تكليف بالوكالة', hint: 'الوكالة لا تحجز المقصود الأصلي للمنصب.' },
  ];

  const submitAppointment = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.create({
        personId: values.personId as string,
        positionCode: values.positionCode as string,
        orgUnitId: values.orgUnitId as string | undefined,
        appointedByAuthority: values.appointedByAuthority as string | undefined,
        decisionNumber: values.decisionNumber as string | undefined,
        decisionDate: values.decisionDate as string | undefined,
        startDate: values.startDate as string,
        endDate: values.endDate as string | undefined,
        termMonths: values.termMonths as number | undefined,
        acting: Boolean(values.acting),
      });
      toast.success('سُجِّل التعيين');
      setFormOpen(false);
      setTemplateChoice('');
    } catch (err) {
      return serverError(err, 'تعذَّر تسجيل التعيين.');
    } finally {
      setBusy(false);
    }
  };


  /** Group the catalog by category for the catalog section. */
  const catalogByCategory = useMemo(() => {
    const map = new Map<string, PositionTemplateRow[]>();
    for (const t of eligibleTemplates) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return [...map.entries()];
  }, [eligibleTemplates]);

  const templateById = useMemo(() => {
    const m = new Map<string, PositionTemplateRow>();
    for (const t of templatesQuery.data ?? []) m.set(t.id, t);
    return m;
  }, [templatesQuery.data]);

  const columns: Array<InstColumn<Appointment>> = [
    {
      head: 'المنصب',
      cell: (a) => (
        <span className="inst-tree-name">
          {templateById.get(a.positionId)?.titleAr ?? '—'}
          {a.acting && <span className="inst-tree-kind"> (وكالة)</span>}
        </span>
      ),
    },
    { head: 'منذ', cell: (a) => formatDate(a.startDate) },
    { head: 'حتى', cell: (a) => (a.endDate ? formatDate(a.endDate) : '—') },
    { head: 'الحالة', cell: (a) => <EnumChip value={a.status} labels={APPOINTMENT_STATUS_LABELS} /> },
    { head: 'بقرار', mobileHidden: true, cell: (a) => <span className="font-mono">{a.decisionNumber ?? '—'}</span> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (a) => canManage && (a.status === 'ACTIVE' || a.status === 'SCHEDULED') ? (
        <span className="inst-actions">
          <button type="button" className="btn ghost sm" onClick={() => setEndTarget(a)}>إنهاء</button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={async () => {
              try {
                await mutations.cancel({ id: a.id });
                toast.success('أُلغي التعيين');
              } catch (err) {
                toast.error(serverError(err, 'تعذَّر الإلغاء.'));
              }
            }}
          >
            إلغاء
          </button>
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="المناصب والتعيينات"
        eyebrow="مساحة العمل المؤسسية"
        description="دليل المناصب القانونية وتعيين شاغليها — المسمى الرسمي، نطاق الوحدة، جهة التعيين، ومرجع القرار. المسمى المؤسسي مستقل عن الرتبة الأكاديمية ودور المنصة."
        meta={canManage ? (
          <button type="button" className="btn primary sm" onClick={() => setFormOpen(true)}>
            <Icon icon={Plus} size={14} /> تعيين جديد
          </button>
        ) : null}
      />

      <InstFilters>
        <InstSelect
          ariaLabel="تصفية بحالة التعيين"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      <InstPagedTable
        query={appointmentsQuery}
        columns={columns}
        rowKey={(a) => a.id}
        ariaLabel="سجل التعيينات"
        unit={APPT_UNIT}
        onPage={setPage}
        empty={null}
      />

      <InstSection
        title="دليل المناصب المعتمدة"
        description="القوالب القانونية العائدة للدليل — تُعرض كما تعيدها الخدمة، مؤهلةً لنوع مؤسستك."
      >
        <InstStates
          isLoading={templatesQuery.isLoading}
          error={templatesQuery.error}
          isEmpty={eligibleTemplates.length === 0}
        >
          {catalogByCategory.map(([category, list]) => (
            <InstSection key={category} title={POSITION_CATEGORY_LABELS[category as keyof typeof POSITION_CATEGORY_LABELS] ?? category}>
              <DetailList
                items={list.map((t) => ({
                  label: t.titleAr,
                  value: (
                    <span className="inst-actions">
                      {t.scopeRequirement && (
                        <span className="inst-tree-kind">يتطلب: {ORG_UNIT_TYPE_LABELS[t.scopeRequirement]}</span>
                      )}
                      {t.isLocalVariant && <EnumChip value="DRAFT" labels={{ DRAFT: 'نسخة محلية' }} />}
                      <span className="font-mono inst-tree-kind">{t.code}</span>
                    </span>
                  ),
                }))}
              />
            </InstSection>
          ))}
        </InstStates>
      </InstSection>

      <InstFormDialog
        open={formOpen}
        title="تعيين جديد"
        description="يتحقق الخادم من أهلية المنصب لنوع المؤسسة، ونوع الوحدة المطلوبة، وعدم تعارض التعيين مع تعيين قائم."
        fields={apptFields}
        submitLabel="تسجيل التعيين"
        busy={busy}
        wide
        onFieldChange={(name, value) => {
          if (name === 'positionCode') setTemplateChoice(String(value));
        }}
        onCancel={() => { setFormOpen(false); setTemplateChoice(''); }}
        onSubmit={submitAppointment}
      />

      {/* end-appointment confirm */}
      {endTarget && (
        <InstFormDialog
          open
          title="إنهاء التعيين"
          description="سيُسجَّل الإنهاء بتاريخه مع مرجع القرار إن وُجد."
          fields={[
            { kind: 'date', name: 'endDate', label: 'تاريخ الإنهاء' },
            { kind: 'text', name: 'notes', label: 'ملاحظات', maxLength: 300 },
          ]}
          submitLabel="إنهاء"
          busy={busy}
          onCancel={() => setEndTarget(null)}
          onSubmit={async (values) => {
            if (!endTarget) return 'لا يوجد تعيين محدد.';
            setBusy(true);
            try {
              await mutations.end({
                id: endTarget.id,
                endDate: values.endDate as string | undefined,
                notes: values.notes as string | undefined,
              });
              toast.success('أُنهي التعيين');
              setEndTarget(null);
            } catch (err) {
              return serverError(err, 'تعذَّر إنهاء التعيين.');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </PageFrame>
  );
}
