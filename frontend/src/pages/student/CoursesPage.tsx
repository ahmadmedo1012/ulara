import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Send, X,
  BookOpen, ArrowLeft,
} from 'lucide-react';
import { FormField } from '../../components/primitives';
import {
  PageFrame, PageHeader, RowList, RowItem, FilterBar,
} from '../../components/patterns';
/* R359 (A3 · final sweep) — the sheet grammar joins the §B2 kit: the
 * framed section (registration crosses + Latin mono caption + the
 * aside slot), the KpiBand (the dimension-string register replacing
 * the summary line), and the DataSheet (the roster register the admin
 * students exemplar established — the enrolled-course list IS tabular:
 * course · code · teacher · progress). */
import {
  SheetSection, KpiBand, DataSheet, type DataSheetColumn,
} from '../../components/patterns';
import {
  BarCount, CourseBar, StatusChip, EmptyCell, dueChip, dueDays,
} from '../../components/student';
import { ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Icon } from '../../components/Icon';
import { courseIcon, ASSIGNMENT_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import {
  useMyEnrollments,
  useStudentDashboard,
  useOfferingLectures,
  useSubmitAssignment,
  validateSubmissionDraft,
  apiErrorMessage,
  type MyEnrollment,
  type StudentDashboard,
  type Submission,
} from '../../hooks/useResources';
import { formatDate } from '../../utils/numbers';
/* R305-A5 (the reference): the shared student vocabulary + this family's sheet.
 * student.css (global shell import) styles the base page classes; these
 * two carry the reference primitives and the page-scoped refinements. */
import '../../styles/student/ds-core.css';
import '../../styles/student/ds-courses.css';
/* R319 (c3-S1): the sheet system — the §B2 component anatomy (loaded
 * by every student page that renders the kit) + this family's own
 * harmonics (thumb-card hairline re-seat, the row progress seat). */
import '../../styles/student/pages.css';
import '../../styles/student/academic-pages.css';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) + the assignment-kind
 * labels live in lib/courseMeta.ts (waves 9-a / 13-15 — this page's former
 * TYPE_LABELS was byte-identical to ASSIGNMENT_KIND_LABEL). */

type AgendaAssignment = StudentDashboard['agenda']['assignments'][number];

/** Exported for unit tests (submission-modal validation wiring). */
export type SubmitModalAssignment = AgendaAssignment;

/** Filter buckets mirror the KPI strip semantics (mutually real, counts
 *  derived from data — never invented). */
type CourseFilter = 'all' | 'active' | 'done' | 'attention';

const FILTERS: Array<{ key: CourseFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'قيد التقدّم' },
  { key: 'done', label: 'مكتملة' },
  { key: 'attention', label: 'بحاجة إلى اهتمام' },
];

function matchesFilter(e: MyEnrollment, f: CourseFilter): boolean {
  if (f === 'done') return e.progressPct >= 100;
  if (f === 'active') return e.progressPct > 0 && e.progressPct < 100;
  /* r157 (W2-F7 / 6A11): attention = started but stalling —
   * 0 < progressPct < 30. A zero-progress course (enrolled, never
   * opened — most of a new term) is «ابدأ» territory, not an alert,
   * and an empty course can never be the student's fault. Both were
   * previously swept into the flag, drowning the 2-3 genuinely
   * stalled cards the filter exists for. */
  if (f === 'attention') return e.progressPct > 0 && e.progressPct < 30;
  return true;
}

/** Honest relative due date with proper Arabic plurals (not "بعد 2 أيّام"). */
function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return formatDate(d, { dateStyle: 'medium' });
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return formatDate(d, { dateStyle: 'medium' });
}
/* R319 (c3-S1): the due state rides the §B2 mono StatusChip register
 * now — dueChip(dueDays(iso)) derives the honest Latin label
 * (OVERDUE / DUE TODAY / DUE nD / DUE) from the same whole-day
 * arithmetic formatDue rides; the Arabic prose sentence stays in the
 * row's meta («الموعد …»), the chip is the state. */

