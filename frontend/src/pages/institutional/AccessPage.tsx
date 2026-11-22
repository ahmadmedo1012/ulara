/**
 * r352 §E — access & permissions: an understandable permission view
 * built strictly on what the API exposes. Distinguishes, visually
 * and semantically:
 *
 *  · دور المنصة (platform role — the login role),
 *  · العضوية المؤسسية (institutional membership + its role),
 *  · منح أدوار النطاق (additional scoped UnitRoleGrants — mine and,
 *    for ROLES_ASSIGN holders, any user's),
 *  · التعيين الوظيفي/الأكاديمي (the appointment record — NOT a
 *    permission source),
 *  · القدرات الفعّالة (the merged effective set + role defaults +
 *    what the role default DOESN'T include).
 *
 * The frontend is never the security authority: everything renders
 * from /me/permissions + /me/unit-roles + the admin grants surface;
 * 403/404/409 stay handled by the shared error states.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { serverError,
  DetailList, EnumChip, InstFormDialog, InstSection, InstStates,
  type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useMyCapabilities, useMyUnitRoles, useOrgUnitTree, useInstActions,
  useUserUnitRoles,
} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import { ORG_UNIT_TYPE_LABELS, PLATFORM_ROLE_LABELS } from '../../lib/institutional/labels';
import type { InstCapability } from '../../lib/institutional/types';
import { flattenUnits } from './PeoplePage';
import { useAuthStore } from '../../stores/auth.store';

/** The r352 capability keys with their Arabic names (contract §0). */
const CAPABILITY_LABELS: Record<InstCapability, string> = {
  ORG_STRUCTURE_MANAGE: 'إدارة الهيكل التنظيمي',
  PEOPLE_MANAGE: 'إدارة الأفراد',
  APPOINTMENTS_MANAGE: 'إدارة التعيينات',
  COUNCILS_MANAGE: 'إدارة المجالس واللجان',
  PROGRAMS_MANAGE: 'إدارة البرامج',
  CREDENTIALS_MANAGE: 'منح الشهادات وسحبها',
  ACCREDITATION_MANAGE: 'إدارة الاعتماد والتراخيص الخارجية',
  QUALITY_INTERNAL_MANAGE: 'إدارة التقييم الذاتي الداخلي',
  FACILITIES_MANAGE: 'إدارة المعامل والموارد',
  RESEARCH_PROJECTS_MANAGE: 'إدارة المشاريع البحثية',
  UNIT_ROLES_ASSIGN: 'منح أدوار النطاق',
};

