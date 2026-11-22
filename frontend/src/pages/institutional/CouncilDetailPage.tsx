/**
 * r352 §F (cont.) — council detail + the MEETING lifecycle route.
 *
 * The meeting workspace reads as distinct readable phases (never one
 * oversized form):
 *   1. التحضير — agenda items (add/edit/status) + schedule + location.
 *   2. الانعقاد — mark HELD + bulk attendance.
 *   3. القرارات والتوصيات — resolutions with their own transitions.
 *   4. المحضر — draft (PUT, meeting must be HELD) → approve → sign.
 *   5. المتابعة — follow-up actions (FOLLOW_UP_ACTION resolutions
 *      with due dates and owners).
 * Server rules are the authority: every illegal transition surfaces
 * the server's own Arabic 409 message.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  useCouncil, useMyCapabilities, useMeeting, useMeetings, usePeople, useInstActions} from '../../hooks/institutional/queries';

import * as instApi from '../../lib/institutional/api';
import {
  AGENDA_STATUS_LABELS, ATTENDANCE_LABELS, COUNCIL_ROLE_LABELS, COUNCIL_STATUS_LABELS,
  COUNCIL_TYPE_LABELS, MEETING_STATUS_LABELS, MINUTES_STATUS_LABELS,
  RESOLUTION_KIND_LABELS, RESOLUTION_STATUS_LABELS, MEMBERSHIP_STATUS_LABELS,
} from '../../lib/institutional/labels';
import type { AttendanceStatus } from '../../lib/institutional/types';

/* ── council detail (/institution/councils/:id) ─────────────────── */

