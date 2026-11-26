#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# r366 capture rig (iOS) — capture-ios.sh
#
# Boots the available iPhone SE-class / Pro Max-class / iPad simulators,
# installs the Debug simulator build, and captures:
#   · the PUBLIC route sweep via ulara:// deep links (logged out)
#   · a dark pass + an accessibility large-text pass (iPhone SE-class)
#   · ONE student login journey (Maestro, best-effort) + the student sweep
# Screenshots land in shots/ios/<device>/. Status bar is dressed
# (9:41, full battery) for clean sheets.
# ═══════════════════════════════════════════════════════════════════════════
set -u
APP="$(ls build/DerivedData/Build/Products/Debug-iphonesimulator/*.app 2>/dev/null | head -1)"
[ -n "${APP:-}" ] || { echo "::error::no simulator .app under build/DerivedData"; exit 1; }
MAESTRO="$HOME/.maestro/bin/maestro"
CAP="scripts/capture"
mkdir -p shots/ios

pick() {
  for d in "$@"; do
    if xcrun simctl list devices available | grep -F "$d (" >/dev/null 2>&1; then echo "$d"; return; fi
  done
}
PHONE_SM="$(pick "iPhone SE (3rd generation)" "iPhone 13 mini" "iPhone 16 Pro" "iPhone 15")"
PHONE_LG="$(pick "iPhone 16 Pro Max" "iPhone 15 Pro Max" "iPhone 16 Pro")"
PAD="$(pick "iPad Pro 13-inch (M4)" "iPad Pro 12.9-inch (6th generation)" "iPad Pro (12.9-inch) (6th generation)" "iPad (10th generation)")"
echo "sims: sm=$PHONE_SM lg=$PHONE_LG pad=$PAD"

sweep() { # sweep <DEVICE_NAME> <ROLE> <TAG>
  local DEV="$1" ROLE="$2" TAG="$3"
  local DIR="shots/ios/$DEV/$TAG"
  mkdir -p "$DIR"
  while IFS='|' read -r NAME ROUTE; do
    [ -z "${NAME:-}" ] && continue
    case "$NAME" in \#*) continue ;; esac
    xcrun simctl openurl booted "ulara://$ROUTE" >/dev/null 2>&1 || true
    sleep "${IOS_WAIT:-5}"
    xcrun simctl io booted screenshot "$DIR/$NAME.png" >/dev/null 2>&1 || true
    echo "captured ios/$DEV/$TAG/$NAME"
  done < "$CAP/routes-${ROLE}.txt"
}

dress() { xcrun simctl status_bar booted override --time "9:41" --batteryLevel 100 >/dev/null 2>&1 || true; }

run_device() { # run_device <NAME> <TAG_SUFFIX> <DO_STUDENT>
  local NAME="$1" SFX="$2" DO_STUDENT="$3"
  echo "── iOS: $NAME"
  # resolve the UDID (device names are ambiguous across iOS runtimes)
  local UDID
  UDID="$(xcrun simctl list devices available | grep -F "$NAME (" | head -1 | grep -Eo '[A-F0-9]{8}-([A-F0-9]{4}-){3}[A-F0-9]{12}')"
  [ -n "$UDID" ] || { echo "::error::no UDID for $NAME"; return 1; }
  xcrun simctl boot "$UDID" 2>/dev/null || true
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
  sleep 8
  xcrun simctl install "$UDID" "$APP" || { echo "::error::install failed on $NAME"; return 1; }
  dress
  xcrun simctl ui "$UDID" appearance light >/dev/null 2>&1 || true
  xcrun simctl launch "$UDID" ly.ulara.app >/dev/null 2>&1 || true
  sleep 6
  sweep "$NAME" PUBLIC "light"
  if [ "$DO_STUDENT" = yes ]; then
    xcrun simctl ui "$UDID" appearance dark >/dev/null 2>&1 || true
    sweep "$NAME" PUBLIC "dark"
    xcrun simctl ui "$UDID" appearance light >/dev/null 2>&1 || true
    xcrun simctl ui "$UDID" content_size extra-extra-extra-large >/dev/null 2>&1 || true
    sweep "$NAME" PUBLIC "axxl"
    xcrun simctl ui "$UDID" content_size medium >/dev/null 2>&1 || true
    # best-effort student journey (live API + @test.ly), then the student sweep
    if [ -x "$MAESTRO" ]; then
      "$MAESTRO" test .maestro/shots-role.yaml \
          -e EMAIL=student@test.ly -e PASSWORD=12345678 -e ROLE=STUDENT \
          -e SHOT="IOS-STUDENT-$SFX" \
        || echo "::warning::iOS student journey failed on $NAME (live API/demo account) — logged-out evidence still captured"
      sweep "$NAME" STUDENT "student"
    fi
  fi
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
}

[ -n "$PHONE_SM" ] && run_device "$PHONE_SM" "sm" yes
[ -n "$PHONE_LG" ] && run_device "$PHONE_LG" "lg" no
[ -n "$PAD" ]      && run_device "$PAD" "pad" no

cp -r "$HOME/.maestro/tests" shots/ios/maestro-debug 2>/dev/null || true
echo "capture-ios done: $(find shots/ios -name '*.png' | wc -l) pngs"
