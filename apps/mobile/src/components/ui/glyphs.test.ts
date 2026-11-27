/**
 * r369 slice 04 — the RN glyph port contract.
 *
 * Pins: the whole 58-name set ported from the web (same names, one grid),
 * every glyph carries at least one stroke path, and every path's
 * coordinates respect the 2px safety margin (3.2–20.8) the web's
 * r369-icons.test.ts enforces on the source table.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLYPHS, type GlyphDef, type GlyphName } from "./glyphs";

const NAMES = Object.keys(GLYPHS) as GlyphName[];

describe("the r369 glyph set (RN port)", () => {
  it("ports the whole web set — same 58 names", () => {
    expect(NAMES).toHaveLength(58);
    for (const required of ["star", "jar", "ladder", "flame", "trophy", "graduation", "spark"]) {
      expect(NAMES).toContain(required);
    }
  });

  it("matches the web table byte-for-byte (the one-grid contract)", () => {
    const web = readFileSync(
      join(__dirname, "../../../../../frontend/src/components/icons/index.tsx"),
      "utf8",
    );
    for (const name of NAMES) {
      // every stroke path of the mobile table appears verbatim in the web source
      for (const d of (GLYPHS[name] as GlyphDef).stroke) {
        expect(web).toContain(`'${d}'`);
      }
      const acc = (GLYPHS[name] as GlyphDef).accent;
      if (acc) expect(web).toContain(`'${acc}'`);
    }
  });

  it("every glyph has line work and opens on the grid with the 2px safety margin", () => {
    /* The web contract (r369-icons.test.ts): paths mix absolute moves with
     * relative deltas, so the pin is the ANCHOR — each sub-path opens inside
     * 1-23, which keeps a 2px round cap from clipping at the viewBox edge. */
    for (const name of NAMES) {
      const g = GLYPHS[name] as GlyphDef;
      expect(g.stroke.length).toBeGreaterThan(0);
      for (const d of [g.accent ?? "", ...g.stroke].filter(Boolean)) {
        const anchor = d.match(/^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
        expect(anchor).toBeTruthy();
        for (const n of [Number(anchor![1]), Number(anchor![2])]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(23);
        }
      }
    }
  });
});
