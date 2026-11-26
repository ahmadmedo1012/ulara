import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, BookOpen, BarChart3, FileText, TrendingUp, ClipboardCheck, AlertTriangle, Search, X, ChevronDown, ArrowLeft, Plus, Trash2, GraduationCap, Activity } from 'lucide-react';
import { Card, Tabs, UserAvatar, AlertRow, FormField } from '../../components/primitives';
import { StatStrip, LedgerPanel, LedgerRow } from '../../components/primitives/Ledger';
/* R304 (workstream 4D): the admin family rides the shell patterns —
 * the patterns PageHeader opens every route (breadcrumbs back to the
 * dashboard, one semantic h1) and the FilterBar is the one control
 * rail above the rosters (search → filter → action, the family
 * order). The local header twin this page carried since 5-A8 retired
 * with the r288 anatomy fold. */
import { PageHeader as PatternsPageHeader, FilterBar } from '../../components/patterns';
/* R359 final — the sheet grammar primitives: the framed section, the
 * KPI band and the dense hairline data sheet the admin core mounts
 * below its (test-pinned) StatStrip rosters. */
import { SheetSection, KpiBand, DataSheet, type DataSheetColumn } from '../../components/patterns';
import {
  EmptyState, ErrorState,
  StripSkeleton, Skeleton, ListSkeleton, ChartSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useReducedMotion } from '../../components/motion';
import { Modal } from '../../components/overlays';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
/* P2.2 dedup: the file carried a byte-identical copy of the canonical
 * owner StatStripSkeleton (components/owner/StripSkeletons.tsx, r299);
 * the copy is retired and the shared one re-pointed here + for
 * AdminExtraPages' import. */
import { StatStripSkeleton } from '../../components/owner/StripSkeletons';
import { toast } from '../../lib/toast';
import {
  useAdminStats, useAdminFaculties, useAdminReports, useAdminCourses, useAdminPapers,
  useFaculties,
  useCurrentInstitutionSlug,
  RESEARCH_STATUSES,
  type ResearchStatus, type AdminPaper, type AdminFaculty, type AdminCourse, type CourseFormInput,
  useCreateCourse, useUpdateCourse, useDeleteCourse,
  useCreateFaculty, useCreateDepartment, useCreateOffering, useAdminTeachers,
  type FacultyFormInput, type DepartmentFormInput, type OfferingFormInput,
  apiErrorMessage,
} from '../../hooks/useResources';
/* T-24: pageList + TablePaginationFooter live in their own leaf module
 * now (was AdminGovernancePages ↔ AdminPages cycle — deadcode baseline). */
import { TablePaginationFooter, PAPER_UNIT } from './TablePaginationFooter';
import { countAr, formatPct, formatRelativeArShort } from '../../lib/format';
import { formatNum } from '../../utils/numbers';
// R320 §B (c1-RENAME): the ADMIN dashboard's title/breadcrumb root is
// «لوحة إدارة المؤسسة» — consumed from the ONE shared role-label source
// (lib/roleLabels.ts + backend twin), never a literal that can drift.
import { roleDashboardLabel } from '../../lib/roleLabels';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { cartesianOptions, valueLabels, chartColors, useChartThemeKey } from '../../lib/chartTheme';
// 5-B4: the admin roster chrome lives in colleges.css since "Sub-project D"
// (its ownership banner) — the students-toolbar/pagination/trend-table
// families the courses page + papers register now consume too.
import '../../styles/admin.css'; // r150e: the roster chrome left colleges.css
/* R305-A8: the reference admin/owner grammar — imported directly AFTER
 * admin.css so it wins the @layer pages tie. Every rule in the sheet
 * is scoped under the .r305ao page-root marker class, so teacher /
 * quality / community screens are untouched. */
import '../../styles/shared/ds-admin-owner.css';
/* R332 W11 — the dashboard grammar bridge (styles/landing/inner.css §W11):
 * the [nn] section-index chips (.w11-idx) the dashboard's cards mount +
 * the .w11-quick metric lift on the «مؤشرات سريعة» stat rows — marker-
 * scoped, so the other admin pages in this file render untouched. */
import '../../styles/landing/inner.css';
import { formatDate } from '../../utils/numbers';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

/* ════════════════════════════════════════════════════════════════
   Shared helpers
   ════════════════════════════════════════════════════════════════ */

/* R304: the local PageHeader retired onto the patterns PageHeader —
 * the contract header carries breadcrumbs + meta + actions, and the
 * r288 anatomy fold made the two pixel-equal. The AdminGovernance
 * permissions page keeps the primitives PageHeader (ReactNode title
 * — the pattern's title is string-only). */

/**
 * ≤1024px compact-roster band (r183-B5, port of the QualityPages
 * 5-A8 P2-2 pattern): .tbl-stack only arms at ≤640, so the 8-column
 * admin rosters sideways-scrolled at 768 (courses 162px, students
 * 57px — A8 wave-A evidence). At ≤1024 the column-diet folds the
 * lowest-priority columns into the row's meta line instead (see
 * AdminCoursesPage / AdminStudentsPage). One copy serves the whole
 * admin family — AdminExtraPages imports it (same contract as
 * TablePaginationFooter above). QualityPages keeps its own copy
 * (file-scope wave rule — the CountIn precedent); promote both into
 * a shared hooks module in a lib-owning wave. jsdom's matchMedia stub
 * returns matches:false, so unit tests keep exercising the desktop
 * path (same contract as GlobalSearch's band hook).
 */
export function useCompactRosterBand(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 1024px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1024px)');
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/** Quick-stat row — 5-B4 (5-A8 P1-3/§5 row 6): optionally navigable.
 *  The whole row is the target; the arrow names the direction (RTL
 *  forward = ArrowLeft). */
