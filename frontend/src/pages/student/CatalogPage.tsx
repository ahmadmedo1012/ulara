import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, BookOpen, Info, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader } from '../../components/patterns';
/* R359 (A3 · final sweep) — the sheet grammar joins the §B2 kit: the
 * framed section (registration crosses + Latin mono caption + the
 * aside slot) replaces the §B2 title bar; the honest server total
 * rides the head's aside. */
import { SheetSection } from '../../components/patterns';
import { BarCount, EmptyCell } from '../../components/student';
import { Icon } from '../../components/Icon';
import { courseIcon, courseTint } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { useAuthStore } from '../../stores/auth.store';
import { useCoursesCatalog, type CatalogCourseRow } from '../../hooks/useResources';
/* R305-A5 (the reference): the shared student vocabulary + this family's sheet. */
import '../../styles/student/ds-core.css';
import '../../styles/student/ds-courses.css';
/* R319 (c3-S1): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics (the catalogue thumb-cards' hairline
 * re-seat + the masthead re-seat via the .r319s-page wrapper). */
import '../../styles/student/pages.css';
import '../../styles/student/academic-pages.css';

/**
 * r180-F4 — «دليل المقررات»: the student-facing catalogue of their
 * CURRENT institution (GET /courses?institutionSlug=…, q + pagination).
 *
 * Honest boundary, matching the CoursesPage empty-state contract:
 * enrollment in this product is ADMIN-MEDIATED — the cards render
 * catalogue info only (code, name, icon, department, credits) with NO
 * enroll button, and the banner above the grid names the real door
 * (مكتب المسجل العام). The grid reuses the enrolled-courses card grammar
 * (thumb-card + courseIcon tint well) so a course reads the same on
 * both surfaces; the search box is the LibraryPage GlobalSearch
 * grammar (aria-label + × clear) with its 250ms debounce, and the
 * pagination footer is the MessagesInbox convention (RTL chevrons,
 * countAr total).
 *
 * R359 (final sweep): the catalogue region rides the framed sheet —
 * loading, error, the no-context gate and the empties all live INSIDE
 * the section body.
 */

/* One server page of the catalogue — grid-3 × 4 rows keeps the page
 * an even 12-card grid on desktop. */
const CATALOG_PAGE_SIZE = 12;

const COURSE_UNIT: [string, string, string, string] = ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'];

const CREDITS_UNIT: [string, string, string, string] = ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'];

/** Shape-matched loading skeleton for the catalogue grid (the
 *  CourseGridSkeleton grammar from CoursesPage — thumb-card anatomy,
 *  never a bare spinner). r365: it mirrors the RESOLVED anatomy — one
 *  skeleton thumb-card per CATALOG_PAGE_SIZE slot, so the pending
 *  grid holds the same footprint the settled grid will. */
function CatalogGridSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: CATALOG_PAGE_SIZE }).map((_, i) => (
        <div className="thumb-card" key={i} aria-hidden>
          <div className="thumb-card-image">
            <Skeleton width={56} height={56} rounded="var(--r-lg)" />
          </div>
          <div className="thumb-card-body">
            <Skeleton width="40%" height={12} />
            <Skeleton width="85%" height={16} />
            <Skeleton width="55%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* The catalogue card — the enrolled CourseCard's read-only twin: the
 * same thumb-card anatomy, tint well and code-chip scent, but a plain
 * <div> (no anchor, no CTA): there is nothing a student can DO with a
 * catalogue row in this product — enrollment is admin-mediated, and a
 * link/button would promise an action the platform does not offer. */
function CatalogCard({ c, i }: { c: CatalogCourseRow; i: number }) {
  const Cmp = courseIcon(c.code ?? c.name);
  const tint = courseTint(c.themeColor);
  const department = c.department?.name;
  return (
    <div
      className="thumb-card"
      style={{ '--cc-i': i, '--course-tint': tint } as CSSProperties}
    >
      <div className="thumb-card-image">
        <span>
          <Icon icon={Cmp} size={28} strokeWidth={1.6} />
        </span>
      </div>
      <div className="thumb-card-body">
        <div className="thumb-card-meta">
          <span className="font-mono" dir="ltr">{c.code}</span>
          <span className="thumb-card-count">
            {countAr(c.credits, CREDITS_UNIT)}
          </span>
        </div>
        <div className="thumb-card-title" title={c.name}>{c.name}</div>
        <div className="thumb-card-sub" title={department ?? undefined}>
          {department ?? 'قسم غير محدَّد'}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  // The institution context of the current session (the token's `inst`
  // claim, persisted by the auth store) — the catalogue is scoped to
  // it. Null = no context yet; the query stays disabled and the page
  // says so instead of rendering a fabricated list.
  const institutionName = useAuthStore((s) => s.currentInstitution?.name ?? null);
  const institutionSlug = useAuthStore((s) => s.currentInstitution?.slug ?? null);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search input — 250ms of idle typing before the query
  // fires (the LibraryPage convention; api.ts clamps q at the
  // transport boundary to the backend's 120-char contract). A changed
  // term restarts the browse from page 1 (the admin register's
  // filter-reset convention) — the clamp effect below only catches the
  // shrunken-tail race.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const catalog = useCoursesCatalog(institutionSlug, debouncedQ, page, CATALOG_PAGE_SIZE);
  const rows = catalog.data?.data ?? [];
  const meta = catalog.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  /* A shrunken result set (search narrowed while on page 3) can leave
   * the page pointer past the last real page — the server answers an
   * empty data array. Fold the pointer back to the last page instead
   * of showing a misleading "no results" wall; setState to the same
   * value is a no-op, so this cannot loop. */
  useEffect(() => {
    if (meta && page > Math.max(1, meta.totalPages)) {
      setPage(Math.max(1, meta.totalPages));
    }
  }, [meta, page]);

  const searching = debouncedQ.length > 0;

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      {/* R319 (c3-S1): the header joins the patterns PageHeader (the
          r288 anatomy fold — .page-title was already byte-identical to
          .pf-page-title) so the route carries the ambient sheet code
          + the ONE masthead display voice; the read-only classification
          rides the eyebrow seat.
          r341 D7a — the header's action seat: the honest cross-route
          verb on the accent register (the quality pages' «لوحة الجودة»
          precedent). The catalogue itself is read-only by product
          contract (enrollment is admin-mediated — the note below says
          so), so the one primary action is the reciprocal of the
          courses page's «دليل المقرّرات» ghost: jump to the student's
          OWN enrolled courses. */}
      <PageHeader
        title="دليل المقرّرات"
        eyebrow="مرجع للقراءة فقط"
        description={
          institutionName
            ? `فهرس مقرّرات ${institutionName} — للبحث والاطّلاع على الخطة الدراسية.`
            : 'فهرس مقرّرات مؤسستك — للبحث والاطّلاع على الخطة الدراسية.'
        }
        actions={
          <Link to="/student/courses" className="btn accent sm">
            مقرّراتي المسجّلة
          </Link>
        }
      />

      {/* The honest-door banner (the CoursesPage empty-state contract,
          now on the surface that invites the question): enrollment is
          admin-mediated in this product — accent-soft wash + accent-ink
          (the SubmitAssignmentModal done-banner grammar, R305: the
          .r305c-note anatomy lives in the family sheet, tokens only). */}
      <div role="note" className="r305c-note">
        <span><Icon icon={Info} size={15} /></span>
        <span>التسجيل في المقرّرات يتم عبر مكتب المسجل العام — تواصل مع مؤسستك.</span>
      </div>

      {/* R359 (final sweep) — the catalogue sheet: the framed region
          [01] with the server's honest total (meta.total, never the
          page array) as the head's quiet mono count. Loading, error,
          the no-context gate and the empties all live INSIDE the body.
          r365 — the search rides the §2 toolbar law: borderless and
          attached to the sheet (the body's first child — the floating
          Card wrapper above the sheet is retired), visible in every
          state so a failed fetch never strands the field. */}
      <SheetSection
        index="01"
        caption="INSTITUTION CATALOG"
        title="مقرّرات المؤسسة"
        aside={
          !catalog.isPending && !catalog.isError && meta ? (
            <BarCount
              n={meta.total}
              srLabel={countAr(meta.total, COURSE_UNIT)}
            />
          ) : undefined
        }
      >
        {/* The sheet's own toolbar — the LibraryPage GlobalSearch
            grammar: aria-label, × clear while the field carries text. */}
        <div className={`topbar-search${q ? ' has-clear' : ''}`} style={{ maxWidth: 360, marginBlockEnd: 'var(--sp-4)' }}>
          <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
          <input
            type="text"
            placeholder="ابحث باسم المقرّر أو رمزه…"
            aria-label="ابحث في دليل المقرّرات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="topbar-search-clear"
              onClick={() => setQ('')}
              aria-label="مسح البحث"
            >
              <Icon icon={X} size={12} />
            </button>
          )}
        </div>

        {catalog.isError ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
        ) : !institutionSlug ? (
          /* First: the context gate — a disabled query stays pending
             forever (React Query never resolves it), so the honest
             no-context state must be checked BEFORE the skeleton. */
          <EmptyState
            icon={BookOpen}
            title="لم تُحدَّد مؤسستك بعد"
            description="اختر مؤسستك من مبدّل المؤسسة في الشريط الأعلى لعرض دليل مقرّراتها."
          />
        ) : catalog.isPending ? (
          <CatalogGridSkeleton />
        ) : !rows.length ? (
          /* R319 (c3-S1): the empty catalogue is the hatched EmptyCell
             — the sheet's reserved-but-empty region. */
          <EmptyCell
            label={searching ? 'لا توجد مقرّرات تطابق البحث' : 'لا توجد مقرّرات بعد'}
            note={searching
              ? `لم نجد مقرّراً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`
              : 'لم تُضف مقرّرات إلى دليل مؤسستك حتى الآن — ستظهر هنا فور إضافتها من المسجل العام.'}
          />
        ) : (
          <>
            {searching && (
              <p className="courses-summary">
                نتائج البحث عن «<bdi>{debouncedQ}</bdi>»
              </p>
            )}
            <div className="grid-3 courses-grid">
              {rows.map((c, i) => (
                <CatalogCard key={c.id} c={c} i={i} />
              ))}
            </div>
            {meta && totalPages > 1 && (
              <div
                className="flex items-center justify-between flex-wrap gap-3"
                style={{ marginBlockStart: 'var(--sp-4)' }}
              >
                <span className="text-xs text-muted">
                  الصفحة <bdi>{meta.page}</bdi> من <bdi>{totalPages}</bdi> ·{' '}
                  {countAr(meta.total, COURSE_UNIT)}
                </span>
                <div className="flex gap-2">
                  {/* RTL: "previous" points inline-start-ward = the right
                      chevron (the MessagesInbox pager convention). */}
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="الصفحة السابقة"
                  >
                    <Icon icon={ChevronRight} size={14} /> السابق
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="الصفحة التالية"
                  >
                    التالي <Icon icon={ChevronLeft} size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetSection>
    </PageFrame>
    </div>
  );
}
