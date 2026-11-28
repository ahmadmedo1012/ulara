/**
 * r173a — messages temporal grouping (the r171 VLM deferred note).
 *
 * The inbox rendered one flat 30-row run; the rows now run under
 * day-group headers. Two layers pinned here:
 *   1. PURE — groupMessagesByDay: the اليوم / أمس / هذا الأسبوع /
 *      dated-label boundaries on LOCAL calendar days, the Sunday-start
 *      week (Date#getDay 0 = الأحد), first-appearance group order
 *      (never re-sorted), same-day rows sharing one group, and label
 *      determinism. Clock conventions follow format.test.ts: the
 *      suite must hold in ANY timezone (CI is UTC, developers are
 *      not), so fixtures are built from LOCAL calendar components —
 *      `at(day, h)` — instead of fixed UTC instants (which silently
 *      encode the runner's offset: a 23:59Z fixture is "tomorrow"
 *      at UTC+02:00).
 *   2. RENDER — the shared MessagesInbox inserts the header rows:
 *      aria-hidden (presentational organization — never joins row
 *      semantics), the ROW pins stay byte-identical (same count, same
 *      name/badge queries), pagination still renders, and the CSS
 *      half of the contract (components.css .msg-day-group) is
 *      source-pinned like MetricCard-tone's readStyle pattern.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

import {
  groupMessagesByDay,
  MessagesInbox,
} from '../../src/components/messages/MessagesInbox';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const componentsCss = readFileSync(path.join(STYLES_DIR, 'components.css'), 'utf-8');

/* ── Fixtures: the format.test.ts fixed-clock convention ────────── */

// The fixtures are LOCAL instants: the helper groups by the user's local
// calendar day, so a UTC literal would mean a different day on a UTC+02:00
// runner (and the assertions would only pass under TZ=UTC).
const at = (day: number, h = 0, m = 0, s = 0) => new Date(2026, 2, day, h, m, s).toISOString();

// Wednesday, noon local — a mid-week vantage where "this week" has
// real members on both sides of أمس.
const NOW_WED = new Date(2026, 2, 18, 12, 0, 0);
// Sunday, noon local — the week-seam edge case: the Arabic week began
// TODAY, so this-week holds only today and yesterday (Saturday)
// already took أمس.
const NOW_SUN = new Date(2026, 2, 15, 12, 0, 0);

const row = (id: string, createdAt: string) => ({ id, createdAt });

/* ── 1 · Pure helper ────────────────────────────────────────────── */

