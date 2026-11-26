/**
 * Teacher live-session control center.
 *
 * Path: /teacher/live
 * Restricted: TEACHER role.
 *
 * Capabilities (per PRD):
 *  - Schedule a live session against one of my offerings
 *  - Start / end / cancel a session
 *  - Attach a join URL (Zoom / BBB / Jitsi)
 *  - See session list with status filter
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Plus, Play, Square, X, Clock, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Button, Card, FormField } from '../../components/primitives';
/* R359 (A3 · W2-c) — the sheet grammar joins the live board: the
 * status StatStrip re-keys onto the KpiBand (real session counts,
 * honest-empty while pending), the session regions ride framed
 * SheetSections, and the settled states speak the hairline sg-flag
 * register (LIVE keeps its authored breathing chip). */
import { SheetSection, KpiBand } from '../../components/patterns';
import { ErrorState, Skeleton, EmptyState } from '../../components/primitives/States';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import '../../styles/owner.css'; // ConfirmDialog surfaces via the discard guard (D11 css split, 12-15)
import '../../styles/teacher/ds-core.css'; // R305 DS: §0 primitives + §E tax- composition
/* R342-09 — the [nn] section-index register (.w11-idx, inner.css §W11):
 * the same gutter grammar the done teacher pages speak, so the live
 * board's section heads read on the numeral axis. Fixed category
 * numbers (the register is positional, not a visible-count renumber). */
import '../../styles/landing/inner.css';
import {
  useTeacherOfferings, useLiveSessions, useCreateLiveSession,
  useLifecycleLiveSession, apiErrorMessage, type LiveSessionRow,
} from '../../hooks/useResources';
import { formatDateTimeAr, countAr } from '../../lib/format';
import { formatDate } from '../../utils/numbers';

const STATUS_LABEL: Record<LiveSessionRow['status'], string> = {
  SCHEDULED: 'مجدولة',
  LIVE: 'مباشرة الآن',
  ENDED: 'منتهية',
  CANCELLED: 'ملغاة',
};
/* Status vocabulary (R359 A3 · W2-c sg-flag tones): SCHEDULED reads
 * warning ink, ENDED positive — and CANCELLED quiets: a cancelled
 * session is a void state, not an accent one. LIVE keeps its authored
 * .live-chip with the breathing danger dot — the one moving moment on
 * the page, so it stays out of the flag ramp. */
const STATUS_FLAG_TONE: Record<LiveSessionRow['status'], 'warning' | 'positive' | 'quiet' | undefined> = {
  SCHEDULED: 'warning',
  LIVE: undefined,
  ENDED: 'positive',
  CANCELLED: 'quiet',
};

/** Shape-matched skeleton — the resolved anatomy: the KpiBand's hairline
 *  cells (index/caption bar · display numeral · Arabic label · delta
 *  line — the .sg-kpi register, not the retired .stat-strip) plus the
 *  framed session rows the sections resolve into. */
function LiveSkeleton() {
  return (
    <>
      <div className="sg-kpis" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sg-kpi" aria-hidden>
            <span className="sg-kpi-top"><Skeleton width={72} height={10} /></span>
            <span className="sg-kpi-value"><Skeleton width={58} height={30} /></span>
            <span className="sg-kpi-label"><Skeleton width={88} height={11} /></span>
            <span className="sg-kpi-delta"><Skeleton width={112} height={10} /></span>
          </div>
        ))}
      </div>
      <SheetSection caption="SESSIONS" title="الجلسات" reveal={false}>
        <div className="flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="run-row">
              <Skeleton width={40} height={40} rounded="var(--r-full)" />
              <div className="flex-col gap-2 flex-1">
                <Skeleton width="50%" height={14} />
                <Skeleton width="35%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </SheetSection>
    </>
  );
}

