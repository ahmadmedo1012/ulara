import { useMemo, useState, useRef } from 'react';
import { Menu, MessageSquarePlus, LogOut, User as UserIcon, Sun, Moon, Search, Building2, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { UserAvatar } from '../primitives';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { Dropdown, DropdownItem, DropdownSeparator } from '../overlays';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore, type MembershipInfo, type AppRole } from '../../stores/auth.store';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { useLogout, useMe, useSelectInstitution } from '../../hooks/useAuth';
import { useMyProfile, apiErrorMessage } from '../../hooks/useResources';
import { useStudentDashboard } from '../../hooks/resources/student';
import { countAr } from '../../lib/format';
import { NAV_BY_ROLE, ROLE_LABELS, displayRoleLabel } from '../../lib/nav';
// R320 §B: role display names come from the one source of truth
// (lib/roleLabels.ts, shared with the backend twin).
import { roleLabel } from '../../lib/roleLabels';
import { toast } from '../../lib/toast';
// r351 A2 (Q1f): the feedback sheet opens from the user menu — the
// floating FAB is retired.
import { openFeedback } from '../feedback/feedbackSeat';

interface TopbarProps {
  scrolled?: boolean;
  /** Opens the ⌘K command palette — the mobile-band search surface
   *  (4-A2 P1-3): the search pill is display:none ≤1200px, so the
   *  topbar's search icon button and the "/" chord both route here. */
  onOpenCommandPalette?: () => void;
}

/** The quiet group-context kicker (R305-A4 the reference pass): the section
 *  label the active route lives under in the sidebar, derived from the
 *  SAME nav.ts data the sidebar renders — nav and title can never
 *  drift. Truthful by construction: it renders only when the current
 *  pathname is EXACTLY one of the role's nav destinations; detail
 *  pages, redirects and unknown paths render no kicker rather than a
 *  guess. The `.topbar-kicker` class is new markup vocabulary (no CSS
 *  removed) — r305-shell.css owns its quiet xxs chrome voice. */
function useNavGroupKicker(role: AppRole | undefined, pathname: string): string | null {
  return useMemo(() => {
    if (!role) return null;
    for (const group of NAV_BY_ROLE[role]) {
      for (const item of group.items) {
        if (item.to === pathname) return group.label;
      }
    }
    return null;
  }, [role, pathname]);
}

/** Student scope chip — the college name next to the page title.
 *
 * Lives in its own component so `useMyProfile` (GET /me/profile)
 * only fires for the one role that renders the chip (11-e P1-4):
 * the query used to run for every role even though TEACHER/ADMIN/
 * QUALITY/OWNER never read it — four roles paying a likely-403
 * request per shell mount. The hook itself is ungated
 * (hooks/useResources.ts is 12-9's), so the gate is structural. */
function StudentScopeChip() {
  const profileQ = useMyProfile();
  const name = profileQ.data?.student?.faculty?.name ?? null;
  if (!name) return null;
  return (
    <span className="topbar-scope" title={`الكلّيّة: ${name}`}>
      {name}
    </span>
  );
}

/** r369 slice 02: the collector chip — the student's real «نقاط إتقان»
 *  total in the topbar, from useStudentDashboard (GET /me/dashboard,
 *  kpi.totalXp — the same query the dashboard and the gamification
 *  page already read; no new endpoint, the leaderboard-ranked scale).
 *  Honest by construction: on error the chip hides rather than guess,
 *  a zero balance renders «٠ نقطة إتقان» plainly, and the chip links
 *  to /student/gamification where the number is explained. A streak
 *  row was considered and rejected — no streak data exists anywhere
 *  in the app, so faking one would lie. Rendered only for STUDENT
 *  (the structural gate — same precedent as StudentScopeChip above);
 *  the r369-shell.css sheet hides it below 921px. */
