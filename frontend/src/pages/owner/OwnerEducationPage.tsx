import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Card, ProgressBar } from '../../components/primitives';
/* R304: the education overview opens with the patterns PageHeader —
 * breadcrumbs back to the owner dashboard.
 * R359 (W2-e): the overview rides the sheet grammar — the KpiBand
 * facts + the four framed sections; the top-courses register rides
 * the DataSheet. The workload meters keep the ProgressBar (the
 * sanctioned meter register). */
import { PageHeader as PatternsPageHeader, KpiBand, SheetSection, DataSheet, type DataSheetColumn } from '../../components/patterns';
import {
  ErrorState, EmptyState, ChartSkeleton, TableSkeleton, ListSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, chartColors, valueLabels, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerEducation } from '../../hooks/useOwner';
import { useReducedMotion } from '../../components/motion';
import { formatNum } from '../../utils/numbers';
/* r299: the strip's shape-matched skeleton — the owner family's shared
 * helper (this page's local EduStripSkeleton twin died with it). */
import { StatStripSkeleton } from '../../components/owner/StripSkeletons';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

/** Proper Arabic counted plural for teacher counts (bucket labels). */
function teachersCountLabel(n: number): string {
  if (n === 0) return 'لا أساتذة';
  if (n === 1) return 'أستاذ واحد';
  if (n === 2) return 'أستاذان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} أساتذة`;
  return `${formatNum(n)} أستاذاً`;
}

/** Proper Arabic counted plural for the faculty count (chart summary). */
function facultiesCountLabel(n: number): string {
  if (n === 1) return 'كلية واحدة';
  if (n === 2) return 'كليتان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} كليات`;
  return `${formatNum(n)} كلية`;
}

/** The StatStrip's shape-matched pending placeholder (R190 D4 — the
 *  resolved band is the strip, so the strip's cells are what the
 *  skeleton must occupy) — r299: consumed from the owner family's
 *  shared StripSkeletons helper (the local twin died). */

