# النشر والتشغيل اليومي

> الغرض: كيف تُشحن أُلارا (ويب + تطبيق، مستودع واحد، فرع واحد `main`)
> وما الذي يفعّل النشر أين، والمتغيرات وcron وعمل المشغّل اليومي.
> الشيفرة مصدر الحقيقة: `vercel.json` و`.github/workflows/*.yml`.

## 1. ماذا يفعّل ماذا (push إلى `main`)

| التغيير | Vercel (الويب) | GitHub Actions | EAS |
|---|---|---|---|
| `backend/**` | ✅ نشر (workflow `deploy.yml` بأسراره الثلاثة، أو `vercel deploy` يدويًا) | CI + **deploy-smoke** (ينتظر `buildId == SHA` ثم صحة + 12 دخولًا + لوحة + مقارنة OpenAPI حي/مُلتزَم additive؛ الفشل يفتح issue) | — |
| `frontend/**`, `shared/**` | ✅ نشر | CI | — |
| `apps/mobile/**` أو `shared/**` | ❌ أبدًا (`.vercelignore` يستثني التطبيق) | **Mobile**: بوابات (typecheck · lint · contract-check · export · bundle) + **android-smoke** + **Android APK** | EAS Update لقناتي `production`/`preview` — **خامل** حتى خطوات إعادة التفعيل (§5) |
| تغيير native (تبعية/إضافة/`app.config.ts`/أصول) | ❌ | نفس البوابات + APK جديد | + EAS Build (preview) |
| `docs/**`, `*.md` | ❌ | CI فقط | — |

## 2. المنصة (Vercel + Neon) — الإعداد المنجز

- `api/index.ts` محوّل Vercel؛ `vercel.json`: بناء (prisma generate +
  بناء الواجهة والخلفية)، rewrites (SPA + `/api`)، رؤوس أمنية (CSP
  ببصمة bootstrap السمة، HSTS، …)، وcron (§4).
- **Neon cold start**: الويب دائم الاستيقاظ على Vercel؛ القاعدة (Neon
  مجانية) تصفر الحساب بعد الخمول — أول طلب يدفع استيقاظًا أقل من ثانية،
  وسكربت `backend/scripts/migrate-deploy.mjs` يعيد المحاولة حتى استيقاظ Neon.
- أول طلب بعد نشر جديد: `deploy-smoke` يستقصي `GET /api/v1/status` حتى
  يطابق `buildId` رأس `main` (حتى 20 دقيقة).

## 3. المتغيرات (عقد `backend/src/env.ts`)

| المجموعة | المتغيرات | ملاحظات |
|---|---|---|
| **إلزامية** | `DATABASE_URL` · `JWT_ACCESS_SECRET` · `JWT_REFRESH_SECRET` (كل سر JWT ≥ 32 حرفًا) | الفشل يمنع الإقلاع |
| تشغيل داخلية | `INTERNAL_SERVICE_TOKEN` = `CRON_SECRET` (سر واحد بنقلتين: Bearer للـcron وheader للمشغّل) · `ULARA_TEST_ACCOUNTS=1` (مفعّل على الإنتاج: يفعّل تمريرة ensure — §6) · `CORS_ORIGINS` | مغلقًا عند الغياب |
| تخزين | `STORAGE_DRIVER` (local/postgres/s3) + عند s3: `S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY` | s3 يفشل مغلقًا بدونها |
| ذكاء | `AI_PROVIDER` (local/openai) + `AI_BASE_URL/API_KEY/MODEL` + `AI_DAILY_LIMIT_DEFAULT` | openai يفشل مغلقًا بدون مفاتيحه |
| بريد | `MAIL_API_KEY`, `MAIL_FROM` | اختياري |
| تطبيق | `MIN_APP_VERSION` (semver) · `APP_DOWNLOAD_URL` (افتراضي `/app`) · `STT_*` | بوابة الحد الأدنى: أدنى من القيمة ⇒ شاشة «يلزم تحديث التطبيق» |
| buildId | `VERCEL_GIT_COMMIT_SHA` أو `GIT_SHA` | مشتق منه `buildId` في `/status` (يستقصيه فحص الدخان) |

## 4. cron والوظائف اليومية

`vercel.json` ← `crons`: `0 3 * * *` يضرب `GET /api/v1/jobs/daily`
بسرّ `CRON_SECRET`. الوظائف (idempotent، لا ترفض أبدًا — الفشل جزء من
الحمولة): مزامنة حقائق مؤسّسة العرض + تقليم `LoginEvent` (180 يومًا) +
**تمريرة ensure لحسابات الاختبار** (§6). الطلب الفوري:
`POST /api/v1/jobs/test-accounts` بسرّ الخدمة. في النشر الطويل الأمد
يعمل مجدول داخل العملية نفسها (إقلاع + كل 24 ساعة).

