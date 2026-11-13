# تطبيق الجوال (أُلارا)

> الغرض: الدليل الواحد لتطبيق أُلارا على Expo/React Native — الهوية،
> البنية والقشرة، الطبقات الأساسية، الاختبار، البناء، القنوات، والأسرار.
> الشيفرة مصدر الحقيقة: `apps/mobile/**` + `.github/workflows/mobile.yml`.

## 1. الهوية والعلامة

- **المعرّفات**: الحزمة `ly.ulara.app` (Android+iOS)، الاسم «أُلارا»،
  المخطط `ulara://`، الوصف الرسمي. عربية-أولًا: RTL مفروض
  (`I18nManager.forceRTL` + `ensureRTL` مرة واحدة عند الإقلاع)،
  ترجمة `ar`، أرقام لاتينية افتراضيًا مع خيار عربية-هندية
  (`useNumerals` — بلا Intl على Hermes عمدًا).
- **البصمة البصرية**: ورق/حبر/سيينا (نظام ds — انظر
  [design-system.md](design-system.md))؛ 8 أصول أيقونات/بلاش مطابقة
  بايتًا للعلامة (`tokens:check` ← `icons:check 8/8`).
- **الصلاحيات**: Face ID/اللمس الحيوي عبر `expo-local-authentication`
  (عبارة الطلب عربية)، إشعارات (`expo-notifications` — أيقونة العلامة
  + صبغة سيينا لشريط الحالة)، لا كاميرا/موقع.
- **أندرويد**: edge-to-edge (SDK 58)، `predictiveBackGestureEnabled`
  (صفر استدعاءات `BackHandler.preventDefault` — مضمّن بالفحص)،
  `expo-navigation-bar` بـ`enforceContrast` + `AppNavigationBar`
  المشتق من السمة (`src/design/navbar.tsx`). iOS: جاهز تمامًا بلا
  حساب Apple (بند المتجر في §8).

## 2. البنية والقشرة

Expo SDK 58 · RN 0.88 · React 19.3 · expo-router (React Compiler مفعّل).

- **الجذر** (`app/_layout.tsx`): `GestureHandlerRootView` ←
  `SafeAreaProvider` ← مزوّدو الأوراق (`BottomSheetModalProvider` بتحميل
  كسول) ← `QueryClientProvider` + `QueryCacheBoot` (استمرارية كاش 24
  ساعة) ← `KeyboardProvider` ← `NetworkBanner` (اشتراك NetInfo واحد +
  جسر TanStack: الاستعلامات تتوقف دون اتصال وتستأنف) ←
  `AppStatusBar`/`AppNavigationBar` + `haptics.hydrate()` + بوابة
  الإصدار (`BlockingUpdateGate`/`useVersionGate` — أرضية
  `MIN_APP_VERSION`).
- **الأدوار**: لكل دور Stack + `(tabs)`؛ شريط سفلي واحد لكل دور
  يُعرض من `_layout` عبر خاصية `tabBar` — **لا يُفكَّك أبدًا** (مثبت
  باختبار navigation-stability)؛ `ROLE_TABS` في `roleTabs.ts` هو مصدر
  التبويبات الوحيد (5 أدوار × 5 تبويبات عربية). المسارات التفصيلية
  تدفع فوق الشريط؛ الإخفاء الغامر (`shell/immersive.tsx`) سياسة
  مدفوعة بالمسار للمشغّل وغرفة الاختبار فقط.
- **الجولة للدخول**: `/select-institution` بعد الدخول للأدوار غير
  المالك (اختيار المؤسّسة عند تعدد العضويات).
- **الشبكة**: `src/api/client.ts` يلتقط `ulara_refresh` وحده
  (`Set-Cookie`) ويبعه `Cookie:` عند التحديث — عقد المصادقة في
  [architecture.md](architecture.md) §6.

## 3. الطبقات الأساسية (الملفات هي المرجع)

