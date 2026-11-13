#!/usr/bin/env bash
# logo-gate.sh — logo-gate v2 (the ULARA total takeover, spec §3).
#
# The U-vessel is the ONE mark: a single ink stroke
# (MARK_VESSEL_PATH 'M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7' — M/L/Q
# commands only, round caps/joins) + the sienna 4×4 cornerstone at
# (21,3), authored once per platform in frontend/src/brand/mark.ts with
# generated twins and documented re-staters. The RETIRED ARCH is gone
# for good: its sweep signature must appear in ZERO files.
#
# ── 1. the retired arch signature — 'A8 8 0 0 1 24 15' ────────────────────
# ZERO sanctioned seats in code/assets: the arch is retired, its assets
# were regenerated (not whitelisted). Excluded from the scan:
#   · this gate script — it spells the signature it forbids
#   · node_modules / frontend/dist — never committed decisions
#   · prose (.md) — docs/ops/ULARA-CODEMOD-SPEC.md §0 DEFINES the
#     forbidden signature, LEDGER.md records the old audit, and the
#     prose is not a renderable duplication (the 1-C precedent);
#     docs/ops/ULARA-CODEMOD-SPEC.md §0 defines the forbidden
#     signature and LEDGER.md records the old audit
#
# ── 2. the U-vessel path signature + MARK_* constants — the sanctioned
# seats (spec §3 + the takeover instruction):
#   · frontend/src/brand/**           the web source (mark.ts) + renderers
#   · apps/mobile/src/brand/**        the RN port (byte-identical, tokens:check)
#                                     (R336 B1: the competing ui/brand.tsx
#                                     BrandMark was consolidated onto <Logo> —
#                                     the RN port is the ONE mobile renderer)
#   · frontend/tests/**               the pin tests (r323-brand-system.test.ts)
#   · scripts/brand/build-app-icons.mjs     the shared-mark/icon builder
#   · scripts/brand/ulara-kit.mjs    the owner-approved staged-geometry kit
#                                     that AUTHORS the vessel (the spec §0
#                                     source the constants port faithfully)
#   · shared/brand/**                 the ONE shared svg + the kit outputs
#   · frontend/public/brand/** + frontend/public/favicon.svg
#                                     the generated twins (brand-assets.mjs)
#   · frontend/src/pages/BrandPage.tsx      the /__brand spec sheet — renders
#                                     the CONSTRUCTION DRAWING from the
#                                     constants (consuming, not copying)
set -uo pipefail
# scripts/brand/logo-gate.sh → repo root is TWO levels up (unlike the
# scripts/*.sh siblings, whose one-level ".." idiom does not apply here).
cd "$(dirname "$0")/../.."

FAIL=0
step() { printf '\n▶ %s\n' "$1"; }
ok()   { printf '✓ %s\n' "$1"; }
bad()  { printf '✗ %s\n' "$1"; FAIL=1; }

# ── 1. the retired arch signature — ZERO files ───────────────────────────
step "the retired arch signature 'A8 8 0 0 1 24 15' (must be ZERO everywhere)"
SIG='A8 8 0 0 1 24 15'
ARCHViol=$(
  grep -rlF "$SIG" \
    --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.js' \
    --include='*.cjs' --include='*.jsx' --include='*.svg' --include='*.html' \
    --include='*.css' --include='*.json' --include='*.webmanifest' \
    --include='*.xml' --include='*.sh' --include='*.py' \
    frontend apps scripts shared tools api specs 2>/dev/null \
  | grep -v 'node_modules' \
    | grep -v '^frontend/dist/' \
    | grep -v '^scripts/brand/logo-gate.sh$' \
    || true
)
if [ -n "$ARCHViol" ]; then
  bad "the retired arch signature still exists (the arch is deleted, not whitelisted):"
  printf '    %s\n' $ARCHViol
else
  ok "zero — the retired arch exists nowhere in code or assets"
fi

# ── 2. the U-vessel path signature — sanctioned seats only ───────────────
step "the U-vessel path signature outside the sanctioned seats"
VESSEL='M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7'
VESSELViol=$(
  grep -rlF "$VESSEL" \
    --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.js' \
    --include='*.svg' --include='*.html' --include='*.css' --include='*.json' \
    frontend apps scripts shared 2>/dev/null \
  | grep -v 'node_modules' \
    | grep -v '^frontend/dist/' \
    | grep -v '^frontend/src/brand/' \
    | grep -v '^frontend/tests/' \
    | grep -v '^apps/mobile/src/brand/' \
    | grep -v '^scripts/brand/build-app-icons.mjs$' \
    | grep -v '^scripts/brand/ulara-kit.mjs$' \
    | grep -v '^shared/brand/' \
    | grep -v '^frontend/public/brand/' \
    | grep -v '^frontend/public/favicon.svg$' \
    || true
)
if [ -n "$VESSELViol" ]; then
  bad "the U-vessel path appears outside the sanctioned seats (hand-copied logo?):"
  printf '    %s\n' $VESSELViol
else
  ok "the U-vessel path lives only in the brand system, its generators, twins, and pins"
fi

# ── 3. the MARK_* constant import discipline ─────────────────────────────
step "MARK_* constant consumers outside the brand system"
CONSTViol=$(
  grep -rlE 'MARK_VESSEL_PATH|MARK_CORNERSTONE|MARK_VIEWBOX|MARK_INK|MARK_GRID_POINTS' \
    --include='*.ts' --include='*.tsx' \
    frontend/src apps/mobile/src apps/mobile/app 2>/dev/null \
  | grep -v '^frontend/src/brand/' \
    | grep -v '^frontend/src/pages/BrandPage.tsx' \
    | grep -v '^frontend/tests/' \
    | grep -v '^apps/mobile/src/brand/' \
    | grep -v 'node_modules' \
    || true
)
if [ -n "$CONSTViol" ]; then
  bad "MARK_* constants consumed outside the sanctioned importers:"
  printf '    %s\n' $CONSTViol
else
  ok "MARK_* constants consumed only by the brand system, the spec page, and the pins"
fi

# ── verdict ───────────────────────────────────────────────────────────────
if [ "$FAIL" -eq 0 ]; then
  printf '\nlogo-gate: PASS — the U-vessel has exactly one source per platform, the arch is retired\n'
else
  printf '\nlogo-gate: FAIL — see above\n' >&2
  exit 1
fi
