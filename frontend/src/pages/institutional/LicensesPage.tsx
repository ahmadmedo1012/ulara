/**
 * r352 §I (external oversight) — licenses & inspections: technical
 * licenses / operating permits / establishment decisions, external
 * inspection visits, findings with severity, and corrective action
 * plans with owners and deadlines — the full oversight lifecycle,
 * distinct from internal QA (the quality section).
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { serverError,
  DetailList, EnumChip, InstFilters, InstFormDialog, InstPagedTable, InstSection,
  InstSelect, type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useAuthorities, useFindings, useInspections, useLicenses, useMyCapabilities, usePeople, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  CORRECTIVE_STATUS_LABELS, FINDING_SEVERITY_LABELS, FINDING_STATUS_LABELS,
  INSPECTION_KIND_LABELS, INSPECTION_STATUS_LABELS, LICENSE_KIND_LABELS,
  LICENSE_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { ComplianceFinding, OperationalLicense, RegulatoryInspection } from '../../lib/institutional/types';

const LIC_UNIT: [string, string, string, string] = ['ترخيص واحد', 'ترخيصان', 'تراخيص', 'ترخيص'];
const INSP_UNIT: [string, string, string, string] = ['تفتيش واحد', 'تفتيشان', 'تفتيشات', 'تفتيش'];
const FIND_UNIT: [string, string, string, string] = ['ملاحظة واحدة', 'ملاحظتان', 'ملاحظات', 'ملاحظة'];

const LIC_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACTIVE'],
  ACTIVE: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  RENEWED: ['SUSPENDED', 'REVOKED', 'EXPIRED'],
  SUSPENDED: ['ACTIVE', 'REVOKED', 'EXPIRED'],
  REVOKED: [], EXPIRED: [],
};

const FINDING_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['ACKNOWLEDGED', 'DISPUTED'],
  ACKNOWLEDGED: ['IN_REMEDIATION', 'DISPUTED'],
  IN_REMEDIATION: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  DISPUTED: ['IN_REMEDIATION', 'CLOSED'],
  CLOSED: [],
};

export function InstitutionLicensesPage() {
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('ACCREDITATION_MANAGE') ?? false;

  const [licStatus, setLicStatus] = useState('');
  const [licKind, setLicKind] = useState('');
  const [licPage, setLicPage] = useState(1);
  const [inspStatus, setInspStatus] = useState('');
  const [inspPage, setInspPage] = useState(1);
  const [findStatus, setFindStatus] = useState('');
  const [findSev, setFindSev] = useState('');
  const [findPage, setFindPage] = useState(1);

  const licensesQuery = useLicenses({ status: licStatus || undefined, kind: licKind || undefined, page: licPage, limit: 10 });
  const inspectionsQuery = useInspections({ status: inspStatus || undefined, page: inspPage, limit: 10 });
  const findingsQuery = useFindings({ status: findStatus || undefined, severity: findSev || undefined, page: findPage, limit: 10 });
  const authoritiesQuery = useAuthorities();
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });

  const licenseMutations = useInstActions(['licenses'], {
    create: (i: Parameters<typeof instApi.createLicense>[0]) => instApi.createLicense(i),
    update: (i: { id: string; input: Parameters<typeof instApi.updateLicense>[1] }) =>
      instApi.updateLicense(i.id, i.input),
  });
  const inspectionMutations = useInstActions(['inspections'], {
    create: (i: Parameters<typeof instApi.createInspection>[0]) => instApi.createInspection(i),
    update: (i: { id: string; input: Parameters<typeof instApi.updateInspection>[1] }) =>
      instApi.updateInspection(i.id, i.input),
  });
  const findingMutations = useInstActions(['findings'], {
    create: (i: Parameters<typeof instApi.createFinding>[0]) => instApi.createFinding(i),
    update: (i: { id: string; status: string }) => instApi.updateFinding(i.id, { status: i.status }),
    addCorrective: (i: { findingId: string; input: Parameters<typeof instApi.addCorrectiveAction>[1] }) =>
      instApi.addCorrectiveAction(i.findingId, i.input),
  });

  const [licOpen, setLicOpen] = useState(false);
  const [inspOpen, setInspOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [correctiveTarget, setCorrectiveTarget] = useState<ComplianceFinding | null>(null);
  const [busy, setBusy] = useState(false);

  const authorityOptions = (authoritiesQuery.data ?? []).map((a) => ({ value: a.code, label: a.nameAr }));
  const peopleOptions = (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr }));

  const licFields: InstField[] = [
    {
      kind: 'select', name: 'kind', label: 'النوع', required: true,
      options: Object.entries(LICENSE_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'select', name: 'authorityCode', label: 'الجهة المانحة', required: true, options: authorityOptions },
    { kind: 'text', name: 'licenseNumber', label: 'رقم الترخيص/الإذن', maxLength: 80 },
    { kind: 'date', name: 'issuedAt', label: 'تاريخ الإصدار' },
    { kind: 'date', name: 'expiresAt', label: 'تاريخ الانتهاء' },
    { kind: 'text', name: 'conditions', label: 'الشروط', maxLength: 400 },
    { kind: 'text', name: 'documentRef', label: 'مرجع المستند', maxLength: 120 },
  ];

  const inspFields: InstField[] = [
    { kind: 'select', name: 'authorityCode', label: 'الجهة التفتيشية', required: true, options: authorityOptions },
    {
      kind: 'select', name: 'kind', label: 'نوع التفتيش', required: true,
      options: Object.entries(INSPECTION_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'date', name: 'scheduledAt', label: 'تاريخ التفتيش المخطط' },
    { kind: 'text', name: 'reportRef', label: 'مرجع التقرير', maxLength: 120 },
  ];

  const findFields: InstField[] = [
    {
      kind: 'select', name: 'severity', label: 'الخطورة', required: true,
      options: Object.entries(FINDING_SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'text', name: 'titleAr', label: 'عنوان الملاحظة', required: true, maxLength: 200 },
    { kind: 'textarea', name: 'description', label: 'التفصيل', rows: 3, maxLength: 800 },
    { kind: 'text', name: 'legalReference', label: 'المرجع القانوني/التنظيمي', maxLength: 200 },
    { kind: 'date', name: 'dueDate', label: 'تاريخ الاستحقاق للمعالجة' },
  ];

  const correctiveFields: InstField[] = [
    { kind: 'textarea', name: 'planText', label: 'نص خطة المعالجة', required: true, rows: 3, maxLength: 800 },
    { kind: 'select', name: 'ownerPersonId', label: 'المسؤول عن التنفيذ', options: peopleOptions },
    { kind: 'date', name: 'targetDate', label: 'الموعد المستهدف' },
  ];

  const submitLic = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await licenseMutations.create({
        kind: String(values.kind),
        authorityCode: String(values.authorityCode),
        licenseNumber: values.licenseNumber as string | undefined,
        issuedAt: values.issuedAt as string | undefined,
        expiresAt: values.expiresAt as string | undefined,
        conditions: values.conditions as string | undefined,
        documentRef: values.documentRef as string | undefined,
      });
      toast.success('سُجِّل الترخيص');
      setLicOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const submitInsp = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await inspectionMutations.create({
        authorityCode: String(values.authorityCode),
        kind: String(values.kind),
        scheduledAt: values.scheduledAt as string | undefined,
        reportRef: values.reportRef as string | undefined,
      });
      toast.success('سُجِّل التفتيش');
      setInspOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const submitFind = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await findingMutations.create({
        severity: String(values.severity),
        titleAr: values.titleAr as string,
        description: values.description as string | undefined,
        legalReference: values.legalReference as string | undefined,
        dueDate: values.dueDate as string | undefined,
      });
      toast.success('سُجِّلت الملاحظة');
      setFindOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const submitCorrective = async (values: InstFormValues): Promise<string | void> => {
    if (!correctiveTarget) return;
    setBusy(true);
    try {
      await findingMutations.addCorrective({
        findingId: correctiveTarget.id,
        input: {
          planText: values.planText as string,
          ownerPersonId: values.ownerPersonId as string | undefined,
          targetDate: values.targetDate as string | undefined,
        },
      });
      toast.success('أُضيفت خطة المعالجة');
      setCorrectiveTarget(null);
    } catch (err) {
      return serverError(err, 'تعذَّرت الإضافة.');
    } finally {
      setBusy(false);
    }
  };

  const advanceLic = async (l: OperationalLicense, next: string) => {
    setBusy(true);
    try {
      await licenseMutations.update({ id: l.id, input: { status: next } });
      toast.success('حُدِّثت حالة الترخيص');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const advanceInsp = async (i: RegulatoryInspection, next: string, patch?: Record<string, unknown>) => {
    setBusy(true);
    try {
      await inspectionMutations.update({ id: i.id, input: { status: next, ...patch } });
      toast.success('حُدِّث التفتيش');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const advanceFinding = async (f: ComplianceFinding, next: string) => {
    setBusy(true);
    try {
      await findingMutations.update({ id: f.id, status: next });
      toast.success('حُدِّثت حالة الملاحظة');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const licColumns: Array<InstColumn<OperationalLicense>> = [
    { head: 'النوع', cell: (l) => LICENSE_KIND_LABELS[l.kind] },
    { head: 'الجهة', cell: (l) => l.authority?.nameAr ?? l.authorityId },
    { head: 'الرقم', cell: (l) => <span className="font-mono">{l.licenseNumber ?? '—'}</span> },
    { head: 'ينتهي', cell: (l) => (l.expiresAt ? formatDate(l.expiresAt) : '—') },
    { head: 'الحالة', cell: (l) => <EnumChip value={l.status} labels={LICENSE_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (l) => canManage ? (
        <span className="inst-actions">
          {(LIC_TRANSITIONS[l.status] ?? []).map((next) => (
            <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceLic(l, next)}>
              {LICENSE_STATUS_LABELS[next as keyof typeof LICENSE_STATUS_LABELS]}
            </button>
          ))}
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  const inspColumns: Array<InstColumn<RegulatoryInspection>> = [
    { head: 'النوع', cell: (i) => INSPECTION_KIND_LABELS[i.kind] },
    { head: 'الجهة', cell: (i) => i.authority?.nameAr ?? i.authorityId },
    { head: 'المخطط', cell: (i) => (i.scheduledAt ? formatDate(i.scheduledAt) : '—') },
    { head: 'أُجري', cell: (i) => (i.conductedAt ? formatDate(i.conductedAt) : '—') },
    { head: 'الحالة', cell: (i) => <EnumChip value={i.status} labels={INSPECTION_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (i) => canManage ? (
        <span className="inst-actions">
          {i.status === 'SCHEDULED' && (
            <>
              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceInsp(i, 'IN_PROGRESS')}>بدء</button>
              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceInsp(i, 'CANCELLED')}>إلغاء</button>
            </>
          )}
          {i.status === 'IN_PROGRESS' && (
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceInsp(i, 'COMPLETED', { conductedAt: new Date().toISOString().slice(0, 10) })}>إكمال</button>
          )}
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  const findColumns: Array<InstColumn<ComplianceFinding>> = [
    { head: 'الملاحظة', cell: (f) => <span className="inst-tree-name">{f.titleAr}</span> },
    { head: 'الخطورة', cell: (f) => <EnumChip value={f.severity} labels={FINDING_SEVERITY_LABELS} /> },
    { head: 'الاستحقاق', cell: (f) => (f.dueDate ? formatDate(f.dueDate) : '—') },
    { head: 'الحالة', cell: (f) => <EnumChip value={f.status} labels={FINDING_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (f) => canManage ? (
        <span className="inst-actions">
          {(FINDING_TRANSITIONS[f.status] ?? []).map((next) => (
            <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceFinding(f, next)}>
              {FINDING_STATUS_LABELS[next as keyof typeof FINDING_STATUS_LABELS]}
            </button>
          ))}
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setCorrectiveTarget(f)}>خطة معالجة</button>
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="التراخيص والتفتيش"
        eyebrow="مساحة العمل المؤسسية"
        description="التراخيص الفنية وأذون المزاولة وقرارات الإنشاء، وزيارات التفتيش الخارجية، والملاحظات بدرجات خطورتها، وخطط المعالجة بمسؤوليها ومواعيدها."
        meta={canManage ? (
          <span className="inst-actions">
            <button type="button" className="btn ghost sm" onClick={() => setInspOpen(true)}><Icon icon={Plus} size={14} /> تفتيش</button>
            <button type="button" className="btn ghost sm" onClick={() => setFindOpen(true)}><Icon icon={Plus} size={14} /> ملاحظة</button>
            <button type="button" className="btn primary sm" onClick={() => setLicOpen(true)}><Icon icon={Plus} size={14} /> ترخيص</button>
          </span>
        ) : null}
      />

      <InstSection title="١ · التراخيص وأذون المزاولة">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بنوع الترخيص"
            anyLabel="كل الأنواع"
            value={licKind}
            onChange={(v) => { setLicKind(v); setLicPage(1); }}
            options={Object.entries(LICENSE_KIND_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <InstSelect
            ariaLabel="تصفية بحالة الترخيص"
            anyLabel="كل الحالات"
            value={licStatus}
            onChange={(v) => { setLicStatus(v); setLicPage(1); }}
            options={Object.entries(LICENSE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        <InstPagedTable query={licensesQuery} columns={licColumns} rowKey={(l) => l.id} ariaLabel="سجل التراخيص" unit={LIC_UNIT} onPage={setLicPage} />
      </InstSection>

      <InstSection title="٢ · التفتيش الخارجي">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بحالة التفتيش"
            anyLabel="كل الحالات"
            value={inspStatus}
            onChange={(v) => { setInspStatus(v); setInspPage(1); }}
            options={Object.entries(INSPECTION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        <InstPagedTable query={inspectionsQuery} columns={inspColumns} rowKey={(i) => i.id} ariaLabel="سجل التفتيش" unit={INSP_UNIT} onPage={setInspPage} />
      </InstSection>

      <InstSection title="٣ · الملاحظات وخطط المعالجة">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بالخطورة"
            anyLabel="كل الدرجات"
            value={findSev}
            onChange={(v) => { setFindSev(v); setFindPage(1); }}
            options={Object.entries(FINDING_SEVERITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <InstSelect
            ariaLabel="تصفية بحالة الملاحظة"
            anyLabel="كل الحالات"
            value={findStatus}
            onChange={(v) => { setFindStatus(v); setFindPage(1); }}
            options={Object.entries(FINDING_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        <InstPagedTable
          query={findingsQuery}
          columns={findColumns}
          rowKey={(f) => f.id}
          ariaLabel="سجل الملاحظات"
          unit={FIND_UNIT}
          onPage={setFindPage}
        />
        {/* corrective plans render inside the findings rows' expandable
            body when the API returns them; the add-flow is the dialog */}
        {(findingsQuery.data?.data ?? []).filter((f) => (f.correctiveActions ?? []).length > 0).length > 0 && (
          <DetailList
            items={(findingsQuery.data?.data ?? [])
              .filter((f) => (f.correctiveActions ?? []).length > 0)
              .map((f) => ({
                label: `خطط معالجة: ${f.titleAr}`,
                value: (
                  <ul className="inst-minutes-body" style={{ margin: 0, paddingInlineStart: 'var(--sp-5)' }}>
                    {(f.correctiveActions ?? []).map((ca) => (
                      <li key={ca.id}>
                        {ca.planText} — <EnumChip value={ca.status} labels={CORRECTIVE_STATUS_LABELS} />
                        {ca.targetDate && <span className="inst-tree-kind"> (بحلول {formatDate(ca.targetDate)})</span>}
                      </li>
                    ))}
                  </ul>
                ),
              }))}
          />
        )}
      </InstSection>

      <InstFormDialog open={licOpen} title="تسجيل ترخيص/إذن" fields={licFields} submitLabel="تسجيل" busy={busy} onCancel={() => setLicOpen(false)} onSubmit={submitLic} />
      <InstFormDialog open={inspOpen} title="تسجيل تفتيش خارجي" fields={inspFields} submitLabel="تسجيل" busy={busy} onCancel={() => setInspOpen(false)} onSubmit={submitInsp} />
      <InstFormDialog open={findOpen} title="تسجيل ملاحظة" fields={findFields} submitLabel="تسجيل" busy={busy} onCancel={() => setFindOpen(false)} onSubmit={submitFind} />
      {correctiveTarget && (
        <InstFormDialog
          open
          title={`خطة معالجة: ${correctiveTarget.titleAr}`}
          fields={correctiveFields}
          submitLabel="إضافة الخطة"
          busy={busy}
          onCancel={() => setCorrectiveTarget(null)}
          onSubmit={submitCorrective}
        />
      )}
    </PageFrame>
  );
}
