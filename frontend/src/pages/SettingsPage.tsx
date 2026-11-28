import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Languages, LifeBuoy, Mail, MailCheck, MonitorSmartphone, Moon, Palette, Trash2, Volume2 } from 'lucide-react';
import { Card } from '../components/primitives';
import { Icon } from '../components/Icon';
import { getSoundEnabled, setSoundEnabled, playSound } from '../lib/sound';
import { PageFrame, PageHeader, SheetSection, SheetEmpty, DataSheet } from '../components/patterns';
import { ChangePasswordCard } from '../components/account/ChangePasswordCard';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useMe, useResendVerification } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { roleLabel } from '../lib/roleLabels';
import { usePageTitle } from '../hooks/usePageTitle';
/* R359 §5.5 — the notification-settings register: the REAL seats the
 * backend serves (unread state + push devices + the r359 A4 per-category
 * preference row + the digest opt-in) built as live UI. */
import {
  useUnreadNotifications,
  useMarkAllNotifsRead,
  usePushDevices,
  useUnregisterPushDevice,
  useNotificationPreferences,
  useUpdateNotificationPreference,
  type PushDevice,
} from '../hooks/resources/notifications';
import { formatRelativeArShort } from '../lib/format';
import { formatInt } from '../utils/numbers';
/* The §B2 kit sheet (SectionBar + EmptyCell registers — global inside
 * @layer pages) + this page's own row/note family. */
import '../styles/student/pages.css';
import '../styles/student/settings.css';

/* The platform register — mono sheet codes, the grammar's own voice. */
const DEVICE_PLATFORM: Record<PushDevice['platform'], string> = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  WEB: 'WEB',
};
const DEVICE_PLATFORM_AR: Record<PushDevice['platform'], string> = {
  ANDROID: 'أندرويد',
  IOS: 'iOS',
  WEB: 'الويب',
};

/* ── The notification-settings register (r359 §5.5 + r360 F4) ──────
 * What WORKS today, wired live: the unread state (real count + the
 * mark-all-read verb the bell owns), the push-device register
 * (list + unregister — registration itself happens from the mobile
 * app per the r326 M2.6 contract), and the per-category preference
 * row (URGENT/ACADEMIC/SYSTEM/SOCIAL + the email digest opt-in) on
 * r359 A4's GET/PUT /me/notification-preferences. */
