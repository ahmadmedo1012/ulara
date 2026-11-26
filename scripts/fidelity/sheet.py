#!/usr/bin/env python3
"""sheet.py — side-by-side sheet: reference (left) vs ULARA (right), WebP, labelled.
Usage: python3 scripts/fidelity/sheet.py REF.webp ULARA.png OUT.webp [--width 1400]"""
import sys
from PIL import Image, ImageDraw
ref, ula, out = sys.argv[1:4]
W = int(sys.argv[sys.argv.index('--width') + 1]) if '--width' in sys.argv else 1400
a, b = Image.open(ref).convert('RGB'), Image.open(ula).convert('RGB')
half = W // 2
def fit(im):
    return im.resize((half, max(1, round(im.height * half / im.width))))
a, b = fit(a), fit(b)
H = max(a.height, b.height) + 24
s = Image.new('RGB', (W, H), 'white')
s.paste(a, (0, 24)); s.paste(b, (half, 24))
d = ImageDraw.Draw(s)
d.text((6, 6), 'REFERENCE', fill='black'); d.text((half + 6, 6), 'ULARA', fill='black')
d.line([(half, 0), (half, H)], fill='#2540D9', width=1)
s.save(out, 'WEBP', quality=70, method=6)
print(out, s.size)