| الطبقة | المدخل | القاعدة الحاكمة |
|---|---|---|
| السيمانتك | `src/design/semantic.ts` + `theme.tsx` | عنصر برتقالي **واحد** لكل شاشة (`accent`)؛ نص بحجم الجسم عبر `accentInk`؛ نجاح/تحذير/خطر نغمات تغذية راجعة؛ ارتفاع = درجة سطح + خط شعري — **لا ظلال إطلاقًا** |
| الحركة | `src/motion/` (reanimated 4.7) | `transform`/`opacity` فقط؛ يُخفض كل شيء مع `prefers-reduced-motion`؛ زنبرك للتفاعل وتوقيت للحالات؛ منحنى ds واحد؛ خروج أسرع من دخول |
| اللمس | `src/haptics.ts` | باب واحد مسجَّل (بوابة تشغيل + خنق لكل نوع + أرضية 60ms)؛ الويب no-op دائمًا؛ لا استيراد مباشر لـ`expo-haptics` من الشاشات أبدًا |
| الأوراق | `src/components/ui/sheet.tsx` (gorhom 5) | `AppSheet` بنقاط snap ومتصلة بلوحة المفاتيح؛ المدخلات داخل الورقة `SheetTextInput` حصرًا |
| القوائم | `src/components/ui/data.tsx` | `DataList` على FlashList v2 (JS-only، بلا بصمة native): تدوير + ترقيم صفحات تراكمي + حالات ثلاثية افتراضية |
| النماذج | `src/components/ui/form.tsx` + `fields.tsx` | `FormScreen` فوق keyboard-controller (شريط «التالي/تم»)؛ تحقق zod برسائل عربية؛ أرضية لمس 44pt |
| المرونة | `src/lib/resilience/**` | إعادة محاولة الاستعلامات 3× للعابر فقط (4xx إجابة لا طلب)؛ طابور إجابات الاختبارات دون اتصال (`flushAnswers` — الفشل الدائم يُسقط ويُبلَّغ، لا يُبتلع)؛ `humanizeError` للحدود — لا `e.message` خام للمستخدم |
| الحقيقة | كل شاشة | القواعد الست: skeleton/خطأ/فراغ/دون اتصال/تحميل/معطّل — لا نص خافت بدل الحالات؛ الأرقام التقديرية «estimated»؛ لا تسريب enum خام أو إنجليزية |

## 4. الاختبار والأمانة

الأوامر المثبتة (من `apps/mobile`):

```bash
npm run typecheck        # tsc صارم — 0 أخطاء
npm test                 # jest: render-net (كل مسار يُصعد) + role-session + navigation-stability
npx expo lint            # 0 أخطاء (تحذيرات مثبّتة موثقة)
npm run contract-check   # المسارات المستهلكة مقابل مصدر الخلفية
npm run tokens:check     # توكنات/أيقونات مطابقة بايتًا
npm run api:types        # أنواع OpenAPI المولدة — أي انحراف يفشل CI
npx expo export --platform android   # ضمن سقف 8MB JS للمنصة (بوابة CI)
```

- **وسم الأمانة إلزامي**: لم يكن هناك محاكي/جهاز في بيئة التطوير — كل
  ادعاء يحمل ملصقه (`tsc`-verified · jest-verified · device-UNVERIFIED).
  ما لم يُشغَّل لا يُدَّعى؛ الجهاز يمر عبر EAS/المالك.
- **خط تدقيق RN-web** (لقطات/مراجعة بصرية): `expo export --platform web`
  إلى مجلد مؤقت ← خادم SPA صغير (404←index.html) على ‎:8899 ← وكيل
  CORS مفتوح على ‎:8900 ← المتصفح الحقيقي. لاحظ: قائمة CORS الإنتاجية
  تسمح لـlocalhost:5173 فقط — الوكيل لبيئة التطوير حصرًا.

## 5. android-smoke (مايسترو على المحاكي)

وظيفة CI `android-smoke` (بعد البوابات، عند كل push مع إمكان التشغيل
اليدوي): قاعدة Postgres محلية مزروعة + خلفية dev + **بناء APK إصدار**
بمفتاح مؤقت + `adb install` ثم رحلات مايسترو
(`apps/mobile/.maestro/`):

