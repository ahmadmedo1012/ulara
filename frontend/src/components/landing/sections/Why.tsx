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
import { useState } from 'react';
import { RevealCssClass } from '../../../hooks/useReveal';
import { WhyPanels } from '../plates/WhyPanels';

/* the five questions — the sandbox's authored copy, tightened to the
 * reference's answer economy (R349 B2: one honest sentence each —
 * every claim kept, the repetition around it retired). */
const FAQ = [
  {
    q: 'هل بياناتنا معزولة فعلًا؟',
    a: 'نعم — مساحة عمل مستقلة بقاعدة بياناتها لكل مؤسسة، وسجلّ تدقيق يوثّق كل وصول.',
  },
  {
    q: 'ماذا يعني «عربية-أولًا»؟',
    a: 'الواجهة والبحث والتصميم مبنية للعربية أولًا — RTL أصيل، لا ترجمة ملحقة.',
  },
  {
    q: 'هل المساعد الذكي إلزامي؟',
    a: 'لا. المحرّك الافتراضي محلي حتمي، والـLM اختياري يفعّله المالك بنفسه.',
  },
  {
    q: 'كيف تُحسب مصفوفة الإتقان؟',
    a: 'خلية إتقان لكل مفهوم تُبنى من الإجابات والاختبارات — لا من الحضور وحده.',
  },
  {
    q: 'هل يمكن تجربة المنصّة قبل الالتزام؟',
    a: 'نعم — مساحة تجريبية ببيانات اصطناعية موسومة بوضوح، لتجربة كل الأدوار.',
  },
] as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`wy-faq-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="wy-faq-q"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="wy-faq-qrow">
          <span className="wy-faq-plus" aria-hidden="true" />
          <span className="wy-faq-qtext">{q}</span>
        </span>
        <span className="wy-faq-mark fo-mono" aria-hidden="true" dir="ltr">
          +
        </span>
      </button>
      {/* the answer collapses on the grid-rows axis (the modern
          accordion pattern) — a state change, never a hidden-content
          reveal: the reveal law does not apply to interactive state */}
      <div className="wy-faq-a">
        <div className="wy-faq-a-in">
          <p className="wy-faq-atext">{a}</p>
        </div>
      </div>
    </div>
  );
}

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
              أُلارا تنسجم مع عملياتك بدل أن تستبدلها — أربعة أعمدة تجعلها
              جزءًا من اليوم، لا نظامًا إضافيًا فوقه.
            </div>
          </div>
          <div className="wy-note" data-spec="why.note">
            <div className="wy-note-t" data-spec="why.notet">حلقات تخطيطية ذاتية الحركة</div>
          </div>
        </div>
      </div>

      <div className="wy-hrule" aria-hidden="true" data-spec="why.hrule" />

      {/* R346 — the isometric loop panels (the retired WhyScene's mount;
          see the file head + plates/WhyPanels.tsx) */}
      <WhyPanels />

      {/* the FAQ — the sandbox's five questions, closing the band */}
      <div id="faq" className="wy-faq">
        <div className="wy-faq-head">
          <RevealCssClass as="div" className="wy-faq-kick">
            <p className="wy-faq-kicker">الأسئلة الشائعة</p>
          </RevealCssClass>
          <span className="wy-faq-dash" aria-hidden="true" />
          <span className="wy-faq-count fo-mono" dir="ltr">FAQ/05</span>
        </div>
        <RevealCssClass as="div" className="wy-faq-list" delay={1}>
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </RevealCssClass>
      </div>
    </section>
  );
}