export default function TeacherLivePage() {
  const offerings = useTeacherOfferings();
  const sessions = useLiveSessions();
  const create = useCreateLiveSession();
  const cycle = useLifecycleLiveSession();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    offeringId: '',
    title: '',
    topic: '',
    scheduledAt: '',
    description: '',
    joinUrl: '',
  });

  const live = useMemo(() => sessions.data?.filter((s) => s.status === 'LIVE') ?? [], [sessions.data]);
  const scheduled = useMemo(() => sessions.data?.filter((s) => s.status === 'SCHEDULED') ?? [], [sessions.data]);
  const past = useMemo(
    () => sessions.data?.filter((s) => s.status === 'ENDED' || s.status === 'CANCELLED') ?? [],
    [sessions.data],
  );

  const [createError, setCreateError] = useState<string | null>(null);

  /* H3 (defect map 2-a): the inline create form is an authoring surface
   * and gets the family's discard guard — the same useDiscardGuard idiom
   * AssignmentFormModal uses. Every close path (the footer «إلغاء» and
   * the header toggle) routes through requestClose while dirty; a clean
   * form closes directly, and a pending create locks the guard (the
   * r157 no-op rule). */
  const closeForm = useCallback(() => setShowForm(false), []);
  const dirty = form.offeringId !== ''
    || form.title.trim() !== ''
    || form.topic.trim() !== ''
    || form.scheduledAt !== ''
    || form.description.trim() !== ''
    || form.joinUrl.trim() !== '';
  const { requestClose, guard } = useDiscardGuard({
    dirty,
    pending: create.isPending,
    onClose: closeForm,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.offeringId || !form.title.trim() || !form.scheduledAt) return;
    setCreateError(null);
    try {
      await create.mutateAsync({
        offeringId: form.offeringId,
        title: form.title.trim(),
        topic: form.topic.trim() || undefined,
        description: form.description.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        joinUrl: form.joinUrl.trim() || undefined,
      });
      setShowForm(false);
      setForm({ offeringId: '', title: '', topic: '', scheduledAt: '', description: '', joinUrl: '' });
    } catch (err) {
      // Keep the form open with the entered values; the Arabic error
      // renders inside the card so the teacher can retry.
      setCreateError(apiErrorMessage(err, 'تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  // The failing lifecycle action (start/end/cancel) re-fires on retry.
  const retryCycle = () => {
    if (cycle.variables) cycle.mutate(cycle.variables);
  };

  return (
    <div className="hr-scope">
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <span className="hr-brow">عضو هيئة التدريس · التعليم المتزامن</span>
          <h1 className="page-title">إدارة البث المباشر</h1>
          <p className="page-subtitle">
            جدولة المحاضرات الحية وتشغيلها وإيقافها. الطلاب يرون فقط الجلسات الخاصة بمقرّراتهم.
          </p>
        </div>
        <Button
          variant="accent"
          className="hr-cta"
          onClick={() => (showForm ? requestClose() : setShowForm(true))}
        >
          <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق النموذج' : 'جلسة جديدة'}
        </Button>
      </header>

      {/* Metrics read only from settled data — never a fake "0" while the
          list is still loading (audit 0-e P1-17). R359: the ONE KpiBand
          (real session counts; the A6 P2 one-word context rides the
          delta lines). */}
      {sessions.isPending ? (
        <LiveSkeleton />
      ) : sessions.isError ? (
        <>
          <KpiBand
            items={[
              { index: '01', caption: 'LIVE', label: 'مباشرة الآن', value: 0, empty: true },
              { index: '02', caption: 'SCHEDULED', label: 'مجدولة', value: 0, empty: true },
              { index: '03', caption: 'ENDED', label: 'منتهية', value: 0, empty: true },
            ]}
          />
          <Card>
            <ErrorState
              message="تعذَّر تحميل جلسات البث"
              error={sessions.error}
              onRetry={() => sessions.refetch()}
            />
          </Card>
        </>
      ) : (
        <>
          <KpiBand
            items={[
              {
                index: '01',
                caption: 'LIVE',
                label: 'مباشرة الآن',
                value: live.length,
                /* A6 P2 (22-a): keep the honest zeros, add the one-word
                   context — the bare 0/0/0 wall read as a malfunction
                   ("Zero Wall" / "depressing" VLM verdicts). */
                delta: live.length === 0 ? 'لا بثّ نشط حالياً' : 'يمكن إنهاؤها من هنا',
              },
              {
                index: '02',
                caption: 'SCHEDULED',
                label: 'مجدولة',
                value: scheduled.length,
                delta: scheduled.length === 0 ? 'لا جلسات قادمة' : 'قادمة في جدولك',
                deltaTone: scheduled.length === 0 ? undefined : 'positive',
              },
              {
                index: '03',
                caption: 'ENDED',
                label: 'منتهية',
                value: past.length,
                delta: past.length === 0 ? 'لا جلسات سابقة' : 'معروضة في الأسفل',
              },
            ]}
          />

          {/* New-session form — R359: the [01] NEW SESSION frame (an
              authoring surface on the sheet). */}
          {showForm && (
            <SheetSection index="01" caption="NEW SESSION" title="جلسة بث جديدة">
              <form onSubmit={onSubmit} className="flex-col gap-3">
                {offerings.isError && (
                  <div className="form-feedback fail" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span className="flex-1">تعذَّر تحميل مقرّراتك — اختر المقرر بعد إعادة المحاولة.</span>
                    <button type="button" className="btn ghost sm" onClick={() => offerings.refetch()}>
                      <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
                    </button>
                  </div>
                )}
                <div className="form-grid-2">
                  <FormField label="المقرّر">
                    <select
                      className="input"
                      value={form.offeringId}
                      onChange={(e) => setForm({ ...form, offeringId: e.target.value })}
                      required
                      disabled={offerings.isError}
                    >
                      <option value="">
                        {offerings.isPending ? 'جارٍ تحميل مقرّراتك…' : '— اختر مقرراً —'}
                      </option>
                      {offerings.data?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.course.code} — {o.course.name} ({o.term})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {/* The hint sits OUTSIDE the label so it never leaks
                      into the input's accessible name (A6 P2, 22-a):
                      Chromium paints datetime-local in the browser's
                      locale (en-US → mm/dd/yyyy) inside this Arabic
                      form — the hint names the native calendar as the
                      safe path, and the Arabic echo verifies what was
                      actually picked (datetime-local values carry no
                      offset, so the echo renders in the same local
                      time). */}
                  <FormField
                    label="موعد الجلسة"
                    id="live-when"
                    hint={form.scheduledAt
                      ? <>المحدَّد: {formatDateTimeAr(form.scheduledAt)}</>
                      : 'اختر التاريخ والوقت من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
                  >
                    <input
                      type="datetime-local"
                      className="input"
                      dir="ltr"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      required
                    />
                  </FormField>
                </div>
                <FormField label="عنوان الجلسة">
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    maxLength={200}
                  />
                </FormField>
                <FormField label="الموضوع الفرعي (اختياري)">
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: الانحدار الخطي"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    maxLength={200}
                  />
                </FormField>
                <FormField label="رابط الانضمام (Zoom / BigBlueButton / Jitsi)">
                  <input
                    type="url"
                    className="input"
                    dir="ltr"
                    placeholder="https://meet.example.com/abc-defg-hij"
                    value={form.joinUrl}
                    onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
                    maxLength={500}
                  />
                </FormField>
                <FormField label="وصف (اختياري)">
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="الموضوعات التي ستغطّيها الجلسة…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={2000}
                  />
                </FormField>
                {/* Mutation errors sit ABOVE the actions — the old placement
                    below the buttons hid them (audit 0-e P2-48). */}
                {createError && (
                  <div className="form-feedback fail" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span className="flex-1">تعذَّر جدولة الجلسة: {createError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {/* The submit rides the Form kit's loading contract — the
                      canonical spinner + aria-busy, the label kept for SRs. */}
                  <Button variant="ghost" onClick={requestClose} disabled={create.isPending}>
                    إلغاء
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    loading={create.isPending}
                    disabled={offerings.isError}
                  >
                    {create.isPending ? 'جارٍ إنشاء الجلسة…' : 'جدولة الجلسة'}
                  </Button>
                </div>
              </form>
              {guard}
            </SheetSection>
          )}

          {/* A failed start/end/cancel surfaces here with a working retry. */}
          {cycle.isError && (
            <div className="form-feedback fail" role="alert">
              <Icon icon={AlertCircle} size={14} />
              <span className="flex-1">
                {apiErrorMessage(cycle.error, 'تعذَّر تحديث حالة الجلسة.')}
              </span>
              <button type="button" className="btn ghost sm" onClick={retryCycle} disabled={cycle.isPending}>
                <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
              </button>
            </div>
          )}

          {/* Live now — R359: the [02] LIVE NOW frame. */}
          {live.length > 0 && (
            <SheetSection
              index="02"
              caption="LIVE NOW"
              title="مباشرة الآن"
              aside={<span className="sg-label">جلسات نشطة — يمكنك إنهاؤها من هنا</span>}
            >
              <div className="flex-col gap-2">
                {live.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onEnd={() => cycle.mutate({ id: s.id, action: 'END' })}
                    busy={cycle.isPending && cycle.variables?.id === s.id}
                  />
                ))}
              </div>
            </SheetSection>
          )}

          {/* Scheduled — r157 / 6A9: countAr grammar (the old `${n} جلسة
              مجدولة` template broke at 0 and 2 — «0 جلسة مجدولة» / «2
              جلسة مجدولة»); the zero case names the reality. R359: the
              [03] SCHEDULED frame carries the counted noun on the head
              rule. */}
          <SheetSection
            index="03"
            caption="SCHEDULED"
            title="جلسات قادمة"
            aside={(
              <span className="sg-label">
                {scheduled.length === 0
                  ? 'لا جلسات مجدولة'
                  : countAr(scheduled.length, ['جلسة مجدولة واحدة', 'جلستان مجدولتان', 'جلسات مجدولة', 'جلسة مجدولة'])}
              </span>
            )}
          >
            {scheduled.length === 0 ? (
              /* r149 (R3-A1 #6): EmptyState الكنونية — كانت يدوية بعلامة
                 مزدوجة (رسم + أيقونة معًا) وبلا تشريح العنوان/الدور. */
              <EmptyState
                illustration="empty-list"
                title="لا توجد جلسات قادمة"
                description="أنشئ جلسة جديدة لتظهر هنا."
              />
            ) : (
              <div className="flex-col gap-2">
                {scheduled.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onStart={() => cycle.mutate({ id: s.id, action: 'START' })}
                    onCancel={() => cycle.mutate({ id: s.id, action: 'CANCEL' })}
                    busy={cycle.isPending && cycle.variables?.id === s.id}
                  />
                ))}
              </div>
            )}
          </SheetSection>

          {/* Past — capped at 10 rows; the disclosure (r157 / 6A9)
              names the truncation honestly: «أحدث 10 جلسات من أصل N».
              The old silent .slice(0, 10) hid the rest. R359: the [04]
              PAST frame. */}
          {past.length > 0 && (
            <SheetSection index="04" caption="PAST" title="جلسات سابقة">
              <div className="flex-col gap-2">
                {past.slice(0, 10).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
              {past.length > 10 && (
                <div className="text-xs text-subtle tax-past-note">
                  أحدث <bdi>10</bdi> جلسات من أصل <bdi>{past.length}</bdi>
                </div>
              )}
            </SheetSection>
          )}
        </>
      )}
    </div>
    </div>
  );
}

function SessionRow({
  session: s,
  onStart,
  onEnd,
  onCancel,
  busy,
}: {
  session: LiveSessionRow;
  onStart?: () => void;
  onEnd?: () => void;
  onCancel?: () => void;
  /** True while this row's own lifecycle action is in flight. */
  busy?: boolean;
}) {
  const accent = s.offering.course.themeColor ?? 'var(--accent)';
  const isLive = s.status === 'LIVE';
  return (
    <div
      className={`run-row${isLive ? ' is-live' : ''}`}
      style={{ ['--row-accent' as never]: accent }}
    >
      {/* Tinted course well replaces the old 3px inline-start stripe
          (ruling #4) — same grammar as the student live page. */}
      <span className="live-row-icon">
        <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={20} />
      </span>
      <div className="flex-1">
        <div className="live-row-title">{s.title}</div>
        <div className="text-xs text-muted">
          <bdi>{s.offering.course.code}</bdi> · {s.offering.course.name}
          {s.topic ? ` · ${s.topic}` : ''}
        </div>
        <div className="text-xxs text-subtle">
          <Icon icon={Clock} size={10} />{' '}
          <bdi>
            {formatDate(s.scheduledAt, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </bdi>
          {s.joinUrl && (
            <>
              {' · '}
              <a className="live-session-link" href={s.joinUrl} target="_blank" rel="noreferrer">رابط الانضمام</a>
            </>
          )}
        </div>
      </div>
      {isLive ? (
        /* THE authored moment (LIVE only): the dot breathes a danger ping
            while everything else on the page sits still. */
        <span className="live-chip">
          <span className="live-dot" aria-hidden />
          {STATUS_LABEL[s.status]}
        </span>
      ) : (
        /* R359: the settled states speak the hairline sg-flag register
            (warning ink = waiting · positive = done · quiet = void). */
        <span className="sg-flag" data-tone={STATUS_FLAG_TONE[s.status]}>
          {STATUS_LABEL[s.status]}
        </span>
      )}
      <div className="run-row-actions">
        {onStart && (
          <Button variant="primary" size="sm" loading={busy} onClick={onStart} title="بدء البث">
            <Icon icon={Play} size={12} /> بدء
          </Button>
        )}
        {onEnd && (
          <Button size="sm" loading={busy} onClick={onEnd} title="إنهاء البث">
            <Icon icon={Square} size={12} /> إنهاء
          </Button>
        )}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            loading={busy}
            onClick={onCancel}
            title="إلغاء الجلسة"
            aria-label="إلغاء الجلسة"
          >
            <Icon icon={X} size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
