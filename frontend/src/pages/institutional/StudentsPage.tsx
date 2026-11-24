/**
 * r352 §G (learners) — students & trainees: program enrollments (the
 * CANDIDATE→ACTIVE→…→GRADUATED lifecycle) + the statutory
 * credentials (award/revoke, rendered from the credential-type
 * catalog — never a hardcoded list) + training placements live in
 * their own section (التدريب العملي).
 *
 * r352 hardening §5: the learner register is the GENERALIZED domain
 * (GET /academic/learners — STUDENT + TRAINEE, account optional, no
 * Faculty/Department required); the enrollment/award pickers source
 * from it and submit learnerProfileId. The legacy /admin/students
 * platform-profiles surface is NOT this register.
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
  useCredentialTypes, useCredentials, useEnrollments, useLearners, useMyCapabilities,
  useOrgUnitTree, usePrograms, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  CREDENTIAL_STATUS_LABELS, ENROLLMENT_STATUS_LABELS, LEARNER_CATEGORY_LABELS,
  LEARNER_STATUS_LABELS, ORG_UNIT_TYPE_LABELS,
} from '../../lib/institutional/labels';
import type { AwardedCredential, LearnerProfileRow, ProgramEnrollment } from '../../lib/institutional/types';
import { flattenUnits } from '../../lib/institutional/orgUnitOptions';

/** Enrollment transitions (contract §7 — server-enforced). */
const ENROLLMENT_TRANSITIONS: Record<string, string[]> = {
  CANDIDATE: ['ACTIVE', 'WITHDRAWN'],
  ACTIVE: ['ON_LEAVE', 'WITHDRAWN', 'SUSPENDED', 'COMPLETED', 'GRADUATED'],
  ON_LEAVE: ['ACTIVE', 'WITHDRAWN'],
  SUSPENDED: ['ACTIVE', 'WITHDRAWN'],
  WITHDRAWN: [],
  COMPLETED: ['GRADUATED'],
  GRADUATED: [],
};

const LEARNER_UNIT: [string, string, string, string] = ['متعلم واحد', 'متعلمان', 'متعلمون', 'متعلم'];
const ENROLL_UNIT: [string, string, string, string] = ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيل'];
const CRED_UNIT: [string, string, string, string] = ['شهادة واحدة', 'شهادتان', 'شهادات', 'شهادة'];



