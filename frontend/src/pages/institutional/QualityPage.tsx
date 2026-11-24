/**
 * r352 §I — quality & accreditation: the compliance workspace's
 * internal-vs-external split. This section owns:
 *  · التقييم الذاتي الداخلي (InternalSelfAssessment — the QA
 *    office's own workflow, capability QUALITY_INTERNAL_MANAGE which
 *    NOBODY holds by default) — clearly separated from
 *  · الاعتماد الخارجي (ExternalAccreditation — the National
 *    Center's institutional/program decisions, ACCREDITATION_MANAGE),
 *  · معايير الاعتماد (criteria sets from the catalog),
 *  · الأدلة والمستندات (evidence, owner-typed).
 * Never one isAccredited traffic light.
 */
import {
  useState, Plus, PageFrame, PageHeader,
  toast, formatDate, Icon, serverError,
  DetailList, EnumChip, InstFilters, InstFormDialog,
  InstPagedTable, InstSection, InstStates, InstSelect,
  type InstColumn, type InstField, type InstFormValues,
} from './scaffold';
import { KpiBand } from '../../components/patterns';
import {
  useAccreditations, useAuthorities, useCriteriaSets,
  useEvidence, useMyCapabilities, useOrgUnitTree,
  useSelfAssessments, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  ACCREDITATION_SCOPE_LABELS, ACCREDITATION_STATUS_LABELS, ACCREDITATION_TYPE_LABELS,
  EVIDENCE_OWNER_LABELS, SELF_ASSESSMENT_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { ExternalAccreditation, InternalSelfAssessment } from '../../lib/institutional/types';
import { flattenUnits } from '../../lib/institutional/orgUnitOptions';

const SA_UNIT: [string, string, string, string] = ['تقييم واحد', 'تقييمان', 'تقييمات', 'تقييم'];
const ACC_UNIT: [string, string, string, string] = ['اعتماد واحد', 'اعتمادان', 'اعتمادات', 'اعتماد'];

/** Accreditation status transitions (contract §9). */
const ACC_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_REVIEW'],
  IN_REVIEW: ['GRANTED', 'CONDITIONAL', 'REJECTED', 'WITHDRAWN'],
  GRANTED: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN'],
  CONDITIONAL: ['GRANTED', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  RENEWED: ['SUSPENDED', 'REVOKED', 'EXPIRED'],
  SUSPENDED: ['GRANTED', 'REVOKED', 'EXPIRED'],
  REVOKED: [], EXPIRED: [], REJECTED: [], WITHDRAWN: [],
};

/** Self-assessment transitions (contract §9). */
const SA_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function InstitutionQualityPage() {
  const caps = useMyCapabilities();
  const canExternal = caps.data?.has('ACCREDITATION_MANAGE') ?? false;
  const canInternal = caps.data?.has('QUALITY_INTERNAL_MANAGE') ?? false;

  const [saStatus, setSaStatus] = useState('');
  const [accStatus, setAccStatus] = useState('');
  const [accType, setAccType] = useState('');
  const [saPage, setSaPage] = useState(1);
  const [accPage, setAccPage] = useState(1);

  const selfAssessmentsQuery = useSelfAssessments({ status: saStatus || undefined, page: saPage, limit: 10 });
  const accreditationsQuery = useAccreditations({
    status: accStatus || undefined, type: accType || undefined, page: accPage, limit: 10,
  });
  const criteriaSetsQuery = useCriteriaSets();
  const authoritiesQuery = useAuthorities();
  const treeQuery = useOrgUnitTree();
  const evidenceQuery = useEvidence({ page: 1, limit: 10 });

  const selfAssessmentMutations = useInstActions(['self-assessments'], {
    create: (i: Parameters<typeof instApi.createSelfAssessment>[0]) => instApi.createSelfAssessment(i),
    update: (i: { id: string; input: Parameters<typeof instApi.updateSelfAssessment>[1] }) =>
      instApi.updateSelfAssessment(i.id, i.input),
  });
  const accreditationMutations = useInstActions(['accreditations'], {
    create: (i: Parameters<typeof instApi.createAccreditation>[0]) => instApi.createAccreditation(i),
    update: (i: { id: string; input: Parameters<typeof instApi.updateAccreditation>[1] }) =>
      instApi.updateAccreditation(i.id, i.input),
  });
  const evidenceMutations = useInstActions(['evidence'], {
    create: (i: Parameters<typeof instApi.createEvidence>[0]) => instApi.createEvidence(i),
  });

  const [saOpen, setSaOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const unitOptions = (treeQuery.data ? flattenUnits(treeQuery.data) : [])
    .map((u) => ({ value: u.id, label: u.nameAr }));
  const authorityOptions = (authoritiesQuery.data ?? []).map((a) => ({ value: a.code, label: a.nameAr }));
  const criteriaOptions = (criteriaSetsQuery.data ?? [])
    .filter((c) => c.appliesTo === 'INSTITUTIONAL' || c.appliesTo === 'PROGRAM')
    .map((c) => ({ value: c.id, label: `${c.nameAr} (v${c.version})` }));

  const saFields: InstField[] = [
    { kind: 'text', name: 'periodLabel', label: 'دورة التقييم', required: true, maxLength: 60, hint: 'مثال: 2026/2027.' },
    { kind: 'select', name: 'orgUnitId', label: 'الوحدة', options: unitOptions, placeholder: '— المؤسسة ككل —' },
    { kind: 'select', name: 'criteriaSetId', label: 'حزمة المعايير', options: criteriaOptions },
    { kind: 'textarea', name: 'summary', label: 'الملخص', rows: 3, maxLength: 1000 },
  ];

  const accFields: InstField[] = [
    {
      kind: 'select', name: 'type', label: 'نوع الاعتماد', required: true,
      options: [
        { value: 'INSTITUTIONAL', label: 'مؤسسي' },
        { value: 'PROGRAM', label: 'برامجي' },
      ],
    },
    { kind: 'select', name: 'authorityCode', label: 'الجهة المانحة', required: true, options: authorityOptions },
    {
      kind: 'select', name: 'scopeType', label: 'النطاق', required: true,
      options: Object.entries(ACCREDITATION_SCOPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'select', name: 'orgUnitId', label: 'الوحدة (إن كان النطاق وحدة)', options: unitOptions },
    { kind: 'text', name: 'decisionNumber', label: 'رقم القرار', maxLength: 80 },
    { kind: 'date', name: 'decisionDate', label: 'تاريخ القرار' },
    { kind: 'date', name: 'effectiveFrom', label: 'ساري من' },
    { kind: 'date', name: 'effectiveTo', label: 'ساري حتى' },
    { kind: 'select', name: 'criteriaSetId', label: 'حزمة المعايير', options: criteriaOptions },
    { kind: 'text', name: 'reportRef', label: 'مرجع التقرير', maxLength: 120 },
  ];

  const evidenceFields: InstField[] = [
    {
      kind: 'select', name: 'ownerType', label: 'يعود إلى', required: true,
      options: (Object.entries(EVIDENCE_OWNER_LABELS) as Array<[string, string]>)
        .map(([value, label]) => ({ value, label })),
    },
    { kind: 'text', name: 'ownerId', label: 'معرّف السجل المالك', required: true, maxLength: 40 },
    { kind: 'text', name: 'titleAr', label: 'عنوان المستند', required: true, maxLength: 160 },
    { kind: 'text', name: 'documentRef', label: 'مرجع المستند', maxLength: 120 },
    { kind: 'text', name: 'fileUrl', label: 'رابط الملف', maxLength: 300 },
    { kind: 'textarea', name: 'description', label: 'الوصف', rows: 2, maxLength: 500 },
  ];

  const submitSa = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await selfAssessmentMutations.create({
        periodLabel: values.periodLabel as string,
        orgUnitId: values.orgUnitId as string | undefined,
        criteriaSetId: values.criteriaSetId as string | undefined,
        summary: values.summary as string | undefined,
      });
      toast.success('أُنشئ التقييم الذاتي (مسودة)');
      setSaOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر الإنشاء.');
    } finally {
      setBusy(false);
    }
  };

  const submitAcc = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await accreditationMutations.create({
        type: String(values.type),
        authorityCode: String(values.authorityCode),
        scopeType: String(values.scopeType),
        orgUnitId: values.orgUnitId as string | undefined,
        decisionNumber: values.decisionNumber as string | undefined,
        decisionDate: values.decisionDate as string | undefined,
        effectiveFrom: values.effectiveFrom as string | undefined,
        effectiveTo: values.effectiveTo as string | undefined,
        criteriaSetId: values.criteriaSetId as string | undefined,
        reportRef: values.reportRef as string | undefined,
      });
      toast.success('سُجِّل طلب/قرار الاعتماد');
      setAccOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const submitEvidence = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await evidenceMutations.create({
        ownerType: String(values.ownerType),
        ownerId: String(values.ownerId),
        titleAr: values.titleAr as string,
        documentRef: values.documentRef as string | undefined,
        fileUrl: values.fileUrl as string | undefined,
        description: values.description as string | undefined,
      });
      toast.success('أُضيف المستند/الدليل');
      setEvidenceOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر الإضافة (تأكد أن السجل المالك من سجلات مؤسستك).');
    } finally {
      setBusy(false);
    }
  };

  const advanceSa = async (sa: InternalSelfAssessment, next: string) => {
    setBusy(true);
    try {
      await selfAssessmentMutations.update({ id: sa.id, input: { status: next } });
      toast.success('حُدِّثت حالة التقييم الذاتي');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const advanceAcc = async (acc: ExternalAccreditation, next: string) => {
    setBusy(true);
    try {
      await accreditationMutations.update({ id: acc.id, input: { status: next as never } });
      toast.success('حُدِّثت حالة الاعتماد');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const saColumns: Array<InstColumn<InternalSelfAssessment>> = [
    { head: 'الدورة', cell: (s) => s.periodLabel },
    { head: 'الوحدة', cell: (s) => s.orgUnit?.nameAr ?? 'المؤسسة ككل' },
    { head: 'حزمة المعايير', cell: (s) => s.criteriaSet?.nameAr ?? '—' },
    { head: 'الحالة', cell: (s) => <EnumChip value={s.status} labels={SELF_ASSESSMENT_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (s) => canInternal ? (
        <span className="inst-actions">
          {(SA_TRANSITIONS[s.status] ?? []).map((next) => (
            <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceSa(s, next)}>
              {SELF_ASSESSMENT_STATUS_LABELS[next as keyof typeof SELF_ASSESSMENT_STATUS_LABELS]}
            </button>
          ))}
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  const accColumns: Array<InstColumn<ExternalAccreditation>> = [
    { head: 'النوع', cell: (a) => ACCREDITATION_TYPE_LABELS[a.type] },
    { head: 'الجهة', cell: (a) => a.authority?.nameAr ?? a.authorityId },
    { head: 'النطاق', cell: (a) => ACCREDITATION_SCOPE_LABELS[a.scopeType] },
    { head: 'ساري حتى', cell: (a) => (a.effectiveTo ? formatDate(a.effectiveTo) : '—') },
    { head: 'الحالة', cell: (a) => <EnumChip value={a.status} labels={ACCREDITATION_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (a) => canExternal ? (
        <span className="inst-actions">
          {(ACC_TRANSITIONS[a.status] ?? []).map((next) => (
            <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceAcc(a, next)}>
              {ACCREDITATION_STATUS_LABELS[next as keyof typeof ACCREDITATION_STATUS_LABELS]}
            </button>
          ))}
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="الجودة والاعتماد"
        eyebrow="مساحة العمل المؤسسية"
        description="ضمان الجودة الداخلي والتقييم الذاتي لمكتب جودة مؤسستك — منفصلان عن اعتماد الجهات الخارجية (المركز الوطني لضمان الجودة) وحزمة معاييره المعتمدة."
        meta={
          <span className="inst-actions">
            {canInternal && (
              <button type="button" className="btn primary sm" onClick={() => setSaOpen(true)}>
                <Icon icon={Plus} size={14} /> تقييم ذاتي
              </button>
            )}
            {canExternal && (
              <button type="button" className="btn ghost sm" onClick={() => setAccOpen(true)}>
                <Icon icon={Plus} size={14} /> سجل اعتماد
              </button>
            )}
          </span>
        }
      />

      {/* R359 final · W3 — the quality facts ride the KPI band. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'SELF-ASSESSMENTS',
            label: 'التقييمات الذاتية (الاستعلام الحالي)',
            value: selfAssessmentsQuery.data?.meta.total ?? 0,
            empty: selfAssessmentsQuery.data == null,
          },
          {
            index: '02',
            caption: 'ACCREDITATIONS',
            label: 'سجلات الاعتماد الخارجي (الاستعلام الحالي)',
            value: accreditationsQuery.data?.meta.total ?? 0,
            empty: accreditationsQuery.data == null,
          },
          {
            index: '03',
            caption: 'CRITERIA SETS',
            label: 'حزم معايير الاعتماد في الدليل',
            value: criteriaSetsQuery.data?.length ?? 0,
            empty: criteriaSetsQuery.data == null,
          },
          {
            index: '04',
            caption: 'EVIDENCE',
            label: 'مستندات الأدلة (الاستعلام الحالي)',
            value: evidenceQuery.data?.meta.total ?? 0,
            empty: evidenceQuery.data == null,
          },
        ]}
      />

      <InstSection
        index="01"
        caption="SELF-ASSESSMENT"
        title="التقييم الذاتي الداخلي (مكتب ضمان الجودة)"
        description="دورة مكتب الجودة الداخلية: مسودة ← مُقدمة ← قيد المراجعة ← معتمدة ← مؤرشفة. الكتابة تتطلب منحًا صريحًا لقدرة «إدارة التقييم الذاتي الداخلي» — لا يملكها أحد افتراضيًا."
        pad="none"
      >
        {!canInternal && (
          <p className="inst-cap-note sg-pad-in">
            أنت تقرأ فقط — الكتابة في التقييم الذاتي تتطلب قدرة <b>QUALITY_INTERNAL_MANAGE</b> (منح صريح من إدارة المؤسسة).
          </p>
        )}
        <div className="sg-pad-in">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بحالة التقييم الذاتي"
            anyLabel="كل الحالات"
            value={saStatus}
            onChange={(v) => { setSaStatus(v); setSaPage(1); }}
            options={Object.entries(SELF_ASSESSMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        </div>
        <InstPagedTable
          query={selfAssessmentsQuery}
          columns={saColumns}
          rowKey={(s) => s.id}
          ariaLabel="سجل التقييم الذاتي"
          unit={SA_UNIT}
          onPage={setSaPage}
        />
      </InstSection>

      <InstSection
        index="02"
        caption="ACCREDITATION"
        title="الاعتماد الخارجي (مؤسسي وبرامجي)"
        description="قرارات الجهات الرقابية والمانحة: قيد التقديم ← مراجعة ← ممنوح/مشروط ← تجديد/إيقاف/إلغاء/انتهاء."
        pad="none"
      >
        <div className="sg-pad-in">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بنوع الاعتماد"
            anyLabel="كل الأنواع"
            value={accType}
            onChange={(v) => { setAccType(v); setAccPage(1); }}
            options={Object.entries(ACCREDITATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <InstSelect
            ariaLabel="تصفية بحالة الاعتماد"
            anyLabel="كل الحالات"
            value={accStatus}
            onChange={(v) => { setAccStatus(v); setAccPage(1); }}
            options={Object.entries(ACCREDITATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        </div>
        <InstPagedTable
          query={accreditationsQuery}
          columns={accColumns}
          rowKey={(a) => a.id}
          ariaLabel="سجل الاعتمادات"
          unit={ACC_UNIT}
          onPage={setAccPage}
        />
      </InstSection>

      <InstSection
        index="03"
        caption="CRITERIA SETS"
        title="حزم معايير الاعتماد"
        description="المعايير المعتمدة كما يعيدها الدليل (الجهة + الإصدار + المعايير الفرعية) — لا نصوص مخترعة."
      >
        <InstStates
          isLoading={criteriaSetsQuery.isLoading}
          error={criteriaSetsQuery.error}
          isEmpty={(criteriaSetsQuery.data ?? []).length === 0}
        >
          {(criteriaSetsQuery.data ?? []).map((set) => (
            <div key={set.id} className="inst-catalog-group">
              <h4 className="inst-catalog-group-title">{set.nameAr} — إصدار {set.version}</h4>
              <DetailList
                items={[
                  { label: 'ينطبق على', value: set.appliesTo === 'INSTITUTIONAL' ? 'المؤسسة' : 'البرامج' },
                  { label: 'نشط', value: set.isActive ? 'نعم' : 'لا' },
                  {
                    label: 'المعايير',
                    value: (
                      <ol className="inst-minutes-body" style={{ margin: 0, paddingInlineStart: 'var(--sp-5)' }}>
                        {set.items.map((it) => <li key={it.id}>{it.titleAr}</li>)}
                      </ol>
                    ),
                  },
                ]}
              />
            </div>
          ))}
        </InstStates>
      </InstSection>

      <InstSection
        index="04"
        caption="EVIDENCE"
        title="الأدلة والمستندات"
        description="مستندات مرتبطة بسجلات الجودة والاعتماد (بيانات وصفية + مراجع)."
        actions={canExternal || canInternal ? (
          <button type="button" className="btn ghost sm" onClick={() => setEvidenceOpen(true)}>
            <Icon icon={Plus} size={14} /> إضافة مستند
          </button>
        ) : null}
      >
        <InstStates
          isLoading={evidenceQuery.isLoading}
          error={evidenceQuery.error}
          isEmpty={(evidenceQuery.data?.data ?? []).length === 0}
        >
          <DetailList
            items={(evidenceQuery.data?.data ?? []).map((ev) => ({
              label: ev.titleAr,
              value: (
                <span className="inst-actions">
                  <EnumChip value="DRAFT" labels={{ DRAFT: EVIDENCE_OWNER_LABELS[ev.ownerType] ?? ev.ownerType }} />
                  {ev.documentRef && <span className="inst-tree-kind">مرجع {ev.documentRef}</span>}
                  <span className="inst-tree-kind">{formatDate(ev.createdAt)}</span>
                </span>
              ),
            }))}
          />
        </InstStates>
      </InstSection>

      <InstFormDialog open={saOpen} title="تقييم ذاتي جديد" fields={saFields} submitLabel="إنشاء" busy={busy} onCancel={() => setSaOpen(false)} onSubmit={submitSa} />
      <InstFormDialog open={accOpen} title="سجل اعتماد خارجي" fields={accFields} submitLabel="تسجيل" busy={busy} wide onCancel={() => setAccOpen(false)} onSubmit={submitAcc} />
      <InstFormDialog open={evidenceOpen} title="إضافة مستند/دليل" fields={evidenceFields} submitLabel="إضافة" busy={busy} onCancel={() => setEvidenceOpen(false)} onSubmit={submitEvidence} />
    </PageFrame>
  );
}
