/**
 * layers.test.tsx — R341 (lead): the MarkLayers exact-geometry pins.
 *
 * The brand system's single-layer renderers (MarkVesselLayer /
 * MarkCornerstoneLayer — the sanctioned way for animated seats like the
 * Boot loader to render the mark with per-layer animation) must render
 * EXACTLY the canonical geometry <Logo variant="mark"> renders — the
 * same shared constants, the same X11 optical-hairline stroke math.
 *
 * This file lives INSIDE the brand system, where consuming the geometry
 * constants is legal (logo-gate §3); the exact-constant pins belong
 * here, not in the seats.
 */
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import {
  MARK_CORNERSTONE,
  MARK_VESSEL_PATH,
  markStrokePx,
} from "./mark";
import { MarkVesselLayer, MarkCornerstoneLayer } from "./layers";

/** A toJSON() node. */
type JsonNode = string | null | { props?: Record<string, unknown>; children?: unknown[] };

/** Collect a prop from every node in the serialized tree. */
function collectProp(node: JsonNode | JsonNode[], prop: string): unknown[] {
  const out: unknown[] = [];
  const walk = (n: JsonNode | JsonNode[]) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n == null || typeof n === "string") return;
    const value = n.props?.[prop];
    if (value !== undefined) out.push(value);
    if (Array.isArray(n.children)) n.children.forEach((c) => walk(c as JsonNode));
  };
  walk(node);
  return out;
}

/** Collect the full prop bags of every node matching `pred`. */
function collectNodes(
  node: JsonNode | JsonNode[],
  pred: (props: Record<string, unknown>) => boolean,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (n: JsonNode | JsonNode[]) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n == null || typeof n === "string") return;
    if (n.props && pred(n.props)) out.push(n.props);
    if (Array.isArray(n.children)) n.children.forEach((c) => walk(c as JsonNode));
  };
  walk(node);
  return out;
}

describe("MarkVesselLayer — the canonical vessel, exactly", () => {
  it("renders EXACTLY the shared vessel path on the mark's own viewBox", async () => {
    const { toJSON } = await render(<MarkVesselLayer size={120} color="#262019" />);
    expect(collectProp(toJSON(), "d")).toEqual([MARK_VESSEL_PATH]);
    expect(collectProp(toJSON(), "vbWidth")).toEqual([32]);
    expect(collectProp(toJSON(), "vbHeight")).toEqual([32]);
  });

  it("rides <Logo>'s exact X11 optical-hairline stroke math", async () => {
    for (const size of [16, 26, 64, 120]) {
      const { toJSON } = await render(<MarkVesselLayer size={size} color="#262019" />);
      expect(collectProp(toJSON(), "strokeWidth")).toEqual([
        +((markStrokePx(size) * 32) / size).toFixed(3),
      ]);
    }
  });

  it("is ONE round-capped, round-joined stroke in the given ink", async () => {
    const { toJSON } = await render(<MarkVesselLayer size={120} color="#262019" />);
    const inked = collectNodes(toJSON(), (props) => props.strokeLinecap !== undefined);
    expect(inked).toHaveLength(1);
    expect(inked[0].strokeLinecap).toBe(1); // round (react-native-svg numeric)
    expect(inked[0].strokeLinejoin).toBe(1); // round
    expect(inked[0].fill).toBe(null); // "none" serializes as null in the test tree
  });
});

describe("MarkCornerstoneLayer — the canonical cornerstone, exactly", () => {
  it("renders EXACTLY the shared 4×4 rect at its canonical seat", async () => {
    const { toJSON } = await render(<MarkCornerstoneLayer size={120} color="#C43E16" />);
    const stones = collectNodes(
      toJSON(),
      (props) => props.x === MARK_CORNERSTONE.x && props.y === MARK_CORNERSTONE.y,
    );
    expect(stones).toHaveLength(1);
    expect(stones[0].width).toBe(MARK_CORNERSTONE.size);
    expect(stones[0].height).toBe(MARK_CORNERSTONE.size);
    expect(stones[0].stroke).toBe(null); // "none" serializes as null in the test tree
  });
});
