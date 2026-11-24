#!/usr/bin/env node
/**
 * sheet.mjs — r359 A2 fidelity sheets.
 *
 * Composes [REFERENCE | OURS] side-by-side plates (equal heights,
 * hairline divider, mono captions) for the written VLM critiques.
 * Reference shots are the r350 extraction corpus — referenced by
 * PATH ONLY (zero-trace: their origin is never written into the
 * sheet or its metadata; captions say "REFERENCE" / "ULARA r359").
 *
 * Usage:
 *   node scripts/art/sheet.mjs --ref docs/redesign/r350/reference/shots/shot-top.webp \
 *        --ours docs/redesign/r359-a2/evidence/captures/hero-elevation-light.png \
 *        --label "HERO ELEVATION / LIGHT / DESKTOP" \
 *        --out docs/redesign/r359-a2/evidence/sheets/hero-desktop-light.webp
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const _r = arg('ref', ''), _o = arg('ours', ''), _u = arg('out', '');
const REF = isAbsolute(_r) ? _r : join(ROOT, _r);
const OURS = isAbsolute(_o) ? _o : join(ROOT, _o);
const OUT = isAbsolute(_u) ? _u : join(ROOT, _u);
const LABEL = arg('label', 'FIDELITY SHEET');
if (!REF || !OURS || !OUT) {
  console.error('usage: sheet.mjs --ref <webp> --ours <png> --label <text> --out <webp>');
  process.exit(2);
}
mkdirSync(dirname(OUT), { recursive: true });

const PY = `
import sys
from PIL import Image, ImageDraw, ImageFont
ref, ours, out, label = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
a = Image.open(ref).convert('RGB')
b = Image.open(ours).convert('RGB')
PAD, HEAD, GAP = 24, 56, 24
H = 900
def fit(im, h):
    w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS)
a2, b2 = fit(a, H), fit(b, H)
W = PAD + a2.width + GAP + b2.width + PAD
canvas = Image.new('RGB', (W, HEAD + H + PAD + 34), '#EFEEEA')
d = ImageDraw.Draw(canvas)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 15)
except Exception:
    f = ImageFont.load_default()
d.text((PAD, 16), label, fill='#282828', font=f)
d.text((PAD, HEAD + H + 12), 'REFERENCE', fill='#282828', font=f)
d.text((PAD + a2.width + GAP, HEAD + H + 12), 'ULARA r359 (OURS)', fill='#2540D9', font=f)
canvas.paste(a2, (PAD, HEAD))
canvas.paste(b2, (PAD + a2.width + GAP, HEAD))
d.rectangle([PAD + a2.width + GAP // 2 - 1, HEAD, PAD + a2.width + GAP // 2, HEAD + H], fill='#B3B3AF')
canvas.save(out, 'WEBP', quality=88, method=6)
`;

execFileSync('python3', ['-c', PY, REF, OURS, OUT, LABEL], { stdio: ['ignore', 'ignore', 'inherit'] });
const kb = Math.round(statSync(OUT).size / 1024);
console.log(`sheet: ${OUT} (${kb} KB)`);
