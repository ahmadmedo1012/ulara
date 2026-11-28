import { useMemo, useState, type ReactNode } from 'react';
import { useInRouterContext, Link } from 'react-router-dom';
import {
  MapPin,
  BadgeCheck, GraduationCap,
} from 'lucide-react';
/* R359 (A3) — the sheet grammar: the KPI band of real payload counts +
 * the DataSheet register (mono numerics, two-line cells, labelled
 * cards ≤640px) inside the framed [01] JOB BOARD section replace the
 * §B2 SectionBar + hand-rolled .jobs-table (the roster exemplar's
 * recomposition). */
import { SheetSection, KpiBand, DataSheet, SheetEmpty, type DataSheetColumn } from '../../components/patterns';
import podiumScene from '../../assets/art-v2/podium-scene.webp';
/* R319 (c3-S2) — the §B2 mono status chip (the APPLIED register). */
import { StatusChip } from '../../components/student';
import { ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { PageFrame, PageHeader, FilterBar } from '../../components/patterns';
import { useJobs, useApplyJob, apiErrorMessage, type Job } from '../../hooks/useResources';
import { formatDate, formatInt } from '../../utils/numbers';
import { countAr } from '../../lib/format';
/* R305 DS: the shared student vocabulary + this family's refinements. */
import '../../styles/student/ds-core.css';
import '../../styles/student/ds-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 anatomy + the family's
 * harmonics. */
import '../../styles/student/pages.css';
import '../../styles/student/academic-pages.css';

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
  REMOTE: 'عن بُعد',
};

/** Proper Arabic counted noun for the open-opportunities line
 *  (countAr owns the one/two/few/many forms). */
function openJobsLabel(n: number): string {
  return countAr(n, ['فرصة واحدة مفتوحة', 'فرصتان مفتوحتان', 'فرص مفتوحة', 'فرصة مفتوحة']);
}

/* R342-08 — the header pair's anchor: the 18-G pin renders this page
 * WITHOUT a Router (bare QueryClientProvider), so a bare <Link> would
 * throw on the missing context. An honest anchor either way: in-app
 * it rides the SPA Link; bare unit renders degrade to a plain href. */
function JobsHeaderAction({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  const inRouter = useInRouterContext();
  if (!inRouter) return <a href={to} className={className}>{children}</a>;
  return <Link to={to} className={className}>{children}</Link>;
}

/** Relative posting age with proper Arabic plurals (audit 0-d —
 *  postedAt was fetched but never shown). */
function fmtPosted(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days === 2) return 'منذ يومين';
  if (days <= 10) return `منذ ${days} أيام`;
  if (days <= 30) return `منذ ${days} يوماً`;
  return formatDate(d, { day: 'numeric', month: 'short' });
}

/** The row's apply verb + its honest states. `applied` is the SERVER
 *  truth seeded from the payload's appliedJobIds (18-G) plus any
 *  application this session landed — the old useState(false) was
 *  client-local fiction, un-liking the badge on every remount while
 *  the server row persisted. R359: the verb + its inline failure
 *  render inside the DataSheet actions cell (the old full-width
 *  error row dies with the hand-rolled table). */
function JobActions({ job, applied }: { job: Job; applied: boolean }) {
  const apply = useApplyJob();
  // Optimistic in-session flag: pressing تقدّم shows the badge before the
  // invalidation refetch confirms it (a failure rolls it back below).
  const [justApplied, setJustApplied] = useState(false);
  const isApplied = applied || justApplied;

  const onApply = async () => {
    try {
      await apply.mutateAsync(job.id);
      setJustApplied(true);
    } catch {
      // surfaced inline from apply.isError below
    }
  };

  if (isApplied) {
    /* R319 (c3-S2): the applied state rides the §B2 mono chip
       register — square hairline ink, never a color-only Badge. */
    return <StatusChip label="APPLIED" tone="done" />;
  }
  return (
    <span className="sg-cell-stack">
      <button
        type="button"
        className="btn primary sm"
        onClick={() => void onApply()}
        disabled={apply.isPending}
      >
        {apply.isPending ? 'جارٍ التقديم…' : 'تقدّم'}
      </button>
      {apply.isError && (
        <p className="job-apply-error" role="alert">
          {apiErrorMessage(apply.error, 'تعذّر إرسال طلب التقديم — حاول مرة أخرى.')}
        </p>
      )}
    </span>
  );
}

