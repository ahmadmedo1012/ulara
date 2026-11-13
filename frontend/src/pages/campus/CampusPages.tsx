import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { Logo } from '../../brand';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { PRODUCT_CAPTURES } from '../../data/product-media';
import { ProductFrame } from '../../components/landing/ProductFrame';
import { RevealCssClass } from '../../hooks/useReveal';
/* c3-W6 (K-I extension): the guest sheet chrome (fixed frame + corner
 * marks + grain film) — the /auth pages' drawing-sheet grammar on this
 * chrome-less guest surface. */
import { GuestSheetChrome } from '../../components/layout/GuestSheetChrome';
import '../../styles/campus-media.css'; // the page-scoped capture-grid sheet

/**
 * /campus — «بيئة العمل الرقمية» (Phase Ω).
 *
 * The retired page was the real-university documentary gallery (Commons
 * photographs + official-channel videos of public universities). Phase Ω
 * (identity purity) retires it whole: ULARA is an independent
 * multi-tenant University Operating System — no campus, no university
 * photography, no institutional references. What lives here instead is
 * the platform's OWN environment, honestly:
 *   · real product captures of the running surfaces (the labeled demo
 *     workspace «مساحة عمل أُلارا التجريبية» — every frame carries the
 *     demo-data disclosure);
 *   · the honest statement that every institution's environment is
 *     built from its own data after onboarding — there is no campus to
 *     document because there is no university.
 */
export function CampusLifePage() {
  useThemeSync();

  return (
    <div className="cu">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="cu-header">
        <div className="cu-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link to="/" className="cu-header-brand" aria-label="أُلارا — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            أُلارا
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="cu-main pf-page">
        {/* ── بيئة العمل الرقمية — the platform's own surfaces. The
            section keeps the landing's old #campus-life anchor: deep
            links from the pre-R313 sheet resolve here now. ── */}
        <section id="campus-life" aria-labelledby="cu-photos-title">
          <div className="cu-head pf-page-header-text">
            <span className="fo-eyebrow"><span className="fo-mono" dir="ltr">[01]</span> بيئة العمل الرقمية</span>
            <RevealCssClass as="h1" className="cu-title" delay={1} id="cu-photos-title">
              لا حرمَ جامعيًّا — <em>بيئة تُبنى من بياناتك</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              أُلارا منصّة مستقلة متعددة المستأجرين: لا جامعة ولا حرم ولا صور جامعات.
              ما تراه هنا لقطات حقيقية من واجهات المنصّة نفسها — وبيئة مؤسستك تكتمل من بياناتها بعد انضمامها.
            </RevealCssClass>
            {/* D9: the honest in-page nav pair on the actions row — the
                page's two acts + the sister sub-page. */}
            <RevealCssClass as="div" className="pf-page-actions" delay={3}>
              <Link to="/colleges" className="btn accent">كيف تُبنى الكليات</Link>
              <Link to="/capabilities" className="btn ghost">ما يعمل اليوم</Link>
            </RevealCssClass>
          </div>

          {/* the capture band — the student surfaces (lead + two seats) */}
          <RevealCssClass as="div" className="cw-band" delay={2}>
            <ProductFrame capture={PRODUCT_CAPTURES[0]} variant="lead" />
            <ProductFrame capture={PRODUCT_CAPTURES[2]} variant="std" />
            <ProductFrame capture={PRODUCT_CAPTURES[3]} variant="std" />
          </RevealCssClass>

          {/* the rail: the remaining student surfaces (library) */}
          <RevealCssClass as="div" className="cw-rail" delay={2}>
            <ProductFrame capture={PRODUCT_CAPTURES[1]} variant="std" />
          </RevealCssClass>

          <RevealCssClass as="p" className="cu-foot" delay={3}>
            كل إطار هنا لقطة من المنصّة تعمل فعلاً — ببيانات مساحة العرض التجريبية الموسومة بوضوح.
            لا جامعة في هذه الصور ولا انتماء: أُلارا مستقلّة، وبيئة كل مؤسسة تُبنى من بياناتها.
          </RevealCssClass>
        </section>

        {/* ── لكل دور واجهة — the honest close: the platform serves every
            role inside one institution; the role dashboards live on the
            landing's why stage and are linked, not duplicated. ── */}
        <section id="roles" aria-labelledby="cu-roles-title">
          <div className="cu-head pf-page-header-text">
            <span className="fo-eyebrow"><span className="fo-mono" dir="ltr">[02]</span> لكل دور واجهته</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cu-roles-title">
              منصّة واحدة <em>بأدوار متكاملة</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              الطالب والأستاذ والمسجل وضمان الجودة ومالك المنصّة — كلٌّ يعمل في بيئته داخل مؤسسته،
              وبعزل كامل بين المؤسسات.
            </RevealCssClass>
          </div>

          <RevealCssClass as="p" className="cu-foot" delay={3}>
            جوّز الأدوار الخمسة يُعرض على الصفحة الرئيسية في مقطع «لماذا أُلارا» —
            <Link to="/" className="fo-text-link"> من هنا</Link>.
          </RevealCssClass>
        </section>
      </main>
    </div>
  );
}
