import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Logo } from '../brand';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { GuestSheetChrome } from '../components/layout/GuestSheetChrome';
import { useLegalMeta } from './legal/LegalSheet';
import { apiBaseURL } from '../lib/api';
/* R341 D4 — the distribution sheet rebuilt on the PATTERN LIBRARY (the
 * r340 T-D1a recipe, the D2 about / D3 help / D5 legal precedents):
 * pf-page/pf-page-header/pf-eyebrow/pf-page-actions carry the frame and
 * the app sheet's own ap-* grammar (styles/app.css) owns the rest. The
 * page left the lg-* legal-sheet family — zero lg-* seats remain here
 * (grep-proven), so the /app rules in legal.css died with this rebuild.
 * r350-B2: the prose cut to the B2 law — each section = heading + at
 * most one operative sentence; the ops detail (AAB prep, channel table,
 * simulator note) lives in RELEASE.md, not on the user-facing sheet.
 * Every URL, live-status behaviour and honesty marker is UNCHANGED. */
import '../styles/app.css';

/**
 * /app — «تطبيق أُلارا: التنزيل والتحديث» (R327 D1 · M0.8).
 *
 * The distribution sheet in the public grammar (hairline cells · [nn]
 * bars · paper/ink). EVERY claim is honest:
 *   · the APK link is the DIRECT-CHANNEL artifact — a release APK built
 *     and signed by GitHub Actions (android-apk.yml) from the latest
 *     main, published to the rolling «latest» release: one URL that
 *     always serves the newest build, and a stable signature so new
 *     installs upgrade in place;
 *   · TestFlight is PENDING (needs the owner's Apple Developer account —
 *     RELEASE.md documents the exact owner steps);
 *   · the OTA channel is WIRED but PENDING ACTIVATION (the new EAS
 *     project + the EXPO_TOKEN secret — §04 says so in Arabic, RELEASE.md
 *     carries the re-activation runbook). Until then every update is a
 *     fresh direct APK from this page (stable signature → in-place);
 *   · the minimum-version floor is read LIVE from /api/v1/status — the
 *     same endpoint the app's blocking gate consumes (M0.7).
 *
 * This URL is already wired in the wild: the backend serves it as
 * `updateUrl` in /api/v1/status, so the app's «يلزم تحديث التطبيق»
 * screen lands here.
 */

/* The direct Android channel (Phase Ω): the rolling «latest» GitHub
 * Release, rebuilt automatically whenever apps/mobile or shared/ change
 * — the URL below is ALWAYS the newest build. The releases page is the
 * durable source of truth (history + checksums). */
const ANDROID_APK_URL =
  'https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk';
const BUILDS_PAGE_URL =
  'https://github.com/ahmadmedo1012/ulara/releases';
const APP_VERSION = '1.0.0';

interface StatusShape {
  ok: boolean;
  buildId?: string | null;
  minAppVersion?: string | null;
  updateUrl?: string | null;
}

/** The honest unknown marker — the PendingTag's text in this sheet's
 * own class (visible but tasteful, mirrored in LEGAL-TODO.md). */
function AppPendingTag() {
  return <span className="ap-pending">[يُستكمل قبل الإطلاق]</span>;
}

