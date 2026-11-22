/**
 * r352 §J — physical laboratories, workshops & resources: PHYSICAL
 * facilities (never the platform's virtual labs), equipment with
 * condition/status, maintenance work orders, reservations, and safety
 * incidents — with filters and dedicated detail routes.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { serverError,
  DetailList, EnumChip, InstFilters, InstFormDialog, InstPagedTable, InstSection,
  InstStates, InstSelect, type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useEquipment, useFacilities, useFacility, useMyCapabilities,
  useOrgUnitTree, useReservations, useSafetyIncidents, useWorkOrders, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  EQUIPMENT_CONDITION_LABELS, EQUIPMENT_STATUS_LABELS, FACILITY_STATUS_LABELS,
  FACILITY_TYPE_LABELS, INCIDENT_KIND_LABELS, INCIDENT_SEVERITY_LABELS,
  RESERVATION_STATUS_LABELS, WORK_ORDER_KIND_LABELS, WORK_ORDER_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { Equipment, Facility } from '../../lib/institutional/types';
import { flattenUnits } from './PeoplePage';

const FAC_UNIT: [string, string, string, string] = ['منشأة واحدة', 'منشأتان', 'منشآت', 'منشأة'];
const EQ_UNIT: [string, string, string, string] = ['جهازًا واحدًا', 'جهازين', 'أجهزة', 'جهاز'];

export function InstitutionFacilitiesPage() {
  const navigate = useNavigate();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('FACILITIES_MANAGE') ?? false;

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [eqStatus, setEqStatus] = useState('');
  const [page, setPage] = useState(1);
  const [eqPage, setEqPage] = useState(1);

  const facilitiesQuery = useFacilities({ type: type || undefined, status: status || undefined, page, limit: 10 });
  const equipmentQuery = useEquipment({ status: eqStatus || undefined, page: eqPage, limit: 10 });
  const treeQuery = useOrgUnitTree();
  const mutations = useInstActions(['facilities'], {
    create: (i: Parameters<typeof instApi.createFacility>[0]) => instApi.createFacility(i),
  });

  const [facOpen, setFacOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const unitOptions = (treeQuery.data ? flattenUnits(treeQuery.data) : [])
    .map((u) => ({ value: u.id, label: u.nameAr }));

  const facFields: InstField[] = [
    { kind: 'text', name: 'nameAr', label: 'اسم المنشأة', required: true, maxLength: 160 },
    {
      kind: 'select', name: 'type', label: 'النوع', required: true,
      options: Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'text', name: 'code', label: 'الرمز', maxLength: 40 },
    { kind: 'select', name: 'orgUnitId', label: 'الوحدة المسؤولة', options: unitOptions },
    { kind: 'text', name: 'building', label: 'المبنى', maxLength: 80 },
    { kind: 'text', name: 'room', label: 'القاعة/الغرفة', maxLength: 80 },
    { kind: 'number', name: 'capacity', label: 'السعة', min: 1, max: 2000 },
    { kind: 'textarea', name: 'safetyNotes', label: 'ملاحظات السلامة', rows: 2, maxLength: 400 },
  ];

  const submit = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.create({
        nameAr: values.nameAr as string,
        type: String(values.type),
        code: values.code as string | undefined,
        orgUnitId: values.orgUnitId as string | undefined,
        building: values.building as string | undefined,
        room: values.room as string | undefined,
        capacity: values.capacity as number | undefined,
        safetyNotes: values.safetyNotes as string | undefined,
      });
      toast.success('أُضيفت المنشأة');
      setFacOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّرت الإضافة.');
    } finally {
      setBusy(false);
    }
  };

  const facColumns: Array<InstColumn<Facility>> = [
    { head: 'المنشأة', cell: (f) => <span className="inst-tree-name">{f.nameAr}</span> },
    { head: 'النوع', cell: (f) => FACILITY_TYPE_LABELS[f.type] },
    { head: 'الوحدة', cell: (f) => f.orgUnit?.nameAr ?? '—' },
    { head: 'الموقع', mobileHidden: true, cell: (f) => [f.building, f.room].filter(Boolean).join(' · ') || '—' },
    { head: 'الأجهزة', mobileHidden: true, cell: (f) => <span className="font-mono">{f._count?.equipment ?? '—'}</span> },
    { head: 'الحالة', cell: (f) => <EnumChip value={f.status} labels={FACILITY_STATUS_LABELS} /> },
  ];

  const eqColumns: Array<InstColumn<Equipment>> = [
    { head: 'الجهاز', cell: (e) => <span className="inst-tree-name">{e.nameAr}</span> },
    { head: 'الفئة', cell: (e) => e.category ?? '—' },
    { head: 'المنشأة', mobileHidden: true, cell: (e) => e.facility?.nameAr ?? '—' },
    { head: 'الحالة', cell: (e) => <EnumChip value={e.status} labels={EQUIPMENT_STATUS_LABELS} /> },
    { head: 'الصيانة/الحالة الفنية', cell: (e) => <EnumChip value={e.condition} labels={EQUIPMENT_CONDITION_LABELS} /> },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="المعامل والورش والموارد"
        eyebrow="مساحة العمل المؤسسية"
        description="المنشآت المادية — معامل وورش وقاعات تدريب عملي — وأجهزتها ومعداتها، وأوامر الصيانة، والحجوزات، وسجلات السلامة. مستقلة عن المعامل الافتراضية في منصة التعلم."
        meta={canManage ? (
          <button type="button" className="btn primary sm" onClick={() => setFacOpen(true)}>
            <Icon icon={Plus} size={14} /> منشأة جديدة
          </button>
        ) : null}
      />

      <InstSection title="١ · المنشآت">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بالنوع"
            anyLabel="كل الأنواع"
            value={type}
            onChange={(v) => { setType(v); setPage(1); }}
            options={Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <InstSelect
            ariaLabel="تصفية بالحالة"
            anyLabel="كل الحالات"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={Object.entries(FACILITY_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        <InstPagedTable
          query={facilitiesQuery}
          columns={facColumns}
          rowKey={(f) => f.id}
          ariaLabel="قائمة المنشآت"
          unit={FAC_UNIT}
          onPage={setPage}
          onRowClick={(f) => navigate(`/institution/facilities/${f.id}`)}
        />
      </InstSection>

      <InstSection title="٢ · الأجهزة والمعدات" description="جرد الأصول وحالتها الفنية ومسؤوليها.">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بحالة الجهاز"
            anyLabel="كل الحالات"
            value={eqStatus}
            onChange={(v) => { setEqStatus(v); setEqPage(1); }}
            options={Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        <InstPagedTable
          query={equipmentQuery}
          columns={eqColumns}
          rowKey={(e) => e.id}
          ariaLabel="قائمة الأجهزة"
          unit={EQ_UNIT}
          onPage={setEqPage}
        />
      </InstSection>

      <InstFormDialog open={facOpen} title="منشأة مادية جديدة" fields={facFields} submitLabel="إضافة" busy={busy} wide onCancel={() => setFacOpen(false)} onSubmit={submit} />
    </PageFrame>
  );
}

/* ── facility detail (/institution/facilities/:id) ───────────────── */

