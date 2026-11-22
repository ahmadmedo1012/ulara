/**
 * r352 §G — academic & technical/vocational programs: program catalog
 * + versions (approved study plans) + the version-course links (the
 * COURSES themselves stay in the existing courses surfaces — this
 * module only links them into plans, never duplicates them) + terms.
 * The formal education program is distinct from the platform's
 * self-paced TrainingTrack.
 */
import {
  useState, useNavigate, Plus, PageFrame,
  PageHeader, toast, formatDate, Icon,
  serverError, DetailList, EnumChip, InstFilters,
  InstFormDialog, InstPagedTable, InstSection, InstStates,
  InstSelect, type InstColumn, type InstField, type InstFormValues,
} from './scaffold';
import {
  useCredentialTypes, useMyCapabilities, usePrograms, useTerms, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { Program } from '../../lib/institutional/types';

const PROGRAM_UNIT: [string, string, string, string] = ['برنامج واحد', 'برنامجان', 'برامج', 'برنامج'];

export function InstitutionProgramsPage() {
  const navigate = useNavigate();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PROGRAMS_MANAGE') ?? false;

  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const programsQuery = usePrograms({ kind: kind || undefined, status: status || undefined, page, limit: 20 });
  const termsQuery = useTerms();
  const credentialTypesQuery = useCredentialTypes();
  const mutations = useInstActions(['programs'], {
    create: (i: Parameters<typeof instApi.createProgram>[0]) => instApi.createProgram(i),
    createTerm: (i: Parameters<typeof instApi.createTerm>[0]) => instApi.createTerm(i),
  });

  const [programOpen, setProgramOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const programFields: InstField[] = [
    { kind: 'text', name: 'code', label: 'رمز البرنامج', required: true, maxLength: 40 },
    { kind: 'text', name: 'nameAr', label: 'اسم البرنامج', required: true, maxLength: 160 },
    {
      kind: 'select', name: 'kind', label: 'طبيعة البرنامج', required: true,
      options: Object.entries(PROGRAM_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      kind: 'select', name: 'credentialTypeCode', label: 'الشهادة الممنوحة',
      options: (credentialTypesQuery.data ?? []).map((c) => ({ value: c.code, label: c.nameAr })),
      hint: 'أنواع الشهادات تعرضها كما يعيدها دليل الخدمة — لا قائمة محلية.',
    },
    { kind: 'number', name: 'durationMonths', label: 'المدة (بالأشهر)', min: 1, max: 96 },
    { kind: 'number', name: 'totalCreditHours', label: 'إجمالي الساعات المعتمدة', min: 0, max: 999 },
    { kind: 'text', name: 'approvalRef', label: 'مرجع الاعتماد', maxLength: 120 },
  ];

  const termFields: InstField[] = [
    { kind: 'text', name: 'code', label: 'رمز الفصل (مثال 2027-SPRING)', required: true, maxLength: 40 },
    { kind: 'date', name: 'startsAt', label: 'تاريخ البداية', required: true },
    { kind: 'date', name: 'endsAt', label: 'تاريخ النهاية' },
    { kind: 'checkbox', name: 'isCurrent', label: 'الفصل الحالي' },
  ];

  const submitProgram = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      const created = await mutations.create({
        code: values.code as string,
        nameAr: values.nameAr as string,
        kind: values.kind as never,
        credentialTypeCode: values.credentialTypeCode as string | undefined,
        durationMonths: values.durationMonths as number | undefined,
        totalCreditHours: values.totalCreditHours as number | undefined,
        approvalRef: values.approvalRef as string | undefined,
      });
      toast.success('أُنشئ البرنامج');
      setProgramOpen(false);
      navigate(`/institution/programs/${created.id}`);
    } catch (err) {
      return serverError(err, 'تعذَّر إنشاء البرنامج.');
    } finally {
      setBusy(false);
    }
  };

  const submitTerm = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.createTerm({
        code: values.code as string,
        startsAt: values.startsAt as string,
        endsAt: values.endsAt as string | undefined,
        isCurrent: Boolean(values.isCurrent),
      });
      toast.success('أُنشئ الفصل الدراسي');
      setTermOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إنشاء الفصل.');
    } finally {
      setBusy(false);
    }
  };

  const columns: Array<InstColumn<Program>> = [
    { head: 'البرنامج', cell: (p) => <span className="inst-tree-name">{p.nameAr}</span> },
    { head: 'الرمز', cell: (p) => <span className="font-mono">{p.code}</span> },
    { head: 'الطبيعة', cell: (p) => <span className="inst-tree-kind">{PROGRAM_KIND_LABELS[p.kind]}</span> },
    { head: 'الحالة', cell: (p) => <EnumChip value={p.status} labels={PROGRAM_STATUS_LABELS} /> },
    { head: 'المدة', mobileHidden: true, cell: (p) => (p.durationMonths ? `${p.durationMonths} شهر` : '—') },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="البرامج والخطط الدراسية"
        eyebrow="مساحة العمل المؤسسية"
        description="البرامج الأكاديمية والتقنية والمهنية، وإصدارات الخطط الدراسية المعتمدة، والفصول الدراسية — المقررات تُدار في مقررات المنصة وترتبط بالخطة هنا."
        meta={canManage ? (
          <span className="inst-actions">
            <button type="button" className="btn ghost sm" onClick={() => setTermOpen(true)}>فصل دراسي</button>
            <button type="button" className="btn primary sm" onClick={() => setProgramOpen(true)}>
              <Icon icon={Plus} size={14} /> برنامج جديد
            </button>
          </span>
        ) : null}
      />

      <InstFilters>
        <InstSelect
          ariaLabel="تصفية بالطبيعة"
          anyLabel="كل الطبائع"
          value={kind}
          onChange={(v) => { setKind(v); setPage(1); }}
          options={Object.entries(PROGRAM_KIND_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <InstSelect
          ariaLabel="تصفية بالحالة"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      <InstPagedTable
        query={programsQuery}
        columns={columns}
        rowKey={(p) => p.id}
        ariaLabel="قائمة البرامج"
        unit={PROGRAM_UNIT}
        onPage={setPage}
        onRowClick={(p) => navigate(`/institution/programs/${p.id}`)}
      />

      <InstSection
        title="الفصول الدراسية"
        description="الأعوام/الفصول الدراسية المعتمدة للبرامج."
        actions={canManage ? (
          <button type="button" className="btn ghost sm" onClick={() => setTermOpen(true)}>إضافة فصل</button>
        ) : null}
      >
        <InstStates
          isLoading={termsQuery.isLoading}
          error={termsQuery.error}
          isEmpty={(termsQuery.data ?? []).length === 0}
        >
          <DetailList
            items={(termsQuery.data ?? []).map((t) => ({
              label: t.code,
              value: (
                <span className="inst-actions">
                  {t.isCurrent && <EnumChip value="ACTIVE" labels={{ ACTIVE: 'الحالي' }} />}
                  <span className="inst-tree-kind">من {formatDate(t.startsAt)}</span>
                </span>
              ),
            }))}
          />
        </InstStates>
      </InstSection>

      <InstFormDialog open={programOpen} title="برنامج جديد" fields={programFields} submitLabel="إنشاء" busy={busy} onCancel={() => setProgramOpen(false)} onSubmit={submitProgram} />
      <InstFormDialog open={termOpen} title="فصل دراسي جديد" fields={termFields} submitLabel="إنشاء" busy={busy} onCancel={() => setTermOpen(false)} onSubmit={submitTerm} />
    </PageFrame>
  );
}
