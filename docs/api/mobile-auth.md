# المصادقة للعملاء غير المتصفّحية (Expo)

> الغرض: أصغر عقد كامل يحتاجه عميل غير متصفّحي (تطبيق Expo) للدخول
> والبقاء في جلسة صالحة. المصدر — الشيفرة نفسها:
> `backend/src/http/routes/auth.routes.ts` + `backend/src/lib/jwt.ts` +
> `backend/src/modules/auth/auth.service.ts`. كل المسارات تحت
> `/api/v1/auth`، والغلاف `{ data }` / `{ error: { code, message } }`
> (رسائل عربية، أكواد UPPER_SNAKE). بقية العقد (register،
> forgot/reset-password) في `docs/api/openapi.json`.

## 1. الدخول — `POST /auth/login`

- الجسم: `{ email, password }` — المعرّف بريد إلكتروني **أو** رقم قيد
  جامعي، و`institutionSlug` اختياري لفضّ اشتراك رقم القيد عبر مؤسسات؛
  محدود بمعدّل 10 محاولات / 15 دقيقة لكل IP.
- كلمة المرور argon2id (سياسة 8–72 حرفًا)؛ 5 محاولات فاشلة ⇒ قفل
  15 دقيقة.
- الرد 200: `{ data: { user, accessToken } }` + كوكي `ulara_refresh`.

## 2. العقدان (tokens)

| العقد | الخصائص |
|---|---|
| accessToken | JWT **HS256**، صلاحية 15 دقيقة، claims `{ sub, role, inst, type:'access' }` — يُرسل `Authorization: Bearer` |
| refreshToken | JWT، صلاحية 7 أيام، claims `{ sub, ver, type:'refresh' }` — كوكي `ulara_refresh` (httpOnly، `sameSite=strict`، المسار `/api/v1/auth`) فقط؛ `ver` = tokenVersion |

- `inst` = معرّف المؤسسة المختارة للجلسة (أو `null` بلا سياق). هو
  **تلميح توجيه فقط**: كل مسار مؤسسي يعيد حلّ العضوية النشطة من قاعدة
  البيانات — الـclaim بذاته لا يمنح شيئًا.

## 3. التدوير واختيار المؤسسة

- `POST /auth/refresh` — من الكوكي (`ulara_refresh`)؛ جلسة انزلاقية
  بنفس `tokenVersion` (الأجهزة المتعددة تبقى حيّة)، والرد جلسة جديدة
  `{ user, accessToken }` + كوكي مدوَّر.
- `POST /auth/select-institution` — Bearer + `{ institutionId }`: يتحقق
  الخادم من عضوية ACTIVE في مؤسسة ACTIVE ثم يصدر عقدًا جديدة تحمل
  `inst` (نفس شكل الرد). بلا سياق (`inst = null`) تجيب المسارات
  المؤسسية **403 INSTITUTION_CONTEXT_REQUIRED** — نادِ select-institution
  أولًا.

## 4. من أنا — `GET /auth/me`

- Bearer؛ الحمولة: `memberships[]` (المؤسسات النشطة) +
  `currentInstitution` (تُعاد من claim `inst` بعد حلّها مقابل القاعدة) +
  `membershipRole` + `studentProfile`/`teacherProfile` **للعضوية الحالية
  فقط** — بلا سياق ⇒ `null` (والملف الشخصي لا يُسرَب عبر المؤسسات).

## 5. الخروج وتغيير كلمة المرور

- `POST /auth/logout` — Bearer **أو** الكوكي وحده (حتى بعد انتهاء
  accessToken): يبطل عقد التجديد (bump `tokenVersion`) ويمسح الكوكي —
  204 بلا جسم.
- `POST /auth/change-password` — Bearer + `{ currentPassword, newPassword }`
  (10 محاولات فاشلة / 15 دقيقة لكل مستخدم): تحقق argon2 من الحالية
  أولًا، ثم bump **`tokenVersion` في كتابة ذرّية واحدة** — كل عقد تجديد
  في كل الأجهزة يموت فورًا، وهذا الجهاز يواصل بالجلسة الجديدة
  المردودة.
