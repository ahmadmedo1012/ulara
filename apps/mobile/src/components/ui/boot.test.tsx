/**
 * boot.test.tsx — R341 T02: BootMark's canonical-geometry contract.
 *
 * The owner's «الشعار غير متّسق» complaint, root-caused: BootMark hand-drew
 * a competing construction (two converging squares + a 4×4 point — magic
 * numbers 15.556 / "22,6" / 45deg) instead of rendering the canonical
 * U-vessel + cornerstone, so every cold start cross-faded the canonical
 * splash icon into a DIFFERENT figure at the same ~120px seat (the same
 * competing-construction defect class retired from the web footer in
 * acef177).
 *
 * R341 LEAD REVISION (logo-gate §3 reconciliation): the geometry constants
 * are consumed ONLY inside the brand system — boot.tsx renders through the
 * brand barrel's MarkVesselLayer / MarkCornerstoneLayer exports (never the
 * deep geometry module, never the raw svg primitives). This suite pins
 * THAT contract (the exact-geometry pins live in the brand system's own
 * layers.test.tsx, where the constants are legal):
 *
 *   · SOURCE CONTRACT (the CountUp.test.tsx pattern): boot.tsx consumes
 *     the brand barrel's layer components, imports no geometry module and
 *     no svg primitives, and carries no retired hand-drawn construction
 *     data — and keeps the ds converging rhythm + reduced-motion branch.
 *   · RENDER NET (the Logo/RingProgress pattern): the real svg subtree
 *     (no mock) renders one inked round-capped stroke + one accent rect on
 *     the 32-grid canvas at the requested seat, themed through the live
 *     palette — the composed figure IS the canonical mark (exact-constant
 *     pins: src/brand/layers.test.tsx).
 *   · the Boot seat: the full-screen loader mounts the canonical figure
 *     with its honest Arabic label.
 *
 * HONESTY: jest + the static first frame — the native-driver pulse loops
 * are UI-thread work this workspace cannot observe (no device/emulator).
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { Boot, BootMark } from "./boot";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

/** A toJSON() node (string | null | { props, children }). */
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

/**
 * react-native-svg serializes colour props in the test tree as processed
 * colour objects ({ payload: 0xAARRGGBB, type: 0 }) — the Logo net's
 * helper, so the pin stays exact.
 */
const processed = (hex: string) => ({ payload: 0xff000000 + Number.parseInt(hex.slice(1), 16), type: 0 });

/** The BootMark svg canvas seat (the splash icon size — the cross-fade seat). */
const SEAT = 120;

describe("BootMark — canonical geometry (source contract, the CountUp pattern)", () => {
  const source = readFileSync(new URL("./boot.tsx", import.meta.url), "utf8");

  it("consumes the brand system's layer exports — never the geometry module (logo-gate §3)", () => {
    // the barrel import of the sanctioned single-layer renderers
    expect(source).toContain('from "@/brand"');
    expect(source).toContain("MarkVesselLayer");
    expect(source).toContain("MarkCornerstoneLayer");
    // the deep geometry module, the constants, and the stroke math stay
    // inside the brand system — a seat never touches them
    expect(source).not.toContain('from "@/brand/mark"');
    expect(source).not.toContain("markStrokePx");
    // no raw svg primitives here either — the render is fully delegated
    expect(source).not.toContain('from "react-native-svg"');
  });

  it("carries NO hand-drawn path data — the retired two-squares construction is gone", () => {
    expect(source).not.toContain("15.556"); // the √2-snapped diamond side
    expect(source).not.toContain("45deg"); // the diamond's rotation
    expect(source).not.toMatch(/\d+ \* u/); // the hand-scaled grid arithmetic (u = size/32)
    expect(source).not.toContain("المربعان يتجمعان"); // the retired figure's caption
    expect(source).not.toContain("two squares"); // …and its section header
  });

  it("keeps the ds converging rhythm — the counter-phase loops and the reduced-motion static branch", () => {
    // the same CYCLE/EASE pulse seats the hand-drawn figure rode
    expect(source).toContain("usePulseLoop(1, 0.88, CYCLE, EASE, !reduced)");
    expect(source).toContain("usePulseLoop(1, 1.09, CYCLE, EASE, !reduced)");
    expect(source).toContain("usePulseLoop(1, 0.35, CYCLE, EASE, !reduced)");
    expect(source).toContain("if (reduced) {"); // the static render path survives
    expect(source).toContain("useReduceMotion()");
  });
});

