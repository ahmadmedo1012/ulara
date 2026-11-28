/**
 * PublicPages — R320 §D (c2-LEGAL) · the three public sheets.
 *
 * /about [C-04] · /help [C-05] · /contact [C-03]
 *
 * Same laws as the policy sheets (PAGES-GAP §6): every sentence from
 * real code/surfaces — the about page carries the landing's own
 * identity paragraph VERBATIM (nothing added: who-builds-it is a row
 * in LEGAL-TODO), the help page's nine answers each cite a real
 * surface, and the contact page invents NO channel — the early-access
 * register form IS the channel today, stated plainly.
 */
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Glyph } from '../components/icons';
import {
  LegalCell,
  LegalSectionBar,
  LegalSheet,
  PendingTag,
  useLegalMeta,
} from './legal/LegalSheet';
import { LEGAL_UPDATED } from './legal/LegalPages';
import { PublicShell } from '../components/landing/r369/pages/PublicShell';
import { Em, PageHead } from '../components/landing/r369/pages/sections';

/* ═══ [C-04] عن أُلارا ═══════════════════════════════════════════════ */

export function AboutPage() {
  useLegalMeta({
    title: 'عن أُلارا',
    path: '/about',
    description: 'منصّة تعليمية تقنية مستقلّة — البيان كاملًا كما هو في صفحة البداية، بلا إضافات.',
  });

  /* r369 slice B — the about sheet rides the warm world: PublicShell
   * chrome, the kit's PageHead, then the T1 article grammar (circled
   * numbers, world-card cells). Every word is the SAME text the r341
   * sheet carried (tests are law); the drafting frame, grain and
   * mono-bracket indices are retired. */
  return (
    <PublicShell>
      <div className="lg p369-t1">
        <PageHead
          n="01"
          icon="spark"
          kicker="بيان المنصّة"
          title={<>عن <Em>أُلارا</Em></>}
          lead="كل ما يمكن قوله بصدق اليوم موجود في فقرة واحدة — نضعها هنا كما هي في صفحة البداية، حرفيًا."
          actions={(
            <>
              <Link to="/capabilities" className="w369-btn w369-btn-primary">سجلّ القدرات</Link>
              <Link to="/" className="w369-btn w369-btn-ghost">الصفحة الرئيسية</Link>
            </>
          )}
        />

        <section aria-labelledby="about-statement">
          <LegalSectionBar index={1} title="البيان" id="about-statement" />
          <LegalCell>
            {/* The landing's own identity paragraph, VERBATIM
                (LandingPage.tsx:1346-1350 — the r188 honesty pin keeps
                «اصطناعية بالكامل» contiguous on one source line; the same
                discipline holds here). LEGAL-TODO row 14: nothing may be
                added about who builds أُلارا until the owner states it. */}
            <p className="lg-p lg-p-statement">
              منصّة تعليمية تقنية مستقلّة. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «مساحة عمل أُلارا التجريبية» — مساحة اصطناعية بالكامل لأغراض العرض، لا تحاكي أي جامعة.
            </p>
          </LegalCell>
        </section>

        <section aria-labelledby="about-works">
          <LegalSectionBar index={2} title="ما الذي يعمل اليوم" id="about-works" />
          <LegalCell>
            <p className="lg-p">
              المحاضرات التفاعلية، الاختبارات ذاتية التصحيح للموضوعي، مصفوفة الإتقان، مكتبة البحوث برفع
              <bdi className="lg-code lg-mono" dir="ltr">PDF</bdi> والمراجعة، الرسائل والإشعارات، والجدول الأسبوعي — والسجلّ الكامل الصادق
              (ما يعمل حقيقة وما هو محاكاة) في <Link to="/capabilities" className="lg-link">صفحة السجلّ</Link>.
            </p>
          </LegalCell>
        </section>

        <section aria-labelledby="about-builders">
          <LegalSectionBar index={3} title="من يبنيها" id="about-builders" />
          <LegalCell>
            <p className="lg-p">
              لا نضيف هنا شيئًا لم يقله المالك بعد — ما يمكن نشره عن من يبني أُلارا (خلفية، فريق، تمويل)
              <PendingTag />
            </p>
          </LegalCell>
        </section>

        <section aria-labelledby="about-data">
          <LegalSectionBar index={4} title="البيانات" id="about-data" />
          <LegalCell>
            <p className="lg-p">
              الفصل الكامل بين بيانات العرض الاصطناعية وبياناتك الحقيقية في
              {' '}<Link to="/legal/data" className="lg-link">صفحة البيانات</Link>،
              وسياسات المنصّة في <Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link> و
              <Link to="/legal/terms" className="lg-link">شروط الاستخدام</Link>.
            </p>
          </LegalCell>
        </section>

        <footer className="lg-colophon">
          <p className="lg-colophon-line">منصّة مستقلّة · بيانات العرض اصطناعية بالكامل</p>
          <p className="lg-colophon-stamp">
            آخر تحديث: <span className="lg-mono" dir="ltr">{LEGAL_UPDATED}</span>
          </p>
        </footer>
      </div>
    </PublicShell>
  );
}

