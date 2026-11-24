/**
 * r173a → R359 final re-pin — the courses opening rides the KPI band.
 *
 * The r173a ruling (one light text-muted summary line) is superseded by
 * the sheet grammar: the SAME counts object (total · done · active ·
 * attention) now rides the KpiBand — the reference's dimension-string
 * register (huge mono numerals, [01]–[04] indices, hairline cells).
 *
 * Layers pinned here:
 *   1. SETTLED — the header keeps exactly h1 + eyebrow + one subtitle
 *      line; NO metric tiles render; the band carries the same counted
 *      totals (a zero bucket rides as the honest 0 cell — the band is
 *      a fixed-slot instrument, the pills still own per-bucket counts).
 *   2. PENDING — the band's own honest-empty register («—» cells,
 *      data-empty) + the DataSheet skeleton inside the framed section:
 *      one loading owner.
 *   3. 0% AFFORDANCE INTEGRATION — unchanged (the primitive's own
 *      contract is pinned in Tabs-ProgressBar.test.tsx).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

import StudentCoursesPage from '../../src/pages/student/CoursesPage';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const studentCss = readFileSync(path.join(STYLES_DIR, 'student.css'), 'utf-8');

const mocks = vi.hoisted(() => ({
  enrollments: [] as unknown[],
  enrollmentsPending: false,
  dashboard: { agenda: { assignments: [] } },
  lectures: [] as unknown[],
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyEnrollments: () => ({
    data: mocks.enrollmentsPending ? undefined : mocks.enrollments,
    isPending: mocks.enrollmentsPending,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useStudentDashboard: () => ({
    data: mocks.dashboard,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfferingLectures: () => ({
    data: mocks.lectures,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

/** The GET /enrollments/me row shape (MyEnrollment). */
const enrollment = (id: string, progressPct: number) => ({
  id,
  progressPct,
  offering: {
    id: `off-${id}`,
    course: {
      id: `c-${id}`,
      code: `CS-${id}`,
      name: `مقرّر ${id}`,
      iconEmoji: null,
      themeColor: null,
      credits: 3,
    },
    teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    schedule: [],
  },
});

beforeEach(() => {
  mocks.enrollments = [
    enrollment('a', 100), // مكتملة
    enrollment('b', 62),  // قيد التقدّم
    enrollment('c', 15),  // قيد التقدّم + بحاجة إلى اهتمام
  ];
  mocks.enrollmentsPending = false;
  mocks.dashboard = { agenda: { assignments: [] } };
  mocks.lectures = [];
});

function renderPage() {
  return render(<MemoryRouter><StudentCoursesPage /></MemoryRouter>);
}

/* ── 1 · Settled: the light header rhythm ───────────────────────── */

describe('StudentCoursesPage — the light single-line summary (r173a)', () => {
  it('renders NO metric tiles — the four-MetricCard KPI strip is gone', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.metric')).toHaveLength(0);
    expect(container.querySelectorAll('.grid-4')).toHaveLength(0);
  });

  it('the header keeps exactly h1 + eyebrow + one subtitle line (R359 re-pin: the patterns PageHeader)', () => {
    renderPage();
    const header = document.querySelector('header.pf-page-header') as HTMLElement;
    expect(header).not.toBeNull();
    expect(within(header).getByRole('heading', { level: 1, name: 'مقرّراتي الدراسية' }));
    expect(header.textContent).toContain('جميع المقرّرات التي سجّلت فيها هذا الفصل');
    // The header block carries exactly the eyebrow + the description —
    // no stats, no chips.
    expect(header.querySelectorAll('p')).toHaveLength(2);
    expect(header.querySelector('.pf-eyebrow')).not.toBeNull();
  });

  it('the SAME counts ride the KPI band: total + every bucket as fixed-slot numerals', () => {
    const { container } = renderPage();
    // 3 enrollments → total 3; done 1, active 2, attention 1 — the
    // band's four cells carry the counts object verbatim.
    const values = Array.from(container.querySelectorAll('.sg-kpi-value')).map(
      (el) => el.textContent,
    );
    expect(values).toEqual(['3', '1', '2', '1']);
    const labels = Array.from(container.querySelectorAll('.sg-kpi-label')).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual([
      'مقرّرات مسجَّلة هذا الفصل',
      'مكتملة',
      'قيد التقدّم',
      'بحاجة إلى اهتمام',
    ]);
  });

  it('a zero bucket rides as the honest 0 cell (fixed-slot instrument; pills own the phrasing)', () => {
    mocks.enrollments = [enrollment('a', 100), enrollment('b', 62)];
    const { container } = renderPage();
    // attention = 0 → the fourth cell reads the honest 0 (the band is
    // a fixed-slot instrument; hiding slots would lie about the sheet).
    const values = Array.from(container.querySelectorAll('.sg-kpi-value')).map(
      (el) => el.textContent,
    );
    expect(values).toEqual(['2', '1', '1', '0']);
  });

  it('the filter pills keep their per-bucket counts — data logic untouched', () => {
    renderPage();
    const pills = screen.getByRole('group', { name: 'تصفية المقرّرات حسب الحالة' });
    expect(within(pills).getByText('الكل')).toBeInTheDocument();
    // The pills' own counts, in FILTERS order (all/active/done/attention):
    // 3 / 2 / 1 / 1 — the same counts object the old KPI strip read.
    const pillCounts = Array.from(pills.querySelectorAll('.courses-filter-count')).map(
      (el) => el.textContent,
    );
    expect(pillCounts).toEqual(['3', '2', '1', '1']);
  });
});

