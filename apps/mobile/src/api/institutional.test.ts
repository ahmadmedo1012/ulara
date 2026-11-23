/**
 * R353-2 §8 — the institutional transport CONTRACT tests: for every
 * API family, the ACTUAL wire call is pinned — method, path, query
 * params, body — plus the envelope handling on the way back. A
 * `typeof fn === "function"` assertion proves nothing about the
 * contract; these tests do (each family: one call, one captured
 * request, one resolved shape).
 *
 *  · LIST family: the paged reads keep the { data, meta } body WHOLE
 *    (R353-2 §4 — meta is the pagination truth; the plain unwrap
 *    dropped it, which is how lists got capped at page one with a
 *    fabricated totalPages: 1).
 *  · TREE: nested { unit, children } unwrapped at the seam.
 *  · ORG UNIT DETAIL: the route's real { unit, ancestors } answer
 *    (the previously invented `OrgUnit` return type — the confirmed
 *    conflict this round closed).
 *  · MEETING DETAIL: flat row; `minutes` rides a one-to-many include
 *    → an ARRAY of ≤1 row (never an object).
 *  · WRITES: PATCH/POST verbs + bodies byte-checked.
 *  · ERROR/DATA-NULL envelopes: the R327 A4 pins hold on this family.
 */
import { institutionalApi } from "./institutional";
import { getPage, ApiError } from "./client";

function textResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

/** The captured (url, init) of the last fetch. */
function lastCall(): { url: string; method: string; body: unknown } {
  const fetchMock = globalThis.fetch as jest.Mock;
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body) : undefined };
}

function prime(body: unknown, status = 200) {
  (globalThis.fetch as jest.Mock).mockImplementationOnce(async () => textResponse(body, status));
}

/* ── §4 people — the paged list contract ─────────────────────────── */

describe("listPeople — the paged wire contract", () => {
  it("GETs /institutional/people with page/limit/q and keeps { data, meta } WHOLE", async () => {
    const rows = [{ id: "p1", fullNameAr: "أ.د. سالم العميد", staffStatus: "ACTIVE" }];
    prime({ data: rows, meta: { page: 1, limit: 20, total: 47, totalPages: 3 } });

    const out = await institutionalApi.listPeople({ q: "سالم", page: 1, limit: 20 });

    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/institutional/people");
    expect(url).toContain("q=%D8%B3%D8%A7%D9%84%D9%85"); // the Arabic query rides URL-encoded
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");

    // THE §4 pin: meta survived the envelope seam.
    expect(out.meta).toEqual({ page: 1, limit: 20, total: 47, totalPages: 3 });
    expect(out.data).toEqual(rows);
  });

  it("the wire's row vocabulary is fullNameAr/staffStatus — never a fabricated displayName", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const out = await institutionalApi.listPeople();
    expect(Array.isArray(out.data)).toBe(true);
  });
});

/* ── §3 org units — the tree + the detail aggregate ─────────────── */

describe("org units", () => {
  it("GET /institutional/org-units/tree unwraps the nested { unit, children } wire", async () => {
    const unit = { id: "u-root", nameAr: "عمادة الكلية", type: "OFFICE", status: "ACTIVE" };
    const child = { id: "u-cs", nameAr: "قسم تقنية المعلومات", type: "SCIENTIFIC_DEPARTMENT", status: "ACTIVE" };
    prime({ data: [{ unit, children: [{ unit: child, children: [] }] }] });

    const tree = await institutionalApi.getOrgUnitTree();

    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/institutional/org-units/tree");
    expect(tree).toEqual([{ ...unit, children: [{ ...child, children: [] }] }]);
  });

  it("GET /org-units/:id answers { unit, ancestors } — the route's real shape (the fixed conflict)", async () => {
    const unit = { id: "u-cs", nameAr: "قسم تقنية المعلومات", type: "SCIENTIFIC_DEPARTMENT" };
    const ancestors = [{ id: "u-root", nameAr: "عمادة الكلية", type: "OFFICE" }];
    prime({ data: { unit, ancestors } });

    const out = await institutionalApi.getOrgUnit("u-cs");

    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/institutional/org-units/u-cs");
    expect(out).toEqual({ unit, ancestors });
  });

  it("GET /org-units/:id/{data:null} resolves null (R327 A4 pin on this family)", async () => {
    prime({ data: null });
    await expect(institutionalApi.getOrgUnit("nope")).resolves.toBeNull();
  });
});

