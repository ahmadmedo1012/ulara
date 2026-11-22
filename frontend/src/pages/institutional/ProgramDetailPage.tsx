/**
 * r352 §G (cont.) — program detail: versions lifecycle (DRAFT →
 * APPROVED → ACTIVE → RETIRED, one ACTIVE per program) + the plan's
 * course links (add/remove existing institution courses — the course
 * entity itself belongs to the existing courses surfaces).
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { api, unwrap } from '../../lib/api';
import { serverError,
  DetailList, EnumChip, InstFormDialog, InstSection, InstStates,
  type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useMyCapabilities, useProgram, useVersionCourses, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  PROGRAM_COURSE_KIND_LABELS, PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS,
  VERSION_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { ProgramVersion } from '../../lib/institutional/types';

/** The version lifecycle transitions (contract §7 — enforced server-side). */
const VERSION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['ACTIVE'],
  ACTIVE: ['RETIRED'],
  RETIRED: [],
};

/** Minimal course row — the courses catalog shape the plan links to. */
interface CourseOption { id: string; name: string; code: string }

export function InstitutionProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PROGRAMS_MANAGE') ?? false;

  const programQuery = useProgram(id ?? null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const coursesQueryState = useVersionCourses(versionId);
  const mutations = useInstActions(['programs'], {
    update: (i: { id: string; input: Parameters<typeof instApi.updateProgram>[1] }) =>
      instApi.updateProgram(i.id, i.input),
    createVersion: (i: { programId: string; input: Parameters<typeof instApi.createProgramVersion>[1] }) =>
      instApi.createProgramVersion(i.programId, i.input),
    updateVersion: (i: { id: string; input: Parameters<typeof instApi.updateProgramVersion>[1] }) =>
      instApi.updateProgramVersion(i.id, i.input),
    addCourse: (i: { versionId: string; input: Parameters<typeof instApi.addVersionCourse>[1] }) =>
      instApi.addVersionCourse(i.versionId, i.input),
    removeCourse: (i: { versionId: string; courseId: string }) =>
      instApi.removeVersionCourse(i.versionId, i.courseId),
  });

  const [versionOpen, setVersionOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);

  const program = programQuery.data;
  const versions = program?.versions ?? [];
  const activeVersion = versionId
    ? versions.find((v) => v.id === versionId)
    : versions.find((v) => v.status === 'ACTIVE') ?? versions[0] ?? null;

  const loadCourseOptions = async () => {
    try {
      // The existing courses surface's catalog endpoint (institution-scoped
      // read) — the same data the admin courses page consumes.
      const rows = await unwrap<{ id: string; name: string; code: string }[]>(
        api.get('/courses', { params: { limit: 100 } }),
      );
      setCourseOptions(rows);
    } catch {
      setCourseOptions([]);
    }
  };

  const versionFields: InstField[] = [
    { kind: 'text', name: 'label', label: 'وسم الإصدار', required: true, maxLength: 60, hint: 'مثال: خطة 2027.' },
    { kind: 'date', name: 'effectiveFrom', label: 'ساري من' },
    { kind: 'text', name: 'approvalRef', label: 'مرجع الاعتماد', maxLength: 120 },
  ];

  const courseFields: InstField[] = [
    {
      kind: 'select', name: 'courseId', label: 'المقرر', required: true,
      options: courseOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
      hint: 'المقررات المعروضة من مقررات مؤسستك القائمة — لا تُنشأ نسخ مكررة هنا.',
    },
    { kind: 'number', name: 'termNo', label: 'الفصل داخل الخطة', min: 1, max: 16 },
    {
      kind: 'select', name: 'kind', label: 'الصنف داخل الخطة', required: true,
      options: Object.entries(PROGRAM_COURSE_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'number', name: 'creditHours', label: 'الساعات المعتمدة', min: 0, max: 30 },
  ];

  const submitVersion = async (values: InstFormValues): Promise<string | void> => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.createVersion({
        programId: id,
        input: {
          label: values.label as string,
          effectiveFrom: values.effectiveFrom as string | undefined,
          approvalRef: values.approvalRef as string | undefined,
        },
      });
      toast.success('أُنشئ إصدار الخطة (مسودة)');
      setVersionOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إنشاء الإصدار.');
    } finally {
      setBusy(false);
    }
  };

  const submitCourse = async (values: InstFormValues): Promise<string | void> => {
    if (!activeVersion) return 'اختر إصدار الخطة أولًا.';
    setBusy(true);
    try {
      await mutations.addCourse({
        versionId: activeVersion.id,
        input: {
          courseId: values.courseId as string,
          termNo: values.termNo as number | undefined,
          kind: String(values.kind),
          creditHours: values.creditHours as number | undefined,
        },
      });
      toast.success('أُضيف المقرر إلى الخطة');
      setCourseOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إضافة المقرر (تأكد أنه من مقررات مؤسستك).');
    } finally {
      setBusy(false);
    }
  };

  const advanceVersion = async (v: ProgramVersion, next: string) => {
    setBusy(true);
    try {
      await mutations.updateVersion({ id: v.id, input: { status: next } });
      toast.success(`انتقل الإصدار إلى: ${VERSION_STATUS_LABELS[next as keyof typeof VERSION_STATUS_LABELS]}`);
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر تغيير حالة الإصدار.'));
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async (courseId: string) => {
    if (!activeVersion) return;
    setBusy(true);
    try {
      await mutations.removeCourse({ versionId: activeVersion.id, courseId });
      toast.success('أُزيل المقرر من الخطة');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر إزالة المقرر.'));
    } finally {
      setBusy(false);
    }
  };

  const advanceProgram = async (next: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.update({ id, input: { status: next } });
      toast.success('حُدِّثت حالة البرنامج');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر تحديث حالة البرنامج.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={program?.nameAr ?? 'تفاصيل البرنامج'}
        eyebrow="البرامج والخطط الدراسية"
        description={program ? `${PROGRAM_KIND_LABELS[program.kind]} · رمز ${program.code}` : undefined}
        meta={program ? <EnumChip value={program.status} labels={PROGRAM_STATUS_LABELS} /> : null}
        breadcrumbs={[{ label: 'البرامج', to: '/institution/programs' }]}
      />
      <InstStates isLoading={programQuery.isLoading} error={programQuery.error} isEmpty={!program}>
        {program && (
          <>
            <InstSection
              title="بيانات البرنامج"
              actions={canManage && (
                <span className="inst-actions">
                  {program.status === 'DRAFT' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceProgram('APPROVED')}>اعتماد</button>}
                  {program.status === 'APPROVED' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceProgram('ACTIVE')}>تفعيل</button>}
                  {program.status === 'ACTIVE' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceProgram('SUSPENDED')}>إيقاف مؤقت</button>}
                  {program.status === 'SUSPENDED' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceProgram('ACTIVE')}>إعادة تفعيل</button>}
                </span>
              )}
            >
              <DetailList
                items={[
                  { label: 'المدة', value: program.durationMonths ? `${program.durationMonths} شهر` : null },
                  { label: 'الساعات المعتمدة', value: program.totalCreditHours ?? null },
                  { label: 'مرجع الاعتماد', value: program.approvalRef ?? null },
                ]}
              />
            </InstSection>

            <InstSection
              title="إصدارات الخطة الدراسية"
              description="إصدار واحد نشط لكل برنامج (قاعدة الخادم) — انتقالات: مسودة ← معتمدة ← سارية ← متقاعدة."
              actions={canManage && (
                <button type="button" className="btn primary sm" onClick={() => setVersionOpen(true)}>
                  <Icon icon={Plus} size={14} /> إصدار جديد
                </button>
              )}
            >
              {versions.length === 0 ? (
                <p className="inst-section-desc">لا إصدارات بعد.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table tbl-stack" aria-label="إصدارات الخطة">
                    <thead>
                      <tr>
                        <th scope="col">الإصدار</th>
                        <th scope="col">ساري من</th>
                        <th scope="col">الحالة</th>
                        <th scope="col">المقررات</th>
                        <th scope="col">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <tr key={v.id} className={activeVersion?.id === v.id ? 'inst-row-click' : undefined} aria-selected={activeVersion?.id === v.id}
                          onClick={() => setVersionId(v.id)}
                        >
                          <td data-label="الإصدار">{v.label}</td>
                          <td data-label="ساري من">{v.effectiveFrom ? formatDate(v.effectiveFrom) : '—'}</td>
                          <td data-label="الحالة"><EnumChip value={v.status} labels={VERSION_STATUS_LABELS} /></td>
                          <td data-label="المقررات" className="font-mono">{v._count?.courses ?? '—'}</td>
                          <td data-label="إجراءات">
                            {canManage && (VERSION_TRANSITIONS[v.status] ?? []).map((next) => (
                              <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={(e) => { e.stopPropagation(); void advanceVersion(v, next); }}>
                                {VERSION_STATUS_LABELS[next as keyof typeof VERSION_STATUS_LABELS]}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </InstSection>

            {activeVersion && (
              <InstSection
                title={`مقررات الخطة: ${activeVersion.label}`}
                description="ربط المقررات القائمة بالخطة — المقرر نفسه يُدار من إدارة المقررات."
                actions={canManage && (
                  <button type="button" className="btn primary sm" onClick={() => { void loadCourseOptions(); setCourseOpen(true); }}>
                    <Icon icon={Plus} size={14} /> ربط مقرر
                  </button>
                )}
              >
                <InstStates
                  isLoading={coursesQueryState.isLoading}
                  error={coursesQueryState.error}
                  isEmpty={(coursesQueryState.data ?? []).length === 0}
                >
                  <div className="table-wrap">
                    <table className="table tbl-stack" aria-label="مقررات الخطة">
                      <thead>
                        <tr>
                          <th scope="col">المقرر</th>
                          <th scope="col">الصنف</th>
                          <th scope="col">الفصل</th>
                          <th scope="col">الساعات</th>
                          {canManage && <th scope="col">إزالة</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(coursesQueryState.data ?? []).map((row) => (
                          <tr key={row.id}>
                            <td data-label="المقرر">{row.course ? `${row.course.code} — ${row.course.name}` : row.courseId}</td>
                            <td data-label="الصنف">{PROGRAM_COURSE_KIND_LABELS[row.kind]}</td>
                            <td data-label="الفصل" className="font-mono">{row.termNo ?? '—'}</td>
                            <td data-label="الساعات" className="font-mono">{row.creditHours ?? '—'}</td>
                            {canManage && (
                              <td data-label="إزالة">
                                <button type="button" className="btn ghost sm" aria-label={`إزالة ${row.course?.name ?? ''}`} disabled={busy} onClick={() => removeCourse(row.courseId)}>
                                  <Icon icon={Trash2} size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </InstStates>
              </InstSection>
            )}

            <p className="inst-crumb">
              <Link to="/institution/students">التسجيل والمنح للبرنامج تتم من قسم الطلاب والمتدربين ←</Link>
            </p>
          </>
        )}
      </InstStates>

      <InstFormDialog open={versionOpen} title="إصدار خطة جديد" fields={versionFields} submitLabel="إنشاء" busy={busy} onCancel={() => setVersionOpen(false)} onSubmit={submitVersion} />
      <InstFormDialog open={courseOpen} title="ربط مقرر بالخطة" fields={courseFields} submitLabel="ربط" busy={busy} onCancel={() => setCourseOpen(false)} onSubmit={submitCourse} />
    </PageFrame>
  );
}
