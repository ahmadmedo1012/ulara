/* Agent S — shared page patterns barrel (contract v1, r210).
 * CONTRACT.md is normative. Signatures here are frozen: add optional
 * props later, never rename or remove. */

export { PageFrame } from './PageFrame';
export type { PageFrameWidth } from './PageFrame';

export { PageHeader } from './PageHeader';
export type { PageBreadcrumb } from './PageHeader';

export { SectionHeader } from './SectionHeader';

export { RowList, RowItem } from './RowList';
export type { RowListProps, RowItemProps } from './RowList';

export { SplitView } from './SplitView';

export { StatLine } from './StatLine';
export type { StatLineItem } from './StatLine';

export { FilterBar } from './FilterBar';
export type { FilterBarSearch } from './FilterBar';

export { TodayList } from './TodayList';
export type { TodayItem } from './TodayList';

/* R359 (A3) — the sheet-grammar patterns (additive; contract v1
 * signatures untouched). Full grammar contract in Sheet.tsx. */
export {
  SheetSection,
  KpiBand,
  DataSheet,
  CalloutTag,
  CoordReadout,
  SheetEmpty,
  MonoLabel,
} from './Sheet';
export type { KpiItem, KpiTone, DataSheetColumn } from './Sheet';
