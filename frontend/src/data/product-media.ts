/**
 * product-media — the R307+Ω platform capture registry.
 *
 * Single source of truth for WHAT renders: the machine-readable
 * provenance manifest is `frontend/public/media/manifest.json`
 * (rights, sources, verification); this module mirrors the display
 * registry (slots, crops, captions) so the landing composes typed
 * data instead of hand-written figures.
 *
 * Honesty contracts (r168b/r188/R307 lineage + Phase Ω):
 *  - Product captures are real UI from the seeded demo environment
 *    (the labeled neutral workspace «مساحة عمل أُلارا التجريبية» —
 *    clearly-marked demo data, never a university) — disclosed on
 *    every frame.
 *  - The platform is independent: no institution, no campus, no
 *    endorsement claims anywhere in this registry.
 *
 * Phase Ω (identity purity): the retired university-media registry
 * (Commons university photography + official-channel videos) is
 * deleted with the rest of the retired identity surfaces; what
 * survives here is exactly the platform's own captures.
 */

export interface ProductCapture {
  id: string;
  titleAr: string;
  captionAr: string;
  altAr: string;
  route: string;
  widths: number[];
  sizes: string;
}

export const PRODUCT_CAPTURES: [
  ProductCapture,
  ProductCapture,
  ProductCapture,
  ProductCapture,
] = [
  {
    id: 'student-dashboard',
    titleAr: 'لوحة الطالب',
    captionAr: 'نظرة الطالب على يومه: جدول اليوم، والمهام، والتقدّم',
    altAr: 'لقطة حقيقية من لوحة الطالب في أُلارا — بيانات العرض التجريبية',
    route: '/student/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 44rem, 100vw',
  },
  {
    id: 'student-library',
    titleAr: 'المكتبة الإلكترونية',
    captionAr: 'بحث عربي، وفهرس، وتصفّح الكتب والبحوث',
    altAr: 'لقطة حقيقية من المكتبة الإلكترونية في أُلارا — بيانات العرض التجريبية',
    route: '/student/library',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
  {
    id: 'student-lecture-player',
    titleAr: 'المحاضرة التفاعلية',
    captionAr: 'مشغّل المحاضرة مع نقطة فحص تُصحَّح فورًا',
    altAr: 'لقطة حقيقية من مشغّل المحاضرة التفاعلية في أُلارا مع بطاقة نقطة الفحص — بيانات العرض التجريبية',
    route: '/student/courses',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
  {
    id: 'student-matrix',
    titleAr: 'مصفوفة الإتقان',
    captionAr: 'درجة إتقان لكل مفهوم، وربطها بالدرس المناسب',
    altAr: 'لقطة حقيقية من مصفوفة الإتقان في أُلارا — بيانات العرض التجريبية',
    route: '/student/matrix',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
];

/* ── P-A2 R333 (INV-08) → R342-final — the 2× capture seats ──
 * The 2× surfaces (@2880×1740 re-captures — the r333 media-capture
 * ledger was lost in the 1.0 squash) ride the Vite asset pipeline (src/assets/product/
 * *.webp → hashed dist assets). The R342 editorial-scenes rebuild
 * consumes them DIRECTLY (sections/Product.tsx: exam-active +
 * ai-tutor; WhyScene.tsx: lecture-checkpoint as the lecture-player
 * row's twoXSrc) — the old exported CAPTURE_LECTURE_CHECKPOINT_2X
 * data constant (a metadata twin of the direct import) retired with
 * that rewire; the public /media/product ladder above keeps serving
 * the 1280×800 seats through ProductFrame's twoXSrc override. */

export type RoleKey = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/* The four role-seat captures (r307): the non-student dashboards the
   role selector swaps in. ProductCapture shape (same loader); routes
   point at the real surfaces — the frames carry no funnel CTA. */
export interface RoleShowcase {
  key: RoleKey;
  roleAr: string;
  lineAr: string;
  captureId: string;
}

/** The five verified roles with their REAL dashboard capture (demo data). */
export const ROLE_SHOWCASES: [
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
] = [
  {
    key: 'STUDENT',
    roleAr: 'للطالب',
    lineAr: 'رحلة تعلم شخصية — من المحاضرة الأولى إلى الإتقان',
    captureId: 'student-dashboard',
  },
  {
    key: 'TEACHER',
    roleAr: 'للأستاذ',
    lineAr: 'بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب',
    captureId: 'teacher-dashboard',
  },
  {
    key: 'ADMIN',
    /* r352 §D7: the role showcase names the access category —
       «إدارة المؤسسة». The definite form (no leading ل) is deliberate:
       LandingPage renders the card title as `roleAr.replace(/^ل/, '')`,
       so a «لإدارة المؤسسة» entry would strip to the dangling
       «لإدارة المؤسسة»; this entry renders the clean «إدارة المؤسسة»
       (same clean-noun shape as the «ضمان الجودة» / «مالك المنصّة»
       entries). */
    roleAr: 'إدارة المؤسسة',
    lineAr: 'الكليات والأقسام والمقرّرات والصلاحيات، وتقارير حيّة',
    captureId: 'admin-dashboard',
  },
  {
    key: 'QUALITY',
    roleAr: 'لضمان الجودة',
    lineAr: 'مجالس الجودة والمعايرة وتقارير الالتزام',
    captureId: 'quality-dashboard',
  },
  {
    key: 'OWNER',
    roleAr: 'لمالك المنصّة',
    lineAr: 'الحاكمية والمؤسّسات وسجلّ التدقيق',
    captureId: 'owner-dashboard',
  },
];