export function InstitutionAccessPage() {
  const user = useAuthStore((s) => s.user);
  const currentInstitution = useAuthStore((s) => s.currentInstitution);
  const membershipRole = useAuthStore((s) => s.membershipRole);

  const capsQuery = useMyCapabilities();
  const myGrantsQuery = useMyUnitRoles();
  const treeQuery = useOrgUnitTree();

  const canAssign = capsQuery.data?.has('UNIT_ROLES_ASSIGN') ?? false;
  const [userIdInput, setUserIdInput] = useState('');
  const [grantOpen, setGrantOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const unitRoleMutations = useInstActions(['user-unit-roles'], {
    grant: (i: { userId: string; input: Parameters<typeof instApi.grantUnitRole>[1] }) =>
      instApi.grantUnitRole(i.userId, i.input),
    revoke: (i: { id: string }) => instApi.revokeUnitRole(i.id),
  });
  const userGrantsQuery = useUserUnitRoles(
    canAssign && userIdInput.trim() ? userIdInput.trim() : null,
    currentInstitution?.id ?? null,
  );

  const units = treeQuery.data ? flattenUnits(treeQuery.data) : [];
  const unitOptions = units.map((u) => ({
    value: u.id, label: `${ORG_UNIT_TYPE_LABELS[u.type]} — ${u.nameAr}`,
  }));

  const caps = capsQuery.data;
  const effective = new Set(caps?.capabilities ?? []);
  const defaults = new Set(caps?.roleDefaults ?? []);

  const grantFields: InstField[] = [
    { kind: 'text', name: 'userId', label: 'معرّف المستخدم (ID)', required: true, maxLength: 40, hint: 'يجب أن يكون المستخدم عضوًا نشطًا في مؤسستك.' },
    {
      kind: 'select', name: 'role', label: 'الدور الممنوح', required: true,
      options: (['ADMIN', 'QUALITY', 'TEACHER'] as const).map((r) => ({ value: r, label: PLATFORM_ROLE_LABELS[r] })),
      hint: 'قدرات الدور الممنوح تُدمج مع قدرات العضوية — والنقض يسبق المنح دائمًا.',
    },
    { kind: 'select', name: 'orgUnitId', label: 'نطاق الوحدة', options: unitOptions, placeholder: '— على مستوى المؤسسة —' },
    { kind: 'text', name: 'reason', label: 'سبب المنح', maxLength: 240 },
  ];

  const submitGrant = async (values: InstFormValues): Promise<string | void> => {
    if (!currentInstitution) return 'لا يوجد سياق مؤسسة.';
    setBusy(true);
    try {
      await unitRoleMutations.grant({
        userId: String(values.userId).trim(),
        input: {
          institutionId: currentInstitution.id,
          orgUnitId: (values.orgUnitId as string | undefined) ?? undefined,
          role: String(values.role),
          reason: values.reason as string | undefined,
        },
      });
      toast.success('مُنح الدور');
      setGrantOpen(false);
      setUserIdInput(String(values.userId).trim());
    } catch (err) {
      return serverError(err, 'تعذَّر منح الدور.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (grantId: string) => {
    setBusy(true);
    try {
      await unitRoleMutations.revoke({ id: grantId });
      toast.success('سُحب الدور');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر سحب الدور.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title="الصلاحيات والأدوار"
        eyebrow="مساحة العمل المؤسسية"
        description="من يملك ماذا ولماذا — دور المنصة، العضوية المؤسسية، منح النطاق، والقدرات الفعّالة كما تحسبها الخدمة. التعيين الوظيفي ليس مصدر صلاحية."
        meta={canAssign ? (
          <button type="button" className="btn primary sm" onClick={() => setGrantOpen(true)}>
            <Icon icon={Plus} size={14} /> منح دور
          </button>
        ) : null}
      />

      <InstStates isLoading={capsQuery.isLoading} error={capsQuery.error} isEmpty={false}>
        <InstSection
          title="دورك وعضويتك"
          description="التمييز الثلاثي: دور المنصة (تسجيل الدخول) · دور العضوية في هذه المؤسسة · المنح الإضافية."
        >
          <DetailList
            items={[
              { label: 'حسابك', value: user ? `${user.firstName} ${user.lastName}` : null },
              { label: 'دور المنصة', value: user ? PLATFORM_ROLE_LABELS[user.role] ?? user.role : null },
              {
                label: 'المؤسسة الحالية',
                value: currentInstitution ? currentInstitution.name : 'لا يوجد سياق — اختر مؤسستك.',
              },
              {
                label: 'دور العضوية هنا',
                value: membershipRole ? PLATFORM_ROLE_LABELS[membershipRole] ?? membershipRole : '—',
              },
              { label: 'تعيينك الوظيفي', value: 'يُعرض في صفحة تفاصيلك بدليل الأفراد — مستقل عن الصلاحيات.' },
            ]}
          />
        </InstSection>

        <InstSection
          title="القدرات الفعّالة"
          description="الدمج الذي يعيده الخادم: افتراضيات الدور ∪ منح النطاق ∪ المنح الصريحة − أي نقض. أي نقض ينقض المنح."
        >
          <div className="inst-filters">
            {(Object.keys(CAPABILITY_LABELS) as InstCapability[]).map((cap) => (
              <span
                key={cap}
                className="inst-chip"
                data-tone={effective.has(cap) ? 'ok' : 'muted'}
                title={effective.has(cap)
                  ? (defaults.has(cap) ? 'من افتراضيات دورك' : 'من منح صريحة أو نطاق')
                  : 'ليست ضمن قدراتك الفعّالة'}
              >
                {CAPABILITY_LABELS[cap]}
              </span>
            ))}
          </div>
          <p className="inst-cap-note">
            القائمة أعلاه قراءة من <b>/me/permissions</b> — الواجهة لا تقرر الصلاحيات؛ إن غاب زرُّ فعلك فذلك لأن الخادم لم يمنحك قدرتها.
          </p>
        </InstSection>

        <InstSection
          title="منح أدواري على الوحدات"
          description="أدوار نطاقها وحدة تنظيمية أو المؤسسة ككل (GET /me/unit-roles)."
        >
          <InstStates
            isLoading={myGrantsQuery.isLoading}
            error={myGrantsQuery.error}
            isEmpty={(myGrantsQuery.data ?? []).length === 0}
          >
            <DetailList
              items={(myGrantsQuery.data ?? []).map((g) => ({
                label: PLATFORM_ROLE_LABELS[g.role] ?? g.role,
                value: (
                  <span className="inst-actions">
                    {g.orgUnit
                      ? `${g.orgUnit.nameAr} (${ORG_UNIT_TYPE_LABELS[g.orgUnit.type] ?? g.orgUnit.type})`
                      : 'على مستوى المؤسسة'}
                    <span className="inst-tree-kind">من {formatDate(g.createdAt)}</span>
                    {g.reason && <span className="inst-tree-kind">— {g.reason}</span>}
                  </span>
                ),
              }))}
            />
          </InstStates>
        </InstSection>

        {canAssign && (
          <InstSection
            title="منح أدوار المستخدمين"
            description="أدخل معرّف مستخدم لعرض منحه، أو امنح دورًا جديدًا. يجب أن يكون المستخدم عضوًا نشطًا في المؤسسة (يؤكده الخادم)."
          >
            <div className="inst-filters">
              <div className="inst-search">
                <input
                  type="text"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="معرّف المستخدم (ID)…"
                  aria-label="معرّف المستخدم"
                  maxLength={40}
                />
              </div>
            </div>
            {userIdInput.trim() && (
              <InstStates
                isLoading={userGrantsQuery.isLoading}
                error={userGrantsQuery.error}
                isEmpty={(userGrantsQuery.data ?? []).length === 0}
              >
                <DetailList
                  items={(userGrantsQuery.data ?? []).map((g) => ({
                    label: PLATFORM_ROLE_LABELS[g.role] ?? g.role,
                    value: (
                      <span className="inst-actions">
                        {g.orgUnit
                          ? `${g.orgUnit.nameAr} (${ORG_UNIT_TYPE_LABELS[g.orgUnit.type] ?? g.orgUnit.type})`
                          : 'على مستوى المؤسسة'}
                        {g.isActive ? (
                          <button type="button" className="btn danger sm" disabled={busy} onClick={() => revoke(g.id)}>
                            سحب
                          </button>
                        ) : (
                          <EnumChip value="ENDED" labels={{ ENDED: 'مسحوب' }} />
                        )}
                      </span>
                    ),
                  }))}
                />
              </InstStates>
            )}
          </InstSection>
        )}
      </InstStates>

      <InstFormDialog
        open={grantOpen}
        title="منح دور نطاق"
        description="الدور الممنوح يضيف قدراته ضمن النطاق المحدد — النقض الصريح يظل أقوى من أي منح."
        fields={grantFields}
        submitLabel="منح"
        busy={busy}
        onCancel={() => setGrantOpen(false)}
        onSubmit={submitGrant}
      />
    </PageFrame>
  );
}