function NotificationSettingsSection() {
  const unread = useUnreadNotifications();
  const markAll = useMarkAllNotifsRead();
  const devices = usePushDevices();
  const unregister = useUnregisterPushDevice();
  /* r360 F4 — the REAL per-category register (r359 A4 backend). */
  const prefs = useNotificationPreferences();
  const updatePref = useUpdateNotificationPreference();
  /* The row speaks (field, next); the mutation speaks one-key patches —
   * the adapter lives HERE so the row never knows the wire shape. */
  const flip = (field: 'pushUrgent' | 'pushAcademic' | 'pushSystem' | 'pushSocial' | 'emailDigest', next: boolean) => {
    updatePref.mutate({ [field]: next });
  };

  const count = unread.data ?? 0;

  return (
    <SheetSection
      index="05"
      caption="NOTIFICATIONS"
      title="الإشعارات"
      desc="حالتك اليوم وأجهزتك المسجّلة للإشعارات الفورية."
      aside={
        count > 0 ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            data-loading={markAll.isPending ? 'true' : undefined}
          >
            <Icon icon={BellRing} size={14} aria-hidden />
            تعليم الكل كمقروء
          </button>
        ) : undefined
      }
    >
      {/* The live state line — the same server truth the bell reads. */}
      <div className="set-row" role="status">
        <div className="set-row-main">
          <Icon icon={Bell} size={16} aria-hidden />
          <div>
            <div className="set-row-title">
              غير المقروءة الآن
            </div>
            <div className="set-row-note">
              {count > 0
                ? <>{formatInt(count)} تنبيهًا بانتظارك — تصل عبر أيقونة الجرس في الشريط العلوي.</>
                : 'لا تنبيهات غير مقروءة — صندوقك نظيف.'}
            </div>
          </div>
        </div>
        <span className="sg-label">INBOX</span>
      </div>

      {/* The device register — the REAL push devices (r326 M2.6):
          the mobile app registers; the web lists + unregisters. */}
      <div className="set-note">
        أجهزتك المسجّلة لاستلام الإشعارات الفورية — التسجيل يتم من تطبيق أُلارا للجوال؛
        وإلغاء التسجيل يوقف الإشعارات على الجهاز فورًا.
      </div>
      {devices.isError ? (
        <SheetEmpty
          title="تعذّر تحميل قائمة الأجهزة"
          desc="خدمة الأجهزة غير متاحة الآن — أعد المحاولة لاحقًا."
          code="ERROR"
        />
      ) : (
        <DataSheet<PushDevice>
          caption="الأجهزة المسجّلة للإشعارات الفورية"
          loading={devices.isPending}
          rows={devices.data ?? []}
          columns={[
            {
              key: 'platform',
              label: 'الجهاز',
              render: (d) => (
                <span className="sg-cell-stack">
                  <span>{DEVICE_PLATFORM_AR[d.platform]}</span>
                  <span className="sg-cell-sub">{DEVICE_PLATFORM[d.platform]}</span>
                </span>
              ),
            },
            {
              key: 'version',
              label: 'إصدار التطبيق',
              mono: true,
              render: (d) => <bdi dir="ltr">{d.appVersion ?? '—'}</bdi>,
            },
            {
              key: 'lastSeen',
              label: 'آخر ظهور',
              render: (d) => formatRelativeArShort(d.lastSeenAt),
            },
            {
              key: 'actions',
              label: '',
              noLabel: true,
              render: (d) => (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => unregister.mutate(d.id)}
                  disabled={unregister.isPending && unregister.variables === d.id}
                  aria-label={`إلغاء تسجيل جهاز ${DEVICE_PLATFORM_AR[d.platform]}`}
                >
                  <Icon icon={Trash2} size={14} aria-hidden />
                  إلغاء التسجيل
                </button>
              ),
            },
          ]}
          empty={
            <SheetEmpty
              title="لا أجهزة مسجّلة بعد"
              desc="ثبّت تطبيق أُلارا للجوال وسجّل دخولك — يظهر جهازك هنا أول إشعار فوري."
              code="NO-DEVICES"
            />
          }
        />
      )}

      {/* The per-category register — REAL (r359 A4's
          GET/PUT /me/notification-preferences, wired r360 F4): the four
          categories the backend's push fan-out consults before any Expo
          traffic, plus the weekly email digest's opt-in (default off).
          The toggle is the caller's own row — optimistic flip, server
          settle. */}
      <div className="set-note">
        تفضيلات الفئات تتحكّم في الإشعارات الفورية قبل مغادرة الخادم —
        إيقاف فئة يوقفها على كل أجهزتك المسجّلة.
      </div>
      {prefs.isError ? (
        <SheetEmpty
          title="تعذّر تحميل تفضيلاتك"
          desc="خدمة التفضيلات غير متاحة الآن — أعد المحاولة لاحقًا."
          code="ERROR"
        />
      ) : (
        <Card>
          <PreferenceToggleRow
            label="العاجل"
            note="تعطيلات المنصّة والقرارات الحسّاسة زمنيًا"
            caption="URGENT"
            field="pushUrgent"
            value={prefs.data?.pushUrgent}
            loading={prefs.isPending}
            onFlip={flip}
          />
          <PreferenceToggleRow
            label="الأكاديمي"
            note="الاختبارات والتسليمات ونتائج المقرّرات"
            caption="ACADEMIC"
            field="pushAcademic"
            value={prefs.data?.pushAcademic}
            loading={prefs.isPending}
            onFlip={flip}
          />
          <PreferenceToggleRow
            label="النظام"
            note="تحديثات الحساب والصيانة المعلنة"
            caption="SYSTEM"
            field="pushSystem"
            value={prefs.data?.pushSystem}
            loading={prefs.isPending}
            onFlip={flip}
          />
          <PreferenceToggleRow
            label="الاجتماعي"
            note="الرسائل والتفاعلات والمجتمع"
            caption="SOCIAL"
            field="pushSocial"
            value={prefs.data?.pushSocial}
            loading={prefs.isPending}
            onFlip={flip}
          />
          <PreferenceToggleRow
            label="الملخّص الأسبوعي بالبريد"
            note="رسالة واحدة كل أسبوع تلخّص ما فاتك — معطّل افتراضيًا"
            caption="EMAIL DIGEST"
            field="emailDigest"
            value={prefs.data?.emailDigest}
            loading={prefs.isPending}
            onFlip={flip}
            icon={<Icon icon={Mail} size={16} aria-hidden />}
          />
        </Card>
      )}
    </SheetSection>
  );
}