export function InstitutionFacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('FACILITIES_MANAGE') ?? false;

  const facilityQuery = useFacility(id ?? null);
  const equipmentQuery = useEquipment({ facilityId: id ?? undefined, limit: 50 });
  const workOrdersQuery = useWorkOrders({ limit: 50 });
  const reservationsQuery = useReservations({ facilityId: id ?? undefined, limit: 20 });
  const incidentsQuery = useSafetyIncidents({ limit: 20 });

  const workOrderMutations = useInstActions(['work-orders'], {
    create: (i: Parameters<typeof instApi.createWorkOrder>[0]) => instApi.createWorkOrder(i),
  });
  const reservationMutations = useInstActions(['reservations'], {
    create: (i: Parameters<typeof instApi.createReservation>[0]) => instApi.createReservation(i),
    update: (i: { id: string; status: string }) => instApi.updateReservation(i.id, { status: i.status }),
  });
  const incidentMutations = useInstActions(['safety-incidents'], {
    create: (i: Parameters<typeof instApi.createSafetyIncident>[0]) => instApi.createSafetyIncident(i),
  });

  const [woOpen, setWoOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const facility = facilityQuery.data;
  const workOrders = (workOrdersQuery.data?.data ?? []).filter(
    (w) => !facility || w.facilityId === facility.id,
  );
  const incidents = (incidentsQuery.data?.data ?? []).filter(
    (i) => !facility || i.facilityId === facility.id,
  );

  const woFields: InstField[] = [
    { kind: 'text', name: 'titleAr', label: 'عنوان أمر العمل', required: true, maxLength: 160 },
    {
      kind: 'select', name: 'kind', label: 'النوع', required: true,
      options: Object.entries(WORK_ORDER_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'textarea', name: 'description', label: 'الوصف', rows: 2, maxLength: 500 },
    { kind: 'date', name: 'scheduledDate', label: 'التاريخ المخطط' },
  ];

  const resFields: InstField[] = [
    { kind: 'text', name: 'purpose', label: 'الغرض من الحجز', required: true, maxLength: 160 },
    { kind: 'date', name: 'startsAt', label: 'من', required: true },
    { kind: 'date', name: 'endsAt', label: 'إلى', required: true },
  ];

  const incidentFields: InstField[] = [
    {
      kind: 'select', name: 'kind', label: 'النوع', required: true,
      options: Object.entries(INCIDENT_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      kind: 'select', name: 'severity', label: 'الخطورة',
      options: Object.entries(INCIDENT_SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'text', name: 'titleAr', label: 'العنوان', required: true, maxLength: 160 },
    { kind: 'textarea', name: 'description', label: 'التفصيل', rows: 2, maxLength: 500 },
    { kind: 'date', name: 'occurredAt', label: 'تاريخ الحدث', required: true },
  ];

  const submitWo = async (values: InstFormValues): Promise<string | void> => {
    if (!facility) return;
    setBusy(true);
    try {
      await workOrderMutations.create({
        titleAr: values.titleAr as string,
        kind: String(values.kind),
        facilityId: facility.id,
        description: values.description as string | undefined,
        scheduledDate: values.scheduledDate as string | undefined,
      });
      toast.success('أُنشئ أمر العمل');
      setWoOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر الإنشاء.');
    } finally {
      setBusy(false);
    }
  };

  const submitRes = async (values: InstFormValues): Promise<string | void> => {
    if (!facility) return;
    setBusy(true);
    try {
      await reservationMutations.create({
        facilityId: facility.id,
        purpose: values.purpose as string,
        startsAt: values.startsAt as string,
        endsAt: values.endsAt as string,
      });
      toast.success('طُلب الحجز');
      setResOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر الحجز (تحقق من عدم التداخل).');
    } finally {
      setBusy(false);
    }
  };

  const submitIncident = async (values: InstFormValues): Promise<string | void> => {
    if (!facility) return;
    setBusy(true);
    try {
      await incidentMutations.create({
        kind: String(values.kind),
        severity: values.severity as string | undefined,
        titleAr: values.titleAr as string,
        description: values.description as string | undefined,
        facilityId: facility.id,
        occurredAt: values.occurredAt as string,
      });
      toast.success('سُجِّل الحدث');
      setIncidentOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const advanceReservation = async (resId: string, next: string) => {
    setBusy(true);
    try {
      await reservationMutations.update({ id: resId, status: next });
      toast.success('حُدِّث الحجز');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={facility?.nameAr ?? 'تفاصيل المنشأة'}
        eyebrow="المعامل والموارد"
        description={facility ? FACILITY_TYPE_LABELS[facility.type] : undefined}
        meta={facility ? <EnumChip value={facility.status} labels={FACILITY_STATUS_LABELS} /> : null}
        breadcrumbs={[{ label: 'المعامل والموارد', to: '/institution/facilities' }]}
      />
      <InstStates isLoading={facilityQuery.isLoading} error={facilityQuery.error} isEmpty={!facility}>
        {facility && (
          <>
            <InstSection title="بيانات المنشأة">
              <DetailList
                items={[
                  { label: 'الوحدة المسؤولة', value: facility.orgUnit?.nameAr ?? null },
                  { label: 'المبنى/القاعة', value: [facility.building, facility.room].filter(Boolean).join(' · ') || null },
                  { label: 'السعة', value: facility.capacity ?? null },
                  { label: 'ملاحظات السلامة', value: facility.safetyNotes ?? null },
                ]}
              />
            </InstSection>

            <InstSection title="أجهزة المنشأة">
              <InstStates
                isLoading={equipmentQuery.isLoading}
                error={equipmentQuery.error}
                isEmpty={(equipmentQuery.data?.data ?? []).length === 0}
              >
                <DetailList
                  items={(equipmentQuery.data?.data ?? []).map((e) => ({
                    label: e.nameAr,
                    value: (
                      <span className="inst-actions">
                        <EnumChip value={e.status} labels={EQUIPMENT_STATUS_LABELS} />
                        <EnumChip value={e.condition} labels={EQUIPMENT_CONDITION_LABELS} />
                        {e.responsiblePerson && <span className="inst-tree-kind">{e.responsiblePerson.fullNameAr}</span>}
                      </span>
                    ),
                  }))}
                />
              </InstStates>
            </InstSection>

            <InstSection
              title="أوامر الصيانة"
              description="الصيانة الوقائية والتصحيحية وتفتيش السلامة والتركيب."
              actions={canManage ? (
                <button type="button" className="btn ghost sm" onClick={() => setWoOpen(true)}>
                  <Icon icon={Plus} size={14} /> أمر عمل
                </button>
              ) : null}
            >
              {workOrders.length === 0 ? (
                <p className="inst-section-desc">لا أوامر صيانة مسجلة لهذه المنشأة.</p>
              ) : (
                <DetailList
                  items={workOrders.map((w) => ({
                    label: w.titleAr,
                    value: (
                      <span className="inst-actions">
                        <EnumChip value={w.status} labels={WORK_ORDER_STATUS_LABELS} />
                        <span className="inst-tree-kind">{WORK_ORDER_KIND_LABELS[w.kind]}</span>
                        {w.scheduledDate && <span className="inst-tree-kind">{formatDate(w.scheduledDate)}</span>}
                      </span>
                    ),
                  }))}
                />
              )}
            </InstSection>

            <InstSection
              title="الحجوزات"
              actions={
                <button type="button" className="btn ghost sm" onClick={() => setResOpen(true)}>
                  <Icon icon={Plus} size={14} /> طلب حجز
                </button>
              }
            >
              <InstStates
                isLoading={reservationsQuery.isLoading}
                error={reservationsQuery.error}
                isEmpty={(reservationsQuery.data?.data ?? []).length === 0}
              >
                <DetailList
                  items={(reservationsQuery.data?.data ?? []).map((r) => ({
                    label: r.purpose,
                    value: (
                      <span className="inst-actions">
                        <EnumChip value={r.status} labels={RESERVATION_STATUS_LABELS} />
                        <span className="inst-tree-kind">{formatDate(r.startsAt)} ← {formatDate(r.endsAt)}</span>
                        {canManage && r.status === 'REQUESTED' && (
                          <>
                            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceReservation(r.id, 'APPROVED')}>اعتماد</button>
                            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceReservation(r.id, 'REJECTED')}>رفض</button>
                          </>
                        )}
                      </span>
                    ),
                  }))}
                />
              </InstStates>
            </InstSection>

            <InstSection
              title="سجلات السلامة والحوادث"
              actions={canManage ? (
                <button type="button" className="btn ghost sm" onClick={() => setIncidentOpen(true)}>
                  <Icon icon={Plus} size={14} /> تسجيل حدث
                </button>
              ) : null}
            >
              {incidents.length === 0 ? (
                <p className="inst-section-desc">لا سجلات سلامة لهذه المنشأة.</p>
              ) : (
                <DetailList
                  items={incidents.map((i) => ({
                    label: i.titleAr,
                    value: (
                      <span className="inst-actions">
                        <span className="inst-tree-kind">{INCIDENT_KIND_LABELS[i.kind]}</span>
                        {i.severity && <EnumChip value={i.severity} labels={INCIDENT_SEVERITY_LABELS} />}
                        <span className="inst-tree-kind">{formatDate(i.occurredAt)}</span>
                      </span>
                    ),
                  }))}
                />
              )}
            </InstSection>
          </>
        )}
      </InstStates>

      <InstFormDialog open={woOpen} title="أمر صيانة جديد" fields={woFields} submitLabel="إنشاء" busy={busy} onCancel={() => setWoOpen(false)} onSubmit={submitWo} />
      <InstFormDialog open={resOpen} title="طلب حجز المنشأة" fields={resFields} submitLabel="طلب" busy={busy} onCancel={() => setResOpen(false)} onSubmit={submitRes} />
      <InstFormDialog open={incidentOpen} title="تسجيل حادث/تفتيش سلامة" fields={incidentFields} submitLabel="تسجيل" busy={busy} onCancel={() => setIncidentOpen(false)} onSubmit={submitIncident} />
    </PageFrame>
  );
}
