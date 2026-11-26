/* T-05 (r338) — [06] لماذا أُلارا — REWRITTEN from the frozen reference
 * home-why-wrap spec (the frozen r335 reference captures: home-why-wrap.*.json).
 *
 * R346 (phase-4 art) — the band's CONTENT is the r346 sandbox rebuild's
 * why band, ported: the ruled editorial head keeps its measured seats
 * (the frozen spec's head grid — eyebrow + display h2 | the side rail's
 * vertical rule + lede + mono note) but carries the sandbox's authored
 * copy («مبنيّة لتعمل كما تعمل جامعتك» — the four pillars, not the
 * retired capture-tour); the STAGE is the isometric loop panels
 * (plates/WhyPanels.tsx — the sandbox WhyPanels recipe: four
 * self-running pure-CSS diagrams, one per pillar) in the sandbox's own
 * alternating grid; the FAQ (the sandbox's five questions, verbatim)
 * closes the band. WhyScene.tsx — the R345-ED capture-track workflow
 * scene (the rail/spine/track machine + the real student-surface
 * screenshots) — is RETIRED from the mount; the file stays in the tree
 * for rollback, and the head's note seat now tells the truth about the
 * diagrams instead of claiming screenshots. */
import { RevealCssClass } from '../../../hooks/useReveal';
import { WhyPanels } from '../plates/WhyPanels';
import { DuotoneScene } from '../plates/DuotoneScene';
import { DimensionLine } from '../../patterns/DimensionLine';
import { PlanPlate, DarkCard } from '../plates/PlanPlate';
import cantileverScene from '../../../assets/art-v2/cantilever.svg';

/* r368 slice 07: Blender/Cycles iso plate renders (scripts/art/blender/plate.py) */
const WY_PLATE = {
  campus: new URL('../../../assets/art-v2/plates-bl/campus.webp', import.meta.url).href,
  admin: new URL('../../../assets/art-v2/plates-bl/admin.webp', import.meta.url).href,
  lab: new URL('../../../assets/art-v2/plates-bl/lab.webp', import.meta.url).href,
};

export function Why() {
  return (
    <section className="wy-section" aria-labelledby="wy-title">
      {/* the ruled editorial head — the measured seats carry the
       * sandbox's authored copy (r346): the pillars, not the retired
       * capture-tour. */}
      <div className="wy-head" data-spec="why.head">
        <div className="wy-eyebrow" data-spec="why.eyebrow">
          <div className="wy-eyebrow-t" data-spec="why.eyebrowt">[06] لماذا أُلارا</div>
        </div>
        <RevealCssClass as="div" className="wy-h2w" data-spec="why.h2w" delay={1}>
          <h2 className="wy-title" id="wy-title" data-spec="why.title">مبنيّة لتعمل كما تعمل جامعتك</h2>
        </RevealCssClass>

        {/* the side rail — vertical rule + lede + muted note (mirrored RTL) */}
        <div className="wy-side" data-spec="why.side">
          <div className="wy-rule-v" aria-hidden="true" data-spec="why.rulev" />
          <div className="wy-lede" data-spec="why.lede">
            <div className="wy-lede-t" data-spec="why.ledet">
              أربعة أعمدة تجعلها جزءًا من يوم جامعتك، لا نظامًا إضافيًا.
            </div>
          </div>
          <div className="wy-note" data-spec="why.note">
            <div className="wy-note-t" data-spec="why.notet">حلقات تخطيطية ذاتية الحركة</div>
          </div>
        </div>
      </div>

      {/* the band's measured datum — P3 furniture kit: the ONE
          DimensionLine primitive (patterns/DimensionLine.tsx + the
          .dim-line block in styles/patterns.css) rides the band's own
          rule as section furniture — the reference's dimension chains
          (shot-platform-1's slash-tick strings with mono numerals)
          translated to the DOM voice. The label is the band's own
          measured datum from the r350 measurement program (px @1440,
          the inventory's journey table). Measurement chrome: the
          component forces aria-hidden + pointer-events none, and it
          sits inside this aria-hidden seat. */}
      <div className="wy-hrule" aria-hidden="true" data-spec="why.hrule">
        <DimensionLine className="wy-hrule-dim" label="10168" />
      </div>

      {/* r364 art v2 — the band's hero imagery: the duotone campus
          podium scene (the lone student on the plaza, the reference's
          own scale figure grammar) composed against the flat-shape
          kit — the solid royal circle + slab + the pale disc. The
          four pillars' panels follow below (observe/advise/act/learn
          keep their machines); the scene gives the band its
          architectural hero (mission §2.4: every section carries
          imagery; no band left empty). */}
      <div className="wy-stage" data-spec="why.stage">
        <DuotoneScene
          src={cantileverScene}
          flat
          alt="طالب واحد يعبر ساحة الحرم الجامعي أمام مبنى الخرسانة الصريحة — المقياس الإنساني الذي بُنيت أُلارا حوله"
          variant="stage"
          caption="Y:10168 · قاعدة التشغيل"
          note="مقياس واحد: الطالب على الساحة"
        />
      </div>

      {/* r368 slice 07 — desktop stage: two plan plates floating on bare
          ground with a royal annotation hairline and one dark card (the
          reference's why stage). The cantilever stage above retires from
          the desktop view only (display:none at >=992; DOM kept). */}
      <div className="wy-plates" aria-label="مخططات المباني خلف الأعمدة الأربعة" data-spec="why.plates">
        <div className="wy-plates-a"><PlanPlate plan="plan-campus" src={WY_PLATE.campus} title="الحرم الجامعي — المسقط العام" /><span className="wy-tag fo-mono" aria-hidden="true">ULR · 1012.2<b>سعة القاعة</b></span></div>
        <div className="wy-plates-c"><PlanPlate plan="plan-admin" src={WY_PLATE.admin} title="الإدارة — المسقط الأفقي" /></div>
        <div className="wy-plates-line" aria-hidden="true" />
        <div className="plan-plate plan-plate-checked wy-plates-b">
          <PlanPlate plan="plan-laboratory" src={WY_PLATE.lab} title="المختبر — المسقط الأفقي" />
          <span className="wy-tag wy-tag-b fo-mono" aria-hidden="true">ULR · 1020.2<b>عرض الممر</b></span>
          <DarkCard header="جارٍ الفحص…" rows={['سعة المختبر مقابل الجدول', 'أوقات الذروة', 'الحجوزات المفتوحة']} />
        </div>
      </div>

      {/* R346 — the isometric loop panels (the retired WhyScene's mount;
          see the file head + plates/WhyPanels.tsx) */}
      <WhyPanels />

      {/* r359 A1 — the FAQ RETIRES from the landing (the reference's
          why band closes on the four pillars; the three questions
          live on /help where they belong — the ≥50% copy-cut law). */}
    </section>
  );
}