export function InstitutionCouncilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('COUNCILS_MANAGE') ?? false;

  const councilQuery = useCouncil(id ?? null);
  const meetingsQuery = useMeetings(id ?? null);
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const mutations = useInstActions(['councils'], {
    addMember: (i: { councilId: string; input: Parameters<typeof instApi.addCouncilMember>[1] }) =>
      instApi.addCouncilMember(i.councilId, i.input),
    endMember: (i: { id: string; endDate?: string; reason?: string }) =>
      instApi.endCouncilMembership(i.id, i),
    addDocument: (i: { councilId: string; input: Parameters<typeof instApi.addCouncilDocument>[1] }) =>
      instApi.addCouncilDocument(i.councilId, i.input),
  });
  const meetingMutations = useInstActions(['meetings'], {
    create: (i: { councilId: string; input: Parameters<typeof instApi.createMeeting>[1] }) =>
      instApi.createMeeting(i.councilId, i.input),
    update: (i: { id: string; input: Parameters<typeof instApi.updateMeeting>[1] }) =>
      instApi.updateMeeting(i.id, i.input),
    saveAttendance: (i: { meetingId: string; records: Array<{ personId: string; status: string }> }) =>
      instApi.saveAttendance(i.meetingId, i.records),
    addAgendaItem: (i: { meetingId: string; input: Parameters<typeof instApi.addAgendaItem>[1] }) =>
      instApi.addAgendaItem(i.meetingId, i.input),
    updateAgendaItem: (i: { itemId: string; input: Parameters<typeof instApi.updateAgendaItem>[1] }) =>
      instApi.updateAgendaItem(i.itemId, i.input),
    addResolution: (i: { meetingId: string; input: Parameters<typeof instApi.addResolution>[1] }) =>
      instApi.addResolution(i.meetingId, i.input),
    updateResolution: (i: { id: string; input: Parameters<typeof instApi.updateResolution>[1] }) =>
      instApi.updateResolution(i.id, i.input),
    saveMinutes: (i: { meetingId: string; contentAr: string }) =>
      instApi.saveMinutes(i.meetingId, i.contentAr),
    approveMinutes: (i: { meetingId: string; approvedByPersonId: string }) =>
      instApi.approveMinutes(i.meetingId, i.approvedByPersonId),
    signMinutes: (i: { meetingId: string; signedByPersonId: string }) =>
      instApi.signMinutes(i.meetingId, i.signedByPersonId),
  });

  const [memberOpen, setMemberOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const council = councilQuery.data;
  const peopleOptions = (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr }));

  const memberFields: InstField[] = [
    { kind: 'select', name: 'personId', label: 'العضو', required: true, options: peopleOptions },
    {
      kind: 'select', name: 'role', label: 'الصفة', required: true,
      options: Object.entries(COUNCIL_ROLE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'date', name: 'startDate', label: 'تاريخ بدء العضوية', required: true },
    { kind: 'date', name: 'endDate', label: 'تاريخ الانتهاء (اختياري)' },
    { kind: 'text', name: 'decisionRef', label: 'مرجع قرار التشكيل', maxLength: 120 },
  ];

  const meetingFields: InstField[] = [
    { kind: 'date', name: 'scheduledAt', label: 'تاريخ الاجتماع', required: true, hint: 'الوقت يُدخل كتاريخ؛ الخادم يقبل ISO الكامل.' },
    { kind: 'text', name: 'location', label: 'المكان', maxLength: 120 },
    { kind: 'number', name: 'seqNumber', label: 'الرقم التسلسلي', min: 1, hint: 'اختياري — فريد داخل المجلس.' },
    { kind: 'textarea', name: 'agendaSummary', label: 'ملخص جدول الأعمال', rows: 2, maxLength: 400 },
  ];

  const docFields: InstField[] = [
    { kind: 'text', name: 'titleAr', label: 'عنوان المستند', required: true, maxLength: 160 },
    { kind: 'text', name: 'fileUrl', label: 'رابط الملف', maxLength: 300, hint: 'مرجع/رابط — رفع البايتات غير مشمول في هذا العقد.' },
    { kind: 'text', name: 'kind', label: 'النوع', maxLength: 60 },
  ];

  const submitMember = async (values: InstFormValues): Promise<string | void> => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.addMember({
        councilId: id,
        input: {
          personId: values.personId as string,
          role: String(values.role),
          startDate: values.startDate as string,
          endDate: values.endDate as string | undefined,
          decisionRef: values.decisionRef as string | undefined,
        },
      });
      toast.success('أُضيف العضو');
      setMemberOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إضافة العضو.');
    } finally {
      setBusy(false);
    }
  };

  const submitMeeting = async (values: InstFormValues): Promise<string | void> => {
    if (!id) return;
    setBusy(true);
    try {
      const created = await meetingMutations.create({
        councilId: id,
        input: {
          scheduledAt: values.scheduledAt as string,
          location: values.location as string | undefined,
          seqNumber: values.seqNumber as number | undefined,
          agendaSummary: values.agendaSummary as string | undefined,
        },
      });
      toast.success('جُدول الاجتماع');
      setMeetingOpen(false);
      navigate(`/institution/councils/${id}/meetings/${created.id}`);
    } catch (err) {
      return serverError(err, 'تعذَّر جدولة الاجتماع.');
    } finally {
      setBusy(false);
    }
  };

  const submitDoc = async (values: InstFormValues): Promise<string | void> => {
    if (!id) return;
    setBusy(true);
    try {
      await mutations.addDocument({
        councilId: id,
        input: {
          titleAr: values.titleAr as string,
          fileUrl: values.fileUrl as string | undefined,
          kind: values.kind as string | undefined,
        },
      });
      toast.success('أُضيف مرجع المستند');
      setDocOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إضافة المستند.');
    } finally {
      setBusy(false);
    }
  };

  const endMembership = async (membershipId: string) => {
    setBusy(true);
    try {
      await mutations.endMember({ id: membershipId, reason: 'انتهاء العضوية' });
      toast.success('أُنهيت العضوية');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر إنهاء العضوية.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={council?.nameAr ?? 'تفاصيل المجلس'}
        eyebrow="المجالس واللجان"
        description={council ? COUNCIL_TYPE_LABELS[council.type] : undefined}
        meta={council ? <EnumChip value={council.status} labels={COUNCIL_STATUS_LABELS} /> : null}
        breadcrumbs={[{ label: 'المجالس واللجان', to: '/institution/councils' }]}
      />
      <InstStates isLoading={councilQuery.isLoading} error={councilQuery.error} isEmpty={!council}>
        {council && (
          <>
            <InstSection title="النصاب والسند">
              <DetailList
                items={[
                  { label: 'السند القانوني', value: council.legalBasis ?? null },
                  { label: 'مرجع اللائحة', value: council.charterRef ?? null },
                  { label: 'تاريخ الإنشاء', value: council.establishedAt ? formatDate(council.establishedAt) : null },
                  { label: 'الرمز', value: council.code ?? null },
                ]}
              />
            </InstSection>

            <InstSection
              title="العضوية"
              description="الرئيس ونائبه وأمين المجلس والأعضاء والمراقبون — بمراجع قرارات التشكيل ومدد العضوية."
              actions={canManage ? (
                <button type="button" className="btn primary sm" onClick={() => setMemberOpen(true)}>
                  <Icon icon={Plus} size={14} /> إضافة عضو
                </button>
              ) : null}
            >
              <InstStates
                isLoading={councilQuery.isLoading}
                error={null}
                isEmpty={(council.memberships ?? []).length === 0}
              >
                <DetailList
                  items={council.memberships.map((m) => ({
                    label: `${COUNCIL_ROLE_LABELS[m.role]} — ${m.person?.fullNameAr ?? m.personId}`,
                    value: (
                      <span className="inst-actions">
                        <EnumChip value={m.status} labels={MEMBERSHIP_STATUS_LABELS} />
                        <span className="inst-tree-kind">من {formatDate(m.startDate)}</span>
                        {m.decisionRef && <span className="inst-tree-kind">بقرار {m.decisionRef}</span>}
                        {canManage && m.status === 'ACTIVE' && (
                          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => endMembership(m.id)}>
                            إنهاء العضوية
                          </button>
                        )}
                      </span>
                    ),
                  }))}
                />
              </InstStates>
            </InstSection>

            <InstSection
              title="الاجتماعات"
              actions={canManage ? (
                <button type="button" className="btn primary sm" onClick={() => setMeetingOpen(true)}>
                  <Icon icon={Plus} size={14} /> جدولة اجتماع
                </button>
              ) : null}
            >
              <InstStates
                isLoading={meetingsQuery.isLoading}
                error={meetingsQuery.error}
                isEmpty={(meetingsQuery.data ?? []).length === 0}
              >
                <div className="table-wrap">
                  <table className="table tbl-stack" aria-label="اجتماعات المجلس">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">التاريخ</th>
                        <th scope="col">المكان</th>
                        <th scope="col">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(meetingsQuery.data ?? []).map((m) => (
                        <tr key={m.id} className="inst-row-click" tabIndex={0}
                          onClick={() => navigate(`/institution/councils/${id}/meetings/${m.id}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/institution/councils/${id}/meetings/${m.id}`); }}
                        >
                          <td data-label="#" className="font-mono">{m.seqNumber ?? '—'}</td>
                          <td data-label="التاريخ">{formatDate(m.scheduledAt)}</td>
                          <td data-label="المكان">{m.location ?? '—'}</td>
                          <td data-label="الحالة"><EnumChip value={m.status} labels={MEETING_STATUS_LABELS} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </InstStates>
            </InstSection>

            <InstSection
              title="مستندات المجلس"
              description="مراجع ومستندات مرتبطة بالمجلس (بيانات وصفية)."
              actions={canManage ? (
                <button type="button" className="btn ghost sm" onClick={() => setDocOpen(true)}>إضافة مرجع</button>
              ) : null}
            >
              <p className="inst-section-desc">
                تُدار مراجع المستندات عبر الخدمة؛ اطرح رفع الملفات كتحسين لاحق موثق في HANDOFF.
              </p>
            </InstSection>
          </>
        )}
      </InstStates>

      <InstFormDialog open={memberOpen} title="إضافة عضو" fields={memberFields} submitLabel="إضافة" busy={busy} onCancel={() => setMemberOpen(false)} onSubmit={submitMember} />
      <InstFormDialog open={meetingOpen} title="جدولة اجتماع" fields={meetingFields} submitLabel="جدولة" busy={busy} onCancel={() => setMeetingOpen(false)} onSubmit={submitMeeting} />
      <InstFormDialog open={docOpen} title="إضافة مرجع مستند" fields={docFields} submitLabel="إضافة" busy={busy} onCancel={() => setDocOpen(false)} onSubmit={submitDoc} />
    </PageFrame>
  );
}

