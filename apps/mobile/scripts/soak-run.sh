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

# r363 soak #5: this Maestro build rejects `deepLink` inside launchApp
# ("Unknown Property") and the dev-client LAUNCHER's own server
# discovery is unreliable headless (run #4's forensic screenshot: the
# empty "DEVELOPMENT SERVERS" home). Every session open therefore rides
# the canonical dev-client deep link, driven by adb — maestro then acts
# on the already-foregrounded app (no launchApp in the flows).
DEEP_LINK="exp+ulara://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081"
open_app() {
  adb shell am start -a android.intent.action.VIEW -d "$DEEP_LINK" >/dev/null 2>&1 || true
}

# run #6's forensics: the deep link opens the app into "Bundling 26%…"
# (the dev client's brand moment) — the COLD bundle takes minutes on a
# 2-core runner, so every open waits for REAL UI text via the a11y tree
# (uiautomator dump), never a fixed sleep.
wait_for_text() {
  TEXT="$1"; POLLS="${2:-30}"
  for i in $(seq 1 "$POLLS"); do
    if adb exec-out uiautomator dump /dev/tty 2>/dev/null | grep -q "$TEXT"; then
      echo "── ui ready (poll $i): $TEXT"
      return 0
    fi
    sleep 6
  done
  echo "::error::ui never showed: $TEXT"
  return 1
}

echo "── soak: the bootstrap login (the seeded student account)"
adb shell pm clear ly.ulara.app >/dev/null 2>&1 || true
open_app
wait_for_text "ابدأ الآن" 50 || true   # the cold bundle — up to ~5 min
shot "soak-shots/bootstrap-open.png"
"$MAESTRO" test apps/mobile/.maestro/soak-login.yaml \
  -e EMAIL="${SOAK_EMAIL:-student@test.ly}" -e PASSWORD="${SOAK_PASSWORD:-12345678}" \
  || { echo "::error::soak bootstrap login failed"; touch fail.flag; FAIL=1; }
shot "soak-shots/bootstrap-final.png"

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
  # airplane rounds NEVER reopen: a dev-client relaunch with no metro
  # reach is an error screen BY CONSTRUCTION (the bundler is the app's
  # js source in dev builds) — the session-resume truth is exercised
  # in-app (the app stayed foreground through the outage; its own
  # refresh-on-regain path fires). Networked rounds reopen through the
  # deep link (the auth store survives — no pm clear).
  if [ "$MODE" != "airplane" ]; then
    open_app
    wait_for_text "أرقامك هذا الفصل" 20 || true
  fi
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
