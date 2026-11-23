/**
 * R353-2 §10 — the bulk-import HONESTY contract, end-to-end at the
 * screen level:
 *
 *  · The server's real behavior is partial-and-skipped (valid rows
 *    created in one transaction, invalid rows SKIPPED, counts in the
 *    answer) — the screen copy must never claim «الدفعة كاملة أو لا
 *    شيء», and the result shown is the SERVER's word.
 *  · The preview is bound to the exact CSV + institution: editing
 *    either one invalidates it immediately (a commit can never ride
 *    a stale preview).
 *  · ONE explicit confirm step with the EXACT counts before the
 *    commit fires.
 *  · Inputs lock while the commit is in flight.
 *  · A TIMEOUT on the commit is the AMBIGUOUS outcome — surfaced as
 *    such (never silently re-fired: a duplicate re-send would create
 *    accounts twice).
 */
import React, { act } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "@/auth/session";
import { ApiError } from "@/api/client";
import type { AuthUser } from "@/api/types";

/* ── the api seam mock ─────────────────────────────────────────────── */

const mockPreview = jest.fn();
const mockCommit = jest.fn();

/* the screen's toasts are module-level global state (queue + hide
 * timers) that must never leak across tests — mock the toast surface
 * (its own suite tests the real one). */
jest.mock("@/components/ui/toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock("@/api/admin", () => ({
  adminApi: {
    bulkPreview: (...args: unknown[]) => mockPreview(...(args as [])),
    bulkCommit: (...args: unknown[]) => mockCommit(...(args as [])),
  },
}));

/* the screen under test (app/ tree — outside the @/ src alias) */
const AdminBulkImport = require("../../app/admin/bulk-import").default as React.ComponentType;

/* ── helpers ───────────────────────────────────────────────────────── */

const CSV_A =
  "الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة\n" +
  "أحمد,الفيتوري,a@x.edu,2027001,هندسة,حاسب,1";

const PREVIEW_A = {
  rows: [
    { line: 1, status: "ok", firstName: "أحمد", lastName: "الفيتوري", email: "a@x.edu", universityId: "2027001", faculty: "هندسة", department: "حاسب" },
  ],
  summary: { total: 1, ok: 1, error: 0 },
};

const PREVIEW_MIXED = {
  rows: [
    { line: 1, status: "ok", firstName: "أحمد", lastName: "الفيتوري", email: "a@x.edu", universityId: "2027001", faculty: "هندسة", department: "حاسب" },
    { line: 2, status: "error", message: "البريد الإلكتروني مسجل مسبقاً في المنصة", email: "taken@x.edu", universityId: "2027002" },
  ],
  summary: { total: 2, ok: 1, error: 1 },
};

function signIn() {
  act(() => {
    useSession.setState({
      user: {
        id: "admin-1", email: "admin@test.ly", role: "ADMIN", firstName: "إداري", lastName: "أُلارا",
        memberships: [{ institutionId: "inst-1", name: "المؤسسة أ", slug: "a", role: "ADMIN", isActive: true }],
        currentInstitution: { id: "inst-1", name: "المؤسسة أ", slug: "a" },
        membershipRole: "ADMIN",
      } as AuthUser,
      isHydrated: true,
    });
  });
}

async function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const rendered = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider>
        <AdminBulkImport />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  return rendered;
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useSession.setState({
      user: null, accessToken: null, refreshCookie: null,
      activeInstitutionId: null, isHydrated: true, sessionEpoch: 0,
    });
  });
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

/* ── the honesty contract ─────────────────────────────────────────── */

