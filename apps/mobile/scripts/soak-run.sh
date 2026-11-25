#!/usr/bin/env bash
# apps/mobile/scripts/soak-run.sh — r363 (P5-a): the soak's device-side
# rotation, as ONE committed file.
#
# WHY A FILE: reactivecircus/android-emulator-runner executes `script:`
# LINE-BY-LINE through `sh -c <line>` (measured: run #3's log carries
# one `[command]` entry per line). Multi-line commands split at the
# backslash — the bootstrap maestro call received a stray `\` as its
# flow path ("Flow path does not exist: …/ulara/\") and its
# `|| touch fail.flag` guard lived on a DIFFERENT invocation — and a
# bash function cannot survive the split at all. One file, one caller
# line in the workflow, real bash semantics.
#
# Environment (provided by the workflow): adb on PATH, MAESTRO_HOME
# (default ~/.maestro), SOAK_EMAIL / SOAK_PASSWORD (defaults are the
# seeded test account). cwd: the repository root (the workflow's
# workspace). Creates soak-shots/ and touches fail.flag on any lost
# round — the workflow's post-blocks read that flag for the verdict.
set -u

MAESTRO="${MAESTRO_HOME:-$HOME/.maestro}/bin/maestro"
FAIL=0

shot() { adb exec-out screencap -p > "$1" 2>/dev/null || true; }

echo "── soak: the bootstrap login (the seeded student account)"
"$MAESTRO" test apps/mobile/.maestro/soak-login.yaml \
  -e EMAIL="${SOAK_EMAIL:-student@test.ly}" -e PASSWORD="${SOAK_PASSWORD:-12345678}" \
  || { echo "::error::soak bootstrap login failed"; touch fail.flag; FAIL=1; }

# THE ROTATION — each round: chaos → dwell → restore → settle → ASSERT.
#   airplane   = svc wifi+data off (the connectivity-loss class)
#   throttle   = adb emu network delay/speed (the slow-link class)
#   round 4's 100s airplane EXCEEDS the 90s access TTL: the token
#   expires mid-flight, so the regain MUST exercise the refresh
#   path with an expired access — the r362 classification's proof.
round() {
  R=$1; MODE=$2; DWELL=$3
  echo "── soak round $R ($MODE, ${DWELL}s dwell)"
  case "$MODE" in
    airplane)
      adb shell svc wifi disable; adb shell svc data disable ;;
    throttle)
      adb emu network delay 3000 speed 14.4k ;;
    heavy)
      adb emu network delay 8000 speed 9600 ;;
  esac
  sleep "$DWELL"
  case "$MODE" in
    airplane)
      adb shell svc wifi enable; adb shell svc data enable ;;
    *) adb emu network delay 0 speed full ;;
  esac
  sleep 12
  shot "soak-shots/round-$R-regained.png"
  echo "── soak round $R: the surviving-session assert"
  "$MAESTRO" test apps/mobile/.maestro/soak-assert.yaml \
    || { echo "::error::soak round $R: the session did NOT survive ($MODE)"; touch fail.flag; FAIL=1; }
  shot "soak-shots/round-$R-asserted.png"
}

round 1 airplane 25
round 2 throttle 20
round 3 airplane 40
round 4 airplane 100
round 5 heavy   15
round 6 throttle 30
round 7 airplane 25
round 8 heavy   20
# the final full-connectivity round: still authenticated, still
# the dashboard — the soak's closing state.
round 9 airplane 30

if [ "$FAIL" -ne 0 ]; then
  echo "::error::soak rounds failed — forensics in the artifact"
  exit 1
fi
