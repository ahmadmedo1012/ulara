/**
 * R334 2-f — the semantic color layer contract.
 *
 * Pins: light/dark resolution of every seat, the shared-JSON mapping for the
 * status triples, the no-shadows elevation contract, and the ADDITIVE
 * theme.tsx extension (existing consumers keep their exact shape).
 */
import { semanticColorsFor, semanticThemeFor, hairlinesFor, SHADOW_KEYS, type SemanticColors } from "./semantic";
import { ds, statusTones } from "./tokens";
import { themeFor } from "./theme";

const SEMANTIC_KEYS: (keyof SemanticColors)[] = [
  "surface",
  "surfaceElevated",
  "sunken",
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "accent",
  "accentInk",
  "accentSoft",
  "accentFg",
  "success",
  "warning",
  "danger",
];

describe("semanticColorsFor — light/dark resolution", () => {
  it("resolves every seat in both themes (no undefined leaks to styles)", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      for (const key of SEMANTIC_KEYS) {
        expect(c[key]).toBeTruthy();
      }
    }
  });

  it("surfaces follow the ds two-surface rule (ground / card / sunken)", () => {
    const light = semanticColorsFor("light");
    expect(light.surface).toBe("#F5F1E8"); // paper ground
    expect(light.surfaceElevated).toBe("#FFFFFF"); // card ground
    expect(light.sunken).toBe("#EFEBDF"); // shared surface2/bkSoft

    const dark = semanticColorsFor("dark");
    expect(dark.surface).toBe("#262019");
    expect(dark.surfaceElevated).toBe("#2E2E2E"); // the Card component's dark ground
    expect(dark.sunken).toBe("#353535"); // shared surface2 (dark)
  });

  it("sunken is one step BELOW card-on-ground in both themes (never equal to the ground)", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      expect(c.sunken).not.toBe(c.surface);
      expect(c.sunken).not.toBe(c.surfaceElevated);
    }
  });

  it("text tiers are distinct inks (primary → secondary → tertiary)", () => {
    const light = semanticColorsFor("light");
    expect(light.textPrimary).toBe("#1A1713");
    expect(light.textSecondary).toBe("#414140");
    expect(light.textTertiary).toBe("#62625F");
    const dark = semanticColorsFor("dark");
    expect(dark.textPrimary).toBe("#F5F1E8");
    expect(dark.textSecondary).toBe("#C9C9C5");
    expect(dark.textTertiary).toBe("#B4B4B0");
  });
});

describe("the ONE accent", () => {
  it("is the royal blue in light and the luminous royal in dark (2026)", () => {
    expect(semanticColorsFor("light").accent).toBe("#2540D9");
    expect(semanticColorsFor("dark").accent).toBe("#8AA0FF");
  });

  it("the royal clears AA as text itself — ink ≡ accent (the raw/ink split retired)", () => {
    const light = semanticColorsFor("light");
    expect(light.accentInk).toBe(light.accent);
    expect(light.accentInk).toBe("#2540D9");
    const dark = semanticColorsFor("dark");
    expect(dark.accentInk).toBe(dark.accent);
    expect(dark.accentInk).toBe("#8AA0FF");
  });

  it("the fg pairs ride the shared seats — never white on the dark royal, white on every hover tier (2026)", () => {
    // resting fills: white on #2540D9 (7.46:1) · the DARK #262019 on #8AA0FF
    // (6.56:1 — white would fail at 2.46:1 and must never appear).
    expect(ds.light.accentFg).toBe("#FFFFFF");
    expect(ds.light.primaryFg).toBe("#FFFFFF");
    expect(ds.dark.accentFg).toBe("#262019");
    expect(ds.dark.primaryFg).toBe("#262019");
    // hover/pressed fills: the tiers are dark in BOTH themes (#1B30B0 ·
    // #4C63F0), so the hovered label is WHITE everywhere (10.02:1 · 4.83:1)
    // — the accentHoverFg contract the pressed states consume.
    expect(ds.light.accentHoverFg).toBe("#FFFFFF");
    expect(ds.dark.accentHoverFg).toBe("#FFFFFF");
    // danger fills: white on #C62828 (5.62:1) · #262019 on #FF7A70 (6.35:1).
    expect(ds.light.dangerFg).toBe("#FFFFFF");
    expect(ds.dark.dangerFg).toBe("#262019");
  });
});

