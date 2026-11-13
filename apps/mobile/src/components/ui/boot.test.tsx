/**
 * boot.test.tsx — R341 T02: BootMark's canonical-geometry contract.
 *
 * The owner's «الشعار غير متّسق» complaint, root-caused: BootMark hand-drew
 * a competing construction (two converging squares + a 4×4 point — magic
 * numbers 15.556 / "22,6" / 45deg) instead of rendering the canonical
 * U-vessel + cornerstone, so every cold start cross-faded the canonical
 * splash icon into a DIFFERENT figure at the same ~120px seat (the same
 * competing-construction defect class retired from the web footer in
 * acef177). This suite pins the fix three ways:
 *
 *   · SOURCE CONTRACT (the CountUp.test.tsx pattern): boot.tsx's source
 *     must import the geometry from the brand source of truth (@/brand/mark)
 *     and must NOT contain the retired hand-drawn construction's data —
 *     and it must keep the ds converging rhythm + reduced-motion branch.
 *   · RENDER NET (the Logo/RingProgress pattern): the REAL react-native-svg
 *     subtree (no mock — it is in the jest transform allowlist) serializes
 *     the exact MARK_VESSEL_PATH, the MARK_CORNERSTONE rect, the X11
 *     optical hairline, and the palette's ink/accent seats.
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
import {
  MARK_CORNERSTONE,
  MARK_VESSEL_PATH,
  markStrokePx,
} from "@/brand/mark";
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

  it("imports the geometry from the brand source of truth (@/brand/mark), never hand-drawn", () => {
    expect(source).toContain('from "@/brand/mark"');
    // the canonical constants the figure is built from
    expect(source).toContain("MARK_VESSEL_PATH");
    expect(source).toContain("MARK_CORNERSTONE");
    expect(source).toContain("MARK_VIEWBOX");
    // the same optical hairline <Logo> rides (no retyped stroke math)
    expect(source).toContain("markStrokePx");
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

describe("BootMark — render net (real react-native-svg subtree, the Logo pattern)", () => {
  it("renders the canonical vessel path on the mark's own 32-grid viewBox", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(toJSON()).not.toBeNull();
    // the vessel is EXACTLY the shared source constant — no hand-retyped path
    expect(collectProp(toJSON(), "d")).toContain(MARK_VESSEL_PATH);
    // the mark's own canvas (MARK_VIEWBOX '0 0 32 32') at the splash seat
    expect(collectProp(toJSON(), "vbWidth")).toContain(32);
    expect(collectProp(toJSON(), "vbHeight")).toContain(32);
    expect(collectProp(toJSON(), "width")).toContain(SEAT);
    expect(collectProp(toJSON(), "height")).toContain(SEAT);
  });

  it("rides the same optical hairline as <Logo> (X11 ramp, viewBox units)", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(collectProp(toJSON(), "strokeWidth")).toContain(
      +((markStrokePx(SEAT) * 32) / SEAT).toFixed(3),
    );
    // round caps and joins — the vessel is ONE continuous stroke (mark.ts).
    // react-native-svg serializes the string enums numerically: round = 1
    // (caps: butt/square = 0 · joins: miter/bevel = 0).
    const inked = collectNodes(toJSON(), (props) => props.strokeLinecap !== undefined);
    expect(inked).toHaveLength(1); // ONE inked stroke — the vessel
    expect(inked[0].strokeLinecap).toBe(1);
    expect(inked[0].strokeLinejoin).toBe(1);
  });

  it("themes through the live palette — ink vessel stroke, sienna cornerstone fill", async () => {
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#262019")); // the light palette ink
    expect(collectProp(toJSON(), "fill")).toContainEqual(processed("#C43E16")); // the light palette accent
  });

  it("seats the cornerstone at MARK_CORNERSTONE — the 4×4 at the right stem's top", async () => {
    const { toJSON } = await render(<BootMark size={64} />);
    const stones = collectNodes(
      toJSON(),
      (props) =>
        props.x === MARK_CORNERSTONE.x &&
        props.y === MARK_CORNERSTONE.y &&
        props.width === MARK_CORNERSTONE.size,
    );
    expect(stones).toHaveLength(1); // exactly one cornerstone, from the shared constant
    expect(stones[0].height).toBe(MARK_CORNERSTONE.size);
    expect(stones[0].fill).toEqual(processed("#C43E16"));
  });

  it("reduced motion renders the SAME canonical figure, statically (no loops started)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<BootMark size={SEAT} />);
    expect(collectProp(toJSON(), "d")).toContain(MARK_VESSEL_PATH);
    expect(
      collectNodes(
        toJSON(),
        (props) =>
          props.x === MARK_CORNERSTONE.x &&
          props.y === MARK_CORNERSTONE.y &&
          props.width === MARK_CORNERSTONE.size,
      ),
    ).toHaveLength(1);
  });
});

describe("Boot — the full-screen seat", () => {
  it("mounts the canonical mark with its honest Arabic label", async () => {
    const { getByText, toJSON } = await render(<Boot label="جارٍ التحميل…" />);
    expect(getByText("جارٍ التحميل…")).toBeTruthy();
    expect(collectProp(toJSON(), "d")).toContain(MARK_VESSEL_PATH);
  });
});
