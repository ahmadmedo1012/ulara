/**
 * r351 N2 — the LargeTitleScreen net (RNTL).
 *
 * Runs under the reanimated jest mock (setup.ts): useAnimatedStyle
 * evaluates ONCE with the shared values at rest (progress 0), so the
 * serialized tree carries the REST state — the large title fully
 * visible, the bar's collapsed seat fully transparent. Those are
 * exactly the pins below. The pure clamp (collapse.ts) is pinned
 * numerically. The scroll-driven VALUES are UI-thread work — NOT
 * verifiable here (no device/emulator in this workspace); the source
 * contract pins the worklet discipline instead (no captured functions
 * — the CountUp R336 freeze rule).
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { COLLAPSE, collapseProgress } from "./collapse";
import { LargeTitleScreen } from "./LargeTitleScreen";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

const ROOT = join(__dirname, "..", "..", "..");

const SRC_FILES = {
  frame: join(ROOT, "src", "components", "shell", "LargeTitleScreen.tsx"),
  bar: join(ROOT, "src", "components", "shell", "AppTopBar.tsx"),
};

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

function Fixture(props: Partial<Parameters<typeof LargeTitleScreen>[0]>): ReactNode {
  /* The same provider harness the render net uses (AppTopBar's
   * useUnreadCount needs a QueryClient; insets come from the official
   * safe-area mock's zero provider). */
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <LargeTitleScreen
          title="لوحة الجودة"
          alertsPath="/quality/alerts"
          kicker="قراءة فقط"
          {...props}
        >
          <Text testID="body">المحتوى</Text>
        </LargeTitleScreen>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe("collapse.ts — the pure clamp", () => {
  it("0 below zero, 1 past the threshold, linear between", () => {
    expect(collapseProgress(-40)).toBe(0);
    expect(collapseProgress(0)).toBe(0);
    expect(collapseProgress(COLLAPSE.threshold)).toBe(1);
    expect(collapseProgress(COLLAPSE.threshold * 10)).toBe(1);
    expect(collapseProgress(COLLAPSE.threshold / 2)).toBeCloseTo(0.5, 10);
  });

  it("the geometry is sane (monotone windows, sub-threshold fades)", () => {
    expect(COLLAPSE.threshold).toBeGreaterThanOrEqual(48);
    expect(COLLAPSE.threshold).toBeLessThanOrEqual(96);
    expect(COLLAPSE.titleFadeAt).toBeGreaterThan(0);
    expect(COLLAPSE.titleFadeAt).toBeLessThanOrEqual(1);
    expect(COLLAPSE.seatOut[0]).toBeLessThan(COLLAPSE.seatOut[1]);
    expect(COLLAPSE.seatIn[0]).toBeLessThan(COLLAPSE.seatIn[1]);
    // the incoming title only starts once the outgoing brand is on its way out
    expect(COLLAPSE.seatIn[0]).toBeGreaterThanOrEqual(COLLAPSE.seatOut[0]);
  });
});

describe("LargeTitleScreen — the rest state (progress 0)", () => {
  it("renders the ONE large title with its mono kicker", async () => {
    await render(<Fixture />);
    // two nodes carry the title words: the large one in content + the
    // bar seat (pinned separately below)
    expect(screen.getAllByText("لوحة الجودة")).toHaveLength(2);
    expect(screen.getByText("قراءة فقط")).toBeTruthy();
    expect(screen.getByTestId("body")).toBeTruthy();
  });

  it("the bar seat crossfades to the SAME words by default (one-title law)", async () => {
    await render(<Fixture />);
    // two nodes carry the title: the large one in content + the collapsed seat
    expect(screen.getAllByText("لوحة الجودة")).toHaveLength(2);
  });

  it("barTitle overrides the seat's words (the greeting screens)", async () => {
    await render(<Fixture barTitle="الرئيسية" />);
    expect(screen.getByText("الرئيسية")).toBeTruthy();
    expect(screen.getAllByText("لوحة الجودة")).toHaveLength(1);
  });

  it("the bar keeps its persistent actions (search + bell)", async () => {
    await render(<Fixture />);
    expect(screen.getByLabelText("البحث")).toBeTruthy();
    expect(screen.getByLabelText("الإشعارات")).toBeTruthy();
  });

  it("the collapsed seat rests TRANSPARENT and the large title rests VISIBLE", async () => {
    const { toJSON } = await render(<Fixture />);
    const tree = JSON.stringify(toJSON());
    // the mock evaluates each useAnimatedStyle once at rest: the large
    // title carries opacity 1 (and translateY 0), the seat's title
    // opacity 0. The brand word seat is the one with opacity 1.
    expect(tree).toContain('"opacity":1');
    expect(tree).toContain('"opacity":0');
  });

  it("reduced motion: the title rests with NO drift transform", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<Fixture />);
    const tree = JSON.stringify(toJSON());
    // reduced at rest: translateY 0 (opacity-only degradation — the B2 rule)
    expect(tree).toContain('"translateY":0');
    // and the GATE exists in source: reduced drops the drift entirely
    const frame = readFileSync(SRC_FILES.frame, "utf8");
    expect(frame).toContain("reduced ? 0 : -COLLAPSE.drift");
  });
});

describe("LargeTitleScreen — the worklet discipline (source contract)", () => {
  it("the worklet bodies call no captured functions (the R336 freeze rule)", () => {
    for (const f of Object.values(SRC_FILES)) {
      const src = readFileSync(f, "utf8");
      const bodies = (src.match(/useAnimatedStyle\(\(\) => \{[\s\S]*?\n  \}\);/g) ?? []).map((m) =>
        m.replace(/^useAnimatedStyle\(\(\) => \{/, "").replace(/\n  \}\);$/, ""),
      );
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        // every identifier-call inside the worklet must be a Math.* builtin —
        // a captured app function here is a UI-runtime remote call (freeze)
        const calls = body.match(/[a-zA-Z_$][\w$.]*\s*\(/g) ?? [];
        const banned = calls.filter((c) => !c.replace(/\s+\($/, "(").startsWith("Math."));
        expect(banned).toEqual([]);
      }
    }
  });

  it("the frame reads the SAME geometry as the bar (one source)", () => {
    const frame = readFileSync(SRC_FILES.frame, "utf8");
    const bar = readFileSync(SRC_FILES.bar, "utf8");
    for (const src of [frame, bar]) {
      expect(src).toContain("COLLAPSE.threshold");
    }
    expect(frame).toContain("useAnimatedScrollHandler");
  });
});