## 5. قناة أندرويد المباشرة + OTA

- **APK موقَّع مباشر** (`android-apk.yml` على runners GitHub): يُبنى
  بسكربت `scripts/build-android-local.sh` ويُنشر إلى إصدار `latest`
  المتدحرج — رابط ثابت دائمًا الأحدث:
  `https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk`
  مفتاح توقيع مخصّص منفصل عن مفتاح المتجر (أسرار Actions:
  `ANDROID_KEYSTORE_B64/PASSWORD/KEY_ALIAS/KEY_PASSWORD`)؛ التوقيع
  المستقر = تحديث في مكانه بلا إزالة تثبيت. صفحة `/app` هي مصدر
  التنزيل المواجه للتطبيق (تخدمها الخلفية `updateUrl`).
- **مسارا البناء المنفصلان (R336 C)**: المسار انقسم إلى مسارَين —
  (أ) **مسار QA** (`qa-apk`): يبني على كل push مؤهِّل APK بتوقيع
  التصحيح (`ALLOW_DEBUG_KEYSTORE=1` — مسار السكربت الموثّق نفسه) بلا
  أي أسرار توقيع، وينشره **كناتج workflow فقط** (30 يومًا) — لا يلمس
  إصدار `latest` أبدًا؛ (ب) **مسار الإصدار** (`release-apk`): يفحص
  الأسرار الأربعة **أولًا قبل أي تنزيل SDK**، وعند غيابها يتخطّى
  بإشعار واضح (مانع خارجي — يوثَّق في ملخص الوظيفة) بدل الفشل الأحمر
  بعد نصف ساعة إعداد (فشل التشغيل 43364410025)، وعند وجودها يتحقق من
  المخزن بـ `keytool` قبل Gradle، ويثبّت بصمة شهادة التوقيع (مطابقة
  مخزن المفاتيح + السر الاختياري `ANDROID_KEY_CERT_SHA256` عند
  توفيره)، وينشر `SHA256SUMS.txt` كأصل في الإصدار، ويرفع سجلات
  البناء عند الفشل. المشغّل اليدوي يقبل مدخل `lane`:
  `qa`/`release`/`both`.
- **OTA** (`expo-updates`, سياسة fingerprint): تغييرات JS تصل كل بناء
  مطابق للبصمة؛ التغيير native يغيّر البصمة ⇒ يلزم بناء جديد مرة ثم
  تجري التحديثات فوقه. **القناة موصولة لكن خاملة**: مشروع EAS الجديد
  لم يُنشأ بعد (`eas init` معلّق) و`EXPO_TOKEN` غير مضبوط. خطوتا
  المالك (~5 دقائق): (1) `npx eas-cli init` من `apps/mobile` وتثبيت
  المعرف الحقيقي في `app.config.ts`؛ (2) إنشاء token في expo.dev ←
  سر Actions `EXPO_TOKEN`. التفصيل: [mobile.md](mobile.md).
- **حقيقة التثبيتات المتقطعة**: البناء من مشروع EAS القديم لا يستقبل
  تحديثات المشروع الجديد (بصمة مختلفة) — طريق ترقيته: إزالة تثبيت
  واحدة ثم تثبيت APK من `/app`؛ بعدها التحديثات في مكانها. الحد الأدنى
  `MIN_APP_VERSION` هو الحارس الشامل لأي متخلّف.

## 6. التشغيل اليومي وحسابات العرض

**فحص ما قبل العرض (5 دقائق):**

```bash
curl -s https://ulara.vercel.app/api/v1/health   # ok:true وbuildId يطابق main
```

افتح `/` (الوضعان فاتح/داكن) ثم سجّل الدخول بحساب طالب.

**حسابات الاختبار** (المصدر الوحيد:
`backend/src/modules/auth/test-accounts.data.ts` — 12 حسابًا، النطاق
`@test.ly` علامة الديمو في المخطط، الكلمة `12345678` معلَنة عمدًا
للتطوير):

| الدور | البريد |
|---|---|
| طالب / طالب ثانٍ (عزل) | `student@` / `student2@test.ly` |
| أستاذ / أستاذ ثانٍ | `teacher@` / `teacher2@test.ly` |
| رئيس قسم / عميد / نائب عميد | `head@` / `dean@` / `vicedean@test.ly` |
| مسجل عام / مسجل كلية / مسجل ثانٍ | `registrar@` / `faculty@` / `admin2@test.ly` |
| أخصائي جودة | `quality@test.ly` |
| مالك المنصة | `owner@test.ly` |