- `smoke-role.yaml` بمعاملات `EMAIL/PASSWORD/ROLE`: حالة نقية ← شاشة
  الترحيب ← تسجيل دخول حقيقي (`POST /auth/login`) ← تأكيد عنوان لوحة
  الدور ← 3 تبويبات ← `/settings` عبر deep link `ulara://` ← تأكيد
  الحذف ← العودة لبوابة الدخول. الحسابات: `student/teacher/registrar/
  quality/owner@test.ly` بكلمة `12345678`.
- `first-open.yaml` لرحلة أول فتح، و`role-*.yaml` لكل دور.
- **وصفة المحاكي** (وصية المالك، لا تتغير): صورة `google_apis`
  API-34، ملف `pixel_6`، `-no-window -gpu swiftshader_indirect
  -no-audio -no-boot-anim -no-snapshot-save`، **تصفير مقاييس الحركة**.
  بلا هذه الوصفة لا يقدّم المحاكي سطح React أصلًا (دروس موثقة).
- **بوابة logcat**: بعد الرحلات يُفحص السجل عن توقيعات انهيار
  (FATAL EXCEPTION | ReactNativeJS Error | SIGABRT | Invariant
  Violation) — الوجود = فشل الوظيفة، والأدلة الجنائية تُرفع artifact.

## 6. البناء (أندرويد)

السكربت: `scripts/build-android-local.sh` (جذر المستودع، idempotent،
يفشل بصوت عالٍ ولا ينزّل شيئًا تلقائيًا).

**المتطلبات**: JDK 17+ · SDK (`platforms;android-37` ·
`build-tools;37.0.0` · `platform-tools`) + NDK 27.1 (~2GB عند وحدات
native) · ‎10GB قرص · أول بناء 10–25 دقيقة.

**المفتاح (واحد للأبد، لا يُدفع أبدًا)**:

```bash
mkdir -p ~/.ulara && keytool -genkeypair -v -keystore ~/.ulara/ulara-release.keystore \
  -alias ulara -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12 \
  -dname "CN=Ulara, OU=Mobile, O=Ulara, L=Tripoli, ST=Tripoli, C=LY"
export ULARA_ANDROID_KEYSTORE=~/.ulara/ulara-release.keystore
export ULARA_ANDROID_KEYSTORE_ALIAS=ulara
export ULARA_ANDROID_KEYSTORE_PASSWORD='…'        # بعيدًا عن سجل الشل
```

**المسارات الثلاثة**:

| | أ. gradle محلي | ب. `eas build --local` | ج. سحابة EAS |
|---|---|---|---|
| الأمر | `scripts/build-android-local.sh` | `eas build --profile preview --local` | `eas build --profile preview --no-wait` |
| الحصة | لا تستهلك | لا تستهلك | تستهلك حصة الحساب |
| يحتاج | JDK+SDK+مفتاح (بيئة) | Docker (لينكس) + بيانات EAS | `EXPO_TOKEN` |

- الناتج: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
  (للمتجر: `./gradlew bundleRelease` ← AAB). المسار ذاته يقوده CI في
  `android-apk.yml` وينشر لإصدار `latest` (§7).
- `versionCode`: البناء المحلي يقرأه من `app.config.ts` (اضبطه صراحة
  لكل إصدار)؛ سحابة EAS بـ`appVersionSource:"remote"` تزيده تلقائيًا —
  لا تُشحن ثنائيتين برقم واحد أبدًا.
- استكشاف سريع: «Unsupported class file» = JDK قديم؛ «target android-37»
  = مكونات/تراخيص SDK ناقصة؛ exit «template drift» = تحديث مرساة
  المُرقِّع في السكربت بعد تغيّر قالب prebuild؛ OOM على أجهزة 4GB =
  رفع `org.gradle.jvmargs`.
- `ALLOW_DEBUG_KEYSTORE=1` يبني APK بتوقيع تصحيح (للمحاكي فقط — المتجر
  يرفضه). كل `android/` مولّد ومُهمَل في git (CNG) — لا تلتزم منه
  شيئًا.

## 7. القنوات والنشر

