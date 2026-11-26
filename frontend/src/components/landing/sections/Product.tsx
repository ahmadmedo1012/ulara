/* r338 T-08c → r347 — [5] المنصّة فعليًا. The band's DOM mirrors the
 * frozen reference spec (the r335 reference captures: home-platform-
 * wrap.<bp>.json) — the measured tree is intact one-to-one below; the
 * ONE change is the r347 phase-4 art law: the two real captures
 * (exam-active.webp · ai-tutor.webp) RETIRE from the landing — the
 * image seats become the isometric machines (plates/ProductPlates.tsx:
 * the exam runner + the academic assistant, the same plate grammar as
 * the hero campus plate and the why panels). The owner's directive:
 * the landing's pictures explain the project as 3D drawings, never as
 * screenshots; the capture assets stay in the tree for the inner pages
 * (CampusPages keeps its own ProductFrame mounts).
 *
 *   · the band: top/bottom sheet rules + a 3-col row grid ≥992
 *     (head | two stacked plates | side) — the two platform items
 *     cross-fade on the SAME measured rects (the reference's marquee
 *     row pair); ≤991 each item takes its own row (768 two-col,
 *     390 stacked) with its own plate.
 *   · head cell: label (1.4rem/lh1.4 muted) + title (3.2rem/lh1)
 *     on the reference's body-voice wrappers, ruled top/end.
 *   · side cell: the long text, then the CTA strip — rule + two
 *     short lines + the reference's DUAL circular 50×50 arrow rings
 *     (22×22 line-art, authored via the house Icon) — and the dark
 *     hover menu (624×156, the المساعد الأكاديمي panel) on the measured
 *     rect. The anchor carries the measured orange rgb(250,54,0).
 *   · ≥992 the per-row plate and ≤991 the central plate column
 *     collapse to 0×0 — the reference's own census state at those bps.
 *   · entrance = the reference's own reveal voice (opacity/y → power2.out,
 *     stagger 0.02) via the house RevealCssClass rung.
 * Arabic = transformed expectations; the copy is ours. */
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { RevealCssClass } from '../../../hooks/useReveal';
import { Hairline, Numeral } from '../patterns';
import { ExamRunnerPlate, AssistantPlate } from '../plates/ProductPlates';

/* r368 slice 07: the platform band's central plates are THICK-WALL PLANS at reference scale (the reference's
 * platform band is a large plan with signal callouts), original art from scripts/art/plans-v2.mjs. */
const PLAN_EXAM = new URL('../../../assets/art-v2/plans/plan-exam-hall.svg', import.meta.url).href;
const PLAN_LAB = new URL('../../../assets/art-v2/plans/plan-laboratory.svg', import.meta.url).href;
function PlatformPlan({ src, label, dataSpec }: { src: string; label: string; dataSpec?: string }) {
  return <img className="prp-plan" src={src} alt={label} data-spec={dataSpec} loading="lazy" decoding="async" />;
}

/* the two platform items — copy-driven, mirroring the reference's two
 * carousel items (label/title/long-text/two CTA lines each).
 * r342-06 — the plate pair is capability-disjoint from the neighbouring
 * sections: Why's gallery owns the lecture-player loop (its row-1
 * machine) and the roles deck rides its own machines, so the platform
 * band draws the two capabilities no other landing seat draws — the
 * exam runner (timer + auto-graded objective + essay to the teacher)
 * and the academic assistant. */
const PLATFORM_ITEMS = [
  {
    label: '[05] المنصّة فعليًا',
    title: 'هذه الواجهة نفسها',
    text: 'اختبار إلكتروني يعمل اليوم — مؤقّت، وتصحيح تلقائي، ومقالية تصل للأستاذ.',
    cta1: 'أنشئ حسابك',
    cta2: 'لتجربتها حيّة الآن',
    alt: 'رسم تخطيطي لآلية الاختبار الإلكتروني في أُلارا',
  },
  {
    label: '[05] المنصّة فعليًا',
    title: 'كل الأدوات في قاعة',
    text: 'من نقطة الفحص إلى خطة المراجعة — كل أداة على بيانات الطالب نفسها.',
    cta1: 'ابدأ بجلسة',
    cta2: 'محاضرة حيّة الآن',
    alt: 'رسم تخطيطي للمساعد الأكاديمي في أُلارا',
  },
] as const;

