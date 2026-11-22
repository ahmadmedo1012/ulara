/**
 * R320 §B (c1-RENAME) + r352 (D7) — the backend side of the roleLabels
 * twin lock.
 *
 * r352: the ADMIN role's display label is CORRECTED to «إدارة المؤسسة»
 * (institutional administration — the access category), separating it
 * from the actual job title المسجل العام (now a PositionTemplate of
 * the university kind). The R352 brief mandates this separation: the
 * role holds broader administrative capabilities than the registrar
 * general's office.
 *
 * The backend map (this directory's ../roleLabels.ts) and the frontend
 * twin (frontend/src/lib/roleLabels.ts) MUST carry the same Arabic
 * display names. The r352 HANDOFF names the frontend mirror as the
 * frontend agent's task — until it lands, the twin-match rows below
 * are the ONE expected-red check on this branch (the designed
 * coordination signal, not a regression). Technical identifiers are
 * unchanged everywhere.
 *
 * The frontend twin is read as SOURCE TEXT here — importing it would
 * pull the frontend's TS module graph (../stores/auth.store) into the
 * backend runner; the regexes below extract the literal entries.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Role } from '@prisma/client';
import { ROLE_LABELS, roleLabel, ROLE_LABEL_INDEFINITE, ROLE_LABEL_PLURAL_OBLIQUE } from '../roleLabels.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const frontendTwinPath = path.join(
  repoRoot,
  'frontend',
  'src',
  'lib',
  'roleLabels.ts',
);

function extractMap(source: string, constName: string): Map<string, string> {
  const map = new Map<string, string>();
  const body =
    source.match(new RegExp(`export const ${constName}[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
  for (const m of body.matchAll(/^\s*([A-Z_]+):\s*'([^']*)'/gm)) {
    map.set(m[1]!, m[2]!);
  }
  return map;
}

describe('r352 §D7 — backend roleLabels (the corrected ADMIN access-category label)', () => {
  it('covers all five roles with the canonical Arabic names', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...Object.values(Role)].sort());
    expect(ROLE_LABELS.STUDENT).toBe('طالب');
    expect(ROLE_LABELS.TEACHER).toBe('أستاذ');
    // r352: the access category, NOT the job title المسجل العام (which
    // is a PositionTemplate now — the role holds broader capabilities).
    expect(ROLE_LABELS.ADMIN).toBe('إدارة المؤسسة');
    expect(ROLE_LABELS.QUALITY).toBe('أخصائي جودة');
    expect(ROLE_LABELS.OWNER).toBe('مالك المنصة');
    expect(roleLabel(Role.ADMIN)).toBe('إدارة المؤسسة');
  });

  it('carries the ADMIN indefinite/plural forms the messages use', () => {
    expect(ROLE_LABEL_INDEFINITE.ADMIN).toBe('إدارة مؤسسة');
    expect(ROLE_LABEL_PLURAL_OBLIQUE.ADMIN).toBe('إدارات المؤسسات');
  });

  it('the ADMIN label no longer claims the registrar-general job title', () => {
    // The r352 separation: the system role must not display as the
    // statutory office it outgrew.
    expect(ROLE_LABELS.ADMIN).not.toContain('المسجل');
    expect(ROLE_LABEL_INDEFINITE.ADMIN ?? '').not.toContain('مسجل');
  });

  it('no backend role label carries the retired «الإدارة» office label', () => {
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(/^الإدارة$|^الادارة$/.test(label), `${role} → «${label}»`).toBe(false);
    }
  });
});

describe('r352 §D7 — the frontend/backend roleLabels twins match', () => {
  const frontendSource = readFileSync(frontendTwinPath, 'utf8');
  const frontendMap = extractMap(frontendSource, 'ROLE_LABELS');
  const backendSource = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'roleLabels.ts'),
    'utf8',
  );

  it('the frontend twin was found and parses to five entries', () => {
    expect(frontendMap.size).toBe(5);
  });

  it('same keys, same Arabic values — the two maps cannot drift', () => {
    expect([...frontendMap.keys()].sort()).toEqual([...Object.keys(ROLE_LABELS)].sort());
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(frontendMap.get(role), `twin drift at ${role}`).toBe(label);
    }
  });

  it('the shared ADMIN value is «إدارة المؤسسة» on both sides', () => {
    expect(ROLE_LABELS.ADMIN).toBe('إدارة المؤسسة');
    expect(frontendMap.get('ADMIN')).toBe('إدارة المؤسسة');
  });

  it('the twins cross-reference each other (the zero-drift contract)', () => {
    expect(backendSource, 'the backend twin must point at the frontend twin').toContain(
      'frontend/src/lib/roleLabels.ts',
    );
    expect(frontendSource, 'the frontend twin must point at the backend twin').toContain(
      'backend/src/lib/roleLabels.ts',
    );
  });
});

describe('r352 §D7 — the mobile twin (apps/mobile session ROLE_LABELS) matches too', () => {
  // The mobile map is the THIRD twin: same five Arabic values, same
  // separation of the ADMIN access category from the المسجل العام job
  // title. It lives in apps/mobile/src/auth/session.ts and is read as
  // source text (same rationale as the web twin — no cross-workspace
  // module graph). Its entries use double-quoted strings, hence the
  // quote-flexible extractor below.
  const mobileTwinPath = path.join(
    repoRoot,
    'apps',
    'mobile',
    'src',
    'auth',
    'session.ts',
  );
  const mobileSource = readFileSync(mobileTwinPath, 'utf8');

  function extractMobileMap(source: string): Map<string, string> {
    const map = new Map<string, string>();
    const body =
      source.match(/export const ROLE_LABELS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '';
    for (const m of body.matchAll(/^\s*([A-Z_]+):\s*"([^"]*)"/gm)) {
      map.set(m[1]!, m[2]!);
    }
    return map;
  }

  it('the mobile twin was found and parses to five entries', () => {
    const map = extractMobileMap(mobileSource);
    expect(map.size).toBe(5);
    expect([...map.keys()].sort()).toEqual([...Object.keys(ROLE_LABELS)].sort());
  });

  it('same Arabic values as the backend/web twins — no third drift', () => {
    const map = extractMobileMap(mobileSource);
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(map.get(role), `mobile twin drift at ${role}`).toBe(label);
    }
  });

  it('the mobile twin no longer labels ADMIN as the registrar-general job title', () => {
    const map = extractMobileMap(mobileSource);
    expect(map.get('ADMIN')).toBe('إدارة المؤسسة');
    expect(map.get('ADMIN') ?? '').not.toContain('مسجل');
  });
});
