/**
 * r352 §G (cont.) — program detail: versions lifecycle (DRAFT →
 * APPROVED → ACTIVE → RETIRED, one ACTIVE per program) + the plan's
 * course links (add/remove existing institution courses — the course
 * entity itself belongs to the existing courses surfaces).
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageFrame, PageHeader, DataSheet, SheetEmpty, type DataSheetColumn } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate, formatInt } from '../../utils/numbers';
import { api, unwrap } from '../../lib/api';
import { serverError,
  DetailList, InstFormDialog, InstSection, InstStates, StatusFlag,
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
import type { ProgramCourseRow, ProgramVersion } from '../../lib/institutional/types';

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

  /* R359 — the versions register: the label is the row's title, the
   * status rides the flat flag, the course count is the numeric mono
   * datum, the lifecycle buttons ride the label-less action cell; the
   * inspected version pins accent via the row tone. */
  const versionColumns: DataSheetColumn<ProgramVersion>[] = [
    { key: 'label', label: 'الإصدار', render: (v) => <span className="sg-cell-title">{v.label}</span> },
    { key: 'from', label: 'ساري من', render: (v) => (v.effectiveFrom ? formatDate(v.effectiveFrom) : '—') },
    { key: 'status', label: 'الحالة', render: (v) => <StatusFlag value={v.status} labels={VERSION_STATUS_LABELS} /> },
    { key: 'courses', label: 'المقررات', numeric: true, render: (v) => (v._count?.courses != null ? formatInt(v._count.courses) : '—') },
    {
      key: 'actions', label: 'إجراءات', noLabel: true,
      render: (v) => {
        const moves = canManage ? (VERSION_TRANSITIONS[v.status] ?? []) : [];
        return moves.length > 0 ? (
          <span className="inst-actions">
            {moves.map((next) => (
              <button
                key={next}
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={(e) => { e.stopPropagation(); void advanceVersion(v, next); }}
              >
                {VERSION_STATUS_LABELS[next as keyof typeof VERSION_STATUS_LABELS]}
              </button>
            ))}
          </span>
        ) : null;
      },
    },
  ];

  /* R359 — the plan-courses register: the linked course is the title,
   * term/hours ride the numeric mono cells, the removal is the
   * label-less action cell (the course entity stays in its own
   * surfaces — this register only links it into the plan). */
  const courseColumns: DataSheetColumn<ProgramCourseRow>[] = [
    {
      key: 'course', label: 'المقرر',
      render: (row) => (row.course ? <><bdi>{row.course.code}</bdi> — {row.course.name}</> : row.courseId),
    },
    { key: 'kind', label: 'الصنف', render: (row) => PROGRAM_COURSE_KIND_LABELS[row.kind] },
    { key: 'term', label: 'الفصل', numeric: true, render: (row) => (row.termNo != null ? formatInt(row.termNo) : '—') },
    { key: 'hours', label: 'الساعات', numeric: true, render: (row) => (row.creditHours != null ? formatInt(row.creditHours) : '—') },
    ...(canManage ? [{
      key: 'remove', label: 'إزالة', noLabel: true,
      render: (row: ProgramCourseRow) => (
        <button type="button" className="btn ghost sm" aria-label={`إزالة ${row.course?.name ?? ''}`} disabled={busy} onClick={() => removeCourse(row.courseId)}>
          <Icon icon={Trash2} size={13} />
        </button>
      ),
    }] : []),
  ];

  return (
    <PageFrame width="default">
      <PageHeader
        title={program?.nameAr ?? 'تفاصيل البرنامج'}
        eyebrow="البرامج والخطط الدراسية"
        description={program ? (<>{PROGRAM_KIND_LABELS[program.kind]} · رمز <bdi>{program.code}</bdi></>) : undefined}
        meta={program ? <StatusFlag value={program.status} labels={PROGRAM_STATUS_LABELS} /> : null}
        breadcrumbs={[{ label: 'البرامج', to: '/institution/programs' }]}
      />
      <InstStates isLoading={programQuery.isLoading} error={programQuery.error} isEmpty={!program}>
        {program && (
          <>
            <InstSection
              index="01"
              caption="PROGRAM"
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
                  { label: 'المدة', value: program.durationMonths ? `${formatInt(program.durationMonths)} شهر` : null },
                  { label: 'الساعات المعتمدة', value: program.totalCreditHours != null ? formatInt(program.totalCreditHours) : null },
                  { label: 'مرجع الاعتماد', value: program.approvalRef ? <bdi>{program.approvalRef}</bdi> : null },
                ]}
              />
            </InstSection>

            <InstSection
              index="02"
              caption="CURRICULUM VERSIONS"
              title="إصدارات الخطة الدراسية"
              description="إصدار واحد نشط لكل برنامج (قاعدة الخادم) — انتقالات: مسودة ← معتمدة ← سارية ← متقاعدة."
              actions={canManage && (
                <button type="button" className="btn primary sm" onClick={() => setVersionOpen(true)}>
                  <Icon icon={Plus} size={14} /> إصدار جديد
                </button>
              )}
            >
              {versions.length === 0 ? (
                <div className="inst-state">
                  <SheetEmpty
                    code="NO VERSIONS"
                    title="لا إصدارات بعد"
                    desc="أنشئ الإصدار الأول من الخطة الدراسية — يبدأ مسودة، ثم اعتماد، ثم سريان."
                  />
                </div>
              ) : (
                <DataSheet
                  caption="إصدارات الخطة الدراسية"
                  columns={versionColumns}
                  rows={versions}
                  rowTone={(v) => (activeVersion?.id === v.id ? 'signal' : undefined)}
                  onRowClick={(v) => setVersionId(v.id)}
                />
              )}
            </InstSection>

            {activeVersion && (
              <InstSection
                index="03"
                caption="PLAN COURSES"
                title={`مقررات الخطة: ${activeVersion.label}`}
                description="ربط المقررات القائمة بالخطة — المقرر نفسه يُدار من إدارة المقررات."
                actions={canManage && (
                  <button type="button" className="btn primary sm" onClick={() => { void loadCourseOptions(); setCourseOpen(true); }}>
                    <Icon icon={Plus} size={14} /> ربط مقرر
                  </button>
                )}
              >
                <InstStates
                  isLoading={false}
                  error={coursesQueryState.error}
                  isEmpty={!coursesQueryState.isLoading && (coursesQueryState.data ?? []).length === 0}
                  empty={(
                    <SheetEmpty
                      code="NO COURSES"
                      title="لا مقررات في هذه الخطة"
                      desc="اربط مقررات مؤسستك القائمة بالخطة من زر «ربط مقرر» — لا تُنشأ نسخ مكررة هنا."
                    />
                  )}
                >
                  <DataSheet
                    caption="مقررات الخطة الدراسية"
                    columns={courseColumns}
                    rows={coursesQueryState.data ?? []}
                    loading={coursesQueryState.isLoading}
                  />
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
