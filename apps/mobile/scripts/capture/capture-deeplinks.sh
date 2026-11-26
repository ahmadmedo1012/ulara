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

# r367 — the r366 ledger's deferred set, wired: the detail routes with
# params ride the SEED's real ids. One id per entity is read straight
# from the leg's own seeded database (psql on :5433; the workspace is
# the labeled demo slug ulara-demo so the rows belong to the session's
# institution). A missing psql or empty table skips the detail set
# honestly — the static sweep always runs.
DETAILS=""
if command -v psql >/dev/null 2>&1; then
  PGURL="${DATABASE_URL:-postgresql://ulara@localhost:5433/ulara}"
  OFFERING_ID=$(psql "$PGURL" -tAc "SELECT o.id FROM \"CourseOffering\" o JOIN \"Course\" c ON o.\"courseId\"=c.id JOIN \"Institution\" i ON c.\"institutionId\"=i.id WHERE i.slug='ulara-demo' LIMIT 1" 2>/dev/null || true)
  LECTURE_ID=$(psql "$PGURL" -tAc "SELECT l.id FROM \"Lecture\" l JOIN \"CourseOffering\" o ON l.\"offeringId\"=o.id JOIN \"Course\" c ON o.\"courseId\"=c.id JOIN \"Institution\" i ON c.\"institutionId\"=i.id WHERE i.slug='ulara-demo' LIMIT 1" 2>/dev/null || true)
  TEMPLATE_ID=$(psql "$PGURL" -tAc "SELECT t.id FROM \"ExamTemplate\" t JOIN \"CourseOffering\" o ON t.\"offeringId\"=o.id JOIN \"Course\" c ON o.\"courseId\"=c.id JOIN \"Institution\" i ON c.\"institutionId\"=i.id WHERE i.slug='ulara-demo' LIMIT 1" 2>/dev/null || true)
  [ -n "$OFFERING_ID" ] && DETAILS+="detail-course|student/courses/$OFFERING_ID"$'\n'
  [ -n "$LECTURE_ID" ] && DETAILS+="detail-lecture|student/lectures/$LECTURE_ID"$'\n'
  [ -n "$TEMPLATE_ID" ] && DETAILS+="detail-exam-template|student/online-exams/$TEMPLATE_ID"$'\n'
  echo "detail ids wired: offering=${OFFERING_ID:-none} lecture=${LECTURE_ID:-none} template=${TEMPLATE_ID:-none}"
fi

while IFS='|' read -r NAME ROUTE; do
  [ -z "${NAME:-}" ] && continue
  case "$NAME" in \#*) continue ;; esac
  adb shell am start -W -a android.intent.action.VIEW -d "ulara://$ROUTE" >/dev/null 2>&1
  sleep "$WAIT"
  adb exec-out screencap -p > "$DIR/$NAME.png" 2>/dev/null
  echo "captured $ROLE/$NAME ($ROUTE)"
done < "$LIST"
if [ -n "$DETAILS" ]; then
  printf '%s' "$DETAILS" | while IFS='|' read -r NAME ROUTE; do
    [ -z "${NAME:-}" ] && continue
    adb shell am start -W -a android.intent.action.VIEW -d "ulara://$ROUTE" >/dev/null 2>&1
    sleep "$WAIT"
    adb exec-out screencap -p > "$DIR/$NAME.png" 2>/dev/null
    echo "captured $ROLE/$NAME ($ROUTE)"
  done
fi
echo "$ROLE sweep done: $(ls -1 "$DIR" | wc -l) shots in $DIR"
