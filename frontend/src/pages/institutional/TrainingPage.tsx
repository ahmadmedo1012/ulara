/**
 * r352 §G (practical training) — work-based training placements:
 * the practical/practicum side of the programs (host unit or external
 * host, supervisor, period, status, evaluation summary + score).
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageFrame, PageHeader } from '../../components/patterns';
import { api, unwrap } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDate, formatPct1 } from '../../utils/numbers';

import { serverError, StatusFlag,
  InstFilters, InstFormDialog, InstPagedTable, InstSection, InstSelect,
  type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
import { KpiBand } from '../../components/patterns';
import { useInstitutionScope } from '../../stores/auth.store';
import { Icon } from '../../components/Icon';
import {
  useMyCapabilities, useOrgUnitTree, usePeople, usePlacements, useInstActions } from '../../hooks/institutional/queries';
import * as instApi from '../../lib/institutional/api';
import { PLACEMENT_STATUS_LABELS } from '../../lib/institutional/labels';
import type { TrainingPlacement } from '../../lib/institutional/types';
import { flattenUnits } from '../../lib/institutional/orgUnitOptions';

const PLACE_UNIT: [string, string, string, string] = ['تدريب واحد', 'تدريبان', 'تدريبات', 'تدريب'];

interface LearnerOption { id: string; firstName: string; lastName: string }

export function InstitutionTrainingPage() {
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('PROGRAMS_MANAGE') ?? false;
  const scope = useInstitutionScope();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const placementsQuery = usePlacements({ status: status || undefined, page, limit: 20 });
  const treeQuery = useOrgUnitTree();
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const mutations = useInstActions(['placements'], {
    create: (i: Parameters<typeof instApi.createPlacement>[0]) => instApi.createPlacement(i),
    update: (i: { id: string; input: Parameters<typeof instApi.updatePlacement>[1] }) =>
      instApi.updatePlacement(i.id, i.input),
  });

  const [open, setOpen] = useState(false);
  const [evaluateTarget, setEvaluateTarget] = useState<TrainingPlacement | null>(null);
  const [busy, setBusy] = useState(false);
  const [learners, setLearners] = useState<LearnerOption[]>([]);

  const unitOptions = (treeQuery.data ? flattenUnits(treeQuery.data) : [])
    .filter((u) => u.status === 'ACTIVE')
    .map((u) => ({ value: u.id, label: u.nameAr }));
  const supervisorOptions = (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr }));

  const fields: InstField[] = [
    {
      kind: 'select', name: 'studentProfileId', label: 'الطالب/المتدرب', required: true,
      options: learners.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    },
    { kind: 'select', name: 'hostOrgUnitId', label: 'الوحدة المستضيفة (داخليًا)', options: unitOptions },
    { kind: 'text', name: 'externalHost', label: 'الجهة المستضيفة الخارجية', maxLength: 160, hint: 'إن كان التدريب لدى جهة خارج المؤسسة.' },
    { kind: 'select', name: 'supervisorPersonId', label: 'المشرف', options: supervisorOptions },
    { kind: 'date', name: 'startsAt', label: 'تاريخ البدء', required: true },
    { kind: 'date', name: 'endsAt', label: 'تاريخ الانتهاء' },
  ];

  const evaluateFields: InstField[] = [
    { kind: 'textarea', name: 'evaluationSummary', label: 'خلاصة التقييم', rows: 3, maxLength: 600 },
    { kind: 'number', name: 'evaluationScore', label: 'درجة التقييم', min: 0, max: 100 },
    { kind: 'select', name: 'status', label: 'الحالة', options: Object.entries(PLACEMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
  ];

  const loadLearners = async () => {
    try {
      const rows = await unwrap<LearnerOption[]>(api.get('/admin/students', { params: { limit: 100 } }));
      setLearners(rows);
    } catch {
      setLearners([]);
    }
  };

  const submit = async (values: InstFormValues): Promise<string | void> => {
    setBusy(true);
    try {
      await mutations.create({
        studentProfileId: values.studentProfileId as string,
        hostOrgUnitId: values.hostOrgUnitId as string | undefined,
        externalHost: values.externalHost as string | undefined,
        supervisorPersonId: values.supervisorPersonId as string | undefined,
        startsAt: values.startsAt as string,
        endsAt: values.endsAt as string | undefined,
      });
      toast.success('خُطِّط التدريب العملي');
      setOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إنشاء التدريب.');
    } finally {
      setBusy(false);
    }
  };

  const submitEvaluation = async (values: InstFormValues): Promise<string | void> => {
    if (!evaluateTarget) return;
    setBusy(true);
    try {
      await mutations.update({
        id: evaluateTarget.id,
        input: {
          evaluationSummary: values.evaluationSummary as string | undefined,
          evaluationScore: values.evaluationScore as number | undefined,
          status: values.status as string | undefined,
        },
      });
      toast.success('حُفظ تقييم التدريب');
      setEvaluateTarget(null);
    } catch (err) {
      return serverError(err, 'تعذَّر حفظ التقييم.');
    } finally {
      setBusy(false);
    }
  };

  const columns: Array<InstColumn<TrainingPlacement>> = [
    {
      head: 'الطالب/المتدرب',
      cell: (p) => (p.student ? <bdi>{`${p.student.firstName} ${p.student.lastName}`}</bdi> : p.studentProfileId),
    },
    { head: 'الجهة المستضيفة', cell: (p) => p.externalHost ?? 'داخل المؤسسة' },
    { head: 'منذ', cell: (p) => formatDate(p.startsAt) },
    { head: 'الحالة', cell: (p) => <StatusFlag value={p.status} labels={PLACEMENT_STATUS_LABELS} /> },
    {
      head: 'التقييم', mobileHidden: true, numeric: true,
      cell: (p) => (p.evaluationScore != null ? `${formatPct1(p.evaluationScore)}%` : '—'),
    },
    {
      head: 'إجراءات', mobileHidden: true,
      cell: (p) => canManage ? (
        <button type="button" className="btn ghost sm" onClick={() => setEvaluateTarget(p)}>تقييم</button>
      ) : <span className="inst-na">—</span>,
    },
  ];

  return (
    <PageFrame width="wide">
      <PageHeader
        title="التدريب العملي والتطبيقي"
        eyebrow="مساحة العمل المؤسسية"
        description="تدريبات العمل الميدانية والورشية لدى وحدات المؤسسة أو جهات خارجية — بالإشراف والتقييم وتوثيق الكفاءات."
        meta={canManage ? (
          <button type="button" className="btn primary sm" onClick={() => { void loadLearners(); setOpen(true); }}>
            <Icon icon={Plus} size={14} /> تدريب جديد
          </button>
        ) : null}
      />

      {/* R359 — the placements facts ride the KPI band (gated on the
          institution context like the family's other registers). */}
      {scope !== null && (
        <KpiBand
          items={[
            {
              index: '01',
              caption: 'PLACEMENTS',
              label: 'التدريبات (الاستعلام الحالي)',
              value: placementsQuery.data?.meta.total ?? 0,
              empty: placementsQuery.data == null,
            },
            {
              index: '02',
              caption: 'RESULTS',
              label: 'نتائج الصفحة الحاليّة',
              value: placementsQuery.data?.data.length ?? 0,
              empty: placementsQuery.data == null,
            },
            {
              index: '03',
              caption: 'HOST UNITS',
              label: 'الوحدات المستضيفة النشطة',
              value: unitOptions.length,
              empty: treeQuery.data == null,
            },
          ]}
        />
      )}

      <InstFilters>
        <InstSelect
          ariaLabel="تصفية بحالة التدريب"
          anyLabel="كل الحالات"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(PLACEMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </InstFilters>

      <InstSection index="01" caption="PLACEMENTS" title="سجلّ التدريبات العملية" pad="none">
      <InstPagedTable
        query={placementsQuery}
        columns={columns}
        rowKey={(p) => p.id}
        ariaLabel="قائمة التدريبات العملية"
        unit={PLACE_UNIT}
        onPage={setPage}
      />
      </InstSection>

      <InstFormDialog open={open} title="تدريب عملي جديد" fields={fields} submitLabel="تخطيط" busy={busy} onCancel={() => setOpen(false)} onSubmit={submit} />
      {evaluateTarget && (
        <InstFormDialog
          open
          title={`تقييم التدريب: ${evaluateTarget.student ? `${evaluateTarget.student.firstName} ${evaluateTarget.student.lastName}` : ''}`}
          fields={evaluateFields}
          submitLabel="حفظ التقييم"
          busy={busy}
          onCancel={() => setEvaluateTarget(null)}
          onSubmit={submitEvaluation}
        />
      )}
    </PageFrame>
  );
}