function StudentXpChip() {
  const dash = useStudentDashboard();
  const navigate = useNavigate();
  if (dash.isError) return null;
  const totalXp = dash.data?.kpi?.totalXp;
  if (totalXp === undefined) {
    return (
      <span className="topbar-xp topbar-xp-loading" aria-hidden="true">
        <Icon icon={Sparkles} size={14} />
        …
      </span>
    );
  }
  const label = countAr(totalXp, ['نقطة إتقان واحدة', 'نقطتا إتقان', 'نقاط إتقان', 'نقطة إتقان']);
  return (
    <button
      type="button"
      className="topbar-xp"
      onClick={() => navigate('/student/gamification')}
      title={`رصيدك: ${label} — افتح صفحة الإنجازات`}
      aria-label={`${label} — افتح صفحة الإنجازات`}
    >
      <Icon icon={Sparkles} size={14} />
      {label}
    </button>
  );
}

/** r178 (multi-institution): the institution context chip — the
 *  current institution («مساحة عمل أُلارا التجريبية») rendered in the topbar so the
 *  visitor always knows which institution's context the token carries.
 *  Single-membership users get the passive `.topbar-scope` pill (the
 *  same class the student faculty chip and admin scope chip already
 *  use — tokens only, zero new CSS). Multi-membership users get a
 *  dropdown switcher instead: choosing an entry POSTs
 *  /auth/select-institution, the store's context + token update, and
 *  the mutation invalidates every cached query — the mounted ones
 *  (including /auth/me) refetch in place under the new context, which
 *  is the in-place refresh the r178 contract prefers over a reload. */