/**
 * SoundToggleRow — the slice-05 sound preference (client-local). Same
 * pressed-pill grammar as PreferenceToggleRow, but the state lives in
 * localStorage (no server field exists — a server-settled mutation
 * would be a lie here). Flipping ON plays the «confirm» blip once as
 * immediate, honest feedback; flipping OFF stays silent.
 */
function SoundToggleRow() {
  const [on, setOn] = useState<boolean>(() => getSoundEnabled());
  const flip = () => {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
    if (next) playSound('confirm');
  };
  return (
    <div className="set-row">
      <div className="set-row-main">
        <Icon icon={Volume2} size={16} aria-hidden />
        <div>
          <div className="set-row-title">أصوات الواجهة</div>
          <div className="set-row-note">
            متوقفة افتراضيًا — وتلتزم دائمًا بإعداد «تقليل الحركة» ووضع توفير البيانات.
          </div>
        </div>
      </div>
      <button
        type="button"
        className="set-toggle"
        aria-pressed={on}
        aria-label={`أصوات الواجهة — ${on ? 'مفعّل' : 'موقوف'}`}
        onClick={flip}
      >
        <span className="set-toggle-state" aria-hidden="true">{on ? 'مفعّل' : 'موقوف'}</span>
        <span className="sg-label" aria-hidden="true">SOUND</span>
      </button>
    </div>
  );
}

/* The preference row's own toggle: the repo's pressed-pill grammar
 * (aria-pressed), 44px touch floor, the signal wash when on. The
 * flip rides the optimistic mutation — the label answers the state,
 * never a fake switch. */
function PreferenceToggleRow({
  label, note, caption, field, value, loading, onFlip, icon,
}: {
  label: string;
  note: string;
  caption: string;
  field: 'pushUrgent' | 'pushAcademic' | 'pushSystem' | 'pushSocial' | 'emailDigest';
  value: boolean | undefined;
  loading: boolean;
  onFlip: (field: 'pushUrgent' | 'pushAcademic' | 'pushSystem' | 'pushSocial' | 'emailDigest', next: boolean) => void;
  icon?: ReactNode;
}) {
  const on = value ?? false;
  return (
    <div className="set-row">
      <div className="set-row-main">
        {icon ?? <Icon icon={Bell} size={16} aria-hidden />}
        <div>
          <div className="set-row-title">{label}</div>
          <div className="set-row-note">{note}</div>
        </div>
      </div>
      <button
        type="button"
        className="set-toggle"
        aria-pressed={on}
        aria-label={`${label} — ${on ? 'مفعّل' : 'موقوف'}`}
        disabled={loading || value === undefined}
        onClick={() => onFlip(field, !on)}
      >
        <span className="set-toggle-state" aria-hidden="true">{on ? 'مفعّل' : 'موقوف'}</span>
        <span className="sg-label" aria-hidden="true">{caption}</span>
      </button>
    </div>
  );
}

/**
 * EmailVerificationCard — r360 F4's verification seat on the account
 * facts sheet. State derives from /auth/me's emailVerifiedAt (the
 * server's own fact, never a client guess). The resend verb is
 * r359 A4's POST /auth/resend-verification; its honest statuses are
 * surfaced verbatim: 'sent' (رسالة أُرسلت — تحقّق من صندوقك),
 * 'already_verified' (the quiet confirm), 'unavailable' (قناة البريد
 * غير مهيأة — the provider-less refusal as a state, not an error).
 */
