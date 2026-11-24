import { Line, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card } from '../../components/primitives';
/* R304: the governance console opens with the patterns PageHeader —
 * breadcrumbs back to the owner dashboard.
 * R359 (W2-e): the governance console rides the sheet grammar — the
 * KpiBand facts, the framed chart sections (the lateral rhythm), and
 * the daily/reason registers ride the DataSheet. */
import { PageHeader as PatternsPageHeader, KpiBand, SheetSection, DataSheet, type DataSheetColumn } from '../../components/patterns';
import {
  ErrorState, EmptyState, ChartSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { StatStripSkeleton } from '../../components/owner/StripSkeletons';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, radialOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerGovernance, useOwnerLoginAnalytics } from '../../hooks/useOwner';
import { countAr } from '../../lib/format';
import { useReducedMotion } from '../../components/motion';
import { formatNum } from '../../utils/numbers';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

/** The StatStrip's shape-matched pending placeholder (R190 D4 —
 *  three cells, one per governance fact) — r299: consumed from the
 *  owner family's shared StripSkeletons helper with cells={3} (the
 *  local GovStripSkeleton twin died). */

export function OwnerGovernancePage() {
  const governance = useOwnerGovernance();
  const loginAnalytics = useOwnerLoginAnalytics();
  const govData = governance.data;
  const loginData = loginAnalytics.data;
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();

  // Chart data/options are memoized (audit 11-f P2-2): either query
  // settling re-rendered the page and rebuilt every data/options object,
  // re-triggering react-chartjs-2's options reapply + animated update.
  // themeKey participates because the colors and option factories resolve
  // CSS custom properties at call time — the remounted canvas must
  // re-resolve them for the new theme.
  const c = useMemo(() => {
    void themeKey;
    return chartColors();
  }, [themeKey]);

  const growthChartData = useMemo(() => {
    if (!govData) return null;
    const weeklyGrowth = govData.weeklyGrowth ?? [];
    return {
      labels: weeklyGrowth.map((w) => w.week),
      datasets: [
        {
          label: 'مستخدمون جدد',
          data: weeklyGrowth.map((w) => w.count),
          borderColor: c.accent,
          backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
          fill: true,
          tension: 0.4,
          pointRadius: weeklyGrowth.length === 1 ? 5 : 4,
          pointHoverRadius: 7,
          pointBackgroundColor: c.accent,
        },
      ],
    };
  }, [govData, c]);

  /* 22-b (4-A7 P1-4): a COUNT series — weekly signups — must never
   * render fractional y-ticks (4.75→5.25 step 0.05 signalled false
   * precision around a single point). Extends the shared theme's
   * cartesianOptions exactly like the Education page's 0–100 y-clamp:
   * beginAtZero + ticks.precision 0 keeps the axis integer and
   * anchored at zero. (chartTheme's cartesianOptions itself stays
   * 4-A9-owned; this is a page-local scale override.) */
  const growthOptions = useMemo(() => {
    void themeKey;
    void reducedMotion;
    const base = cartesianOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales!.y,
          beginAtZero: true,
          ticks: { ...base.scales!.y?.ticks, precision: 0 },
        },
      },
      // Same cast idiom the theme factory itself uses — the spread of
      // the line|bar union scale needs narrowing back to the base type.
    } as typeof base;
  }, [themeKey, reducedMotion]);

  /* 22-b (4-A7 P3-6): the legend carries its counts («ناجحة · 156») so
   * the small legend text stops reading as empty labels next to the
   * ring's big center figure. */
  const doughnutData = useMemo(() => loginData ? {
    labels: [
      `ناجحة · ${formatNum(loginData.successCount)}`,
      `فاشلة · ${formatNum(loginData.failureCount)}`,
    ],
    datasets: [
      {
        data: [loginData.successCount, loginData.failureCount],
        backgroundColor: [c.success, c.warning],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  } : null, [loginData, c]);

  // The authored moment: the total attempt count lands in the doughnut's
  // center (ularaCenterLabelPlugin, metric type tokens) while the arcs
  // rotate in — the figure was previously invisible behind the legend.
  const doughnutOptions = useMemo(() => {
    void themeKey;
    void reducedMotion;
    return radialOptions({
      legend: true,
      centerLabel: loginData
        ? { value: formatNum(loginData.total), label: 'إجمالي المحاولات' }
        : undefined,
    });
  }, [loginData, themeKey, reducedMotion]);

  /* 22-b (4-A7 P1-4): one week of signups is not a trend — the card
   * title drops its window claim until a second week exists, the lone
   * point draws larger, and the summary states exactly how much data
   * there is.
   *
   * 6A10-8: the window is COMPUTED from weeklyGrowth.length for both
   * the visible title and the chart's aria-label — the old hard-coded
   * «(8 أسابيع)» claimed 8 weeks even when the API returned fewer
   * (a young platform, or a quiet log); a single week claims no
   * window at all on either surface. */
  const growthWeeks = govData?.weeklyGrowth.length ?? 0;
  const WEEK_WINDOW_FORMS: [string, string, string, string] = [
    'أسبوع واحد', 'أسبوعين', 'أسابيع', 'أسبوعاً',
  ];
  const growthWindow = growthWeeks > 1
    ? `آخر ${countAr(growthWeeks, WEEK_WINDOW_FORMS)}`
    : null;
  const growthTitle = growthWindow ? `نموّ المستخدمين (${growthWindow})` : 'نموّ المستخدمين';
  const growthAriaLabel = growthWindow
    ? `مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً على مدى ${growthWindow}`
    : 'مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً';

  /* R359 (W2-e) — the daily/reason register columns: mono dates and
   * reasons (bidi-isolated Latin runs), numeric counts. */
  const dailyColumns: DataSheetColumn<{ date: string; success: number; failure: number }>[] = [
    { key: 'date', label: 'التاريخ', mono: true, render: (d) => <bdi>{d.date}</bdi> },
    { key: 'success', label: 'ناجحة', numeric: true, render: (d) => formatNum(d.success) },
    { key: 'failure', label: 'فاشلة', numeric: true, render: (d) => formatNum(d.failure) },
  ];
  const reasonColumns: DataSheetColumn<{ reason: string; count: number }>[] = [
    { key: 'reason', label: 'السبب', mono: true, render: (r) => <bdi>{r.reason}</bdi> },
    { key: 'count', label: 'العدد', numeric: true, render: (r) => formatNum(r.count) },
  ];

  return (
    /* r305-A8 «ds»: page-root marker — stat strips, chart containers
       and tables all key off the scoped sheet's .r305ao selector. */
    <div className="page r305ao">
      <PatternsPageHeader
        title="الحوكمة المتقدّمة"
        eyebrow="مالك المنصّة"
        description="تتبّع الصلاحيات والنموّ وتحليل تسجيلات الدخول"
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'الحوكمة المتقدّمة' }]}
        /* R341 D11: the [13] nav-order gutter numeral (OWNER_NAV
         * register — the D10 quality precedent). */
        /* D11 (D8/D10 header-CTA precedent): the metrics' sibling
         * surfaces — the audit feed the permission/role counts derive
         * from (primary) + the accounts directory the growth reads
         * (ghost). Navigation-only; the page is read-only. */
        actions={(
          <>
            <Link to="/owner/activity" className="btn accent sm">سجلّ النشاط</Link>
            <Link to="/owner/users" className="btn ghost sm">المستخدمون</Link>
          </>
        )}
      />

      {/* Governance metrics — each area owns its pending/error state, so a
          failing endpoint never blanks the sections that resolved. */}
      {governance.isPending ? (
        <StatStripSkeleton cells={3} />
      ) : governance.isError || !govData ? (
        <Card>
          <ErrorState
            error={governance.error}
            message="تعذّر تحميل بيانات الحوكمة"
            onRetry={() => governance.refetch()}
          />
        </Card>
      ) : (
        /* R359 (W2-e) — the KPI band: raw monthly counts with no
         * comparison payload ride the neutral delta ink (the r299
         * law — no up/down tone the data never asserted). */
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'PERMISSIONS',
              label: 'تغييرات الصلاحيات',
              value: govData.permissionChanges,
              delta: 'تجاوزات موثّقة في السجلّ',
            },
            {
              index: '02',
              caption: 'ROLES',
              label: 'تغييرات الأدوار',
              value: govData.roleChanges,
              delta: 'تعيينات وتحويلات',
            },
            {
              index: '03',
              caption: 'NEW USERS',
              label: 'مستخدمون جدد هذا الشهر',
              value: govData.newUsersThisMonth,
              delta: 'من باب التسجيل',
            },
          ]}
        />
      )}

      {/* R359 (W2-e): the two chart sections ride the lateral rhythm. */}
      <div className="sg-cols" data-cols="2">
        <SheetSection index="01" caption="USER GROWTH" title={growthTitle}>
          {governance.isPending ? (
            <ChartSkeleton height={236} />
          ) : governance.isError || !govData ? (
            <ErrorState
              error={governance.error}
              message="تعذّر تحميل بيانات النموّ"
              onRetry={() => governance.refetch()}
            />
          ) : (govData.weeklyGrowth ?? []).length === 0 ? (
            <EmptyState illustration="empty-list" title="لا توجد بيانات نموّ بعد" description="سيُرسم المنحنى فور تسجيل أوّل مستخدم." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel={growthAriaLabel}
              summary={(govData.weeklyGrowth ?? []).length === 1
                ? `أسبوع واحد من البيانات حتى الآن — ${countAr(govData.weeklyGrowth[0]!.count, ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوعه الأول، ويُرسم المنحنى فور تسجيل الأسبوع القادم.`
                : `أعلى نموّ ${countAr(Math.max(...(govData.weeklyGrowth ?? []).map((w) => w.count)), ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوع واحد.`}
              table={{
                caption: 'نموّ المستخدمين الأسبوعي',
                columns: ['الأسبوع', 'مستخدمون جدد'],
                rows: (govData.weeklyGrowth ?? []).map((w) => [w.week, w.count]),
              }}
            >
              <Line key={themeKey} data={growthChartData!} options={growthOptions} />
            </ChartFrame>
          )}
        </SheetSection>

        {/* r134 فشل→تعذّر family canon: the title pairs the adjectives the
            doughnut legend and the daily table already use (ناجحة/فاشلة). */}
        <SheetSection index="02" caption="LOGIN OUTCOMES" title="تسجيلات الدخول: ناجحة / فاشلة">
          {loginAnalytics.isPending ? (
            <ChartSkeleton height={236} />
          ) : loginAnalytics.isError || !loginData ? (
            <ErrorState
              error={loginAnalytics.error}
              message="تعذّر تحميل تحليلات تسجيل الدخول"
              onRetry={() => loginAnalytics.refetch()}
            />
          ) : loginData.total === 0 ? (
            <EmptyState illustration="empty-list" title="لا توجد محاولات دخول بعد" description="سيظهر التوزيع فور أوّل محاولة تسجيل دخول." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel={`توزيع محاولات تسجيل الدخول: ${countAr(loginData.successCount, ['محاولة ناجحة واحدة', 'محاولتان ناجحتان', 'محاولات ناجحة', 'محاولة ناجحة'])} و${countAr(loginData.failureCount, ['محاولة فاشلة واحدة', 'محاولتان فاشلتان', 'محاولات فاشلة', 'محاولة فاشلة'])}`}
              summary={`نجحت ${countAr(loginData.successCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])} وتعذّرت ${countAr(loginData.failureCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}.`}
              table={{
                caption: 'محاولات تسجيل الدخول',
                columns: ['النتيجة', 'العدد'],
                rows: [
                  ['ناجحة', loginData.successCount],
                  ['فاشلة', loginData.failureCount],
                ],
              }}
            >
              <Doughnut key={themeKey} data={doughnutData!} options={doughnutOptions} />
            </ChartFrame>
          )}
        </SheetSection>
      </div>

      {/* r299: the .owner-governance-section wrapper died — it stacked
          its own padding on top of the .page gap (double rhythm).
          R359 (W2-e): the daily register rides the framed DataSheet. */}
      <SheetSection index="03" caption="DAILY LOGINS" title="تفاصيل تسجيلات الدخول اليوميّة" pad="none">
          {loginAnalytics.isPending ? (
            <TableSkeleton rows={5} cols={3} />
          ) : loginAnalytics.isError || !loginData ? (
            <ErrorState
              error={loginAnalytics.error}
              message="تعذّر تحميل تفاصيل تسجيل الدخول"
              onRetry={() => loginAnalytics.refetch()}
            />
          ) : loginData.daily.length === 0 ? (
            <EmptyState illustration="empty-list" title="لا توجد بيانات يوميّة" description="تُسجَّل المحاولات يوماً بيوم فور حدوثها." />
          ) : (
            <DataSheet
              caption="تفاصيل تسجيلات الدخول اليوميّة"
              columns={dailyColumns}
              rows={loginData.daily}
            />
          )}
        </SheetSection>

      {loginData && loginData.topReasons.length > 0 && (
        <SheetSection index="04" caption="TOP REASONS" title="أسباب تعذّر تسجيل الدخول" pad="none">
          <DataSheet
            caption="أسباب تعذّر تسجيل الدخول"
            columns={reasonColumns}
            rows={loginData.topReasons}
          />
        </SheetSection>
      )}
    </div>
  );
}
