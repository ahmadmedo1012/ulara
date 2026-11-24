#!/usr/bin/env node
/**
 * library-sheet.mjs — r359 A2 acceptance A: one committed sheet of
 * the WHOLE library (44 keys, light + dark twins, mono captions).
 * Composites the evidence captures into a contact sheet.
 *
 * Run: node scripts/art/library-sheet.mjs [--theme light|dark|both]
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CAP = join(ROOT, 'docs', 'redesign', 'r359-a2', 'evidence', 'captures');
const OUT = join(ROOT, 'docs', 'redesign', 'r359-a2', 'evidence', 'library-sheet.webp');

const files = readdirSync(CAP).filter((f) => f.endsWith('.png')).sort();
execFileSync('python3', ['-c', `
import sys, os
from PIL import Image, ImageDraw, ImageFont
cap, out = sys.argv[1], sys.argv[2]
files = sorted(f for f in os.listdir(cap) if f.endswith('.png'))
light = [f for f in files if f.endswith('-light.png')]
dark = [f for f in files if f.endswith('-dark.png')]
keys = [f[:-11] for f in light]
CELL_W, CELL_H, PAD, HEAD = 360, 300, 12, 60
COLS = 6
rows = (len(keys) + COLS - 1) // COLS
W = COLS * (CELL_W + PAD) + PAD
H = HEAD + rows * ((CELL_H + PAD) * 2 + 34) + PAD
canvas = Image.new('RGB', (W, H), '#EFEEEA')
d = ImageDraw.Draw(canvas)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 13)
    fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 20)
except Exception:
    f = fb = ImageFont.load_default()
d.text((PAD, 18), 'ULARA r359 ART LIBRARY — 44 KEYS / LIGHT+DARK', fill='#282828', font=fb)
def fit(im, w, h):
    r = min(w / im.width, h / im.height)
    return im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
for i, k in enumerate(keys):
    col, row = i % COLS, i // COLS
    x = PAD + col * (CELL_W + PAD)
    y = HEAD + row * ((CELL_H + PAD) * 2 + 34)
    d.text((x, y + 2), '[%02d] %s' % (i + 1, k), fill='#282828', font=f)
    lp = os.path.join(cap, k + '-light.png')
    dp = os.path.join(cap, k + '-dark.png')
    if os.path.exists(lp):
        canvas.paste(fit(Image.open(lp).convert('RGB'), CELL_W, CELL_H), (x, y + 20))
    if os.path.exists(dp):
        canvas.paste(fit(Image.open(dp).convert('RGB'), CELL_W, CELL_H), (x, y + 20 + CELL_H + 8))
canvas.save(out, 'WEBP', quality=82, method=6)
print('sheet', out, canvas.size)
`, CAP, OUT], { stdio: ['ignore', 'inherit', 'inherit'] });