function EmailVerificationCard() {
  const { data: me } = useMe();
  const resend = useResendVerification();
  const [line, setLine] = useState<string | null>(null);

  const verified = Boolean(me?.emailVerifiedAt);

  const onResend = () => {
    setLine(null);
    resend.mutate(undefined, {
      onSuccess: ({ status }) => {
        setLine(
          status === 'sent'
            ? 'أُرسلت رسالة التأكيد — تحقّق من صندوق بريدك (ومجلد الرسائل غير المرغوبة).'
            : status === 'already_verified'
              ? 'بريدك مؤكَّد بالفعل — لا حاجة لأي رسالة.'
              : 'قناة البريد غير مهيأة على هذا الخادم حاليًا — أعد المحاولة لاحقًا.',
        );
      },
      onError: () => {
        setLine('تعذّر إرسال رسالة التأكيد — تحقّق من اتصالك ثم أعد المحاولة.');
      },
    });
  };

  return (
    <Card>
      <div className="set-row">
        <div className="set-row-main">
          {verified
            ? <Icon icon={MailCheck} size={16} aria-hidden />
            : <Icon icon={Mail} size={16} aria-hidden />}
          <div>
            <div className="set-row-title">
              {verified ? 'البريد الإلكتروني مؤكَّد' : 'البريد الإلكتروني غير مؤكَّد'}
            </div>
            <div className="set-row-note">
              {verified
                ? 'مرتبط بحسابك ويمكنه استلام روابط الاستعادة والملخّص الأسبوعي.'
                : 'أكِّد بريدك لتأمين استعادة كلمة المرور واستلام الملخّص الأسبوعي.'}
            </div>
          </div>
        </div>
        {!verified && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={onResend}
            disabled={resend.isPending}
            data-loading={resend.isPending ? 'true' : undefined}
          >
            إعادة إرسال رسالة التأكيد
          </button>
        )}
      </div>
      {line && (
        <p className="set-note" role="status">{line}</p>
      )}
    </Card>
  );
}

/**
 * SettingsPage — the ANY-AUTHED account-settings sheet (R320 cycle-3,
 * PAGES-GAP P2-1 + P2-2).
 *
 * The gap this closes (PAGES-GAP T-1/T-2): change-password existed ONLY
 * in the student profile — the API serves every role, and teachers had
 * NO change-password UI at all; language/numerals/notification prefs/
 * sessions/data-export had NO page anywhere; /admin/settings is the
 * ADMIN platform sheet (re-titled «إعدادات المنصّة»), not user
 * settings. THIS page is the one settings door every role shares,
 * mounted like /vision (ProtectedRoute + AppShell, no role allow).
 *
 * Honesty rules (the §D discipline): a seat that does not exist yet
 * renders as an honest «قريبًا» EmptyCell — never a fake toggle that
 * implies server state. What WORKS today and is wired here: theme
 * (the theme store + /me profile sync), change-password (the r180-F4
 * route), and the honest account facts from /auth/me.
 */
