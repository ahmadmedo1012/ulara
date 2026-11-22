/**
 * r352 §G (learners) — students & trainees: program enrollments (the
 * CANDIDATE→ACTIVE→…→GRADUATED lifecycle) + the statutory
 * credentials (award/revoke, rendered from the credential-type
 * catalog — never a hardcoded list) + training placements live in
 * their own section (التدريب العملي). Enrolled learner profiles are
 * the platform's student profiles (learnerCategory STUDENT|TRAINEE).
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { api, unwrap } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';

import { serverError,
  DetailList, EnumChip, InstFilters, InstFormDialog, InstPagedTable, InstSection,
  InstStates, InstSelect, type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useCredentialTypes, useCredentials, useEnrollments, useMyCapabilities, usePrograms, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  CREDENTIAL_STATUS_LABELS, ENROLLMENT_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { AwardedCredential, ProgramEnrollment } from '../../lib/institutional/types';

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

const ENROLL_UNIT: [string, string, string, string] = ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيل'];
const CRED_UNIT: [string, string, string, string] = ['شهادة واحدة', 'شهادتان', 'شهادات', 'شهادة'];

/** Minimal student-profile row (the platform's existing shape). */
interface LearnerOption { id: string; firstName: string; lastName: string }

export function InstitutionStudentsPage() {
  const caps = useMyCapabilities();
  const canManagePrograms = caps.data?.has('PROGRAMS_MANAGE') ?? false;
  const canManageCredentials = caps.data?.has('CREDENTIALS_MANAGE') ?? false;

  const [tab, setTab] = useState<'enrollments' | 'credentials'>('enrollments');
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

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [learners, setLearners] = useState<LearnerOption[]>([]);

  const programOptions = (programsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.nameAr}` }));
  const credentialOptions = (credentialTypesQuery.data ?? []).map((c) => ({ value: c.code, label: c.nameAr }));

  const loadLearners = async () => {
    try {
      // The platform's existing student-profiles listing (the enrollment
      // contract takes studentProfileId — the same profiles).
      const rows = await unwrap<LearnerOption[]>(
        api.get('/admin/students', { params: { limit: 100 } }),
      );
      setLearners(rows);
    } catch {
      setLearners([]);
    }
  };

  const enrollFields: InstField[] = [
    {
      kind: 'select', name: 'studentProfileId', label: 'الطالب/المتدرب', required: true,
      options: learners.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
      hint: 'ملفات الطلاب/Mتدربين القائمة في منصتك.',
    },
    { kind: 'select', name: 'programId', label: 'البرنامج', required: true, options: programOptions },
    { kind: 'date', name: 'expectedCompletionAt', label: 'الإنجاز المتوقع' },
  ];

  const awardFields: InstField[] = [
    {
      kind: 'select', name: 'studentProfileId', label: 'الطالب/المتدرب', required: true,
      options: learners.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
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
        studentProfileId: values.studentProfileId as string,
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
        studentProfileId: values.studentProfileId as string,
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
        meta={canManagePrograms || canManageCredentials ? (
          <span className="inst-actions">
            {canManagePrograms && (
              <button type="button" className="btn ghost sm" onClick={() => { void loadLearners(); setEnrollOpen(true); }}>
                <Icon icon={Plus} size={14} /> تسجيل بالبرنامج
              </button>
            )}
            {canManageCredentials && (
              <button type="button" className="btn primary sm" onClick={() => { void loadLearners(); setAwardOpen(true); }}>
                <Icon icon={Plus} size={14} /> منح شهادة
              </button>
            )}
          </span>
        ) : null}
      />

      <div className="inst-tabs" role="tablist" aria-label="أقسام الطلاب">
        <button type="button" role="tab" aria-selected={tab === 'enrollments'} className="inst-tab" onClick={() => { setTab('enrollments'); setPage(1); }}>
          التسجيل بالبرامج
        </button>
        <button type="button" role="tab" aria-selected={tab === 'credentials'} className="inst-tab" onClick={() => setTab('credentials')}>
          الشهادات الممنوحة
        </button>
      </div>

      {tab === 'enrollments' ? (
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
          <InstPagedTable
            query={enrollmentsQuery}
            columns={enrollmentColumns}
            rowKey={(e) => e.id}
            ariaLabel="تسجيلات البرامج"
            unit={ENROLL_UNIT}
            onPage={setPage}
          />
        </>
      ) : (
        <>
          {/* credential-type catalog: rendered from the API only */}
          <InstSection
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
          <InstPagedTable
            query={credentialsQuery}
            columns={credentialColumns}
            rowKey={(c) => c.id}
            ariaLabel="الشهادات الممنوحة"
            unit={CRED_UNIT}
            onPage={() => undefined}
          />
        </>
      )}

      <InstFormDialog open={enrollOpen} title="تسجيل طالب/متدرب في برنامج" fields={enrollFields} submitLabel="تسجيل" busy={busy} onCancel={() => setEnrollOpen(false)} onSubmit={submitEnroll} />
      <InstFormDialog open={awardOpen} title="منح شهادة" fields={awardFields} submitLabel="منح" busy={busy} wide onCancel={() => setAwardOpen(false)} onSubmit={submitAward} />
    </PageFrame>
  );
}
