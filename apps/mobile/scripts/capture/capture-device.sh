#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# r366 capture rig — capture-device.sh <DEVICE> <phone|tablet|extra>
#
# The per-device orchestrator, called as ONE line inside the
# android-emulator-runner script (each runner line is its own sh -c, so
# all state lives inside this script).
#
# Sequence: animations off → settle → install → cold/warm start timing →
# PUBLIC sweep (logged out) → the first-run tour (completes server-side
# for the student fixture) → the combo matrix per device class → one
# scroll recording → reset axes → logcat + maestro debug under shots/.
# ═══════════════════════════════════════════════════════════════════════════
set -u
DEVICE="${1:?device}"; SET="${2:?set}"
MAESTRO="$HOME/.maestro/bin/maestro"
APK="apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
CAP="apps/mobile/scripts/capture"
mkdir -p "shots/$DEVICE"

adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
# the launcher settle window (lane D forensics: software rendering ANRs
# the launcher on the first cold transition — give it room, revive later)
sleep 20
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
adb install -r "$APK" || { echo "::error::APK install failed ($DEVICE)"; exit 1; }

# the cold/warm start budget (am start -W WaitTime/TotalTime, ms)
adb shell am force-stop ly.ulara.app >/dev/null 2>&1 || true
adb shell am start -W -n ly.ulara.app/.MainActivity > "shots/$DEVICE/cold-start-$DEVICE.txt" 2>&1 || true
adb shell am force-stop ly.ulara.app >/dev/null 2>&1 || true
adb shell am start -W -n ly.ulara.app/.MainActivity > "shots/$DEVICE/warm-start-$DEVICE.txt" 2>&1 || true

# the PUBLIC sweep — logged out (auth facade, about, colleges, legal…)
bash "$CAP/capture-deeplinks.sh" PUBLIC "$DEVICE" || true

# the first-run tour shots — completes the tour server-side so no later
# login journey in this leg sees it again
"$MAESTRO" test apps/mobile/.maestro/shots-onboarding.yaml \
    -e EMAIL=student@test.ly -e PASSWORD=12345678 \
  || echo "::warning::onboarding shots failed ($DEVICE)"

case "$SET" in
  phone)
    bash "$CAP/capture-combo.sh" "$DEVICE"          light 1.0 portrait  STUDENT,TEACHER,ADMIN,QUALITY,OWNER
    bash "$CAP/capture-combo.sh" "$DEVICE-dark"     dark  1.0 portrait  STUDENT,TEACHER,OWNER
    bash "$CAP/capture-combo.sh" "$DEVICE-font2"    light 2.0 portrait  STUDENT,TEACHER
    bash "$CAP/capture-combo.sh" "$DEVICE-landscape" light 1.0 landscape STUDENT,TEACHER
    # the small-viewport pass (320x568, minimum supported width) — the
    # session persists; the lightweight shots-size flow only
    adb shell wm size 320x568 >/dev/null 2>&1 || true
    adb shell am force-stop ly.ulara.app >/dev/null 2>&1 || true; sleep 3
    adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
    adb shell input keyevent 4 >/dev/null 2>&1 || true; sleep 2
    "$MAESTRO" test apps/mobile/.maestro/shots-size.yaml -e SHOT="$DEVICE-320" || true
    adb shell wm size reset >/dev/null 2>&1 || true
    ;;
  tablet)
    bash "$CAP/capture-combo.sh" "$DEVICE"           light 1.0 portrait  STUDENT,TEACHER,ADMIN,QUALITY,OWNER
    bash "$CAP/capture-combo.sh" "$DEVICE-dark"      dark  1.0 portrait  STUDENT,TEACHER
    bash "$CAP/capture-combo.sh" "$DEVICE-landscape" light 1.0 landscape STUDENT,TEACHER
    ;;
  extra)
    bash "$CAP/capture-combo.sh" "$DEVICE" light 1.0 portrait STUDENT,TEACHER,OWNER
    ;;
esac

# one scroll recording on the student dashboard (motion evidence)
adb shell am start -W -a android.intent.action.VIEW -d "ulara://student/dashboard" >/dev/null 2>&1
sleep 4
( adb shell screenrecord --time-limit 12 /sdcard/r366-rec.mp4 & \
    sleep 2; adb shell input swipe 540 1800 540 600 400; sleep 3; \
    adb shell input swipe 540 600 540 1800 400; sleep 9; \
    adb pull /sdcard/r366-rec.mp4 "shots/$DEVICE/scroll-$DEVICE.mp4" ) || true

# reset the axes for hygiene
adb shell wm size reset >/dev/null 2>&1 || true
adb shell settings put system font_scale 1.0 >/dev/null 2>&1
adb shell cmd uimode night no >/dev/null 2>&1
adb shell settings put system user_rotation 0 >/dev/null 2>&1

# forensics: logcat + maestro debug tree into the shots dir
timeout 60 adb logcat -d > "shots/$DEVICE/logcat-$DEVICE.txt" 2>&1 || true
cp -r "$HOME/.maestro/tests" "shots/$DEVICE/maestro-debug" 2>/dev/null || true
echo "capture-device $DEVICE ($SET) done: $(find shots -name '*.png' | wc -l) pngs total"
