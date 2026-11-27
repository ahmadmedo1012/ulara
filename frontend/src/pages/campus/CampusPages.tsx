import { Link } from 'react-router-dom';
import { PRODUCT_CAPTURES } from '../../data/product-media';
import { ProductFrame } from '../../components/landing/ProductFrame';
import { PublicShell } from '../../components/landing/r369/pages/PublicShell';
import { Em, PageHead, BandSection } from '../../components/landing/r369/pages/sections';

/**
 * /campus — «بيئة العمل الرقمية» (Phase Ω · r369 slice B).
 *
 * The page's truth is unchanged: ULARA is an independent multi-tenant
 * University Operating System — no campus, no university photography,
 * no institutional references. What lives here is the platform's OWN
 * environment, honestly:
 *   · real product captures of the running surfaces (the labeled demo
 *     workspace «مساحة عمل أُلارا التجريبية» — every frame carries the
 *     demo-data disclosure);
 *   · the honest statement that every institution's environment is
 *     built from its own data after onboarding.
 * r369: the sheet rides PublicShell + the kit (T4 showcase); the guest
 * drafting chrome is retired. The #campus-life anchor stays so deep
 * links from the pre-R313 sheet keep resolving.
 */
export function CampusLifePage() {
  return (
    <PublicShell>
      <div className="p369-t4">
        <PageHead
          n="04"
          icon="campus"
          kicker="بيئة العمل الرقمية"
          title={<>لا حرمَ جامعيًّا — <Em>بيئة تُبنى من بياناتك</Em></>}
          lead="أُلارا منصّة مستقلة متعددة المستأجرين: لا جامعة ولا حرم ولا صور جامعات. ما تراه هنا لقطات حقيقية من واجهات المنصّة نفسها — وبيئة مؤسستك تكتمل من بياناتها بعد انضمامها."
          actions={(
            <>
              <Link to="/colleges" className="w369-btn w369-btn-primary">كيف تُبنى الكليات</Link>
              <Link to="/capabilities" className="w369-btn w369-btn-ghost">ما يعمل اليوم</Link>
            </>
          )}
        />

        <section id="campus-life" aria-label="لقطات من واجهات المنصّة">
          <div className="p369-captures-lead">
            <ProductFrame capture={PRODUCT_CAPTURES[0]} variant="lead" />
          </div>
          <div className="p369-captures-grid">
            <ProductFrame capture={PRODUCT_CAPTURES[2]} variant="std" />
            <ProductFrame capture={PRODUCT_CAPTURES[3]} variant="std" />
            <ProductFrame capture={PRODUCT_CAPTURES[1]} variant="std" />
          </div>
          <p className="p369-captures-foot">
            كل إطار هنا لقطة من المنصّة تعمل فعلاً — ببيانات مساحة العرض التجريبية الموسومة بوضوح.
            لا جامعة في هذه الصور ولا انتماء: أُلارا مستقلّة، وبيئة كل مؤسسة تُبنى من بياناتها.
          </p>
        </section>

        <BandSection
          n="02"
          icon="users"
          kicker="لكل دور واجهته"
          title="أدوار المنصّة"
          body="الطالب والأستاذ والمسجل وضمان الجودة ومالك المنصّة — كلٌّ يعمل في بيئته داخل مؤسسته، وبعزل كامل بين المؤسسات."
        >
          <p className="w369-body">
            تعرّف على مساحة العمل المتاحة لكل دور في
            {' '}<Link to="/">الصفحة الرئيسية</Link>.
          </p>
        </BandSection>
      </div>
    </PublicShell>
  );
}