export function AppDownloadPage() {
  useThemeSync();
  useLegalMeta({
    title: 'تطبيق أُلارا — التنزيل والتحديث',
    path: '/app',
    description:
      'تنزيل تطبيق أُلارا لأندرويد، حالة iOS، قنوات التحديث، والحد الأدنى للإصدار — مباشرة وبدون وسيط.',
  });

  // The live floor — the same status the app's version gate reads (M0.7).
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [statusState, setStatusState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${apiBaseURL}/status`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('status'))))
      .then((body) => {
        const data = (body?.data ?? body) as StatusShape;
        setStatus(data ?? null);
        setStatusState('ok');
      })
      .catch(() => setStatusState('error'));
    return () => ctrl.abort();
  }, []);

  return (
    <div className="ap">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="ap-header">
        <div className="ap-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link to="/" className="ap-header-brand" aria-label="أُلارا — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            أُلارا
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="ap-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">وثيقة التوزيع</p>
              <h1 className="pf-page-title">تطبيق أُلارا — التنزيل والتحديث</h1>
              <p className="pf-page-desc">
                تنزيل أندرويد المباشر، حالة iOS، وكيف تصل التحديثات — قراءة حيّة من الخادم.
              </p>
            </div>
            <div className="pf-page-actions">
              <a className="ap-cta-primary" href={ANDROID_APK_URL} dir="ltr">
                تنزيل APK
              </a>
              <Link to="/" className="ap-cta-ghost">الصفحة الرئيسية</Link>
            </div>
          </div>

          <section aria-labelledby="app-android">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-android">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[01]</span>
                <span className="ap-bar-title">تنزيل أندرويد (APK)</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                الإصدار <span className="ap-mono" dir="ltr">{APP_VERSION}</span> — أحدث بناء
                مبنيّ وموقّع تلقائيًا من أحدث شيفرة؛ اسمح بـ«التثبيت من مصادر غير معروفة» عند
                سؤال النظام أول مرة، وصفحة الإصدارات هي المرجع الدائم (السجل والبصمات).
              </p>
              <p className="ap-p ap-actions">
                <a className="btn primary sm" href={ANDROID_APK_URL} dir="ltr">
                  تنزيل APK
                </a>
                <a className="btn ghost sm" href={BUILDS_PAGE_URL} target="_blank" rel="noreferrer" dir="ltr">
                  صفحة الإصدارات
                </a>
              </p>
            </div>
          </section>

          <section aria-labelledby="app-ios">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-ios">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[02]</span>
                <span className="ap-bar-title">iOS — TestFlight</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                نشر TestFlight ينتظر حساب Apple Developer من المالك
                <AppPendingTag /> — البنية والأيقونات والأذونات بالعربية جاهزة، والخطوات
                موثّقة في صفحة الإصدار الداخلية.
              </p>
            </div>
          </section>

          <section aria-labelledby="app-qr">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-qr">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[03]</span>
                <span className="ap-bar-title">رمز QR — افتح هذه الصفحة من جوالك</span>
              </h2>
            </div>
            <div className="ap-cell">
              <div className="ap-qr">
                <img
                  /* R349 (wave 3 · the QR's honest extension): the asset
                   * shipped since ULARA 1.0 as .svg while carrying PNG
                   * bytes — servers answer image/svg+xml, the browser's
                   * SVG parser refuses the binary magic, and the code
                   * rendered as a broken image on every environment
                   * (localhost + production alike). The file keeps its
                   * PNG identity under its true extension; only this
                   * page mounts it (pinned by the r349 belt's QR pin). */
                  src="/media/app/qr-app-page.png"
                  alt="رمز QR يؤدي إلى صفحة تنزيل تطبيق أُلارا"
                  width={168}
                  height={168}
                  loading="lazy"
                />
                <p className="ap-p ap-p-note">
                  امسح الرمز بكاميرا هاتفك — تُفتح هذه الصفحة نفسها على الجوال، ولا يمرّ الرمز بأي
                  خدمة خارجية.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="app-ota">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-ota">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[04]</span>
                <span className="ap-bar-title">كيف تصل التحديثات؟ (القنوات)</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                كلّ دفعة جديدة للفرع الرئيسي تُبنى وتُوقّع وتحلّ محلّ السابقة في الرابط نفسه —
                والتوقيع ثابت، فتُثبّت النسخة الجديدة فوق نسختك مباشرة.
              </p>
              <p className="ap-p">
                التحديث الفوري داخل التطبيق <span className="ap-mono" dir="ltr">(OTA)</span>
                مبنيّ لكنه <strong>قيد التفعيل</strong>
                <AppPendingTag /> — خطوة تهيئة واحدة من المالك؛ وعندها تصل تغيّرات الواجهة
                <strong> دون إعادة تثبيت</strong>، وتبقى التغيّرات الأصلية (الأذونات ومكتبات
                النظام) ملفّ تثبيت جديدًا من هذه الصفحة.
              </p>
            </div>
          </section>

          <section aria-labelledby="app-min-version">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-min-version">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[05]</span>
                <span className="ap-bar-title">الحد الأدنى للإصدار — قراءة حيّة</span>
              </h2>
            </div>
            <div className="ap-cell">
              {statusState === 'loading' ? (
                <p className="ap-p">جارٍ قراءة حالة الخادم…</p>
              ) : statusState === 'error' ? (
                <p className="ap-p">
                  تعذّر قراءة الحالة الآن — الخادم المجاني قد يكون نائمًا؛ حدّث الصفحة بعد لحظات.
                </p>
              ) : (
                <>
                  <p className="ap-p">
                    {status?.minAppVersion ? (
                      <>
                        الخادم يفرض الآن حدًا أدنى{' '}
                        <span className="ap-mono" dir="ltr">{status.minAppVersion}</span> — إن كان
                        تطبيقك أقدم يعيدك إلى هذه الصفحة حتى تُحدّث.
                      </>
                    ) : (
                      <>
                        لا حدّ أدنى مفروض حاليًا — عند فرضه مستقبلًا تظهر قيمته هنا فورًا.
                      </>
                    )}
                  </p>
                  <p className="ap-p ap-p-note">
                    إصدار الخادم الحالي: <span className="ap-mono" dir="ltr">{status?.buildId ?? '—'}</span>
                    {status?.updateUrl ? (
                      <>
                        {' '}· رابط التحديث الرسمي: {' '}
                        <span className="ap-mono" dir="ltr">{status.updateUrl}</span>
                      </>
                    ) : null}
                  </p>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="app-requirements">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-requirements">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[06]</span>
                <span className="ap-bar-title">المتطلبات والدعم</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                أندرويد 8.0+ وiOS 15+ — عربية بالكامل، بالوضعين الفاتح والداكن. للبلاغ عن
                مشكلة: <Link to="/contact" className="ap-link">قناة التواصل</Link>.
              </p>
            </div>
          </section>

          <footer className="ap-colophon">
            <p className="ap-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</p>
            <p className="ap-colophon-stamp">
              آخر تحديث: <span className="ap-mono" dir="ltr">2026-11-11</span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