/* ═══ [C-05] المساعدة والأسئلة الشائعة ══════════════════════════════ */

/** The nine FAQs — every answer cites a real surface (PAGES-GAP P1-5):
 * the five roles, the honest password-reset truth, the noscript line,
 * the reduced-motion paths, the theme toggle, the storage ledger, the
 * capability ledger, the print stylesheet. No invented support channels.
 *
 * r324 X15 — the pilot CREDENTIALS (@test.ly / the shared password)
 * ride `showPilotAccounts`: true on dev/preview builds and on a prod
 * build explicitly made with VITE_PILOT_HELP_ACCOUNTS=1 for the pilot
 * cohort. Default production builds get the honest credential-free
 * variants — a public help page never publishes a working password. */
const faqs = (showPilotAccounts: boolean): ReadonlyArray<{ q: string; a: ReactNode }> => [
  {
    q: 'كيف أجرّب المنصّة؟',
    a: showPilotAccounts ? (
      <>
        بحسابات الاختبار الموزّعة على المختبرين: بريد ينتهي بـ <bdi className="lg-code lg-mono" dir="ltr">@test.ly</bdi> وكلمة المرور <bdi className="lg-code lg-mono" dir="ltr">12345678</bdi> —
        حساب واحد لكل دور، معروضة في لوحة «حسابات تجريبية» على صفحة الدخول في بيئة التطوير (زر «تعبئة»
        يملأ الحقول ثم «دخول» يدخل بها).
      </>
    ) : (
      <>
        حسابات التجربة تُوزّع على فريق المختبرين عند فتح كل مرحلة — إن كنت من المختبرين فاستخدم
        الحساب الذي وصلك من فريق أُلارا، وإن لم يصل بعدُ فانتظر فتح التسجيل من
        {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب</Link>.
      </>
    ),
  },
  {
    q: 'ما الأدوار المتاحة في المنصّة؟',
    a: (
      <>
        خمسة أدوار: <strong>طالب</strong> و<strong>أستاذ</strong> (ومعه المناصب القيادية: رئيس قسم وعميد)
        و<strong>إدارة المؤسسة</strong> (ومناصبها الإدارية: المسجل العام ومسجل كلية) و<strong>أخصائي جودة</strong> و<strong>مالك
        المنصّة</strong> — لكل دور لوحته وصلاحياته المفروضة في الخادم.
      </>
    ),
  },
  {
    q: 'نسيت كلمة المرور — ماذا أفعل؟',
    a: showPilotAccounts ? (
      <>
        الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حسابات <bdi className="lg-code lg-mono" dir="ltr">@test.ly</bdi> كلمة مرورها
        معروفة (<bdi className="lg-code lg-mono" dir="ltr">12345678</bdi>) فتُملأ من صفحة الدخول مباشرة؛ وإن كان حسابك الخاص فقدنا كلمة
        مروره فالطريق اليوم <Link to="/contact" className="lg-link">قناة التواصل</Link> — لا نعدك بغير ما
        يعمل.
      </>
    ) : (
      <>
        الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حساب تجريبي؟ استخدم بيانات الحساب الذي وصلك
        من فريق التجربة وادخل بها مباشرة من
        {' '}<Link to="/auth" className="lg-link">صفحة الدخول</Link>؛ وإن كان حسابك الخاص فقدنا كلمة
        مروره فالطريق اليوم <Link to="/contact" className="lg-link">قناة التواصل</Link> — لا نعدك بغير ما
        يعمل.
      </>
    ),
  },
  {
    q: 'ما المتصفحات المدعومة؟',
    a: (
      <>
        المتصفحات الحديثة بإصداراتها الأخيرة (<bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi>
        و<bdi>Safari</bdi>) مع تشغيل الجافاسكربت — وإن
        كانت معطلة فستقابلك رسالة عربية واحدة تطلب تفعيلها وإعادة التحميل.
      </>
    ),
  },
  {
    q: 'هل يمكن تخفيف الحركة في الواجهة؟',
    a: (
      <>
        نعم: فعّل «تقليل الحركة» في إعدادات نظامك وستنهار كل حركات الواجهة إلى ظهور هادئ — لا يحتاج
        أي إعداد داخل المنصّة.
      </>
    ),
  },
  {
    q: 'كيف أبدّل المظهر الفاتح والداكن؟',
    a: (
      <>
        بمفتاح المظهر في الشريط الجانبي داخل المنصّة، وعلى الشاشات الصغيرة من أعلى صفحة البداية —
        واختيارك يُحفظ على جهازك ويُستعاد في الزيارة التالية.
      </>
    ),
  },
  {
    q: 'ماذا تكتبون على جهازي؟',
    a: (
      <>
        كوكي واحد وتسعة مفاتيح تخزين محلي، لكل واحد غرض معلن — الجدول الكامل مع ما يُحذف عند الرفض في
        {' '}<Link to="/legal/cookies" className="lg-link">صفحة التخزين المحلي</Link>.
      </>
    ),
  },
  {
    q: 'ما الذي يعمل فعلًا وما الذي محاكاة؟',
    a: (
      <>
        سجلّ القدرات يفصل بصدق: <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> — كل
        سطر فيه حقيقة نظام يمكن التحقق منها، وما هو محاكاة أو قيد التطوير موسوم كذلك.
      </>
    ),
  },
  {
    q: 'هل يمكن طباعة السياسات؟',
    a: (
      <>
        نعم — صفحات <bdi className="lg-code lg-mono" dir="ltr">/legal/*</bdi> مصمّمة للطباعة كوثيقة نظيفة بعمود واحد: أرسل أمر الطباعة
        من متصفحك مباشرة وستحصل على النص والإطارات الحاكمة وتاريخ آخر تحديث دون أي زخرفة شاشة.
      </>
    ),
  },
];

export function HelpPage() {
  useLegalMeta({
    title: 'المساعدة والأسئلة الشائعة',
    path: '/help',
    description: 'إجابات قصيرة وصادقة عن أُلارا — كل جواب يشير إلى سطح حقيقي في المنصّة، لا إلى وعود.',
  });

  /* r324 X15 — the credential-bearing FAQ variants render on dev/preview
   * builds, or a prod build explicitly made with VITE_PILOT_HELP_ACCOUNTS=1
   * for the pilot cohort. Default production: the honest, credential-free
   * answers. */
  const showPilotAccounts =
    import.meta.env.DEV || import.meta.env.VITE_PILOT_HELP_ACCOUNTS === '1';
  const faqList = faqs(showPilotAccounts);

  /* r369 slice B — the help sheet rides the warm world: PublicShell
   * chrome, the kit's PageHead, then the FAQ as world cards. The R333
   * P-G3a native details/summary accordion stays; the [nn] mono index
   * becomes the circled number and the chevron the duotone glyph. The
   * first question opens by default so the affordance is discoverable.
   * PI-REC reconciliation: the question text keeps its heading outline
   * (R320 §D pins nine level-2 headings on this page) — the h2 rides
   * INSIDE the summary (valid: summary = one optional heading). */
  return (
    <PublicShell>
      <div className="lg p369-t1">
        <PageHead
          n="02"
          icon="info"
          kicker="أسئلة الزوّار"
          title={<>المساعدة و<Em>الأسئلة الشائعة</Em></>}
          lead="تسعة أسئلة هي ما يسأله الزوار فعلًا — وكل جواب يستند إلى ما يعمل اليوم في المنصّة، بلا تجميل."
          actions={(
            <>
              <Link to="/capabilities" className="w369-btn w369-btn-primary">سجلّ القدرات</Link>
              <Link to="/contact" className="w369-btn w369-btn-ghost">قناة التواصل</Link>
            </>
          )}
        />

        <div className="p369-faq">
          {faqList.map((f, i) => (
            <details className="p369-faq-item" key={f.q} open={i === 0}>
              <summary className="p369-faq-q">
                <span className="p369-article-num" dir="ltr" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="p369-faq-q-text">{f.q}</h2>
                <span className="p369-faq-caret" aria-hidden="true">
                  <Glyph name="chevronDown" size={18} />
                </span>
              </summary>
              <p className="p369-faq-a">{f.a}</p>
            </details>
          ))}
        </div>

        <footer className="lg-colophon">
          <p className="lg-colophon-line">منصّة مستقلّة · بيانات العرض اصطناعية بالكامل</p>
          <p className="lg-colophon-stamp">
            آخر تحديث: <span className="lg-mono" dir="ltr">{LEGAL_UPDATED}</span>
          </p>
        </footer>
      </div>
    </PublicShell>
  );
}

/* ═══ [C-03] التواصل والتسجيل المبكر ════════════════════════════════ */

export function ContactPage() {
  useLegalMeta({
    title: 'التواصل والتسجيل المبكر',
    path: '/contact',
    description: 'قناة التواصل المتاحة مع منصّة أُلارا — التسجيل المبكر، بلا بريد ولا هواتف مخترعة.',
  });

  return (
    <LegalSheet
      title="التواصل والتسجيل المبكر"
      lede="لا نخترع قنوات تواصل — هذه هي القناة المتاحة فعلًا اليوم، مكتوبة كما هي."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="القناة المتاحة" id="contact-channel" />
      <LegalCell>
        <p className="lg-p">
          التسجيل المبكر من صفحة البداية هو قناة التواصل المتاحة حاليًا — لا بريد عام في
          مرحلة الإطلاق. اطلب من
          {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب الجامعي</Link>،
          وما يصل عبره هو ما يقرؤه المشغّل.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا نملكه بعد" id="contact-none" />
      <LegalCell>
        <p className="lg-p">
          لا بريد عام ولا هاتف ولا حسابات اجتماعية اليوم. أي قناة تُضاف ستُعلن هنا أولًا —
          ولن نطلب بياناتك عبر أي طريق آخر.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="زمن الاستجابة" id="contact-sla" />
      <LegalCell>
        <p className="lg-p">
          لا نعد بمدة استجابة لم تُقرّ بعد — نافذة الرد الملتزمة <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأمور الأمنية" id="contact-security" />
      <LegalCell>
        <p className="lg-p">
          بلاغات الثغرات الأمنية تصل عبر القناة نفسها — وسياسة الإفصاح المسؤول في
          {' '}<Link to="/legal/security" className="lg-link">صفحة الأمن</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
