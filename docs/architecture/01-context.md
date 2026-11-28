# C4 المستوى 1 — مخطط السياق

> الغرض: من يتعامل مع أُلارا وما الأنظمة الخارجية المرتبطة بها — بلا تفاصيل داخلية.

```mermaid
flowchart TB
    subgraph people["الأطراف"]
        student["طالب"]
        teacher["أستاذ / رئيس قسم / عميد"]
        registrar["المسجّل العام + مسجل كلية"]
        quality["أخصائي الجودة (القطاع الرابع)"]
        owner["مالك المنصة"]
        guest["زائر / متقدم للقبول"]
    end

    ulara(("أُلارا<br/>نظام تشغيل الجامعة<br/>SPA + API + تطبيق جوال"))

    neon[("Neon PostgreSQL<br/>فرانكفورت")]
    vercel["Vercel<br/>استضافة + دوال + cron"]
    ai["مزوّد LLM اختياري<br/>(افتراضيًا محرك حتمي محلي)"]
    s3["تخزين كائنات S3 اختياري<br/>(المحلي/Postgres بدائل جاهزة)"]
    mail["مزوّد بريد اختياري"]
    gh["GitHub Actions<br/>CI/CD + إصدارات APK/IPA"]

    student --> ulara
    teacher --> ulara
    registrar --> ulara
    quality --> ulara
    owner --> ulara
    guest --> ulara

    ulara -- "Prisma / pooler sslmode=require" --> neon
    ulara -. "نشر (deploy.yml)" .-> vercel
    vercel --- ulara
    ulara -. "AI_PROVIDER إن ضُبط" .-> ai
    ulara -. "STORAGE_DRIVER=s3 إن ضُبط" .-> s3
    ulara -. "MAIL_PROVIDER إن ضُبط" .-> mail
    gh -. "بوابات CI + نشر + إصدارات" .-> ulara
```

ملاحظات الصدق (مطبوعة في README أيضًا):

- المساعد الذكي «Oasis» يعمل افتراضيًا بمحرك **حتمي محلي** معلن (`gap-aware-composer`)،
  ومزوّد LLM خارجي **اختياري** فقط عبر `AI_PROVIDER` — حدود المعلنة في
  `docs/architecture.md` §8.
- فحص الانتحال محاكاة حتمية معلنة بلا خدمات خارجية.
- مزوّدو S3/البريد/LLM كلهم فشل-مغلق في `backend/src/env.ts`: نصفي التكوين يُرفض عند الإقلاع.