describe("BootMark — render net (real svg subtree, the Logo pattern)", () => {
  it("renders the canonical figure on the mark's own 32-grid canvas at the seat size", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(toJSON()).not.toBeNull();
    // the mark's own canvas ('0 0 32 32') at the splash seat — twice
    // (vessel layer + cornerstone layer), never any other viewBox.
    // Collect from the Svg canvas nodes only (the cornerstone Rect also
    // carries width/height props of its own — 4×4 — which are pinned in
    // src/brand/layers.test.tsx).
    const canvases = collectNodes(toJSON(), (props) => props.vbWidth !== undefined);
    expect(canvases).toHaveLength(2);
    for (const c of canvases) {
      expect(c.vbWidth).toBe(32);
      expect(c.vbHeight).toBe(32);
      expect(c.width).toBe(SEAT);
      expect(c.height).toBe(SEAT);
    }
  });

  it("rides the same optical hairline as <Logo> — ONE round-capped ink stroke", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    // round caps and joins — the vessel is ONE continuous stroke (mark.ts).
    // react-native-svg serializes the string enums numerically: round = 1
    // (caps: butt/square = 0 · joins: miter/bevel = 0).
    const inked = collectNodes(toJSON(), (props) => props.strokeLinecap !== undefined);
    expect(inked).toHaveLength(1); // ONE inked stroke — the vessel
    expect(inked[0].strokeLinecap).toBe(1);
    expect(inked[0].strokeLinejoin).toBe(1);
    // the stroke math is <Logo>'s own X11 ramp (asserted exact in
    // src/brand/layers.test.tsx — the brand system owns the constants)
  });

  it("themes through the live palette — ink vessel stroke, sienna cornerstone fill", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#262019")); // the light palette ink
    expect(collectProp(toJSON(), "fill")).toContainEqual(processed("#C43E16")); // the light palette accent
  });

  it("composes exactly one cornerstone rect — the solid accent 4×4", async () => {
    const { toJSON } = await render(<BootMark size={64} />);
    const stones = collectNodes(
      toJSON(),
      (props) => props.fill !== undefined && props.x !== undefined,
    );
    expect(stones).toHaveLength(1); // exactly one filled rect — the cornerstone
  });

  it("reduced motion renders the SAME canonical figure, statically (no loops started)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<BootMark size={SEAT} />);
    // the same two-layer canvas figure, unanimated
    expect(collectProp(toJSON(), "vbWidth")).toEqual([32, 32]);
    const inked = collectNodes(toJSON(), (props) => props.strokeLinecap !== undefined);
    expect(inked).toHaveLength(1);
    expect(
      collectNodes(toJSON(), (props) => props.fill !== undefined && props.x !== undefined),
    ).toHaveLength(1);
  });
});

describe("Boot — the full-screen seat", () => {
  it("mounts the canonical mark with its honest Arabic label", async () => {
    const { getByText, toJSON } = await render(<Boot label="جارٍ التحميل…" />);
    expect(getByText("جارٍ التحميل…")).toBeTruthy();
    // the composed two-layer figure is present on the 32-grid canvas
    expect(collectProp(toJSON(), "vbWidth")).toEqual([32, 32]);
    const inked = collectNodes(toJSON(), (props) => props.strokeLinecap !== undefined);
    expect(inked).toHaveLength(1);
  });
});
