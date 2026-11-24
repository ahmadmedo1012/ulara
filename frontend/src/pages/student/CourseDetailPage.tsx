import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Play, FileText,
  CheckCircle2, ChevronLeft, ChevronRight, Presentation, Video, FileArchive, Image,
  type LucideIcon,
} from 'lucide-react';
import { Badge, ProgressBar } from '../../components/primitives';
import { ErrorState, Skeleton, ListSkeleton } from '../../components/primitives/States';
import {
  PageFrame, PageHeader, FilterBar,
} from '../../components/patterns';
/* R359 (A3 · final sweep) — the sheet grammar joins the §B2 kit: the
 * framed section (registration crosses + Latin mono caption + the
 * aside slot), the KpiBand (the dimension-string register replacing
 * the StatLine), and the DataSheet (the ledger register) for the
 * tabular regions (the curriculum + the assignments ledger). */
import {
  SheetSection, KpiBand, DataSheet, type DataSheetColumn,
} from '../../components/patterns';
import {
  BarCount, CourseBar, StatusChip, EmptyCell, dueChip, dueDays,
} from '../../components/student';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useOfferingFull, selectNextLecture, pendingCheckpoints } from '../../hooks/useResources';
import { useEntityPageTitle } from '../../components/layout/AppShell';
import { materialHref } from '../../lib/materialHref';
import { countAr, formatDateAr, WEEKDAY_NAMES_AR } from '../../lib/format';
import { formatInt } from '../../utils/numbers';
import { courseTint, ASSIGNMENT_KIND_LABEL, MATERIAL_TYPE_LABEL, type AssignmentKind, type MaterialType } from '../../lib/courseMeta';
/* R305-A5 (the reference): the shared student vocabulary + this family's sheet. */
import '../../styles/student/ds-core.css';
import '../../styles/student/ds-courses.css';
/* R319 (c3-S1): the sheet system — the §B2 component anatomy + this
 * family's own harmonics (r319-student-pages.css). */
import '../../styles/student/pages.css';
import '../../styles/student/academic-pages.css';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) + the assignment-kind
 * labels live in lib/courseMeta.ts; countAr, formatDateAr + WEEKDAY_NAMES_AR
 * live in lib/format.ts (waves 9-a / 13-15). */


function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  return `${m}د`;
}

/* r173a (the courses page's bucket semantics) — the assignment row's
   honest due state. R319 (c3-S1): the label voice moved to the §B2 mono
   StatusChip register (dueChip + dueDays — the same whole-day arithmetic
   formatDue rides); the color map below is retired with the r305 badge. */

/* R304 — the curriculum filter: the same pill language the courses and
 * matrix pages speak, over the page's real lecture states. Pure
 * client-side filtering of the already-loaded list. */
type LectureFilter = 'all' | 'open' | 'done';
const LECTURE_FILTERS: Array<{ key: LectureFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'open', label: 'لم تكتمل' },
  { key: 'done', label: 'مكتملة' },
];
function lectureBucket(lec: { watchEvents?: Array<{ completed: boolean }>; answeredCheckpoints?: number; _count: { checkpoints: number } }): 'open' | 'done' {
  const we = lec.watchEvents?.[0];
  const pending = (lec._count.checkpoints ?? 0) - (lec.answeredCheckpoints ?? 0);
  return we?.completed && pending <= 0 ? 'done' : 'open';
}

/* r157 (W2-F7 / audit 6A13): per-format material icons — every row
 * wore the same FileText glyph, so a 50MB lecture recording and a
 * 2-slide handout were visually identical in a list the student
 * scans by format. PPT→Presentation, VIDEO→Video, ZIP→FileArchive,
 * IMAGE→Image; the document formats (PDF/DOC/OTHER) stay FileText.
 * Unknown types (schema drift) fall back to FileText. */
const MATERIAL_TYPE_ICON: Record<MaterialType, LucideIcon> = {
  PPT: Presentation,
  VIDEO: Video,
  ZIP: FileArchive,
  IMAGE: Image,
  PDF: FileText,
  DOC: FileText,
  OTHER: FileText,
};

