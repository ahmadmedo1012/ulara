#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# r366 capture rig — capture-deeplinks.sh <ROLE> <TAG>
#
# Drives the app through every route in routes-<ROLE>.txt via ulara://
# deep links and screencaps each. Requires a booted emulator with adb on
# PATH. For role routes, run AFTER the Maestro login journey lands the
# session (the PUBLIC sweep runs logged-out, before any login).
#
# Environment: DEEPLINK_WAIT (seconds per screen, default 4).
# Output: shots/<TAG>/<ROLE>/<NAME>.png
# ═══════════════════════════════════════════════════════════════════════════
set -u
ROLE="${1:?role}"; TAG="${2:-base}"
LIST="apps/mobile/scripts/capture/routes-${ROLE}.txt"
DIR="shots/${TAG}/${ROLE}"
[ -f "$LIST" ] || { echo "::error::route list missing: $LIST"; exit 1; }
mkdir -p "$DIR"
WAIT="${DEEPLINK_WAIT:-4}"
while IFS='|' read -r NAME ROUTE; do
  [ -z "${NAME:-}" ] && continue
  case "$NAME" in \#*) continue ;; esac
  adb shell am start -W -a android.intent.action.VIEW -d "ulara://$ROUTE" >/dev/null 2>&1
  sleep "$WAIT"
  adb exec-out screencap -p > "$DIR/$NAME.png" 2>/dev/null
  echo "captured $ROLE/$NAME ($ROUTE)"
done < "$LIST"
echo "$ROLE sweep done: $(ls -1 "$DIR" | wc -l) shots in $DIR"
