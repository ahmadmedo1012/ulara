/**
 * r352 — the module registry's visibility rules: the workspace shows
 * its sections by institution-kind relevance (the ONE kind rule:
 * research, from the backend's LEGAL-MATRIX §A.3 — Law 21/2023 stages
 * 1–2 carry no research mandate) and explains hidden deep-links
 * honestly. Everything else renders for every kind — capability
 * gates apply to WRITE controls, not to read visibility.
 */
import { describe, expect, it } from 'vitest';
import { INST_MODULES, moduleHiddenReason, visibleModules, CREDENTIALS_CAPABILITY, QUALITY_INTERNAL_CAPABILITY } from '../../src/components/institutional/modules';
import type { InstitutionProfile } from '../../src/lib/institutional/types';

const profileOf = (kindCode: string | null): InstitutionProfile => ({
  id: 'inst-1',
  name: 'مؤسسة اختبار',
  slug: 'test',
  status: 'ACTIVE',
  kind: kindCode ? { id: 'k1', code: kindCode, nameAr: kindCode } : null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('r352 module registry — the 13 sections exist with routes + capability gates', () => {
  it('carries exactly the spec\'s section set under /institution', () => {
    const routes = INST_MODULES.map((m) => m.to);
    expect(routes).toEqual([
      '/institution',
      '/institution/organization',
      '/institution/people',
      '/institution/positions',
      '/institution/access',
      '/institution/councils',
      '/institution/programs',
      '/institution/training',
      '/institution/students',
      '/institution/quality',
      '/institution/licenses',
      '/institution/facilities',
      '/institution/research',
    ]);
  });

  it('names every module gate with the contract\'s capability keys', () => {
    const byRoute = new Map(INST_MODULES.map((m) => [m.to, m.manage]));
    expect(byRoute.get('/institution/organization')).toBe('ORG_STRUCTURE_MANAGE');
    expect(byRoute.get('/institution/people')).toBe('PEOPLE_MANAGE');
    expect(byRoute.get('/institution/positions')).toBe('APPOINTMENTS_MANAGE');
    expect(byRoute.get('/institution/access')).toBe('UNIT_CAPABILITIES_ASSIGN');
    expect(byRoute.get('/institution/councils')).toBe('COUNCILS_MANAGE');
    expect(byRoute.get('/institution/programs')).toBe('PROGRAMS_MANAGE');
    expect(byRoute.get('/institution/quality')).toBe('ACCREDITATION_MANAGE');
    expect(byRoute.get('/institution/licenses')).toBe('ACCREDITATION_MANAGE');
    expect(byRoute.get('/institution/facilities')).toBe('FACILITIES_MANAGE');
    expect(byRoute.get('/institution/research')).toBe('RESEARCH_PROJECTS_MANAGE');
    expect(byRoute.get('/institution')).toBeNull(); // overview: read-only
  });

  it('exposes the two separate write gates the contract splits out', () => {
    // credential award/revoke is its own capability (contract §0)
    expect(CREDENTIALS_CAPABILITY).toBe('CREDENTIALS_MANAGE');
    // internal QA writes are grant-only (nobody by default)
    expect(QUALITY_INTERNAL_CAPABILITY).toBe('QUALITY_INTERNAL_MANAGE');
  });
});

describe('r352 kind-visibility — research only where the mandate exists', () => {
  it('shows research for universities, academies, research bodies, technical colleges and higher institutes', () => {
    for (const kind of ['UNIVERSITY', 'ACADEMY', 'RESEARCH_BODY', 'TECHNICAL_COLLEGE', 'HIGHER_TECHNICAL_INSTITUTE']) {
      const sections = visibleModules(profileOf(kind)).map((m) => m.to);
      expect(sections, kind).toContain('/institution/research');
      expect(sections, kind).toHaveLength(13);
    }
  });

  it('hides research for intermediate institutes and vocational training centers (Law 21/2023 stages 1–2) — and nothing else', () => {
    for (const kind of ['INTERMEDIATE_TECHNICAL_INSTITUTE', 'VOCATIONAL_TRAINING_CENTER']) {
      const sections = visibleModules(profileOf(kind)).map((m) => m.to);
      expect(sections, kind).not.toContain('/institution/research');
      expect(sections, kind).toHaveLength(12);
      // every other section stays visible
      for (const m of INST_MODULES.filter((x) => x.to !== '/institution/research')) {
        expect(sections, `${kind} keeps ${m.to}`).toContain(m.to);
      }
    }
  });

  it('explains the hidden deep-link honestly, and only for the kind rule', () => {
    const reason = moduleHiddenReason('/institution/research', profileOf('VOCATIONAL_TRAINING_CENTER'));
    expect(reason).toBeTruthy();
    expect(reason).toContain('البحث المؤسسي');

    // a university deep-linking research: no reason
    expect(moduleHiddenReason('/institution/research', profileOf('UNIVERSITY'))).toBeNull();
    // other sections never kind-hide
    expect(moduleHiddenReason('/institution/programs', profileOf('VOCATIONAL_TRAINING_CENTER'))).toBeNull();
    // unknown paths carry no reason (the router 404s them)
    expect(moduleHiddenReason('/institution/unknown', profileOf('UNIVERSITY'))).toBeNull();
  });
});
