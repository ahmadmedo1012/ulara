# ADR-0002 — workspaces للويب/الخلفية، وتطبيق الجوال مستقل بقفل حزم خاص

> حالة القرار: **مقبول** — توثيق قرار قائم فعلًا (لا قرار جديد).

## السياق

ثلاثة وجوه للمنتج: SPA ويب، خلفية Express، تطبيق Expo/React Native. سلاسل أدوات الجوال
(expo prebuild، gradle، jest-resolver مخصص، بناء APK/IPA في CI) ثقيلة ومختلفة جذريًا عن
سلسلة الويب، وتحديث اعتمادياتها دورة مستقلة.

## القرار (كما هو مطبَّق)

- الجذر `package.json` يعرف `workspaces: [backend, frontend]` فقط — `npm ci` الجذر
  يثبّت الويب والخلفية ويبقي جهاز التطوير خفيفًا.
- `apps/mobile/` **ليس workspace**: له `package-lock.json` خاص، وسكربتاته المستقلة
  (`typecheck`, `contract-check`, `api:types`, `tokens:build`…)، وCI مستقل له
  (`mobile.yml`, `android-apk.yml`, `build-ios-sidestore.yml`, `mobile-builds-ledger.yml`).
- الانضباط بين الوجهتين بالعقود لا بالحزم المشتركة: `apps/mobile/scripts/contract-check.mjs`
  يقارن العقد المولّد، و`tokens:check` يكشف انجراف التوكنات من `shared/design-tokens.json`،
  وDependabot يراقب مسار الجوال وحده.

## البدائل المرفوضة

- **إضافة `apps/mobile` إلى workspaces:** يجعل `npm ci` الجذر يسحب شجرة RN كاملة لكل
  تغيير ويب، ويمزج أقفال الحزم في ملف واحد — تعارضات حلل إصدارات بلا فائدة تشغيلية.
- **monorepo بأداة خارجية (pnpm/turbo/nx):** السياسة المنزلية «npm فقط» موثّقة في
  `AGENTS.md` §2؛ إدخال أداة ثالثة يكسر فحوص knip/allowScripts وسير العمل القائم.

## العواقب

- تدقيق أمني الجوال يدوي/Dependabot (خارج `npm audit --omit=dev` الجذر) — مسجّل كحدّ
  معروف في السجل الهندسي L4.
- أي مكتبة مشتركة جديدة بين الويب والجوال تُدار كعقد مولّد (انظر ADR-0003) لا كحزمة.