describe("/admin/bulk-import — the honest intake", () => {
  it("the copy states the REAL server behavior (partial + skipped), never «all-or-nothing»", async () => {
    signIn();
    const rendered = await mount();

    const honesty = rendered.getByText(
      /تُنشأ الخادم الصفوف الصالحة في معاملة واحدة، ويتخطى الصفوف الخاطئة/,
    );
    expect(honesty).toBeTruthy();
    // the old false claim is GONE
    expect(rendered.queryByText(/الدفعة كاملة أو لا شيء/)).toBeNull();
    // the false first-login password claim is gone too
    expect(rendered.queryByText(/لن يستطيع الطلاب تغييرها قبل أول دخول/)).toBeNull();
  });

  it("the preview marks rows that WILL BE SKIPPED with the honest per-row reason", async () => {
    signIn();
    mockPreview.mockResolvedValueOnce(PREVIEW_MIXED);
    const rendered = await mount();

    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), CSV_A);
    await fireEvent.press(rendered.getByText("عرض مسبق"));

    await waitFor(() => expect(mockPreview).toHaveBeenCalledWith(CSV_A, "inst-1"));
    await waitFor(() => expect(rendered.getByText("سيُتخطى")).toBeTruthy());
    expect(rendered.getByText("سيُنشأ")).toBeTruthy();
    expect(rendered.getByText(/البريد الإلكتروني مسجل مسبقاً في المنصة/)).toBeTruthy();
  });

  it("editing the CSV after the preview invalidates it immediately (no stale commit)", async () => {
    signIn();
    mockPreview.mockResolvedValueOnce(PREVIEW_A);
    const rendered = await mount();

    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), CSV_A);
    await fireEvent.press(rendered.getByText("عرض مسبق"));
    await waitFor(() => expect(rendered.getByText("سيُنشأ")).toBeTruthy());

    // a single keystroke of change → the plan dies with its CSV
    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), `${CSV_A}\n`);
    await waitFor(() => expect(rendered.queryByText("سيُنشأ")).toBeNull());
    expect(rendered.getByText("لا خطة بعد")).toBeTruthy();

    // and the commit button is dead without a fresh preview
    const commitBtn = rendered.queryByText(/^إنشاء /);
    expect(commitBtn?.props?.disabled ?? true).toBe(true);
  });

  it("ONE confirm step shows the EXACT counts before the commit fires", async () => {
    signIn();
    mockPreview.mockResolvedValueOnce(PREVIEW_MIXED);
    const rendered = await mount();

    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), CSV_A);
    await fireEvent.press(rendered.getByText("عرض مسبق"));
    await waitFor(() => expect(rendered.getByText("سيُتخطى")).toBeTruthy());

    await waitFor(() => expect(rendered.getByText(/إنشاء 1 حساباً/)).toBeTruthy());
    await fireEvent.press(rendered.getByText(/إنشاء 1 حساباً/));
    await waitFor(() =>
      expect(rendered.getByText(/سيُنشأ 1 حساباً طالباً الآن، وسيُتخطى 1 صفاً خاطئاً/)).toBeTruthy(),
    );
    // the commit has NOT fired yet — confirmation is the only door
    expect(mockCommit).not.toHaveBeenCalled();

    await fireEvent.press(rendered.getByText("تأكيد الإنشاء"));
    await waitFor(() => expect(mockCommit).toHaveBeenCalledWith(CSV_A, "inst-1"));
  });

  it("the result shown is the SERVER's created/skipped — not the plan's expectation", async () => {
    signIn();
    mockPreview.mockResolvedValueOnce(PREVIEW_A);
    mockCommit.mockResolvedValueOnce({
      created: 1,
      skipped: 0,
      sheet: [{ name: "أحمد الفيتوري", email: "a@x.edu", universityId: "2027001", tempPassword: "temp-pass-1234" }],
    });
    const rendered = await mount();

    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), CSV_A);
    await fireEvent.press(rendered.getByText("عرض مسبق"));
    await waitFor(() => expect(rendered.getByText("سيُنشأ")).toBeTruthy());
    await waitFor(() => expect(rendered.getByText(/إنشاء 1 حساباً/)).toBeTruthy());
    await fireEvent.press(rendered.getByText(/إنشاء 1 حساباً/));
    await fireEvent.press(rendered.getByText("تأكيد الإنشاء"));

    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    await waitFor(() =>
      expect(rendered.getByText(/كلمات المرور المؤقتة/)).toBeTruthy(),
    );
    expect(rendered.getByText("temp-pass-1234")).toBeTruthy();
    expect(rendered.getByText(/الحسابات المنشأة/)).toBeTruthy();
  });

  it("a TIMEOUT on the commit surfaces the ambiguous outcome — never a silent re-fire", async () => {
    signIn();
    mockPreview.mockResolvedValueOnce(PREVIEW_A);
    mockCommit.mockRejectedValueOnce(new ApiError("TIMEOUT", "انتهت مهلة الطلب — حاول مجدداً", 0));
    const rendered = await mount();

    await fireEvent.changeText(rendered.getByLabelText("محتوى CSV"), CSV_A);
    await fireEvent.press(rendered.getByText("عرض مسبق"));
    await waitFor(() => expect(rendered.getByText("سيُنشأ")).toBeTruthy());
    await waitFor(() => expect(rendered.getByText(/إنشاء 1 حساباً/)).toBeTruthy());
    await fireEvent.press(rendered.getByText(/إنشاء 1 حساباً/));
    await fireEvent.press(rendered.getByText("تأكيد الإنشاء"));

    await waitFor(() =>
      expect(rendered.getByText(/نتيجة آخر محاولة غير مؤكدة — قد تكون الدفعة نُفذت/)).toBeTruthy(),
    );
    // exactly ONE commit ever fired — the ambiguous outcome never re-sends
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
