import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle, FileText, Bell,
  CheckCircle2, Filter, Activity, Microscope,
  ClipboardCheck, Calendar,
  type LucideIcon,
} from 'lucide-react';
import { Card, UserAvatar } from '../../components/primitives';
import { ErrorState, EmptyState, ChartSkeleton, ListSkeleton } from '../../components/primitives/States';
import {
  PageFrame, PageHeader, SectionHeader, RowList, RowItem, StatLine, TodayList, FilterBar,
} from '../../components/patterns';
import '../../styles/teacher/ds-core.css'; // R305 DS: §0 hr- primitives + §A tqd- deltas (mounted via .hr-scope)
/* R332 W11 — the dashboard grammar bridge (styles/landing/inner.css §W11):
 * the [nn] section-index chips (.w11-idx) this page mounts in its
 * SectionHeader/Card titles — the r319 student sheet's SectionBar
 * register, self-contained because this page never loads that sheet. */
import '../../styles/landing/inner.css';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import {
  useTeacherDashboard,
  useTeacherOfferings,
  type TeacherDashboard,
  type TeacherOffering,
} from '../../hooks/useResources';
import { countAr, formatRelativeAr, WEEKDAY_NAMES_AR } from '../../lib/format';
import { formatDate, formatNum, formatPct1 } from '../../utils/numbers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type FeedFilter = 'all' | 'submissions' | 'research' | 'attendance';

const FILTER_OPTIONS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'submissions', label: 'تسليمات' },
  { value: 'research', label: 'بحوث' },
  { value: 'attendance', label: 'حضور' },
];

const KIND_ICON: Record<'submissions' | 'research' | 'attendance', LucideIcon> = {
  submissions: FileText,
  research: Microscope,
  attendance: AlertTriangle,
};
const KIND_TONE: Record<'submissions' | 'research' | 'attendance', 'amber' | 'red' | 'green' | 'purple' | 'gold'> = {
  submissions: 'amber',
  research: 'purple',
  attendance: 'red',
};
/* The action names what clicking actually does (mission H) — a generic
 * "مراجعة" on every row hides the destination. The attendance action
 * names the recording form it opens (/teacher/attendance) — no log
 * view exists, so a "عرض السجل" label promised a page that isn't
 * there. */
const KIND_ACTION: Record<'submissions' | 'research' | 'attendance', string> = {
  submissions: 'تقييم التسليم',
  research: 'مراجعة البحث',
  attendance: 'تسجيل الحضور',
};
/* Visual weight follows the action's kind — decision > review >
 * informational: grading a submission is the teacher's decision queue
 * (primary), reviewing research is a read-then-decide flow (outline),
 * recording attendance is an informational form (ghost). The old
 * all-primary row made every action shout equally. */
const KIND_ACTION_CLASS: Record<'submissions' | 'research' | 'attendance', string> = {
  submissions: 'btn primary sm',
  research: 'btn outline sm',
  attendance: 'btn ghost sm',
};

/* countAr + formatRelativeAr live in lib/format.ts (wave 9-a). */

/**
 * Trend drawability floor (A6 P2, 22-a). The 6-week window comes back
 * with 5/6 weeks null server-side early in a term; a line chart with a
 * single non-null point renders one floating dot that reads as a
 * rendering bug (VLM flagged it on desktop, mobile AND dark). A series
 * needs ≥2 non-null points to draw a trend — exported for the unit
 * suite.
 */
export function trendCoverage(trend: TeacherDashboard['trend']): {
  /** True when at least one series has ≥2 non-null points. */
  drawable: boolean;
  /** Weeks with any recorded value (grade OR attendance). */
  weeksRecorded: number;
} {
  const safeTrend = trend ?? [];
  const gradePoints = safeTrend.filter((t) => t.avgGradePct !== null).length;
  const attendancePoints = safeTrend.filter((t) => t.attendancePct !== null).length;
  return {
    drawable: gradePoints >= 2 || attendancePoints >= 2,
    weeksRecorded: safeTrend.filter((t) => t.avgGradePct !== null || t.attendancePct !== null).length,
  };
}

/* ─── r164-h: the teacher home's daily-work trio (pure decisions) ── */

