#!/usr/bin/env bash
# Capture the already-open screen on a disposable emulator with a synthetic account.
# Usage: bash scripts/capture-device-display.sh emulator-5554 /tmp/ulara-display
set -euo pipefail
serial=${1:?Pass the emulator serial from adb devices}
dest=${2:?Pass a new output directory}
[[ "$serial" =~ ^emulator-[0-9]+$ ]] || { echo "A disposable emulator is required" >&2; exit 2; }
[[ ! -e "$dest" ]] || { echo "Choose a new output directory" >&2; exit 2; }
adb_device() { adb -s "$serial" "$@"; }
prop() { adb_device shell settings get system "$1" | tr -d '\r'; }
size=$(adb_device shell wm size)
density=$(adb_device shell wm density)
size_override=$(sed -n 's/^Override size: //p' <<<"${size//$'\r'/}")
density_override=$(sed -n 's/^Override density: //p' <<<"${density//$'\r'/}")
scale=$(prop font_scale)
auto=$(prop accelerometer_rotation)
rotation=$(prop user_rotation)
restore_setting() {
  if [[ "$2" == null ]]; then adb_device shell settings delete system "$1"; else adb_device shell settings put system "$1" "$2"; fi
}
restore() {
  local failed=0
  adb_device shell wm size "${size_override:-reset}" || failed=1
  adb_device shell wm density "${density_override:-reset}" || failed=1
  restore_setting font_scale "$scale" || failed=1
  restore_setting user_rotation "$rotation" || failed=1
  restore_setting accelerometer_rotation "$auto" || failed=1
  return "$failed"
}
mkdir -p "$dest"
trap 'rc=$?; trap - EXIT; rm -f -- "$dest/.capture.png" "$dest/.capture.txt"; restore || rc=1; exit "$rc"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
capture() {
  local name=$1 focus
  sleep 2
  focus=$(adb_device shell dumpsys window | sed -n '/mCurrentFocus=/p')
  [[ "$focus" == *ly.ulara.app/* ]] || { echo "Open the ULARA fixture screen first" >&2; return 1; }
  {
    printf '%s\n' "$focus"
    adb_device shell wm size
    adb_device shell wm density
    printf 'font_scale=%s\nuser_rotation=%s\n' "$(prop font_scale)" "$(prop user_rotation)"
  } > "$dest/.capture.txt"
  adb_device exec-out screencap -p > "$dest/.capture.png"
  # Fail if adb reports success but the PNG is missing or truncated.
  node - "$dest/.capture.png" "$name" >> "$dest/.capture.txt" <<'NODE'
const [file, profile] = process.argv.slice(2);
const b = require('node:fs').readFileSync(file);
if (b.length < 45 || !b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
    b.toString('ascii', 12, 16) !== 'IHDR' || b.toString('ascii', b.length - 8, b.length - 4) !== 'IEND') {
  throw new Error('Incomplete emulator screenshot');
}
const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
// At the 160-dpi override one display pixel is one dp. Accept either
// orientation; a successful wm command alone does not establish the size.
const expected = profile.startsWith('compact-') ? 320 : profile === 'tablet-768dp' ? 768 : 0;
if (!w || !h || (expected && Math.min(w, h) !== expected)) {
  throw new Error(`Unexpected screenshot dimensions for ${profile}: ${w}x${h}`);
}
console.log(`screenshot=${w}x${h}`);
console.log(`screenshot_orientation=${w === h ? 'square' : w > h ? 'landscape' : 'portrait'}`);
NODE
  mv -- "$dest/.capture.png" "$dest/$name.png"
  mv -- "$dest/.capture.txt" "$dest/$name.txt"
}
capture baseline
adb_device shell wm density 160
adb_device shell wm size 320x568
capture compact-320dp
adb_device shell settings put system font_scale 2.0
capture compact-200pct
restore_setting font_scale "$scale"
adb_device shell wm size 768x1024
capture tablet-768dp
adb_device shell settings put system accelerometer_rotation 0
adb_device shell settings put system user_rotation 1
capture rotation-requested