export function Product() {
  return (
    <section id="product" className="pr-section" aria-labelledby="pr-title" data-spec="platform.section">
      {/* the sheet's top rule (the reference section div[1]) */}
      <div className="pr-sheet-rule" data-spec="platform.sheetruleA" aria-hidden="true" />

      <div className="pr-grid" data-spec="platform.grid">
        {/* the two row copies — ≥992 same rects (the cross-fade
            marquee), ≤991 the two stacked item rows */}
        <div className="pr-rows" data-spec="platform.rows">
          <PlatformRow item={PLATFORM_ITEMS[0]} idx={1} />
          <PlatformRow item={PLATFORM_ITEMS[1]} idx={2} hidden />
          {/* the reference's marquee loop copies C/D/E — REAL clones of OUR marquee
           * content (never the reference assets), seated on the recorded band rect:
           * the reference's engine keeps ~5 loop-translated copies of the band and
           * the census records the extra twins on the cross-fade rects; the
           * clones give every recorded twin a same-shaped counterpart
           * (loop seats: out of flow, never visible, never focusable) */}
          <PlatformRow item={PLATFORM_ITEMS[0]} idx={3} clone />
          <PlatformRow item={PLATFORM_ITEMS[1]} idx={4} clone />
          <PlatformRow item={PLATFORM_ITEMS[0]} idx={5} clone />
        </div>

        {/* ≥992 the central plate column — two stacked machines
            (473+473 @1920) flanked by hairlines; ≤991 display:none
            (the reference's own 0×0 census at 768/390) */}
        <div className="pr-imgs" aria-hidden="true">
          <div className="pr-imgs-vrule" data-spec="platform.imgsvruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img1">
            <PlatformPlan src={PLAN_EXAM} label={PLATFORM_ITEMS[0].alt} dataSpec="platform.img1img" />
            {/* r340 T-P1y — the drafting chrome every plate carries
                (the frame now speaks the sheet's own language —
                hairline + [nn] tag on a paper chip) */}
            <div className="pr-frame-chrome" aria-hidden="true">
              <Hairline variant="border" />
              <span className="pr-frame-tag"><Numeral n={1} /></span>
              <span className="lp-tag pr-frame-demo" data-tone="ghost">رسم تخطيطي توضيحي</span>
            </div>
          </div>
          <div className="pr-imgs-hrule" data-spec="platform.imghruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img2">
            <PlatformPlan src={PLAN_LAB} label={PLATFORM_ITEMS[1].alt} dataSpec="platform.img2img" />
            <div className="pr-frame-chrome" aria-hidden="true">
              <Hairline variant="border" />
              <span className="pr-frame-tag"><Numeral n={2} /></span>
              <span className="lp-tag pr-frame-demo" data-tone="ghost">رسم تخطيطي توضيحي</span>
            </div>
          </div>
          <div className="pr-imgs-vrule" data-spec="platform.imgsvruleB" aria-hidden="true" />
        </div>
      </div>

      {/* the sheet's bottom rule (the reference section div[2]) */}
      <div className="pr-sheet-rule pr-sheet-rule-end" data-spec="platform.sheetruleB" aria-hidden="true" />
    </section>
  );
}

/* one platform item — the reference's row copy: head cell (label · title on
 * the body-voice wrappers, ruled top/end), side cell (the text box +
 * the CTA strip with its dual circular arrows and the dark hover
 * menu), and the ≤991 per-row plate with its flanking rule. */
