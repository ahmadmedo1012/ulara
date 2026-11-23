/**
 * R353-2 §3/§4/§6/§7/§9/§13 — the institutional workspace SCREEN
 * behavior net: the real screens mount against the mocked api seam
 * with a signed-in ADMIN session, and the behaviors that this round
 * exists for are asserted END-TO-END at the screen level:
 *
 *  · §7 the DEEP-LINK kind rule: /institution/research (+ /:id) under
 *    a foreign-kind institution renders the honest explanatory state
 *    and fires NO research reads (the nav row's hiding was never a
 *    route guard).
 *  · §6 the no-context state: an allowed role with zero memberships
 *    gets «لم تُحدَّد مؤسسة» — not an eternal skeleton and not empty-
 *    institution copy.
 *  · §4 pagination wiring: the list screens request page=1&limit=20
 *    and surface the server's meta total («من N وفق سجل المؤسسة»).
 *  · §8 the wire vocabulary: fullNameAr rows render by NAME (the old
 *    invented displayName rendered blanks), the meeting minutes ride
 *    the ≤1-row ARRAY, the person detail rides the { person, … }
 *    aggregate.
 *  · §13 the data states: loading → rows / empty / error+retry.
 *
 * Real scroll physics, FlashList recycling and pixels are NOT claimed
 * here — no emulator in this sandbox (the render-net's honesty label
 * applies). What IS claimed: the screens render the right data from
 * the right requests and the right honest states.
 */
import React, { act } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "@/auth/session";
import { MOCK_ROUTER_PARAMS } from "../../test/setup";
import type { AuthUser, Paginated } from "@/api/types";
import type { Person, PersonDetail, MeetingDetail, InstitutionProfile } from "@/api/institutional";

/* ── the api seam mock (the hooks' real wiring runs above it) ─────── */

const mockApi = {
  getMyInstitutionProfile: jest.fn(),
  getMyPermissions: jest.fn(),
  listResearchProjects: jest.fn(),
  getResearchProject: jest.fn(),
  listResearchOutputs: jest.fn(),
  listPeople: jest.fn(),
  getPerson: jest.fn(),
  getMeeting: jest.fn(),
};

jest.mock("@/api/institutional", () => ({
  institutionalApi: {
    getMyInstitutionProfile: (...args: unknown[]) => mockApi.getMyInstitutionProfile(...(args as [])),
    getMyPermissions: (...args: unknown[]) => mockApi.getMyPermissions(...(args as [])),
    listResearchProjects: (...args: unknown[]) => mockApi.listResearchProjects(...(args as [])),
    getResearchProject: (...args: unknown[]) => mockApi.getResearchProject(...(args as [])),
    listResearchOutputs: (...args: unknown[]) => mockApi.listResearchOutputs(...(args as [])),
    listPeople: (...args: unknown[]) => mockApi.listPeople(...(args as [])),
    getPerson: (...args: unknown[]) => mockApi.getPerson(...(args as [])),
    getMeeting: (...args: unknown[]) => mockApi.getMeeting(...(args as [])),
  },
}));

/* the screens under test (route files — the app/ tree sits OUTSIDE the
 * @/ src alias, so they load the way the render-net does: by relative
 * path from the app root). */
type RouteComponent = React.ComponentType;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- route files live outside the src alias
const InstitutionResearch = require("../../../app/institution/research").default as RouteComponent;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InstitutionResearchDetail = require("../../../app/institution/research/[id]").default as RouteComponent;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InstitutionPeople = require("../../../app/institution/people").default as RouteComponent;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InstitutionPersonDetail = require("../../../app/institution/people/[id]").default as RouteComponent;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InstitutionMeetingDetail = require("../../../app/institution/councils/[id]/meetings/[meetingId]").default as RouteComponent;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const InstitutionLayout = require("../../../app/institution/_layout").default as RouteComponent;

/* ── helpers ───────────────────────────────────────────────────────── */

function adminUser(memberships: AuthUser["memberships"], currentInstitution: AuthUser["currentInstitution"]): AuthUser {
  return {
    id: "admin-1", email: "admin@test.ly", role: "ADMIN", firstName: "إداري", lastName: "أُلارا",
    memberships, currentInstitution, membershipRole: "ADMIN",
  } as AuthUser;
}

const SINGLE_INST_MEMBERSHIPS = [
  { institutionId: "inst-1", name: "المؤسسة أ", slug: "a", role: "ADMIN" as const, isActive: true },
];

function signInWithMembership() {
  act(() => {
    useSession.setState({
      user: adminUser(SINGLE_INST_MEMBERSHIPS, { id: "inst-1", name: "المؤسسة أ", slug: "a" }),
      isHydrated: true,
    });
  });
}

