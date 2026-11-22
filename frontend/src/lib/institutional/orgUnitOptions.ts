/**
 * r352 — the org-unit tree as select options (the r37 deadcode round).
 *
 * The ACTIVE-unit option list «النوع — الاسم» was derived inline in
 * THREE components (PeoplePage list + person detail + CouncilsPage) —
 * jscpd counted the identical derivation as clones. One home now.
 */
import { ORG_UNIT_TYPE_LABELS } from './labels';
import type { OrgUnit, OrgUnitTreeNode } from './types';

/** Depth-first flatten of the org-unit tree (children inline). */
export function flattenUnits(nodes: OrgUnitTreeNode[], out: OrgUnit[] = []): OrgUnit[] {
  for (const n of nodes) {
    out.push(n);
    flattenUnits(n.children, out);
  }
  return out;
}

/** ACTIVE org units as select options — «النوع — الاسم العربي». */
export function activeUnitOptions(tree: OrgUnitTreeNode[] | undefined): Array<{ value: string; label: string }> {
  return (tree ? flattenUnits(tree) : [])
    .filter((u) => u.status === 'ACTIVE')
    .map((u) => ({ value: u.id, label: `${ORG_UNIT_TYPE_LABELS[u.type]} — ${u.nameAr}` }));
}