/** One slot of the today strip — composed client-side from the SAME
 * /teacher/me/offerings schedule the weekly Schedule page renders (the
 * backend needs no new endpoint: the data already rides the offering
 * rows; composing here is the smaller surface). */
export interface TodaySlot {
  key: string;
  offeringId: string;
  courseName: string;
  courseCode: string;
  room: string | null;
  startTime: string;
  endTime: string;
}

/** "HH:MM" → minutes-since-midnight (the wire format ScheduleSlot
 * stores; a malformed value degrades to 0 — never a NaN sort). */
function slotMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

/**
 * Today's schedule slots across ALL of the teacher's offerings, sorted
 * by start time — the dashboard's today strip. `now` decides which
 * weekday is "today" (dayOfWeek uses the Date#getDay() convention,
 * 0=Sunday — pinned in schema.prisma and TeacherSchedulePage).
 * Pure + exported for the unit suite.
 */
export function todaySlots(
  offerings: ReadonlyArray<TeacherOffering>,
  now: Date = new Date(),
): TodaySlot[] {
  const dow = now.getDay();
  const slots: TodaySlot[] = [];
  for (const o of offerings) {
    for (const slot of o.schedule) {
      if (slot.dayOfWeek !== dow) continue;
      slots.push({
        key: `${o.id}:${slot.id}`,
        offeringId: o.id,
        courseName: o.course.name,
        courseCode: o.course.code,
        room: slot.room ?? o.room ?? null,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }
  slots.sort((a, b) => slotMinutes(a.startTime) - slotMinutes(b.startTime));
  return slots;
}

/** Where a slot stands relative to `now` — the strip's «جارٍ الآن» /
 * «انتهت» markers. Pure + exported for the unit suite. */
export function slotPhase(slot: TodaySlot, now: Date = new Date()): 'done' | 'ongoing' | 'upcoming' {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= slotMinutes(slot.endTime)) return 'done';
  if (minutes >= slotMinutes(slot.startTime)) return 'ongoing';
  return 'upcoming';
}

/** The top at-risk students for the home shortcuts — the /teacher/risks
 * endpoint already returns worst-first (riskScore ascending: 100=OK,
 * 0=CRITICAL), so this is the honest take cap. Pure + exported for tests. */
/* r351 A2 (Q3): AT_RISK_SHORTCUT_TAKE + topRisks retired with the
   shortcuts section (the intelligence page owns the risk board). */

/* Same labels as TeacherIntelligencePage's risk rows (the intelligence
 * page keeps its own edge/ink maps local — the label vocabulary is the
 * shared contract, mirrored here rather than coupled). */
/* r351 A2 (Q3): RISK_LABEL/RISK_TONE retired with the at-risk
   shortcuts section (the feed + the intelligence page own the signals;
   the roster keeps its own risk chips). */

export function TeacherDashboardPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const dash = useTeacherDashboard();
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // r348 (the dead-left-half fix): the header's inline-end status strip
  // seats the ONE next commitment of today beside the follow-up chip.
  // The offerings query is shared with TodayLectures below (react-query
  // dedupes — one request), and the hook rides BEFORE the early returns
  // so the mirror frames keep one hook order.
  const offsQ = useTeacherOfferings();

  const visible = useMemo(() => {
    const feed = dash.data?.feed ?? [];
    return filter === 'all' ? feed : feed.filter((f) => f.kind === filter);
  }, [dash.data, filter]);

  const filterCounts = useMemo(() => {
    const feed = dash.data?.feed ?? [];
    return {
      all: feed.length,
      submissions: feed.filter((f) => f.kind === 'submissions').length,
      research: feed.filter((f) => f.kind === 'research').length,
      attendance: feed.filter((f) => f.kind === 'attendance').length,
    } as Record<FeedFilter, number>;
  }, [dash.data]);

  // The header's next-commitment block (r348): the first slot whose
  // phase isn't «done» — an ongoing lecture reads «جارٍ الآن», an
  // upcoming one reads «التالية». Composed from the SAME schedule the
  // [02] strip renders; nothing here is fabricated, and an empty day
  // renders no block at all (the chip keeps the strip alone).
  const now = new Date();
  const allSlots = offsQ.data ? todaySlots(offsQ.data, now) : [];
  const nextSlot = allSlots.find((s) => slotPhase(s, now) !== 'done') ?? null;

  if (dash.isPending) {
    /* r242 (Superlist composition): the loading frame mirrors what lands —
     * header → stat line zone → two queue surfaces → the chart card. */
    return (
      <div className="hr-scope">
        <PageFrame aria-busy="true" aria-live="polite">
          <PageHeader title="لوحة الأستاذ" description="جارٍ تحضير لوحتك…" />
          <RowList loading aria-label="ملخص نشاط التدريس" />
          <RowList loading aria-label="طابور التصحيح" />
          <Card title="اتجاه الأداء والحضور">
            <ChartSkeleton height={240} />
          </Card>
        </PageFrame>
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="hr-scope">
        <PageFrame>
          <PageHeader title="لوحة الأستاذ" />
          <ErrorState
            message="تعذَّر تحميل لوحة الأستاذ"
            error={dash.error}
            onRetry={() => dash.refetch()}
          />
        </PageFrame>
      </div>
    );
  }

  const d = dash.data;
  // Build the shared chart options ONCE per render (each cartesianOptions()
  // call resolves CSS custom properties — it is not free).
  const baseOpts = cartesianOptions({ legend: true });

  // A6 P2 (22-a): a series needs ≥2 non-null points to draw a trend.
  // Below that floor the canvas is replaced by the platform empty-state
  // grammar — a lone dot on an empty grid read as a rendering bug, not
  // as "not enough data yet". The sr-only data table feeds both branches.
  const coverage = trendCoverage(d.trend);

  return (
    /* r242 — the Superlist composition (patterns contract, r210):
     * PageFrame → PageHeader → StatLine → the work queue (grading first,
     * today's lectures beside it) → at-risk shortcuts → the trend chart →
     * the feed behind a FilterBar. No KPI wall: the numbers ride one
     * flat line, the ROWS carry the day's work. */
    /* R305 DS: the .hr-scope wrapper (display:contents) declares
     * the ember tokens + the §A tqd- deltas for this surface. */
    <div className="hr-scope">
    <PageFrame>
      <PageHeader
        title="لوحة الأستاذ"
        eyebrow="متابعات"
        meta={
          <>
            {WEEKDAY_NAMES_AR[new Date().getDay()]} · {formatDate(new Date(), { day: 'numeric', month: 'long' })}
          </>
        }
        actions={
          /* r348 — the header's inline-end status strip (the dead-left-
           * half fix, measured x=144..283 chip vs x=918 text at 1440):
           * the ONE next commitment of today + the follow-up chip give
           * the far half real data to hold. An empty day keeps the chip
           * alone — nothing is fabricated. */
          <>
            {nextSlot && (
              <span className={`td-hero-next${slotPhase(nextSlot, now) === 'ongoing' ? ' td-hero-next--live' : ''}`}>
                <span className="td-hero-next-label">
                  {slotPhase(nextSlot, now) === 'ongoing' ? 'جارٍ الآن' : 'التالية اليوم'}
                </span>
                <span className="td-hero-next-course">{nextSlot.courseName}</span>
                <bdi className="td-hero-next-time">
                  {nextSlot.startTime} — {nextSlot.endTime}
                </bdi>
              </span>
            )}
            <span className="hr-chip" data-tone={visible.length === 0 ? 'ok' : 'ember'}>
              <bdi className="font-mono" dir="ltr">{visible.length}</bdi>
              <span className="sr-only">{countAr(visible.length, ['عنصر يحتاج متابعة', 'عنصران يحتاجان متابعة', 'عناصر تحتاج متابعة', 'عنصراً يحتاج متابعة'])}</span>
            </span>
          </>
        }
      />

      {/* The compact signal line (StatLine — one flat row, no tiles).
          Tones are semantic only: work waiting reads amber, healthy
          numbers stay neutral. */}
      <StatLine
        /* r348: spread seats the four stats across the sheet's full line
         * (the inline-end half held ~440px of dead paper at 1440); the
         * two not-yet data wear the honest-empty register. */
        spread
        items={[
          {
            label: 'طلابك',
            value: formatNum(d.kpi.studentCount),
            hint: 'مقرّراتك',
          },
          {
            label: 'متوسط الأداء',
            value: d.kpi.avgGradePct !== null ? `${formatPct1(d.kpi.avgGradePct)}%` : '—',
            hint: d.kpi.avgGradePct === null ? 'لا تقييمات' : 'تقييمات معتمدة',
            tone: d.kpi.avgGradePct === null || d.kpi.avgGradePct >= 70 ? 'neutral' : 'warning',
            empty: d.kpi.avgGradePct === null,
          },
          {
            label: 'الحضور',
            value: d.kpi.attendancePct !== null ? `${formatPct1(d.kpi.attendancePct)}%` : '—',
            hint: d.kpi.attendancePct === null ? 'لا سجلات' : 'الجلسات المسجّلة',
            tone: d.kpi.attendancePct === null || d.kpi.attendancePct >= 75 ? 'neutral' : 'warning',
            empty: d.kpi.attendancePct === null,
          },
          {
            label: 'بحاجة تقييم',
            value: formatNum(d.kpi.needsReview),
            hint: 'واجبات وبحوث',
            tone: d.kpi.needsReview === 0 ? 'positive' : 'warning',
            to: '/teacher/assignments',
          },
        ]}
      />

      {/* ── r164-h trio, recomposed r242 — actionable first: the
          pending-grading queue (the work that waits on the teacher's
          pen) + today's schedule strip, then the at-risk shortcuts.
          All three consume data already in flight — the queue rides the
          dashboard aggregate, the strip composes /me/offerings, the
          shortcuts ride /teacher/risks. */}
      <div className="grid-2-1">
        <section aria-label="طابور التصحيح">
          {/* W11: the [nn] index chips ride the section titles — the same
              gutter grammar the student dashboard's SectionBar speaks. */}
          <PendingGradingQueue entries={d.pendingGrading} />
        </section>
        <TodayLectures />
      </div>

      {/* r351 A2 (Q3): the at-risk shortcuts section is RETIRED — its
          signals ride the follow-ups feed above (absence rows) and the
          intelligence page owns the full board. One actionable surface
          per signal. */}

      {/* Performance + attendance trend — real 6-week data, wrapped for
          screen readers (aria-label + sr-only data table, audit 0-f). */}
      <Card
        title={<>الأداء والحضور</>}
        icon={Activity} subtitle="آخر ستة أسابيع">
        {!coverage.drawable ? (
          <>
            <EmptyState
              icon={Activity}
              title="لا تتوفّر بيانات كافية بعد لرسم الاتجاه"
              description={
                coverage.weeksRecorded === 0
                  ? 'لم يُسجَّل أي أسبوع حتى الآن — يُرسم المخطط تلقائياً بعد اكتمال أسبوعين على الأقل.'
                  : `${countAr(coverage.weeksRecorded, ['أسبوع واحد مسجَّل', 'أسبوعان مسجَّلان', 'أسابيع مسجَّلة', 'أسبوعاً مسجَّلاً'])} حتى الآن — يُرسم المخطط تلقائياً بعد اكتمال أسبوعين على الأقل.`
              }
            />
            {/* r351 A2 (Q3): the not-enough-data fallback keeps its
                one honest line — the sr table retired with the chart's
                own table above. */}
            <div className="visually-hidden">
              <p>لا تتوفّر بيانات كافية بعد لرسم المخطط الخطي.</p>
            </div>
          </>
        ) : (
          <ChartFrame
            ariaLabel="مخطط خطي لمتوسط الأداء ونسبة الحضور خلال الأسابيع الستة الماضية"
            summary="الأداء مقابل الحضور."
            height={240}
            
          >
            <Line
              key={themeKey}
              data={trendChartData(d.trend)}
              options={{
                ...baseOpts,
                scales: {
                  ...baseOpts.scales,
                  y: { ...baseOpts.scales!.y, min: 0, max: 100 },
                },
              }}
            />
          </ChartFrame>
        )}
      </Card>

      {/* Filter toolbar — the FilterBar pattern (r210): one calm row,
          pills keep their aria-pressed state, the full-notifications
          link rides the trailing slot. */}
      <FilterBar
        filters={
          <div className="flex items-center gap-2" role="group" aria-label="تصفية التيار">
            <Icon icon={Filter} size={14} className="text-subtle" />
            <span className="text-xs text-subtle">تصفية:</span>
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`pill${filter === o.value ? ' on' : ''}`}
                aria-pressed={filter === o.value}
                onClick={() => setFilter(o.value)}
              >
                {o.label}
                <span className="filter-pill-count">{filterCounts[o.value]}</span>
              </button>
            ))}
          </div>
        }
        trailing={
          <Link to="/teacher/alerts" className="btn ghost sm">
            <Icon icon={Bell} size={13} />
            الإشعارات
          </Link>
        }
      />

      {/* The feed — the RowList grammar: one calm surface of rows, the
          honest empty state names the win. */}
      <RowList
        aria-label="تيار المتابعة"
        empty={
          <EmptyState
            icon={CheckCircle2}
            title="لا متطلبات الآن — أحسنت!"
            action={
              <Link to="/teacher/intelligence" className="btn outline sm">
                <Icon icon={Users} size={13} />
                استعرض أداء مقرّراتك
              </Link>
            }
          />
        }
      >
        {visible.map((item) => <FeedRow key={item.id} item={item} />)}
      </RowList>
    </PageFrame>
    </div>
  );
}