describe("status triples — shared-JSON mapping (text ink = the family deep rung)", () => {
  it("success/warning/danger resolve fill/soft/ink from the tone families", () => {
    const light = semanticColorsFor("light");
    expect(light.success).toEqual({ fill: "#17724A", soft: "#E2EFE8", ink: "#0D5433" });
    expect(light.warning).toEqual({ fill: "#A8750F", soft: "#F5EBD6", ink: "#5E420C" });
    expect(light.danger).toEqual({ fill: "#C62828", soft: "#FBE4E4", ink: "#9E1A1A" });

    const dark = semanticColorsFor("dark");
    expect(dark.success).toEqual({ fill: "#5FD39A", soft: "#1F3A2E", ink: "#5FD39A" });
    expect(dark.warning).toEqual({ fill: "#EFC87B", soft: "#3B331F", ink: "#F8E3B4" }); /* r351-main: the deep rung is the AAA text tier (mint/rose deep ≡ ink in dark; yellow deep is the lighter amber) */
    expect(dark.danger).toEqual({ fill: "#FF7A70", soft: "#3A2020", ink: "#FF7A70" });
  });

  it("stays in sync with the tone families it resolves from", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      expect(c.success.soft).toBe(statusTones[name].mint.bg);
      expect(c.warning.fill).toBe(statusTones[name].yellow.ink);
      expect(c.danger.ink).toBe(statusTones[name].rose.deep);
    }
  });
});

describe("hairlines — elevation WITHOUT shadows", () => {
  it("border presets are the thinnest physical line and the 1px rule", () => {
    for (const name of ["light", "dark"] as const) {
      const h = hairlinesFor(name);
      expect(h.border.borderWidth).toBeGreaterThan(0);
      expect(h.border.borderWidth).toBeLessThanOrEqual(1);
      expect(h.border.borderColor).toBe(ds[name].border);
      expect(h.borderStrong.borderWidth).toBe(1);
      expect(h.borderStrong.borderColor).toBe(ds[name].rule);
      expect(h.separator.height).toBe(h.border.borderWidth);
      expect(h.separator.backgroundColor).toBe(ds[name].border);
    }
  });

  it("NO preset ever emits a shadow/elevation key (the ds contract)", () => {
    for (const name of ["light", "dark"] as const) {
      const h = hairlinesFor(name);
      const allStyles = [h.border, h.borderStrong, h.separator] as Record<string, unknown>[];
      for (const style of allStyles) {
        for (const key of SHADOW_KEYS) {
          expect(style).not.toHaveProperty(key);
        }
      }
    }
  });
});

describe("semanticThemeFor — the bundle + the additive theme.tsx extension", () => {
  it("bundles name + colors + hairlines for the requested theme", () => {
    const t = semanticThemeFor("dark");
    expect(t.name).toBe("dark");
    expect(t.colors).toEqual(semanticColorsFor("dark"));
    expect(t.hairlines).toEqual(hairlinesFor("dark"));
  });

  it("themeFor keeps its existing shape and ADDS `semantic` (no break)", () => {
    for (const name of ["light", "dark"] as const) {
      const t = themeFor(name);
      // the pre-R334 contract, byte-for-byte:
      expect(t.name).toBe(name);
      expect(t.palette).toBe(ds[name]);
      expect(t.tones).toBe(statusTones[name]);
      // the additive seat:
      expect(t.semantic).toEqual(semanticThemeFor(name));
    }
  });
});