- **القنوات** (`eas.json`): `development` (dev-client) · `preview`
  (APK داخلي/محاكي iOS) · `production` (app-bundle). كلها تحمل
  `EXPO_PUBLIC_API_BASE_URL=https://ulara.vercel.app/api/v1`.
- **سياسة fingerprint**: تغيير JS يصل عبر `eas update` لكل بناء مطابق
  للبصمة؛ أي تغيير native (تبعية/إضافة/مفاتيح `app.config.ts`) يغيّر
  البصمة ⇒ بناء ثنائي جديد مرة واحدة، والتحديثات فوقه. المثال الحي:
  إضافة `expo-navigation-bar` (بصمة جديدة، لا يوصلها OTA وحده).
- **OTA خامل حتى إعادة التفعيل**: (1) `npx eas-cli init` من
  `apps/mobile` وتثبيت المعرف الحقيقي في `app.config.ts` (يرفع حارس
  المعرف الصفري المطبوع في رأس الملف)؛ (2) سر `EXPO_TOKEN`. أوامر
  المشغّل: `eas-cli update:list/channel:view --branch production`؛
  التراجع: `update:republish` بمعرف الجيد أو `update:rollback`.
- **القناة المباشرة**: إصدار GitHub `latest` —
  `https://github.com/ahmadmedo1012/ulara/releases/latest/download/ulara.apk`
  (توقيع مستقر = تحديث في المكان)؛ صفحة `/app` هي الواجهة. التثبيتات
  المتقطعة من مشروع EAS القديم ترفض أندرويد التحديث العابر للتوقيع:
  إزالة تثبيت واحدة ثم `/app`.
- **أوامر الإصدار اليدوية**:
  `npx eas-cli build --profile production --platform android --non-interactive`
  (أو `--profile preview --platform all --no-wait`).

## 8. المتجر (خطوات المالك فقط)

1. **Android/Play**: حساب خدمة Play (JSON) يُرفع إلى EAS credentials،
   ثم `npx eas submit --platform android --profile production`.
   انسخ مفتاح الرفع احتياطيًا مرة بعد أول بناء production — فقده يعني
   هوية جديدة في المتجر (لا يعيد Google المفاتيح بسهولة).
2. **iOS/Apple**: تسجيل مطور ($99/سنة) ثم إحدى: `eas credentials -p
   ios` بتسجيل الدخول إلى Apple، أو مفاتيح ASC
   (`ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_CONTENT`) في EAS. أول بناء جهاز:
   `eas build --profile production --platform ios`؛ TestFlight:
   `eas submit --platform ios`. استبيان الخصوصية: بلا تحليلات طرف
   ثالث؛ Face ID وإشعارات وتقرير أعطال إلى خلفيتنا فقط.

## 9. الأسرار — أين يعيش ماذا

| السر | المكان | ملاحظة |
|---|---|---|
| توكن الوصول | ذاكرة الجلسة | إعادة إصدار عند 401 عبر كوكي التحديث |
| كوكي `ulara_refresh` | `expo-secure-store` (`lib/tokenStorage`) | اعتماد 7 أيام — لا يُخزَّن في AsyncStorage أبدًا |
| تفضيلات غير سرية (سمة/أرقام/لمس/كاش) | AsyncStorage بمفاتيح `ula-mobile-*` | قاعدة العائلة: أسرار SecureStore فقط؛ غير السرّي في المفاتيح الموحدة |
| `EXPO_PUBLIC_API_BASE_URL` | `eas.json` | **تكوين عام لا سر** — يُضمَّن في الحزمة؛ لا أسرار في `app.config.ts` أو الحزمة أبدًا |
| `EXPO_TOKEN` | أسرار GitHub Actions | لـOTA والبناء السحابي — دوّره إن لامسه أحد |
| مفتاح التوقيع | `~/.ulara/ulara-release.keystore` محليًا، أو أسرار Actions (`ANDROID_KEYSTORE_B64`…) لقناة CI | انسخه احتياطيًا خارج الجهاز |
| مفاتيح ASC/Play | EAS credentials | عند الخطوة §8 |
