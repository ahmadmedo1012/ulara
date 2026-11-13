<div dir="rtl">

# أُلارا — نظام تشغيل الجامعة

> **الهوية (سطر واحد، بلا صور):** رمز «وعاء الأُلارا» على شبكة 32 —
> ضربة حبر واحدة مستديرة الأطراف (`M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7`)
> وحجر زاوية سيينا واحد ٤×٤ عند (21,3) — «الجامعة في منظومة واحدة»؛ الورق
> `#F5F1E8` والحبر `#262019` واللكنة سيينا محروقة `#C43E16`، والنسق
> الداكن يتبادل المقعد عبر الرموز (جمر ليلي `#FF6B3D`).
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
| ميزات الأدوار الخمسة | **منفَّذة ومشحَنة** — 1970 اختبار واجهة + 1783 خلفية خضراء + 116 اختبار تكامل قاعدة بيانات + 28 رحلة e2e (جولات r141–r191) |
| نظام التصميم | موثّق في [`DESIGN.md`](DESIGN.md) — بوابة تكافؤ 190/190 خضراء |
| مساعد «Oasis» الذكي | **محرّك محلي حتمي معلن (gap-aware-composer) افتراضيًا + مزوّد LLM حقيقي اختياري** عبر `AI_PROVIDER` — التفصيل: [docs/02](docs/02-features.md) |
| فحص الانتحال | **محاكاة حتمية معلنة** (بلا خدمات خارجية) — التفصيل: [docs/02](docs/02-features.md) |
| رفع PDF ورحلات E2E | **منفَّذة** — رفع PDF خام خلف تجريد التخزين (محلي/S3/**postgres لوضع الطيار r175**) + 28 رحلة متصفّح محكمّة؛ i18n الإنجليزي وحده غير منفَّذ — [docs/02](docs/02-features.md) و[docs/11](docs/11-testing.md) و[docs/16](docs/16-decisions-and-limitations.md) |

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

لقطات الشاشة (1440×900 من التطبيق الحي — النمطان):

| | |
|---|---|
| **الهبوط — Orbit Ink** | ![Landing hero](docs/screenshots/landing-hero.png) |
| **شريط السجل (كيف تُبنى الكليات)** | ![Landing colleges](docs/screenshots/landing-colleges.png) |
| **الدخول — فاتح (كريمي/نحاسي)** | ![Auth light](docs/screenshots/auth-light.png) |
| **الدخول — داكن (ليلي/ذهبي)** | ![Auth dark](docs/screenshots/auth-dark.png) |
| **لوحة المالك — فاتح** | ![Owner light](docs/screenshots/owner-dashboard-light.png) |
| **لوحة المالك — داكن** | ![Owner dark](docs/screenshots/owner-dashboard-dark.png) |

*التعليقات الكاملة وملاحظات الالتقاط: [`docs/screenshots/README.md`](docs/screenshots/README.md).*

## مركز التوثيق

الدليل العربي الكامل في [`docs/`](docs/README.md) — وثائق مرقمة 01–16
+ وثائق قطاعات. أسرع الروابط:

| أريد… | اذهب إلى |
|---|---|
| فهم المشروع وميزاته | [`docs/01-overview.md`](docs/01-overview.md) · [`docs/02-features.md`](docs/02-features.md) |
| فهم المعمارية والمخططات | [`docs/03-architecture.md`](docs/03-architecture.md) |
| خريطة المستودع و«أين أعدّل» | [`docs/04-repository-map.md`](docs/04-repository-map.md) |
| التشغيل محليًا | [`docs/05-setup.md`](docs/05-setup.md) |
| متغيرات البيئة | [`docs/06-configuration.md`](docs/06-configuration.md) |
| قاعدة البيانات | [`docs/07-database.md`](docs/07-database.md) + [`docs/DATABASE-REFERENCE.md`](docs/DATABASE-REFERENCE.md) |
| واجهات API | [`docs/08-api-reference.md`](docs/08-api-reference.md) + [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) |
| رحلات المستخدمين | [`docs/09-user-journeys.md`](docs/09-user-journeys.md) |
| الأمان | [`docs/10-security.md`](docs/10-security.md) + [`SECURITY.md`](SECURITY.md) |
| الاختبارات والفحوص | [`docs/11-testing.md`](docs/11-testing.md) |
| النشر | [`docs/12-deployment.md`](docs/12-deployment.md) |
| الصيانة/استكشاف الأخطاء | [`docs/13-maintenance.md`](docs/13-maintenance.md) · [`docs/14-troubleshooting.md`](docs/14-troubleshooting.md) |
| دليل التطوير والقرارات | [`docs/15-development-guide.md`](docs/15-development-guide.md) · [`docs/16-decisions-and-limitations.md`](docs/16-decisions-and-limitations.md) |
| وكلاء الذكاء الاصطناعي | [`AGENTS.md`](AGENTS.md) |
| مرجع التصميم | [`DESIGN.md`](DESIGN.md) |

## البدء السريع

المتطلبات: **Node.js `>=20 <25`** و**npm** وقاعدة PostgreSQL (Neon مجاني
يكفي). التفصيل الكامل: [`docs/05-setup.md`](docs/05-setup.md).

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
npm test                             # 1975 واجهة + 1775 خلفية (بلا DB؛ يشمل 7 اختبارات S3 حيّة ضد s3rver) — و npm run test:integration يضيف 116 اختبار تكامل على قاعدة محلية معزولة (منها 14 عابرة للمؤسستين لعزل r179 و 2 لأمان إعادة تشغيل البذرة r182)
node scripts/verify-parity-export.mjs  # بوابة التكافؤ 190/190
bash scripts/check-icons.sh            # انضباط Lucide
bash scripts/check-motion-tokens.sh    # رموز الحركة
bash scripts/check-csp-hash.sh         # بصمات CSP
# (validate:colleges أُحيل إلى التقاعد مع كتالوج الكليات الثابت في Phase Ω)
```

الأرقام أعلاه نتائج تشغيل فعلي موثق — منهجية وحدود التغطية:
[`docs/11-testing.md`](docs/11-testing.md).

## متغيرات البيئة (الإلزامية فقط)

| المتغير | ملاحظات |
|---|---|
| `DATABASE_URL` | سلسلة Neon pooler ‏(`sslmode=require&channel_binding=require`) |
| `JWT_ACCESS_SECRET` | 64 بايت hex عشوائية: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | 64 بايت hex **مختلفة** |

الاختيارية (`CORS_ORIGINS` — تستبدل الافتراضي عند ضبطها، `INTERNAL_SERVICE_TOKEN`,
`DIRECT_DATABASE_URL`, `PORT`): الجدول الكامل وسلوك كل متغير في
[`docs/06-configuration.md`](docs/06-configuration.md). لا تضع أسرارًا حقيقية
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

التفصيل والتحقق بعد النشر والتراجع: [`docs/12-deployment.md`](docs/12-deployment.md).

## بنية المستودع (مختصرة)

```text
ulara/
├── backend/          Express + TS · Prisma (79 نموذجًا/31 enum) · 222 endpoint · storage/papers/
├── frontend/         React 18 + Vite · src/styles/ سلسلة الرموز · 18 CSS · tests/ (vitest)
├── docs/             الدليل العربي 01–16 + modules/ + المراجع المولّدة + archive/
├── specs/            مواصفات الميزات (نية زمنية — الحالة في SPECS-REFERENCE)
├── audits/           تقارير تدقيق بصري تاريخية (جولتا 4 و5)
├── scripts/          بوابات الجودة + أدوات المشغِّل (db:backup/db:restore/smoke) + لقطات محلية
├── tools/            boot-pg.sh — PostgreSQL مدمج للتطوير
└── vercel.json      مخطط النشر (Vercel — دوال + ثوابت + cron)
```

الخريطة المفصلة «أين أعدّل ماذا»: [`docs/04-repository-map.md`](docs/04-repository-map.md).

## المساهمة والإبلاغ

- قواعد المساهمة وبوابات الجودة: [`CONTRIBUTING.md`](CONTRIBUTING.md) —
  والتزامات بصيغة `type(rNNN): موضوع`.
- الإبلاغ عن مشكلة: قوالب [Issues](.github/ISSUE_TEMPLATE/) — **المشكلات
  الأمنية بقنوات خاصة فقط** وفق [`SECURITY.md`](SECURITY.md).
- الترخيص: احتكاري — [`LICENSE`](LICENSE) (نشر للعرض والمرجع فقط).

---

*أُلارا (Ulara) · منصّة مستقلّة · الإنتاج: [ulara.vercel.app](https://ulara.vercel.app) · تطبيق أندرويد (تنزيل مباشر): [ulara.apk](https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk)*

</div>