/* ── §5/§6 appointments + councils + meetings ───────────────────── */

describe("appointments, councils, meetings", () => {
  it("GET /institutional/appointments with status filter (paged meta kept)", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 12, totalPages: 1 } });
    const out = await institutionalApi.listAppointments({ status: "ACTIVE", page: 1, limit: 20 });
    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/institutional/appointments");
    expect(url).toContain("status=ACTIVE");
    expect(out.meta?.total).toBe(12);
  });

  it("GET /governance/councils/:id/meetings rides the nested path with page params", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 3, totalPages: 1 } });
    const out = await institutionalApi.listMeetings({ councilId: "c-1", page: 2, limit: 20 });
    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/governance/councils/c-1/meetings");
    expect(url).toContain("page=2");
    expect(out.meta?.page).toBe(1); // the wire's own meta, not the request's
  });

  it("GET /governance/meetings/:id keeps minutes as the ARRAY the route includes (take:1)", async () => {
    const minutesRow = { id: "min-1", contentAr: "نص المحضر", status: "DRAFT", isCurrent: true };
    prime({
      data: {
        id: "m-1", councilId: "c-1", seqNumber: 4, scheduledAt: "2026-11-01T09:00:00.000Z",
        status: "HELD", attendance: [], agendaItems: [], resolutions: [],
        minutes: [minutesRow],
      },
    });
    const out = await institutionalApi.getMeeting("m-1");
    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/governance/meetings/m-1");
    expect(Array.isArray(out.minutes)).toBe(true);
    expect(out.minutes?.[0]).toEqual(minutesRow);
  });
});

/* ── §7/§8 programs/learners/credentials + the evaluation write ──── */

describe("academic family", () => {
  it("PATCH /academic/training-placements/:id carries the evaluation body", async () => {
    prime({ data: { id: "pl-1", evaluationScore: 88 } });
    const out = await institutionalApi.updatePlacement("pl-1", {
      evaluationSummary: "أتقن أساسيات الشبكات",
      evaluationScore: 88,
    });
    const { url, method, body } = lastCall();
    expect(method).toBe("PATCH");
    expect(url).toContain("/academic/training-placements/pl-1");
    expect(body).toEqual({ evaluationSummary: "أتقن أساسيات الشبكات", evaluationScore: 88 });
    expect(out.evaluationScore).toBe(88);
  });

  it("GET /academic/credentials keeps meta (conferredAt vocabulary survives untouched)", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 5, totalPages: 1 } });
    const out = await institutionalApi.listCredentials({ page: 1, limit: 20 });
    expect(out.meta?.total).toBe(5);
    expect(lastCall().url).toContain("/academic/credentials");
  });
});

/* ── §10 facilities — the reservation write ──────────────────────── */

