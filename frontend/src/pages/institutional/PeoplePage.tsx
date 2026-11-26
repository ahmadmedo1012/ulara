/**
 * r352 §C — the people directory: staff categories rendered as the
 * DISTINCT statutory families (Law 21/2023 م2) — never one
 * undifferentiated "users" table. The category filter reads the
 * API's own param; the detail route shows the person's multiple
 * institutional responsibilities (appointments + unit grants) kept
 * clearly apart from their platform login role.
 */
import {
  useState, useParams, Plus,
  PageFrame, PageHeader, toast, formatDate, Icon,
  serverError, DetailList, EnumChip, InstFilters, InstFormDialog,
  InstSection, InstStates, InstSelect,
  type InstField, type InstFormValues,
} from './scaffold';
/* R359 (W2-e): the directory rides the sheet grammar — the KpiBand
 * facts, the framed PEOPLE register (the DataSheet with mono staff
 * numbers, cell-stack identity, flat sg-flag statuses) and the
 * person's own row links to the detail route. */
import { Link } from 'react-router-dom';
import { KpiBand, SheetSection, SheetEmpty, DataSheet, type DataSheetColumn } from '../../components/patterns';
import { StatusFlag, rowToneFromStatus } from '../../components/institutional/kit';
import { TablePaginationFooter } from '../admin/TablePaginationFooter';
import { useInstitutionScope } from '../../stores/auth.store';
import {
  useMyCapabilities, useOrgUnitTree, usePeople, usePerson, useInstActions,
} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  APPOINTMENT_STATUS_LABELS, ORG_UNIT_TYPE_LABELS,
  CAPABILITY_LABELS, STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS,
} from '../../lib/institutional/labels';
import { activeUnitOptions } from '../../lib/institutional/orgUnitOptions';
import type { Person } from '../../lib/institutional/types';

/** The person form's field set — one home for the create dialog and
 *  the person-detail edit dialog (was a literal twin, jscpd-counted).
 *  The unit options arrive as a parameter: the list page and the
 *  detail page each own their own tree query. */