describe('groupMessagesByDay — boundaries (r173a)', () => {
  it('اليوم: same local calendar day — midnight inclusive, and future clock-skew lands honestly in today', () => {
    const groups = groupMessagesByDay(
      [row('a', at(18, 0, 0, 0)), row('b', at(18, 23, 59, 59)), row('c', at(18, 13))],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'today', label: 'اليوم' });
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('أمس: the whole calendar day before today (not a rolling 24h window)', () => {
    const groups = groupMessagesByDay(
      [row('a', at(17, 0)), row('b', at(17, 23, 59, 59))],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'yesterday', label: 'أمس' });
  });

  it('هذا الأسبوع: the Sunday-start week\'s remaining days, LUMPED into one group', () => {
    // NOW_WED is Wednesday 2026-03-18 → the week began Sunday 2026-03-15.
    const groups = groupMessagesByDay(
      [row('mon', at(16, 12)), row('sun', at(15, 12))],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'this-week', label: 'هذا الأسبوع' });
    expect(groups[0]!.rows).toHaveLength(2);
  });

  it('older rows: one ar-LY dated group per day (the app\'s formatDateWithYearAr option set)', () => {
    const groups = groupMessagesByDay(
      [row('sat', at(14, 23, 59, 59)), row('old1', at(5, 10)), row('old2', at(5, 8))],
      NOW_WED,
    );
    expect(groups.map((g) => g.label)).toEqual(['14 مارس 2026', '5 مارس 2026']);
    // Same-day rows share ONE header.
    expect(groups[1]!.rows.map((r) => r.id)).toEqual(['old1', 'old2']);
    // Machine keys are stable per-day, never shown.
    expect(groups[1]!.key).toBe('date:2026-03-05');
  });

  it('the week seam on a Sunday: this-week holds only today — yesterday took أمس and older rows fall to dated labels', () => {
    const groups = groupMessagesByDay(
      [row('today', at(15, 8)), row('sat', at(14, 20)), row('fri', at(13, 12))],
      NOW_SUN,
    );
    expect(groups.map((g) => g.label)).toEqual(['اليوم', 'أمس', '13 مارس 2026']);
    expect(groups.some((g) => g.key === 'this-week')).toBe(false);
  });

  it('group order follows FIRST APPEARANCE (server order is never re-sorted)', () => {
    const groups = groupMessagesByDay(
      [row('old', at(5, 10)), row('now', at(18, 10))],
      NOW_WED,
    );
    expect(groups.map((g) => g.label)).toEqual(['5 مارس 2026', 'اليوم']);
  });

  it('empty input → no groups', () => {
    expect(groupMessagesByDay([], NOW_WED)).toEqual([]);
  });

  it('deterministic: the same (rows, now) produce the identical grouping twice', () => {
    const rows = [
      row('a', at(18, 9)),
      row('b', at(17, 9)),
      row('c', at(16, 9)),
      row('d', at(5, 9)),
    ];
    expect(groupMessagesByDay(rows, NOW_WED)).toEqual(groupMessagesByDay(rows, NOW_WED));
  });

  it('the default `now` reads the system clock (the fixed-clock path the page itself uses)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_WED);
    try {
      const groups = groupMessagesByDay([row('a', at(18, 10))]);
      expect(groups[0]).toMatchObject({ key: 'today', label: 'اليوم' });
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ── 2 · Rendering ──────────────────────────────────────────────── */

const mocks = vi.hoisted(() => ({
  messages: {
    pages: {} as Record<number, Array<Record<string, unknown>>>,
    total: 0,
    totalPages: 1,
    unread: 0,
  },
  markAll: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyMessages: (page: number, limit: number) => ({
    data: {
      data: mocks.messages.pages[page] ?? [],
      meta: {
        total: mocks.messages.total,
        page,
        limit,
        totalPages: mocks.messages.totalPages,
        unread: mocks.messages.unread,
      },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMarkAllMessagesRead: () => mocks.markAll,
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const STUDENT: AuthUser = {
  id: 's1',
  email: 'amna@zu.edu.ly',
  firstName: 'آمنة',
  lastName: 'العبيدي',
  role: 'STUDENT',
};

const user = (id: string, firstName: string, lastName: string) => ({
  id, firstName, lastName, avatarColor: null,
});

const message = (id: string, createdAt: string, overrides?: Record<string, unknown>) => ({
  id,
  body: `نص الرسالة ${id}`,
  createdAt,
  fromUser: user('t1', 'سالم', 'الطاهر'),
  toUser: user('s1', 'آمنة', 'العبيدي'),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_WED);
});

afterEach(() => {
  vi.useRealTimers();
  act(() => { useAuthStore.setState({ user: null }); });
});

describe('MessagesInbox — day-group headers in the rendered list (r173a)', () => {
  it('inserts one aria-hidden header per group, between the rows; row pins and pagination stay intact', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message('m1', at(18, 9), { readAt: null }),
          message('m2', at(18, 7), { readAt: at(18, 8) }),
          message('m3', at(17, 10), { readAt: at(17, 11) }),
          message('m4', at(16, 10), { readAt: at(16, 11) }),
          message('m5', at(5, 10), { readAt: at(5, 11) }),
          message('m6', at(5, 8), { readAt: at(5, 9) }),
        ],
      },
      total: 35,
      totalPages: 2,
      unread: 1,
    };
    const { container } = render(
      <MemoryRouter>
        <MessagesInbox title="صندوق الرسائل" subtitle="فرعي" renderCompose={() => null} />
      </MemoryRouter>,
    );

    // The four groups in server order: اليوم / أمس / هذا الأسبوع / date.
    const headers = Array.from(container.querySelectorAll<HTMLElement>('.msg-day-group'));
    expect(headers.map((h) => h.textContent)).toEqual(
      ['اليوم', 'أمس', 'هذا الأسبوع', '5 مارس 2026'],
    );
    // Presentational organization only — every header is aria-hidden,
    // so none of them can join the rows' text/role semantics.
    for (const h of headers) {
      expect(h.getAttribute('aria-hidden')).toBe('true');
    }

    // The ROW contract is byte-identical: same row count, same names,
    // the one unread badge, no reply doors lost.
    expect(container.querySelectorAll('.list-row')).toHaveLength(6);
    expect(screen.getAllByText(/سالم الطاهر/)).toHaveLength(6);
    /* R319 override (c3-S2): the row's unread state rides the §B2 mono
       chip register — UNREAD, square hairline ink — never a color-only
       Badge. Same count contract, same row. */
    expect(screen.getAllByText('غير مقروءة')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /ردّ على رسالة/ })).toHaveLength(6);

    // Pagination still rides its own block below the groups (the
    // bdi digits ride the span's children — textContent sees them).
    const pager = screen.getByText(/الصفحة/).closest('div');
    expect(pager).not.toBeNull();
    expect((pager as HTMLElement).textContent).toContain('الصفحة 1 من 2');
  });

  it('an inbox entirely inside today renders exactly ONE header (no per-row noise)', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message('m1', at(18, 9), { readAt: null }),
          message('m2', at(18, 7, 30), { readAt: null }),
        ],
      },
      total: 2,
      totalPages: 1,
      unread: 2,
    };
    const { container } = render(
      <MemoryRouter>
        <MessagesInbox title="صندوق الرسائل" subtitle="فرعي" renderCompose={() => null} />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('.msg-day-group')).toHaveLength(1);
    expect(container.querySelectorAll('.list-row')).toHaveLength(2);
  });
});

/* ── 3 · The CSS half of the contract (source-pinned) ───────────── */

describe('components.css — the .msg-day-group recipe (r173a)', () => {
  it('consumes the AA label ink and the canonical hairline — no new colors', () => {
    // The label ink: --text-secondary (8.44:1 light / 9.28:1 dark —
    // the same AA step the ProgressBar % readout consumes).
    expect(componentsCss).toMatch(/\.msg-day-group\s*\{[^}]*color:\s*var\(--text-secondary\)/s);
    // The trailing hairline rides --rule (the canonical hairline family).
    expect(componentsCss).toMatch(/\.msg-day-group::after\s*\{[^}]*background:\s*var\(--rule\)/s);
  });
});