describe("operations family", () => {
  it("POST /operations/reservations carries the booking body", async () => {
    prime({ data: { id: "r-1", status: "REQUESTED" } }, 201);
    const out = await institutionalApi.createReservation({
      facilityId: "f-1",
      purpose: "حصّة معمل الشبكات",
      startsAt: "2027-03-01T08:00:00.000Z",
      endsAt: "2027-03-01T09:00:00.000Z",
    });
    const { url, method, body } = lastCall();
    expect(method).toBe("POST");
    expect(url).toContain("/operations/reservations");
    expect(body).toEqual({
      facilityId: "f-1",
      purpose: "حصّة معمل الشبكات",
      startsAt: "2027-03-01T08:00:00.000Z",
      endsAt: "2027-03-01T09:00:00.000Z",
    });
    expect(out.status).toBe("REQUESTED");
  });

  it("a 409 overlap surfaces as the server's own Arabic ApiError (no fake success)", async () => {
    prime({ error: { code: "RESERVATION_OVERLAP", message: "توجد حجوزات متداخلة لهذه المنشأة في الفترة المطلوبة" } }, 409);
    await expect(
      institutionalApi.createReservation({
        facilityId: "f-1", purpose: "x", startsAt: "2027-03-01T08:00:00.000Z", endsAt: "2027-03-01T09:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "RESERVATION_OVERLAP", status: 409 });
  });
});

/* ── §11 research ─────────────────────────────────────────────────── */

describe("research family", () => {
  it("GET /research-projects keeps the count projections + meta", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 9, totalPages: 1 } });
    const out = await institutionalApi.listResearchProjects({ status: "ACTIVE", page: 1, limit: 20 });
    const { url } = lastCall();
    expect(url).toContain("/research-projects");
    expect(url).toContain("status=ACTIVE");
    expect(out.meta?.total).toBe(9);
  });

  it("GET /research-outputs?projectId= rides the filter", async () => {
    prime({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    await institutionalApi.listResearchOutputs({ projectId: "rp-1", page: 1, limit: 20 });
    const { url } = lastCall();
    expect(url).toContain("/research-outputs");
    expect(url).toContain("projectId=rp-1");
  });
});

/* ── §12 grants & permissions ────────────────────────────────────── */

describe("capability grants", () => {
  it("GET /me/permissions — the effective-set read", async () => {
    prime({ data: { role: "ADMIN", capabilities: ["PEOPLE_MANAGE"], roleDefaults: [], membershipRole: "ADMIN" } });
    const out = await institutionalApi.getMyPermissions();
    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/me/permissions");
    expect(out.capabilities).toContain("PEOPLE_MANAGE");
  });

  it("GET /admin/users/:id/unit-capabilities?institutionId= — the explicit scope", async () => {
    prime({ data: [] });
    await institutionalApi.listUserUnitCapabilities("u-9", "inst-1");
    const { url, method } = lastCall();
    expect(method).toBe("GET");
    expect(url).toContain("/admin/users/u-9/unit-capabilities");
    expect(url).toContain("institutionId=inst-1");
  });

  it("POST /admin/users/:id/unit-capabilities carries the grant body", async () => {
    prime({ data: { id: "g-1", capability: "PEOPLE_MANAGE", isActive: true } }, 201);
    await institutionalApi.grantUnitCapability("u-9", {
      institutionId: "inst-1",
      orgUnitId: "u-cs",
      capability: "PEOPLE_MANAGE",
      reason: "تكليف إداري",
    });
    const { url, method, body } = lastCall();
    expect(method).toBe("POST");
    expect(url).toContain("/admin/users/u-9/unit-capabilities");
    expect(body).toEqual({
      institutionId: "inst-1",
      orgUnitId: "u-cs",
      capability: "PEOPLE_MANAGE",
      reason: "تكليف إداري",
    });
  });

  it("POST /admin/unit-capabilities/:id/revoke — the revoke verb", async () => {
    prime({ data: { id: "g-1", isActive: false } });
    await institutionalApi.revokeUnitCapability("g-1");
    const { url, method } = lastCall();
    expect(method).toBe("POST");
    expect(url).toContain("/admin/unit-capabilities/g-1/revoke");
  });
});

/* ── §4 getPage — the honest normalization ───────────────────────── */

describe("getPage", () => {
  it("preserves the wire's { data, meta } instead of fabricating totalPages: 1", async () => {
    prime({ data: [{ id: "x" }], meta: { page: 1, limit: 20, total: 41, totalPages: 3 } });
    const out = await getPage<{ id: string }>("/academic/programs");
    expect(out.meta).toEqual({ page: 1, limit: 20, total: 41, totalPages: 3 });
  });

  it("normalizes bare arrays to the honest no-more-pages meta", async () => {
    prime({ data: [{ id: "x" }, { id: "y" }] });
    const out = await getPage<{ id: string }>("/some/bare");
    expect(out.data).toHaveLength(2);
    expect(out.meta.totalPages).toBe(1);
    expect(out.meta.total).toBe(2);
  });

  it("an error envelope rejects with the server's code (403 example)", async () => {
    prime({ error: { code: "INSTITUTION_CONTEXT_REQUIRED", message: "حدّد المؤسسة أولًا" } }, 403);
    const err = await getPage("/x").then(
      () => {
        throw new Error("expected rejection");
      },
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("INSTITUTION_CONTEXT_REQUIRED");
    expect(err.status).toBe(403);
  });
});