const personFormFields = (
  unitOptions: Array<{ value: string; label: string }>,
): InstField[] => [
  { kind: 'text', name: 'fullNameAr', label: 'الاسم الكامل (بالعربية)', required: true, maxLength: 160 },
  { kind: 'text', name: 'fullNameEn', label: 'الاسم بالإنجليزية', maxLength: 160 },
  {
    kind: 'select', name: 'category', label: 'الفئة', required: true,
    options: Object.entries(STAFF_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  },
  { kind: 'text', name: 'staffNumber', label: 'الرقم الوظيفي', maxLength: 40, hint: 'اختياري — يجب أن يكون فريدًا داخل المؤسسة.' },
  { kind: 'select', name: 'primaryOrgUnitId', label: 'الوحدة الأساسية', options: unitOptions },
  { kind: 'date', name: 'hiredAt', label: 'تاريخ التعيين' },
  { kind: 'text', name: 'email', label: 'البريد الإلكتروني', maxLength: 160 },
  { kind: 'text', name: 'phone', label: 'الهاتف', maxLength: 40 },
];

/** Form values → the person write input — shared by the create body
 *  and the update input object (was a literal twin). */
const personInput = (values: InstFormValues) => ({
  fullNameAr: values.fullNameAr as string,
  fullNameEn: values.fullNameEn as string | undefined,
  category: values.category as never,
  staffNumber: values.staffNumber as string | undefined,
  primaryOrgUnitId: (values.primaryOrgUnitId as string | undefined) ?? null,
  hiredAt: values.hiredAt as string | undefined,
  email: values.email as string | undefined,
  phone: values.phone as string | undefined,
});

/** The statutory families — one filter vocabulary, never one flat table. */
const CATEGORY_TABS: Array<{ value: string; label: string }> = [
  { value: 'ACADEMIC_STAFF', label: 'أعضاء هيئة التدريس' },
  { value: 'TEACHING_ASSISTANT', label: 'المعيدون' },
  { value: 'TRAINER', label: 'المدربون' },
  { value: 'ASSISTANT_TRAINER', label: 'مساعدو المدربين' },
  { value: 'TEACHER', label: 'المعلمون' },
  { value: 'TECHNICAL_GUIDE', label: 'الموجهون الفنيون' },
  { value: 'ADMINISTRATIVE_STAFF', label: 'الموظفون' },
  { value: 'TECHNICIAN', label: 'الفنيون' },
  { value: 'PROFESSIONAL', label: 'المهنيون' },
  { value: 'OTHER', label: 'أخرى' },
];

const PERSON_UNIT: [string, string, string, string] = ['فرد واحد', 'فردان', 'أفراد', 'فرد'];

export function InstitutionPeoplePage() {
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PEOPLE_MANAGE') ?? false;
  const scope = useInstitutionScope();

  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const peopleQuery = usePeople({
    category: category || undefined,
    status: status || undefined,
    q: search || undefined,
    page,
    limit: 20,
  });
  const treeQuery = useOrgUnitTree();
  const mutations = useInstActions(['people'], {
    create: (i: Parameters<typeof instApi.createPerson>[0]) => instApi.createPerson(i),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const unitOptions = activeUnitOptions(treeQuery.data);

  const fields: InstField[] = personFormFields(unitOptions);

  const submit = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.create(personInput(values));
      toast.success('أُضيف الفرد إلى الدليل');
      setFormOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إضافة الفرد.');
    } finally {
      setBusy(false);
    }
  };

  /* R359 (W2-e) — the register columns: the name is the row's link to
   * the person's file (the old row-click becomes a real anchor), the
   * category rides the sub line, statuses ride the flat flag, the
   * staff number is the mono datum. */
  const columns: DataSheetColumn<Person>[] = [
    {
      key: 'name',
      label: 'الاسم',
      render: (p) => (
        <Link to={`/institution/people/${p.id}`} className="sg-cell-title">{p.fullNameAr}</Link>
      ),
    },
    {
      key: 'category',
      label: 'الفئة',
      render: (p) => (
        <span className="sg-cell-stack">
          <span>{STAFF_CATEGORY_LABELS[p.category] ?? p.category}</span>
          <span className="sg-cell-sub">دليل الكادر المؤسسي</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (p) => <StatusFlag value={p.staffStatus} labels={STAFF_STATUS_LABELS} />,
    },
    {
      key: 'staffNumber',
      label: 'الرقم الوظيفي',
      mono: true,
      render: (p) => (p.staffNumber ? <bdi>{p.staffNumber}</bdi> : '—'),
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="الأفراد والكوادر"
        eyebrow="مساحة العمل المؤسسية"
        description="دليل الكادر التعليمي والوظيفي حسب الفئات القانونية — عضو هيئة التدريس، المعيد، المدرب، مساعد المدرب، المعلم، الموجه الفني، الموظف، الفني، المهني."
        meta={canManage ? (
          <button type="button" className="btn primary sm" onClick={() => setFormOpen(true)}>
            <Icon icon={Plus} size={14} /> إضافة فرد
          </button>
        ) : null}
      />

      {/* R359 (W2-e) — the KPI band: the real counts from the paged
          payload + the unit options the form offers; honest-empty ('—')
          while pending. No institution context → no band (the honest
          select-institution state below speaks for the page). */}
      {scope !== null && (
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'PEOPLE',
              label: 'الأفراد المسجّلون (الاستعلام الحالي)',
              value: peopleQuery.data?.meta.total ?? 0,
              empty: peopleQuery.data == null,
            },
            {
              index: '02',
              caption: 'RESULTS',
              label: 'نتائج الصفحة الحاليّة',
              value: peopleQuery.data?.data.length ?? 0,
              empty: peopleQuery.data == null,
            },
            {
              index: '03',
              caption: 'ORG UNITS',
              label: 'الوحدات التنظيمية النشطة',
              value: unitOptions.length,
              empty: treeQuery.data == null,
            },
          ]}
        />
      )}

      <InstFilters search={search} onSearch={(v) => { setSearch(v); setPage(1); }}>
        <InstSelect
          ariaLabel="تصفية بالفئة"
          anyLabel="كل الفئات"
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          options={CATEGORY_TABS}
        />
        <InstSelect
          ariaLabel="تصفية بالحالة"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(STAFF_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      {/* R359 (W2-e) — the framed register: states + DataSheet + the
          family pagination footer (the same InstStates contract owns
          the context gate, loading, error and empty). */}
      <SheetSection index="01" caption="PEOPLE" title="دليل الأفراد" pad="none">
        <InstStates
          isLoading={peopleQuery.isLoading}
          error={peopleQuery.error}
          isEmpty={(peopleQuery.data?.data ?? []).length === 0}
        >
          <DataSheet
            caption="دليل الأفراد"
            columns={columns}
            rows={peopleQuery.data?.data ?? []}
            rowTone={(p) => rowToneFromStatus(p.staffStatus)}
          />
        </InstStates>
        {peopleQuery.data && peopleQuery.data.meta.totalPages > 1 && (
          <div className="sg-pad-in">
            <TablePaginationFooter
              page={peopleQuery.data.meta.page}
              totalPages={peopleQuery.data.meta.totalPages}
              total={peopleQuery.data.meta.total}
              unit={PERSON_UNIT}
              onPage={setPage}
            />
          </div>
        )}
      </SheetSection>

      <InstFormDialog
        open={formOpen}
        title="إضافة فرد إلى الدليل"
        description="سجل التوظيف المؤسسي — ربط حساب منصة مستقل يتم من قسم الصلاحيات والأدوار."
        fields={fields}
        submitLabel="إضافة"
        busy={busy}
        wide
        onCancel={() => setFormOpen(false)}
        onSubmit={submit}
      />
    </PageFrame>
  );
}

/* ── the person detail route (/institution/people/:id) ───────────── */

export function InstitutionPersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePerson(id ?? null);
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PEOPLE_MANAGE') ?? false;
  const treeQuery = useOrgUnitTree();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const peopleMutations = useInstActions(['people'], {
    setStatus: (i: { id: string; status: string; endedAt?: string }) =>
      instApi.setPersonStatus(i.id, i.status, i.endedAt),
    // The people-editing workflow (the PR handoff's documented
    // follow-up): the directory record is editable — the same field
    // set the create dialog uses, pre-filled from the loaded row.
    update: (i: { id: string; input: Parameters<typeof instApi.updatePerson>[1] }) =>
      instApi.updatePerson(i.id, i.input),
  });

  const person = query.data?.person;
  const appointments = query.data?.appointments ?? [];
  const grants = query.data?.unitCapabilityGrants ?? [];

  const unitOptions = activeUnitOptions(treeQuery.data);

  const editFields: InstField[] = personFormFields(unitOptions);

  const submitEdit = async (values: InstFormValues): Promise<string | void> => {
    if (!person) return 'لا يوجد سجل محمّل.';
    setBusy(true);
    try {
      await peopleMutations.update({ id: person.id, input: personInput(values) });
      toast.success('حُدِّث سجل الفرد');
      setEditOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر تحديث السجل.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (next: string) => {
    if (!person) return;
    setBusy(true);
    try {
      await peopleMutations.setStatus({
        id: person.id,
        status: next,
        endedAt: next === 'ENDED' ? new Date().toISOString().slice(0, 10) : undefined,
      });
      toast.success('حُدِّثت حالة الفرد');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر تحديث الحالة.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={person?.fullNameAr ?? 'تفاصيل الفرد'}
        eyebrow="دليل الأفراد"
        description="المسؤوليات المؤسسية لهذا الفرد — منفصلة عن دوره في المنصة."
        meta={person ? <StatusFlag value={person.staffStatus} labels={STAFF_STATUS_LABELS} /> : null}
      />
      <InstStates isLoading={query.isLoading} error={query.error} isEmpty={!person}>
        {person && (
          <>
            <InstSection
              title="البيانات الأساسية"
              actions={canManage ? (
                <span className="inst-actions">
                  <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setEditOpen(true)}>تعديل البيانات</button>
                  {person.staffStatus === 'ACTIVE' ? (
                    <>
                      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setStatus('ON_LEAVE')}>إجازة</button>
                      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setStatus('SUSPENDED')}>إيقاف</button>
                      <button type="button" className="btn danger sm" disabled={busy} onClick={() => setStatus('ENDED')}>إنهاء الخدمة</button>
                    </>
                  ) : (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setStatus('ACTIVE')}>إعادة تفعيل</button>
                  )}
                </span>
              ) : null}
            >
              <DetailList
                items={[
                  { label: 'الفئة', value: STAFF_CATEGORY_LABELS[person.category] ?? person.category },
                  { label: 'الرقم الوظيفي', value: person.staffNumber ?? null },
                  { label: 'تاريخ التعيين', value: person.hiredAt ? formatDate(person.hiredAt) : null },
                  { label: 'البريد', value: person.email ?? null },
                  { label: 'الهاتف', value: person.phone ?? null },
                  {
                    label: 'حساب المنصة المرتبط',
                    value: person.userId
                      ? 'مرتبط بحساب — إدارة الدور من قسم الصلاحيات والأدوار'
                      : 'لا يوجد حساب منصة مرتبط',
                  },
                ]}
              />
            </InstSection>

            <InstSection
              title="التعيينات القيادية"
              description="المنصب القانوني/المؤسسي — مستقل عن الرتبة الأكاديمية ودور المنصة."
            >
              {appointments.length === 0 ? (
                <div className="inst-state">
                  <SheetEmpty
                    code="NO APPOINTMENTS"
                    title="لا توجد تعيينات مسجلة لهذا الفرد"
                    desc="المناصب القانونية تُسجَّل من قسم المناصب والتعيينات."
                  />
                </div>
              ) : (
                <DataSheet
                  caption="تعيينات الفرد"
                  columns={[
                    { key: 'since', label: 'منذ', render: (a) => formatDate(a.startDate) },
                    { key: 'until', label: 'حتى', render: (a) => (a.endDate ? formatDate(a.endDate) : '—') },
                    {
                      key: 'status', label: 'الحالة',
                      render: (a) => (
                        <span className="inst-actions">
                          <StatusFlag value={a.status} labels={APPOINTMENT_STATUS_LABELS} />
                          {a.acting && <EnumChip value="SCHEDULED" labels={{ SCHEDULED: 'بالوكالة' }} />}
                        </span>
                      ),
                    },
                    { key: 'decision', label: 'بقرار', mono: true, render: (a) => (a.decisionNumber ? <bdi>{a.decisionNumber}</bdi> : '—') },
                  ]}
                  rows={appointments}
                />
              )}
            </InstSection>

            <InstSection
              title="منح صلاحيات إضافية على وحدات"
              description="منح نطاقها وحدة تنظيمية أو المؤسسة ككل — قدرة واحدة لكل منحة؛ تُدار من قسم الصلاحيات."
            >
              {grants.length === 0 ? (
                <div className="inst-state">
                  <SheetEmpty
                    code="NO GRANTS"
                    title="لا توجد منح صلاحيات إضافية"
                    desc="منح النطاق تُدار من قسم الصلاحيات والأدوار."
                  />
                </div>
              ) : (
                <DetailList
                  items={grants.map((g) => ({
                    label: CAPABILITY_LABELS[g.capability] ?? g.capability,
                    value: g.orgUnit
                      ? `${g.orgUnit.nameAr} (${ORG_UNIT_TYPE_LABELS[g.orgUnit.type] ?? g.orgUnit.type})`
                      : 'على مستوى المؤسسة',
                  }))}
                />
              )}
            </InstSection>
          </>
        )}
      </InstStates>

      {/* The people-editing workflow: pre-filled from the loaded row. */}
      <InstFormDialog
        open={editOpen}
        title={`تعديل سجل: ${person?.fullNameAr ?? ''}`}
        description="تعديل بيانات الدليل — النقاط الإلزامية كما في الإضافة؛ الأخطاء تصل بنص الخادم."
        fields={editFields}
        submitLabel="حفظ التعديلات"
        busy={busy}
        wide
        onCancel={() => setEditOpen(false)}
        onSubmit={submitEdit}
        initialValues={person ? {
          fullNameAr: person.fullNameAr,
          fullNameEn: person.fullNameEn ?? '',
          category: person.category,
          staffNumber: person.staffNumber ?? '',
          primaryOrgUnitId: person.primaryOrgUnitId ?? '',
          hiredAt: person.hiredAt ?? '',
          email: person.email ?? '',
          phone: person.phone ?? '',
        } : undefined}
      />
    </PageFrame>
  );
}
