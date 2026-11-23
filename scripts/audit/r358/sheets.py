#!/usr/bin/env python3
"""
scripts/audit/r358/sheets.py — R358 Phase A instrument 3/3 (part A):
side-by-side diff sheets (the reference vs ULARA).

Composites each pair onto one canvas: left = reference frame (from the
r358 replay corpus), right = ULARA capture, equal heights, hairline
divider, mono caption strip. Pure PIL — no ImageMagick on this box.

Input: a manifest JSON (argv[1]):
  { "pairs": [ { "left": "<abs path>", "right": "<abs path>",
                 "label": "<sheet name>", "out": "<abs path>.webp",
                 "captionL": "the reference", "captionR": "ULARA" } ] }
Exit 0 = all sheets written; a missing side renders a placeholder panel
(the sheet still lands, honestly labelled).
"""
import json
import sys
from PIL import Image, ImageDraw

W, H = 450, 282          # per-panel size (900x282 total, 16:10-ish)
CAP = 18                 # caption strip height
DIV = 1                  # divider width

def panel(path, caption):
    img = Image.new("RGB", (W, H), (24, 24, 24))
    if path:
        try:
            src = Image.open(path)
            src.thumbnail((W, H))  # preserve ratio, fit inside
            img.paste(src, ((W - src.width) // 2, (H - src.height) // 2))
        except Exception as e:  # noqa: BLE001 — placeholder panel
            d = ImageDraw.Draw(img)
            d.text((8, H // 2), f"missing: {path[-40:]}", fill=(180, 60, 60))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W - 1, H - 1], outline=(160, 160, 160))
    d.rectangle([0, H, W - 1, H + CAP - 1], fill=(24, 24, 24))
    d.text((6, H + 4), caption[:52], fill=(200, 200, 200))
    return img

def main():
    manifest = json.load(open(sys.argv[1], encoding="utf-8"))
    written = 0
    for pair in manifest["pairs"]:
        left = panel(pair["left"], pair.get("captionL", "the reference"))
        right = panel(pair["right"], pair.get("captionR", "ULARA"))
        out_h = H + CAP
        sheet = Image.new("RGB", (W * 2 + DIV, out_h), (24, 24, 24))
        sheet.paste(left, (0, 0))
        sheet.paste(right, (W + DIV, 0))
        sheet.save(pair["out"], "WEBP", quality=80, method=4)
        written += 1
    print(f"sheets: {written} written")

if __name__ == "__main__":
    main()