/* ── meeting detail (/institution/councils/:id/meetings/:meetingId) ─ */

const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: ATTENDANCE_LABELS.PRESENT },
  { value: 'ABSENT', label: ATTENDANCE_LABELS.ABSENT },
  { value: 'EXCUSED', label: ATTENDANCE_LABELS.EXCUSED },
  { value: 'LATE', label: ATTENDANCE_LABELS.LATE },
];

export function InstitutionMeetingDetailPage() {
  const { id, meetingId } = useParams<{ id: string; meetingId: string }>();
  const caps = useMyCapabilities();
  const canManage = caps.data?.has('COUNCILS_MANAGE') ?? false;

  const meetingQuery = useMeeting(meetingId ?? null);
  const councilQuery = useCouncil(id ?? null);
  const peopleQuery = usePeople({ limit: 100, status: 'ACTIVE' });
  const mutations = useInstActions(['meetings'], {
    update: (i: { id: string; input: Parameters<typeof instApi.updateMeeting>[1] }) =>
      instApi.updateMeeting(i.id, i.input),
    saveAttendance: (i: { meetingId: string; records: Array<{ personId: string; status: string }> }) =>
      instApi.saveAttendance(i.meetingId, i.records),
    addAgendaItem: (i: { meetingId: string; input: Parameters<typeof instApi.addAgendaItem>[1] }) =>
      instApi.addAgendaItem(i.meetingId, i.input),
    updateAgendaItem: (i: { itemId: string; input: Parameters<typeof instApi.updateAgendaItem>[1] }) =>
      instApi.updateAgendaItem(i.itemId, i.input),
    addResolution: (i: { meetingId: string; input: Parameters<typeof instApi.addResolution>[1] }) =>
      instApi.addResolution(i.meetingId, i.input),
    updateResolution: (i: { id: string; input: Parameters<typeof instApi.updateResolution>[1] }) =>
      instApi.updateResolution(i.id, i.input),
    saveMinutes: (i: { meetingId: string; contentAr: string }) =>
      instApi.saveMinutes(i.meetingId, i.contentAr),
    approveMinutes: (i: { meetingId: string; approvedByPersonId: string }) =>
      instApi.approveMinutes(i.meetingId, i.approvedByPersonId),
    signMinutes: (i: { meetingId: string; signedByPersonId: string }) =>
      instApi.signMinutes(i.meetingId, i.signedByPersonId),
  });

  const [agendaOpen, setAgendaOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [minutesText, setMinutesText] = useState('');
  const [minutesEditing, setMinutesEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, string>>({});

  const meeting = meetingQuery.data;
  const council = councilQuery.data;
  const peopleOptions = (peopleQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.fullNameAr }));

  const agendaFields: InstField[] = [
    { kind: 'number', name: 'orderNo', label: 'الترتيب', required: true, min: 1 },
    { kind: 'text', name: 'titleAr', label: 'عنوان البند', required: true, maxLength: 200 },
    { kind: 'textarea', name: 'description', label: 'التفصيل', rows: 2, maxLength: 600 },
  ];

  const resolutionFields: InstField[] = [
    {
      kind: 'select', name: 'kind', label: 'النوع', required: true,
      options: Object.entries(RESOLUTION_KIND_LABELS).map(([value, label]) => ({ value, label })),
    },
    { kind: 'textarea', name: 'textAr', label: 'نص القرار/التوصية', required: true, rows: 3, maxLength: 1000 },
    { kind: 'text', name: 'number', label: 'الرقم', maxLength: 40 },
    { kind: 'date', name: 'dueDate', label: 'تاريخ الاستحقاق (لإجراءات المتابعة)' },
    { kind: 'select', name: 'ownerPersonId', label: 'المسؤول عن التنفيذ', options: peopleOptions },
  ];

  const submitAgenda = async (values: InstFormValues): Promise<string | void> => {
    if (!meetingId) return;
    setBusy(true);
    try {
      await mutations.addAgendaItem({
        meetingId,
        input: {
          orderNo: Number(values.orderNo),
          titleAr: values.titleAr as string,
          description: values.description as string | undefined,
        },
      });
      toast.success('أُضيف بند جدول الأعمال');
      setAgendaOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر إضافة البند.');
    } finally {
      setBusy(false);
    }
  };

  const submitResolution = async (values: InstFormValues): Promise<string | void> => {
    if (!meetingId) return;
    setBusy(true);
    try {
      await mutations.addResolution({
        meetingId,
        input: {
          kind: String(values.kind),
          textAr: values.textAr as string,
          number: values.number as string | undefined,
          dueDate: values.dueDate as string | undefined,
          ownerPersonId: values.ownerPersonId as string | undefined,
        },
      });
      toast.success('سُجِّل القرار مسودة');
      setResolutionOpen(false);
    } catch (err) {
      return serverError(err, 'تعذَّر تسجيل القرار.');
    } finally {
      setBusy(false);
    }
  };

  const markHeld = async () => {
    if (!meetingId) return;
    setBusy(true);
    try {
      await mutations.update({ id: meetingId, input: { status: 'HELD' } });
      toast.success('سُجِّل انعقاد الاجتماع');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر تسجيل الانعقاد.'));
    } finally {
      setBusy(false);
    }
  };

  const saveAttendance = async () => {
    if (!meetingId) return;
    const records = Object.entries(attendanceDraft).map(([personId, status]) => ({ personId, status }));
    if (records.length === 0) { toast.warning('لم تحدد أي حالة حضور بعد.'); return; }
    setBusy(true);
    try {
      await mutations.saveAttendance({ meetingId, records });
      toast.success('حُفظ الحضور');
      setAttendanceDraft({});
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر حفظ الحضور.'));
    } finally {
      setBusy(false);
    }
  };

  const saveMinutes = async () => {
    if (!meetingId) return;
    setBusy(true);
    try {
      await mutations.saveMinutes({ meetingId, contentAr: minutesText });
      toast.success('حُفظت مسودة المحضر');
      setMinutesEditing(false);
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر حفظ المحضر.'));
    } finally {
      setBusy(false);
    }
  };

  const approveMinutes = async () => {
    if (!meetingId || !council) return;
    // The approver must be a council member — the honest default is
    // the secretary; the server validates the person belongs.
    const secretary = council.memberships.find((m) => m.role === 'SECRETARY' && m.status === 'ACTIVE');
    if (!secretary) { toast.warning('لا يوجد أمين مجلس نشط لاعتماد المحضر.'); return; }
    setBusy(true);
    try {
      await mutations.approveMinutes({ meetingId, approvedByPersonId: secretary.personId });
      toast.success('اعتُمد المحضر');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر اعتماد المحضر.'));
    } finally {
      setBusy(false);
    }
  };

  const signMinutes = async () => {
    if (!meetingId || !council) return;
    const chair = council.memberships.find((m) => m.role === 'CHAIR' && m.status === 'ACTIVE');
    if (!chair) { toast.warning('لا يوجد رئيس نشط للتوقيع.'); return; }
    setBusy(true);
    try {
      await mutations.signMinutes({ meetingId, signedByPersonId: chair.personId });
      toast.success('وُقِّع المحضر');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التوقيع.'));
    } finally {
      setBusy(false);
    }
  };

  const advanceResolution = async (resolutionId: string, status: string) => {
    setBusy(true);
    try {
      await mutations.updateResolution({
        id: resolutionId,
        input: {
          status,
          approvedAt: status === 'APPROVED' ? new Date().toISOString() : undefined,
          completedAt: status === 'IMPLEMENTED' ? new Date().toISOString() : undefined,
        },
      });
      toast.success('حُدِّثت حالة القرار');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر تحديث القرار.'));
    } finally {
      setBusy(false);
    }
  };

  const setAgendaStatus = async (itemId: string, status: string) => {
    setBusy(true);
    try {
      await mutations.updateAgendaItem({ itemId, input: { status } });
      toast.success('حُدِّث بند جدول الأعمال');
    } catch (err) {
      toast.error(serverError(err, 'تعذَّر التحديث.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title={`اجتماع ${council?.nameAr ?? 'المجلس'}${meeting?.meeting.seqNumber ? ` — رقم ${meeting.meeting.seqNumber}` : ''}`}
        eyebrow="المجالس واللجان"
        description={meeting ? `${formatDate(meeting.meeting.scheduledAt)}${meeting.meeting.location ? ` · ${meeting.meeting.location}` : ''}` : undefined}
        meta={meeting ? <EnumChip value={meeting.meeting.status} labels={MEETING_STATUS_LABELS} /> : null}
        breadcrumbs={[
          { label: 'المجالس واللجان', to: '/institution/councils' },
          { label: council?.nameAr ?? 'المجلس', to: `/institution/councils/${id}` },
        ]}
      />
      <InstStates isLoading={meetingQuery.isLoading} error={meetingQuery.error} isEmpty={!meeting}>
        {meeting && (
          <>
            {/* 1 · التحضير */}
            <InstSection
              title="١ · التحضير — جدول الأعمال"
              description="بنود جدول الأعمال وحالاتها قبل الانعقاد."
              actions={canManage && (
                <span className="inst-actions">
                  {meeting.meeting.status === 'SCHEDULED' && (
                    <button type="button" className="btn primary sm" disabled={busy} onClick={markHeld}>
                      تسجيل الانعقاد
                    </button>
                  )}
                  <button type="button" className="btn ghost sm" onClick={() => setAgendaOpen(true)}>
                    <Icon icon={Plus} size={14} /> بند جديد
                  </button>
                </span>
              )}
            >
              {meeting.agendaItems.length === 0 ? (
                <p className="inst-section-desc">جدول الأعمال فارغ — أضف البنود قبل الانعقاد.</p>
              ) : (
                <DetailList
                  items={meeting.agendaItems.map((a) => ({
                    label: `${a.orderNo}. ${a.titleAr}`,
                    value: (
                      <span className="inst-actions">
                        <EnumChip value={a.status} labels={AGENDA_STATUS_LABELS} />
                        {canManage && (
                          <span className="inst-actions">
                            {a.status === 'OPEN' && (
                              <>
                                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAgendaStatus(a.id, 'DISCUSSED')}>نوقش</button>
                                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAgendaStatus(a.id, 'DEFERRED')}>تأجيل</button>
                              </>
                            )}
                            {(a.status === 'DISCUSSED' || a.status === 'DEFERRED') && (
                              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAgendaStatus(a.id, 'CLOSED')}>إغلاق</button>
                            )}
                          </span>
                        )}
                      </span>
                    ),
                  }))}
                />
              )}
            </InstSection>

            {/* 2 · الانعقاد — الحضور */}
            <InstSection
              title="٢ · الحضور"
              description="سجل الحضور الدقيق: حاضر، غائب، بعذر، متأخر. يُحفظ دفعة واحدة (upsert)."
            >
              {meeting.attendance.length > 0 && (
                <DetailList
                  items={meeting.attendance.map((r) => ({
                    label: r.person?.fullNameAr ?? r.personId,
                    value: <EnumChip value={r.status} labels={ATTENDANCE_LABELS} />,
                  }))}
                />
              )}
              {canManage && meeting.meeting.status === 'HELD' && (
                <>
                  <div className="inst-filters">
                    <span className="inst-section-desc">تحديد الحضور الجديد/التعديل:</span>
                  </div>
                  {(peopleQuery.data?.data ?? []).slice(0, 25).map((p) => (
                    <div key={p.id} className="inst-attend-row">
                      <span className="inst-attend-name">{p.fullNameAr}</span>
                      <span className="inst-attend-opts" role="group" aria-label={`حضور ${p.fullNameAr}`}>
                        {ATTENDANCE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            className="inst-attend-opt"
                            aria-pressed={attendanceDraft[p.id] === o.value}
                            onClick={() => setAttendanceDraft((prev) => ({ ...prev, [p.id]: o.value }))}
                          >
                            {o.label}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                  <button type="button" className="btn primary sm" disabled={busy} onClick={saveAttendance}>
                    حفظ الحضور
                  </button>
                </>
              )}
              {meeting.meeting.status === 'SCHEDULED' && (
                <p className="inst-cap-note">سجل الانعقاد أولًا لتفعيل تحرير الحضور (قاعدة الخادم).</p>
              )}
            </InstSection>

            {/* 3 · القرارات */}
            <InstSection
              title="٣ · القرارات والتوصيات"
              description="قرارات المجلس وتوصياته وإجراءات المتابعة — بحالاتها (مسودة ← معتمد ← منفَّذ)."
              actions={canManage && (
                <button type="button" className="btn ghost sm" onClick={() => setResolutionOpen(true)}>
                  <Icon icon={Plus} size={14} /> قرار جديد
                </button>
              )}
            >
              {meeting.resolutions.length === 0 ? (
                <p className="inst-section-desc">لا قرارات مسجلة لهذا الاجتماع.</p>
              ) : (
                meeting.resolutions.map((r) => (
                  <div key={r.id} className="inst-detail">
                    <div className="inst-detail-row">
                      <dt>
                        {RESOLUTION_KIND_LABELS[r.kind]}{r.number ? ` — ${r.number}` : ''}
                      </dt>
                      <dd>
                        <div className="inst-actions" style={{ justifyContent: 'space-between', inlineSize: '100%' }}>
                          <EnumChip value={r.status} labels={RESOLUTION_STATUS_LABELS} />
                          {canManage && r.status === 'DRAFT' && (
                            <>
                              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceResolution(r.id, 'APPROVED')}>اعتماد</button>
                              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceResolution(r.id, 'REJECTED')}>رفض</button>
                            </>
                          )}
                          {canManage && r.status === 'APPROVED' && (
                            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => advanceResolution(r.id, 'IMPLEMENTED')}>تنفيذ</button>
                          )}
                        </div>
                        <p className="inst-minutes-body" style={{ marginBlockStart: 'var(--sp-2)' }}>{r.textAr}</p>
                        {r.dueDate && <p className="inst-tree-kind">استحقاق: {formatDate(r.dueDate)}</p>}
                      </dd>
                    </div>
                  </div>
                ))
              )}
            </InstSection>

            {/* 4 · المحضر */}
            <InstSection
              title="٤ · المحضر"
              description="المسودة تُحفظ بعد الانعقاد؛ الاعتماد ثم التوقيع خطوتان منفصلتان بتاريخيهما."
            >
              {!meeting.minutes && (
                <p className="inst-cap-note">
                  لا محضر بعد. {canManage ? 'اكتب المسودة بعد تسجيل الانعقاد.' : 'سيدوّن أمين المجلس المحضر.'}
                </p>
              )}
              {meeting.minutes && !minutesEditing && (
                <>
                  <div className="inst-actions">
                    <EnumChip value={meeting.minutes.status} labels={MINUTES_STATUS_LABELS} />
                    {meeting.minutes.approvedAt && <span className="inst-tree-kind">اعتُمد {formatDate(meeting.minutes.approvedAt)}</span>}
                    {meeting.minutes.signedAt && <span className="inst-tree-kind">وُقِّع {formatDate(meeting.minutes.signedAt)}</span>}
                  </div>
                  <p className="inst-minutes-body">{meeting.minutes.contentAr}</p>
                </>
              )}
              {canManage && meeting.minutes?.status === 'DRAFT' && !minutesEditing && (
                <button type="button" className="btn ghost sm" onClick={() => { setMinutesText(meeting.minutes?.contentAr ?? ''); setMinutesEditing(true); }}>
                  تحرير المسودة
                </button>
              )}
              {canManage && !meeting.minutes && meeting.meeting.status === 'HELD' && !minutesEditing && (
                <button type="button" className="btn ghost sm" onClick={() => { setMinutesText(''); setMinutesEditing(true); }}>
                  كتابة مسودة المحضر
                </button>
              )}
              {minutesEditing && (
                <>
                  <label htmlFor="inst-minutes-edit" className="inst-section-title">نص المحضر</label>
                  <textarea
                    id="inst-minutes-edit"
                    className="inst-minutes"
                    value={minutesText}
                    onChange={(e) => setMinutesText(e.target.value)}
                    rows={8}
                    maxLength={8000}
                  />
                  <div className="inst-actions">
                    <button type="button" className="btn ghost sm" onClick={() => setMinutesEditing(false)}>إلغاء</button>
                    <button type="button" className="btn primary sm" disabled={busy} onClick={saveMinutes}>حفظ المسودة</button>
                  </div>
                </>
              )}
              {canManage && meeting.minutes?.status === 'DRAFT' && !minutesEditing && (
                <button type="button" className="btn primary sm" disabled={busy} onClick={approveMinutes}>
                  اعتماد المحضر (بصفة أمين المجلس)
                </button>
              )}
              {canManage && meeting.minutes?.status === 'APPROVED' && (
                <button type="button" className="btn primary sm" disabled={busy} onClick={signMinutes}>
                  توقيع المحضر (بصفة الرئيس)
                </button>
              )}
            </InstSection>
          </>
        )}
      </InstStates>

      <InstFormDialog open={agendaOpen} title="بند جديد في جدول الأعمال" fields={agendaFields} submitLabel="إضافة البند" busy={busy} onCancel={() => setAgendaOpen(false)} onSubmit={submitAgenda} />
      <InstFormDialog open={resolutionOpen} title="قرار/توصية جديدة" fields={resolutionFields} submitLabel="تسجيل" busy={busy} onCancel={() => setResolutionOpen(false)} onSubmit={submitResolution} />
    </PageFrame>
  );
}
