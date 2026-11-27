import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLegalMeta } from './legal/LegalSheet';
import { apiBaseURL } from '../lib/api';
import { PublicShell } from '../components/landing/r369/pages/PublicShell';
import { Em, PageHead } from '../components/landing/r369/pages/sections';
import { LegalCell, LegalSectionBar } from './legal/LegalSheet';
/* r369 slice B — the distribution sheet rides the warm world:
 * PublicShell chrome, the kit's PageHead, circled-number section bars
 * and world-card cells (the lg document family). Every URL, live-status
 * behaviour, honesty marker and word is UNCHANGED from the r341/r350
 * sheet; the pf and ap drafting grammar is retired. */

/**
 * /app — «تطبيق أُلارا: التنزيل والتحديث» (R327 D1 · M0.8).
 *
 * The distribution sheet in the public grammar (hairline cells · [nn]
 * bars · paper/ink). EVERY claim is honest and USER-FACING (r359 A1:
 * no internal ops wording — no channel names, no account/activation
 * roadmaps; the owner's runbook lives in RELEASE.md, never here):
 *   · the APK link is the DIRECT-CHANNEL artifact — one URL that always
 *     serves the newest Android build, with a stable signature so new
 *     installs upgrade in place;
 *   · iOS: «قيد الاستعدادات» — the honest user-facing seat (nothing to
 *     install today; we announce when it ships);
 *   · Android users install a new signed build from this page;
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

export function AppDownloadPage() {
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
    <PublicShell>
      <div className="lg p369-t1">
        <PageHead
          n="03"
          icon="download"
          kicker="وثيقة التوزيع"
          title={<>تطبيق <Em>أُلارا</Em> — التنزيل والتحديث</>}
          lead="تنزيل أندرويد المباشر، حالة iOS، وكيف تصل التحديثات — قراءة حيّة من الخادم."
          actions={(
            <>
              <a className="w369-btn w369-btn-primary" href={ANDROID_APK_URL} dir="ltr">تنزيل APK</a>
              <Link to="/" className="w369-btn w369-btn-ghost">الصفحة الرئيسية</Link>
            </>
          )}
        />

          <section aria-labelledby="app-android">
            <LegalSectionBar index={1} title="تنزيل أندرويد (APK)" id="app-android" />
            <LegalCell>
              <p className="lg-p">
                الإصدار <span className="lg-mono" dir="ltr">{APP_VERSION}</span> — أحدث بناء موقّع
                تلقائيًا من أحدث شيفرة؛ اسمح بـ«التثبيت من مصادر غير معروفة» أول مرة، وصفحة
                الإصدارات هي المرجع الدائم.
              </p>
              <p className="lg-p lg-actions">
                <a className="btn primary sm" href={ANDROID_APK_URL} dir="ltr">
                  تنزيل APK
                </a>
                <a className="btn ghost sm" href={BUILDS_PAGE_URL} target="_blank" rel="noreferrer" dir="ltr">
                  صفحة الإصدارات
                </a>
              </p>
            </LegalCell>
          </section>

          <section aria-labelledby="app-ios">
            <LegalSectionBar index={2} title="نسخة iPhone وiPad" id="app-ios" />
            <LegalCell>
              <p className="lg-p">
                نسخة iOS قيد الاستعدادات — سنبّلغك عند توفرها. تطبيق أندرويد
                متاح الآن للتنزيل المباشر، وكل حسابك وبياناتك واحد في النسختين.
              </p>
            </LegalCell>
          </section>

          <section aria-labelledby="app-qr">
            <LegalSectionBar index={3} title="رمز QR — افتح هذه الصفحة من جوالك" id="app-qr" />
            <LegalCell>
              <div className="lg-qr">
                <img
                  /* R355 (raster-art elimination + retired-identity purge):
                   * the r349 honest-PNG fix kept a BINARY asset that —
                   * decoded — still pointed at a stale pre-rebrand
                   * deployment URL (unreachable, and embedding retired
                   * identity bytes inside the module matrix where the
                   * text-scanned zero-trace gate can never see them).
                   * The code is now a TRUE single-path SVG (7.4 KB,
                   * crispEdges, fixed white scan plate + the approved
                   * ink) encoding THIS page's canonical production URL;
                   * the vector identity is pinned by the r349 belt. */
                  src="/media/app/qr-app-page.svg"
                  alt="رمز QR يؤدي إلى صفحة تنزيل تطبيق أُلارا"
                  width={168}
                  height={168}
                  loading="lazy"
                />
                <p className="lg-p lg-p-note">
                  امسح الرمز بكاميرا هاتفك — تُفتح هذه الصفحة نفسها على الجوال، بلا خدمة خارجية.
                </p>
              </div>
            </LegalCell>
          </section>

          <section aria-labelledby="app-updates">
            <LegalSectionBar index={4} title="كيف أحدّث التطبيق؟" id="app-updates" />
            <LegalCell>
              <p className="lg-p">
                على أندرويد، نزّل النسخة الجديدة من هذه الصفحة وثبّتها فوق نسختك الحالية للاحتفاظ ببياناتك.
              </p>
            </LegalCell>
          </section>

          <section aria-labelledby="app-min-version">
            <LegalSectionBar index={5} title="الحد الأدنى للإصدار — قراءة حيّة" id="app-min-version" />
            <LegalCell>
              {statusState === 'loading' ? (
                <p className="lg-p">جارٍ قراءة حالة الخادم…</p>
              ) : statusState === 'error' ? (
                <p className="lg-p">
                  تعذّر قراءة الحالة الآن — الخادم المجاني قد يكون نائمًا؛ حدّث الصفحة بعد لحظات.
                </p>
              ) : (
                <>
                  <p className="lg-p">
                    {status?.minAppVersion ? (
                      <>
                        الخادم يفرض الآن حدًا أدنى{' '}
                        <span className="lg-mono" dir="ltr">{status.minAppVersion}</span> — إن كان
                        تطبيقك أقدم يعيدك إلى هذه الصفحة حتى تُحدّث.
                      </>
                    ) : (
                      <>
                        لا حدّ أدنى مفروض حاليًا — عند فرضه مستقبلًا تظهر قيمته هنا فورًا.
                      </>
                    )}
                  </p>
                  <p className="lg-p lg-p-note">
                    إصدار الخادم الحالي: <span className="lg-mono" dir="ltr">{status?.buildId ?? '—'}</span>
                    {status?.updateUrl ? (
                      <>
                        {' '}· رابط التحديث الرسمي: {' '}
                        <span className="lg-mono" dir="ltr">{status.updateUrl}</span>
                      </>
                    ) : null}
                  </p>
                </>
              )}
            </LegalCell>
          </section>

          <section aria-labelledby="app-requirements">
            <LegalSectionBar index={6} title="المتطلبات والدعم" id="app-requirements" />
            <LegalCell>
              <p className="lg-p">
                أندرويد <bdi className="lg-mono" dir="ltr">8.0+</bdi> و<bdi className="lg-mono" dir="ltr">iOS 15+</bdi> — عربية بالكامل، بالوضعين الفاتح والداكن. للبلاغ عن
                مشكلة: <Link to="/contact" className="lg-link">قناة التواصل</Link>.
              </p>
            </LegalCell>
          </section>

        <footer className="lg-colophon">
          <p className="lg-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</p>
          <p className="lg-colophon-stamp">
            آخر تحديث: <span className="lg-mono" dir="ltr">2026-11-11</span>
          </p>
        </footer>
      </div>
    </PublicShell>
  );
}
