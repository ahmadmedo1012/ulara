import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, ClipboardList,
  AlertTriangle, Upload, RefreshCw,
  Send, FileText, X, CheckCircle2,
  ExternalLink, Presentation, Video, FileArchive,
  Image as ImageIcon, Paperclip,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { InviteCodesCard } from '../../components/teacher/InvitesCard';
import { Card, Badge, ProgressBar, UserAvatar, FormField, Pill } from '../../components/primitives';
/* R359 (A3 · W2-c) — the sheet grammar: SheetSection (framed block +
 * [nn] index + Latin caption), KpiBand (the dimension-string strip),
 * DataSheet (the dense hairline ledger). The teacher daily-work pages
 * recompose onto it; the hr- scope stays for the legacy chips the
 * pinned tests still hold. */
import { SheetSection, KpiBand, DataSheet, type DataSheetColumn, type KpiTone } from '../../components/patterns';
import { ErrorState, EmptyState, Skeleton, ListSkeleton, TableSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import {
  useTeacherOfferings,
  useTeacherStudents,
  useOfferingAnalytics,
  useRecordAttendance,
  useTeacherMaterials,
  useTeacherAssignments,
  usePendingSubmissions,
  useGradeSubmission,
  useCreateAssignment,
  useCreateMaterial,
  useUploadMaterialFile,
  useOfferingGrades,
  useUpsertOfferingGrades,
  apiErrorMessage,
  type PendingSubmissionRow,
  type TeacherStudentRow,
  type TeacherAssignmentRow,
  type TeacherMaterial,
  type GradeKindFE,
  type OfferingGradeRow,
} from '../../hooks/useResources';
import { MessagesInbox } from '../../components/messages/MessagesInbox';
import { MessageComposeModal } from '../../components/messages/MessageComposeModal';
import { toast } from '../../lib/toast';
import {
  countAr,
  formatRelativeArShort,
  formatDateTimeAr,
  formatDateWithYearAr,
  WEEKDAY_NAMES_AR,
} from '../../lib/format';
import { ASSIGNMENT_KIND_LABEL, MATERIAL_TYPE_LABEL, gradeBand, GRADE_BANDS } from '../../lib/courseMeta';
import { validatePdfFile, pdfUploadErrorMessage } from '../../lib/pdfUpload';
import ResearchReviewPage from './ResearchReviewPage';
import { formatDate, formatNum, formatPct1 } from '../../utils/numbers';
import '../../styles/teacher/ds-core.css'; // R305 DS: §0 hr- primitives + §A tqd- deltas (mounted via .hr-scope)
/* R341 D8 — the [nn] section-index register (.w11-idx, inner.css §W11):
 * the same gutter grammar the teacher dashboard's Card titles and the
 * student SectionBar speak, so every daily-work section head reads on
 * the numeral axis (conformance probe). The dashboard's own bridge
 * import (TeacherDashboardPage.tsx:20) — inner.css is 119 lines. */
import '../../styles/landing/inner.css';

/* The teacher dashboard now lives in TeacherDashboardPage.tsx
 * (social-media feed style). The previous KPI-grid version was
 * removed during the polish pass — it was unused and added 100 lines
 * of legacy code that didn't match the new visual language.
 */

/* ─── Generic placeholder structure ─── */
/* R359 (A3 · W2-c): the family's chip vocabulary joined the sheet
 * grammar — hr-chip[data-tone] fills retired in favour of the
 * hairline sg-flag register (ink text, tone on the border); the
 * maps above (BAND_FLAG_TONE / RISK_FLAG_TONE / RISK_ROW_TONE) own
 * the vocabulary now. */

/* r351 A2 (Q3): `subtitle` is optional — most seats keep only the h1
 * (the explanatory subtitle prose retired across the family). */
function PageHeader({ title, subtitle, actions, brow }: { title: string; subtitle?: string; actions?: React.ReactNode; brow?: string }) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        {/* R305 DS: the workflow brow — a mono micro-label naming the
            daily-workflow area (a real classification, never decoration). */}
        {brow && <span className="hr-brow">{brow}</span>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

/* countAr, formatRelativeArShort + WEEKDAY_NAMES_AR live in lib/format.ts
 * (waves 9-a / 13-15); ASSIGNMENT_KIND_LABEL + MATERIAL_TYPE_LABEL live
 * in lib/courseMeta.ts (waves 13-15 / 14-2) — the former page-local maps
 * here were byte-identical to the shared exports. GRADE_BANDS /
 * gradeBand (22-a, A6 P2) is the platform's ONE grade taxonomy,
 * consumed by the grades table, the students table and the performance
 * distribution — one student reads as one chip everywhere. */

/* R359 (A3 · W2-c) — the sheet-grammar flag tone maps: the ONE status
 * vocabulary of the sg-flag register (signal / positive / danger /
 * quiet; no tone = ink). The band/risk chips keep their Arabic labels
 * verbatim (the pinned vocabulary) — only the paint changes: hairline
 * chips, ink text, tone on the border. */
type FlagTone = 'signal' | 'positive' | 'danger' | 'quiet' | 'warning' | undefined;
const BAND_FLAG_TONE: Record<'green' | 'brand' | 'amber' | 'gold' | 'red', FlagTone> = {
  green: 'positive',
  brand: 'signal',
  amber: undefined,
  gold: undefined,
  red: 'danger',
};
const RISK_FLAG_TONE: Record<TeacherStudentRow['riskLevel'], FlagTone> = {
  OK: 'positive',
  WATCH: 'quiet',
  AT_RISK: undefined,
  CRITICAL: 'danger',
};
/* The DataSheet row pins carry the KpiTone set (warning included): an
 * at-risk student marks the row's inline-start pin without painting
 * the whole row. */
const RISK_ROW_TONE: Record<TeacherStudentRow['riskLevel'], KpiTone | undefined> = {
  OK: 'positive',
  WATCH: undefined,
  AT_RISK: 'warning',
  CRITICAL: 'danger',
};

/* ─── Shared course picker (A6 P3, 22-a) ─────────────────────
 * The grades/students/performance trio each carried a copy of the
 * "first offering by default" picker logic inside a full titled Card
 * that wasted the first fold. One hook + the header-actions mount
 * (the attendance save-button pattern) replaces all three. */
function useOfferingPicker() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  /* R342-09 — the ?offering= deep link: cross-surface CTAs (the
   * intelligence drill-down's «إدخال درجات المقرّر») land the picker on
   * the NAMED offering instead of the default first one, so offering →
   * roster → assessment navigation keeps its context. Consumed once on
   * mount (deep-link semantics — the same contract as the admin
   * roster's ?facultyId drill); later param changes don't fight the
   * user's own picker edits. An unknown/offering-less id falls back to
   * the first offering (the honest default, never an empty ledger). */
  const [searchParams] = useSearchParams();
  const [offeringId, setOfferingId] = useState<string>(
    () => searchParams.get('offering') ?? '',
  );
  const effectiveOfferingId =
    offeringId && offerings.some((o) => o.id === offeringId)
      ? offeringId
      : offerings[0]?.id || '';
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;
  return { offsQ, offerings, effectiveOfferingId, setOfferingId, offering };
}

/** The picker control shared by the three analytical pages — a labeled
 * select sized for the header-actions slot (max-inline-size lives on
 * .course-select). */
function OfferingPickerSelect({
  offerings,
  effectiveOfferingId,
  onChange,
  label,
}: {
  offerings: NonNullable<ReturnType<typeof useTeacherOfferings>['data']>;
  effectiveOfferingId: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <FormField label={label}>
      <select
        className="input course-select"
        value={effectiveOfferingId}
        onChange={(e) => onChange(e.target.value)}
      >
        {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
        {offerings.map((o) => (
          // r180: the term disambiguates same-course sections (a teacher
          // can hold the same course across terms — «CT301» ×2 otherwise).
          <option key={o.id} value={o.id}>{o.course.name} ({o.course.code} · {o.term})</option>
        ))}
      </select>
    </FormField>
  );
}

export function TeacherSchedulePage() {
  const offsQ = useTeacherOfferings();
  /* r148 (AUDIT-2 L8): سبينر صفحي مكان هيكل مطابق الشكل — القائمة
     النهائية جدول حصص أسبوعي؛ TableSkeleton يحافظ على الإيقاع. */
  /* r351 A2 (Q3): the header subtitle retired — the timetable explains itself. */
  if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" /><Card><TableSkeleton rows={5} cols={4} /></Card></div>;
  if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>;

  // Group all schedule slots by dayOfWeek across the teacher's offerings.
  const offerings = offsQ.data ?? [];
  type Slot = { startTime: string; endTime: string; courseName: string; courseCode: string; room: string | null; enrolled: number };
  const byDay: Record<number, Slot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const o of offerings) {
    for (const slot of o.schedule) {
      byDay[slot.dayOfWeek]?.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseName: o.course.name,
        courseCode: o.course.code,
        room: slot.room ?? o.room ?? null,
        enrolled: o._count.enrollments,
      });
    }
  }
  for (const list of Object.values(byDay)) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const days = Object.entries(byDay).map(([dow, items]) => ({ dow: Number(dow), items })).filter((d) => d.items.length > 0);
  // A6 P3 (22-a): a "اليوم" anchor — the same dayOfWeek convention as
  // Date#getDay() (0=Sunday), so a teacher scanning for today's
  // lectures stops at the marked header instead of reading them all.
  const todayDow = new Date().getDay();

  return (
    /* R305 DS: .hr-scope (display:contents) declares the ember tokens
     * + the §A tqd- deltas; the .page layout root stays untouched. */
    <div className="hr-scope">
      <div className="page">
      <PageHeader
        title="جدول المحاضرات"
        /* r351 A2 (Q3): header subtitle retired — the timetable explains itself. */
        brow="عضو هيئة التدريس · الجدول"
        actions={(
          /* R341 D8 — the calendar-page precedent: a read-only ledger
           * still names its ONE honest next action on the accent
           * register — today's lectures are exactly what the roll call
           * records, and the link is in the first fold at every width. */
          <Link to="/teacher/attendance" className="btn accent sm">تسجيل حضور اليوم</Link>
        )}
      />
      {days.length === 0 ? (
        /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
        <EmptyState
          title="لا يوجد جدول مسجَّل"
          illustration="empty-list"
          description=""
        />
      ) : (
        /* 4C-c Superlist recomposition: calm day sections in a grid —
            each day a header (الاسم + «اليوم» marker) over its lecture
            rows; ≤920px the grid folds into the day-by-day vertical
            list (same DOM, source order = day order). P-G3b: auto-fit
            (was auto-fill) so a short week's sections expand to the
            full content measure instead of hugging one 240px track at
            the inline-start edge; day heads carry the [nn] weekday
            index + the lecture count, and the Latin course code demotes
            from the chip voice to the row's mono meta line. */
        <div className="tpg-sched">
          {days.map((d) => (
            <section key={d.dow} className="tpg-day" data-today={d.dow === todayDow ? 'true' : undefined} aria-label={WEEKDAY_NAMES_AR[d.dow]}>
              <div className="tpg-day-head">
                <span className="tpg-day-title">
                  {/* P-G3b — the [nn] weekday index: Libyan week,
                      الأحد = [01]; mono gutter voice, aria-hidden (the
                      day name is the section's accessible name). */}
                  <span className="tpg-day-index" dir="ltr" aria-hidden="true">[{String(d.dow + 1).padStart(2, '0')}]</span>
                  {WEEKDAY_NAMES_AR[d.dow]}
                </span>
                <span className="tpg-day-aux">
                  {/* R305 DS: today is THE ember signal of the page —
                      the marker chip rides the ember tone. */}
                  {d.dow === todayDow && <span className="hr-chip" data-tone="signal">اليوم</span>}
                  <span className="tpg-day-count">
                    {/* 22-c counted nouns. */}
                    <bdi>{d.items.length}</bdi> {countAr(d.items.length, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}
                  </span>
                </span>
              </div>
              {d.items.map((it, i) => (
                <div key={i} className="tpg-lecture">
                  {/* Latin time range inside an RTL line — bdi keeps
                      the dash order stable (audit 0-e P2-47); mono
                      tabular so the ranges scan as one block. */}
                  <bdi className="tpg-lecture-time">{it.startTime} — {it.endTime}</bdi>
                  <div className="tpg-lecture-body">
                    {/* P-G3b — truncate-with-affordance: two lines max,
                        the full name rides the title attribute (A4 P3-8:
                        no truncation without a tooltip). */}
                    <div className="tpg-lecture-name" title={it.courseName}>{it.courseName}</div>
                    <div className="list-row-sub">
                      {it.room ? `${it.room} · ` : ''}
                      {/* P2-1 (5-A7): a scheduled slot with no enrollments
                          names the reality — countAr(0) renders the
                          broken «0 طالباً». */}
                      {it.enrolled === 0 ? 'لا طلاب مسجَّلين' : countAr(it.enrolled, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}
                    </div>
                  </div>
                  {/* P-G3b-r — Arabic-first codes: the course's Arabic name
                      leads the row; the Latin code demotes from the chip
                      voice to the row's mono meta tail (.tpg-lecture-code,
                      bdi-isolated inside the RTL flex line — 5-B6). */}
                  <bdi className="tpg-lecture-code">{it.courseCode}</bdi>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

type AttStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

/* Selected state rides on [data-tone] + .on (CSS owns the colors) — the
 * old inline style block had no aria-pressed and no class-based state
 * (audit 0-e P1-32). EXCUSED (15-a P1-7) is the 4th AttendanceStatus:
 * the backend accepts it and the risk/analytics stack excludes it from
 * denominators — it was unreachable from this, its only write surface.
 * The brand selected wash lives in components.css since 17-a2 (E6
 * hand-off) — all four tones are class-based now. */
const ATT_OPTIONS: Array<{ v: AttStatus; label: string; tone: 'success' | 'warning' | 'danger' | 'brand' }> = [
  { v: 'PRESENT', label: 'حاضر',   tone: 'success' },
  { v: 'LATE',    label: 'متأخّر', tone: 'warning' },
  { v: 'ABSENT',  label: 'غائب',   tone: 'danger' },
  { v: 'EXCUSED', label: 'بعذر',   tone: 'brand' },
];

/** 'YYYY-MM-DD' of the client-local calendar day — the roll-call default
 *  (15-h P1-6): slicing `toISOString()` yields the UTC day, which reads
 *  as yesterday's date during the first ~2h of a Libyan night. */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── R304: sortable roster headers (grades + students read tables) ────
   A view control only — the wire payload and the default (server) order
   are untouched, and the third click resets to it. The educator's first
   click on a metric column reads the highest values first (من الأعلى)،
   the second flips to who needs help (من الأدنى)؛ the name column opens
   alphabetical. Pure helpers, unit-testable. */

type RosterSortKey = 'name' | 'average' | 'attendance';
interface RosterSort { key: RosterSortKey; dir: 'asc' | 'desc' }

/** Click cycle: none → first direction → opposite → none. */
function cycleRosterSort(current: RosterSort | null, key: RosterSortKey): RosterSort | null {
  const firstDir: 'asc' | 'desc' = key === 'name' ? 'asc' : 'desc';
  if (!current || current.key !== key) return { key, dir: firstDir };
  if (current.dir === firstDir) return { key, dir: firstDir === 'asc' ? 'desc' : 'asc' };
  return null;
}

/** Column value for a roster row (avg/attendance ride the row's numbers). */
function rosterSortValue(row: { name: string; avgGrade: number; attendancePct: number }, key: RosterSortKey): string | number {
  if (key === 'name') return row.name;
  if (key === 'average') return row.avgGrade;
  return row.attendancePct;
}

function compareRoster(a: string | number, b: string | number, key: RosterSortKey): number {
  if (key === 'name') return String(a).localeCompare(String(b), 'ar');
  return (a as number) - (b as number);
}

function sortRoster<T extends { name: string; avgGrade: number; attendancePct: number }>(
  rows: T[],
  sort: RosterSort | null,
): T[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => compareRoster(rosterSortValue(a, sort.key), rosterSortValue(b, sort.key), sort.key));
  return sort.dir === 'asc' ? sorted : sorted.reverse();
}

/** R359 (A3 · W2-c) — the roster sort control: the R304 click cycle
 *  (none → first direction → opposite → none, the same pure helpers)
 *  rides the section head's aside. The DataSheet's mono column heads
 *  are read-only classification — the view control belongs on the rule
 *  where the actions live, never inside the ledger's header cells. */
function RosterSortControl({ sort, onCycle }: {
  sort: RosterSort | null;
  onCycle: (key: RosterSortKey) => void;
}) {
  const opts: Array<{ key: RosterSortKey; label: string }> = [
    { key: 'name', label: 'الاسم' },
    { key: 'average', label: 'المتوسط' },
    { key: 'attendance', label: 'الحضور' },
  ];
  return (
    <div className="hr-toolbar" role="group" aria-label="ترتيب السجلّ">
      {opts.map((o) => {
        const active = sort?.key === o.key;
        return (
          <button
            key={o.key}
            type="button"
            className={`filter-pill${active ? ' on' : ''}`}
            aria-pressed={active}
            onClick={() => onCycle(o.key)}
          >
            {o.label}
            {active && (
              <span className="hr-sort-glyph" aria-hidden="true">
                <Icon icon={sort!.dir === 'asc' ? ChevronUp : ChevronDown} size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AttendancePage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const record = useRecordAttendance();

  // 15-h P1-6: default = the client-local day (never the UTC slice —
  // between 00:00 and ~02:00 Libya time that is yesterday's date).
  const [date, setDate] = useState<string>(() => localDayKey(new Date()));
  const [dateError, setDateError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttStatus>>({});

  const students = useMemo(() => stuQ.data ?? [], [stuQ.data]);
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;

  const counts = useMemo(() => {
    let p = 0, l = 0, a = 0, e = 0;
    for (const s of students) {
      const st = statusByStudent[s.studentId] ?? 'PRESENT';
      if (st === 'PRESENT') p++;
      else if (st === 'LATE') l++;
      else if (st === 'ABSENT') a++;
      else if (st === 'EXCUSED') e++;
    }
    return { p, l, a, e, total: students.length };
  }, [students, statusByStudent]);

  /* 5-C3 (A9 P1-3): the offerings query was never gated — while it
     loaded (and when it failed) the select said «— لا توجد مقرّرات —»
     and the roster card a false «لا توجد مقرّرات»: a teacher with a
     dead request was told they have no courses, with no retry. Same
     two-branch gate as TeacherSchedulePage (:106-107), shape-matched
     to this page (session form card + roster list). */
  /* r351 A2 (Q3): the subtitle trimmed to the one semantic that isn't
     visible on the page (a re-save overwrites that date's single
     record); the restating first half retired. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        <PageHeader
          title="الحضور والغياب"
          subtitle="سجلّ واحد لكلّ تاريخ."
        />
        <CardSkeleton lines={3} />
        <ListSkeleton rows={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader
          title="الحضور والغياب"
          subtitle="سجلّ واحد لكلّ تاريخ."
        />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  const onSave = () => {
    if (!effectiveOfferingId || students.length === 0) return;
    // 15-h P1-6: a cleared <input type="date"> yields '' — new Date('')
    // is an Invalid Date whose toISOString() would throw inside this
    // handler (the save silently did nothing). Block with an inline
    // Arabic message instead; the wire value stays a UTC-midnight ISO.
    if (!date) {
      setDateError('حدّد تاريخ الجلسة قبل الحفظ.');
      return;
    }
    setDateError(null);
    record.mutate({
      offeringId: effectiveOfferingId,
      date: new Date(date).toISOString(),
      topic: topic || undefined,
      records: students.map((s) => ({
        studentId: s.studentId,
        status: statusByStudent[s.studentId] ?? 'PRESENT',
      })),
    });
  };

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="الحضور والغياب"
        subtitle="سجلّ واحد لكلّ تاريخ."
        brow="عضو هيئة التدريس · الحضور"
        actions={
          <button
            type="button"
            /* R305 DS: the ONE ember-flavored primary action of the
             * page — the save is the session's whole point.
             * R341 D8 — re-keyed to the accent register (.btn.accent,
             * the pattern-library primary voice the rebuilt pages
             * speak; the hr-cta ember ring stays). */
            className="btn accent hr-cta"
            onClick={onSave}
            disabled={!effectiveOfferingId || students.length === 0 || record.isPending}
          >
            {record.isPending ? 'جارٍ الحفظ…' : 'حفظ السجلّ'}
          </button>
        }
      />

      {/* R359 (A3 · W2-c) — the roll-call sheet: [01] SESSION carries
          the session facts; the roster + the live session stats ride
          the 7:5 split as [02]/[03]. */}
      <SheetSection index="01" caption="SESSION" title="الجلسة" className="tpg-session">
        <div className="form-row-3">
          <FormField label="المقرّر">
            <select className="input" value={effectiveOfferingId} onChange={(e) => setOfferingId(e.target.value)}>
              {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.course.name} ({o.course.code} · {o.term})</option>
              ))}
            </select>
          </FormField>
          {/* The hint sits OUTSIDE the label — a wrapping label would
              fold the hint into the input's accessible name (the
              15-h test suite pins the name to «تاريخ الجلسة»). */}
          <FormField
            label="تاريخ الجلسة"
            id="att-date"
            hint={date
              /* Local-noon anchor: a bare YYYY-MM-DD parses as UTC
               * midnight and would echo the previous day west of
               * Greenwich; the teacher picked a calendar DAY. */
              ? <>المحدَّد: {formatDateWithYearAr(`${date}T12:00:00`)}</>
              : 'اختر التاريخ من تقويم الحقل — ترتيب الصيغة داخل الحقل يتبع إعدادات المتصفح.'}
          >
            <input
              type="date"
              className="input"
              dir="ltr"
              value={date}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? 'att-date-error' : undefined}
              onChange={(e) => {
                setDate(e.target.value);
                setDateError(null);
              }}
            />
          </FormField>
          <FormField label="الموضوع (اختياريّ)">
            <input type="text" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مقدّمة في UML" />
          </FormField>
        </div>
        {dateError && (
          <div id="att-date-error" className="form-feedback fail tpg-feedback" role="alert">
            <Icon icon={AlertTriangle} size={14} />
            <span className="flex-1">{dateError}</span>
          </div>
        )}
      </SheetSection>

      <div className="grid-2-1">
        <SheetSection
          index="02"
          caption="ROLL CALL"
          title={offering ? `طلاب ${offering.course.name}` : 'الطلاب'}
          pad="tight"
        >
          {!effectiveOfferingId ? (
            <EmptyState title="لا توجد مقرّرات" description="" illustration="empty-courses" />
          ) : stuQ.isPending ? (
            <ListSkeleton rows={5} />
          ) : stuQ.isError ? (
            <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
          ) : students.length === 0 ? (
            /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
            <EmptyState title="لا يوجد طلاب" description="" illustration="empty-list" />
          ) : (
            <div className="flex-col gap-2">
              {/* 4C-c: the sticky session summary — present/late/absent/
                  excused counts in mono tabular numerals ride above the
                  roster while it scrolls (the save button stays in the
                  page header; this line is the live truth of the sheet). */}
              {/* R304: each count carries its status tone — the strip reads
                  as a legend (حاضر أخضر، متأخّر كهرماني، غائب أحمر، بعذر
                  نحاسي) without comparing numbers. */}
              <div className="tpg-att-summary" role="status" aria-label="ملخّص الجلسة الحاليّ">
                <span className="tpg-att-summary-item" data-tone="success">
                  <span className="tpg-att-summary-label">حاضر</span>
                  <span className="tpg-att-summary-value">{formatNum(counts.p)}</span>
                </span>
                <span className="tpg-att-summary-item" data-tone="warning">
                  <span className="tpg-att-summary-label">متأخّر</span>
                  <span className="tpg-att-summary-value">{formatNum(counts.l)}</span>
                </span>
                <span className="tpg-att-summary-item" data-tone="danger">
                  <span className="tpg-att-summary-label">غائب</span>
                  <span className="tpg-att-summary-value">{formatNum(counts.a)}</span>
                </span>
                <span className="tpg-att-summary-item" data-tone="brand">
                  <span className="tpg-att-summary-label">بعذر</span>
                  <span className="tpg-att-summary-value">{formatNum(counts.e)}</span>
                </span>
              </div>
              {students.map((s) => {
                const status = statusByStudent[s.studentId] ?? 'PRESENT';
                return (
                  <div key={s.studentId} className="list-row tpg-att-row">
                    <UserAvatar
                      initials={s.avatarInitials ?? s.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      color={s.avatarColor ?? undefined}
                      size={32}
                    />
                    <div className="list-row-body">
                      <div className="list-row-title">{s.name}</div>
                      <div className="list-row-sub font-mono"><bdi>{s.universityId}</bdi></div>
                    </div>
                    <div className="tpg-att-toggles" role="group" aria-label={`حضور ${s.name}`}>
                      {ATT_OPTIONS.map((opt) => {
                        const on = status === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            className={`att-toggle${on ? ' on' : ''}`}
                            data-tone={opt.tone}
                            aria-pressed={on}
                            onClick={() => setStatusByStudent({ ...statusByStudent, [s.studentId]: opt.v })}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetSection>

        <SheetSection index="03" caption="SESSION STATS" title="إحصائيّات الجلسة">
          {/* A6 P2 (22-a): the stats section mirrors the roster's state —
              never four fake 0% bars while nothing is loaded. Empty
              buckets dim instead of painting full-weight zero tracks
              (the old "barely visible grey … looks like a rendering
              bug" VLM verdict). */}
          {!effectiveOfferingId ? (
            /* R305 DS: the honest hint rides the structured .hr-note
             * (was an inline-styled paragraph — r186 hygiene). */
            <p className="hr-note">اختر مقرّراً لعرض إحصائيّات جلساته.</p>
          ) : stuQ.isPending ? (
            <div className="flex-col gap-4" aria-busy="true" aria-live="polite">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} aria-hidden>
                  <div className="flex items-center justify-between" style={{ marginBlockEnd: 'var(--sp-2)' }}>
                    <Skeleton width={90} height={11} />
                    <Skeleton width={34} height={11} />
                  </div>
                  <Skeleton width="100%" height={6} rounded="var(--r-full)" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
            <EmptyState icon={ClipboardCheck} title="لا طلاب في هذا المقرّر بعد" description="" illustration="empty-list" />
          ) : (
            <div className="flex-col gap-4">
              {/* R304: the honest dim rides a class now (was 4× inline
                  opacity/transition pairs). */}
              <div className={`tpg-att-stat${counts.p === 0 ? ' is-dim' : ''}`}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.p / counts.total) * 100) : 0} label={`الحضور (${counts.p})`} color="var(--success)" />
              </div>
              <div className={`tpg-att-stat${counts.l === 0 ? ' is-dim' : ''}`}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.l / counts.total) * 100) : 0} label={`التأخّر (${counts.l})`} color="var(--warning)" />
              </div>
              <div className={`tpg-att-stat${counts.a === 0 ? ' is-dim' : ''}`}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.a / counts.total) * 100) : 0} label={`الغياب (${counts.a})`} color="var(--danger)" />
              </div>
              {/* بعذر counts out of the session total (same denominator as
                  the other bars) — the analytics KPI keeps its own
                  EXCUSED-excluded math server-side. The 4th categorical
                  data color rides the sky info family (brand rule: the
                  royal accent is the primary signal, not a data series). */}
              <div className={`tpg-att-stat${counts.e === 0 ? ' is-dim' : ''}`}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.e / counts.total) * 100) : 0} label={`بعذر (${counts.e})`} color="var(--info)" />
              </div>
            </div>
          )}
          {record.isError && (
            <div className="form-feedback fail tpg-feedback" role="alert">
              <Icon icon={AlertTriangle} size={14} />
              <span className="flex-1">
                {apiErrorMessage(record.error, 'تعذَّر حفظ سجلّ الحضور.')} أعد المحاولة بالضغط على «حفظ السجلّ».
              </span>
            </div>
          )}
          {record.isSuccess && (
            <div className="form-feedback ok tpg-feedback" role="status">
              <Icon icon={CheckCircle2} size={14} />
              <span>تمّ حفظ سجلّ الحضور لهذا التاريخ.</span>
            </div>
          )}
        </SheetSection>
      </div>
    </div>
    </div>
  );
}

export function GradesPage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  /* R304: client-side column sorting on the read table — a view control
     over the already-fetched roster (the wire order stays the default). */
  const [sort, setSort] = useState<RosterSort | null>(null);
  const sortedStudents = useMemo(
    () => sortRoster(stuQ.data ?? [], sort),
    [stuQ.data, sort],
  );
  const cycleSort = useCallback((key: RosterSortKey) => {
    setSort((cur) => cycleRosterSort(cur, key));
  }, []);

  /* 5-C3 (A9 P1-3): gate the offerings query — during load AND on
     error this page rendered the false «اختر مقرّراً» empty plus a
     select claiming «— لا توجد مقرّرات —». Skeleton shaped like the
     table that lands; retry on failure. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        {/* r351 A2 (Q3): header subtitle retired — the table explains itself. */}
        <PageHeader title="درجات الطلاب" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="درجات الطلاب" />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  /* R359 (A3 · W2-c) — the read-side ledger columns: the name, the mono
   * university id, the mono tabular grade/attendance percentages (bdi —
   * the Latin % stays stable inside the RTL cell), and the ONE grade
   * taxonomy (gradeBand, 22-a) as a hairline flag — the same label this
   * student wears on /students and the same bucket /performance counts. */
  const gradesColumns: DataSheetColumn<TeacherStudentRow>[] = [
    {
      key: 'name',
      label: 'الطالب',
      render: (s) => <span className="sg-cell-title">{s.name}</span>,
    },
    {
      key: 'universityId',
      label: 'الرقم الجامعيّ',
      mono: true,
      render: (s) => <bdi>{s.universityId}</bdi>,
    },
    {
      key: 'avg',
      label: 'متوسّط الدرجات',
      numeric: true,
      render: (s) => <bdi>{formatPct1(s.avgGrade)}%</bdi>,
    },
    {
      key: 'att',
      label: 'الحضور',
      numeric: true,
      render: (s) => <bdi>{formatPct1(s.attendancePct)}%</bdi>,
    },
    {
      key: 'band',
      label: 'التقدير',
      render: (s) => {
        const band = gradeBand(s.avgGrade);
        return <span className="sg-flag" data-tone={BAND_FLAG_TONE[band.color]}>{band.label}</span>;
      },
    },
  ];

  /* The KpiBand's honest numerals — roster-derived means + counts (the
   * Arabic percent sign keeps the band's dimension string distinct from
   * the ledger's Latin-% cells beside it). */
  const roster = stuQ.data ?? [];
  const avgMean = roster.length > 0 ? Math.round((roster.reduce((sum, s) => sum + s.avgGrade, 0) / roster.length) * 10) / 10 : 0;
  const attMean = roster.length > 0 ? Math.round((roster.reduce((sum, s) => sum + s.attendancePct, 0) / roster.length) * 10) / 10 : 0;
  const passingCount = roster.filter((s) => s.avgGrade >= 50).length;
  const rosterEmpty = roster.length === 0;

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="درجات الطلاب"
        /* r351 A2 (Q3): header subtitle retired — the table explains itself. */
        brow="عضو هيئة التدريس · الدرجات"
        actions={(
          <>
            {/* R341 D8 — the page's ONE primary action on the accent
             * register: a first-fold jump to the semester-entry card
             * (the write half the read table above feeds). */}
            <a href="#grade-entry" className="btn accent sm">إدخال الدرجات</a>
            <OfferingPickerSelect
              offerings={offerings}
              effectiveOfferingId={effectiveOfferingId}
              onChange={setOfferingId}
              label="المقرّر"
            />
          </>
        )}
      />

      <KpiBand
        items={[
          {
            index: '01',
            caption: 'ENROLLED',
            label: 'طلاب المقرّر',
            value: roster.length,
            empty: stuQ.isPending || !effectiveOfferingId,
          },
          {
            index: '02',
            caption: 'AVG',
            label: 'متوسّط الدرجات',
            value: avgMean,
            unit: '٪',
            empty: stuQ.isPending || rosterEmpty,
          },
          {
            index: '03',
            caption: 'ATTENDANCE',
            label: 'متوسّط الحضور',
            value: attMean,
            unit: '٪',
            empty: stuQ.isPending || rosterEmpty,
          },
          {
            index: '04',
            caption: 'PASSING',
            label: 'الناجحون (50 فأعلى)',
            value: passingCount,
            empty: stuQ.isPending || rosterEmpty,
          },
        ]}
      />

      {/* R359 (A3 · W2-c) — the framed grade roster: [01] GRADE ROSTER,
          the R304 sort control on the head rule, the DataSheet as the
          body (pad=none — the ledger IS the body). */}
      <SheetSection
        index="01"
        caption="GRADE ROSTER"
        title={offering ? `${offering.course.name} · ${offering.course.code}` : 'الدرجات'}
        aside={<RosterSortControl sort={sort} onCycle={cycleSort} />}
        pad="none"
      >
        {!effectiveOfferingId ? (
          /* r351 A2 (Q3): empty-state prose retired — the picker sits
           * directly above. */
          <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" />
        ) : stuQ.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
          </div>
        ) : (
          <DataSheet
            caption="درجات الطلاب"
            columns={gradesColumns}
            rows={sortedStudents}
            loading={stuQ.isPending}
            empty={(
              /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
              <EmptyState title="لا يوجد طلاب" description="" illustration="empty-list" />
            )}
          />
        )}
      </SheetSection>

      {/* r180-F2: the real write half — replaces the retired
          «إدخال الدرجات الفصليّة قيد التطوير» card (the endpoint it
          disclaimed now has its consumer). */}
      <SemesterGradeEntry offeringId={effectiveOfferingId} studentsQ={stuQ} />
    </div>
    </div>
  );
}

/* ─── r180-F2: semester-grade entry ─────────────────────────────────
 * POST /offerings/:id/grades (bulk upsert, 1..200 rows, keyed by
 * student × GradeKind) + GET /offerings/:id/grades for the prefills.
 * Contract mirrors the page's own grading forms: only the rows the
 * teacher actually filled ride the payload (empty rows are skipped,
 * never zeroed); a stored grade for the picked kind prefills its row
 * (the upsert overwrites score/maxScore/weight/feedback together, so
 * the column's scale is ADOPTED from the stored rows until the teacher
 * edits it — a re-save never rewrites a stored row's denominator by
 * accident); client-side validation speaks before the wire does. */
const GRADE_KIND_LABEL: Record<GradeKindFE, string> = {
  HOMEWORK: 'واجب',
  QUIZ_1: 'اختبار قصير 1',
  QUIZ_2: 'اختبار قصير 2',
  MIDTERM: 'نصفي',
  PROJECT: 'مشروع',
  FINAL: 'نهائي',
};
const GRADE_KINDS = Object.keys(GRADE_KIND_LABEL) as GradeKindFE[];

/** One student's unsaved edit — keyed `${kind}:${studentId}` so each
 *  kind's column keeps its own drafts when the teacher switches. */
type GradeDraft = { score: string; feedback: string };

function SemesterGradeEntry({
  offeringId,
  studentsQ,
}: {
  offeringId: string;
  studentsQ: ReturnType<typeof useTeacherStudents>;
}) {
  const gradesQ = useOfferingGrades(offeringId || undefined);
  const upsert = useUpsertOfferingGrades(offeringId);

  const [kind, setKind] = useState<GradeKindFE>('HOMEWORK');
  const [maxScore, setMaxScore] = useState('100');
  const [weight, setWeight] = useState('10');
  /* False until the teacher edits the scale by hand — until then the
   * max/weight inputs adopt the stored rows' scale for the picked
   * kind (see the component header comment). */
  const [scaleTouched, setScaleTouched] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const students = studentsQ.data ?? [];
  const pending = upsert.isPending;

  const existingByKind = useMemo(() => {
    const m = new Map<GradeKindFE, OfferingGradeRow[]>();
    for (const g of gradesQ.data ?? []) {
      const bucket = m.get(g.kind);
      if (bucket) bucket.push(g);
      else m.set(g.kind, [g]);
    }
    return m;
  }, [gradesQ.data]);

  /* The current column's stored rows — the prefill source. */
  const existingByStudent = useMemo(() => {
    const m = new Map<string, OfferingGradeRow>();
    for (const g of existingByKind.get(kind) ?? []) m.set(g.studentId, g);
    return m;
  }, [existingByKind, kind]);

  /* Scale adoption: when untouched, follow the stored rows of the
   * picked kind (or keep the current values when none exist — never
   * silently reset a hand-set scale). */
  useEffect(() => {
    if (scaleTouched) return;
    const rows = existingByKind.get(kind);
    if (rows && rows.length > 0) {
      setMaxScore(String(rows[0]!.maxScore));
      setWeight(String(rows[0]!.weight));
    }
  }, [kind, existingByKind, scaleTouched]);

  const draftKey = (k: GradeKindFE, studentId: string) => `${k}:${studentId}`;

  /* The rows the payload would carry: an edit under the CURRENT kind
   * whose score or feedback is non-empty. Both-empty drafts (a
   * prefilled row the teacher cleared completely) drop out — the wire
   * never sees a zeroed row the teacher did not mean. */
  const dirtyRows = students.filter((s) => {
    const d = drafts[draftKey(kind, s.studentId)];
    return d !== undefined && (d.score.trim() !== '' || d.feedback.trim() !== '');
  });

  const maxVal = Number(maxScore);
  const weightVal = Number(weight);
  const maxInvalid = maxScore.trim() === '' || Number.isNaN(maxVal)
    || !Number.isInteger(maxVal) || maxVal < 1 || maxVal > 100;
  const weightInvalid = weight.trim() === '' || Number.isNaN(weightVal)
    || !Number.isInteger(weightVal) || weightVal < 0 || weightVal > 100;

  const onSave = async () => {
    if (maxInvalid) {
      setFormError('الدرجة العظمى عدد صحيح بين 1 و100.');
      return;
    }
    if (weightInvalid) {
      setFormError('الوزن عدد صحيح بين 0 و100.');
      return;
    }
    if (dirtyRows.length === 0) {
      setFormError('أدخل درجة واحدة على الأقل — الصفوف الفارغة لا تُرسَل ولا تمسّ الدرجات المسجَّلة.');
      return;
    }
    if (dirtyRows.length > 200) {
      // gradesUpsertSchema caps the array at 200 — the roster can exceed it.
      setFormError('الحدّ الأقصى 200 درجة في الحفظة الواحدة — احفظ على دفعات.');
      return;
    }
    /* Per-row validation mirrors GradeSubmissionModal's copy: a valid
     * number, not negative, within the column's ceiling. */
    const errors: Record<string, string> = {};
    for (const s of dirtyRows) {
      const d = drafts[draftKey(kind, s.studentId)]!;
      const value = Number(d.score);
      if (d.score.trim() === '' || Number.isNaN(value)) errors[s.studentId] = 'أدخل درجة صحيحة.';
      else if (value < 0) errors[s.studentId] = 'لا يمكن أن تكون الدرجة سالبة.';
      else if (value > maxVal) errors[s.studentId] = `الدرجة يجب ألّا تتجاوز ${maxVal}.`;
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('صحّح الصفوف المعلَّمة قبل الحفظ.');
      return;
    }
    setFormError(null);
    try {
      await upsert.mutateAsync({
        grades: dirtyRows.map((s) => {
          const d = drafts[draftKey(kind, s.studentId)]!;
          return {
            studentId: s.studentId,
            kind,
            score: Number(d.score),
            maxScore: maxVal,
            weight: weightVal,
            feedback: d.feedback.trim() || undefined,
          };
        }),
      });
      /* Landed: the drafts clear (the prefills now come from the
       * invalidated grades read) and the scale adoption re-arms — the
       * stored rows are the truth again. */
      setDrafts({});
      setRowErrors({});
      setFormError(null);
      setScaleTouched(false);
      toast.success('حُفظت الدرجات وستظهر لطلاب المقرّر فوراً.', { title: 'تمّ الحفظ' });
    } catch {
      // surfaced inline from upsert.isError below
    }
  };

  return (
    /* R359 (A3 · W2-c) — the write half joins the sheet register: the
     * [02] SEMESTER ENTRY frame, the dirty-count honest note + the
     * save verb on the head rule. The #grade-entry anchor target
     * stays (the header CTA jumps here). */
    <div id="grade-entry">
    <SheetSection
      index="02"
      caption="SEMESTER ENTRY"
      title="إدخال الدرجات الفصليّة"
      /* r351 A2 (Q3): trimmed to the honest core — empty rows are never
       * sent; the prefill sentence retired (the table shows it). */
      aside={(
        <>
          <span className="sg-label">
            {dirtyRows.length > 0
              ? countAr(dirtyRows.length, ['صف واحد غير محفوظ', 'صفان غير محفوظان', 'صفوف غير محفوظة', 'صفاً غير محفوظاً'])
              : 'الصفوف الفارغة لا تُرسَل.'}
          </span>
          <button
            type="button"
            /* R305 DS: the section's ONE ember-flavored primary.
             * R341 D8 — accent register (the pattern-library primary). */
            className="btn accent hr-cta"
            onClick={() => void onSave()}
            disabled={pending || !offeringId || students.length === 0}
          >
            {pending ? 'جارٍ الحفظ…' : 'حفظ الدرجات'}
          </button>
        </>
      )}
    >
      {/* A real <form> — Enter in any score field saves (the
          GradeSubmissionModal / AssignmentFormModal contract). */}
      <form onSubmit={(e) => { e.preventDefault(); void onSave(); }} noValidate>
        <div className="form-row-3">
          <FormField label="نوع التقييم">
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as GradeKindFE)}
              disabled={pending}
            >
              {GRADE_KINDS.map((k) => (
                <option key={k} value={k}>{GRADE_KIND_LABEL[k]}</option>
              ))}
            </select>
          </FormField>
          <FormField
            label="الدرجة العظمى"
            /* r351 A2 (Q3): hint trimmed to the constraint — the
             * scale-adoption aside retired. */
            hint="بين 1 و100"
            error={formError && maxInvalid ? formError : undefined}
          >
            <input
              type="number"
              className="input"
              min={1}
              max={100}
              step={1}
              value={maxScore}
              onChange={(e) => { setMaxScore(e.target.value); setScaleTouched(true); }}
              disabled={pending}
            />
          </FormField>
          <FormField
            label="الوزن (% من الدرجات)"
            error={formError && !maxInvalid && weightInvalid ? formError : undefined}
          >
            <input
              type="number"
              className="input"
              min={0}
              max={100}
              step={1}
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setScaleTouched(true); }}
              disabled={pending}
            />
          </FormField>
        </div>

        {!offeringId ? (
          /* r351 A2 (Q3): empty-state prose retired — the picker sits
           * directly above. */
          <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" />
        ) : studentsQ.isPending ? (
          <TableSkeleton rows={5} cols={3} />
        ) : studentsQ.isError ? (
          <ErrorState error={studentsQ.error} onRetry={() => studentsQ.refetch()} />
        ) : students.length === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
          <EmptyState title="لا يوجد طلاب" description="" illustration="empty-list" />
        ) : gradesQ.isPending ? (
          <TableSkeleton rows={4} cols={3} />
        ) : gradesQ.isError ? (
          <ErrorState error={gradesQ.error} onRetry={() => gradesQ.refetch()} />
        ) : (
          /* 4C-c: the ledger scrollport — .table-wrap.sticky pins the
              header row while the roster scrolls (the shared opt-in).
              The table keeps the shared .tbl-stack DOM: desktop rows,
              mobile row-cards off the same data-label attributes. */
          <div className="table-wrap sticky">
            <table className="table tbl-stack tpg-grade-table">
              <thead>
                <tr>
                  <th scope="col">الطالب</th>
                  <th scope="col">{`الدرجة (من 0 إلى ${maxInvalid ? 100 : maxVal})`}</th>
                  <th scope="col">ملاحظات للطالب (اختياري)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const d = drafts[draftKey(kind, s.studentId)];
                  const existing = existingByStudent.get(s.studentId);
                  /* Draft wins over the stored prefill; the first
                   * keystroke captures the prefill into the draft so
                   * editing feedback alone re-sends the stored score. */
                  const scoreValue = d ? d.score : existing !== undefined ? String(existing.score) : '';
                  const feedbackValue = d ? d.feedback : existing?.feedback ?? '';
                  const err = rowErrors[s.studentId];
                  const errId = `grade-row-err-${s.studentId}`;
                  return (
                    <tr key={s.studentId}>
                      <td className="tbl-strong" data-label="الطالب">
                        <div>{s.name}</div>
                        <div className="text-xs text-muted font-mono"><bdi>{s.universityId}</bdi></div>
                      </td>
                      <td data-label="الدرجة">
                        <input
                          type="number"
                          className="input input-narrow"
                          placeholder={`0 – ${maxInvalid ? 100 : maxVal}`}
                          min={0}
                          max={maxInvalid ? 100 : maxVal}
                          step="any"
                          inputMode="decimal"
                          value={scoreValue}
                          aria-invalid={err ? true : undefined}
                          aria-describedby={err ? errId : undefined}
                          disabled={pending}
                          onChange={(e) => setDrafts({
                            ...drafts,
                            [draftKey(kind, s.studentId)]: { score: e.target.value, feedback: feedbackValue },
                          })}
                        />
                        {err && (
                          <p id={errId} className="form-field-error" role="alert" style={{ marginBlockStart: 'var(--sp-1)' }}>
                            {err}
                          </p>
                        )}
                      </td>
                      <td data-label="ملاحظات للطالب (اختياري)">
                        <input
                          type="text"
                          className="input"
                          placeholder="ملاحظة قصيرة تصل الطالب مع الدرجة…"
                          maxLength={2000}
                          value={feedbackValue}
                          disabled={pending}
                          onChange={(e) => setDrafts({
                            ...drafts,
                            [draftKey(kind, s.studentId)]: { score: scoreValue, feedback: e.target.value },
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {formError && (
          <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <Icon icon={AlertTriangle} size={14} />
            <span className="flex-1">{formError}</span>
          </div>
        )}
        {upsert.isError && (
          <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <Icon icon={AlertTriangle} size={14} />
            <span className="flex-1">
              {apiErrorMessage(upsert.error, 'تعذَّر حفظ الدرجات — حاول مرة أخرى.')}
            </span>
          </div>
        )}
        {upsert.isSuccess && (
          <div className="form-feedback ok" role="status" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <Icon icon={CheckCircle2} size={14} />
            <span>تمّ حفظ الدرجات المسجَّلة في هذا النوع.</span>
          </div>
        )}
      </form>
    </SheetSection>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/* 4C-c: the material row's file-type mark — one Lucide icon per
 * MaterialType (PDF is the house default). Content-driven iconography,
 * same grammar as the type badge beside it. */
const MATERIAL_TYPE_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  PPT: Presentation,
  VIDEO: Video,
  DOC: FileText,
  ZIP: FileArchive,
  IMAGE: ImageIcon,
  OTHER: Paperclip,
};

/* ─── r144: add-material-by-URL — the backend's POST /offerings/:id/
 * materials contract (by-link, no multipart — AGENTS §5.6). Replaces
 * the old «قيد التطوير» dead-end card with the actual channel.
 * P3 adds the FILE mode: POST /offerings/:id/materials/file uploads a
 * real PDF (raw body, name/description/type on the query string) — now
 * the default channel; the by-link form below stays verbatim for every
 * non-PDF type. */
function MaterialFormModal({ onClose }: { onClose: () => void }) {
  const offerings = useTeacherOfferings();
  const create = useCreateMaterial();
  /* P3: the direct-PDF channel (file mode). */
  const uploadMaterial = useUploadMaterialFile();

  /* P3: two honest channels, one modal — «ملف PDF» (direct upload)
   * | «رابط خارجي» (the r144 by-link form). The Pill pair carries
   * aria-pressed (the house two-way switch idiom); switching clears the
   * other mode's stale inline validation. */
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [offeringId, setOfferingId] = useState('');
  const [name, setName] = useState('');
  /* True while the name field holds the auto-fill derived from the
   * picked file's name — replacing the file refreshes the derived name,
   * but a manual edit always wins (nameAuto flips off on first edit). */
  const [nameAuto, setNameAuto] = useState(false);
  const [type, setType] = useState<'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER'>('PDF');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  /* r164-h: determinate upload progress (0–100) — fed by the mutation's
   * onUploadProgress (axios), reset on every submit attempt. */
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pending = mode === 'file' ? uploadMaterial.isPending : create.isPending;
  const dirty = mode === 'file'
    ? name.trim() !== '' || description.trim() !== '' || file !== null
    : name.trim() !== '' || url.trim() !== '' || description.trim() !== '';
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty,
    pending,
    onClose,
  });

  const list = offerings.data ?? [];
  const effectiveOfferingId = offeringId || list[0]?.id || '';

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f && (name.trim() === '' || nameAuto)) {
      setName(f.name.replace(/\.pdf$/i, ''));
      setNameAuto(true);
    }
    /* r164-h: the pick guard — reject a wrong file the MOMENT it is
     * picked, not at submit: the same validatePdfFile mirror of the
     * server caps, with immediate inline feedback; a valid pick (or a
     * removal) clears a stale file error. */
    setValidationError(f ? validatePdfFile(f) : null);
  };
  /* Clearing the value lets the SAME file be re-picked afterwards — a
   * file input only fires change when its value actually differs. */
  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async () => {
    if (mode === 'file') {
      /* P3: honest client-side caps (PDF only, 20MB) BEFORE any request
       * leaves the browser — the mirror of the server's guards. Early
       * returns (not one chained ternary) so the picked file narrows to
       * File for the mutation payload below. */
      if (!effectiveOfferingId) { setValidationError('اختر المقرّر أولاً.'); return; }
      if (name.trim().length < 1) { setValidationError('اسم الملف مطلوب.'); return; }
      if (!file) { setValidationError('اختر ملف PDF للرفع.'); return; }
      const fileErr = validatePdfFile(file);
      if (fileErr) { setValidationError(fileErr); return; }
      setValidationError(null);
      setProgress(0);
      try {
        await uploadMaterial.mutateAsync({
          offeringId: effectiveOfferingId,
          name: name.trim(),
          description: description.trim() || undefined,
          file,
          /* r164-h: the byte-accurate bar — axios reports loaded/total,
           * the hook rounds to 0–100. */
          onUploadProgress: setProgress,
        });
        toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' });
        onClose();
      } catch {
        // surfaced inline from uploadMaterial.isError below
      }
      return;
    }
    const err =
      !effectiveOfferingId ? 'اختر المقرّر أولاً.' :
      name.trim().length < 1 ? 'اسم الملف مطلوب.' :
      !/^https:\/\//.test(url.trim()) ? 'الرابط يجب أن يبدأ بـ https://' :
      null;
    setValidationError(err);
    if (err) return;
    try {
      await create.mutateAsync({
        offeringId: effectiveOfferingId,
        name: name.trim(),
        type,
        url: url.trim(),
        description: description.trim() || undefined,
      });
      toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' });
      onClose();
    } catch {
      // surfaced inline from create.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="إضافة مادة تعليمية"
      closeOnOverlayClick={!pending}
      closeOnEscape={!escapeLocked}
    >
      {/* R305 DS: the dialog mounts its own scope — §0's crisp press
          feedback + focus offset reach the modal's controls. */}
      <div className="hr-scope">
      <div className="modal-header">
        <div className="modal-title">إضافة مادة</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={pending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} noValidate>
        <div className="modal-body">
          <div className="flex items-center gap-2" role="group" aria-label="طريقة إضافة المادة">
            <Pill
              on={mode === 'file'}
              icon={FileText}
              onClick={() => { setMode('file'); setValidationError(null); }}
            >
              ملف PDF
            </Pill>
            <Pill
              on={mode === 'link'}
              icon={ExternalLink}
              onClick={() => { setMode('link'); setValidationError(null); }}
            >
              رابط خارجي
            </Pill>
          </div>

          <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع المسجل العام.' : undefined}>
            <select
              className="input"
              value={effectiveOfferingId}
              onChange={(e) => setOfferingId(e.target.value)}
              disabled={pending || list.length === 0}
            >
              {list.map((o) => (
                <option key={o.id} value={o.id}>
                  {/* r168c: <bdi> is invalid inside <option> (text-only
                      content — React validateDOMNesting warned live during
                      the assignment flow). Plain text; option rendering
                      ignores bidi isolation anyway. */}
                  {o.course.name} · {o.course.code}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="اسم المادة" error={validationError && name.trim().length < 1 ? validationError : undefined}>
            <input
              className="input"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameAuto(false); }}
              placeholder='مثال: محاضرة الأسبوع الثالث — الشرائح'
              maxLength={200}
              disabled={pending}
            />
          </FormField>

          {mode === 'file' ? (
            <>
              <FormField
                label="ملف PDF"
                hint="ملفات PDF فقط، بحد أقصى 20 ميغابايت."
                error={validationError && name.trim().length >= 1 && effectiveOfferingId ? validationError : undefined}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="input upload-file-input"
                  accept="application/pdf,.pdf"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  disabled={pending}
                />
              </FormField>
              {file && (
                <div className="upload-file-field">
                  <Icon icon={FileText} size={14} className="text-muted" />
                  <span className="upload-file-name" title={file.name}><bdi>{file.name}</bdi></span>
                  <button
                    type="button"
                    className="btn ghost sm upload-file-remove"
                    onClick={removeFile}
                    disabled={pending}
                  >
                    <Icon icon={X} size={14} />
                    إزالة الملف
                  </button>
                </div>
              )}
              {/* r164-h: the determinate upload bar — real bytes (axios
                  onUploadProgress → 0–100), live-announced so screen
                  readers hear the upload is moving. */}
              {mode === 'file' && uploadMaterial.isPending && (
                <div aria-live="polite">
                  <ProgressBar
                    value={progress}
                    showValue={false}
                    label={`جارٍ رفع الملف… ${progress}%`}
                    color="var(--accent)"
                  />
                </div>
              )}
              {/* Locked type — the upload route is PDF-only, so the type
                  select collapses to an honest static chip (no fake
                  choice of types this channel cannot take). */}
              <div className="form-field">
                <div className="form-field-label">النوع</div>
                <Pill icon={FileText}>PDF</Pill>
              </div>
            </>
          ) : (
            <>
              <FormField label="النوع">
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  disabled={pending}
                >
                  <option value="PDF">PDF</option>
                  <option value="PPT">PPT</option>
                  <option value="VIDEO">فيديو</option>
                  <option value="DOC">DOC</option>
                  <option value="ZIP">ZIP</option>
                  <option value="IMAGE">صورة</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </FormField>

              <FormField
                label="الرابط (https)"
                /* r351 A2 (Q3): where-it-points hint retired — the label
                 * + placeholder say it. */
                error={validationError && !/^https:\/\//.test(url.trim()) ? validationError : undefined}
              >
                <input
                  className="input" dir="ltr" style={{ textAlign: 'start' }}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  maxLength={500}
                  disabled={pending}
                  spellCheck={false}
                />
              </FormField>
            </>
          )}

          <FormField label="الوصف (اختياري)">
            <textarea
              className="input" rows={3} maxLength={2000}
              placeholder='وصف مختصر يساعد الطالب على معرفة محتوى المادة…'
              value={description} onChange={(e) => setDescription(e.target.value)}
              disabled={pending} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {(mode === 'file' ? uploadMaterial.isError : create.isError) && (
            /* r164-h: the failure retry — the draft (file + name +
               description) stays in the modal, so «إعادة المحاولة»
               re-runs the SAME submit path instead of forcing the
               teacher to re-pick everything. */
            <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-2)' }}>
              <Icon icon={X} size={14} />
              <span className="flex-1">
                {/* r327 Y8: the file mode rides the shared upload-error
                    mapper — a 413 renders the numbered size-cap copy
                    (20 ميغابايت + the actionable fix) instead of the
                    generic fallback; the link mode keeps
                    apiErrorMessage. */}
                {mode === 'file'
                  ? pdfUploadErrorMessage(uploadMaterial.error, 'تعذّرت إضافة المادة — حاول مرة أخرى.')
                  : apiErrorMessage(create.error, 'تعذّرت إضافة المادة — حاول مرة أخرى.')}
              </span>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => void onSubmit()}
                disabled={pending}
              >
                <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary hr-cta" disabled={pending}>
            {mode === 'file'
              ? (uploadMaterial.isPending ? 'جارٍ رفع الملف…' : 'إضافة المادة')
              : (create.isPending ? 'جارٍ الإضافة…' : 'إضافة المادة')}
          </button>
        </div>
      </form>
      {guard}
      </div>
    </Modal>
  );
}

export function MaterialsPage() {
  const q = useTeacherMaterials();
  const [adding, setAdding] = useState(false);

  /* R359 (A3 · W2-c) — the materials ledger: every file row carries the
   * same anatomy — the two-line file cell (linked name over the course
   * sub-line, the type's content-driven icon leading), the hairline
   * type flag, mono tabular views/downloads, the honest size, and the
   * relative update stamp. */
  const columns: DataSheetColumn<TeacherMaterial>[] = [
    {
      key: 'name',
      label: 'الملف',
      render: (m) => {
        const TypeIcon = MATERIAL_TYPE_ICON[m.type] ?? FileText;
        return (
          <span className="sg-cell-stack">
            <a href={m.url} target="_blank" rel="noreferrer" className="text-link sg-cell-title">
              <Icon icon={TypeIcon} size={13} className="text-subtle" /> <bdi>{m.name}</bdi>
            </a>
            <span className="sg-cell-sub">{m.course.name}</span>
          </span>
        );
      },
    },
    {
      key: 'type',
      label: 'النوع',
      render: (m) => (
        <span className="sg-flag">{MATERIAL_TYPE_LABEL[m.type] ?? <bdi>{m.type}</bdi>}</span>
      ),
    },
    {
      key: 'views',
      label: 'المشاهدات',
      numeric: true,
      render: (m) => formatNum(m.views),
    },
    {
      key: 'downloads',
      label: 'التحميلات',
      numeric: true,
      render: (m) => formatNum(m.downloads),
    },
    {
      key: 'size',
      label: 'الحجم',
      mono: true,
      render: (m) => <bdi>{m.sizeBytes > 0 ? formatSize(m.sizeBytes) : '—'}</bdi>,
    },
    {
      key: 'updated',
      label: 'آخر تحديث',
      render: (m) => (
        <span className="sg-cell-sub" title={formatDateTimeAr(m.createdAt)}>
          حُدِّث {formatRelativeArShort(m.createdAt)}
        </span>
      ),
    },
  ];

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="الملفات التعليمية"
        /* r351 A2 (Q3): header subtitle retired — the rows explain
         * themselves (views/downloads counts are in the rows). */
        brow="عضو هيئة التدريس · المواد"
        actions={(
          /* r144 (T1-h F2): the channel the old dead-end card pointed
           * at without providing. By-link creation (no multipart).
           * R305 DS: the page's ONE ember-flavored primary —
           * R341 D8 re-keyed to the accent register (the
           * pattern-library primary voice). */
          <button type="button" className="btn accent hr-cta" onClick={() => setAdding(true)}>
            <Icon icon={Upload} size={15} /> إضافة مادة
          </button>
        )}
      />

      {/* R190 D-2: the standalone "how to add" explainer card is gone —
          its honest channel copy folds into the modal's channel pills.
          R359: the [01] MATERIALS frame carries the ledger. */}
      <SheetSection index="01" caption="MATERIALS" title="ملفاتك" pad="none">
        {q.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          </div>
        ) : (
          <DataSheet
            caption="الملفات التعليمية"
            columns={columns}
            rows={q.data ?? []}
            loading={q.isPending}
            empty={(
              /* r351 A2 (Q3): empty-state prose retired — the header's
               * «إضافة مادة» button is the action. */
              <EmptyState title="لم ترفع ملفات بعد" description="" illustration="empty-list" />
            )}
          />
        )}
      </SheetSection>

      {adding && <MaterialFormModal onClose={() => setAdding(false)} />}
    </div>
    </div>
  );
}

export function ResearchPage() {
  return <ResearchReviewPage />;
}

/* ─── r164-h: the risk vocabulary shared by the students table's
 * «المخاطرة» column — the same labels TeacherIntelligencePage's risk
 * rows wear (kept local to this bundle; the intelligence page keeps
 * its own edge/ink maps local too). */
const STUDENT_RISK_LABEL: Record<TeacherStudentRow['riskLevel'], string> = {
  OK: 'مستقر',
  WATCH: 'تحت المراقبة',
  AT_RISK: 'في خطر',
  CRITICAL: 'حرج',
};

export function StudentsListPage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const students = useMemo(() => stuQ.data ?? [], [stuQ.data]);
  /* R304: the same sortable-header grammar as the grades table — name /
     attendance / average cycle highest-first → lowest-first → default. */
  const [sort, setSort] = useState<RosterSort | null>(null);
  const sortedStudents = useMemo(() => sortRoster(stuQ.data ?? [], sort), [stuQ.data, sort]);
  const cycleSort = useCallback((key: RosterSortKey) => {
    setSort((cur) => cycleRosterSort(cur, key));
  }, []);

  /* 5-C3 (A9 P1-3): same offerings gate as GradesPage — the false
     «اختر مقرّراً» empty fired during load and on error here too. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        {/* r351 A2 (Q3): header subtitle retired — the roster explains itself. */}
        <PageHeader title="قائمة الطلاب" />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="قائمة الطلاب" />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  /* R359 (A3 · W2-c) — the class-roster ledger: the name is the row's
   * door (ONE tap to the offering's intelligence deep dive), the mono
   * id + percentages, and the TWO classifications as hairline flags —
   * التقدير (the ONE grade taxonomy, 22-a) and المخاطرة (the same risk
   * vocabulary the intelligence risk rows wear). At-risk students pin
   * their row's inline-start edge (warning) — the scan reads the pin
   * before the flag. */
  const columns: DataSheetColumn<TeacherStudentRow>[] = [
    {
      key: 'name',
      label: 'الاسم',
      render: (s) => (
        <Link
          to={`/teacher/intelligence/${effectiveOfferingId}`}
          className="text-link sg-cell-title"
          title="سياق المخاطرة والأداء في الذكاء الأكاديميّ"
        >
          {s.name}
        </Link>
      ),
    },
    {
      key: 'universityId',
      label: 'الرقم الجامعيّ',
      mono: true,
      render: (s) => <bdi>{s.universityId}</bdi>,
    },
    {
      key: 'att',
      label: 'الحضور',
      numeric: true,
      render: (s) => <bdi>{formatPct1(s.attendancePct)}%</bdi>,
    },
    {
      key: 'avg',
      label: 'المتوسّط',
      numeric: true,
      render: (s) => <bdi>{formatPct1(s.avgGrade)}%</bdi>,
    },
    {
      key: 'band',
      label: 'التقدير',
      render: (s) => {
        const band = gradeBand(s.avgGrade);
        return <span className="sg-flag" data-tone={BAND_FLAG_TONE[band.color]}>{band.label}</span>;
      },
    },
    {
      key: 'risk',
      label: 'المخاطرة',
      render: (s) => (
        <span className="sg-flag" data-tone={RISK_FLAG_TONE[s.riskLevel]}>{STUDENT_RISK_LABEL[s.riskLevel]}</span>
      ),
    },
  ];

  /* The KpiBand's honest numerals — roster count + the flagged tiers
   * the intelligence page's risk board owns in full. */
  const flaggedCount = students.filter((s) => s.riskLevel === 'AT_RISK' || s.riskLevel === 'CRITICAL').length;

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="قائمة الطلاب"
        /* r351 A2 (Q3): header subtitle retired — the roster explains itself. */
        brow="عضو هيئة التدريس · الفصل"
        actions={(
          <>
            {/* R341 D8 — the roster's ONE primary action on the accent
             * register: the risk analysis hub (the per-offering deep
             * links stay the name rows' job — the r164-h pin counts
             * them). */}
            <Link to="/teacher/intelligence" className="btn accent sm">تحليل المخاطرة</Link>
            <OfferingPickerSelect
              offerings={offerings}
              effectiveOfferingId={effectiveOfferingId}
              onChange={setOfferingId}
              label="المقرّر"
            />
          </>
        )}
      />

      <KpiBand
        items={[
          {
            index: '01',
            caption: 'ENROLLED',
            label: 'طلاب المقرّر',
            value: students.length,
            empty: stuQ.isPending || !effectiveOfferingId,
          },
          {
            index: '02',
            caption: 'FLAGGED',
            label: 'بحاجة متابعة (في خطر أو حرج)',
            value: flaggedCount,
            empty: stuQ.isPending || !effectiveOfferingId,
          },
        ]}
      />

      <SheetSection
        index="01"
        caption="CLASS ROSTER"
        title={offering
          ? `${offering.course.name} · ${offering.course.code} · ${
            /* P2-1: «0 طالباً» is broken Arabic — the zero case names
             * the reality (the empty-state below carries the guidance). */
            students.length === 0
              ? 'لا طلاب مسجَّلين'
              : countAr(students.length, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])
          }`
          : 'الطلاب'}
        aside={<RosterSortControl sort={sort} onCycle={cycleSort} />}
        pad="none"
      >
        {!effectiveOfferingId ? (
          /* r351 A2 (Q3): empty-state prose retired — the picker sits
           * directly above. */
          <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" />
        ) : stuQ.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
          </div>
        ) : (
          <DataSheet
            caption="قائمة الطلاب"
            columns={columns}
            rows={sortedStudents}
            loading={stuQ.isPending}
            rowTone={(s) => RISK_ROW_TONE[s.riskLevel]}
            empty={(
              /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
              <EmptyState title="لا يوجد طلاب مسجَّلون" description="" illustration="empty-list" />
            )}
          />
        )}
      </SheetSection>
    </div>


      {/* r323 B3.1 — the invite codes seat: mint scoped codes for the
          selected offering (the register page consumes them). */}
      <InviteCodesCard offeringId={effectiveOfferingId} />
</div>
  );
}

