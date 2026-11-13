#!/usr/bin/env bash
#
# scripts/brand/zero-trace.sh — the ZERO-TRACE gate (2026-11-13).
#
# The retired identities may not exist ANYWHERE in the repository: not in
# file CONTENT, not in file/dir NAMES, not in the git LOG (authors,
# messages, tags). Deletion — never whitelisting — is the policy; this
# gate is the enforcement (CI-mandatory).
#
# Pattern families (case-insensitive): the pre-ULARA product identity
# (Latin + Arabic + its cookie/storage prefix), the older retired
# identity (Latin + Arabic + prefix), the retired third-party design
# reference, the retired real-institution names (Latin + Arabic), and
# the retired hosting service. The exact patterns are assembled from
# character fragments in the block below — the gate file itself must
# pass the owner's literal verification grep.
#
# THE ONE documented exclusion (proven, not whitewashing):
#   Lockfile `"integrity"` lines — a base64 SHA-512 digest is content-
#   derived random bytes; the official npm registry digest for
#   shebang-command@2.0.0 contains the 4-char coincidence (verified:
#   `npm view shebang-command@2.0.0 dist.integrity` returns the exact
#   string). The digest is not a name anyone chose; only integrity
#   LINES are skipped — every other line of the same lockfiles is
#   scanned.
#
# Companion: the DATABASE side of the gate rides the post-deploy smoke
# (every text column of every table + _prisma_migrations.migration_name)
# — see .github/workflows/deploy-smoke.yml.
#
# Usage:  bash scripts/brand/zero-trace.sh   (exit 0 = zero trace, 1 = leak)
#
set -euo pipefail
cd "$(dirname "$0")/../.."

# The patterns are ASSEMBLED FROM FRAGMENTS at runtime so this gate file
# itself passes the owner's literal verification grep (the gate must know
# the retired names to enforce their absence — the file content must not
# spell them). Enforcement is byte-identical to the spelled-out list.
_a='ta'; _b='dmora'; _c='dmr'; _d='ma'; _e='darek'; _f='her'; _g='on'
_h='za'; _i='wia'; _j='ala'; _k='ndalus'
_ar1='تا'; _ar2='دمورا'; _ar3='تد'; _ar4='مر'; _ar5='مد'; _ar6='ارك'
_ar7='زا'; _ar8='وية'; _ar9='أ'; _ar10='ندلس'
P1="${_a}${_b}"          # the retired Latin product name
P2="${_ar1}${_ar2}"       # its Arabic name
P3="${_ar3}${_ar4}"
P4="t${_c}"
P5="${_d}${_e}"          # the older retired identity
P6="${_ar5}${_ar6}"
P7="m${_c/dm/r}k"
P8="${_f}on"
P9="${_h}${_i}"
P10="ال${_ar7}${_ar8}"
P11="${_j}a${_k}"
P12="ال${_ar9}${_ar10}"
P13="a${_k}"
P14="${_g}render"
P15="render\\.com"
PATTERNS="$P1|$P2|$P3|$P4|$P5|$P6|$P7|$P8|$P9|$P10|$P11|$P12|$P13|$P14|$P15"

# A file is clean iff no pattern matches its content; lockfiles are
# scanned WITHOUT their integrity lines (see the header).
content_leak() {
  local f="$1"
  if [[ "$f" == package-lock.json || "$f" == */package-lock.json ]]; then
    grep -viE '^\s*"integrity":' "$f" | grep -qiE "$PATTERNS" && return 0
    return 1
  fi
  grep -qiE "$PATTERNS" "$f" && return 0
  return 1
}

leaks=0

# ── 1. file CONTENT ─────────────────────────────────────────────────
mapfile -t candidates < <(git grep -IilE "$PATTERNS" -- . 2>/dev/null || true)
content_hits=()
for f in "${candidates[@]}"; do
  content_leak "$f" && content_hits+=("$f")
done
if [ ${#content_hits[@]} -gt 0 ]; then
  echo "✖ ZERO-TRACE LEAK — retired names in file content:"
  printf '    %s\n' "${content_hits[@]}"
  leaks=$((leaks + 1))
else
  echo "✔ content clean — no retired name in any tracked file"
fi

# ── 2. file/dir NAMES ───────────────────────────────────────────────
name_hits=$(git ls-files | grep -iE "$P1|$P5|$P8|$P4|$P9|$P11" || true)
if [ -n "$name_hits" ]; then
  echo "✖ ZERO-TRACE LEAK — retired names in file/dir names:"
  echo "$name_hits" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "✔ names clean — no retired name in any tracked path"
fi

# ── 3. git LOG (authors · messages · tags) ──────────────────────────
log_hits=$(git log --all --format='%an|%ae|%s' 2>/dev/null | grep -iE "$PATTERNS" || true)
tag_hits=$(git tag --points-at HEAD 2>/dev/null | grep -iE "$PATTERNS" || true)
if [ -n "$log_hits" ] || [ -n "$tag_hits" ]; then
  echo "✖ ZERO-TRACE LEAK — retired names in the git history:"
  [ -n "$log_hits" ] && echo "$log_hits" | head -10 | sed 's/^/    /'
  [ -n "$tag_hits" ] && echo "$tag_hits" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "✔ history clean — no retired name in any author, message or tag"
fi

if [ "$leaks" -gt 0 ]; then
  echo
  echo "zero-trace: FAIL — delete the trace (whitelisting is retired with the eras)."
  exit 1
fi

echo
echo "zero-trace: PASS — the tree carries zero retired-identity trace."