function signOutNoMembership() {
  act(() => {
    useSession.setState({
      user: adminUser([], null),
      isHydrated: true,
    });
  });
}

/** RNTL 14's render is async and owns its act discipline — never wrap
 * it in an outer act (the result binding degrades: getByText vanishes). */
async function mount(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const rendered = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider>{ui}</SafeAreaProvider>
    </QueryClientProvider>,
  );
  return { rendered, client };
}

function profile(kindCode: string): { institution: InstitutionProfile } {
  return {
    institution: {
      id: "inst-1", name: "المؤسسة أ", nameEn: null, slug: "a", status: "ACTIVE",
      sector: null, kind: { id: "k", code: kindCode, nameAr: "نوع المؤسسة" },
      ownership: null, supervisingAuthority: null, establishmentDecisionNumber: null,
      establishmentDecisionDate: null, parentId: null,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

function personRow(id: string, nameAr: string): Person {
  return {
    id, institutionId: "inst-1", userId: null, staffNumber: "T-101", fullNameAr: nameAr,
    fullNameEn: null, category: "ACADEMIC_STAFF", primaryOrgUnitId: null, staffStatus: "ACTIVE",
    hiredAt: null, endedAt: null, email: null, phone: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function paged<T>(data: T[], total: number, totalPages: number): Paginated<T> {
  return { data, meta: { page: 1, limit: 20, total, totalPages } };
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(MOCK_ROUTER_PARAMS)) delete MOCK_ROUTER_PARAMS[k];
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

/* ── §7 the deep-link kind rule ──────────────────────────────────── */

describe("/institution/research — the deep-link kind rule", () => {
  it("renders the honest hidden state and fires NO research reads for a foreign kind", async () => {
    signInWithMembership();
    mockApi.getMyInstitutionProfile.mockResolvedValueOnce(profile("INTERMEDIATE_TECHNICAL_INSTITUTE"));

    const { rendered } = await mount(<InstitutionResearch />);

    await waitFor(() =>
      expect(rendered.getByText("القسم غير مفعّل لنوع مؤسستك")).toBeTruthy(),
    );
    // THE deep-link rule: no research read ever left the app.
    expect(mockApi.listResearchProjects).not.toHaveBeenCalled();
    expect(rendered.getByText(/البحث المؤسسي من مهام قطاع التعليم العالي/)).toBeTruthy();
  });

  it("fires the paged research read for an ELIGIBLE kind (higher-education)", async () => {
    signInWithMembership();
    mockApi.getMyInstitutionProfile.mockResolvedValueOnce(profile("TECHNICAL_COLLEGE"));
    mockApi.listResearchProjects.mockResolvedValueOnce(
      paged([
        {
          id: "rp-1", institutionId: "inst-1", orgUnitId: null, code: "R-1",
          titleAr: "تسريع الاستدلال على الحافة", titleEn: null, field: "الحوسبة",
          principalInvestigatorId: null, startsAt: null, endsAt: null, status: "ACTIVE",
          fundingSource: null, budget: null, ethicsApprovalRef: null, approvalRef: null, notes: null,
        },
      ], 1, 1),
    );

    const { rendered } = await mount(<InstitutionResearch />);

    await waitFor(() => expect(mockApi.listResearchProjects).toHaveBeenCalled());
    expect(mockApi.listResearchProjects).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20 });
    await waitFor(() => expect(rendered.getByText("تسريع الاستدلال على الحافة")).toBeTruthy());
  });

  it("the DETAIL deep-link obeys the same rule (no project read for a foreign kind)", async () => {
    signInWithMembership();
    mockApi.getMyInstitutionProfile.mockResolvedValueOnce(profile("VOCATIONAL_TRAINING_CENTER"));

    const { rendered } = await mount(<InstitutionResearchDetail />);

    await waitFor(() =>
      expect(rendered.getByText("القسم غير مفعّل لنوع مؤسستك")).toBeTruthy(),
    );
    expect(mockApi.getResearchProject).not.toHaveBeenCalled();
    expect(mockApi.listResearchOutputs).not.toHaveBeenCalled();
  });
});

/* ── §6 the no-context state ─────────────────────────────────────── */

describe("the institution layout — no-context state (not an eternal skeleton)", () => {
  it("an allowed role with ZERO active memberships gets the honest «pick an institution» state", async () => {
    signOutNoMembership();

    const { rendered } = await mount(<InstitutionLayout />);

    await waitFor(() =>
      expect(rendered.getByText("لم تُحدَّد مؤسسة في هذه الجلسة")).toBeTruthy(),
    );
    // the copy separates «no context» from «empty institution» — the
    // exact confusion the round forbids.
    expect(rendered.getByText(/هذا يختلف عن «مؤسسة فارغة»/)).toBeTruthy();
  });
});

/* ── §4/§8/§13 the people screen: pagination + vocabulary + states ── */

describe("/institution/people — the register screen", () => {
  it("requests page 1 (limit 20), renders fullNameAr rows, and surfaces the server's total", async () => {
    signInWithMembership();
    mockApi.listPeople.mockResolvedValueOnce(
      paged([personRow("p-1", "أ.د. سالم العميد"), personRow("p-2", "م. ليلى الفيتوري")], 47, 3),
    );

    const { rendered } = await mount(<InstitutionPeople />);

    await waitFor(() => expect(mockApi.listPeople).toHaveBeenCalled());
    expect(mockApi.listPeople).toHaveBeenCalledWith({ q: undefined, page: 1, limit: 20 });
    await waitFor(() => expect(rendered.getByText("أ.د. سالم العميد")).toBeTruthy());
    expect(rendered.getByText("م. ليلى الفيتوري")).toBeTruthy();
    // the honest total line — the first-page cap is gone
    await waitFor(() =>
      expect(rendered.getByText(/من 47 وفق سجل المؤسسة/)).toBeTruthy(),
    );
  });

  it("the honest empty state when the register is empty", async () => {
    signInWithMembership();
    mockApi.listPeople.mockResolvedValueOnce(paged([], 0, 0));

    const { rendered } = await mount(<InstitutionPeople />);

    await waitFor(() => expect(rendered.getByText("لا أفراد بعد")).toBeTruthy());
    expect(rendered.getByText(/سجل الأفراد فارغ لهذه المؤسسة/)).toBeTruthy();
  });

  it("the error state with retry (the 403 membership class) — never an empty state", async () => {
    signInWithMembership();
    mockApi.listPeople.mockRejectedValueOnce(new Error("INSTITUTION_CONTEXT_REQUIRED"));

    const { rendered } = await mount(<InstitutionPeople />);

    // the ERROR state, not the «no data» empty copy (the round's rule:
    // an API error must never masquerade as an empty register).
    await waitFor(() => expect(rendered.getByText("تعذّر تحميل البيانات")).toBeTruthy());
    // retry re-issues the read
    mockApi.listPeople.mockResolvedValueOnce(paged([personRow("p-9", "بعد المحاولة")], 1, 1));
    fireEvent.press(rendered.getByText("إعادة المحاولة"));
    await waitFor(() => expect(rendered.getByText("بعد المحاولة")).toBeTruthy());
  });
});

/* ── §8 the wire aggregates ──────────────────────────────────────── */

describe("the detail screens — the real wire shapes", () => {
  it("person detail renders the { person, appointments } aggregate (the name paints, not «—»)", async () => {
    signInWithMembership();
    const detail: PersonDetail = {
      person: personRow("p-1", "أ.د. سالم العميد"),
      appointments: [
        {
          id: "ap-1", positionId: "pos-1", orgUnitId: null,
          startDate: "2024-09-01", endDate: null, status: "ACTIVE", acting: false,
          position: { id: "pos-1", code: "DEAN", titleAr: "عميد الكلية" },
        },
      ],
      unitCapabilityGrants: [],
    };
    mockApi.getPerson.mockResolvedValueOnce(detail);
    MOCK_ROUTER_PARAMS.id = "p-1";

    const { rendered } = await mount(<InstitutionPersonDetail />);

    // the name paints BOTH the header title and the masthead — the old
    // invented displayName painted neither.
    await waitFor(() => expect(rendered.getAllByText("أ.د. سالم العميد").length).toBeGreaterThan(0));
    expect(rendered.getByText("عميد الكلية")).toBeTruthy();
  });

  it("meeting detail reads minutes as the ARRAY the route includes (minutes[0], never an object)", async () => {
    signInWithMembership();
    const meeting: MeetingDetail = {
      id: "m-1", councilId: "c-1", seqNumber: 4, scheduledAt: "2026-11-01T09:00:00.000Z",
      createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
      location: "قاعة المجلس", status: "HELD", agendaSummary: null,
      attendance: [], agendaItems: [], resolutions: [],
      minutes: [
        { id: "min-1", meetingId: "m-1", versionNo: 1, contentAr: "نُوقش تقرير الجودة واعتُمد.", status: "DRAFT", approvedAt: null, signedAt: null, isCurrent: true },
      ],
    };
    mockApi.getMeeting.mockResolvedValueOnce(meeting);
    MOCK_ROUTER_PARAMS.id = "c-1";
    MOCK_ROUTER_PARAMS.meetingId = "m-1";

    const { rendered } = await mount(<InstitutionMeetingDetail />);

    await waitFor(() => expect(rendered.getByText("نُوقش تقرير الجودة واعتُمد.")).toBeTruthy());
    expect(rendered.getByText(/قاعة المجلس/)).toBeTruthy();
  });
});
