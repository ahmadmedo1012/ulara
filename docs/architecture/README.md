# المعمارية بصيغة C4 — docs/architecture/

> الغرض في ثلاثة أسطر: مخططات C4 (المستوى 1: السياق، المستوى 2: الحاويات) + تدفق البيانات
> للمنصّة، **كصورة لحظية** متزامنة مع الشيفرة عند جولة التنظيم (نوفمبر 2025، r363).
> الوثيقة الحيّة العربية المفصّلة (الوحدات الست، عقد الـAPI، قواعد المنتج) تبقى
> [`docs/architecture.md`](../architecture.md) — هذا المجلد يعرضها بصريًا ولا يزاحمها:
> إن خالف المخطط الشيفرة فالشيفرة تفوز ويُصحَّح المخطط في نفس التغيير.

| الملف | المستوى | المحتوى |
|---|---|---|
| [01-context.md](01-context.md) | C4-L1 | الأنظمة والأطراف الخارجية والعلاقات |
| [02-containers.md](02-containers.md) | C4-L2 | الحاويات داخل نظام أُلارا وتقنياتها |
| [03-data-flow.md](03-data-flow.md) | تدفق | طلبات HTTP، التخزين، cron، بثّ AI، الجوال |

المصادر الحقيقية عند الشك (لا تخمين): نقاط الدخول `backend/src/app.ts` + `api/index.ts`؛
النماذج `backend/prisma/schema.prisma`؛ العقد الكامل `docs/api/openapi.json` (مولّد)؛
المتغيرات `backend/src/env.ts`؛ النشر `vercel.json` + `.github/workflows/deploy.yml`؛
التوكنات `shared/design-tokens.json` + `frontend/src/styles/tokens/tokens.css`.