function trendChartData(trend: TeacherDashboard['trend']) {
  const c = chartColors();
  return {
    labels: trend.map((t) => t.week),
    datasets: [
      {
        label: 'متوسط الأداء %',
        data: trend.map((t) => t.avgGradePct ?? null),
        borderColor: c.accent,
        backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.accent,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: 'الحضور %',
        data: trend.map((t) => t.attendancePct ?? null),
        borderColor: c.success,
        backgroundColor: `color-mix(in srgb, ${c.success} 10%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.success,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };
}

function FeedRow({ item }: { item: TeacherDashboard['feed'][number] }) {
  const Icon_ = KIND_ICON[item.kind];
  const tone = KIND_TONE[item.kind];
  return (
    <RowItem
      leading={
        item.author ? (
          <UserAvatar
            initials={item.author.avatarInitials ?? `${item.author.firstName[0]}${item.author.lastName[0]}`}
            color={item.author.avatarColor ?? undefined}
            size={40}
          />
        ) : (
          <span className={`feed-item-avatar ${tone}`}>
            <Icon icon={Icon_} size={18} />
          </span>
        )
      }
      title={item.title}
      meta={
        <>
          <span>{item.author ? `${item.author.firstName} ${item.author.lastName}` : 'النظام'}</span>
          {/* meta carries a Latin course code — bdi keeps RTL punctuation order */}
          <bdi>{item.meta}</bdi>
          <span>{formatRelativeAr(item.when)}</span>
        </>
      }
      trailing={
        <Link to={item.actionTo} className={KIND_ACTION_CLASS[item.kind]}>
          <Icon icon={Icon_} size={13} />
          {KIND_ACTION[item.kind]}
        </Link>
      }
    />
  );
}

/* ═══════════ r164-h trio — recomposed r242 on the patterns ═══════════ */

/**
 * The pending-grading queue — the teacher home's first actionable
 * surface (SectionHeader + RowList, the Superlist grammar). Each row's
 * title links straight into the ONE surface that walks the full queue
 * (/teacher/assignments — actionTo travels from the backend rollup).
 * Empty state names the win, not the void: «لا انتظار — كل التسليمات
 * مُقيَّمة».
 */
function PendingGradingQueue({ entries }: { entries: TeacherDashboard['pendingGrading'] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  return (
    <>
      <SectionHeader
        title={<>طابور التصحيح</>}
        description={undefined}
        actions={total > 0 ? (
          /* R305 DS: the ONE ember-flavored primary action of the
           * home — the queue is the day's first decision surface. */
          <Link to="/teacher/assignments" className="btn primary sm hr-cta">
            <Icon icon={ClipboardCheck} size={13} /> ابدأ التصحيح
          </Link>
        ) : undefined}
      />
      <RowList aria-label="طابور التصحيح">
        {entries.length === 0 ? (
          /* R305 DS: the structured empty (§0 .hr-empty) — the win
           * named, its line closed by the green status chip. */
          <div className="hr-empty">
            <strong>لا انتظار — كل التسليمات مُقيَّمة</strong>
            <span>ستظهر هنا التسليمات الجديدة فور وصولها بانتظار درجتك.</span>
            <span className="hr-chip" data-tone="ok">مكتمل</span>
          </div>
        ) : (
          entries.map((e) => (
            /* r289: الصف كله الوصلة (RowItem to) — طابور التصحيح قائمة
               تنقّل بالكامل، وأرضية اللمس بعرض الصف. */
            <RowItem
              key={e.assignmentId}
              to={e.actionTo}
              leading={
                <>
                  {/* The tabular count is decorative — the spoken value
                      rides a visually-hidden counted noun (the
                      queue-group badge vocabulary), so screen readers
                      hear the per-row submission count. */}
                  <span className="tq-num tqd-count" aria-hidden="true">{formatNum(e.count)}</span>
                  <span className="visually-hidden">
                    {countAr(e.count, ['تسليم واحد', 'تسليمان', 'تسليمات', 'تسليماً'])}
                  </span>
                </>
              }
              title={e.title}
              meta={
                <>
                  <bdi>{e.course.code}</bdi>
                  {e.oldestSubmittedAt && <> · أقدم {formatRelativeAr(e.oldestSubmittedAt)}</>}
                </>
              }
              trailing={<span className="hr-chip" data-tone="warn">بانتظارك</span>}
            />
          ))
        )}
      </RowList>
    </>
  );
}

/**
 * The today strip — today's ScheduleSlot entries composed client-side
 * from /teacher/me/offerings (the weekly Schedule page's own source;
 * no new backend surface), rendered as the TodayList pattern: each slot
 * marks its phase relative to now (urgency dot + sr-only label), and
 * the phase chip rides the row's trailing slot.
 */
function TodayLectures() {
  const offsQ = useTeacherOfferings();
  // Compose once per render — `new Date()` decides the weekday + phases.
  const now = new Date();
  const slots = offsQ.data ? todaySlots(offsQ.data, now) : [];
  const todayDow = now.getDay();

  return (
    <section aria-label="محاضرات اليوم">
      <SectionHeader
        title={<>محاضرات اليوم</>}
        description={WEEKDAY_NAMES_AR[todayDow]}
        actions={
          <Link to="/teacher/schedule" className="btn ghost sm">
            <Icon icon={Calendar} size={13} /> الجدول الأسبوعيّ
          </Link>
        }
      />
      {offsQ.isPending ? (
        <ListSkeleton rows={2} />
      ) : offsQ.isError ? (
        <ErrorState message="تعذَّر تحميل جدول اليوم" error={offsQ.error} onRetry={() => offsQ.refetch()} />
      ) : (
        <TodayList
          items={slots.map((slot) => {
            const phase = slotPhase(slot, now);
            return {
              id: slot.key,
              to: '/teacher/schedule',
              title: slot.courseName,
              meta: (
                <>
                  <bdi>{slot.startTime} — {slot.endTime}</bdi>
                  {slot.room ? <> · {slot.room}</> : null}
                </>
              ),
              urgency: phase === 'ongoing' ? 'now' : phase === 'upcoming' ? 'soon' : 'later',
              action:
                /* R305 DS: the phase chips speak the ONE status
                 * vocabulary (danger = live, info = upcoming). */
                phase === 'ongoing' ? <span className="hr-chip" data-tone="danger">جارٍ الآن</span> :
                phase === 'done' ? <span className="hr-chip">انتهت</span> :
                <span className="hr-chip" data-tone="info">قادمة</span>,
            };
          })}
          emptyState={
            <RowItem
              title="لا محاضرات اليوم"
              meta=""
              trailing={null}
            />
          }
        />
      )}
    </section>
  );
}

/* r351 A2 (Q3): AtRiskShortcuts retired with its section. */