export function InstitutionStudentsPage() {
  const caps = useMyCapabilities();
  const canManagePrograms = caps.data?.has('PROGRAMS_MANAGE') ?? false;
  const canManageCredentials = caps.data?.has('CREDENTIALS_MANAGE') ?? false;
  // Learner-register writes (intake) are PEOPLE_MANAGE per contract §7.
  const canManagePeople = caps.data?.has('PEOPLE_MANAGE') ?? false;

  const [tab, setTab] = useState<'register' | 'enrollments' | 'credentials'>('enrollments');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const enrollmentsQuery = useEnrollments({ status: tab === 'enrollments' ? status || undefined : undefined, page, limit: 20 });
  const credentialsQuery = useCredentials({ page: 1, limit: 20 });
  const programsQuery = usePrograms({ limit: 100 });
  const credentialTypesQuery = useCredentialTypes();

  const enrollmentMutations = useInstActions(['enrollments'], {
    create: (i: Parameters<typeof instApi.createEnrollment>[0]) => instApi.createEnrollment(i),
    setStatus: (i: { id: string; status: string; completionAt?: string }) =>
      instApi.setEnrollmentStatus(i.id, i.status, i.completionAt),
  });
  const credentialMutations = useInstActions(['credentials'], {
    award: (i: Parameters<typeof instApi.awardCredential>[0]) => instApi.awardCredential(i),
    revoke: (i: { id: string; notes?: string }) => instApi.revokeCredential(i.id, i.notes),
  });

  // The generalized learner register (the pickers' source of truth).
  const learnersQuery = useLearners({ page: 1, limit: 100, status: 'ACTIVE' });
  const learnerOptions = (learnersQuery.data?.data ?? []).map((l) => ({
    value: l.id,
    label: `${l.fullNameAr} — ${LEARNER_CATEGORY_LABELS[l.category]} (${l.learnerNumber})`,
  }));

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const treeQuery = useOrgUnitTree();
  const learnerMutations = useInstActions(['learners'], {
    create: (i: Parameters<typeof instApi.createLearner>[0]) => instApi.createLearner(i),
  });

  const intakeFields: InstField[] = [
    {
      kind: 'select', name: 'category', label: 'الصنف', required: true,
      options: [
        { value: 'STUDENT', label: LEARNER_CATEGORY_LABELS.STUDENT },
        { value: 'TRAINEE', label: LEARNER_CATEGORY_LABELS.TRAINEE },
      ],
      hint: 'قانون 21/2023 م2 — طالب (برامج دراسية) أو متدرب (تكوين/تدريب مهني).',
    },
    { kind: 'text', name: 'learnerNumber', label: 'الرقم الأكاديمي', required: true, maxLength: 64, hint: 'فريد داخل المؤسسة.' },
    { kind: 'text', name: 'fullNameAr', label: 'الاسم الكامل (بالعربية)', required: true, maxLength: 200 },
    { kind: 'text', name: 'fullNameEn', label: 'الاسم بالإنجليزية', maxLength: 200 },
    { kind: 'text', name: 'nationalId', label: 'الرقم الوطني', maxLength: 64, hint: 'يربط السجل عبر المؤسسات (نمط السجل الوطني).' },
    { kind: 'text', name: 'email', label: 'البريد (اختياري)', maxLength: 200 },
    { kind: 'text', name: 'phone', label: 'الهاتف (اختياري)', maxLength: 40 },
    {
      kind: 'select', name: 'orgUnitId', label: 'الوحدة (اختياري)',
      options: (treeQuery.data ? flattenUnits(treeQuery.data) : []).map((u) => ({
        value: u.id, label: `${ORG_UNIT_TYPE_LABELS[u.type]} — ${u.nameAr}`,
      })),
    },
  ];

  const submitIntake = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await learnerMutations.create({
        category: values.category as 'STUDENT' | 'TRAINEE',
        learnerNumber: values.learnerNumber as string,
        fullNameAr: values.fullNameAr as string,
        fullNameEn: values.fullNameEn as string | undefined,
        nationalId: values.nationalId as string | undefined,
        email: values.email as string | undefined,
        phone: values.phone as string | undefined,
        orgUnitId: values.orgUnitId as string | undefined,
      });
      toast.success('أُضيف المتعلم إلى السجل العام');
      setIntakeOpen(false);
    } catch (err) {
      return serverError(err, 'تعذّر تسجيل المتعلم.');
    } finally {
      setBusy(false);
    }
  };

  const programOptions = (programsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.nameAr}` }));
  const credentialOptions = (credentialTypesQuery.data ?? []).map((c) => ({ value: c.code, label: c.nameAr }));

  const enrollFields: InstField[] = [
    {
      kind: 'select', name: 'learnerProfileId', label: 'الطالب/المتدرب', required: true,
      options: learnerOptions,
      hint: 'سجل المتعلمين العام (طلاب ومتدربون) — الحساب اختياري والمتدرب بلا كليات/أقسام.',
    },
    { kind: 'select', name: 'programId', label: 'البرنامج', required: true, options: programOptions },
    { kind: 'date', name: 'expectedCompletionAt', label: 'الإنجاز المتوقع' },
  ];

  const awardFields: InstField[] = [
    {
      kind: 'select', name: 'learnerProfileId', label: 'الطالب/المتدرب', required: true,
      options: learnerOptions,
    },
    {
      kind: 'select', name: 'credentialTypeCode', label: 'نوع الشهادة', required: true,
      options: credentialOptions,
      hint: 'الأنواع القانونية من دليل الخدمة (قانون 21/2023 م5 وقانون 9/2026).',
    },
    { kind: 'select', name: 'programId', label: 'البرنامج', options: programOptions },
    { kind: 'text', name: 'decisionNumber', label: 'رقم قرار المنح', maxLength: 80 },
    { kind: 'date', name: 'decisionDate', label: 'تاريخ القرار' },
    { kind: 'date', name: 'conferredAt', label: 'تاريخ المنح' },
    { kind: 'text', name: 'serialNumber', label: 'الرقم التسلسلي', maxLength: 60, hint: 'إن وُجد يجب أن يكون فريدًا.' },
  ];

  const submitEnroll = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await enrollmentMutations.create({
        learnerProfileId: values.learnerProfileId as string,
        programId: values.programId as string,
        expectedCompletionAt: values.expectedCompletionAt as string | undefined,
      });
      toast.success('سُجِّل الالتحاق بالبرنامج (مرشح)');
      setEnrollOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل (تأكد أن الملف من ملفات مؤسستك).');
    } finally {
      setBusy(false);
    }
  };

  const submitAward = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await credentialMutations.award({
        learnerProfileId: values.learnerProfileId as string,
        credentialTypeCode: values.credentialTypeCode as string,
        programId: values.programId as string | undefined,
        decisionNumber: values.decisionNumber as string | undefined,
        decisionDate: values.decisionDate as string | undefined,
        conferredAt: values.conferredAt as string | undefined,
        serialNumber: values.serialNumber as string | undefined,
      });
      toast.success('مُنحت الشهادة');
      setAwardOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر منح الشهادة.');
    } finally {
      setBusy(false);
    }
  };

  const advanceEnrollment = async (e: ProgramEnrollment, next: string) => {
    setBusy(true);
    try {
      await enrollmentMutations.setStatus({
        id: e.id,
        status: next,
        completionAt: next === 'COMPLETED' || next === 'GRADUATED'
          ? new Date().toISOString().slice(0, 10)
          : undefined,
      });
      toast.success('حُدِّثت حالة الالتحاق');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  const revokeCredential = async (c: AwardedCredential) => {
    setBusy(true);
    try {
      await credentialMutations.revoke({ id: c.id });
      toast.success('سُحبت الشهادة');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر السحب.'));
    } finally {
      setBusy(false);
    }
  };

  const learnerColumns: Array<InstColumn<LearnerProfileRow>> = [
    { head: 'الاسم', cell: (l) => <span className="inst-tree-name">{l.fullNameAr}</span> },
    { head: 'الصنف', cell: (l) => <EnumChip value={l.category} labels={LEARNER_CATEGORY_LABELS} /> },
    { head: 'الرقم', cell: (l) => <span className="font-mono">{l.learnerNumber}</span> },
    { head: 'الوحدة', mobileHidden: true, cell: (l) => l.orgUnit?.nameAr ?? '—' },
    { head: 'الحساب', mobileHidden: true, cell: (l) => (l.user ? l.user.email : <EnumChip value="NO_ACCOUNT" labels={{ NO_ACCOUNT: 'بلا حساب' }} />) },
    { head: 'الحالة', cell: (l) => <EnumChip value={l.status} labels={LEARNER_STATUS_LABELS} /> },
  ];

  const enrollmentColumns: Array<InstColumn<ProgramEnrollment>> = [
    {
      head: 'الطالب/المتدرب',
      cell: (e) => e.student ? `${e.student.firstName} ${e.student.lastName}` : e.studentProfileId,
    },
    { head: 'البرنامج', cell: (e) => e.program?.nameAr ?? e.programId },
    { head: 'منذ', cell: (e) => formatDate(e.entryDate) },
    { head: 'الحالة', cell: (e) => <EnumChip value={e.status} labels={ENROLLMENT_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (e) => canManagePrograms ? (
        <span className="inst-actions">
          {(ENROLLMENT_TRANSITIONS[e.status] ?? []).map((next) => (
            <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceEnrollment(e, next)}>
              {ENROLLMENT_STATUS_LABELS[next as keyof typeof ENROLLMENT_STATUS_LABELS]}
            </button>
          ))}
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  const credentialColumns: Array<InstColumn<AwardedCredential>> = [
    {
      head: 'الطالب/المتدرب',
      cell: (c) => c.student ? `${c.student.firstName} ${c.student.lastName}` : c.studentProfileId,
    },
    { head: 'الشهادة', cell: (c) => c.credentialType?.nameAr ?? c.credentialTypeId },
    { head: 'الرقم التسلسلي', cell: (c) => <span className="font-mono">{c.serialNumber ?? '—'}</span> },
    { head: 'تاريخ المنح', cell: (c) => (c.conferredAt ? formatDate(c.conferredAt) : '—') },
    { head: 'الحالة', cell: (c) => <EnumChip value={c.status} labels={CREDENTIAL_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (c) => canManageCredentials && c.status === 'AWARDED' ? (
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => revokeCredential(c)}>سحب</button>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="الطلاب والمتدربون"
        eyebrow="مساحة العمل المؤسسية"
        description="التسجيل في البرامج ودورة التقدم (مرشح ← نشط ← مكتمل ← متخرج)، والشهادات القانونية (منحًا وسحبًا) — الطالب وفق قانون 21/2023 غير المتدرب، والملفات من ملفات منصتك القائمة."
        meta={canManagePrograms || canManageCredentials || canManagePeople ? (
          <span className="inst-actions">
            {canManagePrograms && (
              <button type="button" className="btn ghost sm" onClick={() => setEnrollOpen(true)}>
                <Icon icon={Plus} size={14} /> تسجيل بالبرنامج
              </button>
            )}
            {canManageCredentials && (
              <button type="button" className="btn primary sm" onClick={() => setAwardOpen(true)}>
                <Icon icon={Plus} size={14} /> منح شهادة
              </button>
            )}
            {canManagePeople && (
              <button type="button" className="btn ghost sm" onClick={() => setIntakeOpen(true)}>
                <Icon icon={Plus} size={14} /> متعلم جديد
              </button>
            )}
          </span>
        ) : null}
      />

      {/* R359 final · W3 — the learner facts ride the KPI band. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'LEARNERS',
            label: 'المتعلمون النشطون (الاستعلام الحالي)',
            value: learnersQuery.data?.meta.total ?? 0,
            empty: learnersQuery.data == null,
          },
          {
            index: '02',
            caption: 'ENROLLMENTS',
            label: 'تسجيلات البرامج (الاستعلام الحالي)',
            value: enrollmentsQuery.data?.meta.total ?? 0,
            empty: enrollmentsQuery.data == null,
          },
          {
            index: '03',
            caption: 'CREDENTIALS',
            label: 'الشهادات الممنوحة (الاستعلام الحالي)',
            value: credentialsQuery.data?.meta.total ?? 0,
            empty: credentialsQuery.data == null,
          },
        ]}
      />

      <div className="inst-tabs" role="tablist" aria-label="أقسام الطلاب والمتعلمين">
        <button type="button" role="tab" aria-selected={tab === 'register'} className="inst-tab" onClick={() => setTab('register')}>
          السجل العام للمتعلمين
        </button>
                <button type="button" role="tab" aria-selected={tab === 'enrollments'} className="inst-tab" onClick={() => { setTab('enrollments'); setPage(1); }}>
          التسجيل بالبرامج
        </button>
        <button type="button" role="tab" aria-selected={tab === 'credentials'} className="inst-tab" onClick={() => setTab('credentials')}>
          الشهادات الممنوحة
        </button>
      </div>

      {tab === 'register' ? (
        <InstSection index="01" caption="LEARNER REGISTER" title="السجل العام للمتعلمين" pad="none">
        <InstPagedTable
          query={learnersQuery}
          columns={learnerColumns}
          rowKey={(l) => l.id}
          ariaLabel="سجل المتعلمين العام"
          unit={LEARNER_UNIT}
          onPage={() => undefined}
          empty={null}
        />
        </InstSection>
      ) : tab === 'enrollments' ? (
        <>
          <InstFilters>
            <InstSelect
              ariaLabel="تصفية بحالة التسجيل"
              anyLabel="كل الحالات"
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </InstFilters>
          <InstSection index="01" caption="PROGRAM ENROLLMENTS" title="التسجيل بالبرامج" pad="none">
          <InstPagedTable
            query={enrollmentsQuery}
            columns={enrollmentColumns}
            rowKey={(e) => e.id}
            ariaLabel="تسجيلات البرامج"
            unit={ENROLL_UNIT}
            onPage={setPage}
          />
          </InstSection>
        </>
      ) : (
        <>
          {/* credential-type catalog: rendered from the API only */}
          <InstSection
            index="01"
            caption="CREDENTIAL TYPES"
            title="أنواع الشهادات القانونية"
            description="كما يعيدها دليل الخدمة — شهادة التدريب المهني، شهادة التكوين الأساسي، الدبلوم الفني المتوسط، الدبلوم المهني التخصصي، الدبلوم التقني العالي، البكالوريوس التقني، الإجازة العالية (الماجستير)، الإجازة الدقيقة (الدكتوراه) — وأي أنواع أخرى معتمدة."
          >
            <InstStates
              isLoading={credentialTypesQuery.isLoading}
              error={credentialTypesQuery.error}
              isEmpty={(credentialTypesQuery.data ?? []).length === 0}
            >
              <DetailList
                items={(credentialTypesQuery.data ?? []).map((c) => ({
                  label: c.nameAr,
                  value: (
                    <span className="inst-actions">
                      <span className="inst-tree-kind">مستوى {c.level}</span>
                      {c.grantsProgression
                        ? <EnumChip value="ACTIVE" labels={{ ACTIVE: 'تؤهل لمواصلة الدراسة' }} />
                        : <EnumChip value="CLOSED" labels={{ CLOSED: 'لا تسمح بمواصلة الدراسة' }} />}
                      {c.legalBasis && <span className="inst-tree-kind">{c.legalBasis}</span>}
                    </span>
                  ),
                }))}
              />
            </InstStates>
          </InstSection>
          <InstSection index="02" caption="CREDENTIALS LEDGER" title="الشهادات الممنوحة" pad="none">
          <InstPagedTable
            query={credentialsQuery}
            columns={credentialColumns}
            rowKey={(c) => c.id}
            ariaLabel="الشهادات الممنوحة"
            unit={CRED_UNIT}
            onPage={() => undefined}
          />
          </InstSection>
        </>
      )}

      <InstFormDialog open={enrollOpen} title="تسجيل طالب/متدرب في برنامج" fields={enrollFields} submitLabel="تسجيل" busy={busy} onCancel={() => setEnrollOpen(false)} onSubmit={submitEnroll} />
      <InstFormDialog open={awardOpen} title="منح شهادة" fields={awardFields} submitLabel="منح" busy={busy} wide onCancel={() => setAwardOpen(false)} onSubmit={submitAward} />
      <InstFormDialog open={intakeOpen} title="متعلم جديد (سجل عام)" description="التسجيل في السجل العام — الحساب اختياري (متدرب بلا حساب منصة)، وبلا كليات/أقسام." fields={intakeFields} submitLabel="إضافة" busy={busy} wide onCancel={() => setIntakeOpen(false)} onSubmit={submitIntake} />
    </PageFrame>
  );
}
