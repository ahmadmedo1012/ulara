/**
 * r352 §A — institutional overview: the institution's LEGAL identity
 * (classification, ownership, regulator, establishment references,
 * licensing state) — deliberately distinct from ULARA's product
 * branding. All values render from /institutions/me/profile; the
 * classification editor (OWNER-only PATCH) uses the catalogs.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageFrame, PageHeader, KpiBand } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import {
  serverError, DetailList, EnumChip, InstFormDialog, InstSection, InstStates, StatusFlag,
  type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import {
  useAuthorities, useInstitutionTypes, useLicenses, useMyCapabilities,
  useMyInstitutionProfile, useOrgUnits, usePeople,
} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  INSTITUTION_STATUS_LABELS, LICENSE_KIND_LABELS, LICENSE_STATUS_LABELS,
  OWNERSHIP_LABELS, SECTOR_LABELS,
} from '../../lib/institutional/labels';
import { ROUTES } from '../../lib/routes';

export function InstitutionOverviewPage() {
  const profileQuery = useMyInstitutionProfile();
  const caps = useMyCapabilities();
  const typesQuery = useInstitutionTypes();
  const authoritiesQuery = useAuthorities();
  const orgUnitsQuery = useOrgUnits({ limit: 1 });
  const peopleQuery = usePeople({ limit: 1 });
  const licensesQuery = useLicenses({ limit: 5 });
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inst = profileQuery.data ?? null;
  const canClassify = caps.data?.role === 'OWNER'; // contract §2: PATCH is OWNER

  const sectorOptions = (typesQuery.data ?? []).map((t) => ({ value: t.sector, label: SECTOR_LABELS[t.sector] }));
  const kindOptions = (typesQuery.data ?? [])
    .filter((t) => !inst?.sector || t.sector === inst?.sector)
    .map((t) => ({ value: t.code, label: t.nameAr }));
  const authorityOptions = (authoritiesQuery.data ?? []).map((a) => ({ value: a.code, label: a.nameAr }));

  const fields: InstField[] = [
    { kind: 'select', name: 'sector', label: 'القطاع', options: sectorOptions, hint: 'قطاع التعليم العالي والبحث العلمي أو قطاع التعليم التقني والفني والمهني.' },
    { kind: 'select', name: 'kindCode', label: 'نوع المؤسسة', options: kindOptions, hint: 'يعتمد القسم المتاح في مساحة العمل على نوع مؤسستك.' },
    {
      kind: 'select', name: 'ownership', label: 'الملكية', options: [
        { value: 'PUBLIC', label: OWNERSHIP_LABELS.PUBLIC },
        { value: 'PRIVATE', label: OWNERSHIP_LABELS.PRIVATE },
        { value: 'OPEN', label: OWNERSHIP_LABELS.OPEN },
        { value: 'MIXED', label: OWNERSHIP_LABELS.MIXED },
        { value: 'INTERNATIONAL', label: OWNERSHIP_LABELS.INTERNATIONAL },
        { value: 'OTHER', label: OWNERSHIP_LABELS.OTHER },
      ],
    },
    { kind: 'select', name: 'supervisingAuthorityCode', label: 'الجهة المشرفة/المانحة', options: authorityOptions },
    { kind: 'text', name: 'establishmentDecisionNumber', label: 'رقم قرار الإنشاء', maxLength: 80 },
    { kind: 'date', name: 'establishmentDecisionDate', label: 'تاريخ قرار الإنشاء' },
  ];

  const openEdit = () => {
    setFormError(null);
    setEditOpen(true);
  };

  const submit = async (values: InstFormValues): Promise<string | void> => {
    if (!inst) return 'لا يوجد سياق مؤسسة.';
    setBusy(true);
    try {
      await instApi.updateInstitutionClassification(inst.id, {
        sector: values.sector as never,
        kindCode: values.kindCode as string | undefined,
        ownership: values.ownership as never,
        supervisingAuthorityCode: values.supervisingAuthorityCode as string | undefined,
        establishmentDecisionNumber: values.establishmentDecisionNumber as string | undefined,
        establishmentDecisionDate: values.establishmentDecisionDate as string | undefined,
      });
      await qc.invalidateQueries({ queryKey: ['inst', 'profile'] });
      toast.success('حُدِّثت البيانات التصنيفية للمؤسسة');
      setEditOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر تحديث التصنيف.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title="نظرة عامة على المؤسسة"
        eyebrow="مساحة العمل المؤسسية"
        description="الهوية القانونية والتشغيلية لمؤسستك — منفصلة عن هوية منصّة أُلارا التعريفية."
        meta={inst ? <EnumChip value={inst.status} labels={INSTITUTION_STATUS_LABELS} /> : null}
      />

      <InstStates
        isLoading={profileQuery.isLoading}
        error={profileQuery.error}
        isEmpty={!inst}
        empty={<></>}
      >
        {inst && (
          <>
            {/* R359 final · W3 — the overview facts ride the KPI band
             * (hairline-divided strip, mono indices, honest-empty «—»
             * while the counts load; each cell opens its register). */}
            <KpiBand
              items={[
                {
                  index: '01',
                  caption: 'ORG UNITS',
                  label: 'الوحدات التنظيمية',
                  value: orgUnitsQuery.data?.meta?.total ?? 0,
                  empty: orgUnitsQuery.data == null,
                  to: ROUTES.institutionOrganization,
                },
                {
                  index: '02',
                  caption: 'PEOPLE',
                  label: 'أفراد الدليل',
                  value: peopleQuery.data?.meta?.total ?? 0,
                  empty: peopleQuery.data == null,
                  to: ROUTES.institutionPeople,
                },
                {
                  index: '03',
                  caption: 'LICENSE RECORDS',
                  label: 'سجلات الترخيص (الأحدث)',
                  value: licensesQuery.data?.meta?.total ?? 0,
                  empty: licensesQuery.data == null,
                  to: ROUTES.institutionLicenses,
                },
              ]}
            />

            <InstSection
              index="01"
              caption="LEGAL IDENTITY"
              title="الهوية القانونية"
              description="التصنيف القانوني للمؤسسة كما تعيده الخدمة — لا تُخترع أي قيم في الواجهة."
              actions={canClassify ? (
                <button type="button" className="btn primary sm" onClick={openEdit}>
                  تعديل التصنيف
                </button>
              ) : (
                <span className="inst-cap-note">
                  تعديل التصنيف من صلاحيات <b>مالك المنصّة</b> فقط.
                </span>
              )}
            >
              <DetailList
                items={[
                  { label: 'اسم المؤسسة', value: inst.name },
                  { label: 'الاسم بالإنجليزية', value: inst.nameEn },
                  { label: 'القطاع', value: inst.sector ? SECTOR_LABELS[inst.sector] : null },
                  { label: 'نوع المؤسسة', value: inst.kind?.nameAr ?? null },
                  { label: 'الملكية', value: inst.ownership ? OWNERSHIP_LABELS[inst.ownership] : null },
                  { label: 'الجهة المشرفة/المانحة', value: inst.supervisingAuthority?.nameAr ?? null },
                  { label: 'رقم قرار الإنشاء', value: inst.establishmentDecisionNumber ?? null },
                  {
                    label: 'تاريخ قرار الإنشاء',
                    value: inst.establishmentDecisionDate ? formatDate(inst.establishmentDecisionDate) : null,
                  },
                  { label: 'الحالة الراهنة', value: <EnumChip value={inst.status} labels={INSTITUTION_STATUS_LABELS} /> },
                ]}
              />
            </InstSection>

            <InstSection
              index="02"
              caption="LICENSES"
              title="التراخيص وأذون المزاولة"
              description="أحدث سجلات الترخيص لدى الجهات المانحة — التفاصيل الكاملة في قسم التراخيص والتفتيش."
              actions={<Link className="btn ghost sm" to={ROUTES.institutionLicenses}>عرض الكل</Link>}
            >
              <InstStates
                isLoading={licensesQuery.isLoading}
                error={licensesQuery.error}
                isEmpty={(licensesQuery.data?.data ?? []).length === 0}
              >
                <DetailList
                  items={(licensesQuery.data?.data ?? []).map((l) => ({
                    label: LICENSE_KIND_LABELS[l.kind] ?? l.kind,
                    value: (
                      <span className="inst-actions">
                        <StatusFlag value={l.status} labels={LICENSE_STATUS_LABELS} />
                        {l.expiresAt && (
                          <span className="inst-masthead-kind">
                            ينتهي {formatDate(l.expiresAt)}
                          </span>
                        )}
                      </span>
                    ),
                  }))}
                />
              </InstStates>
            </InstSection>
          </>
        )}
      </InstStates>

      <InstFormDialog
        open={editOpen}
        title="تعديل البيانات التصنيفية"
        description="تُطبَّق القيود على الخادم: توافق النوع مع القطاع، ومنع الحلقات في التبعية."
        fields={fields}
        submitLabel="حفظ التصنيف"
        busy={busy}
        serverError={formError}
        onCancel={() => setEditOpen(false)}
        onSubmit={submit}
      />
    </PageFrame>
  );
}