- **إنقاذ الدخول ذاتي البنيوية**: مع `ULARA_TEST_ACCOUNTS=1` تعيد
  تمريرة ensure (الإقلاع + cron اليومي + `POST /jobs/test-accounts`) كل
  حساب إلى كلمة العرض — أي تدوير صامت يُشفى خلال يوم. اليدوي:
  `npm run db:ensure-test-accounts`.
- **تدوير كلمة قبل عرض/إنتاج حقيقي**:
  `npm run db:rotate-password -- --email <الحساب> --new-password-env NEW_PASSWORD --yes`
  (لا تعِد بذر الإنتاج أبدًا)؛ حساب باسمك:
  `npm run db:provision-owner -- --email <بريدك> --yes --suspend-demo-owner`.
- **سردية العرض** (مختصرة): عام ← دخول طالب (لوحة/مقرر/مشغّل محاضرة/
  مكتبة/مساعد) ← أستاذ (تكليف ودرجة) ← مسجل (كلية←قسم←مقرر) ← مالك
  (لوحة/حاكمية) ← **العزل**: ادخل `student2` وحاول فتح ملف المؤسسة
  الأولى ⇒ 403/404 بلا إفصاح.
- **حدود صادقة** (قلها إن سُئلت): الذكاء وضع محلي صادق أو مزوّد خارجي
  بتدهور معلَن؛ نسب الاستلال محاكاة؛ مؤسسة عرض واحدة + مؤسسة عزل؛
  النطاق طيار 5–10 طلبة.

## 7. التخزين والملفات (حدود المضيف الصادقة)

Vercel Functions تسقّف جسم الطلب/الاستجابة عند **4.5 MB** (جبلان
الاتجاهين، خطأ 413 من المنصة قبل أن يرى التطبيق بايتًا) — لذا سقف PDF
المعلَن **4 MiB على Vercel** و**20 MiB عند الاستضافة الذاتية**
(`lib/pdf-limits.ts`)؛ القيمة الحية في `/status` → `maxPdfUploadBytes`
وتفرضها الأسطح الثلاثة. GET ملف أكبر من سقف المضيف يرد 413 عربيًا
يوجّه للعارض داخل التطبيق (RANGE يقطّع تحت الجدار). الفيديو عبر رفع
موقَّع مباشر إلى S3 (`POST /uploads/presign`) لا يمر بدالة — يلزم
`STORAGE_DRIVER=s3`. فتح 20 MiB+ على Vercel: ضبط `S3_*` ثم مدّ التوقيع
المسبق لمساحات PDF (خطة لاحقة).

## 8. النسخ الاحتياطي والاستعادة

```bash
npm run db:backup    # نسخة إلى backups/ مع sha256
npm run db:restore -- --url-env <TARGET> --file backups/<ملف>   # إلى قاعدة عزل فقط
npm run db:verify    # جداول/ترحيلات/عدّ صفوف مقابل قاعدة مرجعية
```

- الاستعادة إلى قاعدة حيّة مرفوضة افتراضيًا (`--confirm-live-restore`
  هو التجاوز الواعي للطوارئ).
- **الخطوة المتبقية على المالك**: نقل ملفات النسخ خارج الخادم — نسخة
  على نفس صندوق القاعدة ليست نسخة احتياطية (`backups/` مهمل في git).
- تدريبات موثقة: آخر جولة كاملة (نسخ 294KB/241ms ← استعادة في قاعدة
  عزل ← `db:verify` PASS ← خلفية ثانية على القاعدة المستعادة ← إسقاط
  القاعدة) — تُسجَّل الجولات في `docs/ops/LEDGER.md`.

## 9. بوابة الحد الأدنى للإصدار + صفحة التوزيع

- `GET /api/v1/status` → `{ minAppVersion, updateUrl }`؛ التطبيق يقارن
  semver عند الإقلاع والعودة: أدنى من الحد ⇒ شاشة تحديث حاجزة مع رابط
  `/app`. غير مضبوط ⇒ لا بوابة. رفعه: متغيرات بيئة Vercel.
- `/app`: APK المباشر (إصدار `latest`)، تاريخ الإصدارات + بصمات، «ما
  الجديد»، حالة iOS. تخدمها الخلفية `updateUrl`.
- **تحديث داخل التطبيق**: فحص صامت عند الإقلاع (`ON_LOAD`) ← تنزيل ←
  toast «تحديث جاهز — أعد التشغيل». خامل حتى إعادة تفعيل OTA (§5)؛
  Telemetry التحديث يحمل `updateId` فيظهر في صندوق المالك أي تحديثٍ
  جاء منه انهيار.
