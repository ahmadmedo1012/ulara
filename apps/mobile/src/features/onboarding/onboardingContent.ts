/**
 * onboardingContent — r359 A4 (M2): the four first-run screens' copy,
 * ROLE-AWARE on screen 2 (the role is known — onboarding runs AFTER
 * login, gated by resolveEntryDestination on user.onboardingCompletedAt).
 *
 * Pure data + one resolver (unit-testable): the screen flow is
 *   1 welcome  — the university-OS story (role-free)
 *   2 your-space — what THIS role will see (the role-aware screen)
 *   3 notifications — the category primer + the value-shown ask
 *   4 start    — the completion CTA
 * Every screen carries the mono index `[01/04]`, a title, one body
 * paragraph, and the art key (components/art, A2's contract).
 */
export type OnboardingRole = "STUDENT" | "TEACHER" | "ADMIN" | "QUALITY" | "OWNER";

export interface OnboardingScreen {
  index: 1 | 2 | 3 | 4;
  kicker: string;
  title: string;
  body: string;
  art: 1 | 2 | 3 | 4;
}

export const ONBOARDING_SCREEN_COUNT = 4 as const;

const ROLE_SPACE: Record<OnboardingRole, { title: string; body: string }> = {
  STUDENT: {
    title: "مساحتك كطالب",
    body: "مقرّراتك ومحاضراتك في مكان واحد، مصفوفة الإتقان تُريك أين تقف، والاختبارات والنتائج والبحوث تصل لحظة إعلانها — ومساعدك الأكاديمي جاهز على مدار الساعة.",
  },
  TEACHER: {
    title: "مساحتك كأستاذ",
    body: "جدولك وقائمة طلابك بأول نظرة، رفع المواد وإدارة الواجبات والاختبارات من مقرّرك مباشرة، وأدوات المتابعة تُبرز الطلاب الذين يحتاجون تدخلك قبل أن يتعثّروا.",
  },
  ADMIN: {
    title: "مساحتك كإدارة المؤسسة",
    body: "لوحة المؤسسة كاملة: الكليات والأقسام، الطلاب والأستاذة، الصلاحيات والتقارير — وكل عملية موثّقة في سجل التدقيق.",
  },
  QUALITY: {
    title: "مساحتك كجودة",
    body: "قراءة شفافة لجودة المقرّرات والمناهج وأداء الأستاذة، مع تقارير المراجعة والتنبيهات — الرقابة التي تسبق المشكلة لا التي تلحق بها.",
  },
  OWNER: {
    title: "لوحة تحكم المنصّة",
    body: "المؤسسات والمستخدمون والحوكمة والذكاء الاصطناعي — المنصّة كلها تحت سيطرتك، بمؤشرات حيّة وسجلّ تدقيق كامل.",
  },
};

export function onboardingScreens(role: OnboardingRole | string): OnboardingScreen[] {
  const space = ROLE_SPACE[(role as OnboardingRole) in ROLE_SPACE ? (role as OnboardingRole) : "STUDENT"];
  return [
    {
      index: 1,
      kicker: "أُلارا — نظام تشغيل الجامعة",
      title: "أهلًا بك",
      body: "من المحاضرة الأولى إلى الشهادة، أُلارا تجمع حياتك الجامعية في مكان واحد — بسيطة كورقة، دقيقة كمسطرة.",
      art: 1,
    },
    {
      index: 2,
      kicker: "مساحتك",
      title: space.title,
      body: space.body,
      art: 2,
    },
    {
      index: 3,
      kicker: "الإشعارات",
      title: "إشعاراتك في مكانها",
      body: "عاجل، أكاديمي، نظام، اجتماعي — أنت من يقرر ما يصل إليك وما ينتظر بهدوء في الصندوق. فعّلها الآن أو لاحقًا من الإعدادات.",
      art: 3,
    },
    {
      index: 4,
      kicker: "جاهز",
      title: "كل شيء بانتظارك",
      body: "الأقسام الرئيسية في الشريط السفلي.",
      art: 4,
    },
  ];
}
