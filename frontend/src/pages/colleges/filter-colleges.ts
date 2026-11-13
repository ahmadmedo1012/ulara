/**
 * filterColleges — pure, synchronous query filter for the gallery.
 *
 * Phase Ω (identity purity): the campus dimension is retired — the
 * platform has no campuses, and faculties are grouped by nothing but
 * their institution. What survives is the honest query filter (the
 * canonical Arabic/English fold).
 *
 * No DOM, no network, no React. Trivially testable in isolation.
 */

// r146 (T1-c F8): the Arabic/English folding is the CANONICAL mirror
// from lib/search.ts (itself the mirror of
// backend/src/modules/search/normalize.ts) — AGENTS.md §6 requires ONE
// normalization across the product. The page-local variant this replaces
// folded only diacritics/tatweel, so «هندسه» failed to find «كلية الهندسة»
// (ة≠ه) while /search/global found it — inconsistent search behavior
// between two surfaces of the same product.
import { normalizeArabicSearch } from '../../lib/search';

export type FilterState = {
  query: string;
};

export type FilterResult<T> = {
  items: T[];
  total: number;
};

/** r146: canonical folding (NFC + lowercase + diacritics/tatweel strip
 *  + alif/hamza/ة/ى folds) — see lib/search.ts; covers Latin case too. */
const normalizeQuery = normalizeArabicSearch;

/**
 * The minimum shape filterColleges needs from a college.
 * Generic so it works against `CollegeListItem` from CollegePages.tsx
 * without importing that interface here.
 */
export type FilterableCollege = {
  name: string;
  nameEn?: string | null;
};

/**
 * Filter colleges by the search query.
 *
 * @param list  - the full faculty list (cached from /api/colleges — the
 *                institution's OWN structure, never a platform catalogue)
 * @param state - current filter state
 * @returns     - { items, total }
 */
export function filterColleges<T extends FilterableCollege>(
  list: ReadonlyArray<T>,
  state: FilterState,
): FilterResult<T> {
  const trimmedQuery = state.query.trim();
  if (!trimmedQuery) return { items: [...list], total: list.length };

  const queryAr = normalizeQuery(trimmedQuery); // one canonical fold covers both scripts
  const survivors: T[] = [];
  for (const c of list) {
    const arHit = normalizeQuery(c.name).includes(queryAr);
    const enHit = c.nameEn ? normalizeQuery(c.nameEn).includes(queryAr) : false;
    if (arHit || enHit) survivors.push(c);
  }
  return { items: survivors, total: survivors.length };
}
