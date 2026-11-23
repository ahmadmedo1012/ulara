# screenshots/ — the r352 visual-capture matrix (webp evidence copies)

This directory holds the 104-frame evidence matrix of the institutional
workspace (13 sections × 1440/820/390/360 viewports × light/dark).

**Format:** the committed copies are **WebP (quality 85, full dimensions)**.
The belt itself (`frontend/tests/e2e/r352-visual-capture.e2e.ts`) writes
full-size PNGs (~31MB for the matrix) — that raw output is **local-only**
(ignored via `.gitignore`: `docs/redesign/r352/institutional-frontend/screenshots/*.png`)
because it can never pass the repo size gate (RULE 2 docs/ ≤40MB, RULE 3
push adds ≤5MB, RULE 1 file ≤500KB — see `scripts/gates/size-gate.sh`).

## Why the conversion

The committed PNG matrix on `main` was ~11KB per frame — near-blank
captures taken while the r351 route-transition defect had the paper strips
covering the viewport at rest. The r353 repair (PR42) re-ran the belt; the
same 104 frames then painted the real surfaces (~300–500KB each). Committing
that raw matrix (~31MB) tripped all three size-gate rules, so the real
captures are committed as size-gated webp evidence copies instead:

- 104 frames, identical dimensions, ~30KB average — matrix total ~3.0MB
- same file names, extension changed `.png → .webp` (`overview-1440-light.webp`, …)

## Regenerating

```bash
cd frontend && npx playwright test tests/e2e/r352-visual-capture.e2e.ts   # writes *.png (ignored)
# convert the raw belt output into the committed evidence format:
python3 - <<'PY'
from PIL import Image; import glob, os
for p in glob.glob("…/screenshots/*.png"):
    Image.open(p).save(p[:-4] + ".webp", "WEBP", quality=85, method=6); os.remove(p)
PY
```

Run the gate after any evidence change:
`SIZE_GATE_BASE=$(git rev-parse origin/main) bash scripts/gates/size-gate.sh`