function PlatformRow({ item, idx, hidden, clone }: { item: typeof PLATFORM_ITEMS[number]; idx: 1 | 2 | 3 | 4 | 5; hidden?: boolean; clone?: boolean }) {
  const ds = (k: string) => `platform.${k}${idx}`;
  /* R355 (a11y): propagated to the CTA anchor's tabIndex — see the
     aria-hidden-focus repair at the pr-cta seat. */
  return (
    <div className={`pr-row${clone ? ' pr-clone' : ''}`} data-spec={ds('row')} aria-hidden={hidden || clone || undefined}>
      {/* the head cell — 481×193 @1920 */}
      <div className="pr-head" data-spec={ds('head')}>
        <div className="pr-cell-rule is-top" data-spec={ds('headruleA')} aria-hidden="true" />
        <div className="pr-head-box" data-spec={ds('headbox')}>
          <div className="pr-label" data-spec={ds('label')}>{item.label}</div>
          <RevealCssClass as="div" className="pr-title-wrap" delay={1} data-spec={ds('titlewrap')}>
            <h2 className="pr-title" id={idx === 1 ? 'pr-title' : undefined} data-spec={ds('title')}>
              {item.title}
            </h2>
          </RevealCssClass>
        </div>
        <div className="pr-cell-rule is-end" data-spec={ds('headruleB')} aria-hidden="true" />
      </div>

      {/* the side cell — 619×193 @1920: text box + the CTA strip */}
      <div className="pr-side" data-spec={ds('side')}>
        <div className="pr-cell-rule is-top" data-spec={ds('sideruleA')} aria-hidden="true" />
        <div className="pr-sidebox" data-spec={ds('sidebox')}>
          <RevealCssClass as="p" className="pr-text" delay={2} data-spec={ds('text')}>
            {item.text}
          </RevealCssClass>
        </div>
        <a
          href="#cta"
          className="pr-cta"
          data-spec={ds('cta')}
          /* R355 (a11y): the cross-fade twin + the marquee loop copies ride
             aria-hidden rows — a focusable anchor inside them is the axe
             aria-hidden-focus violation. tabIndex -1 pulls the seat out of
             the tab order (lighthouse's own prescribed fix); the PRIMARY
             row's CTA (idx 1, never hidden) keeps its natural focusability. */
          tabIndex={hidden || clone ? -1 : undefined}
        >
          <div className="pr-cta-rule" data-spec={ds('ctarule')} aria-hidden="true" />
          {/* r338 T-08c2 — the reference's CTA internals are divs (a[2] > div[2] >
              div[1] > …, measured): the structural wrappers re-tagged
              span → div so the explicit pairs pass tag asserts */}
          <div className="pr-cta-body" data-spec={ds('ctabody')}>
            <div className="pr-cta-row" data-spec={ds('ctarow')}>
              {/* the reference's dark hover menu (624×156) — the assistant
                  panel; opens on hover/focus, rect never moves */}
              <div className="pr-menu" data-spec={ds('aicell')}>
                <span className="pr-menu-k" data-spec={ds('menuk')}>المساعد الأكاديمي</span>
                <span className="pr-menu-q" data-spec={ds('menuq')}>اشرح لي مفهوم «نقطة الفحص»</span>
                <span className="pr-menu-a" data-spec={ds('menua')}>سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.</span>
              </div>
              <div className="pr-cta-line" data-spec={ds('ctaline1')}><span data-spec={ds('ctaline1t')}>{item.cta1}</span></div>
              <div className="pr-cta-icons" data-spec={ds('icons')}>
                <div className="pr-cta-ic" data-spec={ds('icon1')}>
                  <div className="pr-cta-icbox" data-spec={ds('iconbox1')}>
                    <Icon icon={ChevronLeft} size={22} />
                  </div>
                </div>
                <div className="pr-cta-ic" data-spec={ds('icon2')}>
                  <div className="pr-cta-icbox" data-spec={ds('iconbox2')}>
                    <Icon icon={ChevronLeft} size={22} />
                  </div>
                </div>
              </div>
            </div>
            <div className="pr-cta-line" data-spec={ds('ctaline2')}><span data-spec={ds('ctaline2t')}>{item.cta2}</span></div>
          </div>
        </a>
        <div className="pr-cell-rule is-end" data-spec={ds('sideruleB')} aria-hidden="true" />
      </div>

      {/* the ≤991 per-row plate (the reference row div[3]; ≥992 it
          collapses to the reference's own 0×0 census state) */}
      <div className="pr-rowimg" data-spec={ds('rowimg')}>
        {idx % 2 === 1 ? (
          <ExamRunnerPlate label={item.alt} dataSpec={ds('rowimgimg')} />
        ) : (
          <AssistantPlate label={item.alt} dataSpec={ds('rowimgimg')} />
        )}
        <div className="pr-rowimg-rule" data-spec={ds('rowimgrule')} aria-hidden="true" />
        {/* r340 T-P1y — the same drafting chrome on the phone-band
            plates (one design language at every width) */}
        <div className="pr-frame-chrome" aria-hidden="true">
          <Hairline variant="border" />
          <span className="pr-frame-tag"><Numeral n={idx} /></span>
          <span className="lp-tag pr-frame-demo" data-tone="ghost">رسم تخطيطي توضيحي</span>
        </div>
      </div>
    </div>
  );
}
