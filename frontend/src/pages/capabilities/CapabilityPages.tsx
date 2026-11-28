import { Link } from 'react-router-dom';
import { LIVE_CAPABILITIES, LIVE_COUNT, VISION_STATUS } from '../../data/landing-ledger';
import { Glyph } from '../../components/icons';
import { PublicShell } from '../../components/landing/r369/pages/PublicShell';
import { Em, PageHead, ArticleSection } from '../../components/landing/r369/pages/sections';

/** /capabilities — «السجلّ» (R313 · WP-A1 · r369 slice B).
 *
 * The honest ledger page, unchanged in substance:
 *   · ما يعمل اليوم — the capability matrix: every row is a real
 *     product truth (system feature state), numbered, checked, with the
 *     bracketed count in the footer line;
 *   · إلى أين — the honest status pairs: live / simulated /
 *     in-development, exactly as the system is today;
 *   · مساحة العمل التجريبية — the demo-workspace summary: the honest
 *     three-faculty set + the demo-data disclosure, linking to
 *     /colleges (Phase Ω: the platform has no university registry —
 *     institutions build their own).
 * r369: the sheet rides PublicShell + the kit; the drafting chrome,
 * mono-bracket indices and hairline grammar are retired. Every word
 * stays as the system states it.
 */
export function CapabilitiesPage() {
  return (
    <PublicShell>
      <div className="lg p369-t1">
        <PageHead
          n="05"
          icon="check"
          kicker="ما يعمل اليوم"
          title={<>قدرات <Em>موثَّقة</Em>، لا ادّعاءات</>}
          lead="كل رقم يُحسب من حالة الميزات في النظام — يتغيّر مع التحديثات، لا مع الحملات."
          actions={(
            <>
              <Link to="/campus" className="w369-btn w369-btn-primary" aria-label="بيئة العمل الرقمية — لقطات من المنصّة">بيئة العمل الرقمية</Link>
              <Link to="/colleges" className="w369-btn w369-btn-ghost">كيف تُبنى الكليات</Link>
            </>
          )}
        />

        <ArticleSection n="01" title="ما يعمل اليوم">
          <ol className="p369-cap-list">
            {LIVE_CAPABILITIES.map((cap, i) => (
              <li key={cap} className="p369-cap-row">
                <span className="p369-article-num" dir="ltr" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className="p369-cap-text">{cap}</span>
                <span className="p369-cap-check" aria-hidden><Glyph name="check" size={14} /></span>
              </li>
            ))}
          </ol>
          <p className="p369-cap-foot lg-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}] live capabilities · source: system feature state</p>
        </ArticleSection>

        <ArticleSection n="02" title="إلى أين — نحو تعليمٍ يعرف كلَّ طالب">
          <p>
            منظومة تتذكّر ما شاهده وما أخطأ فيه —
            ثم تقترح الخطوة التالية. كل حالة أدناه كما هي في النظام اليوم.
          </p>
          <ul className="p369-status">
            {VISION_STATUS.map((s) => (
              <li key={s.k} className="p369-status-row" data-live={s.live || undefined}>
                <span className="p369-status-k">
                  <Glyph name={s.live ? 'check' : 'clock'} size={14} /> {s.k}
                </span>
                <span className="p369-status-v">{s.v}</span>
                <span className="p369-status-tag" data-live={s.live || undefined}>
                  {s.live ? 'يعمل الآن' : 'محاكاة/قيد التطوير'}
                </span>
              </li>
            ))}
          </ul>
        </ArticleSection>

        <ArticleSection n="03" title={<>مساحة العمل التجريبية — <Em>وكلياتك تُبنى بعد انضمامك</Em></>}>
          <p>موسومة بوضوح، لا تشبه جامعة — والبنية الكاملة تُبنى من بيانات مؤسستك.</p>
          <dl className="p369-rail" aria-label="بيانات السجلّ">
            <div className="p369-rail-row">
              <dt className="p369-rail-label">السجلّ</dt>
              <dd className="p369-rail-value">مساحة عمل أُلارا التجريبية</dd>
            </div>
            <div className="p369-rail-row">
              <dt className="p369-rail-label">الكليات</dt>
              <dd className="p369-rail-value">
                <span className="lg-mono" dir="ltr">3</span> للعرض — علوم الحاسوب، الهندسة، إدارة الأعمال
              </dd>
            </div>
            <div className="p369-rail-row">
              <dt className="p369-rail-label">الحالة</dt>
              <dd className="p369-rail-value">بيانات موسومة بوضوح لأغراض العرض</dd>
            </div>
          </dl>
          <p className="p369-captures-foot">
            بيانات العرض تخصّ «مساحة عمل أُلارا التجريبية» — مساحةً موسومة لأغراض العرض، لا جامعة ولا انتماء،
            وأُلارا منصّة مستقلّة متعددة المستأجرين لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها.
          </p>
        </ArticleSection>
      </div>
    </PublicShell>
  );
}