/* R190 D-2: the performance page's KPI row speaks the ledger stat
 * strip (mono label + metric value + trend note) — the icon-card tile
 * grid was the template pattern the transformation retires. Skeleton
 * mirrors the strip's anatomy so the data-land swap doesn't move. */
function StatStripSkeleton({ cells = 3 }: { cells?: number }) {
  return (
    <div className="stat-strip" aria-busy="true" aria-live="polite">
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="stat-cell" aria-hidden>
          <Skeleton width={70} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={90} height={28} />
          </div>
          <Skeleton width={110} height={11} />
        </div>
      ))}
    </div>
  );
}

export function PerformancePage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const analytics = useOfferingAnalytics(effectiveOfferingId || undefined);
  const students = useMemo(() => stuQ.data ?? [], [stuQ.data]);

  // Derive the grade distribution from the SAME gradeBand the grades
  // and students tables render (A6 P2, 22-a) — a student at 62 counts
  // into «جيّد» here and wears a «جيّد» chip everywhere; the old
  // private buckets (85+/75-84/60-74/<60) disagreed with both tables.
  const distribution = useMemo(() => {
    const total = students.length;
    const counts = new Map(GRADE_BANDS.map((b) => [b.key, 0]));
    if (total > 0) {
      for (const s of students) {
        const band = gradeBand(s.avgGrade);
        counts.set(band.key, (counts.get(band.key) ?? 0) + 1);
      }
    }
    return GRADE_BANDS.map((band) => {
      const count = counts.get(band.key) ?? 0;
      return { band, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
  }, [students]);

  /* 5-C3 (A9 P1-3): offerings gate, performance edition — the page
     used to render its «اختر مقرّراً» empty while the picker data was
     still in flight (or dead). Skeleton mirrors what lands: the KPI
     row + the distribution card. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        {/* r351 A2 (Q3): header subtitle retired — the KPI band explains itself. */}
        <PageHeader title="الأداء والتحليل" />
        <StatStripSkeleton />
        <CardSkeleton lines={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="الأداء والتحليل" />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  const passing = students.filter((s) => s.avgGrade >= 50).length;
  const passRate = students.length > 0 ? Math.round((passing / students.length) * 100) : 0;
  const top = students.filter((s) => gradeBand(s.avgGrade).key === 'EXCELLENT').length;
  const atRisk = students.filter((s) => s.riskLevel === 'AT_RISK' || s.riskLevel === 'CRITICAL').length;

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="الأداء والتحليل"
        /* r351 A2 (Q3): header subtitle retired — the KPI band explains
         * itself (values are visibly roster-derived). */
        brow="عضو هيئة التدريس · التحليل"
        actions={(
          <>
            {/* R341 D8 — the analysis ledger's ONE primary action on the
             * accent register: the intelligence drill-down (risk rows +
             * per-student context for the same offering). */}
            <Link
              to={effectiveOfferingId ? `/teacher/intelligence/${effectiveOfferingId}` : '/teacher/intelligence'}
              className="btn accent sm"
            >
              ذكاء المقرّر
            </Link>
            <OfferingPickerSelect
              offerings={offerings}
              effectiveOfferingId={effectiveOfferingId}
              onChange={setOfferingId}
              label="المقرّر"
            />
          </>
        )}
      />

      {!effectiveOfferingId ? (
        /* r351 A2 (Q3): empty-state prose retired — the picker sits
         * directly above. */
        <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" />
      ) : stuQ.isPending || analytics.isPending ? (
        /* 5-C3 (A9 P2-2): bare spinner → the shapes that land — the
           stat strip + the distribution card — so the data-land swap
           doesn't move the page (A9 V1 measured the spinner→content
           jump on this family). */
        <>
          <StatStripSkeleton />
          <CardSkeleton lines={5} />
        </>
      ) : stuQ.isError ? (
        <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
      ) : analytics.isError ? (
        <ErrorState message="تعذَّر تحميل مؤشّرات المقرّر" error={analytics.error} onRetry={() => analytics.refetch()} />
      ) : (
        <>
          {/* R359 (A3 · W2-c) — the ONE KpiBand: roster-derived pass
              rate / excellence / need counts with the honest deltas
              (the ٪ unit keeps the band's dimension string distinct
              from the distribution's Latin-% rows). */}
          <KpiBand
            items={[
              {
                index: '01',
                caption: 'PASS RATE',
                label: 'معدّل النجاح',
                value: passRate,
                unit: '٪',
                delta: students.length > 0 ? `${passing} من ${students.length}` : 'لا توجد بيانات',
                deltaTone: students.length === 0 ? 'neutral' : passRate >= 70 ? 'positive' : passRate >= 50 ? 'neutral' : 'danger',
                empty: students.length === 0,
              },
              {
                index: '02',
                caption: 'EXCELLENT',
                label: 'طلاب متفوّقون',
                value: top,
                delta: students.length > 0 ? `من ${students.length}` : 'لا توجد بيانات',
                empty: students.length === 0,
              },
              {
                index: '03',
                caption: 'NEEDS SUPPORT',
                label: 'بحاجة دعم',
                value: atRisk,
                delta: atRisk > 0 ? 'مراقبة مستمرّة' : 'لا تنبيهات',
                deltaTone: atRisk === 0 ? 'positive' : 'warning',
                empty: students.length === 0,
              },
            ]}
          />

          {/* R359 (A3 · W2-c) — the distribution joins the register as
              the [01] GRADE DISTRIBUTION frame; the band ledger lines
              (label + range · tabular share · the quiet bar) stay. */}
          <SheetSection
            index="01"
            caption="GRADE DISTRIBUTION"
            title={offering ? `توزيع الدرجات — ${offering.course.name}` : 'توزيع الدرجات'}
          >
            {students.length === 0 ? (
              /* r351 A2 (Q3): empty-state prose retired — the title speaks. */
              <EmptyState
                title="لا توجد بيانات توزيع بعد"
                illustration="empty-list"
                description=""
              />
            ) : (
              /* A6 P2 (22-a): empty buckets dim instead of painting
                 full-weight 0% tracks — the honest zero, not the
                 "rendering bug" wall. 4C-c: each band reads as a ledger
                 line — label + range at the start, the tabular share at
                 the end, the bar as the quiet fill underneath. */
              <div className="tpg-dist">
                {distribution.map(({ band, pct }) => (
                  /* R304: the honest dim rides a class now (was inline
                     opacity/transition per bucket). */
                  <div key={band.key} className={`tpg-dist-row${pct === 0 ? ' is-dim' : ''}`}>
                    <div className="tpg-dist-head">
                      <span className="tpg-dist-label">{band.label} (<bdi>{band.range}</bdi>)</span>
                      <bdi className="tpg-dist-value">{formatPct1(pct)}%</bdi>
                    </div>
                    <ProgressBar
                      value={pct}
                      showValue={false}
                      /* ReactNode label omitted — the accessible name is
                         the explicit ariaLabel (the ledger head above
                         carries the visible text). */
                      ariaLabel={`حصة تقدير ${band.label} (${band.range}): ${formatPct1(pct)}%`}
                      color={band.barColor}
                    />
                  </div>
                ))}
              </div>
            )}
          </SheetSection>
        </>
      )}
    </div>
    </div>
  );
}

/* Relative due-date copy — module scope so the queue groups and the
 * assignments list share ONE wording (5-B6). */
/** The elapsed core of an overdue date — «منذ يومين» … — shared by the
 *  assignments-list badge («انتهى منذ يومين») and the queue sub-line's
 *  past-tense label («استحقّ منذ يومين»). */
function elapsedSince(daysOverdue: number): string {
  return countAr(daysOverdue, ['منذ يوم', 'منذ يومين', 'منذ أيام', 'منذ يوماً']);
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return `انتهى ${elapsedSince(-days)}`;
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days < 7) return `بعد ${countAr(days, ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
  return formatDate(d, { dateStyle: 'medium' });
}

/** The queue group sub-line's due copy. formatDue's overdue wording
 * («انتهى منذ يومين») is correct as a standalone badge but reads as a
 * contradiction under the old present-tense prefix («يستحقّ انتهى منذ
 * يومين»): an overdue group flips the verb to the past — «استحقّ منذ
 * يومين» — while future dates keep «يستحقّ اليوم/غداً/بعد …/التاريخ».
 * Reuses formatDue internally so ONE relative vocabulary stays on the
 * page. Pure + exported for the unit suite. */
export function queueDueLabel(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return `استحقّ ${elapsedSince(-days)}`;
  return `يستحقّ ${formatDue(iso)}`;
}

/* ─── r144: the teaching loop's authoring half ─────────────────────
 * A modal on the backend's existing POST /offerings/:id/assignments
 * contract (title / description / type / dueAt / weight / maxScore).
 * Mirrors GradeSubmissionModal's structure: real <form>, FormField
 * wiring, discard guard, inline errors, toast on success. */
function AssignmentFormModal({ onClose }: { onClose: () => void }) {
  const offerings = useTeacherOfferings();
  const create = useCreateAssignment();

  const [offeringId, setOfferingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM'>('HOMEWORK');
  const [dueAt, setDueAt] = useState('');
  const [weight, setWeight] = useState('10');
  const [maxScore, setMaxScore] = useState('100');
  const [validationError, setValidationError] = useState<string | null>(null);

  const dirty = title.trim() !== '' || description.trim() !== '' || dueAt !== ''
    || weight !== '10' || maxScore !== '100';
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty,
    pending: create.isPending,
    onClose,
  });

  const list = offerings.data ?? [];
  const effectiveOfferingId = offeringId || list[0]?.id || '';

  const onSubmit = async () => {
    const err =
      !effectiveOfferingId ? 'اختر المقرّر أولاً.' :
      title.trim().length < 2 ? 'العنوان حرفان على الأقل.' :
      !dueAt ? 'حدّد الموعد النهائي للتسليم.' :
      Number.isNaN(Date.parse(dueAt)) ? 'قيمة الموعد النهائي غير صالحة.' :
      Number(weight) < 0 || Number(weight) > 100 ? 'الوزن بين 0 و100.' :
      Number(maxScore) <= 0 ? 'الدرجة العظمى أكبر من صفر.' :
      null;
    setValidationError(err);
    if (err) return;
    try {
      await create.mutateAsync({
        offeringId: effectiveOfferingId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueAt: new Date(dueAt).toISOString(),
        weight: Number(weight),
        maxScore: Number(maxScore),
      });
      toast.success('أُنشئ الواجب وسيظهر لطلاب المقرّر فوراً.', { title: 'تمّ الإنشاء' });
      onClose();
    } catch {
      // surfaced inline from create.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="إنشاء واجب جديد"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">واجب جديد</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      {/* R305 DS: the dialog mounts its own .hr-scope (§0 press
          feedback + focus offset). */}
      <div className="hr-scope">
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} noValidate>
        <div className="modal-body">
          <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع المسجل العام.' : undefined}>
            <select
              className="input"
              value={effectiveOfferingId}
              onChange={(e) => setOfferingId(e.target.value)}
              disabled={create.isPending || list.length === 0}
            >
              {list.map((o) => (
                <option key={o.id} value={o.id}>
                  {/* r168c: <bdi> is invalid inside <option> (text-only
                      content — React validateDOMNesting warned live during
                      the assignment flow). Plain text; option rendering
                      ignores bidi isolation anyway. */}
                  {o.course.name} · {o.course.code}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="العنوان" error={validationError && title.trim().length < 2 ? validationError : undefined}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: واجب الأسبوع الأول — مقدمة في الموضوع"
              maxLength={200}
              disabled={create.isPending}
            />
          </FormField>

          <FormField label="النوع">
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              disabled={create.isPending}
            >
              <option value="HOMEWORK">واجب</option>
              <option value="QUIZ">اختبار قصير</option>
              <option value="PROJECT">مشروع</option>
              <option value="EXAM">اختبار</option>
            </select>
          </FormField>

          {/* r183-B8 (A7 finding 1): the due-date field now carries the
              hint + dir="ltr" + Arabic echo pattern its three exam-
              authoring siblings already have (ExamAuthorPages.tsx
              «يفتح في / يغلق في»): datetime-local renders in the
              browser's locale inside an Arabic modal, so the hint names
              the native calendar as the safe path and the picked value
              becomes an echo the author can verify against. */}
          <FormField
            label="الموعد النهائي للتسليم"
            error={validationError && !dueAt ? validationError : undefined}
            hint={dueAt
              ? `المحدَّد: ${formatDateTimeAr(dueAt)}`
              : 'اختر من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
          >
            <input
              type="datetime-local"
              className="input"
              dir="ltr"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={create.isPending}
            />
          </FormField>

          <div className="flex gap-3" style={{ gap: 'var(--sp-3)' }}>
            <FormField label="الوزن (% من الدرجات)">
              <input
                type="number" className="input input-narrow" min={0} max={100} step={1}
                value={weight} onChange={(e) => setWeight(e.target.value)} disabled={create.isPending}
              />
            </FormField>
            <FormField label="الدرجة العظمى">
              <input
                type="number" className="input input-narrow" min={1} step={1}
                value={maxScore} onChange={(e) => setMaxScore(e.target.value)} disabled={create.isPending}
              />
            </FormField>
          </div>

          <FormField label="الوصف (اختياري)">
            <textarea
              className="input" rows={3} maxLength={4000}
              placeholder="تعليمات التسليم، المراجع، معايير التقييم…"
              value={description} onChange={(e) => setDescription(e.target.value)}
              disabled={create.isPending} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {create.isError && (
            <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
              {apiErrorMessage(create.error, 'تعذّر إنشاء الواجب — حاول مرة أخرى.')}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary hr-cta" disabled={create.isPending}>
            {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الواجب'}
          </button>
        </div>
      </form>
      {guard}
      </div>
    </Modal>
  );
}

export function AssignmentsPage() {
  const q = useTeacherAssignments();
  /* r157 / 6A8: the queue rides its OWN endpoint — the dashboard feed
   * only ever previewed 6 rows, so the 7th+ pending submission was
   * invisible on the very page built to grade it. The new hook walks
   * the full shared set (SUBMITTED + LATE, oldest-first, take 100). */
  const pendingQ = usePendingSubmissions();

  const [gradeTarget, setGradeTarget] = useState<GradeTarget | null>(null);
  const [creating, setCreating] = useState(false);

  /* The queue group header carries the assignment's due date (VLM
   * residue, re-measured valid): urgency context per group, from the
   * same assignment rows the fallback ceiling lookup uses. */
  const dueFor = useCallback((title: string, courseCode?: string) => {
    const match = (q.data ?? []).find(
      (a) => a.title === title && (!courseCode || a.course.code === courseCode),
    );
    return match?.dueAt;
  }, [q.data]);

  const pending = useMemo(
    () => queueToPending(pendingQ.data ?? []),
    [pendingQ.data],
  );

  /* The next row after the one on screen — computed from the same
   * pending list, skipping the submission being graded. After a save
   * the queue refetch (the modal's post-save invalidation drops the
   * graded row, so this stays honest even mid-refetch. */
  const nextTarget = gradeTarget
    ? pending.find((p) => p.submissionId !== gradeTarget.submissionId) ?? null
    : null;

  /* R359 (A3 · W2-c) — the assignments ledger columns: the two-line
   * work cell (kind: title over course · code), the mono ceiling, the
   * flat flag due-date (overdue danger · imminent warning-ink · else
   * positive), the mono submissions fraction, and the pinned .badge
   * ratio whose tone still keys off the deadline (E / 3-a). */
  const assignmentsColumns: DataSheetColumn<TeacherAssignmentRow>[] = [
    {
      key: 'title',
      label: 'الواجب',
      render: (a) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title">
            {ASSIGNMENT_KIND_LABEL[a.type] ?? <bdi>{a.type}</bdi>}: {a.title}
          </span>
          <span className="sg-cell-sub">{a.course.name} · <bdi>{a.course.code}</bdi></span>
        </span>
      ),
    },
    {
      key: 'max',
      label: 'الدرجة العظمى',
      numeric: true,
      render: (a) => a.maxScore,
    },
    {
      key: 'due',
      label: 'الموعد',
      render: (a) => {
        /* 5-B6 (A7): the due flag carries its own tone so a teacher
         * scanning the ledger reads urgency without parsing relative
         * dates — the full date rides the title (P3-2). */
        const days = Math.round((new Date(a.dueAt).getTime() - Date.now()) / 86400000);
        const dueTone = days < 0 ? 'danger' : days <= 3 ? 'warning' : 'positive';
        return (
          <span className="sg-flag" data-tone={dueTone} title={formatDateTimeAr(a.dueAt)}>
            {formatDue(a.dueAt)}
          </span>
        );
      },
    },
    {
      key: 'subs',
      label: 'التسليمات',
      numeric: true,
      render: (a) => (
        <span className="sg-cell-stack" title="التسليمات مقابل المسجّلين">
          <bdi>{a.submissions} / {a.enrolled}</bdi>
          {/* P2-1 (5-A7): the zero case names the reality — countAr(0)
           * renders the broken «0 تسليماً». */}
          <span className="sg-cell-sub">
            {a.submissions === 0 ? 'لا تسليمات بعد' : countAr(a.submissions, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً'])}
          </span>
        </span>
      ),
    },
    {
      key: 'ratio',
      label: 'نسبة التسليم',
      render: (a) => {
        const ratio = a.enrolled > 0 ? a.submissions / a.enrolled : 0;
        const days = Math.round((new Date(a.dueAt).getTime() - Date.now()) / 86400000);
        /* Submission-ratio tone keys off the deadline too: strict
         * green/amber/red only once the deadline is here or past — a
         * future-due assignment with a low ratio is not a problem yet,
         * so it renders NEUTRAL unless more than half already
         * submitted. Overdue keeps the strict mapping; due today
         * counts as urgent. The .badge primitive stays (unit-pinned). */
        const ratioTone: 'green' | 'amber' | 'red' | undefined = days > 0
          ? (ratio > 0.5 ? 'green' : undefined)
          : (ratio > 0.5 ? 'green' : ratio > 0.25 ? 'amber' : 'red');
        return <Badge color={ratioTone}>{Math.round(ratio * 100)}%</Badge>;
      },
    },
  ];

  return (
    /* R305 DS: .hr-scope declares the ember tokens + §A tqd- deltas. */
    <div className="hr-scope">
    <div className="page">
      <PageHeader
        title="الواجبات والاختبارات"
        /* r351 A2 (Q3): header subtitle retired — the two cards (queue +
         * list) explain the page. */
        brow="عضو هيئة التدريس · التصحيح"
        actions={(
          /* r144 (T1-h F1): the teaching loop's missing authoring half —
           * the copy used to promise «ستظهر هنا فور إنشاء أيّ واجب» with
           * no creation affordance anywhere in the product.
           * R305 DS: the page's ONE ember-flavored primary — R341 D8
           * re-keyed to the accent register (the pattern-library
           * primary voice; the ember ring stays). */
          <button type="button" className="btn accent hr-cta" onClick={() => setCreating(true)}>
            <Icon icon={ClipboardList} size={15} /> واجب جديد
          </button>
        )}
      />

      {/* R359 (A3 · W2-c) — the page's ONE KpiBand: every numeral is a
          live payload count (the queue endpoint · the assignments
          endpoint · the submitted total). Honest-empty while pending. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'PENDING',
            label: 'تسليمات بانتظار درجتك',
            value: pending.length,
            empty: pendingQ.isPending,
          },
          {
            index: '02',
            caption: 'ASSIGNMENTS',
            label: 'واجبات واختبارات منشورة',
            value: q.data?.length ?? 0,
            empty: q.isPending,
          },
          {
            index: '03',
            caption: 'SUBMISSIONS',
            label: 'إجمالي التسليمات المستلمة',
            value: (q.data ?? []).reduce((sum, a) => sum + a.submissions, 0),
            empty: q.isPending,
          },
        ]}
      />

      <NeedsReviewCard
        pending={pending}
        isPending={pendingQ.isPending}
        isError={pendingQ.isError}
        error={pendingQ.error}
        onRetry={() => pendingQ.refetch()}
        dueFor={dueFor}
        onGrade={(target) => setGradeTarget(target)}
      />

      {/* R359 (A3 · W2-c) — the assignments ledger: the roster of
          authored work as a DataSheet (hairline rows, mono ceilings,
          flat flag due-dates, the pinned .badge ratio). pad=none — the
          table IS the body. */}
      <SheetSection index="02" caption="ALL ASSIGNMENTS" title="جميع الواجبات" pad="none">
        {q.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          </div>
        ) : (
          <DataSheet
            caption="جميع الواجبات"
            columns={assignmentsColumns}
            rows={q.data ?? []}
            loading={q.isPending}
            empty={(
              /* r351 A2 (Q3): empty-state prose retired — the header's
               * «واجب جديد» button is the action. */
              <EmptyState title="لا توجد واجبات بعد" description="" illustration="empty-list" />
            )}
          />
        )}
      </SheetSection>

      {gradeTarget && (
        /* Keyed by submission: «تقييم التالي» swaps the target and the
         * fresh draft + done state remount with it — a graded-then-next
         * flow never inherits the previous row's score box. */
        <GradeSubmissionModal
          key={gradeTarget.submissionId}
          target={gradeTarget}
          nextTarget={nextTarget}
          onClose={() => setGradeTarget(null)}
          onNext={() => nextTarget && setGradeTarget(nextTarget)}
        />
      )}

      {creating && <AssignmentFormModal onClose={() => setCreating(false)} />}
    </div>
    </div>
  );
}

interface GradeTarget {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  courseCode?: string;
  maxScore?: number;
  submittedAt: string;
  /** LATE submissions (the queue row's status) — drives the «متأخر» chip
   *  on the row. Never folded into assignmentTitle: groupPending keys
   *  by title. */
  late: boolean;
  /** 5-B6 (audit 5-A7 P1-2): the student's answer, carried by the
   *  queue row (the backend projects textAnswer + fileUrl). */
  textAnswer?: string | null;
  fileUrl?: string | null;
}

/** r157 / 6A8 — the pending-queue row → GradeTarget mapping. The
 * dedicated queue endpoint ships the assignment's title/maxScore (and
 * course code) as real fields, so the old feed-path hacks — the
 * "s-" prefix strip and the «سلّم / سلّم/ت» title strip the maxScore
 * lookup needed — are gone: the queue row IS the target.
 * R341 deadcode: the export keyword is retired — the unit seat that
 * once imported it is gone (knip: unusedExport); the function stays
 * (TeacherPages' own queue consumes it above). */
function queueToPending(rows: PendingSubmissionRow[]): GradeTarget[] {
  return rows.map((r) => ({
    submissionId: r.id,
    studentName: `${r.student.firstName} ${r.student.lastName}`,
    assignmentTitle: r.assignment.title,
    courseCode: r.assignment.offering.course.code,
    maxScore: r.assignment.maxScore,
    submittedAt: r.submittedAt,
    late: r.status === 'LATE',
    textAnswer: r.textAnswer,
    fileUrl: r.fileUrl,
  }));
}

/* ─── Pending submissions awaiting grading ───────────────── */

/** One assignment's pending rows — the queue groups by assignment so 30
 *  pending submissions read as a handful of groups (A7 plan item 4),
 *  each carrying its own grading ceiling + due date. */
interface QueueGroup {
  key: string;
  assignmentTitle: string;
  courseCode?: string;
  maxScore?: number;
  /** The assignment's dueAt (ISO) — the group header renders the
   * relative due copy (VLM residue 5-B6). */
  dueAt?: string;
  rows: GradeTarget[];
}

function groupPending(pending: GradeTarget[], dueFor: (title: string, courseCode?: string) => string | undefined): QueueGroup[] {
  const groups: QueueGroup[] = [];
  for (const p of pending) {
    const key = `${p.assignmentTitle}·${p.courseCode ?? ''}`;
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.rows.push(p);
      existing.maxScore = existing.maxScore ?? p.maxScore;
    } else {
      groups.push({
        key,
        assignmentTitle: p.assignmentTitle,
        courseCode: p.courseCode,
        maxScore: p.maxScore,
        dueAt: dueFor(p.assignmentTitle, p.courseCode),
        rows: [p],
      });
    }
  }
  return groups;
}

function NeedsReviewCard({
  pending,
  isPending,
  isError,
  error,
  onRetry,
  dueFor,
  onGrade,
}: {
  pending: GradeTarget[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  dueFor: (title: string, courseCode?: string) => string | undefined;
  onGrade: (target: GradeTarget) => void;
}) {
  const groups = useMemo(() => groupPending(pending, dueFor), [pending, dueFor]);

  /* R359 (A3 · W2-c) — the queue LEDGER columns. The old card was "a
   * half-built table" (the VLM verdict): orphaned تصحيح buttons,
   * misaligned rows, a ragged vertical rule. The DataSheet rebuild
   * gives every row the same anatomy — the two-line student cell
   * (name over the arrival sub-line), the hairline status flag
   * (متأخر vs في الموعد — aligned column, never a floating chip),
   * and ONE verb button per row (تصحيح, the 44px-floor primary).
   * The late state rides ONE channel — the flag (the VLM verdict:
   * pin + flag + bar was three accents for one state). */
  const columns: DataSheetColumn<GradeTarget>[] = [
    {
      key: 'student',
      label: 'الطالب',
      render: (p) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title">{p.studentName}</span>
          <span className="sg-cell-sub" title={formatDateTimeAr(p.submittedAt)}>
            وصل {formatRelativeArShort(p.submittedAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (p) =>
        p.late ? (
          /* 18-G's late flag — a state of the submission, never a
           * suffix inside the assignment title (the 16-B1 hazard). */
          <span className="sg-flag" data-tone="warning">متأخر</span>
        ) : (
          <span className="sg-flag" data-tone="quiet">في الموعد</span>
        ),
    },
    {
      key: 'grade',
      label: '',
      noLabel: true,
      render: (p) => (
        <button type="button" className="btn primary sm" onClick={() => onGrade(p)}>
          <Icon icon={ClipboardCheck} size={14} /> تصحيح
        </button>
      ),
    },
  ];

  return (
    /* R359 (A3 · W2-c) — the framed queue section: [01] GRADING QUEUE,
     * the counted honest subtitle on the head rule (the pinned countAr
     * copy, byte-exact), pad=none — the ledger IS the body. The
     * .queue-group frames stay (grouping is content, not chrome). */
    <SheetSection
      index="01"
      caption="GRADING QUEUE"
      title="تسليمات بانتظار التقييم"
      /* P2-1: countAr(0) renders the broken «0 تسليماً…» — the zero case
       * gets its own honest copy (the dashboard-badge pattern). */
      aside={
        <span className="sg-label">
          {pending.length === 0
            ? 'لا تسليمات بانتظار درجتك'
            : countAr(pending.length, ['تسليم واحد بانتظار درجتك', 'تسليمان بانتظار درجتك', 'تسليمات بانتظار درجتك', 'تسليماً بانتظار درجتك'])}
        </span>
      }
      pad="none"
    >
      {isPending ? (
        <DataSheet caption="تسليمات بانتظار التقييم" columns={columns} rows={[]} loading />
      ) : isError ? (
        <div className="sg-pad-in">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : pending.length === 0 ? (
        /* r351 A2 (Q3): empty-state prose retired — the subtitle's
         * honest zero copy carries the state. */
        <EmptyState
          title="لا تسليمات بانتظار التصحيح"
          illustration="empty-list"
          description=""
        />
      ) : (
        /* The groups: one framed ledger per assignment — the head rule
         * (title · course · due meta · mono ceiling · counted flag)
         * over the submission rows. */
        <div className="tpg-queue">
          {groups.map((g) => {
            /* R304: the «what needs me first» edge — overdue queues wear
               the danger rule, due within 3 days the warning rule (same
               inline-start-edge grammar as the quality alerts rows). */
            const days = g.dueAt ? Math.round((new Date(g.dueAt).getTime() - Date.now()) / 86400000) : null;
            const dueEdge: 'overdue' | 'soon' | undefined = days === null ? undefined : days < 0 ? 'overdue' : days <= 3 ? 'soon' : undefined;
            return (
            <div key={g.key} className="queue-group tpg-queue-section hr-edge" data-due={dueEdge} data-severity={dueEdge}>
              <div className="queue-group-head tpg-queue-head">
                <div className="queue-group-main">
                  <div className="queue-group-title tpg-queue-title">{g.assignmentTitle}</div>
                  {(g.courseCode || g.dueAt) && (
                    <div className="queue-group-sub">
                      {g.courseCode && <bdi>{g.courseCode}</bdi>}
                      {g.dueAt && (
                        <>
                          {g.courseCode ? ' · ' : ''}
                          <span title={formatDateTimeAr(g.dueAt)}>{queueDueLabel(g.dueAt)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {g.maxScore !== undefined && (
                  /* The ceiling badge keeps the .badge primitive (the
                   * unit suite pins the counted mono numeral on it). */
                  <Badge>الدرجة من <bdi className="font-mono">{g.maxScore}</bdi></Badge>
                )}
                <span className="sg-flag">
                  {countAr(g.rows.length, ['تسليم واحد', 'تسليمان', 'تسليمات', 'تسليماً'])}
                </span>
              </div>
              <DataSheet
                caption={`تسليمات بانتظار التقييم — ${g.assignmentTitle}`}
                columns={columns}
                rows={g.rows}
                rowTone={(p) => (p.late ? 'warning' : undefined)}
              />
            </div>
            );
          })}
        </div>
      )}
    </SheetSection>
  );
}

/* ─── Teacher grading modal (grade + feedback) ──────────── */

/** The student's file, linked the way the research flow links papers:
 *  platform-served files open the in-app /document/ viewer (annotations
 *  included); external https URLs open in a new tab. */
function SubmissionFileLink({ fileUrl, assignmentTitle }: { fileUrl: string; assignmentTitle: string }) {
  if (fileUrl.startsWith('/api/v1/files/papers/')) {
    return (
      <Link
        to={`/document/${encodeURIComponent(fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(assignmentTitle)}&back=${encodeURIComponent('/teacher/assignments')}`}
        className="btn outline sm"
      >
        <Icon icon={FileText} size={13} />
        فتح الملف في العارض
      </Link>
    );
  }
  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="btn outline sm">
      <Icon icon={ExternalLink} size={13} />
      فتح الملف الخارجي
    </a>
  );
}

function GradeSubmissionModal({
  target,
  nextTarget,
  onClose,
  onNext,
}: {
  target: GradeTarget;
  /** The next pending submission after this one — powers «تقييم التالي»
   *  (A7 P2-2): 30 submissions ≈ 30 saves, not 30 × save+close+hunt. */
  nextTarget: GradeTarget | null;
  onClose: () => void;
  onNext: () => void;
}) {
  const grade = useGradeSubmission(target.submissionId);
  const qc = useQueryClient();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  /* «تقييم التالي» grabs focus when the done state renders — after a
   * save the teacher's Enter key walks straight into the next
   * submission (the whole queue is gradeable without the mouse).
   * Imperative (not the autofocus attribute) so jsdom and every
   * browser behave the same. */
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (done) nextBtnRef.current?.focus();
  }, [done]);

  // 15-e P1-6: the score + up-to-2000-char feedback is the teacher's
  // longest unsaved prose — Esc / close X / cancel / overlay-click now
  // route through the shared discard guard (the same one the curriculum
  // builders use) instead of silently dropping the draft. Once the save
  // lands the draft is no longer unsaved — closing is free.
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (score !== '' || feedback !== ''),
    pending: grade.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const value = Number(score);
    if (score.trim() === '' || Number.isNaN(value)) {
      setValidationError('أدخل درجة صحيحة.');
      return;
    }
    if (value < 0) {
      setValidationError('لا يمكن أن تكون الدرجة سالبة.');
      return;
    }
    if (target.maxScore !== undefined && value > target.maxScore) {
      setValidationError(`الدرجة يجب ألّا تتجاوز ${target.maxScore}.`);
      return;
    }
    setValidationError(null);
    try {
      await grade.mutateAsync({
        grade: value,
        feedback: feedback.trim() || undefined,
      });
      // r157 / 6A8: useGradeSubmission refreshes the dashboards — but the
      // QUEUE this page now renders is its own query key. Drop the graded
      // row from ['teacher','me','pending-submissions'] so «تقييم التالي»
      // and the NeedsReviewCard counts stay honest immediately.
      void qc.invalidateQueries({ queryKey: ['teacher', 'me', 'pending-submissions'] });
      setDone(true);
      toast.success('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.', { title: 'تمّ التقييم' });
    } catch {
      // surfaced inline from grade.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel={`تقييم تسليم ${target.assignmentTitle}`}
      closeOnOverlayClick={!grade.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تقييم التسليم</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={grade.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      {/* R305 DS: the dialog mounts its own .hr-scope (§0 press
          feedback + focus offset). */}
      <div className="hr-scope">
      {/* A7 P2-2: a real <form> — Enter in the score field submits the
          grade (the GradeAttemptModal contract; this was the only
          grading/authoring modal without one). */}
      <form
        onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
        noValidate
      >
        <div className="modal-body">
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{target.assignmentTitle}</div>
          <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }} title={formatDateTimeAr(target.submittedAt)}>
            {target.studentName}
            {target.courseCode ? <> · <bdi>{target.courseCode}</bdi></> : null} · وصل {formatRelativeArShort(target.submittedAt)}
          </div>

          {/* A7 P1-2 — the answer the teacher is grading. Carried by the
              queue row (see GradeTarget); a submission always has at
              least one of textAnswer/fileUrl server-side, so an absent
              pair means a legacy payload, not an empty answer. */}
          {(target.textAnswer != null && target.textAnswer !== '') || target.fileUrl != null ? (
            <div className="grade-answer">
              <div className="grade-answer-head">
                <Icon icon={FileText} size={13} />
                <span>إجابة الطالب</span>
              </div>
              {target.textAnswer != null && target.textAnswer !== '' && (
                <p className="grade-answer-text">{target.textAnswer}</p>
              )}
              {target.fileUrl != null && (
                <SubmissionFileLink fileUrl={target.fileUrl} assignmentTitle={target.assignmentTitle} />
              )}
            </div>
          ) : null}

          {done ? (
            <div className="form-feedback ok" role="status">
              <Icon icon={CheckCircle2} size={15} />
              <span className="flex-1">تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.</span>
            </div>
          ) : (
            <>
              {/* 23-b (21-b hand-off, A9 P2-4): the two grade-modal fields
                  ride the shared FormField primitive — the label is
                  htmlFor-wired and the validation error now injects
                  aria-invalid + aria-describedby into the control itself
                  (announced on re-focus, not only via the role=alert),
                  instead of the hand-rolled label + loose alert <p>. */}
              <FormField
                label={`الدرجة${target.maxScore !== undefined ? ` (من 0 إلى ${target.maxScore})` : ''}`}
                error={validationError}
              >
                <input
                  type="number"
                  className="input input-narrow"
                  placeholder={target.maxScore !== undefined ? `0 – ${target.maxScore}` : '0'}
                  min={0}
                  max={target.maxScore}
                  step="any"
                  inputMode="decimal"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  disabled={grade.isPending}
                />
              </FormField>

              <FormField label="ملاحظات للطالب (اختياري)">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="اكتب ملاحظاتك على الإجابة…"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={grade.isPending}
                  maxLength={2000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </FormField>

              {grade.isError && (
                <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
                  {apiErrorMessage(grade.error, 'تعذَّر حفظ الدرجة — حاول مرة أخرى.')}
                </p>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={grade.isPending}>
            {done ? 'إغلاق' : 'إلغاء'}
          </button>
          {done ? (
            nextTarget && (
              <button type="button" className="btn primary" onClick={onNext} ref={nextBtnRef}>
                <Icon icon={Send} size={13} /> تقييم التالي
              </button>
            )
          ) : (
            <button
              type="submit"
              /* R305 DS: the dialog's ONE ember-flavored primary. */
              className="btn primary hr-cta"
              disabled={grade.isPending}
            >
              {grade.isPending ? 'جارٍ الحفظ…' : 'حفظ الدرجة'}
            </button>
          )}
        </div>
      </form>
      {guard}
      </div>
    </Modal>
  );
}


/* ── Messages (r170a inbox) — r171a shared extraction ──────────
 *
 * The inbox (rows, unread sweep, pagination) and the compose/reply
 * lifecycle (validation, send, toast, error mapping) moved verbatim to
 * the role-agnostic components/messages/ pair so the STUDENT side
 * could ship the same full loop — students previously received DMs
 * with no inbox at all (notification link:null). This file keeps every
 * exported name the route table and the unit suites use: MessagesPage
 * (a thin wrapper now) + the pure helpers re-exported below. The
 * teacher-specific half — the offering selector and its roster
 * optgroup — rides renderCompose/extraFields into the shared modal. */

/* Re-exports keep every existing import site (the route table's lazy
 * wrapper, the unit suites) working unchanged. */
export {
  isUnreadIncoming,
  MESSAGE_MAX_CHARS,
  validateMessageDraft,
  sendErrorMessage,
  collectCorrespondents,
} from '../../components/messages/MessagesInbox';

/** The teacher compose shell: the offering selector + its roster
 * optgroup (the only real student pool a teacher can call — see the
 * RECIPIENT SCOPE note in MessagesInbox). The offering selector feeds
 * the student optgroup only; it starts empty so useTeacherStudents
 * stays disabled (enabled: !!offeringId) until the teacher actually
 * picks a course — no roster fetch on a plain reply. */
function TeacherMessageCompose({
  preset,
  correspondents,
  onClose,
}: {
  preset: { id: string; name: string } | null;
  correspondents: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [offeringId, setOfferingId] = useState('');
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const rosterQ = useTeacherStudents(offeringId || undefined);
  const roster = rosterQ.data ?? [];
  const offeringLabel = offerings.find((o) => o.id === offeringId)?.course.name;

  /* The roster's loading/error states ride the recipient select as
   * disabled options — exactly the r170a modal's rows. */
  const statusOptions = [
    ...(rosterQ.isPending ? ['جارٍ تحميل طلاب المقرّر…'] : []),
    ...(rosterQ.isError ? ['تعذَّر تحميل طلاب المقرّر'] : []),
  ];

  return (
    <MessageComposeModal
      presetRecipient={preset}
      correspondents={correspondents}
      recipientGroups={roster.length > 0 ? [{
        label: offeringLabel ? `طلاب ${offeringLabel}` : 'طلاب المقرّر',
        options: roster.map((s) => ({ id: s.studentId, name: s.name, detail: s.universityId })),
      }] : undefined}
      statusOptions={statusOptions}
      noRecipientsHint="لا يوجد مستلمون متاحون بعد — اختر مقرّراً لطلابه."
      extraDirty={preset ? false : offeringId !== ''}
      extraFields={offerings.length > 0 && !preset ? ({ sendPending }) => (
        <FormField
          label="المقرّر (لاختيار أحد طلابك)"
          /* r351 A2 (Q3): how-it-works hint retired — the label says it. */
        >
          <select
            className="input"
            value={offeringId}
            onChange={(e) => setOfferingId(e.target.value)}
            disabled={sendPending}
          >
            <option value="">— بدون مقرّر —</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
            ))}
          </select>
        </FormField>
      ) : undefined}
      onClose={onClose}
    />
  );
}

export function MessagesPage() {
  return (
    /* R305 DS: the inbox keeps its own component contract — the
     * scope wrapper only declares the ember tokens around it. */
    <div className="hr-scope">
      <MessagesInbox
        title="الرسائل"
        /* r351 A2 (Q3): subtitle trimmed to the honest recipient scope —
         * the compose/reply instructions retired (the buttons exist). */
        subtitle="طلاب مقرّراتك ومن راسلك سابقاً."
        renderCompose={(args) => <TeacherMessageCompose {...args} />}
      />
    </div>
  );
}
