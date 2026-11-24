import { useState, type InputHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Landmark, ShieldCheck, Ban, RotateCcw, UserPlus,
  ArrowLeft, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { FormField, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, TableSkeleton } from '../../components/primitives/States';
/* R304 (workstream 4D): the console opens with the patterns PageHeader
 * (breadcrumbs back to the owner dashboard; the always-visible create
 * band stays on the page — the keep-edits contract renders it before
 * any dialog) and the institutions register rides the workspace table
 * family (ws-table, defined in admin.css — the detail page's sheet). */
import { PageHeader as PatternsPageHeader } from '../../components/patterns';
/* R359 (W2-e): the console speaks the sheet grammar — the KpiBand
 * totals + the framed sections; the register rides the DataSheet
 * (mono numerics, cell-stack identity, flat sg-flag statuses). */
import { KpiBand, SheetSection, DataSheet, type DataSheetColumn } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { Modal } from '../../components/overlays/Modal';
import '../../styles/admin.css'; // R304: the ws-table family lives on the admin sheet
import '../../styles/shared/ds-admin-owner.css'; // R305-A8 «ds» scoped sheet — directly after the family sheet (Task 1 contract)
import {
  useCreateInstitution,
  useOwnerInstitutions,
  useProvisionInstitutionAdmin,
  useRestoreInstitutionMembership,
  useRevokeInstitutionMembership,
  useUpdateInstitution,
} from '../../hooks/useInstitutions';
import { apiErrorMessage } from '../../hooks/useResources';
import { toast } from '../../lib/toast';
import type { InstitutionAdminRow, OwnerInstitution } from '../../lib/api';
import { formatDate, formatNum } from '../../utils/numbers';

/**
 * r178 (multi-institution foundation) — the OWNER's institution console.
 *
 * Surfaces the platform-owner half of the contract: create institutions,
 * provision their institutional ADMINs (new users or existing ones),
 * suspend/reactivate an institution, and revoke/restore admin
 * memberships. Mutations land through hooks/useInstitutions.ts
 * (invalidate ['owner','institutions']) with the page's own toast
 * feedback naming the touched institution — D17-3 Arabic copy, the
 * backend's own Arabic message on failure (authErrorView family via
 * apiErrorMessage).
 *
 * Design: the owner console's established grammar (OwnerUsersPage —
 * .page / .page-header / Card + .table + .tbl-stack, Badge statuses,
 * ConfirmDialog for destructive actions, TableSkeleton/ErrorState/
 * EmptyState for the listing's three honest states, FormField for
 * labelled modal fields). No new design language; tokens only.
 */

/** Counted Arabic plural for the institutions total line. */
function institutionsCountLabel(n: number): string {
  if (n === 0) return 'لا مؤسسات';
  if (n === 1) return 'مؤسسة واحدة';
  if (n === 2) return 'مؤسستان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} مؤسسات`;
  return `${formatNum(n)} مؤسسة`;
}

const STATUS_LABELS: Record<OwnerInstitution['status'], string> = {
  ACTIVE: 'نشطة',
  SUSPENDED: 'معلّقة',
};

/* ── Create form ─────────────────────────────────────────────── */

interface CreateDraft {
  name: string;
  nameEn: string;
  slug: string;
}

const EMPTY_CREATE_DRAFT: CreateDraft = { name: '', nameEn: '', slug: '' };

function CreateInstitutionCard({
  isPending,
  error,
  onCreate,
}: {
  isPending: boolean;
  /** The create mutation's last error (r183-B5 — the keep-edits rule:
   *  the draft survives a failed create and the failure is named
   *  inline, mirroring the AdminCoursesPage modal contract). */
  error: unknown;
  /** Resolves true ONLY on success — the child clears its draft then
   *  (and only then). */
  onCreate: (draft: { name: string; nameEn?: string; slug?: string }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_CREATE_DRAFT);

  const nameProblem = draft.name.length > 0 && draft.name.trim().length < 2
    ? 'الاسم قصير جدًا — حرفان على الأقل'
    : undefined;
  const canSubmit = draft.name.trim().length >= 2 && !isPending;

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await onCreate({
      name: draft.name.trim(),
      nameEn: draft.nameEn.trim() || undefined,
      slug: draft.slug.trim() || undefined,
    });
    // r183-B5 (A9 P2 — optimistic input loss): the draft is cleared
    // ONLY on success. A 409 slug conflict keeps every field the owner
    // typed with the failure named inline below.
    if (ok) setDraft(EMPTY_CREATE_DRAFT);
  };

  return (
    /* R359 (W2-e): the create band rides the framed section (the Card
     * died with the console's grammar recomposition). */
    <SheetSection index="01" caption="NEW INSTITUTION" title="إنشاء مؤسسة جديدة">
      <form
        className="owner-inst-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* r351 A2 (Q3): how-it-shows hint trimmed to the requirement. */}
        <FormField label="اسم المؤسسة" error={nameProblem} hint="مطلوب">
          <input
            className="input"
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="مثلاً: أكاديمية طرابلس للعلوم"
            maxLength={200}
          />
        </FormField>
        <FormField label="الاسم بالإنجليزية (اختياري)">
          <input
            className="input"
            type="text"
            dir="ltr"
            value={draft.nameEn}
            onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))}
            placeholder="Tripoli Academy of Sciences"
            maxLength={200}
          />
        </FormField>
        <FormField
          label="المعرّف (slug — اختياري)"
          /* r351 A2 (Q3): hint trimmed — the auto-derive rule stays,
           * the charset explainer retired (the placeholder shows it). */
          hint="يُشتق تلقائيًا إن تُرك فارغًا"
        >
          <input
            className="input"
            type="text"
            dir="ltr"
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            placeholder="inst-example"
            maxLength={64}
          />
        </FormField>
        <button type="submit" className="btn primary sm owner-inst-create-submit" disabled={!canSubmit} aria-busy={isPending}>
          <Icon icon={Plus} size={13} />
          {isPending ? 'جارٍ الإنشاء…' : 'إنشاء المؤسسة'}
        </button>
        {error != null && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إنشاء المؤسسة"
            description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </form>
    </SheetSection>
  );
}

