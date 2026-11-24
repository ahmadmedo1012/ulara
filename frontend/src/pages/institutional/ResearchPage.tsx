/**
 * r352 §K — institutional research: projects with their teams (PI +
 * members with roles and allocations), research outputs
 * (publications/patents/prototypes/…) — integrated beside the
 * existing research-paper lifecycle (the ResearchOutput row carries
 * an optional researchPaperId bridge), never a duplicate paper app.
 */
import {
  useState, useNavigate, useParams, Plus,
  Trash2, PageFrame, PageHeader, toast,
  formatDate, Icon, serverError, DetailList,
  EnumChip, InstFilters, InstFormDialog, InstPagedTable,
  InstSection, InstStates, InstSelect, type InstColumn,
  type InstField, type InstFormValues,
} from './scaffold';
import { KpiBand } from '../../components/patterns';
import {
  useMyCapabilities, useOrgUnitTree, usePeople, useResearchOutputs, useResearchProject, useResearchProjects, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  RESEARCH_MEMBER_ROLE_LABELS, RESEARCH_OUTPUT_LABELS, RESEARCH_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { ResearchOutput, ResearchProject } from '../../lib/institutional/types';
import { flattenUnits } from '../../lib/institutional/orgUnitOptions';

const PROJ_UNIT: [string, string, string, string] = ['مشروعًا واحدًا', 'مشروعين', 'مشاريع', 'مشروع'];
const OUT_UNIT: [string, string, string, string] = ['مخرجًا واحدًا', 'مخرجين', 'مخرجات', 'مخرج'];

const PROJECT_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['APPROVED'],
  APPROVED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'COMPLETED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
};

/** The research endpoints map — one home for the list page and the
 *  project-detail page (was a literal twin, jscpd-counted). */
const researchEndpoints = () => ({
  create: (i: Parameters<typeof instApi.createResearchProject>[0]) => instApi.createResearchProject(i),
  update: (i: { id: string; input: Parameters<typeof instApi.updateResearchProject>[1] }) =>
    instApi.updateResearchProject(i.id, i.input),
  addMember: (i: { projectId: string; input: Parameters<typeof instApi.addResearchMember>[1] }) =>
    instApi.addResearchMember(i.projectId, i.input),
  removeMember: (i: { projectId: string; personId: string }) =>
    instApi.removeResearchMember(i.projectId, i.personId),
  addOutput: (i: Parameters<typeof instApi.createResearchOutput>[0]) => instApi.createResearchOutput(i),
});

