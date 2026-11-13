import { describe, expect, it } from 'vitest';
import { filterColleges, type FilterableCollege } from '../../src/pages/colleges/filter-colleges';

/**
 * Phase Ω (identity purity): the campus dimension is retired with the
 * fixed catalogue — the platform has no campuses and faculties are
 * grouped by nothing but their institution. What this suite pins is
 * the honest query filter (the canonical Arabic/English fold), the
 * behavior the gallery actually renders today.
 *
 * The fixtures are neutral workspace faculties (no invented campuses,
 * no real universities — the retired programme's names are gone).
 */
const colleges: FilterableCollege[] = [
  { name: 'كلية علوم الحاسوب', nameEn: 'College of Computer Science' },
  { name: 'كلية الهندسة', nameEn: 'College of Engineering' },
  { name: 'كلية إدارة الأعمال', nameEn: 'College of Business Administration' },
  { name: 'كلية الطب البشري', nameEn: 'Faculty of Human Medicine' },
  { name: 'كلية العلوم', nameEn: 'College of Sciences' },
  { name: 'كلية التقنى الطبية', nameEn: null },
];

describe('filterColleges', () => {
  it('returns empty result for empty input', () => {
    const out = filterColleges([], { query: '' });
    expect(out.items).toHaveLength(0);
    expect(out.total).toBe(0);
  });

  it('returns the full list when no query', () => {
    const out = filterColleges(colleges, { query: '' });
    expect(out.total).toBe(6);
    expect(out.items[0]?.name).toBe('كلية علوم الحاسوب');
  });

  it('Arabic substring match (no diacritics typed)', () => {
    const out = filterColleges(colleges, { query: 'هندس' });
    expect(out.total).toBe(1);
    expect(out.items[0]?.name).toBe('كلية الهندسة');
  });

  it('Arabic substring match strips tatweel + diacritics', () => {
    // "الهَنْـدَسة" — with explicit fatha + sukun + tatweel — should still match
    // since both query and target are normalized.
    const list: FilterableCollege[] = [
      { name: 'كلية الهَنْـدَسة', nameEn: null },
    ];
    const out = filterColleges(list, { query: 'هندس' });
    expect(out.total).toBe(1);
  });

  /* r146 (T1-c F8): the canonical fold closes the inconsistency with
   * /search/global — a user typing the colloquial spelling «هندسه»
   * (ة→ه) now finds كلية الهندسة on the gallery too, not only in the
   * global search; and alif-maqsura ى in a name matches a query typed
   * with plain ي. */
  it('r146 — colloquial ة→ه and ى→ي spellings match via the canonical fold (parity with /search/global)', () => {
    // ة typed as ه…
    expect(filterColleges(colleges, { query: 'هندسه' }).total).toBe(1);
    // ى in the name matched by a query typed with plain ي.
    expect(filterColleges(colleges, { query: 'التقني' }).total).toBe(1);
  });

  it('English match is case-insensitive', () => {
    const out = filterColleges(colleges, { query: 'college' });
    // 4 fixtures carry "College" in nameEn (the Faculty one matches 'faculty' instead)
    expect(out.total).toBe(4);
  });

  it('English match works with mixed case', () => {
    const out = filterColleges(colleges, { query: 'ECONOM' });
    expect(out.total).toBe(0); // no Economics faculty in the neutral set
    const eng = filterColleges(colleges, { query: 'ENGINEERING' });
    expect(eng.total).toBe(1);
    expect(eng.items[0]?.nameEn).toContain('Engineering');
  });

  it('returns zero total when query matches nothing', () => {
    const out = filterColleges(colleges, { query: 'xyzzy' });
    expect(out.total).toBe(0);
    expect(out.items).toHaveLength(0);
  });

  it('treats whitespace-only query as no filter', () => {
    const out = filterColleges(colleges, { query: '   ' });
    expect(out.total).toBe(6);
  });

  it('handles colleges with null nameEn', () => {
    const list: FilterableCollege[] = [
      { name: 'كلية الصيدلة', nameEn: null },
      { name: 'كلية التمريض', nameEn: undefined },
    ];
    const out = filterColleges(list, { query: 'صيدلة' });
    expect(out.total).toBe(1);
    expect(out.items[0]?.name).toBe('كلية الصيدلة');
  });

  it('Arabic query never leaks into the English field match when nameEn is null', () => {
    const list: FilterableCollege[] = [
      { name: 'كلية العلوم', nameEn: null },
    ];
    const out = filterColleges(list, { query: 'علوم' });
    expect(out.total).toBe(1);
  });
});
