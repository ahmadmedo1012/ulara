/**
 * r352 — pure organizational-tree logic (DB-free, unit-testable).
 */
export interface OrgUnitParentFacts {
  id: string;
  parentId: string | null;
  institutionId: string;
}

/** True when the parent facts describe an invalid parent for the unit:
 * self-parent, missing parent, cross-institution parent. */
export function orgUnitParentError(
  unit: OrgUnitParentFacts,
  parent: OrgUnitParentFacts | null,
): 'SELF' | 'MISSING' | 'CROSS_INSTITUTION' | null {
  if (unit.parentId === null) return null;
  if (unit.parentId === unit.id) return 'SELF';
  if (!parent) return 'MISSING';
  if (parent.institutionId !== unit.institutionId) return 'CROSS_INSTITUTION';
  return null;
}

/** Walk a materialized parent map from a unit to the root; detects
 * cycles (bounded by the map size). Returns the ancestor chain
 * (unit itself first) or null when a cycle is found. */
export function ancestorChainFromMap(
  unitId: string,
  parents: ReadonlyMap<string, string | null>,
): string[] | null {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = unitId;
  while (cur !== null) {
    if (seen.has(cur)) return null; // cycle
    seen.add(cur);
    chain.push(cur);
    cur = parents.get(cur) ?? null;
  }
  return chain;
}

/** Would assigning `newParentId` to `unitId` create a cycle, given the
 * current parent map? (Self-assignment counts.) */
export function wouldCreateCycle(
  unitId: string,
  newParentId: string | null,
  parents: ReadonlyMap<string, string | null>,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === unitId) return true;
  let cur: string | null = newParentId;
  const seen = new Set<string>();
  while (cur !== null) {
    if (cur === unitId) return true;
    if (seen.has(cur)) return true; // pre-existing cycle — refuse anyway
    seen.add(cur);
    cur = parents.get(cur) ?? null;
  }
  return false;
}

/** Build a nested tree from flat rows (bounded depth). */
export interface TreeRow {
  id: string;
  parentId: string | null;
  [key: string]: unknown;
}
export interface TreeNode<T extends TreeRow> {
  unit: T;
  children: TreeNode<T>[];
}
export function buildTree<T extends TreeRow>(rows: readonly T[], maxDepth = 20): TreeNode<T>[] {
  const byId = new Map<string, TreeNode<T>>();
  for (const row of rows) byId.set(row.id, { unit: row, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.unit.parentId ? byId.get(node.unit.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  // Depth guard: nodes deeper than maxDepth are cut (defensive — the
  // DB trigger prevents cycles, but a pathological deep chain must
  // never hang a tree render).
  const prune = (node: TreeNode<T>, depth: number): void => {
    node.children = depth >= maxDepth ? [] : node.children.map((c) => (prune(c, depth + 1), c));
  };
  for (const root of roots) prune(root, 1);
  return roots;
}