export function InstitutionResearchPage() {
  const navigate = useNavigate();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('RESEARCH_PROJECTS_MANAGE') ?? false;

  const [status, setStatus] = useState('');
  const [outType, setOutType] = useState('');
  const [page, setPage] = useState(1);
  const projectsQuery = useResearchProjects({ status: status || undefined, page, limit: 20 });
  const outputsQuery = useResearchOutputs({ type: outType || undefined, page: 1, limit: 10 });
  const treeQuery = useOrgUnitTree();
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const mutations = useInstActions(['research'], researchEndpoints());

  const [projOpen, setProjOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const unitOptions = (treeQuery.data ? flattenUnits(treeQuery.data) : [])
    .map((u) => ({ value: u.id, label: u.nameAr }));
  const peopleOptions = (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr }));

  const projFields: InstField[] = [
    { kind: 'text', name: 'titleAr', label: 'عنوان المشروع', required: true, maxLength: 240 },
    { kind: 'text', name: 'code', label: 'الرمز', maxLength: 40 },
    { kind: 'select', name: 'orgUnitId', label: 'المركز/الوحدة البحثية', options: unitOptions },
    { kind: 'text', name: 'field', label: 'مجال البحث', maxLength: 120 },
    { kind: 'select', name: 'principalInvestigatorId', label: 'الباحث الرئيس', options: peopleOptions },
    { kind: 'date', name: 'startsAt', label: 'تاريخ البدء' },
    { kind: 'date', name: 'endsAt', label: 'تاريخ الانتهاء المتوقع' },
    { kind: 'text', name: 'fundingSource', label: 'مصدر التمويل', maxLength: 160 },
    { kind: 'number', name: 'budget', label: 'الميزانية', min: 0 },
    { kind: 'text', name: 'ethicsApprovalRef', label: 'مرجع الموافقة الأخلاقية', maxLength: 120 },
  ];

  const outFields: InstField[] = [
    {
      kind: 'select', name: 'type', label: 'نوع المخرج', required: true,
      options: Object.entries(RESEARCH_OUTPUT_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'text', name: 'title', label: 'العنوان', required: true, maxLength: 240 },
    { kind: 'select', name: 'projectId', label: 'المشروع', options: [] },
    { kind: 'select', name: 'personId', label: 'الباحث', options: peopleOptions },
    { kind: 'text', name: 'doi', label: 'DOI', maxLength: 120 },
    { kind: 'text', name: 'referenceUrl', label: 'رابط المرجع', maxLength: 300 },
    { kind: 'date', name: 'publishedAt', label: 'تاريخ النشر' },
  ];

  const submitProject = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      const created = await mutations.create({
        titleAr: values.titleAr as string,
        code: values.code as string | undefined,
        orgUnitId: values.orgUnitId as string | undefined,
        field: values.field as string | undefined,
        principalInvestigatorId: values.principalInvestigatorId as string | undefined,
        startsAt: values.startsAt as string | undefined,
        endsAt: values.endsAt as string | undefined,
        fundingSource: values.fundingSource as string | undefined,
        budget: values.budget as number | undefined,
        ethicsApprovalRef: values.ethicsApprovalRef as string | undefined,
      });
      toast.success('سُجِّل المشروع البحثي (مقترح)');
      setProjOpen(false);
      navigate(`/institution/research/${created.id}`);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const submitOutput = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.addOutput({
        type: String(values.type),
        title: values.title as string,
        personId: values.personId as string | undefined,
        doi: values.doi as string | undefined,
        referenceUrl: values.referenceUrl as string | undefined,
        publishedAt: values.publishedAt as string | undefined,
      });
      toast.success('سُجِّل المخرج البحثي');
      setOutOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر التسجيل.');
    } finally {
      setBusy(false);
    }
  };

  const columns: Array<InstColumn<ResearchProject>> = [
    { head: 'المشروع', cell: (p) => <span className="inst-tree-name">{p.titleAr}</span> },
    { head: 'المجال', cell: (p) => p.field ?? '—' },
    { head: 'البداية', cell: (p) => (p.startsAt ? formatDate(p.startsAt) : '—') },
    { head: 'الحالة', cell: (p) => <EnumChip value={p.status} labels={RESEARCH_STATUS_LABELS} /> },
  ];

  const outColumns: Array<InstColumn<ResearchOutput>> = [
    { head: 'المخرج', cell: (o) => <span className="inst-tree-name">{o.title}</span> },
    { head: 'النوع', cell: (o) => RESEARCH_OUTPUT_LABELS[o.type] },
    { head: 'المشروع', cell: (o) => o.project?.titleAr ?? '—' },
    { head: 'النشر', cell: (o) => (o.publishedAt ? formatDate(o.publishedAt) : '—') },
    { head: 'DOI', mobileHidden: true, cell: (o) => <span className="font-mono">{o.doi ?? '—'}</span> },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="البحث العلمي المؤسسي"
        eyebrow="مساحة العمل المؤسسية"
        description="مشاريع مراكز ووحدات البحث وفرقها (الباحث الرئيس والأعضاء ونسب التفرغ)، ومخرجاتها من منشورات وبراءات ونماذج أولية — إلى جانب دورة بحوث المنصة القائمة لا بديلًا عنها."
        meta={canManage ? (
          <span className="inst-actions">
            <button type="button" className="btn ghost sm" onClick={() => setOutOpen(true)}><Icon icon={Plus} size={14} /> مخرج بحثي</button>
            <button type="button" className="btn primary sm" onClick={() => setProjOpen(true)}><Icon icon={Plus} size={14} /> مشروع بحثي</button>
          </span>
        ) : null}
      />

      <InstFilters>
        <InstSelect
          ariaLabel="تصفية بحالة المشروع"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(RESEARCH_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      {/* R359 final · W3 — the research facts ride the KPI band. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'PROJECTS',
            label: 'المشاريع البحثية (الاستعلام الحالي)',
            value: projectsQuery.data?.meta.total ?? 0,
            empty: projectsQuery.data == null,
          },
          {
            index: '02',
            caption: 'OUTPUTS',
            label: 'المخرجات البحثية (الاستعلام الحالي)',
            value: outputsQuery.data?.meta.total ?? 0,
            empty: outputsQuery.data == null,
          },
        ]}
      />

      <InstSection index="01" caption="RESEARCH PROJECTS" title="سجلّ المشاريع البحثية" pad="none">
      <InstPagedTable
        query={projectsQuery}
        columns={columns}
        rowKey={(p) => p.id}
        ariaLabel="المشاريع البحثية"
        unit={PROJ_UNIT}
        onPage={setPage}
        onRowClick={(p) => navigate(`/institution/research/${p.id}`)}
      />
      </InstSection>

      <InstSection index="02" caption="RESEARCH OUTPUTS" title="أحدث المخرجات البحثية" pad="none">
        <div className="sg-pad-in">
        <InstFilters>
          <InstSelect
            ariaLabel="تصفية بنوع المخرج"
            anyLabel="كل الأنواع"
            value={outType}
            onChange={(v) => setOutType(v)}
            options={Object.entries(RESEARCH_OUTPUT_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </InstFilters>
        </div>
        <InstPagedTable
          query={outputsQuery}
          columns={outColumns}
          rowKey={(o) => o.id}
          ariaLabel="المخرجات البحثية"
          unit={OUT_UNIT}
          onPage={() => undefined}
        />
      </InstSection>

      <InstFormDialog open={projOpen} title="مشروع بحثي جديد" fields={projFields} submitLabel="تسجيل" busy={busy} wide onCancel={() => setProjOpen(false)} onSubmit={submitProject} />
      <InstFormDialog open={outOpen} title="مخرج بحثي جديد" fields={outFields} submitLabel="تسجيل" busy={busy} wide onCancel={() => setOutOpen(false)} onSubmit={submitOutput} />
    </PageFrame>
  );
}

/* ── project detail (/institution/research/:id) ──────────────────── */

export function InstitutionResearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('RESEARCH_PROJECTS_MANAGE') ?? false;

  const projectQuery = useResearchProject(id ?? null);
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const mutations = useInstActions(['research'], researchEndpoints());

  const [memberOpen, setMemberOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const project = projectQuery.data;

  const memberFields: InstField[] = [
    { kind: 'select', name: 'personId', label: 'العضو', required: true, options: (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr })) },
    {
      kind: 'select', name: 'role', label: 'الدور في الفريق', required: true,
      options: Object.entries(RESEARCH_MEMBER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'number', name: 'allocationPct', label: 'نسبة التفرغ %', min: 0, max: 100 },
  ];

  const submitMember = async (values: InstFormValues): Promise<string | void> => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.addMember({
        projectId: id,
        input: {
          personId: values.personId as string,
          role: String(values.role),
          allocationPct: values.allocationPct as number | undefined,
        },
      });
      toast.success('أُضيف عضو الفريق');
      setMemberOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّرت الإضافة.');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (personId: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.removeMember({ projectId: id, personId });
      toast.success('أُزيل عضو الفريق');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر الإزالة.'));
    } finally {
      setBusy(false);
    }
  };

  const advance = async (next: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.update({ id, input: { status: next } });
      toast.success('حُدِّثت حالة المشروع');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={project?.titleAr ?? 'المشروع البحثي'}
        eyebrow="البحث العلمي المؤسسي"
        description={project ? `${project.field ?? ''}${project.orgUnit ? ` · ${project.orgUnit.nameAr}` : ''}` : undefined}
        meta={project ? <EnumChip value={project.status} labels={RESEARCH_STATUS_LABELS} /> : null}
        breadcrumbs={[{ label: 'البحث المؤسسي', to: '/institution/research' }]}
      />
      <InstStates isLoading={projectQuery.isLoading} error={projectQuery.error} isEmpty={!project}>
        {project && (
          <>
            <InstSection
              index="01"
              caption="PROJECT"
              title="بيانات المشروع"
              actions={canManage && (
                <span className="inst-actions">
                  {(PROJECT_TRANSITIONS[project.status] ?? []).map((next) => (
                    <button key={next} type="button" className="btn ghost sm" disabled={busy} onClick={() => advance(next)}>
                      {RESEARCH_STATUS_LABELS[next as keyof typeof RESEARCH_STATUS_LABELS]}
                    </button>
                  ))}
                </span>
              )}
            >
              <DetailList
                items={[
                  { label: 'الرمز', value: project.code ?? null },
                  { label: 'الباحث الرئيس', value: project.principalInvestigatorId ?? '—' },
                  { label: 'البدء', value: project.startsAt ? formatDate(project.startsAt) : null },
                  { label: 'الانتهاء', value: project.endsAt ? formatDate(project.endsAt) : null },
                  { label: 'التمويل', value: project.fundingSource ?? null },
                  { label: 'الميزانية', value: project.budget ?? null },
                  { label: 'الموافقة الأخلاقية', value: project.ethicsApprovalRef ?? null },
                ]}
              />
            </InstSection>

            <InstSection
              index="02"
              caption="TEAM"
              title="فريق البحث"
              actions={canManage && (
                <button type="button" className="btn primary sm" onClick={() => setMemberOpen(true)}>
                  <Icon icon={Plus} size={14} /> عضو فريق
                </button>
              )}
            >
              {(project.members ?? []).length === 0 ? (
                <p className="inst-section-desc">لم يُضف فريق بعد.</p>
              ) : (
                <DetailList
                  items={project.members.map((m) => ({
                    label: `${RESEARCH_MEMBER_ROLE_LABELS[m.role]} — ${m.person?.fullNameAr ?? m.personId}`,
                    value: (
                      <span className="inst-actions">
                        {m.allocationPct != null && <span className="inst-tree-kind">تفرغ {m.allocationPct}%</span>}
                        <span className="inst-tree-kind">من {formatDate(m.joinedAt)}</span>
                        {canManage && (
                          <button type="button" className="btn ghost sm" aria-label="إزالة العضو" disabled={busy} onClick={() => removeMember(m.personId)}>
                            <Icon icon={Trash2} size={13} />
                          </button>
                        )}
                      </span>
                    ),
                  }))}
                />
              )}
            </InstSection>
          </>
        )}
      </InstStates>

      <InstFormDialog open={memberOpen} title="إضافة عضو فريق بحثي" fields={memberFields} submitLabel="إضافة" busy={busy} onCancel={() => setMemberOpen(false)} onSubmit={submitMember} />
    </PageFrame>
  );
}
