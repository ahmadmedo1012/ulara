/**
 * r359 A2 — the mobile art library render test.
 *
 * Mounts every generated RN art component (light + dark): an
 * import-time or render-time crash (bad attr, missing scene, palette
 * slip) fails here in seconds. The scene source is shared with the
 * web library (shared/art → src/components/art/shared), so this net
 * guards both surfaces.
 */
import { render } from '@testing-library/react-native';
import {
  HeroElevation, HeroElevationMobile, PlanLectureHall, PlanLibrary, PlanLab,
  PlanAdminOffice, PlanCampusSite, PlanExamHall, PlanResearchLab,
  SectionIntro, SectionProblem1, SectionProblem2, SectionProblem3, SectionProblem4,
  SectionSolutionLearning, SectionSolutionInstitution,
  WhyObserve, WhyAdvise, WhyAct, WhyLearn,
  UsecaseStudent, UsecaseTeacher, UsecaseAdmin, UsecaseQuality, UsecaseOwner, UsecaseInstitution,
  CtaSketch, CalloutTag, DimensionLine, RegistrationCross,
  EmptyCourses, EmptyNotifications, EmptySearch, EmptyInstitution, EmptyResearch,
  Error404, Error500, Error403, Maintenance,
  Onboarding1, Onboarding2, Onboarding3, Onboarding4, SplashMarkMotion,
} from '..';

const COMPONENTS: Array<[string, React.ComponentType<{ theme?: 'light' | 'dark' }>]> = [
  ['hero-elevation', HeroElevation],
  ['hero-elevation-mobile', HeroElevationMobile],
  ['plan-lecture-hall', PlanLectureHall],
  ['plan-library', PlanLibrary],
  ['plan-lab', PlanLab],
  ['plan-admin-office', PlanAdminOffice],
  ['plan-campus-site', PlanCampusSite],
  ['plan-exam-hall', PlanExamHall],
  ['plan-research-lab', PlanResearchLab],
  ['section-intro', SectionIntro],
  ['section-problem-1', SectionProblem1],
  ['section-problem-2', SectionProblem2],
  ['section-problem-3', SectionProblem3],
  ['section-problem-4', SectionProblem4],
  ['section-solution-learning', SectionSolutionLearning],
  ['section-solution-institution', SectionSolutionInstitution],
  ['why-observe', WhyObserve],
  ['why-advise', WhyAdvise],
  ['why-act', WhyAct],
  ['why-learn', WhyLearn],
  ['usecase-student', UsecaseStudent],
  ['usecase-teacher', UsecaseTeacher],
  ['usecase-admin', UsecaseAdmin],
  ['usecase-quality', UsecaseQuality],
  ['usecase-owner', UsecaseOwner],
  ['usecase-institution', UsecaseInstitution],
  ['cta-sketch', CtaSketch],
  ['callout-tag', CalloutTag],
  ['dimension-line', DimensionLine],
  ['registration-cross', RegistrationCross],
  ['empty-courses', EmptyCourses],
  ['empty-notifications', EmptyNotifications],
  ['empty-search', EmptySearch],
  ['empty-institution', EmptyInstitution],
  ['empty-research', EmptyResearch],
  ['error-404', Error404],
  ['error-500', Error500],
  ['error-403', Error403],
  ['maintenance', Maintenance],
  ['onboarding-1', Onboarding1],
  ['onboarding-2', Onboarding2],
  ['onboarding-3', Onboarding3],
  ['onboarding-4', Onboarding4],
  ['splash-mark-motion', SplashMarkMotion],
];

describe('r359 art library (RN)', () => {
  for (const [key, Cmp] of COMPONENTS) {
    it(`renders ${key} in light + dark`, () => {
      // the crash net: import-time + render-time failures throw here
      expect(() => render(<Cmp theme="light" />)).not.toThrow();
      expect(() => render(<Cmp theme="dark" />)).not.toThrow();
    });
  }
});
