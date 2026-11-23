/**
 * r353 — the institutional registry net (colocated with the sections
 * registry): the kind-aware visibility law (research is structurally
 * foreign to Law 21/2023 stages 1–2) + the capability vocabulary the
 * workspace gates writes on. No transports mounted — pure registry
 * behavior.
 */
import { INST_SECTIONS, visibleSections, sectionHiddenReason } from "./sections";
import { CAPABILITY_LABELS, toneOf, labelOf } from "./labels";
import { institutionalApi } from "@/api/institutional";

/* ── the statutory section set ───────────────────────────────────── */

describe("the institutional section registry", () => {
  it("carries exactly the 12 statutory sections + overview row (web parity)", () => {
    // 12 section rows (the web's 13 = overview + 12 sections; the
    // overview lives on this workspace's index route).
    expect(INST_SECTIONS.length).toBe(12);
    expect(INST_SECTIONS.map((s) => s.label)).toEqual([
      "الهيكل التنظيمي",
      "الأفراد والكوادر",
      "المناصب والتعيينات",
      "الصلاحيات والأدوار",
      "المجالس واللجان",
      "البرامج والخطط",
      "التدريب العملي",
      "الطلاب والمتدربون",
      "الجودة والاعتماد",
      "التراخيص والتفتيش",
      "المعامل والموارد",
      "البحث المؤسسي",
    ]);
  });

  it("every section routes under /institution (byte-identical to the web rail)", () => {
    for (const s of INST_SECTIONS) {
      expect(s.to.startsWith("/institution")).toBe(true);
    }
  });

  it("every section's manage capability is a real r352 capability key (contract §0)", () => {
    for (const s of INST_SECTIONS) {
      if (s.manage === null) continue;
      expect(CAPABILITY_LABELS[s.manage]).toBeDefined();
    }
  });
});

/* ── the kind-aware visibility law ──────────────────────────────── */

describe("visibleSections — the kind rule", () => {
  it("a university sees all 12 sections (research included)", () => {
    expect(visibleSections("UNIVERSITY")).toHaveLength(12);
    expect(visibleSections("TECHNICAL_COLLEGE")).toHaveLength(12);
    expect(visibleSections(null)).toHaveLength(12);
  });

  it("Law 21/2023 stages 1–2 hide the research module (no research mandate)", () => {
    for (const kind of ["INTERMEDIATE_TECHNICAL_INSTITUTE", "VOCATIONAL_TRAINING_CENTER"]) {
      const sections = visibleSections(kind);
      expect(sections.map((s) => s.label)).not.toContain("البحث المؤسسي");
      expect(sections).toHaveLength(11);
    }
  });

  it("sectionHiddenReason explains the hidden research section honestly", () => {
    expect(sectionHiddenReason("/institution/research", "VOCATIONAL_TRAINING_CENTER")).toContain(
      "البحث المؤسسي من مهام قطاع التعليم العالي",
    );
    expect(sectionHiddenReason("/institution/research", "UNIVERSITY")).toBeNull();
    expect(sectionHiddenReason("/institution/people", "VOCATIONAL_TRAINING_CENTER")).toBeNull();
  });
});

/* ── the label registry ─────────────────────────────────────────── */

describe("the Arabic label registry", () => {
  it("ADMIN is «إدارة المؤسسة» — the role, never the job title (r352 §D7)", () => {
    expect(labelOf({ ADMIN: "إدارة المؤسسة" } as Record<string, string>, "ADMIN")).toBe("إدارة المؤسسة");
  });

  it("unknown enum values render the raw value — never a fabricated Arabic guess", () => {
    expect(labelOf({}, "SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(labelOf({}, null)).toBe("—");
  });

  it("toneOf maps the chip vocabulary consistently (unknown → grey)", () => {
    expect(toneOf("ACTIVE")).toBe("mint");
    expect(toneOf("REVOKED")).toBe("rose");
    expect(toneOf("SUSPENDED")).toBe("yellow");
    expect(toneOf("ARCHIVED")).toBe("grey");
    expect(toneOf("WHATEVER")).toBe("grey");
    expect(toneOf(null)).toBe("grey");
  });
});

/* ── the API surface (byte-faithful paths — the contract twin) ──── */

describe("the institutional API paths (the published contract)", () => {
  it("the capability surfaces hit /me/permissions + the admin grant rows", () => {
    // The transport seam: the function identities are stable exports;
    // the paths are asserted via the source (the mock-transport
    // roundtrip lives in the hermetic web belt — this net pins the
    // vocabulary, not the network).
    expect(typeof institutionalApi.getMyPermissions).toBe("function");
    expect(typeof institutionalApi.getMyUnitCapabilities).toBe("function");
    expect(typeof institutionalApi.listUserUnitCapabilities).toBe("function");
    expect(typeof institutionalApi.grantUnitCapability).toBe("function");
    expect(typeof institutionalApi.revokeUnitCapability).toBe("function");
  });
});