/* fmtDate (short ar-LY date) is lib/format.formatDateAr (13-15 fold).
 * The weekday names + assignment-kind labels are imported above. */
/** Reads a --motion-duration-* token (ms) so JS-driven animation timing
 *  stays on the design scale — guardrail #1 applies to TSX too. */
function motionTokenMs(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Curriculum progress count-up (the authored moment of this page).
 *  Instant when prefers-reduced-motion is set (guardrail #6). */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const duration = motionTokenMs('--motion-duration-stat', 700);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // exponential ease-out — the JS counterpart of --motion-ease-decelerate
      setValue(Math.round((1 - Math.pow(2, -10 * t)) * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced]);

  return value;
}

export default function CourseDetailPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { data, isPending, isError, error, refetch } = useOfferingFull(offeringId);
  // r183-B6 (A4 P3-4): the tab names the COURSE, not the pattern —
  // null while pending leaves the shell's «تفاصيل المقرّر» in place.
  useEntityPageTitle(data?.course.name ?? null);

  // R304: the curriculum filter — client-side over the loaded lectures.
  const [lecFilter, setLecFilter] = useState<LectureFilter>('all');

  // Derived BEFORE the early returns so the count-up hook (useState /
  // useEffect / useReducedMotion inside) keeps a stable order across the
  // pending → data transition (the LabsPage audit P2 crash pattern).
  const watchedCount = data?.lectures.filter((l) => l.watchEvents?.[0]?.completed).length ?? 0;
  const lecProgress = data?.lectures.length
    ? Math.round((watchedCount / data.lectures.length) * 100)
    : 0;
  const progressValue = useCountUp(lecProgress);

  if (isPending) {
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <Skeleton width={200} height={32} rounded="var(--r-md)" />
        {/* R305: the pending mirror keeps the rail's exact box (the
            r305s-next classes included) so the data handoff paints the
            same copper edge it resolves into. */}
        <div className="course-continue r305s-next r305c-continue" aria-busy="true" aria-live="polite">
          <Skeleton width="55%" height={20} />
          <Skeleton width={220} height={8} rounded="var(--r-full)" />
        </div>
        <ListSkeleton rows={3} />
      </PageFrame>
      </div>
    );
  }
  if (isError || !data) {
    // Page chrome + way back (audit 0-d P2 — the bare ErrorState had
    // no page wrapper and no route back to the courses list).
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <Link to="/student/courses" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
          <Icon icon={ChevronRight} size={13} />
          العودة إلى مقرراتي
        </Link>
        <ErrorState error={error} onRetry={() => refetch()} />
      </PageFrame>
      </div>
    );
  }

  // Course-level identity tint from the API. It is NOT a college accent
  // (the gateCollegeAccent machinery governs college-identity surfaces
  // only) — contrast is guaranteed by construction: the tint is consumed
  // exclusively as color-mix washes over var(--surface) with --text ink.
  const tint = courseTint(data.course.themeColor);

  /* r164d (course flow): the FIRST unfinished lecture — watch open OR
   * checkpoints pending (r155a caps attempts, an unanswered checkpoint
   * stays an open loop). Pure selection lives in hooks/resources/
   * learning.ts; the same object reference rides both the hero «التالي»
   * CTA and the highlighted row below (indexOf by identity). */
  const nextLec = selectNextLecture(data.lectures);
  const nextLecIdx = nextLec ? data.lectures.indexOf(nextLec) : -1;
  const nextPending = nextLec ? pendingCheckpoints(nextLec) : 0;

  // R304 — filter buckets counted from the real payload; the filter bar
  // only mounts when the curriculum is long enough to need it (a
  // 3-lecture course filters itself by existing).
  const doneCount = data.lectures.filter((l) => lectureBucket(l) === 'done').length;
  const openCount = data.lectures.length - doneCount;
  const filteredLectures = lecFilter === 'all'
    ? data.lectures
    : data.lectures.filter((l) => lectureBucket(l) === lecFilter);

  /* R359 (final sweep) — the curriculum ledger columns (the roster
   * register): the lecture's title IS the link (the ResearchHitRow
   * precedent — the row is data, the title is the way in), the quiet
   * meta line carries duration · chapters · checkpoints, the progress
   * rides the §B2 CourseBar (the honest zero-tick on an unopened
   * lecture included), and the state words ride the flat sg-flag. */
  const lectureColumns: DataSheetColumn<NonNullable<typeof data>['lectures'][number]>[] = [
    {
      key: 'lecture',
      label: 'المحاضرة',
      render: (lec) => (
        <span className="sg-cell-stack">
          <Link className="sg-cell-title" to={`/student/lectures/${lec.id}`}>
            المحاضرة <bdi className="font-mono">{String(lec.ordinal).padStart(2, '0')}</bdi>
            {' — '}
            {lec.title}
          </Link>
          <span className="sg-cell-sub">
            <bdi dir="ltr">{fmtDuration(lec.durationSec)}</bdi>
            {' · '}
            {countAr(lec._count.chapters, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}
            {' · '}
            {countAr(lec._count.checkpoints, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}
          </span>
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'التقدّم',
      render: (lec) => {
        const we = lec.watchEvents?.[0];
        const watchedPct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
        return (
          /* r157 (W2-F7): named per-lecture bar — every progressbar on
             the page needs its own accessible name. The §B2 CourseBar
             (hairline + end-tick + mono %) renders on EVERY row now:
             the honest 0% tick on an unopened lecture (the r173a
             zero-mark contract) and the full bar on a completed one. */
          <CourseBar
            pct={watchedPct}
            ariaLabel={`تقدّم المحاضرة ${lec.ordinal}`}
          />
        );
      },
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (lec) => {
        const we = lec.watchEvents?.[0];
        const completed = we?.completed ?? false;
        // r164d: checkpoints still open on this row (watch may be
        // complete while answers are not — surfaced as the flat flag).
        const rowPending = pendingCheckpoints(lec);
        const isNext = data.lectures.indexOf(lec) === nextLecIdx;
        return (
          <span className="flex flex-wrap items-center gap-1">
            {completed && <span className="sg-flag" data-tone="positive">مكتملة</span>}
            {rowPending > 0 && <span className="sg-flag">نقاط تفاعل متبقية</span>}
            {isNext && <span className="sg-flag" data-tone="signal">تابع من هنا</span>}
            {!completed && rowPending === 0 && !isNext && <span className="text-subtle">—</span>}
          </span>
        );
      },
    },
  ];

  /* R359 (final sweep) — the assignments ledger: title + kind, the
   * weight in the mono numeric register, the due date, and the §B2
   * due chip (dueChip + dueDays — the same whole-day arithmetic). */
  const assignmentColumns: DataSheetColumn<NonNullable<typeof data>['assignments'][number]>[] = [
    {
      key: 'title',
      label: 'الواجب',
      render: (a) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title">{a.title}</span>
          <span className="sg-cell-sub">{ASSIGNMENT_KIND_LABEL[a.type as AssignmentKind] ?? a.type}</span>
        </span>
      ),
    },
    {
      key: 'weight',
      label: 'الوزن',
      numeric: true,
      render: (a) => <>{formatInt(a.weight)}%</>,
    },
    {
      key: 'due',
      label: 'آخر موعد',
      mono: true,
      render: (a) => <bdi>{formatDateAr(a.dueAt)}</bdi>,
    },
    {
      key: 'state',
      label: 'الحالة',
      render: (a) => {
        const due = dueChip(dueDays(a.dueAt));
        return <StatusChip label={due.label} tone={due.tone} />;
      },
    },
  ];

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PageHeader
        eyebrow="طلاب الجامعة"
        title={data.course.name}
        breadcrumbs={[
          { label: 'مقرّراتي الدراسية', to: '/student/courses' },
          { label: data.course.name },
        ]}
        description={
          <>
            د. {data.teacher.firstName} {data.teacher.lastName} ·{' '}
            {countAr(data.course.credits, ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'])} · الفصل <bdi>{data.term}</bdi>
          </>
        }
        meta={<><Badge><bdi className="font-mono">{data.course.code}</bdi></Badge> · {data.course.department.name}</>}
      />

      {/* The continue strip — one unmistakable next action (the
          Coursera/edX course-home rule). Progress rides beside it.
          R305 (the reference): the strip is THE page's one-action rail — the
          foundation .r305s-next copper edge + accent wash replace the
          tinted hero band (the course tint survives in the progress
          fill and the curriculum rows below), and an .r305s-eyebrow
          micro-label classifies the moment: the next step, the done
          state, or the plan for an empty curriculum. */}
      <div
        className="course-continue r305s-next r305c-continue"
        style={{ '--course-tint': tint } as CSSProperties}
      >
        <div className="course-continue-progress">
          <p className="r305s-eyebrow">
            {nextLec ? 'الخطوة التالية' : data.lectures.length > 0 ? 'اكتمل المنهج' : 'خطة المنهج'}
          </p>
          <div className="course-hero-progress-head">
            <span className="course-hero-progress-label">تقدّمك في المنهج</span>
            <span className="course-hero-progress-value">{progressValue}%</span>
          </div>
          <ProgressBar value={lecProgress} color={tint} showValue={false} ariaLabel="نسبة إكمال محاضرات المقرر" />
          <div className="course-hero-progress-note">
            {countAr(watchedCount, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة'])} من {data.lectures.length}
          </div>
        </div>
        {/* r164d (course flow): THE primary «التالي» CTA — jumps
            straight to the first unfinished lecture; when nothing is
            left, the honest done state replaces the button (no dead
            CTA). */}
        {nextLec ? (
          <div className="course-continue-next">
            <Link to={`/student/lectures/${nextLec.id}`} className="btn primary" title={nextLec.title}>
              <Icon icon={Play} size={13} />
              التالي: المحاضرة <bdi>{nextLec.ordinal}</bdi>
              {/* ChevronLeft = the RTL forward direction (matches
                  the player's next-lecture button). */}
              <Icon icon={ChevronLeft} size={13} />
            </Link>
            <div
              className="course-hero-progress-note"
              style={nextPending > 0
                ? { color: 'var(--warning-ink)' }
                : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={nextLec.title}
            >
              {nextPending > 0
                ? `تبقى نقاط تفاعل لم تُجب (${nextPending})`
                : nextLec.title}
            </div>
          </div>
        ) : data.lectures.length > 0 ? (
          /* R359 (colour law): the done badge joins the flat hairline
             flag register — words + tone ink, no tinted pill. */
          <span className="sg-flag" data-tone="positive">
            <Icon icon={CheckCircle2} size={13} aria-hidden="true" />
            أنهيت محاضرات المقرّر
          </span>
        ) : null}
      </div>

      {/* R359 (final sweep) — the course's own facts as ONE KpiBand in
          the framed sheet (the r221 stat line joins the dimension-string
          register). Every numeral derives from the live /full payload. */}
      <SheetSection index="01" caption="COURSE SHEET" title="مؤشرات المقرّر" pad="none">
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'LECTURES',
              label: 'المحاضرات',
              value: data.lectures.length,
              delta: countAr(watchedCount, ['واحدة مكتملة', 'مكتملتان', 'مكتملة', 'مكتملة']),
            },
            {
              index: '02',
              caption: 'MATERIALS',
              label: 'المواد المرفقة',
              value: data.materials.length,
              delta: countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً']),
            },
            {
              index: '03',
              caption: 'ASSIGNMENTS',
              label: 'الواجبات',
              value: data.assignments.length,
              delta: 'هذا الفصل',
            },
            {
              index: '04',
              caption: 'CLASSMATES',
              label: 'الطلاب المسجَّلون',
              value: data._count.enrollments,
            },
          ]}
        />
      </SheetSection>

      {/* Lectures — the curriculum ledger. heading="h2" (PP-X2 / audit
          P3-24): SR heading navigation can jump between the page's
          sections instead of meeting a single H1 + anonymous card
          titles. R359 (final sweep): the section joins the framed sheet
          grammar — the watched/total ratio rides the head's aside slot
          (mono for sighted readers; the counted Arabic phrase stays for
          assistive tech). */}
      <section aria-label="محاضرات المقرر" className="course-lectures">
        <SheetSection
          index="02"
          caption="CURRICULUM"
          title="المحاضرات"
          pad="none"
          aside={
            data.lectures.length > 0 ? (
              <span>
                <bdi className="r319s-mono r319s-count" dir="ltr" aria-hidden="true">
                  {formatInt(watchedCount)}/{formatInt(data.lectures.length)}
                </bdi>
                <span className="sr-only">
                  أكملت {countAr(watchedCount, ['محاضرة واحدة', 'محاضرتين', 'محاضرات', 'محاضرة'])} من {countAr(data.lectures.length, ['محاضرة واحدة', 'محاضرتين', 'محاضرات', 'محاضرة'])}
                </span>
              </span>
            ) : undefined
          }
        >
          {!data.lectures.length ? (
            <div className="sg-pad-in">
              <EmptyCell
                label="لم تُرفع محاضرات بعد"
                note="سيقوم الأستاذ بإضافة المحاضرات تباعاً مع تقدّم الفصل."
              />
            </div>
          ) : (
            <>
              {data.lectures.length > 3 && (
                <div className="sg-pad-in">
                  <FilterBar
                    filters={
                      <div className="courses-filter" role="group" aria-label="تصفية المحاضرات حسب الحالة">
                        {LECTURE_FILTERS.map((f) => {
                          const n = f.key === 'all' ? data.lectures.length : f.key === 'done' ? doneCount : openCount;
                          return (
                            <button
                              key={f.key}
                              type="button"
                              className={`pill${lecFilter === f.key ? ' on' : ''}`}
                              aria-pressed={lecFilter === f.key}
                              onClick={() => setLecFilter(f.key)}
                            >
                              {f.label}
                              <span className="courses-filter-count" aria-hidden>{formatInt(n)}</span>
                            </button>
                          );
                        })}
                      </div>
                    }
                  />
                </div>
              )}
              {filteredLectures.length === 0 ? (
                <div className="sg-pad-in">
                  <EmptyCell
                    label="لا محاضرات في هذا التصنيف"
                    note={lecFilter === 'done'
                      ? 'لم تُكمل محاضرة كاملة بعد — «تابع من هنا» يقودك إلى أول محاضرة غير منتهية.'
                      : 'كل محاضرات المقرر مكتملة عندك — أنجزت المنهج كاملاً.'}
                  />
                </div>
              ) : (
                <DataSheet
                  caption="محاضرات المقرر"
                  columns={lectureColumns}
                  rows={filteredLectures}
                  /* the «تابع من هنا» row spends the ONE royal pin —
                     the row the continue strip points at. */
                  rowTone={(lec) => (data.lectures.indexOf(lec) === nextLecIdx ? 'signal' : undefined)}
                />
              )}
            </>
          )}
        </SheetSection>
      </section>

      {/* Materials + Schedule — the lateral 2:1 division keeps its
          geometry; each board joins the framed sheet grammar. */}
      <div className="grid-2-1">
        <section aria-label="المواد المرفقة">
        <SheetSection
          index="03"
          caption="MATERIALS"
          title="المواد المرفقة"
          pad="none"
          aside={
            data.materials.length > 0 ? (
              <BarCount
                n={data.materials.length}
                srLabel={countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً'])}
              />
            ) : undefined
          }
        >
          {!data.materials.length ? (
            <div className="sg-pad-in">
              <EmptyCell
                label="الأستاذ لم يرفع مواد بعد"
                note="ستظهر هنا الملفات والمراجع فور رفعها — العروض التقديمية، أوراق العمل، والقراءات."
              />
            </div>
          ) : (
            <div className="sg-pad-in flex-col gap-2">
              {data.materials.map((m) => {
                const label = MATERIAL_TYPE_LABEL[m.type as keyof typeof MATERIAL_TYPE_LABEL] ?? m.type;
                /* r144 (T1-h F8) made the row a real link; r164d
                 * (course flow) routes the target through the canonical
                 * materialHref helper (the DownloadsPage contract)
                 * instead of an inline regex: the /files/materials/
                 * namespace (uploaded course PDFs) previously fell
                 * through to a raw relative href that the SPA can't
                 * serve with the Bearer token — a dead click — and
                 * reserved demo hosts now read as the honest
                 * «غير متوفر بعد» non-link. The helper's ?back= rides
                 * /student/downloads (a valid, coherent destination). */
                const target = materialHref({ url: m.url, name: m.name });
                const body = (
                  <>
                    <Icon icon={MATERIAL_TYPE_ICON[m.type as MaterialType] ?? FileText} size={16} className="text-muted" />
                    <div className="list-row-body">
                      <div className="list-row-title" title={m.name}>{m.name}</div>
                      <div className="list-row-sub"><bdi>{label}</bdi> · {formatDateAr(m.createdAt)}</div>
                    </div>
                    {/* r157 (W2-F7): the trailing type Badge is deleted — the
                        sub line already carries the same label (and now the
                        icon encodes it too); the row read “PDF · PDF”. */}
                  </>
                );
                if (target.kind === 'viewer') {
                  return <Link key={m.id} className="list-row" to={target.to}>{body}</Link>;
                }
                if (target.kind === 'external') {
                  return (
                    <a key={m.id} className="list-row" href={target.href} target="_blank" rel="noreferrer">
                      {body}
                    </a>
                  );
                }
                return (
                  <div key={m.id} className="list-row">
                    {body}
                    <span className="text-xs text-subtle" role="note">غير متوفر بعد</span>
                  </div>
                );
              })}
            </div>
          )}
        </SheetSection>
        </section>

        <section aria-label="الجدول الأسبوعي">
        <SheetSection
          index="04"
          caption="WEEKLY SCHEDULE"
          title="الجدول الأسبوعي"
          pad="none"
          aside={
            data.schedule.length > 0 ? (
              <BarCount
                n={data.schedule.length}
                srLabel={countAr(data.schedule.length, ['حصة أسبوعية واحدة', 'حصتان أسبوعيتان', 'حصص أسبوعية', 'حصة أسبوعية'])}
              />
            ) : undefined
          }
        >
          {!data.schedule.length ? (
            <div className="sg-pad-in">
              <EmptyCell
                label="لم يُنشَر جدول هذا المقرّر بعد"
                note="سيظهر هنا فور تثبيت مواعيد المحاضرات الأسبوعيّة."
              />
            </div>
          ) : (
            <div className="sg-pad-in flex-col gap-2">
              {data.schedule.map((s) => (
                <div key={s.id} className="list-row">
                  <span className="list-row-meta"><bdi className="font-mono">{s.startTime}–{s.endTime}</bdi></span>
                  <div className="list-row-body">
                    <div className="list-row-title">{WEEKDAY_NAMES_AR[s.dayOfWeek] ?? '—'}</div>
                    <div className="list-row-sub">{s.room ?? 'قاعة تُحدَّد لاحقاً'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetSection>
        </section>
      </div>

      <section aria-label="واجبات المقرر">
      {/* R359 (final sweep): the assignments ledger joins the DataSheet
          register — mono weights + dates + the §B2 due chips. */}
      <SheetSection
        index="05"
        caption="ASSIGNMENTS"
        title="الواجبات"
        pad="none"
        aside={
          data.assignments.length > 0 ? (
            <BarCount
              n={data.assignments.length}
              srLabel={countAr(data.assignments.length, ['واجب واحد', 'واجبان', 'واجبات', 'واجباً'])}
            />
          ) : undefined
        }
      >
        <div className="sg-pad-in">
          <p className="r305c-sec-note">مواعيد التسليم ووزن كل واجب في درجة المقرر — التسليم من صفحة مقرّراتك.</p>
        </div>
        {!data.assignments.length ? (
          <div className="sg-pad-in">
            <EmptyCell
              label="لا توجد واجبات نشطة"
              note="حالياً لا شيء بانتظارك في هذا المقرر. وقت جيد لمراجعة المحاضرات السابقة."
            />
          </div>
        ) : (
          <DataSheet
            caption="قائمة واجبات المقرر"
            columns={assignmentColumns}
            rows={[...data.assignments].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())}
          />
        )}
      </SheetSection>
      </section>
    </PageFrame>
    </div>
  );
}
