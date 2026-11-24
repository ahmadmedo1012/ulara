/**
 * shared/art/manifest.ts — the r359 art-key registry (A2 contract §5.3).
 *
 * Pure metadata: key, PascalCase component name, Arabic accessible
 * title, family. Every key maps 1:1 to a default-exported React
 * component in `frontend/src/components/illustrations/r359/<key>.tsx`
 * (web) and `apps/mobile/src/components/art/<PascalKey>.tsx` (RN),
 * all rendered from builders in `shared/art/scenes/*`.
 */
export interface ArtKeyMeta {
  key: string;
  pascal: string;
  title: string;
  family: 'hero' | 'plans' | 'sections' | 'why' | 'usecases' | 'marks' | 'states' | 'cta' | 'onboarding';
}

export const ART_KEYS: ArtKeyMeta[] = [
  { key: 'hero-elevation', pascal: 'HeroElevation', title: 'واجهة الحرم الجامعي — رسم معماري', family: 'hero' },
  { key: 'hero-elevation-mobile', pascal: 'HeroElevationMobile', title: 'واجهة الحرم الجامعي — نسخة الجوال', family: 'hero' },
  { key: 'plan-lecture-hall', pascal: 'PlanLectureHall', title: 'مخطط قاعة المحاضرات', family: 'plans' },
  { key: 'plan-library', pascal: 'PlanLibrary', title: 'مخطط المكتبة', family: 'plans' },
  { key: 'plan-lab', pascal: 'PlanLab', title: 'مخطط المختبر', family: 'plans' },
  { key: 'plan-admin-office', pascal: 'PlanAdminOffice', title: 'مخطط مكاتب الإدارة', family: 'plans' },
  { key: 'plan-campus-site', pascal: 'PlanCampusSite', title: 'مخطط الموقع العام للحرم', family: 'plans' },
  { key: 'plan-exam-hall', pascal: 'PlanExamHall', title: 'مخطط قاعة الاختبارات', family: 'plans' },
  { key: 'plan-research-lab', pascal: 'PlanResearchLab', title: 'مخطط مختبر الأبحاث', family: 'plans' },
  { key: 'section-intro', pascal: 'SectionIntro', title: 'لوحة المقدمة', family: 'sections' },
  { key: 'section-problem-1', pascal: 'SectionProblem1', title: 'لوحة المشكلة الأولى', family: 'sections' },
  { key: 'section-problem-2', pascal: 'SectionProblem2', title: 'لوحة المشكلة الثانية', family: 'sections' },
  { key: 'section-problem-3', pascal: 'SectionProblem3', title: 'لوحة المشكلة الثالثة', family: 'sections' },
  { key: 'section-problem-4', pascal: 'SectionProblem4', title: 'لوحة المشكلة الرابعة', family: 'sections' },
  { key: 'section-solution-learning', pascal: 'SectionSolutionLearning', title: 'الحل — منصة التعلّم', family: 'sections' },
  { key: 'section-solution-institution', pascal: 'SectionSolutionInstitution', title: 'الحل — إدارة المؤسسة', family: 'sections' },
  { key: 'why-observe', pascal: 'WhyObserve', title: 'راقب', family: 'why' },
  { key: 'why-advise', pascal: 'WhyAdvise', title: 'وجّه', family: 'why' },
  { key: 'why-act', pascal: 'WhyAct', title: 'نفّذ', family: 'why' },
  { key: 'why-learn', pascal: 'WhyLearn', title: 'تعلّم', family: 'why' },
  { key: 'usecase-student', pascal: 'UsecaseStudent', title: 'حالة الطالب', family: 'usecases' },
  { key: 'usecase-teacher', pascal: 'UsecaseTeacher', title: 'حالة الأستاذ', family: 'usecases' },
  { key: 'usecase-admin', pascal: 'UsecaseAdmin', title: 'حالة إدارة النظام', family: 'usecases' },
  { key: 'usecase-quality', pascal: 'UsecaseQuality', title: 'حالة مكتب الجودة', family: 'usecases' },
  { key: 'usecase-owner', pascal: 'UsecaseOwner', title: 'حالة مالك المؤسسة', family: 'usecases' },
  { key: 'usecase-institution', pascal: 'UsecaseInstitution', title: 'حالة المؤسسة التعليمية', family: 'usecases' },
  { key: 'cta-sketch', pascal: 'CtaSketch', title: 'رسم الدعوة الختامية', family: 'cta' },
  { key: 'callout-tag', pascal: 'CalloutTag', title: 'وسم توضيحي', family: 'marks' },
  { key: 'dimension-line', pascal: 'DimensionLine', title: 'خط الأبعاد', family: 'marks' },
  { key: 'registration-cross', pascal: 'RegistrationCross', title: 'علامة تسجيل', family: 'marks' },
  { key: 'empty-courses', pascal: 'EmptyCourses', title: 'لا مقرّرات بعد', family: 'states' },
  { key: 'empty-notifications', pascal: 'EmptyNotifications', title: 'لا إشعارات', family: 'states' },
  { key: 'empty-search', pascal: 'EmptySearch', title: 'لا نتائج للبحث', family: 'states' },
  { key: 'empty-institution', pascal: 'EmptyInstitution', title: 'لا مؤسسات', family: 'states' },
  { key: 'empty-research', pascal: 'EmptyResearch', title: 'لا أبحاث', family: 'states' },
  { key: 'error-404', pascal: 'Error404', title: 'الصفحة غير موجودة', family: 'states' },
  { key: 'error-500', pascal: 'Error500', title: 'خطأ في الخادم', family: 'states' },
  { key: 'error-403', pascal: 'Error403', title: 'غير مسموح بالوصول', family: 'states' },
  { key: 'maintenance', pascal: 'Maintenance', title: 'الموقع تحت الصيانة', family: 'states' },
  { key: 'onboarding-1', pascal: 'Onboarding1', title: 'الترحيب — تعلّم منظّم', family: 'onboarding' },
  { key: 'onboarding-2', pascal: 'Onboarding2', title: 'الترحيب — مصفوفة الإتقان', family: 'onboarding' },
  { key: 'onboarding-3', pascal: 'Onboarding3', title: 'الترحيب — الاختبارات', family: 'onboarding' },
  { key: 'onboarding-4', pascal: 'Onboarding4', title: 'الترحيب — مؤسستك', family: 'onboarding' },
  { key: 'splash-mark-motion', pascal: 'SplashMarkMotion', title: 'شعار أُلارا المتحرّك', family: 'onboarding' },
];

export type ArtKey = (typeof ART_KEYS)[number]['key'];

export const KEY_SET = new Set<string>(ART_KEYS.map((k) => k.key));

export function metaFor(key: string): ArtKeyMeta | undefined {
  return ART_KEYS.find((k) => k.key === key);
}
