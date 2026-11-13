/**
 * R334 2-c — sheet presets contract (colocated with the component).
 *
 * WHAT IS MOCKED AND WHY (jest-expo environment, R334):
 *   · `@gorhom/bottom-sheet` is faked below. The REAL v5 engine cannot boot
 *     under the repo's reanimated jest mock: the mock's `makeMutable` is the
 *     identity function, so `useAnimatedLayout`'s layout state is a plain
 *     object and `useAnimatedDetents` dies on `layoutState.get(...)`. The
 *     fake reproduces exactly the surface AppSheet programs against — a
 *     ref-driven `present/dismiss` modal that mounts children only when
 *     presented, a passthrough provider, view/scroll-view/text-input shells,
 *     and the footerComponent slot. What the suite proves against the REAL
 *     presets: the controlled open/onClose wiring, the preset copy, and the
 *     a11y marks.
 *   · `react-native-gesture-handler` is faked down to GestureHandlerRootView
 *     (the only export the sheet uses): RNGH v3 schedules a native
 *     `installUIRuntimeBindings` task that crashes the suite under jest.
 *
 * NOT CLAIMED (honesty table, no emulator): pixel snap positions, gesture
 * tracking, keyboard tracking, portal layering — those need a device
 * (see docs/mobile/foundations/sheets.md).
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ActionSheet,
  ConfirmSheet,
  FilterSheet,
  PickerSheet,
  SHEET_ANIMATION,
} from "./sheet";
import { T } from "./text";

jest.mock("react-native-gesture-handler", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load React lazily (jest hoists the mock above real imports)
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load RN primitives lazily (jest hoists the mock above real imports)
  const { View } = require("react-native");
  return {
    GestureHandlerRootView: ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style, pointerEvents: "box-none" }, children),
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load React lazily (jest hoists the mock above real imports)
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load RN primitives lazily (jest hoists the mock above real imports)
  const { View, TextInput, ScrollView } = require("react-native");

  /** The ref contract AppSheet drives (present/dismiss + no-op nav). */
  const BottomSheetModal = React.forwardRef(function BottomSheetModal(props: any, ref: any) {
    const [presented, setPresented] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => setPresented(true),
      dismiss: () => setPresented(false),
      snapToIndex: () => undefined,
      snapToPosition: () => undefined,
      expand: () => undefined,
      collapse: () => undefined,
      close: () => setPresented(false),
      forceClose: () => setPresented(false),
    }));
    if (!presented) return null;
    const Footer = props.footerComponent;
    return React.createElement(
      View,
      { accessibilityLabel: props.accessibilityLabel },
      props.handleComponent === null ? null : React.createElement(View, { testID: "sheet-handle" }),
      props.children,
      Footer ? React.createElement(Footer, {}) : null,
    );
  });

  const BottomSheetModalProvider = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const BottomSheetView = (props: any) => React.createElement(View, props);
  const BottomSheetScrollView = (props: any) => React.createElement(ScrollView, props);
  const BottomSheetTextInput = (props: any) => React.createElement(TextInput, props);
  const BottomSheetBackdrop = (props: any) => React.createElement(View, props);

  return {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetView,
    BottomSheetScrollView,
    BottomSheetTextInput,
    BottomSheetBackdrop,
  };
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ConfirmSheet", () => {
  test("open renders title, message, and both actions; confirm fires", async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <ConfirmSheet
        open
        onClose={jest.fn()}
        title="حذف الإشعار"
        message="لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        onConfirm={onConfirm}
        destructive
      />,
    );
    await waitFor(() => view.getByText("حذف الإشعار"));
    expect(view.getByText("لا يمكن التراجع عن هذا الإجراء.")).toBeTruthy();
    // The header close affordance is labeled in Arabic.
    expect(view.getByLabelText("إغلاق")).toBeTruthy();
    fireEvent.press(view.getByText("حذف"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("closed presents no sheet content (the modal mounts on present only)", async () => {
    const view = await render(
      <ConfirmSheet open={false} onClose={jest.fn()} title="حذف الإشعار" onConfirm={jest.fn()} />,
    );
    await flush();
    expect(view.queryByText("حذف الإشعار")).toBeNull();
    expect(view.queryByText("تأكيد")).toBeNull();
    expect(view.queryByLabelText("إغلاق")).toBeNull();
  });

  test("defaults: «تأكيد» / «إلغاء»", async () => {
    const view = await render(
      <ConfirmSheet open onClose={jest.fn()} title="تأكيد الإجراء" onConfirm={jest.fn()} />,
    );
    await waitFor(() => view.getByText("تأكيد"));
    expect(view.getByText("إلغاء")).toBeTruthy();
  });
});

describe("PickerSheet", () => {
  const options = [
    { id: "cs", label: "علوم الحاسب", sub: "الكلية الأولى" },
    { id: "eng", label: "الهندسة" },
  ];

  test("renders options, marks the selected row, and selects on press", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <PickerSheet
        open
        onClose={onClose}
        title="اختر التخصص"
        options={options}
        selectedId="eng"
        onSelect={onSelect}
      />,
    );
    await waitFor(() => view.getByText("علوم الحاسب"));
    expect(view.getByText("الهندسة")).toBeTruthy();
    // The selected row announces its state…
    const selected = view.getByLabelText("الهندسة");
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });
    // …and the unselected one does not.
    expect(view.getByLabelText("علوم الحاسب").props.accessibilityState).toMatchObject({
      selected: false,
    });
    fireEvent.press(selected);
    expect(onSelect).toHaveBeenCalledWith("eng");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("empty options render the honest empty label", async () => {
    const view = await render(
      <PickerSheet open onClose={jest.fn()} title="اختر" options={[]} onSelect={jest.fn()} />,
    );
    await waitFor(() => view.getByText("لا توجد خيارات"));
  });

  test("loading state renders before options arrive", async () => {
    const view = await render(
      <PickerSheet
        open
        onClose={jest.fn()}
        title="اختر"
        options={options}
        onSelect={jest.fn()}
        loading
      />,
    );
    await waitFor(() => view.getByText("جارٍ التحميل…"));
    expect(view.queryByText("علوم الحاسب")).toBeNull();
  });
});