function Stat({
  label, value, to, hint,
}: { label: string; value: string; to?: string; hint?: string }) {
  if (to !== undefined) {
    return (
      <Link to={to} className="admin-stat-row" title={hint} style={{ textDecoration: 'none' }}>
        <span className="text-sm text-muted">{label}</span>
        <span
          className="text-sm admin-stat-value"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
        >
          {value}
          <Icon icon={ArrowLeft} size={13} style={{ color: 'var(--accent-ink, var(--accent))' }} />
        </span>
      </Link>
    );
  }
  return (
    <div className="admin-stat-row">
      <span className="text-sm text-muted">{label}</span>
      {/* A8 P3-3: no font-mono — the value is often a full Arabic faculty
          name («أكبر كلّيّة»); mono only ever wraps codes/emails/numbers
          (digits keep tabular-nums via tokens). */}
      <span className="text-sm admin-stat-value">{value}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Action strip (5-A8 §6 step 1 — «يحتاج انتباهك»)
   ════════════════════════════════════════════════════════════════ */

interface ActionRow {
  key: string;
  title: string;
  desc: string;
  to: string;
  hint: string;
}

/**
 * The dashboard's "what needs a decision" list. Every row is built from
 * a count the ADMIN role can actually fetch — the audit's original
 * sketch named moderation-queue and dean-less-faculties rows too, but
 * RBAC gates /exams/moderation-queue and /quality/courses behind
 * QUALITY_VIEW/EXAMS_MODERATE (admins hold neither) and the faculties
 * payload carries no dean field, so those rows land elsewhere (see the
 * 5-B4 worklog). Rows appear only when their count > 0 — a healthy
 * university sees no strip, not a wall of zeros.
 */
function ActionStrip() {
  // Zero-content courses: within the first 100 (the /admin/courses
  // limit ceiling). The row's copy names the window when it binds.
  const courses = useAdminCourses({ limit: 100 });
  // r342 t13: the stale-university-facts row is retired — /admin/sync
  // (the zu-sync summary behind it) was dropped upstream with the
  // zu-sync system; the strip's rows now come from the two live reads
  // only (zero-content courses + graded papers).
  // limit:1 — the register only needs meta.total for the count.
  const gradedPapers = useAdminPapers({ status: 'GRADED', limit: 1 });

  // r172b (loading closure): the strip's own pending state. It used to
  // render null until the background reads answered, so the strip
  // mounted LATE above the KPI row and pushed every section below it
  // down (measured 217px insertion → CLS 0.066 in the delayed-API lab).
  // StripSkeleton rides the same Card anatomy with the static title +
  // row placeholders, so the page-skeleton slot and this pending state
  // hand off to the resolved strip at identical heights.
  if (courses.isPending || gradedPapers.isPending) {
    return <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />;
  }

  const rows: ActionRow[] = [];
  if (courses.data && courses.data.data.length > 0) {
    const zeroContent = courses.data.data
      .filter((c) => c.totalLectures === 0 && c.totalMaterials === 0);
    const capped = courses.data.meta.total > courses.data.data.length;
    if (zeroContent.length > 0) {
      rows.push({
        key: 'zero-content',
        title: 'مقرّرات بلا محتوى تعليميّ',
        desc: `${countAr(zeroContent.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} لم تُرفع لها محاضرات أو ملفات بعد${capped ? ' (ضمن أول 100 مقرّر)' : ''}`,
        to: '/admin/courses',
        hint: 'فتح إدارة المقرّرات', // R320 §B KEEP: management-function name
      });
    }
  }
  if (gradedPapers.data && gradedPapers.data.meta.total > 0) {
    rows.push({
      key: 'graded-papers',
      title: 'بحوث مقيَّمة بانتظار النشر',
      desc: `${countAr(gradedPapers.data.meta.total, ['بحث واحد', 'بحثان', 'بحوث', 'بحثاً'])} جاهزة للنشر في مكتبة الجامعة`,
      to: '/admin/reports?status=GRADED',
      hint: 'فتح سجلّ البحوث',
    });
  }

  if (rows.length === 0) return null;
  return (
    <LedgerPanel
      title="يحتاج انتباهك"
      className="admin-priorities"
      tag={countAr(rows.length, ['بند واحد', 'بندان', 'بنود', 'بنداً'])}
      ariaLabel="حالات تحتاج انتباهك"
    >
      {rows.map((r) => (
        <LedgerRow
          key={r.key}
          to={r.to}
          title={r.title}
          subtitle={r.desc}
        />
      ))}
    </LedgerPanel>
  );
}

/* ════════════════════════════════════════════════════════════════
   Admin: Dashboard
   ════════════════════════════════════════════════════════════════ */
export function AdminDashboardPage() {
  const stats = useAdminStats();
  const facs = useAdminFaculties();
  const reports = useAdminReports();
  const navigate = useNavigate();
  const c = chartColors();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  if (stats.isPending || facs.isPending || reports.isPending) {
    /* r172b (loading closure): a MIRROR skeleton, not the generic
       PageSkeleton — the resolved page leads with the real header
       (h1+subtitle, 96px vs the generic 86px bars), then ActionStrip,
       then the KPI row, then the charts row. The generic skeleton had
       no strip slot (a 217px late insertion, CLS 0.066) and no charts
       slot. Every section below renders its shape-matched placeholder
       so the pending → resolved handoff moves nothing. */
    return (
      <div className="page r305ao" aria-busy="true" aria-live="polite">
        <PatternsPageHeader eyebrow="إدارة المؤسسة" title={roleDashboardLabel('ADMIN')} description="إحصائيات حيّة عن طلاب وأساتذة المنصّة." />
        <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />
        <div className="stat-strip" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-cell">
              <Skeleton width={70} height={11} />
              <div style={{ marginBlock: 'var(--sp-1)' }}>
                <Skeleton width={90} height={28} />
              </div>
              <Skeleton width={120} height={11} />
            </div>
          ))}
        </div>
        {/* r172b (pinned loading-closure §4): the charts-row slots keep the
         * .grid-2-1 + Card mirror — the test pins this anatomy; the
         * sg-split re-mirror is deferred to the next loop with the pin. */}
        <div className="grid-2-1" style={{ marginBlockStart: 'var(--sp-9)' }}>
          <Card title="توزّع الطلاب حسب الكلّيّة">
            <Skeleton width="100%" height={174} rounded="var(--r-lg)" />
          </Card>
          <Card title="مؤشرات سريعة">
            <Skeleton width="100%" height={174} rounded="var(--r-lg)" />
          </Card>
        </div>
      </div>
    );
  }
  if (stats.isError || facs.isError || reports.isError) {
    // r157 (6A9 #5): the early-error return keeps the page chrome
    // (.page + header + h1) — the retry used to land on a chrome-less
    // wall, so an API blip stripped the admin's bearings (which page
    // am I on?) before offering the retry.
    return (
      <div className="page r305ao">
        <PatternsPageHeader eyebrow="إدارة المؤسسة" title={roleDashboardLabel('ADMIN')} description="إحصائيات حيّة عن طلاب وأساتذة المنصّة." />
        {/* 5-b: the error register rides the hairline section frame (§2) —
         * the off-grammar Card wrapper retired. */}
        <SheetSection index="01" caption="STUDENT DISTRIBUTION" title="توزّع الطلاب حسب الكلّيّة">
          <ErrorState
            error={stats.error ?? facs.error ?? reports.error}
            onRetry={() => { stats.refetch(); facs.refetch(); reports.refetch(); }}
          />
        </SheetSection>
      </div>
    );
  }
  const s = stats.data!;
  const f = facs.data!;
  const r = reports.data!;

  // Real top-8 by student count.
  const topByStudents = [...f]
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 8)
    .filter((x) => x.studentCount > 0 || f.length <= 8);

  // Distinct cities — replaces the "9 cities" placeholder.
  const cityCount = new Set(f.map((x) => x.city)).size;
  const facultyCount = f.length;

  // Highest-density faculty for "مؤشرات سريعة".
  const topFaculty = topByStudents[0];
  const topByCourses = [...f].sort((a, b) => b.courseCount - a.courseCount)[0];
  const studentTeacherRatio = s.totalTeachers > 0
    ? Math.round((s.totalStudents / s.totalTeachers) * 10) / 10
    : null;

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title={roleDashboardLabel('ADMIN')}
        description="إحصائيات حيّة عن طلاب وأساتذة المنصّة."
        meta={<>{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · حساب لحظيّ</>}
        actions={(
          /* R342-09 (D11 header-CTA precedent): the registrar's live
                   * students roster rides the header action slot (primary).
                   * The second seat — the university sync ghost link — retired
                   * with the zu-sync system (r342 t13: dropped upstream); the
                   * StatStrip cells keep the full drill set, and this link
                   * remains the phone band's honest affordance (the admin
                   * topbar hides «اسأل AI» entirely, so without it the first
                   * viewport at 390 carries no primary action at all). */
          <Link to="/admin/students" className="btn primary sm">
            <Icon icon={GraduationCap} size={13} />
            سجلّ الطلاب
          </Link>
        )}
      />

      {/* 5-A8 §6 step 1: the action list sits above the KPI row — the
          dashboard answers "what needs me" before "how big are we". */}
      <ActionStrip />

      {/* R189 — the typographic stat strip (was the grid-4 KPI tiles);
          every cell still answers its follow-up in one click. */}
      <StatStrip
        ariaLabel="إحصائيات المؤسّسة"
        cells={[
          {
            label: 'الكلّيّات',
            value: formatNum(facultyCount),
            trend: `موزّعة على ${countAr(cityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}`,
            trendTone: 'flat',
            to: '/admin/faculties',
          },
          {
            label: 'الطلاب',
            value: formatNum(s.totalStudents),
            trend: 'مسجَّل في النظام',
            trendTone: 'flat',
            to: '/admin/students',
          },
          {
            label: 'هيئة التدريس',
            value: formatNum(s.totalTeachers),
            trend: 'عضو',
            trendTone: 'flat',
            to: '/admin/teachers',
          },
          {
            label: 'المقرّرات',
            value: formatNum(s.totalCourses),
            trend: countAr(s.totalEnrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً']),
            trendTone: 'flat',
            to: '/admin/courses',
          },
        ]}
      />

      {/* 5-A8 §6 step 6 (rhythm): the charts row is the page's breathing
          section — 88px above it vs the KPI strip's 40px (taste.md:
          rhythm = contrast between tight and generous, never uniform).
          R359 (A3): the row becomes the LATERAL SPLIT — the reference's
          plan/text division (7:5 with a full-height hairline). Main
          column = the distribution chart; side rail = the quick reads.
          The KPI strip above stays the r189 StatStrip on purpose — its
          navigable cells are the pinned a.stat-cell-link contract, and
          grammar §15 re-keys that strip onto the band register in CSS. */}
      <div className="sg-split" style={{ marginBlockStart: 'var(--sp-9)' }}>
        <SheetSection
          index="01"
          caption="STUDENT DISTRIBUTION"
          title="توزّع الطلاب حسب الكلّيّة"
          aside={topByStudents.length > 1 ? (
            <span className="text-sm text-muted">
              أعلى {countAr(topByStudents.length, ['كلّيّة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} عدداً · انقر عموداً لعرض طلابها
            </span>
          ) : undefined}
        >
          {/* 5-A8 §6 step 5 (chart honesty): a single bar in a chart box
              carries no distribution signal — degrade to the stat + its
              drill link instead of the lonely-bar form. */}
          {topByStudents.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات طلاب بعد"
              description=""
            />
          ) : topByStudents.length === 1 && topFaculty ? (
            <div className="flex-col gap-3">
              <p className="text-sm text-muted">
                كلّيّة واحدة فقط لديها طلاب مسجَّلون حالياً؛ يظهر المخطط التفصيليّ عند تعدُّد الكلّيّات.
              </p>
              <Stat
                label="أعلى كلّيّة عدداً للطلاب"
                value={`${topFaculty.name} (${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])})`}
              />
              <Link
                to={`/admin/students?facultyId=${topFaculty.id}`}
                className="btn ghost sm"
                style={{ alignSelf: 'flex-start' }}
              >
                <Icon icon={ArrowLeft} size={13} />
                عرض طلاب الكلّيّة
              </Link>
            </div>
          ) : (
            <ChartFrame
              ariaLabel={`توزيع الطلاب حسب الكلّيّة — أعلى ${countAr(topByStudents.length, ['كلّيّة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} عددًا`}
              summary={topFaculty ? `أعلى كلّيّة عددًا للطلاب: ${topFaculty.name} بـ${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])}.` : undefined}
              height={Math.max(180, topByStudents.length * 36)}
              table={{
                caption: 'توزيع الطلاب حسب الكلّيّة',
                columns: ['الكلّيّة', 'عدد الطلاب'],
                rows: topByStudents.map((row) => [row.name, row.studentCount]),
              }}
            >
              <Bar
                key={themeKey}
                aria-hidden="true"
                data={{
                  labels: topByStudents.map((row) => row.name),
                  datasets: [{
                    label: 'عدد الطلاب',
                    data: topByStudents.map((row) => row.studentCount),
                    backgroundColor: `color-mix(in srgb, ${c.accent} 55%, transparent)`,
                    borderColor: c.accent,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 22,
                  }],
                }}
                plugins={[valueLabels]}
                options={{
                  ...cartesianOptions({ horizontal: true }),
                  indexAxis: 'y' as const,
                  // 5-A8 §5 row 5: a bar is a question — "who are this
                  // faculty's students?" The answer lands pre-filtered.
                  onClick: (_e, elements) => {
                    const el = elements[0];
                    const fac = el ? topByStudents[el.index] : undefined;
                    if (fac) navigate(`/admin/students?facultyId=${fac.id}`);
                  },
                }}
              />
            </ChartFrame>
          )}
        </SheetSection>

        {/* W11: .w11-quick — the quick-stat values lift from the uniform
            --fs-sm body rung to the metric rung (inner.css §W11); the
            same .admin-stat classes elsewhere are untouched. R359 (A3):
            the quick reads ride the split's side rail, framed [02]. */}
        <SheetSection index="02" caption="QUICK READS" title="مؤشرات سريعة" className="w11-quick">
          <div className="flex-col gap-2">
            {/* 5-A8 §5 row 6 + P3-2: the rows navigate where a route
                answers them; the papers PAIR collapsed into one drill
                stat (the same two numbers lived on three routes).
                (r299: «أكبر كلّيّة» died — the sorted bar chart beside
                this card IS that fact, and its hidden ChartFrame
                summary announces it; one owner per datum.) */}
            <Stat
              label="أعلى عدد مقرّرات"
              value={topByCourses ? `${topByCourses.name} (${topByCourses.courseCount})` : '—'}
              to={topByCourses ? '/admin/faculties' : undefined}
              hint="عرض الكلّيّات والأقسام"
            />
            <Stat
              label="نسبة طالب/أستاذ"
              value={studentTeacherRatio !== null ? `${studentTeacherRatio}` : '—'}
            />
            <Stat
              label="بحوث منشورة"
              value={formatNum(r.headline?.publishedPapers ?? 0)}
              to="/admin/reports?status=PUBLISHED"
              hint="فتح سجلّ البحوث المنشورة"
            />
          </div>
        </SheetSection>
      </div>

      {/* R359 (A3): the research-output board joins the framed sections —
          the descriptive line rides the head rule's aside slot (actions
          never float), the chart stays ChartFrame-wrapped with its
          sr-only table. */}
      <details className="dash-disclosure">
        <summary>تقرير الإنتاج العلمي</summary>
        <SheetSection
          index="03"
          caption="RESEARCH OUTPUT"
          title="نشاط الإنتاج العلميّ — آخر 6 أشهر"
          aside={<span className="text-sm text-muted">أبحاث مقدَّمة، مقيَّمة، ومنشورة شهرياً</span>}
        >
          {r.paperTrend.length === 0 || r.paperTrend.every((m) => m.submitted + m.graded + m.published === 0) ? (
            <EmptyState
              icon={TrendingUp}
              title="لا توجد بيانات أبحاث بعد"
              description=""
            />
          ) : (
            <ChartFrame
              ariaLabel="نشاط الإنتاج العلمي في الأشهر الستة الأخيرة — أبحاث مقدَّمة ومقيَّمة ومنشورة شهرياً"
              summary="مقارنة حركة البحوث المرفوعة والمقيَّمة والمنشورة على مدى الأشهر الستة الأخيرة."
              height={240}
              table={{
                caption: 'نشاط الإنتاج العلمي شهرياً',
                columns: ['الشهر', 'مقدَّم', 'مقيَّم', 'منشور'],
                rows: r.paperTrend.map((m) => [m.month, m.submitted, m.graded, m.published]),
              }}
            >
              <Line
                key={themeKey}
                aria-hidden="true"
                data={{
                  labels: r.paperTrend.map((m) => m.month),
                  datasets: [
                    {
                      label: 'مقدَّم',
                      data: r.paperTrend.map((m) => m.submitted),
                      borderColor: c.accent,
                      fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                      pointBackgroundColor: c.accent,
                    },
                    {
                      /* R359 (A3 · the one-signal law): the hero series
                       * (مقدَّم) rides the royal; the two completion states
                       * ride the ink + hairline-grey neutrals — no
                       * gold/green rainbow on the sheet. */
                      label: 'مقيَّم',
                      data: r.paperTrend.map((m) => m.graded),
                      borderColor: c.strongText,
                      fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                      pointBackgroundColor: c.strongText,
                    },
                    {
                      label: 'منشور',
                      data: r.paperTrend.map((m) => m.published),
                      borderColor: c.grid,
                      fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                      pointBackgroundColor: c.grid,
                    },
                  ],
                }}
                options={cartesianOptions({ legend: true, gradientFill: true })}
              />
            </ChartFrame>
          )}
        </SheetSection>
      </details>
    </div>
  );
}

/* ─── Admin: Faculties ────────────────────────────────────── */

/** A faculty row whose departments collapse behind the header (5-A8
 *  P2-3 — the 3388px monolithic wall becomes a directory). */
function FacultyRow({
  faculty, open, onToggle, onAddDepartment,
}: {
  faculty: AdminFaculty;
  open: boolean;
  onToggle: () => void;
  /** r180: opens the «إضافة قسم» modal bound to THIS faculty (the
   * card-level create action — a fresh faculty starts with zero
   * departments, so the action must not hide behind the collapsible
   * departments list). */
  onAddDepartment: () => void;
}) {
  const hasDepts = faculty.departments.length > 0;
  const head = (
    <>
      <span className="admin-faculty-icon">
        <EmojiIcon emoji={faculty.iconEmoji ?? undefined} fallback={Building2} size={22} />
      </span>
      <div className="admin-faculty-body">
        <div className="admin-faculty-titles">
          <span className="admin-faculty-name">{faculty.name}</span>
          {faculty.nameEn && (
            <span className="admin-faculty-name-en font-mono text-xs text-subtle">
              · <bdi>{faculty.nameEn}</bdi>
            </span>
          )}
        </div>
        <div className="admin-faculty-meta">
          {/* A8 P3-3: counted Arabic phrases — mono is a costume
              here (IBM Plex Mono has no Arabic); plain text. */}
          <span>{countAr(faculty.departmentCount, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}</span>
          <span>{countAr(faculty.courseCount, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span>
          <span>{countAr(faculty.studentCount, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span>
          <span>{countAr(faculty.teacherCount, ['عضو هيئة تدريس واحد', 'عضوا هيئة تدريس', 'أعضاء هيئة تدريس', 'عضواً هيئة تدريس'])}</span>
        </div>
      </div>
      {hasDepts && (
        <Icon
          icon={ChevronDown}
          size={16}
          style={{
            color: 'var(--text-muted)',
            marginInlineStart: 'auto',
            flexShrink: 0,
            transition: 'transform var(--t-base) var(--ease)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      )}
    </>
  );
  return (
    <div className="admin-faculty-card">
      {hasDepts ? (
        <button
          type="button"
          className={`admin-faculty-head${open ? ' has-depts' : ''}`}
          aria-expanded={open}
          aria-controls={`faculty-depts-${faculty.id}`}
          onClick={onToggle}
          title={open ? 'طيّ الأقسام' : 'توسيع الأقسام'}
          style={{ width: '100%', textAlign: 'start', padding: 0 }}
        >
          {head}
        </button>
      ) : (
        <div className="admin-faculty-head">{head}</div>
      )}
      {hasDepts && open && (
        <div className="admin-faculty-depts" id={`faculty-depts-${faculty.id}`}>
          {faculty.departments.map((d) => (
            <div key={d.id} className="admin-faculty-dept">
              <span className="admin-faculty-dept-name">{d.name}</span>
              <span className="admin-faculty-dept-meta">
                {countAr(d.students, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} · {countAr(d.courses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* r180: the department create action lives on EVERY card — the
          head is itself a <button> whenever it has departments, so a
          trailing action can never ride inside it (nested interactive
          controls); a plain footer row (the table actions-cell pattern:
          ghost sm + Plus icon) works for both fresh and full faculties
          alike. No new class — flex utilities + the sp token. The
          visible «إضافة قسم» label IS the accessible name (like the
          row head itself): the button rides inside the faculty's own
          card, one per card, so the grouping already names the target. */}
      <div className="flex items-center" style={{ marginBlockStart: 'var(--sp-3)' }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onAddDepartment}
        >
          <Icon icon={Plus} size={13} />
          إضافة قسم
        </button>
      </div>
    </div>
  );
}

export function AdminFacultiesPage() {
  const { data, isPending, isError, error, refetch } = useAdminFaculties();
  // 5-A8 P2-3: retrieval affordances — search (name/nameEn/dept) + city
  // filter + collapsed departments. Every sibling roster had search; this
  // page was a 3388px wall.
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [openDepts, setOpenDepts] = useState<ReadonlySet<string>>(new Set());

  // ── Structure writes (r180 — the new-institution bootstrap) ──────
  /* The AdminCoursesPage create-course pattern: the modal stays open
   * until the mutation SETTLES (r153i — a failed save must render the
   * in-modal error, never look like a silent success), the per-call
   * onSuccess closes + toasts, and the hook-level invalidations
   * refresh both faculty lists. */
  const createFaculty = useCreateFaculty();
  const createDepartment = useCreateDepartment();
  const [facultyFormOpen, setFacultyFormOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState<FacultyFormInput>({
    name: '', nameEn: '', iconEmoji: '', city: '',
  });
  /* Which faculty the «إضافة قسم» modal targets (null = closed) —
   * the r153i formMode twin: an honest tri-state instead of a sentinel
   * object, so the modal remounts its draft per target. */
  const [deptTarget, setDeptTarget] = useState<AdminFaculty | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentFormInput>({
    name: '', nameEn: '', facultyId: '',
  });
  const closeFacultyForm = () => setFacultyFormOpen(false);
  const openFacultyForm = () => {
    setFacultyForm({ name: '', nameEn: '', iconEmoji: '', city: '' });
    setFacultyFormOpen(true);
  };
  const closeDeptForm = () => setDeptTarget(null);
  const openDeptForm = (f: AdminFaculty) => {
    setDeptForm({ name: '', nameEn: '', facultyId: f.id });
    setDeptTarget(f);
  };
  const submitFaculty = () => {
    createFaculty.mutate(facultyForm, {
      onSuccess: () => {
        toast.success(`أُضيفت كلّيّة «${facultyForm.name.trim()}».`, { title: 'تمّت الإضافة' });
        closeFacultyForm();
      },
    });
  };
  const submitDepartment = () => {
    if (!deptTarget) return;
    createDepartment.mutate(deptForm, {
      onSuccess: () => {
        toast.success(
          `أُضيف قسم «${deptForm.name.trim()}» إلى «${deptTarget.name}».`,
          { title: 'تمّت الإضافة' },
        );
        closeDeptForm();
      },
    });
  };

  if (isPending) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          eyebrow="إدارة المؤسسة"
          title="الكلّيّات والأقسام"
          /* r351 A2 (Q3): header description retired — the roster explains itself. */
          breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]}
        />
        <StatStripSkeleton />
        {/* 5-b (loading mirror §3): the pending directory rides the real
         * framed section (the FacultyRow handoff keeps its frame); the
         * generic CardSkeleton flashed a retired card anatomy. The head
         * stays untitled while pending — the h1 is the branch's one
         * heading (the resolved section's counted title lands at the
         * handoff, and the pending h2 must not clone the page h1). */}
        <SheetSection index="01" caption="FACULTY DIRECTORY">
          <ListSkeleton rows={5} />
        </SheetSection>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          eyebrow="إدارة المؤسسة"
          title="الكلّيّات والأقسام"
          /* r351 A2 (Q3): header description retired — the roster explains itself. */
          breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]}
        />
        {/* 5-b: the error register rides the hairline section frame (§2) —
         * the off-grammar Card wrapper retired. */}
        <SheetSection index="01" caption="FACULTY DIRECTORY" title="الكلّيّات والأقسام">
          <ErrorState error={error} onRetry={() => refetch()} />
        </SheetSection>
      </div>
    );
  }

  const totalDepts = data.reduce((s, f) => s + f.departmentCount, 0);
  const totalCourses = data.reduce((s, f) => s + f.courseCount, 0);
  const totalStudents = data.reduce((s, f) => s + f.studentCount, 0);
  const totalTeachers = data.reduce((s, f) => s + f.teacherCount, 0);

  const cities = Array.from(new Set(data.map((f) => f.city))).sort();
  const needle = q.trim();
  const visible = data.filter((f) => {
    if (city !== '' && f.city !== city) return false;
    if (needle === '') return true;
    return f.name.includes(needle)
      || (f.nameEn ?? '').toLowerCase().includes(needle.toLowerCase())
      || f.departments.some((d) => d.name.includes(needle));
  });
  const hasFilters = needle !== '' || city !== '';
  const toggleDepts = (id: string) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="الكلّيّات والأقسام"
        /* r351 A2 (Q3): header description retired — the roster explains itself. */
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]}
        actions={(
          /* R342-09 (the students-page family contract): the page's ONE
                   * create action rides the header action slot on the accent
                   * register — the first viewport at every width keeps the
                   * affordance (the admin topbar hides «اسأل AI» entirely). The
                   * FilterBar trailing seat returns to filters-only. */
                  <button
            type="button"
            className="btn accent sm"
            onClick={openFacultyForm}
            aria-label="إضافة كلّيّة جديدة"
          >
            <Icon icon={Plus} size={14} />
            إضافة كلّيّة
          </button>
        )}
      />

      {/* R359 final — the KPI band: every numeral derives from the live
          faculties payload (the directory's own sums). The r189 StatStrip
          cells re-key onto the band register verbatim. */}
      <KpiBand
        items={[
          { index: '01', caption: 'FACULTIES', label: 'الكلّيّات', value: data.length },
          { index: '02', caption: 'DEPARTMENTS', label: 'الأقسام', value: totalDepts },
          { index: '03', caption: 'STUDENTS', label: 'إجمالي الطلاب', value: totalStudents },
          { index: '04', caption: 'STAFF', label: 'هيئة التدريس', value: totalTeachers },
        ]}
      />

      {/* 5-A8 §6 step 6 (rhythm): the directory is the page's primary
          section — it breathes after the KPI band. R359 (A3): the
          collapsible faculty tree keeps its custom rows (the
          aria-expanded head contract is the directory's own grammar —
          DataSheet has no tree rows) but sits FRAMED, with the count
          line on the head rule. */}
      <SheetSection
        index="01"
        caption="FACULTY DIRECTORY"
        title={`الكلّيّات (${visible.length})`}
        aside={(
          <span className="text-sm text-muted">
            {hasFilters
              ? `من أصل ${countAr(data.length, ['كلّيّة واحدة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} · بعد التصفيّة`
              : `${countAr(totalDepts, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(totalCourses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`}
          </span>
        )}
      >
        {/* R304: the directory's control rail rides the patterns FilterBar —
            search → city filter → the create action, the family order.
            The labeled pill keeps its explicit aria-label (the students
            roster's deep-link labels stay). */}
        <FilterBar
          filters={(
            <>
              <div className="admin-students-search">
                <Icon icon={Search} size={14} />
                <input
                  type="search"
                  placeholder="ابحث باسم الكلّيّة أو القسم…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="admin-students-input"
                  aria-label="البحث في الكلّيّات"
                />
              </div>
              <select
                className="admin-students-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="تصفية حسب المدينة"
              >
                <option value="">كلّ المدن</option>
                {cities.map((cty) => <option key={cty} value={cty}>{cty}</option>)}
              </select>
            </>
          )}
        />

        <div className="flex-col gap-3">
          {visible.map((f) => (
            <FacultyRow
              key={f.id}
              faculty={f}
              open={openDepts.has(f.id)}
              onToggle={() => toggleDepts(f.id)}
              onAddDepartment={() => openDeptForm(f)}
            />
          ))}
          {visible.length === 0 && (
            /* r351 A2 (Q3): empty-state prose retired — the title + reset action suffice. */
            <EmptyState
              illustration="empty-search"
              icon={Building2}
              title="لا توجد نتائج مطابقة"
              description=""
              action={hasFilters ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => { setQ(''); setCity(''); }}
                >
                  <Icon icon={X} size={13} />
                  مسح البحث والتصفيّة
                </button>
              ) : undefined}
            />
          )}
        </div>
      </SheetSection>

      {/* r180: «إضافة كلّيّة» — the AdminCoursesPage create-course modal
          pattern verbatim (Modal + FormField canon + footer buttons +
          the settle-time AlertRow). city is REQUIRED here: the backend's
          uniqueness key is (institution, name, city), so the hint names
          it — the 409 copy the server answers with does too. */}
      <Modal
        open={facultyFormOpen}
        onClose={closeFacultyForm}
        ariaLabel="إضافة كلّيّة جديدة"
      >
        <div className="modal-header">
          <h3 className="modal-title">إضافة كلّيّة جديدة</h3>
          <button type="button" className="icon-btn" onClick={closeFacultyForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          <FormField label="اسم الكلّيّة" id="faculty-name">
            <input
              className="input"
              value={facultyForm.name}
              onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
              placeholder="كلية العلوم"
            />
          </FormField>
          <FormField label="الاسم بالإنجليزية (اختياري)" id="faculty-name-en">
            {/* r351 A2 (Q3): where-shown hint retired — the field explains itself. */}
            <input
              className="input"
              value={facultyForm.nameEn}
              onChange={(e) => setFacultyForm({ ...facultyForm, nameEn: e.target.value })}
              placeholder="Faculty of Science"
            />
          </FormField>
          <FormField
            label="المدينة"
            id="faculty-city"
            /* r351 A2 (Q3): uniqueness-rule hint retired — the server's
             * 409 copy already names it. */
          >
            <input
              className="input"
              value={facultyForm.city}
              onChange={(e) => setFacultyForm({ ...facultyForm, city: e.target.value })}
              placeholder="كلية العلوم"
            />
          </FormField>
          {/* r351 A2 (Q3): icon hint retired — decorative explanation. */}
          <FormField label="رمز تعبيري (اختياري)" id="faculty-icon">
            <input
              className="input"
              value={facultyForm.iconEmoji}
              onChange={(e) => setFacultyForm({ ...facultyForm, iconEmoji: e.target.value })}
              placeholder="رمز تعبيري قصير (اختياري)"
              maxLength={10}
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeFacultyForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitFaculty}
            disabled={!facultyForm.name.trim() || !facultyForm.city.trim()
              || createFaculty.isPending}
          >
            {createFaculty.isPending ? 'جارٍ الإضافة…' : 'إضافة الكلّيّة'}
          </button>
        </div>
        {createFaculty.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إضافة الكلّيّة"
            description={apiErrorMessage(
              createFaculty.error,
              'لم يستجب الخادم للطلب. إعادة المحاولة.',
            )}
          />
        )}
      </Modal>

      {/* r180: «إضافة قسم» — same modal grammar, bound to the card the
          button rode on (the target faculty is named in the body line so
          the operator never wonders which faculty the new department
          lands in). */}
      <Modal
        open={deptTarget !== null}
        onClose={closeDeptForm}
        ariaLabel="إضافة قسم"
      >
        <div className="modal-header">
          <h3 className="modal-title">إضافة قسم</h3>
          <button type="button" className="icon-btn" onClick={closeDeptForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          {deptTarget && (
            <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
              سيُضاف القسم إلى «{deptTarget.name}».
            </p>
          )}
          <FormField label="اسم القسم" id="dept-name">
            <input
              className="input"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="قسم الحاسوب"
            />
          </FormField>
          {/* r351 A2 (Q3): where-shown hint retired — the field explains itself. */}
          <FormField label="الاسم بالإنجليزية (اختياري)" id="dept-name-en">
            <input
              className="input"
              value={deptForm.nameEn}
              onChange={(e) => setDeptForm({ ...deptForm, nameEn: e.target.value })}
              placeholder="Computer Science"
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeDeptForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitDepartment}
            disabled={!deptForm.name.trim() || createDepartment.isPending}
          >
            {createDepartment.isPending ? 'جارٍ الإضافة…' : 'إضافة القسم'}
          </button>
        </div>
        {createDepartment.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إضافة القسم"
            description={apiErrorMessage(
              createDepartment.error,
              'لم يستجب الخادم للطلب. إعادة المحاولة.',
            )}
          />
        )}
      </Modal>
    </div>
  );
}

/* ─── Admin: Reports (institutional hub — the analysis page folds in here) ── */

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="trend-legend-item">
      <span className="trend-legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Arabic labels + badge tones for the research lifecycle (raw enums
 *  never reach the UI — platform ruling). */
const PAPER_STATUS_LABEL: Record<ResearchStatus, string> = {
  UPLOADED: 'مرفوعة',
  SCANNING: 'قيد الفحص',
  CHECKS_PASSED: 'اجتازت الفحص',
  CHECKS_FAILED: 'لم تجتز الفحص',
  GRADED: 'مقيَّمة',
  PUBLISHED: 'منشورة',
};
/* r149 (R3-A1 #1): انتقل التعريف إلى lib/paperStatus.ts — سلّم واحد
 * للطالب وإدارة المؤسسة (هذه كانت النسخة الأغنى فاعتُمدت كما هي — r352 §D7: الإداري = إدارة المؤسسة).
 *
 * R359 final — the register's flat status flag tones: PUBLISHED rides
 * positive, CHECKS_FAILED rides danger, and the registrar's actionable
 * GRADED state (بحوث بانتظار النشر) spends the ONE royal signal; the
 * transient pipeline states stay neutral hairline. */
const PAPER_FLAG_TONE: Partial<Record<ResearchStatus, 'positive' | 'danger' | 'signal'>> = {
  PUBLISHED: 'positive',
  CHECKS_FAILED: 'danger',
  GRADED: 'signal',
};

export function AdminReportsPage() {
  const { data, isPending, isError, error, refetch } = useAdminReports();
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  // URL-driven views: ?trend=table is the folded analysis view;
  // ?status=<ResearchStatus> lands the papers register pre-filtered
  // (5-A8 §5 landing craft — the target arrives with its pill pressed).
  const trendView = searchParams.get('trend') === 'table' ? 'table' : 'bars';
  const statusParam = searchParams.get('status');
  const status: ResearchStatus | undefined = RESEARCH_STATUSES.includes(statusParam as ResearchStatus)
    ? (statusParam as ResearchStatus)
    : undefined;

  // Papers register state — page stays local (pagination noise in the
  // URL buys nothing); the status filter IS the URL.
  const [papersPage, setPapersPage] = useState(1);
  const papers = useAdminPapers({ page: papersPage, limit: 20, status });

  const registerRef = useRef<HTMLDivElement | null>(null);
  // Landing with ?status= (from the dashboard strip / quick stats) or
  // changing it (from the KPI row) scrolls the register into view.
  // `data` gates the scroll: on a cold deep link the page is still the
  // PageSkeleton when the effect first fires (registerRef null), so the
  // scroll must re-arm once the reports bundle actually resolves.
  useEffect(() => {
    if (!status || !data) return;
    registerRef.current?.scrollIntoView({
      block: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [status, data, reducedMotion]);

  const setTrendView = (v: 'bars' | 'table') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'table') next.set('trend', 'table');
      else next.delete('trend');
      return next;
    });
  };
  const setStatusFilter = (s: ResearchStatus | undefined) => {
    setPapersPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s) next.set('status', s);
      else next.delete('status');
      return next;
    });
  };

  if (isPending) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          eyebrow="إدارة المؤسسة"
          title="التقارير المؤسسية"
          /* r351 A2 (Q3): header description retired — the KPI band explains the page. */
          breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]}
        />
        <StatStripSkeleton />
        {/* 5-b (loading mirror §3): the pending trend board rides the real
         * framed section with the chart-shaped placeholder — the resolved
         * ChartFrame cell keeps its frame at the handoff. Untitled while
         * pending: the resolved section's title must stay the data-land
         * signal (findByText waits for it), not a pending-state echo. */}
        <SheetSection index="01" caption="PAPER TREND">
          <ChartSkeleton height={240} />
        </SheetSection>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          eyebrow="إدارة المؤسسة"
          title="التقارير المؤسسية"
          /* r351 A2 (Q3): header description retired — the KPI band explains the page. */
          breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]}
        />
        {/* 5-b: the error register rides the hairline section frame (§2) —
         * the off-grammar Card wrapper retired. */}
        <SheetSection index="01" caption="PAPER TREND" title="حركة البحوث العلمية">
          <ErrorState error={error} onRetry={() => refetch()} />
        </SheetSection>
      </div>
    );
  }

  const maxBucket = Math.max(1, ...data.paperTrend.map((b) => Math.max(b.submitted, b.graded, b.published)));
  const months = data.paperTrend.map((b) => b.month);
  const periodLabel = months.length >= 2 ? `من ${months[0]} إلى ${months[months.length - 1]}` : undefined;
  const papersMeta = papers.data?.meta;

  /* R359 final — the register's sheet columns: the paper's title is the
   * identity cell (its offering context rides the sub-line), the
   * student carries the avatar + name, the status rides the flat
   * sg-flag, and the plagiarism + date numerics ride the mono
   * tabular register. */
  const paperColumns: DataSheetColumn<AdminPaper>[] = [
    {
      key: 'title',
      label: 'البحث',
      render: (p) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title">{p.title}</span>
          {p.offering && (
            <span className="sg-cell-sub">{p.offering.course.name} · <bdi>{p.offering.course.code}</bdi></span>
          )}
        </span>
      ),
    },
    {
      key: 'student',
      label: 'الطالب',
      render: (p) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <UserAvatar
            initials={p.student.avatarInitials ?? `${p.student.firstName[0]}${p.student.lastName[0]}`}
            color={p.student.avatarColor ?? undefined}
            size={28}
          />
          <span>{p.student.firstName} {p.student.lastName}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (p) => (
        <span className="sg-flag" data-tone={PAPER_FLAG_TONE[p.status]}>{PAPER_STATUS_LABEL[p.status]}</span>
      ),
    },
    {
      key: 'plagiarism',
      label: 'الاقتباس (محاكاة)',
      numeric: true,
      render: (p) => (
        /* r148 (VLM-C VC-1): تنسيق دفاعي — عشري JS الخام (4.1999…)
         * وصل الجدول حرفيًا من حاصل ضرب عائم في الواجهة الخلفية. */
        p.plagiarismPct != null ? <bdi>{formatPct(p.plagiarismPct)}%</bdi> : '—'
      ),
    },
    {
      key: 'uploadedAt',
      label: 'تاريخ الرفع',
      render: (p) => formatRelativeArShort(p.uploadedAt),
    },
  ];

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="التقارير المؤسسية"
        /* r351 A2 (Q3): header description retired — the KPI band explains the page. */
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]}
        actions={(
          /* R342-09 (D11 sub-page CTA precedent): a read-only ledger still
                   * names its ONE honest next surface — the adoption view is the
                   * reports' analytical sibling (the same institutional audience
                   * reads both). The phone band keeps a primary action in the
                   * first viewport (the admin topbar hides «اسأل AI»). */
                  <Link to="/admin/digital" className="btn accent sm">
            <Icon icon={Activity} size={13} />
            التحوّل الرقميّ
          </Link>
        )}
      />

      {/* §5 row 8: the papers KPIs land on the register — the URL is
          the action: ?status=PUBLISHED lands the register pre-filtered
          (the page's own landing effect scrolls to it), the students
          cell crosses pages. R359 (A3): the strip stays the r189
          StatStrip on purpose — its navigable cells are the pinned
          a.stat-cell-link contract (the KpiBand's cells render
          role=listitem, not links); grammar §15 re-keys the strip onto
          the band register in CSS. */}
      <StatStrip
        ariaLabel="مؤشّرات التقارير المؤسسية"
        cells={[
          /* r351 A2 (Q3): explanatory trend notes retired — the period
           * (real month range) stays; the restated labels go. */
          {
            label: 'إجمالي البحوث',
            value: formatNum(data.headline?.totalPapers ?? 0),
            trend: periodLabel,
            to: status ? '/admin/reports' : undefined,
          },
          {
            label: 'بحوث منشورة',
            value: formatNum(data.headline?.publishedPapers ?? 0),
            to: '/admin/reports?status=PUBLISHED',
          },
          {
            label: 'طلاب نشطون',
            value: formatNum(data.headline?.activeStudents ?? 0),
            to: '/admin/students',
          },
          {
            label: 'إجمالي المستخدمين',
            value: formatNum(data.headline.totalUsers),
          },
        ]}
      />

      {/* 5-A8 §6 step 2: the analysis page folds in as the trend's table
          view — one bundle, two presentations, no third arrangement.
          5-A8 §6 step 6 (rhythm): this is the page's primary section —
          it breathes after the tight KPI band (the dashboards' charts
          row carries the same break). R359 (A3): the board sits framed;
          the Tabs ride the head rule's aside slot with the period.
          The ?trend=table view keeps the shared .table-wrap table —
          its mobile data-label contract is pinned (AdminConsolePages). */}
      <SheetSection
        index="01"
        caption="PAPER TREND"
        title="حركة البحوث العلمية"
        aside={(
          <>
            {periodLabel !== undefined && <span className="text-sm text-muted">{periodLabel}</span>}
            <Tabs
              value={trendView}
              onChange={setTrendView}
              items={[
                { value: 'bars', label: 'أعمدة' },
                { value: 'table', label: 'جدول' },
              ]}
            />
          </>
        )}
      >
        {data.paperTrend.length === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <EmptyState illustration="empty-research"
            icon={TrendingUp}
            title="لا توجد بيانات نشر بعد"
            description=""
          />
        ) : trendView === 'table' ? (
          <div className="table-wrap">
            {/* r157 (6A9 #6): the shared .table-wrap — the local
                .trend-table-wrap rule (overflow-x only) is deleted from
                admin.css; the canonical wrap adds the framed surface +
                radius every sibling table already sits in. */}
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الشهر</th>
                  <th scope="col">مُقدَّم</th>
                  <th scope="col">تمّ تقييمه</th>
                  <th scope="col">منشور</th>
                </tr>
              </thead>
              <tbody>
                {data.paperTrend.map((row, i) => (
                  <tr key={i}>
                    {/* r151b (R5-A4): labels restored — the r150d retirement
                        onto .table+tbl-stack left these four tds bare on
                        phones («12 / 8 / 5» with no column names). */}
                    <td data-label="الشهر">{row.month}</td>
                    <td className="font-mono" data-label="مُقدَّم">{row.submitted}</td>
                    <td className="font-mono" data-label="تمّ تقييمه">{row.graded}</td>
                    <td className="font-mono" data-label="منشور">{row.published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="flex-col gap-2">
              {data.paperTrend.map((b) => (
                <div key={b.month} className="trend-row">
                  <span className="trend-label">{b.month}</span>
                  <div className="trend-bars">
                    <div
                      className="trend-bar trend-submitted"
                      title={`مرفوعة: ${b.submitted}`}
                      /* 5-C1 (A2 §1c #28): the value rides --trend-scale (0..1)
                         consumed by a clip-path wipe in components.css —
                         paint-only, no per-frame reflow. The 0.004 floor
                         keeps the old 2px min-inline-size sliver for
                         zero-buckets (≈2px on the trend track). */
                      style={{ '--trend-scale': Math.max(b.submitted / maxBucket, 0.004) } as CSSProperties}
                    >
                      {b.submitted > 0 && <span className="trend-bar-val">{b.submitted}</span>}
                    </div>
                    <div
                      className="trend-bar trend-graded"
                      title={`مقيَّمة: ${b.graded}`}
                      style={{ '--trend-scale': Math.max(b.graded / maxBucket, 0.004) } as CSSProperties}
                    >
                      {b.graded > 0 && <span className="trend-bar-val">{b.graded}</span>}
                    </div>
                    <div
                      className="trend-bar trend-published"
                      title={`منشورة: ${b.published}`}
                      style={{ '--trend-scale': Math.max(b.published / maxBucket, 0.004) } as CSSProperties}
                    >
                      {b.published > 0 && <span className="trend-bar-val">{b.published}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="trend-legend">
              <LegendDot color="var(--accent)" label="مرفوعة" />
              {/* 5-D1 (A11 P2-4): matches .trend-graded — the amber series
                  tier (--chart-6), not --gold (2.30:1 on the white card in
                  light; collapses onto the accent bar in dark). */}
              <LegendDot color="var(--chart-6)" label="مقيَّمة" />
              <LegendDot color="var(--success)" label="منشورة" />
            </div>
          </>
        )}
      </SheetSection>

      {/* Papers register — 5-B4 consuming GET /admin/papers (5-B1):
          status pills + pagination, the §5 row 8 drill-down landing.
          R359 final: the register re-keys onto the DataSheet (mono
          numerics, the flat sg-flag statuses, the two-line identity
          cells); the pills ride the padded inset above the sheet and
          the pagination keeps the family footer. */}
      <div ref={registerRef} style={{ scrollMarginBlockStart: 'var(--sp-4)' }}>
        <SheetSection
          index="02"
          caption="PAPERS REGISTER"
          title="سجلّ البحوث"
          pad="none"
          /* r351 A2 (Q3): the no-meta prose fallback retired — the
           * counted total + status label (real data) stay. */
          aside={papersMeta ? (
            <span className="text-sm text-muted">
              {`${countAr(papersMeta.total, ['ورقة واحدة', 'ورقتان', 'أوراق', 'ورقة'])}${status ? ` · ${PAPER_STATUS_LABEL[status]}` : ' · جميع الحالات'}`}
            </span>
          ) : undefined}
        >
          <div className="sg-pad-in">
            <div className="filter-bar" role="group" aria-label="تصفية البحوث حسب الحالة">
              <button
                type="button"
                className={`pill${status === undefined ? ' on' : ''}`}
                aria-pressed={status === undefined}
                onClick={() => setStatusFilter(undefined)}
              >
                الكل
              </button>
              {RESEARCH_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`pill${status === st ? ' on' : ''}`}
                  aria-pressed={status === st}
                  onClick={() => setStatusFilter(st)}
                >
                  {PAPER_STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </div>

          {papers.isError ? (
            <div className="sg-pad-in">
              <ErrorState
                error={papers.error}
                message="تعذّر تحميل سجلّ البحوث"
                onRetry={() => papers.refetch()}
              />
            </div>
          ) : (
            <DataSheet
              caption="جدول سجلّ البحوث"
              columns={paperColumns}
              rows={papers.data?.data ?? []}
              loading={papers.isPending}
              empty={(
                /* r351 A2 (Q3): empty-state prose retired — the title +
                 * «عرض جميع الحالات» action suffice. */
                <div className="sg-pad-in">
                  <EmptyState
                    icon={FileText}
                    title={status ? `لا توجد بحوث بحالة «${PAPER_STATUS_LABEL[status]}»` : 'لا توجد بحوث بعد'}
                    description=""
                    action={status ? (
                      <button type="button" className="btn ghost sm" onClick={() => setStatusFilter(undefined)}>
                        <Icon icon={X} size={13} />
                        عرض جميع الحالات
                      </button>
                    ) : undefined}
                  />
                </div>
              )}
            />
          )}
          {papersMeta && papersMeta.totalPages > 1 && (
            <div className="sg-pad-in">
              <TablePaginationFooter
                page={papersMeta.page}
                totalPages={papersMeta.totalPages}
                total={papersMeta.total}
                unit={PAPER_UNIT}
                onPage={setPapersPage}
              />
            </div>
          )}
        </SheetSection>
      </div>

      {/* Top courses — r351 A2 (Q3): «بناءً على عدد الطلاب» subtitle
          retired — the title + enrollments column already say the sort
          key. R359 final: the table re-keys onto the DataSheet register
          (mono code + numeric columns). */}
      <SheetSection index="03" caption="TOP COURSES" title="أكثر المقرّرات تسجيلاً" pad="none">
        <DataSheet
          caption="جدول أكثر المقرّرات تسجيلاً"
          rows={data.topCourses}
          columns={[
            { key: 'code', label: 'الكود', mono: true, render: (c) => <bdi>{c.code}</bdi> },
            { key: 'name', label: 'اسم المقرّر', render: (c) => <span className="sg-cell-title">{c.name}</span> },
            { key: 'enrollments', label: 'طلاب مسجَّلون', numeric: true, render: (c) => c.enrollments },
            { key: 'lectures', label: 'المحاضرات', numeric: true, render: (c) => c.lectures },
          ]}
          empty={(
            <div className="sg-pad-in">
              <EmptyState illustration="empty-list"
                icon={ClipboardCheck}
                title="لا توجد تسجيلات بعد"
                description=""
              />
            </div>
          )}
        />
      </SheetSection>
    </div>
  );
}

/* ─── Admin: Courses ─────────────────────────────────────── */
export function AdminCoursesPage() {
  // 5-A8 P2-1 (the silent 20-row cap): server-side search + faculty
  // filter + pagination (5-B1's params), the students-roster pattern.
  // The KPI row is gone on purpose — its aggregates were computed over
  // a capped page (the bug itself); the header's count now reads the
  // server meta, and the roster owns the page.
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const facQ = useFaculties(useCurrentInstitutionSlug()); // r180: caller-institution scoping

  // ── Course CRUD (16-decisions #5: the page was display-only) ──────
  /* r153i: formMode replaces the old `{} as AdminCourse` fake-object
   * cast — three honest states instead of a sentinel object. */
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<CourseFormInput>({
    code: '', name: '', credits: 3, departmentId: '',
  });
  const [confirmingDelete, setConfirmingDelete] = useState<AdminCourse | null>(null);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(editing?.id ?? '');
  const deleteCourse = useDeleteCourse();
  const closeForm = () => { setFormMode(null); setEditing(null); };

  const openCreate = () => {
    setForm({ code: '', name: '', credits: 3, departmentId: '' });
    setEditing(null);
    setFormMode('create');
  };
  const openEdit = (c: AdminCourse) => {
    // r153i: resolve by id — department names are only unique per
    // faculty, and the seed really has two same-named science
    // departments (the projection ships departmentId for this).
    setForm({
      code: c.code,
      name: c.name,
      credits: c.credits,
      departmentId: c.departmentId ?? '',
    });
    setEditing(c);
    setFormMode('edit');
  };
  /* r153i: the modal stays open until the mutation SETTLES — the old
   * code closed it immediately, so the in-modal error AlertRow below
   * could never render and a failed save looked like a silent
   * success. Per-call onSuccess composes with the hook-level cache
   * invalidations (React Query v5 runs both). */
  const submit = () => {
    if (formMode === 'edit' && editing) {
      updateCourse.mutate(form as Partial<CourseFormInput>, {
        onSuccess: () => {
          toast.success(`حُفظت تعديلات «${form.name}».`, { title: 'تمّ الحفظ' });
          closeForm();
        },
      });
    } else {
      createCourse.mutate(form, {
        onSuccess: () => {
          toast.success(`أُضيف مقرّر «${form.name}» إلى السجلّ.`, { title: 'تمّت الإضافة' });
          closeForm();
        },
      });
    }
  };
  /* r153i: destructive action through the platform's accessible
   * ConfirmDialog (focus trap +Escape + aria) — the old native
   * confirm() had none of that — with toast feedback on both ends. */
  const remove = (c: AdminCourse) => setConfirmingDelete(c);

  // ── Offering create (r180 — «فتح شعبة», the r168 dead-end closed) ──
  /* Which course the offering modal targets (null = closed) — the same
   * honest target-object pattern as confirmingDelete above. The teacher
   * picker query is `enabled` only while the modal is open, so the
   * roster page fires no idle /admin/users round-trips. */
  const [offeringCourse, setOfferingCourse] = useState<AdminCourse | null>(null);
  const [offeringForm, setOfferingForm] = useState<OfferingFormInput>({
    courseId: '', teacherId: '', term: '', room: '', capacity: 40,
  });
  const createOffering = useCreateOffering();
  const teachersQ = useAdminTeachers(offeringCourse !== null);
  const closeOfferingForm = () => setOfferingCourse(null);
  const openOfferingForm = (c: AdminCourse) => {
    // capacity 40 = the backend schema's own default (offeringCreateSchema).
    setOfferingForm({ courseId: c.id, teacherId: '', term: '', room: '', capacity: 40 });
    setOfferingCourse(c);
  };
  const submitOffering = () => {
    if (!offeringCourse) return;
    const room = offeringForm.room?.trim() ?? '';
    createOffering.mutate(
      {
        courseId: offeringCourse.id,
        teacherId: offeringForm.teacherId,
        term: offeringForm.term.trim(),
        // Room is optional on the wire (zod: nullable().optional()) —
        // an empty input sends nothing, not ''.
        ...(room ? { room } : {}),
        capacity: offeringForm.capacity,
      },
      {
        onSuccess: () => {
          toast.success(
            `فُتحت شعبة «${offeringCourse.name}» للفصل «${offeringForm.term.trim()}».`,
            { title: 'تمّ فتح الشعبة' },
          );
          closeOfferingForm();
        },
      },
    );
  };

  // ── End of CRUD ────────────────────────────────────────────────
  const appliedQ = useRef(debouncedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedQ.current) return;
      appliedQ.current = next;
      setDebouncedQ(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // r183-B5 (A8 wave-A P2): the 8-column roster scrolled 162px sideways
  // at 768 — the compact band folds «تسجيلات»+«الفصول» into the row's
  // meta line at ≤1024 (8 → 6 columns, the QualityPages column-diet
  // pattern). ≤640 keeps the .tbl-stack card collapse; the folded counts
  // stay visible in the meta line there too.
  const compact = useCompactRosterBand();

  const coursesQ = useAdminCourses({
    page,
    limit: 20,
    q: debouncedQ || undefined,
    facultyId: facultyId || undefined,
  });
  const hasFilters = debouncedQ !== '' || facultyId !== '';
  const clearFilters = () => {
    setQ('');
    setDebouncedQ('');
    setFacultyId('');
    setPage(1);
  };

  const meta = coursesQ.data?.meta;
  const courses = coursesQ.data?.data;

  /* R359 final — the console's sheet columns: the r183-B5 compact diet
   * (≤1024) keeps folding «تسجيلات» + «الفصول» into the name cell's
   * meta line (8 → 6 columns) exactly as before; the numerics ride the
   * mono tabular register and the verbs ride the trailing noLabel
   * cell (the destructive delete keeps the r305ao danger class). */
  const courseColumns: DataSheetColumn<AdminCourse>[] = [
    { key: 'code', label: 'الكود', mono: true, render: (c) => <bdi>{c.code}</bdi> },
    {
      key: 'name',
      label: 'اسم المقرّر',
      render: (c) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {c.themeColor && (
            <span className="admin-course-tint" style={{ background: c.themeColor }} aria-hidden />
          )}
          <span className="sg-cell-stack">
            <span className="sg-cell-title">{c.name}</span>
            {compact && (
              <span className="sg-cell-sub">
                {countAr(c.totalEnrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً'])}
                {' · '}
                {countAr(c.offeringCount, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'faculty',
      label: 'الكلّيّة / القسم',
      render: (c) => (
        c.faculty ? (
          <span className="sg-cell-stack">
            <span className="sg-cell-title">
              <EmojiIcon emoji={c.facultyEmoji} fallback={BookOpen} size={16} className="text-subtle" /> {c.faculty}
            </span>
            <span className="sg-cell-sub">{c.department ?? '—'}</span>
          </span>
        ) : '—'
      ),
    },
    { key: 'credits', label: 'س.م', numeric: true, render: (c) => c.credits },
    ...(!compact ? [{ key: 'enrollments', label: 'تسجيلات', numeric: true, render: (c: AdminCourse) => c.totalEnrollments }] : []),
    { key: 'lectures', label: 'محاضرات', numeric: true, render: (c) => c.totalLectures },
    ...(!compact ? [{ key: 'offerings', label: 'الفصول', numeric: true, render: (c: AdminCourse) => c.offeringCount }] : []),
    {
      key: 'actions',
      label: '',
      noLabel: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          {/* r180: «فتح شعبة» leads the cluster — the section
              create is this round's headline action, and the
              ghost sm + Plus grammar matches the siblings
              (the header's «إضافة مقرّر» is its primary twin). */}
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openOfferingForm(c)}
            aria-label={`فتح شعبة لمقرّر ${c.name}`}
          >
            <Icon icon={Plus} size={13} />
            فتح شعبة
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openEdit(c)}
            aria-label={`تعديل ${c.name}`}
          >
            <Icon icon={ArrowLeft} size={13} />
            تعديل
          </button>
          {/* R305-A8: the destructive verb stands apart — the
              reference danger fill rides the standalone
              .r305ao-btn-danger class (the scoped sheet's
              §9 hierarchy) while the ghost danger variant
              stays for non-scoped surfaces. The confirm
              flow below is untouched. */}
          <button
            type="button"
            className="btn ghost sm danger r305ao-btn-danger"
            onClick={() => remove(c)}
            aria-label={`حذف ${c.name}`}
          >
            <Icon icon={Trash2} size={13} />
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="إدارة المقرّرات"
        /* r351 A2 (Q3): header description trimmed — the counted total
         * (meta.total — the pinned data read) stays; the filtered-state
         * suffix and the pending prose fallback retired. */
        description={meta
          ? `${countAr(meta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}${hasFilters ? '' : ' في الجامعة'}`
          : undefined}
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'المقرّرات' }]}
        actions={(
          /* R342-09 (the students-page family contract): the page's ONE
                   * create action rides the header action slot on the accent
                   * register — the first viewport at every width keeps the
                   * affordance (the admin topbar hides «اسأل AI» entirely). The
                   * FilterBar trailing seat returns to filters-only. */
                  <button
            type="button"
            className="btn accent sm"
            onClick={openCreate}
            aria-label="إضافة مقرّر جديد"
          >
            <Icon icon={Plus} size={14} />
            إضافة مقرّر
          </button>
        )}
      />

      {/* R359 final — the KPI band: the console's honest counts (the
          server meta total · the faculty filter's options · the current
          query's rows) — the students exemplar's band, twin register.
          The old capped-page aggregates stay retired (5-A8 P2-1). */}
      <KpiBand
        items={[
          { index: '01', caption: 'COURSES', label: 'إجمالي المقرّرات', value: meta?.total ?? 0, empty: coursesQ.isPending },
          { index: '02', caption: 'FACULTIES', label: 'كلّيّات متاحة للتصفية', value: facQ.data?.length ?? 0, empty: facQ.isPending },
          { index: '03', caption: 'RESULTS', label: 'نتائج الاستعلام الحالي', value: courses?.length ?? 0, empty: coursesQ.isPending },
        ]}
      />

      {/* R304: the roster's control rail rides the patterns FilterBar —
          both filters run server-side (R342-09: the create action moved
          up to the page header's action slot, the students-page family
          contract). The old capped-KPI header copy retired — the count
          reads the server meta in the header description. */}
      <FilterBar
        filters={(
          <>
            <div className="admin-students-search">
              <Icon icon={Search} size={14} />
              <input
                type="search"
                placeholder="ابحث بالاسم أو الكود…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="admin-students-input"
                aria-label="البحث في المقرّرات"
              />
            </div>
            <select
              className="admin-students-input"
              value={facultyId}
              onChange={(e) => { setFacultyId(e.target.value); setPage(1); }}
              disabled={facQ.isPending}
              aria-label="تصفية حسب الكلّيّة"
            >
              <option value="">{facQ.isPending ? 'جارٍ تحميل الكلّيّات…' : 'كلّ الكلّيّات'}</option>
              {facQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {facQ.isError && (
              <button type="button" className="btn ghost sm" onClick={() => facQ.refetch()}>
                إعادة تحميل الكلّيّات
              </button>
            )}
          </>
        )}
      />

      {/* R359 final — the roster sheet: pad=none (the table IS the
          body); the pagination footer rides the padded inset below. */}
      <SheetSection index="01" caption="COURSES CONSOLE" title="سجلّ المقرّرات" pad="none">
        {coursesQ.isError ? (
          <div className="sg-pad-in">
            <ErrorState
              error={coursesQ.error}
              message="تعذّر تحميل قائمة المقرّرات"
              onRetry={() => coursesQ.refetch()}
            />
          </div>
        ) : (
          <>
            <DataSheet
              caption="جدول سجلّ المقرّرات"
              columns={courseColumns}
              rows={courses ?? []}
              loading={coursesQ.isPending}
              empty={(
                /* r351 A2 (Q3): empty-state prose retired — the title +
                 * reset action suffice. */
                <div className="sg-pad-in">
                  <EmptyState illustration="empty-search"
                    title="لا توجد نتائج"
                    description=""
                    action={hasFilters ? (
                      <button type="button" className="btn ghost sm" onClick={clearFilters}>
                        <Icon icon={X} size={13} />
                        مسح البحث والفلتر
                      </button>
                    ) : undefined}
                  />
                </div>
              )}
            />
            {courses && meta && meta.totalPages > 1 && (
              <div className="sg-pad-in">
                <TablePaginationFooter
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                  unit={['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً']}
                  onPage={setPage}
                />
              </div>
            )}
          </>
        )}
      </SheetSection>

      {/* Course create/edit form — 16-decisions #5. Keyed off formMode:
          switching between create and edit remounts the modal and resets
          the local draft (the same per-item pattern the governance cards
          use). r153i: the four fields joined the FormField canon
          (r152c) — the retired .comp-form-field class was a regression
          the unaudited merge reintroduced. */}
      <Modal
        open={formMode !== null}
        onClose={closeForm}
        ariaLabel={formMode === 'edit' ? 'تعديل المقرّر' : 'إضافة مقرّر جديد'}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            {formMode === 'edit' ? 'تعديل المقرّر' : 'إضافة مقرّر جديد'}
          </h3>
          <button type="button" className="icon-btn" onClick={closeForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          {/* r351 A2 (Q3): mono-face aside retired — the placeholder carries the example. */}
          <FormField label="كود المقرّر" id="course-code" hint="مثال: CS101">
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CS101"
            />
          </FormField>
          <FormField label="اسم المقرّر" id="course-name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مقدمة في علوم الحاسب"
            />
          </FormField>
          {/* r351 A2 (Q3): faculty-derivation hint retired — the select labels say it. */}
          <FormField label="القسم" id="course-dept">
            <select
              className="input"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              disabled={facQ.isPending}
            >
              <option value="">اختر القسم…</option>
              {facQ.data?.flatMap((f) =>
                f.departments.map((d) => (
                  <option key={d.id} value={d.id}>{f.name} · {d.name}</option>
                )),
              )}
            </select>
          </FormField>
          <FormField
            label="الساعات المعتمدة"
            id="course-credits"
            /* r351 A2 (Q3): hint trimmed to the constraint — the
             * button-behavior aside retired. */
            hint="بين 1 و10"
          >
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={!form.code || !form.name || !form.departmentId ||
              !(form.credits >= 1) ||
              createCourse.isPending || updateCourse.isPending}
          >
            {createCourse.isPending || updateCourse.isPending
              ? 'جارٍ الحفظ…'
              : formMode === 'edit' ? 'حفظ التعديلات' : 'إضافة المقرّر'}
          </button>
        </div>
        {(createCourse.isError || updateCourse.isError) && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر حفظ المقرّر"
            description={apiErrorMessage(
              createCourse.isError ? createCourse.error : updateCourse.error,
              'لم يستجب الخادم للطلب. إعادة المحاولة.',
            )}
          />
        )}
      </Modal>

      {/* r180: «فتح شعبة» — the offering create modal (POST /offerings,
          the r168 endpoint that had ZERO frontend consumers). Same modal
          grammar as the course form; the teacher select reads the
          institution's TEACHER roster (useAdminTeachers — enabled only
          while this modal is open) because the backend rejects any
          teacher who is not an ACTIVE TEACHER member of the course's
          institution. The term is free text 1..50 (placeholder carries
          the platform's convention) and capacity defaults to the
          backend schema's own 40. */}
      <Modal
        open={offeringCourse !== null}
        onClose={closeOfferingForm}
        ariaLabel="فتح شعبة"
      >
        <div className="modal-header">
          <h3 className="modal-title">فتح شعبة</h3>
          <button type="button" className="icon-btn" onClick={closeOfferingForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          {offeringCourse && (
            /* r351 A2 (Q3): framing sentence retired — the target
             * course (name + code, real data) stands alone. */
            <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
              {offeringCourse.name} (<bdi>{offeringCourse.code}</bdi>)
            </p>
          )}
          {/* r351 A2 (Q3): length-rule hint retired — the placeholder carries the example. */}
          <FormField label="الفصل الدراسي" id="offering-term">
            <input
              className="input"
              value={offeringForm.term}
              onChange={(e) => setOfferingForm({ ...offeringForm, term: e.target.value })}
              placeholder="2024-FALL"
              maxLength={50}
            />
          </FormField>
          <FormField
            label="الأستاذ"
            id="offering-teacher"
            /* r351 A2 (Q3): hint trimmed to the honest constraint core. */
            hint="أساتذة مؤسستك فقط"
          >
            <select
              className="input"
              value={offeringForm.teacherId}
              onChange={(e) => setOfferingForm({ ...offeringForm, teacherId: e.target.value })}
              disabled={teachersQ.isPending}
            >
              <option value="">
                {teachersQ.isPending ? 'جارٍ تحميل الأساتذة…' : 'اختر الأستاذ…'}
              </option>
              {teachersQ.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="القاعة (اختياري)" id="offering-room">
            <input
              className="input"
              value={offeringForm.room}
              onChange={(e) => setOfferingForm({ ...offeringForm, room: e.target.value })}
              placeholder="قاعة A12"
            />
          </FormField>
          {/* r351 A2 (Q3): «السعة» definition hint retired — the label says it. */}
          <FormField label="السعة" id="offering-capacity">
            <input
              className="input"
              type="number"
              min={1}
              max={10000}
              value={offeringForm.capacity}
              onChange={(e) => setOfferingForm({ ...offeringForm, capacity: Number(e.target.value) })}
            />
          </FormField>
          {teachersQ.isError && (
            <AlertRow
              color="red"
              icon={AlertTriangle}
              title="تعذّر تحميل قائمة الأساتذة"
              description={apiErrorMessage(
                teachersQ.error,
                'لم يستجب الخادم للطلب. إعادة المحاولة.',
              )}
              actions={
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => teachersQ.refetch()}
                  disabled={teachersQ.isPending}
                >
                  إعادة المحاولة
                </button>
              }
            />
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeOfferingForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitOffering}
            disabled={!offeringForm.term.trim() || !offeringForm.teacherId
              || !(offeringForm.capacity >= 1) || createOffering.isPending}
          >
            {createOffering.isPending ? 'جارٍ الفتح…' : 'فتح الشعبة'}
          </button>
        </div>
        {createOffering.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر فتح الشعبة"
            description={apiErrorMessage(
              createOffering.error,
              'لم يستجب الخادم للطلب. إعادة المحاولة.',
            )}
          />
        )}
      </Modal>

      {/* r153i: destructive confirm — the accessible ConfirmDialog
          (focus trap + Escape + aria) replaces the old native
          confirm(); toast feedback closes the loop on both ends. */}
      <ConfirmDialog
        open={confirmingDelete !== null}
        title="حذف المقرّر"
        message={confirmingDelete
          ? `سيُحذف «${confirmingDelete.name}» نهائيًا من السجلّ الجامعي. لا يمكن التراجع عن هذا الإجراء.`
          : ''}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setConfirmingDelete(null)}
        onConfirm={async () => {
          if (!confirmingDelete) return;
          const target = confirmingDelete;
          setConfirmingDelete(null);
          try {
            await deleteCourse.mutateAsync(target.id);
            toast.success(`حُذف «${target.name}» من السجلّ.`, { title: 'تمّ الحذف' });
          } catch (err) {
            toast.error(apiErrorMessage(err, 'تعذّر حذف المقرّر — قد تكون له شُعب أو مفاهيم مرتبطة.'), {
              title: 'فشل الحذف',
            });
          }
        }}
      />
    </div>
  );
}
