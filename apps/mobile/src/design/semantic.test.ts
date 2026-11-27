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
    expect(light.surface).toBe("#FBF6EC"); // r369: the cream ground
    expect(light.surfaceElevated).toBe("#FFFFFF"); // card ground
    expect(light.sunken).toBe("#F5EDDF"); // r369: the warm sunken step (surfaceHover)

    const dark = semanticColorsFor("dark");
    expect(dark.surface).toBe("#14122B"); // r369: the night-indigo ground
    expect(dark.surfaceElevated).toBe("#1E1B3D"); // r369: the dark card ground
    expect(dark.sunken).toBe("#262251"); // r369: shared surfaceHover (dark)
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
    expect(light.textPrimary).toBe("#1E1A3C"); // r369: indigo ink
    expect(light.textSecondary).toBe("#6E6455"); // r369: warm secondary
    expect(light.textTertiary).toBe("#6A6151");
    const dark = semanticColorsFor("dark");
    expect(dark.textPrimary).toBe("#F7F1E6"); // r369: warm off-white
    expect(dark.textSecondary).toBe("#D3CEE4");
    expect(dark.textTertiary).toBe("#C2BDDA");
  });
});

describe("the ONE accent", () => {
  it("is the indigo ink in light and the luminous lavender-ink in dark (r369 re-key: the royal blue retired with the old identity)", () => {
    expect(semanticColorsFor("light").accent).toBe("#1E1A3C");
    expect(semanticColorsFor("dark").accent).toBe("#EFE9FF");
  });

  it("the accent clears AA as text itself — ink ≡ accent (the raw/ink split retired)", () => {
    const light = semanticColorsFor("light");
    expect(light.accentInk).toBe(light.accent);
    expect(light.accentInk).toBe("#1E1A3C");
    const dark = semanticColorsFor("dark");
    expect(dark.accentInk).toBe(dark.accent);
    expect(dark.accentInk).toBe("#EFE9FF");
  });

  it("the fg pairs ride the shared seats — cream on the light indigo, night-ink on the dark lavender (r369 re-key)", () => {
    // resting fills: cream #FBF6EC on indigo #1E1A3C (~14:1) · night-ink
    // #14122B on lavender #EFE9FF (white on lavender would fail).
    expect(ds.light.accentFg).toBe("#FBF6EC");
    expect(ds.light.primaryFg).toBe("#FBF6EC");
    expect(ds.dark.accentFg).toBe("#14122B");
    expect(ds.dark.primaryFg).toBe("#14122B");
    // hover/pressed fills: the hover tiers stay dark-on-light /
    // light-on-dark, so the hovered label keeps the same seat.
    expect(ds.light.accentHoverFg).toBe("#FBF6EC");
    expect(ds.dark.accentHoverFg).toBe("#14122B");
    // danger fills: white on #C23227 · night-ink #14122B on #FF8A7A.
    expect(ds.light.dangerFg).toBe("#FFFFFF");
    expect(ds.dark.dangerFg).toBe("#14122B");
  });
});

describe("status triples — shared-JSON mapping (text ink = the family deep rung)", () => {
  it("success/warning/danger resolve fill/soft/ink from the tone families", () => {
    const light = semanticColorsFor("light");
    expect(light.success).toEqual({ fill: "#12805C", soft: "#DEF2EA", ink: "#0A5A40" }); // r369 re-key
    expect(light.warning).toEqual({ fill: "#A9740A", soft: "#FBEED4", ink: "#6B4708" }); // r369 re-key
    expect(light.danger).toEqual({ fill: "#C23227", soft: "#FBE3E0", ink: "#8F1F16" }); // r369 re-key

    const dark = semanticColorsFor("dark");
    expect(dark.success).toEqual({ fill: "#5FD6AC", soft: "#16362E", ink: "#5FD6AC" }); // r369 re-key
    expect(dark.warning).toEqual({ fill: "#F0C572", soft: "#3A2F1A", ink: "#F0C572" }); /* r369 re-key: mint/rose deep ≡ ink in dark; amber deep ≡ fill */
    expect(dark.danger).toEqual({ fill: "#FF8A7A", soft: "#3B2320", ink: "#FF8A7A" }); // r369 re-key
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