/* ── 2 · Pending: the summary-line mirror ───────────────────────── */

describe('StudentCoursesPage — pending mirror (R359 re-pin)', () => {
  it('the band\'s honest-empty cells + the DataSheet skeleton; zero metric tiles, zero spinners', () => {
    mocks.enrollmentsPending = true;
    const { container } = renderPage();

    // The band is its own loading mirror: every cell renders the
    // honest «—» register (data-empty), never a fabricated 0.
    const emptyCells = container.querySelectorAll('.sg-kpi[data-empty="true"]');
    expect(emptyCells.length).toBe(4);
    for (const cell of Array.from(emptyCells)) {
      expect(cell.querySelector('.sg-kpi-value')?.textContent).toBe('—');
    }

    // The DataSheet skeleton owns the list area inside the framed
    // section (aria-busy on the sheet wrap).
    expect(container.querySelector('.sg-sheet-wrap[aria-busy="true"]')).not.toBeNull();
    // The one-loading-owner rule.
    expect(container.querySelectorAll('.metric')).toHaveLength(0);
    expect(container.querySelectorAll('.spinner')).toHaveLength(0);
  });
});

/* ── 3 · The 0% affordance on a real course card ────────────────── */

describe('StudentCoursesPage — a 0% course shows the progress affordance (r173a)', () => {
  it('the zero card\'s track carries the starting-edge marker; the 62% card\'s does not', () => {
    mocks.enrollments = [enrollment('zero', 0), enrollment('b', 62)];
    const { container } = renderPage();

    /* R319 override (c3-S1): the row's progress rides the §B2 CourseBar —
       the hairline track with an ink fill and a taller END-TICK at the
       exact value (the r173a zero-mark affordance is now the tick AT 0:
       an honest empty track + a `0%` mono readout). The role is meter
       (the dashboard's instrument contract); the honest values pin the
       same two rows as before. */
    const bars = Array.from(container.querySelectorAll('.r319s-coursebar'));
    expect(bars).toHaveLength(2);
    expect(bars[0]!.getAttribute('role')).toBe('meter');
    expect(bars[0]!.getAttribute('aria-valuenow')).toBe('0');
    expect(bars[1]!.getAttribute('aria-valuenow')).toBe('62');
    // The mono % readouts — the row's data voice (one per bar).
    const pcts = bars.map((b) => b.querySelector('.r319s-coursebar-pct')?.textContent);
    expect(pcts).toEqual(['0%', '62%']);
    // The end-tick sits at the exact value on both rows (0% and 62%).
    const ticks = bars.map((b) => b.querySelector<HTMLElement>('.r319s-coursebar-tick')?.style.insetInlineStart);
    expect(ticks).toEqual(['0%', '62%']);
  });
});

/* ── 4 · CSS source pin ─────────────────────────────────────────── */

describe('student.css — the .courses-summary recipe (r173a)', () => {
  it('consumes the AA muted ink for the line (no new colors)', () => {
    expect(studentCss).toMatch(/\.courses-summary\s*\{[^}]*color:\s*var\(--text-muted\)/s);
    expect(studentCss).toMatch(/\.courses-summary bdi\s*\{[^}]*font-family:\s*var\(--font-mono\)/s);
  });
});