describe("ActionSheet", () => {
  test("renders every action + «إلغاء»; an action closes then runs", async () => {
    const onClose = jest.fn();
    const act = jest.fn();
    const view = await render(
      <ActionSheet
        open
        onClose={onClose}
        title="إجراءات المقرر"
        actions={[
          { label: "مشاركة", onPress: act },
          { label: "حذف", onPress: jest.fn(), destructive: true },
        ]}
      />,
    );
    await waitFor(() => view.getByText("إجراءات المقرر"));
    expect(view.getByLabelText("مشاركة")).toBeTruthy();
    expect(view.getByLabelText("حذف")).toBeTruthy();
    fireEvent.press(view.getByLabelText("مشاركة"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(act).toHaveBeenCalledTimes(1);
    expect(view.getByText("إلغاء")).toBeTruthy();
  });
});

describe("FilterSheet", () => {
  test("scrollable body + sticky «تطبيق» / «إعادة تعيين» footer", async () => {
    const onApply = jest.fn();
    const onReset = jest.fn();
    const view = await render(
      <FilterSheet open onClose={jest.fn()} onApply={onApply} onReset={onReset}>
        <T variant="body">محتوى التصفية</T>
      </FilterSheet>,
    );
    await waitFor(() => view.getByText("تصفية"));
    expect(view.getByText("محتوى التصفية")).toBeTruthy();
    fireEvent.press(view.getByText("تطبيق"));
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByText("إعادة تعيين"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("SHEET_ANIMATION (reduced-motion fast path)", () => {
  test("exposes the ds cadence + a faster reduced path", () => {
    expect(SHEET_ANIMATION.durationMs).toBeGreaterThan(SHEET_ANIMATION.reducedDurationMs);
    expect(SHEET_ANIMATION.easing).toBeTruthy();
  });
});

/* ══ AppSheet mounting contract (r341 t01) ═══════════════════════ */
/*
 * CI forensics (GitHub Actions run 43426779345, android-smoke job):
 * Maestro taps «تسجيل الخروج» (COMPLETED), then the confirm «خروج» is
 * never found for ALL FIVE roles — the captured screen hierarchy shows
 * the settings page with NO sheet. The Mobile workflow has never passed.
 *
 * Root cause: every AppSheet-family sheet mounts its own
 * absolutely-positioned host (GestureHandlerRootView, sheet.tsx
 * styles.host = absolute fill). Mounted INSIDE a ScrollView (Screen
 * scroll / ScrollBody), the host lives in the scroll content's
 * coordinate space and the sheet fails to present on Android release
 * builds — violating the sheet's own docblock (sheet.tsx:50-52: "Mount
 * AppSheet at the ROOT of the screen it serves … a sibling of the
 * screen content, not nested inside a card/row").
 *
 * The r341 t01 fix restructures four screens so every sheet sits AFTER
 * the scroller it serves. The real sheet engine cannot boot under jest
 * (see the module header), so these cases pin the contract the way
 * CountUp.test.tsx pins its worklet contract: by reading the screen
 * SOURCE and asserting the mounting order — the closing scroller tag
 * must come BEFORE the sheet element, i.e. the sheet is a sibling of
 * the scroller, never its scroll content.
 */
describe("AppSheet mounting contract (r341 t01)", () => {
  const read = (...rel: string[]) => readFileSync(join(__dirname, "..", "..", "..", "app", ...rel), "utf8");

  const settings = read("settings.tsx");
  const profile = read("student", "(tabs)", "profile.tsx");
  const live = read("teacher", "live.tsx");
  const document = read("document", "[filename].tsx");

  /** The closing scroller tag must exist and sit strictly BEFORE the sheet
   *  element — otherwise the sheet is (back) inside the scroller. The guard
   *  matters: a missing tag is -1, and -1 < x would silently pass. */
  const assertSibling = (source: string, closer: string, sheetTag: string, file: string) => {
    const close = source.lastIndexOf(closer);
    const sheet = source.indexOf(sheetTag);
    if (close < 0 || sheet < 0) {
      throw new Error(`${file}: ${closer} @${close}, ${sheetTag} @${sheet} — both must exist in the screen source`);
    }
    expect(close).toBeLessThan(sheet);
  };

  test("settings.tsx: the logout ConfirmSheet mounts after the Screen scroller", () => {
    assertSibling(settings, "</Screen>", "<ConfirmSheet", "settings.tsx");
  });

  test("profile.tsx: the logout ConfirmSheet mounts after the ScrollBody scroller", () => {
    assertSibling(profile, "</ScrollBody>", "<ConfirmSheet", "profile.tsx");
  });

  test("teacher/live.tsx: the create AppSheet and the lifecycle ConfirmSheet both mount after the Screen scroller", () => {
    assertSibling(live, "</Screen>", "<AppSheet", "teacher/live.tsx");
    assertSibling(live, "</Screen>", "<ConfirmSheet", "teacher/live.tsx");
  });

  test("document/[filename].tsx: the share ActionSheet and the annotations AppSheet both mount after the Screen scroller", () => {
    assertSibling(document, "</Screen>", "<ActionSheet", "document/[filename].tsx");
    assertSibling(document, "</Screen>", "<AppSheet", "document/[filename].tsx");
  });
});