/* ── Provision-admin modal ────────────────────────────────────── */

type ProvisionMode = 'new' | 'existing';

interface ProvisionDraft {
  mode: ProvisionMode;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const EMPTY_PROVISION_DRAFT: ProvisionDraft = {
  mode: 'new',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
};

/**
 * FormField-compatible password control (r183-B5, A9 P3): masked by
 * default with an opt-in reveal toggle (the AuthPage Eye/EyeOff grammar
 * on the generic .icon-btn chrome — no auth-scoped CSS leaks into the
 * owner sheet). FormField clones its single child with the control
 * id/aria props, so this component FORWARDS everything it receives
 * onto the inner input — the label htmlFor wiring and the tests'
 * getByLabelText keep working.
 */
function PasswordControl({
  value, onChange, show, onToggle, disabled, ...fieldProps
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /* The FormField-injected control props (id, aria-*) ride the inner
   * input verbatim. `onChange` is Omitted so THIS component's string
   * callback is the only signature — the raw intersection made TS
   * contextually type the call site's parameter as the event union. */
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <span className="flex items-center gap-2">
      {/* dir="ltr": passwords are overwhelmingly Latin runs; the caret
          and masked glyphs must not bidi-flip in RTL (the AuthPage note). */}
      <input
        {...fieldProps}
        className="input"
        style={{ flex: '1 1 auto', minWidth: 0 }}
        type={show ? 'text' : 'password'}
        dir="ltr"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={onToggle}
        aria-pressed={show}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        disabled={disabled}
      >
        <Icon icon={show ? EyeOff : Eye} size={16} />
      </button>
    </span>
  );
}

function ProvisionAdminModal({
  open,
  institution,
  isPending,
  error,
  onClose,
  onProvision,
}: {
  open: boolean;
  institution: OwnerInstitution | null;
  isPending: boolean;
  /** The provision mutation's last error (r183-B5 — the keep-edits
   *  rule: the modal stays open, the draft survives, the failure is
   *  named inline — the settings/detail-page modal contract). */
  error: unknown;
  onClose: () => void;
  /** Resolves true ONLY on success — the child clears its draft then
   *  (and only then). */
  onProvision: (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ProvisionDraft>(EMPTY_PROVISION_DRAFT);
  // r183-B5 (A9 P3): masked by default, reveal is opt-in (the AuthPage
  // toggle grammar — aria-pressed + the Eye/EyeOff pair, generic
  // .icon-btn chrome so no auth-scoped CSS leaks into the owner sheet).
  const [showPassword, setShowPassword] = useState(false);

  const emailProblem =
    draft.email.length > 0 && !/.+@.+\..+/.test(draft.email.trim())
      ? 'بريد إلكتروني غير صالح'
      : undefined;
  // mode 'new' follows the platform password policy (12+ — the backend
  // applies the shared passwordSchema; the FE gate mirrors it so the
  // owner sees the rule before the 400).
  const passwordProblem =
    draft.mode === 'new' && draft.password.length > 0 && draft.password.length < 12
      ? '12 حرفًا على الأقل'
      : undefined;
  const canSubmit =
    /.+@.+\..+/.test(draft.email.trim()) &&
    (draft.mode === 'existing' || draft.password.length >= 12) &&
    !isPending;

  const close = () => {
    setDraft(EMPTY_PROVISION_DRAFT);
    setShowPassword(false);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await onProvision({
      mode: draft.mode,
      email: draft.email.trim().toLowerCase(),
      firstName: draft.firstName.trim() || undefined,
      lastName: draft.lastName.trim() || undefined,
      password: draft.mode === 'new' ? draft.password : undefined,
    });
    // r183-B5 (A9 P2 — optimistic input loss): the draft is cleared
    // ONLY on success (the parent closes the modal then — this reset
    // keeps a stale draft from riding into the next open). A failed
    // provision (404 unknown email, 409 …) keeps every field the owner
    // typed with the failure named inline below.
    if (ok) {
      setDraft(EMPTY_PROVISION_DRAFT);
      setShowPassword(false);
    }
  };

  return (
    <Modal open={open} onClose={close} ariaLabel="تعيين مسجل عام للمؤسسة">
      <div className="modal-header">
        {/* r183-B5 (A9 P3): h3 — the owner modals' heading grammar (the
            four detail-page modals all use h3.modal-title). */}
        {/* R320 §B: the provisioned account is Role.ADMIN — the
            institution's «مسجل عام» (registrar general). */}
        <h3 className="modal-title">تعيين مسجل عام للمؤسسة</h3>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="modal-body">
          {institution && (
            <p className="owner-confirm-message" style={{ marginBlockEnd: 'var(--sp-4)' }}>
              {institution.name} — يُمنح الدور داخل هذه المؤسسة فقط.
            </p>
          )}

          <FormField label="نوع المستخدم">
            <select
              className="input"
              value={draft.mode}
              onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as ProvisionMode }))}
            >
              <option value="new">مستخدم جديد</option>
              <option value="existing">مستخدم قائم</option>
            </select>
          </FormField>