export function OwnerEducationPage() {
  const q = useOwnerEducation();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();
  const edu = q.data;

  // Chart data/options are memoized (audit 11-f P2-2): react-chartjs-2
  // re-applies any identity-changed prop with an animated chart.update(),
  // so every unrelated re-render used to churn both charts. chartColors()
  // resolves CSS custom properties at call time — it is resolved once per
  // theme flip and captured by the data memos, while the option factories
  // re-resolve inside their own memos keyed on the same themeKey.
  const c = useMemo(() => {
    void themeKey;
    return chartColors();
  }, [themeKey]);

  const barData = useMemo(() => ({
    labels: (edu?.byFaculty ?? []).map((f) => f.name),
    datasets: [{
      label: 'عدد المقررات',
      data: (edu?.byFaculty ?? []).map((f) => f.courseCount),
      backgroundColor: `color-mix(in srgb, ${c.accent} 60%, transparent)`,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [edu, c]);

  const barOptions = useMemo(() => {
    void themeKey;
    void reducedMotion;
    return { ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const };
  }, [themeKey, reducedMotion]);

  /* 22-b (4-A7 P3-2): bar-end value labels via the shared theme's
   * valueLabels plugin (the admin pages' convention) — the reader no
   * longer has to trace the axis for a count. Every bar carries a
   * non-zero count since 22-b's API fold drops zero-course faculties
   * (4-A7 P1-3), so no empty bar gets a meaningless "0". */
  const barPlugins = useMemo(() => [valueLabels], []);

  const lineData = useMemo(() => ({
    labels: (edu?.attendanceTrend ?? []).map((t) => t.month),
    datasets: [{
      label: 'نسبة الحضور %',
      data: (edu?.attendanceTrend ?? []).map((t) => t.attendancePct ?? null),
      borderColor: c.success,
      backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: c.success,
      spanGaps: true,
    }],
  }), [edu, c]);

  const lineOptions = useMemo(() => {
    void themeKey;
    void reducedMotion;
    const base = cartesianOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales!.y, min: 0, max: 100 },
      },
    };
  }, [themeKey, reducedMotion]);

  if (q.isPending) {
    return (
      /* r305-A8: the marker rides EVERY branch — pending included —
         so the scoped sheet reaches the skeleton band too. */
      <div className="page r305ao" aria-busy="true">
        <PatternsPageHeader
          eyebrow="مالك المنصّة"
          title="النظرة التعليميّة"
          /* r351 A2 (Q3): loading-status description retired — the
           * skeletons + aria-busy already say it. */
          breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
        />
        {/* Shape-matched skeletons — one per card the data will fill. */}
        <StatStripSkeleton />
        <Card title="المقرّرات حسب الكلّيّة"><ChartSkeleton height={240} /></Card>
        <Card title="أكثر المقرّرات تسجيلاً"><TableSkeleton rows={5} cols={4} /></Card>
        <Card title="توزيع حِمل أعضاء هيئة التدريس"><ListSkeleton rows={5} /></Card>
        <Card title="اتّجاه الحضور"><ChartSkeleton height={240} /></Card>
      </div>
    );
  }
  if (q.isError || !edu) {
    return (
      /* r305-A8: the marker rides EVERY branch — the honest error
         state renders under the same scoped grammar. */
      <div className="page r305ao">
        <PatternsPageHeader
          eyebrow="مالك المنصّة"
          title="النظرة التعليميّة"
          breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
        />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }

  const { totals, byFaculty = [], topCourses = [], workloadBuckets = { idle: 0, one: 0, two: 0, three: 0, fourPlus: 0 }, attendanceTrend = [] } = edu;

  const totalTeachers =
    workloadBuckets.idle +
    workloadBuckets.one +
    workloadBuckets.two +
    workloadBuckets.three +
    workloadBuckets.fourPlus;
  const pct = (n: number) => (totalTeachers > 0 ? Math.round((n / totalTeachers) * 100) : 0);

  const barHeight = Math.max(220, byFaculty.length * 36);

  const trendHasData = attendanceTrend.some((t) => t.attendancePct !== null);
  const trendMax = attendanceTrend.length > 0
    ? Math.max(...attendanceTrend.map((t) => t.attendancePct ?? 0))
    : 0;

  // Workload buckets — share-of-teachers meters (owner.css §6-b); the
  // staggered fill on load is the page's authored moment.
  /* R359 (W2-e) — the top-courses register columns. */
  const topCourseColumns: DataSheetColumn<(typeof topCourses)[number]>[] = [
    { key: 'code', label: 'الرمز', mono: true, render: (c) => <bdi>{c.code}</bdi> },
    { key: 'name', label: 'اسم المقرّر', render: (c) => <span className="sg-cell-title">{c.name}</span> },
    { key: 'faculty', label: 'الكلّيّة', render: (c) => <span className="sg-cell-sub">{c.facultyName}</span> },
    { key: 'enrolled', label: 'المسجَّلون', numeric: true, render: (c) => formatNum(c.enrolled) },
  ];

  const buckets: Array<{ label: string; n: number; color: string; aria: string }> = [
    { label: 'بدون عرض هذا الفصل', n: workloadBuckets.idle, color: 'var(--neutral-400)', aria: 'نسبة الأساتذة بدون عرض هذا الفصل' },
    { label: 'عرض واحد', n: workloadBuckets.one, color: c.accent, aria: 'نسبة الأساتذة بعرض واحد هذا الفصل' },
    { label: 'عرضان', n: workloadBuckets.two, color: c.success, aria: 'نسبة الأساتذة بعرضين هذا الفصل' },
    { label: '3 عروض', n: workloadBuckets.three, color: c.gold, aria: 'نسبة الأساتذة بثلاثة عروض هذا الفصل' },
    { label: '4 فأكثر', n: workloadBuckets.fourPlus, color: c.warning, aria: 'نسبة الأساتذة بأربعة عروض فأكثر هذا الفصل' },
  ];

  return (
    /* r305-A8 «ds»: page-root marker — meters (owner-workload),
       tables and chart containers all key off the scoped sheet. */
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="مالك المنصّة"
        title="النظرة التعليميّة"
        /* r351 A2 (Q3): header description retired — the KPI strip
         * names its own subjects. */
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
        /* R341 D11: the [08] nav-order gutter numeral (OWNER_NAV
         * register — the D10 quality precedent). */
        /* D11 (D8/D10 header-CTA precedent): the overview's sibling
         * surfaces — the accounts directory behind the teacher
         * workload buckets (primary) + the institutions whose
         * faculties the course counts aggregate (ghost).
         * Navigation-only; the page is read-only. */
        actions={(
          <>
            <Link to="/owner/users" className="btn accent sm">المستخدمون</Link>
            <Link to="/owner/institutions" className="btn ghost sm">المؤسسات</Link>
          </>
        )}
      />

      {/* R359 (W2-e) — the KPI band: the four education facts as live
          numerals (the resolved branch guarantees the payload). r299:
          no trend notes — each one restated its own label in different
          words. */}
      <KpiBand
        items={[
          { index: '01', caption: 'COURSES', label: 'إجمالي المقرّرات', value: totals.totalCourses },
          { index: '02', caption: 'TEACHERS', label: 'عدد الأساتذة', value: totals.teachers },
          { index: '03', caption: 'OFFERINGS', label: 'العروض النشطة', value: totals.totalOfferings },
          { index: '04', caption: 'AVG ENROLMENT', label: 'متوسط التسجيل في العرض', value: totals.avgEnrolment },
        ]}
      />

      {/* r351 A2 (Q3): card subtitle retired — the title + axis labels say it. */}
      <SheetSection index="01" caption="COURSES BY FACULTY" title="المقرّرات حسب الكلّيّة">
        {byFaculty.length === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <EmptyState illustration="empty-courses" title="لا مقرّرات بعد" description="" />
        ) : (
          <ChartFrame
            ariaLabel="مخطط أعمدة أفقي — عدد المقرّرات في كل كلّيّة"
            summary={`${facultiesCountLabel(byFaculty.length)} بها مقرّرات؛ أكبرها ${byFaculty.reduce((a, b) => (b.courseCount > a.courseCount ? b : a)).name}.`}
            table={{
              caption: 'المقرّرات حسب الكلّيّة',
              columns: ['الكلّيّة', 'عدد المقرّرات'],
              rows: byFaculty.map((f) => [f.name, f.courseCount]),
            }}
            height={barHeight}
          >
            <Bar key={themeKey} data={barData} options={barOptions} plugins={barPlugins} />
          </ChartFrame>
        )}
      </SheetSection>

      <SheetSection index="02" caption="TOP COURSES" title="أكثر المقرّرات تسجيلاً" pad="none">
        {topCourses.length === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <div className="sg-pad-in">
            <EmptyState illustration="empty-list" title="لا تسجيلات بعد" description="" />
          </div>
        ) : (
          /* R359 (W2-e): the register rides the DataSheet — mono codes,
           * the cell-stack identity, numeric enrolments. The composite
           * row key (two faculties can carry the same code — R190 D4)
           * stays the page's own concern via the rows array identity. */
          <DataSheet
            caption="أكثر المقرّرات تسجيلاً"
            columns={topCourseColumns}
            rows={topCourses}
          />
        )}
      </SheetSection>

      <SheetSection
        index="03"
        caption="WORKLOAD"
        title="توزيع حِمل أعضاء هيئة التدريس"
        /* r351 A2 (Q3): subtitle retired — the bucket labels below
         * name the offering counts. */
      >
        {totalTeachers === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <EmptyState illustration="empty-list" title="لا يوجد أساتذة بعد" description="" />
        ) : (
          <div className="owner-workload">
            {buckets.map((b, i) => (
              <div key={b.label} className="owner-meter" style={{ '--meter-i': i } as CSSProperties}>
                <ProgressBar
                  value={pct(b.n)}
                  label={`${b.label} (${teachersCountLabel(b.n)})`}
                  ariaLabel={b.aria}
                  color={b.color}
                />
              </div>
            ))}
          </div>
        )}
      </SheetSection>

      {/* r351 A2 (Q3): subtitle trimmed to the data window («آخر 6 أشهر»)
          — the computation-source aside retired. */}
      <SheetSection index="04" caption="ATTENDANCE" title="اتّجاه الحضور" aside={<span className="sg-label">آخر 6 أشهر</span>}>
        {!trendHasData ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <EmptyState illustration="empty-list" title="لا توجد سجلّات حضور بعد" description="" />
        ) : (
          <ChartFrame
            ariaLabel="مخطط خطّي لاتّجاه نسبة الحضور الشهريّة على مدى آخر ستة أشهر"
            summary={`أعلى نسبة حضور مسجَّلة ${trendMax}%.`}
            table={{
              caption: 'اتّجاه الحضور الشهري',
              columns: ['الشهر', 'نسبة الحضور %'],
              rows: attendanceTrend.map((t) => [t.month, t.attendancePct ?? '—']),
            }}
            height={240}
          >
            <Line key={themeKey} data={lineData} options={lineOptions} />
          </ChartFrame>
        )}
      </SheetSection>
    </div>
  );
}
