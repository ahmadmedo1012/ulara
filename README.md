<div dir="rtl">

# أُلارا — نظام تشغيل الجامعة

> **الهوية (سطر واحد، بلا صور):** رمز «وعاء الأُلارا» على شبكة 32 —
> ضربة حبر واحدة مستديرة الأطراف (`M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7`)
> وحجر زاوية أزرق ملكي واحد ٤×٤ عند (21,3) — «الجامعة في منظومة واحدة»؛ الورق
> `#F5F1E8` والحبر `#1A1713` واللكنة الأزرق الملكي `#2540D9` (لوحة 2026
> «الورق والأزرق الملكي»)، والنسق الداكن يتبادل المقعد عبر الرموز
> (أزرق ملكي مضيء `#8AA0FF`).
> الدليل: `shared/brand.json` + `scripts/brand/ulara-kit.mjs`
> · صفحة الفحص: `/__brand`.

**أُلارا (Ulara)** — نظام تشغيل الجامعة: منظومة أكاديمية متكاملة **مستقلّة**
(عربية-أولًا). لا يوجد أي اعتماد أو تبني رسمي من أي
جهة تعليمية — المنصّة متعدّدة المؤسسات: كل مؤسسة تنضم وتبني كلياتها
ومقرراتها من بياناتها هي، وبيانات العرض الظاهرة تخصّ «مساحة عمل
أُلارا التجريبية» — مساحة اصطناعية موسومة بوضوح، لا تحاكي أي جامعة.

> 🌐 **عربية-أولًا** — النسخة الإنجليزية: [`README.en.md`](README.en.md)

## ما هي أُلارا؟

**أُلارا** نظام واحد يخدم الطلاب والأساتذة والباحثين والمسجّلين العامّين ومكتب الجودة ومالك
المنصة: فصول مقلوبة بأسئلة إدماجية، مصفوفة إتقان لكل مفهوم، دورة بحوث
علمية كاملة بقارئ PDF وشروح داخلية، مكتبة بحثية ببحث نصي عربي مطبّع،
قطاع رقابة جودة قرائي، وإدارة أكاديمية بحاكمية وسجل تدقيق — كل ذلك
عربي RTL بنظام تصميم أصيل بسمتين من رمز واحد (ورق/حبر/سيينا — بلا
تدرّجات ولا نحاسي/ذهبي في الهوية).

تقنيًا: خلفية **Express + TypeScript + Prisma 5** تخدم واجهات تحت
`/api/v1/*` وتقدم واجهة **React 18 + Vite** في منصّة واحدة، فوق
قاعدة **PostgreSQL (Neon — فرانكفورت)**، منشورة على **Vercel**
(دوال serverless في `fra1` + مهام مجدولة عبر cron المنصّة).

## حالة المشروع (بصدق)

