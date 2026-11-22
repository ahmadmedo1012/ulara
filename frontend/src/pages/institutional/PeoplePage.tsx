/**
 * r352 §C — the people directory: staff categories rendered as the
 * DISTINCT statutory families (Law 21/2023 م2) — never one
 * undifferentiated "users" table. The category filter reads the
 * API's own param; the detail route shows the person's multiple
 * institutional responsibilities (appointments + unit grants) kept
 * clearly apart from their platform login role.
 */
import {
  useState, useNavigate, useParams, Plus,
  PageFrame, PageHeader, toast, formatDate, Icon,
  serverError, DetailList, EnumChip, InstFilters, InstFormDialog, InstPagedTable,
  InstSection, InstStates, InstSelect,
  type InstColumn, type InstField, type InstFormValues,
} from './scaffold';
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
  const navigate = useNavigate();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PEOPLE_MANAGE') ?? false;

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

  const columns: Array<InstColumn<Person>> = [
    { head: 'الاسم', cell: (p) => <span className="inst-tree-name">{p.fullNameAr}</span> },
    { head: 'الفئة', cell: (p) => <span className="inst-tree-kind">{STAFF_CATEGORY_LABELS[p.category] ?? p.category}</span> },
    { head: 'الحالة', cell: (p) => <EnumChip value={p.staffStatus} labels={STAFF_STATUS_LABELS} /> },
    { head: 'الرقم الوظيفي', mobileHidden: true, cell: (p) => <span className="font-mono">{p.staffNumber ?? '—'}</span> },
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

      <InstPagedTable
        query={peopleQuery}
        columns={columns}
        rowKey={(p) => p.id}
        ariaLabel="دليل الأفراد"
        unit={PERSON_UNIT}
        onPage={setPage}
        onRowClick={(p) => navigate(`/institution/people/${p.id}`)}
      />

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
        meta={person ? <EnumChip value={person.staffStatus} labels={STAFF_STATUS_LABELS} /> : null}
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
                <p className="inst-section-desc">لا توجد تعيينات مسجلة لهذا الفرد.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table tbl-stack" aria-label="تعيينات الفرد">
                    <thead>
                      <tr>
                        <th scope="col">منذ</th>
                        <th scope="col">حتى</th>
                        <th scope="col">الحالة</th>
                        <th scope="col">بقرار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.id}>
                          <td data-label="منذ">{formatDate(a.startDate)}</td>
                          <td data-label="حتى">{a.endDate ? formatDate(a.endDate) : '—'}</td>
                          <td data-label="الحالة">
                            <span className="inst-actions">
                              <EnumChip value={a.status} labels={APPOINTMENT_STATUS_LABELS} />
                              {a.acting && <EnumChip value="SCHEDULED" labels={{ SCHEDULED: 'بالوكالة' }} />}
                            </span>
                          </td>
                          <td data-label="بقرار" className="font-mono">{a.decisionNumber ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </InstSection>

            <InstSection
              title="منح صلاحيات إضافية على وحدات"
              description="منح نطاقها وحدة تنظيمية أو المؤسسة ككل — قدرة واحدة لكل منحة؛ تُدار من قسم الصلاحيات."
            >
              {grants.length === 0 ? (
                <p className="inst-section-desc">لا توجد منح صلاحيات إضافية.</p>
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
