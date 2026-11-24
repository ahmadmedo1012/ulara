#!/usr/bin/env bash
# check-art-colors.sh — r359 A2 acceptance C: ZERO red/orange in shipped art.
#
# Scans every shipped art surface for off-grammar hues:
#   · shared/art/svg/*.svg        (fill/stroke attributes)
#   · frontend/src/components/illustrations/r359/**
#   · frontend/src/styles/illustrations.css (the r359 palette block)
#   · apps/mobile/src/components/art/**
#
# The grammar allows exactly: ink #282828/#262019-family, paper
# #F3F2EC-family, hairline #B3B3AF/#4A4A48-family, royal #2540D9 and
# royal-dark #8AA0FF (+ the near-white/paper tones). Any hue in the
# red/orange/yellow/green/cyan families FAILS.
#
# Usage: bash scripts/art/check-art-colors.sh   (exit 0 = clean)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - << 'PY'
import colorsys, glob, os, re, sys

HEX = re.compile(r'#[0-9a-fA-F]{6}\b')
ALLOWED = {
    # ink family (dark neutrals, hue ~ 60-70 deg but S very low)
    '#282828', '#262019', '#1a1713', '#1c1c1a', '#1e1e1e',
    # paper family
    '#f3f2ec', '#f5f1e8', '#efeeea', '#f2f1ec', '#ffffff', '#fff',
    # hairline family
    '#b3b3af', '#4a4a48', '#b4b4b0', '#62625f', '#646464',
    # the royal signal + dark twin
    '#2540d9', '#8aa0ff', '#e4e9ff', '#1b30b0', '#2a2f4a', '#a9b8ff',
}
ROYAL = {'#2540d9', '#8aa0ff', '#e4e9ff', '#1b30b0', '#2a2f4a', '#a9b8ff'}

def hue_family(hexv):
    r = int(hexv[1:3], 16) / 255
    g = int(hexv[3:5], 16) / 255
    b = int(hexv[5:7], 16) / 255
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360, s

bad = []
files = (
    glob.glob('shared/art/svg/*.svg')
    + glob.glob('frontend/src/components/illustrations/r359/**/*.tsx', recursive=True)
    + glob.glob('frontend/src/components/illustrations/r359/**/*.ts', recursive=True)
    + glob.glob('apps/mobile/src/components/art/**/*.tsx', recursive=True)
    + glob.glob('apps/mobile/src/components/art/**/*.ts', recursive=True)
    + ['frontend/src/styles/illustrations.css']
)
for path in files:
    if not os.path.exists(path):
        continue
    text = open(path, encoding='utf-8').read()
    import re as _re
    text = _re.sub(r'/\*.*?\*/', '', text, flags=_re.S)  # comments are docs, not fills
    for m in HEX.finditer(text):
        hv = m.group(0).lower()
        if hv in ALLOWED:
            continue
        # whitelist-family check: same hue as an allowed color, tiny delta
        h, s = hue_family(hv)
        # neutral greys (S < 0.08) of any lightness are tonal steps
        if s < 0.08:
            continue
        # royal family hue ~ 225-235
        if 218 <= h <= 242 and s >= 0.3:
            continue
        bad.append((path, hv, f'h={h:.0f} s={s:.2f}'))

if bad:
    print('FAIL: off-grammar hues in shipped art:')
    for p, hv, why in bad:
        print(f'  {p}: {hv} ({why})')
    sys.exit(1)
print('OK: zero red/orange/off-grammar hues in shipped art '
      f'({len(files)} surfaces scanned; ink/paper/hairline/royal only).')
PY
