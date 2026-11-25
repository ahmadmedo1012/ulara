# C4 المستوى 2 — مخطط الحاويات

> الغرض: الحاويات داخل نظام أُلارا وتقنيات كل واحدة وأسلاكها المقاسة.

```mermaid
flowchart TB
    subgraph browser["متصفح الزائر/الأدوار"]
        spa["SPA — React 18 + Vite<br/>frontend/dist (ثابت على Vercel)<br/>RTL عربية-أولًا، توكنات مولّدة"]
    end

    subgraph mobile["جهاز الجوال"]
        app["تطبيق Expo ~58 (React Native)<br/>apps/mobile — توزيع مستقل<br/>APK متدفق / IPA SideStore"]
    end

    subgraph vercel["Vercel (fra1)"]
        fn["api/index.ts — دالة serverless<br/>maxDuration 60<br/>حزام أمان أسرار JWT متطابقة"]
        cron["cron يومي 0 3 * * *<br/>→ /api/v1/jobs/daily<br/>توقيع CRON_SECRET"]
        static["استضافة ثابتة + رؤوس أمنية 10<br/>CSP بصمات sha256 مثبتة"]
    end

    subgraph backend["حاوية الخلفية — Express + TS"]
        express["تطبيق Express<br/>src/app.ts + http/routes/*<br/>مظروف استجابة + أكواد خطأ"]
        modules["الوحدات الست<br/>auth/learning/research/<br/>governance/quality/platform"]
        storage["تجريد التخزين<br/>STORAGE_DRIVER: local / s3 / postgres"]
        scheduler["scheduler.ts<br/>مهام التشغيل اليومية"]
    end

    prisma["Prisma 5 client<br/>(مولّد من schema.prisma)"]
    neon[("Neon PostgreSQL<br/>pooler — فرانكفورت")]
    openapi["docs/api/openapi.json<br/>العقد المولّد: 315 مسارا / 388 عملية"]

    spa --> "HTTPS /api/v1/*" --> fn
    spa --- static
    app --> "HTTPS /api/v1/* (نفس العقد)" --> fn
    fn --> express
    cron --> fn
    express --> modules
    modules --> storage
    modules -- "قراءة/كتابة" --> prisma
    prisma --> neon
    scheduler --> express
    openapi -. "مولّد: npm run api:openapi" .-> express
    openapi -. "contract-check في CI للجوال" .-> app
```

## جدول الحاويات

| الحاوية | التقنية | الموقع | ملاحظات مثبّتة |
|---|---|---|---|
| SPA | React 18 + Vite، zustand، صفحات lazy | `frontend/` | بوابة حجم: إجمالي ≤866 KB gz / دخول ≤92 / pdf ≤110 |
| الخلفية | Express 4 + TypeScript | `backend/src/` | قرار منطق الخدمة في دوال نقية بلا DB (اختبارها يزوّر `db`) |
| مدخل serverless | `api/index.ts` | `api/` | يتحقق تطابق سِرّي JWT قبل الإقلاع |
| قاعدة البيانات | PostgreSQL (Neon) + Prisma 5 | `backend/prisma/` | مخطط: 87 نموذجًا/31 enum — المصدر `schema.prisma` |
| تجريد التخزين | local / S3 / postgres-pilot | `backend/src/lib/storage` | رفع PDF خلف التجريد؛ driver بديل بلا تغيير واجهة |
| الجوال | Expo ~58 (React Native) | `apps/mobile/` | مستقل بقفله (ADR-0002)؛ عقد مولّد `schema.generated.ts` |
| بثّ AI | SSE من عميل lazy مستقل | `frontend/src/lib/ai-stream.ts` | مزوّد اختياري؛ الافتراضي محرك حتمي محلي |

## ما لا تظهره هذه اللوحة عمدًا

- تفاصيل الوحدات الست وقواعد الأدوار — الوثيقة الحيّة `docs/architecture.md`.
- قواعد الرسم المشاركة — ADR-0003 + `shared/art/README.md`.
- بوابات الجودة — `AGENTS.md` §3 + `scripts/README.md`.
