/**
 * r352 — pure organizational-tree logic (lib/org-tree.ts).
 */
import { describe, expect, it } from 'vitest';
import {
  ancestorChainFromMap,
  buildTree,
  orgUnitParentError,
  wouldCreateCycle,
} from '../../src/lib/org-tree';

const facts = (id: string, parentId: string | null, institutionId = 'inst1') => ({
  id, parentId, institutionId,
});

describe('orgUnitParentError', () => {
  it('accepts a root (null parent)', () => {
    expect(orgUnitParentError(facts('a', null), null)).toBeNull();
  });
  it('accepts a same-institution parent', () => {
    expect(orgUnitParentError(facts('a', 'p'), facts('p', null))).toBeNull();
  });
  it('rejects self-parenting', () => {
    expect(orgUnitParentError(facts('a', 'a'), facts('a', null))).toBe('SELF');
  });
  it('rejects a missing parent', () => {
    expect(orgUnitParentError(facts('a', 'ghost'), null)).toBe('MISSING');
  });
  it('rejects a cross-institution parent (the tenancy belt)', () => {
    expect(orgUnitParentError(facts('a', 'p'), facts('p', null, 'inst2'))).toBe(
      'CROSS_INSTITUTION',
    );
  });
});

describe('wouldCreateCycle', () => {
  const parents = new Map<string, string | null>([
    ['root', null],
    ['mid', 'root'],
    ['leaf', 'mid'],
  ]);
  it('accepts null parent and clean chains', () => {
    expect(wouldCreateCycle('leaf', null, parents)).toBe(false);
    expect(wouldCreateCycle('new', 'leaf', parents)).toBe(false);
  });
  it('rejects self-assignment', () => {
    expect(wouldCreateCycle('leaf', 'leaf', parents)).toBe(true);
  });
  it('rejects assigning an ancestor as parent (cycle)', () => {
    expect(wouldCreateCycle('root', 'leaf', parents)).toBe(true);
    expect(wouldCreateCycle('mid', 'leaf', parents)).toBe(true);
  });
  it('rejects when the map itself is already cyclic (defensive)', () => {
    const cyclic = new Map<string, string | null>([['x', 'y'], ['y', 'x']]);
    expect(wouldCreateCycle('x', 'y', cyclic)).toBe(true);
  });
});

describe('ancestorChainFromMap', () => {
  it('walks unit → root in order', () => {
    const parents = new Map<string, string | null>([['leaf', 'mid'], ['mid', 'root'], ['root', null]]);
    expect(ancestorChainFromMap('leaf', parents)).toEqual(['leaf', 'mid', 'root']);
  });
  it('returns null on a cyclic map', () => {
    const cyclic = new Map<string, string | null>([['x', 'y'], ['y', 'x']]);
    expect(ancestorChainFromMap('x', cyclic)).toBeNull();
  });
});

describe('buildTree', () => {
  it('nests children under parents and returns roots', () => {
    const rows = [
      { id: 'root', parentId: null, name: 'root' },
      { id: 'a', parentId: 'root', name: 'a' },
      { id: 'b', parentId: 'root', name: 'b' },
      { id: 'a1', parentId: 'a', name: 'a1' },
    ];
    const tree = buildTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.unit.id).toBe('root');
    expect(tree[0]!.children.map((c) => c.unit.id).sort()).toEqual(['a', 'b']);
    expect(tree[0]!.children[0]!.children[0]!.unit.id).toBe('a1');
  });
  it('prunes deeper than maxDepth', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: `n${i}`, parentId: i === 0 ? null : `n${i - 1}`,
    }));
    const tree = buildTree(rows, 5);
    let depth = 0;
    let node = tree[0]!;
    while (node.children.length > 0) {
      node = node.children[0]!;
      depth += 1;
    }
    expect(depth).toBe(4); // children cut at depth 5
  });
});
