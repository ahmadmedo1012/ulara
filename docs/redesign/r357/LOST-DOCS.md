# LOST-DOCS — سجل المستندات الضائعة في squash الـ 1.0 (مفتاح الإحالات الميتة)

> **R357 · التنظيم الأمين.** هذا الملف هو **المفتاح الجماعي** لكل مسار
> مستند يُستشهد به في الشجرة ولا وجود له على القرص — تحقق R357 في كامل
> تاريخ git (`git log --all -- <path>` = 0 لكلٍّ منها): هذه المسارات لم
> تهبط في أي شجرة بعد squash الـ 1.0. أي إحالة في الكود إلى مسار هنا
> هي **نسبة تاريخية** لعقد/سجل وُجد قبل السكواش — لا تعني ملفًا حيًّا.

## القاعدة

- إحالة إلى مسار في هذا السجل = عقد تاريخي ضائع؛ الحقيقة الحية هي
  البديل المذكور أمامه.
- **لا تُستحدث إحالات جديدة** إلى أي مسار هنا؛ المستند الجديد يعيش في
  شجرته الحقيقية (docs/ الموضوعية أو docs/redesign/rNNN/ للجولة).
- المستندات التي **أُعيد بناؤها** (أدناه) صارت حية بمحتوى مشتق من
> مستشهديها وموسومة كمعاد بناؤها — تُقتبس كمصدر حي.

## 1. أُعيد بناؤها في R357 (صارت حية)

| المسار | ما هو | البديل الحي |
|---|---|---|
| `docs/redesign/r320/LEGAL-TODO.md` | سجل أمانة صفحات القانون (الصفوف 1–18، §3 قاعدتا 1+5، مراسي 7/8 و9 و14 محفوظة) | **أُعيد بناؤه من الكود المستشهد به** — توقيع إعادة البناء في رأسه |
| `docs/redesign/r320/PAGES-GAP.md` | خريطة فجوات الصفحات العامة (§1–§7 + سلّم P) | **أُعيد بناؤه من مستشهديه** — §3 و P2-2 مُعلنان غير قابلَين للاشتقاق بدل اختلاقهما |
| `docs/redesign/r323/brand/BRAND.md` | عقد نظام العلامة الموحّد (الإنشاء 32-grid · عقد الكلمة · الألوان الثلاثة بعد استيلاء «الرقّ والملكي» · §min-sizes) | **أُعيد بناؤه من mark.ts/wordmark.generated.ts/lockups.ts و/__brand** |

## 2. أُعيد توجيه إحالاتها في مواضعها (R357)

| المسار الضائع | المواضع التي صُحّحت | الحقيقة الحية المُشار إليها الآن |
|---|---|---|
| `docs/12-deployment.md` «تخزين رفعات PDF» | لوحة نظام المالك (موقعان في OwnerSystemPage) + اختبارا r164i/r167 | `docs/deployment.md §7.1` — **كُتب قسم خطوات المالك الجديد** في R357 |
| `docs/redesign/r332/css-split-landing.md` | ترويسات صفاات landing الثمانية + LandingPage | خريطة المناطق في ترويسة كل صف + ترتيب الاستيراد في landing.css |
| `docs/redesign/r332/qa/w10a-routes.md` | App.tsx | خريطة التحويلات نفسها في App.tsx |
| `docs/redesign/r308/parity-matrix.md` | chrome.css + اختبارا r308-interaction/r306-landing-sheet | حزام `tests/e2e/r308-landing-instruments.e2e.ts` |
| `docs/redesign/r308/reference-observations.md` §4 | SheetCursor.tsx | القواعد المقيسة في تعليقات الملف |
| `docs/redesign/r322/BRIEF.md` §4 | tokens.css | ترتيب المقاعد الكنسي في كتلة R322 |
| `docs/redesign/r323/brand/BRAND.md` §min-sizes | lockups.ts | القسم الحي في BRAND.md المعاد بناؤه |
| `docs/redesign/r331/css-pass1.md` §5 | layers.css | إعلان الحياد الشلالي في الملف |
| `docs/redesign/r331/web-nav.md` | SheetNav.tsx + LandingPage | تعليقات قواعد SheetNav |
| `docs/redesign/r333/media-capture.md` | product-media.ts | جرد المقاعد في الملف نفسه |
| `docs/redesign/r335/` (الشجرة + الالتقاطات) | Live.tsx | النطاق المسطّر + حزام e2e |
| `docs/design/r190-reference-matrix.md` | components.css | قواعد الاتجاه في كتلة R190 |
| `docs/redesign/handoff/illustrations.md` §4 | illustrations/index.tsx | جرد المشاهد r280 في الملف |
| `docs/16-decisions-and-limitations.md` (عقد D17-3 · §د5 · البند هـ) | authErrors.ts · admin.ts · testimonials.config.ts | العقود الحية في الملفات نفسها |
| `specs/012-design-graphics-uplift/…` (نظام الرسوم) | illustrations/index.tsx | جرد r280 |

## 3. شجرة specs/ كاملة — نسب تاريخية تُقرأ عبر هذا المفتاح

عقود Agent I الأصلية (قبل الـ 1.0)؛ يُستشهد بها في ~41 ملفًا كنسبة
تاريخية وقد **تُركت إحالاتها حرفية** عمدًا (تعليقات سياق فقط — لا
إحالة واحدة منها معروضة في واجهة ولا مُثبتة باختبار). المفتاح:

| الحزمة | عقدها المستشهدة | الحقيقة الحية |
|---|---|---|
| `specs/001-premium-motion-system/` | motion-tokens · interaction-tokens · motion-primitives.tsx · college-identity-profile | `src/styles/motion.css` + `frontend/src/styles/tokens/tokens.css` (مقاعد الحركة الكنسية) + بوابة check-motion-tokens.sh |
| `specs/002-visual-uplift/` | chart-theme | سمات الرسوم الحية في مكونات الرسوم + tokens |
| `specs/004-colleges-gallery/` | gallery-state | `src/styles/colleges.css` + اختبارات المعرض |
| `specs/011-platform-completeness-uplift/` | search | سطح البحث الشامل الحي + اختباراته |
| `specs/012-design-graphics-uplift/` | spec · research · theme-tokens · elevation-language · chart-treatment · audit-script · onboarding-milestone · illustration-system | المقاعد الكنسية في tokens.css · لغة الارتفاع في components.css · معالجات الرسوم · جرد r280 للرسوم |

## 4. عام

- جولات **r305–r340** كلها: شجر مستنداتها ليست على القرص (موثق أصلًا
  في AGENTS.md §1) — هذا السجل يضيف مفتاح الملفات المفردة المستشهد
  بها منها أعلاه.
- `docs/02` (ختم الحقيقة القديم): ذُكر في `r168b-truthfulness.test.tsx`
  مع التصريح بأن شجرة المستند ذهبت — إحالة أمينة، تُترك.

— R357: كل مسار في هذا السجل تحقق غيابه عن كامل تاريخ git قبل تدوينه؛
وكل «بديل حي» أعلاه موجود فعلًا على القرص في شجرة اليوم.
