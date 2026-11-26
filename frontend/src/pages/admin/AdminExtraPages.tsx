import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download, RefreshCw, Mail, X, Radio,
  GraduationCap, UserMinus, AlertCircle, BookOpen, FileText,
} from 'lucide-react';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
/* r253 (Phase B) → R359 final: the students roster speaks the sheet
 * grammar — the KpiBand strip + the DataSheet register (dense hairline
 * table, mono numerics, labelled cards ≤640px). */
import { PageFrame, PageHeader as PatternsPageHeader, FilterBar } from '../../components/patterns';
/* R359 final — the sheet grammar primitives. */
import { SheetSection, KpiBand, DataSheet, type DataSheetColumn } from '../../components/patterns';
import { Modal } from '../../components/overlays/Modal';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
import { toast } from '../../lib/toast';
import { useFaculties, useCurrentInstitutionSlug, useStudentEnrollments, useEnrollmentOfferings, useEnrollStudent, useDropEnrollment, apiErrorMessage } from '../../hooks/useResources';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { BulkImportModal } from '../../components/admin/BulkImportModal';
/* T-24: footer moved to the shared leaf (AdminPages cycle severance). */
import { TablePaginationFooter } from './TablePaginationFooter';
/* P2.2 dedup: re-pointed off AdminPages' retired byte-identical copy
 * onto the canonical owner StatStripSkeleton (components/owner) — R359:
 * the skeleton left with the digital band's always-mounted honest-empty
 * register. */
import { countAr } from '../../lib/format';
import { formatNum } from '../../utils/numbers';
// D14 css split (13-17): colleges.css has owned the admin-extras surfaces
// (.admin-students-*, .digital-stat-*, .settings-*, .top-courses-*)
// since "Sub-project D" — see its ownership banner. It lands in the chunk
// shared with CollegePages / CompetitionsPages /
// LandingPage (the other consumers).
// r157 (6A9 #6): .admin-pagination and .trend-table left the family list —
// the pagination footer rides the shared .table-pagination system and the
// trend table the canonical .table-wrap (both local rules deleted this
// round from admin.css).
import '../../styles/admin.css'; // r150e: admin-extras surfaces own their sheet now
// R305-A8 «ds»: the scoped admin/owner sheet rides LAST (same @layer
// pages, later source order → it wins the equal-specificity ties). Every
// rule is scoped under the .r305ao page-root marker — zero leakage.
import '../../styles/shared/ds-admin-owner.css';

/* ───────────────────────── /admin/students ─────────────────────────
 *
 * Real student listing with search + faculty filter + pagination.
 * Replaces the AdminPlaceholder stub.
 */

interface AdminStudentRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  createdAt: string;
  studentProfile: {
    universityId: string;
    year: number;
    gpa: string | number;
    totalXp: number;
    level: number;
    faculty: { id: string; name: string };
    department: { id: string; name: string };
  } | null;
}

interface PaginatedStudents {
  data: AdminStudentRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Grouped counted plural for the roster footer — retired in r157
 *  (6A9 #7): the footer is the shared TablePaginationFooter now, whose
 *  count line uses countAr digits (the family convention — the old
 *  ar-LY grouping label is gone; five-digit totals render ungrouped
 *  like every sibling roster). */

export function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  // 5-B4 (5-A8 §5 row 5 landing craft): drill-down links arrive with
  // ?facultyId (the dashboard's chart bars / quick stats) or ?q — the
  // roster opens PRE-FILTERED instead of making the admin re-pick the
  // faculty the tile just named. Consumed once on mount (deep-link
  // semantics); later param changes don't fight the user's edits.
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '');
  const [facultyId, setFacultyId] = useState(() => searchParams.get('facultyId') ?? '');
  const facQ = useFaculties(useCurrentInstitutionSlug()); // r180: caller-institution scoping
  // r154e.2: the student whose enrollment modal is open (null = closed).
  const [enrollmentStudent, setEnrollmentStudent] = useState<AdminStudentRow | null>(null);
  // A8 P3-4: the empty-search state gets the same reset affordance its
  // teachers twin has — a dead end otherwise.
  const hasActiveFilters = debouncedQ !== '' || facultyId !== '';
  // r323 B3.1: the registrar's bulk-import entry point.
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const clearSearch = () => {
    setQ('');
    setDebouncedQ('');
    setFacultyId('');
    setPage(1);
  };

