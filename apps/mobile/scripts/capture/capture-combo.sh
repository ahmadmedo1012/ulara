#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# r366 capture rig — capture-combo.sh <TAG> <light|dark> <1.0|2.0> <portrait|landscape> <ROLE[,ROLE...]>
#
# ONE device combo: configures the emulator (theme / font scale /
# orientation), then per ROLE: the Maestro login journey (lands on the
# role home, screenshots HOME-$ROLE-$TAG) followed by that role's
# deep-link sweep.
#
# Role → seeded account mapping (backend/src/modules/auth/test-accounts.data.ts):
#   STUDENT→student@test.ly TEACHER→teacher@test.ly ADMIN→registrar@test.ly
#   QUALITY→quality@test.ly OWNER→owner@test.ly   (password 12345678)
# ═══════════════════════════════════════════════════════════════════════════
set -u
TAG="${1:?tag}"; THEME="${2:?theme}"; FONT="${3:?font}"; ORIENT="${4:?orient}"; ROLES="${5:?roles csv}"
MAESTRO="$HOME/.maestro/bin/maestro"

# theme
if [ "$THEME" = dark ]; then adb shell cmd uimode night yes >/dev/null 2>&1
else adb shell cmd uimode night no >/dev/null 2>&1; fi
# font scale
adb shell settings put system font_scale "$FONT" >/dev/null 2>&1
# orientation (locked to the requested rotation)
adb shell settings put system accelerometer_rotation 0 >/dev/null 2>&1
if [ "$ORIENT" = landscape ]; then adb shell settings put system user_rotation 1 >/dev/null 2>&1
else adb shell settings put system user_rotation 0 >/dev/null 2>&1; fi
sleep 3
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true

for ROLE in $(echo "$ROLES" | tr ',' ' '); do
  case "$ROLE" in
    ADMIN)   EMAIL="registrar@test.ly" ;;
    QUALITY) EMAIL="quality@test.ly" ;;
    OWNER)   EMAIL="owner@test.ly" ;;
    *)       EMAIL="$(echo "$ROLE" | tr 'A-Z' 'a-z')@test.ly" ;;
  esac
  SHOT="$ROLE-$TAG"
  echo "── capture-combo $TAG: $ROLE ($EMAIL)"
  "$MAESTRO" test apps/mobile/.maestro/shots-role.yaml \
      -e EMAIL="$EMAIL" -e PASSWORD=12345678 -e ROLE="$ROLE" -e SHOT="$SHOT" \
    || echo "::warning::login journey failed for $ROLE ($TAG) — the sweep below may capture auth screens"
  bash apps/mobile/scripts/capture/capture-deeplinks.sh "$ROLE" "$TAG" || true
done
echo "capture-combo $TAG done"