function InstitutionChip() {
  const user = useAuthStore((s) => s.user);
  const currentInstitution = useAuthStore((s) => s.currentInstitution);
  const memberships = useAuthStore((s) => s.memberships);
  const selectInstitution = useSelectInstitution();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Only authenticated sessions render the chip. Three shapes:
   *  - zero memberships (platform OWNER) → no chip;
   *  - one membership → the passive pill when the context is set (the
   *    server auto-selects the single membership at every mint, so a
   *    context-less single membership is a transient refresh race —
   *    nothing to render yet);
   *  - MULTIPLE memberships → the switcher, ALSO when the context is
   *    null: a refresh re-resolves multi-membership sessions to no
   *    context (Agent B's contract), and the switcher is then the ONLY
   *    in-shell path to re-select — without it the session would sit
   *    context-less with every institution route 403ing. */
  if (!user || memberships.length === 0) return null;
  if (memberships.length <= 1 && !currentInstitution) return null;

  const contextLost = memberships.length > 1 && !currentInstitution;

  const switchMembership = (membership: MembershipInfo) => {
    setMenuOpen(false);
    selectInstitution.mutate(
      { institutionId: membership.institutionId },
      {
        onSuccess: () => {
          toast.success(`أنت الآن ضمن «${membership.name}».`, { title: 'تمّ تبديل المؤسسة' });
        },
        onError: (error) => {
          // D17-3: the backend's Arabic message (403 INSTITUTION_
          // CONTEXT_INVALID «عضوية المؤسسة غير نشطة أو غير صالحة»…).
          toast.error(
            apiErrorMessage(error, 'تعذّر تبديل المؤسسة — حاول مجدداً.'),
            { title: 'تعذّر التبديل' },
          );
        },
      },
    );
  };

  if (memberships.length <= 1) {
    return (
      <span className="topbar-scope" title={`المؤسسة الحالية: ${currentInstitution!.name}`}>
        <Icon icon={Building2} size={13} />
        {currentInstitution!.name}
      </span>
    );
  }

  return (
    <>
      {/* The trigger is a quiet ghost button (the shell's existing
          chrome vocabulary — border-shift hover, no lift, no new
          colors); ≤920px the name folds away and the icon + aria-label
          keep the control named. Keyboard reach: natural Tab stop, the
          Dropdown owns arrows/Esc/focus-return once open. */}
      <button
        type="button"
        ref={triggerRef}
        className="btn ghost sm topbar-inst-trigger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={contextLost ? 'اختيار المؤسسة' : 'المؤسسة الحالية'}
        title={
          contextLost
            ? 'اختر المؤسسة التي ستعمل ضمنها في هذه الجلسة'
            : `المؤسسة الحالية: ${currentInstitution!.name}`
        }
        /* Truthful-state hook for the shell CSS (r305-shell.css): the
           context-less multi-membership session («اختر مؤسستك») may
           carry the unread-urgency signal, the settled chip must not. */
        data-context-lost={contextLost ? 'true' : undefined}
      >
        <Icon icon={Building2} size={14} />
        <span className="hide-on-mobile">
          {contextLost ? 'اختر مؤسستك' : currentInstitution!.name}
        </span>
      </button>
      <Dropdown
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={triggerRef}
        placement="end"
        ariaLabel={contextLost ? 'اختيار المؤسسة' : 'تبديل المؤسسة'}
      >
        {memberships.map((membership) => {
          const isCurrent =
            !contextLost && membership.institutionId === currentInstitution!.id;
          return (
            <DropdownItem
              key={membership.institutionId}
              disabled={isCurrent || selectInstitution.isPending}
              onSelect={() => switchMembership(membership)}
            >
              <Icon icon={Building2} size={14} />
              <span className="topbar-inst-name">{membership.name}</span>
              <span className="topbar-inst-role">{ROLE_LABELS[membership.role] ?? membership.role}</span>
            </DropdownItem>
          );
        })}
      </Dropdown>
    </>
  );
}

export function Topbar({ scrolled = false, onOpenCommandPalette }: TopbarProps) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  // 15-g P2-7: the burger must REFLECT the drawer state — an
  // always-«فتح» label hid the open/closed state from screen readers.
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const resolved = resolveTheme(themeMode);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutM = useLogout();
  // R305-A4: the sidebar-section context for the title block (null on
  // any path that is not exactly one of this role's nav destinations).
  const navGroupKicker = useNavGroupKicker(role, location.pathname);
  // PRD: students see their college as a quick scope indicator.
  // `/me/profile` is student-only — see StudentScopeChip above for why
  // the request must not fire for the other four roles.
  const meQ = useMe();
  // Governance scope chip — ADMIN/QUALITY users may be university-wide (NULL)
  // or scoped to a single faculty (set). Surfacing this prevents
  // "which college am I admin of?" ambiguity at a glance.
  const scopeFacultyName = (role === 'ADMIN' || role === 'QUALITY')
    ? meQ.data?.scopeFaculty?.name ?? null
    : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);

  /* r351 A2 (Q1a — the ≤4-control topbar): the visible control set is
   * search · bell · user (the ONE identity element; theme + feedback
   * + logout + profile live inside its menu — the r350 «rail + topbar
   * = two identities / two toggles» defect class dies here). The AI
   * quick-action left the topbar: the sidebar badge, the bottom-nav
   * slot and the ⌘K palette all reach it, and the freed seat keeps
   * the topbar under budget at every width. */

  /* r165d (D2): QUALITY/OWNER point at their PERSONAL notifications
   * inbox (/quality/notifications · /owner/notifications — the shared
   * AlertsPage mounted inside their role shells) instead of the
   * operational boards; the boards keep their sidebar homes. */
  const alertsPath =
    role === 'TEACHER' ? '/teacher/alerts' :
    role === 'ADMIN'   ? '/admin/alerts'   :
    role === 'QUALITY' ? '/quality/notifications' :
    role === 'OWNER'   ? '/owner/notifications'   :
    '/student/alerts';

  // Close menu on outside click is handled by the Dropdown primitive
  // (click-outside + Esc + focus return + arrow-key navigation).

  const initials =
    user?.avatarInitials ?? `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const profilePath =
    role === 'STUDENT' ? '/student/profile' :
    role === 'TEACHER' ? '/teacher/profile' :
    null;

  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <button
        type="button"
        className="topbar-mobile-toggle"
        onClick={toggle}
        aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={sidebarOpen}
      >
        <Icon icon={Menu} size={18} />
      </button>

      {/* 5-B5: tabIndex=-1 makes this the focus-rescue target after
          route changes that orphan focus (AppShell effect) — programmatic
          focus only, never a Tab stop.

          r350 (B1 — the one-title law): the topbar no longer renders
          the page title TEXT. It was the second copy of the same name
          the page's PageHeader h1 already carries (measured live on
          every role: «لوحة التحكم» twice on one screen), and it was the
          source of the small-screen clipping. The block now carries the
          quiet section kicker + the data-scope chips only — the h1 in
          the content is the single visible title, exactly like the
          reference chrome (logo + controls, no title). document.title
          still derives from nav.ts via AppShell's resolveTitle. */}
      <div className="topbar-title" tabIndex={-1}>
        {navGroupKicker && <span className="topbar-kicker">{navGroupKicker}</span>}
        {role === 'STUDENT' && <StudentScopeChip />}
        {/* r351 A2 (Q1a): the institution chip moved from the actions
            cluster into the title block — it is context, not a control;
            the multi-membership switcher keeps its one-tap reach here
            and the actions budget stays ≤4 at every width. */}
        <InstitutionChip />
        {scopeFacultyName && (
          <span
            className="topbar-scope"
            title={`${role === 'ADMIN' ? 'نطاق إدارة المؤسسة' : 'نطاق أخصائي الجودة'}: ${scopeFacultyName}`}
          >
            {/* r352 §D7: the scoped ADMIN keeps the role's canonical name
                («إدارة المؤسسة») with the faculty as the scope. */}
            {role === 'QUALITY' ? 'أخصائي جودة كلّيّة' : roleLabel('ADMIN')} · {scopeFacultyName}
          </span>
        )}
      </div>

      <GlobalSearch onOpenCommandPalette={onOpenCommandPalette} />

      <div className="topbar-actions">
        {/* Mobile-band search entry point (4-A2 P1-3): the pill is
            display:none ≤1200px (r351 A2: the band moved from 920px —
            the pill + six controls did not fit 1024 tablets), so the
            button opens the command palette — the same surface ⌘K
            opens. Hidden >1200px where the pill lives. */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="topbar-search-toggle"
            onClick={onOpenCommandPalette}
            aria-label="البحث والأوامر"
            title="البحث والأوامر (Ctrl+K)"
            /* Premium-polish a11y: haspopup announces the dialog this
               launches. aria-expanded is deliberately absent (r152a A6
               P3-1): the palette's open state lives in AppShell, so a
               hardcoded aria-expanded="false" kept lying while ⌘K was
               open — an honest launcher attribute beats a frozen one. */
            aria-haspopup="dialog"
          >
            <Icon icon={Search} size={18} />
          </button>
        )}
        {/* r351 A2 (Q1a): the AI quick-action + the standalone theme
            toggle are retired from the actions cluster — the sidebar
            badge / bottom-nav / ⌘K palette reach AI, and the theme
            flip lives in the user menu (the r350 «two toggles on one
            screen» defect dies). Actions budget: search · bell ·
            user (+ the burger on mobile). */}
        {/* r369 slice 02: the collector chip between search and the
            bell — student-only, hidden on the mobile band by CSS. */}
        {role === 'STUDENT' && <StudentXpChip />}
        <NotificationDropdown alertsPath={alertsPath} />

        {user && (
          <div className="topbar-user">
            <button
              type="button"
              ref={userMenuTriggerRef}
              className="topbar-user-trigger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="ملف المستخدم"
            >
              {/* 21-c (A12 P1-2, spillover): was a hand-rolled .avatar
                  span — white initials on the un-gated DB avatarColor
                  (3.21:1 on #4F8EF7, the audit's measured topbar pair).
                  R319 (c1-A · B1b): the shell never forwards the DB
                  avatarColor anymore — the topbar wears the ONE square
                  ink-cell grammar (mono initials on paper + hairline,
                  radius 0), same as the sidebar. The prop stays on the
                  primitive for callers that still pass one. */}
              <UserAvatar initials={initials} size={30} />
              <span className="topbar-user-name hide-on-mobile">
                {user.firstName}
              </span>
            </button>

            <Dropdown
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={userMenuTriggerRef}
              placement="end"
              ariaLabel="قائمة حساب المستخدم"
              header={
                <div className="topbar-user-menu-header">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  {/* r351 A2 (Q1a — the ONE identity): the role line the
                      sidebar footer used to carry (its avatar + name
                      block is retired) lives here now — one identity
                      seat, announced once. Same composite-label source
                      as the retired sidebar seat (useMe's teacher
                      profile position). */}
                  <div className="topbar-user-role text-xxs" style={{ marginTop: 'var(--sp-0-5)', color: 'var(--text-secondary)' }}>
                    {displayRoleLabel(user.role, meQ.data?.teacherProfile?.position ?? null, meQ.data?.teacherProfile?.positionFaculty?.name ?? null)}
                  </div>
                  <div className="text-xxs font-mono text-subtle" style={{ marginTop: 'var(--sp-0-5)' }}>
                    {/* r148 (AUDIT-3 M6): البريد بلا bdi قد يعرض بترتيب خاطئ في
                        سياق RTL — نفس عرف ProfilePage/OwnerUsersPage. */}
                    <bdi dir="ltr">{user.email}</bdi>
                  </div>
                </div>
              }
            >
              {profilePath && (
                <DropdownItem onSelect={() => { setMenuOpen(false); navigate(profilePath); }}>
                  <Icon icon={UserIcon} size={14} />
                  ملفي الشخصي
                </DropdownItem>
              )}
              {/* 4-A2 P2-10: the theme item used to leave the menu
                  open (aria-expanded stuck true) while the sibling
                  items closed — match their behavior. */}
              <DropdownItem onSelect={() => { setMenuOpen(false); setThemeMode(resolved === 'dark' ? 'light' : 'dark'); }}>
                <Icon icon={resolved === 'dark' ? Sun : Moon} size={14} />
                {resolved === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              </DropdownItem>
              {/* r351 A2 (Q1f): the feedback seat — the floating FAB is
                  retired; the sheet opens from here and from the ⌘K
                  palette (feedbackSeat.ts owns the channel). */}
              <DropdownItem onSelect={() => { setMenuOpen(false); openFeedback(); }}>
                <Icon icon={MessageSquarePlus} size={14} />
                أبلغ عن مشكلة
              </DropdownItem>
              <DropdownSeparator />
              {/* r157 (6A4-4): unified with the Sidebar's logout — the
                  redirect rides onSettled (both success and error
                  paths) so it fires strictly AFTER useLogout's
                  hook-level onSettled has cleared the auth store +
                  query cache. The old click handler navigated to '/'
                  immediately, racing the async POST /auth/logout: the
                  dashboard re-rendered mid-flight and the landing
                  flash replaced whatever the user was looking at. */}
              <DropdownItem
                /* r176e (D-07): pending guard — a double-click used to
                   fire a second POST /auth/logout. */
                disabled={logoutM.isPending}
                onSelect={() => { setMenuOpen(false); logoutM.mutate(undefined, { onSettled: () => navigate('/auth', { replace: true }) }); }}>
                <span className="topbar-user-logout" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--c-rose-deep)' }}>
                  <Icon icon={LogOut} size={14} />
                  تسجيل الخروج
                </span>
              </DropdownItem>
            </Dropdown>
          </div>
        )}
      </div>
    </header>
  );
}

