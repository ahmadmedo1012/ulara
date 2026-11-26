# متجر التطبيقات — مسوّدة النشر (r367)

هذا المجلد يحمل كل ما يمكن تجهيزه للنشر قبل حسابات المتجر (قرار المالك —
انظر REPORT.ar.md §5). ما هو هنا جاهز للنسخ واللصق في App Store Connect و
Google Play Console عند فتح الحسابين.

## المحتويات

| الملف | الغرض |
| --- | --- |
| [LISTING.ar.md](LISTING.ar.md) | المسوّدة العربية الكاملة: الاسم، العنوان الفرعي، الوصف، الكلمات المفتاحية، تسميات اللقطات |
| [LISTING.en.md](LISTING.en.md) | المرآة الإنجليزية (App Store يتطلب حقلاً إنجليزياً على الأقل للأسواق الدولية) |
| screenshots/ | لقطات المتجر المولّدة من مصفوفة الالتقاط (تُبنى من أرشيف mobile-capture-r366) |

## ما أُنجز فعلياً في الكود (r367 D-P9)

- الأيقونات: `icon.png` + مجموعة Android التكيفية الثلاث (foreground /
  background / **monochrome** — قناة Material You) + favicon.
- سبلاتش لوني: paper `#F5F1E8` فاتح + `#262019` داكن، بمركّب مولّد من
  `mark.ts` (`scripts/build-splash-dark.mjs`) — لا وميض أبيض في الثيمين.
- بيان iOS: `NSFaceIDUsageDescription` بنص عربي صادق (القفل فقط — لا قراءة
  ولا تخزين لأي بيانات بيومترية)؛ بقية الأذونات إما system-UI أو تُغطى
  تلقائياً بـ PrivacyInfo.xcprivacy المولّد من prebuild (SDK 58).
- Android 15: `predictiveBackGestureEnabled` مفعّل (T-50)، بناء 16 KB
  page size يأتي من سلسلة أدوات 2026 في لينات GitHub Actions.
- تهيئة الإشعارات: طلب الإذن ذو القيمة (الإعدادات أولًا)، تسجيل الرمز،
  قناة الإشعار بأيقونة العلامة البيضاء — والمفتاح `EXPO_PUBLIC_PUSH_PROJECT_ID`
  بيد المالك (بلا بديل صادق عنه).
- أصوات الواجهة: مجموعة مولّدة أصلية في `scripts/sound/` (≤0.12 peak،
  ≤0.22 ثانية) — المفتاح الصامتي على iOS يكتمها، ومفتاح الإعدادات يعمل.

## ما ينتظر المالك (لا بديل صادق عنه)

1. حسابا Apple Developer وGoogle Play.
2. Apple: كفاءة الإشعارات + جهاز للتوقيع النهائي (APK موقّع متاح في release
   `latest`؛ IPA غير موقّع في `sidestore-latest`).
3. Expo push project id (تهيئة الإشعارات الفعلية).