export default function SettingsPage() {
  usePageTitle('إعدادات الحساب');
  const { data: me } = useMe();
  const role = useAuthStore((s) => s.user?.role);

  const institution = me?.currentInstitution?.name;
  const displayName = me ? `${me.firstName} ${me.lastName}`.trim() : null;

  return (
    <PageFrame width="default">
      <PageHeader
        title="إعدادات الحساب"
        description="مظهرك وكلمة مرورك ومقاعد حسابك — في ورقة واحدة لكل الأدوار."
        eyebrow="الحساب"
      />

      {/* ── [01] المظهر ─────────────────────────────────────────── */}
      <SheetSection index="01" caption="APPEARANCE" title="المظهر" desc="يُطبَّق فورًا ويُحفظ في ملفك الشخصي.">
        <Card>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Palette} size={16} aria-hidden />
              <div>
                <div className="set-row-title">السمة</div>
                <div className="set-row-note">فاتح · داكن · تلقائي (يتبع نظام جهازك)</div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </Card>
      </SheetSection>

      {/* ── [02] الصوت — r369 slice 05 (spec 05): the reference's
          contract verbatim — default silent, ONE toggle, remembered,
          never autoplay with sound, muted entirely under
          reduced-motion or data-saver. CLIENT-LOCAL on purpose: no
          server field exists for this preference, so the flip is
          instant and honest (the §D discipline — never a fake
          server-settled switch). */}
      <SheetSection
        index="02"
        caption="SOUND"
        title="الصوت"
        desc="أصوات الواجهة — نقرة وتأكيد وإنجاز — متوقفة افتراضيًا وتُحفظ على هذا الجهاز."
      >
        <Card>
          <SoundToggleRow />
        </Card>
      </SheetSection>

      {/* ── [03] تغيير كلمة المرور ──────────────────────────────── */}
      <SheetSection
        index="03"
        caption="PASSWORD"
        title="تغيير كلمة المرور"
        desc="عند التغيير تُنهى جلساتك على بقية الأجهزة وتبقى جلستك مفتوحة."
      >
        <ChangePasswordCard />
      </SheetSection>

      {/* ── [04] معلومات الحساب والتحقق ─────────────────────────── */}
      <SheetSection
        index="04"
        caption="ACCOUNT FACTS"
        title="معلومات الحساب والتحقق"
        desc="كما تقرؤها الخدمة الآن — لا حاجة لتخمين ما هو محفوظ."
      >
        <Card>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={MonitorSmartphone} size={16} aria-hidden />
              <div>
                <div className="set-row-title">الاسم المعروض</div>
                <div className="set-row-note">{displayName ?? '—'}</div>
              </div>
            </div>
          </div>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Languages} size={16} aria-hidden />
              <div>
                <div className="set-row-title">البريد الإلكتروني</div>
                <div className="set-row-note">
                  {me?.email ? <bdi dir="ltr" className="font-mono">{me.email}</bdi> : '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Moon} size={16} aria-hidden />
              <div>
                <div className="set-row-title">الدور</div>
                <div className="set-row-note">{role ? roleLabel(role) : '—'}</div>
              </div>
            </div>
          </div>
          {institution && (
            <div className="set-row">
              <div className="set-row-main">
                <Icon icon={LifeBuoy} size={16} aria-hidden />
                <div>
                  <div className="set-row-title">المؤسسة الحالية</div>
                  <div className="set-row-note">{institution}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
        {/* r360 F4 — the email-verification seat, REAL (r359 A4's
            backend): verified shows the quiet confirmed line; unverified
            shows the banner + the resend verb with its honest outcomes
            (sent / already_verified / unavailable — the provider-less
            refusal is a state, never a fake success). */}
        <EmailVerificationCard />
      </SheetSection>

      {/* ── [05] الإشعارات — the real register (r359 §5.5) ─────── */}
      <NotificationSettingsSection />

      {/* ── [06] اللغة والأرقام (مقعد صادق) ─────────────────────── */}
      <SheetSection
        index="06"
        caption="LANGUAGE"
        title="اللغة والأرقام"
        desc="الواجهة بالعربية حاليًّا، ولا توجد لغات أخرى بعد."
      >
        <SheetEmpty
          title="العربية (الوحيدة حاليًا)"
          desc="إضافة لغات أو نظام أرقام بديل قرار إطلاقٍ لاحق."
          code="SINGLE-LANGUAGE"
        />
      </SheetSection>

      {/* ── [07] الجلسات والأجهزة (مقعد صادق) ───────────────────── */}
      <SheetSection
        index="07"
        caption="SESSIONS"
        title="الجلسات والأجهزة"
        desc="قائمة الجلسات النشطة غير متاحة بعد — وسيلة إنهائها الفعّالة متاحة الآن."
      >
        <SheetEmpty
          title="قريبًا"
          desc="اليوم: تغيير كلمة المرور (القسم [03]) يُنهي جلسات بقية الأجهزة فورًا."
          code="PENDING"
        />
      </SheetSection>

      {/* ── [08] بياناتي (مقعد صادق + قناة) ─────────────────────── */}
      <SheetSection
        index="08"
        caption="MY DATA"
        title="بياناتي"
        desc="لا يوجد تصدير ذاتي أو حذف ذاتي بعد — الطلب يصل عبر قناة التواصل."
        aside={
          /* r351 A2 (Q3): one line + one action — the privacy policy
             keeps its channel seat (pinned by the r320 test). */
          <Link to="/contact" className="btn ghost sm">فتح قناة التواصل</Link>
        }
      >
        <p className="set-note">
          استخدم <Link to="/contact">قناة التواصل</Link> — وما نجمعه في <Link to="/legal/privacy">سياسة الخصوصية</Link>.
        </p>
      </SheetSection>
    </PageFrame>
  );
}
