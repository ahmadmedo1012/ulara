/**
 * r352 §B — the organizational structure manager: a real hierarchy
 * (18 unit kinds), NOT a forced university→faculty→department shape.
 *
 * Two views: the tree (GET /org-units/tree) and a filterable list.
 * Unit detail (GET /org-units/:id + ancestors) shows the unit's own
 * people / appointments / programs (each via the list endpoints'
 * orgUnitId filter — no invented aggregate endpoint). Write actions
 * (create/edit/status) are ORG_STRUCTURE_MANAGE-gated; invalid parent
 * choices (self + descendants) are prevented client-side as a UX
 * courtesy — the server remains the authority (409 ORG_UNIT_CYCLE).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, List, Network, Pencil, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageFrame, PageHeader, KpiBand } from '../../components/patterns';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import {
  serverError, DetailList, EnumChip, InstConfirm, InstFilters, InstFormDialog, InstPagedTable,
  InstSection, InstSelect, InstStates, InstTable, type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { Icon } from '../../components/Icon';
import {
  useAppointments, useMyCapabilities, useOrgUnit, useOrgUnitTree,
  useOrgUnits, usePeople, usePrograms, useInstActions} from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import {
  APPOINTMENT_STATUS_LABELS, ORG_UNIT_STATUS_LABELS, ORG_UNIT_TYPE_LABELS,
  PROGRAM_STATUS_LABELS, STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { OrgUnit, OrgUnitTreeNode } from '../../lib/institutional/types';

/* ── the tree ───────────────────────────────────────────────────── */

/** Collects a node + every descendant id (invalid parent choices). */
function subtreeIds(node: OrgUnitTreeNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

function flatten(nodes: OrgUnitTreeNode[], out: OrgUnit[] = []): OrgUnit[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children, out);
  }
  return out;
}

