import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronLeft, ChevronRight, X, AlertCircle, Download } from 'lucide-react';
/* r252 (Phase B) → R359 (W2-e): the directory speaks the sheet
 * grammar — the KpiBand strip (honest numerals, the «الفئة الأكبر»
 * honesty claim riding the delta line) and the roster rides the
 * framed SheetSection. The RowList expansion stays: three pin files
 * (confirm-verbs / role-picker / institution-column) own the row's
 * inline-expansion anatomy — the table IS the actions surface. */
import { PageFrame, PageHeader as PatternsPageHeader, FilterBar, RowList, RowItem } from '../../components/patterns';
import { KpiBand, SheetSection } from '../../components/patterns';
import { Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { apiErrorMessage } from '../../hooks/useResources';
import { downloadUsersExport, type ExportRole } from '../../lib/api';
import { useOwnerStats, useOwnerUsers, useChangeUserRole, useToggleUserStatus } from '../../hooks/useOwner';
import { formatDate, formatNum } from '../../utils/numbers';
// R320 §B (c1-RENAME): the directory's role chips/pickers consume the ONE
// shared role-label source (lib/roleLabels.ts + backend twin) — ADMIN is
// «إدارة المؤسسة» (r352 §D7); the other roles keep their established wording.
import { ROLE_LABELS as SHARED_ROLE_LABELS } from '../../lib/roleLabels';

/**
 * Owner user management — the accounts directory.
 *
 * Wave 6-b (audit 0-e P1-24/P1-25 + craft sweep):
 *  - role filter is SERVER-side (the API paginates within the role) — the
 *    old client-side filter hid rows on the current page only
 *  - pagination rebuilt on the .table-pagination system: windowed page
 *    numbers, RTL-correct chevrons (prev points right in RTL), honest
 *    "page X of Y · N users" line, aria-current, disabled edge states
 *  - r252 (Phase B): the 7-column table becomes RowList rows — identity
 *    + role/status at a glance, memberships in the meta line, and the
 *    actions (role picker + status toggle + joined date) behind each
 *    row's inline expansion. Same server contract, same confirm flow.
 */

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarInitials: string;
  avatarColor: string | null;
  createdAt: string;
  /** r183-B5: the ACTIVE institution memberships (A9 wave-A P2 — the
   *  directory's institution scope). Empty = the honest «بلا مؤسسة». */
  memberships: OwnerUserMembership[];
}

interface OwnerUserMembership {
  institution: { id: string; name: string; slug: string; status: 'ACTIVE' | 'SUSPENDED' };
}

/* R320 §B: the shared map verbatim (lib/roleLabels.ts + backend twin) —
   ADMIN «إداري» → «إدارة المؤسسة» (r352 §D7); the person-noun lineage (17-a2 /
   15-j P1-8) is preserved for the other roles. */
const ROLE_LABELS: Record<string, string> = { ...SHARED_ROLE_LABELS };

const ROLE_COLORS: Record<string, 'brand' | 'green' | 'purple' | 'gold' | 'amber'> = {
  STUDENT: 'brand',
  TEACHER: 'green',
  ADMIN: 'purple',
  QUALITY: 'gold',
  OWNER: 'amber',
};

/** r154e: roles the owner may assign from this console. OWNER is excluded —
 *  the backend blocks owner-role changes here (owner.routes.ts guards the
 *  last-active owner), and creating new owners is not this UI's purpose. */
const ELIGIBLE_ROLES: readonly string[] = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY'];

/** Pages rendered either side of the current one before an ellipsis gap. */
const PAGE_NEIGHBORS = 2;

/**
 * Bounded page list: always 1 and the last page, a window around the
 * current page, and 'gap' markers where numbers were elided — a
 * 200-page result renders ≤ 2·PAGE_NEIGHBORS + 4 buttons, never 200
 * (audit 0-e P1-25). Exported pure — pinned by
 * tests/unit/OwnerUsersPage-pagination.test.ts (audit 11-f P2-14).
 */