/* R359 (final sweep) — the course cell's quiet metadata line: code ·
 * teacher · lecture count. A COMPONENT (not a render closure) because
 * the lecture-count scent rides its own per-offering query (the same
 * cached list the lecture player's prev/next bar reads, so the
 * request is amortized across the visit; fail-soft: no count on
 * error). */
function CourseMetaLine({ e }: { e: MyEnrollment }) {
  const c = e.offering.course;
  const teacher = `د. ${e.offering.teacher.firstName} ${e.offering.teacher.lastName}`;
  const lecturesQ = useOfferingLectures(e.offering.id);
  const lectureCount = lecturesQ.data?.length;
  return (
    <span className="sg-cell-sub">
      <bdi dir="ltr">{c.code}</bdi>
      {' · '}
      {teacher}
      {lectureCount !== undefined && lectureCount > 0 && (
        <>
          {' · '}
          {countAr(lectureCount, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}
        </>
      )}
      {lectureCount === 0 && <>{' · '}بانتظار محتوى المقرّر</>}
    </span>
  );
}

export default function StudentCoursesPage() {
  const { data, isPending, isError, error, refetch } = useMyEnrollments();
  const dashboard = useStudentDashboard();

  const [submitTarget, setSubmitTarget] = useState<{ assignment: AgendaAssignment; offeringId: string } | null>(null);
  const [filter, setFilter] = useState<CourseFilter>('all');

  const upcoming = dashboard.data?.agenda?.assignments ?? [];

  const counts: Record<CourseFilter, number> = {
    all: data?.length ?? 0,
    active: data?.filter((e) => matchesFilter(e, 'active')).length ?? 0,
    done: data?.filter((e) => matchesFilter(e, 'done')).length ?? 0,
    attention: data?.filter((e) => matchesFilter(e, 'attention')).length ?? 0,
  };
  const filtered = (data ?? []).filter((e) => matchesFilter(e, filter));

  /* r341 D7a — the list's ONE act-now row (the exams list's oex-row-cta
   * grammar): the first still-unfinished course carries the page's one
   * discrete accent verb («تابع/ابدأ»); with nothing left to finish the
   * first row keeps it (an «ابدأ»-able empty course is still THE
   * actionable row). Follows `filtered` so the verb never points at a
   * row the current bucket hides. */
  const actNowId = (filtered.find((e) => e.progressPct < 100) ?? filtered[0])?.id;

  /* R359 (final sweep) — the enrolled-course roster columns (the admin
   * students exemplar's register): the course's identity (the ink
   * glyph well — the API tint retired; identity is the glyph itself,
   * colour stays paper+ink+ONE signal) +
   * title link + the code·teacher·lectures sub-line; the progress as
   * the §B2 CourseBar instrument (mono numerics); and the row's verb
   * — now a REAL link (the table row is not an anchor, so the verb
   * and the title are the row's two scents to the same destination). */
  const columns: DataSheetColumn<MyEnrollment>[] = [
    {
      key: 'course',
      label: 'المقرّر',
      render: (e) => {
        const c = e.offering.course;
        const Cmp = courseIcon(c.code ?? c.name);
        return (
          <span className="flex items-center gap-2">
            <span className="courses-row-icon">
              <Icon icon={Cmp} size={18} />
            </span>
            <span className="sg-cell-stack">
              <Link className="sg-cell-title" to={`/student/courses/${e.offering.id}`}>
                {c.name}
              </Link>
              <CourseMetaLine e={e} />
            </span>
          </span>
        );
      },
    },
    {
      key: 'progress',
      label: 'التقدّم',
      render: (e) => (
        <CourseBar
          code={e.offering.course.code ?? undefined}
          pct={e.progressPct}
          ariaLabel={`تقدّم مقرّر ${e.offering.course.name}: ${e.progressPct}%`}
        />
      ),
    },
    {
      key: 'go',
      label: '',
      noLabel: true,
      render: (e) => (
        <Link
          to={`/student/courses/${e.offering.id}`}
          className={
            e.id === actNowId
              ? 'btn accent sm courses-row-go courses-row-go--now'
              : 'btn ghost sm courses-row-go'
          }
        >
          {e.progressPct > 0 ? 'تابع' : 'ابدأ'}
          <Icon icon={ArrowLeft} size={12} />
        </Link>
      ),
    },
  ];

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PageHeader
        eyebrow="طلاب الجامعة"
        title="مقرّراتي الدراسية"
        description="جميع المقرّرات التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحد منها."
      />

      {/* R359 (final sweep) — the KPI band: the same counts object the
          old one-line summary read (total · done · active · attention),
          now in the dimension-string register. Every numeral derives
          from the live enrollments payload; pending renders the honest
          «—» empty cell (the band is its own loading mirror). */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'ENROLLED',
            label: 'مقرّرات مسجَّلة هذا الفصل',
            value: data?.length ?? 0,
            empty: isPending,
          },
          {
            index: '02',
            caption: 'COMPLETED',
            label: 'مكتملة',
            value: counts.done,
            empty: isPending,
          },
          {
            index: '03',
            caption: 'IN PROGRESS',
            label: 'قيد التقدّم',
            value: counts.active,
            empty: isPending,
          },
          {
            index: '04',
            caption: 'STALLED',
            label: 'بحاجة إلى اهتمام',
            value: counts.attention,
            empty: isPending,
          },
        ]}
      />

      {(data?.length ?? 0) > 1 && (
        <FilterBar
          filters={
            <div className="courses-filter" role="group" aria-label="تصفية المقرّرات حسب الحالة">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`pill${filter === f.key ? ' on' : ''}`}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="courses-filter-count" aria-hidden>{counts[f.key]}</span>
                </button>
              ))}
            </div>
          }
        />
      )}

      {/* R359 (final sweep) — the roster sheet: pad=none (the table IS
          the body). Loading, error and both empty registers (the
          no-enrollments door + the empty filter bucket) live INSIDE
          the framed section. */}
      <SheetSection index="01" caption="ENROLLED COURSES" title="مقرّراتك" pad="none">
        {isError && (
          <div className="sg-pad-in">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        )}
        {!isError && !data?.length && !isPending && (
          <div className="sg-pad-in">
            <EmptyState illustration="empty-courses" icon={BookOpen} title="لم تسجّل في أي مقرّر بعد" description="تواصل مع المسجل العام لإكمال تسجيل مقرّرات الفصل — ستظهر هنا فور اعتمادها." />
          </div>
        )}
        {!isError && ((data?.length ?? 0) > 0 || isPending) && (
          <DataSheet
            caption="قائمة المقرّرات المسجّلة"
            columns={columns}
            rows={filtered}
            loading={isPending}
            empty={(
              /* R319 (c3-S1): the empty filter bucket is the sheet's
                 reserved-but-empty region — the hatched EmptyCell. */
              <EmptyCell
                label="لا توجد مقرّرات في هذا التصنيف"
                note="جرّب تصنيفاً آخر من الأزرار أعلاه لعرض مقرّراتك."
              />
            )}
          />
        )}
      </SheetSection>

      <SheetSection
        index="02"
        caption="UPCOMING ASSIGNMENTS"
        title="الواجبات القادمة"
        pad="none"
        aside={
          !dashboard.isPending && !dashboard.isError && upcoming.length > 0 ? (
            <BarCount
              n={upcoming.length}
              srLabel={countAr(upcoming.length, ['واجب واحد قادم', 'واجبان قادمان', 'واجبات قادمة', 'واجباً قادماً'])}
            />
          ) : undefined
        }
      >
        {dashboard.isPending ? (
          <div className="sg-pad-in" aria-busy="true" aria-live="polite">
            {/* r173a: the shape-matched mirror — one skeleton owner for
                the agenda region, inside the framed body. */}
            {[0, 1].map((i) => (
              <div className="pf-row" key={i} aria-hidden>
                <div className="pf-row-line">
                  <div className="pf-row-main">
                    <span className="pat-skeleton" style={{ display: 'inline-block', inlineSize: '45%', blockSize: '0.9em' }} />
                    <span className="pat-skeleton" style={{ display: 'inline-block', inlineSize: '60%', blockSize: '0.7em' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : dashboard.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
          </div>
        ) : !upcoming.length ? (
          <div className="sg-pad-in">
            {/* R319 (c3-S1): the empty agenda is the hatched EmptyCell —
                the sheet's reserved-but-empty region. */}
            <EmptyCell
              label="لا توجد واجبات قادمة"
              note="ستظهر هنا الواجبات المستحقة فور إضافتها من أساتذة مقرّراتك."
            />
          </div>
        ) : (
          /* The agenda is a feed, not a ledger — the RowList stays
             (r319 §B2 rows), now inside the framed section. */
          <RowList aria-label="قائمة الواجبات القادمة">
            {upcoming.map((a) => {
              /* R319 (c3-S1): dueChip + dueDays — the SAME honest
                 whole-day arithmetic, now in the §B2 mono register. */
              const due = dueChip(dueDays(a.dueAt));
              return (
                <RowItem
                  key={a.id}
                  leading={<Icon icon={Send} size={16} className="text-subtle" />}
                  title={<>{ASSIGNMENT_KIND_LABEL[a.type] ?? a.type}: {a.title}</>}
                  meta={<>{a.courseName} · الموعد {formatDue(a.dueAt)}</>}
                  trailing={
                    <>
                      {/* R319 (c3-S1): the due state as the §B2 mono chip
                          (square, hairline, Latin) — the one emphasized
                          control stays the تسليم action. */}
                      <StatusChip label={due.label} tone={due.tone} />
                      {a.offeringId && (
                        <button
                          type="button"
                          className="btn outline sm"
                          onClick={() => setSubmitTarget({ assignment: a, offeringId: a.offeringId })}
                        >
                          <Icon icon={Send} size={12} /> تسليم
                        </button>
                      )}
                    </>
                  }
                />
              );
            })}
          </RowList>
        )}
      </SheetSection>

      {submitTarget && (
        <SubmitAssignmentModal
          key={`${submitTarget.offeringId}:${submitTarget.assignment.id}`}
          assignment={submitTarget.assignment}
          offeringId={submitTarget.offeringId}
          onClose={() => setSubmitTarget(null)}
        />
      )}

    </PageFrame>
    </div>
  );
}

/* ─── Student assignment submission modal ─────────────────── */
export function SubmitAssignmentModal({
  assignment,
  offeringId,
  onClose,
}: {
  assignment: AgendaAssignment;
  offeringId: string;
  onClose: () => void;
}) {
  const submit = useSubmitAssignment(offeringId, assignment.id);
  const [textAnswer, setTextAnswer] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState<Submission | null>(null);
  /* r170d (WCAG 2.2 — 3.3.1 error identification / focus management): the
   * first invalid control. The shared validation error is announced on the
   * primary answer field (role=alert + aria-describedby + aria-invalid are
   * already wired by FormField); what was missing is the FOCUS move — a
   * keyboard user's focus stayed on the submit button after a failed
   * attempt, forcing a blind Tab hunt for the flagged field. */
  const textAnswerRef = useRef<HTMLTextAreaElement>(null);

  /* Close-parity (A10 P1-1): the student's answer is the same class of
     long-form prose the 11 teacher-side authoring modals guard — an
     8000-character draft must not vanish on a stray Esc / scrim click.
     Dirty while any field carries text and the submission hasn't landed;
     inert while the mutation is in flight (A10's teacher-side pattern). */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (textAnswer.trim() !== '' || fileUrl.trim() !== ''),
    pending: submit.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const draft = {
      textAnswer: textAnswer.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
    };
    const err = validateSubmissionDraft(draft);
    if (err) {
      setValidationError(err);
      // r170d: focus moves to the first invalid field so the error context
      // (and its aria-describedby message) is where the user is looking.
      textAnswerRef.current?.focus();
      return;
    }
    setValidationError(null);
    try {
      const submission = await submit.mutateAsync(draft);
      setDone(submission);
    } catch {
      // surfaced inline from submit.isError below
    }
  };

  const late = done?.status === 'LATE';

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel={`تسليم الواجب ${assignment.title}`}
      closeOnOverlayClick={!submit.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تسليم الواجب</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={submit.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{assignment.title}</div>
        <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }}>
          {assignment.courseName} · <bdi className="font-mono">{assignment.courseCode}</bdi> · الموعد النهائي:{' '}
          {formatDate(assignment.dueAt, { dateStyle: 'medium' })}
        </div>

        {done ? (
          <div
            role="status"
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--r-md)',
              background: late ? 'var(--warning-soft)' : 'var(--success-soft)',
              // R131-F12b (A7 §5-1 sweep): banner ink chains through the
              // -ink tier — base --success/--warning on the soft washes
              // measured 2.53/2.04:1 in light (text, 1.4.3); dark -ink ≡
              // base, so dark is unchanged.
              color: late ? 'var(--warning-ink)' : 'var(--success-ink)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-1)',
            }}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Icon icon={late ? AlertTriangle : CheckCircle2} size={15} />
              {late ? 'تمّ التسليم — بعد الموعد النهائي' : 'تمّ التسليم بنجاح'}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-base)' }}>
              {late
                ? 'استُلمت إجابتك وسيُعلَّم تسليمك كمتأخر؛ الحسم النهائي يعود إلى أستاذ المقرّر.'
                : 'استُلمت إجابتك وستظهر للأستاذ بانتظار التقييم.'}
            </p>
            {/* r164-e (assessment loop): the timeline's next step is a
                PLACE, not a dead end — the submission now lives on the
                results page until the teacher's grade lands. */}
            <Link to="/student/results" className="text-xs" style={{ color: late ? 'var(--warning-ink)' : 'var(--success-ink)', textDecoration: 'underline' }}>
              تابع حالة التقييم ودرجتك من صفحة النتائج
            </Link>
          </div>
        ) : (
          <>
            {/* r152c (A2): both fields join the FormField canon. The
                shared validation error lives on the primary answer field
                (single role=alert contract preserved for the test pins);
                the URL format copy moves to the hint slot so it is
                ALWAYS associated — the old conditional aria-describedby
                pointed at a hint that rendered unconditionally. */}
            <FormField
              label="إجابتك النصيّة"
              id="submit-text"
              error={validationError ?? undefined}
            >
              <textarea
                ref={textAnswerRef}
                className="input"
                rows={5}
                placeholder="اكتب إجابتك هنا…"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={submit.isPending}
                maxLength={8000}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </FormField>

            <FormField
              label="رابط ملف (اختياري)"
              id="submit-file"
              hint="رابط خارجي اختياري يبدأ بـ https:// إن توفّر لديك (مثل ملف على Drive) — إجابتك النصيّة وحدها تكفي للتسليم."
            >
              <input
                type="text"
                className="input"
                placeholder="https://…"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                disabled={submit.isPending}
                dir="ltr"
                maxLength={500}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </FormField>

            {submit.isError && (
              <p role="alert" className="text-xs" style={{ color: 'var(--danger-ink)', marginTop: 'var(--sp-2)' }}>
                {apiErrorMessage(submit.error, 'تعذَّر تسليم الواجب — تحقّق من اتصالك وحاول مرة أخرى.')}
              </p>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn ghost" onClick={requestClose} disabled={submit.isPending}>
          {done ? 'إغلاق' : 'إلغاء'}
        </button>
        {!done && (
          <button
            type="button"
            className="btn primary"
            onClick={() => void onSubmit()}
            disabled={submit.isPending}
          >
            {submit.isPending ? 'جارٍ التسليم…' : 'تسليم الواجب'}
          </button>
        )}
      </div>
      {guard}
    </Modal>
  );
}