function TreeNode({
  node, depth, selectedId, onSelect, canManage, onEdit, onAddChild,
}: {
  node: OrgUnitTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canManage: boolean;
  onEdit: (u: OrgUnit) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="inst-tree-row" style={{ paddingInlineStart: `calc(var(--sp-2-5) + ${depth} * var(--sp-2))` }}>
        {hasChildren ? (
          <button
            type="button"
            className="inst-tree-toggle"
            data-open={open}
            aria-label={open ? `طي ${node.nameAr}` : `توسيع ${node.nameAr}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon icon={ChevronLeft} size={14} />
          </button>
        ) : (
          <span className="inst-tree-toggle" aria-hidden="true" style={{ visibility: 'hidden' }} />
        )}
        <button
          type="button"
          className="inst-tree-node"
          aria-pressed={selectedId === node.id}
          onClick={() => onSelect(node.id)}
        >
          <span className="inst-tree-kind">{ORG_UNIT_TYPE_LABELS[node.type]}</span>
          <span className="inst-tree-name">{node.nameAr}</span>
          <EnumChip value={node.status} labels={ORG_UNIT_STATUS_LABELS} />
        </button>
        {canManage && (
          <>
            <button type="button" className="btn ghost sm" aria-label={`تعديل ${node.nameAr}`} onClick={() => onEdit(node)}>
              <Icon icon={Pencil} size={13} />
            </button>
            <button type="button" className="btn ghost sm" aria-label={`إضافة وحدة تحت ${node.nameAr}`} onClick={() => onAddChild(node.id)}>
              <Icon icon={Plus} size={13} />
            </button>
          </>
        )}
      </div>
      {open && hasChildren && (
        <ul className="inst-tree">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              canManage={canManage}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── the page ───────────────────────────────────────────────────── */

const UNIT_UNIT: [string, string, string, string] = ['وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة'];

export function InstitutionOrganizationPage() {
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('ORG_STRUCTURE_MANAGE') ?? false;

  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const treeQuery = useOrgUnitTree();
  const listQuery = useOrgUnits({
    q: search || undefined, type: typeFilter || undefined,
    status: statusFilter || undefined, page, limit: 20,
  });
  const detailQuery = useOrgUnit(selectedId);
  const peopleQuery = usePeople({ orgUnitId: selectedId ?? undefined, limit: 10 });
  const appointmentsQuery = useAppointments({ orgUnitId: selectedId ?? undefined, limit: 10 });
  const programsQuery = usePrograms({ orgUnitId: selectedId ?? undefined, limit: 10 });

  const mutations = useInstActions(['org-units'], {
    create: (i: Parameters<typeof instApi.createOrgUnit>[0]) => instApi.createOrgUnit(i).then((r) => r.unit),
    update: (i: { id: string; input: Parameters<typeof instApi.updateOrgUnit>[1] }) =>
      instApi.updateOrgUnit(i.id, i.input).then((r) => r.unit),
    setStatus: (i: { id: string; status: string; dissolvedAt?: string }) =>
      instApi.setOrgUnitStatus(i.id, i.status, i.dissolvedAt).then((r) => r.unit),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUnit | null>(null);
  const [presetParent, setPresetParent] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<OrgUnit | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);
  const allUnits = useMemo(() => flatten(tree), [tree]);

  // deep-link ?unit=<id>
  const deepId = searchParams.get('unit');
  const activeId = selectedId ?? deepId ?? null;

  const parentOptions = useMemo(() => {
    const forbidden = new Set<string>(
      editing ? [editing.id, ...allUnits
        .filter((u) => editing && (u.parentId === editing.id))
        .map((u) => u.id)] : [],
    );
    // Descendants of the editing unit can't be parents either — walk the tree.
    if (editing) {
      const find = (nodes: OrgUnitTreeNode[]): OrgUnitTreeNode | null => {
        for (const n of nodes) {
          if (n.id === editing.id) return n;
          const f = find(n.children);
          if (f) return f;
        }
        return null;
      };
      const self = find(tree);
      if (self) for (const id of subtreeIds(self)) forbidden.add(id);
    }
    return allUnits
      .filter((u) => !forbidden.has(u.id) && u.status === 'ACTIVE')
      .map((u) => ({ value: u.id, label: `${ORG_UNIT_TYPE_LABELS[u.type]} — ${u.nameAr}` }));
  }, [allUnits, editing, tree]);

  const unitFormFields = (isEdit: boolean): InstField[] => [
    { kind: 'text', name: 'nameAr', label: 'اسم الوحدة (بالعربية)', required: true, maxLength: 160 },
    { kind: 'text', name: 'nameEn', label: 'الاسم بالإنجليزية', maxLength: 160 },
    {
      kind: 'select', name: 'type', label: 'نوع الوحدة', required: true,
      options: Object.entries(ORG_UNIT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      hint: 'اعرض أنواع الوحدات المتاحة في هيكل مؤسستك — الخادم يتحقق من الملاءمة.',
    },
    { kind: 'text', name: 'code', label: 'الرمز', maxLength: 40, hint: 'اختياري — يجب أن يكون فريدًا داخل المؤسسة.' },
    {
      kind: 'select', name: 'parentId', label: 'الوحدة الأصل',
      options: parentOptions, placeholder: '— بلا أصل (مستوى أعلى) —',
      hint: 'لا يمكن اختيار الوحدة نفسها أو أي وحدة تابعة لها (منع الحلقات).',
    },
    { kind: 'text', name: 'location', label: 'الموقع', maxLength: 120 },
    { kind: 'text', name: 'contactEmail', label: 'بريد التواصل', maxLength: 120 },
    { kind: 'text', name: 'contactPhone', label: 'هاتف التواصل', maxLength: 40 },
    ...(isEdit ? [] : [{ kind: 'number', name: 'sortOrder', label: 'ترتيب العرض', min: 0 } as InstField]),
  ];

  const openCreate = (parentId?: string) => {
    setEditing(null);
    setPresetParent(parentId ?? null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (u: OrgUnit) => {
    setEditing(u);
    setPresetParent(null);
    setFormError(null);
    setFormOpen(true);
  };

  const submitUnit = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      if (editing) {
        await mutations.update({
          id: editing.id,
          input: {
            nameAr: values.nameAr as string,
            nameEn: values.nameEn as string | undefined,
            type: values.type as never,
            code: values.code as string | undefined,
            parentId: (values.parentId as string | undefined) ?? null,
            location: values.location as string | undefined,
            contactEmail: values.contactEmail as string | undefined,
            contactPhone: values.contactPhone as string | undefined,
          },
        });
        toast.success('حُدِّثت الوحدة التنظيمية');
      } else {
        await mutations.create({
          nameAr: values.nameAr as string,
          nameEn: values.nameEn as string | undefined,
          type: values.type as never,
          code: values.code as string | undefined,
          parentId: (values.parentId ?? presetParent) as string | undefined,
          sortOrder: values.sortOrder as number | undefined,
          location: values.location as string | undefined,
          contactEmail: values.contactEmail as string | undefined,
          contactPhone: values.contactPhone as string | undefined,
        });
        toast.success('أُضيفت الوحدة التنظيمية');
      }
      setFormOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر حفظ الوحدة.');
    } finally {
      setBusy(false);
    }
  };


  const listColumns: Array<InstColumn<OrgUnit>> = [
    { head: 'الوحدة', cell: (u) => <span className="inst-tree-name">{u.nameAr}</span> },
    { head: 'النوع', cell: (u) => <span className="inst-tree-kind">{ORG_UNIT_TYPE_LABELS[u.type]}</span> },
    { head: 'الرمز', cell: (u) => <span className="font-mono">{u.code ?? '—'}</span> },
    { head: 'الحالة', cell: (u) => <EnumChip value={u.status} labels={ORG_UNIT_STATUS_LABELS} /> },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (u) => canManage ? (
        <span className="inst-actions">
          <button type="button" className="btn ghost sm" aria-label={`تعديل ${u.nameAr}`} onClick={() => openEdit(u)}>
            <Icon icon={Pencil} size={13} />
          </button>
          <button type="button" className="btn ghost sm" onClick={() => { setStatusTarget(u); setStatusDialogOpen(false); }}>
            تغيير الحالة
          </button>
        </span>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="الهيكل التنظيمي"
        eyebrow="مساحة العمل المؤسسية"
        description="الهرم الفعلي لمؤسستك — كليات وأقسام علمية ومعاهد ومراكز بحثية وإدارات عامة ومكاتب وفروع ووحدات تدريب ومعامل وورش."
        meta={
          <span className="inst-actions">
            <div
              className="inst-tabs"
              role="tablist"
              aria-label="طريقة العرض"
              onKeyDown={(e) => {
                // The WAI-ARIA tabs keyboard contract (RTL-aware: the
                // arrows follow the reading direction — in the RTL
                // document ArrowLeft is "forward"). With two tabs both
                // directions toggle; focus follows the selection.
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                const next = view === 'tree' ? 'list' : 'tree';
                setView(next);
                const target = document.getElementById(
                  next === 'tree' ? 'org-view-tab-tree' : 'org-view-tab-list',
                );
                target?.focus();
              }}
            >
              <button
                type="button"
                id="org-view-tab-tree"
                role="tab"
                aria-selected={view === 'tree'}
                aria-controls="org-view-panel"
                tabIndex={view === 'tree' ? 0 : -1}
                className="inst-tab"
                onClick={() => setView('tree')}
              >
                <Icon icon={Network} size={14} /> شجرة
              </button>
              <button
                type="button"
                id="org-view-tab-list"
                role="tab"
                aria-selected={view === 'list'}
                aria-controls="org-view-panel"
                tabIndex={view === 'list' ? 0 : -1}
                className="inst-tab"
                onClick={() => setView('list')}
              >
                <Icon icon={List} size={14} /> قائمة
              </button>
            </div>
            {canManage && (
              <button type="button" className="btn primary sm" onClick={() => openCreate()}>
                <Icon icon={Plus} size={14} /> وحدة جديدة
              </button>
            )}
          </span>
        }
      />

      {/* R359 final · W3 — the structure facts ride the KPI band
          (honest-empty «—» while the registers load). */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'ORG UNITS',
            label: 'الوحدات التنظيمية (الاستعلام الحالي)',
            value: listQuery.data?.meta.total ?? 0,
            empty: listQuery.data == null,
          },
          {
            index: '02',
            caption: 'UNIT KINDS',
            label: 'أنواع الوحدات المتاحة',
            value: Object.keys(ORG_UNIT_TYPE_LABELS).length,
          },
          {
            index: '03',
            caption: 'ACTIVE',
            label: 'وحدات نشطة في الشجرة',
            value: treeQuery.data ? flatten(tree).filter((u) => u.status === 'ACTIVE').length : 0,
            empty: treeQuery.data == null,
          },
        ]}
      />

      <div
        id="org-view-panel"
        role="tabpanel"
        aria-labelledby={view === 'tree' ? 'org-view-tab-tree' : 'org-view-tab-list'}
        tabIndex={0}
      >
      {view === 'tree' ? (
        <InstSection index="01" caption="UNIT TREE" title="شجرة الهيكل" pad="none">
        <InstStates
          isLoading={treeQuery.isLoading}
          error={treeQuery.error}
          isEmpty={tree.length === 0}
        >
          <ul className="inst-tree" aria-label="شجرة الوحدات التنظيمية (قائمة متداخلة — زر الطي لكل وحدة لها فروع)">
            {tree.map((n) => (
              <TreeNode
                key={n.id}
                node={n}
                depth={0}
                selectedId={activeId}
                onSelect={setSelectedId}
                canManage={canManage}
                onEdit={openEdit}
                onAddChild={openCreate}
              />
            ))}
          </ul>
        </InstStates>
        </InstSection>
      ) : (
        <>
          <InstFilters search={search} onSearch={(v) => { setSearch(v); setPage(1); }}>
            <InstSelect
              ariaLabel="تصفية بالنوع"
              anyLabel="كل الأنواع"
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={Object.entries(ORG_UNIT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <InstSelect
              ariaLabel="تصفية بالحالة"
              anyLabel="كل الحالات"
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={Object.entries(ORG_UNIT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </InstFilters>
          <InstSection index="01" caption="UNIT REGISTER" title="قائمة الوحدات" pad="none">
          <InstPagedTable
            query={listQuery}
            columns={listColumns}
            rowKey={(u) => u.id}
            ariaLabel="قائمة الوحدات التنظيمية"
            unit={UNIT_UNIT}
            onPage={setPage}
            onRowClick={(u) => { setSelectedId(u.id); setView('tree'); }}
          />
          </InstSection>
        </>
      )}
      </div>

      {/* the unit detail panel — R359 final · W3: the flat file
          register; its sub-registers are flat siblings (no nested
          frames — the grammar law). */}
      {activeId && detailQuery.data ? (
        (() => { const detail = detailQuery.data; return (
        <InstSection
          index="02"
          caption="UNIT FILE"
          title={detail.unit.nameAr}
          description={ORG_UNIT_TYPE_LABELS[detail.unit.type]}
          actions={canManage ? (
            <span className="inst-actions">
              <button type="button" className="btn ghost sm" onClick={() => openEdit(detail.unit)}>تعديل</button>
              <button type="button" className="btn ghost sm" onClick={() => { setStatusTarget(detail.unit); setStatusDialogOpen(false); }}>
                تغيير الحالة
              </button>
              <button type="button" className="btn ghost sm" onClick={() => openCreate(detail.unit.id)}>
                <Icon icon={Plus} size={13} /> وحدة تابعة
              </button>
            </span>
          ) : null}
        >
          {detail.ancestors.length > 0 && (
            <p className="inst-crumb" aria-label="مسار الوحدة في الشجرة">
              {detail.ancestors.map((a) => a.nameAr).join(' ← ')}
            </p>
          )}
          <DetailList
            items={[
              { label: 'الحالة', value: <EnumChip value={detail.unit.status} labels={ORG_UNIT_STATUS_LABELS} /> },
              { label: 'الرمز', value: detail.unit.code ?? null },
              { label: 'الموقع', value: detail.unit.location ?? null },
              { label: 'بريد التواصل', value: detail.unit.contactEmail ?? null },
              { label: 'هاتف التواصل', value: detail.unit.contactPhone ?? null },
              { label: 'أُنشئت', value: formatDate(detail.unit.createdAt) },
            ]}
          />
        </InstSection>
        );
        })()
      ) : null}

      {activeId && detailQuery.data ? (
        <>
          <InstSection index="03" caption="STAFF" title="أفراد الوحدة" pad="none">
            <InstStates
              isLoading={peopleQuery.isLoading}
              error={peopleQuery.error}
              isEmpty={(peopleQuery.data?.data ?? []).length === 0}
            >
              <InstTable
                ariaLabel="أفراد الوحدة"
                rows={peopleQuery.data?.data ?? []}
                rowKey={(p) => p.id}
                dense
                columns={[
                  { head: 'الاسم', cell: (p) => p.fullNameAr },
                  { head: 'الفئة', cell: (p) => STAFF_CATEGORY_LABELS[p.category] ?? p.category },
                  { head: 'الحالة', cell: (p) => <EnumChip value={p.staffStatus} labels={STAFF_STATUS_LABELS} /> },
                ]}
              />
            </InstStates>
          </InstSection>
          <InstSection index="04" caption="APPOINTMENTS" title="تعيينات قيادية في الوحدة" pad="none">
            <InstStates
              isLoading={appointmentsQuery.isLoading}
              error={appointmentsQuery.error}
              isEmpty={(appointmentsQuery.data?.data ?? []).length === 0}
            >
              <InstTable
                ariaLabel="تعيينات الوحدة"
                rows={appointmentsQuery.data?.data ?? []}
                rowKey={(a) => a.id}
                dense
                columns={[
                  { head: 'منذ', cell: (a) => formatDate(a.startDate) },
                  { head: 'الحالة', cell: (a) => <EnumChip value={a.status} labels={APPOINTMENT_STATUS_LABELS} /> },
                  { head: 'بقرار', cell: (a) => a.decisionNumber ?? '—' },
                ]}
              />
            </InstStates>
          </InstSection>
          <InstSection index="05" caption="PROGRAMS" title="برامج الوحدة" pad="none">
            <InstStates
              isLoading={programsQuery.isLoading}
              error={programsQuery.error}
              isEmpty={(programsQuery.data?.data ?? []).length === 0}
            >
              <InstTable
                ariaLabel="برامج الوحدة"
                rows={programsQuery.data?.data ?? []}
                rowKey={(p) => p.id}
                dense
                columns={[
                  { head: 'البرنامج', cell: (p) => p.nameAr },
                  { head: 'الرمز', cell: (p) => <span className="font-mono">{p.code}</span>, mono: true },
                  { head: 'الحالة', cell: (p) => <EnumChip value={p.status} labels={PROGRAM_STATUS_LABELS} /> },
                ]}
              />
            </InstStates>
          </InstSection>
        </>
      ) : null}

      <InstFormDialog
        open={formOpen}
        title={editing ? `تعديل: ${editing.nameAr}` : 'وحدة تنظيمية جديدة'}
        fields={unitFormFields(!!editing)}
        submitLabel={editing ? 'حفظ التعديلات' : 'إضافة الوحدة'}
        busy={busy}
        serverError={formError}
        wide
        onCancel={() => setFormOpen(false)}
        onSubmit={submitUnit}
      />

      <InstConfirm
        open={!!statusTarget && !statusDialogOpen}
        title={`تغيير حالة: ${statusTarget?.nameAr ?? ''}`}
        description="الحالة النشطة تسمح بالعمليات؛ الموقوفة تُخفى من الاختيارات؛ الحل يتطلب خلو الوحدة من وحدات تابعة نشطة."
        confirmLabel="اختيار الحالة"
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => setStatusDialogOpen(true)}
      />
      <InstFormDialog
        open={statusDialogOpen && !!statusTarget}
        title={`الحالة الجديدة: ${statusTarget?.nameAr ?? ''}`}
        fields={[
          {
            kind: 'select', name: 'status', label: 'الحالة', required: true,
            options: Object.entries(ORG_UNIT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
        submitLabel="تحديث الحالة"
        busy={busy}
        onCancel={() => { setStatusDialogOpen(false); setStatusTarget(null); }}
        onSubmit={async (values) => {
          if (!statusTarget) return 'لا توجد وحدة محددة.';
          setBusy(true);
          try {
            await mutations.setStatus({
              id: statusTarget.id, status: String(values.status),
              dissolvedAt: values.status === 'DISSOLVED' ? new Date().toISOString().slice(0, 10) : undefined,
            });
            toast.success('حُدِّثت حالة الوحدة');
            setStatusDialogOpen(false);
            setStatusTarget(null);
          } catch (err) {
            return serverError(err, 'تعذَّر تحديث حالة الوحدة.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </PageFrame>
  );
}