          <FormField label="البريد الإلكتروني" error={emailProblem} hint="مطلوب">
            <input
              className="input"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="admin@example.com"
            />
          </FormField>

          {draft.mode === 'new' && (
            <>
              <div className="auth-row-2">
                <FormField label="الاسم الأول">
                  <input
                    className="input"
                    type="text"
                    value={draft.firstName}
                    onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                    maxLength={60}
                  />
                </FormField>
                <FormField label="اللقب">
                  <input
                    className="input"
                    type="text"
                    value={draft.lastName}
                    onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                    maxLength={60}
                  />
                </FormField>
              </div>
              <FormField label="كلمة المرور" error={passwordProblem} hint="مطلوبة — 12 حرفًا على الأقل">
                <PasswordControl
                  value={draft.password}
                  onChange={(v) => setDraft((d) => ({ ...d, password: v }))}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  disabled={isPending}
                />
              </FormField>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={close} disabled={isPending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary" disabled={!canSubmit} aria-busy={isPending}>
            <Icon icon={UserPlus} size={13} />
            {isPending ? 'جارٍ التعيين…' : 'تعيين عضو إدارة المؤسسة'}
          </button>
        </div>
        {error != null && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر تعيين عضو إدارة المؤسسة"
            description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </form>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export function OwnerInstitutionsPage() {
  const listing = useOwnerInstitutions();
  const createM = useCreateInstitution();
  const updateM = useUpdateInstitution();
  const provisionM = useProvisionInstitutionAdmin();
  const revokeM = useRevokeInstitutionMembership();
  const restoreM = useRestoreInstitutionMembership();

  const [provisionTarget, setProvisionTarget] = useState<OwnerInstitution | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    danger: boolean;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });

  const institutions = listing.data ?? [];
  const mutationBusy =
    createM.isPending || updateM.isPending || provisionM.isPending ||
    revokeM.isPending || restoreM.isPending;

  /* ── Create ─────────────────────────────────────────────── */
  /* r183-B5 (A9 P2 — optimistic input loss): mutateAsync + a boolean
   * result — the create card clears its draft only on success; the
   * failure is named inline by the card's AlertRow (the 409 slug
   * conflict carries its own Arabic message from the backend), the
   * toast keeps the positive side. */
  const onCreate = async (draft: { name: string; nameEn?: string; slug?: string }): Promise<boolean> => {
    try {
      const { institution } = await createM.mutateAsync(draft);
      toast.success(`أُنشئت «${institution.name}» وهي نشطة الآن.`, { title: 'تمّ إنشاء المؤسسة' });
      return true;
    } catch {
      return false;
    }
  };

  /* ── Suspend / reactivate ───────────────────────────────── */
  const onToggleStatus = (institution: OwnerInstitution) => {
    const suspending = institution.status === 'ACTIVE';
    setConfirmConfig({
      title: suspending ? 'تعليق المؤسسة' : 'تنشيط المؤسسة',
      confirmLabel: suspending ? 'تعليق المؤسسة' : 'تنشيط المؤسسة',
      message: suspending
        ? `هل تريد تعليق «${institution.name}»؟ لن يتمكّن أعضاؤها من الوصول إلى سياق المؤسسة حتى تُنشَّط مجددًا.`
        : `هل تريد إعادة تنشيط «${institution.name}»؟ سيستعيد أعضاؤها النشطون وصولهم.`,
      danger: suspending,
      onConfirm: async () => {
        setConfirmOpen(false);
        updateM.mutate(
          { id: institution.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } },
          {
            onSuccess: () => {
              toast.success(
                suspending ? `تمّ تعليق «${institution.name}».` : `أُعيد تنشيط «${institution.name}».`,
                { title: 'تمّ تحديث الحالة' },
              );
            },
            onError: (error) => {
              toast.error(
                apiErrorMessage(error, 'تعذّر تحديث حالة المؤسسة — حاول مجدداً.'),
                { title: 'تعذّر التحديث' },
              );
            },
          },
        );
      },
    });
    setConfirmOpen(true);
  };

  /* ── Provision admin ────────────────────────────────────── */
  /* r183-B5 (A9 P2): same keep-edits contract — the modal closes ONLY
   * on success (the old code closed it right after mutate(), so a 404
   * unknown-email or 409 swallowed the draft and the error landed on a
   * page without context). The inline AlertRow names the failure. */
  const onProvision = async (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }): Promise<boolean> => {
    const target = provisionTarget;
    if (!target) return false;
    try {
      const { user } = await provisionM.mutateAsync({ institutionId: target.id, body });
      toast.success(
        `تمّ تعيين ${user.firstName} ${user.lastName} مسجلاً عاماً لـ«${target.name}».`,
        { title: 'تمّ التعيين' },
      );
      setProvisionTarget(null);
      return true;
    } catch {
      return false; // the modal stays open; the draft stays typed.
    }
  };

  /* ── Membership revoke / restore ────────────────────────── */
  const onRevokeAdmin = (institution: OwnerInstitution, admin: InstitutionAdminRow) => {
    setConfirmConfig({
      title: 'إلغاء عضوية إدارة المؤسسة',
      confirmLabel: 'إلغاء العضوية',
      message: `هل تريد إلغاء عضوية «${admin.firstName} ${admin.lastName}» في «${institution.name}»؟ سيفقد وصوله إلى سياق هذه المؤسسة فورًا.`,
      danger: true,
      onConfirm: async () => {
        setConfirmOpen(false);
        revokeM.mutate(
          { institutionId: institution.id, membershipId: admin.membershipId },
          {
            onSuccess: () => {
              toast.success(`أُلغيت عضوية ${admin.firstName} في «${institution.name}».`, {
                title: 'تمّ إلغاء العضوية',
              });
            },
            onError: (error) => {
              toast.error(
                apiErrorMessage(error, 'تعذّر إلغاء العضوية — حاول مجدداً.'),
                { title: 'تعذّر الإلغاء' },
              );
            },
          },
        );
      },
    });
    setConfirmOpen(true);
  };

  const onRestoreAdmin = (institution: OwnerInstitution, admin: InstitutionAdminRow) => {
    restoreM.mutate(
      { institutionId: institution.id, membershipId: admin.membershipId },
      {
        onSuccess: () => {
          toast.success(`أُعيدت عضوية ${admin.firstName} في «${institution.name}».`, {
            title: 'تمّت الاستعادة',
          });
        },
        onError: (error) => {
          toast.error(
            apiErrorMessage(error, 'تعذّرت استعادة العضوية — حاول مجدداً.'),
            { title: 'تعذّرت الاستعادة' },
          );
        },
      },
    );
  };

  /* R359 (W2-e) — the register's DataSheet columns: identity-first
   * cell-stack (name / Latin name / slug), the flat sg-flag statuses,
   * mono numerics for the counts, the admins list with its
   * revoke/restore verbs, and the console's actions cell (the
   * destructive verbs keep their .r305ao-btn-danger fills). */
  const registerColumns: DataSheetColumn<OwnerInstitution>[] = [
    {
      key: 'name',
      label: 'المؤسسة',
      render: (institution) => (
        <span className="sg-cell-stack">
          <span className="owner-inst-name sg-cell-title">{institution.name}</span>
          {institution.nameEn && (
            <bdi className="sg-cell-sub" dir="ltr">{institution.nameEn}</bdi>
          )}
          <bdi className="sg-cell-sub font-mono" dir="ltr">{institution.slug}</bdi>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (institution) => (
        <span className="sg-flag" data-tone={institution.status === 'ACTIVE' ? 'positive' : 'danger'}>
          {STATUS_LABELS[institution.status]}
        </span>
      ),
    },
    {
      key: 'members',
      label: 'الأعضاء النشطون',
      numeric: true,
      render: (institution) => formatNum(institution.activeMembershipCount),
    },
    {
      key: 'faculties',
      label: 'الكليات',
      numeric: true,
      render: (institution) => formatNum(institution.facultyCount),
    },
    {
      key: 'admins',
      label: 'إدارة المؤسسة',
      render: (institution) =>
        institution.admins.length === 0 ? (
          <span className="text-xs text-subtle">لا أعضاء إدارة بعد</span>
        ) : (
          <ul className="owner-inst-admins">
            {institution.admins.map((admin) => (
              <li key={admin.membershipId}>
                <span className="owner-inst-admin-name">
                  {admin.firstName} {admin.lastName}
                  {admin.isActive ? '' : ' · معطّلة'}
                </span>
                <bdi className="owner-inst-admin-email" dir="ltr">{admin.email}</bdi>
                <button
                  type="button"
                  /* R305-A8 danger hierarchy: revoking a live admin's
                   * membership cuts their access instantly — the
                   * destructive verb rides the danger fill; the
                   * restoring verb (استعادة) stays a quiet ghost
                   * action. */
                  className={`btn ghost sm${admin.isActive ? ' r305ao-btn-danger' : ''}`}
                  disabled={mutationBusy}
                  onClick={() =>
                    admin.isActive
                      ? onRevokeAdmin(institution, admin)
                      : onRestoreAdmin(institution, admin)
                  }
                >
                  <Icon icon={admin.isActive ? Ban : RotateCcw} size={12} />
                  {admin.isActive ? 'إلغاء العضوية' : 'استعادة'}
                </button>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'createdAt',
      label: 'تاريخ الإنشاء',
      render: (institution) => formatDate(institution.createdAt, { dateStyle: 'medium' }),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (institution) => (
        <span className="table-row-actions">
          {/* r181 (phase-8 owner setup): the institution's own
              academic-setup context — faculties → departments →
              courses → offerings, all bound to THIS institution's
              slug. */}
          <Link
            to={`/owner/institutions/${institution.slug}`}
            className="btn ghost sm"
            title={`فتح سياق «${institution.name}» وإعداد بنيتها الأكاديمية`}
          >
            <Icon icon={ArrowLeft} size={13} />
            فتح المؤسسة
          </Link>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setProvisionTarget(institution)}
            disabled={mutationBusy}
            title={`تعيين مسجل عام لـ«${institution.name}»`}
          >
            <Icon icon={ShieldCheck} size={13} />
            تعيين مسجل عام
          </button>
          <button
            type="button"
            /* R305-A8 danger hierarchy: suspending an institution cuts
             * every member's access — the destructive verb gets the
             * danger fill, while the reactivating verb (تنشيط) stays
             * ghost. */
            className={`btn ghost sm${institution.status === 'ACTIVE' ? ' r305ao-btn-danger' : ''}`}
            onClick={() => onToggleStatus(institution)}
            disabled={mutationBusy}
          >
            <Icon icon={institution.status === 'ACTIVE' ? Ban : RotateCcw} size={13} />
            {institution.status === 'ACTIVE' ? 'تعليق' : 'تنشيط'}
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        title="المؤسسات"
        eyebrow="مالك المنصّة"
        /* r351 A2 (Q3): header description retired — the register explains the page. */
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'المؤسسات' }]}
        /* R341 D11: the [04] nav-order gutter numeral (OWNER_NAV
         * register — the D10 quality precedent). The page's primary
         * action (the create form's submit) is already the first
         * in-viewport CTA at both bands. */
      />

      {/* R359 (W2-e) — the register's KPI band: honest payload sums from
          the listing (institution count · active memberships · faculties).
          Honest-empty ('—') while pending or failed — never a fake zero. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'INSTITUTIONS',
            label: 'المؤسسات المسجّلة',
            value: institutions.length,
            empty: listing.data == null,
          },
          {
            index: '02',
            caption: 'MEMBERS',
            label: 'العضويات النشطة (مجموع)',
            value: institutions.reduce((sum, i) => sum + i.activeMembershipCount, 0),
            empty: listing.data == null,
          },
          {
            index: '03',
            caption: 'FACULTIES',
            label: 'الكليات (مجموع)',
            value: institutions.reduce((sum, i) => sum + i.facultyCount, 0),
            empty: listing.data == null,
          },
        ]}
      />

      <CreateInstitutionCard
        isPending={createM.isPending}
        error={createM.isError ? createM.error : null}
        onCreate={onCreate}
      />

      {/* R359 (W2-e) — the framed register: the hand-rolled ws-table
          dies; the DataSheet owns the anatomy (mono numerics, the
          cell-stack identity, the flat sg-flag statuses, the row pin
          keyed to the institution's own tone). The pending skeleton
          keeps its aria-busy contract (the pin file's honest pending
          shape) and the empty/error branches stay verbatim. */}
      <SheetSection index="02" caption="INSTITUTION REGISTER" title="المؤسسات المسجّلة" pad="none">
        {listing.isPending ? (
          <TableSkeleton rows={4} cols={7} />
        ) : listing.isError ? (
          <ErrorState error={listing.error} onRetry={() => listing.refetch()} />
        ) : institutions.length === 0 ? (
          /* r351 A2 (Q3): empty-state prose retired — the create card
             * sits directly above. */
          <EmptyState
            icon={Landmark}
            title="لا توجد مؤسسات بعد"
            description=""
          />
        ) : (
          <>
            <DataSheet
              caption="سجلّ المؤسسات"
              columns={registerColumns}
              rows={institutions}
              rowTone={(institution) => (institution.status === 'SUSPENDED' ? 'danger' : undefined)}
            />

            <div className="sg-pad-in">
              <div className="table-pagination">
                <span>{institutionsCountLabel(institutions.length)}</span>
              </div>
            </div>
          </>
        )}
      </SheetSection>

      <ProvisionAdminModal
        open={provisionTarget !== null}
        institution={provisionTarget}
        isPending={provisionM.isPending}
        error={provisionM.isError ? provisionM.error : null}
        onClose={() => {
          setProvisionTarget(null);
          /* A user-initiated close discards the attempt with its error —
           * the next open (maybe another institution) starts clean. */
          provisionM.reset();
        }}
        onProvision={onProvision}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        danger={confirmConfig.danger}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