| البند | الحالة |
|---|---|
| ميزات الأدوار الخمسة | **منفَّذة ومشحَنة** — 2,977 اختبار واجهة + 1,955 خلفية خضراء (قياس على الشجرة النهائية، CI run 44650411057) + 103 اختبار تكامل قاعدة بيانات + 28 رحلة e2e |
| نظام التصميم | موثّق في [`DESIGN.md`](DESIGN.md) — بوابة تكافؤ 190/190 خضراء |
| مساعد «Oasis» الذكي | **محرّك محلي حتمي معلن (gap-aware-composer) افتراضيًا + مزوّد LLM حقيقي اختياري** عبر `AI_PROVIDER` — الحدود والأمانة: [`docs/architecture.md`](docs/architecture.md) §8 |
| فحص الانتحال | **محاكاة حتمية معلنة** (بلا خدمات خارجية) — الحدود: [`docs/architecture.md`](docs/architecture.md) §8 |
| رفع PDF ورحلات E2E | **منفَّذة** — رفع PDF خام خلف تجريد التخزين (محلي/S3/**postgres لوضع الطيار r175**) + 28 رحلة متصفّح محكمّة؛ i18n الإنجليزي وحده غير منفَّذ — [docs/testing.md](docs/testing.md) و[docs/architecture.md](docs/architecture.md) §8 |

## أبرز الميزات

- **الفصول المقلوبة** — محاضرات مسجلة بإدماجيات مصححة فوريًا، تتبع مشاهدة،
  حضور تلقائي عند الإتمام.
- **مصفوفة الإتقان** — تتبع إتقان لكل مفهوم، كشف فجوات، توصيات.
- **دورة البحوث** — إرسال → فحص → مراجعة الأستاذ بشروح داخلية على PDF →
  نشر في مكتبة ببحث نصي عربي (pdfjs كسول، تظليلات، بحث صفحات).
- **القطاع الرابع (الجودة)** — رقابة قرائية: مقررات، أساتذة، تفاعل، مناهج،
  رقابة اختبارات.
- **المسجل العام والحاكمية** — كليات/مقررات/تقارير من قاعدة البيانات، نموذج قدرات
  (17)، نطاق كليات، حرس «آخر مالك نشط»، سجل تدقيق كامل.
- **لوحة المالك** — مؤشرات، تنبيهات تشغيلية، أعلام ميزات، إعدادات.
- **مجتمع جامعي** — منشورات ووسوم، إعلانات بنطاقات، مسابقات وأحداث،
  إشعارات بعدّاد حي.
- **تدريب ذاتي وألعاب** — 11 مسارًا عربيًا بنقاط وشارات ولوحة صدارة.
- **واجهة تعريفية حرفية** — «سماء أُلارا» وشريط السجل الحقيقي برسم canvas
  بلا اعتماديات.
- **اختبارات إلكترونية** — بنك أسئلة وقوالب ومحاولات بتصحيح مطابقة صارم.

## مركز التوثيق

الدليل العربي الحي في [`docs/`](docs/README.md) — ملف موضوعي واحد لكل مجال. أسرع الروابط:

| أريد… | اذهب إلى |
|---|---|
| فهم المشروع وميزاته | هذا `README.md` + [`docs/architecture.md`](docs/architecture.md) |
| المعمارية والقرارات الحيّة | [`docs/architecture.md`](docs/architecture.md) |
| خريطة المستودع و«أين أعدّل» | [`AGENTS.md`](AGENTS.md) §1 |
| التشغيل محليًا | قسم «البدء السريع» أدناه + [`docs/README.md`](docs/README.md) (مسارات القراءة) |
| متغيرات البيئة | [`docs/deployment.md`](docs/deployment.md) §3 + [`.env.example`](.env.example) (عقد `backend/src/env.ts`) |
| قاعدة البيانات | [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) (المصدر) + [`docs/architecture.md`](docs/architecture.md) |
| واجهات API | [`docs/api/openapi.json`](docs/api/openapi.json) (مولّد: `npm run api:openapi`) + [`BACKEND.md`](BACKEND.md) |
| الاختبارات والفحوص | [`docs/testing.md`](docs/testing.md) |
| النشر والتشغيل اليومي | [`docs/deployment.md`](docs/deployment.md) |
| الصيانة واستكشاف الأخطاء | [`docs/runbook.md`](docs/runbook.md) |
| الجوال | [`docs/mobile.md`](docs/mobile.md) |
| نظام التصميم | [`docs/design-system.md`](docs/design-system.md) + [`DESIGN.md`](DESIGN.md) |
| وكلاء الذكاء الاصطناعي | [`AGENTS.md`](AGENTS.md) |
| خارطة الطريق | [`docs/roadmap.md`](docs/roadmap.md) |

## البدء السريع

المتطلبات: **Node.js `>=20 <25`** و**npm** وقاعدة PostgreSQL (Neon مجاني
يكفي). مسارات القراءة: [`docs/README.md`](docs/README.md).

```bash
git clone https://github.com/ahmadmedo1012/ulara && cd ulara
cp .env.example backend/.env       # املأ DATABASE_URL + سريّي JWT (بدون أي قيم حقيقية هنا)
npm install

npm run db:migrate                 # تطبيق المخطط على قاعدتك
npm run db:seed                    # بذر البيانات التجريبية

# نافذتان:
npm run dev                        # الخلفية :4000
npm run dev:web                    # الواجهة :5173 (proxy ‏/api → :4000)
```

**حسابات الاختبار** (R320 §C — حساب واحد سهل لكل دور، المصدر الموحّد
`shared/testAccounts.ts`، والبذر عبر `npm run db:seed` يضمنها دائمًا).
كلمة المرور للجميع: **`12345678`** — بيانات دخول تجريبية معلَنة
(بيئة تطوير؛ لا تُستخدم في الإنتاج):

| المهمّة | البريد | النطاق |
|---|---|---|
| طالب · طالب ثانٍ (للرسائل/المجتمع) | `student@test.ly` · `student2@test.ly` | التعليم |
| أستاذ · رئيس قسم · عميد · نائب عميد | `teacher@test.ly` · `head@test.ly` · `dean@test.ly` · `vicedean@test.ly` | التعليم |
| المسجل العام · مسجل كلية (نطاق كلية) · أخصائي جودة | `registrar@test.ly` · `faculty@test.ly` · `quality@test.ly` | الحوكمة |
| مالك المنصة | `owner@test.ly` | النظام |

يضاف إليها حسابان من الهيكل التجريبي الثاني (عزل المؤسسات):
`teacher2@test.ly` · `admin2@test.ly` بنفس كلمة المرور.

> **حساب الطالب متعدد المؤسسات (r355):** `student@test.ly` عضو في
> **المساحتين معًا** (رقمه في الثانية `UZ-2025-00001`) — هذه هي هيئة
> الإنتاج الفعلية منذ إصلاح بيانات r344. لذا يدخل بلا سياق افتراضي
> (r178: العضويات المتعددة لا تُختار تلقائيًا) فيظهر له **منتقي
> المؤسسة** («اختر مؤسستك») — اختر المساحة الأولى لتجد مقرراته
> ومحتواه، أو الثانية لتجربة التبديل. أي نداء بيانات شخصية قبل
> الاختيار يُرفض بصدق 403 `INSTITUTION_CONTEXT_REQUIRED` — هذا التصميم
> (t14) لا خلل.

> **تجربة العزل بين المؤسستين:** سجّل دخولك بـ`student@test.ly` ثم
> بـ`student2@test.ly` — الرقمان الجامعيان متطابقان عمدًا
> (`UZ-2024-00001`) ورمز المقرر `SE301` موجود في المؤسستين، وكلٌّ منهما
> يرى مقررات مؤسسته فقط (واختبار الشعبة الأخرى يُرفض 403). البذر يعمل
> بعد كل تشغيل واعٍ للبذرة (r183 — create-only وغير مدمّر) — والاستثناء الوحيد
> الموثَّق هو ضمان حسابات `@test.ly` هذه (R320 §C؛ ويمكن
> تفعيل الضمان عند الإقلاع عبر `ULARA_TEST_ACCOUNTS=1`).

## الاختبارات والفحوص

```bash
npm run lint                         # ESLint — 0 أخطاء إلزامية
npm run typecheck                    # tsc — src + tests، الجهتان (بلا DB)
npm test                             # 2,977 واجهة + 1,955 خلفية (قياس على الشجرة النهائية، CI run 44650411057؛ بلا DB؛ يشمل 7 اختبارات S3 حيّة ضد s3rver) — و npm run test:integration يضيف 103 اختبار تكامل على قاعدة محلية معزولة (منها 14 عابرة للمؤسستين لعزل r179 و 2 لأمان إعادة تشغيل البذرة r182)
node scripts/verify-parity-export.mjs  # بوابة التكافؤ 190/190
bash scripts/check-icons.sh            # انضباط Lucide
bash scripts/check-motion-tokens.sh    # رموز الحركة
bash scripts/check-csp-hash.sh         # بصمات CSP
# (validate:colleges أُحيل إلى التقاعد مع كتالوج الكليات الثابت في Phase Ω)
```

الأرقام أعلاه نتائج تشغيل فعلي موثق — منهجية وحدود التغطية:
[`docs/testing.md`](docs/testing.md).

## متغيرات البيئة (الإلزامية فقط)

| المتغير | ملاحظات |
|---|---|
| `DATABASE_URL` | سلسلة Neon pooler ‏(`sslmode=require&channel_binding=require`) |
| `JWT_ACCESS_SECRET` | 64 بايت hex عشوائية: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | 64 بايت hex **مختلفة** |

الاختيارية (`CORS_ORIGINS` — تستبدل الافتراضي عند ضبطها، `INTERNAL_SERVICE_TOKEN`,
`DIRECT_DATABASE_URL`, `PORT`): الجدول الكامل وسلوك كل متغير في
[`docs/deployment.md`](docs/deployment.md) §3 و[`.env.example`](.env.example). لا تضع أسرارًا حقيقية
في أي ملف متتبع.

## النشر على Vercel + Neon

1. جهّز قاعدة Neon (مشروع `ulara-production` — فرانكفورت) وطبّق الترحيلات
   والبذرة: من `backend/` نفّذ `DATABASE_URL=<السلسلة المباشرة> node
   scripts/migrate-deploy.mjs` ثم `npm run prisma:seed`، وتليها سلسلة
   التحصين (`provision-owner.mjs` ثم `rotate-demo-passwords.mjs`).
2. اضبط متغيرات بيئة المشروع على Vercel: `DATABASE_URL` (سلسلة
   **pooler** لبيئة الدوال)، سريّي JWT، و`INTERNAL_SERVICE_TOKEN` مع
   `CRON_SECRET` بالقيمة نفسها (توقيع مهمة cron اليومية).
3. انشر من جذر المستودع: `npx vercel deploy --prod --regions fra1` —
   البناء يولّد عميل Prisma ويبني الواجهة والخلفية، والصحة على
   `/api/v1/health` تعرض SHA المنشور.

التفصيل والتحقق بعد النشر والتراجع: [`docs/deployment.md`](docs/deployment.md).

## بنية المستودع (مختصرة)

```text
ulara/
├── backend/          Express + TS · Prisma (87 نموذجًا/31 enum — المصدر `schema.prisma`) · العقد المولّد 216 مسارًا/253 عملية · storage/papers/
├── frontend/         React 18 + Vite · src/styles/ سلسلة الرموز (30 ورقة + 27 للهبوط) · tests/ (vitest)
├── apps/mobile/      تطبيق Expo/React Native (قفل خاص) — الدليل: docs/mobile.md
├── docs/             الدليل العربي الحي (architecture/deployment/mobile/testing/design-system/runbook/…) + api/openapi.json المولّد
├── scripts/          بوابات الجودة (verify.sh) + أدوات المشغِّل (db:backup/db:restore/smoke)
├── shared/           brand/ + design-tokens.json + testAccounts.ts
├── tools/            boot-pg.sh — PostgreSQL مدمج للتطوير
└── vercel.json      مخطط النشر (Vercel — دوال + ثوابت + cron)
```

الخريطة المفصلة «أين أعدّل ماذا»: [`AGENTS.md`](AGENTS.md) §1.

## المساهمة والإبلاغ

- قواعد المساهمة وبوابات الجودة: [`CONTRIBUTING.md`](CONTRIBUTING.md) —
  والتزامات بصيغة `type(rNNN): موضوع`.
- الإبلاغ عن مشكلة: قوالب [Issues](.github/ISSUE_TEMPLATE/) — **المشكلات
  الأمنية بقنوات خاصة فقط** وفق [`SECURITY.md`](SECURITY.md).
- الترخيص: احتكاري — [`LICENSE`](LICENSE) (نشر للعرض والمرجع فقط).

---

*أُلارا (Ulara) · منصّة مستقلّة · الإنتاج: [ulara.vercel.app](https://ulara.vercel.app) · تطبيق أندرويد (تنزيل مباشر): [ulara.apk](https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk)*

</div>