  // Debounce the search input (OwnerUsersPage pattern) so the server query
  // fires once typing pauses instead of on every keystroke. The mount-time
  // run carries an unchanged term and must not reset pagination (a page
  // opened inside the first 300ms would silently bounce back to page 1).
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

  const inst = useInstitutionScope();
  const studentsQ = useQuery({
    /* r180: /admin/students is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['admin', 'students', page, debouncedQ, facultyId], inst),
    queryFn: async () => {
      const res = await api.get<{ data: AdminStudentRow[]; meta: PaginatedStudents['meta'] }>(
        '/admin/students',
        { params: { page, limit: 20, q: debouncedQ || undefined, facultyId: facultyId || undefined } },
      );
      return { data: res.data.data, meta: res.data.meta };
    },
    placeholderData: (prev) => prev,
  });

  /* R359 final — the roster columns: every academic fact visible at a
   * glance (the RowItem expansion dies; the table IS the expansion),
   * numerics in the mono tabular register, the status as the flat
   * hairline flag, and the registrar's enrollments verb in the last
   * cell. */
  const columns: DataSheetColumn<AdminStudentRow>[] = [
    {
      key: 'name',
      label: 'الطالب',
      render: (s) => (
        <span className="sg-cell-stack">
          <span className="sg-cell-title">{s.firstName} {s.lastName}</span>
          <bdi className="sg-cell-sub" dir="ltr">{s.email}</bdi>
        </span>
      ),
    },
    {
      key: 'universityId',
      label: 'رقم القيد',
      mono: true,
      render: (s) => (s.studentProfile?.universityId ? <bdi>{s.studentProfile.universityId}</bdi> : '—'),
    },
    {
      key: 'faculty',
      label: 'الكلّيّة / القسم',
      render: (s) => (
        <span className="sg-cell-stack">
          <span>{s.studentProfile?.faculty.name ?? '—'}</span>
          <span className="sg-cell-sub">{s.studentProfile?.department.name ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'year',
      label: 'السنة',
      numeric: true,
      render: (s) => s.studentProfile?.year ?? '—',
    },
    {
      key: 'gpa',
      label: 'المعدّل',
      numeric: true,
      render: (s) => s.studentProfile?.gpa ?? '—',
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (s) => (
        <span className="sg-flag" data-tone={s.isActive ? 'positive' : 'danger'}>
          {s.isActive ? 'نشط' : 'موقوف'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      noLabel: true,
      render: (s) => (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setEnrollmentStudent(s)}
          aria-label={`تسجيلات ${s.firstName} ${s.lastName}`}
        >
          <Icon icon={GraduationCap} size={13} />
          تسجيلات
        </button>
      ),
    },
  ];

  /* R359 final — the sheet-grammar roster: KpiBand (honest numerals from
   * the live payloads) + the DataSheet register inside the framed
   * section. .r305ao keeps scoping the family ds sheet; PageFrame (a
   * frozen pattern) takes no className, so the marker rides the quiet
   * full-width wrapper (the .content-inner > * entrance contract holds). */
  return (
    <div className="r305ao">
    <PageFrame width="default">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="إدارة الطلاب"
        /* r351 A2 (Q3): header description retired — the roster explains itself. */
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'الطلاب' }]}
        meta={studentsQ.data
          ? `${countAr(studentsQ.data.meta.total, ['طالب واحد مسجَّل', 'طالبان مسجَّلان', 'طلاب مسجَّلون', 'طالباً مسجَّلاً'])} · بحث الخادم`
          : 'قراءة سجلّ الطلاب…'}
        actions={(
          /* R342-09: the roster's ONE standing action rides the accent
           * register — the bulk import is the registrar's primary verb. */
          <button type="button" className="btn accent sm" onClick={() => setBulkImportOpen(true)}>
            <Icon icon={Download} size={14} />
            استيراد طلاب من ملف
          </button>
        )}
      />

      {bulkImportOpen && (
        <BulkImportModal onClose={() => {
          setBulkImportOpen(false);
          // The roster may have grown — refresh whatever the server has now.
          void studentsQ.refetch();
        }} />
      )}

      {/* R359 final — the KPI band: every numeral derives from the live
          payloads (meta.total · the faculty list · the current query's
          row count). Honest-empty while pending. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'TOTAL',
            label: 'إجمالي الطلاب المسجَّلين',
            value: studentsQ.data?.meta.total ?? 0,
            empty: studentsQ.isPending,
          },
          {
            index: '02',
            caption: 'FACULTIES',
            label: 'كلّيّات متاحة للتصفية',
            value: facQ.data?.length ?? 0,
            empty: facQ.isPending,
          },
          {
            index: '03',
            caption: 'RESULTS',
            label: 'نتائج الاستعلام الحالي',
            value: studentsQ.data?.data.length ?? 0,
            empty: studentsQ.isPending,
          },
        ]}
      />

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: 'ابحث بالاسم أو البريد أو رقم القيد…',
        }}
        filters={(
          <>
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
                <Icon icon={RefreshCw} size={13} />
                إعادة تحميل الكلّيّات
              </button>
            )}
          </>
        )}
      />

      {/* R359 final — the roster sheet: pad=none (the table IS the body). */}
      <SheetSection index="01" caption="STUDENT ROSTER" title="سجلّ الطلاب" pad="none">
        {studentsQ.isError && (
          <div className="sg-pad-in">
            <ErrorState error={studentsQ.error} message="تعذّر تحميل قائمة الطلاب" onRetry={() => studentsQ.refetch()} />
          </div>
        )}
        {/* 5-b (loading mirror §3/§6-4): the cold load used to render an
         * EMPTY sheet body (the section collapsed, then the table popped
         * in) because the body was gated on studentsQ.data. The DataSheet
         * now mounts unconditionally — loading={isPending} renders the
         * same-column skeleton table (the courses roster's exact mirror)
         * and the pagination footer stays gated on the resolved meta. */}
        <DataSheet
          caption="سجلّ الطلاب"
          columns={columns}
          rows={studentsQ.data?.data ?? []}
          loading={studentsQ.isPending}
          empty={(
            <EmptyState
              illustration="empty-search"
              title="لا توجد نتائج"
              description=""
              action={hasActiveFilters ? (
                <button type="button" className="btn ghost sm" onClick={clearSearch}>
                  <Icon icon={X} size={13} />
                  مسح البحث
                </button>
              ) : undefined}
            />
          )}
        />
        {studentsQ.data && studentsQ.data.data.length > 0 && (
          <div className="sg-pad-in">
            <TablePaginationFooter
              page={studentsQ.data.meta.page}
              totalPages={studentsQ.data.meta.totalPages}
              total={studentsQ.data.meta.total}
              unit={['طالب واحد', 'طالبان', 'طلاب', 'طالباً']}
              onPage={setPage}
            />
          </div>
        )}
      </SheetSection>
      {enrollmentStudent && (
        <EnrollmentModal
          student={enrollmentStudent}
          onClose={() => setEnrollmentStudent(null)}
        />
      )}
    </PageFrame>
    </div>
  );
}

/* ─── r154e.2: Enrollment management modal (AdminStudentsPage) ─── */
function EnrollmentModal({ student, onClose }: { student: AdminStudentRow; onClose: () => void }) {
  const enrollments = useStudentEnrollments(student.id);
  const offerings = useEnrollmentOfferings();
  const enroll = useEnrollStudent();
  const drop = useDropEnrollment();
  const [selectedOffering, setSelectedOffering] = useState('');
  const [error, setError] = useState<string | null>(null);
  // r157 (6A9 #4): the enrollment whose drop is awaiting confirmation
  // (null = dialog closed). Dropping deletes the enrollment AND the
  // student's progress in the course — a ConfirmDialog gate, not a
  // one-click button.
  const [confirmingDrop, setConfirmingDrop] = useState<{
    enrollmentId: string;
    courseName: string;
  } | null>(null);
  const busy = enroll.isPending || drop.isPending;

  const handleEnroll = async () => {
    if (!selectedOffering) return;
    setError(null);
    try {
      await enroll.mutateAsync({ studentId: student.id, offeringId: selectedOffering });
      toast.success('تمّ التسجيل في المقرّر');
      setSelectedOffering('');
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذَّر التسجيل — حاول مرة أخرى.'));
    }
  };

  return (
    <Modal open onClose={onClose} ariaLabel={`تسجيلات ${student.firstName} ${student.lastName}`} closeOnOverlayClick={!busy} closeOnEscape={!busy}>
      <div className="modal-header">
        {/* r157 (6A9 #4): h3 — parity with the AdminPages course modal's
            title; a dialog heading is a heading, not a styled div. */}
        <h3 className="modal-title">تسجيلات {student.firstName} {student.lastName}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" disabled={busy}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      {/* R305-A8: the modal body carries the .r305ao marker too — the
          dialog portals to document.body, so the scoped sheet's
          descendant grammar (the danger zone below) reaches it through
          this in-card marker while the chrome rides body:has(.r305ao). */}
      <div className="modal-body r305ao">
        {/* Current enrollments — R305-A8 danger zone: this group holds
            the modal's destructive verbs (each row's «إلغاء التسجيل»
            deletes the enrollment AND the student's progress in the
            course, behind its confirm dialog). The quiet red fence sets
            them apart from the routine enroll form below; the dialog
            flow itself is untouched. */}
        <div className="r305ao-danger-zone" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <div className="r305ao-danger-zone-title">التسجيلات الحالية</div>
          <p className="r305ao-danger-zone-note">
            إلغاء التسجيل يحذف تسجيل الطالب في المقرّر وتقدُّمه فيه نهائيًا — يمرّ كل إلغاء على تأكيد صريح قبل التنفيذ.
          </p>
          {enrollments.isPending ? (
            <div className="flex-col gap-2"><Skeleton width="100%" height={40} /><Skeleton width="100%" height={40} /></div>
          ) : enrollments.isError ? (
            <ErrorState error={enrollments.error} message="تعذّر تحميل التسجيلات" onRetry={() => enrollments.refetch()} />
          ) : !enrollments.data?.length ? (
            <div className="text-sm text-muted">لا تسجيلات حاليًا.</div>
          ) : (
            enrollments.data.map((e) => (
              <div key={e.id} className="flex items-center gap-2" style={{ padding: 'var(--sp-2)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                <Icon icon={BookOpen} size={14} className="text-muted" />
                <div className="flex-1">
                  <div className="text-sm">{e.offering.course.name} (<bdi className="font-mono">{e.offering.course.code}</bdi>)</div>
                  <div className="text-xxs text-subtle">{e.offering.term} · {e.offering.teacher.firstName} {e.offering.teacher.lastName}</div>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setConfirmingDrop({ enrollmentId: e.id, courseName: e.offering.course.name })}
                  disabled={busy}
                >
                  <Icon icon={UserMinus} size={13} />
                  {/* Per-row pending via drop.variables — only the row
                      whose drop is in flight reads «جارٍ الإلغاء…». */}
                  {drop.isPending && drop.variables?.enrollmentId === e.id ? 'جارٍ الإلغاء…' : 'إلغاء التسجيل'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Enroll in a new offering */}
        <div className="flex-col gap-2">
          <div className="text-sm font-semibold">تسجيل في مقرّر جديد</div>
          {offerings.isPending ? (
            <Skeleton width="100%" height={40} />
          ) : offerings.isError ? (
            <ErrorState error={offerings.error} message="تعذّر تحميل المقرّرات" onRetry={() => offerings.refetch()} />
          ) : !offerings.data?.length ? (
            <div className="text-sm text-muted">لا توجد مقرّرات متاحة للتسجيل.</div>
          ) : (
            <>
              <select
                className="input"
                value={selectedOffering}
                onChange={(ev) => setSelectedOffering(ev.target.value)}
                disabled={busy}
                aria-label="اختر مقرًّا للتسجيل"
              >
                <option value="">— اختر مقرًّا —</option>
                {offerings.data.map((o) => {
                  const full = o._count.enrollments >= o.capacity;
                  return (
                    <option key={o.id} value={o.id} disabled={full}>
                      {o.course.name} ({o.course.code}) · {o.term} · {o.teacher.firstName} {o.teacher.lastName}
                      {full ? ' — مكتمل' : ` — ${o._count.enrollments}/${o.capacity}`}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                className="btn primary"
                onClick={() => void handleEnroll()}
                disabled={!selectedOffering || busy}
              >
                <Icon icon={GraduationCap} size={14} />
                {enroll.isPending ? 'جارٍ التسجيل…' : 'تسجيل'}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>
              <Icon icon={AlertCircle} size={13} /> {error}
            </p>
          )}
        </div>
      </div>

      {/* r157 (6A9 #4): the drop gate — a destructive, irreversible
          delete (enrollment + the student's progress in the course)
          behind the accessible ConfirmDialog (focus trap + Escape +
          aria), danger tone, the course named in the message, and the
          per-row pending state above carrying the in-flight signal.
          Cancel closes the dialog only; nothing is deleted. */}
      <ConfirmDialog
        open={confirmingDrop !== null}
        title="إلغاء التسجيل"
        message={confirmingDrop
          ? `سيُحذف تسجيل الطالب في «${confirmingDrop.courseName}» وتقدُّمه نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
          : ''}
        confirmLabel="إلغاء نهائي"
        danger
        onCancel={() => setConfirmingDrop(null)}
        onConfirm={async () => {
          if (!confirmingDrop) return;
          const target = confirmingDrop;
          setConfirmingDrop(null);
          setError(null);
          try {
            await drop.mutateAsync({ enrollmentId: target.enrollmentId, studentId: student.id });
            toast.success('تمّ إلغاء التسجيل');
          } catch (e) {
            setError(apiErrorMessage(e, 'تعذَّر إلغاء التسجيل — حاول مرة أخرى.'));
          }
        }}
      />
    </Modal>
  );
}

/* ───────────────────────── /admin/digital ─────────────────────────
 *
 * Digital transformation snapshot. How much of the university's life
 * actually flows through the platform vs. paper.
 */

interface DigitalMetrics {
  totalUsers: number;
  activeUsers: number;
  adoptionPct: number;
  onlineExams: number;
  examAttempts: number;
  labSessions: number;
  moocEnrollments: number;
  researchPapers: number;
  liveSessions: number;
  materialsUploaded: number;
}

export function AdminDigitalPage() {
  const inst = useInstitutionScope();
  const q = useQuery({
    /* r180: /admin/digital is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['admin', 'digital'], inst),
    queryFn: () => unwrap<DigitalMetrics>(api.get('/admin/digital')),
    staleTime: 60_000,
  });

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="التحوّل الرقميّ"
        /* r351 A2 (Q3): header description retired — the metric labels explain the page. */
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'التحوّل الرقميّ' }]}
        actions={(
          /* R342-09 (D11 sub-page CTA precedent): a read-only metrics ledger
           * names its ONE honest next surface — the institutional reports
           * are the adoption view's analytical sibling. */
          <Link to="/admin/reports" className="btn accent sm">
            <Icon icon={FileText} size={13} />
            التقارير المؤسسية
          </Link>
        )}
      />

      {/* 5-b (loading mirror §3 + honest-empty): the band now mounts
       * ALWAYS — pending cells read the '—' register (never a fake
       * zero), and the register's skeleton rides the DataSheet's own
       * loading state (same two columns) instead of the retired 3-col
       * TableSkeleton that flashed before the 2-col sheet resolved. */}
      <KpiBand
        items={[
          { index: '01', caption: 'ACCOUNTS', label: 'إجمالي الحسابات', value: q.data?.totalUsers ?? 0, empty: q.isPending },
          { index: '02', caption: 'ACTIVE', label: 'حسابات نشطة', value: q.data?.activeUsers ?? 0, empty: q.isPending },
          { index: '03', caption: 'ADOPTION', label: 'نسبة التبنّي', value: q.data?.adoptionPct ?? 0, unit: '%', empty: q.isPending },
          { index: '04', caption: 'MATERIALS', label: 'ملفات تعليمية مرفوعة', value: q.data?.materialsUploaded ?? 0, empty: q.isPending },
        ]}
      />

      {/* 5-A8 §6 step 4 (route identity): the four single-stat cards
          fold into ONE «تبنّي المكوّنات» register — this was the third
          consecutive 4-identical-tiles page in the nav. One register,
          one scanning rhythm, mobile-safe via the sheet's own card
          collapse. §6 step 6 (rhythm): the register is the page's
          primary section — it takes the breath after the KPI band.
          R359 final: the register re-keys onto the DataSheet (mono
          numerics, the component as the quiet sub-line). */}
      <SheetSection
        index="01"
        caption="COMPONENT ADOPTION"
        /* Untitled while pending/error: the section title stays the
         * data-land signal (the pinned test waits on it) — the head
         * lands with the rows, never a pending-state echo. */
        title={q.data ? 'تبنّي المكوّنات' : undefined}
        pad="none"
      >
        {q.isError ? (
          <div className="sg-pad-in">
            <ErrorState error={q.error} message="تعذّر تحميل مؤشّرات التحوّل الرقميّ" onRetry={() => q.refetch()} />
          </div>
        ) : (
          <DataSheet
            caption="جدول تبنّي المكوّنات"
            rows={q.data
              ? [
                { component: 'الاختبار الإلكترونيّ', label: 'اختبارات منشورة', value: q.data.onlineExams },
                { component: 'الاختبار الإلكترونيّ', label: 'محاولات أداء', value: q.data.examAttempts },
                { component: 'التعلّم النشط', label: 'جلسات معامل افتراضيّة', value: q.data.labSessions },
                { component: 'التعلّم النشط', label: 'جلسات بثّ مباشر', value: q.data.liveSessions },
                { component: 'التعلّم الذاتيّ', label: 'تسجيلات MOOC', value: q.data.moocEnrollments },
                { component: 'البحث العلميّ', label: 'أوراق علميّة في النظام', value: q.data.researchPapers },
              ]
              : []}
            loading={q.isPending}
            columns={[
              {
                key: 'metric',
                label: 'المؤشّر',
                render: (r) => (
                  <span className="sg-cell-stack">
                    <span className="sg-cell-title">{r.label}</span>
                    <span className="sg-cell-sub">{r.component}</span>
                  </span>
                ),
              },
              { key: 'value', label: 'القيمة', numeric: true, render: (r) => formatNum(r.value) },
            ]}
          />
        )}
      </SheetSection>
    </div>
  );
}

/* ───────────────────────── /admin/analysis ─────────────────────────
 *
 * 5-B4 (5-A8 §6 step 2): the analysis page was a third arrangement of
 * the same /admin/reports bundle — the same four KPIs re-labeled plus
 * the same trend series as a table (audit route score 6.0). It folds
 * into /admin/reports as the trend's «جدول» view; this route now
 * redirects there with the table view pre-set so old bookmarks keep
 * working. NAV/RTE NOTE for 5-B5/orchestrator: remove the nav item
 * (lib/nav.ts «تحليل الأداء»), the App.tsx route row and the AppShell
 * title-map entry — listed in the 5-B4 worklog.
 */

export function AdminAnalysisPage() {
  return <Navigate to="/admin/reports?trend=table" replace />;
}

/* ───────────────────────── /admin/settings ─────────────────────────
 *
 * Settings landing. Keeps the system-level facts visible even before
 * the per-setting endpoints are wired. Infrastructure rows are driven
 * by the real /health probe (A8 P2-6): the old hardcoded «متصلة/آمنة»
 * pills and the wrong «Postgres (Neon Serverless)» vendor line were
 * unfalsifiable decoration next to honest «قيد التطوير» copy.
 */

/** GET /api/v1/health payload (raw — not the {data} envelope). */
interface HealthStatus {
  ok: boolean;
  dbLatencyMs: number;
}

export function AdminSettingsPage() {
  const health = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const res = await api.get<HealthStatus>('/health');
      return res.data;
    },
    staleTime: 30_000,
    retry: 1,
  });
  const dbOk = health.isSuccess && health.data?.ok === true;

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        eyebrow="إدارة المؤسسة"
        title="إعدادات المنصّة"
        /* r351 A2 (Q3): header description trimmed to the one honest
         * sentence (individual toggles are WIP); the explanatory first
         * sentence retired. */
        description="تفعيل المعدِّلات الفرديّة قيد التطوير."
        breadcrumbs={[{ label: 'لوحة إدارة المؤسسة', to: '/admin/dashboard' }, { label: 'إعدادات المنصّة' }]}
        /* r342 t13: the header's «مزامنة الجامعة» CTA retired with the
         * zu-sync system (dropped upstream — /admin/sync gone); the
         * settings ledger states its own facts, no external CTA. */
      />

      {/* R359 (A3): the four fact groups become framed sections on the
          hairline column grid (sg-cols) — explicit indices, real Latin
          classifications, the honest health probe riding the flat
          sg-flag instead of the tinted Badge fills. The .settings-row
          families keep their rows inside the frames. */}
      <div className="sg-cols" data-cols="2">
        <SheetSection index="01" caption="INSTITUTIONAL IDENTITY" title="الهويّة المؤسّسيّة">
          <div className="settings-row">
            <div>
              <div className="settings-label">اسم المنصّة</div>
              <div className="settings-value">أُلارا — نظام تشغيل الجامعة</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">اللغة الافتراضيّة</div>
              <div className="settings-value">العربيّة (RTL)</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">الشعار</div>
              <div className="settings-value">أُلارا — علامة المنصّة المستقلّة</div>
            </div>
          </div>
        </SheetSection>

        <SheetSection index="02" caption="INFRASTRUCTURE" title="البنية التشغيليّة">
          <div className="settings-row">
            <div>
              <div className="settings-label">قاعدة البيانات</div>
              <div className="settings-value">
                {health.isPending
                  ? 'جارٍ التحقق…'
                  : dbOk
                    ? `متصلة · زمن الاستجابة ${health.data!.dbLatencyMs} مث`
                    : 'تعذّر التحقق من الاتصال'}
              </div>
            </div>
            {!health.isPending && (
              <span className="sg-flag" data-tone={dbOk ? 'positive' : 'danger'}>
                {dbOk ? 'متصلة' : 'غير متاحة'}
              </span>
            )}
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">المصادقة</div>
              <div className="settings-value">صلاحية الرمز 15 دقيقة · التحديث كل 7 أيام</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">معدّل الطلبات</div>
              <div className="settings-value">حدّ عامّ 1000 طلب كل 15 دقيقة · مصادقة 10 محاولات لكل 15 دقيقة</div>
            </div>
          </div>
        </SheetSection>

        <SheetSection index="03" caption="SYSTEM OPERATIONS" title="عمليّات النظام">
          {/* r351 A2 (Q3): helper paragraph trimmed to the one honest
           * sentence (the verbs live in the owner panel); the restating
           * first sentence retired. */}
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            التنفيذ الفعليّ من لوحة المالك.
          </p>
          <div className="settings-actions">
            {/* r155c: أُزيل زر «مزامنة بيانات الجامعة» المعطَّل — كانت
                بطاقة «الموارد المرتبطة» أدناه تصل مباشرة إلى ‎/admin/sync
                المتاح فعلياً للمسجل العام، فيكون الزر المعطَّل مع تعليته
                «لوحة المالك» تضليلاً. (r342 t13: رابط ‎/admin/sync نفسه
                أُحيل أيضاً — سُقِط نظام zu-sync من المنبع فلم يعد وجهةً.)
                بقية الأزرار (التصدير/البثّ/فحص الصحّة) ما تزال ملك لوحة
                المالك — التعليقة صادقة بشأنها. */}
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Download} size={14} />
              تصدير سجلّ النشاط
            </button>
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Mail} size={14} />
              بثّ إعلان عامّ
            </button>
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Radio} size={14} />
              فحص الصحّة العامّة
            </button>
          </div>
        </SheetSection>

        <SheetSection index="04" caption="LINKED RESOURCES" title="الموارد المرتبطة">
          <ul className="settings-links">
            {/* r342 t13: بند «مزامنة الكلّيّات والأقسام» (/admin/sync)
                أُحيل — سُقِط نظام zu-sync من المنبع. */}
            <li><Link to="/admin/teachers">صلاحيات أعضاء هيئة التدريس</Link></li>
            <li><Link to="/admin/reports">تقارير إدارة المؤسسة</Link></li>
            {/* 5-B5 hand-off (one-name-per-surface): the surface's own
                title is «كلّيّات الجامعة» — the former «صفحات الكلّيّات»
                label drifted from the folded reality (the public
                colleges + leaderboard page). */}
            <li><Link to="/colleges">كلّيّات الجامعة</Link></li>
          </ul>
        </SheetSection>
      </div>
    </div>
  );
}
