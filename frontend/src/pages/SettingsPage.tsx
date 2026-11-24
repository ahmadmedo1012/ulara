import { Link } from 'react-router-dom';
import { Bell, BellRing, Languages, LifeBuoy, MonitorSmartphone, Moon, Palette, Trash2 } from 'lucide-react';
import { Card } from '../components/primitives';
import { Icon } from '../components/Icon';
import { PageFrame, PageHeader, SheetSection, SheetEmpty, DataSheet } from '../components/patterns';
import { ChangePasswordCard } from '../components/account/ChangePasswordCard';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useMe } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { roleLabel } from '../lib/roleLabels';
import { usePageTitle } from '../hooks/usePageTitle';
/* R359 §5.5 — the notification-settings register: the REAL seats the
 * backend serves (unread state + push devices) built as live UI, the
 * per-category preference seat kept honest (no endpoint yet). */
import {
  useUnreadNotifications,
  useMarkAllNotifsRead,
  usePushDevices,
  useUnregisterPushDevice,
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

/* ── The notification-settings register (r359 §5.5) ───────────────
 * What WORKS today, wired live: the unread state (real count + the
 * mark-all-read verb the bell owns) and the push-device register
 * (list + unregister — registration itself happens from the mobile
 * app per the r326 M2.6 contract). What does NOT exist yet stays an
 * honest seat: per-category preferences (URGENT/ACADEMIC/SYSTEM/
 * SOCIAL) have no backend endpoint — never a fake toggle. */
function NotificationSettingsSection() {
  const unread = useUnreadNotifications();
  const markAll = useMarkAllNotifsRead();
  const devices = usePushDevices();
  const unregister = useUnregisterPushDevice();

  const count = unread.data ?? 0;

  return (
    <SheetSection
      index="04"
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

      {/* The per-category seat — HONEST (no endpoint yet): the four
          categories arrive today with no per-category control on the
          server; a fake toggle would imply state that does not exist. */}
      <div className="set-note">
        تفضيلات الفئات (العاجل · الأكاديمي · النظام · الاجتماعي) تصلك جميعًا اليوم —
        مقعد التحكم لكل فئة على حدة بانتظار مقعد الخدمة المقابل.
      </div>
      <SheetEmpty
        title="التحكم لكل فئة"
        desc="كل الفئات تصلك الآن عبر الجرس والجوال المسجّل — مفتاح إيقاف فئة بعينها يحتاج مقعدًا في الخدمة أولًا."
        code="PENDING"
      />
    </SheetSection>
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

      {/* ── [02] تغيير كلمة المرور ──────────────────────────────── */}
      <SheetSection
        index="02"
        caption="PASSWORD"
        title="تغيير كلمة المرور"
        desc="عند التغيير تُنهى جلساتك على بقية الأجهزة وتبقى جلستك مفتوحة."
      >
        <ChangePasswordCard />
      </SheetSection>

      {/* ── [03] معلومات الحساب والتحقق ─────────────────────────── */}
      <SheetSection
        index="03"
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
        <p className="set-note">
          التحقق بالبريد قيد الإطلاق — حسابات العرض تُنشأ ببريد مؤكَّد في نموذج البيانات.
        </p>
      </SheetSection>

      {/* ── [04] الإشعارات — the real register (r359 §5.5) ─────── */}
      <NotificationSettingsSection />

      {/* ── [05] اللغة والأرقام (مقعد صادق) ─────────────────────── */}
      <SheetSection
        index="05"
        caption="LANGUAGE"
        title="اللغة والأرقام"
        desc="أُلارا عربية-أولًا بلغة واحدة اليوم؛ مقعد اللغة محجوز."
      >
        <SheetEmpty
          title="العربية (الوحيدة حاليًا)"
          desc="إضافة لغات أو نظام أرقام بديل قرار إطلاقٍ لاحق."
          code="SINGLE-LANGUAGE"
        />
      </SheetSection>

      {/* ── [06] الجلسات والأجهزة (مقعد صادق) ───────────────────── */}
      <SheetSection
        index="06"
        caption="SESSIONS"
        title="الجلسات والأجهزة"
        desc="قائمة الجلسات النشطة غير متاحة بعد — وسيلة إنهائها الفعّالة متاحة الآن."
      >
        <SheetEmpty
          title="قريبًا"
          desc="اليوم: تغيير كلمة المرور (القسم [02]) يُنهي جلسات بقية الأجهزة فورًا."
          code="PENDING"
        />
      </SheetSection>

      {/* ── [07] بياناتي (مقعد صادق + قناة) ─────────────────────── */}
      <SheetSection
        index="07"
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