export default function JobsPage() {
  const { data, isPending, isError, error, refetch } = useJobs();
  // 18-G: the payload carries the viewer's applications beside the
  // jobs — the «تمّ التقديم» badge starts from server truth.
  const jobs = useMemo(() => data?.data ?? [], [data]);
  const appliedJobIds = new Set(data?.appliedJobIds ?? []);

  /* Client-side filter over the loaded rows by النوع — the type
     column's own values. No new hooks, no server round-trip. */
  const [type, setType] = useState<'ALL' | Job['type']>('ALL');
  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.type))), [jobs]);
  const isFiltering = type !== 'ALL';
  const filtered = isFiltering ? jobs.filter((j) => j.type === type) : jobs;

  /* R359 — the board's columns: the job as a two-line cell (title +
     company), the salary in the mono numeric register, the posting age
     in mono with its full date on title, and the apply verb (or the
     APPLIED chip) in the last cell. */
  const columns: DataSheetColumn<Job>[] = [
    {
      key: 'title',
      label: 'الوظيفة',
      render: (j) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title" title={j.title}>{j.title}</span>
          <span className="sg-cell-sub" title={j.company}>{j.company}</span>
        </span>
      ),
    },
    {
      key: 'location',
      label: 'الموقع',
      render: (j) => (
        <span className="flex items-center gap-1">
          <Icon icon={MapPin} size={12} aria-hidden /> {j.location}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      render: (j) => TYPE_LABELS[j.type] ?? j.type,
    },
    {
      key: 'salary',
      label: 'الراتب',
      numeric: true,
      render: (j) => (j.salary ? <bdi>{j.salary}</bdi> : 'حسب الاتفاق'),
    },
    {
      key: 'posted',
      label: 'النشر',
      mono: true,
      render: (j) => (
        <span title={formatDate(j.postedAt, { dateStyle: 'long' })}>{fmtPosted(j.postedAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'الإجراء',
      render: (j) => <JobActions job={j} applied={appliedJobIds.has(j.id)} />,
    },
  ];

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PageHeader
        eyebrow="طلاب الجامعة"
        title="فرص العمل"
        description="وظائف وفرص تدريب تجريبية مفتوحة لطلاب وخرّيجي الجامعة (بيانات عرض)."
        /* R342-08 — the header CTA pair (the D11/D8 measured seat;
           the phone band hides the topbar «اسأل AI» ≤920, D6):
           «مهاراتي» is the growth surface an application rides on,
           «التطوير الذاتي» is the tracks family that grows them —
           the growth group's honest siblings (navigation-only). */
        actions={(
          <>
            <JobsHeaderAction to="/student/skills" className="btn primary sm">
              <Icon icon={BadgeCheck} size={13} />
              مهاراتي
            </JobsHeaderAction>
            <JobsHeaderAction to="/training" className="btn ghost sm">
              <Icon icon={GraduationCap} size={13} />
              التطوير الذاتي
            </JobsHeaderAction>
          </>
        )}
      />

      {isPending ? (
        /* R359 — the pending mirror: the framed sheet + the DataSheet's
           own skeleton body (the table IS the body). */
        <SheetSection index="01" caption="JOB BOARD" title="فرص العمل المفتوحة" pad="none">
          <DataSheet caption="فرص العمل" columns={columns} rows={[]} loading />
        </SheetSection>
      ) : isError ? (
        <SheetSection index="01" caption="JOB BOARD" title="فرص العمل المفتوحة">
          <ErrorState error={error} onRetry={() => refetch()} />
        </SheetSection>
      ) : jobs.length === 0 ? (
        /* R359: the empty board is the sheet's reserved-but-empty
           region — the hairline placeholder frame (same honest copy). */
        <SheetSection index="01" caption="JOB BOARD" title="فرص العمل المفتوحة">
          <SheetEmpty
            code="NO-POSTINGS"
            title="لا توجد فرص نشطة هذا الأسبوع"
            desc="نضيف فرص التوظيف والتدريب من شركات وطنية وعربية بشكل دوري. ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
          />
        </SheetSection>
      ) : (
        <>
          {/* R359 — the KPI band: every numeral derives from the live
              payload (the loaded rows · the distinct types actually on
              the board · the server-truth applications count). */}
          <KpiBand
            items={[
              {
                index: '01',
                caption: 'OPENINGS',
                label: 'فرص مفتوحة على اللوحة',
                value: jobs.length,
              },
              {
                index: '02',
                caption: 'TYPES',
                label: 'أنواع عقود متاحة للتصفية',
                value: types.length,
              },
              {
                index: '03',
                caption: 'APPLIED',
                label: 'طلبات قدّمتها من هذه اللوحة',
                value: appliedJobIds.size,
              },
            ]}
          />

          <FilterBar
            filters={
              <div className="flex items-center gap-2" role="group" aria-label="تصفية فرص العمل حسب النوع">
                <button
                  type="button"
                  className={`pill${type === 'ALL' ? ' on' : ''}`}
                  aria-pressed={type === 'ALL'}
                  onClick={() => setType('ALL')}
                >
                  الكل
                </button>
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`pill${type === t ? ' on' : ''}`}
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                  >
                    {TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            }
          />

          {/* R359 — the board sheet: the counted line rides the head
              rule's aside slot; pad=none (the table IS the body). */}
          <SheetSection
            index="01"
            caption="JOB BOARD"
            title="فرص العمل المفتوحة"
            aside={(
              /* The counted line — honest about the filtered subset
                  (R305 DS: the accent dot = live fact chip). */
              <p className="jobs-count" aria-live="polite" style={{ margin: 0 }}>
                <span className="r305s-chip r305s-chip--accent">
                  <span className="r305s-chip-dot" aria-hidden />
                  <bdi>
                    {openJobsLabel(filtered.length)}
                    {isFiltering ? ` من أصل ${formatInt(jobs.length)}` : ''}
                  </bdi>
                </span>
              </p>
            )}
            pad="none"
          >
            {filtered.length === 0 ? (
              /* R359: the empty filter bucket — the hairline
                 placeholder frame (the CoursesPage filter-bucket
                 precedent). */
              <SheetEmpty
                code="NO-MATCH"
                title="لا توجد فرص ضمن هذا النوع"
                desc="اختر نوعاً آخر من الأزرار أعلاه — كل الفرص المفتوحة تظهر تحت «الكل»."
                art={podiumScene}
              />
            ) : (
              <DataSheet
                caption="فرص العمل"
                columns={columns}
                rows={filtered}
              />
            )}
          </SheetSection>
        </>
      )}
    </PageFrame>
    </div>
  );
}