export function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  const include = new Set<number>([1, totalPages]);
  const from = Math.max(1, page - PAGE_NEIGHBORS);
  const to = Math.min(totalPages, page + PAGE_NEIGHBORS);
  for (let p = from; p <= to; p++) include.add(p);
  const out: Array<number | 'gap'> = [];
  let prev = 0;
  for (const p of [...include].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/** Proper Arabic counted plural for the users total. */
function usersCountLabel(n: number): string {
  if (n === 0) return 'لا مستخدمين';
  if (n === 1) return 'مستخدم واحد';
  if (n === 2) return 'مستخدمان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} مستخدمين`;
  return `${formatNum(n)} مستخدماً`;
}

/** A pending mutation targets at most one row — only that row waits. */
type Attempt = { kind: 'role'; user: UserRow; role: string } | { kind: 'status'; user: UserRow };

export function OwnerUsersPage() {
  const stats = useOwnerStats();
  const changeRole = useChangeUserRole();
  const toggleStatus = useToggleUserStatus();

  const statData = stats.data;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  /* r360 F4 — the export verb (GET /users/export, r359 A4 backend):
   * honors the live role filter (ALL exports the whole platform
   * register the server's governance scope allows). The download is
   * the governance-document idiom (object URL + anchor + late
   * revoke); failures land in the page's own inline error register. */
  const [exportBusy, setExportBusy] = useState(false);
  const onExport = async () => {
    setExportBusy(true);
    try {
      const role: ExportRole | undefined = roleFilter === 'ALL' ? undefined : (roleFilter as ExportRole);
      const { blob, filename, rows } = await downloadUsersExport({ role, format: 'csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      if (rows != null && rows === 0) {
        setActionError({ title: 'الملف فارغ', detail: 'لا حسابات في هذا النطاق — جرّب تصدير فئة أخرى.' });
      }
    } catch (e) {
      setActionError({ title: 'تعذّر التصدير', detail: apiErrorMessage(e, 'حاول مرة أخرى بعد لحظات.') });
    } finally {
      setExportBusy(false);
    }
  };
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<{ title: string; detail: string } | null>(null);
  /** Last attempted row action — powers the inline retry (5-b pattern). */
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);

  // Debounce the search input (250–300ms of idle typing) so the users
  // query fires once typing pauses instead of on every keystroke —
  // mirrors the LibraryPage pattern. The mount-time run carries an
  // unchanged term and must not reset pagination (a page opened inside
  // the first 300ms would silently bounce back to page 1).
  const appliedSearch = useRef(debouncedSearch);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim();
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setDebouncedSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const ownerUsers = useOwnerUsers({
    page,
    limit: 20,
    q: debouncedSearch || undefined,
    // Server-side role filter (audit 0-e P1-24): the API paginates within
    // the role, so pill counts and pagination meta always agree.
    role: roleFilter === 'ALL' ? undefined : roleFilter,
  });
  const users: UserRow[] = (ownerUsers.data?.data ?? []).map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    avatarInitials: u.avatarInitials ?? u.firstName.charAt(0) + u.lastName.charAt(0),
    // null color → the .avatar primitive's own copper-pastel default
    // (token-clean; was a hardcoded #3b82f6, audit 0-e P2-35)
    avatarColor: u.avatarColor ?? null,
    createdAt: u.createdAt,
    memberships: u.memberships ?? [],
  }));

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    /* 6A10-6: per-action confirm verb. Optional so the ConfirmDialog
     * keeps its «تأكيد» default for the 16 other consumers; the three
     * user actions below always pass their own verb so the button
     * names WHAT it does, not a generic "yes". */
    title: string; message: string; danger: boolean; confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });
  /** r154e: the pending role change (select → confirm). While set, the row's
   *  select shows the pending role; on cancel it reverts to the user's real
   *  role. One pending change at a time — the confirm dialog is modal. */
  const [pendingRole, setPendingRole] = useState<{ user: UserRow; role: string } | null>(null);

  /** Runs a row action; failures surface inline with a retry (never a
   *  silent unhandled rejection). */
  const runAttempt = async (attempt: Attempt) => {
    setLastAttempt(attempt);
    const name = `${attempt.user.firstName} ${attempt.user.lastName}`;
    try {
      if (attempt.kind === 'role') {
        await changeRole.mutateAsync({ userId: attempt.user.id, role: attempt.role });
      } else {
        await toggleStatus.mutateAsync({ userId: attempt.user.id, isActive: !attempt.user.isActive });
      }
      setActionError(null);
    } catch (e) {
      setActionError({
        title: attempt.kind === 'role'
          ? `تعذَّر تغيير دور «${name}»`
          : `تعذَّر تحديث حالة حساب «${name}»`,
        detail: apiErrorMessage(e, 'حاول مرة أخرى بعد لحظات.'),
      });
    }
  };

  /** r154e: role picker — replaces the binary STUDENT↔TEACHER toggle. The
   *  owner picks any eligible role from the select; promotions to
   *  ADMIN/QUALITY and any demotion from those roles are flagged dangerous
   *  (red confirm) because they change the user's governance capabilities.
   *  r183-B5 (A9 P2 acceptance): the confirm names the user's institution(s)
   *  — scope ambiguity was the finding's whole point. */
  const institutionsLabel = (user: UserRow): string | null =>
    user.memberships.length > 0
      ? user.memberships.map((m) => m.institution.name).join('، ')
      : null;
  const handleRoleSelect = (user: UserRow, role: string) => {
    if (role === user.role) return;
    setPendingRole({ user, role });
    const isSensitive =
      role === 'ADMIN' || role === 'QUALITY' ||
      user.role === 'ADMIN' || user.role === 'QUALITY';
    const insts = institutionsLabel(user);
    setConfirmConfig({
      title: 'تغيير الدور',
      confirmLabel: 'تغيير الدور',
      message: `هل تريد تغيير دور «${user.firstName} ${user.lastName}» من ${ROLE_LABELS[user.role] ?? user.role} إلى ${ROLE_LABELS[role]}؟${insts ? ` عضويته النشطة: ${insts}.` : ' لا عضوية مؤسسة نشطة لهذا الحساب.'}`,
      danger: isSensitive,
      onConfirm: async () => {
        await runAttempt({ kind: 'role', user, role });
        setConfirmOpen(false);
        setPendingRole(null);
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleStatus = (user: UserRow) => {
    setConfirmConfig({
      title: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      confirmLabel: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      message: user.isActive
        ? `هل تريد تعطيل حساب «${user.firstName} ${user.lastName}»؟ لن يتمكّن من الدخول إلى المنصّة.`
        : `هل تريد إعادة تفعيل حساب «${user.firstName} ${user.lastName}»؟ سيتمكّن من الدخول مجدداً.`,
      danger: user.isActive,
      onConfirm: async () => {
        await runAttempt({ kind: 'status', user });
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const filterItems: Array<{ value: RoleFilter; label: string }> = [
    { value: 'ALL', label: 'الكل' },
    { value: 'STUDENT', label: 'طلاب' },
    { value: 'TEACHER', label: 'أساتذة' },
    { value: 'ADMIN', label: 'مسجلون عامّون' },
    { value: 'QUALITY', label: 'أخصائيو جودة' },
  ];

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters = roleFilter !== 'ALL' || debouncedSearch !== '';

  const meta = ownerUsers.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const rowBusy = (user: UserRow) =>
    (changeRole.isPending && changeRole.variables?.userId === user.id) ||
    (toggleStatus.isPending && toggleStatus.variables?.userId === user.id);
  const mutationBusy = changeRole.isPending || toggleStatus.isPending;

  const kpiUnknown = !statData;

  /* r299 (honesty): «أكبر شريحة» used to render unconditionally — the
   * hint asserted students are the largest segment without comparing
   * the counts (a teachers-heavy platform would print a false claim).
   * Now the claim only prints where it is true, the dashboard's
   * topSegment idiom (r253) ported to the facts this page already
   * fetched; otherwise the hint stays a neutral noun. */
  const segments = statData
    ? [
        { key: 'students', n: statData.students },
        { key: 'teachers', n: statData.teachers },
        { key: 'staff', n: (statData.admins ?? 0) + (statData.quality ?? 0) },
      ]
    : [];
  const topSegmentKey = segments.length > 0
    ? segments.reduce((a, b) => (b.n > a.n ? b : a)).key
    : null;

  return (
    /* r305-A8 «ds»: the scoped sheet keys every rule off the .r305ao
       page-root marker (PageFrame owns rhythm/width and takes no
       className, so the grammar rides a root wrapper). */
    <div className="r305ao">
      <PageFrame width="default">
        <PatternsPageHeader
          title="إدارة المستخدمين"
          /* R359 (W2-e): the owner console's family eyebrow. */
          eyebrow="مالك المنصّة"
          /* r351 A2 (Q3): header description retired — the directory explains itself. */
          breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'المستخدمون' }]}
          /* R341 D11: the [03] nav-order gutter numeral (OWNER_NAV
           * register — the D10 quality precedent). */
          /* D11 (D8/D10 header-CTA precedent): the directory's two
           * sibling surfaces — every role/status change lands in the
           * activity log (primary) and the governance metrics track
           * them (ghost). Navigation-only, no write affordance is
           * invented: role changes stay inline per row. */
          actions={(
            <>
              <Link to="/owner/activity" className="btn accent sm">سجلّ النشاط</Link>
              <Link to="/owner/governance" className="btn ghost sm">الحوكمة</Link>
              {/* r360 F4 — the export verb (the header's CTA register:
                  navigation-only stays the law for LINKS; this is the
                  one download action, honouring the live role filter). */}
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => void onExport()}
                disabled={exportBusy}
                data-loading={exportBusy ? 'true' : undefined}
                title="ملف CSV بترميز يفتح العربية صحيحة في Excel"
              >
                <Icon icon={Download} size={14} aria-hidden />
                تصدير CSV{roleFilter !== 'ALL' ? ` — ${filterItems.find((i) => i.value === roleFilter)?.label ?? ''}` : ''}
              </button>
            </>
          )}
        />

        {/* R359 (W2-e) — the KPI band: every numeral derives from the
            live /owner/stats payload; the honest-empty register ('—')
            covers pending AND error (never a fake zero). The r299
            «الفئة الأكبر» honesty claim rides the delta line exactly
            once — only for the segment that IS the largest. */}
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'TOTAL',
              label: 'إجمالي المستخدمين',
              value: statData?.totalUsers ?? 0,
              empty: kpiUnknown,
            },
            {
              index: '02',
              caption: 'STUDENTS',
              label: 'الطلاب',
              value: statData?.students ?? 0,
              empty: kpiUnknown,
              delta: topSegmentKey === 'students' ? 'الفئة الأكبر' : 'حسابات الطلاب',
            },
            {
              index: '03',
              caption: 'TEACHERS',
              label: 'الأساتذة',
              value: statData?.teachers ?? 0,
              empty: kpiUnknown,
              delta: topSegmentKey === 'teachers' ? 'الفئة الأكبر' : 'هيئة التدريس',
            },
            {
              index: '04',
              caption: 'STAFF',
              label: 'مسجلون عامّون وجودة',
              value: (statData?.admins ?? 0) + (statData?.quality ?? 0),
              empty: kpiUnknown,
              delta: topSegmentKey === 'staff' ? 'الفئة الأكبر' : 'إدارة ومتابعة',
            },
          ]}
        />

        {/* r252: search + role pills ride one FilterBar rail. */}
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'ابحث بالاسم أو البريد الإلكتروني…',
          }}
          filters={(
            <div className="owner-filter-pills" role="group" aria-label="تصفية حسب الدور">
              {filterItems.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`pill${roleFilter === f.value ? ' on' : ''}`}
                  aria-pressed={roleFilter === f.value}
                  onClick={() => { setRoleFilter(f.value); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        />

        {/* R359 (W2-e) — the roster sheet: the hairline frame +
            registration crosses replace the Card; the rows ARE the
            body (pad=none), the inline-error rail and the pagination
            ride the .sg-pad-in inset register. The RowList expansion
            anatomy is pinned (confirm-verbs / role-picker /
            institution-column) — the roster keeps it verbatim. */}
        <SheetSection index="01" caption="ACCOUNTS" title="دليل الحسابات" pad="none">
          {actionError && (
            <div className="sg-pad-in">
            <AlertRow
              color="red"
              icon={AlertCircle}
              title={actionError.title}
              description={actionError.detail}
              actions={
                <>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => lastAttempt && void runAttempt(lastAttempt)}
                    disabled={mutationBusy || !lastAttempt}
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setActionError(null)}
                    disabled={mutationBusy}
                  >
                    إغلاق
                  </button>
                </>
              }
            />
            </div>
          )}

          {ownerUsers.isPending ? (
            <ListSkeleton rows={6} />
          ) : ownerUsers.isError ? (
            <ErrorState error={ownerUsers.error} onRetry={() => ownerUsers.refetch()} />
          ) : users.length === 0 ? (
            /* r351 A2 (Q3): empty-state prose retired — the title + reset
             * action suffice. */
            <EmptyState
              icon={Users}
              illustration="empty-list"
              title={hasActiveFilters ? 'لا نتائج مطابقة' : 'لا يوجد مستخدمون بعد'}
              description=""
              action={hasActiveFilters ? (
                <button type="button" className="btn ghost sm" onClick={clearFilters}>
                  <Icon icon={X} size={13} />
                  مسح البحث والفلاتر
                </button>
              ) : undefined}
            />
          ) : (
            <>
              <RowList aria-label="قائمة المستخدمين">
                {users.map((user) => {
                  const joined = new Date(user.createdAt);
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  const isRecent = joined > sevenDaysAgo;
                  return (
                    <RowItem
                      key={user.id}
                      leading={<UserAvatar initials={user.avatarInitials} color={user.avatarColor ?? undefined} size={36} />}
                      title={`${user.firstName} ${user.lastName}`}
                      meta={(
                        <>
                          <bdi className="owner-num" dir="ltr">{user.email}</bdi>
                          {' · '}
                          {user.memberships.length === 0 ? (
                            <span className="text-xs text-subtle">بلا مؤسسة</span>
                          ) : (
                            /* r299: the utility-class + inline-style conflict
                               died — one owner-owned class owns the chips'
                                wrapping anatomy (owner.css). */
                            <span className="owner-membership-chips">
                              {user.memberships.map((m) => (
                                <Badge
                                  key={m.institution.id}
                                  /* r299: a SUSPENDED institution reads red on
                                     every other surface (the institutions
                                     list, the detail header) — the chip used
                                     to fall back to the neutral badge while
                                     its own text said « · معلّقة». */
                                  color={m.institution.status === 'ACTIVE' ? 'brand' : 'red'}
                                >
                                  {m.institution.name}
                                  {m.institution.status === 'SUSPENDED' ? ' · معلّقة' : ''}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </>
                      )}
                      trailing={(
                        <>
                          <Badge color={ROLE_COLORS[user.role]}>
                            {ROLE_LABELS[user.role] ?? <bdi>{user.role}</bdi>}
                          </Badge>
                          <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'نشط' : 'معطّل'}</Badge>
                        </>
                      )}
                      expandLabel={`إجراءات ${user.firstName} ${user.lastName}`}
                    >
                      {/* The expansion body — the row's actions (r252): the
                          role picker, the status toggle, and the joined
                          date with its recent dot. Same confirm flow as
                          the table era; nothing fires without its dialog. */}
                      <div className="owner-row-actions">
                        <span className="owner-joined" title={formatDate(joined, { dateStyle: 'full' })}>
                          {isRecent && (
                            <>
                              {/* r299: the recent-join marker is a quiet static
                                  dot, NOT the pulsing health-grammar dot —
                                  green + heartbeat means "system healthy" and
                                  pulled the eye with a status semantic a join
                                  date never carried. */}
                              <span className="owner-joined-dot" aria-hidden />
                              <span className="visually-hidden">انضم خلال الأسبوع الماضي — </span>
                            </>
                          )}
                          انضم {formatDate(joined, { dateStyle: 'medium' })}
                        </span>
                        {user.role === 'OWNER' ? (
                          <span className="text-xs text-subtle" title="دور المالك لا يُغيَّر من هذه الواجهة">
                            {ROLE_LABELS.OWNER}
                          </span>
                        ) : (
                          <select
                            className="input"
                            /* r305-A8: raw-px floor → ladder token (the picker
                               keeps its auto inline size in the flex row). */
                            style={{ width: 'auto', minWidth: 'var(--sp-13)' }}
                            value={pendingRole?.user.id === user.id ? pendingRole.role : user.role}
                            onChange={(e) => handleRoleSelect(user, e.target.value)}
                            disabled={rowBusy(user)}
                            aria-label={`دور ${user.firstName} ${user.lastName}`}
                          >
                            {ELIGIBLE_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        )}
                        {/* r305-A8 (user/role/permission audit): the status
                            verb stands apart from routine row actions in the
                            DESTRUCTIVE direction only — suspending an active
                            account is the high-impact flow (the confirm dialog
                            carries its danger treatment; reactivation stays a
                            quiet outline verb). The ConfirmDialog verb logic is
                            untouched (OwnerUsersPage-confirm-verbs pins it). */}
                        <button
                          type="button"
                          className={`btn ghost sm${user.isActive ? ' r305ao-btn-danger' : ''}`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={rowBusy(user)}
                        >
                          {user.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </RowItem>
                  );
                })}
              </RowList>

              {/* Server-side pagination — driven by API meta; bounded page
                  window + RTL-correct chevrons (prev points right in RTL).
                  r164-i (table-coherence): the footer renders whenever rows
                  exist, single page included. */}
              {meta && users.length > 0 && (
                <div className="sg-pad-in">
                <div className="table-pagination">
                  <span>
                    الصفحة {page} من {totalPages} · {usersCountLabel(meta.total)}
                  </span>
                  <div className="table-pagination-actions">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="الصفحة السابقة"
                    >
                      <Icon icon={ChevronRight} size={14} aria-hidden />
                      السابق
                    </button>
                    {pageList(page, totalPages).map((item, i) =>
                      item === 'gap' ? (
                        <span key={`gap-${i}`} className="owner-page-gap" aria-hidden>…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          aria-current={item === page ? 'page' : undefined}
                          aria-label={`الصفحة ${item}`}
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="الصفحة التالية"
                    >
                      التالي
                      <Icon icon={ChevronLeft} size={14} aria-hidden />
                    </button>
                  </div>
                </div>
                </div>
              )}
            </>
          )}
        </SheetSection>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          danger={confirmConfig.danger}
          confirmLabel={confirmConfig.confirmLabel}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => { setConfirmOpen(false); setPendingRole(null); }}
        />
      </PageFrame>
    </div>
  );
}
