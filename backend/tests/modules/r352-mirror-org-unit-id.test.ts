/**
 * r352 — the mirror-id convention (org-units.service.mirrorOrgUnitId).
 *
 * Migration 0005 rewrote the pre-hardening 'ou-f-<id>' / 'ou-d-<id>'
 * mirror ids to the legacy row's own cuid; the seed catch-up and the
 * legacy write-through (ensureOrgUnitForFaculty/Department) must mint the
 * SAME shape — the prefixed shape failed every z.string().cuid() param
 * («Invalid cuid» 400s on ?orgUnitId= filters and parentId writes).
 */
import { describe, expect, it } from 'vitest';
import { mirrorOrgUnitId } from '../../src/modules/r352/org-units.service.js';

describe('mirrorOrgUnitId', () => {
  it('is the legacy id itself when it is already cuid-shaped (the Prisma default)', () => {
    const cuid = 'cmw9d5zt20004exl1h5tw4edy';
    expect(mirrorOrgUnitId(cuid)).toBe(cuid);
    expect(mirrorOrgUnitId('c' + 'a'.repeat(10))).toBe('c' + 'a'.repeat(10));
  });

  it('minimally reshapes a non-cuid legacy id: c + dashes stripped', () => {
    // e.g. a legacy seeded id like 'inst-faculty-1'
    expect(mirrorOrgUnitId('inst-faculty-1')).toBe('cinstfaculty1');
    expect(mirrorOrgUnitId('legacy-dept-77')).toBe('clegacydept77');
  });

  it('never produces the retired ou-f-/ou-d- prefixed shape', () => {
    for (const legacy of ['cmw9d5zt20004exl1h5tw4edy', 'seeded-legacy-1', 'x']) {
      const out = mirrorOrgUnitId(legacy);
      expect(out.startsWith('ou-f-')).toBe(false);
      expect(out.startsWith('ou-d-')).toBe(false);
    }
  });

  it('matches migration 0005\u2019s own rewrite rule for the same inputs', () => {
    // 0005: WHEN substring(id from 6) ~ '^c[0-9a-z]{8,}$ THEN substring(id from 6)
    //       ELSE 'c' || replace(substring(id from 6), '-', '')
    // i.e. for a pre-0005 row 'ou-f-<legacy>': legacy when cuid-shaped,
    // else 'c' + legacy without dashes — the exact function above.
    const legacy = 'seeded-legacy-2';
    const viaMigration = 'c' + legacy.replace(/-/g, '');
    expect(mirrorOrgUnitId(legacy)).toBe(viaMigration);
  });
});
